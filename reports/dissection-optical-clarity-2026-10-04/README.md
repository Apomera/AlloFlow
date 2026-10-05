# Dissection Lab optical clarity

Optical inspection now follows the same control pattern as Specimen view and the action shelves: readable text, named groups, large targets, and visible selected and focus states. Changes remain unstaged and uncommitted.

## Changes

- **Focus depth and Lens magnification:** separate named groups with descriptions, native toggle buttons, 48px targets, 16px button text, and 18px text with Larger text enabled. Selected settings have a 3px border and underline. Keyboard focus stays visible inside each button, including high contrast and forced colors.
- **Local detail:** the card explains how the inspection lens and magnified inset relate to Specimen view. Target, ideal depth, illumination, focus quality, and plane counts remain visible. The card fills its available row and stacks its groups in narrow containers.
- **Pinned target:** toolbar cycling now calculates its feedback for the same pinned-first target as the lens and card. Previously, selecting a second structure could make the feedback describe that structure instead.
- **Magnification guidance:** low magnification suitability now recommends the best level in the existing model: surface 2x, structure 4x, deep 6x. Previously, deeper targets at 2x could be told to use lower magnification. Scoring and tissue-depth classification are unchanged.
- **Navigation wording:** Identify, Guided, Compare, and the secondary next-action button use “Go to specimen” for their shared canvas-focus action. Framing remains a separate camera action.
- **Embedded layout:** a scenario panel no longer creates an implicit extra grid track in narrow roots. Tissue-meter labels and percentages wrap when larger text needs more room.

## Validation

- **27 browser checks passed:** 14 optical/cohesion checks and 13 existing next-action checks. Both complete runs used the final renderer, one worker, zero retries, and had no failed, skipped, or flaky cases.
- **197 focused unit tests passed**, including the expanded optical grouping/model fixture and existing deferred transition, timer isolation, and evidence coverage.
- **Six scoped optical accessibility audits:** zero violations and zero incomplete checks. These audits cover the optical card, not the entire app.
- Tab, Enter, Space, selected-state semantics, pin identity, camera position, calibration, procedure work, notes, confidence, verification, scores, evidence, and Guided position are covered. Inset-only activation, assessment restrictions, Essentials visibility, embedded resizing, larger text, text spacing, high contrast, and forced colors are included.
- Both renderer copies match, parse, and retain LF endings. All 14 source edits and the two changes to existing tests reverse exactly to their starting content.

## Visual review

| Layout | Before | After |
| --- | --- | --- |
| phone | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/before-phone.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/after-phone.png) |
| tablet | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/before-tablet.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/after-tablet.png) |
| desktop | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/before-desktop.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/after-desktop.png) |
| embedded-medium | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/before-embedded-medium.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/after-embedded-medium.png) |
| embedded-large | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/before-embedded-large.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/after-embedded-large.png) |
| forced-colors | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/before-forced-colors.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/after-forced-colors.png) |

[Text spacing and focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/text-spacing.png) · [Pinned target](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/pinned-target.png) · [Deep magnification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/deep-magnification.png)

## Next opportunity

The systems and physiology disclosure remains the strongest next cohesion opportunity: readable controls, clearer playback states, and consistent selected-state feedback while preserving the distinction between a preserved specimen and the in-life model.

## Provenance

The first baseline attempt did not open the technique disclosure and its six captures failed. The corrected baseline captured all six layouts. An early canonical attempt stopped after four passes and the first embedded-grid failure when its execution session became unavailable; it is retained as incomplete. The next complete attempt passed 11 cases and exposed the neighboring tissue-meter overflow and forced-colors border reset. A three-case diagnostic run recorded the exact overflow element. Only final-complete and navigation are counted as passing browser runs above.

Starting renderer: `5341b12917c5784bc7d78ca4dc7f04d9ab364658d2a2ff678ad2c5d16199d722`

Final renderer: `c3ba3189fce6d0bd1eda77179c2c8345e7fa970817391925ac83080e45c5e17c`

[Verification](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/verification.json) · [Initial source edits](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/source-edit.json) · [Grid correction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/grid-edit.json) · [Final CSS corrections](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/polish-edit.json) · [Existing test edits](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/test-edits.json) · [Final browser attempt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/final-complete/attempt.json) · [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/final-complete/results.json) · [Navigation results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/navigation/results.json) · [Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-optical-clarity-2026-10-04/unit/results.json)
