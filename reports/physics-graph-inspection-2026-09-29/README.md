**Physics simulator: direct graph inspection — September 29, 2026**

The velocity graphs now let learners inspect a recorded time directly. Tap either graph to select the nearest observation, or use the native Recorded time slider with arrow keys, Home, and End. Inspect this time also opens the displayed observation. Selecting a point pauses playback and updates the canvas marker, both graph cursors, the measurement cards, and the table together.

Selection searches the complete recorded sequence. The curves use up to 80 points for drawing, but a selected observation can lie between those plotted points. The time calculation uses each observation's actual timestamp, including a final impact interval shorter than 0.035 seconds. Editing upcoming launch settings preserves the captured flight readings.

A paused launch now shows both velocity graphs immediately at time zero. Its sole recorded point can be inspected with the button while the time slider is disabled. After one simulation step, the slider becomes available. The control retains keyboard focus during selection, and inspection preserves the simulated ball, samples, completed records, and CSV output.

This pass extends the [visual clarity improvements](../physics-clarity-2026-09-29/README.md), [recorded-point inspector](../physics-inspection-2026-09-29/README.md), and [elevated launches](../physics-launch-height-2026-09-28/README.md). The requested commit contains the simulator source and desktop copy, physics translations, tests, workflow coverage, and the review artifacts from these passes.

Validation passed: **159 unit tests across 13 files**, **40 browser scenarios across 9 files** with retries disabled, and **9 visual audit combinations** at 1100, 375, and 320 px in default, dark, and high-contrast themes. The [inspection tests](../../tests/e2e/physics-sample-inspection.spec.ts) cover keyboard focus, selection of observations omitted from the drawn curve, scaled phone graph clicks, actual impact time, and the sole launch sample. The [visual audit](../physics-clarity-2026-09-29/verify-clarity.cjs) also measures the new control's typography and contrast.

The report harness and its CSS fixture are now included with the review files. The audit scripts load [preview-harness.cjs](../physics-deep-review-2026-09-27/preview-harness.cjs), which uses the repository's component shell and bundled [preview-tailwind.css](../physics-deep-review-2026-09-27/preview-tailwind.css), so reproducing them does not require the earlier local scratch directory or CSS cache. Run from the repository root with the project dependencies installed.

- [Phone time control](../physics-clarity-2026-09-29/clarity-default-320-graph-time.png)
- [Phone velocity graphs](../physics-clarity-2026-09-29/clarity-default-320-component-graphs.png)
- [Dark phone time control](../physics-clarity-2026-09-29/clarity-dark-320-graph-time.png)
- [High-contrast graphs](../physics-clarity-2026-09-29/clarity-contrast-320-component-graphs.png)
- [Measured visual results](../physics-clarity-2026-09-29/clarity-results.json)

```powershell
node node_modules/vitest/vitest.mjs run tests/physics_ --maxWorkers=1 --pool=threads --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/physics-sample-inspection.spec.ts --workers=1 --retries=0 --reporter=line
node reports/physics-clarity-2026-09-29/verify-clarity.cjs
```
