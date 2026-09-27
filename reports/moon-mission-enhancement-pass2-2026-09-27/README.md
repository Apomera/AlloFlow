# Moon Mission: rover physics and landing review

This continues the simulation enhancement in `e6e137b8e`.

## Changes

- Rover motion now advances in fixed 1/120-second steps. Acceleration, steering, braking, terrain grip, suspension and impact detection share that clock. Trail marks use the positions sampled during travel. Slow rendering no longer slows the simulated rover.
- The hop timer uses the same active clock as EVA movement and resources. Time spent in a hidden tab is excluded.
- Descent uses the detailed Apollo-style lunar module shared with the surface scene, with foil, faceted cabin, windows, ladder, struts and contact probes. Actual footpad geometry determines visual clearance when the craft banks over terrain. Regolith has finer surface detail, crater relief and rocks.
- Chase, overhead and landing cameras provide different views without changing the flight. Both live flight and recorded approaches use the same renderer.
- Each descent records altitude, velocity, fuel, throttle, tilt and displacement. The recorder preserves the initial and contact samples, stores at most 360 samples and keeps the five most recent attempts. Long flights are sampled less often to stay within the storage bound.
- Altitude and speed charts, a keyboard-accessible time slider, touchdown feedback, attempt comparison and CSV export let students inspect the result. Replay changes presentation only. The final flight instruments and grade remain fixed.
- Successful landings can be retried. Repeated high-scoring attempts do not award the landing bonus repeatedly. Saved completed approaches reopen at the surface.
- Older saves retain their recorded grade and original fuel units; missing measurements show "Not recorded." The mission header now has an explicit contrasting background and readable text.
- The ascent demonstration now derives altitude and separation from shared mission progress. Resizing the viewport cannot change the displayed distance. Crash coaching names the vertical or lateral limit actually broken, and restored entry summaries use the selected entry angle's calculated peak g.

## Model boundaries

The powered-descent force, mass and fuel model from the first pass is retained. Scene altitude is compressed, terrain is illustrative, and touchdown grading uses a flat surface. Camera changes do not alter measurements. Recorded dust is omitted because individual particles are not stored in the flight trace.

Rover handling remains an authored classroom model with scene-scale terrain and tuned grip/suspension parameters. The new integration makes its behavior consistent across rendering rates; it does not turn it into a validated reconstruction of Apollo LRV dynamics. The ascent/rendezvous sequence is explicitly labeled as a scripted teaching demonstration with an illustrative 200 km initial along-track separation.

## Validation

**243 unique unit checks and 13 distinct Chromium scenarios passed.** The complete run passed 241/241 across 26 files (`final-unit-tests.json`). A final compatibility update added two cases for missing/empty legacy attempt history; the updated restore, accessible-name and mirror suites then passed 10/10 (`final-restore-tests.json`).

The browser checks covered actual controlled descent, throttle/propellant response, pause, phone controls, WebGL fallback, all three rendered camera transforms, saved-flight restoration, visual-only scrubbing, CSV download, successful retry, lunar hopping, collecting multiple samples, rover boarding/driving/exiting, phone EVA controls and teardown. The controlled flight touched down at 0.9 m/s vertically and 0.1 m/s laterally, with 41 seconds of hover fuel remaining. The final camera/review/phone suite passed 3/3 after the geometry and compatibility updates. Desktop, final approach, touchdown, camera and phone screenshots were inspected; local evidence is under `browser-results/` and `review/`.

The first combined unit run passed 228/230: a hop assertion still referred to the old wall clock, and the newly available successful-retry button exposed a mismatch between its visible and accessible names. Both were corrected. One browser rover attempt walked past boarding range while releasing two keys in separate automation calls; boarding immediately on the displayed range cue preserved all original assertions and passed the full keyboard flow. No production range check was relaxed.

JavaScript syntax and scoped whitespace checks passed. Canonical and desktop module SHA-256: `3dce5cd29c9c142ee459dca686fd120461e5e245de64593b66fbf3a28128c220`.

Browser tests use local repository source with the React/Three harness. No deployment is part of this change. Unrelated working changes were preserved.

Relevant tests:

- `tests/moonmission_rover_physics.test.js`
- `tests/moonmission_flight_recorder.test.js`
- `tests/moonmission_ascent_model.test.js`
- `tests/moonmission_descent_geometry.test.js`
- `tests/moonmission_landing_restore.test.js`
- `tests/e2e/moon-mission-flight-dynamics.spec.ts`
- `tests/e2e/moon-mission-flight-review.spec.ts`

Run the unit suite in PowerShell:

```powershell
$moonTests = Get-ChildItem -LiteralPath tests -Filter 'moon*.test.js' | ForEach-Object { $_.FullName }
node node_modules/vitest/vitest.mjs run $moonTests --maxWorkers=1 --testTimeout=30000
```

Run the new browser checks with one worker:

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/moon-mission-flight-dynamics.spec.ts tests/e2e/moon-mission-flight-review.spec.ts --workers=1 --retries=0
```
