# Dino Lab: continuous facial surfaces

2026-09-12 · Local implementation.

Head close-ups now have a continuous cheek surface instead of two overlapping round cheek pieces. The head profile uses smoother curves and finer geometry so the skull and muzzle read more clearly from the side and front. Existing species proportions and cheek-profile differences still control the reconstruction; sauropods receive the smoother head profile without added cheek relief.

The eyes, nostrils, lips and crest are placed against the revised surface. The lower jaw is explicitly included in the head study bounds. Life/fossil switching and the anatomical study controls continue to work.

## Visual review

| View | Before | After |
| --- | --- | --- |
| T. rex head | [Previous head](../dinolab-3d-studies/tyrannosaurus-head.png) | [Updated head](tyrannosaurus-head.png), [side](tyrannosaurus-side.png), [front](tyrannosaurus-front.png) |
| Triceratops | [Previous head](../dinolab-3d-studies/triceratops-head.png) | [Updated head](triceratops-head.png), [front](triceratops-front.png) |
| Anchiornis | [Previous head](../dinolab-3d-studies/anchiornis-head.png) | [Updated head](anchiornis-head.png), [fossil view](anchiornis-fossil.png) |

Additional captures: [T. rex mobile](tyrannosaurus-mobile.png), [Sinosauropteryx](sinosauropteryx-head.png), [Microraptor](microraptor-head.png), [Parasaurolophus](parasaurolophus-head.png), [Brachiosaurus](brachiosaurus-head.png), and [Brachiosaurus fossil view](brachiosaurus-fossil.png).

## Validation

- **155 focused checks passed across nine files:** [34 geometry and study checks](geometry-results.txt), [120 existing snapshot, attachment, color, plumage and shadow checks](regression-results.txt), and [one camera/accessibility source-contract check](accessibility-passed-results.txt). The other 14 accessibility tests were not rerun for this geometry-only change.
- **Seven browser scenarios passed**, one for each captured species. All exercise head studies from front and side angles, finite geometry and skin coordinates, matching seam normals, eye clearance, camera framing and successful shader compilation. T. rex also covers a 390 px phone layout; Anchiornis and Brachiosaurus cover fossil/life switching with preserved head focus. See [browser results](browser-results.txt).
- No shader failures, invalid geometry, lost WebGL contexts or head-study bounds outside the camera view were detected in these scenarios.
- Source syntax, scoped whitespace and byte parity across canonical, public and existing app-build renderer copies passed. See [validation details](validation.json).

The nine new geometry tests check monotone interpolation without extra bulges, continuous slopes at profile stations, independent height/breadth curves, bounded and symmetric cheek relief at three scales, unchanged topology, finite unit normals, matched UV-seam normals and zero cheek displacement for sauropod profiles.

The first browser run exposed a numeric matcher error in the test, which was corrected before the passing seven-species run. One existing source assertion expected the previous mesh-helper signature; it was updated and passed its targeted recheck. The original logs are retained in [first browser results](first-browser-results.txt) and [source-contract results](accessibility-contract-results.txt); the latter omits the echoed renderer source.

## Geometry cost and scope

The smoother head has 5,840 triangles. Removing the previous two cheek meshes offsets most of that increase: animals that used those meshes gain 176 skin triangles overall and lose two cheek meshes plus two contour meshes. Sauropods previously had no cheek meshes, so their head surface gains 3,488 triangles. These are static geometry counts, not a frame-rate benchmark; see [geometry budget](geometry-budget.json).

Rendering was checked with the local Three.js r128 build and Chromium software WebGL. Hardware performance and the packaged Desktop app were not tested. This pass refines the external skin; it does not revise fossil skeleton construction, species evidence or scientific measurements.

No deployment or push was performed.

## Reproduce

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_cranial.test.js tests/dinolab_3d_geometry.test.js tests/dinolab_3d_studies.test.js tests/dino_lab_golden.test.js tests/dinolab_3d_attachments.test.js tests/dinolab_3d_regional_color.test.js tests/dinolab_3d_plumage.test.js tests/dinolab_3d_shadows.test.js --maxWorkers=1 --testTimeout=60000
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_accessibility.test.js --maxWorkers=1 --testTimeout=60000 -t "supports focused keyboard rotation with live status and cleanup"
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-cranial.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-cranial/acceptance
~~~
