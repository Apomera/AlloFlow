# Machine Lab: check by working backwards

Every existing Power & motion practice route now includes an inverse calculation to help learners check their reasoning. After a correct answer or a viewed solution, open **Check by working backwards** to reconstruct a quantity from the current setup. This covers 25 calculation types across 122 station-and-skill combinations.

For example, an input-power answer is multiplied by time and efficiency to reconstruct useful work. A calculated force is multiplied by its matching movement rate to recover power. A unit conversion is reversed using 1000, 60 or 100. Rotary checks recover movement, turns, RPM, angle or angular speed, with fractional turns retained. Ramp movement checks explicitly use vertical rise.

The panel labels whether it uses the learner's checked answer or the worked solution. It shows the reverse relationship and substitution, reconstructed and reference values, an absolute difference, and proportional solid/striped bars. Rounded accepted answers drive the reconstructed values; the reference comes from the full-precision setup. A reference may be a derived quantity, such as lost energy or useful budget energy.

The comparison is descriptive: the existing answer feedback determines acceptance. Zero values have empty bars. Required efficiency above 100% stays visible and is never clamped. A viewed solution uses the worked value even if the typed draft is blank or invalid. The disclosure starts closed, is outside the live feedback region, and does not change answers, hints, records or settings.

Only a read-only `backCheck()` function and its render call were added inside `stationPowerLab()`, relative to `5793cbfb8`. Removing those additions reproduces the exact prior source. Existing calculations, question inventory, grading, records, save/change callbacks and other views remain byte-identical. Canonical/public SHA-256: `de186324605236e2b2761b2f67b3aab757a99615254777bd76d1938a357eb559`.

All **44 focused tests** passed in four serial native processes. They cover all 122 inverse routes with exact and accepted rounded answers, conversion factors, minute normalization, nondefault rotary geometry, ramp rise, required efficiency above 100%, checked/solution provenance, version 1–5 records, disclosure semantics, hidden/invalid states and zero/tiny values. Source and public mirror stayed at the reviewed SHA throughout.

Two earlier focused attempts are retained and excluded from the final pass count. Run 01 caught a test fixture supplying exponent text (`1e-11`), which the existing input parser intentionally rejects; the fixture was corrected to decimal text without changing the numeric expectation or production code. Run 02 ended with a nonzero native exit and incomplete assertions despite a JSON success flag. The runner rejected it; fuller diagnostics were enabled and run 03 completed all 44 cases, with every child and wrapper exit observed as zero.

All **445 selected existing regression tests** also pass, for **489 passing cases across 14 files**. The final receipts cover 35 successful native test groups: four focused groups and 31 existing regression groups. Existing test files are unchanged from the prior commit.

Regression recovery preserved two infrastructure failures. Run 01 reached a native memory-allocation failure at group 17 after 16 successful groups; the wrapper session was unavailable when polled, so its exit is explicitly unobserved. Run 02 reused those 16 verified passes, completed 13 more groups, then failed to start the group 30 worker because a `parse5` module could not resolve. That attempt ran no tests and exited 1. The file was present and the dependency loaded in a subsequent probe; no dependency or application changes were made. Run 03 verified and reused those 29 complete results, then passed the final two groups with an observed wrapper exit of zero. The evidence verifier follows every reused result back to its original process and checks source, test, receipt and log hashes.

Final Chromium run 03 passed **2,229 checks across all 122 routes**, four scenarios and four screenshots, with native and wrapper exits observed as zero. Desktop lever and screw, dark 320px ramp, and forced-colors 320px windlass cover rounded answers, unit conversions, ramp rise, efficiency above 100%, keyboard disclosure controls and zero-length bars. Root and the browser reviewer independently inspected all four final images. The final verifier binds source, tests, process exits, assertions, screenshots and both visual reviews.

Independent implementation, fixture and browser-harness reviews found no remaining blockers. Source-scope proof, JavaScript syntax, source/public parity and localization hygiene pass (1,795 keys, zero issues). Browser checks use local React/THREE and Chromium software WebGL; forced colors is emulated. A deployed build and physical assistive technology were not exercised.

The first browser attempt was interrupted after three screenshots. Its tool session became unavailable and no final results or process receipt was produced; both native and wrapper exits are recorded as unknown. Those artifacts are preserved and excluded from final success evidence. Before a fresh retry, no Node/Chromium processes remained and the prior log could be opened exclusively. The retry adds a four-minute native timeout and progress checkpoints; production code is unchanged.

Browser run 02 completed all four scenarios but correctly failed its receipt on one overly strict CSS percentage assertion. Chromium serialized the expected `99.99705074463785%` bar width as `99.9971%`, a difference of `0.000049255` percentage points. The harness display-width allowance was changed from `0.00001` to `0.0001` percentage points. Independent calculation and metric assertions were unchanged. Both observed exits were 1, and the failed attempt is retained separately.

Run from the repository root; native runners require fresh output directories. The final verifier checks recorded evidence for this candidate.

```powershell
node reports/machinelab-backcheck-2026-10-13/verify-scope.cjs
node reports/machinelab-backcheck-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-backcheck-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-backcheck-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-backcheck-2026-10-13/verify-evidence.cjs
```

Changes are local; no push or deployment is included.
