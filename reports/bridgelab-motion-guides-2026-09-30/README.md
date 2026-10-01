# Bridge Lab: see motion against a resting reference

## Use the guide

In Stress Test, enable **Earthquake experiment**, then open **Motion guide** inside the 3D scene. It works in the orbit view, on the bridge, and in fullscreen.

- Dashed white rails mark the deck's resting position. They stay fixed as the simulated ground and deck move.
- A circle tracks ground movement and a diamond tracks deck movement. The connecting bracket shows their separation.
- Three signed readings report ground from rest, deck from rest, and deck relative to ground. All are actual displacements in centimeters. The 3D scene retains its labeled 10× magnification.
- The diagram uses a fixed range for the full 24-second experiment. In an A/B scene comparison, both trials share a range covering both complete responses. Neither scrubbing nor switching A/B changes that range.
- Closing the guide hides the resting rails. It preserves the selected time, viewpoint, trial, and experiment inputs.

In 2D or after WebGL loss, the same guide appears beneath the elevation and explicitly reports the current experiment. Reduced motion retains deliberate time inspection. Zero shaking shows zero readings with a finite diagram range.

## Model and rendering

The guide reads the existing elastic earthquake model. Relative displacement is the deck's displacement from rest minus the ground's displacement from rest. It does not add a new dynamic solver or infer bridge failure from the animated motion. The existing static member-force analysis remains separately labeled.

The resting rails are one dashed line object in world coordinates, outside the moving structure and ground groups. Visibility changes reuse that mesh. The overlay is drawn through scene objects so its stationary outline remains visible from the deck. Recovery rebuilds it with the rest of the scene.

## Verification

Unit results: **92 checks passed across five files**. Coverage includes stationary references, geometry reuse, A/B measurements and scale, zero input, reduced motion, 2D fallback, context failure, the seismic solver, saved evidence, and print output.

**21 Chromium browser workflows passed**, covering desktop and 320-pixel phone layouts, fullscreen, keyboard controls, A/B scale and values, resource reuse, zero shaking, reduced motion, saved investigations, and WebGL loss and recovery. The final layout pass rechecks 46 interaction tests and nine browser workflows; repeated checks are counted once. The phone panel keeps all three readings visible in its compact single-trial view; longer explanations and comparison controls remain scrollable.

Both Bridge Lab source copies match byte-for-byte, and all 989 literal English fallbacks match both registries. Run the source and coverage verifier from the repository root:

    node reports/bridgelab-motion-guides-2026-09-30/verify.cjs

- [Unit results](unit-results.json)
- [Final interaction recheck](unit-final-results.json)
- [Browser results](browser-results.json)
- [Final browser recheck](browser-final-results.json)
- [Source and coverage verification](source-verification.json)

## Previews

- [On the bridge, desktop](bridge-1000-motion-guide.png)
- [A/B in fullscreen, desktop](bridge-1000-motion-a-fullscreen.png)
- [Orbit view, desktop](bridge-1000-motion-orbit.png)
- [On the bridge, phone](bridge-320-motion-guide.png)
- [A/B in fullscreen, phone](bridge-320-motion-a-fullscreen.png)
- [2D motion guide, phone](bridge-320-motion-fallback.png)
