# Dissection Lab: layer navigation

September 30, 2026

## What changed

The layer navigator now states **Current**, **Revealed**, **Available**, or **Locked** in readable text. Revealed layers are counted as revealed rather than completed. Locked cards name the preceding layer to reveal, and the current card states whether it is awaiting reveal.

Names can wrap, supporting text is at least 14px, and the large text setting uses 16px. Locked cards retain full text contrast with a dashed border. Current cards have an underline as well as their color and border. The layout follows the lab's available width, including a narrow lab embedded in a wide window.

Use **Left / Right**, **Home**, or **End** to move focus between available layers. **Enter** selects the focused layer through the existing access checks. Browsing with navigation keys preserves the current specimen, layer, evidence, scores, and reveal progress. Modified keys and composition events keep their normal behavior.

During assessment, every layer button remains disabled. The scroll strip is now a named, focusable region so keyboard users can read all the layer states while the current question stays stable. The first accessibility run identified this gap; the final implementation adds access to the scroll region.

The keyboard event check also caught React's composition flag on the native event. The final guard checks that flag and the input-method key code before moving focus. The earlier browser runs are retained as `browser-first-results.json` and `browser-second-results.json`.

New interface strings use the existing translation key and English fallback pattern.

## Visual review

| Layout | Before | After |
| --- | --- | --- |
| Phone, 320px | [Before](before-phone.png) | [After](after-phone.png) |
| Tablet, 768px | [Before](before-tablet.png) | [After](after-tablet.png) |
| Embedded, 320px with large text and high contrast | [Before](before-embedded-large.png) | [After](after-embedded-large.png) |
| Desktop, 1180px lab | [Before](before-desktop.png) | [After](after-desktop.png) |
| Forced colors, 390px | [Before](before-forced-colors.png) | [After](after-forced-colors.png) |
| Assessment, 390px | [Before](before-assessment.png) | [After](after-assessment.png) |

[Long layer names and prerequisites](long-names.png) · [Keyboard focus during assessment](focus-assessment.png)

Screenshots put the floating next-action card into document flow for component capture only. This capture style does not change the application.

## Verification scope

Final results: **9 browser scenarios passed**, including **6 WCAG AA checks**, and **258 focused regression checks passed**. The final browser run had no failed, skipped, or flaky scenarios. Both renderer copies are byte-identical, their JavaScript syntax is valid, and scoped whitespace checks pass. See [verification.json](verification.json).

- Six responsive and assessment layouts: unchanged access permissions, complete labels, text sizes, card sizes, keyboard focus, and WCAG AA checks with axe.
- Explicit keyboard activation: selects an available layer without revealing it or changing learning evidence.
- Long specimen names and prerequisite messages: fit a 320px embedded lab.
- Modified and composition keys: do not trigger layer browsing.
- Existing renderer, workspace, and reference workbench regression checks.

The six before/after inventories preserve accessible names, disabled states, current-layer state, and access state. Measurement JSON files record each final layout. Browser results, unit results, and final source verification are saved beside this report.

Changes remain uncommitted.
