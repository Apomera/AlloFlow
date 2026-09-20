# Dino Lab facial contour refinement

Head close-ups now use a fine, tapered mouth crease and shallow curved brow relief. These replace the raised mouth tube, round mouth-corner beads and cylindrical brow bars, improving how the facial details meet the cranial surface.

Each contour vertex is projected onto the existing head mesh. The strip is attached to that mesh, tapers to narrow ends and follows its surface; the brow adds a low central ridge. Mouth creases use a dark unlit material so they read as recesses without bright tube highlights. Both details follow body-opacity changes.

These are schematic soft-tissue refinements. Exact contour paths, colors and tissue thickness remain reconstructed; species evidence and alternate reconstruction data are unchanged.

## Validation

- **37 unit checks passed across four suites:** face contours, cranial geometry, study framing and attachments. The 14 new contour checks cover three scales, both sides, translated/nonuniformly scaled heads, bounded relief, unit normals, narrow endpoints, parent transforms and missing projection samples.
- **Seven Chromium species workflows passed:** Anchiornis, Microraptor, Tyrannosaurus, Spinosaurus, Triceratops, Parasaurolophus and Brachiosaurus. Each checks oblique, front and side head views.
- Every tested contour projected all 165 vertices onto the head (660 per animal), with zero attachment-coordinate gap and no invalid or clipped contour vertices, runtime errors, shader failures or context loss.
- Anchiornis also passed a 320px phone view without horizontal overflow. Triceratops passed switching to fossil anchors (no life-face contours) and back.
- Microraptor retained its model identity and 417 geometries / 8 textures across minimum/full opacity, two fewer geometries than the preceding renderer and no added textures.
- Reviewed eight final screenshots listed below. The first Anchiornis preview ran out of time at screenshot capture after its contour assertions passed; the complete case passed on rerun with a 360-second test budget. The renderer was unchanged between these runs.
- Canonical/public/both existing local build copies match SHA-256 `4ee1c7797c637e75cebbca4d46de0a8dbeb65039131fe1c3d59517be2c81f856`. Syntax and scoped whitespace checks passed. No push, deployment or installer build.

## Evidence

- [anchiornis-side.png](anchiornis-side.png)
- [anchiornis-phone.png](anchiornis-phone.png)
- [microraptor-head.png](microraptor-head.png)
- [tyrannosaurus-head.png](tyrannosaurus-head.png)
- [spinosaurus-head.png](spinosaurus-head.png)
- [triceratops-head.png](triceratops-head.png)
- [parasaurolophus-head.png](parasaurolophus-head.png)
- [brachiosaurus-head.png](brachiosaurus-head.png)
- [Structured validation](validation.json)
- [Unit results](unit-results.txt)
- [Initial preview results, including Microraptor pass and Anchiornis timeout](preview-browser-results.txt)
- [Six final browser passes, including the Anchiornis rerun](browser-results.txt)
- [Opacity and resource measurements](opacity-resources.json)
- [Previous Anchiornis side view for comparison](../dinolab-3d-head-plumage/anchiornis-side.png)

## Reproduce

```powershell
node node_modules/vitest/vitest.mjs run tests/dinolab_3d_face_contours.test.js tests/dinolab_3d_cranial.test.js tests/dinolab_3d_studies.test.js tests/dinolab_3d_attachments.test.js --maxWorkers=1 --pool=forks --testTimeout=30000
$env:DINOLAB_REPORT_DIR='reports/dinolab-3d-face-contours'
node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-face-contours.spec.ts --project=chromium --workers=1 --retries=0
```
