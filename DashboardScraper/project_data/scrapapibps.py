from __future__ import annotations

import argparse
from datetime import date
import os
import re
import sys
from pathlib import Path
from time import sleep

import mysql.connector
import pandas as pd
import requests

from bps_paths import get_default_bps_hs_file

BASE_URL = "https://webapi.bps.go.id/v1/api/dataexim/"
SUPPORTED_YEARS = tuple(str(year) for year in range(date.today().year - 10, date.today().year))
SUPPORTED_YEAR_LABEL = f"{SUPPORTED_YEARS[0]}-{SUPPORTED_YEARS[-1]}"
DEFAULT_YEAR = SUPPORTED_YEARS[-1]
FLOW_CONFIG = {
    "export": {
        "sumber": 1,
        "status": "Export",
    },
    "import": {
        "sumber": 2,
        "status": "Import",
    },
}

DEFAULT_API_KEY = os.getenv("BPS_API_KEY", "8441b53593c5e1b27da59e623de54010")
DEFAULT_DB_HOST = os.getenv("BPS_DB_HOST", os.getenv("APP_DB_HOST", "localhost"))
DEFAULT_DB_PORT = int(os.getenv("BPS_DB_PORT", os.getenv("APP_DB_PORT", "3306")))
DEFAULT_DB_USER = os.getenv("BPS_DB_USER", os.getenv("APP_DB_USER", "root"))
DEFAULT_DB_PASSWORD = os.getenv("BPS_DB_PASSWORD", os.getenv("APP_DB_PASSWORD", ""))
DEFAULT_DB_NAME = os.getenv("BPS_DB_NAME", os.getenv("APP_DB_NAME", "flask"))
DEFAULT_HS_FILE = (
    Path(os.getenv("BPS_HS_FILE", ""))
    if os.getenv("BPS_HS_FILE")
    else get_default_bps_hs_file()
)


def parse_args():
    parser = argparse.ArgumentParser(
        description=f"Scraper BPS gabungan untuk export/import 10 tahun terakhir ({SUPPORTED_YEAR_LABEL})."
    )
    parser.add_argument(
        "--year",
        choices=SUPPORTED_YEARS,
        default=DEFAULT_YEAR,
        help=f"Tahun data BPS yang akan diambil. Pilihan mengikuti 10 tahun terakhir ({SUPPORTED_YEAR_LABEL}).",
    )
    parser.add_argument(
        "--flow",
        choices=tuple(FLOW_CONFIG.keys()),
        default="export",
        help="Jenis data perdagangan yang akan diambil.",
    )
    parser.add_argument(
        "--start-from-hs",
        default="",
        help="Resume dari HS tertentu. Kosongkan untuk mulai dari HS pertama di file sumber.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=15,
        help="Jumlah HS code per request API.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=0.3,
        help="Jeda antar request batch.",
    )
    parser.add_argument(
        "--max-batches",
        type=int,
        default=0,
        help="Batasi jumlah batch untuk testing. 0 berarti tanpa batas.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validasi konfigurasi dan tampilkan ringkasan tanpa insert database.",
    )
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="API key BPS.")
    parser.add_argument("--db-host", default=DEFAULT_DB_HOST, help="Host database MySQL.")
    parser.add_argument("--db-port", type=int, default=DEFAULT_DB_PORT, help="Port database MySQL.")
    parser.add_argument("--db-user", default=DEFAULT_DB_USER, help="User database MySQL.")
    parser.add_argument(
        "--db-password",
        default=DEFAULT_DB_PASSWORD,
        help="Password database MySQL.",
    )
    parser.add_argument(
        "--db-name",
        default=DEFAULT_DB_NAME,
        help="Nama database tujuan.",
    )
    parser.add_argument(
        "--hs-file",
        default=str(DEFAULT_HS_FILE),
        help="Path file Excel HS code.",
    )
    return parser.parse_args()


def print_header(args):
    print("SCRAPER BPS GABUNGAN")
    print(f"Year       : {args.year}")
    print(f"Flow       : {args.flow}")
    print(f"Start HS   : {args.start_from_hs or 'awal'}")
    print(f"Batch Size : {args.batch_size}")
    print(f"HS File    : {args.hs_file}")


def validate_args(args):
    if not args.api_key.strip():
        raise ValueError("API key BPS masih kosong.")
    if not args.db_host.strip():
        raise ValueError("Host database masih kosong.")
    if not args.db_user.strip():
        raise ValueError("User database masih kosong.")
    if not args.db_name.strip():
        raise ValueError("Nama database masih kosong.")
    if args.db_port < 1:
        raise ValueError("Port database harus lebih besar dari 0.")
    if args.batch_size < 1:
        raise ValueError("Batch size minimal 1.")
    if args.sleep_seconds < 0:
        raise ValueError("Sleep seconds tidak boleh negatif.")
    if str(args.year) not in SUPPORTED_YEARS:
        raise ValueError(
            f"Tahun {args.year} di luar rentang yang didukung. Gunakan salah satu dari {SUPPORTED_YEAR_LABEL}."
        )

    hs_path = Path(args.hs_file)
    if not hs_path.exists():
        raise FileNotFoundError(f"File HS code tidak ditemukan: {hs_path}")

    return hs_path


def load_hs_codes(hs_path: Path, start_from_hs: str):
    dataframe = pd.read_excel(hs_path, dtype=str)
    hs_codes = dataframe["hs_code"].dropna().str.strip().tolist()

    start_from_hs = (start_from_hs or "").strip()
    if start_from_hs:
        if start_from_hs in hs_codes:
            start_index = hs_codes.index(start_from_hs)
            hs_codes = hs_codes[start_index:]
            print(f"[Resume] Mulai dari HS {start_from_hs}")
        else:
            print("[Warning] HS tidak ditemukan di Excel, mulai dari awal")

    print(f"TOTAL HS AKAN DIPROSES: {len(hs_codes)}")
    return hs_codes


def chunked(items, size):
    for index in range(0, len(items), size):
        yield items[index : index + size]


def extract_number(text):
    match = re.search(r"\[(\d+)\]", str(text))
    return match.group(1) if match else None


def get_alpha3(cursor, country_name):
    sql = """
        SELECT Kode_Alpha3
        FROM tbnegara
        WHERE UPPER(Negara_ENG)=UPPER(%s)
        LIMIT 1
    """
    cursor.execute(sql, (country_name,))
    row = cursor.fetchone()
    return row[0] if row else None


def create_connection(args):
    return mysql.connector.connect(
        host=args.db_host,
        port=args.db_port,
        user=args.db_user,
        password=args.db_password,
        database=args.db_name,
    )


def run_scraper(args):
    hs_path = validate_args(args)
    print_header(args)
    hs_codes = load_hs_codes(hs_path, args.start_from_hs)

    if args.dry_run:
        print("[Dry Run] Konfigurasi valid. Tidak ada request API atau insert database.")
        return 0

    db = create_connection(args)
    cursor = db.cursor()
    flow_meta = FLOW_CONFIG[args.flow]
    total_batches = 0
    total_rows = 0
    total_inserted_rows = 0
    empty_batches = 0

    try:
        for batch_index, batch in enumerate(chunked(hs_codes, args.batch_size), start=1):
            if args.max_batches and batch_index > args.max_batches:
                print(f"[Info] Berhenti di batas max_batches={args.max_batches}")
                break

            total_batches += 1

            kodehs_str = ";".join(batch)
            params = {
                "sumber": flow_meta["sumber"],
                "periode": 1,
                "kodehs": kodehs_str,
                "jenishs": 2,
                "tahun": args.year,
                "key": args.api_key,
            }

            try:
                response = requests.get(BASE_URL, params=params, timeout=30)
                response.raise_for_status()
                payload = response.json()
                rows = payload.get("data") or []
                availability = str(payload.get("data-availability") or "").strip().lower()
                api_message = str(payload.get("message") or "").strip()

                rows_to_insert = []
                for row in rows:
                    bulan = extract_number(row.get("bulan"))
                    hscode = extract_number(row.get("kodehs"))

                    negara_raw = row.get("ctr")
                    alpha3_partner = get_alpha3(cursor, negara_raw)

                    rows_to_insert.append(
                        (
                            "IDN",
                            alpha3_partner,
                            None if alpha3_partner else negara_raw,
                            bulan,
                            args.year,
                            hscode,
                            row.get("netweight", 0),
                            row.get("value", 0),
                            flow_meta["status"],
                            1,
                            row.get("pod"),
                        )
                    )

                total_rows += len(rows)

                if not rows:
                    empty_batches += 1
                    empty_reason = api_message or "API tidak mengembalikan baris data untuk batch ini."
                    if availability == "unavailable" and not api_message:
                        empty_reason = "Data BPS untuk batch ini belum tersedia."
                    print(
                        f"[Info] {args.year} {args.flow} | batch {batch[0]} - {batch[-1]} | {empty_reason}"
                    )
                    sleep(args.sleep_seconds)
                    continue

                if rows_to_insert:
                    cursor.executemany(
                        """
                        INSERT INTO tbtrade (
                            Kode_Alpha3_Reporter,
                            Kode_Alpha3_Partner,
                            NamaNegara_Raw,
                            Bulan,
                            Tahun,
                            HSCode,
                            Berat_Bersih,
                            Nilai,
                            Status,
                            KodeSumber,
                            Pelabuhan
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        rows_to_insert,
                    )
                    db.commit()
                    total_inserted_rows += max(cursor.rowcount, 0)

                print(
                    f"[OK] {args.year} {args.flow} | batch {batch[0]} - {batch[-1]} | rows {len(rows)}"
                )
            except Exception as exc:
                print(f"[ERROR] {args.year} {args.flow} | batch {batch[0]} - {batch[-1]} | {exc}")

            sleep(args.sleep_seconds)
    finally:
        cursor.close()
        db.close()

    print("\nRINGKASAN BPS")
    print(f"Batch diproses : {total_batches}")
    print(f"Batch kosong   : {empty_batches}")
    print(f"Rows dari API  : {total_rows}")
    print(f"Rows terinsert : {total_inserted_rows}")
    print("SELESAI INSERT DB")
    return 0


def main():
    try:
        args = parse_args()
        raise SystemExit(run_scraper(args))
    except Exception as exc:
        print(f"[FATAL] {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
