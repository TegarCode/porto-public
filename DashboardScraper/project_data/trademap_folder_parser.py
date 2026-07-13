from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import mysql.connector
import pandas as pd
from bs4 import BeautifulSoup

DASHBOARD_DIR = Path(__file__).resolve().parents[1]
if str(DASHBOARD_DIR) not in sys.path:
    sys.path.insert(0, str(DASHBOARD_DIR))

from db_runtime import (  # noqa: E402
    DatabaseSetupError,
    ensure_optional_table,
    ensure_table_unique_key,
    load_db_config,
)

PARSER_MODES = ("model_1_default", "model_2_negara_all")
PARSER_PROFILES = ("auto", "html", "excel")
SUPPORTED_STATUS = ("export", "import")
YEAR_RANGE = tuple(range(2017, 2026))
MODEL_1_PREFIXES = ("IndonesiaMitra", "MitraWorld", "IndonesiaWorld")
MODEL_1_TABLE = "data_perdagangan_full_v3"
MODEL_2_TABLE = "data_perdagangan"
MODEL_1_FALLBACK_KODE_NEGARA_LENGTH = 100
PARSER_MODE_LABELS = {
    "model_1_default": "Negara-Mitra",
    "model_2_negara_all": "Negara-ALL",
}


def parse_args():
    saved_db_config = load_db_config() or {}

    parser = argparse.ArgumentParser(
        description="Parser folder TradeMap untuk dashboard Flask."
    )
    parser.add_argument(
        "--parser-mode",
        choices=PARSER_MODES,
        default="model_1_default",
        help="Model parser TradeMap yang akan dipakai.",
    )
    parser.add_argument(
        "--status",
        choices=SUPPORTED_STATUS,
        default="export",
        help="Jenis data TradeMap yang sedang diproses.",
    )
    parser.add_argument(
        "--parser-profile",
        choices=PARSER_PROFILES,
        default="auto",
        help="Jenis sumber file TradeMap.",
    )
    parser.add_argument(
        "--folder-source",
        required=True,
        help="Folder hasil upload yang berisi file TradeMap.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse file tanpa insert database.",
    )
    parser.add_argument(
        "--db-host",
        default=os.getenv("APP_DB_HOST")
        or saved_db_config.get("host")
        or os.getenv("BPS_DB_HOST")
        or "localhost",
        help="Host database MySQL.",
    )
    parser.add_argument(
        "--db-port",
        type=int,
        default=int(
            os.getenv("APP_DB_PORT")
            or saved_db_config.get("port")
            or os.getenv("BPS_DB_PORT")
            or "3306"
        ),
        help="Port database MySQL.",
    )
    parser.add_argument(
        "--db-user",
        default=os.getenv("APP_DB_USER")
        or saved_db_config.get("user")
        or os.getenv("BPS_DB_USER")
        or "root",
        help="User database MySQL.",
    )
    parser.add_argument(
        "--db-password",
        default=os.getenv("APP_DB_PASSWORD")
        or saved_db_config.get("password")
        or os.getenv("BPS_DB_PASSWORD")
        or "",
        help="Password database MySQL.",
    )
    parser.add_argument(
        "--db-name",
        default=os.getenv("APP_DB_NAME")
        or saved_db_config.get("database")
        or os.getenv("BPS_DB_NAME")
        or "flask",
        help="Nama database tujuan.",
    )
    return parser.parse_args()


def print_header(args):
    print("TRADEMAP FOLDER PARSER")
    mode_label = PARSER_MODE_LABELS.get(args.parser_mode, args.parser_mode)
    print(f"Parser Mode    : {args.parser_mode} ({mode_label})")
    print(f"Status         : {args.status}")
    print(f"Parser Profile : {args.parser_profile}")
    print(f"Folder Source  : {args.folder_source}")
    print(f"Dry Run        : {args.dry_run}")
    print(f"Target DB      : {args.db_name}@{args.db_host}:{args.db_port}")


def normalize_status_label(status: str):
    return status.strip().lower().capitalize()


def clean_text(value):
    if value is None:
        return ""
    return str(value).replace("\n", " ").replace("\r", " ").strip()


def clean_number(value):
    if value is None:
        return 0.0
    if isinstance(value, float) and pd.isna(value):
        return 0.0

    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "-", "...", "na"}:
        return 0.0

    text = text.replace(",", "").replace(" ", "")
    text = re.sub(r"[^\d.\-]", "", text)
    if not text or text in {"-", ".", "-."}:
        return 0.0

    try:
        return float(text)
    except ValueError:
        return 0.0


def normalize_hs_code(value):
    text = clean_text(value).replace("'", "")
    digits = re.sub(r"\D", "", text)
    return digits or ""


def normalized_name_keys(value):
    text = clean_text(value).upper()
    text = text.replace("_", " ")
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    spaced = re.sub(r"\s+", " ", text).strip()
    compact = spaced.replace(" ", "")

    keys = []
    if spaced:
        keys.append(spaced)
    if compact and compact not in keys:
        keys.append(compact)
    return keys


def normalize_country_candidate(value):
    text = clean_text(value).replace("_", " ")
    text = re.sub(r"\s+", " ", text)
    text = text.strip(" -_,.;:/")
    return text.upper()


def extract_partner_from_bilateral_phrase(value):
    text = clean_text(value).replace("_", " ")
    text = re.sub(r"\s+", " ", text)

    match = re.search(
        r"bilateral\s+trade\s+between\s+(.+?)\s+and\s+(.+?)(?:\s+product:|\s*$)",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    left = normalize_country_candidate(match.group(1))
    right = normalize_country_candidate(match.group(2))
    if not left or not right:
        return None

    if left == "INDONESIA":
        return right
    if right == "INDONESIA":
        return left
    return right


def extract_partner_from_trade_header(value):
    text = clean_text(value).replace("_", " ")
    text = re.sub(r"\s+", " ", text)

    patterns = (
        r"indonesia(?:'s)?\s+(?:imports|exports)\s+(?:from|to)\s+(.+?)(?:\s{2,}|\s+value\s+in|\s*$)",
        r"(.+?)(?:'s)?\s+(?:imports|exports)\s+(?:from|to)\s+indonesia(?:\s|$)",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            country = normalize_country_candidate(match.group(1))
            if country and country != "INDONESIA":
                return country
    return None


def extract_country_from_list_phrase(value):
    text = clean_text(value).replace("_", " ")
    text = re.sub(r"\s+", " ", text)

    match = re.search(
        r"list\s+of\s+products\s+(?:imported|exported)\s+by\s+(.+?)(?:\s+from\s+world|\s*$)",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    country = normalize_country_candidate(match.group(1))
    if country and country != "WORLD":
        return country
    return None


def extract_country_name_from_html_title(file_path: Path):
    try:
        preview = file_path.read_text(encoding="utf-8", errors="ignore")[:12000]
    except OSError:
        return None

    soup = BeautifulSoup(preview, "html.parser")

    title_candidates = []

    first_bold = soup.find("b")
    if first_bold is not None:
        title_candidates.append(first_bold.get_text(" ", strip=True))

    first_center = soup.find("center")
    if first_center is not None:
        title_candidates.append(first_center.get_text(" ", strip=True))

    for candidate in title_candidates:
        for extractor in (extract_partner_from_bilateral_phrase, extract_country_from_list_phrase):
            country = extractor(candidate)
            if country:
                return country

    return None


def extract_country_name_from_html_preview(file_path: Path):
    try:
        preview = file_path.read_text(encoding="utf-8", errors="ignore")[:12000]
    except OSError:
        return None

    preview_text = BeautifulSoup(preview, "html.parser").get_text(" ", strip=True)
    for extractor in (
        extract_partner_from_bilateral_phrase,
        extract_country_from_list_phrase,
        extract_partner_from_trade_header,
    ):
        country = extractor(preview_text)
        if country:
            return country
    return None


def build_country_lookup(cursor):
    lookup = {}

    cursor.execute("SELECT Negara_ENG, Negara_IDN, Kode_Alpha3 FROM tbnegara")
    for negara_eng, negara_idn, kode_alpha3 in cursor.fetchall():
        canonical = clean_text(negara_eng).upper() or clean_text(negara_idn).upper()
        payload = {
            "nama_negara": canonical,
            "kode_negara": kode_alpha3,
        }
        for source_name in (negara_eng, negara_idn, canonical):
            for key in normalized_name_keys(source_name):
                lookup[key] = payload

    cursor.execute("SELECT nama_raw, kode_alpha3 FROM ref_negara")
    for nama_raw, kode_alpha3 in cursor.fetchall():
        payload = {
            "nama_negara": clean_text(nama_raw).upper(),
            "kode_negara": kode_alpha3,
        }
        for key in normalized_name_keys(nama_raw):
            lookup.setdefault(key, payload)

    return lookup


def extract_country_name(file_path: Path):
    stem = file_path.stem.strip()
    stem = re.sub(r"_[0-9]{8,}$", "", stem)
    upper_stem = stem.upper()

    if "(ALL_PRODUCTS)" in upper_stem:
        return "ALL"

    country_from_html_title = extract_country_name_from_html_title(file_path)
    if country_from_html_title:
        return country_from_html_title

    country_from_html = extract_country_name_from_html_preview(file_path)
    if country_from_html:
        return country_from_html

    lower_stem = stem.lower()
    if "_by_" in lower_stem:
        parts = re.split(r"_by_", stem, flags=re.IGNORECASE)
        stem = parts[-1]

    for extractor in (extract_partner_from_bilateral_phrase,):
        country = extractor(stem)
        if country:
            return country

    return normalize_country_candidate(stem)


def resolve_country_info(file_path: Path, country_lookup):
    raw_name = extract_country_name(file_path)
    if raw_name == "ALL":
        return {
            "nama_negara": "ALL",
            "kode_negara": None,
            "fallback_kode_negara": "ALL",
            "raw_name": raw_name,
            "resolved": True,
        }

    for key in normalized_name_keys(raw_name):
        payload = country_lookup.get(key)
        if payload:
            return {
                "nama_negara": payload["nama_negara"],
                "kode_negara": payload["kode_negara"],
                "fallback_kode_negara": payload["kode_negara"],
                "raw_name": raw_name,
                "resolved": True,
            }

    return {
        "nama_negara": raw_name,
        "kode_negara": None,
        "fallback_kode_negara": raw_name,
        "raw_name": raw_name,
        "resolved": False,
    }


def build_model_1_row(country_info, status_label):
    row = {
        "nama_negara": country_info["nama_negara"],
        "kode_negara": country_info["kode_negara"] or country_info.get("fallback_kode_negara"),
        "kode_hs": "",
        "product_label": "",
        "status": status_label,
    }
    for prefix in MODEL_1_PREFIXES:
        for year in YEAR_RANGE:
            row[f"{prefix}_{year}"] = None
    return row


def build_model_2_row(country_info, status_label):
    row = {
        "nama_negara": country_info["nama_negara"],
        "kode_negara": country_info["kode_negara"],
        "kode_hs": "",
        "product_label": "",
        "status": status_label,
    }
    for year in YEAR_RANGE:
        row[f"tahun_{year}"] = 0.0
    return row


def split_non_empty_blocks(values):
    blocks = []
    current = []

    for value in values:
        text = clean_text(value)
        if text:
            current.append(text)
            continue

        if current:
            blocks.append(current)
            current = []

    if current:
        blocks.append(current)

    return blocks


def extract_year(value):
    match = re.search(r"(20\d{2})", clean_text(value))
    if not match:
        return None
    return int(match.group(1))


def is_html_trade_map_file(file_path: Path):
    try:
        preview = file_path.read_text(encoding="utf-8", errors="ignore")[:8000].lower()
    except OSError:
        return False

    return "ctl00_pagecontent_mygridview1" in preview and "<table" in preview


def detect_profile(file_path: Path, requested_profile: str):
    if requested_profile != "auto":
        return requested_profile
    return "html" if is_html_trade_map_file(file_path) else "excel"


def parse_model_1_html_matrix(file_path: Path, country_info, status_label):
    soup = BeautifulSoup(file_path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    table = soup.find("table", {"id": "ctl00_PageContent_MyGridView1"})
    if table is None:
        return []

    rows = table.find_all("tr")
    if len(rows) < 3:
        return []

    parsed_rows = []

    for raw_row in rows[2:]:
        cells = [clean_text(cell.get_text()) for cell in raw_row.find_all("td")]
        if len(cells) < 28:
            continue

        kode_hs = normalize_hs_code(cells[0])
        product_label = clean_text(cells[1])

        if not kode_hs or "TOTAL" in clean_text(cells[0]).upper():
            continue

        # Mengikuti parser lama Scrapindohs4ex.py:
        # 2:10  -> IndonesiaMitra (8 tahun)
        # 11:19 -> MitraWorld   (8 tahun)
        # 20:28 -> IndonesiaWorld (8 tahun)
        indo_mitra = cells[2:10]
        mitra_world = cells[11:19]
        indo_world = cells[20:28]
        if len(indo_mitra) < 8 or len(mitra_world) < 8 or len(indo_world) < 8:
            continue

        trade_row = build_model_1_row(country_info, status_label)
        trade_row["kode_hs"] = kode_hs
        trade_row["product_label"] = product_label

        for index in range(8):
            year = 2018 + index
            trade_row[f"IndonesiaMitra_{year}"] = clean_number(indo_mitra[index])
            trade_row[f"MitraWorld_{year}"] = clean_number(mitra_world[index])
            trade_row[f"IndonesiaWorld_{year}"] = clean_number(indo_world[index])

        parsed_rows.append(trade_row)

    return parsed_rows


def parse_model_2_html_matrix(file_path: Path, country_info, status_label):
    soup = BeautifulSoup(file_path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    table = soup.find("table", {"id": "ctl00_PageContent_MyGridView1"})
    if table is None:
        return []

    rows = table.find_all("tr")
    if len(rows) < 3:
        return []

    header_row = rows[1]
    header_cells = [cell.get_text(" ", strip=True) for cell in header_row.find_all(["td", "th"])]
    year_blocks = split_non_empty_blocks(header_cells)
    if not year_blocks:
        return []

    bilateral_years = [extract_year(cell) for cell in year_blocks[0]]
    bilateral_years = [year for year in bilateral_years if year is not None]
    if not bilateral_years:
        return []

    parsed_rows = []
    for raw_row in rows[2:]:
        cells = [cell.get_text(" ", strip=True) for cell in raw_row.find_all("td")]
        if len(cells) < 4:
            continue

        kode_hs = normalize_hs_code(cells[0])
        product_label = clean_text(cells[1])
        if not kode_hs or "TOTAL" in clean_text(cells[0]).upper():
            continue

        value_blocks = split_non_empty_blocks(cells[2:])
        if not value_blocks:
            continue

        trade_row = build_model_2_row(country_info, status_label)
        trade_row["kode_hs"] = kode_hs
        trade_row["product_label"] = product_label

        for year, value in zip(bilateral_years, value_blocks[0]):
            column_name = f"tahun_{year}"
            if column_name in trade_row:
                trade_row[column_name] = clean_number(value)

        parsed_rows.append(trade_row)

    return parsed_rows


def detect_code_column(columns):
    lowered = {clean_text(column).lower(): column for column in columns}
    for candidate in ("code", "product code"):
        if candidate in lowered:
            return lowered[candidate]
    return None


def detect_label_column(columns):
    lowered = {clean_text(column).lower(): column for column in columns}
    for candidate in ("product label", "label"):
        if candidate in lowered:
            return lowered[candidate]
    return None


def build_model_1_rows_from_dataframe(dataframe, country_info, status_label):
    dataframe.columns = [clean_text(column) for column in dataframe.columns]

    code_column = detect_code_column(dataframe.columns)
    label_column = detect_label_column(dataframe.columns)
    if code_column is None or label_column is None:
        return []

    year_columns = []
    for column in dataframe.columns:
        lowered = clean_text(column).lower()
        year = extract_year(lowered)
        if year is None or "value" not in lowered:
            continue
        year_columns.append((column, year))

    if not year_columns:
        return []

    parsed_rows = []
    for _, raw_row in dataframe.iterrows():
        kode_hs = normalize_hs_code(raw_row.get(code_column))
        product_label = clean_text(raw_row.get(label_column))

        if not kode_hs or kode_hs.upper() == "TOTAL":
            continue

        trade_row = build_model_1_row(country_info, status_label)
        trade_row["kode_hs"] = kode_hs
        trade_row["product_label"] = product_label

        for column_name, year in year_columns:
            column_key = f"IndonesiaMitra_{year}"
            if column_key in trade_row:
                trade_row[column_key] = clean_number(raw_row.get(column_name))

        parsed_rows.append(trade_row)

    return parsed_rows


def is_yearly_header_row(columns):
    lowered = [clean_text(column).lower() for column in columns]
    joined = " ".join(lowered)
    return (
        "code" in joined
        and "product" in joined
        and any("value" in column and extract_year(column) is not None for column in lowered)
    )


def dataframe_from_yearly_html(file_path: Path):
    soup = BeautifulSoup(file_path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
    table = soup.find("table", {"id": "ctl00_PageContent_MyGridView1"})
    if not table:
        return None

    rows = table.find_all("tr")
    header = None
    data = []

    for row in rows:
        columns = [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]
        if not columns:
            continue

        if header is None and is_yearly_header_row(columns):
            header = columns
            continue

        if header is not None:
            data.append(columns)

    if header is None or not data:
        return None

    max_len = len(header)
    normalized_data = []
    for row in data:
        padded_row = list(row[:max_len]) + [""] * max(0, max_len - len(row))
        normalized_data.append(padded_row)

    dataframe = pd.DataFrame(normalized_data, columns=header)
    dataframe.columns = dataframe.columns.str.strip().str.lower()
    return dataframe


def build_model_2_rows_from_dataframe(dataframe, country_info, status_label):
    dataframe.columns = [clean_text(column) for column in dataframe.columns]

    code_column = detect_code_column(dataframe.columns)
    label_column = detect_label_column(dataframe.columns)
    if code_column is None or label_column is None:
        return []

    year_columns = []
    for column in dataframe.columns:
        lowered = clean_text(column).lower()
        year = extract_year(lowered)
        if year is None or "value" not in lowered:
            continue
        year_columns.append((column, year))

    if not year_columns:
        return []

    parsed_rows = []
    for _, raw_row in dataframe.iterrows():
        kode_hs = normalize_hs_code(raw_row.get(code_column))
        product_label = clean_text(raw_row.get(label_column))

        if not kode_hs or kode_hs.upper() == "TOTAL":
            continue

        trade_row = build_model_2_row(country_info, status_label)
        trade_row["kode_hs"] = kode_hs
        trade_row["product_label"] = product_label

        for column_name, year in year_columns:
            column_key = f"tahun_{year}"
            if column_key in trade_row:
                trade_row[column_key] = clean_number(raw_row.get(column_name))

        parsed_rows.append(trade_row)

    return parsed_rows


def parse_model_1_excel(file_path: Path, country_info, status_label):
    dataframe = pd.read_excel(file_path)
    return build_model_1_rows_from_dataframe(dataframe, country_info, status_label)


def parse_model_2_excel(file_path: Path, country_info, status_label):
    dataframe = pd.read_excel(file_path)
    return build_model_2_rows_from_dataframe(dataframe, country_info, status_label)


def parse_model_2_html(file_path: Path, country_info, status_label):
    # Negara-ALL mengikuti parser datanew.py:
    # baca tabel yearly style jadi dataframe, lalu mapping kolom "value in <tahun>" ke tahun_20xx.
    dataframe = dataframe_from_yearly_html(file_path)
    if dataframe is None:
        return []
    return build_model_2_rows_from_dataframe(dataframe, country_info, status_label)


def iter_trade_files(folder_source: Path):
    return sorted(
        [
            file_path
            for file_path in folder_source.rglob("*")
            if file_path.is_file() and file_path.suffix.lower() in {".xls", ".xlsx"}
        ]
    )


def build_insert_query(parser_mode: str):
    if parser_mode == "model_2_negara_all":
        year_columns = [f"tahun_{year}" for year in YEAR_RANGE]
        columns = [
            "nama_negara",
            "kode_negara",
            "kode_hs",
            "product_label",
            *year_columns,
            "status",
        ]
        target_table = MODEL_2_TABLE
    else:
        year_columns = [f"{prefix}_{year}" for prefix in MODEL_1_PREFIXES for year in YEAR_RANGE]
        columns = [
            "nama_negara",
            "kode_negara",
            "kode_hs",
            "product_label",
            *year_columns,
            "status",
        ]
        target_table = MODEL_1_TABLE

    placeholders = ", ".join(["%s"] * len(columns))
    column_sql = ", ".join(columns)
    update_columns = [
        column
        for column in columns
        if column not in {"nama_negara", "kode_hs", "product_label", "status"}
    ]
    update_sql = ", ".join(f"{column}=VALUES({column})" for column in update_columns)
    query = (
        f"INSERT INTO {target_table} ({column_sql}) VALUES ({placeholders}) "
        f"ON DUPLICATE KEY UPDATE {update_sql}"
    )
    return columns, query, target_table


def row_to_values(row, columns):
    return [row.get(column) for column in columns]


def build_row_identity(row):
    return (
        row.get("nama_negara"),
        row.get("kode_hs"),
        row.get("product_label"),
        row.get("status"),
    )


def fetch_existing_identities(cursor, target_table: str, rows):
    identities = [build_row_identity(row) for row in rows]
    if not identities:
        return set()

    existing = set()
    chunk_size = 250
    for start in range(0, len(identities), chunk_size):
        chunk = identities[start : start + chunk_size]
        placeholders = ", ".join(["(%s, %s, %s, %s)"] * len(chunk))
        flat_params = []
        for identity in chunk:
            flat_params.extend(identity)

        cursor.execute(
            f"""
            SELECT nama_negara, kode_hs, product_label, status
            FROM {target_table}
            WHERE (nama_negara, kode_hs, product_label, status) IN ({placeholders})
            """,
            flat_params,
        )
        existing.update(tuple(row) for row in cursor.fetchall())

    return existing


def create_connection(args):
    return mysql.connector.connect(
        host=args.db_host,
        port=args.db_port,
        user=args.db_user,
        password=args.db_password,
        database=args.db_name,
    )


def get_db_config_from_args(args):
    return {
        "host": args.db_host,
        "port": args.db_port,
        "user": args.db_user,
        "password": args.db_password,
        "database": args.db_name,
    }


def validate_args(args):
    folder_source = Path(args.folder_source)
    if not folder_source.exists() or not folder_source.is_dir():
        raise FileNotFoundError(f"Folder source tidak ditemukan: {folder_source}")
    if args.db_port < 1:
        raise ValueError("Port database harus lebih besar dari 0.")
    return folder_source


def ensure_target_table_if_needed(args):
    if args.dry_run or args.parser_mode != "model_2_negara_all":
        return None

    return ensure_optional_table(get_db_config_from_args(args), MODEL_2_TABLE)


def ensure_model_1_schema_if_needed(args):
    if args.dry_run or args.parser_mode != "model_1_default":
        return None

    connection = create_connection(args)
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            SELECT CHARACTER_MAXIMUM_LENGTH
            FROM information_schema.columns
            WHERE table_schema = %s
              AND table_name = %s
              AND column_name = 'kode_negara'
            """,
            (args.db_name, MODEL_1_TABLE),
        )
        row = cursor.fetchone()
        current_length = row[0] if row else None
        if current_length is None or current_length >= MODEL_1_FALLBACK_KODE_NEGARA_LENGTH:
            return {
                "altered": False,
                "table_name": MODEL_1_TABLE,
                "current_length": current_length,
            }

        cursor.execute(
            f"""
            ALTER TABLE {MODEL_1_TABLE}
            MODIFY kode_negara VARCHAR({MODEL_1_FALLBACK_KODE_NEGARA_LENGTH})
            CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL
            """
        )
        connection.commit()
        return {
            "altered": True,
            "table_name": MODEL_1_TABLE,
            "previous_length": current_length,
            "current_length": MODEL_1_FALLBACK_KODE_NEGARA_LENGTH,
        }
    finally:
        cursor.close()
        connection.close()


def ensure_target_unique_key_if_needed(args):
    if args.dry_run:
        return None

    target_table = MODEL_2_TABLE if args.parser_mode == "model_2_negara_all" else MODEL_1_TABLE
    return ensure_table_unique_key(get_db_config_from_args(args), target_table)


def parse_rows_for_file(file_path: Path, country_info, status_label, parser_mode: str, parser_profile: str):
    if parser_mode == "model_2_negara_all":
        if parser_profile == "html":
            return parse_model_2_html(file_path, country_info, status_label)
        return parse_model_2_excel(file_path, country_info, status_label)

    if parser_profile == "html":
        return parse_model_1_html_matrix(file_path, country_info, status_label)
    return parse_model_1_excel(file_path, country_info, status_label)


def run_parser(args):
    folder_source = validate_args(args)
    print_header(args)

    table_setup = ensure_target_table_if_needed(args)
    if table_setup is not None:
        if table_setup["created"]:
            print(
                f"[Info] Tabel `{table_setup['table_name']}` dibuat otomatis "
                f"({table_setup['executed']} statement, {table_setup['ignored']} diabaikan)."
            )
        else:
            print(f"[Info] Tabel `{table_setup['table_name']}` sudah tersedia.")

    model_1_schema = ensure_model_1_schema_if_needed(args)
    if model_1_schema is not None and model_1_schema["altered"]:
        print(
            f"[Info] Kolom `{MODEL_1_TABLE}.kode_negara` diperlebar dari "
            f"{model_1_schema['previous_length']} ke {model_1_schema['current_length']} karakter."
        )

    unique_key_result = ensure_target_unique_key_if_needed(args)
    if unique_key_result is not None and unique_key_result["created"]:
        print(
            f"[Info] Unique key `{unique_key_result['key_name']}` dibuat otomatis "
            f"di tabel `{unique_key_result['table_name']}` untuk mencegah duplicate entry."
        )

    files = iter_trade_files(folder_source)
    if not files:
        raise FileNotFoundError("Tidak ada file .xls atau .xlsx di folder upload.")

    print(f"TOTAL FILE TERDETEKSI: {len(files)}")

    if args.dry_run:
        connection = None
        cursor = None
    else:
        connection = create_connection(args)
        cursor = connection.cursor()

    lookup_connection = connection or create_connection(args)
    lookup_cursor = lookup_connection.cursor()
    country_lookup = build_country_lookup(lookup_cursor)
    lookup_cursor.close()
    if connection is None:
        lookup_connection.close()

    status_label = normalize_status_label(args.status)
    insert_columns, insert_query, target_table = build_insert_query(args.parser_mode)

    total_parsed_rows = 0
    total_inserted_rows = 0
    total_updated_rows = 0
    total_skipped_files = 0

    try:
        for file_path in files:
            relative_name = file_path.relative_to(folder_source)
            detected_profile = detect_profile(file_path, args.parser_profile)
            country_info = resolve_country_info(file_path, country_lookup)

            if not country_info["resolved"]:
                print(
                    f"[Warning] Negara tidak ditemukan di referensi: {country_info['raw_name']} "
                    f"-> kode_negara akan NULL"
                )

            try:
                parsed_rows = parse_rows_for_file(
                    file_path,
                    country_info,
                    status_label,
                    args.parser_mode,
                    detected_profile,
                )
            except Exception as exc:
                print(f"[ERROR] {relative_name} | parser crash | {exc}")
                total_skipped_files += 1
                continue

            if not parsed_rows:
                print(
                    f"[Warning] {relative_name} | mode {args.parser_mode} | profile {detected_profile} | "
                    "tidak ada row yang valid"
                )
                total_skipped_files += 1
                continue

            total_parsed_rows += len(parsed_rows)

            if args.dry_run:
                print(
                    f"[Dry Run] {relative_name} | mode {args.parser_mode} | profile {detected_profile} | "
                    f"table {target_table} | negara {country_info['nama_negara']} | rows {len(parsed_rows)}"
                )
                continue

            existing_identities = fetch_existing_identities(cursor, target_table, parsed_rows)
            values = [row_to_values(row, insert_columns) for row in parsed_rows]
            cursor.executemany(insert_query, values)
            connection.commit()

            updated_rows = len(existing_identities)
            inserted_rows = max(len(parsed_rows) - updated_rows, 0)
            total_inserted_rows += inserted_rows
            total_updated_rows += updated_rows

            print(
                f"[OK] {relative_name} | mode {args.parser_mode} | profile {detected_profile} | "
                f"table {target_table} | negara {country_info['nama_negara']} | "
                f"parsed {len(parsed_rows)} | inserted {inserted_rows} | updated {updated_rows}"
            )
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None:
            connection.close()

    print("")
    print("RINGKASAN PARSER TRADEMAP")
    print(f"Target table    : {target_table}")
    print(f"File diproses   : {len(files)}")
    print(f"File dilewati   : {total_skipped_files}")
    print(f"Row ter-parse   : {total_parsed_rows}")
    if args.dry_run:
        print("Insert database : dry run, tidak ada row yang disimpan")
    else:
        print(f"Insert database : {total_inserted_rows}")
        print(f"Update database : {total_updated_rows}")

    return 0


def main():
    try:
        args = parse_args()
        raise SystemExit(run_parser(args))
    except DatabaseSetupError as exc:
        print(f"[FATAL] {exc}")
        raise SystemExit(1)
    except Exception as exc:
        print(f"[FATAL] {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
