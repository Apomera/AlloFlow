# Storm-to-stream investigation

The Water Cycle tool now opens with the simulation visible before the learning guide and achievements. Select **Start investigation** to launch a connected activity using the existing Storm Lab, system map, guided droplet journey, and Steward views.

## Learning flow

1. Predict whether vegetated cover changes runoff compared with urban cover.
2. Observe liquid rain in Storm Lab and record the storm.
3. Trace water through the system map or guided droplet journey and record an urban baseline.
4. Choose grass or forest cover from the investigation panel in Steward.
5. Observe the same conditions with only land cover changed. If other inputs change, restore the fair test before recording a comparison.
6. Explain the evidence and a model limitation.
7. Save the explanation and download the evidence as a text file.

Predictions are not graded for correctness. Completion records an explanation; it does not certify mastery. Recorded samples remain unchanged when learners explore other controls or views. The record lives in the existing Water Cycle tool state, and the downloadable file includes both sets of inputs, outputs, the storm settings, and the learner's explanation.

## Model boundaries

The storm model already reports a 0–100 relative intensity index. That index is passed directly to the land model's rainfall-intensity input. This is an illustrative connection between teaching models, not a measured rainfall rate or a calibrated hydrologic forecast.

Runoff tendency and infiltration opportunity are independent indices, not shares of a closed water budget. Infiltration is not automatically groundwater recharge. The land-cover experiment changes one model input; it is not an estimate of the outcome of a real planting project. It does not alter the separate ten-year campaign's scores.

The pilot still uses simplified phase thresholds. Its coaching now identifies cloud parcels and explicitly explains that real droplets may remain liquid below 0°C. The five climate presets are described as comparisons of environments, not as experiments that isolate humidity or temperature.

## Interface

- The learning guide, grade selector, and achievements are in an expandable drawer below the scene.
- Pilot instruments start compact on desktop and mobile; More HUD restores the detailed view.
- The investigation supports native radio controls, keyboard focus after step changes, text evidence, and a 2D route that does not require WebGL.
- New text has registered English fallbacks. Additional language translations are not included in this change.

## Verification

Run the full live workflow, evidence-export, mobile overflow, and accessibility/contrast checks:

```text
node dev-tools/watercycle_investigation_qa.cjs
```

Screenshots and an example evidence export are written to `scratch/water-implementation-review/`.

Run the shared-model and saved-evidence tests:

```text
node node_modules/vitest/vitest.mjs run tests/watercycle_investigation.test.js --maxWorkers=1
```

The existing water-cycle accessibility suite keeps its SSR surface assertions and structural rule set, but evaluates axe in Chromium to avoid jsdom style-traversal timeouts. Full application contrast coverage remains separate; the investigation QA checks the new panel's contrast in light and dark themes.

## Optional pilot navigation assistance

Be the Water now offers **Guide my movement**, an independently switchable gold waypoint, and a preferred landing surface (water, permeable ground, hard ground, or a plant pathway). Climate presets live in an expandable drawer. The investigation invitation is compact in this mode so the playable scene stays nearer the top on phones.

Assistance produces the same bounded movement inputs as the keyboard and touch controls. It steers toward sunlit water, live condensation nuclei, live cloud droplets, and an interior point on the selected landing surface. It compensates for the model's wind and uses normal vertical physics. Holding a movement key or dragging the view temporarily takes over; releasing resumes assistance. Pause freezes the simulation with assistance enabled.

The gold marker and its leader line are navigation aids, not physical water structures. Assistance does not grant energy, collision credit, phase changes, or completed stages. Landing preference is an aim, not a guarantee: wind, starting position, and time before reaching the ground still matter. Real cloud and watershed processes remain simplified by the underlying teaching model.

Run controller and existing physics/experience checks:

```text
npx vitest run tests/watercycle_pilot_navigation.test.js tests/watercycle_pilot_kernel.test.js tests/watercycle_pilot_experience.test.js --maxWorkers=1
node dev-tools/watercycle_pilot_navigation_qa.cjs
```

The browser check covers live manual takeover, resume and pause, preference persistence across React updates, climate selection disclosure, 320/390px layout, navigation-panel accessibility including contrast, real assisted condensation and droplet collection from a saved vapor checkpoint, and a live WebGL context. Screenshots go to `scratch/water-navigation-review/`.

A unified environment-art redesign and a fully coupled watershed campaign remain future work.


## Notice a change while playing

**Pause at changes** is optional and off by default. When enabled, a live change of water form or pathway pauses the physics and opens a card inside the scene. The card reuses the existing transition receipt: previous and new form, process, cause, model reading, and energy direction. The explanation uses the recorded change rather than later moving HUD values. A short prompt invites the learner to explain the cause using that evidence; it does not grade or certify understanding.

Keyboard focus moves to **Continue journey**. Continuing resumes play, returns focus to the canvas, and preserves the notebook evidence. An ordinary later pause does not reopen a reviewed change. Restoring a saved checkpoint is not treated as a new learned transition. The standard Resume control also closes the card and resumes play.

**Larger view** increases canvas height while preserving the current parcel and controls. **Smaller view** restores the compact layout. Camera controls fit one row on narrow phones. During descent, the pathway card distinguishes the surface currently underneath the parcel from the chosen goal; the current surface still determines the actual landing.

```text
node dev-tools/watercycle_pilot_learning_qa.cjs
```

This live-browser check covers evaporation-triggered pauses, frozen evidence and simulation time, focus handoff, continue, ordinary pause, saved-checkpoint behavior, larger/smaller scenes, separate landing goal/current surface, 320/390px layouts, and the learning card's accessibility including contrast. Screenshots are written to `scratch/water-learning-review/`.


## Replayable journey challenges

The collapsed **Journey challenges** drawer offers six goals from the learner's current position:

- **Condensation detective:** observe vapor become a droplet or ice after reaching saturation and meeting a nucleus.
- **Runoff to stream:** land as runoff, then reach collected water.
- **Below the surface:** enter soil, then reach groundwater.
- **Return through a leaf:** enter the plant route, reach the leaf, then return as vapor.
- **Snowmelt journey:** observe snowfall stored on permeable ground, melt it into soil water, then reach groundwater.
- **Solid to vapor:** observe snowfall stored on land, then sublimation directly into vapor.

Starting a challenge selects its preferred landing surface where applicable. It does not reset the parcel, supply collision credit, enable assistance, or change physics. The learner can choose assistance and learning pauses independently. Progress advances only through matching live transitions in the required order after the challenge begins. Completion means the model sequence was observed; it is not a mastery assessment.

The drawer shows step progress, a route-specific explanation, and immutable model observations. Condensation evidence includes humidity and nucleus capture; energy direction is computed from the actual transition. Learners can write a short explanation and download the challenge evidence as text. Replaying starts a fresh attempt while retaining the latest completed result for each of the six challenges.

Notebook saves now include the current attempt and up to six completed results, with bounded event sequences and reflections. Restoring keeps completed evidence and marks unfinished attempts interrupted; selecting a climate or resetting also interrupts an active attempt. Old notebooks without challenge fields remain readable. Challenge evidence has its own download action.

```text
npx vitest run tests/watercycle_pilot_missions.test.js tests/watercycle_pilot_notebook.test.js --maxWorkers=1
node dev-tools/watercycle_pilot_missions_qa.cjs
```

Kernel tests exercise all four sequences using the shipped physics, reject retroactive and out-of-order progress, verify interrupted attempts, and check notebook round trips and evidence bounds. The browser test covers real 3D condensation completion, reflection, export, replay, saved results, notebook restore, 320/390px layouts, and light/dark accessibility including contrast. Screenshots and a sample report go to `scratch/water-mission-review/`.


## In-scene landing map and orientation

**Landing-zone map** toggles an optional inset inside Be the Water. It plots the same water, permeable-ground, hard-ground, and plant classifications used by landing detection. The map is a schematic of landing behavior, not an elevation map or a geographic forecast. Its footprint is sampled within the playable world bounds and cached per climate; live parcel and destination markers are drawn over that cached background.

A white triangle shows the parcel and viewing direction. A gold ring and dashed line identify the current destination while waypoints are enabled. Patterns accompany zone colors, and a text legend names each category. Directional text indicates whether the target is ahead, behind, left, right, above, below, or nearby, relative to the current camera view. During surface pathways the cue says to follow the current route.

The map updates without feeding any controls into the physics. Pausing freezes the parcel, while looking around can still rotate its view-direction marker. Climate changes rebuild the background from the updated landing classifier. On phones, opening the map gives the scene additional height to keep flight controls accessible. Learning-pause cards temporarily hide the map. The navigation text provides the live screen-reader announcement; the map does not duplicate it.

```text
npx vitest run tests/watercycle_pilot_map.test.js tests/watercycle_pilot_navigation.test.js --maxWorkers=1
node dev-tools/watercycle_pilot_map_qa.cjs
```

Projection and direction tests cover world bounds, clamping, camera rotations, and vertical targets. The live-browser check covers map rendering, parcel motion, camera rotation while paused, waypoint visibility, climate repainting, 320/390px layouts, flight-control clearance, and light/dark accessibility including contrast. Screenshots go to `scratch/water-map-review/`.


## Compact pilot controls

The pilot keeps **Guide my movement**, its current status, and the next destination visible. **Flight options** folds the waypoint, landing map, learning-pause setting, landing preference, and explanatory help into an optional drawer. Folding the drawer preserves those choices. The status distinguishes a paused journey from active guidance, ready assistance, and manual flight.

Climate and journey challenges share a setup row; either expands to the full row when opened. All four Water Cycle modes fit on narrow phone screens. The map has a 44px close control inside its header, slightly larger text, and returns keyboard focus to the scene when closed. Closing it preserves the paused/running state.

```text
node dev-tools/watercycle_pilot_controls_qa.cjs
```

The browser check measures default scene placement at desktop and 320/390px widths, verifies visible mode buttons and keyboard-operated flight options, preserves selected settings when folded, checks expanded setup width, exercises live assistance status, and verifies map-close accessibility and focus return. Screenshots go to `scratch/water-controls-review/`. Existing navigation, learning-pause, and map QA scripts now open Flight options when testing its controls.

The camera now starts at its intended Follow or Water view position on first entry, reset, and checkpoint handoff. Subsequent movement keeps the existing smooth tracking. The controls browser check verifies the initial Follow distance and the near-parcel Water view.

## Compare saved pathways

Inside Journey challenges, the collapsed **Compare saved pathways** notebook lets learners pin two different completed challenges. Blue and teal observation cards show the recorded transitions, model readings, energy direction, and destinations. Selecting another result does not replace pinned evidence; **Pin selected results** is the explicit replacement action. Replaying a challenge and updating its latest result leaves the pinned copies unchanged.

Three optional writing prompts ask for a comparison, supporting observations from both journeys, and a model limitation. Each response is limited to 800 characters. Repinning preserves the writing and reminds learners to review it against the new evidence. Notebook save/restore includes the pinned records and writing; older notebooks remain readable. **Download pathway comparison** exports these same pinned observations and responses as text.

These are observations from separate model journeys, not a controlled experiment. The panel explains that starting conditions may differ and time is compressed, and flags records from different climates. It does not rank routes, infer causal effects, or grade the learner's response.

```text
npx vitest run tests/watercycle_pilot_route_comparison.test.js tests/watercycle_pilot_notebook.test.js tests/watercycle_pilot_missions.test.js --maxWorkers=1
node dev-tools/watercycle_pilot_route_comparison_qa.cjs
```

Unit checks cover valid ordered sequences, detached evidence, bounded writing, explicit replacement, and notebook compatibility. The browser check uses clearly labeled kernel-generated saved-result fixtures to exercise selection, export, persistence, mobile layout, and light/dark accessibility. Screenshots and the sample export go to `scratch/water-route-comparison-review/`.

## Contextual challenge hints

An active challenge adds a folded **Challenge hint** underneath the existing navigation controls. Its summary names the next unobserved step. Opening it explains what to do from the parcel's current form: gain energy, rise toward cloud base, meet a nucleus, grow cloud water, steer during descent, follow a land pathway, or finish transpiration. A challenge started after the needed transition explains that the learner must approach it again through the water cycle; no retroactive progress is granted.

During descent, a mismatched landing preference offers **Use challenge landing goal**. This only changes the navigation preference and returns focus to the scene. It preserves position, pause state, movement-assistance preference, and recorded observations. The actual ground below the parcel still determines the landing. Hints are read-only and disappear for completed, interrupted, or climate-mismatched attempts.

The hint uses a keyboard-accessible disclosure, a 44px landing-correction button, and text updates only when the advice changes. It stays folded by default and is absent when no challenge is active.

```text
npx vitest run tests/watercycle_pilot_hints.test.js tests/watercycle_pilot_missions.test.js tests/watercycle_pilot_navigation.test.js --maxWorkers=1 --pool=threads
node dev-tools/watercycle_pilot_hints_qa.cjs
```

Unit tests exercise advice across physical forms, recorded steps, climate boundaries, and immutable inputs. The browser test uses a paused checkpoint and a kernel-generated recorded landing fixture to check keyboard operation, landing correction, state preservation, focus return, next-step updates, 320/390px layouts, and light/dark accessibility. Screenshots go to `scratch/water-hint-review/`.

## Review recorded changes in the scene

**Review latest change in scene** reopens the latest transition explanation. The notebook's six visible recent entries also have **Review in scene** controls. Each opens a detached copy of the selected recorded change, including its original climate, sequence number, cause, model evidence, and energy direction. It does not change the current parcel, climate, challenge progress, or evidence trail.

Reviewing pauses the physics and releases held movement controls. **Close review · stay paused** returns keyboard focus to the originating control and leaves the journey paused. **Continue journey** explicitly resumes and focuses the canvas. Reset, climate change, and checkpoint restore clear the open review; ordinary pause does not reopen it. Open review state is temporary and is not saved as new notebook evidence.

The explanation has a separate scrollable reading area, with keyboard access, above the action controls. Recorded reviews temporarily enlarge the scene to give the extra context room on phones. Automatic Pause at changes continues to use its existing transition evidence and Continue action.

```text
npx vitest run tests/watercycle_pilot_recorded_review.test.js tests/watercycle_pilot_notebook.test.js tests/watercycle_pilot_missions.test.js --maxWorkers=1 --pool=threads
node dev-tools/watercycle_pilot_recorded_review_qa.cjs
node dev-tools/watercycle_pilot_learning_qa.cjs
```

Unit checks cover original-record selection, detached measurements, bounded history, malformed records, and restore cleanup. Browser checks use labeled historical fixtures to exercise review independently of flight, and the existing learning-pause check still requires live evaporation. They cover actual pause/resume, focus return, preserved history, reset cleanup, narrow layouts, unobscured reading areas, and accessibility. Review screenshots go to `scratch/water-recorded-review/`.

## Browse a sequence of recorded observations

The in-scene review now includes **Earlier** and **Later** controls with a position count. They follow the notebook's recorded order, including observations collected before a climate change or model-clock reset. The controls disable at the beginning and end of the retained history; they do not wrap around or invent intermediate steps.

Browsing selects a detached copy of the next recorded observation. It keeps the current parcel, pause state, challenge progress, latest receipt, and original return control unchanged. Keyboard focus moves to the new explanation heading. **Close review · stay paused** still returns to the control that opened the review, even after browsing other records.

```text
npx vitest run tests/watercycle_pilot_review_navigation.test.js tests/watercycle_pilot_recorded_review.test.js tests/watercycle_pilot_notebook.test.js --maxWorkers=1 --pool=threads
node dev-tools/watercycle_pilot_review_navigation_qa.cjs
```

The checks cover empty and single-record histories, boundaries, the 24-record limit, clocks restarting between climates, unchanged live state, focus handoff, and accessible controls on phones and in dark mode. Screenshots go to `scratch/water-review-navigation/`.


## Be the Water: Journey lab and stored snow

Open **Journey lab** above the starting-climate drawer to practise at six different entry points: surface water, rising vapor near cloud base, falling rain, falling snow, soil water, or plant water. **Start practice journey** loads a fresh paused checkpoint. Earlier stages, cycle completion, and challenge evidence are not awarded by a starting point. Start a challenge before resuming to observe its complete sequence. An active challenge is interrupted when starting another practice; saved results remain available.

The snow practice uses the new **Frozen highlands** climate, with a below-freezing air column so snow can reach land. The existing Mountain winter climate retains its warmer surface and airborne snowmelt behavior. Snow landing on land becomes **Stored snow**; snow landing in open water follows collection. A stationary crystalline reservoir, closer follow camera, solid molecular lens, and contextual progress card distinguish surface storage from falling snow and liquid infiltration.

In **Conditions above the snow**, adjust air temperature (-20 to 15 degrees Celsius) and humidity (0 to 100 percent). **Try a mild spell** and **Try cold, dry air** provide useful starting conditions. These are local conditions for stored snow; the flight environment retains its selected climate. Positive temperature drives melting; dryness, wind, and available energy favor sublimation. Sublimation can also occur in above-freezing air while snow remains. Warmth and humidity alter the actual solver rates, including while paused; pause freezes elapsed time and accumulated exposure.

Melting and sublimation accumulate separate bounded teaching indices. The first completed threshold releases the tagged parcel. Melting enters the pathway of the ground where it landed (soil, runoff, or plant); sublimation becomes invisible vapor directly. Both phase changes absorb energy. Snow storage, melting, and sublimation do not grant completed-cycle credit. Meltwater entering a land route updates the same pathway ledger as rainfall.

These indices compress processes and residence times; they are not water volumes, snowpack fractions, measured rates, or a resolved surface energy balance. Changing conditions retains previous exposure; restart the snow practice to compare fresh attempts. The model follows one representative parcel and does not split its mass. The [USGS sublimation overview](https://www.usgs.gov/special-topics/water-science-school/science/sublimation-and-water-cycle) supports the qualitative roles of sunlight, low humidity, and dry winds.

The new **Snowmelt journey** and **Solid to vapor** challenges use actual live transitions. Recorded changes, challenge readings, pathway comparisons, and downloads include the snow-surface temperature, humidity, and both exposure indices; these remain detached from later controls. The notebook preserves partial exposure, the original landing surface, the fifth climate, all six challenge results, and practice origin. Restoring resumes paused with the selected conditions. Reset, climate changes, and a fresh notebook clear pending practice handoffs so they cannot reappear after remounting the scene.

New interface text has English catalog entries; additional language translations were not authored. Validate with the pilot Vitest suites and **node dev-tools/watercycle_pilot_snow_lab_qa.cjs**. The latter exercises real WebGL transitions, pause, saved evidence, local notebook recovery, keyboard controls, and narrow-screen accessibility. Its screenshots and results are stored under **reports/watercycle-pilot-snow-lab/**.

## Be the Water: parcel and snow visibility

Liquid surface water uses closer follow framing, a more visible cyan body, a curved optical rim, and a smaller halo. Cloud droplets and rain share the rim treatment while retaining their distinct shapes. Two pooled contours beneath surface liquid follow the rendered ocean, lake, or stream; they hide near shorelines and in Water view. Amber condensation targets have dark centers so they can be distinguished from water droplets. These are teaching-scale visual cues; the phase rules and recorded evidence are unchanged.

Stored snow has five irregular mounds, surface-anchored crystals, and pooled ice granules, positioned on the rendered land surface. The follow camera uses the same ground height. Melt exposure increases the reflective wet sheen; it does not shrink the bank because the exposure index is not a mass fraction. The geometry stays fixed during pause and reduced motion.

Run **node dev-tools/watercycle_pilot_visual_polish_qa.cjs** for rendered phase checkpoints, pooled geometry and material checks, pause stability, camera controls, phone layouts, and scoped accessibility checks. Captures and source hashes are saved under **reports/watercycle-pilot-visual-polish/**. The fixture restores checkpoints generated by the real kernel and uses an isolated browser; it does not change the learner's open session.

## Be the Water: clouds, rain, and phase handoffs

Clouds use shaded procedural lobes with lit shoulders, blue-gray undersides, and a flatter base. Their three tiers remain distinct from the terrain. Water view adds three separated layers of translucent cloud detail without hiding the collectible droplets. A wider, lower portrait composition keeps the cloud below the goal card. Restored clouds start at their settled size; cloud growth and drift freeze during pause and reduced motion.

Rain combines fine threads with 84 pooled tapered ribbons. Varying width, blue bodies, bright heads, and soft edges distinguish nearer drops from distant rain. The wind and timing use the existing precipitation field. Both ribbon edges clip to the rendered ocean, lake, or stream; terrain uses depth testing. The field appears only for actual rain, and paused or reduced-motion geometry stays fixed.

Actual changes of form can retain a brief translucent memory of the outgoing form: evaporation, condensation, direct vapor-to-ice deposition, cloud assembly, freezing, rain release, and ice-to-snow growth. The new form and its readings take effect immediately. The fading shapes illustrate the same parcel; they add no mass, collisions, or observations. Automatic learning pauses keep a composed handoff visible, reduced motion shows a static intermediate illustration, and reset or checkpoint restore clears the cue. The existing branched-snow melting illustration remains separate.

Validate with **node dev-tools/watercycle_pilot_atmosphere_visuals_qa.cjs**. Its pre-transition checkpoints come from production kernel integration; fixture-only collision inputs then trigger real scene transitions. Checks cover rendered buffers, phase visibility, pause and reduced motion, handoff expiry and cleanup, portrait framing, and scoped accessibility. Results and screenshots are saved under **reports/watercycle-pilot-atmosphere-visuals/**.

## Be the Water: billows, varied rain, and local phase fronts

Cloud textures now contain nested billows, shaded seams, and irregular shoulders, with more separation between the three spatial tiers. Six shared procedural textures provide variation without increasing sprite counts. Water view leaves a clearer corridor through the near, middle, and distant cloud layers. Its restrained breathing uses the existing pause and reduced-motion clock.

Rain uses a fixed distribution of slimmer drop sizes, trail lengths, fall speeds, and brightness. Surface ripples appear where those rendered streaks cross the ocean, lake, or stream; ring edges follow the receiving water and clip at shorelines. They are visual contact cues, not additional modeled water. The enlarged primary drop has a rounded crown and flatter underside, consistent with the qualitative [USGS explanation of raindrop shapes](https://www.usgs.gov/water-science-school/science/are-raindrops-shaped-teardrops). The profile and visual speed distribution are illustrative, not calibrated drop measurements. Softer rainbow arcs keep the rain visible while preserving the existing optics conditions and challenge evidence. On phones, the actual receiving surface appears in a compact strip above the controls so the parcel stays visible; the full outcome and landing-goal description remain available to screen readers.

Evaporation now removes the exposed portion of the outgoing liquid shape. Freezing reveals a localized front and branching frost on the new ice; deposition uses the same growing crystal detail. Twelve pooled condensed-water beads gather into the parcel after an actual condensation event. These are brief illustrations of the tagged parcel's state change, not a resolved phase-boundary model or extra droplet/mass credit. Shader progress, bead matrices, frost geometry, and rain contacts remain fixed while paused; reset and restore clear transition details.

Run **node dev-tools/watercycle_pilot_realism_qa.cjs** for actual WebGL captures and focused checks of cloud detail, varied rain, receiving-water contacts, new phase fronts, pooled resources, paused intermediate views, and phone layouts. Reports are stored under **reports/watercycle-pilot-realism/**. The frozen pre-pass source and its hash make comparisons reproducible.

## Be the Water: motion and phase continuity

The learner's cloud now keeps its shaded shelf level while upper billows rise and shear gently with wind. Stored base transforms prevent drift or accumulated scale; the baked sunlight no longer rotates with the entire cloud. The enlarged rain parcel has a restrained oblate oscillation. Its horizontal width factor and reciprocal vertical factor preserve the illustrated volume, including while a melt or precipitation handoff changes its overall display scale. This is a qualitative shape cue, not a calibrated oscillation model; see [NASA's laboratory and field observations of raindrop oscillations](https://ntrs.nasa.gov/citations/20000102601).

Freezing and deposition reveal the incoming ice from the same normalized nucleation field that removes outgoing liquid during freezing. The ice edges and frost share the reveal rather than appearing as a complete outline early. A pooled incoming-ice preview carries the same material, edges and progress into Water view. Its teaching lens tilts all visible phase surfaces together toward the learner, so the plate remains readable and its paired fields stay aligned. Follow view uses a tilted airborne crystal with cooler edges. Six quiet radial veins distinguish the solid surface after the brief handoff. Energy arrows remain visible while energy sparks fade out of the parcel's projected center, leaving the phase boundary clear. These enlarged surfaces illustrate the tagged parcel's change; they do not resolve physical crystal growth or add modeled water.

The liquid wake now samples the actual receiving ocean, lake or stream after that frame's water update. Whole ribbon triangles disappear when their corners or center leave water, and retained vertices follow the receiving height. Paused scenes reuse their sampled buffers. Scenario reset and checkpoint restore clear stale wakes and return deterministic cloud and rain shapes. Additional motion freezes during pause, hidden-page time, and reduced motion.

Run **node dev-tools/watercycle_pilot_fluidity_qa.cjs** for isolated rendered checks of the paired ice reveal, first-person preview, cloud and drop motion, receiving-water wake, pause/reduced motion, reset, and phone framing. Evidence is saved under **reports/watercycle-pilot-fluidity/**.

## Be the Water: cloud formation, rain release, and splash detail

Cloud assembly now reuses twelve pooled liquid beads while the cloud's lower shelf, body, and upper billows emerge in order. The cloud remains a collection of liquid droplets; the transition adds no water, collisions, or evidence. When the tagged parcel begins falling as rain, its outgoing cloud memory preserves the actual cloud scale and all 26 wind-shifted lobes. Follow view leaves that source at its captured world position instead of shrinking it and carrying it down with the rain. Its automatic camera eases from cloud framing toward the closer drop view during the handoff, preserving cloud context; explicit user zoom remains in control. Water view uses bounded teaching previews for the forming cloud, source cloud, and tagged raindrop, sharing the existing maps, geometry, materials, and transition progress. Interrupted handoffs capture the cloud's current appearance before cleanup restores settled opacity. This illustrates the existing kernel's [collision and coalescence pathway](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm); it does not turn a whole cloud into one drop.

Stronger illustrated rain contacts now briefly raise small, uneven splash crowns and a few rebound droplets alongside their ripples. The existing LineSegments pool contains 29 segments per streak: fourteen ripple segments, twelve crown legs, and three rebound ticks. No extra draw call or material is needed. Every new strand requires receiving water at both endpoints and its midpoint, uses the solved impact age and water height, and disappears over land. Selective crowns last 0.20 seconds and rebound ticks 0.30 seconds; the original ripple lasts 0.48 seconds. Their sizes and thresholds are qualitative rendering choices, not a calibrated splash or aerosol model. Drop impacts can produce crowns and secondary droplets under suitable conditions; see the [APS crown-splash experiment](https://meetings-archive.aps.org/dfd/2008/ag/3/).

Inside the cloud, a broad cooler lower-light and diffuse upper-light gradient adds separation between the existing near, middle, and far billows. A slightly longer sightline preserves visible targets through the haze. Fog settles immediately at a learning pause and in reduced motion, so the paused view does not keep drifting. The lighting remains illustrative; [NOAA explains how thicker cloud reduces transmitted sunlight](https://www.noaa.gov/jetstream/clouds/color-of-clouds).

Run **node dev-tools/watercycle_pilot_cloud_rain_qa.cjs** for isolated real-kernel WebGL checks of these cloud/rain handoffs, their Water previews, selective water splashes, exact paused buffers, reduced motion, cleanup, and phone framing. Results are stored under **reports/watercycle-pilot-cloud-rain/**.

## Be the Water: light and surface continuity

The learner's cloud now shades the actual rendered water and terrain along the scenario's sunlight direction. A shared receiver shader follows displaced ocean waves, elevated inland water, stream bends, beaches, and the mountain surface without a floating shadow plane or another draw pass. Its broad, irregular footprint softens with height. Projection travel is bounded at low sun angles; the footprint is a qualitative lighting cue rather than a radiative-transfer calculation. The captured source cloud retains a fading shadow while the tagged raindrop separates, and cloud assembly builds its shadow with the billows.

Rain threads and ribbons build smoothly during the actual precipitation-release handoff. After rain collects in water, only the already-created surface rings remain briefly at their captured world anchor, with their heights following the receiving waves; airborne rain and splash crowns stop. This short fade reuses the existing contact pool and complements the parcel's arrival rings. Pause freezes the contact age and sampled heights, reduced motion holds a static sampled stage, and reset or checkpoint restore clears it.

Evaporation captures the outgoing liquid's displayed position, orientation, and scale before presentation changes. Follow view leaves that retreating surface memory at the real ocean or leaf source as the vapor marker rises. Water view retains its bounded teaching lens. The cue preserves the current surface pulse or rain oscillation, and adds no visible vapor droplets or modeled water. Both camera views settle immediately at a learning pause, matching the stationary fog and phase cues; live flight retains smooth camera motion.

Run **node dev-tools/watercycle_pilot_continuity_qa.cjs** for isolated real-kernel WebGL checks of these transitions, receiving-surface shadow shaders, paused and reduced-motion stages, cleanup, and phone framing. Evidence is saved under **reports/watercycle-pilot-continuity/**.

## Be the Water: cloud light, rain depth, and solid-water release

Cloud billows now retain six shared normal maps derived from the same smoothly merged relief as their density textures. Their lighting follows the scenario's world-space Sun as the learner changes viewpoint. Neutral diffuse color replaces the old fixed upper-left highlight; restrained directional shading and a soft rim preserve broad, cloudy light rather than a polished solid surface. Ambient clouds, the learner's cloud, interior layers, and captured cloud memories share this treatment. The normal maps are built once, add no sprites or draw calls, and are disposed with the existing shared textures. This is an illustrative lighting approximation, not a volumetric scattering solver. [NOAA describes how incident sunlight, cloud thickness, and skylight affect cloud appearance](https://www.noaa.gov/jetstream/clouds/color-of-clouds).

Rain threads and ribbons now fade gently near the eye and soften with viewing depth, retaining their middle-distance detail. The shader changes brightness without changing trajectories, collision evidence, contact counts, or the existing release envelope. Water-contact rings, crowns, and rebound details retain their own contrast.

Snow collecting in open water now retains its outgoing crystal briefly while a retreating melt edge and attached beads lead into liquid water. Gentle receiving-water rings distinguish this arrival from rain's spray. Stored snow also retains a pooled memory after its actual release: melting uses a wet retreat and attached beads as the tagged parcel enters its selected soil, runoff, plant, or water pathway. Sublimation uses a dry solid retreat without melt beads or a vapor plume, matching the direct solid-to-gas change described by [USGS](https://www.usgs.gov/glossary/glossary-water-cycle-terms).

The bank remains fixed throughout accumulated exposure because those indices are not removed-water fractions. Only a genuine phase-change event starts the brief source memory. Follow view anchors that memory to the captured bank; Water view tilts the bounded teaching lens toward the learner and draws it in the foreground so nearby water and terrain cannot cut its surface in half. Returning to Follow or clearing the cue restores normal depth handling, including the incoming parcel's shared material. Newly sublimated vapor starts above the raised rendered ground using an altitude-based display offset; low saved vapor with a snow origin reconstructs its ground clearance on restore. Pause freezes these cues, reduced motion holds a representative stage, and restart or restore clears transient memories. The original phase rules, elapsed-time integration, notebook evidence, and pathway credit remain unchanged.

Run **node dev-tools/watercycle_pilot_phase_atmosphere_qa.cjs** for isolated rendered checks of cloud lighting, rain depth, genuine snow-water collection and stored-snow release, paused stages, cleanup, and phone framing. Reports are stored under **reports/watercycle-pilot-phase-atmosphere/**.

## Be the Water: cloud shelter, rain highlights, and reverse phase changes

Cloud crowns, middle billows, and the anchored base now have restrained differences in shelter from sunlight. Leeward lobes receive a little less fill light using their position relative to the scenario's Sun; orbiting the camera does not move that shelter. The captured source cloud retains its tiered shading during precipitation release. This reuses the existing sprites, density textures, and normal maps; it does not infer cloud thickness from the tagged parcel's mass or move the condensation level.

The existing rain ribbons now have translucent blue-gray bodies and narrow highlights, with a modest increase in contrast. Fine distant threads, the view-depth fade, wind, receiving-water contacts, and precipitation-release timing retain their existing roles. The new shading adds no drops or splash systems.

Water view now includes the actual incoming droplet shape during condensation. A droplet returning to vapor retains its captured liquid surface briefly, while melting airborne ice uses a retreating solid front paired with the incoming liquid. Rapid freezing-to-melting and melting-to-evaporation changes retain the previously visible partial boundary instead of replacing it with a complete shape. A cold cloud releasing snow retains its source billows and shadow as the tagged crystal separates, using the same source-memory and camera handoff as rain release. The previews share the actual parcel geometry and materials. Their foreground presentation in Water view restores the original depth settings when returning to Follow, expiring, resetting, or restoring a checkpoint.

These brief cues depict genuine kernel transitions with enlarged teaching shapes. They add no mass, collision evidence, pathway credit, or visible vapor plume. Pause freezes their progress, and reduced motion uses a representative static phase boundary. Run **node dev-tools/watercycle_pilot_rain_cloud_depth_qa.cjs** for real-kernel rendered checks; evidence is stored under **reports/watercycle-pilot-rain-cloud-depth/**.

## Be the Water: recessed cloud billows and clear liquid surfaces

Cloud textures now separate their raw overlapping relief surfaces before calculating broad, recessed joins. Neutral shading at these joins and variation from the actual relief height make the shoulders more distinct under the existing world-space sunlight. The upper silhouettes have a tighter soft fringe, while the flat condensation shelf retains its existing cutoff. Six shared density and normal-map pairs still serve all cloud groups and source memories; the detail does not add sprites, texture variants, or draw passes.

The liquid parcel, cloud droplet, and rain parcel now retain the renderer's transmission with a clearer center and a readable curved rim. Their existing shared environment texture has a cooler, narrower reflection band and a restrained highlight. The same optical treatment extends to the outgoing liquid memory with gentler coverage so its fading phase boundary remains readable. Coverage always multiplies the current alpha, preserving condensation, melting, freezing, evaporation, and carried partial boundaries. In the bundled renderer this is an illustrative transparency and reflection treatment, not a resolved refraction of the surrounding scene.

Run **node dev-tools/watercycle_pilot_relief_optics_qa.cjs** for close native cloud views, liquid and rain appearance, genuine phase-change captures, exact material and uniform checks, pause, reduced motion, cleanup, and phone layout checks. Reports are stored under **reports/watercycle-pilot-relief-optics/**.

## Be the Water: water depth and shared rain advection

Persistent water surfaces, foam, glints, and stream detail now share an early drawing group. Their existing transparency, wave geometry, depth tests, and local cutaway shaders remain active. This lets actual receiving-water depth resolve the atmosphere above it: the ocean's large mesh center can no longer make distant water paint over a nearby transparent cloud. The drawing group also precedes the captured source-cloud group, preserving the billows while the tagged rain parcel leaves them. Nested stream groups retain the same ordering. Learning markers, parcel contacts, and foreground phase lenses keep their own presentation.

The illustrated rain field now shares one sideways wind drift across its existing size distribution. Slower fine drops lean farther than faster large drops. A reference fall speed of 55 preserves the shower's typical previous drift; these are qualitative display speeds, not calibrated terminal velocities. Threads, tapered ribbons, receiving-water clipping, and impact locations all use the same per-drop slope. Existing seed wrapping, fall-speed profiles, pooled resources, contact ages, pause behavior, and kernel collision evidence remain intact.

Run **node dev-tools/watercycle_pilot_spatial_weather_qa.cjs** for genuine-kernel native checks. A labeled diagnostic briefly restores only the old water-group drawing order at the identical paused cloud and camera, then restores production ordering. Final captures and actual draw logs distinguish that diagnostic from the enhanced scene. The harness also checks shared rain drift, size-dependent slopes, water contacts, paused camera look, reduced motion, and cloud-to-rain source continuity. Reports are stored under **reports/watercycle-pilot-spatial-weather/**.

## Be the Water: growing cloud density and independent billows

Cloud assembly now builds optical depth inside each existing billow texture. Dense cores appear before their thin fringes as the shelf, body, and crowns form in sequence. A finite core depth keeps the first visible step gradual, and full formation restores the exact original texture coverage. The treatment uses the existing texture sample, relief maps, world-space sunlight, and pooled sprites. It is an illustration of changing cloud coverage, not a volumetric scattering solver.

Upper billows now rise and stretch with independent timing. Their initial poses and maximum motion remain bounded by the previous animation, while the condensation shelf stays at its anchored height. Pause, hidden-page handling, and reduced motion keep these decorative motions still. If precipitation interrupts cloud assembly, the captured source retains each lobe's actual partial density along with its position, scale, shading, and existing memory fade. Reset, checkpoint restore, and cue expiry clear those temporary density values.

Run **node dev-tools/watercycle_pilot_cloud_evolution_qa.cjs** for genuine-kernel assembly and precipitation checks, native shader inspection, paused and reduced-motion checks, and phase-lens comparisons. Reports are stored under **reports/watercycle-pilot-cloud-evolution/**. This pass changes only presentation; phase thresholds, water mass, collision evidence, and notebook receipts retain their original rules.
