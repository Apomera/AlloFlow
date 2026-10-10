param(
  [string]$ReportDirectory = 'reports/firstresponse-patient-finish',
  [string]$RunLabel = 'unit-final'
)
$ErrorActionPreference = 'Stop'
$taskRepository = 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
Set-Location -LiteralPath $taskRepository
$taskReportPath = [System.IO.Path]::GetFullPath((Join-Path $taskRepository $ReportDirectory))
if (-not $taskReportPath.StartsWith($taskRepository + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unit reports must stay inside the repository.'
}
if ($RunLabel -notmatch '^[a-z0-9][a-z0-9-]*$') { throw 'RunLabel must contain lowercase letters, digits and hyphens.' }
New-Item -ItemType Directory -Force -Path $taskReportPath | Out-Null
$taskSummaryPath = Join-Path $taskReportPath "$RunLabel-summary.json"
if (Test-Path -LiteralPath $taskSummaryPath) { throw "Existing summary is preserved. Choose a fresh RunLabel: $taskSummaryPath" }
$taskExpectedSource = '970FBB0E068412F3D3E3FB4ED01013A1AFB56B9D5270FB2EB18D24201BFD012C'
$taskSourcePath = Join-Path $taskRepository 'stem_lab/stem_tool_firstresponse.js'
$taskMirrorPath = Join-Path $taskRepository 'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js'
foreach ($taskPath in @($taskSourcePath, $taskMirrorPath)) {
  if ((Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash -cne $taskExpectedSource) {
    throw "Source changed before validation: $taskPath"
  }
}
$taskRuns = @(
  @{Name='finish-source';File='tests/firstresponse_patient_finish.test.js';Pattern='limits the production delta to the unique finish block and preserves all viewer configuration';Count=1;Total=22},
  @{Name='finish-adult';File='tests/firstresponse_patient_finish.test.js';Pattern='First Response patient skin finish adult ';Count=7;Total=22},
  @{Name='finish-child';File='tests/firstresponse_patient_finish.test.js';Pattern='First Response patient skin finish child ';Count=7;Total=22},
  @{Name='finish-infant';File='tests/firstresponse_patient_finish.test.js';Pattern='First Response patient skin finish infant ';Count=7;Total=22},
  @{Name='support-adult-preserve';File='tests/firstresponse_supporting_hand.test.js';Pattern='preserves every.*adult.*scene';Count=18;Total=109},
  @{Name='support-adult-fit';File='tests/firstresponse_supporting_hand.test.js';Pattern='frames the complete.*adult.*supporting hand';Count=12;Total=109},
  @{Name='support-child-preserve';File='tests/firstresponse_supporting_hand.test.js';Pattern='preserves every.*child.*scene';Count=18;Total=109},
  @{Name='support-child-fit';File='tests/firstresponse_supporting_hand.test.js';Pattern='frames the complete.*child.*supporting hand';Count=12;Total=109},
  @{Name='support-infant-preserve';File='tests/firstresponse_supporting_hand.test.js';Pattern='preserves every.*infant.*scene';Count=18;Total=109},
  @{Name='support-infant-fit';File='tests/firstresponse_supporting_hand.test.js';Pattern='frames the complete.*infant.*supporting hand';Count=12;Total=109},
  @{Name='support-lifecycle';File='tests/firstresponse_supporting_hand.test.js';Pattern='supporting hand lifecycle and camera compatibility';Count=8;Total=109},
  @{Name='support-ui';File='tests/firstresponse_supporting_hand.test.js';Pattern='supporting hand visual observation and pose comparison';Count=11;Total=109},
  @{Name='contrast-adult';File='tests/firstresponse_patient_contrast.test.js';Pattern='First Response patient arm contrast contours adult ';Count=11;Total=34},
  @{Name='contrast-child';File='tests/firstresponse_patient_contrast.test.js';Pattern='First Response patient arm contrast contours child ';Count=11;Total=34},
  @{Name='contrast-infant';File='tests/firstresponse_patient_contrast.test.js';Pattern='First Response patient arm contrast contours infant ';Count=11;Total=34},
  @{Name='contrast-shader';File='tests/firstresponse_patient_contrast.test.js';Pattern='transforms real r128 Basic shaders and keeps patient, rescuer and scene uniforms independent';Count=1;Total=34},
  @{Name='rescuer-adult';File='tests/firstresponse_surface_clarity.test.js';Pattern='preserves adult geometry and scopes finishes';Count=2;Total=11},
  @{Name='rescuer-child';File='tests/firstresponse_surface_clarity.test.js';Pattern='preserves child geometry and scopes finishes';Count=2;Total=11},
  @{Name='rescuer-infant';File='tests/firstresponse_surface_clarity.test.js';Pattern='preserves infant geometry and scopes finishes';Count=2;Total=11},
  @{Name='rescuer-shader';File='tests/firstresponse_surface_clarity.test.js';Pattern='transforms the real r128 Basic shaders with a stable normal contour and shared strength uniform';Count=1;Total=11},
  @{Name='rescuer-child-choices';File='tests/firstresponse_surface_clarity.test.js';Pattern='retains hidden child-hand resources and material sharing when choices change';Count=2;Total=11},
  @{Name='rescuer-recovery';File='tests/firstresponse_surface_clarity.test.js';Pattern='leaves recovery patient hand materials and poses outside the finish treatment';Count=2;Total=11}
)
$taskExpectedTotal = ($taskRuns | Measure-Object -Property Count -Sum).Sum
if ($taskExpectedTotal -ne 176) { throw 'The serial run plan must cover 176 distinct tests.' }
$taskSummary = @()
$taskPassedNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
foreach ($taskRun in $taskRuns) {
  $taskJson = Join-Path $taskReportPath "$RunLabel-$($taskRun.Name).json"
  $taskLog = Join-Path $taskReportPath "$RunLabel-$($taskRun.Name).log"
  $taskStarted = [DateTimeOffset]::UtcNow
  $taskEntry = [ordered]@{
    name=$taskRun.Name;file=$taskRun.File;pattern=$taskRun.Pattern;expected=$taskRun.Count;
    totalDiscoveredExpected=$taskRun.Total;startedUtc=$taskStarted.ToString('o');
    sourceSHA256=$taskExpectedSource;status='running';passed=0;failed=0;exit=$null;error=$null
  }
  $taskSummary += $taskEntry
  try {
    if ((Test-Path -LiteralPath $taskJson) -or (Test-Path -LiteralPath $taskLog)) {
      throw "Existing run artifacts are preserved. Choose a fresh RunLabel: $($taskRun.Name)"
    }
    if ((Get-FileHash -LiteralPath $taskSourcePath -Algorithm SHA256).Hash -cne $taskExpectedSource) {
      throw 'Source changed during serial validation.'
    }
    $taskArgs = @('node_modules/vitest/vitest.mjs','run',$taskRun.File,
      '--testNamePattern',$taskRun.Pattern,'--pool=forks','--experimental.viteModuleRunner=false',
      '--maxWorkers=1','--isolate=false','--testTimeout=240000','--hookTimeout=120000',
      '--reporter=default','--reporter=json',"--outputFile=$taskJson")
    & node @taskArgs 2>&1 | Tee-Object -FilePath $taskLog
    $taskEntry.exit = $LASTEXITCODE
    if (-not (Test-Path -LiteralPath $taskJson)) { throw 'Vitest did not write its JSON report.' }
    $taskResult = Get-Content -LiteralPath $taskJson -Raw | ConvertFrom-Json
    $taskEntry.passed = $taskResult.numPassedTests
    $taskEntry.failed = $taskResult.numFailedTests
    $taskEntry.pending = $taskResult.numPendingTests
    $taskEntry.totalDiscovered = $taskResult.numTotalTests
    $taskEntry.jsonSuccess = $taskResult.success
    if ($taskEntry.exit -ne 0 -or $taskResult.success -ne $true -or
        $taskResult.numPassedTests -ne $taskRun.Count -or $taskResult.numPassedTests -le 0 -or
        $taskResult.numFailedTests -ne 0 -or $taskResult.numFailedTestSuites -ne 0 -or
        $taskResult.numTotalTests -ne $taskRun.Total -or
        $taskResult.numPendingTests -ne ($taskRun.Total - $taskRun.Count) -or $taskResult.numTodoTests -ne 0) {
      throw 'Unit validation failed or did not execute exactly the required cases.'
    }
    if ($taskResult.startTime -lt $taskStarted.ToUnixTimeMilliseconds()) { throw 'JSON report predates this process.' }
    if (@($taskResult.testResults).Count -ne 1) { throw 'JSON report must contain exactly the requested fixture.' }
    $taskFileResult = @($taskResult.testResults)[0]
    $taskExpectedFile = (Join-Path $taskRepository $taskRun.File).Replace('\','/')
    if ($taskFileResult.name.Replace('\','/') -cne $taskExpectedFile -or $taskFileResult.status -ne 'passed') {
      throw 'JSON report identifies an unexpected or failed fixture.'
    }
    $taskAssertions = @($taskFileResult.assertionResults)
    $taskPassed = @($taskAssertions | Where-Object { $_.status -eq 'passed' })
    if ($taskAssertions.Count -ne $taskRun.Total -or $taskPassed.Count -ne $taskRun.Count -or
        @($taskAssertions | Where-Object { $_.status -notin @('passed','skipped') }).Count -ne 0) {
      throw 'Assertion details disagree with the exact JSON pass counts.'
    }
    foreach ($taskAssertion in $taskPassed) {
      if ($taskAssertion.fullName -notmatch $taskRun.Pattern) { throw 'A passed assertion falls outside the requested section.' }
      if (-not $taskPassedNames.Add($taskRun.File + ':' + $taskAssertion.fullName)) { throw 'A required case ran in more than one section.' }
    }
    $taskEntry.passedNames = @($taskPassed | ForEach-Object { $_.fullName })
    $taskEntry.status = 'passed'
  } catch {
    $taskEntry.status = 'failed'; $taskEntry.error = $_.Exception.Message
    throw
  } finally {
    $taskEntry.completedUtc = [DateTimeOffset]::UtcNow.ToString('o')
    $taskSummary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskSummaryPath -Encoding utf8
  }
}
if ($taskPassedNames.Count -ne $taskExpectedTotal) { throw 'Distinct passing case count does not match the complete plan.' }
foreach ($taskPath in @($taskSourcePath, $taskMirrorPath)) {
  if ((Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash -cne $taskExpectedSource) {
    throw "Source changed before completion: $taskPath"
  }
}
Write-Output "Passed $taskExpectedTotal distinct tests in $($taskRuns.Count) fresh serial processes. Summary: $taskSummaryPath"
