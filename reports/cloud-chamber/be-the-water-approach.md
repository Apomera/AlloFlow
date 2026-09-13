# Be the Water: approaching the waterline

Rain previously descended toward the teaching model's zero-height plane even over elevated lakes and streams. Collection then lifted the parcel onto the visible water, producing a jump from below the surface.

## Changes

- Near open water, the enlarged rain parcel eases toward the same display height as collected water. The offset blends out smoothly over 80 scene units; high-altitude and terrestrial rendering retain their existing positions.
- Rain streaks now clip at inland water heights as well as the mean ocean surface.
- Collected water height follows projections onto adjacent stream segments, replacing jumps between nearest sample heights. The existing surface classification remains unchanged.
- Stream landing orientation now uses the same arc-length sampling as the stream's saved route samples.
- Restored checkpoints, resets, and scenario selections bypass live HUD throttling so small altitude changes publish the correct reading. They also clear the previous cycle-complete banner.

These are rendering and display-continuity corrections. Kernel altitude, contact timing, mass, energy, and phase rules are unchanged. Stream heights remain an approximation of the decorative water mesh; this does not introduce fluid dynamics or terrain collision physics.

## Validation

- Existing experience and kernel regressions: 117 passed, 0 failed.
- `dev-tools/watercycle_pilot_approach_qa.cjs` checks a descending altitude sequence, the actual rendered rain-to-liquid boundary, visible lake rain clipping, unchanged high-altitude and terrestrial rendering, pause and reduced motion, stream slope interpolation, exact restored readings, stale banner removal, both camera views, 390 px layout, accessibility, and absence of observed page/WebGL errors.
- The existing `dev-tools/watercycle_pilot_inland_landing_qa.cjs` passed after the surface-height changes, including actual lake/stream/ocean impacts and shared-resource disposal.
- Visual captures: `scratch/water-approach-review/`.
- Canonical source and desktop mirror are synchronized. Local preview remains on port 58122.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
