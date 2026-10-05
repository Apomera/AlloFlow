$ErrorActionPreference = 'Stop'
$env:SLD_PREPARED_MANIFEST = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-host-only-02/prepared-asset-manifest.json'
$env:NODE_PATH = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules'
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-host-only-02/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-host-only-02/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test --config='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-host-only-02/temporary/playwright.config.ts' --project=chromium --workers=1 --retries=0 --grep='public deep link opens the case directly' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-host-only-02/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/save-and-reflection-validation/prepared-host-only-02/run.log'
exit $LASTEXITCODE
