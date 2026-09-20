# Dino Lab eye-detail refinement

Life reconstructions now show warm irises with subtle radial fibers, a darker outer rim and a narrow inner color variation. Clearer corneal shading, centrally seated round pupils and smaller highlights make the eye layers easier to distinguish in head studies.

The iris pattern uses local eye coordinates and screen-derivative filtering, so fine detail fades when it becomes too small to resolve. It needs no image textures. The cornea retains a soft reflection while its neutral tint and lower opacity reduce the previous pale haze.

Eye color, pupil size and soft-tissue detail remain schematic reconstruction choices. The curated species evidence and alternate reconstruction data are unchanged.

## Validation

- **35 unit checks passed across five suites:** eye detail, cranial geometry, head plumage, motion and study framing. The seven new eye checks cover four scales, normalized coordinates, transform stability and Standard/Phong shader integration without image maps.
- **Five Chromium workflows passed:** head studies for Anchiornis, Microraptor, Tyrannosaurus and Brachiosaurus, plus a complete blink/reduced-motion/manual-pause workflow.
- All tested eye layers remained finite and inside the camera frame, with no runtime errors, shader failures or context loss. Each iris uses 825 vertices; pupils remain centered on the iris.
- Anchiornis passed the user-facing maximum zoom (147%) and 320px phone layout. Microraptor passed side lighting and return to balanced light with stable model identity. Tyrannosaurus passed fossil/life switching.
- The sampled blink closed and reopened successfully; the highlight hid during closure and iris coordinates remained unchanged. Reduced motion and manual pause preserved eye transforms.
- Resource counts stayed at 417 geometries / 8 textures for Microraptor lighting and 439 / 8 for the Anchiornis blink/pause test. No textures or eye meshes were added; eye and pupil tessellation increased for smoother silhouettes.
- Reviewed all seven captures below. The first Microraptor lighting test used a shortened button name and timed out; it passed after correcting the test to the existing accessible name. The renderer was unchanged between these runs.
- Canonical/public/both existing local build copies match SHA-256 `9803173580cd6dc8d3ca940ab58b81123eaf68c2c5d7a7d021dc4073b70d4a3e`. Syntax and scoped whitespace checks passed. No push, deployment or installer build.

## Evidence

- [anchiornis-head.png](anchiornis-head.png)
- [anchiornis-zoom.png](anchiornis-zoom.png)
- [anchiornis-phone.png](anchiornis-phone.png)
- [microraptor-head.png](microraptor-head.png)
- [microraptor-detail-light.png](microraptor-detail-light.png)
- [tyrannosaurus-head.png](tyrannosaurus-head.png)
- [brachiosaurus-head.png](brachiosaurus-head.png)
- [Structured validation](validation.json)
- [Unit results](unit-results.txt)
- [Initial preview results, including the corrected test-label issue](preview-browser-results.txt)
- [Final browser results](browser-results.txt)
- [Lighting and resources](lighting-resources.json)
- [Blink and pause measurements](blink-pause.json)
- [Previous Anchiornis head study for comparison](../dinolab-3d-face-contours/anchiornis-head.png)

## Reproduce

```powershell
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_eye_detail.test.js tests/dinolab_3d_cranial.test.js tests/dinolab_3d_head_plumage.test.js tests/dinolab_3d_motion.test.js tests/dinolab_3d_studies.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
$env:DINOLAB_REPORT_DIR='reports/dinolab-3d-eye-detail'
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-eye-detail.spec.ts --project=chromium --workers=1 --retries=0
```
