Remediation recovery and usability review — 12 September 2026

Implemented the approved recovery, retry, review, and validation improvements in the web and desktop modules.

**Recovery and continuity**

- Failed files now keep the saved batch alive even when no pending files remain. Restoring a failed-only batch opens its results and errors for review without launching AI, including when the remediation engine is unavailable. Starting a new batch discards the retained checkpoint by its existing identity guard.
- Saved-batch discovery retries one transient read failure and refreshes on readiness changes, focus, online events, mode entry, or an explicit lookup retry. An old lookup cannot replace a newly selected document or queue.
- Storage reads can explicitly report unavailability instead of silently looking like empty storage. This applies to the root record, statuses, and completed result blobs. Legacy callers retain their previous null-on-error behavior.
- The batch remains busy through its final checkpoint write. Persistent recovery status explains saving, saved, storage unavailable, or checkpoint replacement by another tab, with the last successful save time. Checkpoint ownership still controls writes and deletion; UI events do not override it.

**Retry and review**

- Known protected/invalid files, authentication failures, and blocked content avoid automatic repeated attempts. Their original errors remain visible alongside actionable guidance, and an explicit retry remains available after the cause is addressed.
- A daily quota still pauses the current run. After the quota clears, Resume retries the affected file and the pending files while retaining completed results.
- Each processed file has a keyboard-accessible findings disclosure. It shows recorded engine coverage, AI and axe findings, axe manual checks, Equal Access confirmed/potential/manual findings, content-preservation warnings, and readable expert-review explanations. Text is escaped and opening it does not change the active document.
- Preparing, saving, and cooldown phases have distinct workspace labels. The existing Stop, modal ownership, and document-epoch guards remain in force.

**Validation**

**Final validation passed: 494 maintained unit tests and 232 Chromium tests (726 total), with no skipped or retried tests.** The final sources and compiled modules remained unchanged during this run. Pipeline integrity, scoped whitespace checks, and byte-for-byte web/desktop module parity also passed. The updated review screenshots were inspected at 320 px in all three themes.

The earlier full run passed 492 unit tests and 232 Chromium tests before the final quota-resume and finding-format corrections. The two additional regressions failed before those corrections and all 68 tests in their focused suites then passed. These counts overlap and must not be added together.

Real Chromium tests exercise IndexedDB and Web Locks across a reload and two tabs, plus injected read/write failures. They use the production checkpoint and batch runtime with controlled provider responses. The compiled-modal tests separately cover lookup recovery, stale results, saved-failure review, checkpoint status, keyboard behavior, and narrow layouts in light, dark, and high-contrast themes.

- [Final validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/final-validation/summary.json)
- [Final unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/final-validation/unit.json) and [browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/final-validation/browser.json)
- [Build parity, source hashes, and checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/checks.json)
- [New regression failures before the fixes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/final-regressions-before.json) and [passing focused checks afterward](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/final-regressions-after.json)
- [Earlier full validation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/validation/summary.json)
- [Narrow light review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/file-review-320-light.png), [dark review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/file-review-320-dark.png), and [high-contrast review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/remediation-recovery-2026-09-12/file-review-320-contrast.png)

**PDF validation investigation**

The earlier failed tagged-PDF fixture render lasted about 123.6 seconds against a 120-second subprocess deadline. That is consistent with a timeout, but the retained original report did not establish the exact cause. Renderer failures now retain elapsed time, exit/signal/killed information, a bounded diagnostic excerpt, and the original error as their cause. The renderer deadline remains 120 seconds.

The separate browser acceptance timeout was 2.5 seconds despite its locator having resolved. Its command budget is now 15 seconds to tolerate local scheduling contention. Semantic assertions and negative acceptance cases are unchanged. The first full run in this pass passed the PDF acceptance cases. The final full run passed those cases again. This verifies the current acceptance suite; it does not establish the exact root cause of the earlier subprocess stall.

**Scope**

No live or paid AI calls, commit, or deployment were performed. Automated browser accessibility checks do not substitute for human assistive-technology acceptance. Another tab's checkpoint takeover becomes visible at the next checkpoint boundary.

**Main implementation and regression files**

- [Batch persistence, retry policy, and recovery telemetry](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx)
- [Saved-batch hooks and per-file review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/remediation_batch_workspace.jsx)
- [Modal integration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_pdf_audit_source.jsx) and [strict storage reads](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/utils_pure_source.jsx)
- [Actual reload, multitab, and storage-fault tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/remediation_batch_recovery.spec.ts)
- [Compiled modal tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/remediation_continuity.spec.ts)
