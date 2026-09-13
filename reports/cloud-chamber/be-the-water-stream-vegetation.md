# Be the Water: grounded riverbank detail

The upright cone plants have been replaced by loose grass clumps with six curved, tapered blades each. Clumps vary in height, rotation, spacing, and muted color. Small groups alternate between banks, leaving open views of the stream. Roots are placed on the actual gravel or terrain-bank mesh at setup; candidates inside the lake or without a bank beneath them are omitted.

Grass tips have subtle sway driven by the existing stream animation uniform, with fixed blade bases. Pause and reduced motion hold the shared clock. Winter uses a drier vegetation color, while the desert and subsurface views hide the grass using the existing visibility controls.

The 56 larger bank stones now have less regular spacing. Both these stones and the 144 gravel pieces use the displayed bank height instead of a fixed centerline offset, leaving them partially embedded in the ground.

The grass replaces the former vegetation mesh with one instanced mesh, one small shared geometry, and one material. No textures or per-frame raycasts are added. This is decorative landscape detail; it does not change infiltration, discharge, or the water-cycle kernel.

## Validation

- Pilot experience and kernel tests: **117 passed, 0 failed**. Results: `pilot-stream-vegetation-regressions.json`.
- Browser checks passed grounded roots, lake exclusion, finite geometry, stones intersecting the bank rather than floating or disappearing, shared grass/water timing, and fixed blade bases.
- Seasonal colors, desert/subsurface visibility, pause, reduced motion, both learner views, runoff arrival, mobile accessibility, and resource cleanup passed. No page or WebGL errors were observed.
- Learner water view, riverbank close-up, and winter captures were visually reviewed.
- Source syntax passed; canonical and desktop copies match; existing preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_stream_vegetation_qa.cjs`.
- Captures: `scratch/water-stream-vegetation-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
