# Machine Lab: connected calculation practice

Each exercise in **Power & motion lab** now offers a button that opens its matching visual guide and brings the guide heading into view. **Back to calculation** returns focus to the answer field, keeping the draft, hints, checked state and saved records intact. **Go to calculation** provides the same shortcut from the long skill map.

| Exercise | Visual guide |
| --- | --- |
| Input/useful/lost power and movement rates | Power, motion and pace |
| Effort or load from power | Force, speed and power |
| Torque, RPM, turns, radians, angular speed, rotary work/power | Rotation |
| Time at power budget and four planning skills | Power budget |

The visual-reference notice makes clear that guides include worked values. Visiting them changes only local disclosure/focus/scroll state, with no hint, answer, score, or record update. Navigation validates the connected, open station DOM and its current session signature. It has no delayed focus callback. The DOM signature prevents an old callback from acting on a newly rendered task; it does not query application state before React has rendered that state.

Requested hints and answer feedback now have numbered relationship, substitution, and review headings. Formula/setup/result text, hint thresholds, answer checking and saved provenance remain unchanged. The existing single polite atomic feedback region is retained.

## Scope and validation

Only `stationPowerLab()` changed relative to `fbd5aa477`. Calculation, grading, record, and other-view helpers are byte-identical, as are the change/save callbacks and original result feedback text. Existing test files are unchanged.

Canonical/public SHA-256: `fb53d0759f9a101822a0475af19706991fa48a40c23c439d8f7773600944746c`.

Independent implementation review found no blockers in routing, DOM guards, focus, local-only changes, or feedback headings. Fixture review corrected three test-copy expectations before execution. Native browser evidence checks real keyboard focus, viewport placement, unchanged state, dark/narrow and forced-color layouts. Forced colors are emulated; no physical assistive technology session or deployed host build is exercised.

Native Chromium passed **396 checks across four scenarios**. All four screenshots were visually inspected by the browser reviewer and root. The initial browser wrapper refused an existing output directory before starting any native child; this preflight note is retained in `browser/run-01`. The successful browser evidence is in `browser/run-02`.

All **354 selected tests** passed across 11 files: 25 focused tests and 329 existing regression cases. The successful evidence set contains 23 native processes across attempts. Focused coverage includes every one of the 86 station-and-skill routes, actual DOM focus and guards, state preservation, and progressive feedback.

The first focused attempt exposed a test-fixture issue: a global timer spy counted JSDOM's internal disclosure/focus work. The corrected tests assert immediate synchronous focus directly. The failed attempt and its test snapshot are preserved under `new-tests/run-01`; production stayed unchanged.

The first regression wrapper stopped with `ENOSPC` after eight verified passing groups; its empty ninth receipt is not counted. Disk space became available without deleting files. The fresh `regressions/run-02` verifies and imports the first eight native receipts, then executes the remaining twelve groups. The original runner, partial files and interruption record remain in `regressions/run-01`. The final verifier binds imported evidence to its original manifest and runner snapshot.

Evidence: [source scope](source-scope.json), [focused tests](new-tests/run-02/final.json), [existing regressions](regressions/run-02/final.json), [browser](browser/final.json), and [validation summary](validation-summary.json).

## Reproduce

From the repository root, use fresh output directories:

```powershell
node reports/machinelab-practice-flow-2026-10-13/verify-scope.cjs
node reports/machinelab-practice-flow-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-practice-flow-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-practice-flow-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-practice-flow-2026-10-13/verify-evidence.cjs
```

Changes are local; no push or deployment is included.
