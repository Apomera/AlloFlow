# Opens the private inbox using this Windows account's encrypted local token.
# The token is copied for pasting into the login field; it never enters a URL.
param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TokenFile = Join-Path $RepoRoot 'desktop\.local\bug-inbox-token.dpapi.secret'
$InboxUrl = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/bug-inbox'

if (-not (Test-Path -LiteralPath $TokenFile)) {
    throw 'This Windows account has no saved inbox token. See catalog/cloudflare-worker/BUG_REPORT_INBOX.md for setup.'
}

$SavedToken = (Get-Content -LiteralPath $TokenFile -Raw).Trim() | ConvertTo-SecureString
$Credential = New-Object System.Net.NetworkCredential('', $SavedToken)
if ([string]::IsNullOrWhiteSpace($Credential.Password)) { throw 'The saved inbox token is empty.' }

if ($CheckOnly) {
    Write-Host 'The inbox token is available to this Windows account. No browser was opened and no clipboard was changed.'
} else {
    Set-Clipboard -Value $Credential.Password
    Start-Process $InboxUrl
    Write-Host 'Inbox opened. Paste the copied token into Inbox access token, then choose Open inbox.'
    Write-Host 'The token grants access to private reports. Do not paste it into a chat or public document.'
}
$Credential = $null
$SavedToken.Dispose()
