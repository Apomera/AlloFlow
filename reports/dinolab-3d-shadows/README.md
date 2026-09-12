# Dino Lab: specimen-scaled shadows

2026-09-12 · Local implementation.

Small specimens now cast readable ground shadows. The directional shadow camera fits the animal's complete orbit and its shadow on the floor, with padding for idle motion. The human reference and habitat scenery are included when shown.

The studio's soft grounding patch follows the specimen's size, sits just above the floor, and rotates with the model. Habitat scenes use their actual shadow receivers.

For Anchiornis at the same 1,024 × 1,024 shadow-map resolution, coverage changes from about **23.4 mm to 0.80 mm per texel**. The grounding patch is about **33 cm wide**, down from the old 5.5 m minimum. This improves the use of the existing shadow map without adding a rendering pass or raising its resolution.

The depth and normal offsets scale with the scene and shadow texels. The [Three.js LightShadow documentation](https://threejs.org/docs/pages/LightShadow.html) describes these offsets and the tradeoff between reducing surface artifacts and distorting shadows. This implementation is checked against the local Three.js r128 runtime.

## Visual review

| Specimen | Before | After |
| --- | --- | --- |
| Anchiornis | [Previous lighting](../dinolab-3d-regional-color/anchiornis-life.png) | [Life view](anchiornis-life.png), [mobile](anchiornis-mobile.png), [fossil view](anchiornis-fossil.png) |
| T. rex | [Previous lighting](../dinolab-3d-regional-color/tyrannosaurus-life.png) | [Life view](tyrannosaurus-life.png) |
| Sinosauropteryx | [Previous lighting](../dinolab-3d-regional-color/sinosauropteryx-life.png) | [Life view](sinosauropteryx-life.png) |
| Brachiosaurus | [Previous lighting](../dinolab-3d-regional-color/brachiosaurus-life.png) | [Life view](brachiosaurus-life.png) |
| Additional coverage | | [Triceratops](triceratops-life.png), [Argentinosaurus](argentinosaurus-life.png), [habitat with human reference](anchiornis-habitat.png) |

## Validation

- **174 distinct focused tests passed across nine files:** [geometry](geometry-results.txt), [final shadow math](shadow-results.txt), [regressions](regression-results.txt), and [accessibility](accessibility-results.txt).
- **10 distinct browser scenarios passed:** [final small/large visual checks](bias-results.txt), [remaining species and field-guide checks](browser-results.txt), and the [strengthened live-motion recheck](motion-results.txt).
- All six life-view specimens produced measurable ground-shadow pixels; sampled caster and floor-projection vertices stayed inside the shadow camera. The fitted matrix remained unchanged through rotation and verified tail motion.
- JavaScript syntax and scoped whitespace passed. The canonical, public, and existing app-build renderer copies match. See [validation details](validation.json).

Fourteen new unit tests check complete orbit coverage, ground projection at different light angles, three size scales, resolution-dependent offsets, repeatable fitting, distant habitat casters, and empty bounds.

Browser checks sample caster vertices and their ground projections against the light camera, check rotation without changes to the shadow matrix, and measure actual shadow pixels on the ground. The pixel check hides the animal only after caching its shadow, disables the decorative grounding patch, and compares shadow-receiving and non-receiving ground renders. It therefore measures the rendered directional shadow independently of the patch.

The first pixel comparison used an ineffective global-shadow toggle. The test was corrected to compare the receiver state, producing measurable shadow pixels. A keyboard selector was also corrected before final acceptance. Visual review then found faint surface striping on the first large-specimen render; the final offsets were tuned and rechecked.

All rendering is local Chromium with software WebGL. Hardware performance was not benchmarked. This pass changes presentation; it adds no anatomical or scientific evidence claims.

No deployment or push was performed.

## Reproduce the focused checks

```powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js tests/dinolab_3d_attachments.test.js tests/dinolab_3d_plumage.test.js tests/dinolab_3d_regional_color.test.js tests/dinolab_3d_shadows.test.js --maxWorkers=1 --testTimeout=30000
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_accessibility.test.js --maxWorkers=1 --testTimeout=60000
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-shadows.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-shadows/acceptance
```
