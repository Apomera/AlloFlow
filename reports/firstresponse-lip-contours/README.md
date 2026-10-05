# First Response Lab: lip contours

Validated on October 4, 2026, against parent `01e7ce57b6d44953f7d06cc7676a77b17b597b46` on `codex/firstresponse-lip-contours`.

The manikin now has shallow closed lip surfaces fitted to the skull, with tapered corners, a smooth central dip in the upper lip, and a thinner fitted mouth seam. Each lip uses a 48 × 24 sphere mesh shaped into a closed band with 2,208 outward triangles. Smooth normals soften the joins and the corner relief recedes into the face.

The production diff is confined to the mouth and lip block in the root and desktop source mirrors. All three mesh names, local origins, head attachment and answer targets are retained. Six native age/pose snapshots match the parent skull geometry and all 18 head, body and pivot world matrices. The source bytes outside the mouth block also match the parent. The labels and catalogs retain their parent bytes.

## Validation

- **269 unit cases passed in one clean first run:** 21 lip-surface, 115 depth-explorer, 129 body-3D and four hook-order cases. These cover closed topology, outward normals, skull fit, seam visibility, head tilt and app contrast.
- **Two native browser cases passed in one clean first run**, with one worker and zero retries. Adult, child and infant faces were checked before and after completed recovery. The 320-pixel phone case covers keyboard view controls, inspection after the turn, learner-state retention, text spacing, forced colors, app contrast, accessibility, runtime errors and WebGL cleanup.
- **Eight final captures were reviewed.** Every recorded face-feature vertex remains within the camera frame in all eight geometry samples. All 36 frozen test inputs match between the unit and browser runs and remain unchanged.
- **The live shared viewer audit passed.** Its BayViewer bytes and complete canonical remainder match the tested parent. Five explicit peer regions cover the Beehive helper and four Perception entries; none references First Response.

Browser checks used the app-created Chromium WebGL canvas with ANGLE SwiftShader. The results cover software rendering and interaction; hardware performance remains unmeasured. Local logs, exit records, frozen-input manifests and geometry/audit records are retained alongside the report. `validation.json` records the outcomes, audit summaries and reviewed capture hashes.

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/firstresponse_lip_surfaces.test.js tests/firstresponse_depth_explorer.test.js tests/firstresponse_body_3d.test.js tests/stem_firstresponse_hook_order.test.js --pool=threads --experimental.viteModuleRunner=false --maxWorkers=1 --isolate=false --testTimeout=120000 --hookTimeout=120000
node node_modules/@playwright/test/cli.js test tests/e2e/firstresponse-lip-contours.spec.ts --config reports/firstresponse-lip-contours/playwright.config.ts --workers=1
```

## Reviewed captures

| View | Before recovery | After recovery |
| --- | --- | --- |
| Adult | [Capture](adult-lip-contours-before-recovery.png) | [Capture](adult-lip-contours-after-recovery.png) |
| Child | [Capture](child-lip-contours-before-recovery.png) | [Capture](child-lip-contours-after-recovery.png) |
| Infant | [Capture](infant-lip-contours-before-recovery.png) | [Capture](infant-lip-contours-after-recovery.png) |

[Phone inspection](phone-lip-contours.png) · [Phone app contrast](phone-lip-contours-app-contrast.png)
