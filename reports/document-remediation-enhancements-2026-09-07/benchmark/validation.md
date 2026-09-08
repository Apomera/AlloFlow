# Benchmark enhancement validation

Entry point: dev-tools/benchmark_document_remediation.cjs. Default mode is plan-only. See docs/document-remediation-benchmark.md for manifests and local/live commands.

Focused tests: 9/9 pass with one worker. Covers execution-mode bounds, credential isolation, fixture binding, version-separated median/p95 aggregation, honest missing metrics/readiness, deterministic reports, and real stalled-process cancellation. Evidence: tests.json.

Offline mixed education smoke: six cases repeated twice, 12 completed trials, 10 pass. The first worksheet trial produced correct artifacts but was invalidated by a detected implementation-file change during the trial. The first table trial reached the 30-second deadline. Their second trials passed. The original records and raw evidence are preserved in local-smoke/.

Focused follow-up: worksheet and table, one trial each, 120-second trial limit; 2/2 pass. Evidence: local-followup/benchmark-report.json and raw trial artifacts. Every education case passed at least once. All executed portable trials made zero model calls. No live mode was executed.

Both new CLI/helper files pass node --check. git diff --check passes for the existing portable benchmark export change.

The root final rebuilt MCP smoke can be recorded through the scripted adapter with:

    node dev-tools/benchmark_document_remediation.cjs --mode local --cases scripted-pipeline --trials 1 --timeout-ms 180000 --budget-ms 200000 --out-dir reports/document-remediation-enhancements-2026-09-07/benchmark/scripted-final

Run this after source/build files are final: a mid-trial implementation change deliberately invalidates the measurement. No provider key is needed.

Changed application tooling only: dev-tools/benchmark_document_remediation.cjs, dev-tools/remediation_benchmark_corpus.cjs, tests/document_remediation_benchmark.test.js, tests/fixtures/remediation_benchmark/manifest.json, docs/document-remediation-benchmark.md; existing dev-tools/benchmark_alloflow_portable.cjs now exports its fixture helpers. No production driver or pipeline source edits.

## Final rebuilt pipeline and local package

Executed the scripted-final command after production rebuild: 1/1 benchmark trial passed, all 11 MCP checks true, no mid-trial version drift, 11 scripted model calls, 85 to 96 score, 36.051 seconds inside selftest (41.979 seconds including the cold subprocess/protocol).

Refreshed 71 local runner dependencies. The staging --check command passed, the staged OCR mapping regression passed 1/1, and the staged driver loaded with capsule schema 2. Full hashes and selected file records are in runner-stage-final.json; raw logs are runner-stage-final.log, runner-stage-check-final.log, and runner-staged-test-final.log. Only local generated runner context/release-contract files were refreshed; nothing was deployed.

## Final UI focus follow-up

The benchmark version list now includes view_pdf_audit_source.jsx and view_pdf_audit_module.js. Focused benchmark tests pass 9/9 again. The independent scripted-after-ui trial passes all 11 MCP checks with no version drift; earlier scripted-final evidence remains unchanged. Local staging was refreshed and --check passes for 71 dependencies. Its manifest hash remains unchanged because the full review UI bundle is not a headless runner dependency. Full checks, timings and view hashes are in after-ui-final.json.
