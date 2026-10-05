$ErrorActionPreference = 'Stop'
$taskRepo = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
$taskReport = Join-Path $taskRepo 'reports\maine-sld-case-lab-evidence-recovery-2026-10-04\integration'
$taskPrior = Join-Path $taskRepo 'reports\maine-sld-case-lab-guide-revision-2026-10-03\integration\layout-review-correction\source-preview'
$taskRuntimeFile = Join-Path $taskPrior 'runtime.json'
$taskRuntime = Get-Content -LiteralPath $taskRuntimeFile -Raw | ConvertFrom-Json
$taskExpectedModule = '018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc'
$taskExpectedHelper = 'b170417c2a4f85bd41ed18b2ab63e187eddd924722bbdad8165ed6d409fbeb0e'
$taskExpectedSource = 'ae73c22ca8948054f5531b18ef8c03ec94ed1e5a85f7420ef2cecef4629404fe'
$taskExpectedBundle = '82b5dca5e72e1c14ab31b54eab457e007418812af785088c58c0deffd5aa16dd'
$taskExpectedNode = 'C:\Users\cabba\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$taskExpectedPid = 19880
$taskSwitchFile = Join-Path $taskReport 'preview-switch.json'
if (Test-Path -LiteralPath $taskSwitchFile) { throw 'Preserve existing switch evidence' }
if ($taskRuntime.pid -ne $taskExpectedPid -or $taskRuntime.moduleSha256 -ne $taskExpectedModule -or $taskRuntime.pureHttpServe -ne $true) { throw 'Prior runtime identity changed' }
if ($taskRuntime.sourceSha256 -ne $taskExpectedSource -or $taskRuntime.bundleSha256 -ne $taskExpectedBundle) { throw 'Prior immutable snapshot identity changed' }
if ($taskRuntime.ownedHelperSha256 -ne $taskExpectedHelper) { throw 'Prior owned helper metadata changed' }
$taskHelperHash = (Get-FileHash -LiteralPath $taskRuntime.ownedHelperPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($taskHelperHash -ne $taskExpectedHelper) { throw 'Prior owned helper bytes changed' }
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskExpectedPid"
$taskListeners = @(Get-NetTCPConnection -LocalPort 65063 -State Listen -ErrorAction SilentlyContinue)
$taskPriorAlreadyAbsent = $null -eq $taskProcess
if ($taskPriorAlreadyAbsent) {
  if ($taskListeners.Count -ne 0) { throw 'Prior owned process absent but port occupied; do not stop any other process' }
} else {
  if ($taskProcess.ExecutablePath -ine $taskExpectedNode) { throw 'Prior owned process executable changed' }
  if (-not $taskProcess.CommandLine.Contains($taskRuntime.ownedHelperPath) -or -not $taskProcess.CommandLine.Contains($taskExpectedModule) -or -not $taskProcess.CommandLine.Contains('serve')) { throw 'Prior owned process command changed' }
  if ($taskListeners.Count -ne 1 -or $taskListeners[0].OwningProcess -ne $taskExpectedPid -or $taskListeners[0].LocalAddress -ne '127.0.0.1') { throw 'Port65063 is not exclusively the exact owned process' }
}
$taskNewPreview = Get-Content -LiteralPath (Join-Path $taskReport 'source-preview\preview.json') -Raw | ConvertFrom-Json
$taskFreeze = Get-Content -LiteralPath (Join-Path $taskRepo 'reports\maine-sld-case-lab-evidence-recovery-2026-10-04\frozen-activity.json') -Raw | ConvertFrom-Json
if ($taskNewPreview.moduleSha256 -ne $taskFreeze.moduleSha256) { throw 'New preview does not match root freeze' }
foreach ($taskAsset in @('host.bundle.js','maine_sld_practice_module.js','tested-host.jsx')) {
  $taskActualHash = (Get-FileHash -LiteralPath (Join-Path $taskReport ('source-preview\' + $taskAsset)) -Algorithm SHA256).Hash.ToLowerInvariant()
  $taskExpectedAssetHash = if ($taskAsset -eq 'host.bundle.js') { $taskNewPreview.bundleSha256 } elseif ($taskAsset -eq 'maine_sld_practice_module.js') { $taskNewPreview.moduleSha256 } else { $taskNewPreview.sourceSha256 }
  if ($taskActualHash -ne $taskExpectedAssetHash) { throw ('New preview asset drift: ' + $taskAsset) }
}
$taskRecord = [ordered]@{
  verifiedAt = [DateTime]::UtcNow.ToString('o')
  priorRuntimePath = $taskRuntimeFile
  priorRuntimeSha256 = (Get-FileHash -LiteralPath $taskRuntimeFile -Algorithm SHA256).Hash.ToLowerInvariant()
  priorProcessId = $taskExpectedPid
  priorExecutablePath = if ($taskPriorAlreadyAbsent) { $null } else { $taskProcess.ExecutablePath }
  priorCommandLine = if ($taskPriorAlreadyAbsent) { $null } else { $taskProcess.CommandLine }
  priorOwnedHelperSha256 = $taskHelperHash
  exclusivePort = 65063
  listenerAddress = if ($taskPriorAlreadyAbsent) { $null } else { $taskListeners[0].LocalAddress }
  priorOwnedProcessAlreadyAbsent = $taskPriorAlreadyAbsent
  portEmptyBeforeLaunch = $taskPriorAlreadyAbsent
  exactPriorOwnedProcessAndExclusivePortVerified = -not $taskPriorAlreadyAbsent
  newPreviewModuleSha256 = $taskNewPreview.moduleSha256
  newPreviewBundleSha256 = $taskNewPreview.bundleSha256
  newPreviewSourceSha256 = $taskNewPreview.sourceSha256
  operation = if ($taskPriorAlreadyAbsent) { 'Prior recorded process already absent and port empty; preserve prior files and launch the new immutable snapshot without stopping any process.' } else { 'Stop only the exact previously owned local pure-HTTP preview process; preserve all prior preview files.' }
}
if (-not $taskPriorAlreadyAbsent) { Stop-Process -Id $taskExpectedPid -ErrorAction Stop }
for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
  $taskRemaining = @(Get-NetTCPConnection -LocalPort 65063 -State Listen -ErrorAction SilentlyContinue)
  if ($taskRemaining.Count -eq 0) { break }
  Start-Sleep -Milliseconds 100
}
if (@(Get-NetTCPConnection -LocalPort 65063 -State Listen -ErrorAction SilentlyContinue).Count -ne 0) { throw 'Owned process stopped but port remains occupied; do not stop any other process' }
$taskRecord.stoppedOnlyPriorOwnedProcess = -not $taskPriorAlreadyAbsent
$taskRecord.noProcessStopped = $taskPriorAlreadyAbsent
$taskRecord.portReleasedAfterGuardedStop = $true
$taskRecord.completedAt = [DateTime]::UtcNow.ToString('o')
$taskJson = $taskRecord | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($taskSwitchFile, $taskJson, [System.Text.UTF8Encoding]::new($false))
$taskJson
