# First Response Lab: outer ear contours

Validated on October 5, 2026, against parent `f372b1ec631922e8c583c42d1693fb6343ff67cc` on `codex/firstresponse-ear-rims`.

The manikin's outer ear rims now follow the ear surface with a gentler lower contour. Both edges sit just beneath the skin, while the ridge stays shallow and visible. The continuous loop and smooth normals reduce the raised ring appearance. Each rim retains its original curve, skin material and attachment to the moving head across adult, child and infant models.

Each rim uses a 64 × 16 closed torus mesh with 1,105 vertices and 2,048 outward triangles. Its loop seam reuses the same curve frame. The recent inner folds, other facial details and teaching behavior are retained.

## Validation

- **374 unit cases passed across nine suites, each run in a fresh process**, including 21 new rim cases for topology, normals, surface fit, seam continuity, lower-contour taper, inner-ear separation, recovery movement and contrast.
- **Two native browser cases passed with zero retries**, covering all three ages before and after recovery and a 320-pixel phone view with keyboard inspection, learner progress, spacing, forced colors, app contrast, accessibility and WebGL cleanup.
- **Eight captures were visually reviewed.** All 17 face features stay framed, and the rims retain their local shape while moving with the head. All 41 frozen inputs match between unit and browser runs.
- **The native audit passed:** 12 closed rim shells, 1,536 buried join samples, 768 front samples, 768 rear samples, 12 retained curves, six unchanged skulls, 30 unchanged body/head/ear matrices and 132 unchanged facial detail meshes. Production bytes outside the rim block match the parent.

The initial combined test process exited with Windows runtime code 3221225477 before producing a test summary. All suites then passed in fresh sequential processes with identical source, assertions, configuration and timeout flags. The original failure record and all nine suite logs, exit records and hashes are retained.

An initial transformed ray missed one exact triangle seam. Sampling the actual ear-base facets with a tiny barycentric edge tolerance preserves every sample. The 3,071 available native world-ray measurements agree with those facet measurements within 8.47 × 10⁻¹⁶ ear profile units. The diagnostic is retained; no production shape change or relaxed fit threshold was needed.

The shared viewer audit passed with the existing Beehive and Perception changes preserved. Browser evidence uses Chromium WebGL with ANGLE SwiftShader; hardware performance remains unmeasured. `validation.json` records the outcomes, source/input hashes, geometry checks and reviewed capture hashes.

## Reproduce

Run from the repository root:

```powershell
foreach ($suite in @('firstresponse_ear_rims','firstresponse_ear_folds','firstresponse_brow_surfaces','firstresponse_nose_surfaces','firstresponse_eyelid_surfaces','firstresponse_lip_surfaces','firstresponse_depth_explorer','firstresponse_body_3d','stem_firstresponse_hook_order')) {
  node node_modules/vitest/vitest.mjs run "tests/$suite.test.js" --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
  if ($LASTEXITCODE -ne 0) { throw "Suite failed: $suite" }
}
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-ear-rims.spec.ts --config reports/firstresponse-ear-rims/playwright.config.ts --workers=1
```

## Reviewed captures

| View | Before recovery | After recovery |
| --- | --- | --- |
| Adult | [Capture](adult-ear-rims-before-recovery.png) | [Capture](adult-ear-rims-after-recovery.png) |
| Child | [Capture](child-ear-rims-before-recovery.png) | [Capture](child-ear-rims-after-recovery.png) |
| Infant | [Capture](infant-ear-rims-before-recovery.png) | [Capture](infant-ear-rims-after-recovery.png) |

[Phone inspection](phone-ear-rims.png) · [Phone app contrast](phone-ear-rims-app-contrast.png)
