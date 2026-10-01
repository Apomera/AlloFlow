# CircuitTool: reading saved experiment results

The result panel now makes the connection between a saved experiment, its input settings, and its readings easier to follow.

## Learner experience

- The heading identifies the panel as **Saved experiment result**.
- The existing bench-status message sits above the readings. It explains whether the live circuit matches the saved result, matches the baseline, or has changed since the test.
- Each Before/After card places its input voltage or relative light directly above the lamp-current value.
- The current number has stronger visual emphasis than its unit. Signed numbers stay together; the unit can move to another line when space is tight.
- The result heading includes the saved-context message in its accessible description when Test moves focus there.

The existing common bar scale, operating regions, reasoning, original prediction, and explanation remain part of the result. Saved readings still come from the fixed experiment settings when the learner edits the live circuit or changes probes.

## Scope

Product changes are limited to the Active lesson result markup, a local display helper, and scoped CSS in **stem_lab/stem_tool_circuit.js**, with an identical public mirror. Calculations, record format, editing callbacks, history, writing preferences, and AI requests are unchanged.

The new **circuit_result_reading.test.js** covers this behavior. One expectation in **circuit_experiment_plan.test.js** now checks the tested bench-status message beside the result.

Frozen product SHA-256:

```text
2e346c972087af0e115941f2fccb4aa6040625e5f951c5a69a2d80daf37f5f76
```

## Verification

All **234 tests across 13 files** passed in isolated processes. Each file used one fork worker with the existing timeout settings. Receipts preserve the exact command, file hashes before and after each run, raw test output, and complete assertion names. No tested input changed during the run.

| Coverage | Tests |
| --- | ---: |
| Saved result reading | 15 |
| Prediction choices | 16 |
| Guided entry | 26 |
| Lesson journey | 27 |
| Experiment map | 23 |
| Lesson continuation | 23 |
| Writing space | 19 |
| Explanation guide | 20 |
| Localization | 4 |
| Form labels | 4 |
| Saved lesson records | 20 |
| Lesson navigation | 13 |
| Experiment plan | 24 |

The new tests use independent numeric calculations for the three experiment fixtures. They also cover absence of early results, replay and Undo, live settings and signed probes, lesson switching, import and restore, expanded writing, locale rerenders, actual wrong-prediction Test focus, and multiple mounted instances.

| Saved experiment | Before | After | Change |
| --- | --- | --- | --- |
| Gain | 3.00 mA | 8.00 mA | +5.00 mA |
| Current limit | 21.82 mA | 21.82 mA | 0 A |
| Light sensor | 2.53 mA | 18.32 mA | +15.79 mA |

### Browser review

All **14 browser views passed**, covering all three saved experiments at 1280, 390, and 320 pixels; current-limit and light-sensor results at 200% text on a 320-pixel viewport; two forced-color views; and one RTL view. The audit recorded 14 visible-focus checks, six native workflow checks, and two lifecycle checks, with no script errors, clipped content, duplicate IDs, or failed accessibility scans.

Recorded checks include keyboard Start/predict/Test, result focus and descriptions, the three live-bench context states, fixed saved readings through edits/replay/Undo, lesson switching, locale changes, actual JSON import and restore, bar proportions, settings order, numeric layout, content bounds, control size, and reduced motion. The two text-resize cases double every visible result element's computed font size from the same 320-pixel baseline, with 72 measured font-size pairs in total. All 42 displayed numeric magnitudes remained intact across the 14 views.

The primary reviewer inspected desktop, phone, enlarged-text, forced-color, and RTL screenshot pixels. An independent source review found no material issue in saved-context placement, settings associations, numeric formatting, focus, or CSS scope.

The initial RTL numeric-order measurement ran after a desktop viewport reset. The final audit repeated all 14 views and verifies an actual 320-pixel viewport before measuring order. The [preliminary script and receipt](metadata-correction/) are preserved and excluded from the final counts; all 14 screenshot files stayed byte-identical across the rerun. The browser reviewer inspected every final screenshot.

Ordinary accessibility scans include contrast. In forced colors, axe 4.12.1 has a previously reproduced authored-color reporting issue; only that rule is excluded for the two forced-color scans. Actual used foreground/background contrast and screenshots are checked separately. The original [diagnostic](../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json) and its provenance are verified by hash. These checks cover the recorded fixtures and views.

### Evidence and reproduction

- [Regression aggregate](regression.json)
- [Regression receipts](regression-receipt.json)
- [Browser results](browser-results.json)
- [Visual review](visual-review.json)
- [Independent validation](validation.json)

From the repository root:

```powershell
node reports/circuit-result-reading-2026-10-01/run-regression.cjs
node reports/circuit-result-reading-2026-10-01/browser-check.cjs
node reports/circuit-result-reading-2026-10-01/validate.cjs
```

Run the browser audit after the regression process exits. The final validation checks all raw assertions, input and script hashes, recorded browser measurements, screenshot signatures and hashes, visual-review signoff, encoding, and scoped whitespace.

Reports record the original working-file bytes. Git can normalize text line endings on checkout; use a fresh report directory and freeze its inputs again if those bytes change.
