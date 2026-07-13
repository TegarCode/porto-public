from __future__ import annotations

import argparse
import subprocess


def build_parser():
    parser = argparse.ArgumentParser(
        prog="py flask-scrapSSinas",
        description="CLI sederhana untuk menjalankan dashboard flask-scrapSSinas.",
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

    return parser


def run_dashboard(args):
    from app import app

    app.run(
        host=args.host,
        port=args.port,
        debug=not args.no_debug,
        use_reloader=not args.no_reload,
    )
    return 0


def stop_dashboard(args):
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            (
                f"$conn = Get-NetTCPConnection -LocalPort {args.port} -State Listen "
                "-ErrorAction SilentlyContinue | Select-Object -First 1; "
                "if ($conn) { "
                "Stop-Process -Id $conn.OwningProcess -Force; "
                "Write-Host ('Flask stopped. PID ' + $conn.OwningProcess) "
                "} else { "
                f"Write-Host 'No Flask server found on port {args.port}.' "
                "}"
            ),
        ],
        check=False,
    )
    return result.returncode


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "run":
        return run_dashboard(args)
    if args.command == "stop":
        return stop_dashboard(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
