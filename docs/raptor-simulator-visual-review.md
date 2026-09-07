# Raptor Lab: simulator visual upgrade

The flight simulator now uses a more detailed procedural world, richer atmospheric lighting, and an optional scenic view. Changes are in `stem_lab/stem_tool_raptorhunt.js` and the identical desktop public mirror.

## Changes

- Directional sky shading adds a deeper zenith, a horizon haze band, sun-facing warmth, and continuous day, twilight, night, and overcast transitions.
- World-space, multiscale surface shaders replace visibly stamped ground texture with continuous soil and rock variation. Cliff grass uses a more natural palette, and near-camera haze is reduced.
- Mountain silhouettes use eroded height fields with connected peaks and saddles. Snow samples exactly the same parent geometry and clips at the snow line instead of floating on separate cone surfaces.
- Mountain ranges and landmarks remain anchored in the world, creating real parallax. Decorative peaks sit beyond the playable world boundary.
- Tree clusters are denser and use alpha-tested needle and leaf silhouettes. Crossed branch cards retain foliage volume while reducing geometry cost. Instanced meadow detail adds scale close to the ground.
- Balanced and high graphics enable a local soft-shadow map for the bird, trees, and cliff. Low graphics avoids this additional shadow pass.
- Water uses view-angle-dependent sky reflection and directional sun glitter driven by the simulation clock. The previous decorative highlight disk is hidden.
- Individual flight-feather layers now carry the feather atlas and surface detail rather than covering the textured wings with plain triangles.
- The in-flight **Scenic view** button hides targeting, instrument, and airflow overlays. Pause, results, flight controls, and the button to restore overlays remain available. Toggling does not rebuild the simulator or reset a flight.
- Canvas sizing preserves responsive CSS dimensions, keeping the bird in frame when the flight panel narrows. A browser regression checks the canvas fits its container.
- New water and grass movement follows the pause-aware clock and freezes under reduced motion.

## Verification

- Existing flight-continuity browser suite: 3/3 passed (chase framing, pause/resume, landing/takeoff, reduced motion).
- New cinematic browser suite: 3/3 passed for a balanced peregrine cliff flight, a high-quality eagle lake flight, and a low-quality owl night flight. The final night scenario also passed at 420 px with reduced motion enabled.
- Browser checks cover shader/page errors, scenic toggle and restoration, pause visibility, frozen scenery time while paused, stationary mountain origins, quality-dependent shadows, active water, and fewer than 150 main-render draw calls in the checked scenes.
- Geometry tests verify parent/snow world-space coincidence at every vertex, finite normals, grounded skirts, and quality-dependent mesh detail.
- Final focused unit run: **208 passed, 2 existing failures**. The remaining assertions concern an older literal English label that already uses a translation helper, and an existing accessibility-language-pack deficit of 225 keys against a threshold of 175. Neither count was increased by this pass.
- Both live source copies are byte-identical; syntax and patch-whitespace checks pass.

## Local previews

- `scratch/raptor-flight-review/cinematic-cliffs.png`
- `scratch/raptor-flight-review/cinematic-lake.png`
- `scratch/raptor-flight-review/cinematic-night-low.png`

Reproduce the browser checks with:

```
npx playwright test tests/e2e/raptor-cinematic-rendering.spec.ts tests/e2e/raptor-flight-continuity.spec.ts --workers=1 --retries=0
```

This remains a lightweight procedural renderer. Water reflections approximate the sky and sun rather than mirroring all scene geometry. Browser checks use local Chromium/WebGL and disable optional bloom; physical-device frame rates and the optional bloom composer were not profiled. Flight physics and the terrain collision sampler were preserved. Changes are local and have not been deployed.

## Additional visual refinement

- Exposed, curved primary feathers now extend beyond the supporting wing surface, so soaring birds have visible feather slots. Twelve rounded tail feathers replace the solid angular tail panel; species proportions and existing tail steering remain intact.
- The lake uses concentric interior geometry, world-space irregular wave normals, depth-tinted shallows, and a soft shoreline. Highlight shading follows the same animated normal as the water lighting.
- Bent canopy normals and overhead branch cards improve foliage volume from the chase camera. Leaf-textured scrub replaces solid polygon bushes, and lake landmarks use a subdued stone palette.
- Clouds have coherent edge detail and shaded undersides, with reduced brightness at night. Rock materials gain fine normal detail.
- A surrounding terrain mesh copies the playable terrain boundary and extends beneath the distant mountains, closing exposed sky gaps during elevated flight. It does not change the collision sampler or playable area.

Focused geometry and simulator unit run: 167 passed; the same two existing experience/translation assertions failed. Geometry checks also verify the lake interior has consistent winding and feather geometry is mirrored with tips outside the wing support.

The atmosphere now resolves distant fog through the same ACES and sRGB output pipeline as the sky horizon. This removes the saturated horizon band exposed by the surrounding terrain. The combined visual and flight-continuity browser run passed all six checks; final visual captures were repeated after the fog correction.

## Flight smoothness and engagement

- Keyboard steering uses an exactly integrated exponential response. Pointer drag deltas are bounded and applied during animation frames, reducing abrupt changes between pointer events. Pause, blur, cancellation, and control resets clear queued input. Opposing keyboard directions cancel.
- Balanced graphics caps shadow refreshes at 20 Hz; high graphics caps them at 30 Hz, independently of the main render loop. Water no longer rebuilds CPU vertex normals that its analytic shader replaces. These reduce rendering work; hardware FPS was not profiled.
- Open flight includes an optional **Flight trail** button: five numbered rings, three visible upcoming gates, direction and altitude hints, one-point passes, two-point centered passes, and immediate replay without resetting the flight. Routes remain inside the play area and follow sampled terrain clearance. Scoring uses swept forward plane crossings, so nearby or reverse passes do not count.
- Practice suppresses conflicting target markers and target-driven camera framing while keeping manual flight controls. Pause freezes the trail, and reduced motion removes pass expansion effects while preserving scoring. Completion feedback clears after six seconds; scene cleanup removes the trail controls and mode attribute.
- New labels are registered in the English and French dictionaries and desktop mirrors. Other locales use the English fallbacks for this new feature.

Validation: focused unit run 170 passed with the same two pre-existing failures; tests cover frame-rate-independent steering, swept ring crossings, route bounds, terrain clearance, and the existing geometry contracts. Browser checks cover real keyboard/pointer input, queued-input clearing, scheduled shadow work, all five gates, pause, replay, reduced motion, and existing flight continuity. Preview: `scratch/raptor-flight-review/flight-trail.png`.

## Ring readability and responsive flight poses

- The next ring now has a segmented inner target at the exact centered-pass radius, fine outer ticks, and a restrained halo that strengthens on approach. Future rings stay faint. Successful passes send the ticks gently outward; stopping the trail clears the effect immediately, and reduced motion disables it.
- A compact five-step strip shows the current gate, ordinary passes, centered passes, and misses with distinct symbols as well as color. The score stays visible during flight. Each step has a localized accessible name, and the current one uses `aria-current="step"`. Existing English/French strings are reused.
- Ring numbers sit inside their lower edge, avoiding the taller progress panel. The progress strip wraps its explanatory text at phone widths without horizontal overflow.
- Damped bank motion adds a small asymmetric wing adjustment and tail fan, with a subtle tail pitch during climb/dive input. Extra asymmetric wing motion and tail pitch are suppressed for perched/crashed birds and reduced motion. Flight physics and camera behavior are unchanged.
- Target detail uses three additional meshes on the active ring, with existing objects reused across courses; no per-frame geometry is allocated for these effects. Browser draw-call checks remain below 150 in the checked scenes. Physical-device frame rates have not been profiled.

Validation: all eight local browser checks passed, including the full five-ring course, replay, pause/resume, steering onset/settling, reduced motion, narrow HUD fit, and existing cliff/lake/night scenes. Focused unit checks remain 170 passed with the same two existing label/translation failures. Final previews are `scratch/raptor-flight-review/flight-trail.png` and `scratch/raptor-flight-review/flight-trail-narrow.png`.

## Fuller meadow and forest scenery

- Replaced isolated two-triangle grass blades with curved tufts, shaded from dark roots to lighter tips. Tufts form small patches, align with sampled terrain slopes, and avoid steep ground and the lake interior.
- Detail scales to 7/10/13 blades per tuft for low/balanced/high quality. Instance caps are 700/1,600/2,800 to account for the richer geometry; meadow patches favor the central valley while remaining anchored in the world. Grass remains one instanced draw and adds no per-frame geometry allocation. Distance tapering between 105 and 180 metres reduces distant visual noise; it does not eliminate GPU vertex processing.
- Tree crowns use fuller overlapping layers and broader silhouettes. Shrubs now remain upright beside rocks. Ground rocks use the existing procedural surface shader, with world coordinates corrected for instanced meshes so their detail follows their actual location.
- Grass sway shares the existing pause-aware scenery clock and freezes under reduced motion. Flight physics, input controls, scoring, and camera behavior are unchanged.

Focused unit checks: 172 passed, including two new tuft-geometry checks for planting-plane roots, tapered curves, finite normals, valid indices, and nondegenerate triangles. The same two existing label/translation assertions remain failing. Both simulator copies match and JavaScript syntax passes. Hardware frame rates have not been profiled.

Browser verification: all eight scenery, continuity, and practice-course cases passed. The cliff case was repeated successfully after the final meadow placement and instance-budget adjustment, including a closer-to-ground capture. Final previews: `scratch/raptor-flight-review/cinematic-meadow.png` and `scratch/raptor-flight-review/cinematic-cliffs.png`. Changes remain local and have not been deployed.

## Organic boughs and bird surface refinement

- Conifer crown layers now use irregular sprays of needle-covered branches instead of repeating a complete triangular tree texture. Curved panels and overhead bough surfaces give the foliage more depth and break up straight silhouette edges. The forest retains its existing instanced draw calls.
- Broadleaf panels retain their original layout. New geometry checks verify the conifer panels meet without position or UV gaps, stay within their crown envelope, have unit normals, and contain no degenerate rendered triangles.
- Balanced and high graphics use smoother body/head meshes. Crown markings follow the head surface as a shallow spherical cap, and the body feather texture repeats less often so its detail reads more clearly. Species colors, field-mark identifiers, flight physics, and camera behavior are preserved.

Unit verification: 173 unique checks passed across the initial run and targeted reruns; the same two existing label/translation assertions remain failing. The initial fork-worker run was interrupted, skipped geometry/control cases, and failed an unchanged stylesheet fixture. All eight geometry/stylesheet checks and all three control checks subsequently passed in targeted runs using threads. This was not a clean single-run unit result. Source copies are byte-identical and syntax/patch checks pass. Hardware frame rates were not profiled.

Visual verification: all three browser cases passed (balanced cliff/peregrine, high lake/eagle, low narrow night/owl with reduced motion). The final close-up, lake, and night captures were visually reviewed. Checks include active curved-bough geometry, bird framing, scene errors, pause, scenic controls, and the existing draw-call bound. Preview: `scratch/raptor-flight-review/cinematic-meadow.png`. Changes are saved locally and have not been deployed.
