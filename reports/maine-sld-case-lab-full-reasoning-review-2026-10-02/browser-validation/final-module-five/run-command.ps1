$expectedModule = 'd69ff0908089f9d47dc0a572d676eadbbd846a8cfd5ea170637bd651720eb0f7'
$expectedBrowser = '5bbfcb7c007710c37e1f0c21320d10ab65b52e89fe8c7a581e8160606e6d4909'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) { throw 'Module freeze changed before validation' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) { throw 'Browser test source changed before validation' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/final-module-five/final-browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/final-module-five/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='earlier participant reasoning review keeps all five case records neutral|participant review edits return to each exact control|selected score view retains the full record and neutral response review|selected evidence remains available while navigating form questions|participant comparison edits return to the selected pair' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/final-module-five/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation/final-module-five/run.log'
exit $LASTEXITCODE
