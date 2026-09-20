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

## Input reliability and paused-scene presentation (2026-09-12)

Reproduced two interaction failures in the production simulator through the local WebGL harness. Releasing A canceled a still-held Left Arrow because both controls wrote the same action boolean. Resizing a paused flight also cleared the canvas without repainting it, since pause correctly stops the animation loop. The new browser checks failed on both original behaviors before the fixes.

Flight holds now retain their input source: each physical keyboard key and each on-screen action contributes independently. Releasing one source preserves another source holding that action. Blur, pause, and control-preset changes clear all sources together. This changes input bookkeeping only; steering damping and flight physics are unchanged.

The renderer now has a shared scene-render function and a guarded, one-time paused repaint. Pausing clears the speed effect on screen; resizing redraws the scene at the new aspect ratio; a reduced-motion preference change redraws the updated meshes and refreshes their shadows. These repaints do not run physics, move prey, advance simulation time, or restart the animation loop.

Both new browser scenarios pass. They cover equivalent keyboard bindings, combined keyboard/on-screen holds, final release, blur, pause/resume, preset switching, a populated framebuffer after paused resize, correct camera aspect, reduced-motion repaint, and a frozen simulation clock/raptor position with no continuing render loop. Syntax and patch-format checks pass, and the canonical and desktop simulator files remain byte-identical. Browser testing uses software WebGL with optional bloom disabled; hardware-specific behavior and bloom are not covered by this pass.

All six follow-up browser scenarios also pass: steady chase framing through uneven frames, landing/folded rest/takeoff, reduced-motion camera controls, and sunlight continuity across low/balanced/high graphics. Eight browser scenarios pass in total for this pass. The earlier terrain-lighting flicker correction remains intact. These are targeted regression checks, not a claim that the full tool is bug-free. Changes remain local and have not been deployed.

## Long-feather surface refinement (2026-09-12)

Added a dedicated procedural texture for individual flight and tail feathers. The previous long feathers sampled/repeated the small body-contour atlas, producing a tiled pattern across their vanes. The new shared 256-by-512 texture follows each feather from root to tip, with a centered tapered shaft, diagonal barbs, soft edge shading, and subdued lengthwise variation. The body and supporting wing coverts retain their existing contour texture. Species material colors and the owl tail-band shader are preserved.

Secondary-vane and tail UVs now map one feather across each complete surface. Primary feathers use the same texture without tiling. Bump depth is reduced on these long feathers to keep the finish restrained. The existing mip filtering and bounded anisotropy remain in use. This adds one shared texture and no new meshes or draw calls.

Outer primary outlines now use nine paired stations (18 vertices per feather), replacing the five-station outline. The width profile rounds into a narrower tip while preserving quill roots, span, bilateral symmetry, and the existing pivot/fold animation. Twenty-three focused geometry checks pass across the targeted runs, covering wing surfaces, feather flex, folded morphs, tail closure, primary symmetry, and the existing environment geometry checks.

Both extended browser scenarios pass: red-tailed hawk in high quality and great horned owl in low quality/narrow layout. They verify the shared non-tiling feather material, the hawk's 18-vertex primaries, preserved owl tail-band compilation, folded wing/tail/foot coordination, takeoff, strike-foot poses, pause, reduced motion, stable geometry buffers, draw-call bounds, and no browser errors. The visual probe handles the owl model's unslotted wing separately from the hawk's primary meshes.

Final hawk flight and owl flight/rest close-ups were visually inspected: `scratch/raptor-flight-review/vane-flight-redTail.png`, `vane-flight-greatHorned.png`, and `vane-rest-greatHorned.png`; the matching hawk rest image is also saved. These captures use production models in a test-only lighting scene. The finish remains a stylized procedural interpretation. Browser validation uses software WebGL with optional bloom disabled; physical-device performance and shimmer are not measured. The canonical and desktop files remain identical, syntax/patch-format checks pass, and no deployment was performed.

## Softer wing surfaces without overlay strips (2026-09-12)

Removed the four generic transparent wing-mark strips and their unused geometry/material code. These strips crossed the raised vanes and appeared as broken rectangular bands in both flying and resting close-ups. The remaining wing surfaces are opaque and use the same existing folded morphs; actual head field marks, species colors, and tail-band shading are retained.

Reduced the central vane ridge from 0.012 to 0.006 scene units, softened the long-feather texture's edge shading, and replaced the repeating three-feather tint pattern with modest deterministic variation. Gentle root-to-tip vertex shading is attached directly to each feather, so the shading follows folding without separate overlay geometry. Four meshes and their associated draw submissions are removed per bird. Flight physics, input handling, camera behavior, and lighting cadence are unchanged.

Nine focused wing/fold geometry checks pass, including mirrored surfaces, finite normals, nondegenerate transitions, quill pivots, and feather follow-through. Both extended browser scenarios pass: high-quality red-tailed hawk and low-quality great horned owl in a narrow layout. They check opaque wing layers, the reduced mesh count, shared feather textures, tail-band compilation, folding, takeoff, strike-foot motion, pause, reduced motion, static geometry buffers, and no browser errors.

The final hawk flight and owl resting close-ups were visually inspected: `scratch/raptor-flight-review/soft-wing-flight-redTail.png` and `soft-wing-rest-greatHorned.png`. Matching flight/rest captures for both species are saved. The models remain stylized procedural birds; these test-only lighting scenes use production geometry. Software WebGL testing disables optional bloom and does not measure physical-device performance. Both simulator copies are byte-identical, syntax and patch-format checks pass, and changes remain local without deployment.

## Eye seating and owl facial-feather detail (2026-09-12)

Added a single batched eye-surround mesh under the existing head rig. Its two softly shaded rims leave the iris openings clear, rise slightly beside the iris, and settle back toward the head/cheek surface. The non-owl upper rim is a little broader; this is a static artistic treatment rather than a new blinking or facial-expression behavior. The rims use existing head colors and a muted inner shade. Eye positions, iris and pupil geometry, bill shape, head tracking, and species selection are unchanged.

Owl cheek discs now have radial UVs and a shared procedural facial-feather texture, with fine curved strokes and a subdued rim. The texture follows each existing curved cheek instead of adding more surface layers. Its small bump depth and mip filtering keep the detail restrained. The existing cheek vertex colors remain in place. The pass adds one mesh per bird and one small texture for owls.

Thirteen focused checks pass for facial geometry, unobstructed eye openings, outward-facing rims, finite surface data, body/head contours, and gaze damping/selection. Source syntax and patch-format checks pass; canonical and desktop simulator copies remain byte-identical.

Rendered review led to a flatter rim profile: the middle ring now blends toward the seated outer surface instead of standing above the iris edge. The nine affected facial/gaze checks passed again after that adjustment; the four unchanged body/head checks had already passed. Both final browser scenarios pass for the high-quality eagle and low-quality owl, covering attached face parts, textured owl discs, gaze tracking/recentering, pause, reduced motion, dive transitions, draw-call bounds, and no browser errors.

Both final close-ups were visually inspected: `scratch/raptor-flight-review/soft-face-baldEagle.png` and `soft-face-greatHorned.png`. The eye rims are less raised than the initial version, and radial feather detail is visible across the owl's cheeks. The captures use production models in a test-only lighting scene. The models remain stylized procedural birds. Browser tests use software WebGL with optional bloom disabled; physical-device frame rates and shimmer remain unmeasured. Changes remain local and have not been deployed.

## Representative body field marks (2026-09-12)

Added body markings for the red-tailed hawk and great horned owl, based on Cornell's identification references. The [Red-tailed Hawk identification guide](https://www.allaboutbirds.org/guide/Red-tailed_Hawk/id) describes an adult eastern bird as pale underneath with a darker belly band, while noting regional and morph variation. The [Great Horned Owl guide](https://www.allaboutbirds.org/guide/Great_Horned_Owl/id) describes a white throat patch and considerable regional color variation. These details are representative artistic interpretations for the existing models, not a claim that all individuals share one plumage.

The red-tail receives a band of elongated dark streaks across its underside, with a soft transition toward the pale upper breast. The owl receives a softly bounded pale patch on the forward underside. Both are shaded directly in the existing continuous body material using body coordinates. Geometry, head/wing/tail colors, and flight behavior are unchanged. The streak edges use screen-space derivative smoothing; no extra meshes, draw calls, or textures are added. Other species retain their existing body materials.

Both browser scenarios pass for the high-quality red-tailed hawk and low-quality great horned owl in a narrow layout. They verify the intended body shader compiles for each species, preserve the existing wing/face/tail material checks, and cover perching, folded poses, takeoff, strike-foot movement, pause, reduced motion, static geometry buffers, draw-call bounds, and no browser errors.

The final hawk underside and owl underside/resting views were visually inspected: `scratch/raptor-flight-review/body-marks-underside-redTail.png`, `body-marks-underside-greatHorned.png`, and `body-marks-rest-greatHorned.png`. The hawk band is visible against the pale breast; the owl throat patch is subtler, especially in the resting view beneath its head. Matching flight/rest captures for both species are saved. These captures use production geometry in test-only lighting scenes. Browser checks use software WebGL with optional bloom disabled; physical-device shader cost and shimmer have not been measured. Source syntax and patch-format checks pass, both simulator files remain identical, and changes remain local without deployment.

## Continuous torso feather flow (2026-09-12)

Reoriented the body's sphere parameterization before applying its existing contour shape, placing texture poles at the neck and tail ends instead of the back and belly. This removes the pinwheel/stretching visible in the prior underside views while retaining the same contour formula, vertex counts, and species color blending. The torso now uses a separate clone of the existing feather atlas with whole-number 2-by-2 repeats, keeping the wrap aligned at its seam. Head and crown texture settings remain unchanged. Reduced body bump depth from 0.0035 to 0.0018 for a softer surface.

Eleven focused geometry checks pass across the targeted runs: six body/head/mapping checks and five folded-wing checks. New coverage verifies UV poles stay at the body's longitudinal ends, the visible breast stays away from those poles, UVs remain finite, and rendered vertices have normalized normals. The normal check excludes the unused duplicated pole vertices in Three.js's indexed sphere geometry.

Both extended browser scenarios pass for high-quality red-tailed hawk and low-quality great horned owl in a narrow layout. They verify the torso texture's name/repeat settings, compiled species markings, existing wing/tail/face details, folded poses, takeoff, pause, reduced motion, static geometry buffers, and no browser errors. Final underside renders were visually inspected: `scratch/raptor-flight-review/torso-flow-underside-redTail.png` and `torso-flow-underside-greatHorned.png`. The owl's prior belly pinwheel is gone, and the hawk's streaked band remains visible. Matching flight/rest images are also saved.

Both simulator copies remain byte-identical; syntax and patch-format checks pass. This adds a torso texture clone but no meshes or draw calls. The models remain stylized procedural birds. Browser validation uses software WebGL with optional bloom disabled; physical-device performance is not measured. Changes remain local and have not been deployed.

## Gameplay feedback and control clarity (2026-09-12)

Reviewed the flight controls, live instruments, and free-flight practice loop. Trail completion previously disappeared after six simulated seconds and gave no direct next action. Results now remain available until the player retries, returns to hunting, or starts perched practice. The panel shows a score out of ten, each ring's outcome, the best score for the current flight, and completed-attempt count. Coaching distinguishes missed rings, passes outside the center, and an all-centered run. Retry builds a new route from the current bird position; it does not reset the flight. Deliberate result actions return keyboard focus to the canvas.

The flight can continue behind the result. Retrying is disabled while paused or grounded, and starting a trail while grounded explains that the bird must take off. On narrow screens, completed results sit below the main telemetry strip while smaller heading, attitude, target, and mission overlays clear out of the panel's space. Those overlays return when the result closes or another trail starts. Scenic view retains its compact result placement.

Live instrument status now receives the simulator's actual flight state, including perched, landed, stunned, and paused states. Grounded birds show "Launch first" in the strike instrument. Target labels now include prey spotted from a perch, catches, and missed strikes. Strike hints use the selected key binding instead of always naming F. Accessible shortcuts for flight, pause, camera, zoom, assist, and sound follow the selected preset or custom mappings; display arrow glyphs remain separate from accessibility key names, and unbound controls no longer advertise a fallback shortcut.

Validation includes three focused physics checks covering frame-rate-independent steering, swept ring crossings (including misses and reverse approaches), and route bounds/terrain clearance. Three browser scenarios passed across targeted runs: smooth controls/pause/shadow budgeting; actual trail completion, persistent results, keyboard retry/dismissal, and best-score retention across an imperfect second attempt; and Simple/Custom control remapping with perched/pause/takeoff instrument transitions. The frozen-animation test harness needed an explicit result-visibility wait before the second keyboard interaction. Browser checks use software WebGL with optional bloom disabled; these checks do not establish physical-device frame rates or a complete application-wide bug audit.

Visual review of the first normal-overlay capture exposed a narrow-screen collision, which prompted the layout adjustment above. Final captures are `scratch/raptor-flight-review/trail-result-narrow.png` and `trail-result-instruments-narrow.png`. Both simulator copies remain identical. Changes remain local and have not been deployed.

## Paused camera controls and clearer pause actions (2026-09-12)

Fixed a mismatch where camera and acuity-zoom buttons changed their labels during pause but left the rendered view unchanged until flight resumed. The live camera/FOV calculations now live in shared helpers. Paused view changes apply the selected camera framing or FOV immediately and redraw once; they do not run the simulation loop. Camera-relative sky/celestial positions follow the changed viewpoint, and switching camera mode resets the terrain-floor smoothing history for the new location. Zoom alone retains the current camera position.

Replaced the static pause message with a compact panel containing Resume flight, Camera, and Zoom controls. It keeps the frozen scene visible, uses an opaque card for readable text, supports keyboard activation, reflects custom shortcuts, and returns focus to the canvas when resuming. An unbound pause key falls back to the Resume button instruction. Main movement and strike buttons are disabled while paused. The pause panel's handlers are removed during simulator cleanup.

Validation: three input/pause scenarios and three live-flight continuity scenarios cover equivalent-key releases, resize during pause, reduced motion, immediate camera/zoom redraws, unchanged bird/prey positions, unchanged energy and simulation time, absence of a background frame chain, custom/unbound pause shortcuts, keyboard resume, perching, camera ground clearance, steady chase framing, landing, and takeoff. The new paused-view scenario also checks the disabled movement/strike controls and narrow-layout fit. Final capture: `scratch/raptor-flight-review/paused-view-controls-narrow.png`.

The camera refactor preserves the existing live interpolation rates. Browser validation uses software WebGL with optional bloom disabled; physical-device performance has not been measured. Syntax and whitespace checks pass, and the canonical and desktop sources remain byte-identical. Changes are local and have not been deployed.

## Strike coaching, simulation-time recovery, and reliable restart (2026-09-12)

Added a persistent Last strike panel beneath the flight controls. It records the latest catch or miss, the catch's energy reward or miss reason, and an actionable next-approach tip. It remains readable after the brief in-scene effect ends, uses text as well as color to distinguish outcomes, and clears when a new simulator instance starts. Positioning it after the controls avoids shifting those controls when the first result appears. The narrow result capture was visually reviewed: `scratch/raptor-flight-review/last-strike-coaching-narrow.png`.

Fixed delayed catch actions that could finish during pause. Strike recovery, the delayed catch call, and replacement prey now use the simulation clock instead of native real-time timers. Strike input and the button's ready state share the same recovery gate. Catch/miss animation age and transient flight notices also use simulation time, preserving their remaining duration on resume. The action queue is cleared during cleanup and skips work when empty. The strike reach and approach requirements are unchanged.

The restart regression exposed a separate renderer lifecycle bug: cleanup explicitly loses the old WebGL context, but restart reused its canvas. The flight canvas now has a key based on species, mission, restart revision, and graphics quality, so a new renderer receives a fresh canvas. Tests check that the old canvas disconnects and clears its snapshot hook, the restarted hunt has no pending actions or stale strike result, and a subsequent graphics-quality change initializes successfully.

Browser coverage includes a real-time wait after pausing immediately after a catch, exact simulated recovery and respawn boundaries, rapid-repeat rejection, persistent miss coaching, restart, graphics changes, and perched scanning/launching/striking for red-tailed hawk, great horned owl, peregrine, and kestrel. Existing perch tests now advance nine 50 ms frames for their 450 ms recovery interval; a single long fake frame was clamped to 50 ms of simulation time. A frozen-animation harness locator timeout was resolved by advancing the known test fixture directly; the captured simulator itself remained healthy.

Syntax and whitespace checks pass, and both simulator copies remain byte-identical. Validation uses software WebGL with optional bloom disabled; physical-device performance and the entire activity collection were not audited in this pass. Changes remain local and have not been deployed.

All six browser scenarios passed on the final run, including fresh-canvas restart and graphics-quality reinitialization.


## Directional hunting guidance (2026-09-12)

Refined target alignment so guidance follows the bird's heading and current pitch. Lateral approaches now ask for a left or right turn, rather than an unrelated upward/downward correction. Off-axis distant prey prompts alignment before closing range; stoop advice waits until turning is no longer the dominant correction. Strike reach and catch eligibility are unchanged.

The active correction highlights the matching mapped control in Guided mode. A small neutral zone and 20% axis-switch buffer keep diagonal advice stable. Near-target miss coaching uses the same correction. The cue stays in the existing compact HUD; no additional overlay was added.

Validation:
- Six unit checks passed for caption bounds and steering geometry, including wrapped headings, relative pitch, vertical/coincident targets, and diagonal stability.
- The focused existing strike-feedback regression passed after updating outdated coaching signatures and the previously added grounded-talon guard. The other 164 tests in that file were excluded from this focused run.
- Four Chromium browser checks passed: real prey in all four directions, matching control highlights, a narrow-screen lateral miss, catch recovery and replacement prey across pause, and restart/quality-change lifecycle behavior. The two direction checks passed again after improving the screenshot fixture to redraw after canvas resize.
- Visually inspected `scratch/raptor-flight-review/directional-guidance-narrow.png` with a rendered scene at a 420px host width.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies remain byte-identical.

Changes are local. These checks do not constitute an app-wide test pass or hardware performance benchmark.

## Recurring Free Hunt guidance and panel polish (2026-09-12)

Free Hunt now follows each attempt through Scan, Align, Strike, and Reset. The earlier panel treated the first catch as a permanent transition to Explore and could still show Scan during lateral alignment. The current step now follows live target state, including closing range, a controlled descent, strike recovery, misses, and assist-off exploration. Catch and miss feedback leads back into the next approach. Grounded and stunned states give takeoff/recovery guidance.

The panel uses a compact flight catch count, a prominent current-step heading, sentence-case coaching, and larger route labels. Its border and current-step accent distinguish normal guidance, an available strike, and reset without adding animation. Free Hunt's action heading is exposed to assistive technology, with the current route step still marked using aria-current. The catch count uses the flight's accumulated catches rather than the streak counter that resets after a hard landing.

Validation:
- Four Chromium browser checks passed: two repeated catches and a fresh restart; missed approach, pause, resumed approach, assist-off exploration, and Scenic mode; target-caption bounds and obstacle clearance at 1100px and 420px widths.
- Visually inspected the rendered 420px-host screenshot at `scratch/raptor-flight-review/free-hunt-cycle-narrow.png`. The panel fits without horizontal overflow and occupies less than 35% of stage height.
- JavaScript syntax and scoped whitespace checks passed. Canonical and packaged desktop copies are byte-identical.

Changes remain local. No app-wide suite or hardware performance benchmark was run for this pass.

## Strike-range clarity and consistent target feedback (2026-09-12)

Close-range target distances now display tenths of a metre, rounded upward within 10 m. A target just beyond the normal 5 m or diving 7 m strike reach therefore cannot round down to that limit. Mid-range distances use whole metres; distances beyond 50 m retain coarse five-metre estimates with an explicit approximation marker.

The target caption, close-approach hint, and telemetry range now share the same acquisition sample and formatting. Telemetry text changes only when the formatted value changes, and its former extra target-acquisition query was removed. Assist-off and missing-target states display Off and None respectively.

Offscreen labels describe the prey's screen bearing, including diagonal positions, rather than issuing steering commands that can conflict with the bird-relative cue while the chase camera follows a turn. Onscreen captions now distinguish recovery, controlled descent, and the next approach; a reachable target correctly shows strike readiness once recovery ends.

Validation:
- Five unit checks passed for close-range boundary precision, monotonic displayed range, approximate distant estimates, and caption bounds.
- Six Chromium checks passed for consistent range across HUD surfaces, strike recovery across pause and subsequent catching, all four diagonal offscreen labels, repeated hunt cycles and restart, and caption obstacle clearance at 1100px and 420px widths.
- Visually inspected the rendered narrow-screen artifact at `scratch/raptor-flight-review/target-bearing-labels-narrow.png`.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Validation was targeted; no app-wide suite or hardware performance benchmark was run.

## Paused target projection and caption clearance (2026-09-12)

Fixed stale prey-marker positions when changing camera, zoom, or viewport size during pause. A browser regression first reproduced the discrepancy between the stored marker coordinates and the actual camera projection. Live flight and paused redraws now share one marker-projection function, which refreshes the camera matrices without advancing physics, prey movement, simulation time, or strike recovery.

Paused redraws also discard a cached target if it was caught immediately before pausing, preventing a ghost marker. Onscreen prey captions use the lower-control boundary to avoid overlapping Scenic view, Flight trail, or Perched practice controls. Offscreen markers retain their existing clearance rules; this distinction was verified after the broader layout test caught an overlap during refinement.

Validation:
- Three existing input/pause browser checks passed, including aliased held keys, reduced-motion resize redraws, paused camera/zoom changes, and keyboard resume.
- The final five affected browser checks passed: paused camera and zoom projection, paused resize and lower-control clearance, immediate catch-and-pause cleanup, and offscreen caption bounds/obstacle clearance at 1100px and 420px widths.
- Projection checks compare against independently projected real prey positions. They verify frozen prey and raptor positions, simulation clock, energy, wing pose, and recovery, with exactly one redraw per paused camera/zoom action and no continuing animation loop.
- Visually inspected `scratch/raptor-flight-review/paused-target-projection-narrow.png` after correcting control clearance.
- JavaScript syntax and scoped whitespace checks passed. Canonical and packaged desktop sources remain byte-identical.

Changes are local. No app-wide test suite or hardware performance benchmark was run.

## Immediate target-assist presentation (2026-09-12)

Fixed a paused-control inconsistency: Target assist could switch off while the prey marker and scene highlights stayed visible until the next simulation frame. A browser test reproduced the visible stale marker after the button changed to its off state.

Live flight and explicit assist changes now share one target-feedback update. Toggling assist immediately updates the marker, range, guidance, guide line, halo, and prey highlights. Paused toggles repaint once without advancing flight time, prey movement, energy, wing motion, or strike recovery. The control-driven refresh does not record tutorial progress. Assist-off guidance takes priority over transient strike feedback, and Scenic view/flight-trail visibility rules remain enforced when assistance is restored.

Validation:
- Ten distinct Chromium checks passed across the targeted run and corrected-fixture rerun: three immediate-assist/display-mode checks, two recurring-hunt checks, three paused-marker checks, and two range/marker checks.
- Nine unit checks passed for steering geometry, range precision, and caption placement.
- Repaired two older test assumptions found during the review: the steering helper extraction boundary now tolerates adjacent declarations/comments, and the controlled range-test prey is restored ahead of the bird before pause so its production AI step does not invalidate the recovery fixture. The behavioral assertions were retained.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Validation is targeted, not an app-wide suite or a hardware performance benchmark.

## Paused Scenic-view switching (2026-09-12)

Fixed Scenic view changing the HTML overlays without redrawing the paused 3D scene. The Scenic button now sends the selected view to the simulator immediately as well as updating the saved UI state. Target guidance and scene visibility refresh together, with one paused redraw per switch.

Flight-trail and airflow eligibility are retained separately from the Scenic visibility setting. Switching back restores effects that were active without rebuilding their geometry or advancing animation. The shared visibility update also respects reduced motion, assist-off state, and flight practice. Paused redraws consistently apply these rules after camera or viewport changes.

Validation:
- First reproduced the missing redraw with a browser test using an active flight trail.
- Ten Chromium browser checks passed: repeated paused Scenic switches with frozen geometry and simulation state, reduced-motion/assist-off restoration, immediate assist changes, practice-mode visibility, input aliases, paused camera and resize behavior, and target-caption clearance at 1100px and 420px widths.
- The Scenic checks verify one redraw per switch, unchanged flight-trail and airflow geometry versions, fixed bird/prey positions and energy, frozen recovery, and no continuing animation frames during pause.
- Visually inspected `scratch/raptor-flight-review/paused-scenic-clean.png`.
- JavaScript syntax and scoped whitespace checks passed. Canonical and packaged desktop source copies remain byte-identical.

Changes remain local. Validation was targeted; no app-wide suite or hardware performance benchmark was run.

## Animated wingtip trails and effect visibility (2026-09-12)

Refined the existing wingtip trail effect so it follows the rendered wings instead of fixed body-space points. Broad-wing species use the outer primary feather tip, including its quill pivot, flex, and resting morph. Pointed-wing species use the tapered wing surface tip. The wing hierarchy is updated before sampling world-space anchors, fixing a second one-frame transform mismatch detected during testing.

Trail ends now fade to transparent using a static per-vertex fade attribute. A smooth speed ramp replaces abrupt opacity at the activation threshold. The effect retains the existing two-line geometry and quality-dependent point counts. Wingtip trails now participate in the shared Scenic/reduced-motion visibility rules, including paused view switches.

Validation:
- First reproduced a roughly 0.69 scene-unit attachment gap in the previous fixed-point implementation. An intermediate test caught a remaining stale-transform gap; refreshing the hierarchy resolved it.
- Two wingtip browser checks passed for red-tailed hawk at low quality and peregrine at high quality. They sample both tips across 100 banking frames, compare trail roots against independently transformed wing vertices, verify fade endpoints and shader compilation, and check Scenic switching, unchanged paused geometry, reduced motion, and perching.
- The two existing paused Scenic-view regression checks passed during this pass.
- Visually inspected `scratch/raptor-flight-review/wingtip-trails-attached-redTail.png`.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

These remain illustrative flight effects; no new biological or weather-dependent condensation model was introduced. Changes remain local. Validation was targeted rather than an app-wide test suite or hardware performance benchmark.

## Desktop HUD spacing and control clearance (2026-09-12)

Moved the desktop mission-progress panel into the upper-right HUD area. It previously occupied the same lower-right area as Flight trail and Perched practice, causing both buttons to cover the progress text. The bottom corners now remain available for controls, and the central flight view has less competing content. Existing narrow-screen positioning remains in place.

Validation:
- Reproduced the original overlap against both practice buttons before changing the CSS.
- Four Chromium checks passed: Free Hunt and Feed the Chicks panels at host widths 1100, 880, 760, and 420px; target-caption clearance at 1100 and 420px. The new layout checks verify viewport bounds, horizontal overflow, separation from controls/telemetry/altitude gauge, and Free Hunt visibility when switching practice and Scenic modes.
- Visually inspected `scratch/raptor-flight-review/hud-clearance-open-1100.png` and `scratch/raptor-flight-review/hud-clearance-feedChicks-420.png`.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies remain byte-identical.

Changes remain local. This was a targeted layout regression pass, not an app-wide test suite.

## Provisioning mission guidance and completion refresh (2026-09-12)

Feed the Chicks now follows the live Scan / Align / Strike / Reset hunt cycle. The old route stayed on Scan during an approach, skipped Chase after a catch, and implied separate delivery/refueling actions. The calorie meter remains the overall mission goal, while the current-action heading and coaching follow target alignment, range, strike readiness, misses, and recovery. Catch feedback states that credit is automatic and shows the remaining calories. Turning assist off gives a manual-scanning heading.

The mission uses the clearer hunt-panel typography, teal background, and state accents already used in Free Hunt. The current-action text is available to screen readers. Desktop and phone layouts were visually inspected.

A gameplay regression also exposed a completion bug: finishMission paused the animation loop before the HUD could refresh, leaving a successful run showing 68% in the deterministic scenario. Mission completion now refreshes the HUD before pausing, so the outcome, route, and 100% meter agree immediately.

Validation:
- Reproduced the old guidance and the stale completion meter before their fixes.
- Two new Chromium checks passed using real scene prey and production catch logic: repeated approaches/catches through the 400 kcal goal; misses, frozen pause, assist changes, and narrow-screen readability.
- Four existing Chromium checks passed during this pass: recurring Free Hunt behavior, misses/pause/manual exploration, and Free Hunt/Feed the Chicks layout clearance at widths 1100, 880, 760, and 420px.
- Visually inspected scratch/raptor-flight-review/hud-clearance-feedChicks-1100.png and hud-clearance-feedChicks-420.png.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. Validation was targeted; this was not an app-wide suite or a hardware performance benchmark.

## Mission results layout, keyboard access, and restart (2026-09-12)

Rebuilt the mission-result card with a clear outcome header, a scrollable flight-review area, and a persistent action footer. The success state uses a green accent, with a prominent Fly again button and separate Next mission / Change setup actions. The card stays inside the simulator at narrow widths and compact heights; the review remains keyboard-scrollable and Tab/Shift+Tab wrap within the result dialog.

Fixed two related completion issues. Finished missions cannot be resumed behind the result dialog, and the ordinary pause card is hidden after a mission resolves. Visual review discovered that the pause card previously covered the result heading and debrief even when layout bounds passed.

Validation:
- Reproduced the original result card extending approximately 190px above a compact flight view.
- New Chromium regression completes a mission through production catches, checks card/action bounds at 880, 420, and 320px widths in a 460px-high view, verifies the heading is unobscured, scrolls the review, checks keyboard focus wrapping, confirms an attempted resume leaves the finished flight frozen, and uses Fly again to start a fresh moving simulation.
- Six targeted Chromium checks passed: the new results test, two provisioning mission checks, and three input/pause checks. The results and three pause checks were rerun after correcting the overlapping pause card; all four passed.
- Visually inspected corrected screenshots scratch/raptor-flight-review/results-320.png and results-880.png.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. This was targeted gameplay and visual validation, not an app-wide test suite or hardware performance benchmark.

## Accurate catch totals and next-mission preview (2026-09-12)

The result debrief and saved flight history now show all catches made during the flight, including those before a crash. A crash still resets the streak used for best-run comparisons; that comparison is now labeled Streak / best. The existing streak field remains intact for record calculations.

Added a compact Up next preview to the persistent results footer. It names the next mission, the species that will actually fly it, and its time limit. The Next mission button exposes the preview as its accessible description. Preview and launch share the same mission-selection helper, including the existing recommended-species switch.

Validation:
- Reproduced three successful catches appearing as two in the debrief after a real dive, crash, recovery, and relaunch.
- Three Chromium checks passed: crash-surviving catch totals in both debrief and history while preserving streak comparison; preview-to-launch agreement for Cross the Desert / Red-tailed Hawk; and existing result bounds, keyboard access, frozen completed flight, and Fly again behavior at 880, 420, and 320px widths.
- The crash test uses production input and physics, with GPU submission skipped only during the long dive/recovery input sequence. It resumes normal rendering afterward.
- Visually inspected scratch/raptor-flight-review/next-mission-preview-320.png and results-880.png.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies remain byte-identical.

Changes remain local. Validation was targeted rather than an app-wide suite or hardware benchmark.

## Mission-rule consistency and finished-flight instruments (2026-09-12)

Analysis found a Silent Strike instruction mismatch: the mission text said 30m, while the existing failure check used 48m. A shared 48m gameplay constant now drives the introduction, objective, live guidance, and alert check. The text explicitly calls this a mission rule and explains that flapping inside the range ends the mission. Live guidance names the current Pull up key to release. The gameplay radius itself is unchanged; this is not presented as a universal biological hearing distance.

Finished-flight instruments now prioritize Mission complete / Mission ended over the underlying paused state. The run control becomes disabled Flight ended, strike guidance directs players to a new flight, and the target description identifies the frozen snapshot. Ordinary pauses retain an enabled Resume action, explain that flight is frozen, and stop prompting players to strike. The renderer readout says Paused instead of showing a stale frame rate.

Visual review caught a remaining scan-ahead subtitle and clipped hints. The subtitle now reflects pause/outcome state, and instrument details wrap at narrow widths.

Validation:
- Reproduced misleading strike guidance while paused before the change.
- Three targeted Chromium checks passed: success/failure instrument and control states; Silent Strike flapping at 49m remaining active, gliding at 47m remaining active, and flapping at 47m ending the mission; existing compact result layout, focus, pause guard, and restart checks.
- Both mission-clarity tests passed again after the subtitle/wrapping correction and verify no horizontal overflow in narrow instrument hints.
- Visually inspected final scratch/raptor-flight-review/mission-instruments-failed.png; the earlier success screenshot exposed the clipped-hint issue that was then corrected.
- JavaScript syntax and scoped whitespace checks passed; canonical and desktop source copies are byte-identical.

Changes remain local. These are focused gameplay and UI checks, not an app-wide test suite or biological validation of the simulation model.

## Evasion survival objective and countdown (2026-09-12)

Fixed Evade the Goshawk ending immediately after the second catch despite its stated four-minute survival requirement. Two catches now satisfy the hunting portion; success still requires reaching the timer deadline with the goshawk at least 30m away. The existing close-range failure remains active throughout the survival period.

The mission panel now shows a minutes:seconds countdown alongside catch progress. Coaching retains the predator distance and explicitly marks catches as secured. A nearby predator takes priority over the completed catch requirement in the route indicator and coaching.

Validation:
- Seven evaluator boundary checks passed, covering early completion attempts, 239.999s versus the 240s deadline, insufficient catches, the 30m safe boundary, and close-range failure before/at the deadline. The two premature-win cases failed before the fix.
- Three targeted Chromium checks passed: the new evasion gameplay test plus existing successful/failed mission clarity checks. The evasion fixture makes two production catches, verifies the mission remains active below 100%, checks the countdown freezes while paused and continues after resume, verifies urgent evasion guidance after catches, and brings the real predator inside the failure range.
- The evasion browser test was rerun successfully after allowing for the HUD sampling interval and rendering a frame after the controlled resize.
- Visually inspected scratch/raptor-flight-review/evasion-survival-countdown.png at a narrow host width.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Deadline logic was tested at controlled boundaries; this pass did not assess the difficulty of an uninterrupted four-minute evasion flight or run the whole application suite.

## Thermal-only rules and mission control guidance (2026-09-12)

Ride the Thermal declared pull-up flapping forbidden but did not enforce that condition. Pull-up input now ends this mission with a specific explanation before the frame applies powered lift. The altitude-up button is visibly disabled, matching the existing physics restriction; its title directs the learner to rising air. The pull-up button warns that flapping ends the mission.

Thermal mission key guidance now offers turning/circling, glide-angle adjustment, and pause instead of hunting/strike/pull-up prompts. The prompt refreshes on thermal entry/exit. Grounded coaching advises restarting rather than using the forbidden takeoff action. Keyboard altitude-up no longer labels the flight as climbing when its climb effect is blocked.

Validation:
- Reproduced keyboard pull-up leaving the thermal mission active before the fix.
- Five distinct Chromium checks passed during this pass: keyboard and button pull-up enforcement without altitude gain, legal glide/turn entry into the real thermal with rising altitude and a circling prompt, and the two existing mission-clarity checks. All three thermal checks passed after the final guidance refresh adjustment.
- The legal-flight fixture uses production steering/physics and skips GPU submission during its approach loop, then resumes rendering for inspection.
- Visually inspected scratch/raptor-flight-review/thermal-legal-glide.png.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Remaining refinement identified during visual review: generic prey-target overlays can still compete with soaring guidance in this mission. The mission-specific key guide is corrected; contextual treatment of the remaining targeting overlays is a separate opportunity.

Changes remain local. Validation covers the rule and a valid thermal climb, not a full 500m mission completion or an app-wide test suite.

## Desert crossing outcome correctness and guidance (2026-09-12)

Cross the Desert now consistently enforces its stated airborne/refuel/energy requirements. Landing or crashing ends the crossing, and ground contact is remembered even if takeoff occurs before the next mission evaluation. Depleted energy ends the run at zero. A run that fails an energy check no longer displays the success message. Deadline success is evaluated only after the airborne and energy checks pass, then requires at least one refuel catch.

The objective describes these rules directly. Mission guidance distinguishes finding a refuel catch from staying airborne after refueling. The live timer now uses minutes:seconds, sharing the formatter with the evasion mission.

Validation:
- Eleven desert logic checks passed: early versus six-minute deadline, positive/zero/negative energy, missing refuel, landing, crash, and remembered prior ground contact. Seven failed before the fix. Seven existing evasion deadline checks also passed.
- Three Chromium checks passed: desert landing and crash through production controls/physics, plus the existing evasion countdown/pressure check. Desert checks cover a real refuel catch, pause-frozen countdown, continued countdown, grounded failure text/history, hidden ordinary pause overlay, and a clean Fly again restart.
- The descent sequences skip GPU submission while preserving simulation updates; rendering resumes before inspecting results.
- Visually inspected scratch/raptor-flight-review/desert-grounded-result.png.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. Controlled deadline tests validate the six-minute outcome rules; this pass does not claim a full natural-play crossing or an app-wide test suite.

## Soaring-specific navigation and uncluttered flight view (2026-09-12)

Ride the Thermal now follows the actual lift column instead of acquiring prey for HUD and camera attention. A cyan navigation banner gives a left/right turn cue with the player's mapped key and approximate horizontal distance to the column; it switches to green circling guidance inside rising air. The heading instrument tracks lift bearing and the telemetry strip reports lift distance/status. Existing thermal-entry/exit recording remains the sole source of those flight events.

The soaring view removes prey beacons, target lines/halos, targeting reticles, aim/range meters, and the irrelevant Strike/Target assist controls. Flight instruments replace hunting readiness with the glide-only rule. The assist shortcut explains the soaring objective without changing the assist setting. Paused redraws, Scenic view, reduced motion, camera/zoom changes, and restart retain the mission-specific presentation. Desktop banner spacing clears the telemetry strip.

Validation:
- Six distinct Chromium checks passed: four thermal checks covering keyboard/button rule enforcement, a legal production-physics glide into lift, no prey acquisition/camera pull, paused view changes, Scenic/reduced-motion behavior, 420px layout, and restart; two existing target-guidance checks retained hunting behavior at desktop and narrow widths.
- All four thermal checks passed after the final presentation adjustment. The initial narrow-layout test needed the harness's fixed wrapper resized as well as the viewport; the corrected fixture passed.
- Visually inspected thermal-legal-glide.png and thermal-guidance-paused-420.png in scratch/raptor-flight-review.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. This addresses the competing prey-overlay refinement noted in the thermal-rule review. Checks cover legal lift entry and presentation, not full 500m completion or an app-wide test suite.

## High Stoop speed readiness and completion clarity (2026-09-12)

High Stoop previously described its speed bar as mission completion, including an accessible announcement of 100% complete before a qualifying catch. Its speed display could also round a sub-threshold speed up to 180 mph, and its route advanced to the final phase from speed alone, even outside a dive.

The active mission now uses a speed-requirement bar with explicit mph values and accessible speed semantics. Speed feedback floors the displayed value so a sub-threshold speed is not presented as qualifying. The mission includes a minutes:seconds countdown, and its objective specifies a successful catch while diving at 180 mph or faster. The existing qualification rule is shared by the outcome check and guidance.

The route ends with Strike and reaches that phase only during a qualifying dive with a ready target and recovered talons. A green mission border and explicit mapped-key prompt mark that window. Earlier guidance distinguishes building dive speed, lining up prey, and recovering talons. A nonqualifying catch still earns its normal credit and now explains why High Stoop remains active. Completed runs restore the completion meter; a new run restores the speed meter.

Validation:
- Nine focused logic checks passed; eight reproduced the previous misleading readiness behavior before the fix. Checks cover the 180 mph boundary, countdown, speed-only meter, fast gliding, target alignment, strike readiness/recovery, and completed outcome.
- Three Chromium checks passed: the new High Stoop sequence plus two existing mission-clarity regressions. The new sequence uses real flight controls to accelerate, verifies a nonqualifying catch and speed alone do not complete the mission, then verifies a qualifying catch, frozen pause, completion semantics, restart, and 420px layout.
- Real prey are repositioned for deterministic acquisition/catch checks; physics continues normally, with GPU submission skipped during the acceleration loop and restored for visual review.
- Visually inspected scratch/raptor-flight-review/stoop-strike-readiness.png and stoop-guidance-420.png.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source files are byte-identical.

Changes remain local. These checks validate mission feedback and the controlled catch sequence, not a full natural-play difficulty assessment or an app-wide test suite.

## Visible deadlines and compact flight layout (2026-09-12)

Feed the Chicks, Silent Strike, and Ride the Thermal now show a dedicated countdown in the mission panel. These missions previously had time limits without an in-flight remaining-time display. The new row uses the simulation's elapsed time and existing HUD refresh, with no additional interval. Numerals use a fixed-width font. The row uses steady amber/red styling and explicit labels at 30/10 seconds, reports Paused immediately, and preserves the remaining time at the end of a flight. Its accessible timer has live announcements disabled to avoid interrupting the learner every second. Existing inline timers in the other missions remain intact.

Visual review found that the extra row could meet the altitude gauge on a shorter phone viewport. Narrow layouts now omit that redundant vertical gauge while preserving the altitude value in the top instruments. Desktop layouts retain the gauge. The target-marker layout already ignores zero-width hidden gauges.

Validation:
- Nineteen logic checks passed: ten countdown boundary/state checks and nine existing High Stoop readiness checks.
- Five distinct Chromium checks passed on the final source: countdown initialization, progression, pause/resume, Scenic visibility, completed/failed flight freeze, fresh restart, and 420px layout across all three missions; plus two existing HUD-clearance checks for Free Hunt and Feed the Chicks.
- A thermal resize check initially timed out because Playwright's default animation-frame polling shared the fixture's frozen requestAnimationFrame queue. Using explicit time-based polling corrected the fixture; the thermal check passed on rerun.
- Visually inspected the final mission-clock-feedChicks-420.png and mission-clock-thermalKettle-420.png in scratch/raptor-flight-review.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Validation covers countdown behavior and the tested responsive layouts, not a full natural-play run to every deadline or an app-wide test suite.

## Compact guidance spacing and target clearance (2026-09-12)

Compact flight views now place guidance to the right of the status/wind instruments instead of centering both in the same space. The guidance column reserves the full wind-readout width, wraps text, and clears the mission panel. Misaligned-strike guidance is shorter while keeping the required action explicit. The smallest hunt-cycle route labels now use the intended compact font size without clipping.

Embedded compact flight stages have a 460px minimum height so the mission panel and practice controls remain separate on short windows. Existing fullscreen sizing overrides remain intact. Edge-target placement uses the available vertical gap before falling back to the center, and text changes invalidate cached HUD bounds immediately rather than waiting for ResizeObserver.

Validation:
- Four Chromium checks passed together on the final source: compact hunting and thermal guidance at 420px and 320px with windy conditions and a deliberately short requested stage; existing target-guidance checks at desktop and phone widths.
- Compact checks verify cue separation from status, wind, heading, attitude, telemetry, and mission panels; stage bounds; readable route labels; practice-control clearance; real distant and misaligned missed strikes; frozen pause/camera changes; and Scenic visibility.
- Target checks cover all screen edges/corners, caption bounds, HUD clearance, assist toggles, Scenic/practice display modes, reduced motion, and targets behind the camera.
- Intermediate checks exposed a phone edge-marker collision and a three-line miss message; both passed after the spacing and wording corrections.
- Visually inspected the final guidance-lanes-open-420.png and guidance-lanes-thermalKettle-320.png in scratch/raptor-flight-review.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. This pass covers the tested compact HUD and target-guidance interactions, not an app-wide test suite or gameplay performance benchmark.

## Consolidated strike feedback and manual-hunt results (2026-09-19)

Catch and miss results now use the existing compact guidance banner. Removed the duplicate central strike overlay and duplicate transient event-stack messages, leaving the bird and flight path visible. The banner uses steady green for catches and amber for misses. Persistent Last strike coaching, catch credit, flight-event history, sounds, camera response, and physical strike effects remain intact.

Active strike results now take priority over the target-assist-off message, so manual hunting receives the same immediate result feedback before returning to normal guidance. Thermal navigation retains its mission-specific priority. Feedback continues to use the simulation clock and freezes while paused; Scenic view hides the banner through the existing presentation rules.

Validation:
- Six distinct Chromium checks passed during this pass: the new catch/miss presentation sequence, two existing strike-loop regressions, and three assist-presentation checks.
- Four checks passed together on the final source after the result-color and manual-hunting adjustments. These cover catches and misses at 880px and 320px, assist disabled on the phone, persistent coaching, duplicate-message removal, paused feedback, Scenic view, reduced motion, expiration back to manual guidance, and assist behavior in normal/practice views.
- The strike-loop regressions cover frozen recovery/feedback/prey replacement during pause, missed-strike coaching, rapid repeated inputs, restart, and quality reset. Real prey are repositioned for deterministic catch/miss scenarios; these are controlled browser checks rather than a full natural-play assessment.
- Visually inspected the final strike-clean-miss-880.png and strike-clean-hit-320.png in scratch/raptor-flight-review.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. This pass does not claim an app-wide test suite or a gameplay performance benchmark.

## Stable pointer steering and visible drag feedback (2026-09-19)

The flight canvas now keeps a steering gesture with the pointer that started it. A second touch cannot replace the active pointer or drive an abrupt turn, and right/middle mouse buttons cannot start steering. Unrelated pointer releases/cancellations no longer interrupt the original gesture or clear its normal release easing.

Pausing, losing focus, and changing control schemes now release pointer capture as well as clearing pending steering. Gesture ownership is cleared before releasing capture so the resulting lost-capture event cannot cancel normal release easing. Actual cancellation or unexpected loss of capture still stops pending steering. The cursor changes to grabbing during an active drag and returns to the existing crosshair after release or reset.

Validation:
- The new multi-pointer regression reproduced the previous bug: a second finger changed pending yaw from 0.1 to the 0.75 clamp instead of leaving the original gesture intact.
- Five distinct Chromium checks passed on the final source: two new pointer checks and three existing keyboard/pause presentation checks.
- Synthetic touch events with a capture shim cover pointer ownership, unrelated move/release/cancellation, continued original-finger steering, normal release easing, and cancellation cleanup. Real browser mouse input covers right-button rejection, native capture release on pause/focus loss/control remapping, cursor states, and fresh drags after reset.
- Existing checks preserve equivalent keyboard inputs, paused resize/reduced motion, frozen camera/zoom changes, resume controls, and compact paused layout.
- The mouse fixture initially read a nonexistent paused snapshot field after Escape. It now checks the visible pause overlay; both pointer checks passed on rerun without another production change.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. Touch ownership is tested with synthetic events; this pass does not claim physical-device testing or an app-wide test suite.

## Accurate held-control feedback and readable phone buttons (2026-09-19)

Flight hold buttons now read their pressed appearance and accessible pressed state from the simulator's aggregated input state. Keyboard holds illuminate the matching on-screen control; pause, focus loss, and control remapping clear the visible state with the held inputs. Feedback updates on input transitions rather than animation frames or repeated keydown events, and teardown skips UI notifications.

Each pointer and each button activation key has its own input source. Releasing one finger, Enter, or Space no longer cancels another still-held source. Losing button focus clears that button's sources while retaining other input origins. Legacy hold commands retain their existing behavior. Right/middle mouse presses cannot activate hold buttons, and disabled thermal-climb controls remain visually inactive.

Visual review exposed a cramped Pull up (Space) label in the former five-column phone layout. The Flight button group now uses three columns on compact screens and two below 400px, allowing labels to fit within their button borders. Other control groups keep their existing layouts.

Validation:
- All three new browser regressions failed on the previous source, reproducing missing keyboard highlights, early release of overlapping activation keys, and secondary-button activation.
- Eight Chromium checks passed together on the final source: three held-control checks, three keyboard/pause checks, and two pointer-ownership checks.
- Coverage includes real keyboard activation, synthetic touch holds with a capture shim, overlapping input sources, normal releases/cancellations, pause/resume, focus loss, remapping, keyboard aliases, frozen camera/zoom/resize/reduced motion, and native mouse capture cleanup.
- The enhanced held-control check verifies the active background color and each button's overflow at 880px and 320px. Visually inspected held-controls-880.png and the corrected held-controls-320.png in scratch/raptor-flight-review; all phone labels fit.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. This pass does not claim physical touchscreen testing, an app-wide test suite, or a performance benchmark.

## Consistent grounded strikes and explicit takeoff controls (2026-09-19)

Grounded strike handling now follows the simulator's existing Launch first guidance. Both target eligibility and strike execution reject attempts while landed, before tutorial strike credit, catch credit, cooldown, or delayed strike actions can be created. Landed birds watching nearby prey receive the existing watch/launch guidance rather than strike-ready feedback. This aligns the flight game's rules; it is not a new claim about real-world ground hunting.

The Strike button and Strike instrument now share their availability text and explanation: Launch first, Paused, Recovering, or Flight ended. The button is disabled when those states prevent striking, and its accessible label and tooltip reflect the reason. The existing paused-control regression now expects the explicit Strike paused label.

While landed or perched, Pull up becomes Take off with the mapped key and an explicit hold-to-launch tooltip. Take off receives primary visual emphasis while Dive returns to its neutral appearance; airborne flight restores the usual labels and emphasis. Entering perched practice publishes its resting flight state immediately, so the controls do not briefly retain the airborne state while waiting for another animation frame.

Validation:
- Both new Chromium checks failed on the previous source, reproducing ground strike eligibility and stale airborne feedback immediately after entering perched practice.
- Seven distinct browser checks passed together: two new landing/takeoff controls checks, three existing keyboard/pause presentation checks, and two existing strike-loop checks.
- Both new checks passed again on the final source after takeoff emphasis was added. They cover a production-physics ground landing, blocked command/keyboard strikes with no queued strike actions, launch through the focused Take off button, a successful airborne catch, immediate perched state, pause/resume, restored airborne labels/emphasis, and readable 320px buttons.
- GPU submission is skipped only during the controlled descent loop and restored for subsequent interaction and visual review. Real prey are repositioned to make catch eligibility deterministic.
- Visually inspected the final scratch/raptor-flight-review/takeoff-controls-320.png. Labels fit, Take off is prominent, and Launch first is visibly disabled.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. This pass does not claim an app-wide suite, physical touchscreen testing, or a full natural-play difficulty assessment.

## Usable custom-control fallbacks and paused remapping (2026-09-19)

Unbound launch and dive actions now name their on-screen controls instead of leaving a blank space in flight guidance. Perch instructions explain drag scanning when look/pitch keys are absent. Landing and recovery messages share the same mapped-key or Take off fallback. The custom-binding warning explains that drag steering and on-screen controls remain available while keys are being assigned.

Contextual prompts now retain a Button badge for an available on-screen action when it has no keyboard shortcut. These badges use a text span rather than keyboard markup, and preserve the matching control's guidance highlight. Mapped keys retain their existing presentation.

Changing control presets or custom bindings refreshes target, perch, mission, and pause instructions immediately. A paused view repaints once without advancing physics, prey, timers, or recorded progress. Reusing a key for another action also refreshes the newly unbound action's fallback.

Validation:
- Both new Chromium checks failed on the previous source, reproducing empty perch controls and a STOOP instruction with no action after hold.
- Six focused Chromium checks passed together on the final source: two custom-guidance checks, the existing preset/custom-binding instrument check, and three existing keyboard/pause presentation checks.
- New checks use the actual settings UI to assign and reassign launch/dive keys while paused; verify unchanged flight time, position, energy, catch count, and prey; and confirm launch still works through an unbound on-screen button.
- The instrument regression verifies mapped shortcut attributes while a strike is unavailable on the perch, then verifies the enabled mapped strike after takeoff and a HUD update.
- Visually inspected unbound-perch-guidance-320.png and unbound-dive-key-guide.png in scratch/raptor-flight-review. Phone perch instructions fit and button prompts are visually distinct from keyboard keys.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop source copies are byte-identical.

Changes remain local. Validation is focused on control guidance and paused remapping, not an app-wide suite or a physical touchscreen assessment.

## Flight trail recovery guidance and phone HUD spacing (2026-09-19)

An active flight trail now explains landing, crash recovery, and pausing instead of continuing to display airborne steering instructions. The contextual key guide prioritizes ground controls, and the trail panel uses the current mapped takeoff key or on-screen button fallback. Remapping controls refreshes the trail guidance immediately. Recovery receives a steady amber border; paused guidance receives a blue border, with forced-colors support.

On compact screens, the heading and attitude instruments are hidden during trail practice to give the progress panel clear space. Ground-contact notifications are omitted from the transient event display while the trail provides the same recovery guidance. Events remain in the underlying log and can display after leaving the trail while still recent; other event types are unchanged.

Validation:
- Two new browser checks exercise actual flight physics: earning ring credit, ordinary landing, launch through the Take off button, a dive-induced crash, and timed ground recovery. Both initially failed against the previous source at the new recovery-state expectations.
- Five distinct Chromium checks passed together: the two recovery checks and three existing flight-practice checks covering input smoothing, pause, shadow-update limits, complete trail progression, replay, and mapped controls.
- After the final duplicate-event correction, both recovery checks passed again. Assertions verify preserved ring index, score, passed rings and pips, paused simulation time and position, recovery-specific directions, and restored ground-contact events after leaving trail practice.
- Visually inspected the final trail-grounded-stage-320.png in scratch/raptor-flight-review. The wind display and recovery panel no longer overlap; the panel text fits. The fixture waits for canvas resize and draws a frame before capture.
- GPU submission is skipped during long controlled flight loops and restored for interaction and screenshots. No physics shortcuts are used for landing or crash recovery.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. This pass does not claim physical-device testing, an app-wide suite, or new findings about raptor behavior.

## Labeled reserves and compact weather telemetry (2026-09-19)

The top instrument strip now gives calories and stamina separate labeled rows, each with its own percentage and bar. This removes the ambiguous slash-separated values that crowded the weather cell on phones. Weather shows the named day period above the existing cloud-cover percentage and weather glyph. The existing energy thresholds, capped percentages, weather metadata, and simulation rules are unchanged.

The energy metric is now an explicitly named accessibility group. Compact cells can shrink to available space rather than forcing a fixed minimum width. Vertical spacing keeps the two-row readouts clear of the flight-state badge, and the strip supports forced system colors while retaining the existing reduced-motion behavior.

Validation:
- Five distinct Chromium checks passed on the final production source: the new telemetry check, two existing mission-HUD clearance checks, and two trail landing/crash-recovery checks. The telemetry check passed on its final separate rerun after correcting test assumptions about HUD sampling and post-pull-up stamina.
- The new check compares live reserve values with actual simulation state, verifies text bounds and instrument clearance at 880, 760, 420, 320, and 300px panel widths, and checks frozen position, energy, and simulation time during paused resize. On resume it allows the existing 10 Hz HUD's bounded lag behind physics.
- The first layout run caught a 2.9px overlap with the flight-state badge; vertical spacing was corrected before the successful runs.
- Visually inspected telemetry-clarity-880.png, telemetry-clarity-320.png, and telemetry-clarity-forced-colors.png in scratch/raptor-flight-review. Captures temporarily dismiss the pause card without advancing simulation time so the instruments remain visible.
- Existing checks preserve mission-panel spacing, earned ring progress, takeoff, crash recovery, and pause behavior.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Validation covers Chromium and simulated narrow layouts, not physical devices or the entire application suite.

## Continuous ring navigation and clearer trail feedback (2026-09-19)

Flight Trail now keeps its steering hint visible during the welcome tip and ring awards. Feedback has a separate, visually secondary line with distinct passed/missed tones; pause and ground recovery hide transient awards so their next-action instructions retain priority. The original welcome announcement remains, with a shorter visible centered-pass tip.

Turn guidance now uses the inner scoring radius and current horizontal distance instead of the former fixed 0.30-radian threshold. Vertical advice also uses the inner scoring radius rather than a fixed six-meter tolerance. This gives earlier corrections on approaches that previously received Hold your line despite aiming outside the centered scoring area. Ring geometry, crossing detection, flight physics, and point awards are unchanged.

On phones, transient feedback occupies the space beside the flight-state and wind badges. This keeps the central progress panel from growing over the approaching ring. Scenic view retains feedback inside its panel because the instrument badges are hidden.

Validation:
- Six Chromium checks passed together: the new continuous-guidance check, three existing flight-practice checks, and two landing/crash-recovery checks.
- The new check passed again after the final phone spacing and welcome-copy adjustments. It exercises a real off-axis approach below the former angular threshold, an earned ring pass, simultaneous steering and award feedback, paused feedback timing, stopping the trail, scenic layout, and desktop/320px panel bounds.
- The first new check needed simulated time for the existing 10 Hz HUD to catch up after steering. Production HUD timing was retained.
- Visual review caught the enlarged central panel and then a narrow overlap between the welcome tip and longer wind readout. The feedback chip was repositioned, narrowed, and given a shorter tip; explicit overlap and vertical-clearance assertions now pass.
- Reviewed the phone stage and welcome captures in scratch/raptor-flight-review, including the final trail-steering-intro-320.png. Steering remains prominent and the welcome tip has clear separation from the wind badge.
- Existing checks preserve full trail completion, replay, best scores, input smoothing, mapped controls, paused progress, earned rings through landing/takeoff, and timed crash recovery.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. This pass does not claim physical-device testing, a full application suite, or a new biological model.

## Compact trail aiming view and unclipped phone wind (2026-09-19)

On phones, the airborne trail panel now uses a compact two-row layout for ring number/distance, score, and steering. This reduces its obstruction of the approaching ring. Individual ring markers remain in the accessibility tree; their full visual presentation returns when paused, grounded, recovering, or reviewing completed results. Desktop presentation retains the full marker row, and scenic feedback spans the compact panel normally.

Wind direction/speed and the optional ground-speed/lift detail now use separate DOM spans. Phones stack the values on two lines between the flight-state badge and heading instrument; desktop keeps a single line. Values, units, conditional ground-speed visibility, lift information, and the existing weather accessibility description are retained. The transient trail tip is anchored to the panel edge so it stays clear of the longer wind readout at the smallest checked widths.

Validation:
- Seven Chromium checks passed together: two new compact-HUD checks, two free-flight/thermal guidance-layout checks, the existing continuous-trail-guidance check, and two trail landing/crash-recovery checks.
- After the final notification alignment adjustment, both new checks and the continuous-guidance check passed again (three checks).
- The new flight check projects the actual first ring through the rendered camera and verifies more than 12px clearance from the compact panel to the ring center. The panel is under 60px high at a 320px wrapper width, retains score and steering, and exposes all five ring markers to role queries.
- Pause checks verify unchanged flight time, position, ring index, and score; the full visible ring markers return while paused. Scenic layout remains in bounds.
- Strong-wind checks verify uncut text at 880, 420, 320, and 300px wrapper widths; separation from flight-state, heading, and target cues; combined strong-wind/trail-tip clearance on the two narrowest widths; frozen values during pause; and removal of ground-speed detail when wind no longer changes speed enough to show it.
- The initial wind fixture used a cross/headwind combination whose resulting speed difference fell below the existing display threshold. It now uses a southeast wind that produces a measurable ground-speed difference; production wind physics were unchanged.
- Visually reviewed compact-flight-ring-320.png and compact-wind-320.png in scratch/raptor-flight-review. The ring center is visible below the compact panel, and both wind and ground-speed values fit.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification covers Chromium and simulated narrow layouts, not physical-device testing or the entire application suite.

## Consistent turning camera and immediate paused motion preferences (2026-09-19)

The chase camera now banks around its actual viewing direction. Previously its up vector tilted along a fixed world axis, so the horizon tilt faded and reversed as the bird changed heading. Both turn directions now retain a consistent visual bank around the compass, with the existing damping and maximum tilt preserved. The correction reuses a cached vector and does not change flight physics.

Enabling reduced motion while paused now rebuilds the camera orientation immediately. Resetting the up vector alone left the rendered view tilted until a later camera update. The correction preserves the camera position and viewing direction and does not advance the simulation.

Validation:
- A new browser regression reproduced a right turn displaying a wrong-way bank of approximately -0.286 radians before the correction.
- Both new directional checks use actual flight controls and physics, cover all four heading quadrants, and measure the rendered camera quaternion. They also verify frozen paused state, immediate reduced-motion leveling, preserved camera position and viewing direction, first-person/chase switching, and level flight after resuming with reduced motion.
- The first combined run passed six existing flight-continuity and input/pause checks. Its two new directional checks exposed the separate paused reduced-motion issue after passing their compass-banking assertions.
- After correcting paused leveling, both new camera checks and the three existing input/pause checks passed together. The three continuity checks had already passed with the camera-axis correction; they were not rerun after the isolated preference-change correction.
- The continuity test's obsolete minimum-padding assumption was replaced with telemetry fit and flight-state clearance checks, matching the previously approved compact telemetry layout.
- Visually reviewed consistent-bank-right.png and consistent-bank-left.png in scratch/raptor-flight-review. The opposing horizon tilts are coherent, and the bird, reticle, and instruments remain clear.
- Long deterministic flight loops skip GPU submissions; rendering is restored for screenshots. JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification covers Chromium with the low-quality rendering fixture, not physical-device testing or the entire application suite.

## Heading-consistent climbing and diving poses (2026-09-19)

The bird model now composes heading before its local pitch and bank. The previous XYZ rotation applied pitch around a world axis, making the nose drop or appear level during a climbing turn as the heading changed. YXZ composition keeps the existing visual pitch amount and damped bank consistent across the compass. Flight physics, camera behavior, animation timing, and resting poses are preserved.

Validation:
- The new browser regression failed against the previous source with approximately 25.4 degrees of nose-direction error relative to the intended visual pose.
- Two new checks pass using real flight controls through all four heading quadrants, for both left and right climbing turns. They measure the rendered model quaternion, verify nose-up alignment and consistent bank, then check nose-down alignment during descent, bank settling after steering release, and frozen pose/position/time while paused.
- Seven distinct Chromium checks passed on the final production source: the two new pose checks, both camera-bank checks, and all three flight-continuity checks.
- The first combined run passed five checks. The landing check passed its ground-contact and folded-pose assertions but timed out waiting for the Scenic view click; the serial reduced-motion check was skipped. A targeted rerun passed both checks without source or test changes.
- Visually inspected aligned-climb-right.png and aligned-climb-left.png in scratch/raptor-flight-review. Both show coherent banked climbing poses with clear instruments and reticle.
- Long deterministic flight loops skip GPU submission and restore rendering for screenshots. JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. These checks use Chromium with the low-quality rendering fixture; this is not physical-device testing or a full application suite.

## Camera-independent attitude instrument (2026-09-19)

The attitude indicator now reads the bird's damped visual bank instead of camera roll. This keeps the bank value and miniature horizon meaningful in first-person view and under reduced motion, where the camera remains level. Grounded and crashed birds report zero pitch and bank, so a perched scanning angle is no longer presented as a dive. Airborne pitch remains the existing flight pitch; physics, model animation, camera behavior, and the HUD sampling rate are unchanged.

Validation:
- The new browser regression failed against the previous source at its independent model-bank comparison: the camera-derived display read -16 degrees while the rendered bird rounded to -15 degrees.
- Five Chromium checks passed on the final source: the new attitude check, both compass camera-bank checks, and both grounded-strike/takeoff-control checks.
- The new check measures bank from the rendered bird quaternion and verifies matching values in chase and first-person views, retained readouts during paused view and reduced-motion changes, unchanged paused simulation time and position, working bank guidance with reduced motion, settling to level after steering release, and a level instrument while scanning from a perch.
- Existing checks preserve camera banking through all compass quadrants, paused leveling, ground strike restrictions, launch behavior, resumed hunting, and phone control fit.
- Visually reviewed attitude-first-person.png in scratch/raptor-flight-review. The compact instrument shows the nonzero bank clearly while the first-person camera stays level.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Checks use Chromium and simulated layouts, not physical devices or the full application suite.

## Terrain-relative height scale and clearer labels (2026-09-19)

The side height gauge now scales between the local terrain and the actual mission ceiling. Previously it divided height above terrain by the ceiling's absolute world height, mixing reference levels. A bird at the ceiling above raised ground could therefore appear to have room left to climb. Numeric height remains measured above the terrain, and flight limits and physics are unchanged.

The top metric and side gauge now use Height. The metric has a Height above terrain tooltip and an accessibility group label containing the current value and unit.

Validation:
- A new browser regression uses normal climb and steering controls to reach the 500-meter world ceiling and fly over the cliff plateau. Against the old source, the gauge showed 94% at the actual ceiling. The initial circular route stayed over low ground; the fixture was extended to elevated terrain to expose the mismatch.
- Four Chromium checks passed: the new height check, both existing mission-HUD clearance scenarios, and the telemetry clarity check.
- The new check verifies full-scale fill and marker at the ceiling, the retained terrain-relative numeric value, accurate scale during descent, unchanged paused position/time/readings, accessible naming, and the visible height metric in a narrow layout where the side gauge is hidden.
- Existing coverage verifies instrument text fit down to 300px, mission-panel separation, pause/resume, and forced-color presentation.
- Visually inspected height-gauge-ceiling.png in scratch/raptor-flight-review. The gauge is full while the value correctly reads 469m above the raised terrain.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses Chromium and simulated narrow layouts, not physical-device testing or the entire application suite.

## Pause when leaving the flight window (2026-09-19)

Window focus loss now pauses the simulator through the existing pause path, instead of merely clearing held controls while the bird keeps flying. Returning focus leaves the flight paused until the player resumes. Moving focus from the canvas to controls within the same window retains normal flight behavior. The pause path also gates audio and stops the animation loop.

Validation:
- The new window-focus browser regression failed on the previous source because the pause overlay stayed hidden after a window blur event.
- Seven distinct Chromium checks passed on the final source: the new focus check, all three input/pause checks, and all three held-control feedback checks. The original combined run passed six; the existing keyboard-hold test required an explicit resume after its simulated window blur, then passed on its targeted rerun.
- The new check dispatches window blur/focus events, verifies frozen bird position, heading, energy, camera, wings, simulation time, and render count, checks repeated blur causes no additional render, and confirms focus restoration does not automatically resume. Explicit resume advances exactly the requested simulation time without retaining the previous steering input. A canvas-only blur does not pause.
- Existing checks cover independent keyboard/touch holds, control remapping, phone button fit, paused resizing and reduced motion, camera/zoom redraws, and the Resume flight card.
- Visually reviewed window-focus-paused.png in scratch/raptor-flight-review. The pause card presents a clear Resume flight action while keeping the frozen scene visible.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Focus events are simulated in Chromium; native operating-system window switching and physical-device behavior were not tested.

## Immediate paused field-of-view reset for reduced motion (2026-09-19)

Enabling reduced motion while paused now updates the camera projection before the existing paused redraw. Dive-induced widening and strike lens effects resolve to the normal field of view immediately; deliberate acuity zoom remains active. Previously the motion effects were hidden but their widened lens stayed frozen until flight resumed. The existing zoom-aware FOV function is reused, and live-flight easing remains unchanged.

Validation:
- The new browser regression uses actual dive controls in High Stoop. Against the previous source, its paused field of view remained at approximately 74.86 degrees after reduced motion was enabled instead of returning to 70 degrees. The initial three-second fixture produced only 1.25 degrees of widening and was extended to six seconds to make the starting condition distinct.
- Six Chromium checks passed together on the final source: the new paused-framing check, both camera-bank checks, and all three input/pause checks.
- The new check verifies the camera projection matrix, exactly one paused redraw, no continuing animation frames, unchanged position/time/energy/speed/catches, retained acuity zoom across preference changes, correct zoom-off framing, and stable field of view after resume.
- Existing checks retain heading-independent camera bank, paused leveling, input ownership, paused resize, and camera/zoom controls.
- Visually inspected reduced-motion-paused-framing.png in scratch/raptor-flight-review. The frozen dive remains framed beneath the pause controls without the widened lens effect.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses Chromium with the low-quality fixture and an emulated motion preference, not physical-device testing or the full application suite.

## Actual vertical-speed feedback beneath height (2026-09-19)

The height metric now includes a compact vertical-speed line with an up/down arrow, meters per second, and restrained climb/descent colors. It measures world-vertical movement after lift, glide sink, trim, ground contact, and ceiling constraints, rather than inferring it from pitch. Exponential smoothing and a small near-zero threshold keep the cue readable. Grounded/crashed birds and birds held at the mission ceiling report zero. Flight physics are unchanged.

The accessible height description now includes climbing/descending rate or zero vertical speed. The numeric height remains prominent, with smaller secondary text below; forced colors override the decorative tones. The existing HUD clock freezes the readout while paused.

Validation:
- Three Chromium checks passed together: the new vertical-speed check, the expanded ceiling/height check, and the existing telemetry clarity check. The new check passed again after correcting its visual capture to temporarily hide the covering pause card without advancing simulation time.
- The new check compares shown climb and descent rates with independently measured position changes, verifies glide sink at level pitch, checks zero on a perch, and confirms paused state/readouts remain unchanged. It covers reduced motion, forced colors, text bounds, and flight-state clearance at 880, 420, 320, and 300px widths.
- The ceiling check verifies zero vertical speed while climb input is still held at the actual ceiling. Existing coverage retains height scale accuracy, energy labels/values, pause/resume, and compact telemetry bounds.
- Visually reviewed vertical-speed-320.png in scratch/raptor-flight-review. The frozen climbing example shows 73m height with a smaller upward 7.2m/s cue, and all four visible metrics fit without obstruction.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses Chromium and simulated layouts, not physical devices or a full application suite. The readout is a smoothed gameplay instrument, not a new biological model.

## Directional return guidance at the flight-area edge (2026-09-19)

The existing mission focus line now explains proximity to the flight-area edge and points left or right toward the center. Once the bird faces inward, the hint changes to keep heading toward center. The contextual key guide shows the mapped return-turn key; when that direction is unbound, the mission hint suggests dragging instead. Normal mission and hunting guidance returns after re-entering the interior.

The existing inward steering and world limits are unchanged. The cue reuses the mission panel and key prompts without another overlay, retains progress and route information, and yields to flight lessons, ring practice, grounded recovery, resolved missions, and urgent predator evasion. Pause retains the scene and gives Resume priority in the key guide.

Validation:
- Five distinct Chromium checks passed on the final source: the new boundary-return check, both custom-control guidance checks, and both compact guidance-layout checks. The new test initially assumed a literal space between separate key-chip and hint DOM elements; its assertion was corrected before the successful targeted rerun.
- The new check flies to the boundary using normal physics, independently calculates the correct return direction, verifies custom and unbound controls, checks phone bounds and paused state, follows the inward heading, then verifies restored hunting prompts and preserved catches after returning.
- Existing checks retain mapped launch/dive fallbacks, paused remapping, and free-flight/thermal guidance clearance.
- Visually inspected boundary-return-320.png in scratch/raptor-flight-review. The return instruction fits beneath the hunt phase while progress and route steps remain readable.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification covers Chromium and simulated narrow layouts, not physical devices or the full application suite.

## Smooth distant-bird recycling (2026-09-19)

Decorative distant birds now fade near their recycling radius, remain fully transparent on the relocation frame, and ease back into view afterward. Reduced motion freezes both their drift and recycling. The four existing sprites reuse their geometry and materials without additional draw calls, and recycling uses the scenery random generator instead of consuming gameplay randomness.

Validation:
- Five distinct Chromium checks passed across the final runs: the new flock-continuity regression and the four existing cinematic scenery scenarios (cliffs, high-quality lake, low-quality night, and low-quality lake).
- The new regression verifies near-edge fading, a transparent relocation frame, bounded smooth fade-in, retained geometry/material identities, exact pause behavior, and frozen decorative scenery under reduced motion while the player continues moving.
- The high-quality lake scenario timed out twice while reading the canvas snapshot. Added immediate canvas-presence and browser-error diagnostics; the targeted rerun passed all existing rendering assertions without production changes. The cause of the earlier timeouts remains unconfirmed. Both low-quality scenarios subsequently passed together.
- Visually inspected distant-bird-continuity.png in scratch/raptor-flight-review. The four decorative birds were staged ahead of the camera for visibility in this review capture; the raptor and flight HUD remain clear.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Browser verification uses software-rendered Chromium with optional bloom disabled, not physical-device frame-rate profiling or the full application suite.

## Camera-aligned dive streak fades (2026-09-19)

Dive speed streaks now keep following the camera through their fade after the dive control is released. Previously their position and orientation stopped updating while they remained visible, leaving the effect behind as the player moved and turned. Opacity now eases toward speed-dependent intensity on entry and exit, so restarting a dive at speed does not instantly restore a bright effect. Fading streaks retain the current atmosphere tint. Ground contact, crashes, pause, and reduced motion clear the effect through their existing presentation paths.

Validation:
- The new browser regression reproduced the previous defect: after the first 25ms release frame the visible streak mesh was approximately 1.22m away from the camera.
- Four Chromium checks passed together on the final source: the new dive-streak regression, the existing paused motion-framing check, and both paused Scenic-view checks.
- The new check uses real dive and turning controls, verifies camera position/orientation alignment throughout visible fading, monotonic fade-out, gentle re-entry, reused geometry/materials, paused flight state, and hidden streaks during reduced-motion flight.
- Existing checks retain zoom-aware paused camera framing and Scenic-view visibility without advancing flight or rebuilding effect geometry.
- Visually reviewed dive-streak-continuity.png in scratch/raptor-flight-review. The subtle streaks frame the diving raptor without obscuring the instruments.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses software-rendered Chromium with optional bloom disabled, not physical-device frame-rate profiling or the full application suite.

## Heading-relative wind guidance (2026-09-19)

The wind instrument now says WIND TO before its compass direction, matching the simulator's existing wind-travel convention. Its former static arrow now points along wind travel relative to the bird's heading: forward, backward, or sideways as the player turns. Calm air uses a dot. The detail line adds HEAD, TAIL, or DRIFT L/R for winds of at least 1.2m/s, alongside the existing ground-speed reading. Active thermal lift retains priority in that line to keep compact layouts clear.

The accessible weather description spells out the predominant wind effect relative to heading. This is presentation of the existing wind vector; flight physics are unchanged. The directional instrument updates without a decorative transition and remains informative with reduced motion enabled.

Validation:
- Five Chromium checks passed together: the new wind-guidance regression, both compact flight-instrument checks, and both compact guidance-layout scenarios. The new check passed again after its review capture was adjusted to hide the covering pause card temporarily without advancing simulation time.
- The new check verifies arrow orientation and text for headwind, tailwind, left drift, and right drift; a turn against fixed world wind; calm presentation; accessible descriptions; paused state; reduced motion; and retained guidance in forced colors.
- Existing coverage verifies wind text bounds and separation from neighboring instruments at 880, 420, 320, and 300px widths, alongside ring-practice feedback and open-flight/thermal guidance.
- Visually inspected directional-wind-320.png in scratch/raptor-flight-review. The direction, speed, relative drift, and ground speed fit in two compact rows.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses software-rendered Chromium and simulated narrow layouts, not physical devices or the full application suite.

## Navigation follows the active flight objective (2026-09-19)

Ring practice now changes the telemetry card from Target to the current ring number and points the heading instrument toward that same ring. Both update as each ring is passed and restore prey information immediately when practice stops. Heading updates share the existing target-feedback refresh, so toggling target assist while paused also clears or restores the bearing without advancing flight.

The practice panel and telemetry card now share their ring-distance update. Visual review of the first implementation caught a one-metre difference caused by their separate refresh schedules; both readouts now stay synchronized. Hunting cues still use prey distance, and thermal missions keep their lift navigation.

Validation:
- The new browser regression failed against the previous source because starting ring practice left the telemetry label at Target instead of Ring 1.
- All nine checks in the final Chromium run passed: the new objective-navigation check, the existing continuous trail-guidance check, three paused target-marker checks, and four thermal mission checks.
- The new check flies through a ring using normal controls, verifies independently calculated ring distance and bearing, checks agreement between both distance readouts, confirms progression to Ring 2, exercises pause and view changes, stops practice, and verifies immediate paused target-assist updates with frozen flight state.
- An earlier run passed eight checks but the thermal narrow-layout test timed out on an animation-frame-polled resize wait under its deliberately frozen animation clock. Changed its resize and restart waits to timed polling; the complete final run passed.
- Visually inspected ring-navigation.png in scratch/raptor-flight-review after synchronization. Both the telemetry card and practice panel show Ring 2 at 47m, with the heading instrument pointing to that ring.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses software-rendered Chromium and simulated narrow layouts, not physical devices or the full application suite.

## Time-based, tapered flight-path trail (2026-09-19)

The flight-path trail now samples elapsed simulation time instead of storing one point per rendered frame. Its existing quality-dependent point count represents roughly 0.4 seconds of flight, with interpolated sample crossings during slower frames and a live head attached to the bird. A static per-vertex opacity taper softens the end of the line. Existing geometry is reused, with no extra draw calls or per-frame allocations. Grounded/crashed states reset the trail alongside reduced motion and inactive flight effects.

Validation:
- Both new browser regressions failed against the previous source: the low-quality trail represented 110ms of history at 10ms frame intervals and 550ms at 50ms intervals.
- Five Chromium checks passed together on the final source: both trail-timing cases, the dive-streak continuity check, and both paused Scenic-view checks.
- Timing checks compare the actual trail tail with independently recorded flight positions, verify roughly 0.4 seconds of history at both frame intervals, confirm head attachment and the retained 12-point low-quality geometry, and exercise the compiled monotonic opacity taper.
- The new checks also retain unchanged paused geometry across Scenic toggles, hide the effect under reduced motion, and confirm a freshly seeded trail after motion effects resume. Existing coverage preserves dive streak alignment and paused rendering behavior.
- Visually inspected time-based-flight-trail.png in scratch/raptor-flight-review. The restrained trail fades behind the diving raptor without obscuring the flight instruments.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Timing is verified with controlled simulation frames in software-rendered Chromium at low graphics quality; this is not a hardware frame-rate benchmark or a full application test run.

## Independent, soft-edged night stars (2026-09-20)

Stars now twinkle gently at independent phases and frequencies instead of changing the opacity of the entire starfield together. Their existing random phase/frequency values are stored in one static geometry attribute, while two shader uniforms supply simulation time and the motion preference. A radial fragment fade softens point edges. Atmospheric visibility continues to follow daylight and cloud cover, with the existing star count and single starfield draw call retained.

Reduced motion removes the twinkle immediately, including during a paused flight. Pausing freezes the simulation-time uniform. No per-frame star geometry updates or additional gameplay random draws were added.

Validation:
- Five Chromium checks passed across the final runs: the new star-rendering regression, the complete low-quality owl night scene, and terrain-lighting continuity at low, balanced, and high quality.
- The new regression renders the real star geometry/material against a fixed review background and verifies that some pixels brighten while others dim. With motion disabled, pixel buffers at two different shader times match exactly. It also checks compiled shading, retained geometry and phase data, pause, live and paused motion-preference changes, and zero star opacity in daylight.
- Existing checks retain pause-aware atmosphere and Scenic view, and verify continuous sunlight direction across cached-shadow frames at all quality tiers.
- Visually inspected independent-night-stars.png (an isolated overhead starfield review) and cinematic-night-low.png (the actual narrow owl flight scene) in scratch/raptor-flight-review.
- JavaScript syntax and scoped whitespace checks passed; canonical and packaged desktop sources are byte-identical.

Changes remain local. Verification uses software-rendered Chromium with optional bloom disabled, not physical-device testing or the full application suite. The starfield is a decorative sky, not a mapped astronomical chart.
