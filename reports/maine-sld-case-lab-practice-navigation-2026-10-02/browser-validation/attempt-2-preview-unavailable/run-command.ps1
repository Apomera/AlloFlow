$expectedModule = '189081606d02a6b7178c5c8046fdd5cefd62b98b9d5768fc6ea89f7b08b85f25'
$expectedBrowser = '1114b15f54da14f6c18cc028d04a2b95a5ea972c83f5ed124e47e009e0e42331'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) { throw 'Module freeze changed before validation' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) { throw 'Browser test source changed before validation' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/practice-navigation-validation/host-rerun/final-browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/practice-navigation-validation/host-rerun/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='public deep link opens the case directly and configured educator access protects Leadership return' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/practice-navigation-validation/host-rerun/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/practice-navigation-validation/host-rerun/run.log'
exit $LASTEXITCODE
