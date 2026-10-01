# Launch and orbit verification

## Focused unit result

**51 distinct tests passed** across the final focused run and its one-test rerun:

- `moonmission_moon_and_splash.test.js`: 30 tests.
- `moonmission_proceed_gates.test.js`: 13 tests.
- `moonmission_saturn_v.test.js`: 8 tests.

The full focused run recorded 50 passes and one 5-second timeout in the mission-reset test. The reset fixture unnecessarily integrated a full launch. Replacing it with a valid compact saved result preserved the reset assertions; the targeted rerun passed in 383 ms. Do not add the rerun's skipped tests to the unique count.

Machine-readable reports:

- `focused-launch-units.json`: the complete 51-test run.
- `focused-launch-reset-rerun.json`: the passing reset rerun.

## Coverage changes

- Launch event assertions follow physical model times and use air-relative speed for Mach and dynamic pressure.
- Stage geometry, detached stages, plume behavior, sky/horizon geometry and 30/60/120 Hz timing remain covered.
- Proceed requires a recorded orbit result. A paused student can deliberately show the result, and repeated clicks pay the launch reward once.
- Orbit integration checks restore around two sunrise crossings and the burn-window opening, then advance the real renderer across each boundary. Sixteen positions check illumination around the orbit. This preserves event and frame-rate coverage with about 400 painted frames instead of several thousand.
- Orbit canvas descriptions cover the S-IVB stack, gravity, shadow, sunrises and the engine remaining off before the commanded burn.
- Mission reset clears the launch playhead and insertion result.

## Browser suite

Authored `tests/e2e/moon-mission-launch-orbit.spec.ts` with ten cases covering numeric launch readouts, mass drops and ignition gaps, recorded insertion and reward persistence, legacy migration, phone layout, pause/resize/reload, circular-orbit equations, commanded TLI and hidden-document clocks. The parent agent ran the browser checks serially and owns their final results.

The legacy paused-orbit case in `21-moon-mission-gl.spec.ts` now asserts a frozen model clock and deliberate advancement to the burn window.

No production files or moonwalk tests were changed by this QA work.
