@echo off
setlocal enabledelayedexpansion

:: Set Node.js to PATH
set PATH=C:\Program Files\nodejs;%PATH%

:: Navigate to admin directory
cd /d "%~dp0"

:: Run npm dist-win (build + electron-builder)
echo Building and packaging Windows installer...
call npm run dist-win
if errorlevel 1 (
    echo Build/packaging failed!
    exit /b 1
)

echo Build complete!
endlocal
