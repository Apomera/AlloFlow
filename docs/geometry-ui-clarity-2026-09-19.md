# Geometry UI clarity — September 19, 2026

## Changes

Coordinate Grid now presents all four activities in a two-column layout instead of a horizontally scrolling strip. Explore is labeled Plot & measure. Existing Quadrant Tour, Real-World Maps, and Quadrant Hunt activities remain available.

3D Volume Explorer also shows all four activities in two columns. Slider is labeled Set dimensions; Freeform is Build with cubes; Word is Word problems. Accessible names for the renamed dimension and cube-building controls match their visible labels. Existing keyboard shortcut hints remain available.

Both selectors wrap their labels and provide 44-pixel minimum button heights. All mode IDs, panel associations, keyboard controls, calculations, cube-building operations, prediction activities, and displacement behavior are preserved. English labels were added to both catalogs. Existing unrelated Geometry Sandbox edits were left untouched.

## Verification

- 59 tests passed across nine suites covering Coordinate Grid calculations/accessibility and Volume tab, canvas, prompt, prediction, freeform-builder, and displacement behavior.
- Browser checks opened all eight activities and verified panel associations plus Home, End, and ArrowRight navigation in default, dark, and high-contrast themes.
- Both tools passed at 1120, 375, and 320 pixels: 18 viewport checks. Navigation did not overflow with increased text spacing; all navigation buttons met the 44-pixel minimum. No browser runtime errors occurred.
- Narrow-screen controls were visually inspected after increasing text spacing.
- Source/public tool and catalog mirrors match, English catalog JSON parses, and scoped diff whitespace checks pass.

Evidence and the reusable browser harness are in scratch/geometry-ui-clarity-2026-09-19/. Browser checks use mocked host context and do not replace a full deployed-app/WebGL review. Changes remain local; no deployment was made.
