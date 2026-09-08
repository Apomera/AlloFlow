# Document remediation enhancement pass

Implemented the approved follow-on improvements using a mixed education corpus. These changes are local; nothing was deployed.

## Changes

- **Actionable preservation review:** readable rejection reasons, pass/section context, acknowledgment with undo, and a button that prepares a targeted Workbench command. Acknowledgments remain separate from human accessibility attestations and never upgrade verification.
- **Workbench evidence parity:** autonomous local fallback retains bounded rejection counts/history through unchanged output, keep-best restoration, and errors. The view handles cumulative results without double-counting callbacks and discards stale evidence through the existing document ownership guard.
- **Stable element references:** a separate, persisted index identifies tables, cells, and images without modifying verified HTML. Fingerprint matching tolerates header/alt improvements and refuses changed or ambiguous structures. Keyboard navigation uses a sandboxed preview and restores temporary focus attributes when focus leaves.
- **Current-policy calibration:** removed obsolete score blending and validator-derived “expert” scores. Thirteen explicitly synthetic policy cases cover worksheets, readings, tables, scans, forms, and figures. Artifact-bound observation/review ingestion and per-layer disagreement/false-ready reporting are ready for independent human observations.
- **Repeatable benchmark:** bounded trials capture source, plan, implementation, and model identity; quality/readiness evidence; rejection/call counts when available; timing distributions; raw outputs; timeouts; and code drift. Default execution is a plan. Local scripted and explicitly selected live-provider adapters are available.
- **Export acceptance tooling:** actual exported HTML/PDF checks observe semantics, tagged reading order, table content, and keyboard behavior. A separate manual screen-reader protocol/template preserves exact artifact hashes and starts every human task as not run.
- **Build reliability:** the simple module builder now uses atomic replacement by default while retaining its injectable writer. The document and view bundles match their desktop public copies exactly.

## Validation

| Scope | Result | Evidence |
| --- | --- | --- |
| Focused unit/integration suites | 159 passed across 12 files; no failures or skips | [Consolidated results](validation-summary.json) |
| Export acceptance in Chromium | 4 tests passed; 61 automated observations across 5 local artifacts | [Automated results](../document-remediation-improvements-2026-09-07/at/automated-results.json), [browser log](../document-remediation-improvements-2026-09-07/at-browser-tests.log) |
| Preservation review in Chromium | 4 tests passed, including focus retention/cleanup, acknowledgment, command preparation, and refused matches | [Final browser log](../document-remediation-improvements-2026-09-07/at-review-browser-tests-final.log) |
| Offline education benchmark | All 6 categories passed; no model calls | [Benchmark evidence](benchmark/validation.md) |
| Scripted MCP and local runner | 11 checks passed with no version drift; 71 staged dependencies verified | [Final checks and hashes](benchmark/after-ui-final.json) |
| Bundle mirrors and host JSX | Matching SHA-256 hashes and successful syntax checks | [Build checks](build-verification.json) |

The 159-test total combines separate focused invocations and counts each file once. Browser tests are listed separately. Component tests use a strict host fixture; the existing state/evidence regressions separately exercise production ownership and proof-preservation contracts.

The benchmark intentionally preserves an initial timeout and a detected mid-trial code change. Focused reruns passed. Browser testing also demonstrated and fixed a native-cell focus regression: immediately removing temporary `tabindex` moved focus to `BODY`. The final tests verify focus remains on the cell and original attributes/styles return on blur.

## Usage and boundaries

- [Review interface and reference contract](../../docs/document-remediation-review.md)
- [Calibration usage and human-review requirements](../../tests/fixtures/pdf_calibration/README.md)
- [Benchmark CLI and live-provider controls](../../docs/document-remediation-benchmark.md)
- [Export acceptance CLI and manual protocol](../../docs/document-export-at-acceptance.md)

The human calibration corpus is empty and reports `humanMetrics: null`. Synthetic policy cases are not independently reviewed documents. The offline corpus and scripted MCP run do not establish live-provider quality, production latency, or cost.

Human screen-reader acceptance has not been performed. The initial export acceptance packet covers exported reading/table documents and a native HTML form fixture; it does not establish acceptance for scans, informative figures, math, multilingual content, or interactive PDF forms.

The element index is a navigation foundation, not a complete canonical document model or fidelity proof. It is created from the current document on first use, has bounded coverage, does not invent page/cell locations for section-level rejection records, and does not implement incremental region audits.

