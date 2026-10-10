# Dissection Lab: clearer Study activity choices

Updated October 5, 2026. Changes remain uncommitted.

## What changed

- Study tools separates **Review and compare** from **Timed identification**, with a visible purpose beside every activity.
- Comparison guidance distinguishes available reference mappings, unmapped structures, and no selection.
- The practical shows its two-minute duration, readiness based on the native visible-structure pool and layer-transition guard, and explicit start/end labels. Its existing timer is now visible and retains silent updates for screen readers.
- Cards respond to the lab's available width; text, selected states, keyboard focus, high contrast and forced colors remain readable. Essentials keeps its untimed study activities.

Native click handlers and focus handoffs are preserved exactly. Starting a practical retains its existing intentional assessment reset; observation notes, verification, procedure work and visual evidence stay protected.

## Validation

249 scoped unit checks and 23 current browser cases passed. Six baseline layouts were captured through the local harness using the saved pre-edit renderer.

| Check | Passed | Evidence |
| --- | ---: | --- |
| baseline | 6 | [Results](baseline-1/results.json), [run](baseline-1/run.json) |
| study | 12 | [Results](study-3/results.json), [run](study-3/run.json) |
| unit-main | 248 | [Results](unit-main-3/results.json), [run](unit-main-3/run.json) |
| unit-axe | 1 | [Results](unit-axe-3/results.json), [run](unit-axe-3/run.json) |
| tools | 11 | [Results](tools-3/results.json), [run](tools-3/run.json) |

Earlier browser runs exposed fixture assumptions about the conditional directory, keyboard focus modality, and the CSS grid span property. The corrected fixture uses native directory navigation, explicit keyboard input and the computed grid start while retaining target, focus and work-preservation assertions. Earlier failed-run evidence remains archived.

Native checks cover Flashcard/Compare keyboard transitions, empty and unmapped comparisons, practical readiness and guards, a frozen 120-second deadline and target set, the visible live-off timer, ending the practical, and Essentials/eye/assessment visibility. Existing Tools workflows verify the previous visual and fresh-PNG enhancements. [Accessibility results](validation-summary.json) retain complete audit outputs and any checks requiring manual review.

## Before and after

| Layout | Baseline | Updated |
| --- | --- | --- |
| phone | [Before](baseline-1/captures/before-phone-study.png) | [After](study-3/captures/after-phone-study.png) |
| tablet | [Before](baseline-1/captures/before-tablet-study.png) | [After](study-3/captures/after-tablet-study.png) |
| desktop | [Before](baseline-1/captures/before-desktop-study.png) | [After](study-3/captures/after-desktop-study.png) |
| embedded-medium | [Before](baseline-1/captures/before-embedded-medium-study.png) | [After](study-3/captures/after-embedded-medium-study.png) |
| embedded-large-contrast | [Before](baseline-1/captures/before-embedded-large-contrast-study.png) | [After](study-3/captures/after-embedded-large-contrast-study.png) |
| forced-colors | [Before](baseline-1/captures/before-forced-colors-study.png) | [After](study-3/captures/after-forced-colors-study.png) |

## Preservation

Source and public mirror match. Exact inverse edits recover the earlier renderer and unit bytes. 195 entries from the previous Tools report and six protected test inputs remain unchanged. Only this task's handoff row was completed. Nothing was staged, committed, pushed or deployed.

[Validation summary](validation-summary.json) · [source edits](edits/renderer-edits.json) · [unit edits](edits/unit-edits.json) · [independent review](edits/study-independent-review.json) · [fixture review](edits/study-fixture-review.json) · [visual review](edits/study-visual-review.json) · [preservation review](edits/study-preservation-review.json)
