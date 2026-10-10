# Machine Lab task capacity — October 10, 2026

**Find a task that fits** extends the existing **Test a changed task** disclosure with two independent searches: the largest available load and the largest available load movement that meet both entered limits. Each search holds the machine geometry, the other task condition and the limits fixed. Previews show current → proposed effort, total hand travel and work, and remain available when the current task has an impossible work budget.

The search checks actual slider increments with the same full-precision ideal-model acceptance check used elsewhere. Display rounding never selects a candidate. A valid imported current value between increments can be compared with an available proposed value. An already-current candidate has a disabled action and creates no new undo checkpoint.

Each result explains its boundary. A smaller load cannot fix excessive hand travel from the held movement; shorter movement cannot fix excessive effort from the held load. These blockers are distinguished from a minimum setting that still fails. A candidate below the slider maximum identifies the next failing increment and its limiting quantity. A candidate at the maximum explicitly identifies the tool's range boundary; it makes no claim about physical machine strength.

Applying a candidate changes only its named task condition through the existing guarded Apply path. It pauses workshop motion halfway, moves keyboard focus to that task control and creates the usual one-step Undo checkpoint. Newer physical settings, constraints, search choices and station/view navigation reject stale callbacks. Current saved designs and revisions, explanations, reference setups and investigation evidence remain intact. Recording a new design remains a separate deliberate action.

## Validation

All **820 tests across 17 files pass**, including **109 focused capacity tests**, on the first attempt. The focused tests are included in the final suite, not counted twice. They check independent ideal-machine formulas and maximality for all six stations and both task conditions, precision boundaries, impossible tasks, unavailable/current actions, state preservation and Apply/Undo. Independent read-only review found no blocking correctness, accessibility or state issue.

All **103 final native Chromium checks pass with zero errors**, using real React, THREE and the workshop canvas, with one fresh browser per independent scenario and all browser errors retained. Both task conditions use keyboard Apply/Undo at all six stations. Further checks cover held/minimum/range boundaries, reduced tasks, invalid drafts, off-grid originals, saved design revisions, investigation evidence and the actual downloaded text record. Four final desktop/phone/dark/forced-color screenshots were visually inspected for readable wrapping, fitted content and visible keyboard focus.

Canonical/public runtime copies and the source embedded in the native harness match SHA256 `c26e949c05e2341766a042a89c24b0a0ab87e5155359e672a1bcb84d6c2597c6`. Source/harness syntax and scoped whitespace checks pass. See `validation-summary.json` for exact counts and evidence paths. Existing React key warnings in siege/compare rendering do not fail the regression suite.

The first native run completed 100 checks and four captures without page/console errors, then reported a canceled text download. It is preserved as `browser/results-initial.json`, not counted as a passing run. The harness now gives Chromium explicit writable temporary folders, ensures its download directory exists before clicking, and records browser download-failure diagnostics. The complete rerun passed, including the 2,608-byte downloaded record with both fixed designs and their explanations. Production source was unchanged during this export recovery.

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-task-capacity-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_task_capacity.test.js tests/machinelab_design_undo.test.js tests/machinelab_task_trials.test.js tests/machinelab_design_tradeoffs.test.js tests/machinelab_design_revisions.test.js tests/machinelab_design_decisions.test.js tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_read_aloud.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_task_capacity_qa.cjs
```

Shared work and index entries are preserved. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.
