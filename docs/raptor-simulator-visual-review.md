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

## Directional, wave-following lake wakes

- Replaced pulsing oval rings with soft V-shaped crests and restrained trailing ripples. Wakes follow swimming direction through the shortest heading arc, scale smoothly with speed, and fade after stopping or leaving the surface. Deep fish no longer create surface rings; only fish very close to the surface can produce a faint disturbance. Shallow shore contact suppresses wakes over land.
- Wake vertices use the same wave function, wind uniform, and paused time source as the lake. Soft edge coverage and pixel-footprint fading reduce distant shimmer. Color responds to daylight, and the new effect does not consume gameplay randomness.
- All wakes share one geometry: 45 vertices on low quality and 153 on other tiers. There is still one mesh per eligible animal, with no per-frame geometry uploads. Individual material disposal remains tied to prey removal, and the existing scene cleanup owns the shared surface. Enabling reduced motion clears wake visibility and opacity immediately, including while paused.

Verification: all 32 focused simulator checks passed. Four new checks cover heading continuity, frame-rate-consistent smoothing, water depth and surface contact, quiet deep fish, takeoff suppression, residual fading, reduced motion, and bounded wake dimensions.

Both new browser scenarios passed in the final run: high-quality lake and a narrow low-quality lake. They verify live surface wakes, absent deep-fish wakes, quality-scaled geometry, unchanged vertex-buffer versions, pause, reduced-motion changes while paused, successful shader compilation, browser errors, nonblank framebuffer capture, and the existing draw-call bound. The review uses the actual simulator scene with a temporary close camera; that camera and preserved framebuffer are test-only. Initial asynchronous screenshots were blank, so the harness now captures the framebuffer directly and checks a rendered pixel before saving it. Final high and narrow previews were visually inspected.

Previews: `scratch/raptor-flight-review/lake-wake-high.png` and `scratch/raptor-flight-review/lake-wake-low.png`. Canonical and desktop sources are byte-identical; syntax and patch-format checks pass. Browser validation uses software WebGL with optional bloom disabled. Physical-device frame rates were not profiled. Changes remain local and have not been deployed.

## Waterbird buoyancy and natural surface contact

- Floating birds now use the same analytic wave model, wind values, and simulation clock as the lake. Their visual height follows the surface, and gently damped pitch and roll respond to wave slope in the bird's heading. This replaces the unrelated swimming bob.
- A modest visual draft places the lower body into the water. Water contact blends out continuously as the existing escape height rises, transitioning to the existing airborne pose and banking. Collision centers, flight height, movement, and scoring remain unchanged.
- Reduced motion removes decorative pitch and roll immediately, including while paused. Static water-surface placement remains available when simulation resumes. Pause freezes the full floating state. The update uses existing mesh transforms and adds no meshes, textures, or per-frame geometry uploads.

Verification: the 32 existing focused checks passed, and all four new flotation checks passed on their final targeted run. The new checks cover analytic height derivatives in deep water, shoreline wave suppression, waterline immersion without moving the collision center, heading-relative pitch and roll, frame-rate-consistent settling, continuous takeoff release, and reduced motion. Initial test assertions distinguished negative zero from zero; numerical comparisons corrected that test-only issue.

Both expanded browser scenarios passed in the final run: high-quality lake and narrow low-quality lake. Checks verify changing wave height, partially immersed visual bounds, unchanged collision height, bounded rocking, frozen pose while paused, immediate reduced-motion cleanup, existing wake behavior, unchanged vertex-buffer versions, shader compilation, browser errors, nonblank captures, and the existing draw-call bound. The final high and narrow captures were visually inspected using the test-only close camera.

Previews: `scratch/raptor-flight-review/lake-float-high.png` and `scratch/raptor-flight-review/lake-float-low.png`. Canonical and desktop files are byte-identical; syntax and patch-format checks pass. Browser verification uses software WebGL with optional bloom disabled. Physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Planted shoreline and wet-bank detail

- Added irregular reed patches along the sampled lake bank, with curved leaves, slender stems, darker roots, and brown seed heads. Placement finds the local shoreline instead of assuming a fixed radius, then rejects deep water, dry ground, and steep slopes. A separate deterministic random stream keeps the addition independent of gameplay randomness.
- Reeds use one instanced mesh per lake scene, with up to 72 clumps on low quality, 160 on balanced, and 260 on high. Clump geometry has 160 vertices on low and 224 on other tiers. Roots follow the bank orientation, and the existing GPU vegetation wind bends the stems with distance fading. Higher tiers use a matching wind-deformed depth material for shadows. The new depth material is included in cleanup.
- Added a restrained wet-bank darkening and lower roughness near the waterline, blended with small-scale variation. The effect is limited to lake ground materials; terrain geometry, collision sampling, water motion, and gameplay remain unchanged.

Verification: all 39 focused simulator checks passed in one run. Three new checks cover reed geometry and valid triangles, deterministic placement on a varying bank, sampled root heights, bounded placement, and rejection of unsuitable terrain.

Both expanded browser scenarios passed in the final run: high-quality lake and a narrow low-quality lake. They verify quality-scaled reed counts and geometry, the wet-bank material flag, unchanged instance-buffer versions through motion and reduced motion, existing waterbird and wake behavior, nonblank captures, browser errors, and the existing draw-call bound. The high and narrow shoreline captures were visually inspected using the test-only review camera.

Previews: `scratch/raptor-flight-review/lake-shore-high.png` and `scratch/raptor-flight-review/lake-shore-low.png`. Canonical and desktop simulator files are byte-identical; syntax and patch-format checks pass. Browser verification uses software WebGL with optional bloom disabled, and physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Fish silhouettes, swimming, and pause continuity

- Replaced cone-shaped fish tails with vertical forked fins that yaw around an embedded tail root. Bodies taper toward the tail and carry dark-back/pale-belly vertex shading, small eyes, swept pectoral fins, and a shaped dorsal fin. Body detail is merged into the existing mesh, retaining three meshes per fish. Paired pectoral faces use consistent winding and geometric normals.
- Tailbeat frequency and amplitude ease with actual swimming speed. Analytic integration keeps the damped stroke phase consistent across frame rates, with small coordinated body yaw and roll. The previous unrelated vertical bob is removed. Reduced motion immediately clears the decorative offsets, including while paused, and normal animation eases back in. The existing fish collision clearance is retained.
- Browser verification exposed an existing pause bug: prey expiry used wall-clock time, so a minute-long pause removed the old wildlife on resume. Prey birth, expiry, and replenishment now use the existing simulation clock. Active lifetime and replenishment intervals remain 60 seconds and 2.5 seconds respectively.

Verification: all 43 focused simulator checks passed together. The four fish checks passed again after the final fin-normal adjustment, covering finite geometry, connected forked tails, three-mesh count, nondegenerate tail faces, frame-rate consistency through speed changes, reduced motion, and gentle animation recovery.

Both expanded lake browser scenarios passed in the final run (high and narrow low quality). They verify active tail motion, no vertical bob, pause stability, unchanged prey count after a minute-long pause, preserved fish stroke phase through reduced-motion resume, zero decorative offsets under reduced motion, existing lake and shoreline behavior, the draw-call bound, and no browser errors. Initial resume checks failed because wall-clock expiry removed the fish; correcting the simulation clock resolved both scenarios.

The underwater high-quality capture and the high/narrow model studies were visually inspected. Previews: `scratch/raptor-flight-review/lake-fish-high.png`, `scratch/raptor-flight-review/lake-fish-low.png`, `scratch/raptor-flight-review/fish-detail-high.png`, and `scratch/raptor-flight-review/fish-detail-low.png`. The isolated studies clone the production fish into a test-only lighting scene; their layout is not simulator UI. Canonical and desktop sources are byte-identical; syntax and patch-format checks pass. Browser verification uses software WebGL with optional bloom disabled. Physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Sunlit clouds and continuous sky motion

- Weather clouds now use sun-facing shading, cool shadow tones, and a restrained warm edge when backlit near twilight. Their base brightness follows the same solar daylight value as the sky. The existing billow texture, sprite pool, fog, and quality-scaled cloud counts remain in use.
- Cloud lighting receives an explicit camera-relative light direction before each sprite draw. This avoids relying on the built-in view-matrix uniform, which the bundled sprite renderer does not upload for this material type. Visual review caught the resulting dark-cloud failure in the initial shader; a rendered-pixel regression now compares a lit cloud with the sky behind it.
- Clouds fade smoothly between 340 and 440 metres from the flight area's center, before the existing 450-metre wrap boundary. A separate near-camera fade softens billboard crossings. Weather opacity remains independently damped, so distance fading does not alter the weather response. The change adds no textures, meshes, or per-frame geometry uploads.

Verification: all 18 focused checks passed (cloud blending, cinematic geometry, flight practice, and fish animation). The two new cloud checks cover all wrap edges, continuity across recycled positions, bounded opacity, near-camera crossing, and smooth blend endpoints.

Both final browser scenarios passed: high quality and a narrow low-quality viewport. They render daylight, sunset, and night; check compiled cloud materials and normalized light directions; verify that daylight clouds brighten the background; enforce the existing draw-call bound; and check wind-driven drift, pause stability, reduced-motion placement, and browser errors. The final daylight high/narrow and sunset high captures were visually inspected. These use the real simulator scene with a temporary review camera and a preserved framebuffer, both test-only.

Previews: `scratch/raptor-flight-review/cloud-day-high.png`, `scratch/raptor-flight-review/cloud-day-low.png`, and `scratch/raptor-flight-review/cloud-sunset-high.png`. Canonical and desktop sources are byte-identical; syntax and patch-format checks pass. Browser verification uses software WebGL with optional bloom disabled; physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Raptor facial detail and smooth three-dimensional gaze

- The raptor now aims its head in its actual body frame, accounting for pitch and bank as well as prey height. Attention uses three-dimensional distance, retains the current animal through small distance changes, and switches when another target becomes substantially closer. The gaze eases toward a bounded yaw/pitch pose and returns forward during dives or when no eligible prey remains. Reduced motion clears the pose immediately, including while paused.
- Replaced the backward-facing cone bill with a closed, forward-projecting shape that curves down into a narrow hook. The bald eagle uses a golden bill. Eyes and pupils now sit visibly against the head, use flattened proportions aligned with the head surface, and receive light through standard materials. Every facial feature continues to share the head rig.
- Replaced the owl's flat ring marking with two curved cheek surfaces following the head, with muted radial color detail and forward-set eyes. The cheeks meet without overlapping. These changes preserve the existing mesh count and use static geometry plus head transforms; prey detection, movement, and scoring retain their existing behavior.

Verification: 34 distinct focused checks passed across the final targeted runs. Six new checks cover closed bill topology, nondegenerate faces, finite normals, a downturned tip, curved cheek placement, three-dimensional target selection, retention and release, bounded/frame-rate-consistent gaze, correct aiming in a pitched/banked body frame, neutral recovery, and reduced motion. One unchanged snow-surface check timed out in the broader run and passed when rerun alone; no terrain change was needed.

Browser verification: all three existing flight-continuity scenarios passed, covering chase framing, uneven frame intervals, landing/takeoff, pause, and reduced motion. Both new gaze scenarios passed again after the final facial refinements: high-quality bald eagle and narrow low-quality great horned owl. They verify actual right/left/downward gaze, smooth target changes, shared facial attachment, eye placement, pause stability, immediate reduced-motion reset, animation recovery, dive recentering, the draw-call bound, and no browser errors. The preference-recovery test now waits for the media-change event before advancing the fake clock. The three existing continuity cases were run before the final eye/cheek proportion adjustments.

The final eagle and owl portraits were visually inspected: `scratch/raptor-flight-review/raptor-face-baldEagle.png` and `scratch/raptor-flight-review/raptor-face-greatHorned.png`. These are test-only portrait scenes cloning the production models. Canonical and desktop simulator files are byte-identical; syntax and patch-format checks pass. Browser validation uses software WebGL with optional bloom disabled. Physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Finer contour-feather texture and softer surface relief

- Replaced the coarse chevron atlas with smaller, rounded contour feathers, subtle curved barbs, and fine shafts. Feather width, length, placement, and angle vary through a deterministic coordinate hash. Wrapped row/column descriptors repeat across the atlas boundaries without consuming gameplay randomness.
- The atlas remains 512 by 256 pixels and reuses the existing texture objects and meshes. It is painted once at initialization. Head UVs use a finer scale, and head materials receive restrained surface relief. Existing vulture head profiles retain their bare material rather than receiving the feather map.
- Reduced bump strength on the body, breast, wings, layered feathers, primaries, and tail so the feather pattern reads as plumage rather than deeply etched lines. Geometry and animation remain unchanged, with no per-frame texture or vertex-buffer updates added by this refinement.

Verification: the source passes syntax checking; canonical and desktop copies are byte-identical; patch-format checks pass. All three selected browser scenarios passed: the high-quality cinematic lake flight and the high-quality eagle/narrow low-quality owl gaze scenarios. These retain the existing draw-call bound, flight/wing checks, pause and reduced-motion behavior, gaze transitions, and browser-error checks. No new unit tests were added for this texture-only refinement.

The updated chase-camera lake view and both close portraits were visually inspected: `scratch/raptor-flight-review/cinematic-lake.png`, `scratch/raptor-flight-review/raptor-face-baldEagle.png`, and `scratch/raptor-flight-review/raptor-face-greatHorned.png`. Portraits use production models in a test-only lighting scene. Browser verification uses software WebGL with optional bloom disabled; physical-device frame rates were not profiled. Changes remain local and have not been deployed.

## Species-aware perched hunting and gameplay review

Added optional **Perched practice** in open free flight for four documented species:

- Red-tailed Hawk: waits and watches from a perch before attacking prey. [National Park Service](https://home.nps.gov/miss/learn/nature/birdsredt.htm).
- American Kestrel: scans from perches and pounces; a bird may stay on one perch or change perches. [Cornell Lab life history](https://www.allaboutbirds.org/guide/American_Kestrel/lifehistory).
- Great Horned Owl: watches from a perch and pursues prey, usually at night. The on-screen note explicitly says this exercise models visual scanning and that hearing also matters. [Cornell Lab life history](https://www.allaboutbirds.org/guide/Great_Horned_Owl/lifehistory).
- Peregrine Falcon: can watch from a high perch or search while flying before pursuing birds. [Cornell Lab life history](https://www.allaboutbirds.org/guide/Peregrine_Falcon/lifehistory).

These accounts support an optional hunting strategy, not a universal periodic-perching rule. The four-species list bounds this implementation; it does not imply that other raptors never perch. Lookout heights, collision radii, attention cues, recovery rates, and energy coefficients are gameplay parameters, not measured biological optima. Target assist is an interface aid, not a biological lock-on mechanism. Acoustic localization and foliage occlusion are not modeled by this change.

The explicit practice button moves the bird to a raised lookout. Hawks, kestrels, and owls use a weathered stump with procedural bark grain, growth rings, broken branches, and mossy stones. Peregrines use a rock lookout with the existing terrain texture. Scene-owned materials and textures are disposed with the simulator. Existing controls scan up/down and turn while resting; Space launches with the folded wings opening progressively. A slow descending crossing of the lookout's supported top can land there again; nearby flybys, upward crossings, and fast passes do not snap onto it. A simulation-time launch cooldown prevents immediate recapture. Entry is unavailable while paused or stunned and is confined to open practice.

Fixed resting pitch being reset each frame, which previously prevented downward scanning. The body stays level while the sight direction changes. Resting position and reported ground speed stay fixed in wind. Rest no longer incurs the low-speed flapping energy/stamina penalty; it uses a small maintenance cost. Elevated rest uses its support height for both collision and visual settling, and launches do not emit ground dust far below the bird.

Target assist now rejects sampled terrain-obscured prey, including targets below the terrain surface. It still uses the existing species field-of-view and range constraints. Perched targets show **Watching** and a launch prompt; striking from the raised lookout cannot award a catch. Pause and crash also guard the strike function itself. The free-flight objective card is hidden at the lookout, and narrow screens hide redundant heading/attitude panels to keep the species note readable. Lookout HUD values only write to the DOM when they change.

The new rendered tests use controlled prey positions in the actual scene to exercise production acquisition and catch logic. They do not use the HUD-only target probe to claim successful hunts. This verifies interaction/state transitions, not a complete biological detection or prey-ecology model.

Verification: 23 focused checks pass across perch visibility/contact, ground contact, practice gates, target layout, terrain sampling, world edges, pooled strike effects, camera constraints, audio gating, and cleanup. The existing source checks now normalize Windows line endings without weakening their assertions.

Eleven distinct browser scenarios passed across the targeted runs: all four perched-hunt species; three existing flight-continuity cases; two flight-practice cases; and wide/narrow target-guidance cases. They cover resting position in wind, persistent scan pitch, recovery/maintenance energy, terrain-obscured target rejection, visible target acquisition, blocked perched/distant/rear strikes, launch clearance, a successful catch and calorie reward, cooldown, pause, reduced motion, camera continuity, a complete five-ring trail, restart, and responsive layout. The affected full-trail, owl, and kestrel scenarios passed again after the final panel-class isolation and test-fixture grounding adjustment. No production detection rule was relaxed to make a fixture pass.

The final hawk and compact owl captures were visually inspected: `scratch/raptor-flight-review/perch-hunt-redTail.png` and `scratch/raptor-flight-review/perch-hunt-greatHorned.png`. The canonical and desktop simulator copies are byte-identical; syntax and patch-format checks pass. Browser checks use software WebGL with optional bloom disabled. Physical-device frame rates and a full biological/ecological simulation have not been validated. Changes are saved locally and have not been deployed.

## Steadier target attention and coordinated visual scanning

- Target assist keeps a valid current target through small distance/alignment changes. Another target takes over when its weighted distance improves by more than 20 percent; reachable strikes take priority. This threshold is interface tuning, not a claim about animal cognition. Existing range, field-of-view, terrain visibility, and strike-reach rules still apply. Removed, obscured, rearward, and out-of-range animals are released immediately.
- The visible head now follows the prey highlighted by target assist, so the reticle, camera focus, and head agree. With assist off, nearby head tracking also checks terrain visibility and the existing forward field. When resting with no selected prey, the head follows the player's vertical scan while the body stays level. Head poses remain bounded and damped; pause freezes them and reduced motion clears them.
- Attention is committed only by the flight loop. Snapshot and strike queries recheck current geometry without mutating live selection. Toggling assistance or entering perched practice resets attention, avoiding stale targets from a prior view or position.

Verification: 15 focused checks pass for attention selection, visibility, perched contact, facial geometry, and gaze damping. Eight distinct browser scenarios passed across the targeted runs: two new high/narrow attention scenarios, all four existing perched-hunt species, and both assist-off gaze scenarios. They verify retention through small target changes, a deliberate switch to a better target, matching head and reticle target identities, smooth head turns, immediate target loss, stationary downward scanning, a level resting body, pause, reduced motion, assist reset, and existing catch/cooldown behavior. The existing perch tests now extract each helper by its braces rather than depending on the next function's name.

Preview review also caught and corrected a brief incorrect “Glide” status when resuming a perched bird. Resume now derives the status from the current resting, stunned, or flight state immediately. Both simulator copies remain byte-identical, and syntax and patch-format checks pass. Changes remain local; software-WebGL browser checks do not establish physical-device frame rates.

The compact owl scenario passed again after the resume-label correction. Its final preview was visually inspected: scratch/raptor-flight-review/attention-scan-greatHorned.png.

## Folding tail feathers and quieter resting posture

The resting tail now closes by rotating the twelve existing feather surfaces inward, preserving each feather's width and length. The open and closed poses share topology and are uploaded once as position/normal morph attributes. The closure follows the existing damped wing-fold value, so the tail closes with the wings and reopens gradually on takeoff without per-frame vertex-buffer edits or added tail meshes. Tail field-mark bands are shaded directly on each feather through a static along-feather attribute, replacing three rectangular meshes on banded species. The markings follow the fold without detached bars. Close-up review also corrected an unintended notch: feather lengths now form a continuous closed outline instead of extending the outer tips beyond the center pair.

The tail now pivots at its attachment to the body. At rest it takes a slight downward angle and does not wag with look-around input. Flight retains the existing spread, lift, and steering responses; reduced motion clears steering immediately while retaining a quiet resting pose. These are visual animation refinements and do not change flight physics, detection, strike reach, or scoring.

Thirteen focused checks pass across tail shape, wing surfaces/flex, and ground contact. The new geometry checks cover five tail proportions, including the actual hawk and owl dimensions, finite positions and normals, a narrower closed fan, preserved distances within each feather, and nondegenerate triangles throughout the transition. Both simulator copies are byte-identical; syntax and patch-format checks pass.

Browser verification: five distinct scenarios passed across the targeted runs: three existing flight-continuity scenarios and two new tail-rest scenarios. The new tests cover gradual closure, quiet look-around posture, pause, smooth reopening after takeoff, reduced motion, stable position/morph buffer versions, draw-call limits, and no browser errors. Both tail-rest cases passed again after the outline correction and integrated-band shader; the owl case also confirms that the band shader compiled. The flight-continuity cases passed before those final geometry/marking adjustments.

The final hawk and owl close-ups were visually inspected: `scratch/raptor-flight-review/resting-tail-detail-redTail.png` and `scratch/raptor-flight-review/resting-tail-detail-greatHorned.png`. These close-ups clone the production bird into a test-only lighting scene. Full simulator captures are saved as `resting-tail-redTail.png` and `resting-tail-greatHorned.png` in the same directory. Browser validation uses software WebGL with optional bloom disabled; physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Coordinated folded wings

Replaced the resting wing's whole-group compression and large yaw rotation with a shared closed surface for the wing membrane, layered feathers, field marks, and individual primaries. The folded shape follows the body envelope and extends aft, keeping the layers together instead of leaving the primaries spread sideways. Each primary's existing quill pivot is included when building its closed pose, then converted back into mesh-local coordinates so its flight flex still uses the original attachment.

The original open vertices remain unchanged. Closed position and normal attributes are prepared once, and the existing damped wing-fold value drives all wing morphs alongside the tail. Resting group rotation fades to neutral, and primary flex fades out as the wings close. This adds no wing meshes or per-frame geometry-buffer writes. Snapshot wing-span reporting now measures the interpolated feather positions instead of reporting the old compression scale.

Eleven focused checks pass across folded-wing symmetry, body clearance, finite normals, nondegenerate intermediate triangles, intact open geometry, offset primary attachment, wing surfaces/flex, and ground contact. A small clearance issue found by the new checks was corrected before rendered review. The simulator copies are byte-identical; syntax and patch-format checks pass.

All five browser scenarios pass: the three existing flight-continuity scenarios and the two extended hawk/owl rest-and-takeoff scenarios. The latter check compact folded span, gradual unfolding, unchanged geometry-buffer versions, the shared wing morphs, tail coordination, reduced motion, pause, draw-call limits, and no browser errors. The wing span assertions use the actual interpolated feather positions.

The final production-model close-ups were visually inspected: `scratch/raptor-flight-review/folded-wings-detail-redTail.png` and `scratch/raptor-flight-review/folded-wings-detail-greatHorned.png`. These are test-only lighting scenes; matching full simulator views are saved as `folded-wings-redTail.png` and `folded-wings-greatHorned.png`. The reviewed silhouettes keep the wings along the body and the primary tips aft, with their markings attached. Browser checks use software WebGL with optional bloom disabled; physical-device frame rates remain unmeasured. Changes are local and have not been deployed.

## Paired feet, curved claws, and perch contact

Replaced the three central cone claws with two modeled feet. Each foot has a short lower leg, four toes, and tapered curved claws; skin, leg, and claw colors share one vertex-colored mesh. The default arrangement is three toes forward and one backward. Owls use a two-forward/two-back pose, which is one of their possible arrangements, not a fixed constraint on a real owl. [Cornell Bird Academy's raptor-foot guide](https://academy.allaboutbirds.org/all-about-raptor-feet/) supports the general layout and describes the reversible outer toe in owls and ospreys. The model does not simulate toe reversal, tendon mechanics, or grip force; dimensions and poses remain visual approximations.

The feet use matching tucked and extended geometry with static position/normal morph attributes. They extend with the folded stance and retract gradually on takeoff. A damped extension accompanies strike feedback, and reduced motion clears that extra extension immediately even while paused. Resting strike feedback does not stretch the feet into the support surface.

Resting body height is now calculated from the lowest vertex of the extended feet, with a small clearance, replacing the old fixed 0.25 offset. The collision envelope, target reach, scoring, and landing rules are unchanged. Contact checks measure the actual transformed foot geometry relative to the terrain center or lookout top; this is not full per-toe inverse kinematics for uneven terrain.

Nine focused checks passed across paired-foot geometry, folded wings, and ground contact. The foot checks cover four-toe layouts, mirrored vertex sets, finite geometry, closed manifold tube surfaces, nondegenerate intermediate poses, and deployment depth. The ground-contact file initially could not start because its worker timed out; it passed all four checks when rerun alone.

All six browser scenarios passed: three existing flight-continuity scenarios, the red-tailed hawk perched scan/launch/catch sequence, and two extended hawk/owl rest-and-takeoff scenarios. Checks cover actual foot clearance above the support, gradual extension and retraction, static geometry-buffer versions, smooth strike extension, immediate reduced-motion reset while paused, and no browser errors.

The final production-model close-ups were visually inspected: `scratch/raptor-flight-review/perch-feet-detail-redTail.png` and `scratch/raptor-flight-review/perch-feet-detail-greatHorned.png`. The paired feet and curved claws are visible beneath the folded bird with an appropriate resting stance. These close-ups use a test-only lighting scene; full simulator captures are saved as `perch-feet-redTail.png` and `perch-feet-greatHorned.png`. Both simulator copies remain byte-identical, and syntax and patch-format checks pass. Browser validation uses software WebGL with optional bloom disabled; physical-device frame rates have not been profiled. Changes remain local and have not been deployed.

## Terrain-following flight shadow

Replaced the two overlapping flat bird-shadow pads with one 121-vertex terrain patch. Each vertex follows the same triangle-interpolated height sampler as the rendered ground, with a small clearance and polygon offset. The existing geometry buffer is updated in place; the removed pad also removes one mesh, material, texture, and draw call. Shadow placement follows the daylight direction, or the moon direction when the sun is below the horizon, while retaining the bounded low-angle offset.

A soft shader silhouette now separates body, head, tail, and tapered wings close to the ground. Its projected span responds to the existing wing fold, flap angle, and bank. The silhouette gradually diffuses with altitude and fades out at height; lighting and cloud cover still modulate its opacity. This is an inexpensive visual approximation, not an exact ray-traced silhouette or a full projection onto rocks, vegetation, and perch geometry. Flight physics, collision, target detection, and scoring are unchanged.

Two focused geometry/profile checks pass: curved-ground clearance at different headings and footprint sizes, upward-facing triangles, reuse of the position buffer, monotonic diffusion/fading, and compact folded poses. The first attempt used an unavailable package import; the test now uses the repository's bundled Three r128 runtime. A subsequent worker startup timeout passed on retry. Source syntax and patch-format checks pass, and the canonical and desktop simulator copies are byte-identical.

Rendered review caught two additional issues and verified their fixes. The shadow swatch now converts from authored sRGB into linear lighting space; before this correction its blue-gray contribution was too pale to consistently darken the ground. Its close-range outline also has a smaller head and tapered tail fan. Higher graphics tiers now smoothly suppress the fallback as the sun rises, allowing their mapped bird shadow to own the daylight silhouette instead of stacking two outlines. Low graphics and nighttime retain the soft fallback.

Final verification: seven focused checks pass, including five updated legacy shadow assertions and the two new geometry/profile checks. Both final low/high browser scenarios pass. They check pixel-level ground darkening, a single fallback mesh, terrain variation on the low-tier patch, suppression of the fallback under high-tier daylight shadow mapping, resting span, frozen geometry while paused, and progressive takeoff under reduced motion, with no browser errors. All three existing flight-continuity scenarios also passed earlier in this pass, before the final color and mapped-shadow suppression refinements. Those refinements only affect shadow rendering.

Both final previews were visually inspected: `scratch/raptor-flight-review/terrain-shadow-low.png` and `scratch/raptor-flight-review/terrain-shadow-high.png`. They render the production scene from a test-only overhead review camera. The high-tier preview confirms the overlapping fallback outline is gone. Browser checks use software WebGL with optional bloom disabled; hardware frame rates and nighttime rendered appearance were not profiled in this pass. Changes remain local and have not been deployed.

## Curved feather layers and quieter wing markings

The batched wing-feather layers now use seven stations with three vertices across each vane. Their width broadens from the root and tapers into a rounded tip, while a shallow center ridge follows the shared wing surface. This replaces the earlier six-vertex planar feather fans. Each vane still samples one feather-atlas region, with restrained edge and shaft shading. The existing quality settings control feather count; there remains one batched layer mesh per wing.

The new positions participate in the existing precomputed folded-wing morph, preserving the shared wing/tail/feet transition without per-frame vertex-buffer writes. Generic wing contrast strips now use lower opacity and subdued emission so they no longer read as bright floating bars between the feather layers. Existing species proportions, flight mechanics, target detection, and scoring are unchanged; this pass refines the procedural visual model rather than adding biological behavior.

Nine focused checks pass for wing surfaces, primary follow-through, folded shapes, and curved vanes. Coverage includes both fingered and unfingered profiles, all three feather-count tiers, mirrored geometry, finite upward normals, rounded tip taper, intact flight vertices, and nondegenerate triangles throughout the folded transition.

Close-up review shortened the feather-tip overhang and reduced the generic band opacity further, producing a quieter trailing edge and less conspicuous markings. All nine focused checks passed again after that adjustment.

Five distinct browser scenarios passed across the targeted runs: chase-camera continuity, landing/takeoff, reduced-motion view controls, and the extended hawk/owl resting-and-flight cases. The reduced-motion continuity test initially sampled before the browser delivered its media-query change; it now waits for the actual simulator preference state and passed on rerun. Both hawk/owl scenarios passed again with the final feather geometry, covering folded span, gradual unfolding, tail/foot coordination, surface contact, pause, static geometry-buffer versions, reduced-motion strike reset, draw-call limits, and no browser errors. The chase and landing cases passed before the final tip/mark-opacity adjustment, which only changes feather appearance.

Final flight and resting previews for both species were visually inspected: `scratch/raptor-flight-review/curved-feathers-flight-redTail.png`, `curved-feathers-flight-greatHorned.png`, `curved-feathers-rest-redTail.png`, and `curved-feathers-rest-greatHorned.png`. These close-ups clone the production models into a test-only lighting scene. Browser checks use software WebGL with optional bloom disabled; hardware frame rates remain unprofiled. The simulator copies remain byte-identical, syntax and patch-format checks pass, and changes remain local without deployment.

## Continuous body contours and species head detail

Replaced the separate pale breast ellipsoid with a continuous vertex-colored body surface. The mantle and ventral colors now blend over the shared surface, with a slightly fuller shoulder and a narrower rear body. Quality tiers control tessellation, while the wing-fold envelope and foot-support geometry remain unchanged. This removes one mesh and the visible breast-shell seam. The existing feather atlas follows the body surface.

Non-owl head proportions are slimmer and lower, and the head sits closer to the shoulders. Owl heads retain a broad profile. The entire face rig receives the proportion change, so eyes, pupils, bill, cere, and field marks share the same prey-tracking transform. The great horned owl alone receives two feathered tufts, batched into one mesh, and a warm facial disc with a darker outer edge. [Cornell's Great Horned Owl identification guide](https://www.allaboutbirds.org/guide/Great_Horned_Owl/id) describes its prominent feather tufts and regional gray-to-cinnamon facial coloration. This model represents one warm-toned visual interpretation, not all plumages or a new biological behavior.

Thirteen focused checks pass across the body geometry, mirrored tuft surfaces, facial attachment, gaze selection/damping, and ground contact. New coverage includes bounded body dimensions, a blended ventral color transition, finite surface normals, nondegenerate tuft triangles, roots inside the head, and unchanged facial-disc attachment geometry. Both simulator copies remain byte-identical; syntax and patch-format checks pass.

The first rendered review led to a further crown/chin refinement for non-owls. A shared deformation flattens the crown and narrows the chin while leaving the eye-level surface unchanged; crown field-mark geometry uses the same deformation. Owl heads retain their rounded shape. The great horned owl's tufts were shortened and swept farther outward, and its facial shading deepened. Fourteen focused checks pass on this final geometry, including the new head-deformation check.

Final full-body review restored a little vertical depth to non-owl heads and lifted them slightly against the shoulders, avoiding an overly shallow profile. The affected eagle facial-tracking and hawk rest/takeoff cases both passed again after that proportion adjustment.

Browser verification: seven distinct scenarios passed across this pass, covering chase-camera continuity, terrain landing/takeoff, reduced-motion view controls, eagle/owl facial tracking, and hawk/owl folded poses. The four face/rest scenarios passed after the crown and tuft refinement; the two affected non-owl scenarios passed again after the final head-height adjustment. The three flight-continuity cases passed before those final appearance adjustments. Checks cover attached facial features, bounded smooth gaze, pause, reduced motion, stable geometry buffers, wing/tail/foot coordination, support clearance, draw-call limits, and no browser errors.

Final eagle and owl facial close-ups and hawk/owl resting models were visually inspected: `scratch/raptor-flight-review/contour-face-baldEagle.png`, `contour-face-greatHorned.png`, `contour-rest-redTail.png`, and `contour-rest-greatHorned.png`. Matching flight captures are also saved with the `contour-flight-` prefix. The close-ups use production models in a test-only lighting scene. Software-WebGL verification disables optional bloom; physical-device frame rates remain unprofiled. Changes remain local, and no deployment was performed.

## Iris texture and smooth closed bills

Replaced the flattened low-segment iris spheres with shallow domes using radial UVs. A shared procedural texture adds fine iris fibers, a darker outer rim, and gentle radial color variation. The existing amber color remains; this pass does not introduce species- or age-specific iris palettes. Pupils have smoother geometry, a less elongated shape, and lower material roughness so their highlights respond to scene lighting.

The hooked bill now follows 17 interpolated cross-sections with 16 segments around each, replacing the visibly faceted five-section surface. Its roots, narrow downturned tip, and closed end caps are retained. Two static attributes shade a subtle closed-mouth line into the same bill mesh. The shader does not add separate line geometry or animated mouth parts. Eye and bill mesh counts are unchanged, and all facial parts remain under the existing gaze rig.

Eleven focused checks pass for facial geometry, iris UVs and outward faces, finite normals, the bill's closed manifold surface and hook, the existing body/head contours, and gaze behavior. Both simulator copies remain byte-identical; source syntax and patch-format checks pass.

All five browser scenarios pass: the three flight-continuity cases and both eagle/owl facial-tracking cases. They verify camera stability, landing/takeoff, pause, reduced motion, attached facial features, working iris textures, compiled bill-line shading, bounded gaze transitions, draw-call limits, and no browser errors.

Both final close-ups were visually inspected: `scratch/raptor-flight-review/iris-bill-face-baldEagle.png` and `iris-bill-face-greatHorned.png`. The iris rims read clearly, the pupils sit over the domed iris surfaces, and the bill outlines are smoother with a subdued mouth line. These captures use the production models in a test-only lighting scene. Browser validation uses software WebGL with optional bloom disabled; physical-device frame rates remain unprofiled. Changes remain local and have not been deployed.

## Terrain-lighting flicker correction (2026-09-10)

Reproduced a sunlight-direction discontinuity in the real WebGL simulator. Environmental lighting placed the sun relative to the world origin every frame, but the throttled shadow refresh placed it relative to the moving shadow target. Since a directional light uses the vector between its position and target, balanced/high rendering alternated between two different lighting directions on refresh and cached-shadow frames. The balanced regression measured a normalized direction jump of 0.4687, approximately 27 degrees, across a 16 ms frame.

Environmental lighting now uses the same target-relative sun placement as shadow refreshes. The existing 20/30 Hz shadow-map budget remains intact. No geometry, gameplay, or quality settings changed. Both simulator copies are byte-identical and syntax/patch-format checks pass.

The new `tests/e2e/raptor-lighting-continuity.spec.ts` failed on the original code and passes on the fix in balanced, high, and low quality. It advances the simulation at 16 ms intervals through both refreshed and cached shadows, verifies continuous light direction, confirms shadow matrices remain cached between refreshes, and checks stable lighting/targets during pause. The maximum direction change is now 0.000196, approximately 0.011 degrees, matching the gradual day cycle. No browser errors occurred. This validation uses software WebGL with optional bloom disabled; it does not establish physical-device frame rates or exclude unrelated GPU-specific flicker.

The existing high-quality terrain-shadow browser scenario also passes after the fix, covering visible mapped shadows, landing, pause, reduced motion, and takeoff. The rendered ground-shadow capture (`scratch/raptor-flight-review/terrain-shadow-high.png`) was visually inspected. Four browser scenarios pass in total. Changes remain local; no deployment was performed.
