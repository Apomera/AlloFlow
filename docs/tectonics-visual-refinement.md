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
