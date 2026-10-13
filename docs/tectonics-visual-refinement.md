# Tectonics visual refinement

The main draggable cross-section now uses rock strata, mineral texture, shaded mountain faces, softer plate outlines, and a clearer geological palette. The selected plate receives a steady rim and a high-contrast name chip.

On narrow screens, all seven plates keep numbered markers with a wrapping identification key below the scene. Boundary captions become compact, the initial drag hint yields to the active boundary, and the depth ruler, scale-break note, and convection annotations have separate reading space. Sea level and the solid inner core have stronger text contrast.

Canvas resizing scales existing horizontal positions and particle locations without restarting the experiment. Plate thicknesses, the 0-400 km depth mapping, boundary classification, event scoring, and simulation controls retain their existing model.

## Validation

- 211 checks passed across the eight tectonics regression test files.
- The real Chromium browser harness passed desktop/phone resize checks, normalized plate-position and width preservation, unchanged event counters on resize, all seven bounded phone labels, selected-key state, keyboard movement after resizing, and label visibility.
- Captured light/dark desktop and phone scenes, selected plates, a divergent boundary, and a continental collision under reduced-motion preferences. Reviewed phone label spacing visually.
- Source, web public copy, and the existing ignored local build artifact were synchronized. JavaScript syntax and scoped whitespace checks passed.

Run the browser review from the repository root:

```sh
node dev-tools/tectonics_scene_visual_qa.cjs
```

Images and the browser result are written to `scratch/tectonics-visual-review/`. The harness uses local React, Three.js, Playwright Chromium, and the existing cached stylesheet; it does not need a hosted page.

## Broader learning and navigation refinements — September 29, 2026

The Hub now presents the starting path and categories without mounting an activity underneath them. Opening an activity synchronizes its category and moves focus after the activity mounts. Topic tabs support arrow keys, Home, and End. Search matches activity names and learning goals, handles whitespace, announces result counts, and restores focus when cleared.

Additional models can be opened or closed separately for each activity. Simulation and Earthquake Lab start with their models open; reference activities start with them closed. The quiz opens its models after completion unless the learner has chosen otherwise. The second starting step mounts Simulation, opens its models, and focuses the boundary simulator.

### Learning records and evidence

- Explanation drafts survive navigation. Submitted explanations remain separate from later edits.
- Completed quizzes retain their actual question count and grade band. An attempt keeps its question bank when the profile grade changes; retry adopts the current grade while preserving the latest completed result and the best completed score. Restored results keep their correct denominator.
- Boundary Stress completion requires trials with all three boundary types and an explanation. The most recent trial for each type is retained even when older rows leave the eight-row visible log.
- Force evidence records observed sinking, collision, breakoff, and ridge outcomes. Choosing a scenario alone does not count as observing it. Stepping and playback report the same events.
- Epicenter mystery descriptions expose the measured S–P times without revealing the hidden solution. Keyboard users can select and move each station and place a guess. Feedback explains how to compare the revealed solution and begin another case.
- The Hawaiian hotspot activity includes a geographic schematic, a north arrow, and sampled volcanic ages before asking the learner to infer plate direction. The diagram declares its simplified shapes and spacing.
- Timeline eras and the education panel award exploration credit once. Saved receipts do not replay notices on reopening.

### Reading and visual clarity

The glossary uses 24-term pages with accessible counts, page controls, and search across terms and definitions. All 171 distinct terms remain available. Dark surfaces and larger definitions improve phone reading.

Earthquake damage cards keep inactive text readable and identify the current magnitude. Seismogram metadata and P, S, and surface-wave captions occupy separate rows; nearby earthquakes retain distinct captions on phones. The trace reserves space for these captions. Hotspot reference cards now use readable text and surfaces in both themes.

The boundary comparison and magnitude/intensity diagrams now paint their static frame even when initially below the viewport under reduced motion. They stay still, repaint on resize or theme changes, and disconnect their observers when closed. Opening Simulation from the phone Hub also produces a painted scene.

### Science corrections

Earthquake case studies no longer imply that recurrence averages predict a date or that Cascadia is on an overdue clock. Cascadia probability statements identify their source and time window. Coastal tsunami guidance now explains natural warnings and moving safely to high ground or inland.

Sources: [USGS earthquake prediction guidance](https://www.usgs.gov/faqs/can-you-predict-earthquakes), [USGS Pacific Northwest earthquake probabilities, 2025](https://pubs.usgs.gov/fs/2025/3050/fs20253050.pdf), [National Weather Service tsunami response guidance](https://www.weather.gov/safety/tsunami-during), and [USGS Hawaiian island map](https://www.usgs.gov/media/images/hawaiian-island-map).

### Final verification for this pass

- All 404 focused checks passed across ten tectonics suites. The full run passed 398 checks; six deployment-parity checks were rerun successfully after resolving a Windows mapped-file lock and synchronizing the public asset. The assessment suite includes 12 state and learning-record regressions.
- All 23 full-tool Chromium checks passed: 13 interaction checks, four seismogram label checks, and six native canvas lifecycle checks. Nine final screenshots were refreshed, with no browser errors or horizontal overflow.
- All 11 idle and gesture checks passed again on the final source. Hub and simulation idle, automatic drift, repeated stationary input, and restored achievements stayed silent; deliberate gestures retained their one-time rewards.
- The final browser reports, main source, public asset, and local build use SHA-256 `faeba36e9cdcfb5cc69eae86102634026d767b2cb3103b459885d8cd51bc6106`. Syntax, JSON parsing, and the source whitespace delta passed.

The earlier broad visual matrix covered 18 light/dark desktop/phone captures. The final focused captures and controls cover the later seismogram, hotspot, quiz, and canvas lifecycle changes. Results are in `scratch/tectonics-general-review/after/` and `scratch/tectonics-idle-review/`. Unit reports are `final-tests.json` and `parity-tests.json` in `scratch/tectonics-general-review/`.

Run the full-tool browser checks from the repository root:

```powershell
node dev-tools/tectonics_general_visual_qa.cjs --after --controls-only
node dev-tools/tectonics_general_visual_qa.cjs --after --affected
node dev-tools/tectonics_general_visual_qa.cjs --after --shelf
node dev-tools/tectonics_idle_reward_qa.cjs
```

## Further investigation and 3D refinement

The plate block now offers Oblique, Cut face, and From above camera presets. Captions explain what each view reveals for the selected boundary. Ridge and transform-fault labels remain visible when the depth ruler is hidden; the top view omits depth measurements that cannot be read meaningfully from that angle. Only the visible 2D or 3D canvas participates in keyboard and screen-reader navigation.

Students can explicitly record earthquake-depth samples from the boundary simulator. The comparison table retains a sample for each boundary across resets and navigation, reports the actual event count and depth range, and identifies the values as simulated observations. A recorded deep convergent sample and shallow divergent sample unlock an evidence card in Explain It. The card inserts the learner's recorded numbers into the draft, and submitted snapshots retain those records. Capturing or clearing samples awards no XP.

Boundary Stress now presents Predict, Observe, and Explain in order. Sliders have exact numeric entry and larger controls. The latest two trials identify which inputs changed and which stayed fixed; feedback avoids attributing an outcome to one input when several changed. The trial table uses translated boundary names and readable theme colors.

The optional hotspot calculation scaffold lets a learner choose one volcano, calculate distance divided by age, and convert km per million years to cm per year. Working is revealed after Check. A correct calculation can seed the uncommitted line, while feedback on a poor overall fit explains whether to raise or lower its slope. Draft inputs survive navigation and retry. Contextual activity links connect observations, explanations, and the quiz while preserving drafts and moving focus to the destination.

The subduction scene description now locates magma production in the mantle above the water-releasing slab. References: [USGS earthquake-depth classes](https://www.usgs.gov/programs/earthquake-hazards/determining-depth-earthquake), [USGS on deep earthquakes within subducting slabs](https://www.usgs.gov/faqs/what-depth-do-earthquakes-occur-what-significance-depth), [USGS volcano teaching material on water-assisted melting](https://pubs.usgs.gov/gip/19/downloads/Appendixes/I_Volcanism%20in%20a%20Plate%20Tectonics%20Perspective.pdf), and [NOAA Hawaiian volcano data](https://oceanexplorer.noaa.gov/wp-content/uploads/2025/04/hawaiian-map-data-table.pdf).

### Verification

- All 423 focused checks passed across eleven suites: the combined run passed 420, and three updated source-contract checks passed in a targeted rerun. The template audit now parses JavaScript and checks repeated placeholders, global replacements, and conditional template choices.
- Actual WebGL passed 21 camera, caption, label, and accessibility checks, with 18 canvas captures and two control captures. Two local E2E checks also passed.
- The full-tool learning workflow passed 20 browser checks with 16 captures across desktop/phone and light/dark themes. No browser errors, horizontal overflow, or scoped accessibility violations were found. The run generated actual 592 km convergent and 24 km divergent observations, recorded them explicitly, inserted them into a draft, and verified that recording did not award XP.
- All eleven idle and gesture checks passed again. Four stress layouts passed keyboard, overflow, control bounds, and accessibility checks.
- The final learning-workflow run and source/public/local-build copies use SHA-256 `c227891f8097e7fb04071a3f89035c3d71e7edcacff7bfc3b4b4b772ac91c3d1`. WebGL, stress, and idle reports use the preceding `dd031bce9071149bbbeb92d1fe869f1d9aa1f76a58802d63f059712d62603ab3`; the only later source change darkened the hotspot commit button for contrast. Syntax, JSON, and the source whitespace delta passed.

Reports and screenshots are in `scratch/tectonics-learning-review/`, `scratch/tectonics-orientation-review/after/`, `scratch/tectonics-stress-review/`, and `scratch/tectonics-idle-review/`. Unit reports for this pass are `continued-tests.json`, `continued-contracts.json`, and `continued-parity.json` in `scratch/tectonics-general-review/`.

```powershell
node dev-tools/tectonics_learning_flow_qa.cjs
node dev-tools/tectonics_3d_orientation_qa.cjs
node dev-tools/tectonics_stress_visual_qa.cjs
node dev-tools/tectonics_idle_reward_qa.cjs
```

## Continued investigation refinement

The continent puzzle now retains unfinished moves, evidence layers, and fine-step settings across navigation. Its accepted fit remains separate from the current exploration, so returning to today's map preserves completed evidence and the estimated historical rate. The map supports arrow keys, bracket rotation, Shift for smaller steps, Home to reset, and Tab to leave. Evidence overlays allow pointer dragging through them.

The map key and fit meter identify distances as model kilometres. Feedback explains the remaining gap in the simplified modern coastlines and distinguishes geometric fit from fossil and rock agreement. Students are prompted to compare one evidence layer at a time, then ask whether the same reconstruction explains several observations. Reference: [USGS continental-drift evidence activity](https://www.usgs.gov/educational-resources/wegeners-puzzling-continental-drift-evidence).

Saved earthquake-depth samples now include proportional bars and readable counts for shallow, intermediate, and deep events. Zero counts remain visible. Guidance explains that small samples can miss a depth band and that these simulated proportions are not real earthquake probabilities. The table has explicit theme colors, including its caption, so native table styling cannot make dark-mode text unreadable.

The boundary simulator shows elapsed model time and the corresponding rise, rift width, or fault offset beside both the 2D and 3D scenes. These ticking readouts stay outside live announcements. Selecting the current boundary preserves the run and quake log. Quake plots draw a dipping guide only for convergent boundaries; other boundaries use neutral distance axes and show their observations without a fictitious slab. Axis captions wrap below the plot, and tick labels remain readable on phones.

The epicenter activity now connects the P/S arrival gap, calculated distance, and circle radius in a worked example. An optional distance check helps students correct each radius before revealing the location; it does not record an attempt or reveal the hidden epicenter. Feedback identifies the 50 km target as an activity tolerance. Model notes explain the constant wave speeds, shallow-earthquake assumption, schematic station positions, and why real locations use travel-time models. Reference: [USGS seismographs and earthquake location](https://www.usgs.gov/programs/earthquake-hazards/seismographs-keeping-track-earthquakes).

The epicenter canvas redraws on input, theme, or resize and remains still between those events, including under reduced motion. Its backing resolution follows display size and device pixel ratio, with a cap, while logical map coordinates and pointer geometry stay fixed. Fullscreen controls sit clear of the readings, and the map panel fits its content beside the mystery form.

### Verification of this follow-up

- All 437 distinct focused checks have passing results across thirteen suites. The combined run passed 429. A final targeted run passed eleven checks: six synchronized-copy checks, two updated keyboard-metadata/responsive-canvas contracts, and three epicenter behavior checks after the final rendering changes.
- The continent puzzle passed twelve browser checks and eight scoped accessibility audits across light/dark desktop/phone layouts. The simulator passed fifteen browser checks, including actual WebGL readouts, saved depth-band proportions, and preservation of observations when the active boundary is selected.
- All eleven idle and gesture scenarios passed again: idle rendering, automatic drift, repeated stationary input, and restored progress stayed silent and earned nothing.
- Four epicenter layouts passed real-canvas, reduced-motion, pointer, fullscreen, PNG export, accessibility, and overflow checks. The final phone fullscreen capture confirms that the 100 km bar remains clear below its label. Screenshots for each affected activity were inspected.
- The final source, public asset, and local build share SHA-256 `9a9c77995083dfceeacc9be7d7ad40aefabc00868189dc5845814e08a1a9bb93`. Both English registries contain the 52 new teaching keys with matching text. Syntax, JSON parsing, and the new whitespace delta passed.

The fit, simulator, and idle browser reports precede the final epicenter-only rendering adjustments; the epicenter report covers the final source. Every report records its source hash. Reports and captures are in `scratch/tectonics-fit-review/`, `scratch/tectonics-model-readout-review/after/`, `scratch/tectonics-epicenter-review/`, and `scratch/tectonics-idle-review/`. The combined unit report, final rerun, and consolidated verification are `investigation-tests.json`, `investigation-final-checks.json`, and `investigation-verification.json` in `scratch/tectonics-general-review/`.

```powershell
node dev-tools/tectonics_fit_workflow_qa.cjs
node dev-tools/tectonics_model_readout_qa.cjs
node dev-tools/tectonics_epicenter_visual_qa.cjs
node dev-tools/tectonics_idle_reward_qa.cjs
```

## Capturing evidence and clearer volcano anatomy

The slab-angle activity now captures the plotted earthquake sample when the student chooses Check. It pauses the simulator and keeps the checked points and fitted line fixed if the student resumes the run. Revise my angle returns to the latest observations without resetting the experiment. The angle has matching slider and numeric controls, and keyboard focus follows Check and Revise. Numeric entry preserves each keystroke and validates the finished value on Enter, blur, or Check. The estimate remains dashed and the data fit stays solid in both themes. Guidance explains that angle is measured from horizontal and that the axes use different scales.

The earthquake band is described as tracing the sinking slab, with deep earthquakes occurring within it. The chart retains its 800 km distance axis, which contains the generated model events. Reference: [USGS earthquake depths and subducting slabs](https://www.usgs.gov/faqs/what-depth-do-earthquakes-occur-what-significance-depth).

Force experiments now show the initial plate speed, ask for a prediction, and guide the student through the observation. An unfinished watch must be completed or cancelled before another starts. The model pauses after a completed observation and retains before-and-after cards for slab cutting and continental collision. These cards distinguish the immediate effect of cutting the slab from the later collision outcome. Repeated trials retain the latest completed record of the other experiment, and resetting cancels unfinished observations while keeping completed records.

Explain It foregrounds the recorded depth comparison and asks students to assess how supplementary observations connect to the question. Evidence insertion cannot add the same sentence repeatedly. Word counts show draft length; the review questions ask students to check the science. Saved explanations remain visible separately from revisions, and an unchanged submission cannot be saved again. Magnitude evidence describes event size and directs students to depth observations for the earthquake-depth question. Reference: [USGS earthquake magnitude, energy, and shaking intensity](https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity).

Volcano labels now attach to visible intersections between the anatomy meshes and the slice plane. Labels disappear when the slice removes the named structure or leaves it buried behind opaque rock. Leaders retain their anatomical anchors while the text separates on narrow screens and rotated views. The stage descriptions now follow the selected magma composition, including basalt fountains and flows and the ash and caldera behavior of more silica-rich eruptions.

### Verification of this refinement

- All 466 distinct focused checks have passing results across seventeen suites. The combined run passed 463; a final affected-suite run passed 132 after the slab test fixture adopted a shared clock for model initialization and manual frames. This prevents a slow test mount from producing a negative frame duration. The new checks cover captured samples, revision focus, real digit entry, exact angle bounds, force prediction and observation, protected explanation snapshots, anatomy intersections, and composition-specific stage descriptions.
- Forty-two browser scenarios and layouts passed: twelve force checks, four explanation layouts, eleven volcano cases, four slab-angle layouts, and eleven idle and gesture scenarios. Phone and desktop screenshots were inspected in light and dark themes. The affected controls had no overflow or scoped accessibility violations, and the browser reports had no runtime errors.
- The final slab check captured eight actual model earthquakes. Resuming grew the live log to twelve while keeping the captured plot and fit unchanged. Check, Revise, and idle frames produced no XP, recording callbacks, or notices.
- Idle rendering, automatic drift, repeated stationary input, and restored achievements stayed silent. Deliberate gestures retained their one-time rewards.
- The source, public asset, and local build share SHA-256 `5311c59f1f9b249f5f1b3d383107c23a426a0ee488d137a59bd11827efdc3ce1`. Both English registries contain all 84 new keys with matching text. Syntax, JSON parsing, and the added whitespace check passed.

The force, explanation, and volcano browser reports were captured as their respective helpers were completed. Later edits changed the slab-angle helper; its browser report and the idle report cover the final source. Every browser report records its source hash. The combined test report, final affected-suite rerun, and consolidated verification are `revision-tests.json`, `revision-final-checks.json`, and `revision-verification.json` in `scratch/tectonics-general-review/`.

```powershell
node dev-tools/tectonics_forces_workflow_qa.cjs
node dev-tools/tectonics_explain_visual_qa.cjs
node dev-tools/tectonics_vent_clarity_audit.cjs
node dev-tools/tectonics_slab_inquiry_qa.cjs
node dev-tools/tectonics_idle_reward_qa.cjs
```

## Paused investigations, depth guides and evidence summaries

The boundary simulator now has an explicit **Advance 60,000 years** control while paused. It advances the same model interval as one second of playback, preserves the current experiment, and does not award XP or record completion. Guidance explains that an earthquake is not guaranteed in each interval. Short distances remain visible, and the worked rate calculation distinguishes the average over the whole run from the current rate slider.

Earthquake dots now age on every model advance, including intervals that generate another earthquake. They stay fixed between model advances and disappear as playback or paused steps advance model time; the retained observation log remains available for measurement. A change in event identity refreshes the 3D geometry even when the marker count and rounded distance stay the same.

The 3D block labels the latest visible earthquake focus with its numeric depth. A dashed guide connects the internal focus to a hollow surface projection. Labels stay clear of both points on rotated phone views, and cutting away the focus clears its annotation. Screen-reader descriptions count only the earthquakes retained by the slice. Divergent and transform descriptions identify shallow events near the boundary; the convergent description locates deeper events within the sinking slab. A readable HTML legend states the shallow, intermediate and deep ranges beside the scene.

The hotspot lab now leads students through reading one observation, calculating a starting rate and comparing the line with the full dataset. Selecting a volcano outlines its graph point and shows its observed distance beside the learner line's prediction. Larger ticks, HTML axis captions and a line key remain readable on phones. Exact numeric rate entry commits on Enter, blur or Lock, preserving unfinished keystrokes. The introduction explains the fixed-hotspot and constant-average-speed assumptions and qualifies real hotspot motion. References: [NOAA Hawaiian ages and distances](https://oceanexplorer.noaa.gov/wp-content/uploads/2025/04/hawaiian-map-data-table.pdf), [USGS hotspot tracks](https://www.usgs.gov/faqs/what-a-hotspot-and-how-do-you-know-its-there), and [USGS Hawaiian hotspot motion](https://www.usgs.gov/publications/leg-197-synthesis-southward-motion-and-geochemical-variability-hawaiian-hotspot).

The teacher guide starts with the student's saved evidence: depth samples, completed force observations, the locked hotspot estimate, stress records, continent evidence, quiz results and submitted writing. It distinguishes drafts, completed observations and revisions, uses the actual quiz bank's denominator, and prompts the teacher to assess scientific reasoning alongside completion records. Lesson guidance, model limitations and curriculum connections follow in optional sections. The hazard expectation explicitly calls for additional real regional data. References: [NGSS MS-ESS2-3](https://www.nextgenscience.org/pe/ms-ess2-3-earths-systems), [MS-ESS3-2](https://www.nextgenscience.org/pe/ms-ess3-2-earth-and-human-activity), and [HS-ESS2-3](https://www.nextgenscience.org/hs-ess2-3-earths-systems).

Browser harnesses for this pass:

```powershell
node dev-tools/tectonics_focus_visual_qa.cjs
node dev-tools/tectonics_hotspot_workflow_qa.cjs
node dev-tools/tectonics_teacher_summary_qa.cjs
node dev-tools/tectonics_step_visual_qa.cjs
node dev-tools/tectonics_idle_reward_qa.cjs
```

### Verification of paused investigations and evidence summaries

- All 493 distinct focused checks have passing results across twenty suites. The combined run passed 491; the affected rerun passed all 210 after the standards links received translated labels and the template audit followed the deferred focus label into its actual 3D consumer. Removing the depth substitution in a scratch variant correctly fails that audit.
- Forty browser scenes, checks and layouts passed: nine actual WebGL focus-guide scenes, four hotspot layouts, twelve teacher-summary checks, four simulator layouts and eleven idle/gesture scenarios. Inspected phone and desktop captures cover light and dark themes. The reports have no runtime errors, overflow or scoped accessibility violations.
- The final simulator checks captured eight earthquakes, then advanced the live log to nine while retaining the checked sample and fit. Four consecutive births leave three active dots and four retained observations; three later intervals without births remove the dots and preserve the log. Slice descriptions and focus annotations agree about which events remain visible.
- The final idle run again confirms that idle frames, automatic drift, stationary inputs, rerenders and restored progress earn no rewards and produce no notices or sounds. Deliberate gestures retain their one-time rewards. Step and teacher-summary checks also produce no reward or recording callbacks.
- Source, public asset and local build share SHA-256 `b83201e3baace46781ab713c340dfbe8fffbda5f468f0189821220e00b968e23`. Both English registries contain the 92 new keys with matching values, and no existing English fallback changed. Syntax, JSON parsing and the added source-whitespace check passed.

The focus-guide and hotspot reports were captured when those helpers were completed. Later changes affected simulator integration and teacher labels; the final simulator, teacher and idle reports cover the final source. Every browser report records its source hash. Reports and captures are in `scratch/tectonics-focus-review/after/`, `scratch/tectonics-hotspot-workflow-review/`, `scratch/tectonics-teacher-review/`, `scratch/tectonics-step-review/` and `scratch/tectonics-idle-review/`. The combined unit report, affected rerun and consolidated verification are `tests.json`, `final-tests.json` and `verification.json` in `scratch/tectonics-boundary-refinement-review/`.

## Inspecting eruptions and comparing earthquake signals

The volcano offers **See inside**, **See shape** and **Reset view**. The presets expose the centre slice or the whole edifice; Home and Reset restore the starting angles, zoom and centre slice. The slider's visible description and accessible value stay synchronized with presets, keyboard movement and resets. Guidance explains why buried or removed anatomy loses its label. Controls have larger touch areas and an explicit theme surface, and the model description includes the selected magma's causal chain and current eruption stage.

An eruption keeps its starting magma composition in both 2D and 3D. Composition buttons remain disabled until it finishes. **Pause eruption** freezes its progress, particles and automatic camera framing while preserving manual rotation, zoom and slicing. Resume continues the same eruption. Timing now uses bounded elapsed time and fixed simulation steps, preserving the original 60 Hz durations across 30, 60 and 144 Hz displays. Pause and camera actions add no awards or progress records; the inspection state is transient.

The earthquake panel separates magnitude from local shaking and damage. Numeric magnitude bands highlight the event's size, including restored values above M9, while nearby guidance explains the roles of distance, depth, ground and buildings in intensity. Full-width labeled controls support changing one variable at a time. HTML P/S arrival times and the S-minus-P gap use the same constants as the canvas. The worked distance conversion identifies rounding, trace compression and the rescaled time axis. Optional notes explain the model assumptions and distinguish the original Richter/ML scale from Mw. References: [USGS magnitude and intensity](https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity), [magnitude types](https://www.usgs.gov/programs/earthquake-hazards/magnitude-types), and [earthquake effects](https://www.usgs.gov/programs/earthquake-hazards/what-are-effects-earthquakes).

The globe's time-lapse now reads playback state from the correct panel, advances using elapsed time and finishes paused on Modern. Replay starts at the first era; deliberate era selection pauses playback. West/east buttons and Left/Right/Home keys let students inspect either side of the globe, including with reduced motion. Orientation remains fixed when comparing eras. The phone canvas fits completely inside its panel. Captions identify the views as schematic and clarify that equal animation intervals represent unequal spans of geological time. Automatic playback, completion, replay and idle do not repeat the existing deliberate-action rewards.

```powershell
node dev-tools/tectonics_eruption_inspection_qa.cjs
node dev-tools/tectonics_earthquake_readings_qa.cjs
node dev-tools/tectonics_globe_timeline_qa.cjs
node dev-tools/tectonics_idle_reward_qa.cjs
```

### Verification of eruption inspection and signal comparison

- All 514 distinct focused checks have passing results across twenty-three files. The combined run returned 481 assertions from twenty-one files, with two source contracts awaiting updates. The final affected run passed all 327 checks, including the two missing files, updated keyboard/motion contracts, actual reset/slice synchronization, and eruption pause/timing behaviors.
- Thirty-five browser checks and layouts passed: four earthquake layouts, four globe layouts, sixteen eruption-inspection checks and eleven idle/gesture scenarios. Thirty-two captures were saved; inspected phone/desktop views were readable in both themes. All reports have zero runtime errors, and the affected panels passed scoped accessibility and overflow checks.
- The final eruption audit verifies that the same canvas survives Pause/Resume, particles and ticks freeze, composition remains fixed, and presets, slice keys and Home preserve the paused experiment. Every control in that panel has a touch area at least 40 pixels tall; rotation buttons also meet 40 pixels wide. An overriding range CSS rule was corrected specifically on the cutaway slider.
- Time-lapse reaches Modern and pauses, manual era selection pauses playback, replay starts at the first era, and neither automatic progress nor repeated playback reissues rewards or sounds. The phone globe fits its panel completely. Final idle checks again confirm that automatic drift, stationary input, rerenders and restored progress earn nothing and stay silent.
- Source, public asset and local build share SHA-256 `3fe02eebeef0156609f2741f24cc085a798c19aa0a88f8923f0bfe2f87aeb5a7`. Both English registries contain the 64 new keys with matching values, and no existing English fallback changed. Syntax, JSON parsing and added source whitespace checks passed.

The globe and earthquake reports cover their completed helpers before later volcano-description and slider-size adjustments. The final eruption and idle reports cover the final source. Every report records its source hash. Captures and browser reports are in `scratch/tectonics-eruption-inspection-review/`, `scratch/tectonics-earthquake-readings-review/` and `scratch/tectonics-globe-review/after/`. The combined unit report, final affected run and consolidated verification are `tests.json`, `final-tests.json` and `verification.json` in `scratch/tectonics-next-refinement-review/`.

## Structure inspection and measured depth comparisons

The volcano now lets students select its magma chamber, conduit, vent, dikes or sill. Internal outlines follow the actual intersection of each mesh with the slice; covered or removed structures receive no outline. The selected anchor and caption stay separate on narrow screens. Selection keeps the camera, slice and eruption time, works when general labels are off, and settles back to idle rendering. A readable explanation connects each structure to magma storage or movement. Availability text explains when a different slice is needed. The dike and sill descriptions use their relationship to the surrounding layers. References: [USGS magma storage and vents](https://www.usgs.gov/programs/VHP/about-volcanoes) and [National Park Service intrusive landforms](https://www.nps.gov/subjects/geology/intrusive-igneous-landforms.htm).

Switching between 2D and 3D within Simulation now retains the same volcano renderer and transient eruption state. Previously, switching away while paused destroyed the particles; returning showed an empty eruption at the same paused tick. The corrected view switch preserves the scene and particles, removes keyboard and pointer access from the hidden canvas, and stops hidden GPU painting. Returning consumes no missed particle motion. Loading remains lazy until the first 3D visit, and leaving Simulation disposes the renderer. Pause/Resume and the eruption stage are available in both views, with guidance appropriate to each view.

Saved earthquake samples now share a 0–700 km depth axis and retain numeric event counts and shallowest/deepest readings. Each range joins its two measured extremes; the panel explicitly explains that intermediate depths were not necessarily observed. Data-specific comparisons use actual retained maxima, including equal or reversed results. The current-run preview distinguishes live observations from the saved sample, and recording again clearly replaces only the selected boundary's record. Optional capture details show the rate at capture, elapsed model time and the latest-200-event sample limit. Zero-count bands describe this sample, and unequal sample sizes are qualified. These changes preserve the saved schema and recording callbacks. References: [USGS depth classes](https://www.usgs.gov/programs/earthquake-hazards/determining-depth-earthquake) and [earthquake depths and slabs](https://www.usgs.gov/faqs/what-depth-do-earthquakes-occur-what-significance-depth).

```powershell
node dev-tools/tectonics_eruption_inspection_qa.cjs
node dev-tools/tectonics_vent_inspection_qa.cjs
node dev-tools/tectonics_depth_comparison_qa.cjs
node dev-tools/tectonics_idle_reward_qa.cjs
```

### Verification of structure inspection and depth comparisons

- All 528 distinct focused checks have passing results across twenty-five files. The combined run passed 527; the final affected run passed all 188 after updating the old unconditional-focus expectation to verify the retained hidden canvas leaves the tab order. New behavior checks cover actual slice contours, status callbacks, labels-off inspection, disposal, exact paused-view retention, hidden rendering, and saved sample comparison and replacement.
- Fifty-nine browser checks and layouts passed: thirty-six full-tool eruption and anatomy checks, eight saved-depth checks, four dedicated WebGL anatomy layouts and eleven idle/gesture scenarios. Forty captures were saved. Inspected phone and desktop images cover both themes; affected panels have no overflow or scoped accessibility violations, and reports contain no runtime errors. The full-tool controls remain at least 40 pixels tall.
- Actual view switches preserve the same paused canvas, scene and particle data. Hidden 3D frames draw nothing; running 2D time advances the source clock without replaying particle updates on return. Resume remains available in 2D, and leaving Simulation disposes the renderer. Recording, replacing and clearing saved samples produce no rewards or notices. Idle frames, drift, stationary gestures, rerenders and restored progress stay silent and earn nothing; deliberate gestures retain their one-time rewards.
- Source, public asset and local build share SHA-256 `169d4237f3ef9f440cfc0ba4754f005a780faf2ba0c78109c6dbb028a3176b66`. Both English registries contain all 46 new keys with matching values. Every pre-existing registry value and English fallback is preserved. Syntax, JSON parsing and added-source whitespace checks passed.

The final full-tool browser report covers the final source, including wording that distinguishes the vent's ring marker from internal slice outlines. The depth and idle reports precede only that wording addition. The dedicated anatomy report covers its completed helper before later UI changes. Every report records its source hash. Combined tests, the affected rerun and consolidated verification are `tests.json`, `final-tests.json` and `verification.json` in `scratch/tectonics-continued-clarity-review/`. Full-tool captures are in its `eruption-controls/` folder; dedicated captures are in `scratch/tectonics-depth-comparison-review/after/` and `scratch/tectonics-vent-inspection-review/after/`.


## Matching transform markers and revising investigations

The transform model now uses a solid reference pair and a dashed reference pair. Previously, unrelated identical white bands lined up at 192 km of modeled offset, which could look like the original alignment had returned. The new patterns retain every marker position and all plate motion, and distinguish the unrelated bands where they cross the fault. Stable marker identities support geometry checks. The From above caption and HTML key explain how to match the pairs.

Boundary Stress now shows the latest retained record for each of the three boundary types, even after earlier rows disappear from the eight-row log. The cards show the recorded stress, friction and result. A comparison qualifies as matched only when all three records use the same stress and friction; otherwise the panel explains which controls must be held constant. Use these settings restores a trial's inputs without recording it. The existing latest-two-trial comparison and explicit recording remain available.

The epicenter activity preserves an unfinished mystery, station positions, entered radii, guess and check state when its shelf closes and reopens. A versioned case draft is validated on restoration, including station identities, coordinate bounds and numeric input limits; errors are recomputed from coordinates. Persistence occurs only after explicit actions, with map gestures saved on release or keyup. An invalid current radius preserves the last valid draft. Mounting, restoring, redrawing and idle do not save, announce or score a case.

After revealing an epicenter, Revise this case returns to the same readings and hides the true point while restoring editing. The original attempt remains frozen. A revised result compares location error and correct radii with that original attempt, and identifies the revision as practice. A synchronous case guard prevents repeated or reentrant Reveal calls from recording twice. Only the first reveal updates attempt count and best distance. Best distance now retains the full measured error, while display formatting is separate: a 50.4 km result cannot complete the 50 km target. Existing integer best-distance records remain accepted as stored.

### Verification of markers and revised investigations

- All 553 focused checks passed across 28 files in the full combined run. New checks cover matched marker identity and positions, retained stress settings, exact mission boundaries, synchronous reveal consumption, revision snapshots, draft validation and actual host shelf restoration.
- 51 browser checks passed: sixteen actual WebGL marker scenes, twelve retained stress checks, twelve epicenter checks and eleven idle/gesture scenarios. Twenty-four captures were saved. Inspected phone and desktop images cover both themes, including the completed revision comparison. Reports have zero runtime errors; retained stress controls have no overflow or scoped accessibility violations, and epicenter revisions have no clipping or horizontal overflow.
- Marker geometry settles without extra idle renders. Draft restoration, guided revisions and input restoration add no rewards or notices. The final idle audit confirms that 1,200 idle draw frames, automatic drift, stationary gestures, rerenders and restored achievements stay silent and earn nothing; deliberate movement retains its one-time receipts.
- Source, public asset and local build share SHA-256 1792df7d5385a2cb7fd4997d0fbe324219dabe8e4a09e4b3c0f3d649e71ac28c. Both English registries contain all 23 new labels with matching values; every pre-existing registry value and English fallback is preserved. Source syntax, JSON parsing and the added-source whitespace check passed.

The marker browser report covers its completed helper before later caption and learning-workflow changes. Stress, epicenter and idle reports cover the final source. Each report records its hash. The combined unit report and consolidated verification are [tests.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-next-pass/tests.json) and [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-next-pass/verification.json). Browser reports and captures are in [the stress review](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-next-pass/stress-review/results.json), [the epicenter review](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-epicenter-retention-review/results.json) and scratch/tectonics-transform-marker-review/.


## Clear surface features and retained investigation evidence

The divergent block now distinguishes newly formed solid crust from the older ocean plates with a slate rock surface and thin seams at the band's edges. The orange fissure stays narrow. In the convergent block, the growing generic mountains sit inland of the volcanic arc, so high uplift no longer hides the craters. Arc position, slab anchoring, plate motion and heights are preserved.

Checked slab investigations retain the entered angle and validated observation points when the diagram closes. They reopen paused, with zero live model time and no replayed earthquake markers. Students can revise the same captured points. A restored sample cannot be recorded as a new depth trial with the new run's time and rate. Play or Step starts a fresh live log while leaving the checked plot and saved result intact. Reset explicitly clears the saved check; changing boundary types leaves that saved record available on return.

Hotspot retries now keep the last completed result, closest locked estimate and successful speed/direction evidence separately from the current draft. A worse retry cannot remove an earlier completed mission or successful evidence. Retained rates are finite and bounded to the activity's range, and older est/direction records remain readable. Mounting and restoration do not create records.

Explain It offers a specific three-boundary stress comparison only when stress and friction are the same in all three retained records. Otherwise students choose an actual single record. The prompts distinguish controlled comparison, individual observations and earthquake-depth evidence. Add remains explicit. Save copies validated depth, stress, force, hotspot, magnitude and quiz observations into that writing version. Optional details identify them as observations available at submission; later trials cannot silently change them. Older writing keeps its original text without reconstructing missing history. A synchronous guard prevents rapid or callback-reentrant Save calls from duplicating a submission or teacher snapshot.

The teacher review now shows retained stress settings and outcomes, qualifies matched controls and includes saved prediction/explanation text. Its epicenter card distinguishes unfinished work, scored first attempts and practice revisions. Original and revised errors are recomputed with the same case validator used by the activity. Current hidden revision accuracy and true coordinates are not revealed. Completed hotspot evidence remains visible during a newer retry. All teacher controls are read-only.

### Verification of surface clarity and retained evidence

- All 589 distinct focused checks have passing results across 32 files. The first combined run returned 563 passing assertions and four old state/regex expectations requiring updates; two files were omitted after a fork worker timeout. The final affected run passed all 340 checks, covering those missing files, the corrected contracts and restored-sample provenance. Assertions for existing behavior were preserved.
- 61 browser checks passed: sixteen actual WebGL surface/cutaway scenes, eight teacher layouts/read-only checks, sixteen explanation checks, ten retained-inquiry checks and eleven idle/gesture checks. 44 captures were saved; inspected phone and desktop views cover light and dark themes. Reports have zero browser errors, and affected HTML panels have no horizontal overflow or scoped WCAG A/AA violations.
- Play and Step each replace restored live points with a fresh event at the new run's actual time/rate, keep the frozen eight-point inquiry intact, and append normally on the next advance. Shelf reentry preserves checked work and hotspot retry evidence. Saved explanation values remain fixed after newer trials. Idle animation, automatic drift, stationary input, rerenders and restored work earn nothing and remain silent.
- Main source, public asset and local build match SHA-256 58b267733eb064276e3ba9787d49d5e8cebdc99da28792249317b7231ac7760e. Existing English fallback values and every original registry value are preserved. Both English registries contain all 42 new labels used by the final source. Syntax and JSON parsing pass.

Combined tests, the final affected report and consolidated proof are [tests.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-evidence-refinement/tests.json), [final-tests.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-evidence-refinement/final-tests.json) and [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-evidence-refinement/verification.json). Surface captures are in scratch/tectonics-boundary-surface-review/. Teacher, explanation and retained-inquiry reports are linked in the consolidated proof. Those component reports precede only unrelated final changes; the final retained-inquiry and idle reports cover the final source.

That audit found that an unfinished force observation restarted after navigating away. The following refinement resolves that issue.


## Returning to force investigations and reading sea-floor measurements

The force lab now retains an unfinished prediction or observation when the learner switches activities or leaves the tool. Returning restores the physical model, chosen prediction, observation progress and sea-floor measurements at the saved model time, always paused. Run or Step deliberately continues the experiment. A restored observation cannot finish or issue callbacks by sitting idle, including when the saved state is already near its completion threshold. Reset clears this exploration draft while retaining completed predictions and outcomes.

Drafts are validated before use, and plate speeds and forces are recomputed from the saved physical state. Moving frames do not write parent state. Explicit actions and navigation save checkpoints; actual unmount provides a fallback without duplicating the navigation save or React StrictMode rehearsal. Completed observations are saved once with their final checkpoint. Existing deliberate-action rewards are unchanged.

Sea-floor measurements now show their plate, recorded model time, distance, crust age and average motion away from the ridge. Desktop tables become readable semantic cards on phones. Comparison guidance uses two distinct distances on the same plate at the same recorded time, and describes the actual older, equal or younger result. Identical probes no longer imply an age pattern. The average over the crust's lifetime is explained separately from each plate's current motion, so changing forces cannot silently reinterpret older measurements.

Completed force-result cards show the recorded model time and the learner's actual prediction. Match feedback is recomputed from that prediction; invalid later outcomes cannot replace a valid earlier result. The teacher view distinguishes unfinished predictions, unfinished observations and exploration from completed outcomes. It also separates retained sea-floor probes from force-test results. Older records keep their available values without invented timestamps or predictions. Result and measurement text is at least 14 pixels in the reviewed layouts.

The 3D caption layout now reserves the actual projected shaft and arrowhead bounds of both plate-motion arrows. Feature labels cannot cover those arrows in rotated cutaway views. Camera positions, true feature anchors, plate geometry and motion are preserved.

Full-tool restoration checks also exposed an inactive audio sweep announcing that it had stopped on mount or unmount. Cleanup now checks the actual timer and audio resources before announcing a stop. Inactive and repeated cleanup stays silent; stopping an active sweep still cancels and disconnects its resources and announces once.

### Verification of paused force returns and measurement guidance

- All 623 distinct focused checks have passing results across 37 files. The broad run passed 562 assertions and found two old callback-count expectations requiring updates; worker shutdown timeouts omitted four files. Affected reruns cover those files and the revised draft-checkpoint contracts, preserving physical and once-only outcome assertions.
- 102 browser checks passed, with 30 captures. Final-source checks cover measurement comparisons, saved-result and teacher layouts, registered-tool navigation and force restoration, and idle rewards. The reports have no browser errors; reviewed HTML panels have no horizontal overflow or scoped WCAG A/AA violations.
- The idle audit again confirms that 1,200 real draw frames, automatic drift, stationary inputs, rerenders and restored progress earn no rewards and produce no sounds or notices. Deliberate gestures retain their one-time rewards. Restored force experiments remain paused and require deliberate continuation.
- Source, public asset and local build match SHA-256 cc9dc2e0d35f5fec033d09e7b7c560c558099d58eaa3d2ffd18ec8cccafe32a9. Both English tectonic registries contain all 25 new labels with matching fallbacks. Existing tectonic registry values and source fallbacks are preserved. Acorn syntax and JSON parsing pass. The exact 3D renderer declaration matches the snapshot tested across 48 actual WebGL layouts.

The combined test report, affected reruns, browser reports and source-integrity evidence are linked in [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-force-refinement/verification.json). Measurement and force-return captures are in the adjacent task review folders; motion-arrow captures are in scratch/tectonics-motion-labels-review/. The motion-label report precedes unrelated force changes, and the integrity report verifies that renderer code is identical. Measurement and review reports cover unchanged helpers before the final inactive-audio cleanup guard. That two-anchor source difference is verified in the integrity report; final cleanup tests, registered-tool restoration and idle browser checks cover the final source.


## Inspecting boundary structures and comparing saved investigations

Students can select the descending slab, trench, volcanic arc, spreading ridge, cooling crust, transform fault or matching markers. The 3D outlines follow exposed mesh edges and the current cut plane; hidden structures have a clear view instruction. Each keyboard-accessible choice has its own description. Selection leaves camera orientation, model time, rate and recorded observations unchanged. Motion arrows now have a contrasting core and outline in light, dark and high-contrast views. The 2D spreading view also distinguishes a solid gray cooling-crust band from the narrow axial melt fissure.

An optional guided comparison asks for a prediction, then runs all three boundaries at a shared rate and duration. Each trial starts paused and advances only through an explicit action. Matching checks require the actual recorded time and a constant rate from reset. Saved explanations freeze their three samples and can include a written interpretation of an unfamiliar earthquake-depth diagram. Reopening restores the plan paused; revising an explanation retains an earlier application response. Invalid callbacks cannot replace evidence, and newer plan saves preserve earlier completed comparisons and unrelated student work.

The student and teacher views show the exact evidence saved with each explanation. Print saved investigation opens an escaped local document with numeric depth and speed figures, tables and submitted writing. Later trials and drafts cannot alter that report. Older submissions without a snapshot retain their text and identify the missing observations. Blocked print windows report the problem while preserving saved work. Imported sea-floor ages are bounded by their recorded model time.

Phone controls use readable text, larger touch targets and a keyboard-operable cut slider with a meaningful position description. The desktop model keeps its own aspect ratio beside taller controls. Long rock and force explanations are expandable; live force readings stay near the model controls.

### Verification of the feature inspector and saved comparison

- All 665 distinct focused checks have passing results across 40 files. The broad run precedes only the final hidden-marker view hint; affected reruns cover that correction and the updated source contracts for larger text, the local report translator and reset provenance.
- 188 browser checks passed on the final source, with 105 captured views. Reviewed model, phone, comparison, student, teacher and print panels have no browser errors, horizontal overflow or scoped WCAG violations. Final browser checks use the real English registry where recorded in the proof.
- The idle audit again covers 1,200 actual draw frames, automatic drift, stationary inputs, rerenders and restored progress: no repeated rewards, sounds or notices. Guided idle checks also leave saved data and callbacks unchanged. Deliberate gestures retain their existing one-time rewards.
- Source, public asset and local build match SHA-256 d7a1d579c6f3bb9178f8239c738bb9414fb642742c4f57582305c5f8c549d985. Both English registries contain 131 new labels. Existing tectonic registry values and every retained source fallback are preserved; two retired force-result labels remain in the registries. Syntax and JSON parsing pass. Scoped dictionary hashes verify tectonic labels independently of concurrent registry edits for other labs.

The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-feature-refinement/verification.json) links the unit reports, final browser reports and asset integrity proof. Captures are saved beside the browser reports.


## Reading transform slip and saving application evidence

The small transform inset now moves both stream halves in their arrow directions without re-aligning every 26 km. The 2D and 3D pictures share the existing 280 km display extent. A nearby note explains when that finite picture limit is reached; cumulative fault slip keeps its full numerical value and remains readable during later steps. Matching-marker descriptions distinguish schematic separation from distance. The original 3D geometry, camera controls and physical updates are preserved.

Application responses have an explicit Save button. Checking an answer leaves a draft; Save attaches the checked choice and written evidence to the last saved comparison, even after a newer plan changes the live settings. The original three samples, prediction and explanation remain fixed. Earlier Claim/Evidence/Reasoning submissions and their printed HTML remain unchanged; a deliberate new writing save captures the revised response. Empty application fields show Draft. Duplicate and stale-check saves are guarded synchronously.

Live, recorded and frozen comparison cards now show shallow, intermediate and deep event counts beside their depth ranges. Saved student/teacher evidence and both printed depth tables carry the same actual counts. Labels explain the model depth bands and qualify the counts as observations from a sample. An empty run at the shared target time stays empty, explains random sampling, and offers an explicit restart that retains the plan and earlier records.

### Verification of transform extent and explicit application saves

- All 686 distinct focused checks have passing results across 41 files. The initial broad run timed out one registered-parent case and omitted seven files after worker startup timeouts; focused reruns cover every omitted file and that case. New transform behavior and saved-report tests are included.
- 230 distinct final-source browser checks passed. A focused transform rerun adds world-coordinate direction assertions under existing check names, so it is not counted twice. Reviewed phone, desktop, high-contrast, oblique, saved-evidence and print views remain readable. Final browser reports contain no runtime errors; affected controls pass their recorded overflow and accessibility checks.
- The registered parent preserves the frozen comparison during a changed live plan. Editing and checking do not persist an application response; explicit Save changes only that response. Earlier saved writing and byte-identical printed HTML remain fixed, while a new writing save captures the revision.
- The idle audit covers 1,200 real draw frames, drift, stationary input, rerenders and restored progress: no repeated rewards, sounds or notices. Deliberate gestures retain their one-time rewards. Transform idle and application checks also preserve recorded data and settle GPU rendering.
- All three source copies match SHA-256 23fe546b408b1af0f82cead3058eaa30f716e33fdd94e0190700222ed462bf8b. Both English tectonic dictionaries match their scoped hash, include all 25 new labels for this pass, and preserve existing values and retained source fallbacks. Five retired transform wording keys remain available in the registries. Syntax and JSON parsing pass.

The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-application-refinement/verification.json) links the complete test results, final browser reports and asset integrity proof. Captures are stored beside those reports.


## Tracing arc formation and retaining unfinished comparisons

An optional Trace arc formation guide distinguishes water released from slab minerals, partial melting of hot mantle above the slab, and rising magma. Each selected step has its own number, pattern and explanation: dashed cyan water, an orange speckled melt patch, and a narrow solid magma route. The 3D traces are teaching annotations on an exposed cut face. Intact, rear and overhead views give explicit view guidance. Routes and patch size are schematic; they do not measure melting locations or volumes. Selection preserves model time, rate, camera, cut and saved investigations. In 2D, the magma route now starts outside the actual descending slab polygon while preserving the existing surface arc position. Process numbers remain at least 14 CSS pixels, including scaled host layouts.

The explanations describe mostly solid slab and mantle with localized partial melting. The former myth explanation that simply said the subducted slab melts has a new translation key; its older dictionary value remains available. References: [USGS mantle and small regions of melt](https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma), [USGS subduction overview](https://www.usgs.gov/special-topics/subduction-zone-science/science/introduction-subduction-zones-amazing-events), and [USGS volcanism in plate tectonics](https://pubs.usgs.gov/gip/19/downloads/Appendixes/I_Volcanism%20in%20a%20Plate%20Tectonics%20Perspective.pdf).

The earthquake-depth plot has an expandable semantic coordinate table. Its event positions, distances and depths are the exact values used to draw the displayed points, including restored decimal measurements. Checked coordinates remain frozen while the live run advances. Revise uses the latest observations. Distance headers follow the boundary mode, numeric cells wrap on narrow screens, and opening the inner table does not change the outer quake-log state. The table does not reveal a fitted slab angle.

Explicit writing and settings edits retain a validated versioned comparison draft. Reopening restores those unfinished fields with the model paused and application feedback unchecked. No-op edits and duplicate callbacks preserve parent-state identity. Saved plans, completed comparisons, earlier Claim/Evidence/Reasoning snapshots and printed HTML stay frozen until their explicit Save action. Mounting, restoring, redraws and idle frames do not save drafts.

Phone verification found that panning the wide 2D section could carry a horizontal scroll offset into 3D and hide the canvas. Switching to 3D now resets that frame's scroll offset while preserving the experiment settings. The new browser checks verify actual viewport containment as well as the scene graph.

### Verification of the process guide, coordinates and drafts

- All 737 distinct focused checks passed across 44 files. Process checks cover real WebGL clipping, camera visibility, stable solids and arc position, label layout and the actual 2D mantle origin. Draft checks cover validation, explicit edits, no-op callbacks and quiet restoration. Coordinate checks cover exact plot fidelity, frozen samples, revisions and nested details.
- 178 distinct final-source browser checks passed. Phone and desktop captures cover both themes. Final reports have no browser errors; affected HTML panels pass their recorded accessibility and overflow checks. Process numbers and the visible WebGL viewport are checked directly.
- The idle audit again covers 1,200 actual draw frames, automatic drift, stationary inputs, rerenders and restored progress. Idle produces no repeated rewards, sounds or notices. The new guide, retained drafts and coordinate table also leave saved evidence unchanged during idle. Deliberate gestures retain their existing one-time rewards.
- All three source copies match SHA-256 502687ea21500b96f1d9f3a9b9af8ab2637bc74e5aaf313a8c2b2c67f6249aa2. Both English tectonic dictionaries have matching scoped hashes and contain 27 new labels. Every existing registry value and retained source fallback is preserved; the retired myth key remains in the dictionaries. Source syntax and JSON parsing pass.

Overlong local application edits now clear checked status synchronously and remain visible for correction. They leave the last bounded persisted draft and completed comparison unchanged. A corrected answer is retained as a draft and still needs an explicit Check and Save. Regression checks cover immediate stale Save clicks and correction after invalid input.

Initial test workers failed during startup. A focused configuration with the same jsdom environment and setup file, using a cache outside the synced checkout, completed the suite. Older source-contract assertions were updated to include paused restoration of unfinished drafts and the mantle magma origin while preserving the surface arc.

Headless screenshot composition could stall subsequent native frames after a WebGL capture. The phone harness verifies the actual boundary-to-force unmount and native frame clocks before taking its final screenshots in separate fixtures. The process harness similarly completes all geometry, interaction and idle assertions before capturing each verified state in a fresh browser; each capture replay must match the tested model settings and camera.

The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-process-refinement/verification.json) links the unit results, final browser reports and asset integrity proof. Captures are stored beside their reports.


## Equal-scale earthquake evidence and event inspection

The earthquake plot now uses equal kilometre scales: plot height follows the distance/depth ranges and the available plot width. A 45-degree estimate appears at 45 degrees. Labels stay at 14 CSS pixels when the host resizes, including phone panels. Light shading marks the existing shallow, intermediate and deep ranges, with a text key that gives their exact boundaries. Depth increases downward; the distance and depth axis titles retain their units.

Read one earthquake links an event selector, its exact distance/depth values, an outlined coordinate row and a ring on the graph. Dashed guides connect the point to both axes. Previous, Next and Clear selection work locally. Event-number buttons support Up/Down and Home/End with one table tab stop; controls have 44-pixel touch targets. Coordinate columns share the remaining space after the event column, so long restored decimals wrap on narrow screens. Theme colors keep the new controls readable, including their disabled states.

Selection tracks the actual observation object. Coincident observations remain distinct, and the rolling 200-event log cannot silently move a selection to another event. If a selected observation leaves the displayed log, the selection clears. Checked samples remain fixed while the live model continues. Check, Revise, reset and boundary changes clear local inspection. The panel identifies its sample and reminds students to compare several events before inferring a slab angle or boundary type. Inspection does not calculate or expose another fitted angle, alter model time or rate, record work, award points, play a sound or issue an announcement.

### Verification of graph geometry and event inspection

- All 755 distinct focused checks passed across 45 files. New cases cover estimates from 5 to 85 degrees, responsive equal scales, exact restored values, coincident points, keyboard navigation, fixed checked samples, rolling observations, depth-band boundaries and silent idle behavior.
- 125 distinct checks passed against the installed source. The new inspector contributes 51 checks and 14 captures across 320-pixel, 390-pixel and desktop views in light, dark and high-contrast themes. Actual SVG transforms verify equal scales and angles; labels stay inside the plot. The affected panels pass their recorded accessibility and overflow checks.
- The idle audit again covers 1,200 actual draw frames, automatic drift, stationary inputs, rerenders and restored progress without repeated rewards, sounds or notices. Each inspected layout also remains unchanged through 1,200 paused idle frames. Saved investigation and application checks preserve frozen evidence and printed work.
- Source, public asset and local build match SHA-256 73111f87c1f7e0db382f6e6f412b662777e8e46b40e6021c2c50e2faec0e6448. Both English tectonic dictionaries contain 17 new labels and preserve all existing values. The retired unequal-scale help label remains in the dictionaries. Syntax, JSON and mirror checks pass. The full TectGL renderer declaration is byte-identical to the preceding committed version.

Browser coordinate assertions allow less than 0.001 CSS pixel of rounding and less than 0.0001 degree of angular rounding; direct geometry tests use the unrounded source attributes. Browser reports identify the exact source and scoped dictionary hashes where the dictionary is used. Unit coverage is consolidated by file and full test name. The affected file rerun updates the former 18-unit SVG-label contract to the responsive 14-pixel labels and adds an explicit geometric angle assertion.

The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-earthquake-refinement/verification.json) links the test reports, final browser results and asset integrity proof. Captures are stored beside those reports.


## Reading earthquake evidence beside its graph

The earthquake panel now places its graph and angle controls beside the event inspector and coordinate table when the panel has enough room. Narrow panels stack the same sections, even inside a wide desktop viewport. The layout responds to available panel space, and the inspector’s value columns respond to their own available width. Reading and keyboard order follow the graph, angle controls, event list and coordinates. Closing the outer panel preserves angle entry and local inspection.

Students can choose an observation directly from the graph. A click or tap selects the nearest event within 22 screen pixels; a distant empty click keeps the selection. The hit calculation uses the actual SVG transform, including translation, rotation and scaling. Tied coincident positions consistently select the first displayed event; the native event list and coordinate buttons still distinguish each observation from the keyboard. The existing exact values, ring and axis guides update together. Selection retains the actual observation identity and adds no writes, sounds, rewards or announcements.

A stronger vertical dashed line marks the boundary reference at 0 km. A nearby explanation connects that reference to each event’s distance. Equal kilometre scales, 14-pixel axis labels, depth bands and the distinction between live and checked samples are retained. Checking an angle remains an explicit action; tapping an event does not check or change the estimate.

### Verification of responsive layout and graph selection

- 763 distinct focused checks passed across 45 files. Eight added cases cover direct point selection at several sizes, transformed coordinates, empty clicks, coincident positions, section order and closing/reopening the panel.
- 140 distinct checks passed against the installed source. The inspector contributes 66 checks and 15 captures. Real touch input, measured column positions, a narrow host in a desktop viewport, phone themes and high-contrast views pass the affected accessibility and overflow checks. SVG transforms still preserve the graph’s scales and estimated angles.
- The 1,200-frame idle audit remains quiet through redraws, drift, stationary input and restored work. Each inspected layout also remains unchanged through 1,200 paused frames. Saved investigation and application checks preserve fixed samples and printed evidence.
- All three source copies match SHA-256 cd7cc36bafb96f4f385a4021df3fa2427f0d39c731df0a52bacd8cfbcde635cd. Both English tectonic namespaces match their scoped hash and contain two new explanations. Existing values and source fallbacks are preserved. Syntax and JSON checks pass; the full 3D renderer declaration is unchanged.

This pass leaves the edits uncommitted and unstaged as requested. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-workbench-refinement/verification.json) links the unit reports, final browser results, asset checks and delivery state. Captures are stored beside those reports.


## Understanding earthquake sample readiness

The quake panel starts with a compact summary of the displayed sample. Shallow, intermediate and deep tiles show actual counts beside the existing depth ranges; text labels and colored edges match the graph bands. Tiles respond to available panel width and keep their counts beside their labels on small screens. A restored or newly checked summary stays fixed while the live log grows. Revise returns the summary to the latest plotted observations.

For convergent boundaries, a quiet progress bar shows how many earthquakes meet the activity’s minimum of eight events at 70 km or deeper. Its visual value stops at eight; its description and sample counts retain the actual number. Paused guidance points to Play and Advance 60,000 years in the model controls. Running guidance encourages observing and estimating; ready guidance asks students to compare several points before explicitly checking. Checked guidance directs comparison of the estimate and fit. Other boundary types retain depth counts without a slab-angle target.

The Check button keeps the same action label while disabled and enabled. Its description explains the target and next step. Reaching the target does not check an angle, pause the model, reveal the fitted line, save work, award points, play a sound or announce each changing count. Explicit Check retains the existing single saved sample and keyboard focus on Revise. The former long disabled-button instruction remains available as an older translation value.

### Verification of counts, readiness and explicit checks

- 769 distinct focused checks passed across 45 files. Six added cases cover empty paused guidance, exact depth boundaries, shallow versus qualifying observations, seven-to-eight readiness, actual counts above eight, frozen checked summaries and both other boundary types.
- 157 checks passed against the installed source. The inspector contributes 79 checks and 19 captures, including phone light/dark readiness, keyboard Check and Revise, high contrast, desktop and narrow-host layouts. Four further checks verify that a full 200-event intermediate sample has no overlapping counts or tile overflow at 320, 390, 430 and 1100 pixels. The affected panels pass their recorded accessibility and overflow checks.
- The idle audit covers 1,200 actual draw frames, automatic drift, stationary input and restored work without repeated rewards, sounds or notices. Paused empty and checked guides also remain unchanged through 1,200 frames. Saved investigation, application and printed-evidence checks retain fixed records.
- Source, public asset and local build match SHA-256 83bb7e1a81737283a73a7875c9691f29f59edc851d6a855f5e0cfc839762a41e. Both English tectonic namespaces match and include seven new labels; existing values are preserved. Syntax, JSON and mirror checks pass. Code outside the earthquake panel and the full TectGL renderer are unchanged from the preceding uncommitted pass.

The initial broad test worker failed with a memory allocation error while the drive had no free space. Temporary asset backup snapshots were compressed and verified losslessly, preserving the source and review evidence. Final tests ran in eight bounded groups. This pass leaves the edits uncommitted and unstaged. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-readiness-refinement/verification.json) links final test, browser, asset and delivery checks.


## Revealing selected features and reading model evidence

The 3D inspector offers a nearby view action when its explanation identifies a hidden feature. A slab selected from above offers Show the cut face; matching fault markers selected in the section offer Show from above. Each selected volcanic-arc process also offers its cut-face view when the current camera hides that face. Selecting a feature keeps the learner's chosen view until they activate the action. These actions reuse the existing camera and slice presets. Physical measurements, playback state, inspected feature, saved evidence and depth-scale preference are retained.

After activation, keyboard focus moves to the updated local explanation with preventScroll. The disappearing action does not leave focus on the document body. The explanation has a visible focus ring; native scroll anchoring can adjust the page as the button and text reflow. Reveal controls have 44-pixel minimum targets, descriptive translated labels and quiet status text.

Boundary evidence and the two learning cards now use 14-pixel text with relaxed spacing. The existing rate-and-time explanation sits immediately beside the model readings and updates from the same exact calculations. The math and Try this have translated semantic headings; decorative icons are hidden from assistive technology. Evidence columns and learning cards respond to their own available panel width. A narrow desktop host uses two evidence columns and stacked learning cards; phones use one evidence column; full desktop retains four evidence columns and two learning cards.

### Verification of view actions and readable evidence

- 778 distinct focused checks passed across 45 files. Nine new interaction cases cover hidden and exposed views, all three arc processes, matching markers, keyboard focus, running state, fixed checked samples, depth-scale preferences and silent idle behavior.
- 134 checks passed against the final installed source. The reveal review contributes 45 checks and 10 captures using actual WebGL, React development StrictMode, phone and desktop layouts in light, dark and high contrast. Learning review contributes 47 checks and 36 captures across nine layouts, including 430-pixel hosts inside a desktop viewport. Measured column widths, actual 14-pixel text, affected accessibility checks and overflow checks pass.
- The idle audit again covers 1,200 draw frames, automatic drift, stationary input and restored progress without repeated rewards, sounds or notices. The learning panels remain quiet through 1,200 paused frames before and after explicit playback. Reveal actions preserve checked samples, model time and rate. Saved investigation, application and printed-evidence checks retain fixed records.
- All three source copies match SHA-256 db6cfe3f4695df33a1e450aadedb67be8d767dc215fdd39bc4625318358c2cbf. Both English tectonic namespaces match and include five new labels while preserving retained values. Syntax, JSON and mirror checks pass. The full TectGL renderer and the rate-and-time calculation block are byte-identical to the preceding pass. This pass changes the boundary simulator's presentation and view controls.

Initial test runs returned incomplete file coverage and were repeated in bounded groups. Their reports are retained separately; final runs cover every focused test file and full test name. The visual review also caught cramped viewport-based columns in a narrow host, leading to the panel-responsive grids before final verification.

Edits remain uncommitted and unstaged as requested. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-reveal-refinement/verification.json) links unit reports, final browser results, asset checks and delivery state. Captures are stored beside the browser reports.


## Touch zoom and clearer overhead framing

The 3D View card now has visible Zoom out and Zoom in actions, a quiet percentage readout and visible drag/keyboard guidance. Targets are at least 44 pixels tall and use the existing 0.15 step and 40–260% limits. The keyboard and wheel handlers retain their earlier behavior. Camera angle, cut, depth scale preference, physical measurements, playback and checked evidence are retained through zoom. Existing presets, Reset view and the block's Home key return zoom to 100%.

Native keyboard review found that disabling the pressed action at a zoom limit sent focus to the document body. At either limit, focus now moves to the opposite enabled zoom action with preventScroll. The View and zoom groups respond to their own available width and stack when their buttons cannot fit side by side. This also fixes the existing 2D/3D toggle's measured overflow of 8 pixels in a host 430 pixels wide. Seven added interface labels, including the View heading, are registered for translation.

The model and controls now respond to the workbench's available width. A flexible row gives the model twice the extra width of the controls. When the model's preferred width of 540 pixels and the controls' preferred width of 270 pixels cannot fit together, the controls move below the model. The model then spans the panel. This removes the thin, excessively tall control column in narrow desktop panels. The arrangement also updates when a mounted tool's host is resized, preserving its model state and camera.

The live overhead frame uses a wider aspect ratio and a minimum height of 200 pixels. On phones 320 or 390 pixels wide, this removes 100 pixels of empty vertical space; normal desktop framing also becomes shorter. In a narrow desktop host, the minimum height gives surface labels more room. The physical model retains its proportions. Native resize fitting keeps the block and labels within the viewport; side, cut face and oblique views retain their earlier sizes. Returning to 2D restores the cross-section and its phone swipe helper.

### Verification of navigation, framing and quiet idle

- 784 distinct focused checks passed across 45 files. Six added cases cover accessible controls, current zoom, both bounds, keyboard focus, presets/reset, fixed checked evidence, running state and quiet callbacks.
- 163 checks passed against the final installed source. Navigation review includes nine phone, desktop and narrow-host layouts, touch/keyboard/wheel input, measured control wrapping and native focus at both bounds. Layout review measures the model and controls in 2D and 3D, including transitions around the wrapping threshold. The affected controls pass their recorded accessibility and overflow checks.
- Frame lifecycle review covers all three boundary types across five layouts, with seeded active earthquakes. Checks exercise native resizing, actual mesh and label containment, overhead-to-side/cut/oblique/2D transitions, geometry reuse and quiet settled frames. Reviewed captures keep the earthquake focus labels, surface guides, matching markers and arrows readable.
- The idle audit again covers 1,200 draw frames, automatic drift, stationary input and restored progress without repeated rewards, sounds or notices. Navigation checks also cover 1,200 paused frames. Saved investigation, application and printed-evidence checks retain fixed records.
- All three source copies match SHA-256 d0ea5be2d6eaf65ea0342dc84f19141afd4e6d6ab3b24f23643ac631a462f7af. Both English tectonic namespaces match and include seven new labels while preserving retained values. Syntax, JSON and mirror checks pass. The full TectGL renderer and rate-and-time calculation block are unchanged from the preceding pass.

Initial reports are retained separately. Native Chromium exposed the zoom-limit focus issue, and narrow-host measurements identified the overflowing existing View toggle. A frame-fixture assertion was corrected to distinguish the 2D swipe helper from the actual canvas footprint. The responsive-canvas test now checks the intentional conditional aspect ratio, retaining the original cross-section ratio for loading and the 2D fallback. The phone-legibility test retains its frame and swipe-hint checks while dropping the obsolete viewport-grid span class. A mounted-resize fixture now waits for the expected host and workbench width before checking the layout. Final-source reports cover the corrected behavior. Browser runs were serialized after a screenshot timed out during concurrent WebGL reviews; the preceding idle assertions had passed. A blank first-layout capture is preserved as a diagnostic, with a guarded supplemental painted capture referenced by the final receipt. WebGL checks also inspect rendered pixels so a blank capture cannot count as model evidence.

Edits remain uncommitted and unstaged. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-navigation-refinement/verification.json) links final unit, browser, asset and delivery results. Captures are stored beside their browser reports.


## Inspecting features beside the model

The 2D/3D choice now sits above the model. The feature inspector and arc formation panel sit directly below it in the same column, so a learner can compare the selected shape with its explanation. Wide panels place the camera tools beside this column; narrow panels put them below it. The arc panel starts closed and expands when the learner chooses it. The camera tools have the clearer heading “Turn, zoom and slice.” Both view choices have targets at least 44 pixels tall.

A selected feature in the cross-section offers “Inspect this feature in 3D.” Activating it uses the same view transition as the primary selector, recenters a section that was scrolled sideways, and focuses the local explanation with preventScroll. The retained camera is used when returning to the block. If that angle hides a selected slab or matching markers, the existing explicit reveal action remains available beside the explanation. Loading and failure retain an accessible cross-section and a focusable local status.

The inspector stays within the model column, outside the canvas frame. This keeps the section's phone scrolling and the block's absolute canvas bounds confined to the drawing. Opening the arc explanation grows the column without stretching the model. The source and DOM follow the same reading order: view choice, model, feature inspector, arc details, then camera and simulation controls.

### Verification of inspection and view entry

- 789 distinct focused checks passed across 45 files. Five added behavior cases cover explicit activation, quiet 2D selection, horizontal recentering, local keyboard focus, retained camera and checked eight-point sample, playback, delayed readiness and failed 3D loading.
- 97 checks passed against the final installed source. The inspection audit covers nine phone, desktop and narrow-panel layouts in light, dark and high contrast, with measured model and inspector positions, actual WebGL dimensions, accessible controls, open and closed arc explanations, view switching and retained evidence.
- Rendered screenshots were inspected. The final capture helper settles visibility and paints before capture, then checks the saved PNG's model region for actual rendered colors. The initial blank desktop capture is retained as a diagnostic. Prototype source overlays and fallback allowances are excluded from final browser provenance.
- Resizing the same mounted lab from 1,100 pixels to a 430-pixel panel, then a 320-pixel phone and back to desktop preserves the selected slab, open water trace, cut-face camera, model readings and checked eight-point sample. Renderer dimensions and camera aspect follow each settled frame without overflow.
- The original idle audit again covers 1,200 draw frames, stationary input, drift, rerenders and restored challenges without repeated rewards or pings. Inspection selection and settled views remain quiet. Saved investigation, application and printed-evidence checks pass.
- All three source copies match SHA-256 185636bbae594100f2f4508bd76bdffd0b487d95975793a791e20686cd1f74af. The two English tectonic namespaces match and include two added labels; retained values and unrelated namespaces are preserved. Syntax, renderer, calculation, asset and Git whitespace checks pass.

Native view switching adds the existing block key above the model and changes frame height. Browser scroll anchoring can therefore change the absolute page offset. The final focus check verifies the local status is focused and visible; it records the natural layout movement. The behavior tests verify the exact preventScroll request.

Changes remain uncommitted and unstaged. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-inspection-workspace/verification.json) links the final test, browser and asset results. Captures are stored beside their browser reports.


## Connecting the whole arc process

The arc panel now offers Whole process beside the three isolated stages. It shows water release, partial melting above the sinking slab and magma ascent together in the cross-section and on exposed 3D cut faces. The existing dashed water route, speckled melt patch and solid magma route remain distinct. Matching patterned swatches in the numbered step buttons make the visual key available beside the explanation without adding another panel.

The combined cross-section has three separate numbered callouts with leaders to the water route, melt patch and magma route. Their spacing follows the readable font size when a host scales the canvas. The 3D numbers follow the upward spatial order, with 1 below 2 and 3, avoiding the crossing leaders that the earlier isolated-label positions would produce when combined. The existing label placement logic handles collisions with other model labels.

The explanation connects the causes while keeping water and magma distinct: water released from the slab helps mantle above it melt, and the magma formed there can rise. The slab and surrounding mantle stay mostly solid in this model. This remains consistent with the panel's linked [USGS explanation of the mostly solid mantle and local melting](https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma), checked during this pass. The displayed routes and melt-patch size remain schematic.

Hide trace remains the default. Choosing Whole process preserves camera angle, cut, depth-scale preference, model time, playback and checked evidence. It uses the retained annotation geometry. Hidden cut faces keep the same explicit reveal action. Closing the arc panel or leaving convergence clears the trace. Selection and idle rendering do not save records, earn rewards or ping.

### Verification of the combined arc view

- 797 distinct focused tests passed across 45 files. Eight added cases cover all three traces and numbers, pattern distinctions, geometry reuse, view exposure, scaled callout spacing, retained checked evidence, quiet idle, closing, mode changes and explicit reveal.
- 96 checks passed against the final installed source. Native browser captures and measurements cover the combined view and individual stages, readable controls and labels, cut-face visibility and retained model state. The reports record the tested phone, desktop and narrow-host layouts and their themes.
- The idle regression audit again passed its 1,200 drawing frames and deliberate-input checks. Saved investigation and application checks also passed.
- All three source copies match SHA-256 e0b933082ee88ae094b4c11131ce08c6375393fae798eca2fd3229a71c256488. Both English tectonic namespaces match, with three added labels and retained values preserved. Syntax and Git whitespace checks pass. The rate-and-time calculation is unchanged. Renderer changes are confined to arc visibility and numbered annotation labels; the rest of the renderer is identical to the preceding pass.

The initial candidate's 2D number boxes overlapped when scaled to a 280-pixel host. That failing result and candidate are retained beside the corrected passing reports. The final spacing uses the actual label height plus clearance.

The first controlled-RAF browser run also sampled labels during an overhead-to-cut-face resize. The final harness explicitly waits for the renderer dimensions and camera aspect to match the canvas, then repaints before testing label collisions. The earlier failure receipts are preserved. Settled captures and assertions cover the actual installed source and registries, with no candidate overlay or fallback-key allowance.

Changes remain uncommitted and unstaged. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-arc-overview/verification.json) links the final test, browser and asset results.


## Projecting selected earthquake observations

Selecting an earthquake in the graph or observation list now offers Show this event on the 3D cut face. The deliberate action opens an exposed section, focuses its nearby explanation and brings the model into view. Selecting an event alone preserves the current view, focus and page position. After the learner enables the projection, Previous, Next and graph selection update it within the same sample without navigating the camera again.

A hollow cyan diamond marks the exact recorded distance and depth. A dark halo keeps its outline visible; dashed distance and depth guides use darker cyan on light rock and brighter cyan in dark mode. The diamond remains at least 14 CSS pixels wide. Its Projected event caption shares the model's label placement logic, including when the slab inspector and Whole process trace are visible. The spherical live earthquake dots stay intact. The competing newest-focus label and guides pause while the sample projection is visible and return when it is hidden.

The model explanation identifies the source as either the fixed checked sample or the current observation log. It states that position along the boundary was not recorded. Moving the cut moves the projection plane; the display does not invent an along-boundary coordinate. Events outside the finite block keep their exact coordinates in the graph and list and are not clamped to a visible edge. Rear, overhead and uncut views hide the annotation and offer an explicit reveal action. The source and visibility explanation remain near the model while it loads or falls back to the cross-section.

Hide projection moves focus to the visible canvas. Closing the observation log, revising or replacing its sample, resetting and switching boundaries clear the projection request. Returning to the same view preset supports a fresh deliberate activation. The new control references a model frame that exists in 2D, 3D and loading states. Idle rendering and ordinary event selection do not save evidence, award progress or ping.

### Verification of the selected observation projection

- 816 distinct focused tests passed across 46 files. 19 added cases cover exact signed and decimal coordinates, checked and live sources, deliberate activation and focus, quiet selection and idle behavior, camera and cut visibility, out-of-block observations, loading failure, theme contrast, annotation cleanup and retained rock geometry.
- 94 browser checks passed against the final installed source. Native captures and measurements cover nine phone, desktop and narrow-host layouts, light, dark and contrast settings, selected sample projections beside live foci, geological and arc annotations, and a mounted resize between wide and narrow hosts.
- The idle regression audit again passed its 1,200 drawing frames and deliberate-input checks. Saved investigation and application checks passed.
- All three source copies match SHA-256 cffa09cfd44c7e2fbfe4f9f9003d6e6b7e9800864c3f0ceb260e4424ec4b2761. Both English tectonic namespaces match, with 13 added labels and retained values preserved. Syntax and Git whitespace checks pass. The rate-and-time calculation, plate geometry, rock section construction, camera calculation and arc process functions are unchanged.

The initial fixture reports are retained. Corrections made them inspect actual drawable children in a hidden projection group, preserve valid out-of-block metadata for visibility gating and avoid treating Three.js shared sprite geometry as owned disposable geometry. Final unit and native browser reports test the installed source. The browser audit uses no prototype source overlay or fallback-key allowance.

The first full batch's existing rolling-log test took 113.9 seconds while the browser audits were active, exceeding its 90-second limit. With those audits finished, the same installed source and test passed in 14.4 seconds. Both receipts are retained. The translation audit also gained an explicit route from the new model label template to its substituted renderer text. It verifies the visible label consumer and event number instead of exempting the new key. The original focus-label route remains covered. Three artifact mutations confirm that missing substitution, disconnected visible text and a signature without the corresponding model word still fail that audit.

Changes remain uncommitted and unstaged. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-observation-projection/verification.json) links the test, browser and asset results.


## Projecting an earthquake sample pattern

The observation overview now offers Show this sample on the 3D cut face. It projects every eligible record in the displayed sample at its exact distance and depth. The source remains explicit: a checked sample stays fixed, while a requested live pattern follows the latest 200 records. Saved comparisons store summaries and are not used as point coordinates.

Small hollow circles show the sample's shallow, intermediate and deep bands using the graph's colors. A nearby text key gives the depth ranges. The existing larger cyan diamond can highlight one selected event inside the pattern. Coincident observations stay at the same location; the explanation makes clear that the counts describe records rather than separately visible symbols. No fitted line, slab ribbon or invented position along the boundary is added.

The shared model card reports total events, events within the finite block and events beyond it. Out-of-block records retain their coordinates in the graph and list. The cut-face explanation remains available when the view is hidden, the 3D model is loading or the cross-section fallback is in use. Moving the cut moves the projection plane without supplying an unrecorded position along the boundary.

Only deliberate Show actions open and navigate to the exposed cut face. Selection, deselection, a rolling-log replacement and the Include or Hide sample pattern toggle update locally. Expiring a selected live event removes its diamond while retaining the requested live sample. Closing the log, changing boundary, resetting, checking a replacement sample and revising clear the request. Hide projection returns focus to the visible canvas.

Two retained marker batches keep up to 200 circles inexpensive to update. Their outlines stay at least eight CSS pixels wide; colors, camera-facing orientation and matrices update without rebuilding the rock. Camera movement checks face visibility using the validated sample count instead of scanning the records again. The newest live-focus annotation pauses while either recorded projection is visible, and the spherical live events remain intact. Hiding both projections restores that annotation. Invalid input, including sparse array holes, cannot leave stale markers behind.

### Verification of the sample pattern

- 836 distinct focused tests passed across 46 files. Twenty added cases cover exact coordinates, depth thresholds, duplicates, finite bounds, malformed inputs, same-length rolling samples, independent selection, lifecycle, camera visibility, retained geometry, resize, disposal and quiet idle behavior. The existing UI and renderer cases are preserved.
- 97 checks passed in native browser, idle, investigation report and application audits against the installed source. Browser captures cover phone, tablet, desktop and narrow hosts, light and dark themes, contrast settings, checked and rolling live patterns, coexistence with selected events and geological labels, view gates and loading failures.
- The idle audit passed 1,200 drawing frames without repeated progress awards or pings. Source mirrors and both English registries match; twelve new labels preserve existing values. The rate-and-time calculation and rock construction remain unchanged.

Changes remain uncommitted and unstaged. Results are recorded in [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-sample-pattern/verification.json).


## Reading sample events beside the model

The earthquake projection card now includes an event chooser and Previous, Next and Clear selection controls. They share the graph and coordinate list's selected observation, so the larger cyan diamond follows the same exact distance and depth. A learner can compare several records beside the cutaway without repeatedly scrolling back to the lower observation panel.

The chooser contains every record in the displayed sample, including events beyond the finite block and coincident points. It begins unselected. Checked records remain fixed; live selection follows the same observation as its list index changes and clears when that record expires. Clearing selection leaves a requested whole-sample pattern visible. These actions preserve the camera, cut, zoom, model time, playback, estimate and saved evidence.

Return to graph and event list deliberately focuses the existing lower event chooser with preventScroll, then brings it into view. It retains the projection request. Previous and Next return focus to the local chooser when the clicked button becomes disabled at a list boundary. Clear focuses the local chooser when the whole pattern remains, or the visible model canvas when clearing removes the selected-event panel. Choosing the blank option uses the same safe focus behavior.

The new controls sit within the existing projection card and use a native select, distinct labels and wrapping buttons. Each control has a target at least 44 pixels tall. Selection changes stay outside live announcements and do not save records, award progress or ping.

### Verification of linked sample inspection

- 856 distinct focused tests passed across 47 files. 20 new cases verify linked selection, exact coordinates, coincident and out-of-block records, fixed and rolling sources, expiration, navigation, focus, fallback and quiet callbacks. Existing observation, projection and translation fixtures remain unchanged.
- 111 browser checks passed against the installed source. The local inspection audit covers 8 phone, desktop and narrow-host layouts and records actual WebGL marker positions, control wrapping, target sizes, explicit return focus and retained model state. Saved investigation and application checks also pass.
- The idle audit again passed 1,200 drawing frames without repeated rewards or pings. Painted screenshots were inspected, with nonblank saved model regions checked before accepting captures.
- All three source copies match SHA-256 9394aa434b7f5e1979b95bf9a8c60824ee1f4e149db5dc9b7a01514b744107bb. Both English tectonics namespaces match, with two added labels and all existing values retained. The renderer, plate geometry, arc traces, rate-and-time calculation and code outside the boundary simulator are byte-unchanged from the preceding pass. Syntax and Git whitespace checks pass.

Changes remain uncommitted and unstaged. The consolidated [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-sample-inspection/verification.json) links the final test, browser, asset and delivery results.


## Keeping model captions clear of sample events

Movable geological, arc-process and selected-event captions now reserve the full footprint of every visible recorded earthquake circle, including its halo. A sample observation can no longer disappear beneath these captions in the tested crowded views. The same leaders keep their exact geological or recorded targets. Earthquake coordinates, coincident records, depth colors, marker sizes and instance matrices retain their existing meaning. Depth-scale captions keep their existing positions at the left of the frame.

The nearest-placement search visits candidate rows and merges horizontal exclusion intervals instead of trying every combination of obstacle edges. It picks the closest available position within the canvas, with consistent ties. This keeps a 200-record sample practical. Exact gap boundaries remain available; using the same decimal endpoints for candidate generation and membership avoids rounding a legal position into an obstacle. Hidden, rear, overhead and uncut views remove the sample reservations, and revealing the face restores them.

### Verification of sample caption clarity

- 537 focused tests passed across 16 files on the installed source. The 23 new cases cover touching intervals, fractional boundaries, completely blocked rows, nearest placement, deliberate points beneath earlier captions, arc and slab annotations, exact signed coordinates, duplicates, 200 records, geometry reuse, resizing, zoom, view gates and 1,200 settled frames.
- 94 browser checks passed. Native WebGL checks cover eight phone, desktop and narrow-host layouts in light, dark and contrast settings, exact projected halo vertices, selected diamonds, caption clearance, rotation and cut movement, dense samples, retained geometry and quiet idle. Ten painted native captures were inspected; saved investigation and application audits also pass.
- The original reward audit passed its 1,200 idle frames and deliberate-input checks without repeated awards or pings. An independent comparison of the final helper passed 20,000 general layouts and 10,000 fractional-edge layouts.
- All three source copies match SHA-256 1808fec8d1376d1fde62c2d4b66ccb00794ad73e0beacede3aa8e907c30ca730. Reversing the placement helper, sample footprint reservations and movable-caption search reproduces the preceding source byte for byte. Rock construction, event coordinates, React controls, model calculations, saving and reward callbacks therefore retain their existing code. The two tectonics translation namespaces and all 47 existing fixtures are preserved. Syntax and Git whitespace checks pass.

The initial source passed its existing test selection but independent review found a fractional-boundary case that could displace a caption to the far frame edge. The corrected source includes that exact regression. Earlier receipts remain saved. Final test validation also records an initial configuration-cache error and a V8 allocation failure; using native configuration loading, isolated workers and a temporary directory inside this workspace produced the passing final reports.

Changes remain uncommitted and unstaged. Results and provenance are recorded in [verification.json](C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-6/tectonics-caption-clarity/verification.json).


## Clearer feedback for a checked slab-angle sample

- Replaced the long default result paragraph with two readable angle cards. Dashed and solid swatches match the plotted estimate and data fit, and the cards adapt to narrow containers.
- Compare the exact saved estimate with the unrounded fit. Feedback explains steeper, shallower, equal within numerical rounding, or opposite signed directions; differences below 0.1 degrees retain their direction. Tiny negative fits stay visibly signed.
- Show the number of captured earthquakes used at 70 km or deeper and explain that shallower plotted observations are excluded from this angle fit.
- Added a collapsed, native keyboard-accessible method explanation: the line is constrained through zero distance and depth, and eight qualifying events are an activity threshold. The existing geological explanation remains available inside it.
- Kept fit math, coordinates, renderer, Check/Revise handlers, persistence and rewards unchanged. Added 15 English keys in both registries while retaining current unrelated namespaces.
- Validation: 367 focused tests across 15 files, including 28 new angle-feedback cases; 101 browser checks, eight layouts and 10 painted captures. Checked native keyboard disclosure, 320/390 px layouts, themes, contrast, a 430 px embedded host, decimal restoration, fresh capture/recheck and 1,200 paused frames without repeated saves, rewards, notices or audio starts.
- Verified all three source mirrors, all 48 existing fixtures, exact two-region source scope, and unchanged tectonics index namespaces. Changes remain uncommitted and unstaged.


## Signed distances and bounded slab-fit lines

- Fixed negative fitted lines extending through the left depth-axis gutter. Each signed fitted line now ends at the first distance or depth edge of the existing plot rectangle. The raw fit and equal kilometre scales stay intact.
- Handle positive and negative zero slopes as finite horizontal lines. A valid sample with a subnormal negative coordinate can underflow to negative zero; its exact observations remain stored and inspectable while the graph renders finite coordinates.
- Added a readable minus-sign label at the -150 km distance edge, aligned into the existing gutter. The zero boundary retains its unique stronger dashed reference, and ordinary positive fit geometry is unchanged.
- Explain negative and positive distances in the existing origin paragraph when the displayed sample contains a negative coordinate. The SVG now references that paragraph alongside its existing scale/inspection and point-selection descriptions.
- Kept event selection, captured/live sample separation, 3D submissions, persistence, Check/Revise controls and rewards unchanged. Added one English key in both registries while preserving current unrelated namespaces.
- Validation: 394 focused tests across 16 files, including 27 new signed-graph cases; 114 browser checks across eight layouts and 13 painted captures. Actual label rectangles stay inside the SVG and separate from neighbouring labels; signed points, guides and samples remain exact through selection and playback. Verified 1,200 paused frames without repeated saves, rewards, pings, notices or audio starts.
- Independent review verified the exact five source edits, 18 endpoint arithmetic cases and the negative-zero reproduction. Preserved all 49 existing fixtures and all three source mirrors. Before/after inspection confirms that negative fitted lines clear the depth labels. Changes remain uncommitted and unstaged.


## Direct earthquake selection in the 3D sample

Learners can tap a visible hollow sample circle to inspect that same original event in the model, graph and coordinate list. Selection uses the displayed camera and exposed cut face. Coincident circles choose the first recorded event, and the native chooser still reaches every event. Drags, canceled gestures and stale sample or camera frames do not select a record.

A short tap keeps its local position when surrounding model text moves the canvas. Canvas size changes require a fresh tap. This lets learners inspect a fixed checked sample while the separate live log grows, including the layout change when playback first starts.

The selected event has a compact semantic distance/depth readout with exact raw values, larger tabular numerals and wrapping for long decimals. The readings stack on narrow cards and sit beside each other when space allows. Visibility explanations and whole-sample counts stay separate. Selection remains local and quiet, with no rewards, pings, saved evidence or automatic announcements.

Validation: 84 distinct focused tests across 4 files and 73 browser checks passed. The original four-file run passed 83 cases; one readout assertion exceeded its 300000 ms budget. Its raw failure report, log and receipt were preserved. Only that exact assertion was rerun with a 600000 ms test budget and passed; the other 11 readout cases were skipped in the retry and retain their original passes. Tests ran in isolated threads. A reviewed temporary preload increased only Vitest’s parent worker startup watchdogs from 60/90 seconds to 300 seconds; test-worker and product timers remained native. Native WebGL checks covered mouse and touch input, eight light/dark/contrast/enlarged layouts, complete 200-event samples, overlapping records, live and checked samples, camera/source freshness, local tap positions through layout shifts, and idle behavior. All eight captures passed painted-output and hash checks; representative images were visually reviewed. All 50 prior tectonic fixtures were preserved. Changes remain uncommitted and unstaged.


## Reading guides and optional event interpretation

Depth ticks, depth bands, caption leaders and the selected-event guides now use clear ink for the current light or dark theme. Theme changes update retained materials while preserving measurement coordinates, rock geometry, caption textures and the camera. Rebuilt cut faces and guides receive the current palette.

The tap instruction now sits directly above the earthquake chooser. An optional, keyboard-accessible “Interpret this event” disclosure explains the selected event’s depth band. A checked convergent sample with a valid angle fit also shows whether the event meets the 70 km fitting threshold. Negative-distance guidance refers to the graph’s zero-distance line and remains accurate when the 3D block turns. Live logs and rejected saved samples do not show checked-fit membership claims. The existing reminder still asks learners to compare several events before inferring a slab angle or boundary type.

The disclosure starts closed, stays open when learners choose another event, and disappears when selection is cleared. Reading, changing themes and leaving the diagram idle remain quiet, with no repeated rewards, pings or automatic announcements.

Validation: 105 distinct focused assertions across six files and 101 browser checks passed on the final source. The initial run reported 85 passes, two guide failures caused by disposal-spy history retained across cases, and one readout timeout at 600000 ms. The clarity fixture did not start because its native worker startup timed out. The original failure report, log and receipts were preserved. The new guide fixture now restores spies immediately after unmount without changing any behavior assertions; all seven guide cases were rerun. The first clarity follow-up again failed at worker startup before collecting any assertions; its zero-test report and log were preserved. The final 17 clarity cases passed. A later readout attempt ended before test startup after an OS thread-resource panic; its log was preserved with an unconfirmed exit and no structured report. A separate recovery child passed the exact failed readout case and exited successfully. Its wrapper then exited with a parser assertion because the JSON reporter labels the 11 intentionally filtered cases “skipped” while also counting them as pending. The verifier accepts those exact filtered names only after confirming their original passes; the wrapper failure and original runner, receipts, report and log remain preserved. Both successful Vitest child runs used a 900000 ms test budget and a reviewed 900000 ms parent startup allowance. The other 80 accepted initial passes were retained, including the 11 readout cases intentionally skipped by the exact retry filter.

The native WebGL review included retained-object and camera checks, exact depth thresholds, signed distances, valid and rejected saved samples, live and nonconvergent events, keyboard behavior, and idle behavior. All 11 saved captures passed painted-output and hash checks: eight existing responsive/theme layouts plus three open interpretation layouts. 11 captures were directly inspected for visual clarity. All 52 prior tectonic fixtures were preserved. Focused tests used isolated native threads and a 300000 ms hook budget. Reviewed temporary preloads increased only Vitest’s parent worker startup watchdogs from 60/90 seconds to 300 seconds initially and 900 seconds for the final clarity/readout runs; test-worker and product timers remained native. Changes remain uncommitted and unstaged.


## Nearby depth key, guide patterns and keyboard focus

The earthquake depth key now sits directly below the scene, ahead of the projection and feature panels. Its three ranges and theme colors are preserved. A short side-view explanation connects the dashed 70 and 300 km lines to the faint depth planes and distinguishes these reading guides from the textured rock layers. The explanation follows the existing scale and surface-view rules and is included in the active canvas description only while visible.

Only the 70 and 300 km tick materials gain a dash pattern. Coordinates, depth planes, classification thresholds, camera controls and recorded measurements retain their original definitions. Line distances are computed during the existing guide build and retained between changes.

The keyboard focus indicator sits inside the clipped 3D canvas, with a gold outline backed by a dark inset border. Its scoped focus rule disables transitions so the indicator appears immediately under reduced motion. Forced-colors uses the system Highlight color. Shortcut metadata exposes the existing arrow, Home and Shift-arrow controls.

### Validation

- All 50 focused assertions passed across five regression files on the final source, including twelve new geometry and UI cases. The 54 prior tectonics fixtures remained byte-exact.
- All 27 native Chromium checks and eleven existing idle/gesture checks passed on the installed source. Native checks exercised all three boundary modes, standalone and full-wrapper keyboard focus, exact saved coordinates, side/hidden-scale/overhead/2D guidance, and 1,200 quiet paused frames.
- All five painted WebGL captures were reviewed directly: light 320 px, dark 390 px, contrast 320 px, light 1100 px, and light 390 px at 200% zoom. No browser errors, missing strings or horizontal overflow were reported.
- Three source copies match SHA-256 `a82671d18f5c0b7a21c6f232359e560a3ea7cb70f7c2c9768996c9d6eb160665`. Both English registries contain the two new matching keys; unrelated registry text was preserved. Syntax, scoped whitespace, HEAD and index checks passed.
- An initial native focus check caught a transition introduced by the shared reduced-motion stylesheet. CSSOM diagnostics recorded the active outline transitions and their correct target values. The canvas focus transition was disabled, then all fifty assertions and the unchanged native checks were rerun. Initial passing test results, the failed browser result, and both focus diagnostics are preserved in `tectonics-next/`.
- A later browser run caught a QA expectation that omitted the existing one-time 3D ready announcement after an explicit return from 2D. The helper now requires all six legitimate notices in exact order, rejects extras, and retains the same idle checks. Product source stayed unchanged; the failed result and independent correction review are preserved.
- Direct visual review caught a 200% zoom screenshot crop that counted scrolling twice and omitted the scene/key. The artifact-only capture now uses final document coordinates and proves saved scene pixels against an independent native canvas screenshot, excluding the background. All five final screenshots were reviewed again. The earlier crop and passing browser receipts are preserved; product source stayed unchanged.
- The focused test runner uses isolated native threads with a 300-second test/hook limit and the previously reviewed 900-second parent startup allowance for this slow Windows host. Installed Vitest code and worker/product timers were unchanged.

Detailed evidence is in the task workspace's `tectonics-next/` folder. Changes remain uncommitted and unstaged.


## 2026-10-07 — Depth captions yield to fixed plate evidence

The 3D depth ruler now places its captions after reserving plate identities, motion arrows, inspected features and observation markers. Its surface caption previously covered plate A at both 141 and 266 CSS pixels. Captions stay in their left column and depth order, with leaders still ending at the exact ruler depths. Two bounded placement passes fit the complete stack; an infeasible column keeps the original whole stack. Rock, guide geometry, records, and reward logic are unchanged.

Validation: 58 focused assertions across five fixtures; 31 native Chromium checks and five reviewed captures covering light, dark, contrast, desktop and 200% zoom; 11 original idle reward checks. Native narrow checks cover all three boundary types, actual marker footprints, exact leader targets and resize recovery. Both unit and browser idle checks retain data and produce no extra drawing, rewards, pings or saves through 1,200 paused frames. All 56 earlier fixtures were preserved. Changes remain uncommitted and unstaged.


## 2026-10-07 — Visual rock key beside the model

Moved the existing rock and motion disclosure into the scene key directly beneath the model. Four entries now explain plate letters and arrows, paired crust and mantle swatches, the transparent surrounding mantle, and earthquake dots. The layer swatches use the model's oceanic and continental colors and proportions for each boundary type. The existing boundary-specific cue remains at 14px, and the disclosure stays closed initially.

The plate definition follows [USGS's description of the Earth's interior](https://pubs.usgs.gov/gip/interior/index.html). The explanation of solid mantle flowing over geologic time follows [USGS's mantle FAQ](https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma). Transparency is explained as a viewing choice.

Validation: 10 focused tests across the existing depth-key fixture and 3 new rock-key cases; 19 native Chromium checks with 5 directly reviewed captures covering light, dark, contrast, desktop and 200% zoom. Native Enter/Space operation, boundary-specific swatches, reflow, selected-event retention and 1,200 paused frames passed. Opening and closing the key preserved the real camera and saved evidence without extra draws, rewards, pings or saves. All 57 earlier fixtures and the renderer/reward code were preserved. The changes remain uncommitted and unstaged.


## 2026-10-09 — Visible labels for 3D camera controls

The four rotation buttons now show Turn left, Turn right, Tilt up and Tilt down beside their direction icons. Existing translated labels serve as both visible text and accessible names; decorative icons are hidden from screen readers. A wrapping grid and 44px minimum targets keep the controls readable and usable on narrow screens and at 200% zoom.

Validation: 6 existing tests passed, plus 25 native Chromium checks and 5 directly reviewed captures across light, dark, contrast, desktop and 200% zoom. Enter and Space activate all four buttons in the expected directions. Camera changes preserve model time, saved points, selected observations and rock geometry. A further 1,200 paused frames produce no extra rendering, saves, rewards or pings. All 58 existing tectonics fixtures and the English namespace remain intact. The changes remain uncommitted and unstaged.


## 2026-10-09 — Cutaway positions and endpoint shortcuts

The cutaway slider now displays its current position from 0 to 100. Named Center section and Whole block buttons explain the endpoints and let learners reach them while retaining their chosen angle and zoom. Active styling follows the exact cut state; intermediate slices leave both endpoints unselected. Updated help explains that the controls preserve model time.

Validation: 7 focused tests, including 4 new behavioral cases, and 32 native Chromium checks passed. Five captures were reviewed across light, dark, contrast, desktop and 200% zoom. The checks cover slider keyboard input, endpoint activation, saved-event projection guidance, preset and view synchronization, and 1,200 paused frames. Repeated presses on an active endpoint produce no extra draws, saves, rewards or pings. All 58 earlier fixtures remain intact. The source mirrors match, and the English namespace adds only the five new control strings. Changes remain uncommitted and unstaged.


## 2026-10-09 — Clear run-reset consequences

The simulation reset is now labeled Reset run. Its existing explanation that reset clears the saved checked slab sample is visible beside the controls and linked to the button for screen readers. Play, Reset run and Advance use at least 44px targets and reflow into a single column when space is limited. Reset, play, step, camera, physics, reward and timer behavior are unchanged.

Validation: 14 existing focused tests and 43 native Chromium checks passed. Ten captures were reviewed across light, dark, contrast, desktop and 200% zoom layouts. Keyboard checks confirm Reset view preserves the investigation and Reset run clears its saved sample once while retaining the camera. Another 1,200 paused frames produce no further saves, rewards, pings or announcements. The existing slab-inquiry fixture changes only its reset-button selector; the other 58 fixtures remain byte-for-byte intact. Three source mirrors match, and both English registries add only the Reset run key to the tectonics namespace. Changes remain uncommitted and unstaged.


## 2026-10-09 — Visible playback state

A quiet state indicator now shows Simulation paused or Simulation playing above the run controls. Text, a static decorative symbol and distinct styling make the current state visible, including when checking a sample pauses the model. The Play/Pause button references the state as its accessible description. The indicator uses existing translated strings and the existing running state; it adds no timers, effects or live announcements.

Validation: 19 existing focused tests and 52 native Chromium checks passed. 11 captures were reviewed across narrow, desktop, dark, contrast and 200% zoom layouts, including the playing state. Checks cover native keyboard activation, automatic sample-check pauses, both playback states and quiet idle behavior. All 59 existing fixtures and the tectonics English namespaces remain unchanged. Three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-09 — Readable model measurements at narrow widths

Model time and movement now use adaptive cards: two columns on wide screens and one column when space is limited. The values use 20px tabular numerals, with wrapping for every boundary type. The existing labels, numerical formatting, units, semantic definition list and quiet reading behavior are unchanged. A baseline browser probe confirmed that the old fixed columns clipped labels and overflowed the time value at 390px with 200% CSS zoom.

Validation: 23 existing numerical and idle tests passed. Eighteen targeted native Chromium checks cover all three boundaries in five light, dark, contrast, desktop and zoomed layouts; all 15 final readout captures were reviewed. Checks retain the exact zero, one-step and 17-step readings, preserve values through repeated resizing and observe no reading mutations or callbacks during 1,200 paused frames. All 59 existing fixtures and both tectonics English namespaces remain intact. Three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-09 — Boundary choices show relative motion

The boundary chooser now pairs each name with a static plate-motion diagram and its existing translated motion description. Arrows point toward each other for convergent, away for divergent, and in opposite parallel directions for transform. A checkmark identifies the selected option, while darker selected colors improve white-text contrast. Buttons retain native pressed state, use explicit accessible names and linked descriptions, and wrap at narrow widths with at least 44px targets. The boundary switch handler and all model behavior remain unchanged.

Validation: 19 existing focused tests and 25 native Chromium checks passed. Five cropped chooser captures were reviewed across light, dark, contrast, desktop and 200% zoom layouts. Native keyboard selection, repeated active selection, sample retention, text contrast and paused idle behavior were checked. All 59 existing fixtures and both tectonics English namespaces remain unchanged; three source mirrors match. The first test preflight ran before installation finished and rejected the old source before collecting tests; the unchanged runner passed after installation completed. Changes remain uncommitted and unstaged.


## 2026-10-09 — Visible plate-rate scale and linked context

The plate-rate slider now shows its 1–15 cm/year bounds and a larger, wrapping current-rate label with tabular numerals. The visible label is linked to the input. Screen readers receive the current value with its units and the existing slow, medium or fast description. The slider target is at least 44px tall. All wording uses existing translations; the rate handler, numerical model, reward logic and timers remain unchanged.

Validation: 19 existing numerical and slab-inquiry tests and 25 native Chromium checks passed. Five captures were directly reviewed across light, dark, contrast, desktop and 200% zoom layouts. Native Home, End and arrow keys retain exact settings and only the existing rate announcement. A paused 1 cm/year interval gives 0.6 km, and changing to 15 cm/year for the next interval gives 9.6 km total. Another 1,200 paused frames leave controls and readings unchanged with no saves, rewards, pings or announcements. Exact inversion proves the single source region change, all 59 existing fixtures and both English namespaces are unchanged, and three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-09 — Recognizable 3D angle presets

The Oblique, Cut face and From above presets now pair their existing labels with simple static view diagrams. A visible Choose a useful angle heading introduces the group, and a checkmark identifies the matching camera preset. The checkmark switches immediately, including with the shared reduced-motion styles. The grid wraps into fewer columns when space is limited, with at least 44px targets. Only the matching preset links to the existing view explanation for screen readers. The same preset handler retains its existing zoom-reset and cutaway behavior.

Validation: 41 existing camera, zoom, cutaway and depth-key tests and 30 native Chromium checks passed. Five captures were directly reviewed across light, dark, contrast, desktop and 200% zoom layouts. Real 3D camera changes, repeated preset activation after zoom, manual rotation, saved evidence and 1,200 quiet paused frames were checked. Exact inversion proves the single source-region change; all 59 existing fixtures and both English namespaces are unchanged, and three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-09 — Refined 3D model label badges

The plate model now uses rounded dark label badges with a fine slate rim. Each label texture is painted at twice its previous resolution and uses linear filtering without mipmaps. Logical dimensions, font, text colors and screen placement are preserved so the existing caption layout continues to protect arrows, depth guides and measured points. The change is confined to the plate model label painter.

Validation: all 60 existing tests in five 3D clarity, caption placement, depth caption, motion label and reading guide fixtures passed. The initial wrapper expected 48 plain test declarations and reported a count mismatch after Vitest exited successfully; an independent report verifier includes all parameterized cases and preserves the original evidence. Native Chromium passed 39 checks with seven real WebGL captures and seven directly reviewed model crops, covering light, dark, contrast, desktop, 200% zoom and all three boundaries. Texture pixels and logical metrics were checked; camera zoom retains labels and saved evidence, and 1,200 paused frames produce no changes or reward/ping callbacks. All 59 existing fixtures and both English namespaces are intact; the three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Sharper enlarged plate and volcano models

Both 3D renderers now size their drawing buffers from the displayed canvas scale as well as device density, while keeping the existing density cap of 2. Device-pixel observation follows live CSS zoom, with the existing content-box observation as a compatibility fallback. A window resize listener also follows display-density changes and is removed on unmount. Camera aspect, label placement and picking retain logical canvas dimensions; volcano point sizes use the corrected density. No timers or polling were added.

A native baseline probe confirmed that 200% CSS zoom displayed the plate canvas at 282×600 while its drawing buffer was only 141×300, and the volcano canvas at 342×600 with a 171×300 buffer. Validation: 87 existing camera, picking, observation, depth caption and volcano tests and 52 native Chromium checks passed. Ten model captures were directly reviewed, including the plate views, all three boundaries, and light/dark enlarged volcano cutaways. Checks cover backing-buffer dimensions, native viewport resizing, live CSS zoom with a fixed logical box, volcano point sizing and resize cleanup. Saved evidence and camera state are retained; 1,200 paused frames for each model stay quiet with no extra draws or plate reward/ping callbacks. Independent review found no issues. All 59 fixtures and both English namespaces remain intact; three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Cleaner volcano annotation textures

The volcano label painter now uses twice the backing resolution with linear texture sampling and no mipmaps. All 14 depth, anatomy and eruption badges keep their original logical dimensions, pill shapes, colors and placement. Labels, leaders, slice intersections, selection outlines, camera framing and model geometry match the native baseline exactly across 11 cases. The change adds no frame work or callbacks.

Validation: 12 existing volcano clarity and inspection tests passed. The installed baseline and candidate each passed 46 native Chromium checks; all 11 candidate model images were directly reviewed. Coverage includes phone and desktop sizes, light and dark themes, 200% zoom, all three magma compositions, selected dikes/chambers, closed and offset slices, and frozen eruption stages. Every scene checks all 14 texture dimensions and logical aspects. Nine inactive paused scenes each stay unchanged through 1,200 frames with no draws or extra inspection callbacks. Frozen active eruptions preserve state and callbacks through eight frames; they retain their existing redraw behavior. The initial baseline check incorrectly expected those active scenes to stop drawing; its failed evidence is preserved, and the expectation was corrected before installing the change. Independent review found no issues. All 59 fixtures and both English namespaces remain intact; three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Held eruption inspection without repeated repainting

An active paused eruption now redraws only when its source tick or a view control changes. Initial entry, backward resets, camera movement, zoom, slicing, labels, theme, feature selection, resize and composition updates remain responsive. The stop branch explicitly requires an inactive eruption, so an unchanged held frame cannot be mistaken for completion. Running eruptions retain their existing camera easing and rendering. Motion, particles, rewards and ping paths are unchanged.

Three new behavioral regressions each reproduced 1,200 unnecessary baseline draws (1,206 total instead of 6). The candidate passed all 26 focused tests across four fixtures and 52 native Chromium checks. Eleven reference model views preserve their exact PNG bytes, camera, geometry, labels and slice state. A twelfth capture was directly reviewed after naturally advancing an eruption to tick 130 with real particles and visible ash/lava/gas callouts. Its held image, particle buffers, model state and inspection callbacks remain unchanged through 1,200 frames with no draws, including after hidden visits. View controls, paused stage changes, all three compositions, stop and deliberate restart each render their requested update and settle again. Resume advances from tick 130 to 131 without a catch-up. Independent review approved source and validation evidence. All 59 existing fixtures and both English namespaces remain intact; the new idle fixture contains three tests and all three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Precise depth ruler junctions

The plate block now marks the exact surface, 70 km, 300 km and 700 km leader targets with small rectangular ruler ticks. A 2 × 6 logical pixel colored core and 4 × 8 navy backing keep the junction visible where captions sit away from the block. The ticks face the camera and retain their logical size through rotation, zoom and native canvas resize. Existing labels draw above the marks; an overlapping rail caption keeps priority on narrow canvases. Rectangles distinguish the ruler from round earthquake samples. The existing depth-scale controls and overhead view govern visibility. The scale group disposes the new meshes and materials on rebuild or unmount.

All 55 focused tests pass across clarity, picking and depth-caption fixtures. Baseline and candidate each pass 36 native Chromium checks with eight model captures. Direct visual review confirms the clearest benefit along long depth leaders in the desktop views. Changes to native pixels are confined to the small ruler bounds, and the overhead and hidden-scale images match the baseline exactly. Camera, existing geometry, labels, leader targets and source earthquake records match their baseline footprints. Each view stays quiet through 1,200 unchanged frames with zero extra draws or inspection notifications. Rotation, theme changes and resize reuse the ruler resources. Independent review approved source and validation evidence. All 60 existing tectonics fixtures and both English namespaces remain intact, and all three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Radial beds in offset volcano cutaways

The exposed cone now evaluates its layer shading using both horizontal world coordinates. Previously, using x alone repeated the center section pattern on every slice: moving the cut away from the axis left pointed center-section bands inside a lower, narrower exposed cone. The new radial distance makes those bands curve with the offset slice for basaltic, andesitic and rhyolitic edifices. Existing palettes, layer thickness, terrain noise, gully/wobble approximation, horizontal country rock, geometry and model behavior remain intact. This is a correction to schematic shading, with no added meshes, allocations, uniforms, timers or callbacks.

All 26 existing focused tests pass across four volcano clarity, inspection, eruption and idle fixtures. Baseline and candidate each pass 76 native Chromium checks with 17 fixed scenes and one naturally advanced eruption capture. All 18 candidate images were directly reviewed. Front and rear offset slices for all three compositions, plus an offset selected chamber at 200% zoom, show the corrected layers; every changed native pixel remains in the exposed above-ground cone. Ten center or closed reference images retain their exact PNG bytes, including selected dikes, dark mode, 200% zoom, frozen eruption and collapse. Existing geometry, camera, slice state, label metrics and texture bitmaps match their baseline footprints. Each fixed scene remains quiet through 1,200 unchanged frames, and held view controls, hidden return, resume, stage changes and restart retain their existing behavior. Independent review approved the source and pinned validation evidence. All 60 fixtures and both English namespaces remain intact, and three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Clearer volcano annotation connectors

Volcano labels now connect to their anatomy with a thin navy backing in light mode. The existing pale or selected-color line stays on top, so the connection is visible across white canvas, pale country rock and darker beds. Each backing projects the existing endpoints into screen space and uses a constant 2.5 logical-pixel width, keeping the weight consistent across phone, desktop, aspect ratio and 200% zoom. All 14 backings reuse their owned geometry, material and scratch vectors. Layout begins by hiding them, then restores only successfully placed light-mode guides, preventing stale geometry when a crowded label cannot fit or the theme changes.

All 26 focused tests pass across four existing fixtures. Baseline and candidate each pass 78 native Chromium checks, with 17 fixed scenes and one naturally advanced eruption capture. All 18 candidate images were directly reviewed. Nine light reference scenes improve only within the projected leader corridors; eight dark reference images retain their exact PNG bytes. Original annotation textures, core colors, endpoints, model geometry, camera and slice footprints match their baseline. Four theme transitions reuse every guide resource, and a cramped layout hides unplaced backings through four light/dark states. Fixed scenes and held interactions remain quiet through 1,200 unchanged frames, including an eruption with actual particles. Independent review approved the source and pinned evidence. The three source mirrors match; all 60 tectonics fixtures and both English namespaces remain intact. Changes remain uncommitted and unstaged.


## 2026-10-10 — Warm rock follows magma volumes in offset slices

The volcano rock-cap shader now uses all three spatial coordinates for its warm-rock halo. The chamber distance includes the existing ellipsoid z radius, which is four fifths of its x radius, and the conduit distance uses its circular x/z section. Previously, evaluating x/y alone repeated a conduit-shaped orange stripe on every cut plane, including slices beyond the conduit and drained chamber. Warmth now fades as a slice recedes from those volumes while retaining diffuse warmth in nearby rock. The visual falloff remains schematic; it is not a temperature measurement. Existing halo strengths, taper, eruption uniforms and material palettes remain intact, with no added geometry, uniforms, allocations or clock work.

All 26 focused tests pass across four existing fixtures. Baseline and candidate each pass 86 native Chromium checks covering 19 fixed scenes and one naturally advanced eruption capture. All 20 candidate images were directly reviewed, with before/after pairs for a shield offset and a drained chamber slice. Ten center/closed reference PNGs are exactly preserved; nine offset images reduce the warm tint with no brightened pixels and changes confined to the projected cut-face bounding regions. Exact source inversion proves that only the rock-cap halo and its call changed. Existing shader code outside those regions, geometry, camera, slice state, label textures and all 14 guide backings retain their baseline footprints. Front and rear drained slices hide absent anatomy correctly. Fixed views and held interactions remain quiet through 1,200 unchanged frames, including real eruption particles, hidden returns, theme transitions and crowded labels. Independent review approved the source and evidence. All 60 fixtures and both English namespaces remain intact; three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Volcanic arc captions follow retained cone geometry

The plate model now connects its volcanic arc caption to the highest retained point of the first visible cone. It checks the actual cone vertices and triangle intersections with the slice, so the leader follows an exposed flank when the summit has been removed. If every cone has been clipped away, the arc caption and leader are omitted. Previously, negative cuts could leave the leader pointing to a discarded center volcano or keep a caption after the entire arc was gone. The calculation runs only during the existing scale rebuild and adds no geometry, per-frame work, timers or callbacks. Feature captions retain their existing visibility under the depth toggle and overhead view.

All 90 focused tests pass across six existing clarity, caption, surface, inspection and motion fixtures. Baseline and candidate each pass 84 native Chromium checks with 16 model captures. Direct review covers phone, desktop, light/dark, 200% zoom and eight cuts through or beyond the arc. Every candidate anchor lies on an independently clipped cone triangle at its highest retained height; completely clipped and tangent cases omit the caption. Captions stay bounded and separate. Pixel changes are confined to caption and leader regions, and divergent/transform reference PNGs are exactly preserved. Model geometry, camera, earthquake evidence and ruler footprints match the baseline. Each scene remains unchanged through 1,200 frames with zero extra draws or inspection callbacks, while rotation, zoom, theme changes and resize reuse existing leader/ruler resources. Independent review approved the source and evidence. Initial native attempts and receipts are retained; verification was corrected for degenerate triangle distances and the existing depth-toggle semantics before the final matching runs. All 60 fixtures and both English namespaces remain intact; three source mirrors match. Changes remain uncommitted and unstaged.


## 2026-10-10 — Ridge and fault captions follow retained surface traces

Ridge-axis and transform-fault captions now connect to the actual top surface of their tagged fissure or fault mesh. If a cut removes the center slice, the leader moves to the retained trace at the cut face. A tangent or deeper cut that leaves no positive trace length omits the feature caption and leader. Previously both captions used the fixed point (0, 1, 0), which could sit above the physical trace or inside the sliced-away region. The new helper derives its bounds from existing geometry and runs only during the scale rebuild. It adds no geometry, timers or callbacks. Depth-scale and overhead controls keep their existing feature-caption behavior.

All 90 focused tests pass across six existing clarity, caption, surface, inspection and motion fixtures. Baseline and candidate each pass 84 native Chromium checks with 16 model captures. Native verification independently clips the actual top triangles and checks retained anchor membership, true surface height, complete removal and bounded, separate captions. Coverage includes both boundaries, positive/center/negative cuts, light/dark, 200% zoom, overhead and hidden-depth-scale views. All candidate images were directly reviewed. Pixel changes stay within caption and leader regions; two convergent reference PNGs remain exact. Geometry, camera, earthquake evidence and ruler footprints match the baseline. Each view remains unchanged through 1,200 frames with zero extra draws or inspection callbacks; rotation, zoom, themes and native resize reuse existing caption/ruler resources. Independent visual review approved the result. Negative and extreme cut cases are defensive renderer probes beyond the current 0–100% slider. The negative tangent probe retains the baseline clipping speckle. All 60 fixtures and both English namespaces remain intact; three source mirrors match. Changes remain uncommitted and unstaged.
