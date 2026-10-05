# First Response Lab: brow contours

Validated on October 4, 2026, against parent `cfe4e9f6cc770b405f06d36708bf5d48d472a57a` on `codex/firstresponse-brow-contours`.

The manikin now has shallow brow surfaces that widen along the existing arch and taper into the skin at both ends. Their closed geometry fits the actual skull triangles. Mirrored positions and normals keep both brows symmetric; the full perimeter is buried beneath the skin. Each brow uses a 64 × 32 sphere mesh with 2,145 vertices and 3,968 outward triangles.

## Validation

- **332 unit cases passed in the final run across seven suites**, including 21 new brow cases for topology, shading, skull fit, taper, eye separation, recovery attachment and contrast. The initial run passed 326 and found six cases where the central relief was too shallow. A small increase corrected the visible surface; all assertions remain unchanged. Earlier results and hashes are retained.
- **Two native browser cases passed**, with one worker and zero retries. Adult, child and infant views cover the starting pose and completed recovery. The 320-pixel phone case covers keyboard inspection, learner state, spacing, forced colors, app contrast, accessibility, runtime errors and WebGL cleanup.
- **Eight captures were visually reviewed.** All 17 face features remain within the frame. Brow geometry and materials stay fixed while the head moves; app contrast changes materials while retaining geometry. All 39 frozen inputs match between the unit and browser runs.
- **The independent geometry audit passed:** 12 closed outward brow shells, 768 perimeter rays beneath the skin, six unchanged skulls, 18 unchanged body/head/pivot matrices and 132 unchanged facial-detail meshes. Production bytes outside the added brow helper and replaced call match the parent. Names, material, picking, labels and catalogs are retained.

Construction probes caught a small gap under the initial analytic fit and normal agreement issues with sparse sampling. The final geometry fits native skull facets and uses denser sampling. The diagnostic manifests are retained alongside the final logs and native audit. The live shared viewer audit also passed, preserving the existing Beehive and Perception changes.

Browser checks use the app-created Chromium WebGL canvas with ANGLE SwiftShader. Hardware performance remains unmeasured. `validation.json` records the outcomes, input hashes, geometry checks and reviewed capture hashes.

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_brow_surfaces.test.js tests/firstresponse_nose_surfaces.test.js tests/firstresponse_eyelid_surfaces.test.js tests/firstresponse_lip_surfaces.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-brow-contours.spec.ts --config reports/firstresponse-brow-contours/playwright.config.ts --workers=1
```

## Reviewed captures

| View | Before recovery | After recovery |
| --- | --- | --- |
| Adult | [Capture](adult-brow-contours-before-recovery.png) | [Capture](adult-brow-contours-after-recovery.png) |
| Child | [Capture](child-brow-contours-before-recovery.png) | [Capture](child-brow-contours-after-recovery.png) |
| Infant | [Capture](infant-brow-contours-before-recovery.png) | [Capture](infant-brow-contours-after-recovery.png) |

[Phone inspection](phone-brow-contours.png) · [Phone app contrast](phone-brow-contours-app-contrast.png)
