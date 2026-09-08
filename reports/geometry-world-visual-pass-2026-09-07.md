# Geometry World visual pass (September 7, 2026)

Geometry World is the first-person voxel builder (`stem_lab/stem_tool_geometryworld.js`). Before this pass it already had a sky dome, drifting clouds, a sun disc, bloom, soft shadows, five time-of-day presets and painted grass, wood, brick and sand. Driven under real WebGL (Chromium + SwiftShader, three r128 from the tree), the world still read flat and washed: every colour reached the screen lighter and greyer than its palette swatch, gold and diamond rendered as dull slabs, the upper frame whited out under bloom, the ground was one uniform sheet, and switching to sunset or night recoloured the sky while the world stayed in noon daylight.

## What changed

**Colour pipeline.** The renderer encodes output as sRGB, but hex colours and painted textures were fed in raw, so they were gamma-encoded twice. Block and character colours now pass through one sRGB-to-linear conversion (`geometryWorldSrgbColor`) and every procedural texture is tagged sRGB with anisotropic filtering. The world colour now matches the swatch the student picked. Light energy was re-balanced to the original presets after a first round that overexposed.

**Reflections for the reflective blocks.** A six-face sky/horizon/ground cubemap is painted from the scene's own colours, prefiltered with `PMREMGenerator`, and given to gold, diamond, glass, water and ice only. Feeding it to every material through `scene.environment` lit the whole world a second time from the sky and blew the grass and the characters' faces out to white (measured in round 1), so it is scoped by a `gwReflective` flag and re-applied to cached and placed materials whenever a preset lands. Gold keeps enough metalness for a sheen without mirroring the blue sky into olive.

**Stone texture.** Stone was a flat grey. It now has a mottled, fractured procedural texture like the other painted blocks.

**Ground reads as turf.** Grass blocks take a deterministic per-cell tint (`geometryWorldGroundTint`, a hash of x and z in [0.965, 1.035]) that is stable across reloads and small enough for the 8% measurement checkerboard to read on top.

**Sky with a sun in it.** The dome shader takes a sun direction, colour and strength; the sky brightens toward the sun disc, with the colour following the fog and the strength following the sun intensity every frame. Clouds are thinner and bloom now sits at a threshold only the additive sun disc, lava and torches reach, so labels, eye whites and lit faces no longer glow.

**Lighting follows the time of day.** Each preset carries a sun colour and a hemisphere intensity. The 1.4 s cross-fade interpolates both, the hemisphere light takes the sky colour it stands under, and night drops to a blue moon at low intensity instead of daylight under a dark sky.

**Crisper labels.** NPC name plates and speech bubbles are drawn at 2x with an sRGB texture and a subtle outline.

## Files

- `stem_lab/stem_tool_geometryworld.js` and the byte-identical desktop mirror `desktop/web-app/public/stem_lab/stem_tool_geometryworld.js`.
- New `tests/geometry_world_visual_pipeline.test.js`: the ground tint is deterministic, bounded, varying and non-striped; the source routes colours through the conversion, tags all five painted textures, scopes the reflection map, and keeps bloom above 0.95.

## Verification

- Unit: 13 Geometry World files, 297 passed, 8 skipped. Three golden snapshots fail for spaceColony, aquarium and aquacultureLab, which other sessions are editing; the geometryWorld golden passes.
- Real-WebGL captures before and after each round, desktop day, aimed close-up, sunset, night, and phone touch mode: `scratch/geometry-world-visuals-2026-09-07/captures/`. Zero page errors on every mount.
- The WebGL e2e spec `tests/e2e/18-geometry-world-gl.spec.ts`: see the addendum.

## Not done

- Ambient occlusion in block corners would deepen the voxel look further; it needs per-vertex work in `createShapeGeometry` and was left out to keep the STL and volume paths untouched.
- Physical devices and headsets were not exercised.

## Round 5 (same day): mass, horizon, touch

**Ambient occlusion.** Every block now carries per-vertex ambient occlusion written as a vertex colour: the classic voxel rule reads the two edge neighbours and the diagonal on the far side of each face corner and darkens in four steps (1.0, 0.82, 0.68, 0.55). Corners and the foot of every wall darken, so structures read as solid mass instead of coloured paper. It costs nothing per frame; the 3x3x3 neighbourhood is refreshed on each place or remove, and the whole world once after a lesson fill. Glass, water and ice neither occlude nor darken; lava and torches keep their glow. The pure rule (`geometryWorldVertexAo`) is pinned in the pipeline test; a browser probe measured 0.55 on wall and floor-beside-wall vertices and 0.82 to 1.0 on open floor.

**Horizon ground.** The lesson floor is a finite slab of grass blocks; beyond its edge every lesson looked like a floating island. A single deeper-green plane just under the floor now carries the ground to the fog line. It rides with the camera, receives shadows, and is not in the block map, so building, measuring and the crosshair never see it.

**Placement pop.** A block placed by the student scales in from 0.7 over 160 ms (skipped under reduced motion / battery saver). Direct `placeBlock` calls, which lessons and the e2e block-fidelity checks use, stay exact.

## Round 6 (same day): grass sides, water and ice surfaces, a moon

**Grass cubes have a top and sides.** A grass cube now uses a two-part atlas: grass on the top face, dirt with a hanging grass fringe on the four sides and the underside. The cube's top-face UVs are remapped to the upper half of the atlas at placement; slabs and wedges keep the plain grass so no unmapped face shows a seam. The rim of every lesson floor now reads as turf on earth.

**Water ripples, ice crackles.** Both get a tangent-space normal map derived from a painted height field by finite differences (linear data, deliberately not tagged sRGB). The single shared water map drifts every frame so all water blocks ripple together; ice keeps a static crackle.

**A moon at night.** A pale disc with three soft craters sits opposite the sun and fades in as the sun intensity falls, while the sun disc fades out. In the night preset the probe measured moon opacity 0.76 and sun disc 0.18.

Probe results (`scratch/geometry-world-visuals-2026-09-07/probe-round6.mjs`): grass cube atlas 64x128 with top-face v in [0.5, 1] and side v in [0, 0.5]; water normal map present and drifting; ice normal map present; moon opacity 0 by day. Zero page errors.

## Round 7 (same day): the sun travels, and its shadows follow the player

**The sun moves with the time of day.** The light sat at a fixed point regardless of the preset, so switching to sunset recoloured the sky while every shadow kept pointing the same way and stayed the same length. Each preset now carries a sun elevation and azimuth, interpolated across the 1.4 s cross-fade (azimuth the short way round). Noon keeps the bearing this world always had; golden hour rakes at 20 degrees and sunset at 9, where a three-block tower throws a shadow roughly nineteen blocks long.

**Sun and moon hang where the light comes from.** Both discs are placed from the same direction vector as the light, the sun at its own bearing and the moon opposite it and always above the horizon. At sunset the disc now sits low on the horizon in frame, which it never did before.

**Shadows reach the whole lesson.** The shadow volume was a fixed 60-unit box centred on the origin, but lessons lay ground out to x = 50, so every block past x = 30 cast no shadow at all. The volume now travels with the player, snapped to whole shadow-map texels so the shadows do not crawl as they walk, with the light far enough out that a 9-degree sun still clears the world.

**Torches glow.** Each torch carries a warm additive halo that pulses on the same flicker as its light.

Probe (`scratch/geometry-world-visuals-2026-09-07/probe-round7.mjs`): elevation measured back from the light position matches the preset in every case (day 58, sunrise 10.8, night 44); the shadow target tracked the player out to x = 44, outside the old box; the sun disc drops from y 76 at noon to y 17 at sunrise; moon opacity 0 by day and 0.92 at night; the torch halo is in the scene and flickering. Zero page errors. Same tower, same camera, three times of day: `after7-shadows-day.png`, `-golden.png`, `-sunset.png`.

## Round 8 (same day): the characters

Professor Block and the others anchor every lesson, and they were still a tapered cylinder, a sphere and two dots, which read crude against the world around them.

**Every character has been staring blankly, and no test could see it.** The pupil sphere sat at z 0.27 with radius 0.032 and the eye white at z 0.255 with radius 0.055. The centres are 0.015 apart, and 0.015 + 0.032 is less than 0.055, so the pupil was entirely inside the white sphere and could never be drawn. The comment above it claimed the opposite, so this was a fix that never landed. Both spheres were present and correctly parented in the scene graph, which is why nothing caught it. The pupil now stands 0.022 proud of the white, and the arithmetic that decides visibility is pinned: the pupil must break the white's front surface, must not be containable inside it at any radii, and both spheres must clear the skull.

**Arms.** Each hangs from an Object3D pivot at the shoulder, so rotating it swings the arm from the shoulder rather than about its own middle. They are children of the body, so the existing turn-to-face and idle wander carry them for free. They swing out of phase with each other while walking, and go up when a character celebrates a right answer.

**A mouth**, a flattened dark oval under the eyes: enough to read as a face across a lesson without giving the character an expression the dialogue has not earned.

**Blinking.** Each character has its own period and offset from a seed, so a room full of them never blinks in unison. The rhythm is a pure function, pinned for range, rate, determinism and independence. Blinking and arm swing both stop under reduced motion and battery saver, where the existing bob is already still.

**A leak fixed on the way.** Character teardown disposed a flat list of body, head and sprites. Eyes, mouth and arms are children, so their geometry and materials survived every lesson change. Disposal now traverses, which the probe confirms: twelve geometry disposals across four characters, exactly body plus two arms each.

Probe (`scratch/geometry-world-visuals-2026-09-07/probe-round8.mjs`): arms are body children hanging below their pivots and casting shadows; the mouth is on the head; all four characters blink and never at the same instant; arms swing over time and rise from 0.16 to 1.37 radians when celebrating; a lesson change leaves zero characters and disposes everything. Zero page errors.

## Round 9 (same day): the build loop

Placing and breaking is the core activity, so the preview and the debris are what a student looks at most.

**The placement preview reads as a cell.** It was a mesh with `wireframe: true`, which draws every triangle edge, so the cube preview carried a diagonal across each face and read as a triangulated blob rather than the cell about to be filled. It is now a soft translucent fill carrying the volume plus an edge outline carrying the shape: twelve clean edges for a cube, and the true silhouette for the slabs and wedges. The outline pulses with the fill. Both are disposed by traversing, since the outline is a child and a flat dispose would have leaked it exactly as the character parts did.

**Break debris tumbles.** Shards flew with their axes fixed, which reads as sprites sliding through the air. Each now carries a per-axis spin, so a broken block scatters as rubble. The probe confirms all ten shards get a spin and all ten rotate within 250 ms.

Worth recording, because it nearly cost a wrong fix: the preview looked enormous in a first diagnostic capture, spanning much of the frame. Its bounding box was exactly one cell. The camera in that probe simply stood 1.5 units away, and a unit cube at that range fills a 75-degree view. Tinting it settled it. A second probe froze a material property the frame loop writes, which threw inside the loop; the tool caught it, stopped the loop and showed its recovery panel, which is the designed behaviour working.

## Round 10 (same day): the measurement overlay

Pressing M on a structure is the pedagogical core: layer glows reveal bottom to top, then L, W and H lines and labels build up in sequence, then the volume and its bounding box. The mechanics were sound. Two things were not.

**Labels were washed out.** The dimension label sprites were painted in sRGB and never tagged, so the dark pill and the coloured L, W and H text were gamma-encoded twice and reached the screen as a faded pastel, the same defect the character labels had before round 6. They are now tagged sRGB, the pill is denser, and the coloured text carries a light outline so red, green and blue stay legible over any block colour or glow layer.

**The placement ghost competed with the measurement.** The preview cell sits in front of whatever the crosshair touches, which during a measurement is the measured structure itself, so a large translucent box stood between the student and the layer glows. While dimension lines are on screen the ghost now keeps only a faint outline and the hover glow drops to a third, and both return to full strength the moment the measurement clears.

Captures: `before-box-measure.png` and `after-box2-measure.png` on the same 3 by 2 by 2 brick box, plus `before-measure.png` where the crosshair caught the floor and the tool correctly measured all 29 by 29 by 1 of it.

## Round 11 (same day): the layer explorer

After a measurement, the Layer Explorer slider reveals a structure one layer at a time so a student can see that volume is layers of a base. Hidden layers simply vanished: revealing "through layer 1" of a 3 by 3 by 3 cube left one red slab and lost sight of the other eighteen cells and of the prism's height, with only the coloured glow slabs hinting at what was there.

Each hidden block now leaves a faint edge outline at its own cell. The revealed layers read solid, the rest read as the frame they fill, and every cell is still there to be counted. The hidden layers' glow slabs soften to a tint so the outlines are what the eye reads. Outlines are rebuilt from scratch on every slider change, share one material, and are dropped on reset, on a lesson change and on teardown.

Probe (`scratch/geometry-world-visuals-2026-09-07/probe-round11-layers.mjs`): a 3 by 3 by 3 measured and revealed through layer 1 gives 18 outlines, hidden glows at 0.07 and shown at 0.22; reset leaves 0 outlines with the top block visible again. Zero page errors. Captures: `before-layer1.png`, `after2-layer1.png`.

## Round 12 (same day): the lesson-complete moment

When the last question is answered the sky runs from day through golden hour to night, stars come out, confetti bursts and a "Lesson Complete" message floats up. Two things were wrong with the message and one with the confetti.

**The message was pinned to a fixed point in the world**, (10, 12, 10). For a lesson built around the origin that is roughly overhead; for one laid out at x = 40 it is forty units away and never on screen, which the before capture shows: nothing. It now hangs seven units ahead of wherever the player is looking, a little above eye level, and bobs gently there.

**It was bare text on nothing, untagged.** Drawn at 512 px with no backing and no sRGB tag, it read as faint pastel over whatever sky was behind it. It is now a 1024 px card on a dark ground with an amber border, tagged sRGB, rendered on top.

**Confetti slid instead of fluttering.** Cubes flew with fixed axes; they are now flat flakes with a per-axis spin, forty of them, using the same tumble the break debris got in round 9.

Probe (`scratch/geometry-world-visuals-2026-09-07/probe-round12-complete.mjs`): after triggering completion with the player standing at x = 40, the card sits 7 units ahead and 1.3 above the camera, 1024 px wide, sRGB-tagged, fading in. Zero page errors. Captures: `before-complete.png`, `after2-complete.png`.

## Round 13 (same day): dimension bars and character prompts

**L, W and H are bars now.** They were one-pixel lines: WebGL ignores line width, so at any distance each edge was a single pixel and it vanished under the layer glow. Each is now a thin box spanning its edge with a small cap at either end, drawn on top, in the same red, blue and green as its label. They read from across the lesson and through the glow.

**The "Press E" prompt and the "?" marker are crisp.** Both were tiny untagged canvases, 128 by 48 and 64 by 64, so the prompt was soft at any distance and its violet read as lilac, and the marker blurred up close. Both are drawn at 2x and tagged sRGB, the prompt with a light border and the mark with a dark outline so it holds against a bright sky.

Captures: `r13-measure.png` (bars through the glow) and `r13-aimed-desktop.png` (prompt and name plate over Professor Block).

## Round 14 (same day): the sky

**Clouds have shape and depth.** They were one sheet of evenly scattered soft blobs, which reads as haze rather than weather. Each cloud is now a cluster of overlapping puffs, wider than it is deep and denser along its base, so it carries a cumulus silhouette. There are two sheets: a low one at 40 units and a larger, fainter one at 62 drifting about a third as fast. The parallax between them is what gives the sky depth instead of a single flat ceiling.

**Clouds take the colour of the sky.** White clouds over an orange sunset read as a compositing mistake. Both sheets now tint from the fog colour each frame. The amount of white kept matters and took a correction: at 45 per cent white the sunset clouds tinted so close to the sky that they vanished, so they now keep 72 per cent and stay clearly brighter than the sky they hang in, which is also how a lit cloud actually behaves.

**Stars have depth and twinkle.** The field was 400 identical white points. `PointsMaterial` has one size for every point, so depth costs a second layer rather than a custom shader: 70 larger, warmer stars now ride as a child of the 400 smaller, cooler ones, inheriting the parent's slow rotation, fade and disposal. The bright layer breathes gently around the faint layer's level, slow enough to read as air rather than a flicker, and steady under reduced motion.

**A leak fixed on the way.** The cloud plane was removed from the scene at teardown but never disposed, and the star field disposed only its own geometry and material. Both now dispose properly, including textures and the new layers.

Probe (`scratch/geometry-world-visuals-2026-09-07/probe-round14-sky.mjs`): two sheets at 40 and 62, both following the camera, the low one drifting more than 1.5 times faster; sunset cloud tint `#f5d2ca` against fog `#db6042`; 400 faint stars at size 0.22 with 70 bright at 0.46, twinkling and rotating. Zero page errors. Captures: `sky2-clouds-day.png`, `sky2-clouds-sunset.png`, `sky-stars-night.png`.

## Round 15 (same day): the compass strip was drawn outside the world

The NPC compass strip is this tool's main wayfinding affordance: a pill at the top of the view with a pip per character showing who is where relative to your facing, red squares for unanswered and green circles for answered. It was rendering perfectly and almost nobody would ever have seen it.

The canvas is absolutely positioned with `top: 12px`, but its offset parent is the whole workspace, which starts at the toolbar. Measured in the browser: the strip sat at y 12 to 44 while the 3D viewport starts at y 61. The entire strip was inside the dark header, beside the lesson title, where its dark navy pill is nearly invisible against the header's own navy. The pixels confirmed it was drawing all along, 8120 opaque pixels and 423 red pip pixels, just not where anyone looks.

It now measures the viewport's offset from the workspace and places itself twelve pixels inside the top of the play area, with a resize observer and a window listener that both come down with the canvas. A hard-coded toolbar height would have broken the moment the toolbar wraps on a narrow screen. After the fix the strip sits at y 72 against a viewport top of 61.

**A north tick came with it.** With every character behind the player the strip drew only two edge arrows, which is exactly the moment someone lost looks at it. A small north marker now rides the same scale as the pips, so the strip always says something.

Probe (`scratch/geometry-world-visuals-2026-09-07/probe-round15-compass.mjs`) and capture `compass-after.png`.

## Addendum: WebGL e2e result

`npx playwright test tests/e2e/18-geometry-world-gl.spec.ts` against the working tree: **17 passed, 0 failed** in 9.8 minutes under SwiftShader, including the pixel-difference, block fidelity, STL winding and teardown checks.

Round 5 run of the same spec: **14 passed, 3 flaky (passed on retry)** in 14.7 minutes while another session had a browser suite running (13 Chromium processes alive before the run). The three, "starting a lesson leaves ONE canvas", "W walks the player forward" and "slab or wedge preflight", were then re-run unchanged twice each with retries off: **6 passed** in 2.1 minutes. The flakes were load, not the code.

Round 6 run of the same spec: **16 passed, 1 failed**. The failure was the sprite census pin "the sun is the only sprite a character-free world carries"; the moon is now a second permanent sky sprite, so the pin moved to two with the reason inline, and the test passed on re-run (12.8 s, retries off). No other test changed.

Round 7 run of the same spec: **14 passed, 2 failed, 1 flaky** in 17.8 minutes, against a usual 6 to 10, with 15 Chromium processes from another session competing for the machine. Both failures were mount timeouts waiting for the canvas, not assertion failures, and neither test touches anything this round changed. Re-run unchanged with retries off on a quieter machine: "rotating a wedge keeps it in its own cell" passed 1/1 and "Q actually changes the shape of the block that gets placed" passed 3/3. A clean full-spec run was not possible while the other suite held the machine, so this is reported as measured rather than as a green run.

Round 8 run of the same spec: **17 passed, 0 failed, 0 flaky** in 8.0 minutes on a quiet machine, with no retries. This also retroactively clears the round 7 report above: the same tests that timed out under the competing suite all pass here.

Round 9 run of the same spec: **17 passed, 0 failed, 0 flaky** in 7.2 minutes, no retries.

Round 10 run of the same spec: **17 passed, 0 failed, 0 flaky** in 4.4 minutes on a quiet machine, no retries. The five tests covering the ghost, building and teardown had already passed 5/5 under load.

Round 11 verification at commit time: 307 unit tests, and the five e2e tests covering lesson reset, building and teardown passed 5/5 with retries off under a competing browser suite. The full spec was queued for a quiet machine; its result is recorded below when it lands.

Round 12 verification at commit time: 309 unit tests, and the four e2e tests covering lesson change, the sprite census and teardown passed 4/4 with retries off under a competing browser suite. The queued full spec will run against this tree.

Full spec for the tree carrying rounds 11 and 12, run under a competing suite after a 20-minute wait for quiet that never came: **17 passed, 0 failed, 0 flaky** in 6.7 minutes.

Round 13 verification at commit time: 311 unit tests, and the four e2e tests covering mount, characters, the sprite census and teardown passed 4/4 with retries off. The full spec is queued for a quiet machine.

Round 14 verification at commit time: 315 unit tests, and five e2e tests covering mount, lesson change, repeated remounts and teardown passed 5/5 with retries off against 52 competing browser processes.

Full spec for the tree carrying round 13, run under 38 competing browser processes: **17 passed, 0 failed, 0 flaky** in 9.1 minutes.

Round 15 verification at commit time: 317 unit tests, and four e2e tests including the HUD-layout preset sweep passed 4/4 with retries off.
