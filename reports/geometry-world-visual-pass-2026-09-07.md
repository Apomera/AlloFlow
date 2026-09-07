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

## Addendum: WebGL e2e result

`npx playwright test tests/e2e/18-geometry-world-gl.spec.ts` against the working tree: **17 passed, 0 failed** in 9.8 minutes under SwiftShader, including the pixel-difference, block fidelity, STL winding and teardown checks.

Round 5 run of the same spec: **14 passed, 3 flaky (passed on retry)** in 14.7 minutes while another session had a browser suite running (13 Chromium processes alive before the run). The three, "starting a lesson leaves ONE canvas", "W walks the player forward" and "slab or wedge preflight", were then re-run unchanged twice each with retries off: **6 passed** in 2.1 minutes. The flakes were load, not the code.
