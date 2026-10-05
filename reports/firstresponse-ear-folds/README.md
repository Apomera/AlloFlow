# First Response Lab: inner ear folds

Validated on October 5, 2026, against parent `7a776b356df7b03c05dde299ac0a67c46bb7d63f` on `codex/firstresponse-ear-folds`.

The manikin's inner ear ridges now widen gently along their curves and taper into the ear at both ends. Closed surfaces and continuous normals give them a smoother skin contour. Both ears retain their original curves, materials and attachment to the moving head across adult, child and infant models.

Each fold uses 2,145 vertices and 3,968 outward triangles. Curve frames are shared across each mesh ring: construction needs 198 curve point calculations instead of 12,870 per mannequin build. Independent comparisons confirmed identical geometry, materials and transforms before and after this optimization in six age/pose scenes. Animation frames add no fold curve calculations.

## Validation

- **353 unit cases passed across eight suites**, including 21 new ear cases for closed topology, normal continuity, actual ear-surface fit, taper, rim separation, age scaling, recovery attachment and contrast.
- **Two native browser cases passed with zero retries.** They cover all three ages before and after recovery, plus keyboard inspection, learner state, accessibility, spacing, forced colors, app contrast and WebGL cleanup on a 320-pixel phone view.
- **Eight captures were visually reviewed.** All 17 face features remain framed. Ear folds keep their local shape and material while their ear groups move with the head. All 40 frozen unit/browser inputs match.
- **The native geometry audit passed:** 12 closed outward fold shells, 768 buried joins checked against actual ear triangles, 12 retained curves, six unchanged skulls, 30 unchanged body/head/ear matrices and 132 unchanged facial detail meshes. Production bytes outside the ear fold block match the parent. Picking and teaching content remain intact.

The initial full unit process stopped with a V8 memory allocation failure before producing a test summary. Its log, exit record and 40-input manifest are retained. The complete final rerun passed with all assertions unchanged. The construction optimization preserves the exact earlier geometry; it does not establish the cause of the memory failure.

Native construction probes also caught triangle/normal disagreement near a tight curve bend. Aligning the mesh rings with the curve corrected it. Both probes, the before-cache geometry audit and the exact uncached source baseline are retained. The shared viewer audit passed with the current Beehive and Perception changes preserved.

Browser checks use Chromium WebGL with ANGLE SwiftShader. Hardware performance remains unmeasured. `validation.json` records outcomes, input hashes, geometry checks and capture hashes.

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_ear_folds.test.js tests/firstresponse_brow_surfaces.test.js tests/firstresponse_nose_surfaces.test.js tests/firstresponse_eyelid_surfaces.test.js tests/firstresponse_lip_surfaces.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-ear-folds.spec.ts --config reports/firstresponse-ear-folds/playwright.config.ts --workers=1
```

## Reviewed captures

| View | Before recovery | After recovery |
| --- | --- | --- |
| Adult | [Capture](adult-ear-folds-before-recovery.png) | [Capture](adult-ear-folds-after-recovery.png) |
| Child | [Capture](child-ear-folds-before-recovery.png) | [Capture](child-ear-folds-after-recovery.png) |
| Infant | [Capture](infant-ear-folds-before-recovery.png) | [Capture](infant-ear-folds-after-recovery.png) |

[Phone inspection](phone-ear-folds.png) · [Phone app contrast](phone-ear-folds-app-contrast.png)
