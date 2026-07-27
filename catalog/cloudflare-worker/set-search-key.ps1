# Set the Serper.dev API key on the deployed Worker, then prove search works.
#
# Run this when you're back at the keyboard:
#
#   powershell -ExecutionPolicy Bypass -File catalog\cloudflare-worker\set-search-key.ps1
#
# Wrangler prompts for the key, so it never lands in shell history, in the
# repo, or in a chat transcript. Everything else is already deployed and wired;
# this is the last step before web search works in Gemini Canvas.

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WorkerDir = Join-Path $RepoRoot 'catalog\cloudflare-worker'
$WranglerWrapper = Join-Path $RepoRoot 'dev-tools\wrangler.cjs'
$Endpoint = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/search'

Write-Host ''
Write-Host 'AlloFlow — set the web-search key' -ForegroundColor Cyan
Write-Host '---------------------------------'
Write-Host 'Get a key at https://serper.dev (free tier: a one-time 2,500 searches).'
Write-Host 'It is stored as a Cloudflare secret and never reaches a browser.'
Write-Host ''

Push-Location $WorkerDir
try {
    # Wrangler does the prompting; the value never passes through this script.
    & node $WranglerWrapper --cwd $WorkerDir secret put SERPER_API_KEY
    if ($LASTEXITCODE -ne 0) { throw "wrangler secret put failed (exit $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

Write-Host ''
Write-Host 'Verifying against the live endpoint...' -ForegroundColor Cyan

# Cloudflare needs a moment to roll the new secret out to every colo.
Start-Sleep -Seconds 5

$Url = "$Endpoint`?q=grade+3+main+idea+standard&num=3"
$Response = & curl.exe --silent --show-error --max-time 45 --location $Url

Write-Host ''
if ($Response -match '"ok"\s*:\s*true') {
    Write-Host 'Web search is LIVE.' -ForegroundColor Green
    Write-Host ''
    Write-Host $Response
    Write-Host ''
    Write-Host 'Next: open AlloFlow in Gemini Canvas, then'
    Write-Host '  Diagnostics -> Web search -> Run test search'
    Write-Host 'Quick Start -> Find should now return web-verified standards'
    Write-Host '(no "NOT web-verified" banner).'
}
elseif ($Response -match 'search-not-configured') {
    Write-Host 'Still reporting search-not-configured.' -ForegroundColor Yellow
    Write-Host 'The secret may not have propagated yet — wait a minute and re-run:'
    Write-Host "  curl `"$Url`""
}
else {
    Write-Host 'Unexpected response:' -ForegroundColor Yellow
    Write-Host $Response
    Write-Host ''
    Write-Host 'A 429 with daily-budget-exhausted would mean the budget guard is'
    Write-Host 'working but spent. Anything else: check the key at serper.dev.'
}
Write-Host ''
