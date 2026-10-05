$ErrorActionPreference = 'Stop'
if ((Get-FileHash -LiteralPath 'maine_sld_practice_module.js' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '018f7f789eb751dabd354bb28079fe60ce92d9a94f052fe9ce679c2230c7c7fc') { throw 'Module freeze changed' }
if ((Get-FileHash -LiteralPath 'maine_sld_practice_source.jsx' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '46d1ce09304d70d98b60a4a7a758969b3c5f3eef99a6c5b522113a06e9397437') { throw 'Source freeze changed' }
if ((Get-FileHash -LiteralPath 'tests/e2e/maine-sld-practice.spec.ts' -Algorithm SHA256).Hash.ToLowerInvariant() -ne '7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4') { throw 'Canonical spec changed' }
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65063/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/module-five-02/browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/module-five-02/result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep='reviewed guide revision buttons focus each existing question|participant review edits return to each exact control|session save warning preserves open work and focus|reviewed guide revisions return by keyboard|reviewed guide narrative status treats whitespace' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/module-five-02/artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/guide-revision-validation/module-five-02/run.log'
exit $LASTEXITCODE
