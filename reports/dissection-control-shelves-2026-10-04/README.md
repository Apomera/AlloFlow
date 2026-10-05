# Dissection Lab control shelves

The compact controls and expanded Lab/Study shelves now use larger targets, readable labels, and clear selected states. This pass changes CSS only. Both renderer copies match; all handlers, accessible names, and saved-state logic are unchanged. Changes remain unstaged and uncommitted.

## What improved

- Shelf labels grew from 13px to 14px, or 16px with Larger text. Buttons are at least 48px tall.
- Lab uses four columns and Study three on desktop, two at medium widths, and one at 520px or below. Essentials Study uses two desktop columns. Layout follows the lab's available width, including narrow embedded views.
- Active toggles and expanded triggers use a 3px border and an underline. Disabled annotation clearing remains readable and has a dashed border.
- Keyboard focus uses a 3px inset outline, with contrast checks against the button surface. Reset confirmation fills a grid row and reflows with large text and extra text spacing.
- Essentials, assessment, and print visibility remain intact.

## Validation

- **22 browser checks passed** on the final renderer and standalone regression spec, with one worker and no retries or skipped cases.
- **197 focused unit tests passed**.
- **12 scoped accessibility audits passed**, with zero violations and zero incomplete results.
- All 12 before/after control inventories match, including text, accessible names, pressed/expanded state, disabled state, and visibility.
- Keyboard checks cover toolbar navigation, switching View/Tools, Ruler/Annotate, Flashcard/Compare, the sheep-eye reference, reset cancellation, full-notebook management, and annotation clearing. Saved learning evidence remains intact through the relevant actions.
- Phone, tablet, desktop, narrow embedded, large text, high contrast, forced colors, active practical, print, and text-spacing cases are covered. Source parsing, exact edit reversal, mirror equality, and LF line endings were verified.

Baseline captures and the earlier 22-case validation run are retained as provenance. Only the final standalone run is counted above. Tests use a 1024MB Node heap and no parallel browser workers.

## Visual review

| View | Before | After |
| --- | --- | --- |
| lab-phone | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/before-lab-phone.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/after-lab-phone.png) |
| lab-desktop | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/before-lab-desktop.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/after-lab-desktop.png) |
| lab-embedded-large | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/before-lab-embedded-large.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/after-lab-embedded-large.png) |
| study-phone | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/before-study-phone.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/after-study-phone.png) |
| study-desktop | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/before-study-desktop.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/after-study-desktop.png) |
| study-forced-colors | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/before-study-forced-colors.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/after-study-forced-colors.png) |

[Reset on phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/reset-phone.png) · [Reset with large text](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/reset-embedded-large.png) · [Reset in forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/reset-forced.png) · [Full notebook](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/notebook-full.png) · [Selected Study activity](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/study-selected.png)

## Source integrity

Starting renderer SHA-256: `a6a85471f36a50ca85a45f942e5acea54b6c75197195bcf1465f76713c6061fc`

Final renderer SHA-256: `c6de388c0ba89549aca25b045fbf2feca63ef21e6a332dc0ef95305b83f50a7e`

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/verification.json) · [Reversible CSS insertion](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/source-edit.json) · [Final browser metadata](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/final-standalone/attempt.json) · [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/final-standalone/results.json) · [Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-control-shelves-2026-10-04/unit/results.json) · [Regression spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-control-shelves.spec.ts)
