$ErrorActionPreference = 'Stop'
$taskRepo = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
$taskReport = Join-Path $taskRepo 'reports\maine-sld-case-lab-evidence-recovery-2026-10-04\integration\layout-review-correction'
$taskPrior = Join-Path $taskRepo 'reports\maine-sld-case-lab-evidence-recovery-2026-10-04\integration\source-preview'
$taskRuntimeFile = Join-Path $taskPrior 'runtime.json'
$taskRuntime = Get-Content -LiteralPath $taskRuntimeFile -Raw | ConvertFrom-Json
$taskExpectedModule = '6ab45e2cbf3793f58d0510e5049028855169aa1150fa33209ad2d48179f0b424'
$taskExpectedHelper = '5b75361e0294e82dc149f558c5225bd07bd03ccdff4175d7cf9e1e2d1b68da50'
$taskExpectedSource = '86eecff52f711fa3e3398fbfd24e8def69a84ba4ed69466f1c5eb013e1d388e6'
$taskExpectedBundle = 'f6bb88089f30814dc0eddbb875a67128cee05469993d476200f6fbe1d2b3f458'
$taskExpectedNode = 'C:\Users\cabba\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$taskExpectedPid = 36180
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
$taskRecord.portReleasedAfterGuardedStop = -not $taskPriorAlreadyAbsent
$taskRecord.portEmptyAfterTransitionGuard = $true
$taskRecord.completedAt = [DateTime]::UtcNow.ToString('o')
$taskJson = $taskRecord | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($taskSwitchFile, $taskJson, [System.Text.UTF8Encoding]::new($false))
$taskJson
