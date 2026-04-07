@echo off
REM ╔═══════════════════════════════════════════════════════════╗
REM ║  AlloFlow Uninstaller                                     ║
REM ║  Removes all AlloFlow services, data, and configuration   ║
REM ╚═══════════════════════════════════════════════════════════╝

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║           AlloFlow Uninstaller                        ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
echo This will remove:
echo   - Ollama (AI language model server)
echo   - Piper (text-to-speech)
echo   - Flux (image generation + Python venv)
echo   - Service binaries and data
echo.

set /p CONFIRM="Are you sure you want to uninstall services? (Y/N): "
if /I not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
set /p RESET_CONFIG="Also reset AlloFlow configuration? This will remove all settings and require re-setup. (Y/N): "

echo.
echo ── Step 1/5: Stopping services ──────────────────────────
echo.

echo Stopping Ollama...
taskkill /IM "ollama.exe" /F >nul 2>&1
taskkill /IM "ollama app.exe" /F >nul 2>&1
taskkill /IM "ollama_runners.exe" /F >nul 2>&1

echo Stopping PocketBase...
taskkill /IM "pocketbase.exe" /F >nul 2>&1

echo Stopping Piper...
taskkill /IM "piper.exe" /F >nul 2>&1

echo Stopping Flux (Python)...
REM Kill any python process running flux_server.py
for /f "tokens=2" %%a in ('wmic process where "commandline like '%%flux_server%%'" get processid /format:value 2^>nul ^| findstr ProcessId') do (
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo ── Step 2/5: Uninstalling Ollama ────────────────────────
echo.

set "OLLAMA_UNINSTALL=%LOCALAPPDATA%\Programs\Ollama\unins000.exe"
if exist "%OLLAMA_UNINSTALL%" (
    echo Running Ollama uninstaller...
    "%OLLAMA_UNINSTALL%" /VERYSILENT /NORESTART
    timeout /t 5 /nobreak >nul
    echo Ollama uninstalled.
) else (
    echo Ollama uninstaller not found — may not be installed.
)

REM Clean up Ollama user data
if exist "%USERPROFILE%\.ollama" (
    echo Removing Ollama models and data...
    rmdir /s /q "%USERPROFILE%\.ollama" 2>nul
)

echo.
echo ── Step 3/5: Removing service binaries ──────────────────
echo.

if exist "%USERPROFILE%\.alloflow\bin" (
    echo Removing binaries from %USERPROFILE%\.alloflow\bin ...
    rmdir /s /q "%USERPROFILE%\.alloflow\bin" 2>nul
    echo Done.
) else (
    echo No binaries directory found.
)

echo.
echo ── Step 4/5: Removing service data ──────────────────────
echo.

if exist "%USERPROFILE%\.alloflow\data" (
    echo Removing data from %USERPROFILE%\.alloflow\data ...
    rmdir /s /q "%USERPROFILE%\.alloflow\data" 2>nul
    echo Done.
) else (
    echo No data directory found.
)

echo.
echo ── Step 5/5: Configuration ──────────────────────────────
echo.

if /I not "%RESET_CONFIG%"=="Y" (
    echo Configuration preserved. You can re-use your settings on next install.
    goto :done
)

if exist "%USERPROFILE%\.alloflow" (
    echo Removing %USERPROFILE%\.alloflow ...
    rmdir /s /q "%USERPROFILE%\.alloflow" 2>nul
    echo Configuration removed.
) else (
    echo No configuration directory found.
)

:done

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║  Uninstall complete!                                  ║
echo ║                                                       ║
echo ║  All AlloFlow services and data have been removed.    ║
echo ║  You can also uninstall AlloFlow Admin from           ║
echo ║  Windows Settings ^> Apps ^> AlloFlow Admin.            ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
pause
