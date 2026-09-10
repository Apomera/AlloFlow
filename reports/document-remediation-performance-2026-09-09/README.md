# Acceptance performance and automated calibration

The strict acceptance gate now indexes native label associations and form owners once per document. It still uses `label.control`, preserving the DOM's rules for explicit and implicit labels, duplicate IDs, hidden controls, and invalid targets. The indexes are local to one comparison and are rebuilt for every document; there is no cross-document cache or change to the preservation policy.

## Profile and comparison

The pre-change CPU profile identified repeated live label-list updates and form-control scans as the main hot path. A fresh 400-block run took 2.1 seconds, substantially below the prior 44.6-second observation. That difference demonstrates why the older result cannot be treated as stable production latency.

The comparison retains the pre-change acceptance functions and source hash. Both versions run in the same process/page with alternating order and warmup before measurement. All inputs are synthetic mixed-content documents; no source documents are transmitted.

| Chromium input | Previous median | Optimized median | Observation |
| --- | --- | --- | --- |
| 10 blocks / 3,166 bytes | 9.6 ms | 9.7 ms | Essentially unchanged |
| 100 blocks / 31,336 bytes | 58.4 ms | 51.0 ms | About 13% lower |
| 400 blocks / 125,236 bytes | 257.4 ms | 197.8 ms | About 23% lower |

The large jsdom case improved from 4,447 ms to 1,326 ms in the paired run. Small and medium jsdom medians were worse in that run, and samples varied with host load. The Chromium measurements provide the more relevant evidence for the browser pipeline. These are acceptance-function timings, not end-to-end remediation, model latency, or memory benchmarks.

Evidence: [CPU profile summary](profile-summary.json), [raw CPU profile](baseline.cpuprofile), [paired jsdom timings](paired-timing.json), [Chromium decisions and timings](browser-comparison.json), [pre-change source identity](baseline-source.json).

## Correctness and MCP evidence

- The new native-association tests compare indexed results with native `control.labels` and `control.form` on fourteen edge-case fixtures, check index rebuilding after edits, and exercise rejected label reassignment and accepted ID renaming through the real source gate.
- All 17 adversarial Chromium cases returned identical before/after decisions and the expected rejection reason.
- The [consolidated regression record](validation-summary.json) contains 147 passing tests across 9 files, including fidelity, source associations, review metadata, stale section ownership, and build parity. The earlier [source-only run](source-tests.json) passed all 105 tests. The combined CLI later exited 1 despite reporting 130 passes and omitted the new 17-test association file; the cause was not established. That entire file passed an [isolated rerun](association-retest.json) with exit 0 and [full diagnostics](association-retest.log). No application changes occurred between these runs. The consolidated count uses the latest result for each file and is not a claim of one clean combined invocation.
- The [actual local MCP trial](mcp-calibration/benchmark-report.json) passed with 11 scripted model calls and no implementation drift. The cold-process trial took 77.3 seconds. It exercised the browser, remediation, tagged artifact, verification binding, and active-content checks; it does not measure live-model accuracy or prove human usability.
- All 13 [synthetic calibration cases](synthetic-calibration.json) matched their expected policy outcomes. These are separate from the MCP integration fixture, and they are not human observations.
- The [human calibration status](human-calibration-status.json) remains empty, with human metrics unavailable. No observations or reviewer findings were invented or imported.
- The shipping pipeline module was rebuilt and its desktop public copy matched exactly: [bundle verification](bundle-verification.json). All 71 staged runner dependencies verified: [packaging log](runner-check.log).

No deployment, live-provider call, score-threshold tuning, or human acceptance was performed. The next performance measurements should use representative consented documents and the complete pipeline, including model calls, retries, exports, and reviewer effort. Human sessions can use the [existing validation handoff](../../docs/document-remediation-fidelity-validation.md).

## Reproduce

From the repository root:

```powershell
node reports/document-remediation-performance-2026-09-09/profile.cjs
node reports/document-remediation-performance-2026-09-09/browser-check.cjs
node dev-tools/evaluate_pdf_calibration.cjs --synthetic
```

The scripts compare current source with the saved baseline. Preserve copies of the timing reports before rerunning; the `--capture` mode refuses to overwrite the saved baseline. The MCP benchmark configuration is recorded in `mcp-calibration/benchmark-plan.json`; executed benchmarks require a fresh output directory.
