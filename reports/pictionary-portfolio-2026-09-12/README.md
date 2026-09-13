# Pictionary saved work and learning portfolio

Implemented locally on September 12, 2026. This pass adds autosave/resume and a before-and-after learning gallery to solo Concept Pictionary. It has not been deployed.

## Learner experience

- Work saves in this browser under the current app and account. Reopening offers an explicit resume action, restores the drawing, text, concept order, guess history, glossary-use flag, and explanations, and never automatically resends an interrupted AI request.
- A usable running or paused Pictionary session is reused without another token charge or timer reset. If the old session has ended, the gallery remains readable and downloadable; explicitly resuming starts a new paid arcade session. The host remains the owner of the timer.
- The gallery compares the first submitted clues with the latest version. Learners can add a short explanation during review or later in the gallery. Revising, switching response modes, clearing, and undoing do not replace the first snapshot.
- Completed and unfinished work can be reviewed. Unfinished clues are excluded from downloads until selected. Earlier sets remain in the gallery, with retention bounded to the current set plus the latest ten earlier concepts.
- Learners choose concepts, explanations, unfinished work, and an optional name before previewing a printable HTML or plain-text portfolio. A changed selection or explanation makes the preview stale and disables downloading until refreshed. The name is not filled in from the account and is not autosaved.
- Storage failures appear in the main view. Observed changes in another tab pause autosaving rather than overwriting that saved copy. Loading the newer copy or clearing saved work requires an explicit in-game confirmation.

## Storage and export details

The versioned save envelope is bounded to 2,000,000 characters and validates record IDs, concept progress, guess history, drawing tools, colors, stroke widths, and finite in-canvas coordinates. No anonymous shared save key is used. Invalid or oversized saved data is preserved until the learner chooses to clear it. Failed writes retain the last successful save.

Saved work includes both editable response modes. Exports include only the selected first and latest clue snapshots, concept definitions, status, and selected learner explanations. They omit unused alternate response text, account identifiers, AI request payloads, and AI reasoning. HTML text is escaped; drawings use validated inline SVG; the standalone HTML has no scripts, external media, or network dependencies and includes a restrictive content policy.

Undo history and glossary pictures are not persisted. Available current glossary pictures are reattached only when the saved term and definition still match. Saves are local to this browser and account; they are not cloud synchronization. Storage capacity is shared with other browser data. Cross-tab detection uses localStorage comparison and storage events, not a transactional multi-user store.

## Validation

- **240 tests passed across 26 suites**, including 21 new persistence, recovery, gallery, and export regressions.
- **64 new browser/export scans passed** across light/dark themes at 1280, 390, and 320 pixels. These include actual reloads with matching canvas pixels, timer preservation, interrupted AI recovery, token charges only on explicit new-session resume, selected HTML/TXT downloads, stale previews, two-tab conflicts, account separation, forced colors, and 200 percent text.
- **52 existing browser game-flow scans passed** for drawing tools, glossary references, revision, request cancellation, skip races, expiration, and review without AI. Total: **116 browser/export scans**.
- The initial broader run passed 172 tests in 22 suites. Four worker startup timeouts were resolved by rerunning those four suites separately with a process pool. The retry passed all 68 remaining tests; there were no assertion failures. Both raw run reports are retained.
- Automated accessibility checks used WCAG A/AA rules, alongside overflow checks. Desktop, phone, and print-media screenshots were visually inspected. Print styling was checked in Chromium; no PDF pagination or physical printer output was tested. For automated export accessibility inspection, the same HTML was loaded into a separate inspection document without its script-blocking policy. Actual downloaded files retain that policy.
- AI responses were deterministic local fixtures. No live provider calls were made in validation. The glossary illustration was reused from the existing local visual test fixture.
- Root and desktop plugin mirrors match; all three host loaders use Pictionary cache version **a225e174ea**. Existing AlloHaven version remains **3cb9b709b7**.

The existing live Pictionary and Sketch Response suites passed. This pass does not add curated concept packs, reverse Pictionary, or further live-mode features.

## Evidence

- [Combined validation summary](validation-summary.json)
- [Broader regression run](regressions.json)
- [Four-suite retry](regressions-retry.json)
- [Browser/export results](browser-verification.json)
- [Desktop gallery](dark-1280-gallery.png)
- [Phone gallery](dark-390-gallery.png)
- [Resume view](light-1280-resume.png)
- [Portfolio preview](light-1280-portfolio.png)
- [Print-media preview](light-1280-print-preview.png)
- [Sample printable portfolio](light-1280-portfolio.html)
- [Sample plain-text portfolio](light-1280-portfolio.txt)
- [Previous game-flow evidence](../pictionary-enhancement-2026-09-12/browser-verification.json)

## Implementation

Production changes are in arcade_mode_concept_pictionary.js and its desktop public mirror, plus the scoped cache version in the three application hosts. New regression coverage is in tests/arcade_concept_pictionary_portfolio.test.js. Browser checks are in dev-tools/check_pictionary_portfolio.cjs and the updated existing check_pictionary_solo.cjs.
