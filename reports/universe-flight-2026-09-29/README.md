# Universe flight explorer

Universe Tool now includes **Open 3D flight**, with two modes:

- **Free exploration:** move a camera through a star neighborhood, spiral galaxy, or galaxy groups. Travel speed is adjustable in light-years per playback second. Pause holds the camera position while drag, arrow keys, and direction buttons remain available.
- **Einstein’s light chase:** choose a velocity from rest through 99.99% of light speed. The fixed travel heading is independent of where the camera looks. Compare the apparent sky with an unshifted view and inspect elapsed times in the stationary-source and traveler frames.

The scene starts paused. Full screen includes a pause control. Leaving the page pauses travel; rendering sleeps offscreen and while paused. Closing the explorer disposes graphics resources and listeners. Reopening starts a fresh, paused journey. Each scene has a finite boundary that stops travel and offers a reset or a look back.

## Enhanced exploration and experiments

- Ten generated landmarks across the three scales have selectable markers, distance readouts, and a center-view action. In the light chase, a selected star also shows its direction in both frames and its Doppler factor.
- Guided exploration approaches follow a destination while allowing independent free look, ease down near the destination, and pause at a viewing distance. They can be paused, resumed, or canceled. They do not represent spacecraft dynamics.
- Field-of-view zoom, display exposure, and resolution controls affect the display without changing travel or physics.
- Up to twelve saved views retain their scene, camera position, display settings, selected landmark, elapsed clocks, and optional notes in the host tool data. Returning to a view is always paused; current travel speed and playback time scale are retained. Field notes can be downloaded as text.
- Five paused experiments compare rest, forward light, chasing light from behind, sideways viewing, and 99.99% of light speed. Their controls sit above the 3D view.
- A directional spectrometer computes a reference emission line as seen at the center of the view, including shifts outside visible light. It is not a spectrum measured from the generated RGB stars. The visible-band indicator appears only for wavelengths within the displayed 380–780 nm range.
- Two schematic light-clock diagrams explain the same round trip in the traveler and stationary-star frames. At rest, they correctly show identical paths and intervals. The diagrams use the selected velocity and are separate from accumulated journey clocks.

## Model and limitations

### Visual enhancement pass

- Galaxies now combine a locally generated diffuse emission texture, irregular spiral arms, dark lanes, a warm central bulge, and resolved 3D stars. The textured disk shares the tilt and position of its star population. Dust lanes reduce the illustrative disk emission; this is not a volumetric light-transport calculation.
- The local sky includes a broader, softly lit galactic band. Star point profiles are more restrained to preserve the surrounding structure.
- Eight scenic viewpoints offer paused perspectives across the three exploration scales. These jumps reset journey counters and set their own field of view and exposure.
- Hide overlay removes the scene labels, reticle, and target marker while keeping fullscreen and travel controls available. Save image downloads a PNG at the current render resolution.
- This pass adds no runtime dependencies. The emission texture is generated once per scene lifecycle and shared across galaxy surfaces.

### Cinematic orbit and galaxy variety

- Free exploration can now orbit a selected destination with fixed distance and height, keeping the destination centered. The camera pace ranges from 0.25 to 12 degrees per playback second and can be reversed. These camera moves do not model gravity or advance the physical journey clocks.
- Pause retains an orbit for resuming. Manual look, direction buttons, or changing the destination end it and pause. Approaching a destination, resetting, restoring a saved view, and switching modes clear the orbit. Model boundaries still stop travel.
- Scenic viewpoints now select a relevant landmark, making orbit controls immediately available. There are nine viewpoints, including a new Golden elliptical galaxy in the group scene.
- Warm elliptical galaxies use a smooth generated emission map and a thicker stellar population. Spirals and ellipticals share a single texture atlas. Subpixel cloud brightness fades with projected area to reduce distant sparkle.
- The target diamond is centered independently of its label. Resuming travel clears old status notices.

The generated scenery is a 3D teaching model, not a measured catalog or a continuous reconstruction of the observable universe. Scale changes load separate scenes. Point sizes, colors, density, and exposure are illustrative. Free exploration moves the camera without assigning a spacecraft velocity.

The light chase uses special relativity in flat spacetime with stationary emitters. For an observer-to-source unit direction with forward component μ, the model uses γ = 1/√(1−β²), Doppler factor D = γ(1+βμ), and apparent forward component (μ+β)/(1+βμ). Look rotation follows aberration. No extra geometric length contraction is applied. Proper elapsed time accumulates as dt/γ for each travel segment.

RGB color and exposure are approximations; the numerical frequency ratio is exact within this model. Gravity, cosmological expansion, source motion, and realistic acceleration or propulsion are outside its scope. Pausing freezes simulation time while retaining the selected velocity's optical effects. No observer at light speed is offered.

Sources: [Real Time Relativity](https://arxiv.org/abs/physics/0701200), [Einstein Online: light clocks](https://www.einstein-online.info/en/spotlight/light-clocks-time-dilation/).

The sightline instrument uses the observer-frame relation D = 1/[γ(1−βμ′)], where μ′ is the cosine of the angle from forward in the traveler's view. This distinguishes a source that appears sideways aboard from one that is sideways in the stationary-star frame. Wavelength changes as λ′ = λ/D. Spectrum boundaries are conventional and approximate: [NASA electromagnetic spectrum overview](https://imagine.gsfc.nasa.gov/science/toolbox/emspectrum1.html), [NIST visible-radiation definition](https://www.nist.gov/glossary-term/46496).

## Verification

### Comparison sweep and commit pass

- Matching image frames support a sweep overlay that reveals the reference from the left and the second image from the right. Dragging the image captures the pointer and clamps the divider at the edges. The labeled slider supports touch, keyboard arrows, Home, and End, with a spoken percentage for each image.
- The overlay uses the two existing frozen PNGs and preserves the live camera and clocks. Both captures retain their setting readouts and restore/download controls. Different frame proportions disable the sweep and return to side by side; recapture at a consistent window size enables it again.
- The expanded comparison browser check passes direct mouse dragging, real Chromium touch input, keyboard bounds, frozen-image checks, journey invariants, desktop/phone layout, and scoped accessibility. The broader browser interaction suite passes with no page errors or scoped accessibility violations.
- The wider ten-file Universe run passed 111 of 112 checks and caught a nine-pixel chart scale label from an earlier pass. The chart label and phone status text were increased to ten pixels; all nine checks in the affected accessibility and content files passed on the follow-up. This verifies all 112 checks across the run and follow-up.
- Artifacts: `comparison-sweep-desktop.png`, `comparison-sweep-phone.png`, and the expanded `comparison-check.json`. This pass is prepared for a scoped commit containing the accumulated Universe flight runtime, mirrors, tests, repeatable browser checks, and this verification report.

### Visual comparison pass

- Capture reference view pauses travel and opens a two-view comparison workspace. After exploring or changing display settings, Capture second view freezes the second image. Recapturing replaces only the second image; replacing the reference clears the second. The workspace retains at most two PNGs and snapshots in session memory, without adding images to persisted learning data.
- Each image shows its scene, rendering mode, lens, exposure, camera direction, position, and relevant elapsed clocks. Same-scene comparisons report Euclidean camera separation. Separate scene models do not report coordinate separation. Different lenses and image aspect ratios receive explanatory captions; every image retains its original proportions.
- Each capture can be restored as a paused viewpoint or downloaded as its original PNG. Restore ends an active tour through the existing snapshot workflow. Clearing the comparison releases its stored references and returns keyboard focus to the canvas. Captures survive closing/reopening the explorer during the current session.
- All 49 focused tests pass. `universe_flight_comparison_check.cjs` verifies frozen reference pixels, image replacement, restoration of both snapshots, exact PNG exports, scene and lens differences, relativity settings, focus navigation, close/reopen retention, pause on capture, and 320px layout. Scoped automated accessibility checks found no violations in the comparison workspace.
- Artifacts: `comparison-check.json`, `comparison-desktop.png`, and `comparison-phone.png`. Source and desktop runtime copies match. Changes remain uncommitted.

### Direct camera framing pass

- The 3D view now has widen, reset-to-65°, and narrow controls that remain available in fullscreen. The overlay toggle hides these controls for a clean view. The target finder sits below them on narrow screens.
- Two-finger pinch changes focal magnification without moving or rotating the camera. Pointer capture tracks each finger, rebases when a finger leaves, and clears on canceled input, mode/scene changes, fullscreen transitions, and page hiding. One-finger dragging resumes after a pinch.
- Shift-scroll zooms while ordinary scrolling and browser modifier shortcuts remain available. With the canvas focused, +/− zoom and 0 restores 65°. All inputs share the existing 30–100° lens limits. Drag sensitivity scales with the lens and viewport height; arrow-key turns also become finer at narrower fields of view.
- Lens changes preserve position, elapsed clocks, and active orbits. The sidebar slider and saved-view settings remain synchronized. No renderer physics or scenery was changed.
- All 49 focused tests and the broader browser regression suite pass. `universe_flight_lens_check.cjs` exercises real mouse and multi-touch events, pinch cancellation and handoff, keyboard and wheel isolation, bounds, pause/clock invariants, orbit preservation, fullscreen, clean overlay, text input, and 320px layout. Scoped automated accessibility checks found no violations.
- Artifacts: `lens-check.json`, `lens-fullscreen.png`, and `lens-phone.png`. Both runtime mirrors match; changes remain uncommitted.

### Tour observation pass

- Each tour stop has an optional observation draft. Drafts remain separate by scene and landmark for the current session, including when a tour ends or the scene changes. They are not persisted until saved. Focusing the observation field pauses travel; saving requires a visited stop and nonempty text.
- Saving stores the current camera snapshot, the learner's text, and the landmark and prompt in the existing field notes. A count shows saved observations for the current landmark. Review field notes opens and focuses the notebook. The existing twelve-view limit applies; a full notebook retains the draft until a slot is available.
- Saved views now support editing their title and note, with explicit Save changes and Cancel editing actions. Text edits preserve the original snapshot, timestamp, and tour context. Downloaded field notes include the tour landmark and observation prompt. All note text renders as text.
- All 49 focused tests pass. The new `universe_flight_observation_check.cjs` verifies drafts across stops/scenes, arrival gating, pause while writing, movement keys in text, save/edit/cancel, snapshot preservation, exports, close/reopen restoration, capacity recovery, and 320px layout. The broader browser suite passes. Scoped automated accessibility checks found no violations in the tour and notebook, including an open editor.
- Artifacts: `observation-check.json`, `observation-tour-desktop.png`, `observation-tour-phone.png`, and `observation-editor-phone.png`. Source and desktop copies match. Changes remain uncommitted.

### Landmark tour pass

- Each free-exploration scene now has a tour of its catalog landmarks: three stops in the stellar neighborhood, three in the spiral galaxy, and four in the galaxy group. Observation prompts suggest comparisons using the existing orbit, framing, and saved-view tools.
- Starting or advancing a tour prepares a destination and a pace near 45 playback seconds, within the scene limits. The camera stays put until the user starts the leg. Each arrival pauses; a subsequent leg never starts automatically.
- The itinerary distinguishes visited, skipped, current, and upcoming stops. Continue requires a completed approach; skipping is explicit. Finishing keeps the last destination available for further inspection. Progress is temporary and is cleared by closing, changing scene or mode, resetting, restoring a view, or selecting a different destination.
- All 49 existing focused tests pass. `universe_flight_tour_check.cjs` completes a three-stop trip, verifies pause/resume and arrival holds, checks skip counts and all three scene itineraries, and exercises cancel/handoff/reset boundaries and mobile accessibility. The broader browser interaction and scoped accessibility suite passes.
- Artifacts: `tour-check.json`, `landmark-tour-desktop.png`, `landmark-tour-complete.png`, and `landmark-tour-phone.png`. Changes remain uncommitted.

### Precision camera pass

- Free exploration has discrete forward/back, left/right, and up/down steps along the camera's own axes. Fine, Survey, and Large sizes adapt to each scene. Steps end guided motion and pause immediately; they add camera path length without advancing either physical clock.
- Up to twelve recent steps can be undone. Undo restores position, path length, and the chart trace while retaining the current look direction. New journeys, orbits, approaches, scene/mode changes, resets, and restored views clear this transient history.
- With the canvas focused, W/S step forward/back, A/D slide, R/F move up/down, and Z undoes a step. Repeated keydown is ignored. Text fields and relativity mode do not respond to these movement shortcuts.
- All 49 focused tests pass. The dedicated precision browser check covers six axes, step sizes, undo, held keys, field input, scene scaling, orbit handoff, fullscreen, relativity restrictions, mobile layout, and the expanded panel's accessibility. The existing interaction and accessibility suite also passes.
- Artifacts: `precision-check.json`, `precision-camera-desktop.png`, and `precision-camera-phone.png`. Changes remain uncommitted.

### Approach planning pass

- Guided trips support Detail, Balanced, and Wide stopping distances at one, two, or four times a landmark's original survey radius. The chosen distance is fixed for an active route. If already inside that distance, the camera stays in place.
- The planner estimates playback time by integrating the same speed cap and gradual slowdown used by navigation. It is approximate because movement advances in discrete frames. Match pace chooses the available slider setting closest to a 45-second trip, within the scene's speed limits, and leaves travel paused.
- Active routes expose distance remaining, bounded progress, a fullscreen-compatible overlay, and a paused/underway state. Arrival pauses automatically; cancel, orbit, scene changes, and restored views clear the route as appropriate.
- All 45 focused tests pass. `universe_flight_approach_check.cjs` verifies radius selection, stationary planning, pace matching, progress, pause, fullscreen, clean view, cancellation, arrival, already-reached trips, and 320px layout. The existing interaction/accessibility and visual browser suites also pass.
- New artifacts: `approach-check.json`, `approach-planner-desktop.png`, `approach-planner-phone.png`, and `approach-progress-fullscreen.png`. Changes remain local and uncommitted.

### Navigation chart pass

- A collapsible chart shows the camera, numbered landmarks, selected-target line, and up to 128 recent movement samples. Top (X/Z) and side (X/Y) projections use equal scales on both axes and auto-fit their contents.
- Selecting a chart landmark pauses travel; switching chart projections changes only the chart. Restoring a view, resetting, and changing scene or mode start a new path trace. The trace is transient and is not part of saved field notes.
- The gaze indicator is transformed back into stationary coordinates in relativity mode; the unshifted comparison uses the unshifted direction. A dot replaces the arrow when its direction is perpendicular to the chart plane.
- Off-screen selected destinations expose a Find target button that centers the view. Clean view now also hides selected landmark labels and this finder.
- 42 focused tests pass. Browser checks cover chart selection, projection switching, target finding, pause invariants, optical comparison, nine viewpoints, camera orbits, and mobile layout. The broader interaction and scoped accessibility checks pass. Changes remain uncommitted.

- Latest pass: 39 focused tests passed, including four new orbit cases covering radius, target centering, path length, clock invariants, pause/resume, reverse, manual handoff, transitions, and the model boundary.
- The visual browser check now covers all nine viewpoints and orbit controls, including fullscreen pause. The broader interaction suite also passed with no page errors or scoped axe violations.

- This enhancement pass: 35 focused physics, navigation, and content tests passed. The browser interaction suite passed with no page errors or scoped axe violations after a fullscreen control overlap was corrected.
- `node dev-tools/universe_flight_visual_check.cjs` checks each scenic viewpoint for paused state and WebGL errors, verifies PNG dimensions and content, exercises the overlay toggle, and checks the 320px layout. It saves individual scene images and `visual-check.json` for review.

- All 87 focused checks pass across the full-suite run and the final follow-up: 22 numerical relativity tests, seven navigation/bookmark tests, and 58 existing Universe checks. Three source/public consistency assertions caught the final UI edit before its copy was synced; all ten tests in those three files passed on the follow-up after sync.
- `node dev-tools/universe_flight_browser.cjs` builds a local preview and exercises actual WebGL, all three regions, play/pause, stationary inspection, keyboard input, the comparison mode, mobile widths, closing/reopening, and graphics failure/retry. Results are in `browser-checks.json`.
- The browser audit found no WCAG A/AA violations in the new flight section at the tested desktop state. This is a scoped automated check, not a full accessibility certification.
- Source and desktop public copies are identical. No new runtime dependencies are required; the renderer loads on demand beside the Universe Tool script.

## Files

- `stem_lab/stem_tool_universe.js`: React controls, lazy loading, keyboard/touch input, scientific explanation.
- `stem_lab/universe_flight_scene.js`: WebGL rendering, generated scenes, relativity math and movement.
- `tests/universe_flight_physics.test.js`: numerical and pause invariants.
- `tests/universe_flight_navigation.test.js`: catalog isolation, safe arrival, aiming, cancellation, and saved-view validation.
- `dev-tools/universe_flight_browser.cjs`: repeatable visual and interaction checks.
- `dev-tools/universe_flight_preview.cjs`: a local preview server restricted to the preview and its two runtime modules. Run `node dev-tools/universe_flight_preview.cjs` after generating the fixture; it listens on `127.0.0.1:3187`.

The same two runtime files are mirrored under `desktop/web-app/public/stem_lab/`. Changes are local; no deployment was performed.
