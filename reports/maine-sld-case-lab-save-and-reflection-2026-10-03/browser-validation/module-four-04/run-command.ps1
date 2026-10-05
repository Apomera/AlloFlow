$ErrorActionPreference = 'Stop'
$expectedModule = '8771e0b351b088fe301060ffb8ce6be5ad6bb2df8504c8b5dc1ef2cf5927ca3a'
$expectedBrowser = '32341725cd74244a0f50c9fb149b500bea68fcc179f5de41ba4d862e499014b8'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedModule) { throw 'Module freeze changed before validation' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedBrowser) { throw 'Browser spec changed before validation' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/module-four-04/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/module-four-04/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='participant planning review keeps all five case reflections|planning reflection edits return by keyboard|session save warning preserves open work and focus|expired tab work can be recovered while optional guide reflection' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/module-four-04/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/module-four-04/run.log'
exit $LASTEXITCODE
