# Dino Lab: rounded head-to-neck transitions

Completed 2026-09-20.

The rear cranial surface now rounds into a small closure seated inside the existing neck volume. This reduces the exposed flat rear-head edge in close-up views. Non-theropod rear control points follow the neck approach, avoiding a hooked return bend behind the head.

The forward facial control points and radius profiles remain in place; the neck path and dimensions are unchanged. Head and neck remain separate overlapping meshes. This is a surface-continuity refinement of the existing schematic reconstructions, not a new anatomical or covering-evidence claim.

## Verification

- 45 unit checks across five suites passed, including closure containment on shallow and steep necks at three scales, forward facial curve preservation, existing cranial geometry, attachments, plumage and facial strips.
- Eight Chromium scenarios passed: seven species plus animated Anchiornis breathing. The three non-theropod cases were rerun after visual review prompted the posterior-contour correction, for 11 successful scenario runs in total.
- All sampled head closure and neck tip rings remained inside their adjoining surface. The minimum measured neck-boundary distance was 1.769 times the head-root radius across the seven final species samples.
- Head study, side and front cameras kept the head in frame; the 320 px Brachiosaurus viewport had no horizontal overflow. Eyes remained clear of the skin, with finite geometry, skin coordinates and normals.
- Anchiornis retained eight seated plumage meshes through opacity changes and 14 breathing samples. Geometry/texture counts stayed at 439/8, with the same model instance. Fossil-to-life switching was checked on Triceratops.
- No captured runtime errors, WebGL context loss or shader failures. Syntax and scoped whitespace checks passed.
- Reviewed all ten final screenshots, including seven head studies, two side views and the phone view.

## Reproduction

Unit command:

```text
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_neck_junction.test.js tests/dinolab_3d_cranial.test.js tests/dinolab_3d_attachments.test.js tests/dinolab_3d_head_plumage.test.js tests/dinolab_3d_face_contours.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
```

Browser command (the recorded runs partitioned this file, then reran the affected non-theropods):

```text
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-neck-junction.spec.ts --project=chromium --workers=1 --retries=0 --reporter=line
```

The canonical renderer, desktop public copy and both existing local build mirrors share SHA-256 `282d12b74b62bbe0904ebb305f49675653ac3dbf1cae89040a26bb4db76d03e1`. Build mirrors were synchronized directly; no package build, push or deployment was performed. See [validation.json](validation.json) for measurements and [brachiosaurus-side.png](brachiosaurus-side.png), [parasaurolophus-head.png](parasaurolophus-head.png) and [anchiornis-head.png](anchiornis-head.png) for representative captures.
