# Geometry Sandbox — starter proportions and size

New sculpt primitives now use shape-specific proportions rather than the same three dimensions. The torus has a clear opening, spheres have a balanced radius, and cylinders and cones have useful height-to-width proportions.

Each new primitive is positioned with its lowest surface on the grid. The previous arbitrary height offset based on part count is removed. Existing parts keep their geometry and position.

A compact New shape size selector offers Small, Medium, and Large (0.5×, 1×, and 1.5× the starter dimensions). This preference persists with the workspace and affects future additions only. Keep adding shapes and automatic handoff to Size controls continue to work.

## Verification

- 60 tests passed: starter geometry and size preferences, shape chooser behavior, and existing sculpt editing regressions.
- All five primitives at all three sizes passed normalization and analytic ground-contact checks.
- Real Chromium checks at 1440, 390, and 320 pixels measured the actual rendered mesh bounds to verify grid contact. Also covered the torus opening, undoing creation, changing preferences without changing geometry, material editing, reload persistence, and responsive control bounds.
- No browser errors, failed requests, or horizontal overflow in the final run. The local preview was restored in a hidden background process after an initial connection-refused attempt.
- Desktop and narrow-phone screenshots reviewed.
- JavaScript syntax and scoped whitespace checks passed. Main source and public mirror match SHA-256 `224575B134805638BDB26528A775F9501D04EC0B7F7275FC8B09FE89403A6CC9`.

Browser results and screenshots: `scratch/geometry-starter-shapes-2026-09-19/`.

This pass covers browser sculpting, not headset operation.
