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
    pause
    exit /b 1
)

%PYTHON_CMD% flask-scrapSSinas stop
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Stop launcher berhenti dengan kode error %EXIT_CODE%.
    pause
)

exit /b %EXIT_CODE%
