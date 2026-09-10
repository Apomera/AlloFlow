# Anatomy structure browser enhancement

The explorer now supports **My notes** filtering, live filter counts, **Diagram order / Name A–Z / Review first** sorting, and a **Compact list** preference. Note previews make saved explanations easy to find. A progress strip shows structures explored in the current view, without changing the denominator when search or study filters narrow the list.

Opening a structure saves the current filtered and sorted sequence for Previous/Next navigation. Editing notes or confidence while reading leaves that sequence stable. Returning to the list refreshes its matches and preserves the chosen sorting, filter, and density. Invalid saved sequences fall back to diagram order.

Larger-text mode keeps previews visible and temporarily disables compact density. The notes empty state explains how to add an explanation and provides a return to all structures. The full structure browser now has consistent light, dark, and high-contrast styling.

## Validation

- 46 unit tests passed across the new browser state tests and existing search and flashcard-note regressions (the two initial new-test failures were corrected to account for existing function-text search matches).
- Chromium workflow passed: sorting, counts, note filtering and deletion, frozen reading sequence, keyboard selection, compact density, larger-text behavior, empty-state recovery, and no horizontal overflow at 320 px.
- Axe WCAG A/AA scans of the complete structure browser passed with zero violations in light, dark, and high-contrast themes. Scope is the structure panel, not the whole application.
- Main and desktop public JavaScript copies match; syntax and diff whitespace checks pass.

## Screenshots

- [Desktop](browser-desktop.png)
- [Phone](browser-phone.png)
- [Dark theme](browser-dark.png)
- [Accessibility scan](accessibility.json)

Regression files: `tests/anatomy_structure_browser.test.js` and `tests/e2e/anatomy-structure-browser.spec.ts`.
