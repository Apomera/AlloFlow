@echo off
setlocal enabledelayedexpansion

:: Set Node.js to PATH
set PATH=C:\Program Files\nodejs;%PATH%

:: Set NSIS environment variables for admin elevation
set NSIS_ALLOW_SKIP_UAC=false

:: Navigate to admin directory
cd /d "%~dp0"

:: Run npm dist-win (build + electron-builder)
echo Building and packaging Windows installer...
echo Note: Installer will request administrator privileges on launch
echo.
call npm run dist-win
if errorlevel 1 (
    echo Build/packaging failed!
    exit /b 1
)

echo Build complete!
endlocal
