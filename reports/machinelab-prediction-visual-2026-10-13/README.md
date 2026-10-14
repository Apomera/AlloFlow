# Machine Lab: clearer prediction practice

The prediction activity now has a stronger visual hierarchy:

- Quantity-labeled current and hypothetical setup cards use solid and dashed top borders.
- A larger baseline value separates the starting power or energy from the changed settings.
- Answer cards have a thicker selected border and subtle background change. Desktop choices sit side by side; phone choices stack.
- Check prediction and Check calculation are visually primary, with large touch targets and contrasting keyboard focus outlines.
- Decorative numbered markers organize prediction, optional calculation and comparison. Worked equations and result cards share a labeled comparison panel.
- The numeric entry and main relationship use larger, aligned numerals. Feedback has a clear boundary, and mobile action buttons span the available width.

Only `predictionPractice()` rendering and styles change. Replacing that function with its version from `9891a85c1` reproduces the prior source exactly. The outcome/model-selection code and all six event callbacks remain byte-identical. Physical models, draft state, answer tolerances, saved records, grade gates and other views are unchanged. Canonical/public SHA-256: `beec1ea14944e6225b401e3f8b6235413535ed8f6059dbf3f4160ddf817b5af3`.

Independent review caught a focus-outline cascade issue before browser validation: the later outer power-lab rule had equal specificity and could replace the contrasting focus color with the button text color. Qualifying the three selectors fixed it. `focus-correction.json` binds the exact selector-only correction and both source hashes. The first 91-test pass is preserved as superseded; only the final-source pass is counted in the final summary.

Validation passed all 91 unchanged tests in four existing files: prediction arithmetic and lifecycle, numerical calculations and provenance, accessibility, and localization. No new unit tests were added for this presentation-only change. All 1,099 browser checks passed across the complete 24-route calculation flow. The checks cover stage names, selected borders, quantity labels, desktop/mobile layout, button text contrast and actual keyboard focus contrast in light, dark and forced-colors modes. Root and the browser reviewer independently inspected all four final screenshots. `verify-evidence.cjs` verifies source, runners, test inventory, native exit receipts, logs and screenshot hashes, then writes `validation-summary.json`.

The initial browser run is preserved as a failed attempt. Its eight immediate focus samples caught an unfinished style transition. Diagnostics on the saved page confirmed that the final source's outlines resolved correctly after two animation frames. The successful run adds only the existing settle helper before focus sampling; every assertion and contrast threshold remains unchanged. The final verifier proves that single harness difference and checks the diagnostic and failed-run receipts. Production source did not change between browser runs.

Run from the repository root; native runners require a fresh output directory:

```powershell
node reports/machinelab-prediction-visual-2026-10-13/verify-scope.cjs
node reports/machinelab-prediction-visual-2026-10-13/run-tests.cjs <fresh-test-directory>
node reports/machinelab-prediction-visual-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-prediction-visual-2026-10-13/verify-evidence.cjs
```

This is targeted validation, not the full repository suite. Chromium uses local React/THREE and software WebGL; forced colors is emulated. No deployed build or physical assistive technology session is exercised. No push or deployment is included.
