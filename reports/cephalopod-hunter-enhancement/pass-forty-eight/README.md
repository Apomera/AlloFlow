# Cephalopod Hunter — pass 48

Moon-jelly oral arms now have smoother longitudinal curves and a rounded cross section. A traveling bend and subtle twist deform the tissue itself while the root remains exactly attached to the mouth. Subtracting the seeded rest phase makes the first active step continuous. Normals are rebuilt from the deformed indexed triangles in retained typed arrays. Fixed conservative bounds prevent the flexing arms from being culled too early.

The four oral arms use 30 longitudinal sections instead of 18, adding 384 triangles per jelly. Each jelly has 1,961 vertices and 3,354 triangles, remaining under the existing 2,500-vertex and 3,500-triangle limits. It retains eight meshes, nine owned materials and nine draws when fully visible. No texture or extra mesh was added. These are procedural tissue waves, not a fluid dynamics simulation.

## Validation

- 117 targeted CPU checks passed, including six new oral motion checks. The accepted pass47 source is recovered by a strict inverse. All 65 ordered spawn draws, non-oral geometry, materials and trajectories remain paired.
- All 20 oral arms retain finite, unit, face-consistent normals and noncollapsed indexed faces across forward and reverse phases. Vertices remain within fixed bounds. Roots stay attached; rest arrays, geometry, indices, colors and materials retain ownership.
- First activation and resume are continuous. Zero elapsed time, pause and reduced motion freeze deformation and buffer uploads. Equal elapsed time gives matching tissue poses at 30, 60 and 120 update rates.
- Eleven native Chromium cases passed without retries, failures, flakes or skips. Desktop/balanced and phone/low motion cases verify actual oral position and normal uploads, frozen reduced-motion buffers, a continuous resume, pause/inspect freezes, retained resources, and all 85 owned jelly resources disposed exactly once. Existing gel, moray, water, target reach and strike commitment cases also pass.
- Six context pairs and 18 motion frames per version match camera, actor/world transforms and phases. The baseline reuses accepted native captures whose source is byte-identical to this pass’s baseline. All 48 image hashes are audited. Any draw or triangle difference is checked against the precise oral topology delta and expanded culling bounds.
- The gallery supports keyboard operation, before/after controls, an 18-frame scrubber and optional playback. A separate gallery-verification.json records desktop and phone results after review.
- Audio output was disabled during browser automation. No hardware frame-rate claim is made. This is a targeted check result, not a full-repository run.
- Four runtime mirrors have SHA-256 7238bdb66f899077016236e297589c6bb2f88cf2e491bfe45bf9f2428b100b33. The inverse recovers ead96ebfcbe994c840e56d6251d559cceed1228d1e7f16d8200b16096399453c. Syntax, scoped git diff --check, and before/after source/test receipts pass.

## Review

Open [gallery.html](gallery.html) for paired images and motion frames. [report.json](report.json), [comparison-receipt.json](comparison-receipt.json) and [source-audit.json](source-audit.json) retain validation evidence.

All work remains uncommitted. No staging, commit, push or deployment was performed.
