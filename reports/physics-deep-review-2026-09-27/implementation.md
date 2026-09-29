# Physics simulator improvements

Implemented September 27, 2026, following the [deep review](README.md).

Follow-up: [paired model comparisons and guided investigation notebooks](../physics-investigations-2026-09-27/README.md) add the classroom experiment features from the roadmap.

## Result

The simulator now uses the same fixed simulation steps for predictions, animated flights, measurements, and exported samples. Pausing before launch holds the projectile at its initial state; Step advances one simulation tick. Playback speed and display refresh rate change how quickly a flight is shown without changing its measured result.

### Physics and recorded evidence

- Vacuum motion uses exact constant-acceleration propagation. Quadratic drag uses RK4 integration, with smaller internal steps when the drag rate requires them.
- Ground impact and apex are resolved within a tick. Range, flight time, maximum height, scoring, and the final sample share the same landing state.
- Target hits retain the measured landing position. Scoring no longer moves the ball to the target center.
- Every trajectory captures its starting parameters, mass, model version, prediction, and mission context. Its HUD and comparison overlay retain those parameters if a control changes during flight.
- Prediction failures return explicit statuses instead of plausible-looking zero measurements.

### Saved work and exports

- Saved state is normalized before rendering: malformed entries are filtered, numeric controls are bounded, counters are repaired, and valid records and reflections are preserved.
- Legacy history entries receive missing run IDs without overwriting valid IDs. Exported IDs remain stable when old entries leave the visible history.
- CSV exports use recorded mass and model metadata. The first sample is at time zero and the final sample is the measured ground contact.

### Learning and interaction

- Graph descriptions and accessible names reflect the model used for the recorded flight, including when the current air-resistance toggle changes afterward.
- Vacuum assumptions are explicit in the guide, misconceptions, and complementary-angle comparison.
- The 30°/60° comparison uses the same speed and gravity for both launches, waits for actual landing, respects Pause, and cancels when the user starts another activity.
- Keyboard controls respect fixed-angle and fixed-velocity missions. The final mission round offers a working restart action.
- The ideal-gravity calculator has an explicit Apply action. It does not silently change the simulator while exploring a calculation.
- An on-demand paused inspector reports position, velocity, acceleration, gravity and drag forces, kinetic and potential energy, and energy transferred to the air. It captures a stable readable snapshot rather than announcing every frame.
- Motion graphs stack on small screens, with larger labels. Graph text and meaningful strokes have explicit theme colors.

### Rendering and maintenance

- The canvas controller survives React updates and reads the latest callbacks and settings. Unmount cleanup removes observers, listeners, frames, and comparison timers.
- Canvas sizing follows ResizeObserver with bounded device-pixel ratio. Predictions are cached by settings.
- Idle and paused scenes stop scheduling animation once effects finish. Active flights use a fixed-step accumulator, and hidden-tab handling prevents a large resumed time jump.
- Reduced-motion preferences suppress unnecessary effects.
- The source and desktop copy are synchronized. New English physics strings are registered in both catalogs; other language packs continue to use the existing fallback mechanism.
- A dedicated GitHub Actions workflow runs physics unit and browser suites for relevant pull requests. It has not been executed on GitHub during this task.

## Verification

| Check | Result |
| --- | --- |
| Seven focused Vitest suites | 58 tests passed |
| Three focused Playwright suites | 16 distinct tests passed: initial 15-test run, then both theme tests after adding the SVG regression |
| Paused inspector follow-up | 9 learning-contract tests passed |
| Phone layout and themes | Six checks: 320 px and 375 px in default, dark, and high contrast |
| Syntax, scoped whitespace, source/mirror equality | Passed |

Numerical coverage includes analytic vacuum trajectories, apex and ground-contact boundaries, vacuum energy conservation, independent drag reference values, drag energy loss, solver limits, and invalid inputs. Browser checks compare 30, 60, and 144 Hz at normal and quarter speed, paused launch and stepping, exports after nine runs, controller lifecycle, mission locks, and comparison sequencing.

The visual harness loads the actual React tool and application styles. At phone widths, both component charts remain vertically stacked, no document overflow was detected, and effective axis labels measure at least 12 px. Graph explanations retain the recorded drag model after the current toggle is turned off. No page errors were observed. The theme browser test measures actual SVG fills and strokes: text meets at least 4.5:1 contrast, meaningful graphics meet 3:1, and all measured high-contrast graph elements meet 7:1.

Evidence: [visual measurements](improvement-visual-results.json), [default at 320 px](after-default-320.png), [high contrast at 320 px](after-contrast-320.png). Reproduction harness: [verify-improvements.cjs](verify-improvements.cjs).

Run the focused checks from the repository root:

```powershell
npx vitest run tests/physics_ --maxWorkers=1
npx playwright test tests/e2e/72-physics-lab-behaviour.spec.ts tests/e2e/75-physics-theme-contrast.spec.ts tests/e2e/physics-flight-integrity.spec.ts --workers=1 --retries=0
node reports/physics-deep-review-2026-09-27/verify-improvements.cjs
```

## Remaining opportunities

Launch height, wind, additional teacher activities, and richer experiment comparison remain future extensions. The model still assumes constant gravity, level ground, and a fixed quadratic drag coefficient. Browser verification used local component harnesses; this task did not deploy the application or run a packaged desktop release. New text still needs translation into the supported non-English languages.
