# First Response Lab: eyelid contours

Validated on October 4, 2026, against parent `948ce4fecdb93968d47db355382e8cb39d5f271b` on `codex/firstresponse-eyelid-contours`.

The manikin now has closed upper and lower eyelid surfaces fitted to the skull. The wider upper fold and shallow lower lid taper into the eye corners, and finer seams keep the eyes visibly closed. Each of the four lids uses a 32 × 16 sphere mesh shaped into a closed surface with 960 outward triangles and smooth normals.

The root and desktop source changes are confined to the eyes and eyelids. Mesh names, local origins, head attachment and answer targets are retained. Six native age and pose snapshots match the parent skull geometry and all 18 head, body and pivot world matrices. Source bytes outside the eyelid block, labels and catalogs match the parent.

## Validation

- **290 unit cases passed in the final full run:** 21 eyelid, 21 lip, 115 depth-explorer, 129 body-3D and four hook-order cases. The initial run had 286 passes and four failures because its endpoint assertion treated buried corner depth as outward relief. The corrected assertion measures signed outward relief and preserves the original burial, float, shoulder, topology and seam bounds. Production bytes stayed unchanged during the test correction; the first-run logs and test hashes are retained.
- **Two native browser cases passed in one clean first run**, with one worker and zero retries. Adult, child and infant faces were checked before and after completed recovery. All four lids retain their local geometry and head attachment while moving with the head. The 320-pixel phone case covers keyboard views, inspection after the turn, learner state, text spacing, forced colors, app contrast, accessibility, runtime errors and WebGL cleanup.
- **Eight final captures were reviewed.** Every recorded face-feature vertex, including both upper and lower lids, remains within the frame in all eight geometry samples. All 37 frozen inputs match between the unit and browser runs and remain unchanged.
- **The live shared viewer audit passed.** Its BayViewer bytes and complete canonical remainder match the tested parent. Five explicit peer regions cover the Beehive helper and four Perception entries; none references First Response.

Browser checks used the app-created Chromium WebGL canvas with ANGLE SwiftShader. They cover software rendering and interaction; hardware performance remains unmeasured. Local logs, exit records, frozen-input manifests and geometry audits are retained alongside the report. `validation.json` records the outcomes and reviewed capture hashes.

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_eyelid_surfaces.test.js tests/firstresponse_lip_surfaces.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-eyelid-contours.spec.ts --config reports/firstresponse-eyelid-contours/playwright.config.ts --workers=1
```

## Reviewed captures

| View | Before recovery | After recovery |
| --- | --- | --- |
| Adult | [Capture](adult-eyelid-contours-before-recovery.png) | [Capture](adult-eyelid-contours-after-recovery.png) |
| Child | [Capture](child-eyelid-contours-before-recovery.png) | [Capture](child-eyelid-contours-after-recovery.png) |
| Infant | [Capture](infant-eyelid-contours-before-recovery.png) | [Capture](infant-eyelid-contours-after-recovery.png) |

[Phone inspection](phone-eyelid-contours.png) · [Phone app contrast](phone-eyelid-contours-app-contrast.png)
