# CoasterLab track hardware refinement — 2026-09-07

The lift walkway is now a continuous closed deck following the track frames, replacing isolated short deck pieces. Existing railings and posts remain aligned to the same frames. Crossmember webs connect the ties to the central spine, and instanced mounting plates and fasteners make rail connections readable at close range.

The train wheels now match the visible rail gauge and height. Cross axles connect the wheel assemblies, and the bogie beams sit lower beneath the car. Train inspection bounds include the wider, lower wheel assemblies. These are presentation changes; the simulation and track analysis are unchanged.

Extra mounting hardware hides in FX Lite and track analysis overlays. The continuous deck and structural webs remain visible. The hardware uses three instanced batches rather than individual objects per fastener.

Validation:
- 275 unit tests passed: CoasterLab, perspective framing, support frame, and continuous walkway geometry.
- Walkway geometry tests check closed topology, finite vertices/normals, and constant width/thickness across banking.
- Chromium/Three.js browser test passed for wheel-to-rail alignment, continuous deck geometry, rebuilding with eight cars, three themes, FX Lite, unchanged analysis, and phone framing.
- Desktop daylight/neon and phone screenshots reviewed visually.
- Canonical and desktop JavaScript copies are identical; targeted git diff whitespace check passed.

Browser spec: `tests/e2e/coaster-track-hardware.spec.ts`.
Screenshots: `scratch/coaster-track-hardware/`.
