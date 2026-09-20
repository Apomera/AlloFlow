# Be the Water: layered lake ripples

September 19, 2026

Lake reflections now combine three ripple directions with slowly changing phases. The smaller ripple layer fades sooner with distance, and the shoreline has gentler disturbance so the shallow-water colors and light patterns remain readable. Ripple strength uses the existing wind-driven water uniform. Winter damping and the existing pause/reduced-motion clock are retained.

This modifies shading on the existing lake mesh. It adds no geometry, textures, draw calls, or per-frame JavaScript work. The water-cycle kernel and lake landing surface are unchanged.

Validation:

- JavaScript syntax passed. Canonical and desktop copies match: SHA-256 `8575b605974fc58a869aa659dd28d878b78969c8f3c0865471263a48c93c51f4`.
- Reused `dev-tools/watercycle_pilot_lake_shore_detail_qa.cjs` with captures in `scratch/water-lake-ripple-review/`.
- Browser checks passed for shoreline grounding, lake/river/ocean display heights, actual lake landing, pause, reduced motion, seasonal visibility, both learner views, mobile accessibility, and resource disposal. No captured page or WebGL errors.
- Visually inspected the lake close-up: reflection bands are softer and less uniform, while shallow-water detail remains readable.
- Both regression suites passed together: 117 passed, zero failures. Report: `pilot-lake-ripple-regressions.json`.
- Existing preview returned HTTP 200 on port 58122.
