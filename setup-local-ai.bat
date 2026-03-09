@echo off
title AlloFlow Local AI Setup
color 0B

echo.
echo  ============================================
echo    AlloFlow Local AI Setup
echo    One-click installer for private, local AI
echo  ============================================
echo.
echo  This will install Ollama and download AI
echo  models to run entirely on YOUR computer.
echo.
echo  No data ever leaves your machine.
echo  FERPA-compliant by design.
echo.
echo  Models to install (~5 GB total):
echo    - DeepSeek R1 1.5B  (math reasoning)
echo    - Phi 3.5           (general content)
echo    - Qwen 2.5 3B       (balanced)
echo.
pause

echo.
echo  [Step 1/4] Checking if Ollama is installed...
echo.

where ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo  ✓ Ollama is already installed!
    ollama --version
    goto :pull_models
)

echo  Ollama not found. Downloading installer...
echo.

:: Download Ollama installer
set "INSTALLER=%TEMP%\OllamaSetup.exe"
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%INSTALLER%' -UseBasicParsing }"

if not exist "%INSTALLER%" (
    echo.
    echo  ✗ Download failed. Please check your internet
    echo    connection and try again, or install manually:
    echo    https://ollama.com/download/windows
    echo.
    pause
    exit /b 1
)

echo.
echo  [Step 2/4] Installing Ollama...
echo  (A setup window may appear - follow the prompts)
echo.

start /wait "" "%INSTALLER%"

:: Wait for Ollama service to start
echo  Waiting for Ollama service to start...
timeout /t 5 /nobreak >nul

:: Verify install
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    :: Try common install paths
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama;%LOCALAPPDATA%\Ollama"
    where ollama >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  ✗ Ollama installation could not be verified.
        echo    Please restart this script after installing
        echo    Ollama manually from: https://ollama.com
        echo.
        pause
        exit /b 1
    )
)

echo  ✓ Ollama installed successfully!
ollama --version
echo.

:pull_models
echo.
echo  [Step 3/4] Downloading AI models...
echo  (This may take a few minutes on first run)
echo.

echo  Pulling DeepSeek R1 1.5B (best for math)...
ollama pull deepseek-r1:1.5b
if %errorlevel% neq 0 (
    echo  ⚠ DeepSeek download failed, retrying...
    timeout /t 3 /nobreak >nul
    ollama pull deepseek-r1:1.5b
)

echo.
echo  Pulling Phi 3.5 (best for general content)...
ollama pull phi3.5
if %errorlevel% neq 0 (
    echo  ⚠ Phi 3.5 download failed, retrying...
    timeout /t 3 /nobreak >nul
    ollama pull phi3.5
)

echo.
echo  Pulling Qwen 2.5 3B (balanced model)...
ollama pull qwen2.5:3b
if %errorlevel% neq 0 (
    echo  ⚠ Qwen download failed, retrying...
    timeout /t 3 /nobreak >nul
    ollama pull qwen2.5:3b
)

echo.
echo  [Step 4/4] Verifying installation...
echo.
echo  Installed models:
ollama list
echo.

:: Quick test
echo  Running quick math test...
echo  Question: What is 7 x 8?
for /f "delims=" %%i in ('ollama run deepseek-r1:1.5b "What is 7 times 8? Answer with just the number." 2^>nul') do echo  Answer: %%i

echo.
echo  ============================================
echo    ✓ Setup Complete!
echo  ============================================
echo.
echo  Your local AI is ready. Here's what to do:
echo.
echo  1. Open AlloFlow:
echo     https://prismflow-911fe.web.app
echo.
echo  2. Go to Settings (gear icon)
echo.
echo  3. Under "AI Backend", select:
echo     Provider: Ollama (Local)
echo.
echo  4. Click "Test Connection"
echo     You should see: "Connected!"
echo.
echo  That's it! All AI now runs privately on
echo  your computer. No data leaves your machine.
echo.
echo  ============================================
echo.
pause
