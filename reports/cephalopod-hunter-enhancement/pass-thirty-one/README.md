# Cephalopod Hunter enhancement pass31

This pass gives the seabed a warmer mineral finish, rounds the silverside prey's forked tails with a shallow curved surface, and makes depth advice useful when a fish is above or below capture reach. The existing squid finish and fin motion from pass30 are retained. All changes remain uncommitted and unstaged.

Sand keeps its existing opaque grain, caustics and lighting. Its RGB centers change from 183/176/155 to 169/160/139; actual constructor pixels retain 78–90% of the previous linear-light albedo. Day, night and deep-water diagnostic images remain readable. The fish refinement softens the pointed lobe ends and adds restrained surface shading. It is modest model polish, especially at ordinary school distance.

Fish three metres above or below the player now show **MATCH DEPTH** with the appropriate depth controls. A fish four metres away horizontally still shows **OUT OF REACH**; a nearby fish at matching depth shows **IN RANGE**. Existing strike, recovery and cover priorities, catch range, capture rules and schooling behavior are preserved.

## Validation

**36 CPU cases across seven files and seven unique native browser cases passed on the final source.** Native execution used one worker and zero retries. Five current habitat, lighting and pursuit cases come from the initial native report; two fish rendering cases come from the corrected fixture rerun. This is an explicitly documented composite result, not a single seven-case all-pass reporter.

The initial native report remains six passed and one failed: after rotating to phone width, the balanced fish fixture clicked a secondary control directly instead of opening Tools. Its two Help/settings clicks now use the existing responsive controls helper. Rendering, resource, motion, inspection, reduced-motion and disposal assertions are unchanged. Both fish cases passed the rerun. A separate baseline diagnostic grep attempt executed zero cases before its corrected invocation passed once.

Copied-source negative controls were detected: excessively dark sand failed the actual-pixel albedo bound, flattened tail positions failed the actual-face normal check, and reversing only the new depth advice produced **OUT OF REACH** where the native UI test required **MATCH DEPTH**. Canonical source and tests stayed unchanged. The CPU fault controller initially expected a later assertion; read-only qualification accepted the earlier, correct face-normal failure without changing or rerunning the tests.

See [validation-summary.json](validation-summary.json), [resource-integrity.json](resource-integrity.json), and [baseline-reversal.json](baseline-reversal.json). Raw reporters and failed attempts are retained locally but ignored.

## Visual evidence

All **28 final PNGs across ten paired views** were independently reviewed with no blocking finding:

- Four natural squid views at desktop, phone, narrow phone and landscape phone sizes retain DOM and native GL captures. Every recorded world transform hash, player and camera pose, prey state and UI layout matches the baseline exactly. Baseline images are byte-identical copies of accepted pass30 views from the identical source and capture profiles.
- Three fish detail views use the actual seeded first fish and its existing school. Camera framing is controlled solely for close-up review. Ordinary native pause holds twenty fixed simulation steps; all recorded scene poses, sixteen fish states and camera fixtures match exactly after consistent JSON signed-zero normalization.
- Three day/night/depth condition pairs come from the existing native diagnostic. Its exposed initialized state controls time, while ordinary dive/ascend controls depth. A small night crab pose drift limits these to appearance comparisons.

Earlier close-up attempts are excluded: an initial harness had the wrong working directory; an unpaused pair failed scene-pose parity and JSON signed-zero comparison before producing current images. Fresh paused baseline/current captures passed all guards with no source changes. The accepted capture runs reported no errors, lost contexts or disposal leaks.

See [capture-comparison.json](capture-comparison.json) and [visual-review.json](visual-review.json). Static views cover these poses, not every animation phase or universal visibility. The existing 390px hint-edge and lowest fin-tip clearance limitation remains.

## Resource scope

The sand canvas remains 256×256 RGBA, with 262,144 source bytes, 8,400 legacy world RNG burns and 65,536 private grain samples. Each fish keeps two meshes, two geometries and one owned shared material. The tail adds 24 vertices, eight triangles and 864 position/normal/color bytes per fish: 128 triangles and 13,824 bytes for sixteen fish. Sand and tail finishes add no animation math, textures, materials, uniforms or render passes. Target advice adds one conditional absolute vertical-distance check during existing UI updates. No target-device FPS or hydrodynamic accuracy claim is made.

All four runtime copies have SHA256 `f2ef9cbc4c1a9899703bad86da73d2553704bb3953428cdac1b47098a8af3450`. Reversing five exact cumulative guards byte-for-byte recovers the complete pass30 baseline `ce0c01a8fc85d002bc970c5103fec84be77ff9d2fd42a295fbe629219c9e2182`.
