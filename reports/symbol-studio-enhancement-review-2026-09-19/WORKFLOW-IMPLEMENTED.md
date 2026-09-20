# Symbol Studio: reliable saves and selection-to-board

Implemented the next two recommended priorities: reliable Symbol Bank save feedback with recoverable removal, and creating a communication board from the organizer's selection.

## Save reliability and removal

- Favorite changes use the guarded bank persistence path. If saving fails, the latest changes remain visible in the current session and an alert offers **Retry save**. Retry writes the current bank, including intervening edits.
- Single-symbol deletion and Clear All require a successful storage write before changing the visible bank. A failed write leaves the bank intact and reports the failure.
- **Undo removal** restores the last removed symbol or cleared bank, preserving IDs, images, metadata, and later additions. Existing matching IDs are not overwritten.
- Undo is limited to the current learner and open Studio session, and is replaced by the next successful removal. It is not a persistent trash folder. The UI explains this lifetime.
- If undo cannot save, restored symbols remain visible with the Retry save action. The application does not claim they have been persisted.
- Saved board images and Visual Pack references are retained. A removed asset can be unresolved in a pack until restored; undo reconnects it through the original ID. Pack memberships are not destructively rewritten.
- Clear All rejects stale confirmations if the bank changes, the learner changes, or Studio closes while the dialog is open.

## Create board from selection

In **Symbol Bank → Organize symbols**, select symbols and choose **Create board from selection**. The action includes selections hidden by filters and uses selection order. It creates fresh cell IDs while preserving labels, word types, images, asset/concept references, and image locks. Pending metadata edits must be applied separately; the organizer explains this before creation.

The resulting **Selected symbols** board opens as a draft in Board Builder for review, naming, rearrangement, and Save. It does not call an image-generation service. A draft replacement confirmation offers **Keep current draft** so the user can save existing work first. Saving the new board creates a separate record instead of overwriting the previously edited saved board. Stale confirmations cannot transfer the selection to a different learner or overwrite a changed draft.

## Verification

- **101 distinct regression tests passed across nine files**, counting the latest result for each test: 64 in [workflow-final-tests.json](workflow-final-tests.json), plus 37 draft, Visual Pack, and dialog tests in [workflow-tests.json](workflow-tests.json). The earlier run's save-warning wording assertion was corrected and passes in the final run.
- Twelve new runtime tests cover storage failures, retry, single/whole-bank undo, retained pack membership, later additions, learner isolation, stale confirmations, hidden selections, selection order, cell references, draft cancellation, and independent board saves.
- Chromium checks at **1440, 390, and 320 pixels** cover favorite failure/retry, selection-to-board/save, draft cancellation, and Clear All/undo. No page errors or horizontal workspace overflow occurred in the exercised selection layout. See [checks](workflow-browser/checks.json) and [runner](workflow-browser.cjs).
- Visually inspected the narrow selection panel and desktop save alert. New action buttons use a 44-pixel minimum height.
- JavaScript syntax and scoped whitespace checks pass; root and desktop/public modules are byte-identical. Existing golden snapshots pass without updates for this batch.

Verification used synthetic learners and local browser fixtures, not production learner data or live cloud services. The full repository suite was not run.

Remaining opportunities include selection-to-pack/ZIP actions, a named library of completed stories and Quick Boards, import previews, and separating Garden resource coverage from practice activity.
