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

The pilot still uses simplified phase thresholds. Its coaching now identifies cloud parcels and explicitly explains that real droplets may remain liquid below 0°C. The four climate presets are described as comparisons of environments, not as experiments that isolate humidity or temperature.

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

The collapsed **Journey challenges** drawer offers four goals from the learner's current position:

- **Condensation detective:** observe vapor become a droplet or ice after reaching saturation and meeting a nucleus.
- **Runoff to stream:** land as runoff, then reach collected water.
- **Below the surface:** enter soil, then reach groundwater.
- **Return through a leaf:** enter the plant route, reach the leaf, then return as vapor.

Starting a challenge selects its preferred landing surface where applicable. It does not reset the parcel, supply collision credit, enable assistance, or change physics. The learner can choose assistance and learning pauses independently. Progress advances only through matching live transitions in the required order after the challenge begins. Completion means the model sequence was observed; it is not a mastery assessment.

The drawer shows step progress, a route-specific explanation, and immutable model observations. Condensation evidence includes humidity and nucleus capture; energy direction is computed from the actual transition. Learners can write a short explanation and download the challenge evidence as text. Replaying starts a fresh attempt while retaining the latest completed result for each of the four challenges.

Notebook saves now include the current attempt and up to four completed results, with bounded event sequences and reflections. Restoring keeps completed evidence and marks unfinished attempts interrupted; selecting a climate or resetting also interrupts an active attempt. Old notebooks without challenge fields remain readable. Challenge evidence has its own download action.

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
