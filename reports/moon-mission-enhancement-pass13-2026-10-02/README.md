# Moon Mission: continuous powered descent

Pass 13 · 2 October 2026

## What changed

The verified powered approach now continues into piloted landing at its measured 300 m crossing. The same remaining descent propellant, vehicle mass, radial and lateral velocity, actual throttle and thrust tilt carry across. Difficulty no longer replaces the computed tank with a practice reserve.

A new start panel lets the pilot choose **Computed handover** or **Landing practice**, then inspect eight initial measurements. Practice retains the Tourist/Pilot/Commander presets of 160/110/90 seconds of ideal hover reserve. Missing or corrupted approach evidence falls back to practice. Older active/completed saves without a start receipt remain practice; they retain existing results and rewards.

Authored descent decisions deduct reserve and add drift once when the initial state is created. Both modes can reach zero fuel; the old ten-second floor no longer creates propellant. These scenario changes are identified explicitly, including any boulder site.

Each landing and attempt stores a detached, validated start receipt. Reload and retry reuse that receipt even if later planner data changes. Explicitly changing the start mode or approach plan creates a new start. The landing report and replay archive keep the original receipt. Changing the plan cannot rewrite a completed landing.

Slow rendering now retains elapsed flight time in fixed 60 Hz steps instead of treating every interval over 250 ms as a single step. At 2 frames/s and 60 frames/s, four elapsed seconds produce identical physical states. Active stalls advance at most one second per frame; hidden/local/global pause transitions clear accumulated time, including a transition occurring between renders.

The live scene inherits the engine state, and the throttle command starts at the actual inherited setting. The whole-mission pause now also holds piloted descent, with no elapsed-time catch-up. Instruments include powered-plus-piloted time and downrange from the powered start. Local time and displacement still start at zero at handover. Completed restores show engine cutoff consistently in the HUD, slider and instruments.

## Measured start states

No scenario deductions; the final approach state is unchanged by difficulty.

| Guidance plan | Mass | Descent propellant | Ideal hover reserve | Actual throttle |
| --- | ---: | ---: | ---: | ---: |
|600 s |8178.813 kg |1178.813 kg |292.286 s |31.078% |
|720 s |7974.149 kg |974.149 kg |244.693 s |29.423% |
|900 s |7616.670 kg |616.670 kg |158.558 s |27.419% |

Exact receipts are in `handover-measures.json`. Reserve converts mass using `fuel = (Isp × g0 / lunar_g) × ln(mass / retained_mass)`, so the existing mass function reproduces the powered endpoint. This follows the [NASA ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/).

The 311 s specific impulse is an adopted model constant also used in Table 5 of NASA’s [Analytical Assessment of the Reciprocating Feed System](https://ntrs.nasa.gov/citations/20060047647). The 0.11 s engine response follows Bilimoria’s 2009 lunar-lander handling-qualities research model (DOI 10.2514/1.40187), rather than a certified hardware response. Its former NASA Ames PDF link redirects to a general page; the flight panel now links to NASA’s rocket-equation explanation.

## Model limits

The powered segment uses spherical lunar dynamics. Below 300 m, the piloted segment uses a local flat surface, altitude-dependent gravity, finite propellant, lagged throttle and assisted attitude control. Surface curvature coupling changes at this boundary; physical mass and velocity are preserved. Throttle is continuous, retained mass is a rounded 7000 kg, and separate RCS propellant, terrain slopes and historical navigation errors remain omitted. Combined downrange adds the local displacement to the prior surface distance. This remains an educational preset.

## Verification

- 126 distinct unit checks across 16 files passed across the recorded runs: 119 original focused checks, plus seven clock checks. The final clock source passed 58 affected checks across seven files. After the engine-cutoff restore fix, 22 handover/restore checks passed and the 11 recorder checks passed in a separate recovery run. A fork-worker startup timeout prevented the recorder from starting in the first recovery command; that original error is retained in `restore-worker-timeout.json`.
- Initial four Chromium handover workflows passed with retries 0, including real flight to contact, reload, retry after a planner change, explicit practice, and 320 px keyboard/axe checks.
- A browser discovery run exposed the existing slow-frame clock defect through an unchanged fallback-flight assertion; it was stopped after preserving the failure. `browser-clock-discovery.json` describes the observed failure and interruption; the original trace/video remain local under `browser-artifacts-final`. The corrected source is checked in the final browser run.
- Initial visual review found the restored command/HUD cutoff mismatch described above; the fix has assertions in the final browser workflow.
- Initial regression report retains one failure caused by the obsolete “practice resets reserve” expectation. That expectation now checks the measured continuation and the final unit run passes.
- Canonical and desktop public source files are byte-identical. JavaScript syntax and scoped diff checks pass. Independent physics and visual reviews are recorded in `verification.json`.

The final 16 Chromium workflows all pass with retries 0, no skipped/flaky/unexpected cases, and zero handover/flight/approach 320 px axe findings. Final totals, source hashes and capture paths are recorded in `verification.json`. No package build, push or deployment was performed. Shared Moonwalk changes and unrelated index entries are preserved.
