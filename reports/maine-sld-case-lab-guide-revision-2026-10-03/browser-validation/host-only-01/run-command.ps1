$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '0ceb5207851a88db30562486dd838e6efbf126cc0e8a7dee7ddc14340864af7c') { throw 'Module freeze changed' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4') { throw 'Canonical spec changed' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/host-only-01/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/host-only-01/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='public deep link opens the case directly' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/host-only-01/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/host-only-01/run.log'
exit $LASTEXITCODE
