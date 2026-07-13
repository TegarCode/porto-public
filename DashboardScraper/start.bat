@echo off
setlocal

cd /d "%~dp0"

set "PYTHON_CMD="

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=py"
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=python"
    )
)

if not defined PYTHON_CMD (
    echo Python launcher tidak ditemukan.
    echo Install Python terlebih dahulu agar project bisa dijalankan.
    pause
    exit /b 1
)

echo Menjalankan flask-scrapSSinas dari root project...
%PYTHON_CMD% flask-scrapSSinas run
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Launcher berhenti dengan kode error %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%
