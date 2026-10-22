@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0catalog\cloudflare-worker\open-bug-inbox.ps1"
if errorlevel 1 pause
