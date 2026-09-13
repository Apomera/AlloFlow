# Be the Water: stream-to-terrain transitions

The stream's gravel edges now connect to the surrounding land through broader, gently sloping banks. Their outer elevations are sampled from the existing beach, wet sand, meadow, and hardpan meshes at scene setup. Colors blend from the gravel margin toward the sampled terrain material and update with the biome, including winter snow tones.

A separate terrain mask opens a wider corridor for the new bank surface. The original narrow water mask remains in use for water-landing effects. The bank surface overlaps the gravel edge and meets the sampled terrain just below its surface to avoid a visible seam. Lake clipping keeps the added banks out of the open lake. The groundwater cutaway also applies to the banks; desert mode hides the stream and restores the original uncut terrain.

This adds one mesh with 3,474 vertices and 6,144 triangles, one material, and one static 512-square mask texture. The bank material shares the existing rock texture. Raycasts run only during scene setup; bank colors update only with scenario changes. The water route, landing model, and simulation kernel are unchanged. This is a local landscape refinement, not terrain erosion or fluid simulation; the broader landscape retains its existing terraces.

## Validation

- Pilot experience and kernel regressions: **117 passed, 0 failed**. Results: `pilot-stream-terrain-regressions.json`.
- Browser acceptance passed: bank edges match sampled terrain elevations; positions and normals are finite; terrain and landing masks remain distinct; winter colors update; groundwater cutaway remains active without cutting away the banks themselves through the terrain mask.
- Existing stream acceptance also passed: shared animation clock, pause and reduced motion, both learner views, runoff-to-liquid arrival, winter and desert behavior, mobile accessibility, and cleanup. New geometry, material, and mask each dispose once. No page or WebGL errors were observed.
- Learner water view, outlet close-up, and winter captures were visually reviewed.
- Source syntax passed. Canonical and desktop mirror hashes match. Existing preview returned HTTP 200.
- Browser check: `dev-tools/watercycle_pilot_stream_terrain_qa.cjs`.
- Captures: `scratch/water-stream-terrain-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
