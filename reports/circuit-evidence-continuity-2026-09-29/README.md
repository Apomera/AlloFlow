# CircuitTool: keeping evidence while exploring

This pass improves the Simple investigation notebook and the Active transistor lessons. Students can revisit their predictions and revise explanations while continuing to change the circuit.

## Changes

- Active lessons keep a separate prediction, tested result, and explanation for each of the three experiments. Switching lessons, editing the circuit, and using Undo preserve those records.
- Tested lessons show the original prediction, before/after lamp currents on one scale, the operating regions, and an explanation field. A message distinguishes the saved experiment from a changed live bench. Baseline and result replay remain undoable.
- Simple saved trial explanations can be revised in either evidence editor and are included in the evidence download. Original measurements and predictions stay intact.
- Electrically equivalent designs deduplicate even when an import changes component IDs. Individual trial actions use entry identity so older notebooks with duplicate comparisons retain their separate notes.
- Recording at capacity preserves all eight saved trials. Up to eight removed trials remain available for recovery; restoring or explicitly discarding one keeps the other entries. Removal and recovery return keyboard focus to the notebook summary.
- Guided Simple presets preserve the investigation baseline and draft explanation through Undo. Investigation summaries and the download action have larger touch targets.

## Investigation files

The current reader accepts older Active v1 investigation files. New exports include the optional top-level `lessonRecords` collection. Each record stores the original choice, tested state, and explanation; modeled readings are recomputed from the fixed lesson settings. Unknown fields, invalid choices, inconsistent progress, and oversized explanations are rejected.

Legacy `activity` remains a compatibility mirror when the selected experiment matches the live circuit. Saved experiment records can also exist independently of the current bench. Older tool builds may reject the added collection when opening new exports.

Active HTML reports include every saved experiment and escape explanation text. Import previews are consumed once, so repeated Load actions preserve recovery of the original notebook. A newer file read or dismissal invalidates an older preview's handlers.

Simple evidence downloads contain the active saved trials. Removed trials remain in the tool's recovery queue until restored or explicitly discarded.

## Validation

The final build passed 229 tests across 16 files, 12 browser accessibility/layout scans, 46 visible-focus checks, and five notebook recovery focus checks. All 12 captures passed with no reported visual issues or browser errors. Both source copies match.

`validation.json` records the final totals and source hash. The regression receipt hashes both source copies and every test file, and rejects changes during the run. The browser audit checks the exact source at the start and end.

Coverage includes saved evidence after electrical edits, per-lesson explanations, replay and Undo, import/export, stale event handlers, legacy duplicate entries, capacity and recovery, keyboard focus, accessibility scans, reduced motion, unique control IDs, touch target sizes, card padding, and page overflow. Browser captures cover desktop, 390 px and 320 px widths, plus 200% text at 320 px.

The browser harness renders CircuitTool with React and the app's generated styles. These checks cover local component behavior and layout. The electrical calculations remain the existing illustrative DC models.

### Reproduce

From the repository root:

```powershell
node reports/circuit-evidence-continuity-2026-09-29/run-regression.cjs
node reports/circuit-evidence-continuity-2026-09-29/evidence-check.cjs
node reports/circuit-evidence-continuity-2026-09-29/validate.cjs
```

The commands require the repository's installed Vitest, Playwright, Chromium, React, and axe-core dependencies.

### Artifacts

- [Active saved result on a phone](active-edited-result-390.png)
- [Simple notebook with 200% text](simple-notebook-200pct-text-320.png)
- [Removed trial recovery with 200% text](simple-recovery-200pct-text-320.png)
- `regression.json` and `regression-receipt.json`: test results and tested file hashes.
- `evidence-results.json`: browser workflow assertions, layout measurements, accessibility results, focus checks, and screenshot inventory.
- `validation.json`: final validation and artifact hashes.
- The PNG captures show the saved Simple notebook, removed trial recovery, Active prediction, and saved Active results after a live bench edit.
