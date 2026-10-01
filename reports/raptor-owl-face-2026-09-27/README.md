# Raptor Lab: owl facial feathers

Owl portraits now have finer facial feather surfaces and smoother head silhouettes. The previous cheek mesh used only five rings. The new quality-scaled rings follow the head curvature more closely, while leaving the eyes and beak attached to the existing head rig. Minimum triangle clearance above the head sphere increases from 0.001592 model units to 0.003267 at low quality and 0.003589 at high quality. Measurement ruled out the initial hypothesis that the old triangles intersected the head; the refinement addresses coarse curvature and improves the surface gap instead.

The neutral facial atlas now includes three overlapping rows of radial feather shapes. Great Horned Owl discs use buff tones, a dark outer rim, and a pale brow. Snowy Owl discs use white feathers instead of inheriting the brown cheek palette. These are representative stylized plumage treatments; Great Horned Owl coloration varies geographically. The other owl's pigment selection remains unchanged.

Head Study prompts encourage learners to trace the feather pattern, try Side light, and compare front and side views. Great Horned Owl guidance also distinguishes feather tufts from ears. Kept images and matched views use the same frozen 3D bird.

## Rendering cost

The existing batched facial mesh, material, and 256 × 256 texture are reused. There are no added meshes, materials, textures, lights, render passes, or animation loops. Geometry is built once; orbital inspection and gaze tracking do not rebuild it.

| Geometry | Before | Low | Balanced / high |
| --- | ---: | ---: | ---: |
| Paired facial-disc vertices | 242 | 962 | 1,794 |
| Paired facial-disc triangles | 432 | 1,824 | 3,456 |
| Owl head vertices | 165 low / 425 high | 425 | 825 |
| Owl head triangles | 252 low / 720 high | 720 | 1,472 |

The facial mesh uses 53,272 bytes at low quality and 99,672 bytes at high quality, compared with 13,240 bytes previously. This is an intentional increase in static geometry for close-up readability. It is not a claim of unchanged GPU processing cost or a physical-device performance benchmark.

## Verification

All **13 browser scenarios passed in 8.8 minutes**, with no failures, retries, or skips. The **8 geometry tests** passed in 2.66 seconds. Syntax, mirror parity, scoped whitespace, and translation-manifest checks passed. Final results and source hashes are recorded in `verification.json`. The dedicated tests cover finite geometry, outward triangle winding, nondegenerate faces, complete triangle clearance above the head sphere, unit normals, snowy white pigment, unobstructed eye anchors, visible pixels at front and side angles, frozen pose, no idle redraws, matched captures, phone layouts, reduced motion, scoped accessibility, buffer stability, and restart disposal. Regression suites also exercise lighting, anatomy framing, and animated gaze tracking.

The `*-front.png`, `*-side.png`, and `*-phone.png` files show the rendered result. Each `*-checks.json` records geometry counts, resource counts, and raw canvas pixel differences when the facial mesh is hidden. Browser checks use local Chromium/WebGL.

## Biological references

- [Cornell Lab: Great Horned Owl identification](https://www.allaboutbirds.org/guide/Great_Horned_Owl/id) describes facial coloration, yellow eyes, feather tufts, and regional variation.
- [Cornell Lab: Snowy Owl identification](https://www.allaboutbirds.org/guide/Snowy_Owl/id) identifies the white face and yellow eyes; the search-indexed page was accessible, while direct retrieval timed out.
- [Bureau of Land Management: Owls of the Morley Nelson Snake River Birds of Prey NCA](https://www.blm.gov/sites/default/files/documents/files/Media-Center_Public-Room_Idaho_MorleyNelson-OwlColoringBook.pdf) labels eyebrow, facial-disc rim, facial disc, and ear tufts separately.

## Scope

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Two new English-fallback translation keys are listed in `translation-keys.json`; shared language-pack integration is pending. Shared hosts, catalogs, harnesses, and language packs are untouched. All changes are local; no commit, push, or deployment was performed.
