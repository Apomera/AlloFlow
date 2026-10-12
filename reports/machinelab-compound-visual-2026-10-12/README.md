# Machine Lab: visual compound calculations — October 12, 2026

The Compound machine lab now has a clearer visual path from machine setup to calculation and practice. This pass changes presentation within the existing grades 6–12 lab.

- A connected stage diagram reuses the workshop's machine illustrations, showing the input stage, output stage, assumed efficiencies and final task. A ramp output explicitly shows vertical rise.
- A proportional input-energy bar separates useful output from both stage losses. Solid, striped and dotted fills match a numeric legend showing joules and percentages of the same input total. Zero losses remain labeled; tiny shares retain numeric values even when too narrow to see.
- Related setup fields share a responsive grid. Planning metrics use larger numbers in a balanced two-column layout, becoming one column on narrow phones.
- Power and budget sections have distinct surfaces. Budget-fit explanations use bordered callouts, with their full text preserved.
- The practice area has a stronger boundary, highlighted task givens, a primary Check button and boxed hint/answer feedback. Color supplements the existing written feedback.

No animation, persisted state, grading tolerance, formula, record version or export changes were introduced. All eighteen skills remain available. New figures are derived from the current valid model; invalid geometry cannot produce a misleading diagram or energy split. Decorative SVGs and bars are hidden from assistive technology; semantic stage order and numeric legend remain available as text.

## Verification

Final canonical/public source SHA-256: `faee373d6d9895fef3430b99cdf55ade04ded465ce0c400d288b9e9fa3b6b7ca`.

**822 existing tests passed across nine files in 28 observed successful native processes:** 538 compound cases in 15 groups, plus 284 selected work-record, read-aloud, localization, grade-band, accessibility and view cases in 13 groups. Every stable assertion inventory position executes exactly once; no existing test assertions or timeouts were changed.

The final native browser run passed **78 checks across four scenarios**, with observed exit 0 and six inspected screenshots. Layout checks cover 1150, 441, 390 and 320 CSS pixels. Actual browser zoom and physical assistive technology were not exercised. See `browser/visual-review.json` for per-image findings.

Review corrected one production styling issue before final validation: the forced-colors rule now changes only background color, preserving the legend's striped/dotted pattern images. Retained browser diagnostics include a startup harness error (two identical copies, not two independent native runs) and a connector-overflow false positive. The corrected check measures content and outer boundaries while permitting arrows inside the reserved connector gaps; final screenshots match the inspected prior pixels. These diagnostics are excluded from successful coverage.

The first focused test runner ended after 14 observed successful child processes, without a final-group result or terminal diagnostic. With no Node processes left, verified resume reused the completed hash-bound receipts and ran the remaining group. The interruption snapshot is retained in `test-interruption/`; an unobserved result is never counted as a pass.

The regression output session also closed, but its final native child completed with recorded exit 0. All 13 complete process records and the final receipt/log were verified and restored after a temporary diagnostic relocation caused a resume-path error. No native regression rerun was needed. `test-interruption/regression-interruption.json` records this tooling recovery separately from test results.

Final results and source hashes are recorded in `validation-summary.json`. `source-scope.json` verifies that replacing only `stationCompoundLab` with the preceding committed implementation reproduces the entire prior source byte for byte, and that its change/save callbacks remain identical. Existing math, models, record validation/export and all other views are outside the changed region.

Native browser verification uses real React/THREE and local Chromium with software WebGL. It checks layout, keyboard use, energy shares, zero losses, invalid inputs, saved state and solution provenance. Screenshots are inspected in desktop, phone, dark and forced-color layouts. Selected existing unit regressions cover all compound practice, accessibility, grade bands, localization, work records, read-aloud and view cases. This is scoped verification, not a full application build or repository test run.

Use fresh output directories to reproduce checks without replacing the retained receipts:

```powershell
node reports/machinelab-compound-visual-2026-10-12/run-focused-tests.cjs reports/machinelab-compound-visual-2026-10-12/focused-rerun
node reports/machinelab-compound-visual-2026-10-12/run-regressions.cjs reports/machinelab-compound-visual-2026-10-12/regression-rerun
node dev-tools/ml_compound_visual_qa.cjs reports/machinelab-compound-visual-2026-10-12/browser-rerun
```

Test runners retain observed native exits, source/test/receipt/log hashes and exactly-once assertion inventories. Their `--resume` option reuses only verified complete runs. Generated HTML, browser profiles, duplicate download directories and test temporary files are excluded from committed evidence. No physical assistive-device session, performance benchmark, push or deployment is claimed.
