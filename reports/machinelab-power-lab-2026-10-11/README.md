# Machine Lab: power, motion and skill practice — October 11, 2026

The optional **Power & motion lab** follows the efficiency lab at every workshop station for grades 6–8 and 9–12. Learners choose an assumed efficiency, task duration in seconds or minutes, and a mechanical input-power budget. The task uses the current machine geometry, load and load movement. Calculation time is explicitly separate from demonstration playback.

All six machines offer six skills: average input power, useful power, power lost, hand-path speed, load movement rate, and time at the input-power budget. Windlass and screw add applied handle torque and RPM, giving 40 station/skill combinations. Ramp output is labeled **vertical rise rate**, preserving the station's definition of load movement.

## Calculations

For useful work E, efficiency fraction η, task time t, ideal mechanical advantage M and load F:

- Input work is E/η. Average input, useful and lost powers are their respective energies divided by t.
- Hand-path speed is total hand travel/t. Output movement rate is load movement/t.
- Time at a specified mechanical input power P is E/(ηP). The budget comparison checks the requested average input power, with the same small numerical tolerance used by the existing design model.
- On rotating handles, applied torque is tangential effort × handle radius; turns are hand travel/(2π × handle radius); RPM is 60 × turns/t; angular speed is 2π × turns/t. Torque × angular speed equals input power.

The screw assumes a single-start thread, so one turn advances by one pitch. The windlass uses drum circumference for load advance per turn. Applied drive torque is not net torque. These are constant-efficiency, steady-motion calculations; they do not predict acceleration, inertia, starting friction or material strength. The budget refers to mechanical input, not electrical motor consumption.

The pace table compares half, original and double duration. It holds geometry, effort, efficiency and work fixed while power and movement rates change inversely with time. It does not change workshop settings.

The calculations follow [OpenStax's definition of average power](https://openstax.org/books/university-physics-volume-1/pages/7-4-power), [rotational variables](https://openstax.org/books/university-physics-volume-1/pages/10-1-rotational-variables) and [rotational work and power](https://openstax.org/books/university-physics-volume-1/pages/10-8-work-and-power-for-rotational-motion).

## Practice and saved work

Each skill offers separate unit feedback, two progressive hints, a deliberate worked solution, and a Next skill button. Saving remains explicit. Each station retains at most one valid fixed record per supported skill. The count describes saved practice across possibly different tasks, not mastery. Existing ideal designs, efficiency practice, prediction progress and investigation evidence retain their meaning.

Practice checks allow 1% relative error with a 0.0000000001 absolute floor. Three significant figures are sufficient; zero is rejected for small positive movement rates. Displayed values use six significant figures in decimal notation, while efficiency givens retain precision so near-100% assumptions do not become misleading zero-loss problems. A review caught and corrected that edge case before final verification.

Every draft signature includes the station, physical settings, efficiency, duration, time unit, budget and selected skill. Changes clear the visible attempt; returning to an identical task can recover its still-valid draft. Delayed callbacks cannot save a different task or station. Viewing a worked solution stays recorded even after subsequent answer edits.

Saved records retain fixed geometry, efficiency, seconds, budget, answer, unit, hints and completion method. Imported records are validated and computed results are regenerated from the snapshot. Work-record copy and native download include each saved skill beside existing design and efficiency evidence.

## Verification

Final counts, hashes, native receipts, visual checks and any retained diagnostics are in `validation-summary.json`. The new tests use independent equations, all 40 skill combinations, boundary values, units, precision, state transitions and saved evidence. Regression receipts cover the existing Machine Lab suites with each assertion counted only in the process that actually executed it.

Final coverage is **1,169 passing cases across 20 files in 34 fresh processes**: 996 existing cases and 173 new ones. All 29 regression processes exited zero on the final source. The 192 view cases ran in eight disjoint groups of 24 to limit memory use; the 112 existing efficiency cases ran in their four established disjoint groups. `tests-final.json` aggregates coverage without claiming one test invocation ran every case.

All **173 new cases** pass in five fresh processes: 15 physics, 45 comparison, 60 grading, 25 guided-practice and 28 saved-record cases. The first frozen-source physics process exited natively with `-1073740791` before producing a receipt. Its process manifest is retained; no assertion result is claimed for it. All five final groups passed with 512 MiB old space and 8 MiB semispace. The earlier pre-freeze physics receipt is also retained and excluded from final coverage.

Native Chromium passed **528 checks across 13 fresh scenarios**, with zero errors and no retries. All four screenshots were visually inspected: [desktop](browser/desktop-power-checked.png), [phone hints](browser/phone-power-hints.png), [forced-colors rotation](browser/forced-colors-power-rotary.png) and [dark saved work](browser/dark-phone-power-record.png). The [native download](browser/downloaded-record.txt) includes two separate power skill records alongside prior efficiency and design work. The independent code review found no remaining blockers after the precision fix.

Canonical, public and browser-embedded source match SHA-256 `cda2cda814118f996a3212bdbec7a57f26085638abcb8ebed8bd07dd278ab9b4`. The browser manifest binds the harness, outputs and inspected images to that source. Generated manifest and successful console-log line endings are normalized to Git LF form; native assertion receipts remain unchanged.

The native browser harness uses the real React/THREE workshop, keyboard events and a real text download. Generated browser HTML, temporary profiles and duplicate downloads are excluded from the committed report. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.

For later reproduction, run serially from the repository root and use fresh output folders to preserve these receipts:

```powershell
node reports/machinelab-power-lab-2026-10-11/run-regressions.cjs reports/machinelab-power-lab-2026-10-11/regression-rerun
node dev-tools/ml_power_lab_qa.cjs reports/machinelab-power-lab-2026-10-11/browser-rerun
```

The focused-test manifest records the exact patterns and execution settings for each separate process. Do not run the browser and unit verification concurrently on a memory-constrained host.

```powershell
$powerReport = 'reports/machinelab-power-lab-2026-10-11'
$powerOut = Join-Path $powerReport 'focused-rerun'
New-Item -ItemType Directory -Force (Join-Path $powerOut 'temp') | Out-Null
$env:TEMP = (Resolve-Path (Join-Path $powerOut 'temp')).Path
$env:TMP = $env:TEMP
$env:NODE_OPTIONS = '--max-old-space-size=512 --max-semi-space-size=8'
$powerManifest = Get-Content (Join-Path $powerReport 'tests-power-manifest.json') -Raw | ConvertFrom-Json
foreach ($powerGroup in $powerManifest.groups) {
  node node_modules/vitest/vitest.mjs run tests/machinelab_power_lab.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000 --testNamePattern $powerGroup.testNamePattern --reporter=json --outputFile (Join-Path $powerOut $powerGroup.receipt)
  if ($LASTEXITCODE -ne 0) { throw "Power group failed: $($powerGroup.name)" }
}
```
