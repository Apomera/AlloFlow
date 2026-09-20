# Be the Water: clearer river flow cues

September 19, 2026

The river's 28 pooled flow streaks now have dim tails and brighter downstream tips. Slightly longer streaks use a separate tangent at each endpoint to follow the channel's bends. Both endpoints sample the rendered stream surface, with a small clearance, rather than using a fixed offset above its centerline.

Opacity fades near the lake outlet and river mouth. Invisible endpoints retain finite positions instead of being moved far below the scene. The existing 56 vertices and single line draw are retained; no textures or meshes were added.

The streaks now use the stream shader's visual clock. Enabling reduced motion preserves their current positions and opacity instead of resetting them to their seeds. These are illustrative direction cues; the parcel kernel and collection rules are unchanged.

Validation:

- JavaScript syntax passed; canonical and desktop source copies match.
- `dev-tools/watercycle_pilot_stream_flow_qa.cjs` passed. Independent rays verified visible endpoints against the rendered channel within 0.002 units of the intended 0.06-unit clearance. It also checked downstream direction and tip contrast, join fades, pause, reduced-motion continuity, both learner views, actual runoff collection, seasonal visibility, groundwater cutaway, mobile accessibility, and cleanup. No captured page or WebGL errors.
- The close river capture was visually inspected. Screenshots are in `scratch/water-stream-flow-review/`.
- The existing source regression guard now expects the shared stream clock instead of a seed reset.
- Experience and kernel regressions: 117 passed, zero failed (pilot-stream-flow-regressions.json).
- Existing preview returned HTTP 200 at port 58122.

Source SHA-256: `527238146f283e5987b50c64925a75d4b33493119e4f94e2600d53a5c7b78ea0`.
