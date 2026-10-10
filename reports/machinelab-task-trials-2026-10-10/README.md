# Machine Lab changed task trials — October 10, 2026

**Test a changed task** is an optional, initially closed panel inside **Design within limits**. It previews two separate trials from the current setup: double the load, or double the load movement. Each keeps the other task condition, all geometry and the force/travel limits fixed. Results explicitly read Current → Trial and distinguish a changed task from changing the machine geometry.

Both trials double task work. A doubled load doubles effort force while total hand travel stays constant; doubled load movement doubles hand travel while effort force stays constant. Each trial displays its force and travel acceptance independently. Learners can deliberately apply an available trial even when it misses their design limits, preserving failed attempts as useful evidence.

Applying changes just the selected task condition, pauses the workshop halfway and follows keyboard focus to that control. Saved designs, previous revisions, explanations, investigation evidence, predictions and reference setups are preserved; only transient live prediction feedback resets. Task previews add no persistent draft or automatic record. Explicit recording then captures the new task through the existing bounded revision workflow and exports it with the correct changed-task explanation.

Trials never silently clamp or round the requested doubling to a different setting. An out-of-range or between-increment value remains an ideal numerical preview with a disabled action and an associated explanation. Each station uses its own load range and step; load movement uses 0.1–3 m in 0.1 m steps. An exact upper-bound trial is available. Invalid current settings or limits suppress the preview panel. Shared Apply guards reject callbacks after changes to view, station, task, geometry, limits or chosen design control, while preserving newer unrelated writing.

These previews use the existing ideal model and accumulated hand-path distance. They do not assess material strength, available physical stroke or friction.

## Validation

All **625 tests across 15 files** pass, including 82 new task-trial cases. All **70 native Chromium checks** pass. Focused checks use independent formulas across all six machines and both trial types, exercise grid/range boundaries and stale callbacks, and verify preserved evidence plus changed-task record semantics. Native checks use the real React/THREE workshop, keyboard controls and an actual downloaded record. The focused 82-test receipt is retained in `tests-focused.json` and is included in, rather than added to, the final total.

The four final desktop, 390px phone, 320px dark-phone and 320px forced-colors captures were visually inspected. Cards and buttons fit their viewports and focus remains visible. Keyboard application was verified for both trial types at every station. The native text download retains both fixed task designs and their explanations after further live task changes; its revision correctly identifies a changed task with no geometry change.

Canonical and desktop source match SHA256 `ed994a737f7a012107e9e57f116f075b76697a650b21a0fb6562984521915d38`. The browser receipt and embedded fixture were verified against that source. Syntax and scoped whitespace checks pass. Read-only review of the actual diff found no blocking issue or necessary fix. Receipts are `tests-final.json`, `browser/results.json`, `browser/downloaded-record.txt` and `validation-summary.json`.

The focused, native-browser and broader regression runs all passed on their first attempts. Existing React key warnings from siege and compare view rendering remain visible in the passing broader suite.

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-task-trials-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_task_trials.test.js tests/machinelab_design_tradeoffs.test.js tests/machinelab_design_revisions.test.js tests/machinelab_design_decisions.test.js tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_read_aloud.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_task_trials_qa.cjs
```

Unrelated shared work and index entries are preserved. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.
