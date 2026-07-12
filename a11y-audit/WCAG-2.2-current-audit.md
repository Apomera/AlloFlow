# AlloFlow WCAG 2.2 AA Current Audit

**Audit date:** July 11, 2026
**Engineering target:** WCAG 2.2 Level A and AA
**DOJ Title II regulatory baseline:** WCAG 2.1 Level A and AA

## Scope and interpretation

This report evaluates the current local desktop command center and the bundled AlloFlow application shell. The May 2026 VPAT was used as historical context, not as evidence of current conformance. Automated results apply only to the rendered states and viewports listed below. They do not establish full-product conformance across every tool, modal, generated output, assistive technology, or user workflow.

## Methods

- axe-core 4.12 through the repository's Puppeteer audit harness, with WCAG 2.0, 2.1, and 2.2 Level A/AA tags.
- Custom runtime checks for landmarks, bypass navigation, visible focused states, labels, live regions, canvases, and redundant-entry hints.
- Source review and focused Vitest regression tests.
- Reflow probes at 640 CSS pixels (200% equivalent from a 1280px baseline) and 320 CSS pixels (400% equivalent).
- Production desktop rebuilds before rendered application verification.

## Verified results

| Surface/state | Viewport | axe result | Additional result |
|---|---:|---:|---|
| Desktop command center, initial App pane | 1280 x 800 | 0 violations; 44 passes | 72 focusable elements; 0 custom violations |
| Bundled AlloFlow application shell, initial state | 1280 x 800 | 0 violations; 46 passes | 104 focusable elements; 0 custom violations |
| Bundled application, reflow probe | 640 x 800 | 0 violations | No document overflow and no off-screen interactive controls |
| Bundled application, narrow reflow probe | 320 x 800 | 0 violations | No document overflow and no off-screen interactive controls after remediation |

## Remediation completed in this audit

- Upgraded automated axe coverage to include WCAG 2.2 A/AA tags.
- Added rendered checks for application readiness and corrected false-positive focus, hidden-input, dialog, and target-size heuristics.
- Added desktop bypass navigation, named/synchronized tabs, arrow-key tab navigation, visible focus styling, hidden-button behavior, and sufficient contrast.
- Corrected a desktop service-worker scope leak that could serve the command center inside the bundled app route.
- Named the AI backend dialog, removed an interactive modal backdrop, added Escape handling, and corrected reset-button text contrast.
- Added non-empty accessible-name fallbacks for the global mute control.
- Placed application heading, AlloBot, and save/sync status content within appropriate landmarks or live regions.
- Added labeled Move up/Move down alternatives and live position announcements to the draggable timeline editor (WCAG 2.5.7).
- Added labeled Move up/Move down alternatives, keyboard instructions, and live position announcements to draggable Persona blueprint items (WCAG 2.5.7).
- Added bounded arrow-key positioning, Shift-modified larger steps, instructions, and live movement announcements to the draggable AlloBot control (WCAG 2.5.7).
- Added bounded arrow-key positioning, Shift-modified larger steps, accessible instructions, and live movement announcements to draggable stickers, text notes, and voice notes (WCAG 2.5.7).
- Added bounded arrow-key positioning, Shift-modified larger steps, shared instructions, and live movement announcements to visual labels and leader-line anchors (WCAG 2.5.7).
- Enlarged visual-panel drawing colors, animation playback, frame deletion, duplication, and reordering controls to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Enlarged annotation deletion, color, line-width, clear, and template controls to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Enlarged immersive-reader focus, background, and text color controls to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Enlarged teacher-roster group colors and remove-student actions to at least 24 by 24 CSS pixels (WCAG 2.5.8).
- Replaced mouse-only cast-lobby name, role, and appearance editors with named keyboard-operable buttons, preserved name heading structure, and enlarged the remove-character target to 24 by 24 CSS pixels (WCAG 2.1.1, 2.4.7, 2.5.8, 4.1.2).
- Added a named modal dialog, initial focus, focus containment and return, Escape dismissal, keyboard-operable ARIA tabs, and a 24 by 24 animation control to Visual Supports (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).
- Removed invalid image-wrapper and select dialog roles, removed a duplicate accessible name, exposed hidden image actions on focus, enlarged image/phoneme actions to 24 by 24 CSS pixels, and added named non-drag phoneme reorder buttons (WCAG 2.1.1, 2.4.7, 2.5.7, 2.5.8, 4.1.2).
- Added Enter/Space operation and pressed-state exposure to all six Word Sounds source selectors, and removed the disabled lesson-plan selector from sequential focus (WCAG 2.1.1, 2.4.3, 4.1.2).
- Replaced FAQ sentence audio spans with named native buttons and replaced the accordion row containing nested controls with a dedicated 32 by 32 expand/collapse button (WCAG 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).
- Removed focusable button semantics from the Learning Hub and Educator Hub backdrops and added initial dialog focus, Tab containment, Escape dismissal, and trigger focus return (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added a named Kokoro offer dialog with a non-interactive backdrop, initial focus, Tab containment, Escape dismissal, and trigger focus return (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added presentation-only backdrop semantics, initial focus, Tab containment, Escape dismissal, and trigger focus return to the live-session dialog (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added initial focus, Tab containment, Escape dismissal, and trigger focus return to the named Hints dialog (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Removed full-screen button semantics from the Info/About backdrop; named the dialog; added initial focus, Tab containment, Escape dismissal, and focus return; and exposed its five-section selector as an arrow-key-operable ARIA tablist (WCAG 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Added initial focus, Tab containment, Escape dismissal, and focus return to the XP dialog, and exposed its visual level meter as a named progressbar with programmatic bounds and current value (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Replaced nested Study Timer dialogs with one named modal and a presentation-only backdrop; added initial focus, Tab containment, Escape dismissal, and focus return; and exposed remaining time and completion percentage programmatically (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Updated the shared confirmation surface to a named alert dialog that initially focuses Cancel, contains Tab navigation, dismisses with Escape, restores invoking focus, and no longer maps window-level Enter directly to destructive confirmation (WCAG 2.1.1, 2.4.3, 2.4.7, 3.2.2, 4.1.2).
- Added a named and described, focus-contained large-file transcription dialog with Escape and backdrop dismissal disabled consistently while busy, focus return on close, polite processing updates, and a programmatic chunk progressbar (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 3.2.2, 4.1.2).
- Added a named, focus-contained Brand Settings dialog with Escape dismissal and focus return; stacked its three regions for narrow-width reflow; explicitly named editable color, logo, header, and footer fields; exposed invalid color values and live validation; and enlarged profile actions to 24 CSS pixels (WCAG 1.3.1, 1.4.10, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 3.3.1, 3.3.2, 4.1.2).
- Replaced focusable Adventure ledger and inventory backdrops with presentation-only layers; named both dialogs; added stable initial focus, Tab containment, Escape dismissal, focus return, and visible close-button focus indicators; and hid fallback inventory emoji from assistive technology (WCAG 1.1.1, 2.1.1, 2.4.3, 2.4.7, 4.1.2).
- Connected Quick Start Escape dismissal to its existing focus trap; added polite step announcements and programmatic four-step progress; corrected misleading Back and Finish accessible names; and enlarged Skip, help-dismiss, language-remove, and interest-remove targets to at least 24 CSS pixels (WCAG 1.3.1, 2.1.1, 2.4.3, 2.4.7, 2.5.8, 4.1.2).
- Moved Guided Mode full-lesson dialog semantics from the clickable backdrop to the focus-managed panel, connected its accessible name to a real heading, hid the decorative book emoji, and identified the keyboard-scrollable lesson content as a named region while retaining focus containment, Escape dismissal, and focus return (WCAG 1.1.1, 1.3.1, 2.1.1, 2.4.3, 4.1.2).

## Resolved finding

### A11Y-REFLOW-001 - Header controls rendered off-screen at 320 CSS pixels

**WCAG:** 1.4.10 Reflow (Level AA)
**Severity:** High
**Status:** Resolved and rendered-verified July 11, 2026.

The header settings, utility, language, and action clusters now use constrained, wrapping layouts below the small breakpoint. The Source panel action row also wraps its Upload, Load Project, Link, Generate, and Books controls instead of allowing its nested flex rows to exceed the panel width. Required functionality remains visible.

Verification at 320 x 800 CSS pixels found 0 axe WCAG A/AA violations, a 320px document scroll width, and 0 visible interactive controls outside the viewport. The 640px and 1280px checks also remain clean.

## Manual verification still required

- Complete keyboard-only walkthroughs of every major workflow and modal, including focus return and focus-not-obscured checks.
- NVDA + Chrome/Edge and VoiceOver + Safari testing across representative teacher and student workflows.
- Browser-native 400% zoom confirmation and WCAG text-spacing overrides across representative complex tools.
- Dragging alternatives for remaining drag-and-drop interactions beyond the remediated timeline, Persona blueprint, AlloBot, annotation, and visual-label controls (WCAG 2.5.7).
- Authentication flows and third-party identity providers (WCAG 3.3.8).
- Consistent help placement across multi-step processes (WCAG 3.2.6).
- Generated PDFs, documents, media, and AI-created content, which require their own output-level evaluation.

## Conformance statement

The tested initial states have no automated WCAG A/AA violations after remediation. Full WCAG 2.2 AA conformance is **not claimed** because the manual assistive-technology and representative-workflow verification matrix is incomplete.
