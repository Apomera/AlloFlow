# CircuitTool enhancements — September 27, 2026

Implemented the fixes identified in the CircuitTool deep review. The source modules and desktop deployment copies are synchronized. No deployment was performed.

## What changed

### Saved work restores correctly

The shared STEM host now applies CircuitTool snapshot data when the user chooses Load. It restores the Simple bench and Build workspace even if another circuit workspace was open. Saved predictions, observations, component settings, and views remain part of the study. Other tools and circuit workspaces keep their state.

Saving and loading each create an independent copy of the snapshot data. Later changes cannot alter the saved study through shared nested references. Loading clears pending confirmation, animation-tick, and AI-response flags.

### Quiz choices and grading agree

Every generated question has four positive options that remain distinct at the displayed precision. A chosen answer must equal the generated correct answer. Previously saved numeric questions use the same corrected grading, so 0.007 A no longer earns credit for a 0.006 A question. The answer shuffle uses Fisher–Yates.

Regression tests cover all 148 parameter pairs across eight question families with four distractor patterns: 592 generated questions. Mounted React tests also check actual score, streak, and XP behavior.

### Small measurements remain visible

The investigation comparison and notebook use the existing magnitude-aware current formatter. A 1 V → 2 V experiment through 10 kΩ now shows **100 µA → 200 µA, +100 µA**. The Simple scope caption uses the same current formatting and has brighter text after a populated-workspace contrast check exposed its previous low contrast.

![Precise current evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-enhancements-2026-09-27/small-current-evidence.png)

### Language switches update controls without resetting the study

The cached Simple component reads the current translator. The translator also reaches the Mixed, Active, and Connected roots, nested controls, and memoized 3D view. Mounted tests cycle through multiple translators while preserving circuit state and an unfinished numeric editor draft. These tests check translation propagation, not the linguistic quality of translation catalogs.

The Clear confirmation now correctly explains that Undo can restore the removed components.

### The solver does less repeated work

Linear networks with multiple op-amps can reduce the region search to a small system relating amplifier inputs and outputs. Independent amplifier groups are checked separately. Final readings still come from the full nodal equations, followed by output-law checks. Undetermined, contradictory, or multiple solutions fall back to the existing exhaustive search. Diode and transistor networks retain their existing solver path.

The reduction is cached within one transient run and invalidated when its matrix, constraint positions, or sensing terms change. Algebraic transients reuse an identical end-time solve while retaining midpoint samples and switch-event boundaries.

In a side-by-side Chromium run, the four-follower benchmark improved from **1,563 ms to 135 ms (11.6× faster)**. Both paths produced 769 frames over 384 accepted steps. The number of region checks per solve fell from 81 to 12. Absolute timings depend on machine load; this benchmark measures calculation time, not a complete user interaction. The benchmark's source hash matches the final module.

The work remains synchronous. This improves the supported benchmark and avoids redundant work; it does not introduce background workers or cancellation for every possible complex network.

### Extreme RLC starting conditions remain consistent

The overdamped analytic response calculates its small coefficient directly instead of subtracting two nearly equal numbers. The reviewed voltmeter–inductor–capacitor case now starts with zero current and the source voltage across the inductor.

## Validation

- New workflow regression run: **19 tests passed** across snapshot, learning, and localization suites.
- Full circuit regression run: **895 tests passed across 57 files**. After the final operating-point uniqueness safeguard, **103 numerical tests passed across five affected files**, including the new differential suite.
- Chromium: **five workflows passed**, including saved-state restoration, correct rewards, small-current evidence, and language switches.
- Accessibility: no axe violations in the four inspected workspaces, including the populated Simple circuit.
- Responsive layout: no page-wide overflow in twelve checks covering four workspaces at 1280, 390, and 320 pixels.
- Source syntax and patch whitespace checks passed.
- Final source and desktop mirror hashes match for both the CircuitTool module and STEM host.

The numerical tests compare optimized output with the retained exhaustive solver across coupled feedback, floating and unknown inputs, controlled sources, nonlinear fallback, timing, storage, cache invalidation, and exact switch-event timestamps. They also verify extreme-overdamping initial conditions.

Full regression and numerical benchmark results are recorded in the adjacent JSON artifacts. Historical failures from development are retained separately from the final runs.

## Files

- [CircuitTool source](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js)
- [STEM host snapshot loading](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_lab_module.js)
- [Snapshot regression tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_snapshots.test.js)
- [Learning regression tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_learning_regressions.test.js)
- [Localization regression tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/circuit_localization.test.js)
- [Browser workflow evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-enhancements-2026-09-27/browser-results.json)
- [Final validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-enhancements-2026-09-27/validation-summary.json)
- [Solver benchmark](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-enhancements-2026-09-27/solver-benchmark.json)
