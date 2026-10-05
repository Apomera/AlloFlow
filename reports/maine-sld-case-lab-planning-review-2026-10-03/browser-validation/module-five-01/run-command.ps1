$ErrorActionPreference = 'Stop'
$expectedModule = '606ce30776177cc8faeb8d520f09ac15151b584eb8b09be9c25829f3883e5779'
$expectedBrowser = '1444827ef5f968cdcae9de2fd31171e33f671dd6eaa304fb9e718df5e1f4d3ec'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) { throw 'Module freeze changed before validation' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) { throw 'Browser spec changed before validation' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65064/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/planning-review-validation/module-five-01/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/planning-review-validation/module-five-01/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='participant planning review keeps all five case reflections|planning reflection edits return by keyboard|participant review edits return to each exact control|selected evidence remains available while navigating form questions|participant comparison edits return to the selected pair' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/planning-review-validation/module-five-01/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/planning-review-validation/module-five-01/run.log'
exit $LASTEXITCODE
