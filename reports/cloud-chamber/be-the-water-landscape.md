# Be the Water: landscape refinement

The mountain layers now share a small procedural rock texture with smooth, seamless mottling. Slope-aware vertex colors distinguish exposed rock from lower terrain, while winter snow retains more rock detail on steeper faces. The existing mountain geometry, snowline driver, terrain outlines, and landing boundaries remain unchanged.

The forest's lower crowns have deeper greens and its upper crowns retain lighter colors. Coastal foam now uses broken, tapered line segments aligned to the existing shoreline instead of tracing the island with continuous outlines. The three existing foam batches are retained.

Shared geometries, materials, and material textures are now disposed once during pilot cleanup, including the rock texture reused by both mountain layers. Cleanup is idempotent independently of the rendering loop's alive flag, so context loss does not prevent disposal.

Validation: 77 pilot experience tests passed. `node dev-tools/watercycle_pilot_terrain_qa.cjs` checks all four climate views, finite terrain colors, shared rock maps, tapered foam geometry, water shader compatibility, paused/reduced-motion clocks, phone rendering, and exactly-once shared texture disposal. Tropical and winter screenshots were visually reviewed; the overly directional first texture was replaced before completion. Screenshots are in `scratch/water-terrain-review`.
