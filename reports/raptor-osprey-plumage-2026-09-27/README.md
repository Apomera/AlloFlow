# Raptor Lab: osprey plumage

The osprey now has a brown back above its pale breast, pale underwings with dark wrist patches, and barred flight feathers with darker primary tips. Its existing white head, eye stripe, and tail bands remain. These representative adult features follow [Cornell Lab's Osprey identification guide](https://www.allaboutbirds.org/guide/Osprey/id); real birds vary with age, region, and individual plumage.

Choosing **Inspect → Wing feathers** during flight starts beneath the osprey's wing. The prompt invites learners to find its wrist patch and bars, then choose **Above** to compare the upper wing. The breast prompt encourages a similar back-to-breast comparison. Grounded wing inspection still opens beside the folded wing. Saved moments and matched views retain the underside angle.

## Rendering

The torso uses its existing dorsal-to-ventral vertex-color blend with a corrected brown dorsal color. This also updates the existing contrast-based readability lighting to use that dorsal color. Flight mechanics are unchanged.

The three existing wing materials shade their underside directly. A static two-component coordinate attribute records each feather's pigment placement before folding or primary-pivot translation, keeping the pattern attached through morphing and flex. Main wings and batched feathers have upward front faces; primary vanes have downward front faces. The shader accounts for both conventions on both wings. Derivative filtering fades unresolved bars at distance. Existing feather relief and lighting still apply.

No meshes, vertices, materials, textures, draw calls, or animation loops were added. The new coordinate attributes are part of the existing geometries and follow their disposal lifecycle. Other species keep their existing materials and wing-inspection angles.

## Verification

The initial low/high-quality scenarios passed in 47.5 seconds. All 15 final scenarios passed in 9.7 minutes, with no failures, retries, or skipped cases: two expanded osprey scenarios, four facial-marking scenarios, three layered-feather scenarios, and six breast-study scenarios. Both source syntax checks, the scoped whitespace check, mirror parity, and translation-key/fallback checks passed. Final source hashes and results are recorded in `verification.json`.

`tests/e2e/raptor-osprey-plumage.spec.ts` checks both actual wing groups from above and below against the same geometry and lighting with the underwing shader disabled. Above should remain unchanged; below must visibly change without extra draws. It also covers finite geometry and morphs, contrasting torso colors, frozen readings and no idle redraws, saved-view matching, camera restoration, phone layout and scoped accessibility, Studio/Habitat rendering, assisted landing, folded wings, takeoff, stable geometry/texture buffers, and disposal.

`low-surface-checks.json` and `high-surface-checks.json` record the pixel comparisons and structure checks. `*-underwing.png` and `*-underwing-control.png` show the same frozen camera with the new shader enabled/disabled. The remaining images show upper wings, breast/back contrast, folded wings, habitat lighting, and the phone layout. These are local Chromium/WebGL checks, not physical-device performance measurements.

## Scope

Canonical file: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Two English-fallback translation keys are listed in `translation-keys.json`; shared language-pack integration remains pending. Shared hosts, catalogs, harnesses, and language packs are untouched. All changes remain local; no commit, push, or deployment was performed.
