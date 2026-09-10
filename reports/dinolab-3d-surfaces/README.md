# Dino Lab: skin and face refinement

2026-09-10 · Local implementation.

This pass improves the surface detail and close-up readability of the 3D animals.

- Skin color, relief, and roughness use shared specimen coordinates across the head, trunk, neck, limbs, and tail. The pattern stays attached when the animal rotates, and its scale remains consistent across separate meshes.
- Directional shading replaces the texture's repeated vertical gradient. Existing pigment-profile colors, light undersides, and banding are retained.
- Surface relief is more restrained. The shader reuses height samples for its screen derivatives.
- Herbivore heads and their snouts form one continuous surface. Sauropod neck tips taper into the smaller head.
- Eyes, highlights, eyelids, nostrils, lips, and lower jaws scale with head dimensions. Ray intersections seat the eyes, nostrils, and mouth line on the actual head surface.
- Beaks have short, shaped surfaces proportional to the head. Tyrannosaur brow accents leave the eyes exposed, and rounded snout tips remove visible flat end caps.

The animals remain procedural teaching reconstructions. Fine contours and soft tissues are modeling choices.

## Visual review

| Animal | Whole animal | Detail |
| --- | --- | --- |
| Brachiosaurus | [Life view](brachiosaurus-life.png) | [Head study](brachiosaurus-head.png), [mobile](brachiosaurus-mobile.png) |
| Stegosaurus | [Life view](stegosaurus-life.png) | [Head study](stegosaurus-head.png) |
| Tyrannosaurus | [Life view](tyrannosaurus-life.png) | [Head study](tyrannosaurus-head.png) |
| Triceratops | [Life view](triceratops-life.png) | |
| Microraptor | [Life view](microraptor-life.png) | |
| Spinosaurus | [Life view](spinosaurus-life.png) | |
| Psittacosaurus | [Life view](psittacosaurus-life.png) | |
| Sinosauropteryx | [Life view](sinosauropteryx-life.png) | |

Head studies use a close-up test camera to expose details that are small in the whole-animal view. The camera controls displayed in those captures retain the underlying whole-animal readout.

## Validation

- 127 focused unit and interaction tests passed, followed by targeted reruns after the visual corrections.
- 10 distinct browser tests passed: eight species and the existing catalog/notebook workflows.
- New browser checks cover shader compilation, finite skin coordinates on every mapped mesh, proportional eyes and unobstructed eye surfaces, complete framing, stable texture coordinates after rotation, life/fossil switching, and mobile reflow.
- Two new geometry tests verify coordinate agreement between separate meshes and normalized skin normals after rotation and nonuniform scaling.
- The canonical, public, and existing app-build renderer copies have matching SHA-256 hashes.
- JavaScript syntax and scoped whitespace checks passed.
- Screenshots were reviewed using real Three.js r128 rendering in Chromium with software WebGL and reduced motion. Hardware performance was not benchmarked.
- No deployment or push was performed by this task.

See [validation.json](validation.json) and the saved test logs for results.

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-surfaces.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-surfaces/acceptance
~~~
