from __future__ import annotations

from functools import lru_cache
from io import BytesIO
from pathlib import Path
import uuid

import joblib
import mysql.connector
import pandas as pd

from db_runtime import build_connection_kwargs, load_db_config

APP_DIR = Path(__file__).resolve().parent
RUNTIME_PREDICTION_DIR = APP_DIR / "runtime" / "predictions"
ML_RESOURCES_DIR = APP_DIR / "resources" / "ml"
MODEL_PATH = ML_RESOURCES_DIR / "model_rf_gravity.pkl"
ENCODER_PATH = ML_RESOURCES_DIR / "encoder_rf_gravity.pkl"
MACRO_REFERENCE_PATH = ML_RESOURCES_DIR / "macro_reference.csv"

MODEL_FEATURES = (
    "Reporter",
    "Partner",
    "HS4",
    "Year",
    "Reporter_GDP",
    "Partner_GDP",
    "Reporter_Growth",
    "Partner_Growth",
)
FULL_DATASET_COLUMNS = (
    "Reporter",
    "Partner",
    "HS4",
    "Year",
    "Reporter_GDP",
    "Partner_GDP",
    "Reporter_Growth",
    "Partner_Growth",
)
TRADE_DATASET_COLUMNS = ("Reporter", "Partner", "HS4", "Year")
OPTIONAL_DATASET_COLUMNS = ("Status", "ExportValue")
SUPPORTED_UPLOAD_EXTENSIONS = {".csv", ".xls", ".xlsx"}
EXPORT_ONLY_NOTE = (
    "Model ini dilatih dari data Export. Baris non-Export akan diabaikan saat dataset manual diproses."
)

COLUMN_ALIASES = {
    "reporter": "Reporter",
    "partner": "Partner",
    "hs4": "HS4",
    "year": "Year",
    "status": "Status",
    "exportvalue": "ExportValue",
    "reportergdp": "Reporter_GDP",
    "partnergdp": "Partner_GDP",
    "reportergrowth": "Reporter_Growth",
    "partnergrowth": "Partner_Growth",
}


class PredictionInputError(RuntimeError):
    pass


class PredictionDependencyError(RuntimeError):
    pass


def _canonical_column_key(value: str):
    return "".join(char for char in str(value).strip().lower() if char.isalnum())


def _normalize_uploaded_columns(dataframe: pd.DataFrame):
    renamed = {}
    for column in dataframe.columns:
        alias = COLUMN_ALIASES.get(_canonical_column_key(column))
        if alias:
            renamed[column] = alias
    return dataframe.rename(columns=renamed)


def _safe_float(value):
    if value is None:
        return 0.0
    if isinstance(value, float) and pd.isna(value):
        return 0.0

    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "-"}:
        return 0.0

    text = text.replace(",", "")
    try:
        return float(text)
    except ValueError:
        return 0.0


def normalize_hs4_for_model(value):
    digits = "".join(char for char in str(value).strip() if char.isdigit())
    if not digits:
        return ""
    digits = digits[:4]
    return str(int(digits))


def normalize_hs4_for_query(value):
    digits = "".join(char for char in str(value).strip() if char.isdigit())
    if not digits:
        return ""
    return digits[:4].zfill(4)


def _normalize_code(value):
    text = str(value).strip().upper()
    return text


def _ensure_runtime_predictions_dir():
    RUNTIME_PREDICTION_DIR.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def load_model_bundle():
    if not MODEL_PATH.exists():
        raise PredictionDependencyError(f"File model tidak ditemukan: {MODEL_PATH}")
    if not ENCODER_PATH.exists():
        raise PredictionDependencyError(f"File encoder tidak ditemukan: {ENCODER_PATH}")

    model = joblib.load(MODEL_PATH)
    encoders = joblib.load(ENCODER_PATH)
    return model, encoders


def get_ml_asset_status():
    model_ready = MODEL_PATH.exists()
    encoder_ready = ENCODER_PATH.exists()
    macro_reference_ready = MACRO_REFERENCE_PATH.exists()
    return {
        "model_ready": model_ready,
        "encoder_ready": encoder_ready,
        "macro_reference_ready": macro_reference_ready,
        "ready": model_ready and encoder_ready,
        "model_path": MODEL_PATH,
        "encoder_path": ENCODER_PATH,
        "macro_reference_path": MACRO_REFERENCE_PATH,
    }


def _table_exists(cursor, table_name: str):
    cursor.execute("SHOW TABLES LIKE %s", (table_name,))
    return cursor.fetchone() is not None


def probe_ml_database(config: dict | None = None):
    status = {
        "configured": False,
        "connected": False,
        "tables": {
            "tbtrade": {"exists": False, "count": 0},
            "tbgdp": {"exists": False, "count": 0},
            "tbgdpgrowth": {"exists": False, "count": 0},
            "tbnegara": {"exists": False, "count": 0},
        },
        "message": "",
    }

    config = config or load_db_config()
    if not config:
        status["message"] = "Konfigurasi database belum tersedia."
        return status

    status["configured"] = True
    try:
        connection = mysql.connector.connect(**build_connection_kwargs(config))
    except mysql.connector.Error as exc:
        status["message"] = str(exc)
        return status

    try:
        status["connected"] = True
        cursor = connection.cursor()
        for table_name in status["tables"]:
            if _table_exists(cursor, table_name):
                status["tables"][table_name]["exists"] = True
                cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                row = cursor.fetchone()
                status["tables"][table_name]["count"] = int(row[0]) if row else 0
        cursor.close()
        status["message"] = "Database prediksi siap dicek."
    finally:
        connection.close()

    return status


def _read_uploaded_dataset(file_storage):
    filename = str(getattr(file_storage, "filename", "") or "").strip()
    if not filename:
        raise PredictionInputError("File dataset belum dipilih.")

    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED_UPLOAD_EXTENSIONS:
        raise PredictionInputError("Format file harus `.csv`, `.xls`, atau `.xlsx`.")

    payload = file_storage.read()
    if not payload:
        raise PredictionInputError("File dataset kosong atau gagal dibaca.")

    buffer = BytesIO(payload)
    if suffix == ".csv":
        dataframe = pd.read_csv(buffer)
    else:
        dataframe = pd.read_excel(buffer)

    if dataframe.empty:
        raise PredictionInputError("Dataset upload tidak memiliki baris data.")

    return _normalize_uploaded_columns(dataframe), filename


@lru_cache(maxsize=1)
def _load_local_macro_reference():
    if not MACRO_REFERENCE_PATH.exists():
        raise PredictionDependencyError(
            "Referensi makro lokal tidak ditemukan dan tabel `tbgdp` / `tbgdpgrowth` juga belum tersedia."
        )

    dataframe = pd.read_csv(MACRO_REFERENCE_PATH)
    dataframe["KodeNegara"] = dataframe["KodeNegara"].astype(str).str.strip().str.upper()
    dataframe["Year"] = pd.to_numeric(dataframe["Year"], errors="coerce").fillna(0).astype(int)
    dataframe["GDP"] = pd.to_numeric(dataframe["GDP"], errors="coerce").fillna(0.0)
    dataframe["Growth"] = pd.to_numeric(dataframe["Growth"], errors="coerce").fillna(0.0)
    return dataframe


def _build_local_macro_lookup(country_codes, years):
    country_codes = sorted({code for code in country_codes if code})
    years = sorted({int(year) for year in years if pd.notna(year)})
    if not country_codes or not years:
        return {}, {}

    dataframe = _load_local_macro_reference()
    filtered = dataframe[
        dataframe["KodeNegara"].isin(country_codes) & dataframe["Year"].isin(years)
    ]

    gdp_lookup = {}
    growth_lookup = {}
    for row in filtered.itertuples(index=False):
        key = (row.KodeNegara, int(row.Year))
        gdp_lookup[key] = _safe_float(row.GDP)
        growth_lookup[key] = _safe_float(row.Growth)

    return gdp_lookup, growth_lookup


def _build_macro_lookup(cursor, country_codes, years):
    country_codes = sorted({code for code in country_codes if code})
    years = sorted({int(year) for year in years if pd.notna(year)})
    if not country_codes or not years:
        return {}, {}, "empty"

    if not _table_exists(cursor, "tbgdp") or not _table_exists(cursor, "tbgdpgrowth"):
        gdp_lookup, growth_lookup = _build_local_macro_lookup(country_codes, years)
        return gdp_lookup, growth_lookup, "local_resource"

    country_placeholders = ", ".join(["%s"] * len(country_codes))
    year_placeholders = ", ".join(["%s"] * len(years))

    macro_sql = f"""
        SELECT KodeNegara, Tahun, CAST(REPLACE(Jumlah, ',', '') AS DOUBLE) AS metric
        FROM `{{table_name}}`
        WHERE KodeNegara IN ({country_placeholders})
          AND Tahun IN ({year_placeholders})
          AND Jumlah IS NOT NULL
    """
    params = tuple(country_codes + years)

    gdp_lookup = {}
    cursor.execute(macro_sql.format(table_name="tbgdp"), params)
    for country_code, year, metric in cursor.fetchall():
        gdp_lookup[(str(country_code).upper(), int(year))] = _safe_float(metric)

    growth_lookup = {}
    cursor.execute(macro_sql.format(table_name="tbgdpgrowth"), params)
    for country_code, year, metric in cursor.fetchall():
        growth_lookup[(str(country_code).upper(), int(year))] = _safe_float(metric)

    return gdp_lookup, growth_lookup, "database"


def _build_country_name_lookup(cursor, country_codes):
    country_codes = sorted({code for code in country_codes if code})
    if not country_codes or not _table_exists(cursor, "tbnegara"):
        return {}

    placeholders = ", ".join(["%s"] * len(country_codes))
    cursor.execute(
        f"SELECT Kode_Alpha3, Negara_ENG FROM tbnegara WHERE Kode_Alpha3 IN ({placeholders})",
        tuple(country_codes),
    )
    return {str(code).upper(): str(name) for code, name in cursor.fetchall()}


def _apply_export_filter(dataframe: pd.DataFrame, warnings: list[str]):
    if "Status" not in dataframe.columns:
        return dataframe

    status_series = dataframe["Status"].astype(str).str.strip().str.title()
    export_mask = status_series.eq("Export")
    ignored = int((~export_mask).sum())
    if ignored:
        warnings.append(
            f"{ignored} baris dataset manual diabaikan karena model ini hanya dilatih untuk Status Export."
        )
    filtered = dataframe.loc[export_mask].copy()
    filtered["Status"] = status_series.loc[export_mask]
    return filtered


def _prepare_full_feature_frame(dataframe: pd.DataFrame, warnings: list[str]):
    missing = [column for column in FULL_DATASET_COLUMNS if column not in dataframe.columns]
    if missing:
        raise PredictionInputError(
            "Dataset manual mode penuh harus memiliki kolom: "
            + ", ".join(FULL_DATASET_COLUMNS)
            + ". Kolom yang belum ada: "
            + ", ".join(missing)
            + "."
        )

    frame = dataframe.copy()
    frame = _apply_export_filter(frame, warnings)
    if frame.empty:
        raise PredictionInputError("Tidak ada baris Export yang tersisa untuk diprediksi.")

    frame["Reporter"] = frame["Reporter"].astype(str).str.strip().str.upper()
    frame["Partner"] = frame["Partner"].astype(str).str.strip().str.upper()
    frame["HS4"] = frame["HS4"].apply(normalize_hs4_for_model)
    frame["Year"] = pd.to_numeric(frame["Year"], errors="coerce")

    invalid_mask = (
        frame["Reporter"].eq("")
        | frame["Partner"].eq("")
        | frame["HS4"].eq("")
        | frame["Year"].isna()
    )
    invalid_count = int(invalid_mask.sum())
    if invalid_count:
        warnings.append(f"{invalid_count} baris diabaikan karena Reporter, Partner, HS4, atau Year tidak valid.")
        frame = frame.loc[~invalid_mask].copy()

    if frame.empty:
        raise PredictionInputError("Semua baris dataset manual tidak valid setelah dibersihkan.")

    frame["Year"] = frame["Year"].astype(int)

    for column in ("Reporter_GDP", "Partner_GDP", "Reporter_Growth", "Partner_Growth"):
        source = pd.to_numeric(frame[column], errors="coerce")
        missing_count = int(source.isna().sum())
        if missing_count:
            warnings.append(f"{missing_count} nilai kosong pada `{column}` diisi 0.")
        frame[column] = source.fillna(0.0)

    frame["source_mode"] = "manual_full"
    return frame


def _enrich_trade_frame_from_database(dataframe: pd.DataFrame, config: dict, warnings: list[str]):
    missing = [column for column in TRADE_DATASET_COLUMNS if column not in dataframe.columns]
    if missing:
        raise PredictionInputError(
            "Dataset manual ringan minimal harus memiliki kolom: "
            + ", ".join(TRADE_DATASET_COLUMNS)
            + ". Kolom yang belum ada: "
            + ", ".join(missing)
            + "."
        )

    frame = dataframe.copy()
    frame = _apply_export_filter(frame, warnings)
    if frame.empty:
        raise PredictionInputError("Tidak ada baris Export yang tersisa untuk diprediksi.")

    frame["Reporter"] = frame["Reporter"].astype(str).str.strip().str.upper()
    frame["Partner"] = frame["Partner"].astype(str).str.strip().str.upper()
    frame["HS4"] = frame["HS4"].apply(normalize_hs4_for_model)
    frame["Year"] = pd.to_numeric(frame["Year"], errors="coerce")

    invalid_mask = (
        frame["Reporter"].eq("")
        | frame["Partner"].eq("")
        | frame["HS4"].eq("")
        | frame["Year"].isna()
    )
    invalid_count = int(invalid_mask.sum())
    if invalid_count:
        warnings.append(f"{invalid_count} baris diabaikan karena Reporter, Partner, HS4, atau Year tidak valid.")
        frame = frame.loc[~invalid_mask].copy()

    if frame.empty:
        raise PredictionInputError("Semua baris dataset manual ringan tidak valid setelah dibersihkan.")

    frame["Year"] = frame["Year"].astype(int)

    try:
        connection = mysql.connector.connect(**build_connection_kwargs(config))
    except mysql.connector.Error as exc:
        raise PredictionDependencyError(f"Gagal konek database untuk melengkapi GDP/Growth: {exc}") from exc

    try:
        cursor = connection.cursor()
        codes = set(frame["Reporter"].tolist()) | set(frame["Partner"].tolist())
        years = set(frame["Year"].tolist())
        gdp_lookup, growth_lookup, macro_source = _build_macro_lookup(cursor, codes, years)
        cursor.close()
    finally:
        connection.close()

    if macro_source == "local_resource":
        warnings.append(
            "Referensi GDP dan GDP Growth diambil dari file resource lokal model karena tabel `tbgdp` / `tbgdpgrowth` belum tersedia di database aktif."
        )

    reporter_gdp_values = []
    partner_gdp_values = []
    reporter_growth_values = []
    partner_growth_values = []

    missing_gdp = 0
    missing_growth = 0

    for row in frame.itertuples(index=False):
        reporter_key = (row.Reporter, int(row.Year))
        partner_key = (row.Partner, int(row.Year))

        reporter_gdp = gdp_lookup.get(reporter_key, 0.0)
        partner_gdp = gdp_lookup.get(partner_key, 0.0)
        reporter_growth = growth_lookup.get(reporter_key, 0.0)
        partner_growth = growth_lookup.get(partner_key, 0.0)

        if reporter_key not in gdp_lookup or partner_key not in gdp_lookup:
            missing_gdp += 1
        if reporter_key not in growth_lookup or partner_key not in growth_lookup:
            missing_growth += 1

        reporter_gdp_values.append(reporter_gdp)
        partner_gdp_values.append(partner_gdp)
        reporter_growth_values.append(reporter_growth)
        partner_growth_values.append(partner_growth)

    if missing_gdp:
        warnings.append(
            f"{missing_gdp} baris tidak menemukan referensi GDP lengkap di database, sehingga nilai kosong diisi 0."
        )
    if missing_growth:
        warnings.append(
            f"{missing_growth} baris tidak menemukan referensi GDP Growth lengkap di database, sehingga nilai kosong diisi 0."
        )

    frame["Reporter_GDP"] = reporter_gdp_values
    frame["Partner_GDP"] = partner_gdp_values
    frame["Reporter_Growth"] = reporter_growth_values
    frame["Partner_Growth"] = partner_growth_values
    frame["source_mode"] = "manual_enriched"
    return frame


def _encode_prediction_frame(dataframe: pd.DataFrame):
    model, encoders = load_model_bundle()
    encoded = dataframe.copy()
    unknown_counts = {}

    for column in ("Reporter", "Partner", "HS4"):
        series = encoded[column].astype(str)
        classes = pd.Index(encoders[column].classes_.astype(str))
        known_mask = series.isin(classes)
        encoded_column = pd.Series(-1, index=series.index, dtype=float)
        if known_mask.any():
            encoded_column.loc[known_mask] = encoders[column].transform(series.loc[known_mask])
        encoded[column] = encoded_column
        unknown_counts[column] = int((~known_mask).sum())

    for column in ("Year", "Reporter_GDP", "Partner_GDP", "Reporter_Growth", "Partner_Growth"):
        encoded[column] = pd.to_numeric(encoded[column], errors="coerce").fillna(0.0)

    predictions = model.predict(encoded[list(MODEL_FEATURES)])
    return predictions, unknown_counts


def _save_prediction_dataframe(dataframe: pd.DataFrame):
    _ensure_runtime_predictions_dir()
    token = uuid.uuid4().hex[:12]
    file_path = RUNTIME_PREDICTION_DIR / f"{token}.csv"
    dataframe.to_csv(file_path, index=False)
    return token, file_path


def predict_from_tbtrade(
    config: dict,
    year: int,
    hs4: str,
    top_n: int = 10,
    source_status: str = "all",
):
    hs4_query = normalize_hs4_for_query(hs4)
    hs4_model = normalize_hs4_for_model(hs4)
    if not hs4_query or not hs4_model:
        raise PredictionInputError("HS4 wajib diisi dengan 4 digit pertama HS code.")

    normalized_source_status = str(source_status).strip().title()
    if normalized_source_status not in {"All", "Export", "Import"}:
        normalized_source_status = "All"

    try:
        connection = mysql.connector.connect(**build_connection_kwargs(config))
    except mysql.connector.Error as exc:
        raise PredictionDependencyError(f"Gagal konek database untuk prediksi tbtrade: {exc}") from exc

    try:
        cursor = connection.cursor()
        if not _table_exists(cursor, "tbtrade"):
            raise PredictionDependencyError("Tabel `tbtrade` belum ada di database aktif.")

        status_clause = ""
        params = [str(year), f"{hs4_query}%"]
        if normalized_source_status != "All":
            status_clause = "AND Status = %s"
            params.append(normalized_source_status)

        cursor.execute(
            f"""
            SELECT
                Kode_Alpha3_Partner,
                SUM(COALESCE(Nilai, 0)) AS actual_value,
                COUNT(*) AS row_count
            FROM tbtrade
            WHERE Tahun = %s
              AND HSCode LIKE %s
              AND Kode_Alpha3_Partner IS NOT NULL
              AND Kode_Alpha3_Partner <> ''
              AND Kode_Alpha3_Partner <> 'IDN'
              {status_clause}
            GROUP BY Kode_Alpha3_Partner
            """,
            tuple(params),
        )
        partner_rows = cursor.fetchall()
        if not partner_rows:
            raise PredictionInputError(
                f"Tidak ada partner di tbtrade untuk tahun {year}, HS4 {hs4_query}, dan filter status `{normalized_source_status}`."
            )

        partner_codes = [str(row[0]).upper() for row in partner_rows if row[0]]
        all_codes = set(partner_codes) | {"IDN"}
        gdp_lookup, growth_lookup, macro_source = _build_macro_lookup(cursor, all_codes, {year})
        country_lookup = _build_country_name_lookup(cursor, partner_codes)
        cursor.close()
    finally:
        connection.close()

    warnings = [EXPORT_ONLY_NOTE]
    if normalized_source_status != "Export":
        warnings.append(
            f"Kandidat partner diambil dari tbtrade dengan filter status `{normalized_source_status}`, "
            "tetapi nilai yang diprediksi tetap potensi ekspor."
        )
    if macro_source == "local_resource":
        warnings.append(
            "Referensi GDP dan GDP Growth diambil dari file resource lokal model karena tabel `tbgdp` / `tbgdpgrowth` belum tersedia di database aktif."
        )
    rows = []
    missing_gdp = 0
    missing_growth = 0

    for partner_code, actual_value, row_count in partner_rows:
        partner_code = str(partner_code).upper()
        reporter_key = ("IDN", int(year))
        partner_key = (partner_code, int(year))

        reporter_gdp = gdp_lookup.get(reporter_key, 0.0)
        partner_gdp = gdp_lookup.get(partner_key, 0.0)
        reporter_growth = growth_lookup.get(reporter_key, 0.0)
        partner_growth = growth_lookup.get(partner_key, 0.0)

        if reporter_key not in gdp_lookup or partner_key not in gdp_lookup:
            missing_gdp += 1
        if reporter_key not in growth_lookup or partner_key not in growth_lookup:
            missing_growth += 1

        rows.append(
            {
                "Reporter": "IDN",
                "Partner": partner_code,
                "Partner_Name": country_lookup.get(partner_code, ""),
                "HS4": hs4_model,
                "Year": int(year),
                "Reporter_GDP": reporter_gdp,
                "Partner_GDP": partner_gdp,
                "Reporter_Growth": reporter_growth,
                "Partner_Growth": partner_growth,
                "Actual_tbtrade_Value": _safe_float(actual_value),
                "tbtrade_Row_Count": int(row_count),
                "Status": "Export",
            }
        )

    if missing_gdp:
        warnings.append(
            f"{missing_gdp} partner tidak memiliki referensi GDP lengkap untuk tahun {year}; nilai kosong diisi 0."
        )
    if missing_growth:
        warnings.append(
            f"{missing_growth} partner tidak memiliki referensi GDP Growth lengkap untuk tahun {year}; nilai kosong diisi 0."
        )

    prediction_frame = pd.DataFrame(rows)
    predictions, unknown_counts = _encode_prediction_frame(prediction_frame)
    prediction_frame["Predicted_Export_Value"] = predictions
    prediction_frame = prediction_frame.sort_values(
        by="Predicted_Export_Value",
        ascending=False,
    ).reset_index(drop=True)
    prediction_frame["Rank"] = prediction_frame.index + 1

    for column, count in unknown_counts.items():
        if count:
            warnings.append(
                f"{count} nilai `{column}` tidak dikenali encoder model dan dipetakan ke unknown."
            )

    preview = prediction_frame.head(max(1, top_n)).copy()
    download_token, download_path = _save_prediction_dataframe(prediction_frame)

    return {
        "mode": "tbtrade",
        "title": "Prediksi dari tbtrade",
        "subtitle": (
            f"Rekomendasi partner untuk potensi ekspor HS4 {hs4_query} tahun {year} "
            f"dengan kandidat sumber `{normalized_source_status}` dari tbtrade"
        ),
        "summary": {
            "candidate_rows": int(len(prediction_frame)),
            "preview_rows": int(len(preview)),
            "hs4": hs4_query,
            "year": int(year),
            "source_status": normalized_source_status,
        },
        "warnings": warnings,
        "preview_columns": (
            "Rank",
            "Partner",
            "Partner_Name",
            "Predicted_Export_Value",
            "Actual_tbtrade_Value",
            "tbtrade_Row_Count",
        ),
        "preview_rows": preview.to_dict(orient="records"),
        "download_token": download_token,
        "download_path": download_path,
    }


def predict_from_manual_dataset(file_storage):
    dataframe, filename = _read_uploaded_dataset(file_storage)
    warnings = [EXPORT_ONLY_NOTE]

    if not set(FULL_DATASET_COLUMNS).issubset(dataframe.columns):
        raise PredictionInputError(
            "Dataset manual belum sesuai. Gunakan format penuh dengan kolom: "
            "Reporter, Partner, HS4, Year, Reporter_GDP, Partner_GDP, Reporter_Growth, Partner_Growth. "
            "Kolom opsional seperti Status dan ExportValue boleh ikut, tapi delapan kolom inti itu wajib ada."
        )

    prepared = _prepare_full_feature_frame(dataframe, warnings)
    source_label = "manual_full"

    predictions, unknown_counts = _encode_prediction_frame(prepared)
    result_frame = prepared.copy()
    result_frame["Predicted_Export_Value"] = predictions

    for column, count in unknown_counts.items():
        if count:
            warnings.append(
                f"{count} nilai `{column}` pada dataset manual tidak dikenali encoder model dan dipetakan ke unknown."
            )

    preview = result_frame.head(100).copy()
    preview_columns = [column for column in (
        "Reporter",
        "Partner",
        "HS4",
        "Year",
        "Status",
        "ExportValue",
        "Predicted_Export_Value",
    ) if column in preview.columns]

    download_token, download_path = _save_prediction_dataframe(result_frame)

    return {
        "mode": "manual",
        "title": "Prediksi dari dataset manual",
        "subtitle": f"Hasil prediksi untuk file {filename}",
        "summary": {
            "candidate_rows": int(len(result_frame)),
            "preview_rows": int(len(preview)),
            "dataset_mode": source_label,
            "filename": filename,
        },
        "warnings": warnings,
        "preview_columns": tuple(preview_columns),
        "preview_rows": preview[preview_columns].to_dict(orient="records"),
        "download_token": download_token,
        "download_path": download_path,
    }


def get_prediction_download_path(download_token: str):
    token = "".join(char for char in str(download_token) if char.isalnum())
    if not token:
        return None
    path = RUNTIME_PREDICTION_DIR / f"{token}.csv"
    if not path.exists():
        return None
    return path
