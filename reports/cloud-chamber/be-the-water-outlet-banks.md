# Be the Water: softened outlet banks

September 19, 2026

The lake's gravel shoulders now taper down beside the outlet opening. Riverbanks ease into a low, damp margin near the lake and return to their original profile downstream. Nearby lake gravel is shaded darker to reinforce the wet edge. The adjoining terrain banks follow the lowered inner margin while retaining their original sampled outer-edge heights.

The changes reshape existing static geometry and vertex colors. They add no meshes, textures, draw calls, or per-frame work. Water geometry and simulation rules are unchanged. Existing setup-time surface sampling grounds stones and planting on the reshaped shore.

Validation:

- Source syntax passed. Browser and desktop copies match: SHA-256 `6a4bdb8934b5e5a2577f8efefe1f90791d463ad13e3bac4b4a8286c2984cbf01`.
- `dev-tools/watercycle_pilot_outlet_banks_qa.cjs` passed. Five bank vertices near the lake boundary remain below 8.567 scene units; three adjacent lake shoulder samples taper below 8.8, while 82 distant shoulder samples retain their height of 9.
- Existing outer terrain-edge contact, lake/water continuity, river flow/riffle contact, winter ice, pause, reduced motion, both learner views, groundwater cutaway, mobile accessibility, and resource disposal checks passed. No captured page or WebGL errors.
- `dev-tools/watercycle_pilot_lake_shore_detail_qa.cjs` passed, including grounded gravel and planting, an open outlet, lake/river/ocean display heights, lake landing, seasonal visibility, and shared-resource cleanup.
- Visually reviewed final summer and winter outlet screenshots in `scratch/water-outlet-banks-review/`.
- All 117 experience and kernel regressions passed with zero failures: `pilot-outlet-banks-regressions.json`.
- Existing preview returned HTTP 200 on port 58122.
