# Remediation follow-up fixes

Implements all five recommendations from [the opportunity review](../document-remediation-opportunities-2026-09-19/README.md).

- Rendered selected-option checks use the browser's effective nonempty label or text fallback. Harmful changes behind empty labels fail, equivalent markup passes, and export acceptance receives the same result. [Native and export evidence](rendered/README.md).
- The strict gate preserves textarea hard-wrapping submission behavior and direction companion fields. Actual native FormData guides equivalence; inert attributes and harmless layout changes remain allowed. [Form evidence](forms/README.md).
- Three native crop-control tests moved to managed Playwright page fixtures; 26 DOM tests remain in Vitest. All existing native assertions remain. [Migration evidence](crop/README.md).
- Validation summaries record each phase's state, process exit, report-read status, collected assertion counts, missing suites and available failures even after an unsuccessful process exit. Console diagnostics go to unit.log and browser.log, retaining worker/global failures omitted by JSON reporters. Unknown exits, incomplete collections, misleading success fields, malformed/missing reports, skips and retries remain failures. No successful aggregate is published on failure.
- Summary updates are published through same-directory temporary files and rename. The suite manifest includes the migrated browser tests. [Runner regression evidence](runner-final.json) and [command documentation](../../docs/remediation-validation.md).

The final shared run is recorded under [validation/summary.json](validation/summary.json), with source/input hashes and unit/browser reports. Refer to its actual status before treating the run as complete. Diagnostic failures and pre-fix evidence remain in their original files.

No deployment, live-model evaluation, GitHub CI run or human screen-reader acceptance was performed in this session.

## Complete regression evidence

**All 1,074 tests passed: 747 unit/integration checks across 35 suites and 327 Chromium checks across 19 suites, with no missing suites, skips or retries.** This includes 112 new regression checks; three existing browser tests were migrated without removing assertions. Both phases exited successfully.

The shared command retained failed status because Git HEAD changed from 3c8066309e6ad3d309b34380511201e63f319537 to da6432c090adad36ae5880e9ff29656cdb2fbb15 during the run. The intervening commits concern Strengths Interview, Dino Lab and the automobile workshop. Every declared input hash and tool version remained unchanged. This is complete passing test evidence, but not a revision-stable successful command result.

The [reviewed summary](reviewed-summary.json) and [finalizer](finalize.cjs) recheck current file hashes, phase process exits and reports, original form examples and shipping-module equality. The finalizer accepts a revision-only failure for evidence review and records review-required; it does not change the original failed guard result or relax production validation.
