# Machine Lab: unit conversion workshop

Power & motion lab now includes six conversion skills on every station, adding 36 station-and-skill combinations. There are 18 skills on each linear station and 25 on each rotary station, for 122 combinations in total.

| Current station quantity | Forward practice | Reverse practice |
| --- | --- | --- |
| Average input power | W → kW: divide by 1000 | kW → W: multiply by 1000 |
| Task time | s → min: divide by 60 | min → s: multiply by 60 |
| Average hand-path speed | m/s → cm/s: multiply by 100 | cm/s → m/s: divide by 100 |

The new visual guide shows three pairs of equivalent values, the unit identities, and both conversion factors. It explains that the quantity stays unchanged and that a speed conversion here changes only the distance unit. Native disclosures, semantic definition lists, wrapping value cards, and the existing return-to-calculation control support keyboard and narrow-screen use.

The skill map has a **Convert units** family. Each conversion exercise opens the matching guide and uses the existing hint, substitution, check, worked-solution, save and export flow. Setups show conversion fractions that cancel the original unit. Wrong-unit feedback names the requested output unit; wrong answers get the selected relationship. Guide navigation preserves the exact draft and saved evidence.

## Calculation and record boundaries

The six conversions use the live model's unrounded input power, task seconds and hand-path speed. Displayed givens retain six significant digits. Conversion checks accept a relative error of 1%; three-significant-figure answers remain supported. Existing skills keep their original tolerance and numeric checks.

Only conversion skills use version 5 records and admit `kW`, `min`, and `cm/s`. Earlier versions 1–4 retain their unit validation. Fixed settings, typed answer formatting, hints and checked/solution provenance remain in records and downloaded text. Viewing a solution remains identified as practice, not an independent score.

Only the power helper/panel region changed relative to `2276030a7`. The physical model, other views, existing question branches, old numeric-tolerance branch, change/save callbacks and record-text generator remain byte-identical. Canonical/public source SHA-256: `8f592e9c99b2c33b9886c778dbd2e915591dc58e693be8ae83050a925567d3ab`.

Six existing test files received narrow inventory, route, count and next-skill expectation updates. The rotation inventory case title was corrected to eighteen skills. No earlier arithmetic or state assertions were weakened. Independent production and fixture review found no blockers.

## Validation

All 43 focused cases passed across four observed native processes with no failed native attempts. They cover independent station geometry, all 36 new combinations, inverse-factor errors, legal boundary values, rounding, invalid numbers/units, grade visibility, navigation, guarded callbacks, record versions, saved settings and provenance.

All 354 selected existing regression cases also passed. Combined: **397 cases in 12 files across 27 successful native processes**, with every child and wrapper exit observed. Six old test inventories were updated for the intended additions; unselected historical cases are not counted.

Native Chromium passed **931 checks across eight scenarios**, including all 36 new station-and-skill combinations and an actual text-record download. All four screenshots were inspected independently by the browser reviewer and root: desktop guide, desktop calculation, dark 320-pixel phone, and forced colors. Source and public mirror stayed at the reviewed SHA throughout. There were no failed native test or browser attempts.

Evidence: [scope proof](source-scope.json), [focused tests](new-tests/run-01/final.json), [existing regressions](regressions/run-01/final.json), [native browser](browser/final.json), [validation summary](validation-summary.json).

The browser harness uses local native React/THREE and Chromium with software WebGL. Forced colors is emulated; it does not establish physical assistive-technology coverage. No deployed host build is exercised.

## Reproduce

Run from the repository root. Test and browser runners require fresh output directories. The final verifier checks the evidence paths recorded for this candidate.

```powershell
node reports/machinelab-unit-conversion-2026-10-13/verify-scope.cjs
node reports/machinelab-unit-conversion-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-unit-conversion-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-unit-conversion-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-unit-conversion-2026-10-13/verify-evidence.cjs
```

Changes are local; no push or deployment is included.
