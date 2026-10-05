$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'c5af6b18d2a3a02d1fe99f885b874ea0bae04c1fa74b283a6bda7d69a2bdf87f') { throw 'Module freeze changed' }
if ((Get-FileHash -LiteralPath 'maine_sld_practice_source.jsx' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '85b21dd96f2476e383beef207177736d859170244c35c6705d422e89771f41cb') { throw 'Source freeze changed' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '25f75f6b96dfdba61036c1267e932cd94d0e4691a9969e80867ebe865afd0771') { throw 'Canonical spec changed' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/host-only-01/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/host-only-01/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='public deep link opens the case directly' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/host-only-01/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/evidence-recovery-validation/host-only-01/run.log'
exit $LASTEXITCODE
