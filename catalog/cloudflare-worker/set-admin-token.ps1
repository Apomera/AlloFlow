# Generate a strong ADMIN_TOKEN, store it on the Worker, and show it to you once.
#
#   powershell -ExecutionPolicy Bypass -File catalog\cloudflare-worker\set-admin-token.ps1
#
# ADMIN_TOKEN gates the browser-readable queue endpoints (/bugs, /pdSubmissions,
# /pluginSubmissions). Those queues can contain student-identifiable text from
# bug reports, so treat it as a FERPA-relevant credential:
#
#   - Save it in your password manager. Nowhere else.
#   - Never put it in the repo (that repo is PUBLIC), in a doc, or in a chat.
#   - It is not needed to read the queues from this machine — wrangler reads KV
#     directly with your Cloudflare login. See read-queues.ps1.
#
# The token is generated locally and piped straight to wrangler, so it is never
# passed as a command argument and never appears in shell history.

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WorkerDir = Join-Path $RepoRoot 'catalog\cloudflare-worker'
$WranglerWrapper = Join-Path $RepoRoot 'dev-tools\wrangler.cjs'
$Base = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev'

Write-Host ''
Write-Host 'AlloFlow — set ADMIN_TOKEN' -ForegroundColor Cyan
Write-Host '--------------------------'

# 32 random bytes, URL-safe. Stronger than a chosen password and never typed.
$Bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($Bytes)
$Token = [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

Write-Host 'Generated a 256-bit token. Uploading to Cloudflare...'
Write-Host ''

try {
    # Piped on stdin, not passed as an argument, so it stays out of the
    # process table and out of PSReadLine history.
    $Token | & node $WranglerWrapper --cwd $WorkerDir secret put ADMIN_TOKEN
    if ($LASTEXITCODE -ne 0) { throw "wrangler secret put failed (exit $LASTEXITCODE)" }
}
catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 5

Write-Host ''
Write-Host 'Verifying the reader endpoint...' -ForegroundColor Cyan
$Check = ''
try {
    $CheckResp = Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$Base/pdSubmissions?limit=1" `
        -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec 45 -MaximumRedirection 0 -ErrorAction Stop
    $Check = $CheckResp.Content
}
catch {
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $Check = $reader.ReadToEnd()
            $reader.Dispose()
        } catch {}
    } else {
        $Check = $_.Exception.Message
    }
}

if ($Check -match '"ok"\s*:\s*true') {
    Write-Host 'Queue readers are now unlocked.' -ForegroundColor Green
} elseif ($Check -match 'Admin read disabled') {
    Write-Host 'Secret not propagated yet — wait a minute and retry with Authorization: Bearer <token>.' -ForegroundColor Yellow
} else {
    Write-Host 'Unexpected response:' -ForegroundColor Yellow
    Write-Host $Check
}

Write-Host ''
Write-Host '================ SAVE THIS NOW ================' -ForegroundColor Yellow
Write-Host $Token
Write-Host '==============================================' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Put it in your password manager. It is shown once and cannot be'
Write-Host 'retrieved from Cloudflare afterwards (only overwritten by re-running'
Write-Host 'this script).'
Write-Host ''
Write-Host 'Queue endpoints (send via Authorization: Bearer <token>; query ?token= is disabled):'
Write-Host "  $Base/pdSubmissions"
Write-Host "  $Base/pluginSubmissions"
Write-Host "  $Base/bug-inbox   (browser login for bug reports)"
Write-Host ''
[Array]::Clear($Bytes, 0, $Bytes.Length)
$Token = $null
Write-Host 'Close this window when you have saved the token.'
Write-Host ''
