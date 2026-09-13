# Remediation resume and retry follow-up — 12 September 2026

This follow-up reviews failure handling in the automatic retry pass and the saved-batch Resume/Discard controls. The fixes are implemented and the web and desktop modules have been rebuilt.

## Findings fixed

1. **Retry skipped the first pass's interruption policy.** An explicit daily quota during retry could launch more files and produce a completed summary. A cancellation-drain timeout could also advance into a still-owned pipeline. Initial attempts and retries now use one shared failure handler. Daily quotas pause the batch, an active pipeline lock pauses handoff, and temporary rate limits wait before continuing. A drain timeout with no active owner still permits progress.
2. **Stop during the retry cooldown left scheduled work marked failed.** Unattempted automatic retries now return to pending, including after a quota or handoff pause. Their checkpoint remains available for resume. Interrupted handoff no longer clears the checkpoint even when no pending rows remain.
3. **Retry did not finish per-attempt bookkeeping.** Successful retries were missing from the outcome event stream, so run history could retain only the initial failure. Extraction metadata was also left behind between retries. Both passes now publish outcomes and clear their own extraction metadata. The active retry row displays processing while it runs.
4. **Saved-batch actions could overlap or dismiss ongoing work.** Resume and Discard now share the existing synchronous batch-action guard. File browsing, drag/drop intake, desktop folder selection and modal dismissal respect that guard. A failed resume preserves its checkpoint and original settings. Delayed actions check the document epoch and checkpoint identity before updating the saved-batch banner, so they cannot clear a replacement banner or display a stale error.

## Code and tests

- [Batch retry policy, outcomes and cleanup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx)
- [Saved-batch actions and intake guards](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_pdf_audit_source.jsx)
- [Startup, retry and saved-action regression tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/remediation_retry_startup.test.js)
- [Browser modal and saved-batch regressions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/remediation_continuity.spec.ts)

Six of seven new retry-policy cases failed before the fixes; the already-passing case confirmed that a drain timeout with no active owner should continue. The test set also covers same-tick Resume/Discard exclusion, failed resume retention, stale responses, checkpoint identity and saved settings.

## Validation results

- **459 maintained unit tests passed.** [Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/validation/unit.json)
- **58 supplemental tests passed.** [Supplemental results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/supplemental.json)
- **All 13 compiled-modal Chromium tests passed**, including the new saved-batch Resume/Discard checks.
- Pipeline integrity, scoped whitespace checks and web/desktop module parity passed. [Build checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/build-checks.json)

The broad Chromium run recorded **217 passed, one failed and one not run**. Its failure was a separate tagged-PDF renderer subprocess. An isolated run of that acceptance suite then hit a different 2500 ms browser locator-evaluation timeout; the locator had resolved to the visible skip link. Both original PDF cases subsequently passed when selected directly, using the same stored fixture manifest.

**This was not a clean full-suite pass.** The precise cause of the intermittent subprocess/browser failures was not established. The failures are retained in [the initial browser report](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/validation/browser.json), [the isolated-suite report](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/pdf-recheck.json) and [the successful direct PDF checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/pdf-targeted.json). [Final verification record](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-resume-review-2026-09-12/final-verification.json)

## Limits

Validation uses local document fixtures, real Chromium rendering and controlled provider/storage responses. It does not make paid AI calls or establish live-provider behavior for every model and document. No deployment or commit was performed.
