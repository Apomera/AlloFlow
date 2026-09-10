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
