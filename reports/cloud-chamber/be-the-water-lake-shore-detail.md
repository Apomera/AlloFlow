# Be the Water: lake shoreline detail

The lake shore now has a darker wet margin, a lighter upper gravel edge, and repeated texture coordinates instead of a texture stretched around the entire lake. Larger stones have less regular spacing and sit partly embedded in the actual shore surface. A fine gravel layer and paired grass clumps add variation while leaving the open water and stream outlet clear.

The lake's shallow edge uses a subtle mineral tint with distance-faded grain. Ripple normal perturbations are softer and their phase varies across the lake, reducing regular highlight bands. These are illustrative shading cues, not calculated water depth or sediment transport. The water mesh and its 34-unit landing radius are unchanged.

Gravel shares the larger stones' geometry, material, and texture. Lake grass shares the river grass geometry, material, and animation clock. This adds two instanced draws without adding textures or per-frame raycasts. Grass roots and gravel positions are sampled once from the shore geometry. The existing winter palette, desert visibility, and subsurface vegetation hiding apply to the new details.

## Validation

- Final pilot experience and kernel regressions: **117 passed, 0 failed**. Results: `pilot-lake-shore-detail-regressions.json`.
- Browser acceptance passed grounded grass and gravel, embedded stones, clear water and outlet, wet-edge colors, shared resources, and disposal exactly once.
- Lake/stream/ocean parcel heights, actual rain-to-lake landing, pause, reduced motion, both learner views, winter/desert visibility, subsurface grass hiding, and mobile accessibility passed. No page or WebGL errors were observed.
- Final learner water view, shoreline close-up, and winter captures were visually reviewed.
- Source syntax passed; canonical and desktop copies match; existing preview returned HTTP 200.
- Browser acceptance: `dev-tools/watercycle_pilot_lake_shore_detail_qa.cjs`.
- Captures: `scratch/water-lake-shore-detail-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
