# Document remediation quality and performance benchmark

Entry point: `node dev-tools/benchmark_document_remediation.cjs`.

The default mode only writes/prints a plan. Execution is serial, bounded by trial count, each subprocess deadline, and an overall run deadline. Existing evidence directories must be empty. No deployment is involved.

```powershell
# Inspect selected cases and versions; no remediation or provider calls.
node dev-tools/benchmark_document_remediation.cjs --cases education-reading,scripted-pipeline --trials 2

# Repeat the mixed education portable fixtures locally.
node dev-tools/benchmark_document_remediation.cjs --mode local --cases education-worksheet,education-reading,education-table,education-scan,education-form,education-figure --trials 2 --out-dir reports/education-benchmark

# Real Chromium and pipeline, with the MCP's built-in scripted model only.
node dev-tools/benchmark_document_remediation.cjs --mode local --cases scripted-pipeline --trials 2 --timeout-ms 180000 --budget-ms 400000 --out-dir reports/scripted-pipeline-benchmark
```

Local children cannot load MCP key files. API key/token variables and remote model/validator overrides are removed. Portable trials call the canonical packaged Python engine; PDF generation and veraPDF are disabled in this structural adapter. The scripted adapter calls `remediation_selftest` through the existing MCP protocol utility and uses its fixed built-in fixture. It does not substitute a selected private document into that fixture.

The mixed education corpus covers a worksheet, reading passage, table, simulated scan, blocked form, and meaningful figure. It reuses `benchmark_alloflow_portable.cjs` source/plan generators and the repository water-cycle PDF. `remediation_benchmark_corpus.cjs` exposes `fixtureDefinitions()` and `materializeFixture(id, directory)` for other local acceptance tools. These fixtures are synthetic structural examples, not independently reviewed model-quality labels.

## Manifest

The default is `tests/fixtures/remediation_benchmark/manifest.json`, schema version 1. Paths in a custom manifest are relative to that manifest. Each case has a unique safe `id`, `documentKind`, `backend`, and optional `expected` outcome. Portable cases specify either a built-in `fixture` or both `sourcePath` and `planPath`. The scriptable MCP selftest accepts no source/plan override. Live MCP cases require `sourcePath`.

```json
{
  "schemaVersion": 1,
  "corpusId": "reviewed-education-sample-v1",
  "cases": [{
    "id": "reading-01",
    "documentKind": "reading",
    "backend": "mcp-headless",
    "sourcePath": "licensed/reading-01.pdf",
    "options": { "targetScore": 95, "fixPasses": 1, "taggedPdf": true, "validateUa": true, "pageRange": [1, 3] }
  }]
}
```

Supported backends: `portable`, `mcp-selftest`, `mcp-headless`. `expected` can contain `exitCode`, `readiness`, and `checksPassed`. The blocked-form fixture deliberately expects exit 3 and `blocked`. An expected safety block is a passing contract test; it is never reported as preserved content or a ready artifact. Optional `calibrationCaseId` is a reference only: it does not import a human review verdict.

## Explicit live execution

```powershell
node dev-tools/benchmark_document_remediation.cjs --mode live --manifest my-corpus.json --trials 1 --timeout-ms 180000 --budget-ms 400000 --out-dir reports/live-education-sample
```

Live mode sends the selected documents through the existing local MCP provider configuration (`GEMINI_API_KEY`/existing key files, `ALLOFLOW_MCP_GEMINI_MODEL`, fallback/provider settings). It must be chosen explicitly; local mode rejects live cases. Live runs allow at most 6 total trials. Fix passes are capped at 2, polish and auto-continue are disabled, selected page ranges contain at most 10 pages, and source/plan files are capped at 25 MiB. This controls work and time, not dollar spending; call/token prices and a hard provider spending limit are not supplied by the benchmark. No live run was used for the harness smoke.

All modes permit at most 8 selected cases, 10 repeats, and 40 total trials (live: 6). Trial deadlines range from 1 second to 10 minutes; the overall deadline is at most 1 hour. Timeout/cancellation terminates only the trial's subprocess tree before moving on. An interrupted run keeps completed trial evidence.

## Evidence and interpretation

Outputs are `benchmark-plan.json`, `benchmark-report.json`, and `benchmark-report.md`. Each trial has raw `result.json`, `stdout.log`, `stderr.log`, execution metadata, and available artifact links. Raw local evidence may include document content. Reports retain source/repair-plan hashes, prompt source hash, implementation file hashes, Node/platform versions, Git commit, and configured model/fallback identifiers. The per-trial implementation hash is checked again after execution; changed code or source invalidates that trial. Different implementation/model versions are aggregated separately. A source or plan that changes or becomes unreadable during execution invalidates that trial, preserves its raw evidence, and stops further trials. A missing later input stops before launching it and preserves earlier trial rows. The JSON report records bounded input reason codes and interruption details; the Markdown report shows the interruption.

Aggregates include both all-trial timing and completed-trial timing. Median uses the average middle pair for even samples; p95 is the nearest-rank percentile. Timeouts remain in all-trial timing. A p95 from 2–3 trials is effectively a worst observation, not a production latency claim.

Quality columns distinguish canonical readiness, preservation for the tested scope, and unavailable evidence. Portable recall compares plan source text to plan content; it is not independent source-PDF fidelity proof. Scripted selftest success does not claim live-model quality or independently validated distribution readiness. Model calls, retries, and rejected candidates use exposed MCP metrics; missing metrics stay `null` with missing-trial counts. Configured model names do not prove which fallback actually served each call.

The independent calibration work lives in `tests/fixtures/pdf_calibration/manifest.json` and `synthetic_cases.json`. Its policy snapshots are separate from runnable document inputs. To add human observations, reference the benchmark artifact, bind the review to its SHA-256, and use the calibration observation schema; do not relabel synthetic expectations as human findings. Calibration imports flush a complete temporary manifest and atomically replace the existing file under a cooperative `.lock`; failed writes retain prior review history. If an import is abruptly killed, verify that no importer is running before removing its stale lock and retrying.

Focused verification:

```powershell
node node_modules/vitest/vitest.mjs run tests/document_remediation_benchmark.test.js --maxWorkers=1 --testTimeout=20000
```