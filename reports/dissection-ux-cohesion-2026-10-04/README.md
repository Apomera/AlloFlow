# Dissection Lab UX cohesion

The lab can be more cohesive by making phase guidance, action wording, and control behavior follow the same rules. This pass fixes the strongest gaps found in a source review and browser checks. Changes remain unstaged and uncommitted.

## Findings and changes

| Gap | Change | Effect |
| --- | --- | --- |
| Opening Study made all earlier phases look completed, even on a fresh specimen. | The phase guide highlights one current phase and leaves the other five neutral. | Route position is distinct from earned inspection, technique, and evidence progress. |
| A button saying “Change to dorsal view” only opened the view chooser. | Both Guided and Identify setup actions now say “Choose dorsal view,” or the relevant view. | The wording matches the action; the learner still chooses the view. |
| Canvas camera controls used 36px targets and small context labels beside newly refined controls. | A named “Specimen view” group, zoom labels, grouped percentage readout, 48px targets, readable stage context, and consistent focus/reflow. | Whole-specimen zoom and movement have one clear place and remain distinct from lens magnification. |
| Reset view removed its own focused button on reaching 100%. | Reset remains available at 100%. | Keyboard focus stays on the control after resetting. |
| Mission Continue remained enabled while the matching primary action was busy. | Continue shares the pending disabled state and label; the shared handler returns during the animation. | Repeated activation preserves the pending transition instead of restarting it. |

Neutral phases now have solid backgrounds. The mission's empty decorative overlay was removed so its phase contrast can be assessed. Numbered circles, phase order, current-phase semantics, instrument choices, and evidence rules remain intact.

## What already fits together

One action model supplies the main action card, phase position, stage handoff, and fullscreen handoff. Planning and Guided checks preserve the learner's choices instead of recording work through navigation. The action shelves and specimen camera controls now share readable text, 48px targets, inset focus, and layouts based on the lab's available width.

## Next priorities

1. **Optical inspection:** give Focus and Magnify separate named groups, bring its current 32px targets and small captions to the shared pattern, and clarify that lens magnification changes local detail. Verify lens changes preserve specimen camera position and learning evidence.
2. **Navigation wording:** standardize “Focus the specimen,” “View specimen,” and “Go to specimen” where all three focus the same canvas. Keep framing and direct technique verbs for their actual effects.
3. **Systems and physiology:** refine that disclosure's smaller controls and playback states using the same readable targets and selected-state cues. Preserve the distinction between a preserved specimen and an in-life model.

These are contained follow-ups. The route structure can stay; the larger benefit comes from making each control's name, state, and result agree.

## Validation

- **13 browser checks passed** on the final renderer and final regression spec; one worker, no retries, failures, or skipped cases.
- **197 focused unit tests passed**, including a strengthened real deferred-transition fixture. Repeated native clicks and the pending callback preserve the timer/start time, then the layer reveals and awards XP once. Sibling-lab timer isolation remains covered.
- **Six scoped accessibility audits found zero automated violations.** Each audit has five explicit contrast review items for non-text Unicode symbols: four pan arrows and the decorative handoff glyph. **All 30 icon instances passed a separate recorded contrast check of at least 3:1** against their actual opaque background. The raw incomplete results remain available; they are not counted as automatic passes.
- Camera zoom, pan, reset, framing, focus retention, text spacing, narrow embedded layouts, high contrast, forced colors, assessment restrictions, fresh Study, return to Reveal, and both view-chooser branches are covered. Saved notes, confidence, procedure work, scores, and Guided position are preserved by the relevant actions.
- Renderer copies match, parse, and keep LF endings. All 18 edits reverse exactly to the starting renderer. The two extended unit fixtures also reverse exactly to their starting content.

## Visual review

| Layout | Camera before | Camera after | Stage context after |
| --- | --- | --- | --- |
| phone | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/before-phone-camera.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-phone-camera.png) | [Context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-phone-context.png) |
| tablet | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/before-tablet-camera.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-tablet-camera.png) | [Context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-tablet-context.png) |
| desktop | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/before-desktop-camera.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-desktop-camera.png) | [Context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-desktop-context.png) |
| embedded-medium | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/before-embedded-medium-camera.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-embedded-medium-camera.png) | [Context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-embedded-medium-context.png) |
| embedded-large | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/before-embedded-large-camera.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-embedded-large-camera.png) | [Context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-embedded-large-context.png) |
| forced-colors | [Before](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/before-forced-colors-camera.png) | [After](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-forced-colors-camera.png) | [Context](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/after-forced-colors-context.png) |

[Fresh Study phase guide](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/fresh-study-phases.png) · [Return to Reveal](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/return-phases.png) · [Text spacing and focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/camera-text-spacing.png) · [Guided view chooser](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/choose-guided-view.png) · [Identify view chooser](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/choose-identify-view.png)

## Provenance

The baseline captures and two earlier incomplete validation attempts are retained. The baseline captured all six layouts; its skipped behavior tests hit a teardown issue that was corrected. The first canonical run exposed contrast incompletes from the mission decoration. Removing it resolved those; the second run exposed the five Unicode-symbol review items per layout. The final spec records those precise manual checks. Only the final complete run is counted above.

Starting renderer: `c6de388c0ba89549aca25b045fbf2feca63ef21e6a332dc0ef95305b83f50a7e`

Final renderer: `5341b12917c5784bc7d78ca4dc7f04d9ab364658d2a2ff678ad2c5d16199d722`

[Verification and contrast details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/verification.json) · [Reversible source edits](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/source-edit.json) · [Final browser metadata](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/final-reviewed/attempt.json) · [Final browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/final-reviewed/results.json) · [Unit results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-ux-cohesion-2026-10-04/unit/results.json) · [Browser regression spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-ux-cohesion.spec.ts)
