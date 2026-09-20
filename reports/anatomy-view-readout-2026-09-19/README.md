# Anatomy visual navigation refinement — 2026-09-19

Added body-region illustrations to the five camera shortcuts and a compact Current view readout inside the included Surface and Blueprint viewers. The readout tracks region changes, named angles, free rotation, Reset, and mode changes. It does not intercept pointer input or announce continuous camera motion. Region buttons retain their text labels; illustrations are decorative SVGs with no network or paid asset dependency.

Validation:
- 36 tests passed in anatomy_ui_polish.test.js and anatomy_view_model_refinement.test.js.
- anatomy-view-readout.spec.ts passed against the real bundled GLB and WebGL viewer.
- Browser assertions cover region/angle synchronization, reset, lighting and model changes, persistent canvas identity, Focus model transitions, 2D exclusion, and phone widths of 390 and 320 pixels.
- No browser page errors or horizontal overflow in the tested scenarios.
- Scoped Axe checks of the new readout and region controls: zero violations in light, dark, and high-contrast themes. This is not a whole-app accessibility audit.
- Desktop and phone screenshots visually reviewed.
- JavaScript syntax and scoped git whitespace checks passed; source and desktop runtime mirror hashes match.

Evidence: desktop.png, phone.png, accessibility.json.
