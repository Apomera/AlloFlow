# Product-specific chemistry yields — September 6, 2026

Chemistry Lab's yield calculator now supports every product in a balanced reaction. For CH4 + 2O2 → CO2 + 2H2O, learners can choose CO2 or H2O without re-entering reactant masses.

## Behavior

- A labeled product picker defaults to the first product and lists only products from the current reaction. Calculations use the chosen product's coefficient and molar mass.
- Switching products preserves reactant masses and clears the actual-yield measurement. The field's accessible description names the selected product and explains this behavior.
- Editing the reaction resets product selection along with the prior result and amounts. Invalid saved product indices fall back to the first product, discard the displayed old measurement, and explain how to recover.
- Missing-input guidance lists reactants that still need masses; zero is accepted as an entered amount.
- A keyboard-operable “How this was calculated” disclosure shows each reactant's available moles multiplied by the selected product's mole ratio, followed by the limiting result's conversion to grams. It explains the complete-reaction assumption and reminds learners to apply measurement significant-figure rules.
- The theoretical-yield line announces updated product and quantity through a polite live region.

The calculations use the existing deterministic chemistry engine. Mole-ratio and yield interpretation follows [OpenStax Chemistry 2e, Reaction Yields](https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields), referenced in the preceding calculator review. This remains a theoretical calculation rather than a reaction feasibility prediction.

## Verification

105 tests passed across seven files, including the prior calculator regressions, equation/preset science checks, form and table semantics, and new product-selection, measurement-isolation, saved-state recovery, and worked-calculation cases.

Evidence is in `reports/chemistry-refinement-2026-09-06/product-tests.json`. The real-browser workflow is in `product-browser.cjs`, with results in `product-browser-results.json` and a mobile capture in `product-yield-mobile.png`.

Chromium checks passed for keyboard product selection and disclosure expansion. The calculator panels had zero targeted axe violations and no horizontal page overflow at 320, 360, and 1200 pixels. The expanded mobile yield panel was visually inspected.

Source and public asset mirrors are synchronized. No deployment was performed. This follow-up supersedes the prior review's first-product-only limitation.
