# CircuitTool deep review

Reviewed September 27, 2026. This audit covers the current working-tree code, not a historical commit or the deployed website. Product source was not changed.

## Assessment

CircuitTool has a substantial numerical and teaching foundation. Its strongest areas are explicit model limits, treatment of undetermined readings, conservation checks, and multiple ways to inspect a circuit. The most actionable weaknesses are saved-snapshot restoration, quiz grading, small-current evidence display, language propagation, and synchronous solver cost.

The main file contains 8,407 lines and 1,177,842 bytes. Its source and deployment mirror had the same SHA-256 at review time: `ba8cd6415628c2d51dca9f14aecdf95f6bac6c0c88b9e5b7f400d6d7293c3959`.

## Findings

### 1. P2 — Loading a saved snapshot does not restore the circuit

**Trigger:** Save a 9 V circuit, change the working circuit to 24 V, leave the tool, and load the saved snapshot.

**Result:** The host opens CircuitTool but leaves the 24 V working state in place. The snapshot still contains the 9 V data; the Load action never applies it.

The save handler records `tool: 'circuit'` and its state in `snap.data` at [stem_tool_circuit.js:6022](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:6022>). The shared snapshot handler at [stem_lab_module.js:6269](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_lab_module.js:6269>) has restoration branches for other tools but none for CircuitTool. `_openStemTool` only navigates.

**Evidence:** [snapshot-probe.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/snapshot-probe.cjs>) executes the exact production Load handler and `_openStemTool` with host services stubbed. [snapshot-results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/snapshot-results.json>) records `restorationCalls: 0`, `snapshotVoltage: 9`, and `actualVoltage: 24`.

**Recommended correction:** Restore the saved payload into `_circuit`, defensively reset transient UI flags, and add a save → edit → load host integration test. Preserve unrelated workbench state.

### 2. P2 — The quiz can reward an incorrect answer

**Trigger:** Generate the question “A 3 V battery drives current through a 500 Ω resistor. What is the current?”

**Result:** The deterministic probe produces choices `[0.006, 0.02, 0.007, 0.007]` A. Both incorrect 0.007 A choices are marked correct and qualify for score, streak, and XP.

The fallback distractor search exhausts its multiplier list at [stem_tool_circuit.js:3579](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:3579>). Grading uses the same absolute tolerance of `0.01` for all question units at [line 5607](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:5607>). That tolerance is wider than the intended answer for this current question.

**Evidence:** [learning-probes.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/learning-probes.cjs>) extracts the real generator and grading expression; [results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/results.json>) stores the fixed random sequence and every option's grade.

**Recommended correction:** Track the correct choice explicitly and guarantee distinct displayed distractors. Exercise low-current questions, rounding, all eight question types, and reward behavior through the actual UI.

### 3. P2 — Small-current experiments lose their visible evidence

**Trigger:** Save a baseline with 1 V across 10 kΩ, then change only the supply to 2 V.

**Result:** The solver correctly returns 100 µA, 200 µA, and a +100 µA change. The investigation displays `0.000 A`, `0.000 A`, and `+0.000 A`. Saved trial summaries use the same lossy formatting. The underlying exported numbers remain intact.

The formatter at [stem_tool_circuit.js:4921](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:4921>) uses three decimal places in amperes for every magnitude. The comparison cards and notebook use it at lines 4946–4956.

**Evidence:** The second case in [results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/results.json>) records both exact solver output and displayed strings.

**Recommended correction:** Reuse `circuitCurrentText`, which already handles µA and mA elsewhere, with consistent signed delta formatting. Add a rendered comparison test below 1 mA.

### 4. P2 — Language changes do not reach all controls

There are two distinct propagation problems:

- The cached Simple-circuit component closes over the first render's translator at [stem_tool_circuit.js:3819](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:3819>). Updated `props.ctx` does not replace that outer function.
- `circuitToolT` reads only `props.t` at [line 793](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:793>), while Mixed, Active, and Connected workbench roots receive only `{ctx}` at [line 6070](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:6070>). Some Simple child components also omit the translator. Consequently, accessibility labels can remain English while other parts translate.

**Evidence:** The headless browser switched from an English translator to one that prefixes translations with `ES:`. Outer UI updated, but the Simple buttons retained their original text. This uses a diagnostic translator to test propagation; it is not a Spanish translation-quality assessment. Before/after button arrays are in [browser-results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/browser-results.json>).

**Recommended correction:** Resolve the translator from current props within each component and pass it consistently. Test both initial non-English rendering and an in-session language switch, including accessible names.

### 5. P2 — A permitted small network can block the UI while solving

The Connected workbench computes the entire transient synchronously inside `React.useMemo` at [stem_tool_circuit.js:2221](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:2221>). Memoization avoids recalculation on cursor changes, but electrical edits trigger the full calculation again.

The solver checks up to `3^N` combinations of op-amp output regions at [line 1104](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:1104>). Each adaptive step performs a full step and two half steps at lines 1201–1204.

A valid five-component circuit—one 10 Hz sine source and four voltage followers over 0.3 seconds—occupied the main thread for **2.53 seconds in headless Chromium**. One follower took **449.5 ms** in that browser run. Both used 384 accepted steps and returned valid results. Direct Node execution measured 5.72 seconds and 51 ms respectively. These measurements were taken on a busy machine and are not universal timing thresholds. Earlier VM timings were much slower because of execution-context overhead and should not be used as browser timings.

**Evidence:** Exact inputs, bounded child-process probes, results, and measurement caveats are saved in [model-probes.cjs](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/model-probes.cjs>) and [model-results.json](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/circuit-deep-review-2026-09-27/model-results.json>).

The browser benchmark executes the actual model in a page without mounting React; source inspection establishes that the workbench invokes that same function synchronously during rendering. A shutdown watchdog fired after the benchmark completed and its results were saved; that cleanup limitation is recorded in the results. This is a calculation-time measurement, not a measurement of a full user interaction.

**Recommended correction:** Move expensive solves off the UI thread, allow cancellation of superseded runs, and reduce repeated region enumeration. Add a browser responsiveness budget for a supported multi-op-amp case.

### 6. P3 — Extreme overdamping violates the starting condition

An allowed mixed series branch with a voltmeter, 1 mH inductor, and 10,000 µF capacitor, driven by a 12 V step, reports approximately 12 nA at `t=0`, nearly 12 V across the meter, and nearly zero volts across the inductor. The initial current should be zero, with 12 V across the inductor.

The small coefficient in the overdamped formula disappears through subtraction at [stem_tool_circuit.js:613](<C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_circuit.js:613>): `b = A - a`. The existing extreme-overdamping test checks finiteness, which does not catch this error.

**Recommended correction:** Calculate the small coefficient directly or use a numerically stable exponential-difference expression. Check initial conditions as well as finite output. The complete reproduction is in the model artifacts above.

## How the tool is organized

| Workspace | Models and learning features | Scope |
|---|---|---|
| Simple circuits | Shared DC series/parallel solver; parts, probes, undo, guided experiments, comparisons, quiz, challenges | Eight-part introductory bench; documented idealizations and piecewise LED model |
| Mixed circuits | Multiple series branches; passive RC/RL/RLC time responses and sinusoidal AC | Four independent branches and eight parts; separate analytic models |
| Active electronics | Fixed NPN/LDR teaching circuits, parameter sweeps, operating regions, predictions, reference comparisons, notebook | Piecewise teaching model with explicit assumptions |
| Connected circuits | Modified nodal analysis; floating and ambiguous readings; independent/controlled sources; nonlinear diodes, Zeners, BJTs; finite-gain and timed op-amps; scope and energy views | Eight named nodes and sixteen parts; adaptive backward-Euler/trapezoidal transients |
| Reference | Electronics explanations, inquiry activities, and predict/observe/explain lessons | Educational content alongside the build workspaces |

State lives in the host's `toolData` under several keys, including `_circuit`, `_circuitMixed`, `_circuitActive`, `_circuitNetwork`, and `circuit` for the Reference workspace. The shared host owns snapshots and navigation. This separation is useful, but the snapshot defect shows why host integration needs its own tests.

The connected model includes explicit unavailable/undetermined values instead of substituting zero for every floating or ambiguous reading. Tests exercise current balance, power balance, stored energy, switching boundaries, analytic responses, and nonlinear-device behavior. Those are meaningful checks.

This remains an educational simulator with model limits. General network AC small-signal analysis, physical breadboard connectivity, a general digital event engine, MOSFETs, and detailed device thermal/storage behavior are separate capabilities, not implied by the existing visuals or component catalog.

## Validation and limits

- Initial focused run: **846 tests across 53 executed files; 837 passed and 9 failed**. Most failures originated in first-test setup hooks. All nine affected files passed on retry: **182/182 tests**, with one worker and 30-second test/hook limits. Across the initial run and focused retry, all **846 tests** passed at least once. The default-time-limit run was not clean; its failures are retained in the raw results.
- Browser checks covered the default Simple, Mixed, Active, and Connected workspaces at **1280, 390, and 320 px**. There were **no uncaught page errors**, **no axe violations in the four scanned default states**, and **no page-wide horizontal overflow**. Diagrams intentionally use internal scrolling.
- Browser screenshots and raw results are saved beside this report. These checks do not establish accessibility conformance for every dialog, expanded section, language, or assistive technology.
- Source and deployment mirror hashes matched. The current review did not deploy anything or call an AI tutor service.
- Existing tests provide extensive numerical coverage. Some presentation/lifecycle tests assert source strings or static markup; those cannot establish actual focus behavior, language changes, or restoration across host navigation.
- The local Vitest configuration notes that its coverage instrumentation does not reliably instrument modules loaded through `new Function`. A low coverage percentage from that setup would not be a reliable measure of exercised CircuitTool code.

## Suggested order of work

1. Fix snapshot restoration and quiz correctness, with host/UI regression tests.
2. Preserve small measurements and propagate the current translator consistently.
3. Make expensive network calculations cancellable and independent of rendering.
4. Stabilize the extreme-overdamping formula and check exact initial conditions.
5. Incrementally separate numerical models, workbench components, learning content, and file schemas from the 1.18 MB module. Keep shared numerical fixtures and deployment parity checks during that work.

Lower-priority copy issue: the Clear confirmation says the action cannot be undone even though the actual operation enters undo history. The toolbar correctly says “undoable.” Align that message with behavior.
