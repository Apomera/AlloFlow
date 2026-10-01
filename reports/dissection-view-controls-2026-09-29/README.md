# Dissection Lab view controls

September 29, 2026

The expanded view panel now separates controls into four named groups: Accessibility, Specimen display, Lighting and motion, and Workspace actions. Related settings are easier to find, and controls align in a responsive grid that follows the lab's available width.

Buttons use 14-pixel text, at least 48-pixel height, and consistent spacing. Larger-text mode uses 16-pixel button text. Active toggles have a pale teal background, a darker border, and a filled state marker. Inactive toggles have an outlined marker. Keyboard focus and unavailable controls have distinct appearances. High contrast and forced colors retain visible states.

The existing controls, saved notes, assessment restrictions, and interaction handlers are preserved.

## Visual review

| Layout | Previous panel | Updated panel |
| --- | --- | --- |
| Phone, 320 pixels | [Before](before-phone.png) | [After](after-phone.png) |
| Essentials workspace | [Before](before-essentials.png) | [After](after-essentials.png) |
| Narrow embedded lab, larger text and high contrast | [Before](before-embedded-large.png) | [After](after-embedded-large.png) |
| Desktop | [Before](before-desktop.png) | [After](after-desktop.png) |
| Assessment | [Before](before-assessment.png) | [After](after-assessment.png) |
| Forced colors | [Before](before-forced-colors.png) | [After](after-forced-colors.png) |

[Keyboard focus and selected state](focus-phone.png)

Panel screenshots temporarily place the floating status bar in normal document flow so it does not overlap the captured panel. This adjustment applies only during screenshot capture.

## Verification

All 17 Chromium scenarios passed: six view-control layouts, five notebook layouts, and six responsive-workspace layouts. The view-control checks compare each control's identity, visibility, disabled state, and pressed state against the original panel. They also measure typography, touch target size, and overflow; exercise sound toggling and illumination adjustment by keyboard; and retain saved notes. All six view-control layouts passed automated accessibility checks.

All 109 focused regression checks passed. Both renderer copies are identical and pass JavaScript syntax and scoped whitespace checks. The six view-control scenarios also passed again when refreshing the review screenshots.

Results are recorded in [verification.json](verification.json), [browser-results.json](browser-results.json), [unit-results.json](unit-results.json), and [screenshot-results.json](screenshot-results.json).

All changes remain uncommitted.
