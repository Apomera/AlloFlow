# Machine Lab: power-budget utilization practice

The **Plan a task at this power** panel now includes a two-step activity across all six machines: calculate the required share of the mechanical input-power budget, then classify the task as below, at, or over budget.

Required share is `required input power ÷ input-power budget × 100`. The percentage uses full-precision values, accepts positive decimal input with an optional plus sign, and allows an absolute error of 0.1 percentage points. Classification uses the given powers and the existing power-fit comparison's relative numerical tolerance of 1e-9. Results above 100% remain above 100%; they are not clamped.

The activity has two labeled given-value cards, numbered calculation and interpretation steps, a large fixed-percent input, selected radio borders, and a clear primary check action. The worked comparison shows a large percentage, substituted formula, labeled 100% reference and solid/striped bars on one common scale. Narrow layouts stack the controls; forced colors retain patterns and outlines.

Worked results appear after both answers are correct or after a deliberate explanation reveal. Editing an exposed answer preserves the viewed-comparison label. Clear practice removes answers and provenance. Practice state is kept separately for each bench and tied to its current setup signature. Stale callbacks cannot write after switching the bench, view, or calculation setup. No saved calculation record or XP award is added by this activity.

The implementation adds only six local budget-practice helpers and one render call. Removing those additions exactly reproduces baseline `158683f06`; the physical model, prediction practice, ordinary calculation practice and records are unchanged. Canonical/public SHA-256: `f85b92da74d871b1847fc02c63a8c72c146534dc65176be7805c0122030c4bb2`.

Near a tie, the activity preserves precise powers and percentages whenever rounding would make unequal powers look equal or disguise a below/over result as 100%. This keeps the interpretation answer derivable from the displayed givens.

Earlier test attempts are preserved and excluded: run-01 failed its source pin after the React badge key fix; run-02 was deliberately interrupted before the precision display refinement. Neither partial attempt had a test assertion failure.

On the final source, run-03 passed 112 cases before its runner detected a selector that matched zero existing planning tests because Vitest included quotes in the parameterized test names. The continuation uses the same source and tests, validates and retains those 112 successful cases, and runs only the remaining 85 cases with corrected selection. The empty selection is excluded from final coverage.

Final unit coverage is 197 cases (25 new, 172 unchanged) across five files and 25 validated native groups. The continuation wrapper exited zero; all selected native groups exited zero and every case ran exactly once in the combined coverage.

Browser run-01 found four harness assumptions about CSS percentage serialization. Chromium rounds assigned style lengths; comparing serialized lengths to full-precision arithmetic at 1e-6 was too strict. The corrected harness independently computes expected lengths and passes them through a detached element's CSS serialization before exact comparison. Full-precision data, visible values, equations, classifications, focus and layout checks are unchanged. The failed run, original harness and exact four edits are preserved; production source remained fixed.

Final browser run-02 passed all 594 checks across 18 station/classification routes, three precision edge cases and four visual scenarios. Native and wrapper exit codes were observed as zero. All 20 keyboard-focus observations passed. Root and the browser reviewer directly inspected all four final captures at original resolution. The evidence verifier binds these results to the exact source, tests, harness, logs, receipts and images.

From the repository root, verify the saved evidence with `node reports/machinelab-budget-utilization-2026-10-14/verify-evidence.cjs`. The test runner preserves the validated first 112 cases from run-03 and runs the remaining 85 in a fresh sibling output directory; it is a continuation runner. Browser runs require a fresh output directory and the pinned source SHA as arguments to `browser/run-native.cjs`.

The browser checks use local React/THREE and Chromium with software WebGL. Forced colors is emulated; no deployed host or physical assistive-technology session is exercised. No push or deployment is included.
