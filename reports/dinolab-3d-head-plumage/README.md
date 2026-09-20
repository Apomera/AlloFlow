# Dino Lab head and neck plumage refinement

Feathered reconstructions now have a gradual neck-to-head transition: neck feathers and raised tufts shorten toward the head, and a denser nape begins with short feathers behind the shared eye landmarks. This reduces the abrupt edge in head close-ups while keeping the eyes, muzzle and mouth readable.

The feather boundary is a schematic reconstruction choice, not a specimen-measured anatomical claim. Existing species evidence, alternate coverings and conservative reconstruction rules are unchanged.

## Implementation

- Added smooth surface-coordinate feather-length tapering for both pennaceous and filament coats. Roots, pigment coordinates and deterministic sampling remain stable.
- The final 45% of the neck gradually approaches 30% feather length; raised neck tufts follow the same transition.
- The nape uses 240 requested roots before coverage scaling, with a short front edge that grows toward the rear. Its boundary is derived from the same eye radius and longitudinal landmark used to place the eyes.
- Retained eight batched coat meshes and the existing shader/material paths; no textures were added.

## Validation

- **41 unit checks passed across five suites:** head plumage, feather evidence, contour detail, cranial geometry and study framing. Tests cover smooth length changes, unchanged roots/UVs, unit normals, both feather families and sources without UVs.
- **Six Chromium scenarios passed:** four head studies plus motion/opacity/accessibility and conservative Velociraptor controls. Anchiornis also covers side view and a 320px viewport without horizontal overflow.
- All tested head/nape vertices stayed within the camera frame, with positive eye clearance and no runtime errors, context loss or shader failures.
- The tested coat remained attached during motion (maximum root gap 0). Geometry/texture counts stayed at 419/8 across opacity changes; the covering-evidence panel had zero axe violations.
- Visually reviewed all six captures listed below. The head front remains bare in this schematic model; this pass refines the nape and neck transition.
- Canonical, public and both existing local build copies match SHA-256 `c6a4d2729b8fcacaf8a1d6746dd561352a33822656672e05bf6f696126b514c8`.
- Syntax and scoped whitespace checks passed. No push, deployment or installer build.

| Species | Head roots | Eye clearance (model units) |
| --- | ---: | ---: |
| anchiornis | 211 | 0.003153 |
| microraptor | 211 | 0.002847 |
| sinosauropteryx | 178 | 0.004875 |
| yutyrannus | 221 | 0.039531 |

## Evidence

- [anchiornis-head.png](anchiornis-head.png)
- [anchiornis-side.png](anchiornis-side.png)
- [anchiornis-phone.png](anchiornis-phone.png)
- [microraptor-head.png](microraptor-head.png)
- [sinosauropteryx-head.png](sinosauropteryx-head.png)
- [yutyrannus-head.png](yutyrannus-head.png)
- [Structured validation](validation.json)
- [Unit results](unit-results.txt)
- [Anchiornis browser results](preview-browser-results.txt)
- [Other head-study browser results](browser-results.txt)
- [Control browser results](control-browser-results.txt)
- [Motion, resources and accessibility](controls/motion-opacity-accessibility.json)

## Reproduce

```powershell
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_head_plumage.test.js tests/dinolab_3d_feather_evidence.test.js tests/dinolab_3d_contour_detail.test.js tests/dinolab_3d_cranial.test.js tests/dinolab_3d_studies.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
$env:DINOLAB_REPORT_DIR='reports/dinolab-3d-head-plumage'
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-head-plumage.spec.ts --project=chromium --workers=1 --retries=0
$env:DINOLAB_REPORT_DIR='reports/dinolab-3d-head-plumage/controls'
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-feather-evidence.spec.ts --grep 'coat stays|minimum keeps' --project=chromium --workers=1 --retries=0
```
