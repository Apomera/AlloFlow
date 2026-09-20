# Validation setup and calibration fixes

- The blocking remediation CI job now installs the nested React 18 and ReactDOM 18 dependencies before executing validation. The local setup guide includes that same prerequisite; the existing missing-input preflight remains enforced.
- `verify:mcp-calibration` now uses a maintained JSON selection and a runner that validates every selected path, requires passing results from every selected suite, rejects missing/invalid reports and failed or unknown exits, and runs both unit/protocol and native browser checks. The two migrated browser suites restore nine focus/footnote checks and three static crop-control checks.
- Calibration uses one threaded Vitest worker and one Chromium worker, with retries disabled and `only` tests forbidden. JSON reports, console logs, browser artifacts and an atomic running/passed/failed summary are retained. Calibration summaries describe runner results; the shared remediation command separately verifies declared input identity.

## Verification

- [Focused contract run](validation-contract.json): 18 tests passed, including the CI bootstrap ordering and the new calibration runner's missing-path, omitted-suite, skipped-result, retry, malformed/missing-report, stale-evidence, failed/unknown/signaled-exit and success controls.
- [Final public calibration command](mcp-calibration-final/summary.json): **236 tests passed**: 224 unit/protocol assertions across 21 suites and all 12 native Chromium checks across two suites. Both runner processes exited 0; no skips or retries. Command: `npm run verify:mcp-calibration -- --report-dir reports/document-remediation-next-fixes-2026-09-20/mcp-calibration-final`.
- [Fresh nested harness installation](ci-bootstrap/results.json): the exact CI React installation command succeeded in a fresh minimal private package, installed React and ReactDOM 18.3.1, and produced both required UMD files. Those files rendered a button together in JSDOM. [Installation log](ci-bootstrap/install.log) and [runtime check](ci-bootstrap/verify.cjs). This is an isolated clean harness installation, not a full clean-checkout dependency installation or an observed GitHub run.
- `git diff --check` passed for the changed existing files; the new runner passed Node's syntax check.

## Retained failed attempt

[The first calibration run](mcp-calibration/summary.json) remains failed: 211 assertions passed, but incidental CRLF conversion during a concurrent source edit broke a multiline source-test boundary and a Vitest fork worker failed to start. The source edit owner restored the repository-required LF endings, and calibration adopted the threaded pool used by the shared remediation validator. No test assertion was relaxed: the temporary reader normalization was removed, and the final successful public command ran the original placeholder test. Browser execution correctly remained unstarted after that unit failure.
