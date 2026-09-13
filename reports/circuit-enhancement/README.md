# Circuit learning bench enhancement

Implemented in `stem_lab/stem_tool_circuit.js` and its identical deployment mirror, `desktop/web-app/public/stem_lab/stem_tool_circuit.js`.

## What changed

- Replaced the large decorative welcome diagram with a compact introduction and direct routes to a starter, presets, and Advanced Simulator.
- Added an optional prediction → measurement → explanation workflow, three guided starting investigations, a saved comparison baseline, and an eight-trial evidence notebook. JSON downloads include the before/after circuits, prediction, current change, and explanation.
- Added 30-step undo/redo for circuit edits, an explicit motion pause, lifecycle cleanup, a component inspector, LED polarity controls, and responsive camera controls.
- Added a rotatable 3D bench using solid geometry projected into SVG. Series paths and parallel rails use the same components and numerical solution as the schematic. Orbit and tilt work with keyboard-accessible sliders, and no new dependency or network load is required.
- Collapsed optional investigation and advanced analysis sections to keep the working bench reachable. Small screens can scroll the enlarged schematic within its own container; the numerical inspector provides an alternative to reading diagram labels.

## Accuracy corrections

One shared solver now supplies currents, voltages, power, component brightness, branch motion, energy budgets, Kirchhoff checks, the inspector, and the response curve.

- Open switches and steady-state capacitors carry exactly zero current.
- Multiple blocking components display undetermined individual voltages instead of inventing a voltage division.
- LEDs use a stated piecewise model with illustrative color-dependent forward voltage, a 10 Ω slope resistance, reverse blocking, and a 20 mA overcurrent coaching threshold. A resistor in a different parallel branch does not protect an LED.
- The response curve samples the actual solver, including LED turn-on, instead of treating every circuit as an Ohmic straight line.
- Removed the incorrectly placed series voltmeter from the voltage-divider preset. Its 12 V supply now divides into 8 V and 4 V across 200 Ω and 100 Ω.
- Increased the starter LED resistor to 470 Ω; its modeled current is approximately 14.58 mA at 9 V.
- Included meter losses in energy and Kirchhoff totals, corrected LED voltage equations, bounded invalid input, and distinguished source-off and below-turn-on states.
- Corrected switch action labels and identified schematic particles as conventional current, opposite to electron drift.

The LED explanation follows the distinction between forward voltage and current-limiting resistance described by [SparkFun](https://learn.sparkfun.com/tutorials/light-emitting-diodes-leds/delving-deeper). Series relationships and the steady-state capacitor explanation are consistent with [OpenStax](https://openstax.org/books/physics/pages/19-2-series-circuits). The 10 Ω slope and 20 mA threshold are explicit teaching assumptions, not universal device specifications.

## Verification

- 65 tests passed across all 13 circuit test files. Added tests cover voltage division, current/energy conservation, open and capacitor branches, LED polarity/turn-on/color/overcurrent, meter loading, invalid inputs, and both representations.
- Headless Chromium exercised starter loading, camera changes without altered physics, prediction baselines, comparisons, explanation/export content, undo/redo, LED reversal, pause, and view cleanup.
- No JavaScript page errors; no axe WCAG A/AA violations in the new workflow, view controls, 3D panel, and inspector.
- At 390 px, document width remains 390 px. Diagram scrolling is contained.
- Reviewed desktop and mobile screenshots and corrected a 3D board layering defect found during visual inspection.
- Source/deployment parity and syntax checks passed.

Reproduce:

```powershell
node node_modules/vitest/vitest.mjs run tests/circuit --maxWorkers=1
node dev-tools/build_sweep_tailwind_css.cjs
node reports/circuit-enhancement/browser-qa.cjs
```

The browser harness loads the actual tool, local React, and the project's compiled Tailwind styles. It is an isolated host, not a complete deployed-application end-to-end test.

## Scope and next simulation stage

The new 3D bench is a spatial representation of the steady-DC model, not a transient or field simulation. The source is ideal, bulbs have fixed resistance, and heating/failure, general transient networks, AC, breadboard hole connectivity, and arbitrary mixed networks are not modeled. A separate analytic time lab now models charging and discharging for one ideal capacitor and series resistance. Advanced Simulator remains the route for more complex circuits.

A further simulation stage should first introduce a node/branch circuit representation and a transient solver with numerical tests, then attach manipulable 3D leads and breadboard terminals to those electrical nodes. Camera geometry must remain separate from electrical connectivity.

## Review artifacts

- [Desktop 3D bench](desktop-3d.png)
- [Mobile 3D bench](mobile-3d.png)
- [Mobile workflow](mobile-workflow.png)
- [Enlarged mobile schematic](mobile-schematic.png)
- [Browser results](browser-results.json)
- [Unit results](pass2-unit-results.txt)
- [Sample evidence export](sample-evidence.json)


## Second improvement pass

- Added a capacitor time lab with analytic charging and discharging responses, a 0–5τ time scrubber, one- and five-time-constant shortcuts, voltage/current/energy readouts, and a named graph with equivalent text measurements.
- The time lab accepts one capacitor, one or more series resistors, and optional closed switches. Unsupported topologies show an explanation and an undoable RC starter. Discharging explicitly assumes the battery is disconnected and a resistor–capacitor loop is closed.
- The equations follow [OpenStax's RC circuit treatment](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits). The model converts microfarads to farads, uses τ = RC, and preserves the small nonzero current at finite times.
- Added precise mA/µA readings alongside the existing ampere readout, direct value editing and switch operation in the inspector, 3D part-selection buttons, and a top camera view.
- Comparisons now identify changed electrical variables, distinguish controlled comparisons from observations involving multiple changes, ignore regenerated component IDs, and align additions/removals correctly.
- Further edits and undo/redo clear stale live feedback. Duplicate comparisons cannot be recorded again while retained in the notebook. Exports carry the changed-variable list and controlled-comparison flag.

Verification: **65 tests passed across 13 test files**. Browser checks also passed for RC charge/discharge, direct 3D editing, top-view camera, comparison classification, duplicate prevention, stale-result cleanup, exports, and motion. No page errors or scoped axe violations; 390 px phone layouts remain within the viewport.

- [RC charging, desktop](rc-charge-desktop.png)
- [RC discharging, phone](rc-discharge-mobile.png)
- [Second-pass test output](pass2-unit-results.txt)

## Third pass: visual refinement

- Rebuilt the spatial bench with a beveled grid tray, mounting screws, shaded source housing, insulated terminals, highlighted wires, cylindrical resistor bodies, glass bulbs, rounded LEDs, capacitor cans, mechanical switches, and meter displays.
- Resistor bands use the standard four-band encoding only when the displayed resistance is exactly representable; other values retain their numeric label without misleading bands.
- Unified the bench, workflow, inspector, and time lab with a navy and mint palette, clearer typography, quieter borders, and responsive spacing.
- Added a live status header, prominent supply/current/power readings, optional component labels, and numbered selection cards with measurements. Voltmeter cards display voltage.
- The camera and materials remain a presentation of the existing electrical model. This pass does not add new simulation physics.

Verification: **65 tests passed in 13 circuit files**. The expanded browser harness passed the existing workflow and numerical checks plus component label toggling, all seven component types, and low/top camera angles. There were no browser page errors, no scoped WCAG A/AA axe violations, and no document overflow at 390 px. Desktop, phone, and all-component screenshots were visually reviewed. The browser harness remains an isolated local host.

- [Previous desktop appearance](visual-pass/before-desktop-3d.png)
- [Updated desktop bench](desktop-3d.png)
- [Updated phone bench](mobile-3d.png)
- [All component materials](visual-pass/all-components.png)
- [Top camera view](visual-pass/top-view.png)
- [Low camera view](visual-pass/low-angle.png)
- [Visual-pass unit results](visual-pass/unit-results.txt)
## Fourth pass: build flow and learning support

- Moved the power supply and a redesigned parts shelf above both circuit views. Cards explain each part's purpose and meter placement. The source can now be set to 0 V with its slider.
- Put the schematic and 3D view in the same sequence: build controls, circuit, inspector, interpretation. Added parts become the selected part, and the eight-part capacity is visible with disabled add controls when full.
- Added three predict–test–explain experiments: double resistance, add a parallel path, and close a series switch. Each uses one electrical change and readings from the shared solver. Wrong predictions receive explanatory feedback without a penalty; explanations remain student-authored and are not automatically graded.
- Guided evidence stores the original prediction, before/after circuit configurations and currents, and the student's explanation. Later bench edits label those readings as saved experiment evidence. Export produces a separate JSON file.
- Added context-sensitive insights for an inactive source, shorts, LED overcurrent/polarity/turn-on, open switches, steady-state capacitors, meter loading, and blocked parallel branches. An inspect shortcut identifies the relevant component.
- Added a collapsible reading map: voltage shares for series circuits and current shares for parallel circuits, with numerical text equivalents and concise definitions of voltage, current, and power. Undefined shares remain explicitly unavailable.

Verification: **75 tests passed across all 14 circuit test files**. The initial concurrent run encountered confirmation-test timeouts; those passed separately, and the final complete run passed. A temporary source-file lock was resolved before the final run. Source and public copies match. The browser harness covers all previous flows plus guided predictions, numerical results, explanation/export contents, saved evidence after edits/undo, 0 V supply, parts-before-diagram ordering, automatic selection, and eight-part capacity. New learning panels are included in scoped axe WCAG A/AA checks. This remains local isolated-host validation rather than a full deployed-app test.

- [Guided experiment on desktop](guided-experiment-desktop.png)
- [Guided experiment on phone](guided-experiment-mobile.png)
- [Phone parts shelf](parts-shelf-mobile.png)
- [Voltage/current reading map](reading-map-desktop.png)
- [Guided sample evidence](guided-sample-evidence.json)
- [Final unit results](pass4-final-unit-results.txt)
## Fifth pass: reusable designs and precise measurements

- Added local circuit-design downloads and validated JSON import previews. The preview lists parts, voltage, connection type, and predicted source current before an explicit Load action. Loading is undoable. Invalid/oversized files leave the live circuit unchanged.
- Circuit files preserve electrical settings only, separately from prediction and explanation exports. The importer accepts at most eight supported parts, checks all numeric ranges and LED/switch settings, regenerates IDs, and discards unrelated state fields.
- Replaced the inspector's inline measurement sentence with three labeled voltage, current, and power cards. Small power readings use mW or µW instead of rounding to zero.
- Numeric entry now has a local draft. Enter, Apply value, or leaving the field commits a valid value; Escape restores the active value. Invalid entries show a specific message and preserve the live circuit. Added halve/double controls for resistance and capacitance, respecting the supported range.
- Browser checks cover deliberate edits, single-step undo, invalid input, Escape, quick changes, design exports, valid/invalid/oversized imports, preview dismissal, import undo, phone width, and scoped WCAG A/AA checks. Desktop and phone screenshots were visually reviewed.

Validation artifacts (the default process-based test runner encountered worker-startup timeouts; the thread-worker retry is recorded separately):

- [Circuit-file and measurement test coverage](../../tests/circuit_files.test.js)
- [Thread-worker regression results](pass5-thread-unit-results.txt)
- [Browser results](browser-results.json)
- [Desktop inspector](precision-inspector-desktop.png)
- [Phone inspector](precision-inspector-mobile.png)
- [Desktop import preview](circuit-import-desktop.png)
- [Phone import preview](circuit-import-mobile.png)
- [Reusable sample design](sample-circuit-design.json)
Final validation outcome: all **95 distinct tests** passed across the completed runs. The first run passed 94 tests; its one failure was an assertion for the replaced inspector sentence, updated to verify the new labeled measurements. Subsequent runs passed that assertion. A complete process-worker rerun passed 82 tests but could not start four workers, and a thread-worker retry passed 79 tests but could not start two workers. These were runner startup timeouts; there is no clean single full-suite run for this pass. The complete Chromium workflow passed with no page errors and no scoped axe violations. Syntax, whitespace, and source/public parity checks passed.
## Sixth pass: 3D visual detail

- Added selected-part Close-up mode. It follows the part picker, retains orbit/tilt controls, and returns to the complete bench through Reset camera. Camera changes preserve electrical readings.
- Added rounded cable bends, metal lead terminals, resistor end collars, scored capacitor tops and jacket details, switch handles, source ventilation and a control knob.
- Replaced the flat LED cap with shaded hemisphere geometry. Bulbs now use softly fading light, enlarged glass in close-up, and a filament projected in 3D.
- Added projected contact shadows, pools of component light, thicker tray edges, and subtle edge scale marks.
- Staggered component positions in parallel circuits with more than four parts, making eight-branch layouts easier to distinguish. Part labels remain available, with only the selected part's labels shown in close-up.

Validation: **18 targeted model/view and SVG accessibility tests passed**. The dedicated Chromium review passed all materials, dense parallel layouts, selected-part close-ups, camera/physics independence, top/reset views, label toggles, empty-bench behavior, and 390 px layout checks. No browser page errors or scoped axe WCAG A/AA violations. Desktop and mobile screenshots were visually reviewed. This is a visual refinement of the existing projected 3D DC representation; no new electrical physics was introduced.

- [Full bench](studio-starter.png)
- [Bulb close-up](studio-bulb-detail.png)
- [LED close-up on phone](studio-led-mobile.png)
- [Eight parallel branches on phone](studio-parallel-mobile.png)
- [All component materials](studio-components.png)
- [Top view](studio-parallel-top.png)
- [Visual browser results](visual6-results.json)
- [Targeted test results](visual6-unit-results.txt)
## Seventh pass: direct 3D controls and rendering efficiency

- Added drag-to-orbit with bounded camera angles and animation-frame batching. Horizontal touch gestures rotate the bench; vertical gestures retain page scrolling. Existing sliders remain the keyboard camera controls.
- Added numbered HTML buttons positioned over the 3D scene, with component names, selected states, keyboard activation, and corresponding part-card selection. Labels hides these markers for an unobstructed view. Close-up shows only the selected part's marker.
- Kept marker and card selection aligned when undo/removal leaves the stored selected index beyond the remaining parts.
- Memoized the shared DC solution and 3D element against their relevant inputs. The instrumented browser test observes no 3D-render call on a tick-only update, and verifies that changing voltage refreshes the scene and readings. This is a scoped regression check, not a frame-rate benchmark.
- Unmounts the inactive schematic while the 3D view is active, preserving the existing spark-canvas cleanup.

Verification: **25 targeted tests passed across five files** (model/view contracts, SVG alternatives, canvas lifecycle, and workspace tabs). The complete existing browser workflow passed. Dedicated pointer/keyboard, close-up/reset, scene-selection, memoization, and native touch tests passed. Scoped axe checks reported no violations, and phone layouts stayed within the viewport. Source and public copies match; syntax and whitespace checks passed. Browser tests use the local isolated tool host.

- [Updated full bench](desktop-3d.png)
- [Direct controls on desktop](direct-3d-desktop.png)
- [Direct controls on phone](direct-3d-mobile.png)
- [Interaction results](interaction7-results.json)
- [Touch gesture results](interaction7-touch-results.json)
- [Targeted unit results](interaction7-unit-results.txt)
## Eighth pass: understand the selected 3D component

- Added a compact selected-part panel with solver-backed voltage, current, and power readings, distinct measurement colors, topology context, and a live component-state label.
- Added a progressive “Understand this reading” explanation and a prediction/reflection prompt. Explanations cover energy transfer, open branches, LED polarity/turn-on/overcurrent, meter placement, shorts, and the capacitor steady-state limit. Undetermined voltages remain explicit instead of showing invented values.
- Added undoable switch and LED actions directly in the 3D panel, plus an Edit selected part button that moves keyboard focus to the existing inspector.
- Fixed inspector draft state surviving a component type change when the part retained its ID and numeric value.
- Retained the shared DC model and existing geometry; this pass adds contextual understanding and interaction rather than new physical simulation.

Verification: **24 targeted tests passed across three files**, including six new state/measurement cases. The dedicated browser workflow passed for component selection, LED/switch actions, undo/redo, edit focus, live readings, invalid draft reset, and ambiguous voltage. The existing 3D camera/selection/rendering regressions passed. Scoped axe checks passed for the full 3D panel and its warning state. Desktop and 390 px phone screenshots were visually reviewed; no horizontal page overflow was found. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host, not deployed-app end-to-end testing.

- [Desktop selected-part panel](insight-3d-desktop.png)
- [Phone selected-part panel](insight-3d-mobile.png)
- [Undetermined voltage on phone](insight-ambiguous-mobile.png)
- [Browser checks](insight8-browser-results.json)
- [Targeted unit results](insight8-unit-results.txt)

## Ninth pass: follow current through the 3D circuit

- Added an optional Current direction toggle with static, projected chevrons and a warm path highlight over the existing wiring. Series circuits trace their wiring path; parallel circuits trace the selected branch and its route to the source.
- Added a readable legend distinguishing conventional current from electron motion and explaining that arrows indicate direction rather than speed or magnitude. Parallel views report selected-branch current and source total separately, with a note about combined currents on shared rails.
- Suppresses arrows for zero-current paths, including open switches, reversed LEDs, capacitors at steady DC, and an unpowered source. Selecting a blocked parallel branch explains that other branches may still carry current.
- Keeps the overlay optional, keyboard accessible, independent of electrical undo history, and compatible with close-up, camera controls, and memoized rendering. Close-up explicitly explains when part of the route is outside the view.

Verification: **30 tests passed across four files**, including six new current-direction cases. The dedicated browser workflow passed keyboard toggle, unchanged solver/history on view changes, switch/undo behavior, branch selection, source-total readings, camera limits, close-up context, and hiding/showing the overlay. Existing 3D camera/selection/rendering regressions also passed. Scoped axe checks found no violations. Desktop and 390 px phone screenshots were visually reviewed; no horizontal page overflow was found. Syntax, scoped whitespace, and source/public parity checks passed. Tests use the isolated local tool host. The existing prediction-schematic test still logs a React missing-key warning; it does not affect these checks.

- [Series current on desktop](current-series-desktop.png)
- [Selected parallel route on desktop](current-parallel-desktop.png)
- [Selected parallel route on phone](current-parallel-mobile.png)
- [Browser check results](direction9-browser-results.json)
- [Targeted unit results](direction9-unit-results.txt)

## Tenth pass: compare components directly on the 3D bench

- Extended the existing part picker with a Compare parts by control: component details, voltage, current, or power. Comparison cards retain direct and keyboard selection, update the scene/inspector, and expose their readings as accessible button descriptions.
- Added consistent bars scaled against the largest known reading, with an explicit scale label and quantity-specific colors. Supporting text reinforces equal series current, equal parallel voltage, branch-current addition, and power as energy transfer per second.
- Kept zero readings empty and marked unknown voltage with stripes plus text. Small positive voltages use mV/µV instead of appearing as zero in the comparison cards.
- Kept view preferences outside electrical undo history, while electrical edits and undo immediately refresh the readings. Comparison mode participates in the existing 3D render memoization dependencies.

Verification: **36 tests passed across five files**, including six new comparison cases for voltage/current/power ratios, zero and unknown values, tiny voltage drops, and default/empty states. Dedicated browser checks passed for all modes, keyboard selection, scene synchronization, editor updates, undo, eight-part phone layout, and returning to component details. Existing 3D camera/rendering and current-direction browser regressions passed. Scoped axe checks found no violations. Desktop and 390 px phone screenshots were visually reviewed with no page overflow. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host.

- [Voltage comparison on desktop](compare-voltage-desktop.png)
- [Eight-part comparison on desktop](compare-eight-desktop.png)
- [Eight-part comparison on phone](compare-eight-mobile.png)
- [Unknown readings on phone](compare-unknown-mobile.png)
- [Browser results](compare10-browser-results.json)
- [Targeted test results](compare10-unit-results.txt)

## Eleventh pass: reachable controls and consistent precision

- Moved the existing camera controls directly below the scene/caption, keeping them above the selected-part explanation and measurements.
- Added Previous/Next part controls with a polite selected-part announcement, disabled first/last boundaries, and synchronized close-up, scene markers, comparison cards, and inspector selection. Navigation changes no electrical state or undo history. Empty benches omit navigation and stale indices remain clamped.
- Shared adaptive voltage formatting between the 3D readout, inspector, and comparison cards, preserving small positive mV/µV readings. The source power summary now uses the same adaptive power formatter as individual parts. The SVG alternative describes small nonzero current without rounding it to zero amps.

Verification: **38 targeted tests passed across five files**, including two new precision consistency checks. The dedicated navigation browser workflow passed keyboard use, bounded navigation, close-up tracking, selection synchronization, preserved history/preferences, removed/empty states, and phone overflow checks. Existing camera/rendering and comparison/editing browser workflows passed. Scoped axe checks found no violations; the 390 px phone screenshot was visually reviewed. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host.

- [Updated desktop controls](navigation-desktop.png)
- [Phone controls and precise readings](navigation-mobile.png)
- [Navigation browser results](navigation11-browser-results.json)
- [Targeted test results](navigation11-unit-results.txt)

## Twelfth pass: save an annotated bench image

- Added Save bench image to the 3D camera controls. It downloads a 1280 px wide PNG containing the current view, visible numbered markers, source measurements, selected-part highlight, and a table of every connected component's voltage/current/power.
- Captures the geometry and solved readings together before asynchronous image decoding. Close-up captures explain that the table includes parts outside the visible camera area. Relevant notes preserve the steady-DC limitation, current-arrow meaning, parallel shared-rail context, unknown voltages, short-path limits, and illustrative LED current rating.
- Uses a self-contained SVG snapshot and local canvas rasterization, without new dependencies or external image services. Busy state prevents duplicate requests, an error offers a retry, object URLs are released, and completion messages avoid updating an unmounted component. Export leaves circuit settings and undo history unchanged.

Verification: **31 targeted tests passed across four files**, including five new snapshot cases. Browser checks downloaded valid full-resolution PNGs for wide and close-up views, verified dimensions and unchanged electrical state/history, simulated canvas failure and a successful retry, and checked empty-state controls and 390 px layout. Existing camera/selection/rendering regressions passed. Scoped axe checks found no violations. Actual wide and close-up PNG exports were visually reviewed using smaller inspection previews. Syntax, source/public parity, and scoped whitespace checks passed. Browser tests use the isolated local tool host.

- [Example exported PNG](export-bench.png)
- [Example close-up PNG](export-closeup.png)
- [Compact image preview](export-bench-preview.jpg)
- [Phone export controls](export-controls-mobile.png)
- [Browser results](export12-browser-results.json)
- [Targeted test results](export12-unit-results.txt)

## Thirteenth pass: ideal differential voltage probes

- Added an optional Virtual voltmeter panel with independently selectable red/black circuit nodes, signed readings, Swap probe leads, Across selected part, and Across source. The probes do not modify circuit loading, electrical state, or undo history.
- Added node-potential recovery from the shared DC solver. Known prefixes/suffixes remain measurable around unresolved sections. The differential calculation also sums known drops within a floating section, so an unresolved absolute potential does not automatically make its voltage difference unknown. Same-node measurements are zero; unresolved differences remain explicit.
- Added visible R/B callouts anchored to the 3D connection points. Fixed-size on-screen badges improve phone readability, and their placement is checked against component-selection buttons. Close-up explains that a probe may be outside the view. Saved PNGs retain vector callouts and record probe nodes and the differential reading.
- Added explanations for negative readings, equal-potential points, unknown values, ideal wires, and shared parallel rails. Probe selectors have explicit associated labels and the meter reports updates accessibly. Probe choices participate in the existing render memoization dependencies.

Verification: **40 targeted tests passed across five files**, including nine new probe cases. One initial comparison-render test exceeded the default 5-second timeout; the final run passed with 20-second test/hook timeouts, and the earlier log is retained. Browser checks passed keyboard operation, lead reversal, same-node zero, known/unknown and floating-section measurements, parallel rails, live edits/undo, PNG export, collapsed probes, and 390 px layout. Scoped axe checks found no violations. Existing camera/selection/rendering regressions passed. Phone and exported-image previews were visually reviewed; a dedicated phone check verifies probe badges do not cover selection buttons. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host.

- [Virtual voltmeter on desktop](voltage-probes-desktop.png)
- [Virtual voltmeter on phone](voltage-probes-mobile.png)
- [Exported bench with probe reading](voltage-probes-export.png)
- [Compact export preview](voltage-probes-export-preview.jpg)
- [Browser results](probes13-browser-results.json)
- [Final unit results](probes13-unit-results.txt)
- [Earlier timeout diagnostic](probes13-timeout-diagnostic.txt)

## Fourteenth pass: guided measurement practice

- Added optional Practice placing probes inside the virtual voltmeter. Tasks cover the selected component, source voltage, reversed source leads, and placing both leads on one node. Starting a task resets only probe positions and freezes the task's electrical context.
- Added positive/zero/negative/undetermined predictions, connection-aware checking, specific reversed-lead feedback, and explanation prompts. A coincidentally matching voltage at the wrong nodes does not pass the requested placement. Correct connections and correct predictions are reported separately.
- Hides prior placement feedback while probe positions differ from the checked positions, detects electrical changes, and offers a restart. Electrical undo can restore the original task context. Task, prediction, feedback, and panel state survive schematic/3D view changes without entering electrical undo history.

Verification: **34 targeted tests passed across four files**, including seven new practice cases. Final browser checks passed keyboard use, required prediction, wrong/reversed/correct placement feedback, probe-only state changes, schematic/3D persistence, electrical-change invalidation and undo, restart, reversed-source tasks, undetermined readings, and 390 px overflow checks. Scoped axe checks found no violations. Existing camera/selection/rendering regressions passed. The phone practice panel was visually reviewed. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host; unit runs used 20-second test/hook limits to accommodate host timing variability.

- [Integrated practice on desktop](probe-practice-desktop.jpg)
- [Practice detail](probe-practice-detail.png)
- [Practice on phone](probe-practice-mobile.png)
- [Browser results](practice14-browser-results.json)
- [Targeted unit results](practice14-unit-results.txt)

## Fifteenth pass: zoomable, pannable workbench

- Added a scene navigation bar with explicit Orbit/Pan modes, 60–180% zoom, and Center view. Mouse pan movement scales with the rendered viewport width, so the scene follows the pointer consistently on desktop and phone layouts.
- Added keyboard-accessible zoom and horizontal/vertical position sliders. Touch panning uses horizontal gestures while vertical gestures retain page scrolling. Close-up recenters the selected component; Reset camera restores the original overview, zoom, position, and orbit mode.
- Kept framing in view state, outside electrical undo and the DC solution. Framing survives schematic/3D switching. Component pins, voltage probes, wires, and solids use the same projection; exported images include zoom and flag potentially cropped framing while retaining the full readings table.

Verification: **27 tests passed across four files** covering framing bounds, viewport scaling, touch-axis isolation, image export, the DC model, and SVG accessibility. Browser checks passed zoom limits, pointer pan, keyboard positioning, close-up/reset behavior, unchanged solver results and undo history, view persistence, export notes, eight-part layouts, and 390 px overflow. Native touch checks passed horizontal pan, vertical page scrolling, and drag cleanup. Existing camera/selection/render-isolation regressions passed. Scoped axe reported zero violations; desktop and phone screenshots were visually reviewed. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host.

- [Desktop workbench](framing-desktop.jpg)
- [Phone workbench](framing-mobile.jpg)
- [Browser results](framing15-browser-results.json)
- [Native touch results](framing15-touch-results.json)
- [Unit results](framing15-unit-results.txt)

## Sixteenth pass: mixed networks inside the workbench

- Added a Mixed circuits workspace alongside Simple circuits. It supports up to eight components across four parallel supply branches, with up to four series components per branch. Branch reassignment and ordering change the electrical connections; empty branches are removed rather than interpreted as shorts. Existing simple builds remain saved, and builds containing one to four parts can be copied into the mixed workspace.
- Added a branch solver using the existing steady-DC component models, shared node connections, internal and cross-branch voltage measurements, branch current totals, and component-power conservation. Open switches isolate their branch. Unknown floating-node potentials remain unknown while known differential readings within a floating section remain measurable.
- Connected the existing 3D component visuals to branch-specific wires, junctions, branch labels, current traces, and probe points. Added a matching schematic with keyboard-scrollable diagrams on narrow screens. Image exports include branch labels and the full component-reading table.
- Added a connection editor for adding, moving, reordering, removing, and editing parts, plus independent electrical undo/redo. Camera changes stay out of electrical history. Wiring edits reset probes to the supply rails because internal node numbers may change. Optional component readings collapse to keep the editor closer to the scene.
- Added short-path and LED-current warnings, explicit model boundaries, rounded-reading guidance, and conservation explanations. Fixed selected-button hover contrast and a stray zero rendered beside probe guidance.

Scope: these are series paths across common parallel rails. Cross-links/bridge networks, shared series feeders, multiple sources, and general transient/AC behavior are future stages. The existing 3D renderer remains illustrative projected geometry.

Verification: **55 distinct targeted test cases passed across the main run and focused rerun**. The main expanded run passed 51 tests but could not start the worker for the four-test SVG suite; the final thread-worker rerun passed all 14 cases in the SVG and mixed-network suites. The earlier six-file core run also passed all 45 cases. The startup timeout diagnostic is retained below. Browser checks passed actual branch rewiring, switch isolation, component-value editing, order changes, undo/redo, probe measurements, capacity limits, copy/persistence, empty circuits, exported branch labels, keyboard scrolling, and 390 px overflow. Scoped axe checks reported zero violations for both mixed views. The original simple-bench camera/selection/render-isolation browser suite passed. Desktop scene and mobile editor/inspector previews were visually reviewed; syntax, source/public parity, and scoped whitespace checks passed. Browser verification uses the isolated local tool host.

- [Mixed 3D scene](mixed-scene-detail.jpg)
- [Full desktop workbench](mixed-workbench-desktop.jpg)
- [Mixed schematic](mixed-schematic-desktop.jpg)
- [Phone workbench](mixed-workbench-mobile.jpg)
- [Phone inspector](mixed-inspector-mobile.jpg)
- [Browser results](mixed16-browser-results.json)
- [Final focused test results](mixed16-final-unit-results.txt)
- [Main-run worker diagnostic](mixed16-worker-timeout.txt)

## Seventeenth pass: time simulation, oscilloscope, and passive AC

- Added DC step, stored-energy release, and settled sine-wave AC experiments to Mixed circuits. Resistors, fixed-resistance bulbs, capacitors, inductors, meters, and closed switches share an exact passive branch-response engine. RC, RL, and underdamped/critical/overdamped RLC responses support multiple series capacitors and inductors within the existing branch limits.
- Added an inductor to the mixed component shelf, an inductance editor in mH, and a copper-wound 3D model with segment depth ordering. Each inductor includes a modeled 0.001 Ω winding resistance. The existing simple component shelf remains unchanged.
- Added a calculated oscilloscope with separate voltage/current axes, source and component voltage traces, branch current, an exact time cursor, play/pause/restart, 1–1000 Hz AC frequency, automatic and microsecond-to-100-second windows, and numeric waveform CSV export. Initial examples compare RC branch time constants and demonstrate RLC resonance.
- Probes, the schematic, 3D measurements, current direction, power, and the scope share the same instantaneous frame. Negative current reverses flow arrows; negative component power represents net energy returned. Snapshot images record experiment/time and inductor values. Time and camera changes remain outside electrical undo; electrical edits reset and pause the experiment.
- Added specified initial conditions for release: equal series capacitor charge totaling the prior supply voltage, or prior DC current for inductor branches without capacitors. AC shows the settled periodic response, explicitly excluding startup. Open switches, nonlinear LEDs, and paths below 1 Ω block time experiments with actionable guidance while DC equilibrium remains available.
- Samples remain uniform enough to resolve ringing and include extra points around fast exponential startup. Extremely different branch time constants therefore do not turn a rapid transition into a misleading slow ramp. Windows exceeding 40 oscillation cycles hide undersampled traces and disable waveform export until a shorter window is selected.
- Playback sweeps the chosen window in approximately six seconds at eight updates per second. Leaving the mixed workspace clears the timer; returning resumes a previously running sweep. Hidden pages pause playback. Live meter/current announcements are disabled during playback and restored when paused. The older simple-bench signal sketch is now explicitly labeled illustrative.

Verification: **81 targeted tests passed across nine files**. Tests cover analytic responses, all RLC damping cases, differential equations, resonance, current/power/energy conservation, signed probe readings, floating/DC regressions, adaptive sampling across widely separated time constants, CSV data, SVG names, and source/public parity. Browser checks passed shared scope/probe/3D readings, play/pause, edit resets, view persistence, negative-current arrows, CSV download, snapshot metadata, micro/time-window controls, inductance editing, unsupported-device guidance, responsive overflow, and keyboard chart scrolling. Scoped axe found zero violations. Mixed-network and original simple-bench browser regressions passed. Separate lifecycle checks verified timer cleanup, hidden-page pause, and quiet live regions during playback. Desktop/mobile scope and 3D inductor previews were visually reviewed. Syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local tool host.

Still to extend: switching during a transient, nonlinear transistor/diode time models, active electronics, arbitrary cross-linked networks, and electrically connected breadboards. These additions do not imply general CircuitJS feature parity.

Physics references: [RC response](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits), [RLC differential equation and damping](https://openstax.org/books/university-physics-volume-2/pages/14-6-rlc-series-circuits), and [AC impedance and phase](https://openstax.org/books/university-physics-volume-2/pages/15-3-rlc-series-circuits-with-ac).

- [Calculated RC scope](time-rc-scope-desktop.jpg)
- [AC resonance scope](time-ac-scope-desktop.jpg)
- [Inductor and reversed AC current in 3D](time-inductor-3d.jpg)
- [Phone scope](time-scope-mobile.jpg)
- [Exported waveform data](time17-waveform.csv)
- [Browser results](time17-browser-results.json)
- [Playback lifecycle results](time17-lifecycle-results.json)
- [Unit results](time17-unit-results.txt)

## Eighteenth pass: active electronics and loaded light sensors

- Added an Active electronics workspace with three prewired NPN experiments: manual lamp control, a light sensor, and a dark sensor. Simple and mixed builds remain independently saved. Circuit edits have their own undo/redo; view, probe, and reflection settings stay outside that history.
- Added a generic piecewise DC transistor model with cutoff, forward-active operation, and saturation. A resistive lamp sets the collector-current limit. Base, collector, and emitter currents, node voltages, and power accounting all use the same operating point. Transistor dissipation includes base input power, and manual control includes both ideal sources in the energy balance.
- Solved the actual loaded sensor divider through its Thevenin equivalent, recovering current in each resistor and showing how base current lowers the connected junction voltage. Swapping the LDR and fixed resistor reverses the response to light.
- Added a projected 3D experiment board with three transistor terminals, a distinct photoresistor, power-dependent lamp glow, labeled current paths, and a matching schematic. Differential probes support five nodes, reversed leads, and same-node zero. Both diagrams and the calculated response graph scroll by keyboard on narrow screens.
- Added 201-point DC input sweeps with a live operating-point marker, saturation limit, and downloadable numeric CSV. The graph explicitly represents an input sweep, not elapsed time.
- Added three prediction activities with before/after evidence, specific feedback for incorrect predictions, and a saved explanation. Changing a physical setting clears the current prediction; changing view or workspace preserves it.
- Corrected the mixed schematic's inductor unit from ohms to millihenries.

Model boundaries: fixed wiring, one generic NPN, ideal sources, and a fixed-resistance lamp. Conducting VBE is 0.70 V and saturation VCE is 0.20 V. Gain is adjustable but constant at each setting. Relative light is an illustrative logarithmic resistance control from 100 kΩ to 1 kΩ, not a lux calibration. Device heating, leakage, breakdown, reverse operation, nonlinear switching transients, arbitrary active networks, and electrically connected breadboards remain future work. Board terminal labels do not imply a physical package pin order.

References reviewed: [onsemi transistor characteristics](https://www.onsemi.com/pdf/datasheet/2n3904-d.pdf) and [Analog Devices light-sensor interfaces](https://wiki.analog.com/university/courses/electronics/text/light-sensors-photodiodes). The implementation uses its own explicitly described teaching approximation rather than claiming the constants reproduce a specific device.

- [Active workbench](active-workbench-desktop.jpg)
- [NPN experiment board](active-npn-board.jpg)
- [Dark sensor board](active-dark-board.jpg)
- [NPN schematic](active-npn-schematic.jpg)
- [Dark sensor response](active-dark-response.jpg)
- [Loaded divider explanation](active-divider-loading.jpg)
- [Prediction activity](active-prediction-desktop.jpg)
- [Phone controls](active-controls-mobile.jpg)
- [Calculated sweep CSV](active18-sweep.csv)
- [Browser results](active18-browser-results.json)

Verification: **100 targeted circuit tests passed**, including 19 new active-electronics cases. The combined ten-file run passed 98 cases and had two 20-second timing failures in existing probe tests (one setup hook and one test); the complete nine-case probe file then passed with 60-second limits in 8.21 seconds. Both logs are retained. Numerical checks cover the three transistor regions, boundary continuity, loaded-divider equations, current and power conservation over varied supplies/gains/loads, sensor polarity, probes, bounded settings, CSV values, and rendering. Browser checks passed all three experiments, shared diagram/probe values, parameter edits, undo/redo, predictions including incorrect-answer feedback, electrical-change invalidation, workspace persistence, CSV download, keyboard controls, and 390/320 px layouts. Scoped axe found zero violations on desktop and phone. The existing passive time/AC browser suite also passed. Board, schematic, response plot, prediction, and phone controls were visually reviewed. JavaScript syntax, source/public parity, and scoped whitespace checks passed. All browser checks used the isolated local circuit host.

- [Combined targeted run, including timeout diagnostics](active18-unit-results.txt)
- [Successful probe rerun](active18-probe-rerun.txt)
- [Passive AC/time browser regression](active18-passive-regression.txt)
## Nineteenth pass: precise controls, reference comparisons, and direct probes

- Added typed numeric controls alongside active-lab sliders, with explicit range validation, Enter to apply, Escape to restore, and synchronized controls beside the response graph. Invalid or empty drafts leave the solved circuit and undo history unchanged. Readouts use bounded precision while exported values preserve the numeric settings.
- Added a saved reference operating point with frozen settings, signed before/after changes, single-setting versus multiple-setting guidance, and restore/replace/clear actions. Capturing a reference does not enter electrical history; restoring one is an undoable circuit edit. References survive workspace and view changes, and ignore inactive settings when identifying a controlled change.
- Overlaid a dashed lavender reference curve and diamond operating-point marker on the live response, using a shared current scale. Light and dark sensor curves can be compared on their common light axis. Manual-input and sensor comparisons retain their numeric evidence while clearly hiding the incompatible reference curve.
- Added keyboard-accessible probe targets directly on the 3D board and schematic, with explicit red/black placement modes and visible lead badges. Added one-step measurements across the transistor, base resistor, and supply. Probe placement stays outside circuit undo.
- Extended the live-sweep CSV with circuit type, supply, component values, gain, junction-voltage assumptions, and light-resistance endpoints. All existing measurement columns remain in their original order. Reference curves are visual comparisons; the CSV action explicitly exports the live circuit.

Verification: **67 targeted tests passed across five files**, including 16 new comparison/export cases. Tests reconstruct all 201 exported operating points for each of the three circuit types from CSV settings, verify frozen/signed comparisons and axis compatibility, and retain the active physics, passive time, mixed network, and SVG accessibility checks. The new browser workflow passed precise and invalid edits, reference capture/restore/undo, immutable comparisons, graph controls, direct probes, shortcuts, CSV download, workspace persistence, keyboard use, and 390/320 px layouts. The original active-lab browser suite also passed. Scoped axe found zero desktop/mobile violations. Desktop comparison curves, board probe targets, and phone controls were visually reviewed. Syntax and source/public parity passed.

- [Reference and live response](active-reference-response-desktop.jpg)
- [Light versus dark sensor curves](active-sensor-comparison-desktop.jpg)
- [Direct probes on the 3D board](active-direct-probes-desktop.jpg)
- [Reference comparison on phone](active-reference-mobile.jpg)
- [Precise phone controls](active-exact-controls-mobile.jpg)
- [Reproducible live sweep](refine19-sweep.csv)
- [Browser results](refine19-browser-results.json)
- [Existing active-lab regression](refine19-active-regression.txt)
- [Targeted unit results](refine19-unit-results.txt)
## Twentieth pass: investigation notebook and portable reports

- Added an optional investigation notebook to Active electronics, with a title, question, prediction, and shared explanation. Learners can record up to eight operating points, each retaining its original circuit settings, signed probe positions, and an editable note. Readings are recomputed from the frozen design using the same circuit model.
- Added actions to revisit a recorded circuit, use it as the reference, remove an observation, and undo the most recent removal. Revisiting a design participates in electrical undo; notes, recording, and reference capture remain outside electrical history. Recording at capacity preserves existing evidence.
- Added portable investigation JSON downloads and an open-file preview. Loading requires a valid, bounded document and replaces only the active investigation; learners can restore the previous investigation afterward. Previewing or dismissing a file leaves the circuit unchanged. Strict validation covers the live design, saved reference, every observation, probe nodes, text limits, and guided-activity consistency. Files are limited to 128 KiB, and stale asynchronous file reads cannot overwrite a newer selection.
- Added a self-contained HTML report with the question, prediction, live readings, reference comparison, response graph, observation notes and original settings, explanation, valid guided feedback, and model limits. Reports contain no scripts or external assets, escape authored text, support phone layouts, and can be printed or saved as PDF through the browser. The in-app report download is HTML.
- Explained why response curves overlap when only the swept input changes: the circuit response is unchanged while the operating-point markers move. Comparisons with incompatible manual-input and sensor axes retain their numeric evidence without overlaying incompatible curves.

Scope: the portable format covers the existing fixed-wiring active NPN teaching model. It does not add simple/mixed investigation import, arbitrary active wiring, transistor transients, or electrically connected breadboards. Exported documents omit undo histories and recovery checkpoints.

Verification: **92 targeted tests passed across six files**, including **25 new investigation tests**. Coverage includes round trips, precise settings, frozen observations, strict nested validation, prototype-key exclusion, stale guided feedback, escaped report text, Unicode, and incompatible graph axes. Browser checks passed recording/revisiting/undo, notes and reference behavior, removal recovery, actual file downloads, invalid and oversized file rejection, preview/load/restore, persistence, asynchronous-read ordering and unmount cleanup, capacity limits, and 390/320 px layouts. Scoped axe found zero desktop/mobile violations. The previous comparison, precise-control, and direct-probe browser suite passed. Report checks confirmed no scripts or external requests and no phone overflow. Desktop and phone screenshots were visually reviewed; an actual browser-printed A4 PDF was rendered and all three final pages were visually checked for legibility, clipping, and page breaks. Temporary PDF renders were removed after review. Browser checks use the isolated local circuit host.

- [Notebook on desktop](notebook-desktop.jpg)
- [Recorded observations](notebook-observations-desktop.jpg)
- [Notebook on phone](notebook-mobile.jpg)
- [Observation on phone](notebook-observation-mobile.jpg)
- [Import preview](notebook-import-preview.jpg)
- [Sample investigation file](notebook20-investigation.json)
- [Printable investigation report](notebook20-report.html)
- [Report preview](notebook-report-desktop.jpg)
- [Printed report styling](notebook-report-print.jpg)
- [Browser results](notebook20-browser-results.json)
- [Print review results](notebook20-print-results.json)
- [Comparison regression](notebook20-comparison-regression.txt)
- [Targeted unit results](notebook20-unit-results.txt)

## Twenty-first pass: operating regions and accurate transition curves

- Added an operating-region explorer beneath the active-circuit response graph. Cutoff, active operation, and saturation have matching shaded graph bands and cards with approximate input spans, current-region highlighting, and keyboard-accessible exploration buttons. Each button chooses a calculated operating point inside its reachable region and updates the existing circuit, probes, and notebook. Electrical undo/redo applies normally; saved references and observations stay frozen.
- Calculated conduction and saturation boundaries from continuous circuit equations independently of the 201 uniform sweep samples. Sensor boundaries include the loaded divider, and the dark sensor correctly reverses their order. Component edits recalculate both boundaries and reachability. Regions outside the available input range have disabled exploration actions and an explanation; the default dark-sensor circuit is one example that cannot reach saturation with its initial settings.
- Added a visual comparison of base current times gain and the supply/lamp current limit, showing that the lamp current is the smaller value. Expandable explanations connect manual thresholds to their equation and sensor thresholds to divider loading. The current region is announced after an exploration action; the cards remain readable without relying on color.
- Corrected a sampling limitation in the response curves: a narrow active interval can fall between uniform samples. Live, reference, and exported HTML report curves now include calculated transition points as well as the existing samples. Each circuit contributes its own boundaries. CSV export retains its original 201 uniformly spaced data points and full settings.

Scope: this explores the existing idealized, fixed-wiring NPN DC model. Transition values are calculated and rounded, not measured device guarantees. It does not add transistor switching dynamics, arbitrary wiring, or electrically connected breadboards.

Numerical verification: **111 targeted tests passed across seven files**, including **19 new region and graph cases**. Tests compare manual and sensor thresholds with independently derived equations, cover 729 combinations of component settings, check full-range saturation and unavailable regions, retain reachable endpoints, and locate an active interval narrower than one original graph sample. They verify that suggested inputs actually solve to their named regions, both live/reference/report curves include their own boundaries, and the CSV sample contract remains intact. Existing active physics, investigation files/reports, mixed networks, passive time/AC, and SVG accessibility suites passed.

Browser verification: the final region workflow passed keyboard activation and focus retention, electrical undo/redo, frozen references and observations, shared meter/board/notebook readings, prediction invalidation, component-dependent reachability, reversed sensor ordering, workspace persistence, full-range saturation, and narrow-interval graph rendering. The existing investigation notebook/report browser suite also passed. Scoped axe found zero violations on desktop and phone, including unavailable-region states. Layouts at 390 and 320 px had no page overflow, and exploration buttons met a 44 px minimum height. Desktop, phone, unreachable-region, and dark-sensor graph screenshots were visually reviewed. Phone range labels share their units and use compact precision; the expandable explanation retains more precise boundaries. After this final label adjustment, all **23 region/SVG tests** and the full region browser workflow passed again. JavaScript syntax, source/public parity, and scoped whitespace checks passed. Browser checks used the isolated local circuit host.

- [Desktop region explorer](regions-manual-desktop.jpg)
- [Shaded response graph](regions-graph-desktop.jpg)
- [Dark-sensor graph with reversed region order](regions-dark-graph.jpg)
- [Unavailable saturation explanation](regions-unreachable-desktop.jpg)
- [Phone region explorer](regions-phone.jpg)
- [Small-phone layout](regions-small-phone.jpg)
- [Narrow active interval](regions-narrow-graph.jpg)
- [Browser results](regions21-browser-results.json)
- [Notebook/report browser regression](regions21-notebook-regression.txt)
- [111-test targeted run](regions21-unit-results.txt)
- [Final focused test run](regions21-final-unit-results.txt)

## Twenty-second pass: connected networks and a concrete parity roadmap

- Added Connected circuits as a fourth workspace. Both terminals of each component can connect to any of eight named nodes, supporting arbitrary bridges, shared series feeders, and multiple independent sources within a 16-component limit. Included balanced bridge, shared-feeder, two-voltage-source, and current-driven-load investigations.
- Added a simultaneous DC node/ideal-source solver for resistors, ideal voltage and current sources, wires, and switches. The solver retains free variables: floating node voltages remain unknown while defined internal differences and currents stay available. Parallel ideal sources and redundant wire paths do not receive invented current splits. Inconsistent source constraints and current sources without return paths suppress solved measurements with a recovery message.
- Added a projected 3D board and flat map, highlighted component routes, correctly directed conventional-current arrows, and directly accessible component/probe buttons. Wires draw behind bodies. Placement checks spacing in both views and expands the board for dense circuits. Named nodes alone determine connectivity; visual crossings do not create junctions.
- Added a terminal editor, precise value controls, source-polarity reversal, switch controls, component addition/removal, and electrical undo/redo. Selection, probes, view, and written explanations remain outside electrical history. The workspace persists independently of simple, mixed, and active builds.
- Added differential node measurements, component voltage/current/absorbed-power readings, delivered/absorbed power totals, node-current checks, and CSV containing connections, source values, polarity, and measurement availability. A source can absorb power when another source drives it. Unknown CSV readings are blank, with explicit known-value columns; invalid circuits cannot export calculated data.

Model scope: 8 named nodes, 16 components; resistance 1 Ω–1 MΩ, voltage sources −24–24 V, current sources −100–100 mA. Sources and connections are ideal. This workspace does not yet support capacitors, inductors, nonlinear devices, transient simulation, digital logic, or breadboard contact connectivity. Existing passive time/AC and prewired active workspaces remain available. The [CircuitJS coverage roadmap](circuitjs-parity-roadmap.md) identifies the remaining stages and reference sources.

Initial verification: **142 targeted tests passed across nine files**, including **28 new connected-network cases**. Tests cover independently calculated bridge/shared-load/source cases, signed polarity and power, floating differential readings, redundant ideal paths, inconsistent circuits, tiny unbalanced current sources, normalization, CSV, and current/power conservation across cross-linked networks with wide resistance ratios. Existing active electronics, comparisons, region exploration, investigation files/reports, mixed networks, passive time/AC, workspace accessibility, and SVG alternatives passed.

Final verification: after the board-layout refinement, all **32 connected-network/SVG tests** passed. The connected browser workflow passed bridge rewiring, signed/keyboard probes, physical undo/redo, invalid-value handling, switch operations and removal recovery, multiple-source polarity and absorbed power, current-source behavior, CSV download, workspace persistence, conflicting/redundant-source diagnostics, floating differential readings, empty and full-capacity builds, and 390/320 px layouts. Scoped axe reported zero violations. Dense boards with 16 components, including all eight nodes, had no overlapping or clipped controls in either projected 3D or flat view; board targets were at least 44 px high. Existing active-region and mixed-circuit browser suites passed. Bridge, full-capacity, and phone editor screenshots were visually reviewed. JavaScript syntax, source/public parity, and scoped whitespace checks passed. Browser checks use the isolated local circuit host.

- [CircuitJS parity roadmap](circuitjs-parity-roadmap.md)
- [Connected bridge in 3D](network-bridge-3d.jpg)
- [Flat bridge map](network-bridge-flat.jpg)
- [Connection editor](network-bridge-editor.jpg)
- [A source absorbing power](network-source-absorption.jpg)
- [Phone editor](network-editor-phone.jpg)
- [Small-phone inspector](network-inspector-small-phone.jpg)
- [Eight nodes and sixteen parts](network-eight-node-board.jpg)
- [Exported connected measurements](network22-measurements.csv)
- [Browser results](network22-browser-results.json)
- [Dense-board overlap checks](network22-board-overlaps.json)
- [142-test targeted run](network22-unit-results.txt)
- [Final 32-test check](network22-final-unit-results.txt)
- [Active-workspace browser regression](network22-active-regression.txt)
- [Mixed-workspace browser regression](network22-mixed-regression.txt)

## Twenty-third pass: connected-network time response

- Added capacitors and inductors to the shared connected-network solver. DC equilibrium treats capacitors as open paths and inductors as ideal shorts. Time response starts from editable capacitor voltages and inductor currents, while independent DC sources apply their configured values at t = 0. Topology remains limited to 16 parts and 8 named nodes.
- Added backward Euler companion models with adaptive step doubling, explicit initial-constraint validation, finite local error tolerances, and a 4000-attempt calculation budget. Incompatible starting energy, unresolved states, numerical failures, and budget exhaustion hide the trace and calculated measurements rather than returning an incomplete result. Floating differential readings and ambiguous ideal-path currents retain the DC engine's availability semantics.
- Added RC charging, RL startup, RLC ringing, and bridge-settling investigations. The bridge places a capacitor across two loaded midpoint nodes, demonstrating a transient that cannot be represented as independent parallel branches. Initial energy also supports source-free release and LC energy exchange.
- Added DC/time mode controls, a responsive two-trace scope for the selected part, a time cursor, playback/pause/restart, and shared snapshot readings across the board, meter, inspector, and evidence tables. Keyboard arrows move through actual calculated samples. Phone plots show the whole time window with readable axis text. Playback pauses on a hidden page, cleans up on unmount, and suppresses rapidly changing live announcements. Electrical edits and undo/redo reset time; selecting parts or probes preserves the cursor.
- Added per-component and total stored energy, signed-power explanations, distinct capacitor/inductor board colors, and small-energy units through nJ/pJ. The lesson distinguishes energy storage from heat and explains voltage/current continuity, ringing, and the difference between a time snapshot and DC equilibrium.
- Added waveform CSV with actual nonuniform timestamps, part connectivity/values, starting conditions, signed measurements, stored energy, and integration metadata. Snapshot CSV identifies its analysis mode and time. Exports preserve blanks for unknown values and reject invalid runs.

Numerical scope: ideal linear RLC networks with fixed DC sources and static switch states. Electrical edits restart the experiment; they are not scheduled switching events. Relative local state tolerance is 0.002% of the largest magnitude encountered (including trial endpoints), plus 0.1 µV for capacitor voltage or 0.1 nA for inductor current. This is a local estimate, not a guarantee on accumulated error. Backward Euler adds numerical damping; very stiff or long oscillatory runs can exceed the bounded calculation budget. Source waveforms, timed switches, nonlinear devices, and digital logic remain future stages in the [coverage roadmap](circuitjs-parity-roadmap.md). The companion-model approach is consistent with the general architecture described in [CircuitJS's solver notes](https://github.com/pfalstad/circuitjs1/blob/master/INTERNALS.md); this implementation and its analytical checks are local to Circuit Bench.

Verification: **164 targeted tests passed across ten files**, including **22 transient cases**. They cover analytical RC charge/release, RL startup, underdamped RLC, capacitive bridge loading, floating circuits, parallel capacitors, source-driven ramps without DC equilibrium, source-free LC energy exchange, incompatible initial constraints, bounded-work failure, CSV, initial-condition normalization, and accessible rendering. Existing connected DC, active electronics, active investigations/regions, mixed networks, passive time/AC, workspace accessibility, and SVG/source parity passed. Maximum absolute sample errors in the documented examples were approximately **3.44 mV (RC), 34.4 µA (RL), and 31.35 mV (RLC)**; these are example-specific comparisons, not global accuracy guarantees.

Browser verification passed DC/time switching, playback/pause/edit restart, undo, initial-condition changes, hidden-tab pause and unmount cleanup, shared readings, trace selection, reversed probes, real waveform/snapshot downloads, invalid-state recovery, and 390/320 px layouts. Scoped axe reported zero violations and there were no page errors. Desktop and phone scope/inspector screenshots were visually reviewed using the isolated local circuit host.

- [RLC scope](transient-rlc-scope-desktop.jpg)
- [Bridge settling scope](transient-bridge-scope-desktop.jpg)
- [Capacitive bridge board](transient-bridge-board.jpg)
- [Full-window phone scope](transient-scope-phone-320.jpg)
- [Phone capacitor inspector](transient-inspector-phone-320.jpg)
- [Analytical benchmarks](transient23-analytical-benchmarks.json)
- [Browser results](transient23-browser-results.json)
- [164-test regression run](transient23-regression-results.txt)
- [Final focused checks](transient23-final-unit-results.txt)
- [Waveform export example](transient23-waveform.csv)

Final visual refinement: the scope now adapts its plotting coordinates to the available width, retaining the entire time window at phone sizes without shrinking labels or requiring horizontal scrolling. The final browser run also verified consecutive previous/next-sample keyboard movement and full-width plot containment. After this refinement, **54 connected/transient/SVG tests passed**; JavaScript syntax, source/public SHA-256 parity, and scoped whitespace checks passed. Temporary editing fragments and backups were removed.

## Twenty-fourth pass: signal generators and source/response comparisons

- Added DC, sine, triangle, and finite-edge pulse waveforms to both voltage and current sources. The generator includes a one-period preview, minimum/maximum/current signal levels, peak amplitude or pulse height, frequency, phase lead, and pulse width/rise/fall controls. Electrical edits participate in undo and restart from the configured initial energy.
- Added sine-filter, pulse-smoothing, and triangle-current investigations. Each connects a source to a reactive network and includes a prediction prompt about attenuation, phase lag, smoothing, or changing current direction.
- Added an optional source overlay to the scope. A voltage source shares the selected component's voltage scale; a current source shares its current scale. The reference uses a dashed purple trace, explicit legend, and a synchronized numerical reading. A direct source-edit action moves keyboard focus to the generator. Selecting a reference preserves the time cursor.
- Added logarithmic sliders for frequency, time window, capacitance, and inductance while retaining exact numeric entry, validation, and keyboard control. Frequency can be halved/doubled, and the time window can be fitted to up to three cycles. Layouts retain full-window plots and readable controls at 390 and 320 pixels.
- Extended the solver to evaluate sources at each actual integration time, constrain steps to at most 1/128 of the shortest source period (at least 256 accepted half-step samples per period), and land on pulse edge endpoints and triangle corners. This resolves narrow pulses instead of allowing them to disappear between samples. Excessive cycles fail with a shorter-window/lower-frequency recovery message; incomplete or undersampled traces are not exported. Fixed a floating-point endpoint issue that could incorrectly reject a completed run.
- Extended snapshot and waveform CSV with source shape, amplitude, frequency, phase, pulse width, and edge duration. Non-reactive time samples are identified as algebraic samples. Existing DC behavior and transient initial-state checks remain intact.

Model scope: linear circuits, independent sources, and static switch states. Source DC levels are bounded to ±24 V or ±100 mA, and amplitudes to 0–24 V or 0–100 mA; their sum can exceed the individual level limits. Frequency spans 0.01 Hz–100 kHz, subject to the time-step and cycle budget. Pulse width spans 1–99% of a period, with finite equal rise/fall durations limited by the chosen width. Phase is applied at t = 0. DC equilibrium uses only the source DC level; it does not compute the waveform average or RMS. Backward Euler's numerical damping and local-error limitations still apply. Scheduled switches, ideal discontinuous pulses, further waveforms, nonlinear devices, and digital networks remain future stages. See the [coverage roadmap](circuitjs-parity-roadmap.md) and [CircuitJS source/scope overview](https://www.falstad.com/circuit/doc/overview.html) for the broader comparison.

Verification: **190 targeted tests passed across eleven files**, including **26 source-signal cases**. The suite covers source phase/polarity/units, independent mixed-frequency sources, pulse boundaries, narrow-pulse visibility, zero-amplitude sampling, excessive-cycle diagnostics, initial-state compatibility, reconstructible CSV, generator rendering, and matching-axis overlays. Independent analytical checks cover sine-driven RC/RL startup, piecewise-linear RC pulse response at ordinary and 1% widths, and triangle-current ramps. Maximum sample errors in the sine benchmarks were approximately **4.57 mV for RC voltage** and **45.65 µA for RL current**. These example-specific results are not general error guarantees. A test-worker startup timeout in an earlier run was resolved by rerunning the affected file; the complete final regression run passed without that error.

Browser verification passed source comparison and cursor synchronization, source focus navigation, logarithmic keyboard input, undo, fitting cycles, DC/time semantics, pulse edge limits, invalid entry recovery, phase and shape edits, current-source unit conversion, CSV download, cycle-budget recovery, and workspace persistence. Scoped axe reported zero violations for both the scope and generator, with no page errors. The prior transient browser suite also passed playback/pause, edit restart, hidden-tab/unmount cleanup, probes, exports, initial-state recovery, and phone layouts. Desktop/phone source-comparison and generator screenshots were visually reviewed. Browser calculation timings were about 400 ms for the sine filter and 193 ms for pulse smoothing on this run; timing varies with device and load. JavaScript syntax, source/public SHA-256 parity, and scoped whitespace checks passed.

- [Sine input and filtered response](signals-sine-filter-desktop.jpg)
- [Pulse smoothing](signals-pulse-smoothing-desktop.jpg)
- [Triangle-current response](signals-triangle-current-desktop.jpg)
- [Signal generator](signals-generator-desktop.jpg)
- [Phone comparison scope](signals-scope-phone-320.jpg)
- [Phone pulse generator](signals-generator-phone-320.jpg)
- [Analytical benchmarks](signals24-analytical-benchmarks.json)
- [Actual browser timings](signals24-browser-timing.json)
- [190-test regression run](signals24-regression-results.txt)
- [Browser results](signals24-browser-results.json)
- [Prior transient browser regression](signals24-legacy-browser-log.txt)
- [Reconstructible waveform export](signals24-waveform.csv)

## Twenty-fifth pass: scheduled switching and event investigations

- Added up to eight timed actions per ideal switch, with exact/logarithmic time entry, open/closed actions, initial/DC state controls, an actual cursor-state display, add/remove actions, and fitting the time window to a schedule. Actions retain stable identities when reordered by time. Scheduling can be disabled while retaining its settings; electrical changes participate in undo/redo and restart the response. Actions outside the window remain visible in the editor.
- Added charge/disconnect/hold, charge/discharge, and inductor-flyback investigations. Prediction prompts connect topology changes to capacitor voltage, inductor current, current reversal, and a resistive return path.
- Added amber scope event markers, a grouped event timeline, and explicit Before/After controls. The two snapshots share an exact timestamp. Arrow keys traverse both sides in order, and the board, component list, probes, and measurements follow the chosen side. Capacitor/inductor comparisons show the state carried through a selected event. Playback clears an explicitly selected side as time advances.
- Extended the adaptive solver to land on every scheduled event, update all switches at that timestamp simultaneously, and solve the new constraints with carried capacitor voltages and inductor currents. Carried states are not clamped to initial-entry limits. This correctly retains currents above 100 mA and voltages above 24 V generated during a run. A charged-capacitor short, energized inductor without a return path, conflicting sources, or unresolved numerical timing stops the calculation with a recoverable diagnostic and no partial trace/export.
- Extended snapshot and waveform CSV with actual switch state, initial switch state, scheduling enablement, full action settings, event side, and grouped event actions. Post-event constraint solves are identified separately from integration samples. Schedule encoding is `action_id@time_s=open;action_id@time_s=closed`; simultaneous actions use `S2=open;S3=closed`. CSV contains distinct before/after rows at the same event time.

Model scope: linear networks and ideal switches with explicit actions between 1 µs and 60 s, subject to the existing 4000-step numerical budget. Same-switch duplicate action times are rejected; same-time actions on different switches are applied together. DC equilibrium uses the initial state alone. No contact bounce, arcing, impulsive energy transfer, periodic switch clock, nonlinear network devices, or general digital engine is modeled. See the [coverage roadmap](circuitjs-parity-roadmap.md). The carried-state approach follows the finite-voltage/current continuity conditions explained in [MIT’s circuit dynamics lecture](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/eff420f1164445dff4070878dc3722c5_6_0022007L016.pdf).

Verification: **214 targeted tests passed across twelve files**, including **24 new switching cases**. After the final responsive-scope correction, all **104 connected-network, transient, source-signal, switching, and SVG-accessibility tests passed again**. Analytical checks cover capacitor charge/hold/recharge, charge/discharge, and resistor flyback; the checked examples stay within 9 mV for capacitor voltage and 0.4 mA for flyback current across their sampled trajectories. These are example-specific checks, not general error bounds. Event checks also cover energy continuity, Kirchhoff current balance, signed power balance, simultaneous switch order independence, carried states beyond initial-input limits, end-of-window actions, narrow intervals, source/event coincidence, invalid connections, and reconstructible CSV.

Browser verification passed before/after readouts, consecutive keyboard movement through both event sides, actual switch state on the board, stable action identities during sorting, duplicate-time recovery, eight-action limits, removal focus, undo/redo, window fitting, scheduling enablement, DC/time semantics, waveform download, invalid-return-path recovery, workspace persistence, and playback. Scoped axe found zero violations at desktop, 390 px, and 320 px widths, with no page errors. The previous source-generator browser suite also passed. Verification uses the isolated local React circuit host.

Visual review found and corrected an existing scope resize-observer issue after an invalid circuit removes the plot and a repaired circuit recreates it. The observer now reconnects when the plot becomes available. Browser checks assert that SVG plotting coordinates match the visible width after recovery, preventing tiny labels on phones. Corrected desktop and phone previews were visually reviewed. JavaScript syntax, source/public SHA-256 parity, and scoped whitespace checks passed; temporary edit fragments and backups were removed.

- [Charge/discharge event comparison](switches-charge-discharge-desktop.jpg)
- [Inductor flyback and current continuity](switches-flyback-desktop.jpg)
- [Phone scope and event timeline](switches-hold-scope-320.jpg)
- [Phone switch schedule editor](switches-editor-320.jpg)
- [214-test regression run](switches25-regression-results.txt)
- [104 final focused checks](switches25-final-results.txt)
- [Switching browser results](switches25-browser-results.json)
- [Source-generator browser regression](switches25-signals-browser-log.txt)
- [Event-aware waveform CSV](switches25-waveform.csv)

## Twenty-sixth pass: general diode circuits and recognizable 3D components

- Added generic silicon and Schottky diode junctions to the connected network. The solver stamps their exponential current/voltage tangent, iterates to a consistent junction voltage and current, limits forward voltage progress during iteration, and checks current mismatch before accepting a solution. Linear circuits retain their original direct solve. Iteration is capped at 100 solves; an exponential argument above 40 is diagnosed rather than silently clipped. Floating differential readings remain available when the junction voltages are defined.
- Connected the diode solve to capacitor/inductor integration and timed switching. Previous junction voltages seed subsequent solves, including the post-switch constraint calculation. This supports rectifiers, capacitor charging pulses, and a diode taking over an inductor’s current at an ideal switch opening. Failed convergence or unsupported ideal drive suppresses all response frames and exports.
- Added half-wave rectifier, full-wave bridge, rectifier smoothing, and diode flyback investigations with prediction prompts. The diode inspector names anode/cathode nodes, identifies forward/reverse/zero bias at the current sample, supports reversal and model changes with undo, and compares model voltage drops at 1 mA and 10 mA. It explains that forward voltage varies with current.
- Replaced generic board tiles with component-specific projected geometry: resistor bands, blue capacitor packages with plate markings, copper coils, source polarity/direction markings, cathode bands, raised wire leads, and switch levers that follow the scope cursor. The board has projected grid lines, depth shading, contact shadows, separate label buttons, and depth ordering. Resistor bands show the nominal value rounded to two significant digits; the numerical label retains the configured value.
- Added a node-voltage overlay with an explicit negative/zero/positive legend and neutral unknowns. Time response uses one voltage scale across all calculated frames, so changing the cursor does not silently rescale the colors. View and overlay changes preserve the time cursor. Component placement is cached by topology during playback.
- Enlarged label/part clearance and adjusted horizontal perspective for taller boards. Visual review caught labels crossing the stage boundary in a dense layout; the final framing keeps all 16 labels inside the stage. Flat and projected views preserve accessible component and probe buttons, with the board horizontally scrollable on phones.
- Appended diode model name, saturation current, emission coefficient, thermal voltage, and nonlinear iteration count to snapshot/waveform CSV. Existing source, switch schedule, event-side, and signed measurement columns remain available.

Model scope: memoryless Shockley junctions at approximately 300 K with VT = 25.85 mV. The silicon preset uses Is = 1 nA and n = 1.7; the Schottky preset uses Is = 1 µA and n = 1.1. Both include exponential forward conduction and reverse leakage. They omit series resistance, breakdown, junction capacitance, reverse recovery, temperature variation, and damage; external series resistance controls current in the circuit. These are generic teaching models, not commercial device fits or complete SPICE/CircuitJS diode models. The nonlinear tangent method and bounded iteration are implemented in this workbench; no CircuitJS source was incorporated. The [CircuitJS solver architecture](https://github.com/pfalstad/circuitjs1/blob/master/INTERNALS.md) and [ngspice manual](https://ngspice.sourceforge.io/docs/ngspice-manual.pdf) informed the coverage comparison. The [updated roadmap](circuitjs-parity-roadmap.md) lists further 3D improvements and the remaining parity milestones.

Verification: **239 targeted tests passed across thirteen files**, including **25 new diode cases**. Tests cover both junction presets, current/voltage derivatives, independent load-line roots, reverse leakage, current-driven and series/parallel diodes, floating differential measurements, zero-voltage junctions, model/iteration failures, half-wave and full-wave rectification, smoothing, diode flyback, conservation checks, CSV reconstruction, and rendering. Independent small-step RK4 references verify the smoothing capacitor within 15 mV and flyback current within 0.3 mA over the tested samples; these are example-specific acceptance bounds, not general error guarantees.

Browser checks passed current-dependent silicon/Schottky readings, polarity reversal and undo, cursor-preserving view/overlay changes, bias and switch-lever synchronization, model-aware downloads, failed-drive recovery, workspace persistence, and collision/containment checks for all 16 labels in flat and projected views. Scoped axe found zero violations at 1280, 390, and 320 px widths, with no page errors. The prior switching and source-generator browser suites also passed. Desktop, dense-board, and phone previews were visually reviewed using the isolated local React host. JavaScript syntax, source/public SHA-256 parity, and scoped whitespace checks passed. Temporary editing scripts and backup copies were removed.

- [Bridge rectifier on the enhanced board](diodes-bridge-board.jpg)
- [Diode flyback: coil, polarity band, and open switch](diodes-flyback-board.jpg)
- [Dense 16-part board with contained labels](diodes-dense-3d.jpg)
- [Bridge rectifier scope](diodes-bridge-scope.jpg)
- [Phone smoothing scope](diodes-filter-scope-320.jpg)
- [Phone diode model/polarity controls](diodes-model-320.jpg)
- [239-test regression run](diodes26-regression-results.txt)
- [Diode/3D browser results](diodes26-browser-results.json)
- [Switching browser regression](diodes26-switches-browser-log.txt)
- [Source-generator browser regression](diodes26-signals-browser-log.txt)
- [Model-aware waveform CSV](diodes26-waveform.csv)


## Twenty-seventh pass: controlled sources, camera navigation, and routed connections

- Added all four ideal controlled-source families to the general connected solver: VCVS (E, V/V), VCCS (G, A/V), CCCS (F, A/A), and CCVS (H, Ω). Gains may be positive, negative, or zero. Voltage controls measure a node difference without loading it; current controls read the signed A-to-B current of a chosen independent or controlled voltage source. A 0 V series source acts as a current sensor. The simultaneous matrix solve supports feedback and arbitrary component order, with defined differential readings retained in floating circuits.
- Added amplifier, voltage-to-current conversion, branch-current gain, and finite-gain feedback investigations. Inspectors expose sensing nodes/source, exact gain entry, the input × gain → output relationship at the scope cursor, and explicit ideal-model limits. Controlled outputs can be selected as scope comparisons. Removing a sensed source produces a repairable diagnosis instead of silently switching to another source. Electrical editing uses the existing undo/redo and response restart behavior.
- Appended controlled-source kind, control nodes, sensed-source ID, gain, actual control reading, and input unit to snapshot/time CSV. Existing columns retain their positions. Tests cover signs, zero gain with an unknown input, floating voltage controls, algebraic feedback, ambiguous source currents, invalid references, transient series current sensing, and controlled-source/diode combinations. The sign conventions follow section 4.2 of the [ngspice manual](https://ngspice.sourceforge.io/docs/ngspice-manual.pdf); no external simulator code was incorporated.
- Added saved left/right projected perspectives, 35–70° board tilt, 100–200% zoom, reset, mouse drag panning, native touch/trackpad scrolling, and focused-board arrow/Home navigation. Projection controls are disabled in flat view. Camera changes preserve components, undo history, probes, and time. Zoom preserves the viewport center; reset restores the camera and scroll origin. This remains projected SVG geometry, not unrestricted orbit or a mesh-rendered 3D scene.
- Added obstacle-aware connection routing around unrelated packages, component labels, and node controls. Rounded paths and dark separation strokes clarify crossings; selected paths draw last. Current arrows follow routed segments. Placement reserves clearance across supported perspective/tilt extremes and remains stable as the camera moves; routing is cached by topology and view rather than recomputed at each time sample. Routing uses display coordinates and can fall back to a direct segment when no clear path exists. It does not modify the electrical netlist.
- Added purple source packages with diamond markings and dashed links for the selected source’s sensing relationships. A nearby explanation names the sensed voltage/current and distinguishes sensing links from current-carrying connections. Package side shading follows the selected perspective. Dense boards use a bounded scrolling viewport to keep navigation nearby.

Model limits: controlled sources have no supply rails, saturation, bandwidth, output-current limit, or sensing-input energy transfer. Finite-gain feedback is an ideal source experiment, not a complete op-amp model. The existing limits of 16 components, 8 named nodes, memoryless generic diodes, and bounded adaptive time integration still apply. Op-amps/comparators, general transistor families, digital timing, larger editable circuits, and interchange remain future parity stages. See the [updated coverage roadmap](circuitjs-parity-roadmap.md).

Verification: **272 targeted tests passed across fifteen files**, including **27 controlled-source cases and 6 camera/routing cases**. Analytical tests check feedback, amplification, transconductance/transresistance, capacitor-current sensing, and power/current balance. The tested RC-controlled output stays within 20 mV of its analytical trajectory; this is an example-specific acceptance bound, not a general error guarantee. Dense geometry tests cover both perspective directions and both tilt extremes, with finite routes and clearance from unrelated obstacles.

Browser verification covered every bundled connected example (**22 examples**): all routed without a fallback and all component labels cleared other labels and node buttons. Additional checks covered dense 16-part/all-node circuits at 1280 and 320 px, both perspectives and both tilt extremes, flat-view control states, actual mouse dragging, keyboard panning, zoom/reset, cursor/history preservation, controlled-source editing and focus, sensing signs, missing-reference recovery, adding a CCVS, and downloaded metadata. Scoped axe reported zero violations at 1280, 390, and 320 px, with no page errors. The previous diode, switching, and signal-generator browser suites also passed. Validation uses the isolated local React circuit host. Desktop feedback, phone editor, and dense board captures were visually reviewed.

- [Feedback circuit with routed wires and sensing links](control27-feedback-board.jpg)
- [Camera controls](control27-camera.jpg)
- [Feedback scope](control27-feedback-scope.jpg)
- [Phone controlled-source inspector](control27-editor-320.jpg)
- [Dense 16-part board](control27-dense-board.jpg)
- [272-test regression](control27-regression-results.txt)
- [Interaction and accessibility checks](control27-browser-results.json)
- [Catalog, dense-layout, and source-family checks](control27-layout-browser-results.json)
- [Controlled-source CSV](control27-controlled.csv)
- [Prior diode browser regression](control27-diodes-browser-log.txt)
- [Prior switching browser regression](control27-switches-browser-log.txt)
- [Prior signal-generator browser regression](control27-signals-browser-log.txt)


## Twenty-eighth pass: finite-gain op-amps and visible output limiting

- Added a distinct op-amp component with positive open-loop gain from 1 to 1,000,000 V/V, separate non-inverting/inverting sensing nodes, and configurable lower/upper output limits from −24 to +24 V relative to output reference B. The model obeys Vout = clamp(A × (V+ − V−), lower, upper). Inputs draw no current; its internally powered, zero-impedance output retains signed source current and power. Current-controlled sources can sense the op-amp output branch.
- Added output-region checking to the shared operating-point solve. For up to four op-amps, each lower-limit, linear, and upper-limit combination is solved together with the rest of the network, including existing diode iteration. Each candidate is checked against the actual clamped law. Coincident boundary solutions are merged. Distinct valid operating points, undefined differential inputs, reversed/equal limits, incompatible constraints, and the four-amplifier budget produce diagnostics with no fabricated state, partial trace, or export. This model does not pick a stable latch state in a positive-feedback circuit.
- Added voltage-follower, inverting-amplifier, output-clipping, and active low-pass investigations. New examples select the amplifier automatically. Prediction prompts connect resistor ratios, finite gain, input error, output headroom, clipping, and capacitor feedback. The follower and inverting-gain relationships are consistent with the finite-gain discussion in [Analog Devices MT-033](https://www.analog.com/media/en/training-seminars/tutorials/MT-033.pdf); the workbench implements its own simplified model and does not claim the bandwidth behavior described in that reference.
- Added a logarithmic open-loop-gain control, exact values, decade shortcuts, three output-window presets, individual limit editors, and input-error probing. Live operating-point cards in the scope and inspector show linear/upper-limit/lower-limit/undetermined state, actual output, signed input error, and distance to the nearest limit. Output-range meters have accessible numeric values and text. Scope voltage scales include the configured limits, drawn as amber horizontal dashed lines.
- Added raised op-amp packages with a triangle, input signs, output marking, and pins. Outline color and the visible component label follow the actual operating region at the selected sample. Sensing links, current routes, camera controls, keyboard selection, and probe behavior remain available. The scope's Edit op-amp shortcut selects the amplifier and focuses its gain slider.
- Extended snapshot and waveform CSV with model identifier, limits, operating region, the gain × input-error value before limiting, remaining output headroom, and the number of region combinations checked. Existing columns retain their positions. Fixed failed time-response fallback cards to clear control readings and op-amp state instead of retaining DC control data.

Model limits: this is a memoryless finite-gain teaching model with hard output limits, up to four amplifiers per 16-component/8-node network. Limit settings are not physical supply terminals. Input common-mode restrictions, offset/bias currents, output impedance/current limiting, physical supply current, bandwidth, slew rate, saturation recovery, hysteresis, comparator delay, and stability dynamics are absent. Real op-amp and comparator device behavior requires further modeling. See the [coverage roadmap](circuitjs-parity-roadmap.md).

Verification: **300 tests passed across sixteen files**, including **28 new op-amp tests**. Checks cover finite-gain followers, both clipping limits, asymmetric and floating output references, floating common-mode sensing, invalid windows, conflicting ideal output drive, positive-feedback ambiguity, four-amplifier region combinations, output-current sensing, diode loads, and CSV. Every sampled sine response is checked against the analytical clipped follower and clamped input-error law. The finite-gain active RC filter is checked against its analytical startup trajectory within 25 mV across the tested frames; this is an example-specific acceptance bound, not a general error guarantee. Kirchhoff current and signed power balance are checked alongside the model responses.

Browser checks passed clipping and linear recovery, synchronized board/scope state, gain and window presets, input-error probing without changing the electrical state, scope focus, undo/redo, invalid-window/positive-feedback diagnosis, hidden failed traces/exports, resize recovery, waveform download, camera behavior, and workspace persistence. Scoped axe found zero violations at 1280, 390, and 320 px; no page errors were recorded. The previous controlled-source/camera and diode browser suites also passed. All **26 bundled examples** passed routing and label-clearance checks without a routing fallback, alongside dense 16-part/all-node camera checks. Validation uses the isolated local React host. The clipping board, phone scope, and phone inspector were visually reviewed. Syntax, source/public byte parity, and scoped whitespace checks passed.

- [Clipped amplifier on the board](opamp28-clipping-board.jpg)
- [Clipping scope and operating point](opamp28-clipping-scope.jpg)
- [Active low-pass response](opamp28-filter-scope.jpg)
- [Phone scope](opamp28-scope-320.jpg)
- [Phone op-amp inspector](opamp28-editor-320.jpg)
- [300-test regression](opamp28-regression-results.txt)
- [Op-amp browser and accessibility results](opamp28-browser-results.json)
- [All examples and dense layouts](opamp28-control27-layout-qa/control27-layout-browser-results.json)
- [Controlled-source/camera regression](opamp28-controlled-browser-log.txt)
- [Diode browser regression](opamp28-diodes-browser-log.txt)
- [Model-aware waveform CSV](opamp28-time-response.csv)


## Twenty-ninth pass: op-amp bandwidth, slew rate, and continuous timing state

- Added optional one-pole bandwidth and symmetric slew-rate limits to the connected op-amp model. Timing settings include gain-bandwidth product (10 Hz–100 MHz), maximum output slope (0.000001–1000 V/µs), and starting output voltage. Existing designs retain their finite-gain, output-limited algebraic behavior. Disabling timing retains its settings; DC equilibrium remains independent of timing and starting output.
- Added four investigations: **Bandwidth and phase lag**, **Gain trades for bandwidth**, **When a sine wave becomes a ramp**, and **Slew, settle, and reach a DC level**. Predictions connect closed-loop bandwidth, noise gain, sinusoidal slope, and the transition from a straight slew-limited ramp to a curved settling tail. A timing toggle enables direct comparison with the existing idealized response; halve/double shortcuts support slew-rate experiments.
- Added exact/logarithmic timing controls and an open-loop pole readout. Scope and inspector cards distinguish Responding, Slewing up, Slewing down, and output-voltage limiting using both words and color. Signed output slope and the configured slew limit use V/µs. The projected op-amp package follows the selected sample, with cyan response, purple slew, and amber output-limit cues. DC cards explain that timing is inactive in that analysis.
- Extended the simultaneous circuit solve with a continuous output-voltage state for each timed amplifier. Initial and post-switch constraint solves hold its output A − B at the configured or carried value. Switch-event cards explain that output remains continuous while its slope and current can change. Invalid starting values outside the configured output window produce a repairable diagnosis with no trace or export. Amplifier timing does not invent stored electrical energy; actual external capacitors and inductors retain their own energy accounting.
- Integrated timing through adaptive backward Euler with step doubling. State-error estimates use the existing relative tolerance of 2e−5 and a voltage absolute tolerance of 1e−7 V. Starting steps and steps after source knots/switch events are bounded by 1/(32π GBW); accepted half-steps also limit amplifier excursion to 1/64 of its output window. These sampling guards help resolve short ramps. The existing four-amplifier, 16-component, 8-node, and 4000-attempt limits remain; a failed run suppresses partial results.
- Appended timing enablement, GBW, slew rate, starting output, active timing state, local model slope, and actual integration-step slope to CSV. Configuration slew uses V/µs; both exported slope measurements use V/s. Initial and event constraint snapshots leave integration slope blank. CSV identifies adaptive integration for timed-amplifier circuits even when no capacitor or inductor is present.

The implemented model is τ = A/(2π GBW), with du/dt = clamp((A × (V+ − V−) − u)/τ, −SR, +SR), projected onto the configured output window; u is output voltage A − B and SR is converted to V/s. Each implicit step uses gain AΔt/(τ + Δt), offset u_previous τ/(τ + Δt), and output bounds intersected with u_previous ± SRΔt. Region candidates are checked against that same step law. This is a teaching model, not a commercial-part fit. The approximate bandwidth/noise-gain relationship follows [Analog Devices MT-033](https://www.analog.com/media/en/training-seminars/tutorials/MT-033.pdf); the sinusoidal slope relation 2πfVp and slew distortion are explained in [MT-045](https://www.analog.com/media/en/training-seminars/tutorials/MT-045.pdf). No external simulator code was incorporated.

Remaining model limits: one pole, internally powered zero-impedance output, hard configured voltage limits, and ideal sensing inputs. There are no physical supply terminals, output-current limit, input common-mode restrictions, offset/bias currents, additional poles, internal overload-storage recovery, comparator hysteresis/delay, or general AC stability analysis. A finite return slope after clipping is not a model of internal saturation storage. The board remains projected SVG. See the [updated coverage roadmap](circuitjs-parity-roadmap.md).

Verification: **319 tests passed across seventeen files**, including **19 new timing cases**. Checked trajectories include follower startup across 10 Hz/1 kHz/1 MHz GBW, sinusoidal amplitude/phase for noise gains 1 and 10, positive/negative slew-limited startup with settling tails, both voltage limits, external capacitor current/energy, floating differential output, a timed/static amplifier cascade, and exact switch continuity with a slope reversal. Analytical acceptance bounds are 1 mV for the tested startup trajectories, 2 mV for sine responses, and 3 mV for slew-limited steps. An independent RK4 reference with steps no greater than 50 ns checks the distorted sine within 12 mV. These bounds apply to the tested examples, not every allowed circuit. Current balance and signed power balance are checked alongside the responses.

Browser checks passed timing enable/disable, retained settings, undo, gain-bandwidth changes, signed rising/falling slew states, board/scope synchronization, removal of slew distortion by doubling the limit, starting-output editing, DC/time semantics, invalid-start recovery, CSV metadata, and exact before/after switch output continuity. Scoped axe reported zero violations at 1280, 390, and 320 px; there was no horizontal page overflow or page error. Earlier op-amp and diode browser suites also passed. All **30 bundled examples** passed routing and label-clearance checks without routing fallback, alongside dense 16-part/all-node camera checks. Browser validation uses the isolated local React circuit host. Desktop board/scope and phone controls were visually reviewed. JavaScript syntax, source/public byte parity, and scoped whitespace checks passed. Code outside the connected workspace is preserved apart from the timing CSS addition. Temporary staging scripts and backups were removed.

- [Slew-limited response and signed slope](timing29-slew-scope.jpg)
- [Live timing state on the projected board](timing29-slew-board.jpg)
- [Bandwidth and phase lag](timing29-bandwidth-scope.jpg)
- [Gain and bandwidth investigation](timing29-gain-bandwidth-scope.jpg)
- [Startup ramp and settling](timing29-startup-scope.jpg)
- [Phone timing controls](timing29-controls-320.jpg)
- [Phone scope](timing29-scope-320.jpg)
- [Switch-event output continuity](timing29-switch-continuity.jpg)
- [319-test regression](timing29-regression-results.txt)
- [Timing interaction and accessibility checks](timing29-browser-results.json)
- [All examples and dense layouts](timing29-control27-layout-qa/control27-layout-browser-results.json)
- [Earlier op-amp browser regression](timing29-opamp-browser-log.txt)
- [Earlier diode browser regression](timing29-diodes-browser-log.txt)
- [Timing-aware waveform CSV](timing29-waveform.csv)
- [Source integrity checks](timing29-integrity.json)


## Thirtieth pass: measurement windows and sine comparison

- Added optional waveform measurements to the connected scope. Whole-run, last-source-cycle, and custom intervals have visible S/E cursors and shaded regions on both voltage and current plots. Custom times support exact values, sliders, and assigning the existing scope cursor to either boundary. Preferences persist in the workspace. Measurement controls do not change electrical settings, undo history, the selected part, or playback cursor.
- Added separate voltage/current interval statistics: signed mean, total RMS, AC RMS around the mean, minimum/maximum, and peak-to-peak range. Cursor differences show the interpolated start/end values and signed change. Integration is weighted by elapsed time, so closely packed adaptive samples do not receive disproportionate weight. RMS concepts and waveform cursor use align with [Tektronix’s scope primer](https://www.tek.com/de/documents/primer/oscilloscope-basics) and [time/amplitude measurement tutorial](https://www.tek.com/en/blog/basic-time-and-amplitude-measurements-tbs2000-oscilloscope-part-3-3-xyzs-series); the numerical implementation is original to the workbench.
- Added gain magnitude, dB gain, signed phase, and sine-fit residual when comparing a different selected component with an independent sine source. Voltage references compare voltage in V/V; current references compare signed branch current in A/A. Negative phase means the output sine lags its reference. A half-cycle difference is labeled inversion; gain and phase are unavailable for an output without a measurable sine component.
- Added a dotted coral fitted-sine overlay in the selected interval. Its sine plus DC value uses the same scale as the selected trace; scale bounds include the fit. The residual is the RMS remaining after that fit, divided by the fitted sine RMS. It can include startup, distortion, and other frequencies. It is explicitly labeled as a fit residual, not THD. The final source cycle is a useful window preset but does not prove that a circuit has settled.
- Added a separate interval CSV with S/E times, SI voltage/current statistics, interpolation/integration method, comparison source/frequency, fitted peak amplitude, gain, phase, and residual. Existing full-waveform and snapshot exports retain their formats. Unknown readings remain blank. Reversed or zero-length windows display a repairable message and suppress interval readings, markers, fits, and export; failed runs show no stale measurements.

Numerical conventions: statistics integrate the displayed piecewise-linear trace. On each clipped segment of duration h with endpoint readings a and b, the mean numerator is h(a+b)/2 and the square integral is h(a²+ab+b²)/3. AC RMS uses a second centered pass to preserve small ripple on large offsets. Duplicate switch timestamps are zero-duration boundaries, never artificial ramps. At a boundary that is exactly a switch event, S uses the after side and E uses the before side. Any unknown reading affecting a positive-duration segment suppresses that metric’s interval statistics; independently known metrics remain available.

Sine comparison uses a time-weighted least-squares fit of a constant, sine, and cosine at the reference frequency. Three-point Gauss–Legendre quadrature integrates each linear trace segment. At least one full source period is required, and any segment longer than 1/16 of that period blocks the fit. Source and output are fitted over the same interval before computing magnitude and phase. The result describes the sampled response, including simulation/interpolation error; it does not replace general AC analysis, spectral instruments, a stability analysis, or physical device measurements.


Verification: **347 targeted tests passed across eighteen files**, including **28 new measurement cases**. After the final flat-output gain guard and compact-unit refinement, all **28 measurement tests passed again**. Coverage includes exact unevenly sampled ramps, clipped interval boundaries, signed DC/RMS, tiny ripple on a large offset, switch-side conventions, unknown gaps, invalid ranges, non-integer-cycle sine fitting, positive/negative phase, inversion, current-source units, known harmonic residual, sparse/short-window rejection, SI export, and failed-run rendering. An actual bandwidth-limited follower’s final cycle is checked against its analytical gain and phase. Acceptance bounds describe these examples, not a general simulator error guarantee.

Browser verification passed interval presets and exact controls, cursor assignment, unchanged circuit/history/cursor state, retained preferences, fitted curves, voltage/current comparisons, residual reduction after increasing slew rate, interval download, DC-source fallback, flat-output gain/phase suppression, and invalid-run recovery. Scoped axe reported zero violations at 1280, 390, and 320 px, with no page errors or horizontal page overflow. The earlier timing browser suite also passed. Visual review covered the desktop measurements/overlay and phone controls; it prompted clearer engineering units and compact typography. The comparison definition-list markup was corrected after the accessibility check identified it. Browser validation uses the isolated local React 18 circuit host.

JavaScript syntax, source/public byte parity, and scoped whitespace checks passed. The numerical circuit solver is unchanged; measurement helpers process its completed traces. Custom boundaries are saved as fractions of the full run duration and scale with a changed time window. The existing projected 3D board, camera, routing, and component catalog remain available. Temporary staging scripts and backups were removed.

- [Bandwidth measurement panel](measure30-bandwidth-panel.jpg)
- [Bandwidth plot and measurement interval](measure30-bandwidth-plot.jpg)
- [Slew waveform against a fitted sine](measure30-slew-plot.jpg)
- [Slew distortion measurements](measure30-slew-panel.jpg)
- [Phone interval controls and statistics](measure30-panel-320.jpg)
- [Phone scope](measure30-plot-320.jpg)
- [347-test regression](measure30-regression-results.txt)
- [28 final measurement checks](measure30-final-results.txt)
- [Browser and accessibility results](measure30-browser-results.json)
- [Earlier timing browser regression](measure30-timing-browser-log.txt)
- [Window measurements CSV](measure30-window.csv)
- [Source integrity checks](measure30-integrity.json)


## Thirty-first pass: time zoom and level-crossing navigation

- Added saved 1–64× scope time zoom, focus on the S–E measurement interval, earlier/later pan, a whole-run overview with the sampled cursor, a position slider, and full-run reset. Plot keyboard controls are +/− to zoom, left/right to pan, and Home to reset. An offscreen notice keeps the board/meter timestamp explicit and offers to bring the cursor into view. Zoom and scale changes preserve circuit settings, undo history, measurements, and sampled time. Saved view bounds are fractions of the full run duration.
- Added optional **Trace range** voltage scaling for selected op-amps. This makes small signals visible without the full output-window range compressing the curve. The selected signal, source comparison, and fitted sine share the scale across the complete run; time zoom does not rescale it. **Include output limits** restores the earlier view. Output-limit lines outside the selected scale are omitted with an explanation; the existing operating-point card retains their numeric values.
- Added a level-crossing finder for the selected component’s voltage or signed current. It supports rising, falling, and either-direction searches, exact/sliding level entry, separate retained voltage/current levels, and a whole-trace midpoint shortcut. Current level entry uses mA and stores/exports A. Previous/next, go-to, and focus actions move to a real calculated sample. Focus uses at least 8× time zoom, retaining a closer existing view.
- Added a pink crossing marker and threshold line. The finder distinguishes interpolated crossings, samples at the threshold, instantaneous switch jumps, and finite intervals held at the threshold before reaching the other side. Jumps retain their exact timestamp and navigate to the after snapshot. The white cursor, board, and meters always display a calculated sample, with the distinction from an interpolated crossing explained in the panel.
- Added spacing since the previous same-direction crossing and its reciprocal. The panel explains that 1/Δt is a repetition rate only when the pattern repeats; alternating directions are not confused with a full period. Crossing CSV records component/metric, SI level, direction, estimated time, end of a held-level interval, method, sampled time/side, same-direction spacing, and reciprocal spacing. Empty and failed searches have no export.

Numerical conventions: trace clipping interpolates only between known adjacent readings, retains vertical segments at duplicate event timestamps, and does not connect across unknowns. It changes neither the solver’s samples nor the measurement window. Crossing search requires known readings on opposite sides of the threshold. A touch that reverses direction, a trace that stays at the threshold, and a start/end boundary without both sides are not counted. Samples within 1e−12 of the largest absolute trace value or level are treated as equal to the threshold (an all-zero trace uses a unit scale). An equality interval is reported explicitly; no single crossing time or spacing is inferred through that hold. Unknown samples break both crossing detection and spacing comparisons. Search runs across the entire calculated trace, independent of zoom.

This is a recorded-trace search, not acquisition triggering, re-arming, hysteresis, pulse-width triggering, or a guarantee that unobserved events between samples were captured. Zoom enlarges existing samples without adding time resolution. Direction/threshold terminology and the distinction between triggering and event search are informed by [Tektronix’s triggering and event-search primer](https://www.tek.com/en/documents/primer/triggering-fundamentals-pinpoint-triggering-and-event-search-mark-dpo7000-0). The implementation is original to this workbench; no external simulator code was incorporated.


Verification: **377 targeted tests passed across nineteen files**, including **30 new navigation/crossing cases**. Tests cover bounded view normalization, centering at run boundaries, interpolation while clipping, exact vertical jump preservation, gaps, nonuniform rising/falling crossings, direction filters, threshold touches and incomplete boundaries, held-level intervals, same-direction spacing, small signals, rounding at sine endpoints, SI current exports, and failed-state rendering. A real switched network verifies the exact jump timestamp and after-state selection. The browser checks the amplifier’s measured crossing spacing near its expected 1 kHz rate while allowing its small transient/numerical deviation.

Browser verification passed time zoom and S–E focus without changes to circuit/history/time/statistics, optional signal-range/output-limit scales, clipped waveform and fitted-sine paths, 64× limits, keyboard zoom/pan/reset, overview movement, offscreen-cursor recovery, crossing navigation/focus, spacing, download, direction/level editing, retained current/voltage thresholds, exact switch-side navigation, saved view/search state, unknown current handling, and failed-run recovery. Scoped axe reported zero violations at 1280, 390, and 320 px, with no page errors or horizontal page overflow. The previous measurement and timing browser suites also passed. Visual review covered the focused small-signal plot, phone navigation, and phone crossing finder.

JavaScript syntax, source/public byte parity, scoped whitespace, and source-preservation checks passed. Existing circuit-solving, time-integration, and measurement mathematics are unchanged. Camera/component geometry remains unchanged outside the scope; only the new navigation CSS was added outside the connected workspace. Temporary staging scripts and backups were removed.

- [Focused small-signal crossing](scope31-crossing-focus.jpg)
- [Measurement interval under time zoom](scope31-measurement-zoom.jpg)
- [Desktop time navigation](scope31-navigation-desktop.jpg)
- [Crossing finder and spacing](scope31-crossings-desktop.jpg)
- [Exact switch jump under zoom](scope31-switch-jump.jpg)
- [Phone time navigation](scope31-navigation-320.jpg)
- [Phone crossing finder](scope31-finder-320.jpg)
- [Phone plot](scope31-plot-320.jpg)
- [377-test regression](scope31-regression-results.txt)
- [Navigation browser and accessibility results](scope31-browser-results.json)
- [Earlier measurement browser regression](scope31-measure-browser-log.txt)
- [Earlier timing browser regression](scope31-timing-browser-log.txt)
- [Crossing times CSV](scope31-crossings.csv)
- [Source integrity checks](scope31-integrity.json)


## Thirty-second pass: dimensional board materials and live instruments

- Refined the projected 3D board with a layered rim, mounting screws, a graded surface, contact shadows, metallic terminal pads and bent leads, ceramic resistor highlights, and shaded source, capacitor, switch and amplifier packages. Material IDs are unique per board instance. Existing cathode bands, resistor bands, coil geometry, source markings, and state-dependent switch levers remain visible. Separate terminal leads replace the misleading full-width lead previously drawn underneath every package, including open switches.
- Made 3D packages directly selectable. Their existing HTML label buttons remain the keyboard alternative; clicking a package also focuses its label. Added **Focus selected**, which centers the selected part in the scrollable viewport without changing camera zoom. Added saved surface-grid visibility and route emphasis. Emphasis dims other routes and packages while keeping every component and connection in the circuit. Probe collars distinguish the two meter leads, and labels now have stronger depth and selection styling.
- Added a **Board instrument dock** with a component selector, signed voltage/current/power readings, stored energy, and shortcuts to edit the selected component, place both probes across it, or open its full scope. The full scope has a return shortcut that finds the selected component on the board. Shortcuts scroll and transfer keyboard focus to the destination.
- Added two compact whole-run voltage/current previews with separate scales, a shared time cursor, synchronized play/pause, previous/next calculated-sample controls, and keyboard stepping. Click the preview or scrub its slider to seek a calculated snapshot. Home/End select the first/last sample. Switch-event selection and Before/After controls preserve both states at the exact event timestamp and update the rendered lever, meters, and full scope together. The preview preserves duplicate switch timestamps and breaks paths across unknown readings.
- Refined the dock for phones with stacked sections, taller waveforms, a two-column action layout, a full-width scope shortcut, and controls that stay inside the page. Failed runs suppress time previews and playback while showing undetermined readings; DC mode explains how to enable time exploration. Board view preferences, selection, probes, camera changes, and time navigation preserve electrical settings and undo history.

Verification: **377 targeted tests passed across nineteen files**. After the final package-selection, phone-layout, and scope-shortcut refinements, **40 focused checks passed again across three files**. The SVG accessibility inventory now includes the sixteenth, explicitly named board-scope SVG. Browser checks pass direct package selection and focus, camera centering at desktop/phone widths, grid/emphasis persistence, probe placement, editor/scope shortcuts, shared playback, cursor boundary keys, same-timestamp switch states, unknown current handling, failed-run recovery, and saved workspace restoration. Scoped axe reports zero violations at 1280, 390, and 320 px, with no page errors or horizontal page overflow.

All **30 bundled examples** retain non-overlapping component/node labels and routes without fallback. Dense 16-component boards pass both perspectives and 35°/70° tilt at desktop and phone widths; flat-mode camera restrictions remain correct. The controlled-source editor and CSV checks in the layout suite also pass. Visual review covered the open switch, amplifier dock, phone dock, and dense board; it prompted the final taller previews and wider phone actions.

JavaScript syntax, source/public byte parity, scoped whitespace, and source-preservation checks pass. The electrical solver, integration, full-scope mathematics, and unrelated workspaces remain byte-preserved. This is still a projected SVG board; it does not add physical mesh rendering, unrestricted orbit, breadboard contact connectivity, or new component models. The dock displays existing samples and does not increase numerical time resolution. Validation uses the isolated local React 18 circuit host. Temporary staging files and backups were removed.

- [Enhanced open-switch board](board32-switch-board.jpg)
- [Amplifier board](board32-amplifier-board.jpg)
- [Desktop instrument dock](board32-amplifier-dock.jpg)
- [Before/after switch controls](board32-switch-dock.jpg)
- [Phone dock](board32-dock-320.jpg)
- [Phone board focused on the selected part](board32-board-320.jpg)
- [Dense board materials and routing](board32-layout-qa/control27-dense-board.jpg)
- [377-test regression](board32-regression-results.txt)
- [Final 40-test regression](board32-final-focused-results.txt)
- [Browser and accessibility results](board32-browser-results.json)
- [All examples and dense layouts](board32-layout-qa/control27-layout-browser-results.json)
- [Source integrity checks](board32-integrity.json)


## Thirty-third pass: stored-energy gauges and learning explorer

- Added a saved **Stored energy** board overlay. Raised projected gauges and compact label bars show capacitor energy in mint and inductor energy in lilac, with exact joule readings in place of their normal value labels. Gauges share one maximum across every storage component and the complete calculated run. The scale stays fixed when selecting a different part, scrubbing time, navigating peaks, or changing the camera. DC uses its own equilibrium snapshot. Other component markings and current arrows remain available.
- Added a **Follow stored energy** explorer beneath the board dock. It compares each capacitor and inductor, shows total stored energy and net signed power into storage, and distinguishes storing, returning, zero instantaneous power, and undetermined power. Energy and power can be known independently. The cards select the same component used by the board, dock, inspector, and full scope.
- Added a selected-part explanation with E = ½CV² or E = ½LI², current parameter/readout values, change from the first calculated sample, and the largest known energy sample. **Go to energy peak** seeks that real sample, preserving its before/after switch side. Equal maxima retain the earliest calculated occurrence. A small expandable learning prompt explains why doubling voltage or current magnitude quadruples energy and why reversing its sign does not make energy negative.
- Preserved unknowns: missing, non-finite, or negative energy readings do not set gauge levels or maxima. An unknown starting energy leaves its delta undetermined. A failed run supplies no stale energy reference and disables peak navigation. A circuit with no storage elements gives relevant example suggestions. All-known-zero energy uses an empty gauge. The UI explains that zero net storage power may also occur while components exchange energy.
- Kept the board layer static and tied to calculated snapshots. Gauges are explicitly illustrative meters; no physical electric/magnetic field, heating, or mesh simulation was added. Their geometry fits the existing package clearance envelope. Responsive cards, a wider mobile peak button, retained label sizes, and explicit selection colors keep the layer usable on narrow screens. Visual review prompted raised gauges and a correction to inherited selected-card contrast.

Verification: **396 targeted tests passed across twenty files**, including **19 new energy cases**. After the visual refinements, **29 focused checks passed again across three files**. Cases cover one shared scale, independent signed power, exact zero, unknown/invalid readings, missing initial state, repeated maxima and switch-side retention, solver energy units for negative voltage/current, real flyback continuity with a power reversal, optional rendering, failed-state suppression, and no-storage guidance.

Browser checks pass scale/peak agreement with actual calculated frames, shared selection and cursor state, unchanged electrical settings/history, before/after flyback behavior, camera/flat-view compatibility, explanatory prompts, distinct DC/time references, saved overlay restoration, and failed-run recovery. Scoped axe reports zero violations at 1280, 390, and 320 px, with no page errors or horizontal page overflow. All **30 examples** retain clear labels and routes without fallback with the energy layer enabled. Dense 16-component boards pass both perspectives and 35°/70° tilts at desktop and phone widths; the layout suite also retains controlled-source editing and CSV checks. Validation uses the isolated local React 18 circuit host.

Source/public byte parity, JavaScript syntax, scoped whitespace, and source-preservation checks pass. The electrical solver, integration, and existing scope mathematics remain unchanged; the new helpers read completed frames. Maxima are the largest known calculated samples, not guaranteed continuous-time extrema. The layer adds pedagogy and presentation rather than new component-model coverage. Temporary staging files and backups were removed.

- [RLC board at capacitor peak energy](energy33-rlc-board.jpg)
- [Desktop stored-energy explorer](energy33-panel-1280.jpg)
- [Flyback energy returned after opening](energy33-flyback-panel.jpg)
- [Flyback board](energy33-flyback-board.jpg)
- [Phone energy explorer](energy33-panel-320.jpg)
- [Phone board](energy33-board-320.jpg)
- [Dense board with energy gauges](energy33-layout-qa/control27-dense-board.jpg)
- [396-test regression](energy33-regression-results.txt)
- [Final 29 focused checks](energy33-final-results.txt)
- [Browser and accessibility results](energy33-browser-results.json)
- [All-example and dense-layout results](energy33-layout-qa/control27-layout-browser-results.json)
- [Source integrity checks](energy33-integrity.json)


## Thirty-fourth pass: node tracing and current-balance inspection

- Added a saved **Inspect network nodes** board action alongside the red/black probe actions. Selecting a node in inspection mode leaves the probe positions untouched. Choosing a probe action restores probe placement; **Finish inspecting** closes the panel and returns keyboard focus to the inspection toggle. The inspected node remains stable when a terminal or sensing input selects another component. Saved references to a node absent from the current topology fall back to a used node.
- Added a **Node connection inspector** with the selected node's voltage relative to 0, current entering, current leaving, and the signed leaving-minus-entering residual. Each actual A/B terminal has its own component selector, opposite-node label, magnitude, and explicit into/out/zero/unknown direction. Both terminals are retained when a component connects back to the same node. Known currents can still be inspected when the node's absolute voltage is floating. Unknown branch currents leave aggregate currents and their residual undetermined; failed solutions suppress stale readings.
- Added node-specific route emphasis. Only terminal routes attached to the inspected node are highlighted; cyan arrows enter it and amber arrows leave it. Unrelated terminal routes and packages dim. Zero-current and unknown branches have no direction arrow; unknown highlighted routes are dashed. The selected branch gets drawing priority at overlaps. Direction arrows render above wire paths and use different positions for incoming/outgoing flows to reduce occlusion by shared routes and labels. Default component emphasis remains available outside node inspection.
- Separated voltage-sensing inputs from current-carrying A/B terminals in the inspector. Their dashed purple connections are highlighted only when they reference the inspected node, and their ideal zero input current is excluded from the current totals. Current-controlled sources retain their existing source-branch sensing relationship rather than acquiring fictitious node input terminals. The normal selected-component sensing display returns outside node-inspection mode.
- Added **Focus inspected node**, which centers and focuses the named node without changing camera zoom, and **Measure node relative to 0**, which explicitly places both meter leads. Terminal selection uses the same component as the board dock, editor, and scope. The inspector follows the shared calculated cursor, including before/after switch states. It combines with stored-energy gauges, voltage coloring, both projected perspectives, flat view, zoom, and saved emphasis settings.
- Added a compact current-conservation explanation covering ideal nodes, floating references, same-node terminals, and numerical residuals. The legend adapts to sensing links and the voltage overlay. Responsive cards, visible flow labels, strong selection contrast, keyboard focus restoration, and phone-safe controls keep the workflow accessible.

Verification: **422 targeted tests passed across twenty-one files**, including **26 new node/arrow cases**. After the arrow-layer and legend refinements, **36 focused checks passed across three files**. Coverage includes terminal orientation, negative and very small currents, shared feeders, same-node loops, floating voltages with known current, ambiguous ideal-source sharing, voltage/current-sensing distinctions, repeated sensing inputs, open contacts, failed readings, fallback nodes, degenerate route geometry, arrow direction, optional rendering, and accessibility labels.

Final browser checks pass independent inspection/probe actions, shared component selection with a stable node, explicit probe measurement, centered keyboard focus and close-focus restoration, switch-induced flow reversal, open-contact arrow suppression, energy/voltage-overlay compatibility, sensing-only connections, floating and unknown currents, failed solutions, saved inspection state, and desktop/phone controls. Scoped axe reports zero violations at 1280, 390, and 320 px, with no page errors or horizontal page overflow. Visual review covered the shared feeder, switch flyback, desktop panel, and phone panel, and prompted the arrow layering/position and shorter legend refinements.

All **30 examples** retain clear labels and routes without fallback while inspection and energy gauges are enabled. Dense 16-component boards pass both perspectives and 35°/70° tilts at desktop and phone widths. The reused layout harness temporarily exits inspection for its existing selected-source sensing-link assertion, then restores inspection for dense-board checks; the inspector intentionally filters those links to the chosen node. Controlled-source editing and CSV checks also pass. Validation uses the isolated local React 18 host.

Source/public byte parity, JavaScript syntax, scoped whitespace, and source-preservation checks pass. Electrical solving, integration, energy calculations, and existing scope mathematics are unchanged. The inspector derives terminal incidence and signed flows from completed snapshots; it does not change topology, merge wire crossings, add physical node storage, or implement new component models. Temporary staging files and backups were removed.

- [Shared feeder with incoming/outgoing routes](nodes34-feeder-board.jpg)
- [Node current-balance panel](nodes34-feeder-panel.jpg)
- [Flyback directions and energy gauge](nodes34-flyback-board.jpg)
- [Flyback node readings](nodes34-flyback-panel.jpg)
- [Sensing-only input connections](nodes34-sensing-panel.jpg)
- [Phone node inspector](nodes34-panel-320.jpg)
- [Phone focused node](nodes34-board-320.jpg)
- [422-test regression](nodes34-regression-results.txt)
- [36 focused checks](nodes34-final-results.txt)
- [Browser and accessibility results](nodes34-browser-results.json)
- [Example/dense-layout results](nodes34-layout-qa/control27-layout-browser-results.json)
- [Source integrity checks](nodes34-integrity.json)


## Thirty-fifth pass: held samples and visual change comparison

- Added **Hold this sample** beneath the board instrument dock in Time response. Holding pauses playback and records the exact calculated instant, including its before/after switch side. The reference follows component selection and the current probe pair across the entire network. **Return to held sample**, **Replace held sample**, and **Clear held sample** provide direct navigation and recovery.
- Added a responsive comparison panel with held/cursor timestamps, signed time difference, and held/cursor/change readings for selected-part voltage, current, absorbed power, stored energy, and differential probe voltage. Paired bars share a symmetric zero-centered scale within each measurement; hatched cyan identifies held values, cream identifies cursor values. Changes are cursor minus held, with explicit positive signs. Unknown values have no bar or invented difference, and signed differences never overflow into visible infinities. The full-width probe card avoids a spare column on desktop. **Hide comparison readings** keeps the reference and scope markers available in a compact view.
- Added cyan diamond markers and distinctive dashed vertical lines in both the board preview and full scope, reusing the existing SVGs and scales. Cream cursor circles remain separate. At a switch, the held diamond remains at the actual before/after value even when the live cursor shares its timestamp. Unknown trace values retain a time marker without a fabricated point. Full-scope markers respect time zoom; an off-screen reference is described in the legend while the board overview keeps it visible.
- References persist only a version, normalized electrical-design/time-window identity, exact time, and side. A restored reference resolves to a real frame in the current calculation. Circuit edits, duration changes, DC mode, failed solutions, and malformed or inexact saved cursors suppress comparison readings and markers. Undo can restore the matching design and reactivate its reference. Camera, selection, probes, overlays, reflection, and scope navigation do not invalidate it or add electrical undo entries. Holding does not copy functions or persist stale numerical readings.
- Added an expandable explanation of signed changes, capacitor/inductor continuity, zero-duration switch comparisons, negative absorbed power, and floating/unknown measurements. Native buttons provide keyboard actions and expansion state; clearing restores focus to Hold this sample or the active DC mode when the panel disappears. Hold announcements are tied to their reference, preventing a stale timestamp message after saved-state restoration.

Verification: **457 targeted tests passed across twenty-two files**, including **35 new held-sample cases**. **84 focused checks across four files** passed again after the final announcement correction. New coverage includes serialization, recomputation, exact switch-side identity, view independence, model/duration changes, malformed references, nonfinite and missing readings, signed subtraction, inductor flyback continuity, floating differential measurements, immutable frames, marker clipping, and unavailable-reference presentation.

Browser validation covers RC charging and backward-time comparison, probe reversal, component changes, switch before/after stepping, contact state, energy and node-inspection compatibility, electrical edit/undo behavior, time-window changes, playback pause on hold, DC recovery, saved-state restoration, floating probes, ambiguous ideal-source currents, failed runs, collapse/expand, and keyboard focus. Scoped axe reports zero violations at 1280, 390, and 320 px, without page errors or horizontal page overflow. Visual review covered desktop and phone cards/dock plus coincident switch markers. It prompted the full-width probe card, compact-view control, and corrected saved-reference announcement.

Source/public byte parity, JavaScript syntax, scoped whitespace, and source-preservation audits pass. Existing electrical solving, adaptive integration, scope mathematics, topology/routing, and other workspaces are unchanged. This pass expands instruments and interpretation of calculated samples; it does not add a device model, live trigger, CircuitJS file interchange, or a new 3D rendering engine. The board retains its projected SVG geometry. Validation uses the isolated local React 18 host. Temporary edit scripts, staging files, and backups were removed.

- [Flyback sample comparison](hold35-flyback-panel.jpg)
- [Before/after markers in the full scope](hold35-flyback-scope.jpg)
- [Flyback board and energy gauge](hold35-flyback-board.jpg)
- [RC held/cursor comparison](hold35-rc-panel.jpg)
- [Final desktop comparison](hold35-panel-1280.jpg)
- [Phone comparison](hold35-panel-320.jpg)
- [Phone instrument dock](hold35-dock-320.jpg)
- [457-test regression](hold35-regression-results.txt)
- [84 final focused checks](hold35-final-results.txt)
- [Browser and accessibility results](hold35-browser-results.json)
- [Source integrity checks](hold35-integrity.json)


## Thirty-sixth pass: dimensional capacitor and inductor cutaways

- Added **Component cutaway** beside the board appearance controls. Opening it selects an available capacitor or inductor when needed, without adding an electrical edit. Its component menu shares selection with the board, dock, editor, and scope. Choosing a non-storage part leaves an explicit selection prompt; a network without storage gets an actionable example suggestion. **Find cutaway part on board** centers the existing package, and closing the cutaway restores keyboard focus to its toggle.
- Added dimensional capacitor plates and copper windings on a raised base, with metallic shading, plate edges, an insulating-gap sheet, lead connections, named A/B terminals, and optional transparent housing. Capacitor plate colors and signs follow the actual signed terminal voltage; field arrows point from positive to negative. Coil-current arrows follow signed current while closed lilac loops illustrate magnetic storage. Unknown fields suppress lines and current arrows; unknown plate polarity uses question marks. Zero state remains visually distinct from unknown state. Captions sit outside the SVG for readable, unclipped phone labels.
- Added signed plate-charge readouts, Q_A = C V and Q_B = −Q_A, with SI capacitance conversion and pC/nC/µC/mC/C formatting. Inductors show current-change rate from V/L with millihenry-to-henry conversion. This is the instantaneous constitutive slope, not a finite difference between adjacent samples. Both views retain calculated voltage, current, energy, and absorbed power, including negative power and known internal voltages in a floating network. Failed solves hide stale derived values and field states.
- Added a cursor/held cutaway comparison using the exact shared reference from pass 35. Both views inspect the same part, including distinct before/after switch samples at one timestamp. **Hold for cutaway comparison**, **Replace cutaway reference**, and **Return to cutaway reference** share the existing board reference and playback pause behavior. References that no longer match the circuit/window remain unavailable. Separate material IDs prevent collisions when two scenes render together.
- Added a local **Cutaway time cursor** and previous/next calculated-sample controls. Arrow keys step through exact samples, including switch sides; Home/End reach the first/last frames. These controls update the board and full scope through the same cursor and pause playback. Field and housing toggles persist and change presentation only. Readout cards use desktop columns, stacked phone comparisons, and full-width final power cards where needed.
- Added explanations of charge polarity, equal/opposite plate charge, signed current slope, storage continuity, and negative absorbed power. The field drawings have a fixed illustrative symbol/line count. They do not compute field strength or direction for the coil, dimensions, material parameters, winding turns, or geometry-dependent capacitance/inductance. No charges are animated across the capacitor gap. The renderer is a conceptual projected cutaway, and no automatic animation was added.

Verification: **488 targeted tests passed across twenty-three files**, including **31 new cutaway cases**; the initial focused run passed **89 checks in four files**. Coverage includes positive/negative/zero charge, SI conversions, both current directions, charged zero-power storage, flyback current/energy continuity with reversed slope, floating internal voltage, missing/nonfinite values, failed-state suppression, immutable solved state, quantity formatting, optional rendering, field directions, exact held sides, and empty-state guidance. The accessible SVG inventory increases from sixteen to seventeen declarations.

Final browser checks pass shared selection, electrical/history preservation, held/cursor comparison, plate polarity reversal after terminal swapping, layer independence, exact sample navigation and endpoints, board focus, invalid-reference suppression, negative coil current, floating circuits, failed models, empty and non-storage selections, saved preferences, unique material IDs, and compatibility with both board views, stored-energy gauges, and node inspection. Scoped axe reports zero violations at 1280, 390, and 320 px. There are no page errors or horizontal page overflow; inspected scene geometry stays inside its viewport. Visual review led to moving captions below the scene, adding local time navigation, and filling the last inductor readout row.

Source/public byte parity, syntax, scoped whitespace, and source-preservation audits pass. Existing electrical solving, time integration, scope mathematics, held-reference helpers, board geometry, and other workspaces are unchanged. New calculations are derived readouts of the existing lumped model. No device family, spatial electromagnetic solver, full-orbit 3D engine, or physical breadboard connectivity was added. Browser checks use the isolated local React 18 host. Temporary edit/staging files and backups were removed.

Physics references: the charge/voltage and polarity explanation follows [OpenStax, Capacitors and Capacitance](https://openstax.org/books/university-physics-volume-2/pages/8-1-capacitors-and-capacitance); the electric/magnetic storage discussion follows [OpenStax, Energy in a Magnetic Field](https://openstax.org/books/university-physics-volume-2/pages/14-3-energy-in-a-magnetic-field). The cutaway includes these links in its expandable lesson.

- [Capacitor charge comparison](cutaway36-charge-panel.jpg)
- [Detailed capacitor view](cutaway36-capacitor.jpg)
- [Reversed plate polarity](cutaway36-negative-capacitor.jpg)
- [Before/after flyback cutaways](cutaway36-flyback-panel.jpg)
- [Detailed inductor view](cutaway36-inductor.jpg)
- [Phone cutaway comparison](cutaway36-panel-320.jpg)
- [488-test regression](cutaway36-regression-results.txt)
- [89 focused checks](cutaway36-focused-results.txt)
- [Browser/accessibility and scene bounds](cutaway36-browser-results.json)
- [Source integrity checks](cutaway36-integrity.json)


## Thirty-seventh pass: Zener regulation, clipping, and junction curves

- Added a **Generic Zener** junction in connected DC and time response. The knee is adjustable from 1.8 to 24 V, with a 1 to 1000 Ω breakdown slope resistance; defaults are 5.1 V and 10 Ω. The existing forward exponential and reverse leakage remain. Below V = −Vz, the current adds (V + Vz)/Rz and the tangent conductance adds 1/Rz. The resulting branch is continuous at its sharp knee. Bias readouts distinguish forward conduction, reverse bias, the knee, reverse breakdown, and unknown voltage. Model settings participate in the existing electrical editing, undo, normalization, and saved-reference validation.
- Added **Zener shunt regulator**, **Zener line regulation**, and **Back-to-back Zener limiter**, bringing the connected example catalog to 33. The regulator starts with a 9 V supply, 330 Ω series resistor, and 1 kΩ load. The line example sweeps its supply from 3 to 12 V; the limiter uses opposed junctions to clip both sine polarities. Questions ask learners to predict loss of regulation, explain the finite slope of a plateau, and account for both diode drops. Example-specific red/black probes open with positive load voltage while previous examples retain their probe defaults.
- Added a responsive **junction I–V curve** for silicon, Schottky, and Zener models. It uses linear voltage/current axes, separate forward/reverse segments, an amber breakdown branch, and explicit zero axes. **Breakdown detail** zooms around the knee and omits the zero-voltage axis when it is outside the chart. Endpoint precision increases for narrow views. The current range is selectable at ±1, ±20, or ±200 mA. Changing the view or range preserves the electrical design/history and cursor.
- Added a cream live operating-point marker and a cyan held-sample diamond using the existing validated same-run reference. These are circuit operating points on a component characteristic, not time-axis samples. Outside-range or undetermined points are omitted and explained rather than pinned to a chart edge. Signed voltage/current and absorbed-power readings remain beneath the chart. Accessible chart names include the part, bias state, readings, and point visibility.
- Added a lilac projected Zener package, bent cathode mark, and amber reverse-breakdown outline. The physical cathode band remains at terminal B. Package dimensions and routing geometry are preserved. Appended knee voltage, slope resistance, and bias-state columns to DC and transient CSV; previous columns keep their positions. Source/public app copies remain byte-identical.

Model scope: this is a generic teaching junction with a sharp onset and a constant reverse slope. Vz is not the usual datasheet voltage specified at a rated test current. Forward series resistance, soft breakdown knees, junction capacitance, reverse recovery, temperature dependence, noise, heating, ratings, and damage are not modeled. Include external current-limiting resistance. The [Nexperia Zener application note](https://assets.nexperia.com/documents/application-note/AN90031.pdf) informed the distinction between breakdown onset, test-current voltage, and nonzero dynamic resistance; the implementation is not a fit to a named device or a full SPICE/CircuitJS diode model.

Verification: **526 targeted tests passed across twenty-four files**, including **38 new Zener/curve checks**. The main run passed 482 checks in 22 files; two workers timed out before startup, and all 44 checks in those two files subsequently passed with fresh process workers. No test assertions failed. An initial focused run passed 65 checks before the breakdown-detail refinement. References cover independent regulator load-line roots at positive/negative supplies, a closed-form regulated voltage and slope, load dropout, reverse current drive, floating and parallel networks, direct reverse power, knee continuity, and diagnostics for excessive ideal forward drive. Capacitor charging across the knee agrees with a piecewise analytical transient; opposed-Zener peak voltages and branch currents agree with independent inverse-junction/load-line roots. Tests also cover current and power balance, metadata alignment, narrow-axis precision, model immutability, curve samples, and hidden invalid/out-of-range points. The accessible SVG inventory increases from seventeen to eighteen declarations.

Browser checks pass model editing, polarity reversal, undo, existing junction presets, chart-region/range changes, shared held/live points, load/source scope selection, both limiter polarities, saved display settings, and failed-state suppression. All three new examples solve with clear routes and nonoverlapping board labels. Scoped axe finds zero violations at 1280, 390, and 320 px; there are no page errors, horizontal page overflow, or nonfinite SVG paths. Browser checks use the isolated local React 18 host. The Playwright harness dispatches native range-input events because direct fill compares differently serialized floating-point step values. Visual review covers the regulator editor/board, knee-detail chart, and phone comparison.

The source audit identifies the intended diode-law, metadata, editor, board-presentation, and example-loading changes. It verifies 86 existing connected-workspace functions unchanged, including nonlinear iteration, state integration, scope mathematics, camera/routing, held references, and storage cutaways. This pass adds a diode constitutive branch; it does not replace the numerical methods or change other workspaces. Syntax, scoped whitespace, and source/public parity checks pass. The [roadmap](circuitjs-parity-roadmap.md) now records Zener coverage and the remaining analog, digital, editing, and rendering stages.

- [Regulator editor](zener37-regulator-editor.jpg)
- [Projected Zener board](zener37-regulator-board.jpg)
- [Breakdown detail](zener37-knee-detail.jpg)
- [Held and live operating points](zener37-held-curve.jpg)
- [Line-regulation scope](zener37-line-output-scope.jpg)
- [Signal-limiter scope](zener37-limiter-scope.jpg)
- [Phone I–V explorer](zener37-curve-320.jpg)
- [Main regression run](zener37-regression-results.txt)
- [44-test worker-startup retry](zener37-retry-results.txt)
- [Initial focused checks](zener37-focused-results.txt)
- [Browser and accessibility results](zener37-browser-results.json)
- [Source integrity checks](zener37-integrity.json)


## Thirty-eighth pass: internal diode resistance and voltage/power exploration

- Added optional **internal series resistance** to connected silicon, Schottky, and Zener diodes. Values range from 0 to 1000 Ω, normalized to 0.001 Ω precision. Zero resistance retains the previous normalized model shape and junction behavior. Switching junction presets preserves the chosen resistance; zero restores the earlier junction-only model. This resistance is separate from an external circuit resistor and from a Zener’s breakdown slope resistance.
- Added an implicit local solve for Vterminal = Vjunction + Rs × I(Vjunction), using a monotone bracket and safeguarded Newton steps, bounded to 90 iterations. The terminal tangent conductance is gj/(1 + Rs × gj). The existing forward step limit follows the internal junction voltage when Rs is present, so a large resistive terminal drop does not incorrectly consume the forward-junction iteration budget. No clipped-current substitute is used. The original zero-Rs path and its excessive-forward-drive diagnostic remain.
- Added **Diode internal resistance**, **Diode resistance under a current sweep**, and **Two resistances in a Zener**, bringing the connected catalog to 36 examples. Current-driven lessons ask learners to distinguish logarithmic junction voltage from the linear I × Rs contribution, predict the square-law power increase, compare a held sample with a peak, and separate Rs from a Zener’s reverse-slope resistance. Source/terminal limits are unchanged; a current source may require a terminal voltage above the voltage-source setting range.
- Added a dimensional **Inside the diode model** inspector with shaded resistance/junction blocks, metallic lead connections, signed current arrows, readable external part/node captions, and an explicit equivalent-model explanation. The panel shows Vterminal, I × Rs, Vjunction, and the common current. A two-color bar and keyed numerical readings separate I²Rs from Vjunction × I. These sum to the existing terminal absorbed power and are not added again to the circuit total. At zero power the bar is empty; unknown voltage/current suppress calculated contributions and arrows. The view opens initially for a nonzero-Rs model; its disclosure preference is saved when changed.
- Updated the I–V plot to show the **terminal characteristic** when Rs is enabled. A persisted **Compare junction alone** toggle adds a clipped lilac dotted reference for the same junction with Rs = 0 on shared axes. Curve samples are generated from junction voltage and projected through Vterminal = Vj + RsI, so the selected current range and shifted reverse knee stay consistent with the model. Live and held markers remain terminal operating points from the same validated run; the dotted curve is an alternative model, not another measured trace. The existing warning explains off-chart points. Bias states are determined from internal junction voltage rather than the full terminal drop.
- Updated the forward reference drops, model assumptions, and global limits. Appended Rs, junction voltage, series voltage, junction power, and series power to DC and transient CSV while retaining all prior column positions. Old Zener metadata checks now explicitly verify its position immediately before the five appended columns.

Model scope: Rs is a constant, lumped ohmic resistance in both directions. The intrinsic silicon/Schottky exponential and Zener sharp-knee branch remain the existing teaching models. This does not add junction capacitance, reverse recovery, temperature dependence, noise, heating, damage, or a fit to a named commercial device. The illustration is an equivalent circuit in a dimensional style, not a chip cross-section or physical geometry model. The [ngspice manual, Junction Diodes](https://ngspice.sourceforge.io/docs/ngspice-manual.pdf) provides the reference context for an optional series-resistance parameter; Circuit Bench implements its own bounded local solve and does not claim equivalence to ngspice’s complete diode model.

Verification: **555 targeted checks passed in 25 files**, including **29 new resistance cases**. The initial focused run passed 96 checks; after the final visual refinements, another **96 checks in four files passed**. References include independent parametric junction/terminal values, bisection roots, terminal derivatives, and separately wired resistor-plus-diode networks for all three presets in both polarities. A 100 mA source with Rs up to 1 kΩ verifies internal-junction step limiting above 100 V terminal voltage. Additional cases cover reverse-knee classification, floating and same-node networks, explicit unknown readings, signed voltage and positive power, current/power conservation, CSV reconstruction, curve endpoints, and model immutability. A piecewise analytical capacitor charge validates the series-loaded Zener transient; a sinusoidal current sweep matches the closed-form forward drop and checks held-reference invalidation after resistance changes.

Browser checks pass editing/undo, zero resistance, preset changes, large terminal drops, current sweeps, live/held points, reverse current, Rs/Rz separation, saved curve/disclosure preferences, and failure suppression. All three new examples solve with clear routes. Scoped axe finds zero violations at 1280, 390, and 320 px; there are no page errors, horizontal overflow, nonfinite SVG paths, or duplicate gradient/clip IDs. Visual review led to moving model labels outside the SVG, strengthening the metallic lead connections, and keying the power bar colors to their numerical labels. The browser host is the isolated local React 18 workbench.

The source audit confirms byte-identical source/public files and 88 unchanged connected-workspace functions, including matrix solving, time integration, scope calculations, camera/routing, held references, and the board renderer. The intended numerical changes are the new local diode equation and its junction-based forward-step limiter. Other workspaces remain unchanged. Syntax and scoped whitespace checks pass. The [coverage roadmap](circuitjs-parity-roadmap.md) records the added diode behavior and remaining semiconductor, digital, editing, and rendering stages.

- [Dimensional diode model and power split](resistance38-forward-inside.jpg)
- [Terminal and junction I–V comparison](resistance38-forward-curve.jpg)
- [Held/peak curve comparison](resistance38-held-curve.jpg)
- [Current-driven scope](resistance38-sweep-scope.jpg)
- [Zener voltage and power split](resistance38-zener-inside.jpg)
- [Zener curve comparison](resistance38-zener-curve.jpg)
- [Phone model inspector](resistance38-inside-320.jpg)
- [Phone I–V curve](resistance38-curve-320.jpg)
- [555-test regression](resistance38-regression-results.txt)
- [96 final focused checks](resistance38-final-results.txt)
- [Browser/accessibility results](resistance38-browser-results.json)
- [Source integrity checks](resistance38-integrity.json)


## Thirty-ninth pass: harmonic exploration and waveform reconstruction

- Added an optional **Harmonic explorer** to connected time response, with a direct **Open harmonic explorer** shortcut that opens the panel, scrolls to it, and transfers keyboard focus. Analyze the selected component's signed voltage or current against an independent periodic source's frequency. Settings persist across ordinary display changes; the three new investigations open the explorer automatically.
- Added **Build a triangle from harmonics**, **Clipping makes new harmonics**, and **A filter reshapes pulse harmonics**, bringing the connected catalog to **39 examples**. The investigations connect waveform symmetry to odd/even orders, amplifier output limits to distortion, and RC attenuation to harmonic frequency. They guide prediction, component comparison, and reconstruction using the existing electrical models.
- Added native keyboard-operable H1–H12 bars with **linear amplitude** and **log amplitude** views, selected-order frequency/RMS/peak/relative-amplitude readings, signed DC mean, AC RMS, and explicitly limited **THD through the requested order**. Log height is relative to the tallest amplitude, uses 20 log10(amplitude/tallest), and clips the visible bar below −60 dB. Selecting a bar retains its numerical values even when its height is too small to see. Undetermined orders use a patterned unknown state, never zero. Numerically negligible display readings are marked approximately zero; CSV retains the calculated values.
- Added a shared-scale waveform comparison of the last reference cycle with either **DC + all measured harmonics** or **DC + the selected harmonic**. The curves use signed cosine/sine coefficients with the measurement start as phase origin. The panel explains that the source frequency may differ from the output's fundamental, that finite harmonic sums can overshoot edges, and that harmonic amplitudes are not power. Phone charts keep sufficient vertical space and place their labels outside the SVG.
- Added a separate 1–8 complete-source-cycle interval and selectable highest order from H2 through H12. **Show interval in scope** focuses that time interval without changing the existing S–E measurements. An accessible numerical table and **Export harmonics CSV** provide SI amplitudes, signed coefficients, DC/RMS, phase origin, sample gap, requested/supported order, availability, and method metadata for reconstruction.

Numerical method: integrate the Fourier projection of each calculated straight-line segment directly, with elapsed-time weighting and a rectangular interval containing a whole number of reference cycles. Mean removal and scale normalization protect small ripple on large offsets. Centered sinc/odd integrals use series expansions for very small steps. Duplicate switch timestamps retain the correct before/after sides without inventing a ramp. There is no uniform resampling or FFT, and opening the instrument does not alter solver steps or electrical state.

The resolution guard requires the largest original sample gap overlapping the interval to be no more than 1/(16 × harmonic frequency). Unsupported orders remain unavailable, and the requested THD is withheld if any requested order is unsupported. Relative amplitudes and THD also require a resolvable H1. This guard does not certify the underlying continuous waveform: finer simulation steps can change small harmonics. Incomplete intervals, failed runs, unknown readings, and missing explicit references suppress results. Notices identify endpoint mismatch, an interval containing scheduled switching, and other source frequencies that are not integer multiples of the chosen base.

Scope: this is a source-referenced, finite-order harmonic analysis of a simulated interval. THD uses the RMS root-sum-square of H2 through the requested order divided by H1; it excludes DC and all higher orders. Startup, unrelated frequencies, finite sampling, and settling can affect the projection. It does not add arbitrary-frequency FFT spectra, window functions, noise analysis, general AC small-signal analysis, new device physics, or a mesh-based 3D renderer. The [NI Fourier analysis guide](https://knowledge.ni.com/KnowledgeArticleDetails?id=kA03q000000YHDjCAO&l=en-US) provides reference context for source-referenced harmonics and truncated THD; [Analog Devices' coherent-sampling discussion](https://www.analog.com/en/resources/technical-articles/coherent-sampling-vs-window-sampling.html) explains why interval/cycle alignment matters. Circuit Bench uses its own direct piecewise-linear integration method.

Verification: **586 checks passed in 26 files**, including **31 new harmonic cases**. An initial focused run passed 63 checks; after the final scope shortcut, **93 checks in four files passed**. Analytical references include linear-interpolated sine attenuation, exact triangle coefficients, square-wave coefficients with duplicate event times, ramp coefficients, known third/fifth harmonic distortion, signed reconstruction, and actual RC transfer magnitudes by harmonic order. Other cases cover highly uneven spacing, millivolt ripple on a large offset, absent fundamentals, current units, unknown currents, missing coverage, sparse original intervals, missing sources, multiple frequencies, invalid windows, CSV reconstruction, and stale-value suppression.

Final browser checks pass keyboard harmonic selection, direct shortcut/focus, isolation/summing, log/linear viewing, voltage/current changes, complete-cycle selection, independent scope focus, saved settings, CSV download, component comparison, and DC/time switching. All three new examples solve with clear board routes. Scoped axe reports **zero violations at 1280, 390, and 320 px**, with no horizontal overflow, browser page errors, nonfinite SVG paths, or duplicate gradient/clip IDs. Visual review corrected selected-button contrast, strengthened the phone reconstruction plot, and replaced roundoff-sized DC readouts with approximately-zero presentation. Browser QA uses the isolated local React 18 workbench.

The source audit confirms byte-identical source/public copies, **100 unchanged connected-workspace functions**, and unchanged other workspaces. Only the existing scope and workbench wiring functions changed; four harmonic helper/presentation functions were added. Matrix solving, diode laws, integration, existing measurements, board rendering, routing, camera behavior, and held references remain unchanged. All 20 SVG declarations have an explicit image role and accessible name. Syntax and scoped whitespace checks pass. The [coverage roadmap](circuitjs-parity-roadmap.md) distinguishes this instrument from the remaining broader spectral and CircuitJS coverage work.

- [Logarithmic harmonic explorer](harmonics39-triangle-log.jpg)
- [Individual harmonic reconstruction](harmonics39-triangle-isolated.jpg)
- [Amplifier clipping investigation](harmonics39-harmonic-clipping.jpg)
- [Pulse-filter investigation](harmonics39-harmonic-smoothing.jpg)
- [Desktop explorer](harmonics39-explorer-1280.jpg)
- [Phone explorer](harmonics39-explorer-320.jpg)
- [Example SI export](harmonics39-export.csv)
- [586-test regression](harmonics39-regression-results.txt)
- [93 final checks](harmonics39-final-results.txt)
- [Browser/accessibility results](harmonics39-browser-results.json)
- [Source integrity checks](harmonics39-integrity.json)


## Fortieth pass: orbitable 3D board and shared simulation state

- Added **Orbit 3D board** to the connected workbench. This is a real WebGL scene with 360° horizontal orbit, elevation from 15° to 85° above the board, perspective projection, depth testing, and ray-based component/node selection. Existing projected and flat views remain available. The new scene reuses the application's bundled Three.js r128 and OrbitControls through the shared local-first loader; no dependency or asset installation was needed.
- Added solid resistor bodies and bands, capacitor packages, copper helical inductors, diode bodies and cathode bands, source and amplifier packages, switches with moving levers, metallic pads/leads, node posts, mounting hardware, and a layered board. Materials have roughness and metalness, with directional/hemisphere lighting and soft shadows. Color-space handling keeps the materials from washing out. Close-up review connected the visible coil ends and capacitor/switch leads to their terminals.
- Converted the existing flat routing plan into stable world-space connections. Paths keep their positions as the camera moves. Distinct wire elevations and real occlusion clarify crossings, while named nodes remain the electrical authority. Dashed sensing links are separate from current-carrying leads. Decorative grid and sensing lines do not intercept picking; opaque packages and physical wires retain depth-aware selection behavior.
- Added **Isometric**, **Front**, **Rear**, **Overhead**, **Fit whole board**, and **Focus selected in 3D** controls. Camera fitting accounts for scene corners, view angle, and viewport aspect ratio. Rotation, elevation, zoom, and pan are saved independently of the electrical model. Arrow keys rotate/tilt, Shift plus arrows pan, plus/minus zoom, Home fits the scene, and F focuses the selected part. The canvas has a visible keyboard-focus outline; named component and node controls provide alternatives to picking small objects.
- Connected the scene to the existing selected component, voltage probes, node inspector, scope cursor, and board instruments. Node-voltage colors, conventional-current arrows, exact before/after switch positions, and capacitor/inductor energy gauges follow the same solved snapshot. Energy gauges use the existing shared whole-run joule reference. Camera and display changes preserve component values, edit history, selected time, and held samples.
- Added optional **Drag to orbit**, persistent label visibility, and **Lightweight rendering**. Gestures start disabled so the canvas permits ordinary page scrolling. Enabling gestures supports rotation, zoom, and pan; disabling them restores vertical scrolling. Lightweight rendering disables shadows and caps pixel ratio at one; the normal mode caps it at 1.5. Frames render on changes rather than in a continuous idle animation loop, and hidden/offscreen scenes defer drawing.
- Added bounded engine loading, a clear projected-board fallback, graphics-context-loss handling, and **Retry 3D graphics** with a fresh canvas. Leaving the view disposes controls, observers/listeners, geometries, materials, textures, shadow resources, and the renderer. The implementation follows the ownership/lifecycle APIs in the pinned [OrbitControls source](https://github.com/mrdoob/three.js/blob/r128/examples/js/controls/OrbitControls.js) and [WebGLRenderer source](https://github.com/mrdoob/three.js/blob/r128/src/renderers/WebGLRenderer.js).

Scope: this pass adds a 3D presentation layer driven by the existing lumped circuit simulation. The packages, pin shapes, dimensions, and lead heights are illustrative, not hardware pinouts or an electrically modeled breadboard. It does not calculate electromagnetic fields, physical device geometry, temperature, or charge transport. Connections still come from the named-node editor. Current arrows and energy gauges describe calculated values, not particle speed or field strength. The electrical solver, component coverage, integration method, and 39-example catalog are unchanged.

Try **Connected circuits → RLC ringing → Orbit 3D board**. Scrub the board time cursor, switch to **Stored energy**, and focus the capacitor or inductor. **Inductor flyback** adds an exact before/after switch comparison in the same 3D scene.

Verification: **605 checks passed in 27 files**, including **19 new orbit cases**. The focused geometry/loader/presentation run passed 29 checks; after the final lead and instruction refinements, **109 checks in six files passed**. New coverage includes saved-camera bounds and angle wrapping, finite dense scenes with every supported device family, route endpoints and named-node mapping, separate sensing links, camera corner fitting at multiple aspect ratios and elevations, electrical/held-reference invariance, shared loader requirements/failure/timeout behavior, accessible controls, and exact switch-side timestamps.

Final browser checks render **all 39 examples** with the expected component count, finite geometry, and clear routes. Picking works after four camera orientations; pointer and keyboard navigation, node probing/inspection, saved poses, exact switch-state changes, labels, graphics quality, overlays, and held-state preservation pass. The idle renderer stays idle, exiting the scene releases its GPU geometry, context-loss retry creates a working fresh scene, and a failed asset load offers the working projected view. Scoped axe reports **zero violations at 1280, 390, and 320 px**, with no horizontal overflow or browser page errors. Desktop, close-up, and phone screenshots were visually reviewed. These checks use the isolated local React 18 workbench and the bundled real Three.js runtime in headless Chromium with software WebGL; they are not a hardware GPU performance benchmark.

The source audit confirms byte-identical source/public files and **105 unchanged connected-workspace functions**, including matrix solving, all device laws, time integration, scope/harmonic measurements, routing, projected rendering, and held references. Only the existing workbench wiring function changed; six new 3D helper/presentation functions were added. Other workspaces and vendor assets remain unchanged. Syntax and scoped whitespace checks pass. The [coverage roadmap](circuitjs-parity-roadmap.md) now records the implemented mesh/orbit layer separately from future physical-breadboard, field, and device-model work.

- [Orbitable RLC board](orbit40-rlc-isometric.jpg)
- [Close-up component and lead detail](orbit40-capacitor-detail.jpg)
- [Stored-energy overlay](orbit40-energy.jpg)
- [Node-voltage overlay](orbit40-voltage.jpg)
- [Switch before opening](orbit40-switch-before.jpg)
- [Switch after opening](orbit40-switch-after.jpg)
- [Desktop 3D workbench](orbit40-board-1280.jpg)
- [Phone 3D workbench](orbit40-board-320.jpg)
- [605-test regression](orbit40-regression-results.txt)
- [109 final checks](orbit40-final-results.txt)
- [Browser/accessibility and catalog results](orbit40-browser-results.json)
- [Source integrity checks](orbit40-integrity.json)


## Forty-first pass: current trails and signed branch readings in 3D

- Added **Current trails** to the orbit board, with **Selected branch**, **All visible branches**, and **Off** settings. Small instanced markers follow the existing rounded lead geometry and reverse with the calculated conventional current. They respect node inspection and branch emphasis, leave sensing links unanimated, and do not intercept component or node picking. Static direction arrows remain available independently of trails.
- Added **Play current trails**, **Pause current trails**, and keyboard-operable **Step current trails**. The scene starts paused. Playback describes the displayed DC or time snapshot; it does not move the simulation cursor, change component values, or invalidate a held sample. Display mode persists, while playback requires an explicit action when reopening the scene.
- Added selected-component **A/B terminal badges** and a readable branch panel that maps terminals to named nodes, displays signed current and voltage, and explains signed power. Positive current enters A; negative current reverses that direction. Positive power describes electrical energy entering the component and negative power describes energy leaving it. Capacitor guidance keeps lead-current markers distinct from charge crossing a dielectric; inductor guidance connects sustained current with returning stored energy.
- Respect both the operating system's reduced-motion setting, including changes while the board is open, and the circuit's saved motion pause. Manual stepping remains available. A deliberate **Resume circuit motion** action is offered when the shared circuit pause is the blocker. Playback stops when reduced motion or the shared pause turns on and does not restart merely because reduced motion turns off.
- Keep GPU work bounded: markers share geometry/materials, each lead uses an instanced mesh with at most 24 markers, and active drawing is capped near 30 frames per second. Paused scenes render on changes, playback suspends offscreen or in a hidden document, and shadow maps update when scene settings or data change. Instance buffers are disposed alongside the existing scene resources. Resize handling avoids clearing an unchanged drawing buffer, readiness reflects a completed draw, and passive scroll handling refreshes the scene on demand.

Model scope: these are direction markers for one solved lumped-circuit snapshot. Illustrative travel speed and spacing do not encode current magnitude, drift velocity, transit time, or individual particles. Markers stop at the component's leads rather than depicting transport through its interior. Unknown/nonfinite currents receive no direction; exactly zero current and finite magnitudes at or below 1 pA receive no trail, with distinct explanations in the readout. Current magnitude remains available numerically. No new device physics, electromagnetic fields, physical breadboard connectivity, netlist editing, or CircuitJS component coverage is added. The conventional-current sign convention is described in [OpenStax's current discussion](https://openstax.org/books/university-physics-volume-2/pages/9-1-electrical-current) and its treatment of [signed circuit traversal](https://openstax.org/books/university-physics-volume-2/pages/10-3-kirchhoffs-rules).

Try **Connected circuits → RLC ringing → Orbit 3D board**. Choose a component, use **Focus selected in 3D**, and step or play its current trails. Move the existing time cursor to compare current directions. In **Inductor flyback**, compare the switch-event sides and select the inductor: current can keep its direction while the signed-power reading changes to delivering energy.

Verification: the expanded circuit regression passed **758 checks in 48 files**, including **20 new trail tests**. After the final redraw refinement, **49 checks in four files passed**. Coverage includes signed direction independent of voltage/power, solved source/load behavior, ambiguous ideal-source currents, zero and subthreshold readings, finite bounded trail placement, opposite A/B lead travel, equal illustrative speed, electrical/held-state preservation, accessible controls, and capacitor teaching text. The wider suite exposed a pre-existing accessibility test that assumed there were only 12 tables; the baseline already had 15. The updated test parses the source and verifies a direct nonempty caption for every table while retaining the reference-table checks.

The final browser run uses the bundled real Three.js runtime in the isolated React 18 workbench, with Chromium software WebGL. It covers all **39 examples**, real RLC sign reversals, exact switch-event sides, open/unknown/failed-current suppression, selected/all/off trail filtering, node incidence, manual stepping, playback without cursor movement, held-state preservation, live motion preferences, offscreen suspension, picking, camera persistence, context-loss recovery, fallback, and GPU disposal. Scoped axe reports **zero violations at 1280, 390, and 320 px**, with no horizontal overflow or browser page errors. Screenshots require actual board pixels and allow a bounded compositor wait; merely finding a canvas or a ready attribute is insufficient. This is functional and visual validation, not a hardware GPU benchmark.

Source audit: the source and public copy are byte-identical; **109 existing connected-workspace functions remain unchanged**, including all electrical solving, integration, measurement, routing, and held-reference functions. Only the orbit scene, orbit presentation, and workbench wiring changed; two pure trail/reading helpers were added. Other workspaces are preserved. Syntax and scoped whitespace checks pass.

- [Selected current trail](flow41-selected-trails.png)
- [All visible branches](flow41-all-trails.png)
- [Capacitor close-up and terminal mapping](flow41-capacitor-detail.png)
- [Inductor returning energy](flow41-flyback-reading.png)
- [Desktop board](flow41-board-1280.png)
- [Narrow-phone board](flow41-board-320.png)
- [758-test regression](flow41-regression-results.txt)
- [49 final checks](flow41-final-results.txt)
- [Browser, pixel, and accessibility results](flow41-browser-results.json)
- [Source integrity](flow41-integrity.json)


## Forty-second pass: expanded 3D workspace and exact-sample navigation

- Added **Expand 3D workspace**, an in-app expanded view with a larger scene and a separate controls/readings panel on wide screens. Phones use a single-column layout with a persistent **Return to workbench** action. Phone canvas proportions follow the available width, reducing empty vertical space and bringing the time controls and component selector closer to the board. The normal inline view remains available.
- Replaced the row of camera-preset buttons with a compact **Camera view** selector for Isometric, Front, Rear, and Overhead. A modified angle is shown as Custom view; the rear preset correctly matches the camera's wrapped −180° angle. **Fit whole board** and **Focus selected in 3D** remain prominent. **Camera & display** groups rotation, tilt, zoom, gesture, label, and rendering-quality controls in a keyboard-operable disclosure that remembers whether it is open.
- Added **Simulation snapshot** controls to both 3D layouts for valid time runs: **Play/Pause 3D response**, previous/next calculated samples, and an accessible sample-position slider. They use the existing playback controller and seek function. The slider enumerates actual stored samples; it does not imply uniform time spacing. Adjacent before/after switch snapshots retain their distinct sides at the same timestamp. Manual seeking pauses response playback. Current-trail controls remain a separate illustrative animation of the displayed snapshot.
- Keep component selection, probes, camera settings, electrical edits/history, and held references across view transitions. The expanded view itself is temporary and does not reopen automatically. Current-trail playback pauses when changing layouts. Entering and leaving the expanded view disposes the previous canvas's graphics resources and recreates the scene from the same shared state using the already-loaded engine; the rendering implementation is unchanged.
- Use a native modal dialog so the expanded board is displayed above surrounding app layers and background controls are inert. Escape returns to the inline workbench without also closing the enclosing tool, and focus returns to the expansion button. Closing and failed opening restore the prior page overflow value and CSS priority. A failed opening leaves the inline board available and keyboard focus recoverable. This follows the native [HTML dialog behavior](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element) without requiring browser fullscreen permission.

Try **Connected circuits → RLC ringing → Orbit 3D board → Expand 3D workspace**. Select a capacitor or inductor, focus it, and play or step the response. In **Inductor flyback**, previous/next sample controls cross the switch event while keeping both calculated sides visible at the same time value.

Verification: **145 relevant regression checks in nine files passed**, followed by **49 final checks in four files** after the JavaScript refinements. Real-browser checks cover preset recognition, disclosure persistence, larger scene area, native modality, focus/Tab/Escape behavior, selection/probe/camera/held preservation, shared response playback, first/last sample bounds, exact before/after switch states and lever positions, trail playback followed by idle rendering, context-loss retry inside the expanded view, repeated GPU disposal, failed dialog opening, and prior scroll-style restoration. These checks exercise the existing RLC ringing and inductor-flyback examples; the 39-example catalog is unchanged.

Final responsive validation covers inline and expanded views at **1280 × 1000, 390 × 1000, 320 × 1000, and 844 × 390**. Scoped axe reports zero violations and no horizontal overflow; browser page-error logs are empty. Screenshots capture the visible viewport and assert rendered board pixels, avoiding oversized headless captures that can omit a WebGL layer. Desktop, phone, and landscape captures are retained. The browser runs in the isolated local React 18 harness with bundled Three.js r128 and Chromium software WebGL; this is not a hardware performance benchmark.

The source and public copy are byte-identical. Only the orbit presentation function, workbench wiring, and orbit stylesheet changed. **112 existing connected-workspace functions remain unchanged**, including the renderer, electrical solver, integration, routing, measurements, and held references. All other source code is preserved apart from whitespace. Syntax and scoped whitespace checks pass. This pass expands workspace usability and navigation; it adds no device models, electromagnetic simulation, physical breadboard connectivity, or CircuitJS interchange.

- [Expanded desktop workspace](space42-expanded-1280.png)
- [Expanded phone workspace](space42-expanded-320.png)
- [Compact inline phone view](space42-inline-320.png)
- [Inductor close-up](space42-inductor-detail.png)
- [Exact switch-event navigation](space42-switch-event.png)
- [Landscape workspace](space42-expanded-landscape.png)
- [145 regression checks](space42-regression-results.txt)
- [49 final checks](space42-final-results.txt)
- [Interaction and lifecycle results](space42-browser-results.json)
- [Final responsive/accessibility results](space42-responsive-results.json)
- [Source integrity](space42-integrity.json)


## Forty-third pass: live signal instruments inside the 3D workspace

- Added a **Trace** instrument for the selected 3D component, with **Voltage A − B**, **Current A → B**, **Power absorbed**, and **Stored energy**. The expanded desktop view places it in the side panel and keeps the large 3D scene. Inline and phone layouts place it after the playback controls. Resizing an open expanded view moves the single instrument between these locations without recreating the graphics renderer.
- The plot uses the existing calculated samples and an elapsed-time axis, with a fixed whole-run vertical scale for each part/metric, a dashed zero line, amber switch-event lines, a live cursor, and the existing held-sample diamond/readout. The stored sample slider continues to enumerate samples rather than imply uniform time spacing. Unknown and nonfinite readings break the path instead of becoming zero or joining across an unknown interval.
- **Lowest** and **Highest** visit the first calculated sample with the corresponding value, preserving the exact before/after side of a switch. Clicking the plot uses the workbench's existing nearest-sample seek. Arrow keys step samples; Home/End reach the first/last sample. All these actions pause shared response playback and keep the model, edit history, and held reference intact. These are sampled extrema, not a search for an exact continuous-time peak.
- The selected signal preference persists across layout and component changes. Stored energy is available for capacitors and inductors. Selecting another part temporarily shows voltage while retaining the stored-energy preference for returning to a storage component. An ambiguous ideal-source current displays **Undetermined**, with no trace point or available extrema.
- **Read this trace** reveals terminal/sign guidance, zero/scale and gap explanations, navigation help, and held/cursor timestamps. Negative power is shown as energy returning to the network. Textual readings and an SVG description accompany the visual plot; keyboard controls and visible focus indicators remain available. Phone playback controls come before the plot and its expandable explanation.

Try **Connected circuits → RLC ringing → Orbit 3D board → Expand 3D workspace**. Select the inductor, choose **Power absorbed**, and visit **Lowest** to see it returning energy. Switch to **Stored energy**, then compare the trace with the board's energy layer. In **Inductor flyback**, select the switch and use the plot's arrow keys to step between the before/after snapshots at one time value.

Validation: **181 tests in 11 files pass after the final layout refinement**, including **17 new signal tests** for nonuniform time positions, duplicate event times/sides, first tied extrema, unknown/nonfinite gaps, unavailable data, stable zero baselines, very large/subnormal values, storage-only energy availability, signed source/load power, solver/held preservation, textual alternatives, and DC omission. An earlier focused run passed 95 checks in five files.

The browser checks use the existing RLC ringing and inductor-flyback examples plus an ambiguous parallel-source circuit. They compare every displayed metric/path/cursor against the existing solver data, exercise extremum and pointer/keyboard seeking, shared playback pause, held references, responsive placement, modal focus return, and actual 3D switch-lever states. Inline and expanded views at **1280 × 1000, 390 × 1000, 320 × 1000, and 844 × 390** have zero scoped axe violations, no horizontal overflow, and no browser page errors. Eight viewport captures require rendered board pixels; separate signal and landscape images are retained. Final desktop, phone, and signal-panel screenshots were visually reviewed.

Browser validation runs in the isolated local React 18 workbench using bundled Three.js r128 and Chromium software WebGL. It does not measure hardware GPU performance or establish full-host application integration. The source/public copy is byte-identical; **112 existing connected-workspace functions are unchanged**, including the renderer, solver, device laws, time integration, routing, measurements, and held-reference functions. Only the orbit presentation and workbench wiring changed; two signal presentation/helper functions and styling were added. All remaining code is preserved apart from whitespace. This improves exploration of existing simulations; device coverage and the 39-example catalog remain unchanged.

- [Expanded desktop scene and signal instrument](signal43-expanded-1280.png)
- [Inductor delivering energy](signal43-inductor-power.png)
- [Desktop signal instrument](signal43-trace-1280.png)
- [Phone workspace](signal43-expanded-320.png)
- [Phone signal plot](signal43-trace-320.png)
- [Exact switch-event comparison](signal43-switch-event.png)
- [Undetermined source current](signal43-undetermined.png)
- [Final 181-test results](signal43-final-results.txt)
- [Browser, pixel, and accessibility results](signal43-browser-results.json)
- [Source integrity](signal43-integrity.json)


## Forty-fourth pass: differential probing inside the 3D workspace

- Added a **Voltage probes** instrument to the orbit board, including its expanded workspace. Its signed voltage stays visible when the native disclosure is closed, and the open/closed preference persists. Opening it reveals distinct red/black lead controls, each node's voltage relative to reference node 0, and clear placement instructions.
- **Swap 3D probes** reverses the pair. **Probe selected part** places red at terminal A and black at terminal B. **Place red/black** selects the active lead, then a 3D node click or named-node selector places it. These actions share the existing workbench probe state and return from node inspection to probe placement. They preserve the circuit, edit history, selected time, and held sample.
- Added **Scene layer** inside the 3D controls for current directions, node voltages, and stored energy. The voltage legend uses the same palette and scale as the renderer, labels node potentials relative to 0, and identifies undetermined readings. Time runs retain their existing whole-run voltage scale; energy gauges retain their shared joule scale.
- The meter uses the existing solver's differential voltage directly. A known difference between floating nodes remains available even when their individual voltages relative to 0 are undetermined. Same-node zero, equal known potentials, unused nodes, unresolved differences, and failed calculations receive distinct explanations. Unknown or nonfinite readings never become fabricated zeroes.
- If a valid sample is held, the meter compares the current probe pair at both snapshots and displays the signed change, cursor minus held. Moving or swapping leads updates both readings consistently. Before/after switch samples remain distinct even at one timestamp. Live announcements pause during response playback.

Try **Connected circuits → Orbit 3D board → Expand 3D workspace → Voltage probes**. Select a resistor and use **Probe selected part**, then **Swap 3D probes** to see polarity reverse. Choose **Node voltages** to compare the reference-relative wire colors with the differential meter. For a time run, hold a sample in the workbench before expanding, then step the 3D response to compare its probe voltage.

Validation: the **14-file regression passed 225 checks and encountered one setup timeout** in the held-sample comparison file. That complete file then passed **35 checks in isolation**, completing verification of **226 unique checks**, including **15 new meter checks** covering divider voltages, reversed leads, known floating differences, same-node and equal-potential zeroes, separately floating sections, unused nodes, failed calculations, nonfinite suppression, same-pair held comparisons, exact switch-event sides, and accessible presentation. The initial focused run encountered six loading/rendering timeouts at the default 5-second test/10-second hook limits. The broad run used one worker and 30-second test/hook limits after browser validation; the isolated comparison retry used a 60-second hook limit.

Real-browser checks exercise a divider, a floating source/load, and the existing inductor-flyback example. They verify actual 3D node picking with both leads, shared workbench/probe state, scene-layer changes, inspection exit, disclosure persistence, modal focus return, signed held/current differences, exact switch sides and lever positions, and playback announcement behavior. Inline and expanded views at **1280 × 1000, 390 × 1000, 320 × 1000, and 844 × 390** have zero scoped axe violations, no horizontal overflow, and no browser page errors. Eight viewport captures assert rendered board pixels; separate instrument, floating-circuit, switch-comparison, and landscape images are retained. Desktop and narrow-phone instrument previews were visually reviewed.

The source/public copies are byte-identical. **114 existing connected-workspace functions remain unchanged**, including the renderer, solver, device laws, integration, waveform instruments, routing, and held-reference calculations. Only the orbit presentation and workbench wiring changed; two meter helper/presentation functions and styling were added. All other source code is preserved apart from whitespace. No dependencies, device models, physical meter loading, or electrical breadboard connectivity were added; the 39-example catalog is unchanged.

Browser validation uses the isolated local React 18 workbench, bundled Three.js r128, and Chromium software WebGL. It verifies functional rendering and interaction rather than hardware GPU performance or complete host-application integration.

- [Expanded voltage board and instrument](meter44-expanded-1280.png)
- [Narrow-phone voltmeter](meter44-instrument-320.png)
- [Known difference between floating nodes](meter44-floating-instrument.png)
- [Floating circuit in 3D](meter44-floating-board.png)
- [Signed switch-event comparison](meter44-switch-comparison.png)
- [Phone workspace](meter44-expanded-320.png)
- [Regression results](meter44-regression-results.txt)
- [Successful isolated comparison retry](meter44-comparison-retry-results.txt)
- [Browser, pixel, and accessibility results](meter44-browser-results.json)
- [Source integrity](meter44-integrity.json)

## Forty-fifth pass: trapezoidal RLC integration and a candid parity audit

Added an optional **Trapezoidal · RLC accuracy** time-response method while preserving **Backward Euler · damped** as the default. A responsive method card explains numerical damping, event restarts, local versus accumulated error, and the distinction between calculation losses and physical resistor dissipation. The new **Ideal LC: where does the energy go?** investigation brings the connected catalog to **40 examples** and reports the final stored energy as a fraction of its starting value.

Try **Connected circuits → Ideal LC: where does the energy go? → Load network example**. Inspect the energy percentage, switch between methods, and explore the calculated response in the scope or **Orbit 3D board**. Changing method stops playback and resets time to zero; held samples are valid only for the corresponding method, circuit, and duration. Circuit components, edit history, selected part, probes, and board view remain available. DC equilibrium ignores the integration preference.

The RLC implementation uses independently written Norton companion equations with terminal A-to-B current and A-minus-B voltage. For a time step h, the trapezoidal capacitor conductance is 2C/h and its history injection is −(2C/h)Vprevious − Iprevious. The inductor conductance is h/(2L), with history Iprevious + (h/(2L))Vprevious. Both state and complementary readings come from the accepted trajectory. Rejected full/half-step trials do not change either history.

Startup, source corners, scheduled switch events, and unknown complementary readings use backward Euler for the next accepted interval before trapezoidal resumes. Switch constraints still produce separate, exact before/after snapshots while carrying capacitor voltage and inductor current continuously. Incompatible constraints and calculations exceeding 4000 attempted intervals still fail without exposing a partial trace. Timed op-amps always retain their existing backward Euler dominant-pole/slew model. Mixed RLC/op-amp runs use a conservative first-order error estimate; pure trapezoidal RLC runs use the second-order step-doubling Richardson factor of three and a cube-root step controller. This is a local error estimate, not a guarantee on accumulated phase or amplitude error. Nonlinear changes and very stiff networks can still produce ringing or encounter the existing calculation limits.

Time CSV preserves all earlier column positions, reports the actual integration method or constraint solve at each sample, and appends `requested_integration` and `integration_restart`. Mixed-method runs are explicitly labeled. Existing backward Euler held-reference keys remain compatible; a trapezoidal reference cannot resolve against a backward Euler run. The two existing diode CSV tests now assert their original absolute column positions instead of assuming those columns remain the final columns.

For the new source-free, 100 mH / 100 µF circuit with 5 V initial capacitor voltage and zero initial inductor current, over 100 ms (approximately five periods):

| Measurement | Backward Euler | Trapezoidal with startup restart |
| --- | ---: | ---: |
| Energy remaining at the end | 87.924337% | 99.998549% |
| Largest voltage error against 5 cos(t / √LC) | 0.309817 V | 0.023276 V |
| Accepted intervals | 3897 | 372 |
| Rejected trial intervals | 3 | 3 |

Both use the same configured local tolerances. Each accepted interval retains two calculated half-step samples. After its startup interval, the linear lossless LC trapezoidal energy is conserved to the numerical precision checked by the test; phase error still accumulates. The above figures describe this benchmark only. They are not a universal accuracy ratio or a direct CircuitJS benchmark.

Validation: **540 tests passed across all 22 connected-circuit test files**, including **25 new integration checks**. Independent references cover capacitor/inductor companion steps, RC/RL startup, floating RC response, RLC overshoot and resistor loss, lossless LC energy/phase, and a closed-form nonlinear diode/capacitor response. Additional checks cover missing history, initial unknown readings, parallel capacitors, bounded failures, source corners, exact switch continuity and restarts, mixed op-amp timing, op-amp-only compatibility, algebraic traces, exports, held-reference identity, and accessible presentation. Initial checks exposed two invalid test assumptions (the initial voltage of an isolated inductor need not be known, and local tolerance does not bound total five-period phase error); the tests now check preserved unknown readings and an explicit 0.5%-of-amplitude voltage-error bound. Two older CSV tests assumed their fields remained the suffix and were updated to verify fixed positions after the appended provenance columns. The final complete suite passes.

All **39 earlier catalog trajectories are exactly unchanged under the default method**, including adaptive timestamps and component voltage/current/power/energy readings, compared against the pass-44 source. All 39 also solve under trapezoidal. Real-browser checks load all **40 investigations** and verify method selection, keyboard control, saved DC/time preference, stopped playback and reset time, invalidated held samples, retained editor state, exact switch sides, downloaded CSV metadata, and explicit op-amp timing limits. Layouts at **1280 × 1000, 390 × 1000, 320 × 1000, and 844 × 390** have zero scoped axe violations, no horizontal overflow, and no browser page errors. Three expanded 3D viewport captures verify actual rendered board pixels. Desktop and 320 px method views were visually reviewed.

The source/public files are byte-identical. The function audit preserves **111 of 118 existing connected-workspace functions**, changes seven solver/provenance/presentation functions, and adds four integration helper/control functions. The 3D renderer, routing, diode laws, op-amp laws, and measurement algorithms are unchanged. Browser checks use isolated local React 18 and bundled Three.js r128 with Chromium software WebGL; they do not benchmark hardware GPU performance or the full host application.

**Parity assessment:** this closes one numerical-method gap, but Circuit Bench remains several major engineering stages short of full CircuitJS coverage. The most consequential omissions are general BJT/MOSFET devices, digital and sequential logic/timers, larger free-form circuit editing/subcircuits/file interchange, and coupled magnetic/distributed components. General numerical robustness and representative cross-simulator comparisons are also needed. Visual sophistication, menu counts, and the number of teaching examples cannot establish a defensible completion percentage. The updated [parity roadmap](circuitjs-parity-roadmap.md#current-parity-assessment) separates current coverage from these gaps, using the primary [CircuitJS example catalog](https://www.falstad.com/circuit/e-index.html), [editor documentation](https://www.falstad.com/circuit/doc/overview.html), and [solver internals](https://github.com/pfalstad/circuitjs1/blob/master/INTERNALS.md). CircuitJS supports both backward Euler and trapezoidal integration; matching those choices alone does not establish model or numerical parity.

- [Desktop method controls and scope](integration45-workbench.png)
- [Narrow-phone method explanation](integration45-method-320.png)
- [LC investigation in the expanded 3D workspace](integration45-orbit-1280.png)
- [Phone 3D investigation](integration45-orbit-320.png)
- [Final 540-test results](integration45-final-results.txt)
- [Analytical energy/voltage benchmark](integration45-accuracy.json)
- [39-example comparison against pass 44](integration45-catalog-results.json)
- [Browser and accessibility results](integration45-browser-results.json)
- [Downloaded switch-response CSV](integration45-switch-export.csv)
- [Source integrity](integration45-integrity.json)

The retained [browser QA](integration45-qa.cjs) runs against the current source. The [numerical benchmark script](integration45-benchmark.cjs) can run independently; an optional first argument supplies a historical source file for a baseline comparison. The recorded historical comparison identifies its baseline hash in the integrity report.

## Forty-sixth pass: general NPN and PNP transistors

Added a **Bipolar transistor · NPN / PNP** component to the connected workspace. Collector, emitter, and base can connect to any named node. Forward/reverse current gain and saturation current are configurable. The independently written memoryless Ebers–Moll model runs in DC and time response, including circuits with existing diodes, controlled sources, capacitors, and inductors. Networks without transistors retain their previous nonlinear path.

Five guided investigations bring the catalog to **45**: NPN base-driven switching, PNP high-side switching, a loaded emitter follower, a common-emitter amplifier, and a two-transistor current mirror. Try **Connected circuits → NPN: a base-driven switch → Load network example**, select Q3, then choose **Orbit 3D board → Expand 3D workspace**. Open **Transistor currents** to connect the waveform to the three lead currents. The amplifier and follower examples show why base loading matters; the mirror includes both base currents.

The three-terminal inspector shows signed collector/base/emitter current, VBE, VBC, VCE, total absorbed power, and the current bias region. Region descriptions follow junction polarity instead of a fixed 0.6 V threshold. **Probe base–emitter** and **Probe collector–emitter** use the actual selected nodes. Flat/projected symbols have polarity-correct emitter arrows, a base wire routed visibly around its own package, and terminal labels above the lead pads, clear of the component nameplate; the orbit package has three labeled leads, NPN/PNP coloring, and separate current arrows/trails driven by each terminal's calculated current. The node inspector includes every terminal incidence, including tied terminals. Desktop and phone layouts retain keyboard controls, visible focus, readable stacked readings, and advanced-model disclosures.

All three terminal currents are defined as entering the transistor, so IC + IB + IE = 0. The shared waveform uses VCE and collector current IC. Total device power is **VCE × IC + VBE × IB**, including base-drive power. For polarity sign s = +1 for NPN and −1 for PNP, define F = Is·expm1(s·VBE/VT) and R = Is·expm1(s·VBC/VT). Then IC = s·[F − (1 + 1/βR)R], IB = s·[F/βF + R/βR], and IE = −IC − IB. VT is fixed at 25.85 mV. The transport equations and four junction-bias regions were checked against the primary [MIT 6.012 bipolar-transistor lecture](https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/resources/mit6_012s09_lec18/).

The nonlinear solver stamps an analytic three-terminal Jacobian, limits forward-junction iteration advances, and checks terminal-current residuals and junction-voltage convergence. Nonfinite exponentials, undetermined junction differences, and exhausted iterations produce an explicit unavailable result. Failed time constraints suppress stale transistor readings. The model does not simulate junction capacitance, charge storage, Early effect, breakdown, temperature changes, damage, or commercial-device pinouts. Multiple-transistor nonlinear feedback can have multiple equilibria; convergence does not certify a unique latch state. Existing network and calculation limits remain in place.

CSV retains earlier column positions and appends model, base-node, gain, Is, VT, VBE/VBC, three terminal currents, VCE, region, and total transistor power fields. Existing generic voltage/current aliases correspond to VCE/IC; explicit transistor columns remove that ambiguity. Changing the base connection, polarity, or gain recalculates the circuit, resets time, invalidates an incompatible held sample, updates the 3D topology, and participates in undo.

Validation covers **572 unique circuit checks across 23 files**, including **32 new transistor checks**. Independent checks include alpha-form transport equations, finite-difference Jacobians for both polarities, loaded DC roots found by nested bisection, saturation/cutoff/reverse operation, base-loaded followers/mirrors, floating and tied terminals, current/power conservation, RC dynamics, and capacitor continuity across a base-drive switch. Export, held-state, geometry, and accessible presentation checks are included.

The broad regression passed 552 checks, encountered two setup timeouts and one worker-start timeout, and caught one new analytical RC assertion with a tighter budget than the established integration checks. The three loading-affected files subsequently passed all 65 checks in isolation. Investigation of the numerical assertion found that the biased transistor and an independently constructed constant-current source produce matching complete RC trajectories: maximum analytical voltage errors are **1.94013 mV with backward Euler** and **77.73264 µV with trapezoidal**, with identical step counts. The transistor collector current matches the independent transport expression. The test now uses the existing 200 µV trapezoidal RC budget and additionally compares every accepted sample against the equivalent circuit; no solver tolerance or implementation was changed. All 55 transistor/integration checks then passed. After terminal-caption corrections, all 56 transistor/node-inspection checks passed. A visual follow-up found that a base wire could approach through its own package and become hidden. The base route now approaches from outside the package; two additional flat/projected checks verify the approach and avoid body crossings. All 83 transistor, routing/camera, orbit, and node-inspection checks passed after this refinement.

All **40 prior default catalog trajectories remain exactly unchanged**, including adaptive timestamps, switch sides, and component voltage/current/power/energy readings, compared with the pass-45 source. All **45 examples solve with both time-integration preferences**, and all five new transistor examples also solve in DC. DC equilibrium is available in 43 catalog examples; the two existing flyback examples retain their incompatible ideal DC constraints and are intended for time response. The benchmark compares these DC outcomes against the prior source as well. New examples converge within 23 nonlinear iterations; the largest sampled current-balance residual among them is below 1 femtoampere.

Final real-browser QA loads all 45 investigations and checks clear orbit routes, base-node/polarity/gain editing and undo, probe actions, held invalidation, node-current inspection, CSV downloads, and flat/projected/orbit views. Actual 3D trail instance positions agree with collector/base/emitter current signs for both NPN and PNP before and after manual stepping. Inline and expanded layouts at **1280 × 1000, 390 × 1000, 320 × 1000, and 844 × 390** have zero scoped axe violations, no horizontal overflow, and no page errors. Five captures verify rendered board pixels; desktop/phone controls and board views were visually inspected. These checks use isolated local React 18, bundled Three.js r128, and Chromium software WebGL; they do not establish hardware GPU performance or complete host-application integration.

The source/public files are byte-identical. An audit of all named function declarations preserves **235 of 257 existing functions**, changes 22, adds 10, and removes none. Changes cover the nonlinear-device adapter, three-terminal connectivity/readings, board geometry/trails, editing, and measurement labels. The existing transient integrator remains unchanged. No dependency or CircuitJS source code was added.

This closes the general bipolar-transistor coverage gap. **MOSFETs, digital and sequential logic/timers, larger editing/subcircuits/circuit-file interchange, and magnetic/distributed devices** remain major stages toward CircuitJS coverage. Charge-aware semiconductor models and representative numerical comparisons are also still needed. See the updated [parity roadmap](circuitjs-parity-roadmap.md#current-parity-assessment) and the primary [CircuitJS example catalog](https://www.falstad.com/circuit/e-index.html). A defensible overall completion percentage still requires a weighted benchmark inventory.

- [NPN switch in the expanded 3D workspace](bjt46-npn-orbit.png)
- [PNP high-side switch and three lead currents](bjt46-pnp-orbit.png)
- [Desktop transistor editor](bjt46-editor-1280.png)
- [Narrow-phone transistor editor](bjt46-editor-320.png)
- [Phone 3D workspace](bjt46-expanded-320.png)
- [Common-emitter amplifier scope](bjt46-amplifier-scope.png)
- [Final browser and accessibility results](bjt46-browser-results.json)
- [Final transistor/integration checks](bjt46-final-numerical-results.txt)
- [Final transistor, routing, orbit, and node-inspection checks](bjt46-final-routing-results.txt)
- [Earlier transistor/node-inspection checks](bjt46-final-presentation-results.txt)
- [Successful loading-affected retries](bjt46-loading-retry-results.txt)
- [Original regression record](bjt46-regression-results.txt)
- [Independent RC comparison](bjt46-rc-results.json)
- [All-example and historical comparison](bjt46-catalog-results.json)
- [Transistor response CSV](bjt46-pnp-export.csv)
- [Source integrity](bjt46-integrity.json)

The retained [browser QA](bjt46-qa.cjs) and [RC benchmark](bjt46-rc-benchmark.cjs) run against the current source. The [catalog script](bjt46-catalog.cjs) accepts an optional historical source path; without it, it writes a separate current-results file so the recorded pass-45 comparison remains intact. The historical baseline hash is recorded in the integrity report.
