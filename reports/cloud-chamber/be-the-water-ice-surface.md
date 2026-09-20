# Be the Water: winter ice surface

September 19, 2026

The river's winter ice now has cloudy frost near the banks, clearer blue areas toward the center, and faint irregular fracture seams. Frost softens the specular reflection and increases local opacity. Fine seams fade with viewing distance to limit distracting detail.

All detail is fixed in world space and has no animation clock. The existing ice geometry, surface clearance, seasonal visibility, and lake-outlet clipping are retained. This adds shader work but no textures, geometry, draw calls, or per-frame JavaScript work. It remains illustrative shading rather than an ice-growth simulation.

Validation:

- Source syntax passed. Canonical and desktop source copies match: SHA-256 `55c765327a9335559e1c44570f2ef8f3b0cc795fae5828ef01036fd89b3f9001`.
- Reused `dev-tools/watercycle_pilot_outlet_banks_qa.cjs` with captures in `scratch/water-ice-surface-review/`. All existing outlet, ice alignment, flow contact, pause, reduced motion, seasonal visibility, mobile accessibility, and resource-disposal checks passed. No captured page or WebGL errors.
- Captured the actual winter Water view using `scratch/capture-winter-water-view.cjs`; no page or WebGL errors.
- Visually inspected both the winter outlet close-up and winter Water view. Frost and faint seams remain readable without overpowering the scene.
- All 117 experience and kernel regressions passed, zero failures: `pilot-ice-surface-regressions.json`.
- The existing preview server was no longer listening on port 58122. Restarted the same preview script in a hidden process and confirmed HTTP 200 at the original URL.
