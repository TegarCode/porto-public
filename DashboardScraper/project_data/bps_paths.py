from __future__ import annotations

from pathlib import Path


PROJECT_DATA_DIR = Path(__file__).resolve().parent
APP_DIR = PROJECT_DATA_DIR.parent
WORKSPACE_DIR = APP_DIR.parent
BPS_RESOURCES_DIR = APP_DIR / "resources" / "bps"

DEFAULT_BPS_HS_FILE = BPS_RESOURCES_DIR / "hscode_clean_BPS.xlsx"
LEGACY_BPS_HS_FILE = WORKSPACE_DIR / "hscode_clean_BPS.xlsx"

DEFAULT_BPS_HS8_FILE = BPS_RESOURCES_DIR / "data_Hscode8_BPS.xlsx"
LEGACY_BPS_HS8_FILE = WORKSPACE_DIR / "data_Hscode8_BPS.xlsx"


def resolve_existing_path(*candidates: Path):
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def get_default_bps_hs_file():
    return resolve_existing_path(DEFAULT_BPS_HS_FILE, LEGACY_BPS_HS_FILE)


def get_default_bps_hs8_file():
    return resolve_existing_path(DEFAULT_BPS_HS8_FILE, LEGACY_BPS_HS8_FILE)
