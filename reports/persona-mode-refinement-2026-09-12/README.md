# Persona Mode refinement review — September 12, 2026

Implemented a focused pass across single interviews, panel discussions, written responses, and suggested choices.

## Improvements and fixes

- **Panel response switching:** switching from choices to writing now always exposes the composer. Existing suggestions can be shown as optional hints without replacing the writing field. The panel hint toggle now controls their visibility.
- **Turn stability:** both response-format switches are disabled while a reply is pending, preventing a format change from invalidating that turn.
- **Shared submission routing:** panel choices are validated against the panel's choices. Previously, the shared entry point rejected valid panel choices against the single-interview list before routing them.
- **Writing:** both interview types share a visibly labelled multiline composer, mode-specific guidance, and a visible Send question button. Enter sends; Shift+Enter adds a line; IME confirmation and legacy key code 229 do not submit. The existing 2,000-character limit remains enforced.
- **Setup:** mode explanations are visible on phones. Cards fit narrow screens. Selected panelist names, the two-person requirement, and Start stay together in a footer that does not cover the cards.
- **Phone controls:** the single-interview toolbar uses its full available width. Read-aloud, hints, and response-format labels remain visible on phones. The panel hint label has improved text contrast.
- Choice-only recovery remains available when suggestions fail. Scrollable response areas keep long suggestions from consuming the entire conversation view.

## Validation

- **153/153 Persona unit tests passed across 11 files.** Includes a new behavioral regression for shared panel submission. Existing input and toolbar source assertions were updated for the shared composer; the workspace loader assertion now checks the actual CDN-versus-local desktop contract.
- **Nine distinct Chromium cases verified.** The final full run passed eight and found one low-contrast panel hint label. After that correction, both writing cases passed their focused rerun, including accessibility and IME checks.
- Browser coverage includes pending-turn controls, panel format switching with existing suggestions, optional hints, multiline input, IME input, empty-choice recovery, and panel setup at 320, 390, and 1100 pixels.
- The valid-panel-choice routing failure and missing panel composer were reproduced before their fixes.
- Edited sources parse; all three rebuilt modules match their desktop public copies. English string mirrors match. Canonical Persona loader versions were refreshed; desktop loaders remain local. Workspace build freshness and targeted whitespace checks passed.

Evidence: [unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/unit-final.json), [browser run](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/browser-final.log), [final writing and accessibility checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/browser-verification.log), [routing reproduction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/routing-before.log).

## Screenshots

- [Phone panel setup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/browser-tests/persona-refinement-workspa-2e826-l-controls-reachable-at-320/workspace-320.png)
- [Desktop panel setup](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/browser-tests/persona-refinement-workspa-5b0f9--controls-reachable-at-1100/workspace-1100.png)
- [Single-interview writing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/browser-verification/persona-refinement-single--05c09-without-sending-Shift-Enter/single-writing-phone.png)
- [Panel writing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/persona-mode-refinement-2026-09-12/browser-verification/persona-refinement-panel-s-69d21-without-sending-Shift-Enter/panel-writing-phone.png)

Validation uses the shipped workspace and chat renderers with deterministic state, real icons, and controlled callbacks. The browser fixture substitutes panel portrait columns and the harmony meter; unit tests cover the real core handlers with simulated AI responses. This pass did not exercise live AI, portrait generation, voice providers, or classroom services. New guidance is English. Changes are local; nothing was deployed.
