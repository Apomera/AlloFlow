# First Response Lab: nose contours

Validated on October 4, 2026, against parent `5357059fb415aa8a490a067a63d4ba874612eae5` on `codex/firstresponse-nose-contours`.

The manikin now has a continuous nasal surface with a narrow bridge, rounded tip and a perimeter tucked into the face. Two shallow nostril surfaces fit the nose itself. Smooth normals soften the contour across the bridge and tip. The closed nose uses a 48 × 32 sphere mesh with 2,976 outward triangles; each nostril uses a 32 × 24 mesh with 1,472 outward triangles.

The root and desktop source changes are confined to the nose and nostrils. The existing nose name and local origin are retained, and both nostrils now have named meshes with identity local transforms attached to the head pivot. Answer targets are retained. Six native age and pose snapshots match the parent skull geometry and all 18 head, body and pivot world matrices. The other face geometry, source bytes outside the nose block, labels and catalogs match the parent.

## Validation

- **311 unit cases passed in the final full run:** 21 nose, 21 eyelid, 21 lip, 115 depth-explorer, 129 body-3D and four hook-order cases. Earlier runs each passed 308 cases and exposed normal alignment and symmetry issues. Denser nostril sampling and mirrored normals corrected the shading while retaining the surface dimensions and fit. All unit assertions remain unchanged; earlier logs and hashes are retained.
- **Two native browser cases passed in one clean first run**, with one worker and zero retries. Adult, child and infant faces were checked before and after completed recovery. The nose and both nostrils retain their local geometry and materials while following head motion. The 320-pixel phone case covers keyboard views, inspection after the turn, learner state, text spacing, forced colors, app contrast, accessibility, runtime errors and WebGL cleanup.
- **Eight final captures were reviewed.** Every recorded vertex of all 17 face features, including both nostrils and all four lids, remains within the frame in all eight geometry samples. All 38 frozen inputs match between the unit and browser runs and remain unchanged.
- **The independent geometry and live shared viewer audits passed.** All 18 nasal shells across six age and pose samples are closed and outward. The live viewer's BayViewer bytes and complete canonical remainder match the tested parent. Five explicit peer regions cover the Beehive helper and four Perception entries; none references First Response.

Browser checks used the app-created Chromium WebGL canvas with ANGLE SwiftShader. They cover software rendering and interaction; hardware performance remains unmeasured. Local logs, exit records, frozen-input manifests and geometry audits are retained alongside the report. `validation.json` records the outcomes and reviewed capture hashes.

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_nose_surfaces.test.js tests/firstresponse_eyelid_surfaces.test.js tests/firstresponse_lip_surfaces.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-nose-contours.spec.ts --config reports/firstresponse-nose-contours/playwright.config.ts --workers=1
```

## Reviewed captures

| View | Before recovery | After recovery |
| --- | --- | --- |
| Adult | [Capture](adult-nose-contours-before-recovery.png) | [Capture](adult-nose-contours-after-recovery.png) |
| Child | [Capture](child-nose-contours-before-recovery.png) | [Capture](child-nose-contours-after-recovery.png) |
| Infant | [Capture](infant-nose-contours-before-recovery.png) | [Capture](infant-nose-contours-after-recovery.png) |

[Phone inspection](phone-nose-contours.png) · [Phone app contrast](phone-nose-contours-app-contrast.png)
