# Aquarium visual depth and presentation — 2026-09-09

The 3D substrate now has gentle tonal variation, glass-edge darkening and soft contact shading derived from the actual habitat and rooted-plant footprints. Shading updates after object movement, removal or dimension changes, without rebuilding the sand mesh or adding shadow render passes. Surface/emergent/refugium plants are excluded from this ground-contact approximation. The sand mesh has more subdivisions for smooth shading. Its lowest vertex remains above the solid substrate base, whose material has independent color settings to prevent dark exposed strips.

Driftwood uses a deterministic procedural grain bump texture. Rock vertex colors darken lower facets for stronger form and contact depth. Species geometry, stock, biological equations, and simulation-driven water and lighting behavior are preserved.

The live aquarium has a coordinated deep-teal header, clearer selected-view buttons, visible gallon capacity and tank shape, an inspection status strip, and refined resident detail cards. The layout adapts to a phone while retaining keyboard access and existing camera controls.

## Verification

- 54 tests passed across 4 renderer, viewport, sizing and bridge suites. Two added regression tests cover substrate/base clearance, independent materials, and shading updates after habitat movement/removal.
- Real Chromium/WebGL checks passed at 1440 and 390 pixels. Covered actual contact shading, wood bump maps, close-up selection, unchanged model state during inspection, paused rendering, 40-gallon long tank resizing, dark substrate, and model-driven night lighting. No runtime/console errors or horizontal document overflow.
- Reviewed the final perspective rendering and full phone layout. Corrected a surface/base overlap found in the initial visual review. Paused scene frame captures now read immediately after rendering to avoid empty WebGL screenshots.
- Sample scene retained 176 draw calls; its triangle count changed from 29,718 to 32,966 for the smoother substrate. This is not an FPS benchmark.
- Source and desktop mirror match: 8b0aa9d08a6dea1903c8eb67f0e0463f29c164118bcf5fc958d58f9ad6957a67.

Evidence: .codex-artifacts/visual-v11/delivery-validation.json and .codex-artifacts/aquarium-visual-qa/visual-v11-verified/.

Contact shading is a static visual approximation, not a physical light simulation or water measurement.
