import math
import time
from datetime import datetime
from io import BytesIO

import mysql.connector
import pandas as pd
import requests
from bs4 import BeautifulSoup
from selenium import webdriver

from db_runtime import DEFAULT_DB_CONFIG, load_db_config

DUPLICATE_ALERT_THRESHOLD = 15


class StopRequested(Exception):
    pass


def get_db_config():
    return load_db_config() or dict(DEFAULT_DB_CONFIG)


def parse_tanggal(value):
    try:
        return datetime.strptime(str(value), "%d %B %Y").date()
    except Exception:
        return None


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if str(value).lower() == "nan":
        return None
    return str(value).strip()


def emit_log(logs, message, log_callback=None):
    logs.append(message)
    if log_callback is not None:
        log_callback(message)


def ensure_not_stopped(stop_checker, logs, log_callback, message):
    if stop_checker is not None and stop_checker():
        emit_log(logs, message, log_callback)
        raise StopRequested(message)


def get_next_token(html_text):
    soup = BeautifulSoup(html_text, "lxml")
    pagination = soup.find("ul", class_="pagination")
    if not pagination:
        return None

    active = pagination.find("li", class_="active")
    if not active:
        return None

    next_li = active.find_next_sibling("li")
    if not next_li:
        return None

    anchor = next_li.find("a", href=True)
    if anchor and "hal=" in anchor["href"]:
        return anchor["href"].split("hal=")[-1].strip(",")

    return None


def parse_cookie_header(cookie_header):
    cookies = {}
    for part in str(cookie_header or "").split(";"):
        if "=" not in part:
            continue

        key, value = part.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and value:
            cookies[key] = value

    return cookies


def get_phpsessid_selenium_manual(log_callback=None, stop_checker=None):
    driver = webdriver.Chrome()
    driver.get("https://siinas.kemenperin.go.id/kl/")

    if log_callback is not None:
        log_callback("Chrome terbuka. Silakan login dan selesaikan CAPTCHA.")

    try:
        temp_logs = []
        for _ in range(120):
            ensure_not_stopped(
                stop_checker,
                temp_logs,
                log_callback,
                "Proses SSINAS dihentikan saat menunggu login.",
            )
            time.sleep(1)
            if "perush_idx.php" in driver.current_url:
                if log_callback is not None:
                    log_callback("Login berhasil. Session aktif terdeteksi.")
                break
        else:
            return None

        cookies = driver.get_cookies()
        phpsessid = None
        for cookie in cookies:
            if cookie["name"] == "PHPSESSID":
                phpsessid = cookie["value"]
                break

        return phpsessid
    finally:
        driver.quit()


def run_scraping(
    phpsessid=None,
    start_page=1,
    end_page=5,
    log_callback=None,
    stop_checker=None,
    duplicate_handler=None,
    cookies=None,
):
    base_url = "https://siinas.kemenperin.go.id"
    index_url = f"{base_url}/kl/perush_idx.php"
    download_url = f"{base_url}/kl/download_data/perush_a.php"

    conn = mysql.connector.connect(**get_db_config())
    cursor = conn.cursor()

    logs = []

    session = requests.Session()
    session_cookies = dict(cookies or {})
    if phpsessid:
        session_cookies["PHPSESSID"] = str(phpsessid).strip()

    if not session_cookies.get("PHPSESSID"):
        emit_log(logs, "PHPSESSID belum tersedia. Paste token/cookie aktif terlebih dahulu.", log_callback)
        cursor.close()
        conn.close()
        return logs

    session.cookies.update(session_cookies)
    session.headers.update({"User-Agent": "Mozilla/5.0"})

    current_token = ""
    page_count = 1

    try:
        while current_token is not None and page_count < start_page:
            ensure_not_stopped(
                stop_checker,
                logs,
                log_callback,
                "Proses SSINAS dihentikan sebelum start page tercapai.",
            )
            emit_log(logs, f"Melewati halaman {page_count} untuk mencapai start page.", log_callback)
            page_response = session.get(index_url, params={"hal": current_token})
            current_token = get_next_token(page_response.text)
            page_count += 1
            time.sleep(1)

        if current_token is None:
            emit_log(logs, "Start page melebihi jumlah halaman yang tersedia.", log_callback)
            return logs

        while current_token is not None and page_count <= end_page:
            ensure_not_stopped(
                stop_checker,
                logs,
                log_callback,
                f"Proses SSINAS dihentikan di sekitar halaman {page_count}.",
            )
            emit_log(logs, f"Halaman {page_count} sedang diproses.", log_callback)

            page_response = session.get(index_url, params={"hal": current_token})
            time.sleep(1)

            download_response = session.get(download_url, params={"hal": current_token})
            if "text/html" in download_response.headers.get("Content-Type", ""):
                emit_log(logs, "Session berakhir. Silakan login ulang.", log_callback)
                break

            dataframe = pd.read_excel(BytesIO(download_response.content), dtype=str)
            rows_to_insert = []

            for _, row in dataframe.iterrows():
                rows_to_insert.append(
                    (
                        clean(row.get("Nama Perusahaan")),
                        clean(row.get("ID SIINas")),
                        clean(row.get("NIB")),
                        clean(row.get("Skala Usaha")),
                        clean(row.get("KBLI")),
                        parse_tanggal(clean(row.get("Tanggal Approval"))),
                        clean(row.get("Kel/Desa")),
                        clean(row.get("Kecamatan")),
                        clean(row.get("Kab/Kota")),
                        clean(row.get("Provinsi")),
                        clean(row.get("Alamat Pabrik")),
                    )
                )

            if rows_to_insert:
                cursor.executemany(
                    """
                    INSERT IGNORE INTO perusahaan (
                        nama_perusahaan, id_siinas, nib, skala_usaha, kbli,
                        tanggal_approval, kel_desa, kecamatan, kab_kota, provinsi, alamat_pabrik
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    rows_to_insert,
                )
                conn.commit()
                inserted_count = max(cursor.rowcount or 0, 0)
            else:
                inserted_count = 0

            ignored_count = max(len(rows_to_insert) - inserted_count, 0)
            emit_log(
                logs,
                (
                    f"{len(rows_to_insert)} data diproses ke database. "
                    f"Insert baru: {inserted_count}. Duplicate diabaikan: {ignored_count}."
                ),
                log_callback,
            )

            if ignored_count > DUPLICATE_ALERT_THRESHOLD and duplicate_handler is not None:
                should_continue = duplicate_handler(
                    page_count,
                    len(rows_to_insert),
                    inserted_count,
                    ignored_count,
                )
                if not should_continue:
                    emit_log(logs, "Scraping SSINAS dihentikan setelah duplicate alert.", log_callback)
                    raise StopRequested("Scraping SSINAS dihentikan setelah duplicate alert.")

            current_token = get_next_token(page_response.text)
            page_count += 1
            time.sleep(1)
    finally:
        cursor.close()
        conn.close()

    emit_log(logs, "Scraping SSINAS selesai.", log_callback)
    return logs


def run_scraping_manual(
    phpsessid=None,
    cookie_header=None,
    start_page=1,
    end_page=5,
    log_callback=None,
    stop_checker=None,
    duplicate_handler=None,
):
    cookies = parse_cookie_header(cookie_header)
    phpsessid = clean(phpsessid)

    if phpsessid:
        cookies["PHPSESSID"] = phpsessid

    logs = []
    if not cookies.get("PHPSESSID"):
        emit_log(logs, "Mode manual membutuhkan PHPSESSID atau full cookie header.", log_callback)
        return logs

    emit_log(
        logs,
        "Session manual diterima. Scraper berjalan tanpa membuka browser server.",
        log_callback,
    )

    return run_scraping(
        start_page=start_page,
        end_page=end_page,
        log_callback=log_callback,
        stop_checker=stop_checker,
        duplicate_handler=duplicate_handler,
        cookies=cookies,
    )


def run_scraping_auto(
    start_page=1,
    end_page=5,
    log_callback=None,
    stop_checker=None,
    duplicate_handler=None,
):
    phpsessid = get_phpsessid_selenium_manual(
        log_callback=log_callback,
        stop_checker=stop_checker,
    )
    if not phpsessid:
        logs = []
        emit_log(logs, "Gagal mengambil PHPSESSID.", log_callback)
        return logs

    return run_scraping(
        phpsessid,
        start_page=start_page,
        end_page=end_page,
        log_callback=log_callback,
        stop_checker=stop_checker,
        duplicate_handler=duplicate_handler,
    )
