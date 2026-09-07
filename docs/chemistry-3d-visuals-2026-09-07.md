# Chemistry 3D visual refinement — September 7, 2026

This pass improves Molecule Lab's 3D viewer and its matching desktop public asset.

## Changes

- Added Ball & stick and Sphere model display choices, an Atom labels toggle, and larger preset controls with selected states and keyboard focus indicators.
- Added an opaque navy studio backdrop, more readable atom materials and lighting, and an oblique starting view that reveals methane's tetrahedral arrangement. Authored sRGB atom colors are converted for the bundled Three.js r128 renderer.
- Colored each bond half by its attached atom. Double and triple bonds remain separate parallel rods.
- Added Fit model and automatic framing based on the model bounds and viewport aspect ratio. Front, side, and top views also fit the model; mobile resizing keeps it in view.
- Disposed label textures when labels change or the viewer closes, preventing repeated changes from accumulating GPU textures.
- Corrected CO2 and O2 double bonds and N2 and CO triple bonds in the core presets. The 2D fallback now displays the same bond multiplicities. Reference: [OpenStax Lewis symbols and structures](https://openstax.org/books/chemistry-2e/pages/7-3-lewis-symbols-and-structures).
- Replaced misleading measured-radius/space-filling guidance with descriptions of what the controls actually render. The sphere option enlarges atoms and hides rods; it is an illustrative outline, not a calibrated van der Waals surface.

## Verification

38 tests passed across nine files covering camera fitting with bundled Three.js math, the four corrected presets and 2D bond rendering, geometry/polarity guidance, keyboard controls, accessible alternatives, reduced motion, form labels, inputs, builder controls, and animation lifecycle.

A Chromium run exercised real WebGL using bundled Three.js r128 and OrbitControls. It verified both display styles, split bond colors, double/triple rods, label texture disposal, keyboard Fit model, and complete model framing at 1200, 360, and 320 pixel browser widths. Three targeted axe scans reported no violations; no horizontal page overflow or browser exceptions occurred. Label texture counts returned to zero after labels were hidden and on unmount. The harness dismisses the actual first-use tutorial through its normal button.

Final desktop ball-and-stick, sphere, and mobile CO2 JPEG captures were visually reviewed after correcting the backdrop and color handling. Evidence is in `reports/chemistry-refinement-2026-09-06/`:

- `molecule-tests.json` — 38 passing tests
- `molecule-3d-browser.cjs` and `molecule-3d-browser-results.json` — reproducible WebGL checks
- `molecule-methane-ball-stick.jpg`
- `molecule-methane-spheres.jpg`
- `molecule-mobile-carbon-dioxide.jpg`

## Scope

Source and desktop public copies are synchronized. No deployment was performed. WebGL verification used Chromium's software renderer with postprocessing disabled to check the base renderer; headset and physical-device GPU testing were not included.

Atom sizes and bond lengths remain illustrative. Existing complex preset sketches were not comprehensively audited for completeness or scientific accuracy in this pass. These focused checks do not certify every chemistry tool or the full platform for classroom use.
