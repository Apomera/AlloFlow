# Document Builder export workflow analysis — 2026-09-08

Read-only review. No application code, tests, generated modules, deployments, or provider configuration were changed. All new files are isolated evidence in this directory.

The September 6 review's fixes remain present: short and visual previews export without reviving older History; primary and alternative export jobs share a lock; failed print handoff preserves the Builder; font/image readiness waits occur before printing; IMS consumes the cleaned live document; QTI/H5P deliberately select structured activities. NotebookLM already checks the live-edit flag and uses the preview after edits, so the old History-only behavior is not a new finding for that format.

## Confirmed remaining findings

| Priority | Finding | Trigger and observed result | Current source |
| --- | --- | --- | --- |
| P1 | Slides discard live Builder edits | Preview contained `LIVE_EDITED_VALUE: The answer is 42.` while the selected History resource contained `HISTORY_OLD_VALUE: The answer is 10.` The actual compiled export coordinator serialized the edited iframe, then the real slide handler received only selected History. Captured slide text contained 10, omitted 42 and the edited heading, returned success, and closed the Builder. | `export_handlers_module.js:1557-1562`; `export_source.jsx:1575-1578,1677-1681`; host binding `AlloFlowANTI.txt:41245` |
| P1 | Braille exports include pending tracked deletions | The BRF callback clones the body and strips some editor controls but never finalizes tracked changes. A fixture containing `Keep <del data-allo-change-id="removed">deleted</del> <ins data-allo-change-id="added">new</ins>.` exported the removed word too. This flattening occurs **before** either shared Grade-1 or UEB conversion, so it is independent of the fallback-converter defect below. | `view_export_preview_source.jsx:9417-9422`, shared converter input `9510-9520` |
| P2 | Markdown loses image sources and MathML structure | The actual current Markdown callback changed an embedded diagram into `![Actual explanatory diagram](image)`, discarding its source. It placed MathML inside a `mathml` fence, then stripped every XML element during the generic tag-removal pass: the fence contained only `x=42`. It still reported “Markdown downloaded.” A merged table header was flattened without any fidelity notice. | `view_export_preview_source.jsx:9089-9106`; NotebookLM preview-image conversion has the same placeholder at `9253` (source inspection) |
| P2 | Braille's last-resort converter splits every character into separate lines | When the loader/shared converter is unavailable, `/\n?/g` matches empty boundaries as well as newlines. `Cab` became `,C\nA\nB`; `12` became `#A\n#B`, losing the original word/number grouping. The callback reported success. This is specifically the **inline fallback**, not the shared Grade-1 implementation tested by `braille_grade1.test.js`. | `view_export_preview_source.jsx:9465`; fallback dispatch `9514` |
| P2 | ePub's image deadline ends before the response body is read | With a controlled fetch that supplied headers then held its body pending, the callback cleared the 10-second abort timer before awaiting `response.arrayBuffer()`. The probe observed an active export lock, a pending body read, and zero active deadlines. It completed only after the probe manually released the body. The 8-MiB check likewise happens after the whole body has been buffered. | `view_export_preview_source.jsx:9345-9356` |

The ePub probe began before report consolidation and finished without network traffic. It uses a controlled response/body and timer instrumentation; it does not claim to validate an ePub reader or real network latency.

## Improvements to prioritize

1. Route live-document formats through one immutable, finalized snapshot. Keep QTI/H5P's structured-activity contract explicit. Either make Slides honor the current edited snapshot or make the History-based limitation clear and prevent editing under a misleading preview contract. Preview preflight currently recommends adding slide headings, although those edits never reach this PowerPoint route.
2. Apply the same accepted-view/tracked-change policy to Braille before conversion. Reuse the canonical Grade-1 converter for fallback behavior and cover loader failure explicitly.
3. Replace destructive Markdown string conversions with structure-aware conversion that protects MathML and resolves/packages images. Emit a concrete loss notice for structures such as merged table cells that the chosen format cannot faithfully represent.
4. Keep ePub cancellation/deadlines active through body consumption, enforce the byte limit while reading, and release the shared export lock on cancellation. A slow body should leave a recoverable export error instead of indefinite “Building ePub...” status.

The prior review's filename unification and “browser handoff” completion wording remain sensible UX work, but they are documented opportunities rather than newly discovered defects. This analysis does not claim that downloads were opened in PowerPoint, an e-reader, or a Braille device, nor that successful preflight establishes distribution readiness.

## Evidence and scope

- [Reproducible isolated probe](probe.cjs): loads the actual compiled `export_module.js` and `export_handlers_module.js` with a controlled PPTX writer; executes the current source Markdown, BRF, and ePub callbacks extracted with the repository's existing parser. Cleanup helpers are identity stubs only for the plain synthetic Markdown/ePub fixtures; BRF executes its own actual cleanup path. No provider calls, private documents, network fetches, or production writes.
- [Probe outcomes](probe-results.json), [probe log](probe.log), [Markdown artifact](markdown-output.md), [Braille fallback artifact](braille-output.brf).
- [Existing-suite checks](focused-tests.json): **20/20 passed** across print/export handoff (5), format preflight (3), and canonical Grade-1 conversion (12). These are checks of existing behavior, not evidence that any finding was fixed. The gap is in the current Builder orchestration/conversion paths, which these suites do not assert.

Commands used:

```powershell
node reports/document-builder-analysis-2026-09-08/export/probe.cjs
node node_modules/vitest/vitest.mjs run tests/document_builder_export_handoff.test.js tests/export_preflight_modes.test.js tests/braille_grade1.test.js --maxWorkers=1 --testTimeout=20000
```
