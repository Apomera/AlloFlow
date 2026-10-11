# Machine Lab: efficiency and calculation practice — October 10, 2026

The optional **Efficiency & calculation lab** extends all six workshop stations at grades 6–8 and 9–12. Learners choose an assumed efficiency from 1–100%, compare the same task with the ideal machine, and practice finding input work, effort force or energy lost. The existing ideal workshop, geometry suggestions and saved designs retain their original meaning; the new comparison explicitly checks modeled effort and unchanged hand travel against the learner's current design limits.

For efficiency fraction η, load F, load movement d and ideal mechanical advantage M, the model calculates:

- Useful work = Fd; input work = Fd/η; energy lost = input work − useful work.
- Modeled effort = F/(Mη); hand travel = Md; actual mechanical advantage = Mη.
- At 100%, the results match the ideal machine and energy loss is zero.

For the default lever, a 400 N load moved 0.5 m needs 200 J of useful work. At 80% efficiency, input work is 250 J, loss is 50 J, and effort is 250 N instead of the ideal 200 N. Efficiency is a chosen constant, not a measured friction coefficient. This model does not calculate starting friction, material strength, self-locking or temperature rise. The geometry and motion demonstration remain ideal.

The relations follow [OpenStax's simple-machine efficiency definition](https://openstax.org/books/physics/pages/9-3-simple-machines). Percentages are converted to fractions before calculating. Invalid percentages or physical setups suppress the modeled results; invalid design-limit drafts suppress only the limit comparison.

## Learning and saved work

Each calculation requires a number and a unit. Blank, negative and nonfinite inputs do not count as answers. A unit error receives different feedback from an arithmetic error. Two optional hints give the relationship and substituted calculation, and a deliberate worked-solution action shows the answer. Numeric checks allow 1% or 0.0005 units, whichever is larger, so three-decimal answers are usable. This practice does not award points or change existing prediction progress.

Practice belongs to the station's geometry, task, efficiency and question. Answers, feedback and hints are shown only when that exact identity matches. Revisiting an identical task can restore its still-valid draft; editing the efficiency or question explicitly starts fresh practice. Viewed solutions stay identified as solutions when the answer is edited. A saved efficiency record keeps the original setup, assumed efficiency, entered answer, hints and completion method, with results recomputed from that fixed snapshot. The same record appears in the work-record view and text download. Existing design records, writing, investigation evidence and Undo are preserved.

The lab and its comparison are collapsed native disclosures. Inputs have explicit labels, feedback uses a polite status region, keyboard focus is visible, and comparison values are available as text. Small-screen, dark and forced-color layouts are covered by native browser verification.

## Verification

Final source hashes, test counts, browser receipts, screenshot checks and any recovered diagnostics are recorded in `validation-summary.json`. Unit expectations use independently calculated physics, state-transition and saved-record checks. Native browser verification uses the real React/THREE workshop, keyboard interactions and an actual downloaded record. Heavy checks run serially with local temporary directories; the large view suite runs in complementary groups to avoid the prior session's memory limit.

All **996 unique cases across 19 files** pass: 884 existing cases and 112 new efficiency cases. `tests-final.json` aggregates 24 fresh-process receipts rather than claiming a single invocation. The new suite uses four disjoint groups (11 physics, 31 comparison, 41 practice and 29 saved-work cases). The saved-work preservation fixture was corrected to use the real investigation/reference maps before that group's first execution; there were no focused-test failures.

The 110-case second view filter initially reached its 512 MiB heap cap after 108 passed cases. Its incomplete receipt is preserved as `regression-19-memory-initial.json` and excluded from coverage, despite the reporter's success flag. The complete view coverage uses three disjoint fresh-process filters: 82 + 74 + 36 = 192. Their process manifests retain patterns, observed exits and source hashes. Existing React key warnings in siege/compare rendering are unchanged. Independent code review found no blocking physics, state, record-validation or accessibility issue.

Native Chromium passed **254 checks in 13 fresh scenarios**, with zero errors and no retries. These cover all six machines at 80% and 100%, phone keyboard practice, wrong units and arithmetic, two hints, forced colors, invalid inputs, geometry changes, Apply/Undo, separate station drafts, grade gates and an actual text download. All four screenshots were visually inspected: [desktop](browser/desktop-efficiency-checked.png), [phone hints](browser/phone-efficiency-hints.png), [forced-color solution](browser/forced-colors-efficiency-solution.png) and [dark phone record](browser/dark-phone-efficiency-record.png). The [downloaded record](browser/downloaded-record.txt) retains the original task, solution-viewed status and separate design explanation after later settings changes.

Canonical/public files match SHA-256 `3e1ff34f4520bb2522cb69416e7f54a82efce2d7fe90b4a2a6e79e7c176371e9`; the native browser page contained that exact source. Generated browser HTML, temporary profiles and duplicate downloads are excluded from the committed report.

No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed. Changes are committed locally with explicit paths, preserving unrelated shared work and index entries.

## Reproduce

Run from the repository root in PowerShell, serially. Use a new output directory so the retained receipts stay unchanged. The process manifests contain the exact disjoint filters; omit the failed original view attempt and include both recovery filters. Each case is counted only in the filter that executed it.

```powershell
$effReport = 'reports/machinelab-efficiency-lab-2026-10-10'
$effOut = Join-Path $effReport 'rerun'
New-Item -ItemType Directory -Force (Join-Path $effOut 'temp') | Out-Null
$env:TEMP = (Resolve-Path (Join-Path $effOut 'temp')).Path
$env:TMP = $env:TEMP
$env:NODE_OPTIONS = '--max-old-space-size=512'
$effRuns = @(Get-Content (Join-Path $effReport 'regression-processes.json') -Raw | ConvertFrom-Json) | Where-Object ExitCode -eq 0
$effRuns += @(Get-Content (Join-Path $effReport 'regression-recovery-processes.json') -Raw | ConvertFrom-Json)
foreach ($effRun in $effRuns) {
  $effSuite = if ($effRun.Suite) { $effRun.Suite } else { 'views' }
  $effArgs = @('run', "tests/machinelab_$effSuite.test.js", '--maxWorkers=1', '--pool=forks', '--no-isolate', '--testTimeout=30000', '--reporter=json', '--outputFile', (Join-Path $effOut $effRun.Receipt))
  if ($effRun.Pattern) { $effArgs += @('--testNamePattern', $effRun.Pattern) }
  node node_modules/vitest/vitest.mjs @effArgs
  if ($LASTEXITCODE -ne 0) { throw "Regression failed: $effSuite" }
}
$effManifest = Get-Content (Join-Path $effReport 'tests-efficiency-manifest.json') -Raw | ConvertFrom-Json
foreach ($effGroup in $effManifest.groups) {
  node node_modules/vitest/vitest.mjs run tests/machinelab_efficiency_lab.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000 --testNamePattern $effGroup.testNamePattern --reporter=json --outputFile (Join-Path $effOut $effGroup.receipt)
  if ($LASTEXITCODE -ne 0) { throw "Efficiency group failed: $($effGroup.name)" }
}
node dev-tools/ml_efficiency_lab_qa.cjs (Join-Path $effOut 'browser')
if ($LASTEXITCODE -ne 0) { throw 'Native browser verification failed' }
```
