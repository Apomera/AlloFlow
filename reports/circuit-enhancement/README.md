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
