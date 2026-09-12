# Dino Lab: connected surface details

2026-09-12 · Local implementation.

This pass improves neck joins and keeps surface details connected to the animal.

- Neck tips now taper within the head surface across small and large species. Neck breathing no longer stretches the head attachment along the animal's length.
- Raised scales are projected onto the rendered torso and aligned with its surface normals. They use the same skin texture and pigment mapping as the body.
- Coat filaments and dorsal tail bristles start at the actual skin surface. They rotate around their roots and follow their parent body's breathing or tail motion.
- Microraptor's terminal tail feathers follow the tail.
- Filament palette colors are converted from sRGB to the linear colors used by lighting.

The models remain procedural teaching reconstructions. These changes address visible joins and attachment behavior; they do not turn the models into specimen scans.

## Visual review

| Detail | Earlier capture | Updated capture |
| --- | --- | --- |
| Small head and neck join | [Sinosauropteryx before](../dinolab-3d-surfaces/sinosauropteryx-life.png) | [Whole animal](sinosauropteryx-life.png), [head study](sinosauropteryx-head.png) |
| Scales seated on skin | [Brachiosaurus before](../dinolab-3d-surfaces/brachiosaurus-life.png) | [Whole animal](brachiosaurus-life.png), [head study](brachiosaurus-head.png), [mobile](brachiosaurus-mobile.png) |
| Plated animal | [Stegosaurus before](../dinolab-3d-surfaces/stegosaurus-life.png) | [Stegosaurus](stegosaurus-life.png) |
| Feathered animal | [Microraptor before](../dinolab-3d-surfaces/microraptor-life.png) | [Life view](microraptor-life.png), [animated pose](microraptor-motion.png) |
| Dorsal tail bristles | [Psittacosaurus before](../dinolab-3d-surfaces/psittacosaurus-life.png) | [Psittacosaurus](psittacosaurus-life.png) |
| Large theropod | [T. rex before](../dinolab-3d-surfaces/tyrannosaurus-life.png) | [T. rex](tyrannosaurus-life.png) |

Head studies use a close-up test camera; the controls displayed in those captures retain the underlying whole-animal readout.

## Validation

- 135 focused unit and interaction tests passed across six files.
- All nine browser tests passed: six species, live attachment motion, and two catalog/notebook workflows.
- Canonical, public, and existing app-build modules match. JavaScript syntax and scoped whitespace checks passed.
- Eight new geometry tests cover surface hits, outward normals, missed rays, and root attachment during parent rotation and nonuniform scaling at three sizes.
- Browser checks test all 24 neck-rim vertices for containment within the head, scale/root offsets, attachment ownership, eye clearance, finite geometry, shader compilation, camera framing, life/fossil switching, and mobile reflow.
- A controlled animation test verifies that breathing and tail motion change while attachment roots remain seated.
- Existing catalog and notebook workflows are checked alongside the rendering suite.
- Screenshots use Three.js r128 in Chromium with software WebGL. Still captures use reduced motion; the motion test enables animation and samples two clock times. Hardware performance was not benchmarked.

See [validation.json](validation.json) and the saved test logs for final results.

No deployment or push was performed by this task.

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js tests/dinolab_3d_attachments.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-attachments.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-attachments/acceptance
~~~
