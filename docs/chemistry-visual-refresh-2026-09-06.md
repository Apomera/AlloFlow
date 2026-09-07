# Chemistry calculator visual refresh — September 6, 2026

This pass refines the Chemistry Lab Stoichiometry workspace, with the largest visual changes in the limiting-reagent and yield calculator.

## Changes

- Three numbered sections separate reaction setup, product/quantity entry, and the predicted result.
- Quantities and prediction sit side by side when the tool has enough space, then stack in reading order on narrow screens. The layout responds to available space rather than assuming a full-width browser window.
- A restrained teal palette, clearer borders, larger inputs, and a prominent predicted-mass readout improve visual hierarchy. The mole equivalent and worked explanation remain nearby.
- Default, dark, high-contrast, and forced-colors settings are supported. A visual review prompted extra space below the disclosure to prevent a thick focus outline from crowding the explanation.
- The empty calculator offers water formation, ammonia synthesis, and methane combustion examples. Each loads a balanced reaction and practice masses; no measured yield is fabricated. Example cards disappear when a reaction has been entered.
- Molar-mass cards received matching spacing and rounded borders, with a wrapping result header for narrow screens.

The styles are scoped to the calculator and bundled with the lazy-loaded chemistry tool. Source and public-asset copies are synchronized; no deployment was performed.

## Verification

76 tests passed across five files covering chemistry, calculator interactions, practice examples, form labels, and table/accessibility semantics. The new practice predictions are 18.015 g H2O, 11.354 g NH3, and 22.0045 g CO2 for the supplied example amounts.

The Chromium workflow checked example loading, both conversion directions, invalid amounts, keyboard setup, product switching, and the calculation disclosure. Default, dark, and high-contrast themes were checked at 320, 360, and 1200 pixels: nine targeted axe scans had zero violations, no horizontal page overflow, and no browser exceptions. Forced-colors reflow also passed.

Desktop, mobile, dark-theme, high-contrast, and starting-screen captures were visually reviewed. Evidence lives in `reports/chemistry-refinement-2026-09-06/`:

- `visual-tests.json`
- `visual-browser.cjs` and `visual-browser-results.json`
- `visual-yield-theme-default.png`, `visual-yield-theme-dark.png`, and `visual-yield-theme-contrast.png`
- `visual-yield-mobile.png` and `visual-yield-start.png`

These checks cover the calculator changes, not the entire platform or all chemistry reference content.
