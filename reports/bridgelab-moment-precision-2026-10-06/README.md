# Bridge Lab: precise readings at key moments

Key moments now show motion, acceleration and stored energy with the same precision as the native motion and energy panels. Students can compare a selected milestone with the panel readings without switching between decimal values and “less than” bounds.

## What changed

- Nonzero readings below 0.001 use scientific notation. For example, `2.5e-6` means `0.0000025`.
- The scientific notation explanation appears beside these small readings. Ordinary values use three decimal places, and exact zero remains `0.000` without that explanation.
- Each reading retains its quantity and unit: relative motion in cm, absolute acceleration in g, or stored energy in J/kg.
- Milestones still select the exact recorded model times. Saved A and B keep their own peaks while using the shared replay clock.
- The existing paused state, reduced motion behavior, keyboard descriptions and student notes remain part of the interaction.

This is a display change. The physics model and milestone selection are unchanged.

## Validation

| Check | Result |
| --- | --- |
| Source mirrors and JavaScript syntax | Passed |
| English fallbacks | All 1,355 literals match each registry independently |
| Physics model | Unchanged from the source used for the previously passed 144 configurations |
| Focused unit run | Fork worker startup timed out before test cases ran |
| Focused browser checks | Eight passed; one worker; no retries |
| Fresh capture review | Six desktop and phone captures reviewed; readings and explanations are readable and unclipped |
| Scoped Git diff check | Passed; no staged changes |

[Source verification](source-verification.json) records the source hashes and checks. Reversing the three documented display edits and the prior rounding sentence reproduces the source hash used for the earlier 144 configuration sweep. No fresh 144 configuration sweep was run for this change. The earlier results are in the [model invariant report](../bridgelab-frame-energy-2026-10-06/model-invariants-before-rounding.json).

The focused Vitest run exited with a fork worker startup timeout. It produced no test case passes; neither a focused nor full unit pass count is claimed. The updated unit cases remain available for a future run.

The browser run passed all eight checks in 17.7 minutes: three existing frame energy cases, three existing key moment cases, and two new precision cases at desktop and phone widths. The new cases check tiny and ordinary readings, true zero, saved A/B peaks, the exact frame boundary, accessible descriptions and replay behavior against an independent numeric oracle. Source and test hashes were unchanged throughout the run.

[Browser run metadata](preview-run.json) records the run settings and input hashes. [Browser results](preview-results.json) contains the individual results. The final artifact audit is in [verification.json](verification.json).

## Reviewed views

All six native insight crops were inspected at desktop and phone widths. Tiny motion reads `1.53e-4 cm` at 10 s, and stored energy reads `1.18e-14 J/kg` at 24 s, with the scientific notation explanation visible. Ordinary acceleration reads `0.311 g` at its recorded peak with that explanation absent. The values and accompanying text are readable and unclipped at both widths.

- [Desktop: tiny motion](moment-precision-1000-tiny-motion.png)
- [Desktop: tiny stored energy at the end](moment-precision-1000-tiny-end.png)
- [Desktop: ordinary acceleration](moment-precision-1000-normal-acceleration.png)
- [Phone: tiny motion](moment-precision-320-tiny-motion.png)
- [Phone: tiny stored energy at the end](moment-precision-320-tiny-end.png)
- [Phone: ordinary acceleration](moment-precision-320-normal-acceleration.png)

Changes are uncommitted.
