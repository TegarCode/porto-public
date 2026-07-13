from __future__ import annotations

import json
import re
from pathlib import Path

import mysql.connector

APP_DIR = Path(__file__).resolve().parent
RUNTIME_DIR = APP_DIR / "runtime"
DB_CONFIG_PATH = RUNTIME_DIR / "db_config.json"
SCHEMA_PATH = APP_DIR / "flask.sql"
OPTIONAL_SCHEMA_PATHS = {
    "data_perdagangan": APP_DIR / "data_perdagangan (2).sql",
}
UNIQUE_KEY_SPECS = {
    "data_perdagangan_full_v3": (
        "unique_data",
        ("nama_negara", "kode_hs", "product_label", "status"),
    ),
    "data_perdagangan": (
        "unique_data_perdagangan",
        ("nama_negara", "kode_hs", "product_label", "status"),
    ),
}

DEFAULT_DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "flask",
}

REQUIRED_TABLES = (
    "perusahaan",
    "tbtrade",
    "tbnegara",
    "tbsumber",
    "ref_negara",
    "data_perdagangan_full_v3",
    "data_perdagangan",
)
SEEDED_REFERENCE_TABLES = frozenset({"ref_negara", "tbnegara", "tbsumber"})

IGNORABLE_SCHEMA_ERRORS = {
    1050,  # Table already exists
    1061,  # Duplicate key name
    1062,  # Duplicate entry
    1068,  # Multiple primary key defined
}


class DatabaseSetupError(RuntimeError):
    pass


def _quote_identifier(identifier: str):
    cleaned = str(identifier).strip()
    if not cleaned:
        raise DatabaseSetupError("Nama database atau tabel tidak boleh kosong.")
    return "`" + cleaned.replace("`", "``") + "`"


def ensure_runtime_dir():
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


def normalize_db_config(raw_config: dict | None, fallback: dict | None = None):
    base = dict(DEFAULT_DB_CONFIG)
    if fallback:
        base.update(fallback)
    if raw_config:
        base.update(raw_config)

    try:
        port = int(base.get("port", 3306))
    except (TypeError, ValueError):
        port = 3306

    return {
        "host": str(base.get("host", "")).strip() or DEFAULT_DB_CONFIG["host"],
        "port": max(1, port),
        "user": str(base.get("user", "")).strip() or DEFAULT_DB_CONFIG["user"],
        "password": str(base.get("password", "")),
        "database": str(base.get("database", "")).strip() or DEFAULT_DB_CONFIG["database"],
    }


def load_db_config():
    if not DB_CONFIG_PATH.exists():
        return None

    with DB_CONFIG_PATH.open("r", encoding="utf-8") as config_file:
        payload = json.load(config_file)

    return normalize_db_config(payload)


def save_db_config(config: dict):
    ensure_runtime_dir()
    normalized = normalize_db_config(config)
    with DB_CONFIG_PATH.open("w", encoding="utf-8") as config_file:
        json.dump(normalized, config_file, indent=2)
    return normalized


def is_database_configured():
    return load_db_config() is not None


def build_connection_kwargs(config: dict, include_database: bool = True):
    normalized = normalize_db_config(config)
    kwargs = {
        "host": normalized["host"],
        "port": normalized["port"],
        "user": normalized["user"],
        "password": normalized["password"],
    }
    if include_database:
        kwargs["database"] = normalized["database"]
    return kwargs


def _format_mysql_error(exc, config: dict):
    if getattr(exc, "errno", None) == 1045:
        return "Autentikasi MySQL gagal. Cek user dan password database."
    if getattr(exc, "errno", None) == 1049:
        return f"Database `{config['database']}` tidak ditemukan."
    if getattr(exc, "errno", None) == 2003:
        return (
            f"Tidak bisa terhubung ke MySQL di {config['host']}:{config['port']}. "
            "Pastikan servicenya aktif."
        )
    return str(exc)


def _get_table_count(cursor, table_name: str):
    cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
    row = cursor.fetchone()
    return int(row[0]) if row else 0


def probe_database(config: dict | None):
    if config is None:
        return {
            "configured": False,
            "server_ok": False,
            "database_exists": False,
            "schema_ready": False,
            "missing_tables": REQUIRED_TABLES,
            "table_counts": {},
            "message": "Konfigurasi database belum disimpan.",
            "config": normalize_db_config(DEFAULT_DB_CONFIG),
        }

    normalized = normalize_db_config(config)
    result = {
        "configured": True,
        "server_ok": False,
        "database_exists": False,
        "schema_ready": False,
        "missing_tables": REQUIRED_TABLES,
        "table_counts": {},
        "message": "",
        "config": normalized,
    }

    try:
        server_conn = mysql.connector.connect(**build_connection_kwargs(normalized, include_database=False))
    except mysql.connector.Error as exc:
        result["message"] = _format_mysql_error(exc, normalized)
        return result

    try:
        result["server_ok"] = True
        cursor = server_conn.cursor()
        cursor.execute("SHOW DATABASES LIKE %s", (normalized["database"],))
        result["database_exists"] = cursor.fetchone() is not None
        cursor.close()
    finally:
        server_conn.close()

    if not result["database_exists"]:
        result["message"] = (
            f"Database `{normalized['database']}` belum ada. "
            "Buat database itu dulu di MySQL, lalu ulangi setup."
        )
        return result

    try:
        database_conn = mysql.connector.connect(**build_connection_kwargs(normalized))
    except mysql.connector.Error as exc:
        result["message"] = _format_mysql_error(exc, normalized)
        return result

    try:
        cursor = database_conn.cursor()
        cursor.execute("SHOW TABLES")
        existing_tables = {row[0] for row in cursor.fetchall()}
        missing_tables = tuple(table for table in REQUIRED_TABLES if table not in existing_tables)
        result["missing_tables"] = missing_tables
        result["schema_ready"] = not missing_tables

        for table_name in (
            "tbnegara",
            "ref_negara",
            "tbsumber",
            "perusahaan",
            "tbtrade",
            "data_perdagangan_full_v3",
            "data_perdagangan",
        ):
            if table_name in existing_tables:
                result["table_counts"][table_name] = _get_table_count(cursor, table_name)

        if result["schema_ready"]:
            result["message"] = "Schema utama sudah siap dipakai."
        else:
            result["message"] = (
                "Sebagian tabel acuan belum ada: " + ", ".join(missing_tables) + "."
            )

        cursor.close()
    finally:
        database_conn.close()

    return result


def _transform_statement(statement: str):
    statement = statement.strip()
    if not statement:
        return ""

    if statement.upper().startswith("CREATE TABLE `"):
        statement = re.sub(
            r"^CREATE TABLE `",
            "CREATE TABLE IF NOT EXISTS `",
            statement,
            count=1,
            flags=re.IGNORECASE,
        )
    elif statement.upper().startswith("INSERT INTO `"):
        statement = re.sub(
            r"^INSERT INTO `",
            "INSERT IGNORE INTO `",
            statement,
            count=1,
            flags=re.IGNORECASE,
        )

    return statement


def _extract_insert_table_name(statement: str):
    match = re.match(
        r"^INSERT(?:\s+IGNORE)?\s+INTO\s+`([^`]+)`",
        statement.strip(),
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    return match.group(1)


def load_schema_statements(schema_path: Path | None = None):
    schema_file = schema_path or SCHEMA_PATH
    raw_sql = schema_file.read_text(encoding="utf-8")
    statements = []
    buffer = []

    for raw_line in raw_sql.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("--"):
            continue
        if line.startswith("/*!"):
            continue
        if line.upper().startswith("SET SQL_MODE"):
            continue
        if line.upper().startswith("START TRANSACTION"):
            continue
        if line.upper().startswith("SET TIME_ZONE"):
            continue
        if line.upper().startswith("COMMIT"):
            continue

        buffer.append(raw_line)
        if line.endswith(";"):
            statement = _transform_statement("\n".join(buffer).rstrip(";"))
            if statement:
                statements.append(statement)
            buffer = []

    trailing = _transform_statement("\n".join(buffer))
    if trailing:
        statements.append(trailing)

    return statements


def _table_exists(cursor, table_name: str):
    cursor.execute("SHOW TABLES LIKE %s", (table_name,))
    return cursor.fetchone() is not None


def _unique_key_exists(cursor, table_name: str, key_name: str):
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = %s
          AND index_name = %s
        LIMIT 1
        """,
        (table_name, key_name),
    )
    return cursor.fetchone() is not None


def _execute_schema_statements(cursor, statements, normalized, allowed_seed_tables=None):
    executed = 0
    ignored = 0
    skipped = 0
    allowed_seed_tables = frozenset(allowed_seed_tables or ())

    for statement in statements:
        insert_table = _extract_insert_table_name(statement)
        if insert_table and insert_table not in allowed_seed_tables:
            skipped += 1
            continue
        if (
            insert_table
            and insert_table in allowed_seed_tables
            and _table_exists(cursor, insert_table)
            and _get_table_count(cursor, insert_table) > 0
        ):
            skipped += 1
            continue

        try:
            cursor.execute(statement)
            executed += 1
        except mysql.connector.Error as exc:
            if getattr(exc, "errno", None) in IGNORABLE_SCHEMA_ERRORS:
                ignored += 1
                continue
            raise DatabaseSetupError(
                "Gagal menjalankan schema: " + _format_mysql_error(exc, normalized)
            ) from exc

    return {
        "executed": executed,
        "ignored": ignored,
        "skipped": skipped,
    }


def _ensure_unique_key_on_cursor(cursor, normalized, table_name: str):
    spec = UNIQUE_KEY_SPECS.get(table_name)
    if spec is None or not _table_exists(cursor, table_name):
        return {
            "table_name": table_name,
            "key_name": None,
            "created": False,
            "executed": 0,
            "ignored": 0,
        }

    key_name, columns = spec
    if _unique_key_exists(cursor, table_name, key_name):
        return {
            "table_name": table_name,
            "key_name": key_name,
            "created": False,
            "executed": 0,
            "ignored": 0,
        }

    column_sql = ",".join(f"`{column}`" for column in columns)
    try:
        cursor.execute(
            f"ALTER TABLE `{table_name}` ADD UNIQUE KEY `{key_name}` ({column_sql})"
        )
        return {
            "table_name": table_name,
            "key_name": key_name,
            "created": True,
            "executed": 1,
            "ignored": 0,
        }
    except mysql.connector.Error as exc:
        if getattr(exc, "errno", None) == 1062:
            raise DatabaseSetupError(
                f"Gagal membuat unique key `{key_name}` di tabel `{table_name}` karena "
                "sudah ada duplicate row. Bersihkan duplicate data dulu, lalu jalankan lagi."
            ) from exc
        if getattr(exc, "errno", None) in IGNORABLE_SCHEMA_ERRORS:
            return {
                "table_name": table_name,
                "key_name": key_name,
                "created": False,
                "executed": 0,
                "ignored": 1,
            }
        raise DatabaseSetupError(
            f"Gagal menambahkan unique key ke `{table_name}`: "
            + _format_mysql_error(exc, normalized)
        ) from exc


def _ensure_optional_table_on_cursor(cursor, normalized, table_name: str):
    schema_path = OPTIONAL_SCHEMA_PATHS.get(table_name)
    if schema_path is None:
        raise DatabaseSetupError(f"Tidak ada schema opsional yang terdaftar untuk tabel `{table_name}`.")
    if not schema_path.exists():
        raise DatabaseSetupError(f"File schema opsional tidak ditemukan: {schema_path}")

    if _table_exists(cursor, table_name):
        unique_result = _ensure_unique_key_on_cursor(cursor, normalized, table_name)
        return {
            "created": False,
            "executed": unique_result["executed"],
            "ignored": unique_result["ignored"],
            "skipped": 0,
            "table_name": table_name,
        }

    execution_result = _execute_schema_statements(
        cursor,
        load_schema_statements(schema_path),
        normalized,
        allowed_seed_tables=(),
    )

    unique_result = _ensure_unique_key_on_cursor(cursor, normalized, table_name)
    execution_result["executed"] += unique_result["executed"]
    execution_result["ignored"] += unique_result["ignored"]

    return {
        "created": True,
        "executed": execution_result["executed"],
        "ignored": execution_result["ignored"],
        "skipped": execution_result["skipped"],
        "table_name": table_name,
    }


def initialize_database(config: dict):
    status = probe_database(config)
    if not status["server_ok"]:
        raise DatabaseSetupError(status["message"])

    normalized = status["config"]

    if not status["database_exists"]:
        try:
            server_connection = mysql.connector.connect(
                **build_connection_kwargs(normalized, include_database=False)
            )
        except mysql.connector.Error as exc:
            raise DatabaseSetupError(_format_mysql_error(exc, normalized)) from exc

        try:
            cursor = server_connection.cursor()
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS {_quote_identifier(normalized['database'])} "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
            )
            server_connection.commit()
            cursor.close()
        except mysql.connector.Error as exc:
            raise DatabaseSetupError(
                "Gagal membuat database: " + _format_mysql_error(exc, normalized)
            ) from exc
        finally:
            server_connection.close()

        status = probe_database(normalized)
        if not status["database_exists"]:
            raise DatabaseSetupError(status["message"])

    try:
        connection = mysql.connector.connect(**build_connection_kwargs(normalized))
    except mysql.connector.Error as exc:
        raise DatabaseSetupError(_format_mysql_error(exc, normalized)) from exc

    try:
        cursor = connection.cursor()
        main_execution = _execute_schema_statements(
            cursor,
            load_schema_statements(SCHEMA_PATH),
            normalized,
            allowed_seed_tables=SEEDED_REFERENCE_TABLES,
        )
        optional_results = []
        for table_name in OPTIONAL_SCHEMA_PATHS:
            optional_results.append(_ensure_optional_table_on_cursor(cursor, normalized, table_name))
        unique_results = []
        for table_name in UNIQUE_KEY_SPECS:
            unique_results.append(_ensure_unique_key_on_cursor(cursor, normalized, table_name))

        execution_result = {
            "executed": main_execution["executed"]
            + sum(item["executed"] for item in optional_results)
            + sum(item["executed"] for item in unique_results),
            "ignored": main_execution["ignored"]
            + sum(item["ignored"] for item in optional_results)
            + sum(item["ignored"] for item in unique_results),
            "skipped": main_execution["skipped"] + sum(item["skipped"] for item in optional_results),
        }
        connection.commit()
        cursor.close()
    finally:
        connection.close()

    snapshot = probe_database(normalized)
    return {
        "executed": execution_result["executed"],
        "ignored": execution_result["ignored"],
        "skipped": execution_result["skipped"],
        "optional_tables": optional_results,
        "unique_keys": unique_results,
        "snapshot": snapshot,
    }


def ensure_optional_table(config: dict, table_name: str):
    normalized = normalize_db_config(config)

    try:
        connection = mysql.connector.connect(**build_connection_kwargs(normalized))
    except mysql.connector.Error as exc:
        raise DatabaseSetupError(_format_mysql_error(exc, normalized)) from exc

    try:
        cursor = connection.cursor()
        result = _ensure_optional_table_on_cursor(cursor, normalized, table_name)
        connection.commit()
        cursor.close()
    finally:
        connection.close()

    return result


def ensure_table_unique_key(config: dict, table_name: str):
    normalized = normalize_db_config(config)

    try:
        connection = mysql.connector.connect(**build_connection_kwargs(normalized))
    except mysql.connector.Error as exc:
        raise DatabaseSetupError(_format_mysql_error(exc, normalized)) from exc

    try:
        cursor = connection.cursor()
        result = _ensure_unique_key_on_cursor(cursor, normalized, table_name)
        connection.commit()
        cursor.close()
    finally:
        connection.close()

    return result


def build_db_profile():
    config = load_db_config()
    if config is None:
        return {
            "configured": False,
            "label": "DB belum diatur",
            "detail": "Buka halaman konfigurasi database.",
        }

    status = probe_database(config)
    if status["schema_ready"]:
        label = f"{config['database']} @ {config['host']}"
        detail = "Schema aktif dan siap dipakai."
    elif status["database_exists"]:
        label = f"{config['database']} @ {config['host']}"
        detail = "Database tersambung, schema belum lengkap."
    else:
        label = f"{config['database']} @ {config['host']}"
        detail = status["message"]

    return {
        "configured": True,
        "label": label,
        "detail": detail,
    }
