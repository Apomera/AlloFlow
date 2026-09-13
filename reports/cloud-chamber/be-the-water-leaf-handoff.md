# Be the Water: continuous leaf-to-atmosphere handoff

The visible plant pathway now finishes at its exact endpoint before switching to the atmospheric presentation. Previously, the handoff retained the preceding frame's horizontal position and used a fixed height offset that started below the leaf endpoint.

The enlarged plant scene now blends into atmospheric altitude using an exponential height correction. The correction depends on altitude rather than elapsed time, so a stationary parcel does not sink as its offset expires. For ascending motion, the displayed height increases continuously, including across the transpiring-to-vapor transition. Normal and reduced-motion settings use the same spatial mapping. Learning pauses hold the endpoint, and restored transpiration checkpoints recover the same canopy-relative mapping.

This is a rendering correction for teaching-scale scenery. The physical altitude, canopy release altitude, phase thresholds, energy accounting, and cycle counts in the kernel are unchanged.

## Validation

- Existing pilot experience and kernel regressions: **117 passed, 0 failed**, recorded in `pilot-leaf-handoff-regressions.json`.
- `dev-tools/watercycle_pilot_leaf_handoff_qa.cjs` passed actual leaf arrival at the exact route endpoint, paused position, both camera views, ascent through the vapor transition, normal and reduced motion, restored canopy height, and mobile accessibility. No browser or WebGL errors were observed.
- Visual captures: `scratch/water-leaf-handoff-review/`.
- Canonical source and desktop mirror were updated together.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
