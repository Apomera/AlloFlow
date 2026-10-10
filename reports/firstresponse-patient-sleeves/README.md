# First Response Lab — connected patient sleeves

## Improvements

- Cloth now extends into the torso and follows the existing upper-arm direction, giving the shoulder a continuous silhouette.
- Hollow sleeves and thin annular cuff edges fit around the arm. They remove the overlapping filled disks and undersized cuffs that produced blue/tan wedges and skin intersections.
- The patient upper arms open into the shoulder. Only their artificial proximal disks are excluded from drawing; every original limb vertex, normal, index buffer and joint transform is preserved.

The original sleeve mesh names and shared shirt material are retained. Hand alignment, compression contact, cameras, recovery movements, clinical content and saved learner state keep their previous behavior. A guarded reversal of the helper and three patient-loop assignments restores the exact starting source bytes. Canonical and desktop public sources match.

## Visual review

- The matched adult oblique view has a continuous blue sleeve surface where the previous view showed radial blue/tan wedges. Rescuer hand colors and contact appearance remain consistent.
- Recovery views show smoother shoulder joins and distinct thin cuff edges, without new hand occlusion or distracting dark seams.
- The 320px child and infant views retain clear arm silhouettes. App contrast keeps the gray garment distinct from the white limbs.

Recovery framing and shadows shift slightly with the revised sleeve silhouette; the checked arm and hand surfaces remain inside the camera margins.

### Captures

- Oblique contact close-up: [previous adult](../firstresponse-surface-clarity/adult-standard-oblique.png) / [refined adult](adult-standard-oblique.png); [refined child](child-standard-oblique.png); [refined infant](infant-standard-oblique.png)
- Adult recovery: [previous before turn](before-recovery/adult-recovery-before-turn.png) / [refined before turn](adult-recovery-before-turn.png); [previous after turn](before-recovery/adult-recovery-after-turn.png) / [refined after turn](adult-recovery-after-turn.png)
- 320px child recovery: [previous before turn](before-recovery/phone-child-recovery-before-turn.png) / [refined before turn](phone-child-recovery-before-turn.png); [previous after turn](before-recovery/phone-child-recovery-after-turn.png) / [refined after turn](phone-child-recovery-after-turn.png)
- 320px infant recovery: [previous before turn](before-recovery/phone-infant-recovery-before-turn.png) / [refined before turn](phone-infant-recovery-before-turn.png); [previous after turn](before-recovery/phone-infant-recovery-after-turn.png) / [refined after turn](phone-infant-recovery-after-turn.png); [app contrast](phone-infant-recovery-app-contrast.png)

## Validation

**211 unit cases passed across 7 files**, including nine new sleeve cases. The checks cover actual cuff clearance at vertices and edge midpoints, annular topology and normals, buried roots at maximum compression/lean, shared opaque shirt material, proximal-cap raycast exclusion, resource reuse and 15 exact pre-change patient-arm geometry/pose fingerprints. Existing contact, hand alignment, surface clarity, reference-clearance, arm-contour and body/recovery cases also pass.

**Two native Chromium validation workflows passed**, with 13 captures across adult, child and infant models, desktop and 320px widths, and normal/app-contrast views. They check the actual rendered camera, hand contact, cuff clearance, limb continuity, stable release/compression framing, recovery-pose controls, keyboard use, resizing, learner-state preservation, accessibility, runtime errors and renderer teardown. A separate saved-source workflow captured six matching recovery views for comparison.

The independent geometry probe covers **42 arm configurations** across the three ages, full-depth press, lean/release and recovery poses. It found no uncovered side samples, exposed root vertices or uncovered shoulder samples. Minimum cloth-to-arm side clearance was **0.0049601 model units**. The cuff opening also clears the arm between vertices.

Tests and captures use local bundled Three r128 and Chromium with software WebGL.

[Validation and hashes](validation.json) · [Source preservation](source-preservation.json) · [Geometry probe](geometry-probe-metrics.json) · [Rendered measurements](sleeve-metrics.json)

## Delivery

**Uncommitted and unstaged. No push or deployment.** Prior uncommitted First Response work and other agents' files are preserved.
