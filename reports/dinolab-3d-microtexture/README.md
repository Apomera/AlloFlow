# Dino Lab: coherent surface microtexture

2026-09-12 · Local implementation.

The 3D reconstructions now use fine scale relief or a subtler grain according to the active surface hypothesis. Feathered surfaces no longer carry the repeated curved marks from the previous skin tile. Color, bump height and roughness now come from the same seeded surface pattern, so visible detail and its shading agree.

The maps meet at their tile boundaries, regenerate consistently for each species and retain the base pigment palette. Existing specimen-space mapping keeps the pattern stable through camera rotation. The skin maps use mipmap filtering and are created only when the body surface is visible.

## Visual comparisons

| Surface | Before | After |
| --- | --- | --- |
| Anchiornis face | [Previous head](../dinolab-3d-cranial/anchiornis-head.png) | [Head](anchiornis-head.png), [body](anchiornis-body.png), [mobile](anchiornis-mobile.png) |
| T. rex skin | [Previous head](../dinolab-3d-cranial/tyrannosaurus-head.png) | [Head](tyrannosaurus-head.png), [body](tyrannosaurus-body.png), [mobile](tyrannosaurus-mobile.png) |
| Triceratops skin | [Previous head](../dinolab-3d-cranial/triceratops-head.png) | [Head](triceratops-head.png), [body](triceratops-body.png) |

Additional captures: [Sinosauropteryx head](sinosauropteryx-head.png) and [tail](sinosauropteryx-tail.png), [Microraptor head](microraptor-head.png) and [tail](microraptor-tail.png), [Brachiosaurus head](brachiosaurus-head.png) and [body](brachiosaurus-body.png).

Texture atlases show color, height and roughness from left to right: [fine grain](anchiornis-maps.png), [fine scales](tyrannosaurus-maps.png).

## Validation

- **141 focused checks passed across eight files:** [38 texture, regional-color and geometry checks](texture-passed-results.txt), [102 snapshot, plumage, cranial-surface and study checks](regression-results.txt), and [one camera/accessibility source-contract check](accessibility-results.txt). The other 14 accessibility tests were not rerun for this material-only change.
- **15 distinct browser scenarios passed:** the [first two](first-browser-results.txt) and [remaining four](browser-results.txt) new microtexture scenarios, plus [nine existing regional-color scenarios](regional-browser-results.txt).
- New browser checks cover six species, head/body/tail close-ups, two phone layouts, exact texture-edge matching, color/data encodings, mipmaps, stable texture and mapping hashes through camera rotation, and disposal/recreation of the three skin maps during fossil/life switching.
- Existing browser checks cover six species, evidence palettes, the Anchiornis crest, body-opacity controls, life/fossil switching, mobile framing, moving-tail color stability and two historical reconstructions. The combined browser coverage includes seven species.
- No shader failures or lost WebGL contexts were detected. Source syntax, scoped whitespace, report links and canonical/public/existing app-build byte parity passed. See [validation details](validation.json).

The eight new helper tests cover exact tile-edge agreement, deterministic seeds, restrained pigment changes, aligned height/roughness, bounded relief, gentler grain and independence from pigment choice. The first run exposed weaker alignment between grain height and roughness; the roughness grain was corrected and all checks passed. The [initial results](texture-results.txt) are retained.

The existing color probe now reads the actual texture dimensions, and its output directory can be set with DINOLAB_REPORT_DIR. This keeps future resolution changes covered and preserves previous visual reports.

## Resource cost and scope

The three 512 × 256 maps use 393,216 base texels, down from 622,592: **36.8% fewer base texture pixels**. No meshes were added. This comparison excludes mip levels, driver overhead and other scene textures; it is not a measured frame-rate improvement. See [texture budget](texture-budget.json).

Rendering was checked with local Three.js r128 and Chromium software WebGL. Hardware performance and the packaged Desktop app were not tested. The texture is an illustrative surface treatment controlled by the existing reconstruction profiles; this pass does not add fossil evidence or revise anatomical geometry.

No deployment or push was performed.

## Reproduce

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_microtexture.test.js tests/dinolab_3d_regional_color.test.js tests/dinolab_3d_geometry.test.js tests/dino_lab_golden.test.js tests/dinolab_3d_plumage.test.js tests/dinolab_3d_cranial.test.js tests/dinolab_3d_studies.test.js --maxWorkers=1 --testTimeout=60000
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_accessibility.test.js --maxWorkers=1 --testTimeout=60000 -t "supports focused keyboard rotation with live status and cleanup"
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-microtexture.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-microtexture/acceptance
$env:DINOLAB_REPORT_DIR='reports/dinolab-3d-microtexture/regional-regression'
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-regional-color.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-microtexture/regional-acceptance
~~~
