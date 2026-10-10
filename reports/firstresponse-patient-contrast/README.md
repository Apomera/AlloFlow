# First Response Lab: patient hand contrast

The patient's supporting hand can blend into the white cheek in contrast mode. Curved contours now separate the hand from the head and make the fingers and wrist easier to read. The wider facing band keeps the small hand visible in the 320-pixel Head close-up view.

One shared material covers the 20 patient arm skin meshes. The face, nails, palm creases, sleeves, recovery guides and rescuer finishes retain their existing materials. Normal mode retains its existing finish.

## Rendered comparison

These are actual Chromium canvas captures from the same scene and camera. The before capture sets only the patient contour uniform to zero; restoring it reuses the same objects, buffers and compiled material. UI stage captures are saved alongside the raw canvas captures.

| View | Contour disabled | Refined contour |
| --- | --- | --- |
| Adult, supporting hand | [Before](adult-contrast-pose-8-head-contour-off.png) | [After](adult-contrast-pose-8-head.png) |
| Child, supporting hand | [Before](child-contrast-pose-8-head-contour-off.png) | [After](child-contrast-pose-8-head.png) |
| Infant, 320px phone | [Before](phone-infant-contrast-pose-8-head-contour-off.png) | [After](phone-infant-contrast-pose-8-head.png) |
| Infant, palm detail | [Before](phone-infant-contrast-pose-5-palm-contour-off.png) | [After](phone-infant-contrast-pose-5-palm.png) |

## Checks

- **78 distinct targeted unit checks passed.** The final material checks passed in four fresh serial processes: 12 adult/shader, 11 child, 11 infant and 11 rescuer finish checks. The earlier run passed all 33 wrist checks. The only subsequent production change widened the patient shader's facing band. Every one of the 27 full arm geometry fingerprints, including both refined wrists, remains exact.
- **Three native Chromium workflows passed**, with one worker and zero retries: adult and child at 1280px, infant at 320px. Each covers Palm detail and Head close-up in poses 5 and 8.
- **Twelve on/off/on pixel comparisons passed** with zero repeated-frame noise and zero changed pixels outside the patient skin masks, including protected head and clothing pixels. Masks use actual draw-range triangles clipped to all six camera planes.
- Saved learning state, poses, camera-only resource identity, canvas reuse, per-frame draw calls and triangle counts are preserved. Uniform changes upload no new geometry and compile no new programs.
- Phone keyboard controls, 320↔760 resize and camera restoration, forced colors and renderer teardown passed. Four scoped axe scans found zero violations; the forced-color scan excludes the automated color-contrast rule.

The Head close-up comparisons measure new dark contour pixels over a previously white hand surface. Cheek counts use the overlap between the projected supporting hand and head; white interior percentages keep the hand surface visible.

| Age | Pose | Dark hand pixels | Contour near cheek | White hand interior |
| --- | --- | --- | --- | --- |
| adult | 5 | 285 | 57 | 70.1% |
| adult | 8 | 215 | 117 | 76.3% |
| child | 5 | 244 | 70 | 64.9% |
| child | 8 | 214 | 110 | 74.3% |
| infant | 5 | 109 | 42 | 62.9% |
| infant | 8 | 117 | 85 | 75.5% |

## Preservation and cost

Removing the exact [1,729-byte material block](patient-contour-block.js) restores the starting source byte for byte. Canonical and public source copies match at **747,937 bytes**. The material adds one contrast shader program per scene and no mesh or per-frame allocation. Native draw calls and triangle counts match the same standard view.

- Starting SHA256: `877389b664177956a4801ab12952a247bc3a2c462961f92b648613dc83f08a5d`
- Final SHA256: `642b337db93a4c13cdbb1f95040662f3db45cf50529e5fd333938cd3de86be99`
- [Source preservation](source-preservation.json), [validation metrics](validation.json), [final unit summary](unit-final-summary.json), [final browser run](browser-final.log).

## Retained diagnostics

The first new unit fixture used digit Group names instead of the actual skin Mesh names. The corrected fixture uses `finger-N-surface` and `thumb-surface`; all 27 full geometry and normal material baselines stayed exact. [Initial unit log](unit-initial.log) and [correction evidence](fixture-name-correction.json) are retained.

The [first browser run](initial-browser/browser-run.log) exposed a lazy geometry-upload counter and oversized off-camera projection masks. Resource identities remain exact; GPU upload counts are now checked during uniform changes, and pixel masks use clipped triangles. The [narrow contour run](narrow-contour-browser/browser-corrected.log) then measured only 10, 9 and 2 dark pixels in adult, child and infant head views. The patient facing band was widened from 0.12–0.28 to 0.34–0.60; all visibility thresholds remain unchanged. Earlier screenshots, fixture versions and failure contexts remain in those folders.

Two Node source writes failed while opening the canonical file and preserved its original bytes. Guarded PowerShell copies succeeded; both final hashes were confirmed.

The combined final unit worker exhausted available memory after 23 passing checks. Its [original log](unit-final-oom.log) is retained. The same final checks passed when split by age and finish into four fresh processes, with one worker and unchanged assertions/timeouts.

## Local status

Changes remain **uncommitted**. No staging, push, deployment or full application build was performed. Other workspace changes were preserved.
