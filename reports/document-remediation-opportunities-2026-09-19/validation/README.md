# Validation reliability opportunities

This is a read-only review of the current runner and existing option-label validation artifacts. No tests were rerun and no application or test files were changed. [Evidence](evidence.json) records source hashes and extracted diagnostics.

## 1. Move the remaining native Chromium tests into managed Playwright fixtures

In tests/static_crop_cleanup.test.js, lines 27-29 launch Chromium in a file-wide Vitest beforeAll/afterAll. Only the three tests beginning at line 126 use the browser; the other 26 assertions only need the DOM implementation. The retained one-worker diagnostic passed all 29 assertions in this file, but browser.close exceeded the 30-second hook timeout and failed the file. Because the shared runner invokes its complete browser phase only after a successful unit phase (dev-tools/remediation_validation.cjs:89-92), this cleanup failure blocks the broader acceptance checks.

Minimal refinement: keep the 26 DOM/static cases in Vitest; transfer all three browser cases unchanged to a selected tests/e2e/document_static_crop_cleanup.spec.ts suite using Playwright's page fixture; register it in the shared manifest and the manifest-coverage test. Preserve the exact source control/file replacement behaviors and zero-retry policy. Validate both focused suites, then the shared command in a stable checkout. This addresses the observed Chromium teardown failure; it does not establish the cause of the separate worker-startup timeouts.

## 2. Preserve failed-phase diagnostics in the summary

The runner throws on a nonzero child exit at dev-tools/remediation_validation.cjs:70 before lines 90 or 95 can parse the corresponding JSON report. The prior final validation summary therefore has no unit field, even though unit.json records 570 passing assertions across 28 of 35 required files. The runner correctly remains failed, but the summary lacks the seven missing file names, phase completion state, and collected-versus-required coverage. Worse for report consumers, that incomplete raw Vitest artifact has success:true; users must reconstruct why the command nevertheless failed.

Minimal refinement: persist explicit unit/browser phase states and start/finish times; retain the child exit/error independently; on child completion or failure, parse any available artifact into diagnostics (counts, missing suites, hook/global errors), without applying the all-passing summarizer as a prerequisite to recording them. Keep status failed and omit aggregate testsPassed whenever the process or selection is incomplete. Record browser as not-started if the unit phase fails. An atomic summary write would also avoid transient malformed JSON while readers poll. Test a nonzero runner that writes a partial success:true report, a passing-assertion hook failure, a missing/malformed report, and a failure before browser execution.
