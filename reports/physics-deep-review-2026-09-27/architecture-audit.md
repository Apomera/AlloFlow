# Physics simulator: architecture and test audit

Reviewed 2026-09-27. Read-only audit of the simulator source, desktop mirror, four physics unit suites, the two dedicated browser suites, shared test configuration, and CI workflows. No application source changes. Browser suites were inspected but not run by this reviewer.

## Validation

- Existing tests: **4 files / 17 tests passed**, 14.51 seconds. Command and output are in `architecture-validation.txt`.
- Source and desktop deployment mirror are byte-identical: **245,621 bytes**, SHA-256 `f2e6b7fc4fcca7f9a343714b2389bdc0c2fba11fe8d47b5d52a7d8993ac00116`.
- In-memory Node/jsdom probes loaded the actual plugin and invoked its render function with a minimal React element stub. Baseline rendered; three malformed saved-state examples threw synchronously. These probes isolate render logic and do not establish browser layout behavior.

## Findings and improvements

### 1. Validate saved result objects before rendering them — high priority

Confirmed crash cases:

| Saved state patch | Result | Source location |
| --- | --- | --- |
| `predictionResult: { errPct: 5 }` | `Cannot read properties of undefined (reading 'toFixed')` | `stem_lab/stem_tool_physics.js:2596` |
| `runLog: [{ range: 'oops' }]` | `r.range.toFixed is not a function` | `stem_lab/stem_tool_physics.js:2961` |
| `lastFlight: { range: 63.5 }` | `Cannot read properties of undefined (reading 'toFixed')` | `stem_lab/stem_tool_physics.js:2873` |

The normalization at lines 244–257 checks only `predictionResult.errPct`, although the renderer reads `predicted` and `actual` too. The last-flight guard checks only range at line 2849. Experiment-log entries are not validated before `range.toFixed`.

Add a single saved-state decoder that validates finite numbers and the complete shape of each result, filters invalid log rows, preserves valid observations, and establishes the same bounds as the actual controls. Test older partial saves, null fields, numeric strings, arrays in object fields, and nonfinite values. A malformed history entry should not prevent the simulator opening.

### 2. Give the canvas one stable lifecycle — medium priority

`canvasRef` is created within `render` (line 413). React calls the old ref with null when its identity changes; that invokes cleanup (415–419), after which the new ref reinitializes the renderer. Initialization sets backing dimensions at 568–575 and rebinds the visibility listener at 629. Comments at 740–746 explicitly document the state restoration required to survive this lifecycle.

The live data timer forces a whole-tool update every 250 ms while graphs or data are open (2270–2283). Every such update currently uses the same reinitialization path. The renderer, experiment state, and educational panels are tightly coupled in a roughly 3,880-line file.

Extract a stable canvas component/controller with persistent state and explicit `updateSettings`, `launch`, `step`, `reset`, `resize`, and `dispose` operations. Subscribe result panels to sampled measurements without rebuilding the canvas. A `ResizeObserver` can update backing dimensions only when layout changes; choose a bounded device pixel ratio instead of a hardcoded 2. Verify one animation loop and one visibility listener across repeated UI updates and unmount/remount.

### 3. Advance the symmetry demo through landing events — medium priority

Lines 2731–2749 estimate both waits from initial speed and vacuum flight time, then chain three uncancelled wall-clock timeouts. Changing playback speed, pausing, hiding the tab, changing modes, starting a second demo, or leaving the tool does not cancel this chain. `fireLaunch()` looks up the current element by the global canvas ID (267), so a delayed callback can also act on a later mount. The existing browser test (72, line 265) verifies only an uninterrupted 1x vacuum demonstration.

Use an explicit demo state with two launch snapshots. Start the second flight on first landing, cancel on user intervention/unmount, and report measured results after second landing. Add tests for pause/resume, speed change, hidden tab, repeat activation, and leave/reopen. This also removes the need to predict real-time delays.

### 4. Avoid repeating static work on every animation frame — medium priority

When formulas and drag are enabled, `draw` calls the full `physSimulate` loop each frame (1053–1063), even if launch parameters have not changed. `draw` always schedules the next frame at 2194, including idle and paused states. The scene recreates gradients and repaints the complete canvas each time (817, 937, 1866, 2103). These are identified work patterns; this reviewer did not measure frame costs.

Cache predicted range using angle, speed, gravity, mass, and drag as the key. Cache static background layers and use demand-driven drawing while idle/paused, with only bounded decorative motion when enabled. Establish a frame-time and idle-CPU baseline before setting performance targets.

### 5. Convert test coverage into behavioral guarantees — medium priority

Of the 17 direct unit tests, six execute the integrator; eleven assert source text, mirror equality, or static guards. The lifecycle suite checks that cleanup strings exist, not that cleanup leaves no animation or listener behind (`tests/physics_canvas_loop.test.js:10`). The solver test covers one typical vacuum setting and two drag target rounds (`tests/physics_drag_integrator.test.js:106`, `:141`).

The dedicated browser behavior file has eight tests. It covers typical drag/mass behavior, elapsed timing, pause, live-region churn, guidance, controlled comparisons, the simple symmetry demo, and three logged runs. The contrast file checks only Last flight and Experiment log in three themes; its comment explicitly excludes gradient backgrounds.

Useful missing guarantees:

- Saved result and history normalization, including the three confirmed failures above.
- Low/high valid slider combinations, numerical error budgets for range/height/time, and repeatability across 30/60/120 Hz and playback speeds.
- Real launch/step/reset/clear behavior, zero remaining timers/listeners after unmount, and no duplicate loops after panel updates.
- All target rounds, end-mode restoration, delayed callbacks after mode changes, and prediction attribution when controls change in flight.
- More than eight completed runs: capped history, monotonic numbering, and correspondence between the five retained trails and eight retained log rows.
- CSV first/last samples, launch metadata, landing values, export after editing settings, and actual clipboard failure handling.
- Narrow layouts, fullscreen resize, reduced-motion changes, keyboard-only controls, and language/theme changes with a flight in progress.

Move the pure engine into a directly importable module, with a browser wrapper for registration. The current tests use `new Function(src)` at line 96; `vitest.config.js:23` documents that V8 coverage does not instrument these evaluated modules, so its percentage is not reliable for this simulator. Source-string checks can remain for narrowly necessary packaging contracts, but should not be the primary assertion for lifecycle or physics behavior.

### 6. Run dedicated physics browser tests in CI — medium priority

The unit-shard workflow runs unit tests (`.github/workflows/verify.yml:155`). No checked workflow invokes `72-physics-lab-behaviour.spec.ts` or `75-physics-theme-contrast.spec.ts`. Package shortcuts for GL and contrast also omit both (`package.json:40–41`). The generic `test:e2e` command would discover them if invoked manually. Existing STEM CI browser jobs target Heat/Nuclear recovery (`.github/workflows/verify.yml:229–246`).

Add a small local physics CI job that runs the integrator contract plus both browser suites on relevant source/test changes. Retain traces on failure. Add one real-host smoke test alongside the isolated harness to cover tool loading, restoration of saved experiments, and unmount behavior. Keep the existing mirror equality assertion: both copies currently match.

## Suggested order

1. Fix and cover malformed saved-state crashes.
2. Add dedicated browser tests to CI and add interruption cases for the demo.
3. Separate engine, canvas lifecycle, and experiment result state; keep behavior stable during extraction.
4. Optimize measured hot paths and expand numerical/browser coverage.

The root review is evaluating physics accuracy, instructional wording, UI behavior, and performance measurements separately.
