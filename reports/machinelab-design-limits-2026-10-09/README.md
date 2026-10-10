# Machine Lab design limits — October 9–10, 2026

The Machine Shop now offers an optional **Design within limits** challenge in the quantitative grade bands. Learners set a maximum effort force and maximum accumulated hand travel for the current task. The panel shows whether the current setup meets both limits, derives the permitted mechanical advantage interval, and compares the force × travel budget with the task's work.

A force/travel budget smaller than the task work is impossible even in the ideal model. When the budget is sufficient, the station still needs a legal geometry setting. The panel searches the actual increments of one control: lever effort arm, pulley supporting segments, windlass handle radius, ramp length, wedge length, or screw pitch. It proposes the nearest available value that meets both limits while holding the load, load movement, and other geometry constant. It distinguishes a missing legal increment from an impossible energy budget, including whole-number pulley strands.

Applying a suggestion deliberately changes that single setting, pauses the demonstration halfway through its stroke, clears obsolete proof feedback, and moves keyboard focus to the changed slider. Saved setups, comparison records, explanations and original investigation predictions are preserved. Existing guided-investigation recovery handles a changed starting setup. Stale Apply callbacks reject changes when the task, geometry, limits, or selected station have changed.

Limits are kept separately for each station. Blank, invalid and out-of-range values show linked input guidance rather than numeric claims. Current and suggested force/travel results identify each limit separately. The panel explicitly describes total hand-path distance, including repeated turns, and the ideal model's strength/size limitations. It begins as a closed disclosure beside the existing investigation and readout.

## Validation

All **371 distinct tests** pass across eight relevant files, including 45 new design-limit cases. `validation-summary.json` maps each file to its completed receipt. `tests-first.json` covers the numerical model, guided investigations, paired evidence and translation hygiene; `tests-final.json` includes the final design tests, all view/grade renderings and accessibility checks. Repeated tests are counted once.

All **42 native Chromium checks** passed with zero captured errors. The browser harness uses native input, real React/THREE/OrbitControls and the existing local Machine Lab host. Its scenarios cover all six suggestions and one-setting applications, keyboard focus, saved evidence, exact and rounded-looking boundaries, insufficient work budget, no integer pulley solution, blank limits, per-station persistence, guided-investigation drift/restoration, and narrow layouts. All four screenshots were visually inspected: desktop suggestion, 390px no-increment guidance, 320px dark-mode impossible budget, and 320px forced-color suggestion. Receipt and captures are under `browser/`.

Canonical and desktop source SHA256: `292d660a6ac16e23d45743868864805c742add62967db91f777aff04ba6f34c5`. Syntax and scoped whitespace checks pass. Independent source review checked the model assumptions, candidate search, state-preservation and stale Apply guards.

## Reproduce

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-design-limits-2026-10-09/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_design_limits_qa.cjs
```

Windows locked a source write during the per-field validation refinement; atomic source/mirror replacements recovered it and parity was verified afterward. The first browser run completed 37 checks before an incorrect harness assumption read a missing `benchDesignLimits` object after filling inputs with their unchanged defaults. Default values need no state write. The harness now checks the visible retained value; `browser/results-initial.json` preserves the failed attempt. Existing React key warnings from older Siege/Compare views appeared in regression output. No full application build, physical assistive-technology session, performance benchmark, push, or deployment is claimed. The one-control search is intentionally narrower than a full machine design search; real friction, material strength and physical clearances are outside the ideal task check. Unrelated shared work and index entries are preserved.
