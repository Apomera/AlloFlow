# Printing Press broadside enhancement

The broadside composer now appears before the historical examples. It retains text, typography, border, and printer-mark settings across activity navigation and browser reopening. Custom text is protected when loading a template, with a confirmation dialog and an undo action.

New independent body-size, line-spacing, and alignment controls update the live preview. Long words wrap within the sheet. The printer-mark controls also fit narrow screens.

The composer offers broadside-only printing (including the browser's Save as PDF option) and a standalone HTML download. Exports retain the sheet's styling and exclude lesson material. Exported text remains escaped text. The existing top Print button continues to print the lesson handout.

Browser storage failures show a session-only message; blocked print windows show a download alternative. Empty text cannot be exported. Saved settings are checked and clamped before use.

Validation:
- 30 existing tests passed across 7 Printing Press accessibility and question-integrity suites.
- `node dev-tools/printingpress_broadside_qa.cjs` passed: template cancel/undo, navigation and browser storage recovery, saved layout and mark settings, safe standalone HTML, isolated print markup, blocked-popup feedback, unavailable storage, empty output, and invalid saved settings.
- No browser page errors or composer WCAG A/AA axe violations in the focused browser check.
- No horizontal page overflow at 320px and 390px. Desktop and narrow-screen screenshots visually reviewed.
- JavaScript syntax, whitespace checks, and source/desktop mirror parity passed.

The browser run uses the real tool in an isolated React host. Print invocation is stubbed to verify the generated document without sending a job to a physical printer. Actual pagination depends on the user's print settings; the composer reminds students to check the print preview for page breaks.

Evidence: `browser-results.json`, `desktop.png`, `mobile-320.png`, `mobile-390.png`, `export.png`, and `broadside.html`.
