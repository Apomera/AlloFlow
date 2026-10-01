# Water Cycle signal inspection

The signal chart now supports exact reading and meaningful inspection of its existing teaching cues. This pass is left uncommitted.

## Changes

- **Series identity:** energy uses a solid line and circles, surface flow uses a dashed line and squares, and storage uses a dotted line and diamonds. The legend matches these marks. Colors support the distinction; patterns and shapes carry it in forced colors.
- **Inspect a place:** a native selector reads Surface, Air, Cloud, Land, or Return. An exact three-score readout and folded values table share the plotted arrays. Selecting a place keeps the stage marker separate.
- **Follow the focus:** following tracks the selected process, active journey, or scrubbed replay. Captions explicitly distinguish Stage focus and Replay focus. Standalone Infiltration now highlights Land.
- **Readable phones:** larger SVG text, centered place labels, and reserved edge space prevent the overlapping labels found in the initial review. The selector and table disclosure have 44px targets and visible keyboard focus.
- **Model scope:** horizontal categories are places, not elapsed time or a required droplet route. Each 0–100 score is an independent teaching cue to compare with itself as conditions change. The scores do not form a water or energy balance.

All four original score initializer blocks match the pre-edit source. Inspection preserves climate inputs, the paused parcel, writing, baselines, and saved evidence.

## Matched captures

The baseline runtime SHA-256 is `2ab8cb80d55de3063122677d50df18c4047ab1ad41fc198b86d5093ae9c83ccf`, captured before this pass from the existing uncommitted work. [Baseline metadata](baseline-results.json) and [frozen source](baseline-runtime.js) preserve that state.

| View | Before | After |
| --- | --- | --- |
| Phone, light | [Baseline](before-infiltration-light-320.png) | [Revised](infiltration-light-320.png) |
| Desktop, light | [Baseline](before-infiltration-light-1280.png) | [Revised](infiltration-light-1280.png) |
| Phone, dark | [Baseline](before-infiltration-dark-320.png) | [Revised](infiltration-dark-320.png) |
| Desktop, dark | [Baseline](before-infiltration-dark-1280.png) | [Revised](infiltration-dark-1280.png) |
| Phone, forced colors | [Baseline](before-infiltration-forced-colors-320.png) | [Revised](infiltration-forced-colors-320.png) |
| Desktop, forced colors | [Baseline](before-infiltration-forced-colors-1280.png) | [Revised](infiltration-forced-colors-1280.png) |

Manual inspection and the open table: [phone](manual-cloud-table-light-320.png), [desktop](manual-cloud-table-light-1280.png), [forced-color phone](manual-cloud-table-forced-colors-320.png).

## Verification

**255 tests passed:** 64 focused signal tests and 191 shared renderer regressions across six distinct suites. The focused tests execute actual renderer derivations and chart markup. They verify all six standalone processes, active and replay mappings, restored preferences, exact plot/readout/table agreement, persistent marks, native selector updates, frozen learner records, and unchanged score calculations.

The isolated browser checks exercise native keyboard and pointer controls, the folded table, stage and replay changes, an actual sunlight adjustment, and paused parcel and learner-work preservation. Layout checks measure rendered SVG text, label intersections, plot geometry, and page overflow. Coverage includes 320px and 1280px light, dark, and forced colors, a 390px phone, and dark mode with forced colors.

The completed full run passed **401 checks** across 72 recorded snapshots, with **16 clean scoped accessibility audits**, zero errors, and both owned resources closed. The [verification summary](verification-summary.json) confirms test scope, source/public parity, unchanged score initializers, browser completion and cleanup, and an empty staged diff for this work.

The [initial diagnostics](results-initial.json) and [findings](qa-findings.md) record the phone overlap and pale forced-color SVG text corrected before final verification. The browser measurements also wait for a painted frame and check intersections on both axes.

A later [spacing diagnostic](results-spacing-diagnostic.json) found the axis zero touching Surface on phones. The final layout adds a vertical gap while preserving the plot coordinates. A phone preflight confirmed readable labels, no text intersections, and no overflow before the final full run.

Raw results: [focused signal tests](unit-results.json), [renderer regressions](regression-results.json), [browser verification](results.json).

Tested source and public mirror SHA-256:

```text
78d924001e4e1de6167aae3804405f976ade6d4809f4d9d06cd47816a6a967e8
```

## Reproduce

Run from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/watercycle_signal_chart.test.js tests/watercycle_process_compare.test.js tests/watercycle_scene_context.test.js tests/watercycle_next_experiment.test.js tests/watercycle_host_surface_a11y.test.js tests/watercycle_weather_label_bands.test.js --maxWorkers=1
node dev-tools/watercycle_signal_inspection_qa.cjs
```

The browser harness freezes the runtime and uses an owned ephemeral localhost server and isolated Chromium. It records completion and errors, checks source/public parity, and closes its resources. It does not operate learner tabs or the existing preview at port 8770.
