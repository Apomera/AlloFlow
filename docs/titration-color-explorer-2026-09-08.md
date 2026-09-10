# Titration color explorer — September 8, 2026

The flask close-up now offers **Explore colors**. Selecting a color-guide swatch also opens the explorer at that reference value. A spectrum slider and three reference buttons let students compare the live solution with a chosen color in paired sample wells on white backgrounds. A cyan triangle identifies the live value and a gold diamond marks the reference on the adjacent color guide.

The explorer samples the existing indicator/redox color functions. Acid/base controls use pH with 0.01 steps, retaining methyl orange's 3.75 midpoint. Permanganate controls use added volume in 0.1 mL steps and keep the potential readout in the bench guide. Previewing does not dispense titrant, alter experiment data, or save notebook readings. Real additions update the live sample while the chosen reference remains fixed.

References survive 2D/3D changes and WebGL fallback. Changing the reagent setup or indicator clears the reference. Apparatus close-up changes clear it as well. The addition inspector and color explorer open separately. Opening the explorer focuses its native slider; Escape and Close preview return focus to the Explore colors button. At 760 pixels and below, controls and sample wells stack while the two wells remain side by side.

Source/public copies are identical. New English strings are registered in the titration catalog; translations remain follow-up work. No packages, new renderers, or animation loops were added.

## Validation

- 85 targeted tests passed: 59 immersive/measurement tests, 15 motion/persistence tests, and 11 internationalization checks. Four added helper tests cover bounds, precision, redox steps, and malformed values.
- Real Chromium interaction checks passed for keyboard slider changes, Home/End, swatches, focus handoff, preview isolation from experiment data, preserved viewer identity, real additions and notebook saves, view changes, indicator/preset resets, exact methyl orange midpoint, redox units, mutually exclusive preview modes, WebGL fallback, forced colors, reduced motion, and clean unmount.
- All 24 WCAG axe scans passed across acid/base, universal indicator, and redox in both 2D and 3D views at 1200, 760, 360, and 320 pixel widths. No horizontal overflow or page errors were observed.
- Desktop explorer, mobile explorer, linked 3D guide, and redox screenshots were visually inspected.
- JavaScript syntax, scoped whitespace checks, and source/public byte parity passed.

The browser harness uses the actual widget, React, Three.js, and application styles in a local fixture. This is component-level validation, not a deployed-platform or physical-device audit. No deployment was performed.

## Reproduce and inspect

Run `node reports/chemistry-refinement-2026-09-06/titration-explorer-browser.cjs` for the browser checks. Evidence is saved alongside it as `titration-explorer-browser-results.json`, `titration-explorer-tests.json`, and `titration-explorer-*.jpg`.
