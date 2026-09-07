# Chemistry calculator refinements — September 6, 2026

This pass improves the equation balancer and Stoichiometry workspace in Chemistry Lab. Changes are local; the public asset mirror is synchronized. Titration Lab and Molecule Lab were inspected as context but were not changed or fully re-audited in this pass.

## Classroom-facing changes

- Editing an equation clears its previous calculated balance. Editing a yield reaction clears its old result, reactant amounts, and measured yield before another reaction can reuse them.
- Grams and moles use the last edited amount as the source. Changing formulas or choosing a preset recalculates the other field. Clearing an amount clears its counterpart; clearing the formula no longer silently restores water.
- Conversion fields accept decimals and zero, associate invalid-value feedback with the field, and keep small nonzero quantities visible using scientific notation when needed.
- Yield calculations reject negative or non-finite amounts. Equal stoichiometric ratios identify all tied reactants. Measured yields above 100% remain visible with a check-your-data explanation; a zero theoretical yield explains why percent yield is undefined.
- Multi-product reactions explicitly identify the first product as the one being calculated. Product selection was added in the [same-day follow-up](chemistry-product-yields-2026-09-06.md).
- Addition-compound multipliers now apply only to their own dot-separated segment. For Na2CO3·2NaHCO3·2H2O, the counts are Na4 C3 H6 O11 and the tool's atomic masses give 310.030 g/mol. Both centered dots and periods work. Oversized individual subscripts receive a validation message.

The mole-ratio and percent-yield interpretation was checked against [OpenStax Chemistry 2e: Reaction Yields](https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields). Display rounding does not replace classroom significant-figure rules. The existing calculator supports 26 common elements and does not support charged ionic equations.

## Verification

Evidence is in `reports/chemistry-refinement-2026-09-06/`:

- `calculator-tests.json`: 90 tests passed across six files covering science, preset invariants, classroom regressions, integrity, and form/accessibility tests.
- `browser-results.json`: real React controls in Chromium; conversion edits, clearing, keyboard reaction setup, invalid amounts, reaction changes, and yield feedback.
- The two calculator panels had zero targeted axe violations at 320, 360, and 1200 pixels, with no horizontal page overflow or browser exceptions. `calculator-mobile.png` was visually inspected.
- JavaScript syntax, scoped diff formatting, and byte-identical source/public assets were checked.

The first regression run exposed a typo in a new expected molar mass (310.036); explicit arithmetic using the existing element table corrected it to 310.030. This is a focused calculator verification, not a platform-wide accessibility or classroom-readiness certification.
