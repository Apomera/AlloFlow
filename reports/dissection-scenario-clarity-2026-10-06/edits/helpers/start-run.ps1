param([string]$Modes = 'baseline,scenario,unit-main,unit-axe,study,view', [string]$Suffix = '1')
$ErrorActionPreference = 'Stop'
if ($Suffix -notmatch '^\d+$' -or $Modes -notmatch '^(baseline|scenario|unit-main|unit-axe|study|view)(,(baseline|scenario|unit-main|unit-axe|study|view))*$') { throw 'Invalid run selection' }
$taskWorkspace = 'C:\Users\cabba\Documents\Codex\2026-09-29\please-keep-improving-interactivity-engagement-and'
$taskScratch = Join-Path $taskWorkspace 'dissection-scenario-clarity-2026-10-06'
$taskReport = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\reports\dissection-scenario-clarity-2026-10-06'
$taskNode = (Get-Command node.exe).Source
$taskRunner = Join-Path $taskScratch 'run-scenario.cjs'
$taskOut = Join-Path $taskReport ('runner-' + $Suffix + '-stdout.log')
$taskErr = Join-Path $taskReport ('runner-' + $Suffix + '-stderr.log')
if ((Test-Path -LiteralPath $taskOut) -or (Test-Path -LiteralPath $taskErr)) { throw 'Runner output already exists' }
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList @(('"' + $taskRunner + '"'), $Modes, $Suffix) -WorkingDirectory $taskWorkspace -WindowStyle Hidden -RedirectStandardOutput $taskOut -RedirectStandardError $taskErr -PassThru
Write-Output ('Started hidden scoped runner PID ' + $taskProcess.Id)
