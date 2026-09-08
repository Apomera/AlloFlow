# CoasterLab garden details - 2026-09-08

The station forecourt now has varied shrubs and 48 flowers with individual stems, centers, and five petals each. Instanced geometry keeps the planting compact. Flower colors adapt to the visual theme, and the planting hides in FX Lite and blueprint views.

A two-sided wayfinding sign marks BOARDING / STATION AHEAD on the approach and EXIT / PARK PATH on the reverse. Each face uses its own front-facing canvas texture, so lettering remains correctly oriented. Sign colors adapt to the theme and the sign remains visible in FX Lite.

Browser verification caught a shared-material instancing issue in Three.js r128: stems used the shrub material without the instance-color attribute required by that material's active shader. White stem instance colors now preserve the intended material color and keep rendering active. Screenshot captures wait for two rendered animation frames after changing presentation settings.

Validation:
- 238 unit tests passed across CoasterLab and visual presentation before the final instance-color repair.
- The final Chromium/Three.js garden browser test passed after the repair (5.4 minutes), covering finite instance transforms, two-sided sign orientation, daylight/neon/blueprint themes, FX Lite, phone framing, unchanged analysis, and zero page or shader errors.
- Final desktop and phone screenshots reviewed visually.
- JavaScript syntax and targeted git diff whitespace checks passed.
- Canonical and desktop copies are byte-identical UTF-8 with LF line endings; SHA-256: 4d983e6420c63135525509217b02dc9a6232ab5ba46b3946cbd278499fe1488c.

Browser spec: `tests/e2e/coaster-garden-details.spec.ts`.
Final screenshots: `scratch/coaster-garden-final/`.
