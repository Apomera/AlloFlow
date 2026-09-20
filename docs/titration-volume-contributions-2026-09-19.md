# Per-fill volume contributions - September 19, 2026

The live burette **Delivered-volume tracker** now includes **Show each fill’s contribution** after a start reading is set. Open the burette close-up, choose **Measure volume**, set a start reading, then expand the new diagram.

## Reading the diagram

Each row identifies the fill by its number in the experiment and shows its counted reading interval, exact contribution, and proportional shaded bar. Every bar uses the same 0.0-50.0 mL scale. The horizontal orientation follows increasing scale numbers; it is not a liquid-height illustration.

Starting at 49.5 mL and ending at 0.5 mL after a refill produces two rows: **0.5 mL + 0.5 mL = 1.0 mL**. The underlying helper also retains support for complete intervening fills, covered by unit tests. Current experiment presets stop at 12, 50, or 80 mL, so the live interface can cross one refill. A divider explains that a refill resets the scale to zero. The sum continues to use cumulative delivery rather than subtracting unrelated fill readings.

An exact 50.0 mL reading belongs to the empty fill, matching the existing apparatus. If the start mark is set there, that fill contributes **0.0 mL** before the next fill begins. Zero-volume rows have zero-width shading, and a 0.1 mL contribution occupies precisely 0.2% of the bar; no minimum width exaggerates the amount. Numeric intervals remain readable even when a shaded interval is very small.

The helper reuses the existing burette-position and difference logic. Fill identity is determined before readings are rounded to tenths, including restored readings such as 50.04 mL. The total and row sum agree at the displayed precision. Invalid, out-of-range, unset, and backward marks produce no diagram.

## Interaction

The view is collapsed initially. Its native button reports its expanded state and references the figure only when mounted. Space and Enter toggle it; Escape closes the diagram and returns focus to its button while keeping the tracker open. Closing/reopening the tracker restores a collapsed diagram but preserves the existing start mark. Clearing the mark or changing the setup removes the diagram through the tracker's existing lifecycle. Setting a new mark while expanded updates its intervals.

Changing this view does not dispense titrant, save a notebook record, modify the chemistry, or alter equipment-practice records. Actual bench additions update the contributions immediately. The view works alongside both the 2D diagram and 3D bench.

Labels, exact values, and hatched fills supplement color. The equation wraps at small widths. Data shading is preserved in forced colors while controls and text use the system palette. No dependencies, network assets, or animation loops were added.

## Verification

**115 tests passed across 5 suites**, including 9 new tests plus the existing 3D bench, motion, focus, and tab-control accessibility checks. The new browser harness passed **24 scoped scans**, including two forced-color scans, with no page errors, horizontal overflow, or missing ARIA references. Desktop, phone, and phone forced-color screenshots were visually reviewed.

The initial browser fixtures incorrectly requested 100.5 mL from an experiment capped at 80 mL and treated the saved renderer preference as immutable. Those assertions were corrected to respect the existing experiment limits and allow only the expected display-preference change. No product code change was needed.

The new unit suite covers per-fill arithmetic, constant-scale geometry, zero and tiny contributions, empty-fill boundaries, restored decimals, malformed inputs, and English fallback/catalog matching. It checks 210 ordered start/end combinations against the existing volume calculation. Browser coverage uses actual mark, clear, add, save, disclosure, navigation and view controls, with scoped accessibility/layout scans and screenshots at 1200 px and 320 px.

The existing tracker workflow also passed its 20 scans, for **44 combined browser scans**. It verified 3D viewer identity, WebGL fallback, notebook saving, touch additions, start-mark persistence, and close-focus behavior. See [the combined validation summary](../reports/chemistry-refinement-2026-09-06/titration-volume-contributions-validation.json). Source syntax, source/public parity, all 28 tracker fallback references, and scoped whitespace checks passed.

Forced-color browser scans omit only axe's color-contrast rule, which has a [documented forced-color limitation](https://github.com/dequelabs/axe-core/issues/3978); those colors are reviewed visually. Normal-mode scans include that rule.

Run [the new browser harness](../reports/chemistry-refinement-2026-09-06/titration-volume-contributions-browser.cjs) and the existing [tracker workflow harness](../reports/chemistry-refinement-2026-09-06/titration-volume-tracker-browser.cjs) from the repository root. Reports use the titration-volume-contributions prefix.

There are **7 new English strings**. Other-language translations remain pending. Changes are local and have not been deployed.
