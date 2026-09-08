# Tooling reliability refinement — 2026-09-08

Three demonstrated failure paths are now covered.

- Calibration import previously overwrote its corpus manifest directly. An injected partial write followed by ENOSPC destroyed the previous JSON. It now flushes complete JSON to a unique sibling temporary file and atomically replaces the manifest under a cooperative import lock. Write/rename failures preserve the old bytes; a competing history update is detected before publication; another importer's lock is preserved. A killed importer can leave a stale lock: confirm no importer remains before removing it and retrying.
- A benchmark source or plan disappearing during execution previously threw ENOENT after raw result persistence and before the trial summary. Input checks now return at most two bounded reason records. Changed/unavailable input invalidates the trial and stops subsequent execution while retaining raw output, duration, observed quality, and a failed report row. A later missing input stops before launch while preserving prior rows. No failure is counted as a passing or completed-timing trial.
- Ordinary runner staging twice failed with a Windows/OneDrive UNKNOWN open error writing its generated release contract after staging the dependencies. A local temporary-file/rename probe succeeded. The staging writer now uses complete temporary bytes and atomic replacement; its fault regressions preserve the previous contract on write/rename failure. Ordinary staging and its read-only check both pass without the probe wrapper.

Evidence before fixes: [probe-before.json](probe-before.json), [probe-before.cjs](probe-before.cjs), [initial stage failure](runner-stage-initial-failure.log). The probe used only isolated synthetic artifacts; earlier benchmark and calibration measurements remain untouched.

Validation:

- [Final focused tests](tests-final.json): 28/28 — benchmark 13, calibration import 15. Includes a real hung-subprocess deadline check, write/rename failures, locks/history conflicts, missing source/plan after execution, changed bytes, and later input disappearance before launch.
- [Stage publication tests](runner-publication-tests.log): 4/4, including the actual staging/check roundtrip and packaged dependency equality checks.
- [Staged OCR mapping](runner-stage-ocr-test.log): 1/1.
- [Final actual MCP benchmark](mcp-final/benchmark-report.json): one local scripted trial passed; all 11 MCP checks true; 11 scripted calls; no source or implementation drift. Selftest duration 43,778 ms; subprocess duration 47,772.842 ms. Fixture score moved 85 to 96. This measures scripted integration behavior, not paid live-model accuracy or independent human accessibility quality.
- [Final package and MCP metadata](final-checks.json): 71 staged dependencies; packaged driver loads. Manifest SHA-256 `a48e5ba690d2b90b97706e4f378e2e04f4b249278c7fe63935e0500b7ed6a31d`; runner-build SHA-256 `4c810041bc36c549a05cd3904312e4a27ca760fc7082472937a991a36f0d4d7a`; staged document module SHA-256 `a611e6299e7589c1597604c1d403f5e3d3e218409a832a8d688c5cc5e8ac0496`.
- Scoped `git diff --check` passed. No deployment, provider spending, private-document upload, or commit occurred.

Commands:

```powershell
node node_modules/vitest/vitest.mjs run tests/document_remediation_benchmark.test.js tests/pdf_calibration_ingest.test.js --maxWorkers=1 --testTimeout=20000
node dev-tools/benchmark_document_remediation.cjs --mode local --cases scripted-pipeline --trials 1 --timeout-ms 180000 --budget-ms 210000 --out-dir reports/document-remediation-refinements-2026-09-08/tooling/mcp-final
node services/alloflow-remote-mcp/scripts/stage-runner.cjs
node services/alloflow-remote-mcp/scripts/stage-runner.cjs --check
node --test --test-concurrency=1 services/alloflow-remote-mcp/scripts/test/stage-runner.test.cjs
node --test services/alloflow-remote-mcp/runner/test/staged-ocr-mapping.test.cjs
```

Use a new empty output directory when repeating the benchmark; this recorded evidence directory is intentionally protected against overwrite.
