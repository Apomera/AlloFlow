# Machine Lab: clearer calculation practice

The main power and motion practice form now groups the active question and given values in a prominent task card. A native **Your calculation** fieldset keeps the answer and unit together, with a larger numeric entry. The fields sit side by side on desktop and stack on phones. Worked relationships and substitutions have separate equation cards, and the save/next footer is visually separated from checking and hints.

Check and enabled Save actions have contrasting fills. A scoped focus outline uses the surrounding text color, with system colors in forced-colors mode. Phone calculation and save actions span the available width. The unit remains a learner-selected part of the calculation.

Only `stationPowerLab()`'s `practice()` rendering/styles changed. Restoring that function from baseline `4eeb666c7` reproduces the entire prior source exactly. All 20 inline callbacks, the skill map and guide selection remain byte-identical. Existing mathematics, draft state, grading, hint visibility and saved-record provenance are preserved. Canonical/public source SHA-256: `25d51a5672a1cf55bbaed925203e136be895a5cf8cde7f9adbb9ca2f10115603`.

Validation uses existing tests for practice navigation, feedback, accessibility, localization, selected grading and record lifecycle, plus guarded skill-map navigation. Native browser checks cover every rotary and linear skill form using 25 windlass and 18 lever routes, representative answer states, hints, saving, next-skill navigation and guide return. Four screenshots cover a fresh and a checked desktop form, a dark phone rotation solution and a forced-colors phone unit conversion. No new unit tests were added for this presentation change.

All **110 targeted existing tests** and **511 browser checks** passed on the final source. Browser coverage is 43 representative skill forms, rather than every station/skill combination. The final browser child and wrapper both exited 0. The first browser attempt was interrupted with no final results or exit receipt and is excluded. It also exposed an incomplete element screenshot; the final harness fits the panel inside the capture viewport, then restores the viewport. This capture-only correction retains all original assertions and adds a full-panel bounds check. Source and unit-test results did not change.

Run from the repository root:

```powershell
node reports/machinelab-calculation-visual-2026-10-14/verify-scope.cjs
node reports/machinelab-calculation-visual-2026-10-14/run-tests.cjs <fresh-test-directory>
node reports/machinelab-calculation-visual-2026-10-14/browser/run-native.cjs <fresh-browser-directory> 25d51a5672a1cf55bbaed925203e136be895a5cf8cde7f9adbb9ca2f10115603
node reports/machinelab-calculation-visual-2026-10-14/verify-evidence.cjs
```

The native checks use local React/THREE and Chromium with software WebGL. Forced colors is emulated. This is targeted validation, not the entire repository suite or a deployed-host/physical-assistive-technology session. No push or deployment is included.
