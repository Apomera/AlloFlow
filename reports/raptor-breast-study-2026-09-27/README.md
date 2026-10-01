# Raptor Lab: breast plumage study

**Inspect → Breast feathers** frames the real torso from below, bringing the breast and belly into view during flight or rest. The adult peregrine now has fine dark barring across its pale underparts. The great horned owl has broader barring below its existing pale throat patch. Red-tailed hawks retain their streaked belly band. Short prompts invite learners to compare the direction and distribution of these markings; other species receive a general observation prompt.

The new view works with kept moments, matched camera settings, image captions, notebook evidence, downloaded visual reports, and restored sessions. It uses the existing orbit, framing, lighting, and pause behavior.

## Rendering

The patterns shade the existing continuous body surface in local coordinates. No additional meshes, vertices, materials, textures, draw calls, or animation loops are created. The original contour-feather texture remains visible beneath the marks. The lower-body mask preserves the pale upper breast and the owl's throat patch; the back keeps its existing coloration. Derivatives fade subpixel pattern detail at distance.

These are representative stylized adult patterns, not specimen reconstructions. Live birds vary with age, geography, and plumage. References: Cornell's [Peregrine Falcon identification guide](https://www.allaboutbirds.org/guide/Peregrine_Falcon/id) describes adult barring; its [Red-tailed Hawk guide](https://www.allaboutbirds.org/guide/Red-tailed_Hawk/id) describes the streaked belly. Cornell's [Great Horned Owl guide](https://www.allaboutbirds.org/guide/Great_Horned_Owl/id) describes the pale throat patch, and [Audubon's guide](https://www.audubon.org/field-guide/bird/great-horned-owl) describes horizontal belly bars.

## Verification

`tests/e2e/raptor-breast-study.spec.ts` covers low/high peregrines, a low-quality owl, a high-quality red-tailed hawk, and a bald eagle as a generic-prompt control. It checks finite unchanged geometry, visible shader contribution with barring disabled in a same-camera control, unchanged draw calls and textures, frozen readings, no idle redraws, flying/resting framing, phone layout and accessibility, saved camera settings, and a complete matching/notebook/export/restoration workflow.

All six initial scenarios passed in 4.2 minutes. The initial visual review found the bars too continuous around the body, so the final pattern softens and separates them into feather-sized segments. All 11 final scenarios passed in 5.4 minutes with no retries or skipped cases: the six new scenarios plus the existing anatomy-study and resting-tail suites. Both source syntax checks, the scoped whitespace check, and the translation-key manifest check passed. The canonical source and desktop mirror have identical hashes.

Browser results and final source hashes are recorded in `verification.json`. These are local Chromium/WebGL checks, not physical-device frame-rate measurements. Unrelated broad unit-suite baseline failures were not revisited.

## Artifacts and scope

`*-breast.png` captures the new view; `*-unbarred-control.png` isolates the contribution of the new barring while retaining the owl's throat patch; `*-second-pose.png` captures the following flight/rest pose. `owl-phone.png` shows the narrow layout. `breast-comparison.png` and `breast-observations.html` demonstrate the saved-observation workflow. `owl-before.png` preserves the previous talon pass's view, with a different pose and camera.

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Six new translation keys have English fallbacks; shared language-pack integration is pending in `translation-keys.json`. Shared hosts, catalogs, harnesses, and language packs are untouched. No commit, push, or deployment was performed.
