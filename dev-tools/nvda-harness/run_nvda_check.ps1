# run_nvda_check.ps1 — semi-automated NVDA verification of a remediated document.
#
#   .\dev-tools\nvda-harness\run_nvda_check.ps1 -HtmlFile "C:\path\to\Accessible Document.html"
#
# What it does:
#   1. Verifies NVDA is running (and warns if not installed).
#   2. Truncates the speech log so this run's transcript is clean.
#   3. Opens the document in your default browser.
#   4. YOU press NVDA+DownArrow (laptop layout: NVDA+A) once — "say all".
#   5. The script watches the speech log; when it stops growing for $QuietSeconds,
#      it runs the transcript checker and writes a report next to the document.
#
# One-time setup is in README.md (NVDA + the Speech Logger add-on). The add-on's log
# path must match -SpeechLog (configure it under NVDA menu → Preferences → Settings →
# Speech Logger).
param(
  [Parameter(Mandatory = $true)][string]$HtmlFile,
  [string]$SpeechLog = "$env:TEMP\nvda_speech.log",
  [int]$QuietSeconds = 6,
  [int]$MaxWaitSeconds = 600
)

$ErrorActionPreference = 'Stop'
$harness = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path $HtmlFile)) { Write-Error "Document not found: $HtmlFile" }

# 1. NVDA present?
$nvdaExe = @("$env:ProgramFiles\NVDA\nvda.exe", "${env:ProgramFiles(x86)}\NVDA\nvda.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $nvdaExe) {
  Write-Host "NVDA is not installed. Get it (free) from https://www.nvaccess.org/download/ — see README.md, then re-run." -ForegroundColor Yellow
  exit 1
}
$nvdaRunning = Get-Process -Name nvda -ErrorAction SilentlyContinue
if (-not $nvdaRunning) {
  Write-Host "Starting NVDA..." -ForegroundColor Cyan
  Start-Process $nvdaExe
  Start-Sleep -Seconds 8
}

# 2. Clean slate for this run's transcript.
if (Test-Path $SpeechLog) { Clear-Content $SpeechLog } else { New-Item -ItemType File -Path $SpeechLog | Out-Null }

# 3. Open the document.
Write-Host "Opening: $HtmlFile" -ForegroundColor Cyan
Start-Process $HtmlFile
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==> In the browser window, press  NVDA+DownArrow  (desktop) or  NVDA+A  (laptop) to start 'say all'." -ForegroundColor Green
Write-Host "    (NVDA key = Insert or CapsLock, per your NVDA settings.)"
Write-Host "    I'll watch the speech log and finish automatically once NVDA goes quiet for $QuietSeconds s."
Write-Host ""

# 4. Wait for the log to grow, then to go quiet.
$deadline = (Get-Date).AddSeconds($MaxWaitSeconds)
$lastSize = 0; $quietSince = $null; $sawSpeech = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2
  $size = (Get-Item $SpeechLog -ErrorAction SilentlyContinue).Length
  if ($null -eq $size) { $size = 0 }
  if ($size -gt $lastSize) { $lastSize = $size; $sawSpeech = $true; $quietSince = $null }
  elseif ($sawSpeech) {
    if ($null -eq $quietSince) { $quietSince = Get-Date }
    elseif (((Get-Date) - $quietSince).TotalSeconds -ge $QuietSeconds) { break }
  }
}
if (-not $sawSpeech) {
  Write-Host "No speech was logged. Check the Speech Logger add-on is enabled and writing to: $SpeechLog" -ForegroundColor Yellow
  Write-Host "(NVDA menu -> Tools -> Speech Logger, or Preferences -> Settings -> Speech Logger for the log path.)"
  exit 1
}

# 5. Verify + report.
$report = [System.IO.Path]::ChangeExtension($HtmlFile, $null) + "nvda_report.txt"
node "$harness\check_transcript.cjs" "$HtmlFile" "$SpeechLog" "$report"
$code = $LASTEXITCODE
Write-Host ""
if ($code -eq 0) { Write-Host "PASS - every expected announcement was spoken in document order." -ForegroundColor Green }
elseif ($code -eq 2) { Write-Host "FINDINGS - see the report above / $report" -ForegroundColor Yellow }
exit $code
