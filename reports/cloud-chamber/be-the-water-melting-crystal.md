# Be the Water: melting crystal refinement

September 19, 2026

The snow-to-rain illustration now keeps its six meltwater beads aligned with the crystal's six arms. The former bead positions used the local XY plane, while the constructed crystal lies in XZ. Beads now sit just above that surface and follow the shrinking visible edge.

A soft radial mask gradually removes the outer crystal as the existing drop grows. The edge becomes smoother and glossier while the center retains its icy roughness. The crystal, drop, and six instanced beads reuse existing geometry; no draw calls or textures were added. This is a visual phase-change cue, not a separate melting simulation or additional water mass.

The existing kernel transition, energy explanation, learning pause, first-person preview, reduced-motion behavior, and cue duration are retained.

Validation:

- Source syntax check passed, and canonical and desktop source files match.
- `dev-tools/watercycle_pilot_melting_crystal_qa.cjs` passed: actual snow-to-rain transition, six aligned beads, shared crystal geometry, retreating edge, pause and reduced motion, first-person preview, cue expiry, restored rain size, no false cue on checkpoint restoration, seasonal ridge rendering, mobile accessibility, and resource cleanup. No captured page or WebGL errors.
- Visually reviewed the learning pause in Follow view and the retreating crystal in Water view. Captures are in `scratch/water-melting-crystal-review/`.
- Experience and kernel regressions: 117 passed, zero failed (pilot-melting-crystal-regressions.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `3dc808a567019c4793c85c588c645a5a1d10d14f5ce1b249487c8d8a753ba507`.
