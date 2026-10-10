# Machine Lab applied-change undo — October 10, 2026

**Undo last applied change** provides one-step recovery after using a geometry suggestion, choosing a working design, or applying a changed-task trial. Each station retains only its latest accepted Apply action. The panel names the changed setting and displays its original and applied values; undo restores exactly that setting and consumes the checkpoint without creating redo or older history.

Undo preserves current force/travel limit drafts, the selected search control, saved designs and revisions, explanations, recorded comparisons, guided investigation choices and reference setups. It pauses workshop motion halfway and clears transient live prediction feedback, matching the normal Apply behavior. Keyboard focus follows the restored setting, including when the learner has since selected a different search control.

Recovery remains available during invalid or blank constraint drafts. Physical changes are different: the complete current station setup must still match the checkpoint's applied setup. Manual geometry, load or load-movement drift disables Undo with a linked explanation. Because movement is shared between stations, changing it elsewhere also prevents an outdated return. Restoring the matching physical setup may make Undo available again.

Each checkpoint contains only its bench ID, the changed key, and separate numerical before/after copies of that station's settings. A new accepted Apply replaces that station's checkpoint. Consumption removes only that checkpoint and preserves other stations' latest changes. The updater checks current view/station, checkpoint identity, valid snapshots, and the full applied physical setup again before restoring a single key. Repeated or stale callbacks do nothing, including when later actions return the machine to the same numbers.

Malformed imported checkpoints are not offered as actions. Validation requires a recognized station key, finite in-range physical setups with valid geometry, and exactly one difference matching the named key. Extra imported fields are never spread into live settings. An original in-range setting between normal slider increments can be restored exactly when it was the actual prior value.

Undo does not rewrite recorded evidence. A design saved after an applied change remains that fixed design even when live settings are subsequently undone; comparison, work record and export retain their existing distinction between saved and current setups.

## Validation

All **711 tests across 16 files pass**, including **86 focused undo tests**. Focused checks cover all geometry controls, both task-trial kinds, bounded checkpoint lifecycle, invalid constraints, physical drift, stale actions and import validation. The final regression includes the focused tests; they are not counted twice. The original 82-test receipt is retained separately.

Read-only review identified a delayed-focus edge case when React reuses a connected panel after a station switch. Apply and Undo now verify the panel's current station before moving focus. Four real-DOM, fake-timer tests verify same-station focus and reject focus after the panel changes stations. Final review found no remaining blocker.

All **91 final native Chromium checks pass with zero errors**, using the actual React/THREE workshop, keyboard focus and a downloaded record. All six stations cover geometry choices and both changed-task applications. Further checks cover nearest suggestions, invalid limits, manual drift and restored eligibility, replacement checkpoints, other stations, saved design revisions and text export. Desktop, phone, dark and forced-color captures were visually inspected: labels and controls wrap, content fits, focus remains visible, and active/disabled Undo explanations are readable.

Canonical and public runtime copies match SHA256 `947f75cfffae70c6a510fecb15bfa80dac48f7b421cd4dd8a84987d816876884`; the browser's generated page embeds that same source. Syntax and scoped whitespace checks pass. See `validation-summary.json` for exact counts and evidence paths. Windows rejected one direct public-mirror overwrite because the file was mapped; a same-directory temporary write and atomic rename succeeded, followed by byte-parity and hash checks.

The first browser run completed 42 assertions before a canvas timeout, and recorded WebGL shader/context errors; it is retained as `browser/results-initial.json` and is not a passing receipt. The host later reported only 185 MiB free physical memory. Recovery isolates independent mounted scenarios in fresh Chromium processes, closes each browser before launching the next, and verifies a live WebGL canvas before interactions. Multi-action sequences remain in the same page; console and page errors remain observable. Production code was unchanged during this QA recovery.

The isolated run completed all six station groups and 72 checks without WebGL/page errors, then failed while clipping the phone screenshot. `browser/results-crop-initial.json` preserves that failure. The crop used document coordinates with viewport-only bounds; enabling full-page bounds keeps the intended compact crop of the controls and undo row. The complete final browser rerun passed after this correction. Earlier receipts are diagnostic evidence and are not counted as additional passing checks.

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-design-undo-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_design_undo.test.js tests/machinelab_task_trials.test.js tests/machinelab_design_tradeoffs.test.js tests/machinelab_design_revisions.test.js tests/machinelab_design_decisions.test.js tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_read_aloud.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_design_undo_qa.cjs
```

Unrelated shared work and index entries are preserved. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.
