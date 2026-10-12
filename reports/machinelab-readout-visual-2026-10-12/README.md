# Machine Lab: live geometry readout

The station readout now connects the current machine geometry to mechanical advantage, effort, and movement. A prominent result, labeled metric cards, and solid/striped length bars make the relationship easier to inspect.

- Lever, wheel and axle, ramp, and wedge show their current length ratio on a shared scale.
- Screw shows the handle path in one full turn (`2π × handle radius`) divided by thread pitch. The handle path is distinct from total hand travel for the task.
- Pulley shows numbered supporting-strand markers and the resulting count. The markers represent a count, not a rope-routing diagram.
- Kindergarten–grade 2 retains the simpler MA/feeling readout. Grades 3–5 add force and geometry; older bands also show movement.
- Very small values stay nonzero. Ratios just above or below one retain enough precision to agree with the trade-off description. Invalid geometry hides the calculation and marks unavailable results with a dash.
- Native definition lists provide text equivalents. Narrow layouts stack the metric cards; forced colors preserve the solid/striped distinction. No animation or new live announcements were added.

Only `readout()` changed in the canonical and public copies. Simulation math, station controls, practice grading, state, saved work, exports, and other views are byte-identical outside that function, relative to `1e708cb5c`.

Source SHA-256: `d9a463bab0000a52be4d585de4ecf45ae6ed894dd5b4fbff49027f2b39fc6735`.

## Validation

All **73 existing tests** passed in three fresh serial native processes: grade bands (37), accessibility (28), and translation hygiene (8). Every assertion executed once; every process and the runner exited successfully. Existing test files are unchanged.

Native evidence: [regression-final.json](native/run-01/regression-final.json). Scope proof: [source-scope.json](source-scope.json).

The final native Chromium pass completed **413 checks across 13 scenarios**, with six screenshots inspected independently by two reviewers. It covers all six stations, live keyboard changes, all four grade bands, mobile/dark/forced-color layouts, tiny screw effort, MA below/equal/above one, near-unity precision, invalid ramp geometry, exact metric values, shared-scale bars, and preservation of existing saved records. The final native process and wrapper both exited 0. See [browser/final.json](browser/final.json) and [validation-summary.json](validation-summary.json).

Previews: [desktop lever](browser/run-03/desktop-lever-readout.png), [six-strand pulley](browser/run-03/desktop-pulley-readout.png), [dark phone screw](browser/run-03/dark-phone-screw-readout.png), [forced colors](browser/run-03/forced-colors-readout.png), [younger learners](browser/run-03/phone-younger-readout.png), [grades 3–5](browser/run-03/tablet-grade35-readout.png).

Browser run 01 retains a harness bootstrap error before any checks. Run 02 retains two overly strict CSSOM percentage-serialization assertions. Run 03 uses a 0.0001 percentage-point serialization tolerance plus a direct rendered-width check within 0.1 px. Production source remained unchanged throughout; all six final screenshots are byte-identical to the inspected run-02 images. The earlier attempts are excluded from final pass counts.

## Reproduce

From the repository root:

```powershell
node reports/machinelab-readout-visual-2026-10-12/verify-scope.cjs
node reports/machinelab-readout-visual-2026-10-12/run-regressions.cjs <fresh-output-directory>
node reports/machinelab-readout-visual-2026-10-12/browser/run-native.cjs <fresh-browser-output-directory>
node reports/machinelab-readout-visual-2026-10-12/verify-evidence.cjs
```

Runners require the frozen source and preserve existing evidence. Browser checks use local React/THREE and software WebGL; forced colors are emulated. No physical assistive-technology session or deployed host build was tested. Changes are local; no deployment is included.
