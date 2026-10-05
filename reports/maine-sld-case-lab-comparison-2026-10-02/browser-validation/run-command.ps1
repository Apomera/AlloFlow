$expectedModule = 'ace588aeb71167631b24a7a2c07c0ad3dc02bbcc839322f995a2e8782b0f7aeb'
$expectedBrowser = 'b62e63283ac6a2329b4568e3d6b6c76c9468f5aa5d5de492e0b2d1427894ff0b'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) { throw 'Module freeze changed before validation' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) { throw 'Browser test source changed before validation' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65062/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/comparison-validation/final-browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/comparison-validation/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='selected evidence remains available while navigating form questions|participant premise contrast preserves blank positions|all five cases preserve participant family|all five comparison choices remain distinct|participant comparison edits return to the selected pair|reviewed guide revision buttons focus each existing question|public deep link opens the case directly' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/comparison-validation/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/comparison-validation/run.log'
exit $LASTEXITCODE
