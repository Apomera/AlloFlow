# Anatomy explorer visual and UX pass

Refined the Anatomy explorer with a consistent pale workspace, clearer section hierarchy, more readable structure cards, larger detail titles, and consistent action buttons.

- Direct **View atlas** and **Browse structures / Read structure** navigation with keyboard focus.
- Phone body-system picker and reversible **More controls** disclosure. Search remains available in the compact layout.
- Previous/next structure browsing with a position counter, named accessible controls, and disabled end stops. The sequence follows the current diagram and learning level; confidence changes do not shift the sequence.
- **Show on atlas** from the detail card. Detail navigation scrolls below the desktop sticky mode bar.
- Notes, confidence, search, comparison, model focus, and the existing study-record workflow are preserved.
- Main and desktop public copies are identical; new strings are included in the English translation catalogue.

## Validation

82 unit checks passed: 76 existing UI, dashboard, study-record, and learning-state tests; 6 targeted view/model focus checks. The latter run intentionally skipped 14 unrelated tests.

The Chromium workflow passes desktop/phone controls, search, system changes, previous/next boundary states, note/confidence preservation, keyboard focus, reversible model focus, and absence of horizontal page overflow at 320, 390, 768, and 1280 pixels.

The phone compact controls save **321 pixels** compared with the expanded controls in the tested skeletal view. Axe scans of the explorer navigation, detail navigation, and detail header report no WCAG A/AA violations in light, dark, and high-contrast themes. These are scoped scans, not certification of the entire application.

JavaScript syntax and diff whitespace checks pass. No deployment was performed.

## Screenshots and results

- [Desktop explorer](explorer-desktop.png)
- [Phone explorer](explorer-phone.png)
- [Desktop structure detail](detail-desktop.png)
- [Phone structure detail](detail-phone.png)
- [Dark navigation](navigation-dark.png)
- [Accessibility results](accessibility.json)
- [Layout measurements](layout.json)

Browser regression: `tests/e2e/anatomy-explorer-visual.spec.ts`.
