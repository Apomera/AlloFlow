# Remediation pipeline follow-up bug review — 12 September 2026

This pass focused on asynchronous startup, cancellation, retry selection, queue reset, and canonical verification cleanup. Changes are implemented in the source pipeline and modal, with regenerated web and desktop modules.

## Confirmed defects and fixes

1. **Stop was ineffective during batch startup.** The Stop controller was published only after the initial checkpoint write. The controller now belongs to the batch from startup, and a stop during persistence leaves the files queued without starting an audit.
2. **Startup exceptions could strand the modal in a busy state.** A synchronous checkpoint setup failure occurred before the inner cleanup block. The outer batch owner now always releases its processing flags, controller and lock.
3. **An older batch could interfere with its replacement.** A delayed startup could publish an old controller or launch another file after document ownership changed. Ownership checks now cover startup, each file boundary, result publication, telemetry and shared extraction-data cleanup.
4. **Cancellation could cross an asynchronous phase boundary.** A cache read or audit that resolved successfully after Stop could hand off to the next phase. Each handoff now checks cancellation and batch ownership. A successfully completed current file is still retained when Stop prevents the next file from starting.
5. **Canonical re-audit could leak its operation ticket.** Missing, stale or throwing HTML-token capture returned before the cleanup block. Ticket acquisition and those early exits now share the same finally block. Caller-owned tickets remain caller-owned.
6. **Retry actions could select the wrong work or strand failed rows.** The UI used a state update followed by a timer, depending on React committing the queue and the engine being ready. Single-file retry could run other failed files. Retries now pass the full queue snapshot, explicit selected IDs and the batch's saved settings. Readiness or engine-start failure preserves the original failed rows, errors and completed results.
7. **Empty results could count as processed files.** A null or blank document result is now a retryable failure, and cache hits require a nonempty HTML artifact. Successful retries clear obsolete error and interruption markers.
8. **Delayed batch actions could reset newer work.** Retry, start and checkpoint-discard actions now hold a synchronous UI guard. Close, New Batch, Clear All and row removal respect it. A checkpoint discard also checks the document epoch before clearing the queue.
9. **A selected retry could announce full completion with files still pending.** The summary and toast now keep remaining work explicit and resumable. The completion sound is withheld while pending files remain.

## Changed code

- [Batch pipeline and lifecycle](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx)
- [Canonical verification and modal actions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_pdf_audit_source.jsx)
- [Startup and retry regressions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/remediation_retry_startup.test.js)
- [Compiled-modal browser regressions](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/remediation_continuity.spec.ts)

## Regression coverage

The first seven targeted regression cases failed before the fixes. The dedicated startup/retry test file now covers 18 cases, including interrupted startup, stale owners, checkpoint exceptions, empty results, saved settings, exact retry selection, early verification exits and preservation of completed work on Stop.

Chromium tests exercise the real compiled React modal with controlled provider/storage callbacks. They cover delayed retry rejection, missing readiness, guarded reset/close controls, stale checkpoint deletion and existing manual, review, automatic, batch and focused modal behavior. Existing responsive layout and accessibility checks remain in the browser suite.

- **664 maintained tests passed:** 447 unit and 217 Chromium tests. No skipped tests or automatic retries. See [validation summary](validation/summary.json).
- **58 supplemental regression checks passed** across checkpoint durability, audit-to-fix handoff, operation ownership, reentry and timeout behavior. See [focused results](focused-unit.json); its 98 tests include 40 also covered by the maintained suite.
- Pipeline integrity and scoped whitespace checks passed. Generated pipeline and view modules exactly match their desktop copies. See [final checks](final-checks.json).

## Scope and limits

These checks use local fixtures and controlled asynchronous responses. They do not make paid provider calls or claim an end-to-end test against every live AI provider, desktop installation or real document. The changes address reproduced failure paths; they do not establish that the entire pipeline is free of defects.

The prior UI workspace changes remain in place. No deployment or commit was performed in this pass.
