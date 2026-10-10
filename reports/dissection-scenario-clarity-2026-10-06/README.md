# Dissection Lab: clearer technique challenges

Updated October 6, 2026. Changes remain uncommitted.

## What changed

- The **4-minute technique challenge** now has a distinct name and current-layer objective. Study keeps its separate two-minute identification practical.
- Scenario selection explains that it uses the current technique record, can adjust the view or field, and starts the timed challenge immediately.
- Restart opens a review that names the affected layer and specimen. Keeping the current attempt or pressing Escape preserves work; confirmation applies the original native reset.
- The timer distinguishes not started, running, expired and time remaining at completion. An unstarted clock can begin on the current attempt. An expired challenge has a next-action route to review restart options.
- Readable text, larger controls, visible focus and clear state cues follow the Lab/Study/View styling. The console reflows in embedded widths and supports large text, high contrast and forced colors.

## Validation

279 scoped unit checks and 40 current browser cases passed. Six baseline layouts use the saved pre-edit renderer.

| Check | Passed | Evidence |
| --- | ---: | --- |
| baseline | 6 | [Results](baseline-2/results.json), [run](baseline-2/run.json) |
| scenario | 11 | [Results](scenario-7/results.json), [run](scenario-7/run.json) |
| unit-main | 278 | [Results](unit-main-7/results.json), [run](unit-main-7/run.json) |
| unit-axe | 1 | [Results](unit-axe-7/results.json), [run](unit-axe-7/run.json) |
| study | 12 | [Results](study-7/results.json), [run](study-7/run.json) |
| view | 17 | [Results](view-7/results.json), [run](view-7/run.json) |

Seven scoped accessibility audits reported zero violations. Five contrast checks needed manual review because the select uses an SVG arrow background. Text contrast measures 13.45:1 and arrow contrast 7.58:1; raw incomplete results and the [manual review](reviews/visual-review.json) are retained in the report. Full results are listed in the [validation summary](validation-summary.json). Study and View browser workflows ran against the final source.

## Before and after

| Layout | Baseline | Updated |
| --- | --- | --- |
| phone | [Before](baseline-2/captures/before-phone-scenario.png) | [After](scenario-7/captures/after-phone-scenario.png) |
| tablet | [Before](baseline-2/captures/before-tablet-scenario.png) | [After](scenario-7/captures/after-tablet-scenario.png) |
| desktop | [Before](baseline-2/captures/before-desktop-scenario.png) | [After](scenario-7/captures/after-desktop-scenario.png) |
| embedded-medium | [Before](baseline-2/captures/before-embedded-medium-scenario.png) | [After](scenario-7/captures/after-embedded-medium-scenario.png) |
| embedded-large-contrast | [Before](baseline-2/captures/before-embedded-large-contrast-scenario.png) | [After](scenario-7/captures/after-embedded-large-contrast-scenario.png) |
| forced-colors | [Before](baseline-2/captures/before-forced-colors-scenario.png) | [After](scenario-7/captures/after-forced-colors-scenario.png) |

## Preservation

Source and public mirror match. Exact inverse edits recover the previous renderer and unit bytes. Eight protected test inputs remain unchanged. The existing Canvas expiry assertion received only the two updated message prefixes; its zero-time guard and gesture cancellation checks are preserved and its exact inverse recovers the baseline. All 303 files from the previous View report remain unchanged. HEAD and staging match the baseline. Only this task's handoff row was completed. Nothing was staged, committed, pushed or deployed.

[Source edits](edits/renderer-edits.json) · [unit edits](edits/unit-edits.json) · [Canvas assertion edit](edits/canvas-loop-edits.json) · [apply receipt](edits/apply-receipt.json) · [visual and contrast review](reviews/visual-review.json) · [native preservation review](reviews/native-preservation-review.json) · [native function audit](reviews/native-audit.json)
