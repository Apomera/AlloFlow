# Symbol Bank library organization

This follow-up adds bulk organization to the earlier [Symbol Studio improvements](IMPLEMENTED.md).

## Using it

Open **Symbol Bank → Organize symbols**. Select individual symbols or use **Select all shown** after searching or filtering. Choose a review status, word type, and/or topics, then apply the changes.

- Selections remain when filters change. The selected count explicitly identifies selections hidden by the current filters.
- Topics are added to existing topics and deduplicated, including Unicode labels. Word type and review status stay unchanged unless selected explicitly.
- A batch preserves symbol IDs, images, source credits, locks, aliases, and review notes.
- **Undo last batch** restores the previous metadata. It preserves unrelated edits, skips symbols whose metadata changed later, and never recreates deleted symbols.
- **Done** clears the selection and pending form fields. Switching learners or closing Studio also clears batch state and undo history.
- If device storage fails, changes remain available in the current session and the UI explains that they were not saved.

## Keyboard and touch improvements

Gallery cards now use separate native controls for previewing, selecting, and favoriting symbols. The old favorite button was nested inside a card acting as another button. Removing that nesting prevents keyboard actions from also opening the preview. Batch selection uses native checkboxes with clickable card labels.

Organizer buttons and gallery buttons have a minimum height of 44 pixels. Fields stack at narrow widths, and the organizer shares the gallery's scrolling area.

## Validation

- **84 tests passed across eight targeted files:** [66 workflow and compatibility tests](library-tests.json), including eight new bulk-organization tests, plus [18 unchanged golden checks](library-snapshot-review.json).
- Tests cover filtered and hidden selections, selective updates, additive multilingual topics, no-op batches, guarded undo, matching asset IDs across learner switches, full device storage, and independent native controls.
- [Browser checks](library-browser/checks.json) passed at **1440, 390, and 320 pixels**: keyboard favorite toggling, keyboard checkbox selection, hidden-selection counts, persisted bulk changes, undo, and return to the existing preview. No runtime exceptions or workflow overflow occurred in these scenarios.
- Reviewed [desktop](library-browser/1440-organize.png) and [phone](library-browser/320-organize.png) screenshots.
- Both JavaScript copies pass syntax checks and are byte-identical. SHA-256: `44b52d22b42aa0872d8b3e669eff4e3a20a41ea905812deaf9afb9aba3d97289`.
- Edited tracked source files pass `git diff --check`. No existing snapshots required updating.

This pass validates the affected library workflows rather than rerunning the entire application suite. Browser fixtures use synthetic data and local assets. No deployment was performed.

## Remaining library work

Duplicate review, transfer previews, and bulk export remain candidates for a later pass. The broader Garden distinction between available resource words and observed practice also remains on the original roadmap.
