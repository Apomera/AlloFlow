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
