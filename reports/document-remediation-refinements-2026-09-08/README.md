# Document remediation refinements — 2026-09-08

This pass fixes demonstrated reference, keyboard-navigation, acceptance-check, and evidence-recovery failures. The mixed education scope remains in place. Changes are local; no deployment or live-provider calls were performed.

## Behavior changes

**Reference matching avoids false identity.** Removing one of two identical source images or tables could previously make both old IDs point to the remaining copy. Matching now requires exactly one candidate in both the source index and the current document. Duplicate identities require manual inspection, including after deletion or reordering. Incomplete inventories also decline automatic location and explain the limitation. Unique references still tolerate supported formatting, table-header, and alt-text improvements; version-1 saved indexes remain readable.

**Preview actions respect the current document and keyboard focus.** Changing the selected element, closing the preview, or loading another document retires pending lookups. Document replacement resets component state even when the HTML is identical. A delayed lookup cannot take focus after the reviewer moves elsewhere. Failed index preparation can be retried. Closing the preview returns focus to its opening control; temporary preview styles and focus attributes are restored. HTML updates return focus only when the preview owned it, leaving other controls undisturbed. Acknowledgments and references remain metadata, separate from verification and human attestations.

**PDF links must own their expected destinations.** The export acceptance checker previously passed a tagged PDF whose two link destinations were swapped, because it found the names and URLs independently. It now follows page-scoped structure object references to each link's annotations. The named link must have an unambiguous association, and every associated annotation must use the expected URL. Wrapped links can own multiple annotations. Swapped destinations, detached associations, and ambiguous link names fail.

**Calibration imports preserve the existing corpus on failure.** The importer writes and flushes a complete temporary manifest before atomic replacement. A cooperative lock and a final history comparison prevent competing imports from overwriting newer entries. Tests simulate partial writes, rename failure, concurrent history changes, and an already-held lock. Existing locks are preserved; the CLI explains how to handle a confirmed abandoned lock.

**Benchmark input failures remain in the evidence.** If a source or repair plan changes or disappears, the runner records the invalid trial and bounded reason codes, retains raw execution evidence, and stops further repeats. It no longer throws away the trial summary while trying to fingerprint a missing input.

**Runner release generation also uses atomic replacement.** A repeated OneDrive write failure was reproduced during packaging. The generated release contract is now replaced only after complete replacement bytes are on disk, preserving the prior file on failure. The normal staging command and its fault tests pass.

## Validation

| Scope | Result | Evidence |
| --- | --- | --- |
| Reference matching | 28 tests passed | [Reference tests](reference-tests.json) |
| Artifact parity, review metadata, verification contracts | 30 tests passed | [Integration tests](integration-tests.json) |
| Benchmark and calibration fault injection | 28 tests passed | [Tooling tests](tooling/tests-final.json) |
| Review UI in Chromium | 13 tests passed | [Final review browser log](review-browser-settled.log) |
| Export acceptance in Chromium | 8 tests passed, including real tagged-PDF negative controls | [Acceptance evidence](at/implementation.md) |
| Rebuilt pipeline/view mirrors | Exact byte matches | [Bundle hashes](build-verification.json) |
| Runner publication and packaging | 4 publication tests and 1 mapping test passed; 71 dependencies verified | [Runner and recovery checks](tooling/validation.md) |
| Final scripted MCP | One local trial, with version hashes and raw evidence | [Final MCP report](tooling/mcp-settled/benchmark-report.json) |

The Vitest total is **86 tests across six files**. The **21 browser tests** and **5 runner publication/mapping tests** are separate. Early browser failures are retained in the initial log: one fixture needed explicit keyboard focus, and closing a busy preview exposed a real focus-return race that was fixed before the final run.

The PDF-link failure was reproduced before the change using actual local PDFs and PDF.js, then rejected by the corrected checker. Calibration and benchmark failures were reproduced in isolated test files; production corpus data was not damaged by the tests.

## Usage and limits

- [Review navigation and reference behavior](../../docs/document-remediation-review.md)
- [PDF link acceptance findings](at/implementation.md)
- [Calibration import instructions](../../tests/fixtures/pdf_calibration/README.md)
- [Benchmark instructions](../../docs/document-remediation-benchmark.md)

Human expert calibration and native screen-reader acceptance remain pending. Automated checks and scripted MCP responses do not establish live-provider quality, production latency, or complete accessibility conformance. Conservative duplicate/incomplete-index handling trades automatic navigation coverage for avoiding a misleading match.

