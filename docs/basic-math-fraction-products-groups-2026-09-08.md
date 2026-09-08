# Basic math: understanding fraction products and quotients

This deep follow-up focuses on Fraction Lab's Operations view: multiplication, division, and the operand-entry flow shared with addition, subtraction, and signed operations.

## Teaching improvements

The previous multiplication picture drew only one whole's worth of cells. With improper operands such as `7/4 × 3/2`, its caption counted 21 pieces while the picture could show only eight. The new rectangle contains all 21 selected pieces, each worth `1/8` of a square unit, and retains a dashed one-square-unit reference. Its proportions follow the two fractional side lengths. Zero factors have no shaded area, and bounded inputs keep the diagrams manageable.

Division now has a grouping model before the existing reciprocal procedure. It rewrites the quantities as equal-sized pieces, counts full groups, and identifies any partial group. For `7/4 ÷ 3/4`, two full groups use `6/4`, leaving `1/4` unit. That remaining unit fraction is **1/3 of a group**, making the quotient `2 + 1/3 = 7/3`. A multiplication check reconnects the quotient, group size, and original amount.

Full and partial group outlines have equal widths at each layout size. The outline represents one group of B units, which may differ from one whole unit. Learners can restart grouping, advance one group, go back, or show all groups. The live readout states the amount still ungrouped. Large counts show at most eight full-group cards with an explicit count of the additional groups; they do not silently discard quantity.

An optional prediction asks whether the numerical product or quotient will be smaller than, equal to, or larger than Fraction A. The exact result, worked procedure, result bars, and new quantity model wait until a prediction is checked or the learner explicitly requests the worked model. Feedback connects the outcome to B's relationship with one and handles zero separately. These actions do not award points or call AI. Existing signed-fraction sign prediction remains separate.

## Input and accessibility refinements

Operand drafts remain visible while incomplete or outside the stated range. The tool withholds stale results until all fields are valid, preserves another field's unfinished draft when an input is corrected, and resets prediction and grouping context after changes. Numerators support 0–20, or −20–20 in signed mode; denominators support 1–20. Numeric forms with an integer value, such as `2.0`, remain valid, while `1.5` is not silently truncated.

Operand cards stack on phones and their inputs have explicit foreground/background colors and larger targets. Native radio buttons, checkbox controls, and grouping buttons support keyboard use. Readable text accompanies each model. Visual review led to stronger product-piece boundaries, darker mixed-number result text, and consistent full/partial group scaling.

## Verification

- **83 focused regression tests passed** across five suites, including **28 new arithmetic and interaction cases**. The 28 new cases were rerun after the final presentation and input refinements.
- **30 distinct activity/theme browser states** were verified across default, dark, and high-contrast themes, including runtime checks, automated WCAG checks, 320 px reflow, and expanded text spacing.
- **Three final keyboard workflows** covered prediction, reveal, invalid-input correction, grouping, and switching to signed mode. Group-width equality was checked in all three themes, and selected product-piece boundaries were checked against a 3:1 contrast threshold.
- Desktop and phone screenshots were inspected. Syntax, source/public byte parity, all **47 new English keys**, and scoped whitespace checks passed.

Evidence and reproducible scripts are in `scratch/basic-math-products-groups-2026-09-08/`, with results consolidated in `verification.json`. The new regression suite is `tests/basic_math_fraction_quantities.test.js`; the existing signed-operation source contract follows the shared operand-reset helper. Original audit findings and subsequent rechecks are retained.

These are local component checks using the actual tool, application styles, and English registry. They do not establish classroom learning outcomes or full deployed-app coverage. New language translations were not authored. No broad build, staging, commit, or deployment was performed; unrelated workspace edits were preserved.
