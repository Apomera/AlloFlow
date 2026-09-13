# Symbol Studio draft authoring browser review

The final browser run passes **75 functional assertions and 24 new rendered states** at 1440, 390, and 320 pixels. The previous 18 UI states and six Board Builder states also pass against the integrated module: **48 rendered states total**, with no workflow overflow or browser errors. Intentional horizontally scrolling navigation tabs are excluded from the workflow-overflow measure.

The review uses the actual module with local React in Chromium. Fictional learners A, B, and a fresh learner share one fixed localhost origin. IndexedDB is real; model, image, and speech callbacks use local fixtures, and external requests are blocked. The fixture seeds only once, so navigation cannot satisfy restoration assertions by reseeding the draft under test.

## Verified behavior

- **Story editing:** Edit text focuses the page textarea. Blank content shows an error and leaves the original intact. Cancel preserves the original; Save commits the wording while preserving its illustration. Save and Cancel return keyboard focus to Edit text. The editor shows its 2000-character limit and explains that changes apply on Save. Uncommitted text has a visible draft-status reminder.
- **Narration and print:** Narration receives the saved paragraph. The actual PDF contains exactly two sheets, one per story page, with the edited line break preserved. Both illustrations are present in the rendered sheets; the fixture produces 19,331 purple illustration pixels on each page.
- **Recovery across workflows:** A reload restores board words and images, sequence items and layout, story wording, illustrations, selected page and custom learner nickname, and all eight Quick Board designs. A hidden fourth choice retains both its label and image while the choice count remains two. Communication Builder selections and free-text goals persist.
- **Learner separation:** Switching A to B shows B's own content, with empty board, sequence and story drafts for the new learner. Returning to A restores its authored content across all four workflows. A fresh learner receives defaults.
- **Temporary responses:** Earned tokens, selected choices, pain responses and transition progress are excluded from authored drafts and reset on recovery. Token circles are native buttons with pressed state, and both Space and Enter activate them.
- **Hydration and failure recovery:** Delayed initial recovery keeps the editor inert until the read completes while profile and tab controls remain available. An aborted write retains the previous stored record, shows the failure status and succeeds through Retry. A failed read permits session editing; successful retry offers Restore saved or Keep current. Both choices were exercised.
- **Deliberate replacement and clearing:** Replacing an unreadable stored draft requires confirmation. Cancel preserves the unreadable record; confirmation saves current work and survives reload. Clear this draft resets only the active Quick Board, preserving board and sequence drafts, another learner's draft, and saved galleries.

## Reload protection

The stress test initially reproduced lost changes when a page reload occurred inside the 500ms autosave window. The completed fix raises Chromium's real leave-page warning while the draft is dirty. The final test observed the warning, dismissed it, confirmed the latest text remained, waited for the stored record to commit, then reloaded and recovered that exact text. Closing the Studio also flushed a recent edit successfully.

A forced process termination, deliberately leaving before the save completes, or a browser that suppresses exit prompts can still interrupt pending writes. “Draft saved” remains the point at which persistence is confirmed. Page text must first be committed with Save text; automatic drafts and saved gallery supports remain separate operations.

## Visual and print checks

The 24 new authoring and recovery states have no measured phone controls smaller than 44px. The 320px editor, empty-text error, save-failure message and recovery actions were visually inspected. The desktop editor was also inspected. Existing Board Builder print layouts retain four columns at all three widths; its labelled native checkbox remains a smaller control in the existing board UI.

The edited-story PDF was parsed for page count and text, rendered with Poppler, inspected visually, and checked for illustration ink on both sheets. The prior Social Stories, Symbol Bank, saved boards and Visual Packs review was rerun to catch layout and interaction regressions.

## Evidence

- [Final measured summary](final/summary.json), [75 functional assertions](final/checks.json), [24-state geometry](final/measurements.json), [browser errors](final/browser-errors.json)
- [Phone text editor](final/320-story-text-editor-scrolled.png), [desktop text editor](final/1440-story-text-editor.png)
- [Phone save failure](final/320-draft-save-error.png), [phone recovery choice](final/320-draft-recovery-choice.png), [unreadable-draft recovery](final/320-unreadable-draft-recovery.png)
- [Edited two-page PDF](final/edited-story.pdf), [parsed text and illustration verification](final/pdf-verification.json), [sheet 1](final/edited-story-page-1.png), [sheet 2](final/edited-story-page-2.png)
- [18-state UI regression checks](ui-regression-check/checks.json), [six-state board/print checks](board-print-check/checks.json)
- [Reusable IndexedDB browser harness](browser-draft-authoring.cjs), [Quick Board capture/restore contract](quickboard-draft-contract.md)

These checks cover Chromium with fictional local fixtures. They do not establish live model availability, microphone or audio quality, screen-reader behavior, switch-hardware compatibility, cross-browser parity, or recovery after operating-system termination. The review's application and storage unit-test totals are recorded separately in the [main report](README.md).
