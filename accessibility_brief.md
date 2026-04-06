# AlloFlow Accessibility Conformance Brief
## Symbol Studio AAC Board Export — Self-Assessment Against WCAG 2.1 Level AA

**Prepared:** April 2, 2026
**Platform:** AlloFlow v2.0 (Symbol Studio Module)
**Scope:** Standalone HTML AAC Communication Board Export
**Standard:** WCAG 2.1 Level AA (Web Content Accessibility Guidelines)
**Assessment Type:** Developer Self-Assessment — Independent Validation Welcome
**Interactive Demo:** [apomera.github.io/AlloFlow/accessibility_demo.html](https://apomera.github.io/AlloFlow/accessibility_demo.html)
**Full Platform VPAT:** See [VPAT-2.5-WCAG-AlloFlow.md](VPAT-2.5-WCAG-AlloFlow.md)

---

## Summary

AlloFlow's Symbol Studio produces standalone HTML communication boards that can be opened in any browser without the AlloFlow application. These boards are the primary assistive tool for non-verbal students served by the platform. As of April 2, 2026, the export has been rebuilt to meet WCAG 2.1 Level AA conformance across all applicable success criteria.

**Who these boards serve:**
- A student with cerebral palsy who communicates with a single head switch — scanning mode lets her build sentences independently
- A student whose family speaks Arabic — the board exports with `dir="rtl"`, translated labels, and reversed arrow keys
- A student with low vision — high contrast mode, 44px targets, and Atkinson Hyperlegible font let her find symbols independently

This document maps each relevant criterion to the specific implementation. We welcome independent evaluation, and are seeking partnership with accessibility organizations to validate these claims through expert testing and real-user feedback.

---

## Perceivable

| Criterion | Level | Status | Implementation |
|---|---|---|---|
| 1.1.1 Non-text Content | A | **Supports** | Every symbol image has descriptive `alt` text combining the symbol label and its contextual description (e.g., `alt="happy: feeling joyful"`). Decorative images in the sentence strip use `alt=""`. |
| 1.3.1 Info and Relationships | A | **Supports** | Semantic HTML5 landmarks (`<header>`, `<main>`, `<footer>`, `<nav>`). ARIA grid pattern (`role="grid"`, `role="gridcell"`) for the symbol board. Tab pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`) for multi-page boards. `role="log"` with `aria-live` on the sentence strip. |
| 1.3.2 Meaningful Sequence | A | **Supports** | DOM order matches visual order. Reading order is logical when linearized. |
| 1.3.4 Orientation | AA | **Supports** | No orientation restrictions. Board is responsive and works in portrait or landscape. |
| 1.4.1 Use of Color | A | **Supports** | Category colors on cells are supplemented by text labels. The scanning highlight uses both color (yellow border) and scale transform. High contrast mode available. |
| 1.4.3 Contrast (Minimum) | AA | **Supports** | Primary text (#1f2937) on light backgrounds exceeds 4.5:1. White text on purple header exceeds 5.3:1. High contrast mode provides maximum contrast (white on black). |
| 1.4.5 Images of Text | AA | **Supports** | No images of text. All labels are rendered as HTML text. Symbol images are illustrations, not text. |
| 1.4.11 Non-text Contrast | AA | **Supports** | Cell borders (2px solid) provide 3:1+ contrast against backgrounds. Focus indicators (3px solid #4f46e5) provide strong contrast. Scanning highlight (4px solid #facc15) is highly visible. |
| 1.4.13 Content on Hover or Focus | AA | **N/A** | No content appears on hover or focus (tooltips, popups). |

## Operable

| Criterion | Level | Status | Implementation |
|---|---|---|---|
| 2.1.1 Keyboard | A | **Supports** | Full keyboard operation: Arrow keys navigate the grid, Enter/Space activates cells, S toggles scanning, H toggles high contrast, ? shows help, Backspace deletes last word, Delete clears message. Tab reaches all controls. |
| 2.1.2 No Keyboard Trap | A | **Supports** | No keyboard traps. Tab/Shift+Tab moves through all focusable elements. Escape exits scanning mode. |
| 2.4.1 Bypass Blocks | A | **Supports** | Skip-to-content link (`<a href="#board-main" class="skip-link">Skip to communication board</a>`) visible on focus. |
| 2.4.2 Page Titled | A | **Supports** | Descriptive `<title>` element: "[Board Name] — AAC Communication Board". |
| 2.4.3 Focus Order | A | **Supports** | Focus order is logical: skip link → header controls → sentence strip → board grid. Roving tabindex ensures only the active grid cell is in the tab order. |
| 2.4.6 Headings and Labels | AA | **Supports** | Single `<h1>` in header with board title. `<h2>` in help panel for keyboard shortcuts. All form controls (`<select>`, `<button>`) have descriptive `aria-label` attributes. |
| 2.4.7 Focus Visible | AA | **Supports** | 3px solid outline with 2px offset and box-shadow glow on all focusable elements. Custom `:focus-visible` styles ensure focus is never hidden. |
| 2.5.1 Pointer Gestures | A | **Supports** | All actions use single-point activation (tap/click). No multi-point or path-based gestures. |
| 2.5.5 Target Size | AAA | **Supports** | All interactive elements have minimum 44x44px dimensions (`min-height: 44px; min-width: 44px`). Grid cells are 72px+ tall. |

## Understandable

| Criterion | Level | Status | Implementation |
|---|---|---|---|
| 3.1.1 Language of Page | A | **Supports** | `<html lang="[code]">` dynamically set from board language (supports 14 languages). `dir="rtl"` for Arabic. |
| 3.1.2 Language of Parts | AA | **N/A** | Board content is in a single language. Multilingual boards show translated label prominently with original in secondary text, both in the same `lang` context. |
| 3.2.1 On Focus | A | **Supports** | No context changes on focus. Focus changes are user-initiated. |
| 3.3.1 Error Identification | A | **N/A** | No form submission or error states in the board export. |

## Robust

| Criterion | Level | Status | Implementation |
|---|---|---|---|
| 4.1.2 Name, Role, Value | A | **Supports** | All interactive elements have programmatically determinable names via `aria-label`. ARIA roles correctly applied: `grid`, `gridcell`, `tab`, `tabpanel`, `log`, `status`, `button`, `region`, `banner`, `main`, `contentinfo`. |
| 4.1.3 Status Messages | AA | **Supports** | Sentence strip uses `aria-live="polite"` with `role="log"`. Dedicated status region (`role="status"`, `aria-live="assertive"`, `aria-atomic="true"`) announces state changes: symbol selection, scanning start/stop, high contrast toggle. |

---

## Additional Accessibility Features (Beyond WCAG 2.1 AA)

### Built-in Scanning Mode
The standalone HTML export includes a complete switch-access scanning system — no additional software or app required:
- **Automatic scanning (1-switch):** Cells highlight sequentially at configurable speed (1-4 seconds). Press Space or Enter to select.
- **Manual scanning (2-switch):** Tab/ArrowRight to advance, Space/Enter to select.
- Scanning mode is toggled with the S key or on-screen button.
- Status bar shows current mode and speed controls.

### High Contrast Mode
Toggle with H key or on-screen button. Inverts to white-on-black with yellow highlights for maximum visibility.

### OS Preference Support
- `prefers-reduced-motion: reduce` — disables all animations and transitions
- `forced-colors: active` — respects Windows High Contrast Mode, using system colors
- `prefers-color-scheme: dark` — automatic dark mode adaptation

### Print Optimization
`@media print` stylesheet hides interactive controls and produces a clean grid of symbols with labels, suitable for laminating.

### RTL Language Support
For Arabic and Hebrew boards: `dir="rtl"` on `<html>`, reversed arrow key navigation (ArrowRight moves left), right-aligned controls and text.

### Embedded Accessibility Statement
Every exported board includes a visible accessibility statement documenting available access methods and WCAG features, with `role="note"` and `aria-label` for screen readers.

---

## In-App AAC Mode Accessibility

In addition to the exported boards, the in-app AAC communication mode includes:
- **ARIA grid pattern** with keyboard navigation (arrow keys, Enter/Space)
- **Two-switch scanning overlay** with configurable speed
- **IEP goal tracking** wired to every communication touchpoint (expressive trials on symbol selection, receptive trials on Symbol Quest answers)
- **Communication log** with CSV export for SLP data collection

---

## Platform-Wide Accessibility Infrastructure

AlloFlow's Document Builder includes:
- **Live WCAG 2.1 AA audit** combining Gemini AI analysis with axe-core automated checking
- **Accessibility Inspector overlay** for heading hierarchy, alt text, ARIA labels, and table structure
- **6 export themes** including High Contrast (Atkinson Hyperlegible font)
- **Semantic HTML** with landmarks, skip links, and proper heading hierarchy in all generated documents
- **Audio embedding** for read-aloud support

---

## What We're Seeking

1. **Independent validation** of these accessibility claims through expert manual testing
2. **Real-user feedback** through usability testing with people who use assistive technology (e.g., AccessWorks)
3. **Guidance** on areas we may have missed or implemented incorrectly
4. **A formal Accessibility Conformance Report (ACR)** based on your testing, which school districts can reference during procurement

We want the work to actually be right. Not a rubber stamp — real scrutiny from people who understand what accessibility means in practice for real students using real assistive technology.

---

## Related Documents

| Document | Description |
|---|---|
| [Interactive Accessibility Demo](https://apomera.github.io/AlloFlow/accessibility_demo.html) | Live, interactive showcase — try keyboard navigation, scanning modes, high contrast, and screen reader simulation directly in your browser |
| [VPAT 2.5 (Full Platform)](VPAT-2.5-WCAG-AlloFlow.md) | Voluntary Product Accessibility Template covering all 80+ AlloFlow tools against WCAG 2.1 Level A & AA |
| [Letter to Knowbility](letter_to_knowbility.md) | Partnership inquiry letter |

---

**Contact:** Aaron Pomeranz, PsyD — School Psychologist & Creator of AlloFlow
**Platform:** Open-source, privacy-first, FERPA-compliant by architecture
**Deployment:** Firebase Hosting (production) | Docker (air-gapped) | Canvas LMS integration
**Website:** [apomera.github.io/AlloFlow](https://apomera.github.io/AlloFlow/)
