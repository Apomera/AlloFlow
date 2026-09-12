# Dino Lab: regional color and feather crest

2026-09-12 · Local implementation.

This pass makes the color pattern follow the anatomical region it describes.

- Anchiornis has a grey body with a surface-seated reddish feather crest. Pale, dark-tipped wing feathers remain on the limbs, and broad wing bands no longer repeat across the head, neck, torso or tail.
- Sinosauropteryx has ginger-and-white tail rings. The band coordinates follow the tail loft rather than repeating across the shared body texture. The rings keep their position as the tail moves.
- Other species retain their existing palettes. The classic reconstruction omits these evidence-palette features.
- The crest responds to inference opacity, disappears in the fossil-only view, and remains included in whole-animal camera fitting.

The regional placement follows the Anchiornis plumage reconstruction in [Li et al. (2010), Science](https://prumlab.yale.edu/sites/default/files/li_et_al_2010_plumage.pdf) and the Sinosauropteryx tail-color findings described by the [University of Bristol research team](https://www.bristol.ac.uk/news/2010/6806.html). Countershading is also consistent with [Smithwick and colleagues' later study](https://www.bristol.ac.uk/news/2017/october/feathered-dinosaur-camouflage.html). These are simplified procedural illustrations: the exact shades, crest dimensions and ring spacing are display choices, not measurements from a fossil scan.

## Visual review

| Study | Before | After |
| --- | --- | --- |
| Anchiornis body and crest | [Previous banded body](../dinolab-3d-plumage/anchiornis-life.png) | [Life view](anchiornis-life.png), [head study](anchiornis-head.png), [mobile](anchiornis-mobile.png) |
| Sinosauropteryx tail bands | [Previous shared skin pattern](../dinolab-3d-plumage/sinosauropteryx-life.png) | [Life view](sinosauropteryx-life.png), [mobile](sinosauropteryx-mobile.png) |
| Other pigment palettes | | [Microraptor](microraptor-life.png), [Psittacosaurus](psittacosaurus-life.png) |
| Other model proportions | | [T. rex](tyrannosaurus-life.png), [Brachiosaurus](brachiosaurus-life.png) |

The head study uses a close-up camera in the test harness; its on-screen readout retains the underlying whole-animal setting.

## Validation

- **160 focused tests passed across eight files:** 145 in the [initial run](unit-results.txt), plus 15 in the [isolated accessibility rerun](accessibility-results.txt). The initial run encountered a worker-startup timeout before the accessibility suite could start; the isolated rerun passed.
- **11 browser scenarios passed**, including the existing field-guide scenarios. See the [browser results](browser-results.txt).
- JavaScript syntax, scoped whitespace, and parity across all three renderer copies passed. See [validation details](validation.json).

The browser checks exercise six species, life/fossil switching, mobile reflow, camera framing, shaders, eye clearance, crest attachment, opacity transitions, classic reconstructions, and live tail motion. Sampled body-texture variation checks guard against reintroducing broad stripes into the shared texture. All 1,227 tail vertices have tail-local pattern coordinates; other mapped surfaces have a zero region mask.

Eleven new unit tests cover ring continuity around curved tails at three scales, stable coordinates after rotation, unmarked body surfaces, UV-free geometry, and evidence/classic/neutral palette selection. Existing geometry, attachment, plumage, evidence data, accessibility and field-guide suites provide regression coverage.

Rendering uses the local Three.js r128 build and Chromium with software WebGL. Stills use reduced motion. Hardware performance was not benchmarked.

No deployment or push was performed.

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js tests/dinolab_3d_attachments.test.js tests/dinolab_3d_plumage.test.js tests/dinolab_3d_regional_color.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/vitest/vitest.mjs run tests/dinolab_3d_accessibility.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-regional-color.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-regional-color/acceptance
~~~
