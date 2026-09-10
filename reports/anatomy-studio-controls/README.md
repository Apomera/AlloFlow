# Anatomy studio controls — 2026-09-09

The 3D viewer now offers Soft and Contour surface lighting without losing the camera position. The choice survives switching between Surface and Blueprint. The default Soft lighting retains the previous appearance; Contour moves the key light to the side to reveal surface shape.

Region presets show their active state. A Viewing label and a compact zoom/Fit dock sit directly below the canvas, so controls do not cover the body. Model notes are collapsed by default (expanded in reading mode), and all five regional shortcuts share a compact row on phones.

Detailed Surface mode no longer cycles through hidden teaching pins with bracket keys. Its accessible label and help text describe the available controls and direct learners to Blueprint or 2D Atlas for labeled structures. The included body and all new features remain free.

## Validation

- 36 existing anatomy interface/model regression tests passed.
- Real Chromium WebGL studio test passed: live lighting, camera/viewer retention, selected-region state, dock zoom and Fit, hidden-pin keyboard behavior, keyboard activation, and phone layout.
- Scoped Axe checks of the lighting switch, camera dock, region buttons, and model-note disclosure found zero WCAG A/AA violations in light, dark, and high-contrast themes. This was not a whole-app audit.
- No page errors in the browser test. No horizontal overflow at 390 px. Verified the dock sits below the canvas.
- Visually inspected contour.png and phone.png. soft.png records the default appearance.
- JavaScript syntax and diff whitespace checks passed.

Evidence: tests/e2e/anatomy-studio-controls.spec.ts, accessibility.json, soft.png, contour.png, phone.png.
