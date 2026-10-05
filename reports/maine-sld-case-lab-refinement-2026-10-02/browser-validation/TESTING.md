# Maine SLD refinement validation — October 2, 2026

The frozen final activity passes **16 distinct Chromium scenarios**, one worker, zero automatic retries, unchanged 120-second test limit, exit code 0. The actual source-app snapshot is served at `http://127.0.0.1:65059/app`. Final module SHA-256: `2a2e0dd185b387eda6325be662a98a9969155511bbe8c9a3a1bfb44fe5b2b607`.

All **34 activity-scoped axe scans have zero violations**: 30 across five steps, desktop/phone and light/dark/contrast, plus four constrained viewport scans at 320×700, 390×844, 1366×720 and 844×390. These automated scans are scoped checks rather than a comprehensive assistive-technology audit.

New behavior checks cover reachable compact worksheet tools, native keyboard score-guide disclosure with all original interpretation guidance retained, predictable Tools/confirmation Escape focus, selected-only scores with a return to all 52 results, focus after selected-row/card removal, neutral participant Q8/Q9 and evidence-request review with direct edits, literal markup display, and all filter clearing on confirmed worksheet restoration. Regression checks retain case/session separation, reviewed debrief and participant-only print, safe transfer, storage fallback, share-link privacy, real source-app entry and gated/ungated Leadership return.

`final-browser-result.json` and `final-browser-run.log` are the raw final results; `final-browser/` holds 43 screenshots, the participant print PDF, worksheet fixtures, measurements, and axe reports. `validation-summary.json` records exact coverage, final hashes and constrained-layout measurements. `browser-tested.spec.ts` preserves the exact tested source.

## Exact final command

Working directory: `C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated`.

```powershell
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65059/app'
$env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/refinement-browser/final-browser'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/refinement-browser/final-browser-result.json'
New-Item -ItemType Directory -Force -Path $env:SLD_REPORT_DIR | Out-Null
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/refinement-browser/final-browser-artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/refinement-browser/final-browser-run.log'
exit $LASTEXITCODE
```

`validation-commands.json` also records the earlier exact focused command and superseded batch destinations.

## Retained earlier attempts

The initial three new scenarios passed against an earlier geometry candidate. A subsequent 16/16 batch also exited 0, but the module was rebuilt for the restore-filter fix while that live-disk harness was running. It is preserved under `superseded-attempt-1-*` and is **excluded from final coverage** because its start hash does not prove every per-test module load. The complete stable final batch repeats all coverage after the final freeze and refreshed App.jsx preview. No failed assertion, retry or increased timeout was used for the final batch.

No legal/data/core content changed in this refinement; the previous focused core suite was not repeated. No full application build, staging, commit, push or deployment was performed by validation.
