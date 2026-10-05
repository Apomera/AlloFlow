# Pass 39 — Fish surface finish

The existing silver prey rig now has curved gill-cover definition, a small mouth seam, restrained filtered scale glints and a richer pupil/iris finish. Details are confined to explicitly authored body and eye parts; fins and tail retain their finish. Fine scale relief fades with screen footprint and is suppressed on the derivative-free fallback.

Two render meshes, two geometries and one owned material per fish remain. The only buffer addition is the static scalar part mask. Positions, normals, colors, indices, part boundaries, bounds, pivots, school movement, awareness, gameplay and seeded RNG are retained. Exact approved source inverses recover the accepted pass38 source byte for byte; historical default-material and pass23 tail contracts retain their prior assertions. New current-finish checks and actual linked GPU programs are checked separately. A stale generic miss-message assertion was independently reproduced on the saved baseline, corrected to the existing distance guidance, and expanded with rise/dive cases for both fish and crabs. Initial failed diagnostic and CPU attempts are retained beside the final successful runs.

Validation: 34 CPU cases across six files; nine native browser cases covering low/balanced fish rendering, motion, pause, inspection, reduced motion, ownership/disposal, prey threat memory and moving-prey strike/contact/recovery. One worker and zero automatic retries or skips. Eight cases passed initially; the remaining case stalled during mounting and passed unchanged in a fresh isolated browser. The original failure, source hashes and isolated receipt are retained. No browser errors were reported in the successful runs. All four runtime copies match SHA 27ee7d84a9e959626e6f9044df1d9c663592f8d1847404c492a0d47fd314d663. Syntax and scoped git diff checks pass.

Four before/four after fish diagnostic captures retain exactly matched selected actor poses, bounds and cameras. Original world lighting remains; other mesh visibility is masked for inspection. Two additional ordinary desktop/phone captures use native movement and jet controls with no actor/camera/visibility edits. Capture errors and unmount leaks are empty. Fake audio output was used; no sound or hardware-FPS claim.

[Visual gallery](gallery.html) · [Final verification](final-verification.json) · [Independent shader review](independent-shader-review.md)

Changes remain uncommitted.
