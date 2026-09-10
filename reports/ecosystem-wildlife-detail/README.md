# Wildlife detail and movement

Open Ecosystem > Food web > Show 3D meadow. Choose a species, then Inspect selected group.

## Improvements

- Shared procedural coat textures add fine fur strokes and feather markings without external asset downloads.
- Owls have horizontal flight silhouettes, broad swept wings, individually tapered flight feathers, tail feathers, and subtle banking. Wings and feathers remain attached to the same articulation joints.
- Foxes have a narrower face, smaller eyes and ears, a more defined jaw, and a moving tail with an attached white tip.
- Rabbits have less rounded faces and darker coats. Rabbits and voles have articulated paws; rabbits also have a subtle lift during walking poses. Voles are smaller than rabbits, and animal representatives vary slightly in size.
- Close-up cameras move nearer to the selected animal, with closer framing for voles.
- Ground animals alternate smooth walking bouts with stationary foraging pauses. Poses are calculated from timeline time, so rewind reproduces the same placement. Reduced motion keeps the entire pose still.

These are illustrative representatives. Texture, proportions, and motion do not change biomass or ecological relationships. Display sizes are adjusted for visibility and are not a measurement scale. The renderer retains instanced forest scenery and disposes shared texture and shadow resources when closed.

Pause now blocks pending timeline ticks immediately, rather than waiting for effect cleanup. A browser regression check invokes a queued callback after pausing and verifies that the frame stays fixed.

## Review images

- [Clearing](clearing.jpg)
- [Rabbit](rabbits.jpg)
- [Vole](voles.jpg)
- [Fox](foxes.jpg)
- [Owl](owls.jpg)
- [Mobile inspection](mobile-inspection.jpg)

## Validation

All 19 focused model and pose checks passed. They cover bounded positions, dispersion, walking/rest continuity, orientation along the path, deterministic rewind, reduced motion, and the food-web calculations. All four final Chromium workflows passed in 1.3 minutes, including the explicit queued-tick Pause regression, all four animal close-ups, rewind, reduced motion, mobile layout, zero biomass, reopening, WebGL fallback, and context loss. Syntax and scoped diff checks passed, and the source and desktop copies match. The initial browser run caught the Pause issue; the final run includes its fix.

Source: `stem_lab/stem_tool_ecosystem.js` and its desktop public mirror. Coverage: `tests/ecosystem_natural_poses.test.js`, `tests/ecosystem_foodweb.test.js`, `tests/e2e/ecosystem-natural-detail.spec.ts`, and `tests/e2e/ecosystem-3d-meadow.spec.ts`.
