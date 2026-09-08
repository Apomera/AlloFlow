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

## Weather-responsive vegetation

- Grass, shrubs, and tree boughs now respond to the existing wind direction, speed, and gusts. The response eases through direction changes and settles in calm air. Visual strength is bounded, and roots stay anchored while taller plant parts flex more.
- A shared GPU deformation converts the world wind through each instance's rotation and scale, keeping differently oriented plants moving in a consistent direction. Only shared wind values update each frame; geometry and instance matrices are not rebuilt for the animation.
- Enabled foliage shadows use the same deformation, clock, and alpha-tested branch texture as the visible crown. Low graphics keeps shadows disabled. Custom depth materials are disposed during scene cleanup without separately disposing their shared branch textures.
- Pause freezes the wind response and scenery clock. Reduced motion disables vegetation displacement immediately, and restoring motion eases it back in. Flight physics, camera controls, and ring scoring are unchanged.

Focused unit verification: all 12 geometry, flight-control, and vegetation-response checks passed in one threads-based run. Coverage includes compass direction, extreme-wind bounds, calm-air settling, frame-rate-independent transitions, and reduced-motion reset/recovery. Hardware frame rates were not profiled.

Browser verification: all three cliff/lake/night scenarios passed. Checks confirmed calm vegetation, compiled surface and shadow deformation shaders, gradual eastward wind response, frozen wind values while paused, immediate reduced-motion suppression, smooth recovery, and the existing draw-call bound. The windy-meadow capture was visually reviewed for rendering artifacts: `scratch/raptor-flight-review/cinematic-windy-meadow.png`. Changes remain local and have not been deployed.

## Continuous lake motion and shoreline refinement

- Replaced scheduled CPU vertex rewrites with continuous GPU waves. The surface and its reflected normals share the same long-wave phases. Wave strength follows the existing smoothed wind and gusts; the displacement settles toward shallow edges and the perimeter.
- Added irregular ripple patches, small crosswind ripples, and pixel-footprint fading for fine detail at distance. Reflections reuse the surface normal, with a softer sunlight contribution and procedural cloud color in the reflected sky. These are procedural reflections, not scene ray tracing.
- Shallow water blends through mineral green and turquoise, with subtle bed variation and a restrained shoreline wash. The existing terrain, basin boundaries, flight physics, camera, and scoring are preserved.
- The shared scenery clock freezes all water animation while paused. Reduced motion restores a stationary calm surface without retaining displaced CPU geometry. The animation uses the existing lake mesh and adds no draw calls or per-frame geometry uploads.

Validation: all 12 focused geometry, wind, and flight-control unit tests passed. The final browser run passed all four scenarios: balanced cliffs, high-quality lake, low-quality night, and a narrow low-quality lake with reduced motion. Lake checks exercise wind, pause/resume, reduced-motion changes, successful shader compilation, and unchanged geometry buffer versions. The existing draw-call bound remains under 150. An earlier capture stalled with the simulated clock; captures now use the stage's bounding box without waiting for locator animation stability. A WebGL reserved-word error found during the first lake run was corrected before the final passing run.

The high-quality windy lake and narrow low-quality lake captures were visually inspected. Previews: `scratch/raptor-flight-review/cinematic-windy-lake.png` and `scratch/raptor-flight-review/cinematic-lake-low.png`. Source copies are byte-identical; JavaScript syntax and patch whitespace checks pass. The browser uses software WebGL with optional bloom disabled; physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Curved wings and feather follow-through

- Replaced flat inner-wing panels with a cambered surface. A shared sampler preserves species-specific swept and elbowed outlines while keeping left and right wings symmetric. Geometry scales to 77/105/133 vertices per wing at low/balanced/high quality.
- Fitted the existing layered feathers to the curved surface. Shoulder and outer-wing field marks now follow the same surface as narrow strips, replacing raised rectangular blocks. Existing species colors and identification cues remain in place.
- Slotted outer primaries now pivot from their own quill roots. A damped response adds subtle follow-through during wingbeats, decreases it during a dive, and settles when the wings stop moving. Pause freezes the pose; reduced motion, landing, and crashes clear the added motion.
- Feather movement uses ordinary mesh transforms, so visible geometry and its shadows move together. Mesh counts and draw calls are unchanged, and animation introduces no per-frame geometry uploads. Flight physics, controls, camera, and scoring are unchanged.

Focused unit verification: all 16 geometry, control, vegetation, and new wing/feather tests passed. New coverage includes mirrored surfaces, elbow continuity, upward unit normals, nondegenerate triangles, quality scaling, bounded follow-through, settling, dive attenuation, and immediate motion suppression.

Climbing with E now triggers active wingbeats as well as the existing vertical movement. The new browser check exposed that this input previously left the bird gliding; the connection now gives climbing visible effort. The thermal-kettle mission retains its existing exception, and reduced motion still suppresses wingbeats.

Browser verification: all seven unique cinematic and flight-continuity scenarios passed across targeted runs. The three continuity cases passed first; the cliff case passed on rerun; the final run passed high-quality eagle, low-quality night owl, and narrow low-quality eagle. Checks cover active climb-driven feather response, pause, reduced motion, camera continuity, landing/takeoff, fitted wing detail at each quality tier, and the existing draw-call bound. An earlier recording teardown stalled, so cinematic checks now save explicit scene PNGs with video disabled and allow five minutes for software-rendered readbacks. The complete seven-case suite was not a clean single-run result.

The falcon glide and final eagle wingbeat captures were visually inspected. Preview: `scratch/raptor-flight-review/cinematic-eagle-wingbeat.png`. Source copies are byte-identical, syntax checks pass, and patch formatting is clean. Physical-device frame rates have not been profiled. Changes are saved locally and have not been deployed.

## More varied ridges and slope-aware terrain

- Distant mountains now combine offset summits with a seeded ridge spine, saddles, eroded shoulders, and shallow gullies. The existing quality-scaled mesh budgets and grounded skirts remain intact; the generator does not consume gameplay randomness.
- Steeper parts of the valley expose a stone surface, blending through interpolated world-space normals so the color transition does not reveal individual terrain triangles. Existing ground colors remain on gentler slopes.
- Rock materials use restrained mineral variation and broader seams. Fine grain fades with pixel footprint at distance to reduce visual noise. Snow coverage responds to slope, exposing steeper rock faces, with subtle cool-toned drift variation. Snow geometry remains coincident with its parent ridge.
- Mesh and draw-call counts are unchanged. The playable terrain geometry, terrain collision sampler, controls, and scoring are unchanged. These refinements do not add per-frame geometry uploads.

Focused unit verification: all 18 geometry, wing, wind, and flight-control tests passed. Two additional checks cover seed-dependent silhouettes, grounded skirts, bounded elevations, and exact snow/rock alignment across graphics tiers and seeds.

Final browser verification: all four cinematic scenarios passed in one run after the material refinement: balanced cliffs, high-quality lake, low-quality night, and a narrow low-quality lake with reduced motion. Checks include shader errors, scenic controls, pause, wind, wingbeats, water-buffer continuity, and the existing draw-call bound. The initial visual review caught faceted slope-color transitions; interpolated normals removed those hard transitions, and the final cliff/ridgeline capture was visually reviewed.

Preview: `scratch/raptor-flight-review/cinematic-cliffs.png`. The canonical and desktop simulator files are byte-identical; syntax and patch-format checks pass. Validation used software WebGL with optional bloom disabled; physical-device frame rates were not profiled. Changes remain local and have not been deployed.

## Grounded rest pose and softer landing feedback

- Birds ease into a folded-wing resting pose and unfold progressively during takeoff. The tail narrows at rest. The visual model settles its feet onto the sampled ground while the existing collision envelope and takeoff physics stay intact. The contact shadow follows the visual height and tightens beneath the folded bird.
- Landing and takeoff dust uses a soft radial texture, natural earth or cold-biome colors, expanding puffs, wind drift, and drag. Exact drag integration keeps free particle motion consistent across frame rates. Each particle samples its own terrain height rather than colliding with a flat plane, and a separate scenery random stream avoids consuming gameplay randomness for dust.
- Enabling reduced motion clears an active touchdown effect immediately, including while paused. Pause freezes effect age and the resting pose. Existing scene cleanup owns the new puff texture through its material.
- Fixed the final overlay visibility pass so it cannot re-enable airflow lines while landed or under reduced motion. Speed streaks are also suppressed on the ground. Ground-contact prompts are cleared on takeoff so the old landing instruction does not linger alongside the launch cue.
- The effects retain their existing particle pools and mesh counts. Resting posture uses mesh transforms, and contact-shadow changes preserve the existing shadow mesh.

Focused unit verification: all 22 geometry, flight-control, wing, wind, and ground-contact checks passed. New checks cover progressive folding/unfolding, stable resting poses across frame rates, exact wind/drag integration, and dust contact on sloping terrain.

Final browser verification: all seven cinematic and continuity scenarios passed in one run. The expanded ground-contact case verifies a folded resting silhouette, visual ground clearance, hidden flight overlays at rest, unchanged takeoff physics, progressive unfolding, removal of stale landing prompts, soft dust, pause behavior, and immediate reduced-motion cleanup while paused. The final resting and takeoff captures were visually inspected after correcting the initial hovering appearance and stale overlays.

Previews: `scratch/raptor-flight-review/cinematic-perched.png` and `scratch/raptor-flight-review/cinematic-takeoff.png`. Canonical and desktop simulator files are byte-identical; JavaScript syntax and patch checks pass. Browser validation uses software WebGL with optional bloom disabled; physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Clearer target tracking and unobstructed edge guidance

- Replaced the closed red target box with a quiet cyan corner frame, leaving the animal visible. Close and strike-ready states retain distinct amber and green cues, with a compact two-line status and target caption. Offscreen targets now have an actual directional chevron, including diagonal bearings corrected for the viewport aspect ratio.
- Captions stay inside the stage and flip above low targets. Offscreen markers also reserve space for the flight instruments, mission panel, and controls. HUD measurements are cached and refreshed by the existing resize observer, including observed panel-size changes. Caption text is only rewritten when its content changes.
- Fixed the final scene visibility pass so it cannot restore a target guide that was disabled by target assist or reduced motion. Scenic view and practice trails hide both the live DOM tracker and the target halo; the guide preserves its earlier visibility gates.
- Target projection, strike eligibility, controls, scoring, and flight physics retain their existing behavior. Only offscreen marker placement moves into the clear flight area; the onscreen frame still follows the projected target.

Focused verification: all 24 geometry, flight-control, wing, wind, ground-contact, and target-caption checks passed. The two new placement checks cover all viewport corners and low-target label flipping.

Browser verification: the four existing cinematic scenarios and both new guidance scenarios passed in the initial six-case run. Visual review then caught an edge caption hidden behind the mission HUD. After adding cached HUD clearance, both guidance cases passed again at tall and original shorter viewport heights. Their final assertions check that marker and caption bounds avoid the mission panel, telemetry, altitude gauge, and controls, and cover assist toggling, scenic view, practice trails, reduced motion, behind-camera hiding, and browser errors. The final complete narrow-stage capture and desktop captures were visually inspected. The final placement-only adjustment was verified with the guidance suite; the four scenery cases were not repeated after that adjustment.

Previews: `scratch/raptor-flight-review/target-guidance-1100.png` and `scratch/raptor-flight-review/target-guidance-420.png`. The canonical and desktop source copies are byte-identical; syntax and patch-format checks pass. Browser validation uses software WebGL with optional bloom disabled; physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## More natural wildlife silhouettes and motion

- Bird prey now use curved, tapered wing surfaces with subtle feather-edge variation and darker flight feathers. Wings pivot from the shoulders, fold alongside the body at rest, and open progressively with the existing escape height. The new tail is a single connected feather fan, avoiding the overlap shimmer caught during close visual review.
- Birds have shaped bills and visible eyes merged into the head geometry, preserving smooth head normals and the existing five-mesh count. Ducks and waterfowl have muted body plumage with a green head. The existing visual scale and ground-contact envelope remain intact.
- All prey turn visually through the shortest heading arc instead of snapping to each new velocity. Airborne birds bank gently through turns and settle afterward. Wing spread responds smoothly to ascent and landing; resting bird tails stay quiet. Reduced motion removes decorative banking and wingbeats, and pause freezes the complete pose.
- Prey movement, detection, escape targets, collision positions, and scoring retain their existing behavior. Animation uses transforms rather than per-frame geometry uploads. Head detail adds a modest number of triangles but no extra draw calls per bird.

Verification: all 28 focused simulator checks passed together; the four affected wildlife checks passed again after the final bill and normal refinements. They verify mirrored wing geometry, finite normals and nondegenerate triangles, unchanged resting clearance and five-mesh count, actual transformed feather-tip reach, shortest-arc turning, heading/spread consistency across frame rates, landing folds, and reduced-motion behavior. A concurrent unit rerun hit a worker-start timeout during software rendering; the later sequential runs passed.

Browser verification: all four cinematic scenarios and the new wildlife case passed together. The wildlife case passed again after the final model refinements, checking real simulator pose diagnostics, pause, reduced motion, browser errors, and the existing draw-call bound. A separate close study renders the production builders with resting and flying poses and confirms ten draw calls for the two five-mesh birds. The four scenery cases were not repeated after the final detail-only adjustments.

The final close study was visually inspected: `scratch/raptor-flight-review/wildlife-wing-study.png`. This is a review scene using the production models; its layout is not part of the simulator UI. Source copies are byte-identical; syntax and patch-format checks pass. Browser validation uses software WebGL with optional bloom disabled, and physical-device frame rates have not been profiled. Changes remain local and have not been deployed.
