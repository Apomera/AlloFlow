# Machine Lab design decisions — October 10, 2026

The **Design within limits** challenge now lets learners choose the geometry setting to vary. Each station offers its geometry controls while keeping the load and required load movement fixed. Choosing a control leaves the live machine unchanged. The search enumerates actual slider increments, rejects invalid geometry, and reports the count and available values even when the current setup already meets the limits. When a setup misses, Apply still changes only the chosen control to the nearest available solution.

Learners can explicitly record either a successful design or a failed trial. Each station's design record keeps a complete numeric settings snapshot, force and total hand-travel constraints, chosen geometry control and a bounded explanation. The saved outcome is recomputed from those fixed values; later live settings and constraint drafts cannot change it. Replacement is explicitly labeled and starts a fresh explanation. Comparison evidence, saved reference settings and original guided-investigation predictions remain independent.

Saved designs appear beside comparison evidence in the work record. Explanations can be edited there or at the station. Review design at station preserves live geometry, pauses the demonstration, opens the design disclosure and focuses the saved explanation. Copy, native UTF-8 text download and read-aloud use the same assembled record. Imported malformed records are omitted; cached outcome flags are never trusted. Stale Apply/Save callbacks reject changed task, geometry, constraints, control or record state, and rejected actions leave keyboard focus alone. Note editors reject replacement records while supporting successive edits to the same snapshot.

These remain ideal force/travel checks. Total hand travel accumulates along the hand path, including repeated turns; it does not measure arm reach, physical clearance, friction or material strength. The 3D demonstration uses its existing schematic stroke. The search varies one chosen geometry control while others stay fixed, so a solution that requires several geometry changes may remain undiscovered.

## Validation

All **455 distinct tests** pass across twelve files in `tests-final.json`, including **56 new design-decision tests**. The standalone new-suite receipt is `tests-design-decisions.json`; those cases are counted once. Tests cover all eleven geometry choices, exact legal increments, honest failed trials, fixed records, replacement and stale callback guards, malformed imports, bounded notes, exported results and station review. Connected-DOM tests confirm that accepted actions move focus and rejected stale callbacks leave it alone. Existing math, design limits, comparison evidence, investigations, work records, read-aloud, translation hygiene, grade bands, views and accessibility also pass.

All **48 native Chromium checks** pass with zero captured errors. The browser harness uses real React/THREE and native controls and verifies an actual downloaded text file. It covers all six stations' geometry choices and one-setting applications, per-station selection, keyboard focus, failed-trial recording and explicit replacement, preserved comparison/prediction evidence, editing in both note views, fixed records after live changes, station review, and UTF-8 download contents. Four final captures were visually inspected: desktop record, 390px light design panel, 320px dark design panel and 320px forced-color work record. `browser/results-initial.json` preserves the passing run before the focus hardening; `browser/results.json` and the four images were regenerated from the final source and are the counted browser results.

Canonical and desktop source SHA256: `e18f56eb161d6dbd92e8836d491b7eeed7a7dec08597a19d66fe750b02094e2c`. Source and harness syntax, scoped whitespace and independent source review pass. `validation-summary.json` maps the receipts and per-file counts. The combined render run emitted the existing React list-key warnings in Siege/Compare views; it had no test failures.

Reproduction:

```powershell
$machineTemp = Join-Path (Get-Location) 'reports/machinelab-design-decisions-2026-10-10/test-temp'
New-Item -ItemType Directory -Force -Path $machineTemp | Out-Null
$env:TEMP = $machineTemp
$env:TMP = $machineTemp
node node_modules/vitest/vitest.mjs run tests/machinelab_design_decisions.test.js tests/machinelab_design_limits.test.js tests/machinelab_bench_math.test.js tests/machinelab_paired_evidence.test.js tests/machinelab_guided_investigation.test.js tests/machinelab_record_review.test.js tests/machinelab_work_record.test.js tests/machinelab_read_aloud.test.js tests/machinelab_i18n_hygiene.test.js tests/machinelab_views.test.js tests/machinelab_grade_bands.test.js tests/machinelab_a11y.test.js --maxWorkers=1 --pool=forks --no-isolate --testTimeout=30000
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/cabba/AppData/Local/ms-playwright'
node dev-tools/ml_design_decisions_qa.cjs
```

Unrelated shared work and index entries are preserved. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.
