# Dissection Lab: clearer View controls

Updated October 6, 2026. Changes remain uncommitted.

## What changed

- Specimen display now has four named sections: **Anatomy and presentation**, **Local inspection**, **Scene and landmarks**, and **Reference and variation**. Native control order and visibility stay intact.
- Presentation help explains Guided, Realistic and Accessible effects. Essentials guidance identifies settings that use the default display.
- Split comparison explains the saved-frame requirement and identifies the native selected or fallback reference. Lens pinning and tissue display have purpose cues.
- View uses the same readable text sizes, strong selected borders and underlines, and inset keyboard focus as Lab and Study. Cards reflow with the lab's available width and support high contrast and forced colors.
- The next-action prompt now explains when a selected structure has no mapped cross-specimen reference.
- Printed reports hide the View controls after fixing an existing grid/print style conflict. Returning to the screen preserves the controls and their selected states.

## Validation

261 scoped unit checks and 40 current browser cases passed. Six baseline layouts use the saved pre-edit renderer.

| Check | Passed | Evidence |
| --- | ---: | --- |
| baseline | 10 | [Results](baseline-1/results.json), [run](baseline-1/run.json) |
| view | 17 | [Results](view-3/results.json), [run](view-3/run.json) |
| unit-main | 260 | [Results](unit-main-3/results.json), [run](unit-main-3/run.json) |
| unit-axe | 1 | [Results](unit-axe-3/results.json), [run](unit-axe-3/run.json) |
| study | 12 | [Results](study-3/results.json), [run](study-3/run.json) |
| tools | 11 | [Results](tools-3/results.json), [run](tools-3/run.json) |

Earlier browser runs exposed a fixture assumption about practical panel transitions and the existing View grid/print style conflict. The corrected fixture follows native Accessibility, Study and View transitions while retaining assessment, restoration and work-preservation assertions. The print assertion remains unchanged. Failed-run evidence and exact corrections remain archived.

Complete accessibility audits and any checks needing manual review are saved in the [validation summary](validation-summary.json). The previous Study and Tools workflows were rerun against the final source.

## Before and after

| Layout | Baseline | Updated |
| --- | --- | --- |
| phone | [Before](baseline-1/captures/before-phone-view.png) | [After](view-3/captures/after-phone-view.png) |
| tablet | [Before](baseline-1/captures/before-tablet-view.png) | [After](view-3/captures/after-tablet-view.png) |
| desktop | [Before](baseline-1/captures/before-desktop-view.png) | [After](view-3/captures/after-desktop-view.png) |
| embedded-medium | [Before](baseline-1/captures/before-embedded-medium-view.png) | [After](view-3/captures/after-embedded-medium-view.png) |
| embedded-large-contrast | [Before](baseline-1/captures/before-embedded-large-contrast-view.png) | [After](view-3/captures/after-embedded-large-contrast-view.png) |
| forced-colors | [Before](baseline-1/captures/before-forced-colors-view.png) | [After](view-3/captures/after-forced-colors-view.png) |

## Preservation

Source and public mirror match. The [native control proof](edits/native-control-proof.json) compares every original control property, handler and child in order. Exact inverse edits recover the previous renderer and unit bytes. Eight protected test inputs and 213 entries from the previous Study report remain unchanged. Only this task's handoff row was completed. Nothing was staged, committed, pushed or deployed.

[Source edits](edits/renderer-edits.json) · [unit edits](edits/unit-edits.json) · [independent review](edits/view-independent-review.json) · [visual review](edits/view-visual-review.json)
