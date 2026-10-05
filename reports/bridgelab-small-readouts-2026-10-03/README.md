# Bridge Lab small saved energy and power readings

October 3, 2026. Changes remain uncommitted.

Saved notebook and printed trial summaries now retain nonzero instantaneous energy and power readings below 0.001 using scientific notation with three significant figures. Negative readings retain their sign. True zero, including negative zero, prints as 0.000. Larger readings keep the existing three decimal places.

A short explanation appears only when these summary readings use scientific notation. It explains the exponent and distinguishes negative input power (ground interaction removes modal energy) from negative stored-energy power (stored energy decreases). Damping power remains a positive loss rate.

This resolves late-stage readings that previously appeared to be zero even while the detailed interval table showed remaining energy. Values are recalculated from saved inputs and time; imported cached answers are ignored. The underlying single-mode model and force displays are unchanged. Modal energy and power readings do not estimate bridge damage or safety.

## Verification

- 11 focused unit checks passed in two suites; 178 unrelated assertions were skipped.
- Seven browser workflows passed: new saved small-value reports at desktop and 320 px, both current-draft reports, both notebook save/restore/print workflows and graphics-loss recovery.
- Parsed source, matching canonical/public mirrors, 1,167 matching English fallback values in both registries.
- Desktop and phone saved reports inspected for readable scientific values and explanatory text; browser overflow checks passed.
- Whitespace and staged-file checks completed; no staging or commits.

Run verification: node reports/bridgelab-small-readouts-2026-10-03/verify.cjs

- [Desktop small saved readings](bridge-1000-small-saved-readouts.png)
- [Phone small saved readings](bridge-320-small-saved-readouts.png)
