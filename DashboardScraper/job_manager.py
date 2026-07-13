from __future__ import annotations

from datetime import datetime
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
import uuid

from db_runtime import load_db_config
from scraper import StopRequested, run_scraping_auto, run_scraping_manual
from tool_registry import APP_DIR, ToolDefinition

RUNTIME_DIR = APP_DIR / "runtime"
LOG_DIR = RUNTIME_DIR / "logs"

JOB_LOCK = threading.Lock()
JOBS = {}
PROCESSES = {}
JOB_CANCEL_EVENTS = {}
JOB_DECISION_EVENTS = {}

STATUS_META = {
    "queued": ("Queued", "neutral"),
    "running": ("Running", "info"),
    "awaiting_decision": ("Perlu Konfirmasi", "warning"),
    "stopping": ("Menghentikan", "warning"),
    "completed": ("Selesai", "success"),
    "stopped": ("Dihentikan", "warning"),
    "failed": ("Gagal", "danger"),
    "launched": ("Terminal Terbuka", "warning"),
}


def _ensure_runtime():
    LOG_DIR.mkdir(parents=True, exist_ok=True)


def _now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _status_payload(status: str):
    label, tone = STATUS_META[status]
    return {"status": status, "status_label": label, "status_tone": tone}


def _parse_positive_int(raw_value, default_value):
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return default_value

    return max(1, value)


def _normalize_script_params(tool: ToolDefinition, params: dict):
    cleaned = {}
    for field in tool.form_fields:
        raw_value = params.get(field.name, field.default)
        if raw_value is None:
            raw_value = field.default

        value = str(raw_value).strip()
        if not value:
            continue

        cleaned[field.name] = value

    return cleaned


def _build_script_command(tool: ToolDefinition, params: dict):
    cleaned_params = _normalize_script_params(tool, params)
    command = [sys.executable, str(tool.script_path)]

    for key, value in cleaned_params.items():
        command.extend([f"--{key.replace('_', '-')}", value])

    return command, cleaned_params


def _format_command_for_display(command: list[str]):
    return subprocess.list2cmdline(command)


def _format_command_for_powershell(command: list[str]):
    parts = []
    for part in command:
        if re.search(r'[\s"`]', part):
            parts.append('"' + part.replace('`', '``').replace('"', '`"') + '"')
        else:
            parts.append(part)
    return "& " + " ".join(parts)


def _build_child_process_env():
    env = dict(os.environ)
    db_config = load_db_config()
    if not db_config:
        return env

    env["APP_DB_HOST"] = db_config["host"]
    env["APP_DB_PORT"] = str(db_config["port"])
    env["APP_DB_USER"] = db_config["user"]
    env["APP_DB_PASSWORD"] = db_config["password"]
    env["APP_DB_NAME"] = db_config["database"]

    env["BPS_DB_HOST"] = db_config["host"]
    env["BPS_DB_PORT"] = str(db_config["port"])
    env["BPS_DB_USER"] = db_config["user"]
    env["BPS_DB_PASSWORD"] = db_config["password"]
    env["BPS_DB_NAME"] = db_config["database"]
    return env


def _build_job(tool: ToolDefinition, mode: str, params: dict):
    _ensure_runtime()

    job_id = uuid.uuid4().hex[:10]
    log_path = LOG_DIR / f"{job_id}.log"

    job = {
        "id": job_id,
        "tool_key": tool.key,
        "tool_title": tool.title,
        "tool_subtitle": tool.subtitle,
        "tool_workspace": tool.workspace,
        "mode": mode,
        "params": params,
        "command": tool.command,
        "note": tool.note,
        "log_path": str(log_path),
        "created_at": _now(),
        "created_ts": time.time(),
        "finished_at": None,
        "managed_pid": None,
        "can_stop": False,
        "stop_mode": None,
        "awaiting_decision": False,
        "decision_context": None,
    }
    job.update(_status_payload("queued"))
    return job


def _update_job(job_id: str, **changes):
    with JOB_LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(changes)


def _append_log(job_id: str, message: str):
    with JOB_LOCK:
        job = JOBS.get(job_id)
        if job is None:
            return
        log_path = Path(job["log_path"])

    with log_path.open("a", encoding="utf-8") as log_file:
        log_file.write(message.rstrip() + "\n")


def _read_logs(log_path: str, limit: int = 250):
    path = Path(log_path)
    if not path.exists():
        return []

    with path.open("r", encoding="utf-8", errors="ignore") as log_file:
        lines = [line.rstrip() for line in log_file.readlines()]

    return lines[-limit:]


def _refresh_process_jobs():
    updates = []

    with JOB_LOCK:
        tracked_items = list(PROCESSES.items())

    for job_id, process in tracked_items:
        return_code = process.poll()
        if return_code is None:
            continue

        status = "completed" if return_code == 0 else "failed"
        updates.append((job_id, status, return_code))

    for job_id, status, return_code in updates:
        _update_job(
            job_id,
            finished_at=_now(),
            note=f"Process selesai dengan exit code {return_code}.",
            can_stop=False,
            **_status_payload(status),
        )
        with JOB_LOCK:
            PROCESSES.pop(job_id, None)


def _serialize_job(job):
    payload = dict(job)
    payload["logs"] = _read_logs(job["log_path"])
    payload["has_logs"] = bool(payload["logs"])
    payload["log_tail"] = payload["logs"][-12:]
    return payload


def _cleanup_ssinas_state(job_id: str):
    with JOB_LOCK:
        JOB_CANCEL_EVENTS.pop(job_id, None)
        JOB_DECISION_EVENTS.pop(job_id, None)


def _clear_decision_state(job_id: str):
    with JOB_LOCK:
        JOB_DECISION_EVENTS.pop(job_id, None)


def _handle_duplicate_decision(
    job_id: str,
    page_number: int,
    processed_count: int,
    inserted_count: int,
    ignored_count: int,
):
    decision_state = {
        "event": threading.Event(),
        "choice": None,
    }

    context = {
        "page_number": page_number,
        "processed_count": processed_count,
        "inserted_count": inserted_count,
        "ignored_count": ignored_count,
    }

    with JOB_LOCK:
        JOB_DECISION_EVENTS[job_id] = decision_state

    _append_log(
        job_id,
        (
            f"ALERT duplicate di halaman {page_number}: "
            f"{ignored_count} data diabaikan, {inserted_count} data baru masuk."
        ),
    )
    _append_log(
        job_id,
        "Job dijeda. Buka detail run lalu pilih lanjutkan scraping atau hentikan proses.",
    )
    _update_job(
        job_id,
        note=(
            f"Duplicate terdeteksi di halaman {page_number}. "
            "Tentukan apakah scraping dilanjutkan atau dihentikan."
        ),
        can_stop=True,
        awaiting_decision=True,
        decision_context=context,
        **_status_payload("awaiting_decision"),
    )

    while True:
        cancel_event = JOB_CANCEL_EVENTS.get(job_id)
        if cancel_event is None or cancel_event.is_set():
            _clear_decision_state(job_id)
            return False

        if decision_state["event"].wait(0.5):
            break

    choice = decision_state["choice"] or "stop"
    _clear_decision_state(job_id)

    if choice == "continue":
        _append_log(job_id, "Pengguna memilih melanjutkan scraping setelah duplicate alert.")
        _update_job(
            job_id,
            note="Scraping SSINAS dilanjutkan setelah duplicate alert.",
            can_stop=True,
            awaiting_decision=False,
            decision_context=None,
            **_status_payload("running"),
        )
        return True

    _append_log(job_id, "Pengguna memilih menghentikan scraping setelah duplicate alert.")
    _update_job(
        job_id,
        note="Scraping SSINAS dihentikan setelah duplicate alert.",
        can_stop=False,
        awaiting_decision=False,
        decision_context=None,
        **_status_payload("stopping"),
    )
    return False


def _run_ssinas_job(
    job_id: str,
    start_page: int,
    end_page: int,
    auth_mode: str,
    phpsessid: str = "",
    cookie_header: str = "",
):
    if auth_mode == "browser_manual":
        note = "Chrome akan dibuka untuk login manual dan CAPTCHA."
    else:
        note = "Mode token manual aktif; scraper berjalan tanpa membuka browser server."

    _update_job(job_id, note=note, **_status_payload("running"))
    _append_log(job_id, f"Menyiapkan scraping SSINAS halaman {start_page} sampai {end_page}.")

    try:
        run_options = {
            "start_page": start_page,
            "end_page": end_page,
            "log_callback": lambda message: _append_log(job_id, message),
            "stop_checker": lambda: bool(JOB_CANCEL_EVENTS.get(job_id) and JOB_CANCEL_EVENTS[job_id].is_set()),
            "duplicate_handler": lambda page_number, processed_count, inserted_count, ignored_count: _handle_duplicate_decision(
                job_id,
                page_number,
                processed_count,
                inserted_count,
                ignored_count,
            ),
        }

        if auth_mode == "browser_manual":
            logs = run_scraping_auto(**run_options)
        else:
            logs = run_scraping_manual(
                phpsessid=phpsessid,
                cookie_header=cookie_header,
                **run_options,
            )
    except StopRequested:
        _update_job(
            job_id,
            finished_at=_now(),
            note="Scraping SSINAS dihentikan oleh pengguna.",
            can_stop=False,
            **_status_payload("stopped"),
        )
        _cleanup_ssinas_state(job_id)
        return
    except Exception as exc:
        _append_log(job_id, f"ERROR: {exc}")
        _update_job(
            job_id,
            finished_at=_now(),
            note="Scraping SSINAS berhenti karena error.",
            can_stop=False,
            **_status_payload("failed"),
        )
        _cleanup_ssinas_state(job_id)
        return

    if logs and any(
        marker in line
        for line in logs
        for marker in (
            "Gagal mengambil PHPSESSID",
            "Mode manual membutuhkan PHPSESSID",
            "PHPSESSID belum tersedia",
        )
    ):
        _update_job(
            job_id,
            finished_at=_now(),
            note="Session SSINAS tidak berhasil disiapkan.",
            can_stop=False,
            **_status_payload("failed"),
        )
        _cleanup_ssinas_state(job_id)
        return

    _update_job(
        job_id,
        finished_at=_now(),
        note="Scraping SSINAS selesai.",
        can_stop=False,
        **_status_payload("completed"),
    )
    _cleanup_ssinas_state(job_id)


def _start_internal_job(tool: ToolDefinition, params: dict):
    start_page = _parse_positive_int(params.get("start_page"), 1)
    end_page = _parse_positive_int(params.get("end_page"), start_page)
    if end_page < start_page:
        start_page, end_page = end_page, start_page

    auth_mode = str(params.get("auth_mode") or "manual_token").strip().lower()
    if auth_mode not in {"manual_token", "browser_manual"}:
        auth_mode = "manual_token"

    phpsessid = str(params.get("phpsessid") or "").strip()
    cookie_header = str(params.get("cookie_header") or "").strip()

    clean_params = {
        "start_page": str(start_page),
        "end_page": str(end_page),
        "auth_mode": auth_mode,
        "has_session": "yes" if phpsessid or cookie_header else "no",
    }
    job = _build_job(tool, mode="dashboard", params=clean_params)
    job["can_stop"] = True
    job["stop_mode"] = "signal"

    with JOB_LOCK:
        JOBS[job["id"]] = job
        JOB_CANCEL_EVENTS[job["id"]] = threading.Event()

    thread = threading.Thread(
        target=_run_ssinas_job,
        args=(job["id"], start_page, end_page, auth_mode, phpsessid, cookie_header),
        daemon=True,
    )
    thread.start()

    return _serialize_job(job)


def _start_background_script_job(tool: ToolDefinition):
    return _start_background_script_job_with_params(tool, {})


def _start_background_script_job_with_params(tool: ToolDefinition, params: dict):
    command, cleaned_params = _build_script_command(tool, params)
    job = _build_job(tool, mode="background", params=cleaned_params)
    job["command"] = _format_command_for_display(command)
    job["can_stop"] = True
    job["stop_mode"] = "process_tree"

    with JOB_LOCK:
        JOBS[job["id"]] = job

    try:
        log_handle = Path(job["log_path"]).open("w", encoding="utf-8")
        process = subprocess.Popen(
            command,
            cwd=str(tool.script_path.parent),
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            text=True,
            env=_build_child_process_env(),
        )
        log_handle.close()
    except Exception as exc:
        _append_log(job["id"], f"ERROR: {exc}")
        _update_job(
            job["id"],
            finished_at=_now(),
            note="Script gagal dijalankan dari dashboard.",
            can_stop=False,
            **_status_payload("failed"),
        )
        return _serialize_job(JOBS[job["id"]])

    with JOB_LOCK:
        PROCESSES[job["id"]] = process
        JOBS[job["id"]]["managed_pid"] = process.pid

    _update_job(
        job["id"],
        note="Script berjalan sebagai background job dari dashboard.",
        **_status_payload("running"),
    )
    _append_log(job["id"], "Background process dimulai.")
    _append_log(job["id"], "Pantau hasilnya dari halaman log ini atau daftar recent runs.")
    return _serialize_job(JOBS[job["id"]])


def _start_terminal_script_job(tool: ToolDefinition, params: dict):
    command, cleaned_params = _build_script_command(tool, params)
    job = _build_job(tool, mode="terminal", params=cleaned_params)
    job["can_stop"] = True
    job["stop_mode"] = "process_tree"

    with JOB_LOCK:
        JOBS[job["id"]] = job

    powershell_command = (
        f'Set-Location -LiteralPath "{tool.script_path.parent}"; '
        f'{_format_command_for_powershell(command)}'
    )

    try:
        process = subprocess.Popen(
            ["powershell", "-NoExit", "-Command", powershell_command],
            creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0),
            env=_build_child_process_env(),
        )
    except Exception as exc:
        _append_log(job["id"], f"ERROR: {exc}")
        _update_job(
            job["id"],
            finished_at=_now(),
            note="Terminal terpisah gagal dibuka.",
            can_stop=False,
            **_status_payload("failed"),
        )
        return _serialize_job(JOBS[job["id"]])

    _append_log(job["id"], "Terminal PowerShell baru berhasil dibuka.")
    _append_log(job["id"], "Log live dipantau dari terminal terpisah, bukan dari dashboard.")
    _update_job(
        job["id"],
        finished_at=_now(),
        command=_format_command_for_display(command),
        managed_pid=process.pid,
        note="Script diluncurkan ke terminal terpisah.",
        **_status_payload("launched"),
    )
    return _serialize_job(JOBS[job["id"]])


def _stop_process_tree(pid: int):
    return subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        capture_output=True,
        text=True,
    )


def stop_job(job_id: str):
    _refresh_process_jobs()

    with JOB_LOCK:
        job = JOBS.get(job_id)

    if job is None:
        return None

    if not job.get("can_stop"):
        return _serialize_job(job)

    stop_mode = job.get("stop_mode")

    if stop_mode == "signal":
        with JOB_LOCK:
            cancel_event = JOB_CANCEL_EVENTS.get(job_id)
            decision_state = JOB_DECISION_EVENTS.get(job_id)
            if cancel_event is not None:
                cancel_event.set()
            if decision_state is not None:
                decision_state["choice"] = "stop"
                decision_state["event"].set()

        _append_log(job_id, "Permintaan berhenti paksa dikirim ke job SSINAS.")
        _update_job(
            job_id,
            note="Permintaan berhenti sedang diproses.",
            can_stop=False,
            awaiting_decision=False,
            decision_context=None,
            **_status_payload("stopping"),
        )
        return get_job(job_id)

    if stop_mode == "process_tree":
        pid = job.get("managed_pid")
        if not pid:
            _append_log(job_id, "PID proses tidak ditemukan.")
            _update_job(
                job_id,
                finished_at=_now(),
                note="PID proses tidak tersedia untuk dihentikan.",
                can_stop=False,
                **_status_payload("failed"),
            )
            return get_job(job_id)

        result = _stop_process_tree(pid)
        output = (result.stdout or "") + (result.stderr or "")
        output = output.strip()

        with JOB_LOCK:
            PROCESSES.pop(job_id, None)

        if result.returncode == 0:
            _append_log(job_id, "Proses berhasil dihentikan paksa.")
            if output:
                _append_log(job_id, output)
            _update_job(
                job_id,
                finished_at=_now(),
                note="Proses dihentikan paksa oleh pengguna.",
                can_stop=False,
                **_status_payload("stopped"),
            )
            return get_job(job_id)

        _append_log(job_id, "Gagal menghentikan proses.")
        if output:
            _append_log(job_id, output)
        _update_job(
            job_id,
            finished_at=_now(),
            note="Proses tidak bisa dihentikan atau sudah tidak aktif.",
            can_stop=False,
            **_status_payload("failed"),
        )
        return get_job(job_id)

    return _serialize_job(job)


def resolve_job_decision(job_id: str, choice: str):
    normalized_choice = str(choice).strip().lower()
    if normalized_choice not in {"continue", "stop"}:
        return None

    with JOB_LOCK:
        job = JOBS.get(job_id)
        decision_state = JOB_DECISION_EVENTS.get(job_id)
        cancel_event = JOB_CANCEL_EVENTS.get(job_id)

    if job is None or decision_state is None:
        return None

    decision_state["choice"] = normalized_choice
    decision_state["event"].set()

    if normalized_choice == "stop" and cancel_event is not None:
        cancel_event.set()

    _append_log(
        job_id,
        "Keputusan pengguna diterima: lanjutkan scraping."
        if normalized_choice == "continue"
        else "Keputusan pengguna diterima: hentikan scraping.",
    )
    _update_job(
        job_id,
        note=(
            "Permintaan lanjut sudah dikirim ke scraper."
            if normalized_choice == "continue"
            else "Permintaan berhenti sudah dikirim ke scraper."
        ),
        can_stop=normalized_choice == "continue",
        awaiting_decision=False,
        decision_context=None,
        **_status_payload("running" if normalized_choice == "continue" else "stopping"),
    )
    return get_job(job_id)


def start_tool_job(tool: ToolDefinition, params: dict):
    if not tool.ready:
        job = _build_job(tool, mode="blocked", params={})
        with JOB_LOCK:
            JOBS[job["id"]] = job
        _append_log(job["id"], tool.note)
        _update_job(
            job["id"],
            finished_at=_now(),
            note="Tool ditahan karena konfigurasi belum siap.",
            can_stop=False,
            **_status_payload("failed"),
        )
        return _serialize_job(JOBS[job["id"]])

    if tool.run_kind == "internal":
        return _start_internal_job(tool, params)

    launch_mode = params.get("launch_mode", "background")
    if launch_mode == "terminal":
        return _start_terminal_script_job(tool, params)

    return _start_background_script_job_with_params(tool, params)


def get_job(job_id: str):
    _refresh_process_jobs()

    with JOB_LOCK:
        job = JOBS.get(job_id)

    if job is None:
        return None

    return _serialize_job(job)


def list_jobs(limit: int = 10):
    _refresh_process_jobs()

    with JOB_LOCK:
        ordered_jobs = sorted(
            JOBS.values(),
            key=lambda item: item["created_ts"],
            reverse=True,
        )

    return [_serialize_job(job) for job in ordered_jobs[:limit]]
