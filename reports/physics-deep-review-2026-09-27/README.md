# Physics simulator: deep review

Reviewed September 27, 2026. This review records the Physics Simulator before the follow-up improvements. It covers the implementation, desktop deployment copy, existing tests, numerical behavior, learning content, and component-level browser behavior. Application code was not changed during the audit.

The approved follow-up implementation is described in [Implementation and verification](implementation.md). The findings and measurements below remain the original audit evidence.

## Recommendation

Prioritize trustworthy measurements and explanations before adding more activities. The simulator has useful instructional features already: predictions, measured results, comparisons, a controlled-variable experiment log, and accessible controls. Several parts still disagree about what happened during a flight. That can undermine the evidence students use to learn physics.

The most valuable improvement is a single recorded flight that drives the animation, results, graphs, scoring, and exports. Pair that with deterministic simulation timing, accurate impact detection, and explanations that match the selected physical model.

## What is already working well

- Prediction, animation, and targeting share a drag-step function, and mass changes drag behavior.
- Playback uses elapsed time, rather than advancing the same amount on every display frame.
- The experiment log identifies repeat trials, changes to one variable, and comparisons with multiple changed variables. It can infer the velocity-squared and inverse-gravity relationships from students' measurements.
- Last-flight measurements, trajectory comparisons, CSV export, grade-filtered explanations, and reflection prompts provide a substantial basis for classroom investigations.
- Recent work improved control labels, touch target sizes, keyboard focus scope, themes, and screen-reader announcement frequency.
- The source and desktop deployment mirror are currently byte-identical.

These features should be preserved as the underlying flight model and lifecycle are strengthened.

## Evidence

- Four existing physics unit suites: **17 tests passed**. Six exercise the numerical functions; eleven primarily check source structure or packaging contracts.
- A new audit-only numerical probe executes the actual source functions and compares them with analytic vacuum results and an independent, finely stepped RK4 drag reference.
- Direct render probes confirmed three incomplete or malformed saved-result structures that throw exceptions.
- Browser inspection loaded the actual local plugin with real React and application styles in the existing component harness. Pause followed by Launch produced a completed **0 m, 0 s** flight.
- The two dedicated browser suites were inspected for coverage. Their full suites were not run as part of this review. This is not a deployed-site or full-host acceptance audit.

Detailed evidence: [numerical audit](./numerical-audit.md), [numerical results](./numerical-results.json), [reproducible probe](./numerical-probe.cjs), [architecture audit](./architecture-audit.md), [unit-test validation](./architecture-validation.txt), [learning review](./learning-audit.md), and [browser results](./learning-browser-results.json).

## Priority 1: correct results and prevent broken sessions

### 1. Separate simulation time from display frames

**Confirmed numerical defect.** The prediction advances in 0.035-second steps, while the live simulation advances by elapsed frame time multiplied by playback speed. The shared step uses semi-implicit Euler integration, whose result depends on step size. Therefore changing playback speed or the display refresh rate changes the measured physics.

For 45°, 50 m/s, Earth gravity, drag on, 1 kg:

| Method | Landing distance |
| --- | ---: |
| Independent numerical reference | 149.114 m |
| Current prediction | 147.506 m |
| Current live-loop math at 60 fps | 148.349 m |
| Current live-loop math at 144 fps | 148.795 m |
| Current live-loop math at 60 fps, quarter speed | 148.923 m |

These frame-rate comparisons reproduce the canvas equations deterministically; they are not measurements taken on different monitors.

The error is much larger for a valid short flight: 5°, 5 m/s, gravity 25 m/s². The exact range is **0.17365 m**, the 60 fps equivalent gives **0.08701 m**, and the predictor gives **0.34867 m**. The prediction also waits for two steps before recognizing impact, even if its first step already crossed the ground.

**Improve:** use an accumulator with a common simulation step, exact constant-acceleration motion without drag, and a converged numerical method with drag. Find ground contact and the apex between steps. Playback speed should control how quickly the recorded motion is presented.

**Done when:** range, maximum height, flight time, and score agree across 30/60/144 Hz, quarter/half/normal speed, and manual stepping. Compare vacuum cases with analytic results and drag cases with an independent reference. Establish an explicit drag error budget; 0.1% with a small absolute floor is a reasonable initial target to evaluate.

Source: `stem_lab/stem_tool_physics.js:72`, `:90`, `:94`, `:799`.

### 2. Fix launch while paused

**Confirmed in the browser.** Select Pause, then Launch. The projectile begins at ground height; the paused frame performs no integration, but the collision branch still treats height <= 0 as a landing. It records zero distance and zero duration. The empty trail also leaves maximum height non-finite.

**Improve:** represent ready, flying, paused, and landed states explicitly. Only complete a flight after a genuine contact event following simulated motion.

**Done when:** Pause → Launch creates no completed result until the user steps or resumes. Stepping advances one simulation increment; resuming reaches the same result as an uninterrupted flight.

Source: `:707`, `:1355`, `:1582`, `:1601`.

### 3. Validate saved experiments as complete records

**Confirmed render failures:**

| Saved value | Current failure |
| --- | --- |
| `predictionResult: { errPct: 5 }` | Missing predicted/actual value reaches `.toFixed()` |
| `lastFlight: { range: 63.5 }` | Missing result values reach `.toFixed()` |
| `runLog: [{ range: 'oops' }]` | Non-numeric range reaches `.toFixed()` |

Saved-state normalization also admits gravity zero and mass/speed combinations far outside the visible controls. Those combinations can produce divisions by zero, unstable drag integration, or a predictor that reports its iteration limit as a successful landing.

**Improve:** decode and migrate saved state once. Require finite, complete result fields, filter invalid history entries, and apply one supported parameter domain to saves, controls, and solvers. Represent unreachable or non-returning trajectories explicitly.

**Done when:** old or partial saves preserve valid work and open successfully; no result presents NaN/Infinity or claims a landing because a step limit was reached.

Source: `:244`, `:2596`, `:2849`, `:2873`, `:2961`.

## Priority 2: make the learning evidence consistent

### 4. Make explanations match air drag

The motion graph plots drag-aware data but still describes horizontal velocity as a flat line, vertical velocity as a straight line, and the two components as independent. Those statements assume negligible air resistance. The same problem affects accessible graph descriptions, so it reaches screen-reader users too. [OpenStax's projectile-motion explanation](https://openstax.org/books/physics/pages/5-3-projectile-motion) states this assumption explicitly.

**Improve:** derive descriptions from the captured flight's model, including after controls change. Explain the difference between gravitational acceleration and total acceleration with drag. Rename the current “Force vectors” view to match its velocity/acceleration content, or add actual force arrows with units.

**Done when:** drag and vacuum flights have different, accurate visual descriptions and accessible names, based on their own launch settings.

Source: `:1510`, `:1545`, `:3098`, `:3108`, `:3123`, `:3127`, `:3224`.

### 5. Record one exact impact state and preserve run identity

The trail records its final point before ground interpolation. The summary uses the corrected landing position but retains full-step time; CSV exports the raw x while clamping negative y to zero. A student can therefore obtain different landing evidence from different views of the same flight.

There are two further metadata errors:

- After nine runs, the table shows runs 2–9, while the exported capped log renumbers them 1–8.
- Flight CSV can take mass from the preceding completed flight when exporting a new flight in progress.

**Improve:** each flight should contain a stable ID, immutable launch settings, model version, initial sample, all samples, and a canonical impact result. Every display and export should read that record.

**Done when:** the final graph sample, CSV row, landing marker, summary, and score agree. Run IDs survive history trimming and clearing. Export metadata always describes the exported flight.

Source: `:1401`, `:1584`, `:1634`, `:2347`, `:2359`, `:2364`, `:2954`.

### 6. Enforce target constraints through every input route

A fixed-angle target disables its angle slider, but the canvas ArrowUp shortcut can still change that angle. The browser confirmed a change from 45° to 50° while the mission's fixed-angle value remained 45°. The symmetry demo can also change the locked angle. Gravity adjustments are intentionally permitted by the mission instructions and should remain available. The last target round also displays an enabled Next Round button whose handler does nothing.

**Improve:** enforce constraints in a shared state transition, then reflect the same allowed actions in sliders, keyboard shortcuts, presets, and demos. Give the final round a clear completion/restart action.

**Done when:** keyboard and pointer users follow the same mission rules, and each enabled control has a useful outcome.

Source: `:2517`, `:2604`, `:2760`, `:2810`, `:3324`.

### 7. Drive the symmetry demonstration by completed flights

The demonstration launches its next shot through wall-clock timers calculated from ideal flight time. Pausing, changing speed, hiding the tab, restarting the demo, or leaving the tool can invalidate that timing. It also announces equal ranges with drag enabled, where complementary angles do not generally produce equal ranges.

**Improve:** snapshot both planned launches, wait for actual landing events, cancel on user intervention/unmount, and report measured results. Offer vacuum symmetry and a separate drag comparison with different explanations.

**Done when:** both flights complete in order under slow motion and pause/resume; interrupted demos do not alter later sessions or grant premature success.

Source: `:2731`–`:2749`.

## Priority 3: improve clarity, access, and maintainability

### Organize the page around an investigation

Keep the canvas, launch settings, and latest result together. Group supporting work into three predictable sections: **Explore**, **Compare evidence**, and **Practice**. Let a lesson preset reveal the relevant graphs and prompts. Preserve the current actionable next-step guidance and reflection credit.

The separate gravity/angle discovery calculator currently has its own settings and ideal formula, distinct from the main canvas. Either link it to the same experiment or clearly label it as an ideal-model exercise. Its normalized score is sin(2θ), so changing gravity or speed cannot affect that score; explain what students are meant to discover.

### Improve graph readability and equivalent access

The two component graphs remain side by side on narrow screens. Browser measurement confirmed that the 8-unit SVG axis text scales to approximately **3.7 CSS pixels at a 320-pixel viewport** and **4.7 pixels at 375 pixels**. There was no document overflow; fitting the page does not make these labels readable. See the [320-pixel screenshot](./mobile-graphs-320.png) and [375-pixel screenshot](./mobile-graphs-375.png).

Stack the graphs on phones, increase label sizes, and provide concise trend summaries plus a navigable data table tied to the same flight. Existing accessible labels and restrained announcements are useful foundations. Text alternatives should convey the graph's purpose and information, consistent with [W3C guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content).

### Stabilize the canvas lifecycle before optimizing drawing

The ref callback changes on every React render, causing canvas cleanup and reinitialization. Open data/graph panels trigger this path roughly four times a second. With drag and formulas enabled, the full prediction is recalculated each animation frame even when settings are unchanged. Idle and paused views also keep scheduling frames.

Extract a stable canvas controller, resize only when dimensions change, cache predictions by launch settings, and draw idle scenes on demand where possible. These are verified work patterns; no production CPU saving or Core Web Vitals improvement is claimed here. A five-second Chrome DevTools trace of the loaded local component showed CLS 0.00 and no actionable trace insights; it did not capture navigation or establish load performance. Measure frame time and idle work before choosing optimization targets.

### Make browser regression checks part of CI

The dedicated physics behavior and theme suites exist but are not invoked by the checked CI workflows. Run them on relevant changes, add the defects above as behavioral checks, and keep one real-host smoke test for tool loading, restoration, and cleanup. Prefer numerical invariants and observable behavior over checking whether particular code strings exist.

## Further capabilities worth adding after those fixes

1. **Paired model comparison:** run vacuum and drag with identical initial settings; explain measured range/height/time differences.
2. **Launch height and elevated targets:** demonstrate horizontal launch versus dropping an object and distinguish equal-height formulas from general motion.
3. **Evidence-based force and energy views:** gravity, drag, net force, and energy dissipated, linked to the same trajectory. State the model assumptions: still air, fixed shape/area, constant gravity, and tuned instructional drag. [NASA's drag equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/) explains the separate roles of density, area, shape coefficient, and speed.
4. **Reusable investigations:** save named comparisons, predictions, observations, and a short claim supported by selected runs; export an accessible lab report as well as CSV.
5. **Teacher-ready activity presets:** examples include complementary angles, velocity-squared scaling, inverse-gravity scaling, and mass with/without drag. Each should specify the variable to change, what to hold fixed, and what evidence would support the claim.

## Suggested implementation sequence

| Stage | Work | Exit criterion |
| --- | --- | --- |
| 1. Trust the measurements | Deterministic timing, accurate integration/contact events, paused launch, saved-state decoder | Independent numerical checks and regression cases pass |
| 2. Trust the evidence | Immutable flight records, export parity, model-aware descriptions, constraints, demo lifecycle | Every view and interaction agrees about each flight |
| 3. Improve classroom use | Mobile graphs, linked investigations, stable renderer, dedicated CI | Keyboard/mobile workflows and lifecycle tests pass; measured overhead falls |
| 4. Expand the model | Launch height, paired models, force/energy evidence, reusable activities | New features use the same validated engine and records |

The highest return is stages 1 and 2. They improve the reliability of nearly every feature students already use.
