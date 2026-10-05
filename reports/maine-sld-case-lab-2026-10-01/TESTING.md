# Maine SLD Case Lab — focused validation

Final module: `94bb51978ae58be5b7e88e36fc1cdc0150d4cf35ecc9f5ad91ae82c62062ef1f`.

11 distinct core tests and 13 distinct Chromium scenarios pass. The final-candidate batch passed 11 browser scenarios; two scenarios completed their UI assertions but timed out during browser closing. Both passed an unchanged focused rerun with artifacts written outside OneDrive. All 30 activity-scoped axe scans report zero violations across five steps, 1440/390 px widths, and light/dark/contrast themes. No timeout, assertion, source, or automatic retry limit was weakened.

Coverage includes all three rendered case tasks/debriefs, 52-score filtering and evidence selection, eight academic areas, four Q3 subparts, Q4 evidence streams, Q7 validity guidance, distinct Q8/Q9 reasoning, case/session preservation, storage failure, bounded worksheet export/import, literal HTML text, participant-only print, mobile confirmation focus/Escape, neutral case share links, direct source-app entry and educator-gated Leadership return. The actual Leadership card also opens the panel and returns to the Hub. Print PDF, 30 step/theme captures, and two actual source-app captures are retained.

## Exact executed commands

Working directory: `C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated`.

```powershell
& 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/vitest/vitest.mjs run tests/maine_sld_practice.test.js --maxWorkers=1 --reporter=json --outputFile=reports/maine-sld-case-lab-2026-10-01/final-unit-result.json 2>&1 | Tee-Object -FilePath reports/maine-sld-case-lab-2026-10-01/final-unit-run.log; exit $LASTEXITCODE
```

Final-candidate browser batch (11 passed, 2 closing/teardown timeouts):

```powershell
$env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65058/app'; $env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'reports/maine-sld-case-lab-2026-10-01/final-browser-result.json'; & 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --reporter=list,json --output=reports/maine-sld-case-lab-2026-10-01/browser-final-artifacts 2>&1 | Tee-Object -FilePath reports/maine-sld-case-lab-2026-10-01/final-browser-run.log; exit $LASTEXITCODE
```

Focused unchanged rerun (2 passed; same 120-second test limit and zero retries):

```powershell
New-Item -ItemType Directory -Force -Path 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/final-browser-rerun' | Out-Null; $env:SLD_HOST_BASE_URL = 'http://127.0.0.1:65058/app'; $env:SLD_REPORT_DIR = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/final-browser-rerun'; $env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/final-browser-rerun/targeted-browser-result.json'; & 'C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' node_modules/@playwright/test/cli.js test tests/e2e/maine-sld-practice.spec.ts --project=chromium --workers=1 --retries=0 --grep '390px contrast|public deep link opens' --reporter=list,json --output='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/final-browser-rerun/browser-artifacts' 2>&1 | Tee-Object -FilePath 'C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/final-browser-rerun/targeted-browser-run.log'; exit $LASTEXITCODE
```

## Retained attempts and resolutions

- `unit-attempt-1.json`: an unsupported `toHaveSize` matcher failed; changed to `Set.size` with `toBe(8)`, preserving the eight-distinct-areas assertion. Final core suite is 11/11.
- `browser-attempt-1/` and `browser-artifacts/`: first candidate was 12/13; exact implicit label matching failed for the assessment select. The semantic combobox name-prefix selector passed. That candidate also exposed two moderate nested-main findings; the component was refined to use a labeled section before final validation.
- `final-browser-result.json` and `browser-final-artifacts/`: final-candidate batch was 11/13. Phone contrast finished five scans, screenshots, overflow and focus checks before context teardown timed out. Actual source-host trace completed both workflows and the final Hub-visible assertion before `ungated.close()` stalled. Traces are retained.
- `targeted-rerun/` and `targeted-browser-result.json`: the same two scenarios passed without source/assertion/timeout/retry changes. Only artifact destinations moved to the task-owned local folder; finished outputs were copied here.

[`validation-summary.json`](validation-summary.json) distinguishes unique coverage from attempts and links every raw result. [`validation-commands.json`](validation-commands.json) records the runtime and original focused command settings.

This validates the local working-tree activity and actual source-app preview in Chromium. It is not a production-release, installer, legal-certification, or comprehensive assistive-technology audit. No full build, commit, push or deployment was performed by the validation owner.
