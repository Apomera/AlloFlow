# Terrain-aware fox footing

Fox paws now fit the ground height beneath their animated positions. The normal swing clearance is retained, and the soles align with the forward slope. A small clearance prevents the fitted soles from sitting inside the terrain surface. Each leg solves for its own target; a limited shoulder adjustment preserves segment lengths at the reach limit.

Terrain fitting fades continuously as the pounce rises. Its grounded reference excludes leap height, so the adjustment cannot pull airborne paws down to the surface. At peak pounce, the original airborne leg pose is retained. All fitting is deterministic from the current recorded pose, preserving rewind and frozen reduced-motion views.

The height function is shared with the existing landscape. Terrain geometry, scenery placement, body travel, behavior decisions and population equations are unchanged. Fitting adds no geometry or materials. It is bounded visual fitting against the terrain heightfield, with forward slope alignment, rather than a rigid-body simulation, collision handling for props or feet locked to a fixed world location during stance. Corrections are limited to 0.08 times representative size; unusually steep surfaces may not be matched exactly.

## Validation

Seven targeted unit checks passed, covering flat ground, opposing slopes, different headings and sizes, crouch, stance and swing clearance, sole alignment, bounded correction, fixed segment lengths and release at peak flight. All three browser scenarios passed: new terrain footing, existing fox anatomy and existing mammal foot motion. The terrain test measures the actual rendered paw positions and effective sole radii in world space, verifies stance/swing clearance and airborne release, and checks rewind, reduced motion, saved results and mobile overflow. Slope, swing, leap and mobile captures were visually reviewed. JavaScript syntax validation passed. Web and desktop source SHA-256 hashes match: 2699CC6039B4927F01E695632A9E2771A357DA2901111BE1EEBE314CF2DD5200.
