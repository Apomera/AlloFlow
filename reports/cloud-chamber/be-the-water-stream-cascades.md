# Be the Water: stream cascades

The stream now carries irregular whitewater patches on steeper reaches. Their strength follows the existing centerline slope, then decays downstream over an illustrative nine-world-unit distance. Softer, broken patches replace the initially regular wave pattern and fade toward the channel edges and calmer water.

The effect uses one additional mesh and material. Geometry is prepared once from the existing water surface, with a small vertical offset to avoid surface overlap. A top-surface mask and the existing lake-outlet clipping keep foam off the underside and out of the lake. Animation shares the stream's simulation-time uniform, so pause and reduced-motion behavior stay consistent. Open-water foam is hidden in the winter and desert scenarios.

This is a visual refinement. Foam strength is illustrative, not a calculation of discharge, entrained air, or hydrodynamics. The stream route, runoff arrival, and simulation kernel are unchanged.

## Validation

- Final pilot experience and kernel regression run: 117 passed, 0 failed. Results: `pilot-stream-cascades-regressions.json`.
- Browser acceptance passed: surface alignment, finite bounded strength, quiet and whitewater reaches, shared animation clock, pause and reduced motion, both learner cameras, actual runoff-to-liquid arrival, winter and desert visibility, mobile accessibility, and disposal of the additional geometry and material.
- No page or WebGL errors were observed.
- Final learner water view, cascade detail, and winter screenshots were visually reviewed. Source syntax passed, delivery copies match, and the existing preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_stream_cascades_qa.cjs`.
- Captures: `scratch/water-stream-cascades-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
