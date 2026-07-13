from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import time

APP_DIR = Path(__file__).resolve().parent
VENV_DIR = APP_DIR / ".venv"
REQUIREMENTS_PATH = APP_DIR / "requirements.txt"
STAMP_PATH = VENV_DIR / ".requirements.stamp"
CLI_PATH = APP_DIR / "cli.py"


def build_parser():
    parser = argparse.ArgumentParser(
        prog="py flask-scrapSSinas",
        description=(
            "Launcher project flask-scrapSSinas. "
            "Bisa auto membuat virtualenv dan install dependency saat pertama kali dijalankan."
        ),
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Jalankan dashboard Flask.")
    run_parser.add_argument("--host", default="127.0.0.1", help="Host Flask.")
    run_parser.add_argument("--port", type=int, default=5000, help="Port Flask.")
    run_parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Matikan auto reload Flask.",
    )
    run_parser.add_argument(
        "--no-debug",
        action="store_true",
        help="Matikan mode debug Flask.",
    )

    stop_parser = subparsers.add_parser("stop", help="Hentikan server Flask di port tertentu.")
    stop_parser.add_argument("--port", type=int, default=5000, help="Port Flask yang dihentikan.")

    install_parser = subparsers.add_parser(
        "install",
        help="Buat virtualenv lokal project dan install dependency.",
    )
    install_parser.add_argument(
        "--force",
        action="store_true",
        help="Paksa install ulang dependency walau virtualenv sudah ada.",
    )

    subparsers.add_parser(
        "doctor",
        help="Cek kesiapan environment project tanpa menjalankan aplikasi.",
    )
    return parser


def get_venv_python():
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def compute_requirements_hash():
    return hashlib.sha256(REQUIREMENTS_PATH.read_bytes()).hexdigest()


def read_stamp():
    if not STAMP_PATH.exists():
        return ""
    return STAMP_PATH.read_text(encoding="utf-8").strip()


def write_stamp(value: str):
    STAMP_PATH.parent.mkdir(parents=True, exist_ok=True)
    STAMP_PATH.write_text(value, encoding="utf-8")


def ensure_virtualenv():
    venv_python = get_venv_python()
    if venv_python.exists():
        return venv_python

    print(f"[setup] Membuat virtualenv lokal di {VENV_DIR} ...")
    subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True, cwd=APP_DIR)
    return venv_python


def ensure_dependencies(force: bool = False):
    if not REQUIREMENTS_PATH.exists():
        raise FileNotFoundError(f"requirements.txt tidak ditemukan di {REQUIREMENTS_PATH}")

    venv_python = ensure_virtualenv()
    expected_hash = compute_requirements_hash()
    current_hash = read_stamp()
    needs_install = force or current_hash != expected_hash

    if not needs_install:
        return venv_python

    print("[setup] Menyiapkan dependency project ...")
    subprocess.run(
        [str(venv_python), "-m", "pip", "install", "--upgrade", "pip"],
        check=True,
        cwd=APP_DIR,
    )
    install_command = [
        str(venv_python),
        "-m",
        "pip",
        "install",
        "-r",
        str(REQUIREMENTS_PATH),
    ]
    last_error = None
    for attempt in range(2):
        result = subprocess.run(install_command, cwd=APP_DIR, check=False)
        if result.returncode == 0:
            last_error = None
            break
        last_error = subprocess.CalledProcessError(result.returncode, install_command)
        if attempt == 0:
            print("[setup] Install dependency sempat gagal. Mencoba ulang sekali lagi ...")
            time.sleep(2)
    if last_error is not None:
        raise RuntimeError(
            "Install dependency gagal. Jika ini terjadi di Windows, tutup terminal atau editor "
            "yang sedang memakai .venv lalu jalankan lagi `py flask-scrapSSinas install`."
        ) from last_error

    write_stamp(expected_hash)
    print("[setup] Dependency siap dipakai.")
    return venv_python


def run_cli_with_python(python_executable: Path, argv: list[str]):
    command = [str(python_executable), str(CLI_PATH), *argv]
    result = subprocess.run(command, cwd=APP_DIR, check=False)
    return result.returncode


def handle_install(force: bool):
    ensure_dependencies(force=force)
    return 0


def handle_doctor():
    print(f"[doctor] Project root : {APP_DIR}")
    print(f"[doctor] Python host  : {sys.executable}")
    print(f"[doctor] requirements : {'OK' if REQUIREMENTS_PATH.exists() else 'MISSING'}")
    print(f"[doctor] virtualenv   : {'OK' if get_venv_python().exists() else 'MISSING'}")
    if REQUIREMENTS_PATH.exists() and get_venv_python().exists():
        synced = read_stamp() == compute_requirements_hash()
        print(f"[doctor] dependency   : {'SYNC' if synced else 'NEEDS INSTALL'}")
    else:
        print("[doctor] dependency   : UNKNOWN")

    chrome_candidates = [
        Path(os.environ.get("ProgramFiles", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("ProgramFiles(x86)", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
        Path(os.environ.get("LocalAppData", "")) / "Google" / "Chrome" / "Application" / "chrome.exe",
    ]
    has_chrome = any(path.exists() for path in chrome_candidates if str(path))
    print(f"[doctor] Google Chrome: {'OK' if has_chrome else 'NOT FOUND'}")
    if not has_chrome:
        print("[doctor] Catatan      : Chrome diperlukan untuk fitur siinas.kemenperin.go.id.")
    return 0


def main(argv: list[str] | None = None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "install":
        return handle_install(force=args.force)

    if args.command == "doctor":
        return handle_doctor()

    if args.command == "stop":
        return run_cli_with_python(Path(sys.executable), ["stop", "--port", str(args.port)])

    if args.command == "run":
        venv_python = ensure_dependencies(force=False)
        forwarded_args = ["run"]
        if args.host != "127.0.0.1":
            forwarded_args.extend(["--host", args.host])
        if args.port != 5000:
            forwarded_args.extend(["--port", str(args.port)])
        if args.no_reload:
            forwarded_args.append("--no-reload")
        if args.no_debug:
            forwarded_args.append("--no-debug")
        return run_cli_with_python(venv_python, forwarded_args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
