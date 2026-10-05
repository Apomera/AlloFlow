$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc') { throw 'Module freeze changed' }
if ((Get-FileHash -LiteralPath 'maine_sld_practice_source.jsx' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '46d1ce09304d70d98b60a4a7a758969b3c5f3eef99a6c5b522113a06e9397437') { throw 'Source freeze changed' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '286c499df4c04b5f7cd21f53010f95835c0987d3e6c83604b880f64089c5b1ab') { throw 'Canonical spec changed' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/baseline-regression-01/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/baseline-regression-01/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='most recent finding removal can restore exact roles' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/baseline-regression-01/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/baseline-regression-01/run.log'
exit $LASTEXITCODE
