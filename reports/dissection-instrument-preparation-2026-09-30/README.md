# Dissection Lab: instrument preparation

September 30, 2026

## What changed

Instrument choice now comes before the active-tool instructions, readiness checks, and calibration. The seven tool cards have readable names, state text, and gesture cues. Separate **Selected** and **Next step** markers show both states when the selected instrument is also needed next.

Supporting text is at least 14px, names use 15.2px, and the large text setting uses 16px. Cards are at least 104px tall and wrap long names and state text. Readiness checks show their full text, and calibration guidance, output, and status have enough room to read at narrow widths. Layout follows the lab's available width, including a 320px lab inside a wide window.

Two preparation shortcuts move focus to **Adjust calibration** or **Go to specimen**. They leave instrument settings and technique progress untouched. Calibration changes still require direct input on the slider. The shortcuts stay hidden during quiz and practical modes.

The existing radio-group behavior remains: arrow keys select an available instrument, Home selects the first, and End selects the last. Restricted tools remain disabled and are skipped. Modified keys and input-method composition events retain their normal behavior.

Interface additions use the existing translation key and English fallback pattern. Both renderer copies contain the same implementation.

## Visual review

| Layout | Tool tray | Readiness | Calibration |
| --- | --- | --- | --- |
| Phone, 320px | [Before](before-tray-phone.png) · [After](after-tray-phone.png) | [Before](before-readiness-phone.png) · [After](after-readiness-phone.png) | [Before](before-calibration-phone.png) · [After](after-calibration-phone.png) |
| Tablet, 768px | [Before](before-tray-tablet.png) · [After](after-tray-tablet.png) | [Before](before-readiness-tablet.png) · [After](after-readiness-tablet.png) | [Before](before-calibration-tablet.png) · [After](after-calibration-tablet.png) |
| Embedded, 320px with large text and high contrast | [Before](before-tray-embedded-large.png) · [After](after-tray-embedded-large.png) | [Before](before-readiness-embedded-large.png) · [After](after-readiness-embedded-large.png) | [Before](before-calibration-embedded-large.png) · [After](after-calibration-embedded-large.png) |
| Desktop, 1180px lab | [Before](before-tray-desktop.png) · [After](after-tray-desktop.png) | [Before](before-readiness-desktop.png) · [After](after-readiness-desktop.png) | [Before](before-calibration-desktop.png) · [After](after-calibration-desktop.png) |
| Forced colors, 390px | [Before](before-tray-forced-colors.png) · [After](after-tray-forced-colors.png) | [Before](before-readiness-forced-colors.png) · [After](after-readiness-forced-colors.png) | [Before](before-calibration-forced-colors.png) · [After](after-calibration-forced-colors.png) |
| Restricted tray, 390px | [Before](before-tray-restricted.png) · [After](after-tray-restricted.png) | [Before](before-readiness-restricted.png) · [After](after-readiness-restricted.png) | [Before](before-calibration-restricted.png) · [After](after-calibration-restricted.png) |

Screenshots put the floating next-action card into document flow for component capture only. This capture style does not change the application.

The first visual and accessibility review caught a pale gesture hint on the newly light selected-card background. The final style gives it readable contrast. The first browser report is retained as `browser-first-results.json`; that run also reported a missing trace artifact and timed out during failure handling. The final run uses a separate artifact output directory.

The main browser run passed eleven scenarios. Its practical fixture omitted the required deadline, so the lab ended that practical and restored the exploration controls. The corrected fixture includes a future deadline and checks that the practical is still active before verifying shortcut exclusion. That scenario is verified separately in `practical-results.json`, with the application source unchanged from the main browser run.

A regression run reported an error in the first reference test's setup hook. All 149 reference checks then passed when run separately. The setup report is retained as `unit-setup-results.json`; the final combined run uses a separate worker process and a 60-second setup-hook limit.

## Verification scope

Final results: **12 browser scenarios verified** across eleven passes in the main run and one pass with the corrected practical fixture. All **6 WCAG AA checks** passed. The final combined regression run passed **258 checks** with no failures. Both renderer copies are byte-identical, JavaScript syntax is valid, and scoped whitespace checks pass. See [verification.json](verification.json).

- Six layouts: unchanged accessible names and access state, readable text, card sizes, wrapping, visible focus, retained evidence, and WCAG AA checks with axe.
- Both preparation shortcuts: move focus without performing a technique action or changing calibration.
- Deliberate slider adjustment: changes the selected calibration setting while preserving evidence and technique progress.
- Restricted keyboard selection: skips the unavailable dropper and wick.
- Modified and composing keyboard events: preserve focus and selection.
- Quiz and practical modes: preparation shortcuts remain absent.
- Existing renderer, workspace, and reference workbench regressions.

Before/after inventory files record each instrument's accessible name, availability, selection, next-step status, readiness, and keyboard entry point. Layout measurements, browser results, unit results, and final source verification are saved beside this report.

Changes remain uncommitted.
