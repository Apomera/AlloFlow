# Be the Water: river landing ripples

September 19, 2026

Stream landing ripples now follow the rendered channel's slope and cross-section instead of sitting on a horizontal plane. A static spatial index of stream triangles supplies heights during the brief landing cue. Height queries inspect nearby triangles without allocating raycasters or scanning the entire mesh each frame.

The existing elliptical rings drift gently downstream. Per-vertex wetness fades their edges as they leave the channel, alongside the existing shoreline mask. Spray over the stream starts relative to the sampled water height. The three existing ripple meshes and pooled spray are reused.

Lake and ocean arrivals reset downstream drift and bank fading. Pause and reduced motion hold the cue; the parcel kernel, collection rules, and teaching explanation are unchanged. The drift is an illustrative flow cue, not a hydrodynamic simulation.

Validation:

- JavaScript syntax passed; canonical and desktop source files match.
- `dev-tools/watercycle_pilot_stream_landing_qa.cjs` passed: actual rain collection on a steep reach; independent ray checks against the stream mesh within 0.002 units of the intended 0.14-unit clearance; expansion, downstream drift, bank fade, pause, reduced motion, both camera views, mobile notice accessibility, lake/ocean reset, and disposal of all three ring geometries once. No captured page or WebGL errors.
- Visually reviewed the close river view and learner Water view. Captures are in `scratch/water-stream-landing-review/`.
- Ocean landing browser check passed, including ray-verified wave alignment during expansion and reduced motion, rainfall, collection, accessibility, and cleanup. Experience and kernel regressions: 117 passed, zero failed (pilot-stream-landing-regressions.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `f7d8d530e9d00c7f1253e26a4b91423736f7d7a8f30a2c970c7901ba6cfadb0f`.
