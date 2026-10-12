# Machine Lab: rotation visuals and practice

The windlass and screw now connect one handle turn to load movement, angular travel, work, and power. Open **Power & motion lab → Follow a turn: motion, work and power**.

The guide includes a static quarter-turn diagram, solid/striped distance bars on one shared scale, eight labeled quantities, and worked travel, work, and power equations. Small bars retain their true proportions and have numeric equivalents. The layout stacks on phones and preserves patterns in forced colors.

Five guided skills are added to each rotary station:

| Skill | Calculation | Answer unit |
| --- | --- | --- |
| Handle turns | Load movement ÷ advance per turn | turns |
| Angular travel | Turns × 2π | rad |
| Angular speed | RPM × 2π ÷ 60 | rad/s |
| Input work from torque | Applied torque × angular travel | J |
| Input power from torque | Applied torque × angular speed | W |

Fractional turns are retained. The screw assumes a single-start thread; windlass drum and handle turn together without slip. Torque already includes the selected efficiency, so the work and power equations do not apply efficiency again. Full precision is used internally; displayed values use six significant digits.

Rotary stations now offer 17 power skills each; the other four stations retain ten each, for 74 station/skill combinations. Practice supports two hints, unit-specific feedback, Enter to check, Next skill, and fixed version-3 records. Records retain original settings and checked/solution/hint provenance. Existing version-1 and version-2 calculations remain available and retain their versions. New unit choices are also valid distractors for older skills.

Only the power helper/panel region changed relative to `81cd7c9fc`. Physical helpers, other views, original calculation branches, grading, change/save callbacks, and text-record formatting remain byte-identical. Two existing tests have one inventory expectation updated each. Canonical/public source SHA-256: `727615aa085a7170b435773189f605414f79e6b866983c2489a610be29c6cdd7`.

## Validation

All **443 tests across eight files** passed in 19 serial native processes: 67 new checks and 376 existing regressions. All final test processes and wrappers exited successfully. Native Chromium passed **295 checks across five scenarios**, including four screenshots independently inspected by two reviewers and an actual record download. No browser retries were needed.

Final results are recorded in [validation-summary.json](validation-summary.json), [source-scope.json](source-scope.json), focused [test evidence](new-tests/run-02/final.json), [existing regressions](regressions/run-01/final.json), and [browser evidence](browser/final.json).

Previews: [desktop windlass](browser/run-01/desktop-windlass-rotation.png), [dark phone screw](browser/run-01/dark-phone-screw-rotation.png), [phone practice](browser/run-01/dark-phone-rotation-practice.png), and [forced colors](browser/run-01/forced-colors-windlass-rotation.png).

Focused checks cover independent rotary equations, fractional turns, input boundaries, unit errors, hints, stale-state guards, and record integrity. Existing regressions cover power calculations/planning, work records, read-aloud, grade bands, accessibility, and translation hygiene.

The first focused-test attempt stopped during native runtime startup with an Oilpan memory failure before any assertions completed. Its log, receipt, and incomplete process manifest remain in `new-tests/run-01`; they are excluded from final totals. The final attempt uses a fresh directory.

Browser validation uses local React/THREE and Chromium software WebGL. It covers both rotary stations, all ten new skill combinations, saved records and an actual text download, keyboard focus, responsive layouts, and forced colors. It does not exercise a deployed host build or physical assistive technology.

## Reproduce

Run from the repository root, using fresh output directories:

```powershell
node reports/machinelab-rotation-skills-2026-10-12/verify-scope.cjs
node reports/machinelab-rotation-skills-2026-10-12/run-new-tests.cjs <fresh-test-directory>
node reports/machinelab-rotation-skills-2026-10-12/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-rotation-skills-2026-10-12/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-rotation-skills-2026-10-12/verify-evidence.cjs
```

Changes are local; no push or deployment is included.
