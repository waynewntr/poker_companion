@echo off
cd /d "%~dp0"
echo Starting Poker Companion...

where python >nul 2>&1
if %errorlevel% equ 0 (
    start "" http://localhost:3000
    python -m http.server 3000 --directory out
    goto end
)

where python3 >nul 2>&1
if %errorlevel% equ 0 (
    start "" http://localhost:3000
    python3 -m http.server 3000 --directory out
    goto end
)

echo.
echo ERROR: Python is not installed.
echo Download it from https://www.python.org/downloads/
echo Install it and run this file again.
echo.
pause

:end
