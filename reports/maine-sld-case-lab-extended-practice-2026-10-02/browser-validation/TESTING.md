# Maine SLD extended-practice validation — October 2, 2026

The frozen final candidate passed **22 distinct Chromium scenarios** and **15 focused core tests**, exit code 0 for both. Browser verification used one worker, zero automatic retries and the unchanged 120-second test limit. The exact source-app preview is `http://127.0.0.1:65061/app`. Final module SHA-256: `7b17750545fa2cd8e177671e2888fa520a53226026cf56be5fa05a36f5c7409e`; version 1.1.0 with five cases and explicit 1.0.0 worksheet/session compatibility.

All **46 activity-scoped axe scans reported zero violations**: 30 original step/theme scans, four constrained layouts, two expanded participant-reference/comparison states, and ten step scans across Marisol and Taylor. Marisol's reasoning scan includes the expanded optional evidence-request prompts. These scoped automated checks are not a comprehensive assistive-technology audit.

The original 19 browser scenarios and their assertions are retained; the earlier evidence scenario gains named diagnostic steps and the real source-host scenario adds Marisol deep entry. Three new scenarios verify legacy worksheet/tab-session note preservation with blank added cases, independent five-case family/language/form reflections through export/reset/restore and participant-only print, and new case records/cautions/held debrief/native-library navigation/copied case links. Marisol correctly displays a request for score information with no invented table or filters; Taylor displays four generic standard scores. The original 52-row Alex record is still covered. All case responses remain participant-owned, and reviewed debriefs require an explicit reveal.

The original 11 unit scenarios remain verbatim. Four new API-level scenarios verify explicit legacy import and session migration, current-version resaving, unchanged expiry/future-time and unknown-version rejection, bounded allowlist handling and independent five-case transfer/reset behavior. Existing incompatible format/schema rejection remains covered.

`final-browser-result.json`, `final-browser-run.log`, `unit-result.json` and `unit-run.log` retain raw stable results. `final-browser/` holds 64 screenshots, both participant print PDFs, worksheet fixtures, measurements and axe reports. `browser-tested.spec.ts` and `unit-tested.test.js` preserve the exact tested sources, with baselines retained separately. `validation-summary.json` records final hashes and exact coverage. All four module hashes were rechecked after completion.

## Timing diagnosis

The previous evidence-return scenario passed in 106,661 ms. Its worksheet download was recorded around 13 seconds after its start; passed-run results had no action trace, so the later local read/reset/restore/teardown delay could not be attributed precisely. This run retains the same assertions and limit while recording three named tail phases. Current scenario duration: 8254 ms; recorded body duration: 7737 ms. See `evidence-timing-summary.json` and `final-browser/evidence-tail-timings.json`. No timeout increase, retry or assertion removal was used.

## Exact commands

Working directory: `C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated`.

```powershell
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/vitest/vitest.mjs run tests/maine_sld_practice.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended-validation/unit-result.json' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended-validation/unit-run.log'
exit $LASTEXITCODE
```

```powershell
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65061/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended-validation/final-browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended-validation/final-browser-result.json'
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended-validation/final-browser-artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended-validation/final-browser-run.log'
exit $LASTEXITCODE
```

Artifacts were captured outside OneDrive and copied after completion. No full application build, staging, commit, push or deployment was performed by validation.
