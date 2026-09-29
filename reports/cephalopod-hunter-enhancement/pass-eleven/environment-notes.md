# Pass eleven: water particles and marine snow

The pass-ten vampire capture showed uniformly bright solid food spheres. The Dumbo capture had very little surrounding particulate depth. These have separate causes: 28 gatherable food meshes use an opaque lit icosphere, while the 200 decorative plankton points are restricted to Y 1–9 even when the player dives far below them.

This patch changes their presentation without changing feeding, positions of gameplay objects, simulation randomness, fog, lights or habitat layout.

## Guarded integration

Root integrates `apply-water-particles.cjs`; `--check` performs a dry run. Seven exact guards allow independent model edits and preserve source line endings. Additional exact comparisons preserve the entire `updateSnow` function, including existing translation wrappers, the original plankton seed initialization, and the full original drift/recycle loop with its random calls. No production file is edited by this subtask directly.

## Food presentation

The same 28 `cl-marine-snow` mesh anchors retain their original spawning, falling, recycling, reach, gathering and reward logic. A shared deterministic floc geometry replaces the shared sphere: four small irregular curled lobes, 84 vertices and 28 triangles, with bounding radius below 0.09 world units. The old detail-one icosphere had 80 triangles. Each food mesh receives an index-derived orientation without random draws. Its softer warm material uses opacity 0.72, high roughness and no depth writes; it adds no texture. Food remains larger and more substantial than decorative dust.

## Decorative field

`cl-water-particles` is one `THREE.Points` object with 200 points. Its fixed GPU position buffer is separate from the legacy plankton buffer. The original legacy data still advances and recycles exactly as before, so changing visible density cannot shift the simulation's later random sequence.

Visible points initialize around the player's actual position and remain in world space between boundary wraps. The bounds are ±18 world units horizontally and ±8 vertically. This supplies particles at shallow and deep spawns, follows travel at field edges, and avoids moving the whole cloud with the camera. A separate fixed scale attribute ranges 0.65–1.35; brightness ranges 0.55–1.0. Both derive from indices, with no new RNG.

The existing r128 point shader receives a soft circular edge, a fade over camera-space depths 0.9–2.4, and a maximum diameter of three CSS pixels converted using the renderer pixel ratio. It retains built-in depth testing, fog and output conversion. The cloud disables object-level frustum culling to avoid a stale bounding sphere after long travel; individual points still undergo normal GPU clipping. No new light or render pass is added.

Decorative drift stops under reduced motion and has no changes for zero delta time. Player travel may still wrap distant points to preserve the local field. Pause and inspection skip the existing live update block. Food continues its existing gameplay movement under reduced motion; this presentation change must not alter the gathering simulation.

## Cost and lifetime

The presentation adds approximately 4 KB of fixed typed-array storage: one 200×3 render-position buffer and two 200-element attributes. The original position buffer stays as a non-rendered `BufferAttribute`; it never acquires a GPU buffer. Draw calls remain one ambient cloud, one existing bubble cloud and 28 food meshes. Bubbles, shafts and scenery are unchanged. Scene teardown already disposes the cloud geometry/material and shared food resources. There are no new textures, timers or event listeners.

## Verification

`tests/cephalopodlab_water_particles.test.js` extracts the integrated helpers and actual legacy loop. Seven cases cover finite repeatable floc geometry, deep distribution, fixed buffer/world-space continuity and long travel, reduced-motion/zero-time freeze, drift isolation, original recycle RNG consumption, and transformation of the actual Three r128 point shader. GPU compilation and visual quality require the separately owned browser suite and captures; static shader assertions alone are not sufficient.

Expected browser coverage includes real submitted GPU programs, finite bounded attributes and buffer identity after deep/distant travel, inspection and reduced-motion freeze, scene-resource disposal, and low/balanced rendering. Existing vampire button/hold gathering tests should retain their exact food semantics. Final vampire, Dumbo and reef screenshots should be inspected for subtle depth cues and identifiable small flocs without bright foreground balls.

## Integrated capture review

Compared [vampireSquid-environment.png](vampireSquid-environment.png) with [its initial capture](initial-vampireSquid-environment.png), and [dumboOcto-environment.png](dumboOcto-environment.png) with [its initial capture](initial-dumboOcto-environment.png). Also inspected [vampireSquid-phone.png](vampireSquid-phone.png), which shows inspection mode rather than active gathering.

The vampire food now reads as irregular drifting flakes instead of uniformly bright solid balls. The nearby clusters remain visibly larger and more substantial than ambient dots; the formerly dominant foreground sphere at the right now has a smaller broken silhouette and softer contrast. No floc obscures the animal or appears as a detached UI marker. The ambient particles remain subdued and do not create bright discs or a dense veil.

The Dumbo comparison adds sparse fine points throughout the previously empty dark water, giving the scene depth while keeping the animal as the focus. The sand slope and overall scene brightness remain consistent between the two captures; stronger lighting is not needed to explain this improvement.

No blocking collectible appearance problem is evident. Distant food flakes become faint, particularly against the pale slope, so the screenshots cannot establish recognition at every viewing distance. Nearby flocs remain distinct, and no further material correction is justified from these images alone. The phone inspection view retains visible larger flakes and uncluttered controls, but it is not evidence of active phone gathering usability. Motion continuity, exact reach and successful gathering remain test responsibilities.

Final integration: the initial 121-unit run passed, as did all four new browser cases and both existing vampire-food regressions on their first runs without retries. The latter cover button gathering and held-key gathering/no ink. The review above is based on images; the separate automated results establish the stated rendering, motion, disposal and gathering checks.
