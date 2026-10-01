# Raptor Lab: articulated tail feathers

Tail feathers now have curved vanes, raised shafts, and rounded tips. Pulling up spreads the fan; diving brings the feathers closer together. These motions use feather rotations instead of scaling the whole tail sideways. The resting fan continues to settle into an overlapping bundle and reopen during takeoff.

The flight prompt in **Inspect → Tail feathers** invites learners to trace a feather, save a glide, and compare it with a pull-up or dive using the matched camera. Existing species colors, feather relief, tail bars, saved moments, and notebook evidence remain in place.

## Geometry and animation

All twelve feathers remain in one mesh with one material and the existing shared textures. Low quality uses 264 vertices and 312 triangles; balanced/high use 408 vertices and 504 triangles. Previously the tail had 96 vertices and 84 triangles. No meshes, textures, materials, or draw calls were added.

Three static morph targets describe the resting, wide, and narrow endpoints. Each endpoint rotates the complete vane about its root without changing feather length or width. Linear transitions between endpoints can produce small temporary contraction, as with other morph animation; there is no whole-tail scaling. Normals are calculated for each endpoint at setup. Runtime updates change only three morph weights and the existing lift/steering rotation. Flight physics and control bindings are unchanged.

Study mode already measures all active morph targets. It therefore frames the actual frozen tail in glide, pull-up, dive, and rest. The new prompt uses one English-fallback translation key listed in `translation-keys.json`; shared language-pack integration remains pending.

## Verification and artifacts

All nine final browser scenarios passed in 6.7 minutes, with no retries, failures, or skipped cases: four new species/quality scenarios, three existing anatomy-study scenarios, and two resting-tail scenarios. Both syntax checks, scoped whitespace checks, desktop mirror parity, and the translation-key/fallback check passed. Results and source hashes are recorded in `verification.json`.

The new suite checks endpoint root attachment, feather dimensions, finite geometry and unit normals, nondegenerate triangles, fan width, smooth control transitions, fixed mesh scale, unchanged buffers and textures, close-up framing, frozen readings, saved-view matching, notebook comparison, phone/reduced-motion layout, landing, and takeoff. Existing anatomy-study and resting-tail suites cover accessibility, fullscreen, camera restoration, cleanup, notebook/report export and restoration, foot contact, and reduced-motion landing.

The first visual review found the feather ends still too pointed, so the final geometry sizes each rounded cap from its physical width. The first test also assumed the saved view was unmatched; it now deliberately selects a different angle before matching. Both refined pilot scenarios then passed in 1.2 minutes before the complete nine-scenario run.

`peregrine-before.png` preserves the preceding anatomy-study tail view (a different flight altitude). New `*-glide.png`, `*-wide.png`, `*-narrow.png`, and `*-rest.png` files show each pose. The geometry and motion JSON files preserve numeric results. `tail-comparison.png` shows the learner's saved evidence; `owl-phone.png` shows the narrow layout.

These are local Chromium/WebGL checks, not physical-device frame-rate measurements. Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Shared hosts, catalogs, harnesses, and language packs are untouched. Changes remain local; no commit, push, or deployment was performed.
