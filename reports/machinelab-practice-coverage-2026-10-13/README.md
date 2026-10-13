# Machine Lab: practice coverage and next steps

The Power & motion lab skill map now shows saved practice at a glance. Each skill family has exact counts and a proportional strip for **Checked**, **Solution viewed**, and **No saved record**. Solid, hatched, and empty segments keep the distinctions visible without relying only on color. The text supplies the same information for assistive technology.

Two shortcuts help learners choose what to practise next:

- **Next unsaved skill** selects the next skill without a valid saved record.
- **Revisit a worked solution** starts a fresh attempt at a skill with a saved solution.

Both follow calculation order, wrap once, and skip the current skill. The buttons preview their target and become unavailable when there is no other eligible skill. Switching clears the current answer, unit, hints and result; the existing save-first guidance remains visible. Revisiting uses the current machine setup and assumptions while preserving saved history.

Counts include valid records from earlier setups, which remain labeled on their tiles. They describe practice history, not a score or mastery. Invalid records do not inflate coverage. Shortcuts read the latest records before selecting a target and reject delayed actions after the station, view, question or setup changes.

Only `stationPowerLab()` changed from `2689d67cf`. Calculations, grading, record validation, existing change/save callbacks and other views remain byte-identical. The inventory remains 18 linear skills and 25 rotary skills, totaling 122 station-and-skill combinations; record versions 1–5 remain supported. Canonical/public SHA-256: `ac16bdb6579bbe9eb8b60cbc0151e6d0fcf3da9a3062dc5da79b3b8f2d21c5d6`.

All **445 selected tests in 13 files across 31 native processes** passed: 48 new cases plus 397 existing regressions. Every native child and wrapper exited 0, with no failed test attempts. The new cases cover independent counts and fractions, all 122 station/skill routes, record versions 1–5, invalid and earlier records, explicit-save provenance, current-only/no-target behavior on all six stations, retained assumptions, latest-record recomputation and delayed callbacks. Existing test files are unchanged from the baseline.

Independent production, test and harness reviews found no blockers. The source-scope proof, source/public parity, JavaScript syntax and localization hygiene also pass (1,740 keys, zero issues).

Native Chromium passed **828 checks in four scenarios**, including real saved records spanning versions 1–5, mixed/invalid evidence, keyboard shortcuts, wraparound, complete/current-only/no-target states, latest-record recomputation, proportional geometry and unclipped layouts. All four screenshots were independently inspected by root and the browser reviewer: desktop windlass, desktop ramp, dark 320-pixel screw, and forced-colors 320-pixel windlass. There were no failed native browser attempts; both child and wrapper exited 0.

Evidence: [scope proof](source-scope.json), [focused tests](new-tests/run-01/final.json), [existing regressions](regressions/run-01/final.json), [native browser](browser/final.json), [validation summary](validation-summary.json).

The browser harness uses local native React/THREE and Chromium with software WebGL. Forced colors is emulated; this does not establish physical assistive-technology coverage. No deployed host build is exercised. Generated browser HTML is kept locally but excluded from the scoped commit; its creation-time source check is recorded in the native process manifest.

Run the following from the repository root. Native runners require fresh output directories; the final verifier checks the recorded candidate evidence.

```powershell
node reports/machinelab-practice-coverage-2026-10-13/verify-scope.cjs
node reports/machinelab-practice-coverage-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-practice-coverage-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-practice-coverage-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-practice-coverage-2026-10-13/verify-evidence.cjs
```

Changes are local; no push or deployment is included.
