# Machine Lab: read the limits — October 10, 2026

The optional **Read the limits** disclosure explains the current design result with two demand/limit comparisons. Each shows the actual effort or total hand travel, its entered limit, the uncapped percentage used, and the amount below or over the limit. Current and limit bars share a scale within each pair; percentages provide the comparison across force and travel. Visible text carries every result, while the bars are decorative and use solid/dashed outlines as well as color.

The explanation shows the ideal calculations using the current load, movement and mechanical advantage. It connects excessive force with increasing mechanical advantage, excessive hand travel with decreasing mechanical advantage, and insufficient work budget with changing the task or limits. A separate message distinguishes a theoretical mechanical-advantage interval from the chosen slider's actual available increments.

Margin labels use the same acceptance tolerance as the existing design result. Exact equality reads **At the limit**; accepted differences within calculation tolerance receive that explicit explanation. Other nonzero differences below 0.001 keep a **<0.001** label instead of being rounded to zero. Very small positive percentages receive the same treatment, and large percentages are never capped. Formulas and visible values are identified as rounded.

This is derived information, with no new persisted state. Opening, closing or reading it does not change settings, limits, predictions, saved designs and revisions, explanations, investigation evidence or Undo. It updates when the learner changes controls or applies/undoes a design action, and hides during invalid drafts or invalid physical setups. It is available at the existing grades 6–8 and 9–12 design levels.

## Validation

Final counts, exact source/mirror parity and evidence paths are recorded in `validation-summary.json`. Independent review found no blocking math, state or accessibility issue. Focused tests use independent force/travel formulas, precision boundaries, extreme percentages, discrete-setting cases and state preservation. Native Chromium uses the real React/THREE workshop, keyboard controls and a downloaded work record, with writable local temporary folders and a fresh browser per independent scenario.

All **884 assertions across 18 files** pass in the complete coverage receipts. `tests-final.json` is explicitly an aggregate of 19 independent process receipts: 17 complete files and two complementary view-suite filters covering 82 and 110 distinct cases. Filtered cases are counted only in the process that actually ran them. Parameterized cases with identical display names are distinguished by their matching inventory position.

Earlier incomplete runs are retained and excluded from the final count. The initial combined process exited unexpectedly after 692 passed assertions (`tests-regression-initial.json`); its reporter's `success` flag does not establish completion. A subsequent single-file view run reached the configured 512 MiB JavaScript heap limit after 180/192 cases (`tests-views-memory-initial.json`). Splitting that unchanged suite into two fresh processes resolved this. Shell sessions also became unavailable during recovery, including a second-filter startup that produced no test results (`tests-views-filter-initial.json`); the complete final receipts and available process-exit records establish the recovered coverage. Existing React key warnings in siege/compare rendering remain outside this change.

All 64 focused tests pass. The initial 63/64 receipt is preserved as `tests-focused-initial.json`: one off-grid fixture incorrectly used a fractional pulley strand count, which the existing model correctly rejects. Replacing it with a valid 2.05 m lever-arm fixture verifies the intended between-increment case. No production correction was needed for that failure; focused checks are included in the final suite rather than counted twice.

The final native run passes **150 checks across 13 fresh Chromium scenarios**, with no browser errors. It exercises all six ideal machines, keyboard geometry adjustment, exact/tolerance/over-limit states, unavailable slider increments, lower-grade and invalid-setup gates, Apply/Undo and a real text-record download. Source and public mirror share SHA-256 `061def243e9860912174c7af5e003f80fd0dce10b9e656c3ac2b301be905ccef`; the generated browser harness embeds that exact source.

The four captured layouts were visually inspected: desktop comparisons, phone force guidance, forced-color discrete-setting guidance, and dark phone extreme screw travel. All remain readable without clipping. Keyboard focus stays visible, solid/dashed bar outlines remain distinguishable in forced colors, and extreme percentages remain explicit in the visible text. Screenshots are in `browser/`.

The initial browser receipt (`browser/results-initial.json`) retains five comparison-bar failures caused by Chromium rounding serialized CSS percentages. The harness now permits 0.0001 percentage points for those decorative CSS widths, independently of the unchanged `1e-8` relative tolerance for numeric physics, percentages and signed margins. No production change was needed. Initial screenshot hashes are retained alongside the final captures.

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-limit-explanation-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
$env:NODE_OPTIONS = '--max-old-space-size=512'
$machineSuites = @('limit_explanation','task_capacity','design_undo','task_trials',
  'design_tradeoffs','design_revisions','design_decisions','design_limits',
  'bench_math','paired_evidence','guided_investigation','record_review',
  'work_record','read_aloud','i18n_hygiene','grade_bands','a11y')
foreach ($machineSuite in $machineSuites) {
  node node_modules/vitest/vitest.mjs run "tests/machinelab_$machineSuite.test.js" --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
  if ($LASTEXITCODE -ne 0) { throw "Failed: $machineSuite" }
}
$machineViewGroup = 'Machine Lab: (every view|the |lever observation|force and distance|motion inspection|focus mechanism)'
foreach ($machineFilter in @(('^'+$machineViewGroup), ('^(?!'+$machineViewGroup+')'))) {
  node node_modules/vitest/vitest.mjs run tests/machinelab_views.test.js --testNamePattern $machineFilter --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
  if ($LASTEXITCODE -ne 0) { throw 'Failed: view group' }
}
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_limit_explanation_qa.cjs
```

The ideal model does not assess friction, material strength or physical machine size. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed. Shared work and index entries are preserved.
