# Dissection Lab: clearer Tools and fresh PNG downloads

Updated October 5, 2026. Changes are uncommitted.

## What changed

- Three named groups put observation, capture/download, and report/reset actions together.
- Buttons keep their natural height, with readable text, visible pressed and disabled states, and keyboard focus for the contents selector. Groups respond to the lab's available width.
- **Download full canvas PNG** renders through the native full-frame capture API at the canvas backing resolution. It refreshes an offscreen specimen and preserves the visible canvas, capture context, evidence notebook, and learner work.
- Download failures show clear feedback and allow retry. Evidence capture keeps its compressed comparison-frame workflow and contents preference.
- Copy lab report and the protected reset confirmation retain their existing behavior and focus handoffs.

## Validation

241 scoped unit checks and 33 current browser cases passed. Six baseline layouts were captured by serving the saved pre-edit module through the existing local harness; the working source stayed current.

| Check | Passed | Evidence |
| --- | ---: | --- |
| baseline | 6 | [Results](baseline-1/results.json), [run](baseline-1/run.json) |
| unit-main | 240 | [Results](unit-main-2/results.json), [run](unit-main-2/run.json) |
| unit-axe | 1 | [Results](unit-axe-2/results.json), [run](unit-axe-2/run.json) |
| tools | 11 | [Results](tools-2/results.json), [run](tools-2/run.json) |
| capture | 11 | [Results](capture-2/results.json), [run](capture-2/run.json) |
| gallery | 11 | [Results](gallery-2/results.json), [run](gallery-2/run.json) |

Browser checks cover native keyboard order and observation modes, cancellation focus, report contents, fresh offscreen PNG pixels and dimensions, animated copy failure and retry, and the existing capture/gallery workflows. PNG bytes match the actual native destination raster. Scoped axe audits found no violations. Six select contrast checks remained incomplete. Its unchanged text and border colors meet contrast thresholds (11.47:1 and 3.83:1); [manual contrast review](contrast-review.json) records the calculations and focus checks. The forced-colors audit had no incomplete checks.

## Visual review

| Layout | Baseline | Updated |
| --- | --- | --- |
| phone | [Before](baseline-1/captures/before-phone-tools.png) | [After](tools-2/captures/after-phone-tools.png) |
| tablet | [Before](baseline-1/captures/before-tablet-tools.png) | [After](tools-2/captures/after-tablet-tools.png) |
| desktop | [Before](baseline-1/captures/before-desktop-tools.png) | [After](tools-2/captures/after-desktop-tools.png) |
| embedded-medium | [Before](baseline-1/captures/before-embedded-medium-tools.png) | [After](tools-2/captures/after-embedded-medium-tools.png) |
| embedded-large-contrast | [Before](baseline-1/captures/before-embedded-large-contrast-tools.png) | [After](tools-2/captures/after-embedded-large-contrast-tools.png) |
| forced-colors | [Before](baseline-1/captures/before-forced-colors-tools.png) | [After](tools-2/captures/after-forced-colors-tools.png) |

Native outputs: [keyboard PNG](tools-2/captures/keyboard-native-full-canvas.png), [offscreen lateral PNG](tools-2/captures/offscreen-lateral-native-full-canvas.png), [animated retry PNG](tools-2/captures/animated-native-full-canvas-retry.png).

## Preservation and scope

The canonical renderer and public mirror match. Exact inverse edits reconstruct the pre-edit renderer and unit file. Earlier capture, point, gallery, canvas, and workspace inputs remain unchanged; 411 previous capture-report entries match their recorded hashes. Only this task's handoff row was completed. No files were staged, committed, pushed, or deployed.

[Validation summary](validation-summary.json) · [source edits](edits/renderer-edits.json) · [unit edits](edits/unit-edits.json) · [apply receipt](apply-receipt.json) · [initial workspace](workspace-before.json) · [independent review](edits/tools-independent-review.json) · [preservation audit](edits/tools-preservation-review.json)
