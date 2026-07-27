# Read the submission queues WITHOUT ADMIN_TOKEN.
#
#   powershell -ExecutionPolicy Bypass -File catalog\cloudflare-worker\read-queues.ps1
#   powershell -ExecutionPolicy Bypass -File catalog\cloudflare-worker\read-queues.ps1 -Show
#
# ADMIN_TOKEN exists so a BROWSER on any device can read the queues over HTTP.
# From this machine it is unnecessary: wrangler reads the KV namespaces directly
# using your Cloudflare login. That means the token never has to be shared with
# a coding agent, pasted into a chat, or written to a file — and these queues can
# contain student-identifiable text, so keeping it out of circulation matters.
#
#   -Show  also prints each record's contents (not just the key list).

param([switch]$Show)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$WorkerDir = Join-Path $RepoRoot 'catalog\cloudflare-worker'
$Wrangler = Join-Path $RepoRoot 'dev-tools\wrangler.cjs'

$Queues = @(
    @{ Binding = 'BUG_REPORTS';        Label = 'Bug reports' },
    @{ Binding = 'PD_SUBMISSIONS';     Label = 'PD module submissions' },
    @{ Binding = 'PLUGIN_SUBMISSIONS'; Label = 'Tool Forge plugin submissions' }
)

foreach ($q in $Queues) {
    Write-Host ''
    Write-Host "=== $($q.Label)  [$($q.Binding)] ===" -ForegroundColor Cyan

    $raw = & node $Wrangler --cwd $WorkerDir kv key list --binding $q.Binding --remote 2>$null
    $json = ($raw | Where-Object { $_ -notmatch '^\s*(⛅|─|Resource location)' }) -join "`n"

    try { $keys = $json | ConvertFrom-Json } catch { $keys = @() }
    if (-not $keys -or $keys.Count -eq 0) {
        Write-Host '  (empty)' -ForegroundColor DarkGray
        continue
    }

    Write-Host "  $($keys.Count) item(s)"
    foreach ($k in $keys) {
        $when = if ($k.metadata.submitted_at) { $k.metadata.submitted_at } else { '?' }
        $pii = if ($k.metadata.pii) { '  [PII FLAGGED]' } else { '' }
        Write-Host "  - $($k.name)   $when$pii"

        if ($Show) {
            $val = & node $Wrangler --cwd $WorkerDir kv key get $k.name --binding $q.Binding --remote 2>$null
            Write-Host ($val -join "`n") -ForegroundColor DarkGray
            Write-Host ''
        }
    }
}
Write-Host ''
