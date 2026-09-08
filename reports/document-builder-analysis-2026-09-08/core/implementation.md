# Builder draft protection and version review implementation — 2026-09-08

Implemented the authorized draft/version scope. Layout, export behavior and keyboard work were owned by other agents. Shared production files were edited through exact-span checks on fresh reads; source mirrors used atomic sibling-file replacement after an unchanged-source check.

## Behavior

- Use saved block now binds the operation to the compared saved/current HTML revisions and exact block markup, checks source and target cardinality, and verifies the live target before replacement. Insertions, removals, reordering, changed text/assets, changed snapshots and duplicate identities refuse safely. Valid unique paragraph and table-cell restores still work.
- Local recovery keys now use SHA-256 of the full source context: History content, explicit resource scope, mode and the host's projected History signature; remediation uses its existing original-document digest and mode. Names are display metadata and do not invalidate identity when renamed. Stores and snapshots carry the source identity, and restore/compare actions reject other-source snapshots before mutation.
- Debounced capture is cancellable and flushable. Host close flushes pending edits before canonical synchronization, then invalidates the owner. Every host capture checks the current owner, iframe document and document token before setting source/historySignature/resourceIds. Old callbacks cannot overwrite a newer draft's attribution. An unchanged open/close does not create an autosave.
- Restore capture is synchronous rather than leaving an 80 ms callback behind after close. Workbench, autosave and restore use the same guarded capture path. Exceptions/rejections leave an error status rather than a durable-save claim or an indefinite saving state. Successful capture/save/restore updates draftCaptureAt; the footer uses the shared status label helper.
- Version comparison explicitly describes text comparison. It no longer claims full document equality after a figure-only change and distinguishes the first 400 text blocks from the first 24 displayed differences.

## Changed files owned by this work

- view_export_preview_source.jsx: comparison helpers, source-bound draft helpers, local recovery/version callbacks, capture lifecycle and the minimal shared-capture call in Workbench. Shared root title/status helpers are consumed without changing their behavior.
- AlloFlowANTI.txt, desktop/web-app/src/AlloFlowANTI.txt, desktop/web-app/src/App.jsx: Builder owner/capture integration, close flush/invalidation and new view props only.
- tests/document_builder_draft_protection.test.js: 37 new behavioral cases loading actual source helpers/callbacks.
- tests/audit_coherence_fixes.test.js: obsolete generic capture assertion only.
- tests/document_builder_refinement_pass.test.js: obsolete v1 local-key assertion only.

## Validation

Final focused run: 58 passed, 0 failed across document_builder_draft_protection (37), builder_export_recovery (13), document_builder_project_persistence (5) and document_builder_draft_codec (3). Production source parsed successfully with Babel. implementation-final-tests.json and implementation-evidence.json contain results and exact current function lines; the latter also records the source hash.

An earlier bounded seven-file run passed 142 and failed five source/parity contracts. Two obsolete assertions owned here were updated. The other failures concerned export clone counting, the forwarded slides options signature and export-handler mirror parity; these were sent to the coordinating agent for its integration/build pass. This agent did not rebuild or synchronize generated modules.

## Compatibility and limits

Project draft v1/v2 codecs are unchanged and remain covered. Existing unbound local v1/v2 stores are left intact on the device but are not offered automatically under the new source-bound namespace; their original source cannot be verified. Remediation without an existing documentDigest, or a browser without available SHA-256 support, cannot use bound local recovery until identity is available. Session capture and existing project/canonical save paths remain available; the UI distinguishes session capture from saving on the device.

Comparison remains a bounded text comparison, not a structural/asset diff. It detects nontext changes when deciding whether a block-restore operation is stale, but does not report a comprehensive inventory of figure, link or formatting differences. Ambiguous duplicate blocks are intentionally refused instead of guessed.

The earlier analysis demonstrated a generic local-key collision for selected resource IDs. The actual host already passes filtered History, so simple distinct Guided selections generally had distinct endpoint IDs; the new explicit scope/full-content binding still removes weak identity and handles content/projection changes. The different-PDF collision and delayed capture/project-attribution failures were confirmed independently.
