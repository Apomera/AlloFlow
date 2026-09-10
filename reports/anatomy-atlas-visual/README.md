# Anatomy atlas visual refinement

Refined the atlas panel with consistent system typography, a quieter frame and shadow, clearer title hierarchy, and coordinated light/dark/high-contrast surfaces. The 2D controls now have distinct Zoom, Pan, and Frame groups instead of a crowded row. Their existing zoom, pan, focus, reset, and keyboard behavior is preserved.

A selection caption below the atlas identifies the selected structure and opens its detail card. It also exits model focus when necessary and transfers keyboard focus to the detail heading. An unselected atlas offers a short pin-selection prompt. This caption appears only in Explore and does not expose answers in Quiz or other practice modes. Clinical Atlas retains its existing concept selection interface.

## Validation

- 36 existing atlas UI and view/model regression tests passed.
- Chromium workflow passed zoom, pan, reset, caption navigation, focus-mode exit, hiding the caption in Quiz, and no horizontal page overflow at 320, 390, and 768 pixels.
- Scoped Axe WCAG A/AA checks passed for the atlas toolbar, title row, and selection caption in light, dark, and high-contrast themes. This is not a whole-application audit.
- Desktop, phone, and dark-theme screenshots visually inspected.
- JavaScript syntax and diff whitespace checks passed; source and desktop public copies match.

## Screenshots

- [Desktop atlas](atlas-desktop.png)
- [Phone atlas](atlas-phone.png)
- [Dark atlas](atlas-dark.png)
- [Accessibility results](accessibility.json)

Regression workflow: `tests/e2e/anatomy-atlas-visual.spec.ts`.
