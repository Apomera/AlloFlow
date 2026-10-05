$expectedModule = 'f34e2d1d87c6141cf84c8c2fbcabb063fbef45b1151cd6357af232fbce22b9e5'
$expectedBrowser = '430a7a9d63172cbc16200bbec3dca13762073b576efd835d71dc3f5752c722aa'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) { throw 'Module freeze changed before validation' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) { throw 'Browser test source changed before validation' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/invocation-2/final-browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/invocation-2/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='earlier participant reasoning review keeps all five case records neutral|participant review edits return to each exact control|selected score view retains the full record and neutral response review|selected evidence remains available while navigating form questions|participant comparison edits return to the selected pair|public deep link opens the case directly' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/invocation-2/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/invocation-2/run.log'
exit $LASTEXITCODE
