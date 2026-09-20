# Symbol Studio: add selected symbols to Visual Packs

The Symbol Bank organizer now offers **Add selection to Visual Pack**, alongside Create board from selection.

## Workflow

1. Open **Symbol Bank → Organize symbols** and select symbols.
2. Choose **Add selection to Visual Pack**, then select an existing pack or name a new one.
3. Review the counts of symbols to add and symbols already included. Hidden selections are included, and new references are appended in selection order.
4. Save, then use **Open updated Visual Pack** to review the result.

Existing boards, sequences, symbol order, descriptions, and unresolved references are retained. Adding only duplicates performs no write and preserves the pack's timestamp. New packs are assigned to the current learner. Symbol IDs and original bank metadata remain intact; this action adds references rather than copying or regenerating images.

## Reliability and boundaries

- Failed writes leave persisted and visible pack contents unchanged. The selection, destination, and new-pack name remain available for retry.
- A new pack is created with its selected symbols in one storage write. Rapid duplicate submissions do not create a second pack.
- Unsaved Symbol Bank changes block transfer until **Retry save** succeeds, so a saved pack does not point to newly generated but unsaved bank symbols.
- Destinations come from the current learner's scoped packs. Packs explicitly assigned to another learner are excluded; legacy unassigned packs already in the current scope remain eligible.
- Learner switches, closing Studio, or ending organization reset the destination and pending pack name. Matching pack IDs in different learner scopes do not cross-write.
- Empty selections and incomplete destination/name choices disable submission. Closing the options does not change the pack or clear the selection.
- Pending batch metadata edits must be applied separately, as explained in the organizer.

## Verification

- **64 regression tests passed across five files**, including nine new transfer tests, existing library save/undo and board workflows, bulk organization, Visual Pack contracts, and golden snapshots. See [suite results](selection-pack-tests.json).
- The nine new tests were rerun after final preview-lookup and long-title sizing adjustments: [final transfer tests](selection-pack-final-tests.json).
- Chromium workflows at **1440, 390, and 320 pixels** cover hidden selections, duplicate preview, preservation of existing content, opening the destination, failed-save recovery, new-pack creation, and selection order. See [browser checks](selection-pack-browser/checks.json) and [runner](selection-pack-browser.cjs).
- No page errors or horizontal workspace overflow occurred in the exercised preview and confirmation layouts. New form buttons and selects meet the 44-pixel minimum-height check. The 320-pixel saved confirmation was visually inspected.
- Syntax and scoped whitespace checks pass. Root and desktop/public module copies are byte-identical. No snapshot updates were required.

Validation uses synthetic local learners and browser fixtures. No live cloud services or production learner records were accessed, and the full repository suite was not run.

Next opportunities remain selected-symbol ZIP downloads, a named library for completed stories and Quick Boards, import previews, and clearer separation of Garden resource coverage from practice activity.
