$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
$taskRuns = @(
  @{Name='adult-preserve';Pattern='preserves every.*adult.*scene';Count=18},
  @{Name='adult-fit';Pattern='frames the complete.*adult.*supporting hand';Count=12},
  @{Name='child-preserve';Pattern='preserves every.*child.*scene';Count=18},
  @{Name='child-fit';Pattern='frames the complete.*child.*supporting hand';Count=12},
  @{Name='infant-preserve';Pattern='preserves every.*infant.*scene';Count=18},
  @{Name='infant-fit';Pattern='frames the complete.*infant.*supporting hand';Count=12},
  @{Name='lifecycle';Pattern='supporting hand lifecycle and camera compatibility';Count=8},
  @{Name='ui';Pattern='supporting hand visual observation and pose comparison';Count=11}
)
$taskSummary = @()
foreach ($taskRun in $taskRuns) {
  $taskJson = "reports/firstresponse-supporting-hand/unit-final-$($taskRun.Name).json"
  $taskLog = "reports/firstresponse-supporting-hand/unit-final-$($taskRun.Name).log"
  $taskArgs = @('node_modules/vitest/vitest.mjs','run','tests/firstresponse_supporting_hand.test.js',
    '--testNamePattern',$taskRun.Pattern,'--pool=forks','--experimental.viteModuleRunner=false',
    '--maxWorkers=1','--isolate=false','--testTimeout=240000','--hookTimeout=120000',
    '--reporter=default','--reporter=json',"--outputFile=$taskJson")
  & node @taskArgs 2>&1 | Tee-Object -FilePath $taskLog
  $taskExit = $LASTEXITCODE
  $taskResult = Get-Content -LiteralPath $taskJson -Raw | ConvertFrom-Json
  $taskSummary += @{name=$taskRun.Name;pattern=$taskRun.Pattern;expected=$taskRun.Count;passed=$taskResult.numPassedTests;failed=$taskResult.numFailedTests;exit=$taskExit}
  $taskSummary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath 'reports/firstresponse-supporting-hand/unit-final-summary.json' -Encoding utf8
  if ($taskExit -ne 0 -or $taskResult.numPassedTests -ne $taskRun.Count -or $taskResult.numFailedTests -ne 0) {
    throw "Unit validation failed or skipped required cases: $($taskRun.Name)"
  }
}
