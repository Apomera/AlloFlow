# Basic math: comparing unit rates at equal quantities

This follow-up deepens **Ratios, Rates & Proportions Lab → Unit Rates → Free exploration**. The exploration disclosure remains separate from the practice challenge.

## Learning improvements

The activity now connects each original package to one unit, then scales both options to a shared comparison quantity. Learners can enter a positive quantity or use one unit, A's quantity, or B's quantity. The working explicitly divides both quantity and price by the package quantity, then multiplies both by the chosen comparison quantity. Cost bars start at zero and share the same dollar scale, with separate A/B labels and numeric values.

For the starting example, A offers 12 units for $3.60 and B offers 20 for $5.40. At 12 units, the normalized costs are $3.60 and $3.24. This makes the difference between a lower package total and a lower price per unit visible. A short explanation identifies when comparing package totals leads to a different conclusion. The model states its constant-rate assumption and explains that buying only whole packages can produce a different checkout total.

An optional prediction asks which option costs less at the same quantity. Rates, the verdict, scaling rows, and bars are withheld until the learner checks a prediction or requests the comparison. Feedback supports revision; these exploration actions neither award points nor call AI. Editing a package clears previous prediction evidence, including stale restored evidence. Changing the shared comparison quantity preserves a valid prediction because both prices scale by the same positive factor.

Examples cover different package sizes, matching unit prices, and a free option. Both free options have zero filled bar length. Zero quantities remain undefined and receive guidance. Fractional quantities are supported. Comparisons use unrounded rates; display precision expands when rounded labels would disguise different prices. Small nonzero values remain numeric evidence even when visual differences are difficult to see. The activity identifies display rounding and retains the original division quantities.

## Input and accessibility refinements

Unit-rate and comparison-quantity fields preserve blank or invalid drafts when focus moves. A valid edit in another field does not replace an unfinished value. The affected model waits for valid inputs; invalid comparison quantity alone withholds its normalized model while keeping the still-valid unit-rate result. Labels, native checkbox/radio controls, status feedback, and buttons support keyboard use. Numeric controls now have a 44-pixel minimum height. Phone input cards stack to retain readable labels; explanatory cards and controls wrap. Light, dark, and high-contrast treatments retain readable text and explicitly labeled bars.

## Verification

83 of 84 focused checks passed, including all 27 new mathematical and interaction tests. The sole failing check is an unrelated source/public mismatch in the shared host module, `stem_lab/stem_lab_module.js`. Neither shared-host file was changed by this pass. The updated Ratios source/public pair is byte-identical. Initial test-fixture corrections used numeric tolerance for a floating-point bar width and reselected a prediction after its intentional reset; the original run is retained.

All 36 browser cases passed runtime, automated WCAG A/AA, 320-pixel reflow, and expanded-text-spacing checks across three themes. These cover ordinary, equal, fractional, zero-cost, close-price, tiny-price, hidden-prediction, corrective-feedback, zero-quantity, and unfinished-input states. Three keyboard workflows and three rendered shared-scale checks passed. The first screenshot attempt encountered the intentionally closed exploration disclosure; the corrected fixture opens it through its summary. Light phone and high-contrast desktop screenshots were inspected directly. Syntax, scoped English-key checks (30 keys), and source/public byte parity passed.

Evidence and reproducible scripts: `scratch/basic-math-unit-comparison-2026-09-08/`, including `before.js`, `final-tests.json`, `browser-results.json`, and `verification.json`. These are component-level checks with local React, application styles, matching English defaults, and simulated host callbacks. They do not establish full deployed-app coverage or classroom learning outcomes.

No broad build, staging, commit, or deployment was performed. Unrelated shared edits were preserved.
