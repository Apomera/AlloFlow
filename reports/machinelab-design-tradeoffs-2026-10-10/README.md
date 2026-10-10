# Machine Lab working design tradeoffs — October 10, 2026

**Explore working designs** adds an optional, initially closed comparison inside **Design within limits**. Learners can compare the least-effort, shortest-travel and closest available settings even when their current design already meets the limits. The choices apply to the selected geometry control, holding the task and other geometry fixed; they do not claim a globally optimal machine.

The existing legal-increment search supplies full-precision force and accumulated hand travel. Each card shows both outcomes and the force/travel allowance remaining. The task work stays constant. Ranking follows the actual machine outcomes, including inverse controls such as load arm, drum radius, ramp height, wedge thickness and screw pitch. Equal nearest distances select the lower numerical setting with the existing numerical tolerance. Duplicate choices merge their reasons, keeping the comparison to at most three cards.

Each card is an accessible named group. Native disclosures and buttons support keyboard navigation; choosing a setting returns focus to its station control and pauses the workshop halfway through its motion. An already-current setting is disabled and cannot reset live feedback. Application rejects stale callbacks after task, geometry, station, view, limits or selected-control changes. Saved designs and their previous revisions, explanations, recorded investigations and reference setups remain intact. Learners explicitly record an applied design through the existing workflow.

Invalid input, an impossible work budget or an empty set of legal increments produce no candidate buttons. A valid imported continuous setting may itself meet the limits while no slider increment does; that does not turn it into an invalid setup or invent an available choice. This remains an ideal machine model; total hand travel is accumulated path length.

## Validation

All **543 tests across 14 files** pass, including 54 new tradeoff cases. All **53 native Chromium checks** pass. Checks cover independent physics for all eleven geometry controls, extremes and nearest choices, bounded deduplication, inverse directions, unchanged task work, exact and impossible constraints, off-grid settings, stale callbacks, preserved evidence and keyboard interaction. Native browser QA uses the actual React/THREE workshop and a downloaded text record.

The four final desktop, 390px phone, 320px dark-phone and 320px forced-colors captures were visually inspected. Cards, controls and labels fit their viewports; focus is visible. Applying choices through the keyboard was verified at all six stations, including return focus to the changed control. The downloaded record retains both frozen designs and their explanations after further live geometry changes.

Canonical and desktop source match SHA256 `e988719937259f76a1807db9e9f4fc096135397db1ec58f836bf3267dcc2c15f`. The browser receipt and embedded fixture were verified against that source. Syntax and scoped whitespace checks pass. An independent read-only review found no blocking calculation or evidence-preservation issue; its suggested view guard is included and tested. Receipts are `tests-final.json`, `browser/results.json`, `browser/downloaded-record.txt` and `validation-summary.json`.

The initial 54-test focused run is retained in `tests-focused-root.json` and is not added to the final total. The first browser attempt exposed a product focus bug (`browser/results-focus-recovery.json`): a used choice remains mounted but becomes disabled, dropping focus to the document body. Shared focus recovery now handles that disabled trigger as well as a removed suggestion, and still respects focus moved to another control. The final browser and broader unit runs use the corrected source. Existing React key warnings from siege and compare view rendering remain in the passing broader suite.

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-design-tradeoffs-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_design_tradeoffs.test.js tests/machinelab_design_revisions.test.js tests/machinelab_design_decisions.test.js tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_read_aloud.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_design_tradeoffs_qa.cjs
```

Unrelated shared work and index entries are preserved. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.
