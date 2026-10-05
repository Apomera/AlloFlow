# Bridge Lab paired interval evidence in every view

October 3, 2026. Changes remain uncommitted.

## Student workflow

Save an earthquake trial, open Energy between moments, and choose or enter the pinned and inspected times. The saved-trial comparison now shows A/B energy evidence over the same chronological bounds in labelled 2D, 3D, graphics fallback and print.

The seven rows compare stored energy at the start, net input work, damping loss, kinetic change, elastic change, stored change and stored energy at the end. Values use J/kg of modal mass, retain small signed values and are recalculated from the recorded histories. Backwards inspection preserves the same earlier/later ordering for both experiments.

A is explicitly the named selected notebook reference. B is the current experiment. Reference selection changes A; changing current inputs changes B. This attribution is independent of a scene pair that may use a guide or captured reference. The table has no scene-selected badge. Its guided question is labelled as deriving from B because a turning-to-crossing interval for B may not coincide with one for A. Local input labels retain small nonzero intensity and damping values.

The block identifies differing ground motion beside the evidence, so students can match inputs before attributing a difference to damping or response mode. Notes, exact times, static bridge design and selected scene remain in place. Ordinary notebook drafts and saved trials keep their existing current-experiment evidence. This live comparison does not add pair metadata to a saved trial.

## Printing and fallback

Printed reports contain the same named A/B columns, times and numeric evidence. A fresh report derives the table from saved reference inputs and current settings even before enabling the live model. Imported cached answers are ignored. Closing interval inspection removes the interval comparison while retaining the existing full-event comparison.

Graphics loss preserves the pair, exact times and scene selection. Recovery keeps the labelled 2D view until the student chooses a 3D view. The paired table uses 12 px text and wraps labels and scientific values within a phone layout. Numeric tables include column and row headers.

The illustrative single-mode physics model and energy accounting are unchanged. These readings do not estimate bridge damage or safety.

## Verification

- All 147 checks in the complete immersive interaction suite passed, including three new paired-interval workflows.
- Eleven real-WebGL workflows passed: new paired evidence at desktop and 320 px, graphics fallback with scene A selected, comparison focus/precision at both sizes, three notebook workflows and three guided-question workflows.
- Parsed source; identical canonical/public mirrors; 1,177 matching English fallback values in both registries.
- Desktop, phone and graphics-fallback captures inspected; browser overflow checks passed.
- Independent source review of reference attribution and disabled-model printing; scoped whitespace and unstaged checks completed.
- No staging or commits.

The preceding full run of all 302 checks across16 suites is recorded in ../bridgelab-comparison-clarity-2026-10-03. This pass reruns the complete interaction suite for the new UI and print behavior.

Run verification: node reports/bridgelab-paired-intervals-2026-10-03/verify.cjs

- [Desktop paired interval evidence](bridge-1000-2d-paired-interval.png)
- [Phone paired interval evidence](bridge-320-2d-paired-interval.png)
- [Graphics fallback paired interval evidence](bridge-844-fallback-paired-interval.png)
