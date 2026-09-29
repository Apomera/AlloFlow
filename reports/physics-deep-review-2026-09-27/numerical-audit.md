# Physics model and experimental data audit

Date: 2026-09-27. Scope: `stem_lab/stem_tool_physics.js` and physics unit/browser test source. No application source was changed.

## Evidence and limits

`numerical-probe.cjs` extracts and executes the actual `physStep`, `physSimulate`, and solver functions from the application. It compares them with an independent RK4 reference using a 0.0001 s step. Its canvas comparison reproduces the current integration and ground-intersection expressions; it does not execute React, RAF, or the browser renderer. `numerical-results.json` records the source SHA-256 and full outputs. All six main cases use supported slider settings.

Run from the repository root:

```powershell
node reports/physics-deep-review-2026-09-27/numerical-probe.cjs
```

## Prioritized findings

### P1 — Animation pace changes the measured physics

The solver advances by 0.035 s (line 90). The canvas takes elapsed wall time multiplied by playback speed (799–809). Both use the first-order semi-implicit Euler step (72–82), so sharing the function does not make the trajectories agree. The comments at 65–67 promise playback invariance that the implementation does not provide.

At 45°, 50 m/s, Earth gravity, drag on, 1 kg:

| Calculation | Range |
| --- | ---: |
| Independent RK4 reference | 149.113516 m |
| Source prediction / target solver | 147.506319 m |
| Canvas equivalent, 60 fps | 148.349057 m |
| Canvas equivalent, 144 fps | 148.795132 m |
| Canvas equivalent, 60 fps at 0.25× | 148.922505 m |

The discrepancy becomes large in short flights. At 5°, 5 m/s, g = 25, drag off, the exact range is 0.173648 m. The 60 fps path gives 0.087007 m, the 144 fps path 0.138921 m, and the predictor 0.348668 m. The predictor also forces at least two steps before accepting ground contact (94), even when the first step has already gone underground. It returns 0.07 s for a flight whose exact duration is 0.034862 s. The canvas accepts ground contact after the first step.

**Improve:** use one deterministic simulation clock with an accumulator; playback and display refresh should control presentation. Use exact constant-acceleration propagation without drag and a sufficiently accurate integrator for drag. Resolve the first ground crossing and apex as events. Changing only the timestep scheduler will leave the short-flight integration error in place.

**Acceptance:** across 30/60/144 fps, playback 0.25/0.5/1×, and manual stepping, a launch should produce the same final state within floating-point noise. Vacuum range, height, and time should agree with the analytic answer to 1e-9 relative error with a small absolute floor when using exact propagation. Drag results should meet a documented error budget; proposed initial target: max(1 mm, 0.1%) for range/height and max(0.1 ms, 0.1%) for time versus an independent converged reference. Include the supported minimum speed/angle and maximum gravity, not only the default flight.

### P1 — Launching while paused is treated as an immediate landing

Launch initializes y = 0 (707). A paused frame skips integration (1355), but the ground branch still runs for y <= 0 (1582), sets `launched = false`, and calls completion callbacks. The deterministic canvas reproduction produces a 0 m, 0 s result with the full launch velocity still present. Browser confirmation is being handled by the parent audit.

**Improve:** distinguish ready, flying, paused, and landed states; only detect contact following positive simulated time and an actual contact event.

**Acceptance:** Pause → Launch → wait must preserve an unadvanced pending flight and create no summary/log entry. Step must advance it once. Resuming must produce the same completed result as an uninterrupted launch.

### P2 — Flight export and summary disagree at impact

The trail point is appended before ground interpolation (1401 versus 1584–1590). The summary reports corrected x but uncorrected full-step time (1634). CSV exports the raw endpoint and clamps its underground height to zero (2364). Thus the CSV terminal row describes a different impact than the landing marker and log.

For the 45°, 25 m/s vacuum case at 60 fps, the logged range is 63.480543 m, while the terminal sample/CSV x is 63.639610 m. The raw endpoint height is -0.158390 m, rewritten as 0 by CSV. The corrected contact time is 3.591002 s; the summary retains 3.600000 s. Launch also omits the initial t=0 trail sample (723–728), making initial-condition checking harder.

**Improve:** create one canonical contact state containing interpolated position, velocity, and time; append it once and use it for the summary, graph, export, scoring, and energy. Include an initial state sample.

**Acceptance:** final CSV state, final trail state, last-flight summary, and landing marker agree within their documented formatting precision. Every complete flight begins at t=0 and ends at y=0, with no hidden below-ground samples or duplicate terminal rows.

### P2 — Drag graphs teach vacuum-only conclusions

The velocity data responds to drag, but the Vx graph accessible name says it is a flat line (3098), the caption says no horizontal force / Vx constant (3108), the Vy caption says straight line / constant gravity (3123), and the footer says horizontal and vertical motion are independent (3127). Under the implemented quadratic drag, both acceleration components depend on total speed, so these claims are false. Changing the current drag checkbox after a flight should not relabel a stored flight incorrectly: use the trail's launch metadata.

**Improve:** explain the current trajectory model and measured trend. For drag flights, show horizontal deceleration and curved Vy; distinguish gravitational acceleration from total acceleration. Optional gravity and drag force vectors would make the difference tangible.

**Acceptance:** render both vacuum and drag trails and check the visible descriptions and accessible names against the model that produced the trail.

### P2 — Export metadata loses experiment identity

- Run-log CSV writes `i + 1` (2347); the on-screen table uses `r.n` (2954). After nine launches, the visible last eight runs are numbered 2–9 while the exported rows are numbered 1–8. Clearing the log causes the same mismatch on the next run.
- Trail metadata records angle, velocity, gravity, and drag but omits mass (724–727). Flight CSV uses `lastFlight.mass` (2359), so exporting a new flight in progress after changing mass labels it with the preceding flight's mass.

**Improve:** give each flight an immutable record with run ID, initial conditions, model parameters/version, samples, and outcome. Both exports should derive their metadata from that record.

**Acceptance:** after nine runs and after clearing the log, CSV IDs equal visible IDs; exporting a 10 kg flight after a 1 kg flight records 10 kg even before landing and after later slider changes.

### P2 — Imported-state bounds admit undefined or unstable cases

The saved-state guard permits g = 0, mass = 0.01 kg, and velocity = 1000 m/s (247–250), beyond the slider's 1–25, 1–10, and 5–50 limits (2805). Zero gravity produces divisions by zero in the formula/zoom paths; the predictor reaches its 20,000-step cap and returns an invented finite landing at 12,374.37 m after 700 s. The drag step can reverse velocity if K|v|dt/m > 1; the admitted mass/speed extremes give a factor of 14 with the solver step and generate an unphysical 57,915 m maximum height.

**Improve:** define the supported model domain once and validate saves, sliders, solvers, and runtime consistently. Either reject/clamp zero gravity or explicitly represent a trajectory that never returns to the ground. An iteration cap should return a failure/status, not a successful-looking landing.

**Acceptance:** boundary and malformed saved states never emit Infinity/NaN, never reverse horizontal velocity under still-air drag, and never claim a landing solely because an iteration cap was reached.

## Useful next capabilities after correctness

1. Show vacuum and drag trajectories from the same initial conditions, with consistent prediction, measurement, and uncertainty labels.
2. State model assumptions near the air-drag control: still air, constant gravity, fixed effective area/shape, same launch/landing height. The current coefficient is tuned for instruction. K in F = K|v|v has units kg/m; it combines density, drag coefficient, and area, rather than being a standalone dimensionless drag coefficient or a value “per kg.”
3. Add editable launch height and an elevated landing plane, including the horizontal-launch-versus-drop experiment. Current claims about that experiment cannot be demonstrated directly by a ground-level launch with minimum angle 5°.
4. Add position, velocity, acceleration, and mechanical-energy graphs tied to the same flight record. This supports genuine model checking with exported data.
5. Keep ordinary prediction/scoring separate from target collisions: snapping a hit to the target center at 1389–1391 should not overwrite the physical impact location in scientific data.

## Regression gaps

`tests/physics_drag_integrator.test.js` currently checks one default vacuum range within 2%, broad drag trends, one optimum-angle band, zero-dt `physStep`, and solver/predictor self-consistency. Comparing the solver against the same integrator cannot reveal a shared numerical bias. The browser test covers mid-flight pause and wall-clock duration but does not establish frame-rate/playback invariance, correct paused launch, accurate terminal samples, or short-flight behavior.

Useful invariants include vacuum mass independence, complementary-angle equality, v² and 1/g range scaling, conserved vacuum mechanical energy, monotonic mechanical-energy loss with still-air drag, nonnegative forward velocity, positive supported flight duration, and consistent event state across every display/export. Check those over a small parameter grid plus the important boundaries.

## Primary scientific references

- [OpenStax, Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion): constant horizontal velocity and independent component treatment assume negligible air resistance.
- [NASA Glenn, Drag Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/): drag depends on density, reference area, drag coefficient, and squared speed.
