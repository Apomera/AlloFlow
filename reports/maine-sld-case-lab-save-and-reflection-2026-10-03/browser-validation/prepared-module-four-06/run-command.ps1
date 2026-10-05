$ErrorActionPreference = 'Stop'
$env:SLD_PREPARED_MANIFEST = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-module-four-06/prepared-asset-manifest.json'
$env:NODE_PATH = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules'
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-module-four-06/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-module-four-06/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test --config='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-module-four-06/temporary/playwright.config.ts' --project=chromium --workers=1 --retries=0 --grep='participant planning review keeps all five case reflections|planning reflection edits return by keyboard|session save warning preserves open work and focus|expired tab work can be recovered while optional guide reflection' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-module-four-06/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-module-four-06/run.log'
exit $LASTEXITCODE
