# CoasterLab lighting refinement — 2026-09-07

Daylight now uses a higher sun with lower exposure and ambient intensity to preserve material color and surface definition. All four themes define an explicit sun direction shared by the sky and directional light. Moving the view or rebuilding the layout no longer changes that direction through a world-position calculation.

Opaque train materials, rails, and crossmembers receive shadows. Soft filtered shadows use a smaller normal bias to improve contact with the geometry. Close orbit views focus the existing 2048-pixel shadow map around the inspected area; wider views cover the track bounds. Camera updates are cached and focus movement is quantized to shadow texels. FX Lite continues to disable shadows.

Validation:
- 266 unit tests passed across CoasterLab, camera framing, and visual presentation.
- Chromium/Three.js browser coverage passed for all four themes, sun/sky direction agreement, close/full shadow coverage, unchanged track analysis, Train and Station views, FX Lite, and phone presentation.
- Desktop daylight/neon, station, and phone screenshots reviewed visually.
- Canonical and desktop JavaScript copies match; targeted git diff whitespace check passed.

Browser spec: `tests/e2e/coaster-lighting.spec.ts`.
Screenshots: `scratch/coaster-lighting/`.
