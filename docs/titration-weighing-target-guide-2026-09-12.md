# Weighing target guide - September 12, 2026

The weighing activity's target card now shows an exact distance from the target and a keyboard-operable **Enlarge target band** control. It replaces the previous bar whose maximum changed as sample mass increased.

## Reading the guide

The default view uses a fixed **0.0000-2.0000 g** sample range. The close-up uses **0.4900-0.5100 g**, making the **0.4980-0.5020 g** activity band easier to distinguish. Both scales include the same **0.5000 g** target. The selected range is included in the accessible figure caption and appears beside the visual axis.

A shaded, hatched band represents the activity band, a line marks the target, and an outlined circle marks the sample when it is inside the displayed range. The band retains its true proportional width in both views. The close-up does not exaggerate or change the underlying mass values.

If the mass is outside the close-up, an outlined arrow appears at the corresponding edge and a written message explains that the sample is outside the displayed range. A sample exactly at 0.4900 g or 0.5100 g still uses a circle at that edge. The exact sample mass and distance remain visible, so the edge arrow cannot be mistaken for a measurement at the scale limit.

The card distinguishes the target from the band. A sample of **0.4980 g** is inside the activity band and **0.0020 g below the target**. A sample of **0.5020 g** is inside the band and **0.0020 g above the target**. A sample of **0.5030 g** is above the band, even though it remains inside the close-up. Exactly **0.5000 g** receives an explicit at-target message. Both band boundaries are inclusive.

The nearby legend explicitly identifies this as a practice band, not measurement uncertainty. Existing model limits and balance-resolution guidance remain in the activity.

## State and interaction

The guide follows the current sample mass, including when an older saved record is stale. Changing scale has no effect on the trial, record, or live titration. Overshoots can still be recorded as their actual mass through the existing controls.

Removing a loaded boat preserves its sample. The guide keeps that sample's position and identifies it as off the pan, while the balance readout can correctly show the negative tare offset. The [balance reading breakdown](titration-weighing-breakdown-2026-09-12.md) remains available to explain that difference.

The native toggle supports Enter and Space, reports its pressed state, and identifies the mounted figure through `aria-controls`. The current scale caption is available through `aria-describedby`. It keeps keyboard focus on the toggle. The close-up preference remains while the activity is mounted; returning to the weighing activity defaults to the full range while preserving the saved sample and record.

The diagram uses CSS for the scale and an outlined SVG circle or arrow for the sample. These data marks preserve contrast in forced-colors mode; surrounding text and controls follow the user's palette. No animation, external asset, or WebGL dependency is added. Numerical values, state text, and the legend accompany every visual state.

## Verification

Validation completed with **223 distinct tests across 16 suites**. The first run encountered one transfer-loop timeout and two worker-start timeouts; the three affected suites passed on retry (30 tests). The combined results are recorded in [the validation summary](../reports/chemistry-refinement-2026-09-06/titration-weighing-target-validation.json), with the original run and retry retained.

Browser coverage passed **52 scoped accessibility and layout scans**: 28 for the target guide and 24 for the existing balance breakdown, at 1200 px and 320 px widths. These scans found no scoped axe violations, horizontal overflow, or page errors. Final desktop and phone forced-colors screenshots were visually reviewed, including clearance below the sticky balance readout.

Source syntax, source/public-copy parity, English fallback matching across 443 unique equipment keys, and the scoped diff whitespace check passed.

The new unit suite checks exact band inclusivity, signed target distances, full and close-up scales, in-range boundaries versus off-scale samples, immutable state, off-pan samples, stale records, actual-mass recording, and malformed inputs. Geometry checks cover 4,002 sample/scale combinations across the model's supported mass range.

The new browser harness uses actual setup, tare, addition, boat, and recording controls. It checks both band edges, the exact target, both close-up edges, overshoot, an off-pan sample, changed records, keyboard toggling, sticky readout visibility, forced colors, equipment navigation, tiny and maximum samples, corrupted saved state, and unchanged live chemistry. The existing weighing-breakdown harness is used for regression coverage.

Run `node reports/chemistry-refinement-2026-09-06/titration-weighing-target-browser.cjs`. Reports and screenshots use the `titration-weighing-target-*` prefix in the same directory. Vitest uses `--pool=threads --maxWorkers=1`.

There are **11 new English strings**. Other-language translations remain pending. Changes are local and have not been deployed or checked in a physical-device classroom trial.

Follow-up: [Compare addition outcomes](titration-weighing-addition-comparison-2026-09-12.md) shows how each spatula portion would change the sample before the learner adds it.
