$ErrorActionPreference = 'Stop'
$taskNodePath = 'C:\Program Files\nodejs\node.exe'
$taskServerPath = 'C:\Users\cabba\Documents\Codex\2026-09-29\new-chat-10\serve-pass54-ready.cjs'
$taskRepoPath = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
$taskPreviewProc = Start-Process -FilePath $taskNodePath -ArgumentList @($taskServerPath) -WorkingDirectory $taskRepoPath -WindowStyle Hidden -PassThru
$taskReceipt = @{ pid = $taskPreviewProc.Id; server = $taskServerPath; hidden = $true; started = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
Set-Content -LiteralPath 'C:\Users\cabba\Documents\Codex\2026-09-29\new-chat-10\pass54-preview-process.json' -Value $taskReceipt
Write-Output $taskReceipt
