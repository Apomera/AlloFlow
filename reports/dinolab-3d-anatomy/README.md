# Dino Lab: anatomical surface refinement

2026-09-10 · Local implementation, not deployed.

This pass improves the defining features of the 3D reconstructions.

- Feathers now have curved, asymmetric vanes and attached shafts that move together from the root.
- Stegosaur models use broad, beveled plates in alternating rows. Tail spikes are visible in both life and fossil views.
- The Spinosaurus sail is a continuous surface with corresponding fossil supports. Baryonyx is kept free of a tall sail in both views.
- Ceratopsian frills use swept, scalloped surfaces. Their life and fossil versions share the same construction.
- Theropod knees bend forward with the ankle behind the knee. Short-headed herbivores and sauropods have shorter snouts; large tyrannosaur heads have more depth.
- Microraptor has narrow terminal tail feathers alongside its forelimb and hindlimb feathers. The narrow terminal pair and dark iridescent palette follow the [American Museum of Natural History's description](https://www.amnh.org/explore/news-blogs/microraptor-black-iridescent-feathers).

The models remain diagrammatic reconstructions. The rendered plate count and precise contours are modeling choices, not specimen measurements. Existing evidence and uncertainty descriptions remain available.

## Images

| Feature | Review images |
| --- | --- |
| Broad plates and short head | [Stegosaurus life view](stegosaurus-life.png), [fossil view](stegosaurus-fossil.png), [mobile](stegosaurus-mobile.png) |
| Continuous sail and supports | [Spinosaurus life view](spinosaurus-life.png), [fossil view](spinosaurus-fossil.png) |
| Species without a tall sail | [Baryonyx](baryonyx-life.png) |
| Swept frill | [Triceratops side](triceratops-life.png), [front](triceratops-front.png) |
| Feather vanes and tail | [Microraptor side](microraptor-life.png), [overhead](microraptor-overhead.png) |
| Skull and leg proportions | [T. rex](tyrannosaurus-life.png) |
| Sauropod head proportions | [Brachiosaurus](brachiosaurus-life.png) |

## Validation

- 125 focused unit and interaction tests passed. Nine new mesh checks exercise curved feathers, plate thickness and continuous membranes at three scales.
- 9 browser tests passed across two acceptance runs: seven anatomical reconstructions and the existing catalog/notebook workflows.
- Checked feature counts, alternating plate rows, life/fossil feature parity, negative sail cases, finite projected geometry, complete camera framing, front and overhead views, mobile reflow, and WebGL/browser error state.
- Canonical, public, and existing app-build modules have identical SHA-256 hashes. Syntax and scoped whitespace checks passed.
- Screenshots were reviewed from real Three.js r128 rendering in Chromium with software WebGL. Reduced motion stabilizes the captures; these checks are not a hardware performance benchmark.

Run:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-anatomy.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-anatomy/browser-results
~~~
