# Raptor Lab: facial field marks

The peregrine and osprey are easier to distinguish in the 3D study. The peregrine now has pale cheeks around its dark malar stripe, a continuous dark crown, dark irises, and a visible yellow eye ring. The osprey has a broad stripe that follows the curved white head through the eye toward the nape. Its eye surround blends into that stripe.

The head inspection prompts ask learners to compare front and side views and keep the one that best shows the field mark. The existing saved-image and notebook workflow carries those observations forward.

## Surface and resource changes

Both patterns shade the original head in local coordinates. They use the existing contour-feather texture and lighting, so they remain attached during prey tracking. Derivatives soften the pattern edges at distance. No new geometry, textures, materials, or animation loops are allocated.

The peregrine's old crown shell produced a hard helmet edge and partly obscured the eye surround. Its crown color is now on the head surface, eliminating that extra mesh and material. The osprey's two small eye-stripe boxes were inside the head; their surface replacement removes both meshes and materials. The existing field-mark identifiers are retained, with a new `malar-stripe` identifier for the peregrine. Other species keep their existing treatments.

The eye-surround geometry and eye meshes retain their vertex counts. Only the peregrine's iris and ring colors change. Physics, measurements, head tracking, and the study camera are unchanged.

## References

These are stylized models, not specimen reconstructions; plumage varies with age and geography. Cornell's [Peregrine Falcon identification guide](https://www.allaboutbirds.org/guide/Peregrine_Falcon/id) describes the dark facial sideburns and yellow eye ring, and its [Osprey identification guide](https://www.allaboutbirds.org/guide/Osprey/id) describes the broad brown eye stripe on a white head. The Bureau of Land Management's [Raptors coloring book](https://www.blm.gov/sites/blm.gov/files/documents/files/Media-Center_Public-Room_Idaho_Raptors-coloring-book.pdf) distinguishes the peregrine's dark eyes from its yellow eye ring.

## Verification

`tests/e2e/raptor-face-marks.spec.ts` covers peregrine and osprey models at low and high quality. It checks finite geometry, unchanged vertex counts, reduced mesh counts, shader compilation, visible pixel contribution from both front and side, frozen study state, no idle redraws, saved head images, camera restoration, stable buffers and textures, phone layout, and active head turns toward prey on both sides.

The first run passed two cases, then failed on a bit-exact quaternion comparison after the osprey phone resize; the difference was below 2e-15. The assertion now uses a 12-decimal tolerance. Visual inspection also prompted removal of the peregrine crown shell. All four refined face cases passed in 1.2 minutes. The final run added active gaze assertions, the completed osprey eye surround, and the existing anatomy and gaze suites: all nine scenarios passed in 4.2 minutes with no retries or skipped cases. Both source syntax checks and the scoped whitespace check passed; the canonical source and desktop mirror have identical hashes. Results and final source hashes are recorded in `verification.json`.

These are local Chromium/WebGL checks and visual review, not physical-device frame-rate measurements. The unrelated broad unit-suite baseline failures were not revisited.

## Artifacts and scope

`*-portrait.png`, `*-front.png`, and `*-side.png` show the app's frozen head study; `*-looking-left.png` captures the model after prey tracking. `osprey-low-phone.png` shows the narrow layout. `peregrine-before.png` preserves the previous anatomy pass's view; its flight moment differs and it is not a controlled pixel comparison.

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Three new translation keys have English fallbacks; shared language-pack integration is pending in `translation-keys.json`. Shared hosts, catalogs, harnesses, and language packs are untouched. No commit, push, or deployment was performed.
