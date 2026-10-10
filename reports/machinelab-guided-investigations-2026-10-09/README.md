# Machine Lab guided investigations — October 9, 2026

Machine Lab now connects predictions, controlled changes, inspection of the 3D model, explanations, and the existing work record. The six investigations appear in the grades 6–8 and 9–12 bands alongside the quantitative comparison tools.

## Learning flow

- Each station offers one controlled change: double the lever effort arm, pulley supporting segments, windlass drum radius, ramp length, wedge thickness, or screw pitch. The load, load travel, and remaining geometry stay fixed.
- Learners predict both effort force and hand travel before testing. The original choices stay beside the measured model results, including when a prediction differs from the result. The activity does not award points.
- Before/after inspection loads the corresponding settings, pauses the model halfway through its stroke, and takes focus to the 3D workshop. A return button brings the learner back to the investigation.
- Manual changes suspend an untested investigation until its starting setup is restored. After testing, the recorded pair stays fixed even when the live station changes.
- Saving retains the complete pair and predictions in the station's recorded comparison and focuses its explanation. Replacing an existing record is explicit. Restarting preserves the saved record and explanation.
- The work record includes all valid station records, changed and held settings, force/travel/work measurements, original guided predictions, and the learner's explanation. The same text is included in Copy this record.
- Keyboard focus follows Start, Test, Restore, and Restart. Prediction groups use native fieldsets and pressed buttons; the result region has an accessible name. Existing grade-band, motion, theme, and contrast behavior remains available.

## Validation

All **317 distinct unit tests** passed across the completed final-source files, including 30 new investigation tests. The **108 native Chromium checks** passed with zero captured errors and six screenshots. `validation-summary.json` maps each test file to its receipt. Coverage includes investigation behavior, station views, grade bands, accessibility, paired evidence, work records, and translation-key hygiene. The browser harness uses the real local Machine Lab/THREE renderer and native Chromium input.

The browser scenarios cover all six plans, frozen outcomes, keyboard transitions, model inspection/return focus, manual drift and restoration, saving, restart preservation, explanation entry, and copied record contents. Screenshots cover desktop, 390px prediction controls, 320px results, dark mode, forced colors, and the work record. All six initial captures were visually inspected; four final focus-enabled captures were inspected again. An independent source review identified the transition-focus issue, which was fixed and verified by the additional 34 browser checks.

Syntax and scoped whitespace checks pass. Canonical and desktop source SHA256: `9e1f65dba969849316892b164c0a9c6741894e4fd90f2418dbb2678718e21799`.

Reproduce from the repository root in PowerShell:

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-guided-investigations-2026-10-09/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_views.test.js tests/machinelab_a11y.test.js tests/machinelab_grade_bands.test.js tests/machinelab_work_record.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_guided_investigation.test.js --maxWorkers=1 --pool=forks --testTimeout=30000 --reporter=dot --reporter=json --outputFile.json=reports/machinelab-guided-investigations-2026-10-09/all-tests-final.json
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_guided_investigation_qa.cjs
```

## Diagnostics and limits

- The first complete regression run found an obsolete expectation for the word “identical” in the work ledger. `check-baseline.cjs` and `baseline-check.json` reproduce its absence on the prior commit `75bbb4026`. The existing grade-band test now checks `data-ml-work-equal="true"`, the actual equal-work state, while retaining its input/output and younger-band assertions. `regression-initial.json` preserves the original result.
- A subsequent run passed that assertion but exceeded the default five-second timeout in an existing pulley-arrow rendering test during host contention. `regression-timeout.json` preserves that result. A final-source run with a 30-second timeout completed 248 assertions across four files, but three workers failed to start; `all-tests-final.json` retains that incomplete-run receipt. Those three files are retried together with one reusable worker and recorded separately in `recovered-tests-final.json`. The incomplete run is not counted as a successful whole-suite run.
- Early Windows attempts encountered temporary-cache permission failures, a runner attempt with zero executed tests, native memory exhaustion, tool-session resets, and locked files. These attempts are not counted as passes. Completed serial checks and atomic mirror writes provide the final evidence.
- Existing React key warnings in the older Siege/Compare views were observed in regression output. The new guided browser scenarios capture no such warnings.
- Browser checks inspect the copy payload through a stubbed clipboard transport; they do not verify the operating-system clipboard. No physical screen-reader session, full application build, deployment, or remote service evaluation is claimed.

Only the Machine Lab source and desktop mirror, focused tests, browser harness, and this report's evidence belong to this change. The shared handoff is updated locally; unrelated workspace/index changes are preserved. No deployment.
