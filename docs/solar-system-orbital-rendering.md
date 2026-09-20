# Solar System orbital rendering

The 3D orbital view uses the campaign's existing planet positions, axial tilts, and compressed distances. The September 2026 visual update adds sun-facing atmospheric limbs, radial ringlet textures, planetary shadows on rings, Earth land/ocean roughness separation and filamentary clouds, and sphere-based solar limb shading.

Atmospheric shells depend on the view and Sun directions. Mercury has no atmospheric shell. Shell thicknesses, opacity, exposure, cloud patterns, and ringlet contrast are illustrative; this is not a radiative-transfer model or a live observation. NASA's [Earth atmosphere image](https://science.nasa.gov/earth/earth-observatory/the-top-of-the-atmosphere-7373/) illustrates the blue atmospheric limb.

The ring shader traces toward the scene Sun in each ring mesh's local space and tests intersection with the planet's sphere before its inherited transforms. Edge softness is illustrative, and the Sun is treated as a point source. This produces the planet's shadow on its rings; it does not calculate the rings' shadows on the planet. Saturn uses one ring system with open major gaps, removing the old overlapping textured layer. NASA's [Cassini shadow image](https://science.nasa.gov/photojournal/short-shadow/) shows how the ring shadow changes with illumination geometry.

Sunlit, Crescent, and Above Orbit controls change the observing camera without advancing time. Above Orbit is a view above the system's reference plane, not an alignment with every planet's spin pole. Focus framing accounts for the viewport's narrower field of view and the outer rings. Reduced-motion mode applies camera transitions immediately.

Textures are created once during scene initialization. Ring detail uses mipmapped strips instead of extra geometry. No additional shadow-map passes are used. Teardown disposes material maps and shader-uniform textures once, including shared resources. Browser coverage exercises real shader compilation, world selection, camera presets, phone layout, paused orbital positions, and texture disposal.

## Drone geology pass

Rocky drone scenes now use world-space color variation, slope-sensitive surface treatments, and distinct ochre, regolith, volcanic-rock, and ice palettes. A subset of Mars's existing boulders has stronger illustrative bedding. Fine bump relief is kept small enough to avoid coarse, block-like highlights. The terrain's vertex heights, slope queries, collectible identities, and rover collision model are unchanged.

A single instanced mesh adds 720 shallow surface fragments (320 on the existing low-power hardware tier). Placement and color are seeded. Fragments follow the same terrain-height sampler, remain static, and do not become new obstacles or samples. They receive existing shadows but do not add tiny-object shadow passes. Added materials and instance geometry are explicitly released at teardown.

The camera toolbar labels these surfaces as illustrations. Appearance alone does not determine mineral composition or establish past water. [NASA/JPL's Mars rock imagery](https://www.jpl.nasa.gov/news/mars-rover-views-spectacular-layered-rock-formations/) shows layered formations with different depositional histories. [NASA's Pluto mountain image](https://science.nasa.gov/photojournal/the-icy-mountains-of-pluto/) describes water-ice bedrock and the different roles of nitrogen and methane ice. These are visual references, not reconstructions of measured landing sites.

## Drone vehicle pass

Surface rovers now have a narrower chassis and solar deck, visible wheel grousers, rim and hub details, segmented photovoltaic cells, radiator strips, insulated instrument boxes, and stereo camera optics. Treads and hubs attach to each existing moving wheel. Local axle rotation is applied before the wheel's sideways orientation, preventing the wheels from wobbling as they roll. Terrain contacts, wheel radius, suspension travel, and driving forces retain their existing values.

The underwater ROV has open propeller ducts with mounting arms, protective skids, housing bands, and camera optics. A satin hull finish and a higher underwater bloom threshold preserve the painted hull and instrument detail. Propellers rotate in response to vehicle movement and remain still with reduced motion enabled. This is an illustrative motion cue, not a calibrated thrust or fluid-flow model. The atmospheric capsule has a lower heat shield, equatorial fittings, instrument ports, and thermal panels; these are original illustrative vehicles, not engineering reconstructions of a specific mission.

Manufactured details are merged once by material and moving parent to limit draw calls. The animation loop changes transforms without rebuilding vertex buffers. All added geometry and materials are released on scene teardown. Browser checks cover rolling axle orientation, moving propellers, reduced motion, shield placement, Pilot visibility, mobile framing, and one-time resource disposal. Actual Follow-view screenshots and separate neutral-lit model close-ups support visual review.

## Underwater scenery pass

The ocean floor now uses smooth vertex normals, matte sand with tileable ripple detail, and a separate linear bump map. The reflectance texture uses sRGB encoding. Both maps are generated once. The flat additive caustic plane was removed: it intersected the uneven terrain and exposed large, jagged triangular boundaries.

An allocation-free triangle interpolation follows the existing seabed vertices, including the mesh's -25 vertical offset. This also works during initialization, when the previous raycast could see an unrotated world matrix. Coral bases, stones, kelp roots, and existing floor-anchored objects now use the rendered surface consistently. Terrain heights and the authored trench are unchanged.

Three shared coral geometries provide branching, fan-shaped, and mound silhouettes. Seeded clusters use 54 instances (30 on the low-power tier), plus 420 scattered stones (180 on low power), across four instanced meshes. Coral no longer carries decorative point lights. Kelp uses tapered, curved ribbons attached to the same rooted transform as its stalk; sway pivots around the base and is disabled by reduced motion. The scene's caption identifies the habitats, depths, and distances as a compressed illustration rather than a reconstruction of a real dive site.

The added and replaced scenery owns its geometry, materials, textures, and instance buffers explicitly. Teardown releases shared resources once. Real-WebGL coverage checks terrain contact against raycasts, finite vertices, unchanged buffers during movement, a descent toward the seabed, phone layout, reduced motion, and disposal.

## Sample survey gameplay

Rocky-world rovers and atmospheric probes can find up to three nearby authored sample markers within a 32-scene-unit radius. A terrain-following ribbon visualizes the rover survey; three orthogonal rings visualize the probe's survey volume. These are range indicators with illustrative animation timing, not a simulation of electromagnetic propagation or hidden-material detection. Reduced motion shows a stationary range outline and reveals contacts immediately. Surface geometry clips to the existing terrain bounds, and the same buffers are reused during a sweep.

The nearest contact is selected first. Next contact cycles available specimens; amber brackets identify the selected one, while cyan brackets mark other contacts. Guidance reports scene-model distance, direction relative to the camera heading, and relative height for atmospheric contacts. Collection uses the selected specimen when it is within the existing collection reach. Clearing the target restores nearest-specimen collection. Cancelling the collection preserves the specimen and its tracking target; completed collection uses the existing inventory and journal transaction.

Find samples performs the marker survey. G additionally retains the existing environment scan, predictions and evidence trail. Both share a five-second recharge based on elapsed time, so low frame rates do not extend the wait. Survey buffers and materials are explicitly released on teardown; no new sampling rewards or automatic vehicle movement are introduced.


### Orrery orbit rhythm

Selected worlds now have an orbit-plane diagram with twelve equal-time markers, two shaded T/12 sweeps (after perihelion and aphelion), and a live position marker. Both axes use the same distance scale; the Sun sits at the focus and eccentricity is preserved. Dense eccentric-anomaly samples keep the swept boundaries accurate even for Halley. Forward/back controls move one twelfth of the selected period from the live phase, pause the shared clock, and wrap within one cycle. The existing phase slider, comparison readings, and canvas use that same time.

The panel explains near-circular orbits, reports endpoint speeds, and links to NASA’s [Kepler laws explanation](https://science.nasa.gov/solar-system/orbits-and-keplers-laws/). It identifies enlarged markers and the undated orbit-plane model. No new animation loop or decorative motion is introduced; the retained marker uses the existing throttled instrument updates. Geometry checks compare swept areas for circular through highly eccentric orbits; desktop and 320px browser checks cover keyboard stepping, landmark synchronization, playback, selection changes, and layout.


## Transfer rendezvous experiment

The Transfers section now models a circular, coplanar Sun-centered rendezvous instead of placing a stationary destination at the arrival point. The craft follows a half-ellipse using Kepler’s equation and both planets move with circular angular rates. Transfer duration and angular rates use the same gravitational parameter, so the planned departure phase brings the destination to the arrival endpoint. Inward routes rotate the ellipse and start at aphelion; outward routes start at perihelion. The same-planet case has no transfer duration or maneuvers.

Students can play a twelve-second illustration, pause, scrub, or jump to departure, midflight, and arrival. A launch-alignment offset changes the destination’s starting angle while retaining the transfer path, exposing the resulting separation at arrival. A dashed connector shows a miss; a static arrival ring marks positional rendezvous. Labels distinguish positional meeting from the velocity change still required to match the destination orbit. Reduced motion uses explicit slider/stage controls. The map uses the existing responsive CanvasPanel animation loop; no extra animation timer or GPU resource is introduced. Suspended-frame gaps do not advance playback, and changing the planet pair resets the local experiment.

The previous arrival-burn prose mixed heliocentric circularization with planetary capture. For this calculator’s Sun-centered circular-orbit model, both impulses increase speed on an outward transfer and both decrease speed on an inward transfer. Signed impulse values now retain that distinction while the budget reports magnitudes. The explanation explicitly excludes surface launch, planetary escape/capture, inclination changes, and corrections. See [Hohmann transfer derivation](https://orbital-mechanics.space/orbital-maneuvers/hohmann-transfer.html) and [NASA’s trajectory guide](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/). No dated ephemerides or actual launch windows are calculated.

Regression coverage checks all directed planet pairs, endpoint coincidence, correct impulse signs, a known Earth–Mars case, phase-offset separation, inward/outward geometry, same-planet handling, frame-rate independence, live playback, keyboard scrubbing, mobile layout, reduced motion, route resets, and existing transfer table semantics.


## Orbital motion and gravity

The Full Orrery has an optional Motion + gravity control. Enabling it focuses the selected world (or selects Earth and pauses if no world is selected). Solid cyan shows the velocity tangent; dashed purple points toward the Sun. The gravity arrow has an illustrative length, stops before the Sun marker, and is omitted when the current zoom leaves insufficient room. The visual key and accessible guide identify both meanings. Readouts describe outward motion with decreasing speed, inward motion with increasing speed, apsides, and nearly circular orbits.

Velocity direction now comes from the analytic eccentric-anomaly derivative rather than a chord to a future position. This preserves the tangent near perihelion for highly eccentric objects, where the old finite step visibly cut across the orbit. The velocity magnitude agrees with vis-viva; tests verify ellipse tangency and conserved angular momentum from circular through Halley-like eccentricities. The overlay uses the existing draw loop and readout throttle, adds no timers or geometry resources, and remains compatible with reduced motion. See [NASA’s circular-motion explanation](https://imagine.gsfc.nasa.gov/features/yba/CygX1_mass/gravity/circular_motion.html).


## Connected Earth-to-Mars expedition

The optional expedition connects the existing transfer planner and Mars rover in four stages: predict, compare two arrivals, investigate the surface, and explain with evidence. Learners predict the effect of a +30-degree launch offset, then record the actual simulated arrival at both 0 and +30 degrees. Recording is unavailable during playback or before arrival. The first recorded trial preserves the original prediction. A mistaken prediction receives revision guidance and does not block progress. Both separation bars use the same 1 AU ruler.

After a surface prediction, Deploy Mars rover opens the existing Mars scene. The interface explicitly describes this as a lesson transition: entry and landing are not modeled. Progress requires an environment scan and a completed sample collection on Mars after the expedition starts; old entries, other worlds, and sample surveys alone do not count. The scene and sample data remain illustrations, not measurements of a real landing site.

The final reflection asks learners to connect transfer and surface evidence and identify a model limitation. A 20-character minimum only prevents empty submissions; the explanation is not automatically graded. Saving appends one combined report containing both transfer trials, the original predictions, scan and sample observations, and the reflection. Functional state updates preserve that report when the long-lived rover scene subsequently appends another observation. Duplicate saves are ignored. Mission state, predictions, and evidence persist in the existing tool data; Hide mission retains progress, and Resume restores it. Navigation places keyboard focus on the planner, rover, or saved report.

Coverage checks fresh evidence requirements, immutable and idempotent recording, invalid transfer rejection, desktop collection through the real rover interaction, later scan preservation, saved-state restoration, and a 320-pixel reduced-motion layout.


## Drone specimen review and collection feedback

Completed collections now open a review bench below the vehicle controls. A sealed specimen illustration distinguishes surface geology, atmospheric, and marine teaching samples; a manual turn control changes the illustration without moving the drone. The display explicitly identifies its artwork and preset facts as teaching representations, not microscope images or newly measured composition. The first 1.2 seconds reveal the specimen and settle the latest canister on the vehicle; reduced motion shows the final state immediately. Drawing uses the existing drone loop, stops after the reveal, and adds no animation timers or WebGL contexts.

Three canisters on the vehicle represent the latest collected specimens. Their colors come from existing sample metadata. This visual rack does not impose a new storage limit or grant extra rewards. Its geometry and materials are shared where appropriate and explicitly removed and disposed at teardown.

The bench offers the six most recent samples from the current world, including saved entries from earlier visits. Numbered recent-collection labels distinguish separate specimens with the same authored name. Learners can write an observation and a next question, then save both with the original sample entry. Both fields must contain text; their correctness is not automatically graded. Functional updates preserve later scans, mission reports, and unrelated entries. Repeated saves with unchanged text are idempotent. The field journal, its HTML export, and the main journal display the learner review alongside the existing evidence. Unsaved drafts remain available while switching samples within the scene.

Review specimen opens and focuses the bench without interrupting collection. Continue exploring collapses its detail and returns keyboard focus to the vehicle; on rover and atmospheric surveys it selects the next available surveyed contact. Cancelled collection never adds a bench specimen or a canister. Only completed collection uses the existing evidence and reward transaction.

## Unified mission dashboard

The Solar System entry view now gathers six existing journeys into one collapsible dashboard: Earth–Mars, opposite seasons, orbital challenges, five science investigations, Earth/Jupiter comparison, and specimen collection/review. A selected journey shows checkpoints, its next action, and the latest three relevant evidence records. The selection and expanded state persist in solarMissionFocus and solarMissionDashboardOpen.

Progress is derived from existing activity data. Selecting or launching a journey does not award checkpoints or rewrite predictions and evidence. Science labs distinguish linked observations from student explanations; specimen completion requires an actual drone sample with both review fields. The Earth/Jupiter view checkpoints retain their existing meaning. Written explanations are not automatically graded.

Resume actions collapse the dashboard, open the appropriate activity, and move keyboard focus to the next control. Seasonal resume preserves its current phase and draft; fieldwork opens a saved specimen on its recorded world. The dashboard adds no animation loop or WebGL resources. Both distributed tool copies remain synchronized.

Validation: dedicated state tests and real-browser coverage exercise fresh and restored progress, keyboard selection, Mars and Orrery navigation, seasonal drafts, linked journal evidence, specimen resume, and a 320-pixel layout.

## Synchronized transfer alignment comparison

The transfer experiment can now overlay an aligned destination (hollow R marker) and the test destination (filled B marker) on one clock and spacecraft route. Both positions use the existing transferRendezvous model. A launch-phase arc identifies the changed variable at departure; the live reading reports both spacecraft-to-destination gaps, and students are prompted to compare at arrival rather than interpret an ordinary midflight gap as failure. Negative offsets and inward transfers use the same model. Markers represent separate experiments, not two real planets.

Comparison shares the existing canvas and playback loop, including pause, stage buttons, keyboard scrubbing, offscreen suspension, and reduced-motion behavior. Selecting a same-world route disables comparison. No additional renderer or animation loop is created.

After recording both Earth–Mars trials, Compare recorded flights opens the planner at departure with the 0°/+30° overlay paused. This reconstructs the ideal experiments while preserving their original trial records, prediction, surface draft, and journal entries. Repeated replay requests reset only the playback.

Verification covers the invariant spacecraft path and elapsed time under changed destination phase, positive and negative offsets, desktop and 320-pixel comparison views, playback and pause, reduced motion, saved trial restoration, and the existing transfer experiment regression suite.

## Transfer comparison explanation activity

An optional Build an evidence-based explanation panel now follows the live alignment comparison. Students pause at an arrival with a nonzero offset and capture both gaps. Two bars share an explicitly labeled AU ruler, and the capture identifies the route, offset, and common travel time. Moving the live controls does not change captured evidence.

The activity checks which variable changed, then invites an explanation and follow-up question. Drafts persist separately for each directed route. Written explanations are not automatically graded; minimum lengths only prevent empty submissions. A changed capture keeps the writing and prompts students to recheck its numbers.

Saving appends an experiment entry to the existing journal using a functional update. Revising the same capture updates its record without duplicating it, while saving another capture creates a separate record. Other observations and mission state are preserved. A removed journal entry can be saved again even when a previous save marker remains. Read saved explanation opens the journal and moves keyboard focus to its filter.

The activity adds no animation loop or renderer. Focused tests cover evidence validation, idempotent saves, revision and capture history, restoration, concurrent journal additions, keyboard focus, reduced motion, and the 320-pixel layout.

## Saved transfer experiment shelf

The transfer planner now presents a collapsible shelf of saved comparison experiments for the current directed route. The latest six captures share one explicitly labeled AU scale; the total count includes older records, which remain in the journal. Each native selection button includes its offset, recorded arrival gap, aligned gap, and travel time. The selected result shows its saved explanation and next question.

Replay selected experiment reconstructs that offset at departure, pauses playback, enables the alignment overlay, and focuses the canvas. Try opposite offset prepares the corresponding negative angle for a new prediction. Neither action overwrites the current capture, writing draft, journal record, or mission data. Route changes isolate each route's history. No extra canvas or animation loop is added.

History is derived from valid saved experiment entries, ignoring unrelated, malformed, and duplicate records without changing the journal. Tests cover selection by keyboard, route isolation, negative offsets, replay focus, restoration, history limits, draft preservation, desktop and 320-pixel layouts, and existing explanation saving.

## Pinned comparison of two saved experiments

Students can pin a shelf result as reference A, then select another capture as B. A stays fixed while B changes. The comparison shows both arrival gaps on one labeled AU ruler, the signed change from A to B, and whether recorded flight times and aligned gaps agree. Reference selection is local to the current planner view and adds no saved progress.

Prompts distinguish repeated offsets, opposite offsets, other starting-angle changes, and records whose control conditions differ. Numerical comparisons use a 0.000001 tolerance so values that merely round to the same displayed number are not called equal. Sub-0.001 AU differences are identified as such. This comparison does not grade prose or modify captures, drafts, journal entries, or missions.

The panel supports native keyboard selection, a clear-reference action, dark and light themes, and a 320-pixel layout without adding a canvas or animation loop. Unit and real-browser tests cover signed differences, opposite angles, control-condition mismatches, self/cross-route rejection, pinned selection, and evidence preservation.

## Completed Mars expedition debrief

A completed Earth–Mars mission now replaces its input forms with a visual saved-report debrief. The Earth-to-Mars header leads into four evidence sections: transfer arrivals on a shared AU ruler, the saved environment scan, the saved specimen, and the student's explanation. Original predictions remain available in a disclosure, alongside the report's follow-up question.

The view matches the journal report by mission start time and reads its saved expedition snapshot. Later scans and changes to live mission fields do not rewrite the debrief. Missing report or evidence fields are described explicitly rather than filled from unrelated observations. Completion moves keyboard focus to the debrief heading.

Students can compare recorded flights, return to Mars fieldwork, choose another dashboard journey, or open the original journal report. The route ornaments are decorative and the evidence bars carry the quantitative values. No renderer or animation loop is added. Verification covers completion and repeat saves, snapshot integrity, restoration, keyboard focus, navigation, missing reports, and desktop/320-pixel layouts.

## Follow-up investigation planning

Completed Mars reports now include an optional next-transfer planner. Students choose -30°, +60°, or -60° relative to their original +30° experiment, state a prediction, and see the changed variable, controlled conditions, and arrival-gap measurement before launching. Drafts persist in marsMission.followUp; switching angle preserves the writing and prompts students to check it. A 20-character minimum prevents an empty prediction without grading its content.

Launch opens the Earth–Mars transfer at departure, paused with the comparison overlay enabled and the exact chosen offset. A launch snapshot records the prediction and angle; editing either makes the setup ready for a new launch. The current +30° replay shortcuts explicitly restore their original experiment, so follow-up settings cannot silently change recorded-flight replay.

The original expedition snapshot and journal entries remain unchanged. Students capture and explain new arrivals in the existing transfer explanation activity and can compare saved results on the shelf. The planner adds no rendering loop or canvas. Tests cover selectable offsets, completion/prediction gating, restoration, original replay isolation, evidence preservation, keyboard focus, and desktop/320-pixel layout.

## Follow-up prediction-to-result review

Transfer captures now snapshot the prediction and timestamp of the matching completed-Mars follow-up launch. Linking requires the Earth–Mars route, chosen offset, mission identity, and a capture made after launch. Editing the planning draft does not rewrite the launched prediction. Hiding the mission card does not break the link.

The saved comparison carries the frozen prediction into the evidence journal. The mission's follow-up outcome panel shows that prediction beside the saved gap, original +30° gap, explanation, and next question. Until a matching comparison is saved, it explicitly reports that no result is linked. A relaunch requires a new capture even if the physical result is numerically identical; earlier journal records remain intact.

Review follow-up outcome reopens a hidden mission, reveals the planning disclosure, and moves keyboard focus to the outcome heading. Existing transfer explanation revision and journal behavior remain available. The panel adds no canvas or animation loop. Unit and browser coverage exercise identity mismatch rejection, draft edits, hidden mission recovery, repeat launches, restoration, shared chart scales, and desktop/320-pixel layout.

## Reviewing earlier follow-up investigations

The Mars follow-up outcome panel now includes a native history selector when earlier saved launches exist. Each entry preserves its launch prediction, latest saved comparison, explanation, and next question. Captures are grouped by launch timestamp and ordered by launch time, so repeated saves do not look like new investigations. Only validated captures linked to the current completed mission are included.

The current investigation remains the default, including its pending-evidence state. Selecting history updates only marsFollowUpReviewId; it does not alter the plan, launch, or journal. The selection survives restoration. Return to current investigation clears it and focuses the heading; launching a new experiment or reviewing its freshly saved outcome also returns to current. Missing or removed selected records fall back to the current investigation.

No canvas or animation loop was added. Unit and browser checks cover launch grouping, ordering, invalid links, repeated angles, historical review, restored selection, keyboard focus, new-launch isolation, deletion fallback, and desktop/320-pixel layouts.

## Dashboard follow-up shortcuts

The completed Mars journey now has a compact Keep investigating card on the mission dashboard. Its state is derived from the saved expedition report, current prediction, exact launch, and linked result: finish or continue a prediction, reopen an experiment awaiting evidence, or review a saved outcome. A separate shortcut opens the latest saved investigation when valid launch metadata is present. Counts include validated saved launches without changing the six original journey checkpoints.

Reopening a test restores its original offset at departure without creating another launch or replacing its prediction. Planning and review shortcuts reveal the relevant disclosure and move keyboard focus to the target. Choosing history or resuming work does not rewrite journal records, completed reports, or drafts. Missing expedition reports do not display the shortcut.

Verification covers status derivation, older-result isolation, edited drafts, hidden mission restoration, exact launch preservation, history and outcome focus, unchanged journal data, and desktop/320-pixel layouts alongside the original dashboard restoration tests.

### In-flight follow-up guidance

Completed Mars expeditions now show a compact investigation guide beside the transfer canvas. It tracks inspect, capture, explain, and review, displays the frozen launch prediction in a disclosure, and restores the launched angle when live controls differ. Capturing arrival uses the existing evidence workflow and focuses the changed-variable field. Captured evidence remains available when the live comparison is hidden; saved results link back to the corresponding follow-up outcome. Original mission trial instructions are hidden after completion.

Guidance uses the existing flight state and animation loop; it does not add timers, award progress, relaunch an investigation, or automatically save explanations. Desktop and phone coverage checks the full evidence loop, keyboard focus, draft preservation, and compact layout.

### Saved arrival geometry

Follow-up outcomes include paired SVG arrival diagrams for the original +30-degree trial and the selected saved investigation. Both normalize the Mars orbit to the same radius and rotate the arrival point to the right. A diamond marks the spacecraft, a labeled circle marks Mars, and the colored chord shows the straight-line gap; accessible image labels include the recorded distance. Opposite angles mirror the destination, while a doubled angle illustrates why a chord does not exactly double. Recorded-gap comparisons use the same three-decimal precision as the labels.

Diagrams require valid saved Earth-to-Mars measurements and matching flight durations (within 0.1 day for rounded records). Missing or incompatible evidence retains the existing written outcome without adding a schematic. The diagrams are static, responsive, theme-aware, and independent of live flight controls; viewing them never changes journal records or plans.

### Interactive angle explorer

Saved follow-up outcomes offer a collapsible angle explorer with a keyboard-operable -60 to +60 degree slider, five presets, a mirror action, and reset to the reviewed capture. An orbit schematic and normalized gap-versus-angle curve update together; dotted rings mark the saved destination and its curve position. Preview distances use orbit radii and ratios to the +30-degree model gap. They follow the chord equation and are checked against the existing transfer rendezvous solver across all integer slider angles.

Exploration is stored only as display state scoped to the capture timestamp. It never changes predictions, launched experiments, journal entries, or captured evidence. The original recorded diagrams remain fixed; selecting another investigation initializes its preview from that saved angle. Static SVGs require no animation loop and work with reduced motion.

### Journey gap chart

The live alignment comparison now plots spacecraft-to-destination separation across the full transfer for both the aligned and test launches. Both traces share elapsed flight time and a single AU scale. Dashed green and solid amber lines, plus hollow and filled cursor markers, distinguish the experiments without relying on color alone. The chart includes a keyboard-operable progress scrubber synchronized with the existing flight controls.

The 97-point curves are cached per route and angle. Cursor positions and numerical readings use the instantaneous transfer solver and update through the existing throttled canvas loop; there is no additional animation loop. Scrubbing pauses playback, reduced-motion users retain manual controls, and identical-planet routes have no chart. The view does not save evidence or alter mission progress. Tests cover both transfer directions, signed offsets, shared clocks, playback synchronization, canvas retention, and desktop/phone layouts.

### Plotted approach landmarks

The journey chart marks the smallest sampled test gap with a triangle and offers inspection cards for that moment and arrival. Cards show the gap, elapsed day, and flight progress; selecting one pauses playback and moves the existing flight cursor. If the sampled minimum is already at arrival, the cards combine into one control. Prompts distinguish a small midflight separation from a successful arrival alignment.

The minimum is selected from the same 97 plotted samples and explicitly labeled as sampled; it is not an exact continuous closest-approach estimate. The shortcuts do not capture or save evidence, and the existing arrival-only capture guard remains in force. Coverage checks signed offsets and different routes, minimum-at-arrival behavior, keyboard focus, playback pausing, and preservation of journal and mission data.

### Linked orbit and chart inspection

The comparison chart provides an inspect-in-orbit action, and a compact panel below the canvas returns to the journey chart. Both actions pause playback, retain the current progress and launch angle, and move keyboard focus to the selected view. The canvas and chart retain their existing identities.

During comparison flights, dashed green and solid amber separation rulers now connect the craft to the aligned and test destinations throughout the journey. Canvas telemetry and an accessible text reading show both gaps at the same time, and inspecting a sampled minimum identifies it in the canvas stage caption. The ruler explanation distinguishes measured separation from spacecraft travel paths. Readings share the existing throttled animation update; view navigation never captures evidence or changes drafts, journal entries, or mission progress.

### Readable transfer markers

The transfer canvas labels the departure planet (A), destination (B), spacecraft (C), and aligned comparison destination (R) using compact outlined tags and connector lines. A deterministic placement pass scores nearby positions to avoid other labels and marker centers, while keeping text below telemetry and above the footer. The Sun is a placement obstacle. Only annotation positions move; simulated bodies and spacecraft remain at their model coordinates.

Labels remain distinct when the spacecraft, destination, and reference coincide at arrival. The text legend and canvas accessibility description explicitly identify C as the spacecraft, and comparison mode associates the canvas with its live gap reading. Tests cover clustered and coincident markers, viewport bounds, long labels, deterministic placement, canvas lifecycle, phone/desktop views, and preservation of saved evidence.

### Arrival inspection and matching motion

At the transfer endpoint, an arrival panel distinguishes a position match from a remaining destination gap. It reports the modeled separation and elapsed time. Matched arrivals additionally compare the spacecraft and destination speeds relative to the Sun on a shared zero-based scale, then identify the ideal speed-up or slowdown from the existing signed Hohmann arrival impulse. The Hohmann helper now exposes the two speeds it already computes.

Missed arrivals do not present an aligned arrival burn as a remedy at the wrong position. The panel explicitly distinguishes matching circular Sun-centered motion from capture into a planet-centered orbit, which this model does not simulate. It disappears when returning to departure or coasting, does not appear for identical-planet routes, and does not record evidence or complete missions. Tests cover both directions, all directed planet pairs, signed offsets, visibility, and desktop/phone layouts.

### Reversible arrival impulse preview

Matched arrivals include before/after controls for the ideal Sun-centered arrival impulse. The spacecraft speed bar changes to the destination speed, and a status reading shows the resulting speed difference. Both states use the original shared scale; a dotted marker retains the original craft speed, including when an inward transfer slows down. Stable bar elements animate over 260 ms when motion is allowed and switch immediately under reduced motion.

The preview is local illustration state. It does not alter the flight, evidence, mission progress, or explanation drafts. Leaving arrival, changing the alignment, replaying, or switching route resets it to the before state. Missed arrivals do not offer this preview. Browser coverage checks keyboard focus, pressed states, fixed scales, both burn directions, reset behavior, motion preferences, and data preservation.

### Synchronized orbital speed profile

The existing Orbit rhythm panel now pairs its equal-time diagram with a speed-versus-time curve. A hollow marker and dashed vertical cursor follow the shared orbit clock, timeline, landmark shortcuts, and twelfth-orbit steps. The curve uses 193 samples from the existing Keplerian velocity solver, includes the next perihelion at 100%, and keeps its speed axis at zero so nearly circular orbits remain visually nearly flat. Each selected world uses its own explicitly labeled upper limit; the horizontal axis measures elapsed time rather than angle or path distance.

The existing throttled canvas update moves the cursor and marker without rebuilding the curve or adding an animation loop. Reduced-motion users retain the paused manual controls. Accessible chart descriptions identify units, sampling, and the linked numerical reading. The chart adds no journal entries, snapshots, or mission progress. Physics checks cover circular and highly eccentric orbits, vis-viva agreement, symmetry, endpoints, zero-based scaling, and wrapped time; browser checks cover shared controls, retained DOM/canvas identity, data preservation, themes, and narrow layouts.

### Inspecting matching distances on an orbit

The speed profile now includes a native orbit-time slider and an Inspect matching distance action. Dotted rings on the orbit diagram and speed curve identify the paired point on the other leg. Reflecting elapsed orbital phase about half a period preserves distance and speed in the Keplerian model while reversing radial motion. The direction readout distinguishes moving away, moving toward, and distance turning points. The paired markers and action are suppressed when the two positions coincide; circular orbits do not claim a unique matching-distance point.

Both controls pause and update the existing shared clock without saving evidence. The 100% slider endpoint stays at the right edge of the speed chart while representing the same physical position as 0%. Playback updates the slider, paired markers, direction text, and action availability through the existing throttled loop. The native range supports keyboard, pointer, and touch input, and manual comparison remains available under reduced motion. Tests cover mirrored positions and velocities, negative and multiple-cycle time, endpoints, focus, playback synchronization, source evidence preservation, and desktop/phone layouts.

### Compact linked views and direction arrows

The Orbit rhythm panel places a short heading above linked orbit and speed diagrams, caps their display heights, and keeps inspection and step controls visible. Longer teaching notes, speed extrema, model limits, and the NASA link move into a native How to read these views disclosure. A brief always-visible legend explains the paired markers and arrow convention. Opening the disclosure changes no simulation or evidence state.

Both paired orbit positions have tangent arrows derived from the existing Keplerian velocity solver, including the screen-space vertical inversion. The shafts have fixed length and start outside the enlarged markers; they represent direction only, while the speed curve represents magnitude. The paired arrow disappears when its corresponding marker is suppressed at a turning point. The existing throttled update keeps arrows synchronized without a new timer or animation loop. Unit checks verify forward tangency, mirrored directions, fixed lengths, and endpoint behavior. Browser coverage checks keyboard disclosure operation, retained comparison controls, playback, narrow-layout bounds, and reduced motion.

### Previewing the next equal-time step

An optional Preview next step control shades the upcoming one-twelfth of the selected orbit and marks its endpoint with a hollow diamond. Forward 1/12 lands at that endpoint, including when the interval crosses perihelion. The ordinary pair of reference sectors is hidden while the moving wedge is visible, and returns when preview is switched off. The visible legend reports the interval in Earth days; fuller guidance remains in the existing disclosure.

The wedge solves the starting and ending eccentric anomalies and samples their connecting elliptical boundary at 129 points, keeping the Sun as the sector origin. Equal elapsed time therefore produces equal swept area, with shape and arc length changing around the orbit. Preview geometry updates in the existing throttled canvas loop and through manual controls. Toggling changes only the display preference, preserves the current time and evidence, and works with reduced motion. Tests check equal area across 120 phases for circular, planetary, and highly eccentric comet orbits, predicted endpoint agreement, wraparound, keyboard use, playback, planet changes, and narrow layouts.
