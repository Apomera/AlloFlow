# Machine Lab: predict the change

The Power & motion lab now includes active proportional-reasoning practice on all six stations. Four challenges offer 24 station/challenge combinations:

- Change time and predict average input power: power changes by the reciprocal time factor.
- Change assumed efficiency and predict input power: power changes by the reciprocal efficiency factor.
- Change load and predict input power: power changes by the same load factor.
- Change time and predict input energy: energy stays the same for the fixed task and efficiency.

Learners choose half, unchanged or double using native radio controls. A correct prediction or explicitly viewed explanation reveals a worked calculation, numerical comparisons and solid/striped bars on a common scale. Missing and incorrect choices receive feedback without revealing the numerical result. Viewed explanations keep their provenance until the prediction is cleared or a new challenge is selected.

Each hypothetical change doubles the selected input when its upper bound allows it, otherwise halves it within its lower bound. Time uses normalized seconds, including minute inputs; efficiency stays within 1–100%; loads stay within each station's bounds. Hypothetical changes use cloned settings. The selected challenge and response live in a separate per-station prediction map, bound to the current task signature. They do not alter the physical setup, existing calculation drafts, hints or saved records. Checks read the latest choice and reject handlers from a different task, station, view or challenge. Unsupported restored challenge names clear checked/viewed state.

The implementation adds four helpers and one rendering call inside `stationPowerLab()`. Removing those additions reproduces commit `634806ffa` exactly. Existing math, grading, calculation inventory, record versions and save/change callbacks remain byte-identical. Canonical/public SHA-256: `ead716145aa5dda704b6f3fe3dd0e624b57456054af2a1036a6c0e69c38152b3`.

The focused tests cover independent arithmetic across all 24 routes, station boundaries, minute normalization, unchanged energy, latest-choice checking, stale handlers, malformed restored state, viewed-solution provenance and separate calculation/record state. Independent implementation, test and browser-harness reviews found no blockers. Source-scope proof and canonical/public parity pass.

The regression selection covers **218 existing cases** across six unchanged files: guided/saved power calculations, practice coverage/navigation, reverse calculations, grade levels, accessibility and localization hygiene. Combined with 28 focused cases, the selection contains **246 cases across seven files and 18 native groups**. Existing test files match the prior commit. This is a targeted regression selection, not the complete repository test suite.

Two earlier focused attempts are retained separately and excluded from pass counts. Run 01 rejected an outdated source pin before spawning any native tests. Run 02 caught a test fixture using a nonexistent view name; that fixture was corrected to the real `learn` view, with production unchanged. Focused run 03 and regression run 01 passed all 246 cases on the initial candidate.

Browser run 01 then found a real phone-layout issue: lengthy challenge menu labels clipped their power/energy ending. All four labels were shortened while preserving the distinction between input power and input energy. `label-correction.json` records the exact old/new hashes; reversing only those four label edits reproduces the initial tested candidate. The failed browser attempt and screenshots are retained. Its 555 checks found only the two narrow-layout failures. Overflow checks remain unchanged.

Final-source **focused run 04 and regression run 03 pass all 246 selected cases**, with native and wrapper exits observed as zero. During regression run 02, group 11 printed eight passing assertions but exited 1 when disk space ran out while writing its JSON report. The empty receipt is retained and excluded from passing evidence. Ten completed groups (191 cases) were hash-verified and reused; the remaining three groups (27 cases) passed in fresh processes. The evidence verifier binds every reused receipt to its original source, test, runner, log and native exit.

Final browser run 02 passes **555 checks across all 24 prediction routes and four visual scenarios**, with native and wrapper exits observed as zero. Root and the browser reviewer independently inspected all four final screenshots: desktop time, desktop efficiency, dark phone energy and forced-colors phone load. The complete challenge labels fit, comparison bars share a scale, and mobile cards stack without clipping. The browser harness and its overflow assertions are byte-identical across both attempts.

Disk recovery removed only untracked generated Machine Lab browser HTML. The first cleanup verified 20 pages against native-page receipt hashes and removed 50,091,226 bytes; `generated-page-cleanup.json` preserves that inventory. A later full-disk event interrupted the README write; it was restored from the captured content. The final run-02 HTML was removed after checking its recorded SHA, and 11 older generated pages (26,186,926 bytes) were removed after checking absolute report paths, Git-untracked status and the QA harness's exact generated HTML header. Their hashes are in `generated-page-cleanup-followup.json`. All tracked pages, source, screenshots, logs and test receipts remain intact. Generated HTML can be recreated with the harnesses.

Run from the repository root. Runners require a fresh output directory:

```powershell
node reports/machinelab-prediction-2026-10-13/verify-scope.cjs
node reports/machinelab-prediction-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-prediction-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-prediction-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-prediction-2026-10-13/verify-evidence.cjs
```

Changes are local; no push or deployment is included. Browser checks use local React/THREE and Chromium software WebGL. Forced colors is emulated; no deployed build or physical assistive technology is exercised.
