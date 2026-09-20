# Be the Water: lake outlet continuity

September 19, 2026

The stream now meets the lake at its actual surface level and eases into its existing slope over the outlet. Shallow-water color blends from the lake into the channel. The downstream shape remains unchanged outside the transition radius of 44 scene units from the lake center.

Rain contact and collected-water display height use the existing triangle sampler where the river mesh is present. Winter ice uses a separate clone of the river surface with a 0.025-unit clearance, preventing an ice edge from crossing the water surface at the outlet. This replaces the existing ice geometry and adds no draw calls. The simulation kernel and its teaching rules are unchanged.

Validation:

- JavaScript syntax passed. Canonical and desktop source copies have identical SHA-256: `0db4e00eb4a3e332666d0f5d5b1184fc2c874919f53f5625f62d7d364c363b58`.
- `dev-tools/watercycle_pilot_lake_outlet_qa.cjs` passed. Four ray samples at the lake boundary measured a maximum surface-height difference of 0.000331 scene units. The 709 downstream vertices checked differed from the previous flattened surface by less than 0.000001 units (float precision).
- The outlet browser check also verified ice alignment, river streak and riffle contact, seasonal visibility, both learner cameras, pause, reduced motion, runoff collection, groundwater cutaway, mobile layout, accessibility, and resource disposal. No captured page or WebGL errors.
- `dev-tools/watercycle_pilot_stream_landing_qa.cjs` passed after the contact-height change: slope-aligned rings, downstream drift, bank fading, pause/reduced motion, lake/ocean reset, and cleanup.
- Visually inspected the outlet and winter ice close-ups in `scratch/water-lake-outlet-review/`. The first winter review exposed a crossing ice edge; the final geometry and final screenshot resolve it.
- All 117 experience and kernel regressions passed, zero failures: `pilot-lake-outlet-regressions.json`.
- Existing local preview returned HTTP 200 on port 58122.

These refinements improve visual continuity; the river remains an illustrative water-cycle environment rather than a hydraulic solver.
