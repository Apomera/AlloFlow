# Cephalopod Hunter: seventh enhancement pass

Work log (2026-09-27): COMPLETE. Authorized scope: canonical Cephalopod module and its three exact desktop mirrors; focused tests; this pass-seven report folder and final status of the preceding pass-six report. Shared handoff and unrelated work remain with their owners. No deployment or push requested.

This pass adds target-directed squid feeding tentacles, curved branching coral and reliable specimen inspection beside rocks. It continues pass six's eye, pigment and targeting polish. The visual animation preserves the established targeting, contact timing and capture rules.

## Work log

- Created the scoped report and local-artifact ignore rules before this pass's source changes. The preceding pass-six source changes were already staged when reviewed and remain under root ownership.
- Read current rig/update, committed-target, geometry-freeze and environmental lifecycle test support. No pass-seven source or test edits, browser execution, screenshots or validation claims were made by the test agent during setup.
- Integrated the two guarded feature patches, then corrected the independent squid animation clock after review found that clam collection could otherwise restart a completed reach.
- Actual desktop/phone captures exposed an existing inspection-camera bug: nearby rocks pulled the fitted camera down to 1.5 metres and cropped the specimen. Integrated an inspection-only occlusion correction and added a live framing/restoration regression.
- Browser work runs serially with one worker and zero retries. Unrelated shared source and handoff files remain untouched.

## Changes

### Squid reach and recovery

- An accepted strike records the committed prey's world position. The two feeding clubs track that prey through the existing 200 ms contact deadline, hold briefly and retract by 650 ms. Queuing another target does not redirect the active strike.
- The rig converts the aim through the animal's full world transform, including turn, pitch and bank. Curved stalks retain separate anchors, travel around side/rear targets and use stable tube frames for vertical reaches.
- The visible reach is bounded. Capture still uses the existing range, depth, cover and living-prey checks. A disposed or missed target leaves only a position snapshot for recovery.
- Squid feeding reaches now use their own accepted-strike clock. Collecting a clam cannot trigger or replay a feeding reach. Other species keep their existing event animation.
- Inspection freezes the pose and the contact timer. Reduced motion keeps the tentacles folded.

### Reef colonies

- Replaced each eleven-mesh cylinder-and-sphere colony with one static mesh: a curved trunk, five branches, smaller forks and rounded tapered tips.
- Added subtle growth shading, muted mineral tones and the existing reef surface shader. No new bitmap textures, glow or per-frame coral geometry updates.
- The seeded world random calls, coral identity/color metadata, camouflage radius, grounding and recycling order are preserved.
- For the 18-colony fixture, coral meshes fall from 198 to 18 and vertices from 11,286 to 9,315; triangles rise from 10,656 to 12,888. This reduces scene mesh submissions but is not a measured device frame-rate claim.

### Inspection beside cover

- Inspection keeps its fitted/requested orbit distance. Entering inspection snaps to that framing, and orbit interpolation cannot cut inside the requested radius. Intentional Closer/Farther controls still work.
- Nearby rock meshes that obscure the specimen temporarily disappear in paused inspection. Center/corner sightlines and camera-inside-rock checks cover the frozen specimen view; unchanged viewpoints skip repeated occlusion work.
- Rock visibility is restored on orbit changes, exit and cleanup, preserving any rock already hidden before inspection. Geometry and gameplay cover rays stay intact, and ordinary diving retains its original camera collision safeguard.
- This is a presentation tradeoff: obstructing rocks disappear during specimen inspection instead of forcing a cropped close-up.

## Verification approach

- Measure the visible feeding clubs from the actual distal rings in the cl-tentacle geometry buffers, transformed with each mesh's world matrix. Use real fish from the existing school and normal E/T input; do not move tentacle meshes, alter their buffers, replace the rig or substitute a rendered target marker as proof of contact.
- Check that wind-up reduces world-space club-to-prey distance and that lateral/vertical target movement produces corresponding endpoint tracking. Commit prey A, queue prey B during the same wind-up, and verify visible reach remains directed at A. Capture at the existing contact deadline must still apply the established range, depth and cover checks.
- Sample a near-contact frame before removal, or observe the geometry at the same simulation step as capture while retaining the prey reference. Derive ring topology from the real mesh/index data where practical, rather than asserting a particular vertex count or exact artist-tuned reach constant.
- Freeze the actual tentacle buffers during inspection and verify they resume naturally. Check that reduced motion preserves its promised behavior. Existing pursuit/foraging regressions remain necessary to protect committed targeting, delayed contact, escaping or obstructed prey, cooldown and HUD guidance.
- Reuse the low/balanced WebGL errors, non-flat pixels, material texture and context-disposal audit for environmental changes. Add focused geometry/recycling checks only after scenery contracts are finalized; review desktop and phone images for visual density and readability.
- Advance actual gameplay in consumed simulation-time steps and assert live geometry/state outcomes. Run browsers serially, one worker with zero retries. Preserve initial failures and targeted retests separately, and record final source hash and limits in the completed report.

## Validation

197 distinct unit scenarios across ten files and 27 distinct browser scenarios have passing latest results. Initial failures and targeted retests are retained in `validation-summary.json`; these are not all first-run passes. Browser runs used one worker and zero automatic retries.

- Initial unit sweep: 191/194 passed. Three Hub assertions failed with an uninformative `STACK_TRACE_ERROR`; the unchanged Hub suite subsequently passed 88/88. The exact first-run cause was not established.
- Added three behavioral regressions that execute the production strike-render step. They reproduce the former clam-clock replay and verify the independent squid clock plus unchanged non-squid animation.
- Separate real-Three checks cover 54 coral geometries and ten inspection-camera cases, including hidden rocks retaining raycast cover and restoration of prior visibility.
- The six new live-browser scenarios have passing latest results: committed target reach, pose/timer freezing and recovery, bounded misses and reduced motion, colony geometry/disposal, terrain recycling, and desktop/phone framing with rock visibility restoration.
- The initial browser run passed five of six. The recovery fixture stopped simulation at 700 ms before the next 8 Hz HUD refresh at 750 ms, leaving a stale disabled button. The corrected fixture advances at most twelve simulation steps until that refresh and also checks that clubs return within 0.15 m of their idle positions. Its targeted retest passed; no product change was made for this test failure.
- Seven final contracts pass on the integrated source: the four existing canvas/focus checks and the three independent strike-clock checks. All four runtime copies have matching SHA-256 hashes.
- All fifteen existing foraging, swimming and pursuit scenarios passed. Five of six rendering/inspection scenarios passed initially; the all-species loop exceeded its 120-second limit while mounting the twelfth/final species. One unchanged targeted rerun passed under the same limit. All twelve rigs, low/balanced rendering, context/texture cleanup, inspection controls and caustic freezing therefore have passing latest checks.

## Review and reproduction

`visual-review.cjs` captures desktop and phone inspection, a coral close-up and two squid contact views using the local preview harness. Reef inspection uses ordinary movement and controls. The coral detail uses a paused camera-only close-up with overlays hidden; the squid strike fixture places an actual fish school nearby and uses normal T/E input. Neither fixture changes animal geometry or materials.

The initial cropped reef captures are retained locally as ignored `initial-*.png` evidence. Final desktop and phone images show the full specimen beside the same rocks. The coral detail selects an existing colony clear of rocks; the preserved world layout can still contain overlapping rock/coral placements. Final images are listed in the validation record. Use the preview server at `../serve-preview.cjs`, append `?species=humboldtSquid&mode=observe`, and press **F** to inspect.

Software-rendered WebGL checks do not establish performance on a physical phone. No release build, push or deployment was requested.

## Review images

- [Directed squid strike](squid-strike-oblique.png)
- [Squid contact profile](squid-strike-contact.png)
- [Branching coral detail](coral-detail.png)
- [Desktop reef](reef-desktop.png)
- [Inspection beside rocks](reef-inspection.png)
- [Phone inspection](reef-phone.png)
- [Validation record](validation-summary.json)
