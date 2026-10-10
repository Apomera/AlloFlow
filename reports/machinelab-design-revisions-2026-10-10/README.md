# Machine Lab design revision comparison — October 10, 2026

Recorded designs now offer a collapsed **Compare with current setup** panel. It identifies changes to the load, required load movement, geometry, limits and chosen search control. It shows signed changes in effort force, total hand travel and task work. Both setups are assessed against the saved limits; if the current limits differ, their acceptance result is shown separately. Relaxing a constraint therefore cannot masquerade as a physical improvement.

The comparison treats load and movement as separate task conditions: equal work alone does not establish an unchanged task. It describes a controlled geometry comparison only when the task is unchanged and exactly one geometry setting differs. Several geometry changes are identified as combined effects. Changing the chosen search control alone does not count as changing the machine. Tiny nonzero differences are described without displaying a misleading signed zero. Invalid current settings or limits leave the saved record available and replace live comparison claims with input guidance.

Explicit **Replace design record** now preserves one previous snapshot and its explanation beside the new design. The previous copy contains only the validated core fields, so repeated replacements retain exactly the latest pair. The new explanation starts empty; the previous explanation is read-only. Existing record identity checks reject stale replacements and stale note writes. Malformed prior evidence is omitted independently of a valid current record, and rendering never follows nested history.

The station and work record expose **Previous design and revision** through native disclosures. Fixed revision evidence reads Previous → Recorded, while unsaved live comparison reads Saved → Current. Copy, native UTF-8 download and read-aloud include both fixed snapshots, both explanations and the same numerical comparison. Each exported explanation sits beside its own design. Current controls cannot change the recorded pair. The existing paired investigation evidence remains separate.

This uses the existing ideal machine model. Total hand travel includes the accumulated path; the comparison does not model friction, material strength or real clearance. A third replacement drops the oldest design and retains the latest two, as the replacement guidance states.

## Validation

All **489 tests across 13 files** pass, including 34 new revision cases. All **45 native Chromium checks** pass. The four final desktop, 390px phone, 320px dark-phone and 320px forced-colors captures were visually inspected; text wraps within the viewport and keyboard focus remains visible. Focused tests cover all six machines, exact task conditions, physical versus constraint changes, original-limit acceptance, bounded snapshot copies, stale events, malformed imports, fixed exports and explanation ordering. Native checks use real React/THREE, native controls and an actual downloaded text file containing both fixed designs and both explanations.

Canonical and desktop source match SHA256 `54f493af83681c8c7d047b80add5b70547188392c00bb912f517eadefd882f58`. The browser receipt and embedded fixture were verified against that source. JavaScript syntax and scoped whitespace checks pass. An independent read-only review found no blocking product issue. Receipts are `tests-final.json`, `browser/results.json`, `browser/downloaded-record.txt` and `validation-summary.json`.

The initial focused run passed 87 tests before the export-order clarification and three additional semantic cases; it is retained as `tests-design-revisions.json` and is not added to the final total. The first browser attempt stopped at an ambiguous nested summary locator (`browser/results-initial.json`); the selector now uses the direct child summary. The next attempt exposed three assertions with one fixture cause (`browser/results-fixture-recovery.json`): the dark remount had reset the live lever geometry to defaults while the assertions expected the prior setup. Explicitly initializing the fixture geometry corrected those checks; production correctly preserved the actual live geometry throughout. The final run has no errors. Existing React key warnings from siege and compare view rendering remain visible in the passing broader suite.

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-design-revisions-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_design_revisions.test.js tests/machinelab_design_decisions.test.js tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_read_aloud.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_design_revisions_qa.cjs
```

Unrelated shared work and index entries are preserved. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.
