Remediation batch clarity review — September 12, 2026

Implemented another focused improvement pass in the remediation workspace.

- Progress now counts processed documents. Starting the last file no longer shows 100%, and retrying an earlier failed file does not reset progress to that file's position. Failed files remain separately visible; processing and verification remain separate outcomes.
- Queue filters show All files, Unfinished, Failed, Needs review, and Processed, with counts. Filtering only affects display. The selected retry still receives the complete queue, saved settings, and the selected file ID. Empty filters explain how to return to the whole batch; a new document resets the filter.
- Failure details use native keyboard-accessible disclosures with readable explanations and recovery advice. Long messages wrap, and text resembling HTML remains escaped text.
- Stop immediately shows persistent “Stopping…” feedback and keeps modal dismissal guarded until work ends. Duplicate requests are ignored. The feedback belongs to the current abort signal and clears for a new run.
- An older complete summary cannot mark a batch finished while queued work remains. Missing summary counts fall back to the queue, and missing timing displays “Unavailable”. Review filtering uses verification evidence, including partial or unknown coverage and expert-review flags.
- Batch action buttons wrap on narrow screens. Browser testing reproduced a 7-pixel overflow in the 320-pixel high-contrast layout; this was traced to Dashboard sharing an unwrapped row with the other actions and fixed.

Validation: 123 focused unit tests and all 18 local compiled-modal browser tests passed, with no retries or skips. The browser checks cover modal retention across modes, retry/checkpoint ownership, keyboard operation, filter preservation, Stop isolation, escaped error text, and responsive layouts. Axe reported no violations in the scoped new queue controls and error disclosures across light, dark, and high-contrast themes. Screenshots were inspected. Module build, pipeline integrity, whitespace checks, and root/desktop module byte parity passed.

This pass used the focused workspace and lifecycle suites. It did not rerun the full PDF-export corpus or exercise paid live AI remediation. The earlier failed layout run is retained in browser-initial.json; browser.json records the passing final run.

The main source changes are in remediation_workspace_component.jsx, remediation_workspace.css, and view_pdf_audit_source.jsx, with the view builder and generated root/desktop modules synchronized. Regression coverage is in tests/remediation_workspace.test.js and tests/e2e/remediation_continuity.spec.ts.

Further feasible enhancements identified:

- Add a per-file review drawer so users can inspect findings directly from “Needs review” and return to the same queue position. It should bind to the selected saved result without replacing the active document owner; this needs a separate interaction and ownership pass.
- Distinguish preparation, AI cooldown, and checkpoint saving in the batch header using structured lifecycle events. The current header groups active batch work under “Processing batch”; more specific states would clarify long waits and recovery.

Evidence: unit.json, browser.json, checks.json, and queue-*.png in this directory.
