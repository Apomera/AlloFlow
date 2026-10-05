# Moon Mission enhancement pass 17

Completed October 3, 2026. This pass began October 2; the report folder keeps that date. Changes are unstaged and uncommitted.

## Landing predictions

The lunar descent now has an optional **Explore landing predictions** panel. It compares holding the current throttle and tilt commands with commanding full thrust and centered tilt. Both forecasts advance detached copies through the existing flight integrator. Opening the panel, changing its hypothesis, or inspecting a recording leaves the flight, landing result and rewards unchanged.

The panel shows two paths on equal horizontal and vertical metre scales, with endpoint time, altitude, vertical speed, lateral drift, displacement, propellant use, remaining fuel and fuel exhaustion. Open endpoint circles mean the forecast ends before contact; filled circles mean contact. The white dot marks the inspected position. Each path stops at its first vertical arrest, contact, or the 90-second limit, so the endpoints may represent different times.

A vertical arrest leaves any sideways motion intact. It does not establish a landing or a sustainable hover. The status and readouts make that distinction explicit.

### Physics and event handling

- Finite fuel, changing mass, lunar gravity, residual shutdown impulse, engine response and attitude response carry over from the inspected state.
- The original descent constants and integrator remain unchanged: 7,000 kg dry mass, 46,700 N maximum thrust, 311 s specific impulse, 0.11 s engine response, 0.23 s attitude response and at most 1/120 s physics slices.
- Forecast batches are 0.05 s, with graph samples about every 0.5 s. Arrest and fuel exhaustion are refined inside the original physics slices with 24 bisections. A smooth local velocity maximum is also checked during shutdown when an arrest could occur between slice endpoints.
- That last check fixes a real numerical edge case: a near-empty burn or a shutting-down engine could briefly stop descent and resume falling before the next forecast sample. The forecast now retains the first arrest.
- Source snapshots, commands, histories and summaries are frozen. Local forecast time and displacement avoid subtracting large absolute values. A cache holds at most eight complete profiles; each ordinary 90-second path has at most 182 graph samples and 1,801 forecast batches. Experimental step values are bounded separately.

The changing-mass impulse uses the existing ideal rocket equation, with gravity applied separately. [NASA Glenn's explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/) describes that relationship. Engine constants, a flat model surface and response assumptions remain those of this educational simulation.

Fuel reserve retains the existing equivalent upright hover seconds. Propellant used is shown separately in kilograms. The graph uses one physical scale for both axes and both cases, with labels outside the SVG so text remains readable on small screens.

### Live, paused and recorded states

The panel starts closed. Its single saved preference is `descentPredictionOpen`, accepted only when it is the boolean `true`; replay resets it. Forecasts refresh at most twice per second while a flight is active. Paused control changes and recorded-sample changes update immediately. Closing the panel skips forecast work.

Live forecasts use the current command targets while retaining the actual initial engine output and tilt. Recorded samples contain actual throttle rather than the original future command sequence. Their comparison therefore labels that throttle as a hypothetical future command, with centered tilt. It does not reconstruct pilot commands.

Saved landings without a recording show that the measurements are unavailable and omit the graph and numerical forecast. Legacy percentage fuel is never turned into an invented mass or fuel reserve. At a completed contact, the panel identifies the terminal state and directs the reader to an earlier recording sample.

## Numerical evidence

The standard practice state is 300 m altitude, 9 m/s downward speed, 4 m/s lateral drift and 110 equivalent hover seconds of fuel. Values below are rounded from [physics-comparison.json](physics-comparison.json).

| Initial condition and command | Endpoint | Time | Altitude | Vertical speed | Lateral drift | Propellant used |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Cold engine, throttle off | Contact | 14.464 s | 0 m | 32.484 m/s down | 4.000 m/s | 0 kg |
| Cold engine, full centered thrust | Arrest | 2.071 s | 290.032 m | Approximately zero | 4.000 m/s | 30.023 kg |
| Already firing, throttle off | Contact | 14.774 s | 0 m | 32.296 m/s down | 4.000 m/s | 1.684 kg |
| Already firing, full centered thrust | Arrest | 1.923 s | 291.340 m | Approximately zero | 4.000 m/s | 29.440 kg |
| Initially tilted right, full centered thrust | Arrest | 1.932 s | 291.260 m | Approximately zero | 4.503 m/s | 29.584 kg |
| Only 0.01 hover seconds of fuel, full thrust | Contact | 14.471 s | 0 m | 32.480 m/s down | 4.000 m/s | 0.0373 kg |
| Only 1 m altitude at 20 m/s downward, full thrust | Contact | 0.050 s | 0 m | 20.019 m/s down | 4.000 m/s | 0.150 kg |

The nearly empty case exhausts its fuel after 0.024 s and continues to contact. A separate 15,000 m coast reaches the 90-second forecast limit at 8,346.49 m; it establishes neither arrest nor contact. All six probe source states remained unchanged. The two transient-arrest regressions cover a tiny burn that arrests before exhaustion and a shutdown arrest between slice endpoints.

## Verification

**96 unique passing unit checks across eight files, including 40 new checks.** Counts use the latest result for each file and do not count repeated runs twice. They cover ballistic contact, the rocket equation and gravity impulse, response lag, finite fuel, lateral symmetry, event ordering, transient arrest, step refinement, frozen state and cache behavior, invalid sources, metre geometry, strict preferences, recording provenance, legacy saves and replay. Existing descent, handover, clock, recorder, restoration and physics checks also passed.

**All four final Chromium workflows passed**, with one worker, zero retries and unchanged timeouts:

1. Paused controls update the numerical comparison immediately, leave the inspected state intact and persist only the panel preference.
2. The active clock follows the flight. A coast forecast matches the actual contact time and speed, and reopening the panel preserves the completed outcome and once-only rewards.
3. Recorded-sample inspection preserves the landing receipt. A legacy save omits missing measurements.
4. At 320 px, keyboard activation, a 44 px control, text of at least 12 px, equal-axis paths and absence of page overflow are verified. The scoped WCAG 2 A/AA and 2.1 A/AA axe scan reports zero violations.

The active clock/contact workflow retains default WebGL-enabled rendering. DOM, provenance and phone workflows explicitly exercise the supported Canvas2D fallback. Screenshots disable CSS animations during capture using the [Playwright screenshot option](https://playwright.dev/docs/api/class-locator#locator-screenshot). These checks do not measure hardware rendering performance.

### Visual evidence

All five final panel captures were inspected for readability, physical scale, endpoint meaning and source labeling:

- [Paused command comparison](browser/predictions-events-final/prediction-paused-controls-chromium.png)
- [Recorded sample](browser/predictions-events-final/prediction-recorded-sample-chromium.png)
- [Actual terminal contact](browser/predictions-events-final/prediction-actual-contact-chromium.png)
- [Legacy measurements unavailable](browser/predictions-events-final/prediction-legacy-measurements-chromium.png)
- [320 px phone panel](browser/predictions-events-final/prediction-phone-320-chromium.png)

### Raw results and validation history

- [Final verification](verification.json), [visual review](visual-review.json), [final prediction unit checks](unit-events-final.json), [final Chromium results](browser-events-final.json), [phone axe results](browser/predictions-events-final/phone-axe.json).
- The initial unit process exited 1. Its JSON contains 74 passing assertions across six files and no failed assertion; two selected files were absent. The cause was not established. Those two files then passed separately with 17 checks. [Initial output](unit-initial.json), [remaining files](unit-remaining.json).
- The [initial browser run](browser-initial.json) had two passes and two failures. One panel screenshot timed out after paused-control assertions passed. The legacy fixture helper incorrectly expected recorded kilograms when the UI correctly said “Not recorded.” The helper was corrected; capture disables CSS animations, and DOM/provenance checks use the fallback renderer.
- [The next complete browser run](browser-final.json) passed all four workflows. A subsequent numerical probe found the transient-arrest edge case. After correcting it and adding two regressions, the final 40 prediction checks and all four browser workflows passed again. Earlier results and failure artifacts are retained.

## Preservation and delivery

Canonical and public runtime files are byte-identical at **1,309,695 bytes**. Both pass JavaScript syntax checking. The scoped diff has no whitespace errors.

Final SHA256: `3314c07bc96271cb7eea1bcb5bb70ede100ecf28013b7237304c4e41176ad5b5`.

Reversing the seven recorded integration operations in memory recovers the exact 1,287,380-byte pass-16 baseline, SHA256 `5c46e7f3fa84e76dcff2581de75f3230554df851f11afab5a22f99ccafaf7727`. This preserves the existing descent integrator, controls, guidance, contact grading, handover, recording format, entry/thermal/force work and unrelated source changes. [Integration map](integration-map.json), [baseline](baseline.json).

The scoped Git index matches [its initial snapshot](index-before.txt). New tests are unstaged. No staging, commit, push, deployment or full host build was performed. Only pass-17-owned temporary authoring fragments and private helpers were removed after verification; source, tests, results and failure evidence remain.
