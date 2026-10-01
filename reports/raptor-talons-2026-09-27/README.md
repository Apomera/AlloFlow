# Raptor Lab: curved toes and talons

The feet now hold up to the existing anatomy close-up. Smooth toe and claw paths replace the visibly angular four-ring tubes. Bare feet have subtle scale seams, and the dark talons catch a softer highlight than the surrounding skin. The existing flight, strike, standing, and takeoff morph remains the only animation driver.

The osprey now uses the two-forward, two-back arrangement already supported for owls. Each family gets a short observation prompt: trace the curved talons, identify the opposing toes, and compare the feet before and after takeoff. The owl and osprey prompts explain that the outer toe can move rather than implying a fixed arrangement in live birds.

## Implementation

- Sample the authored leg, toe, and claw paths with a bounded cubic radius and a stable reference axis for each tube. Construct both morph poses once during scene setup.
- Mirror the completed positions and triangle winding together. Both pose positions and normals remain symmetric.
- Retain two foot meshes sharing one material. Each foot has 738 vertices at low quality and 1,422 at balanced/high quality, up from 234. No additional materials, textures, draw calls, or animation loops are introduced.
- Store surface coordinates in one geometry attribute. The existing material shades bare-leg/toe seams and distinguishes the talon's roughness. Pixel derivatives fade the seams at flight distance. Owl legs and toes are excluded from the scale pattern.
- Compute ground clearance from the completed standing geometry, using the existing contact and camera-framing paths. No flight physics, grip force, or toe articulation is added.

These are stylized visual models, not specimen reconstructions. The model does not animate a reversible outer toe or simulate gripping. The anatomical reference for toe arrangements and curved talons is Cornell's [All About Raptor Feet](https://academy.allaboutbirds.org/all-about-raptor-feet/); the [Osprey overview](https://www.allaboutbirds.org/guide/Osprey) also describes the reversible outer toe.

## Verification

`tests/e2e/raptor-talons.spec.ts` covers low-quality falcon and owl feet and high-quality osprey feet. It checks finite mesh data, unit normals, left/right symmetry, smooth hook curvature, actual forward/rear tip positions, shared material rendering, stable geometry buffers, frozen study state, no idle redraws, surface shader pixel contribution, standing ground clearance, and tucking after takeoff. The owl also covers a phone viewport with reduced motion.

The first run passed the falcon and reached the osprey's landing check before failing: the test assumed every species had a lookout-practice profile. The osprey has none, so its case now uses the real assisted descent controls. No application behavior was changed to accommodate the test.

All three corrected talon cases passed in 56 seconds. All eight existing flight-continuity, anatomy-study, and resting-tail regressions passed in 3.1 minutes with no retries or skipped cases. These include ground contact, strike extension, study framing, phone/fullscreen accessibility, restart cleanup, saved-view matching, notebook transfer, and export. Both source syntax checks and the scoped whitespace check passed; the canonical source and desktop mirror have identical hashes.

The isolated material comparison initially restored an overhead view before the phone screenshot. The test now restores the default foot inspection angle so the phone review actually shows the feet; the owl case is repeated to verify that corrected capture. Results and final source hashes are recorded in `verification.json`. These are local Chromium/WebGL checks, not physical-device frame-rate measurements. The unrelated broad unit-suite baseline failures were not revisited.

## Artifacts and scope

`*-tucked.png` and `*-extended.png` capture each species in the app's actual study view. `greatHorned-low-phone.png` shows the narrow layout. `peregrine-before.png` and `owl-before.png` preserve the previous anatomy pass's screenshots; their flight moments differ and are not controlled pixel comparisons.

Canonical source: `stem_lab/stem_tool_raptorhunt.js`. Desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js`. Shared hosts, harnesses, catalogs, and language packs are untouched. Three new translation keys have English fallbacks; shared language-pack integration is pending in `translation-keys.json`. No commit, push, or deployment was performed.
