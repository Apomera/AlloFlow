# CircuitTool: tracing measurement changes

**Trace the change** now places a signed **Change** value beside each saved Before/After measurement. Students can compare the change in base current with the change in lamp current directly, including the saturation case where only base current rises.

Each difference uses **After minus Before from the unrounded saved readings**, then applies the existing current or voltage formatter. A short definition explains this calculation. The original Before/After text, units, reasoning prompts, and native disclosure remain available.

## Visual treatment

- A neutral outlined cell identifies each Change value.
- Desktop rows show the metric and three reading columns.
- Phone rows keep Change beneath its Before/After pair; larger text can stack the readings.
- Signed numeric magnitudes stay intact. Units can wrap separately, with consistent numeric direction in an RTL document.

## Saved differences

| Experiment | Base current | Lamp current | Collector–emitter voltage | Divider junction voltage |
| --- | --- | --- | --- | --- |
| Gain | +50.0 µA | +5.00 mA | -1.10V | — |
| Current limit | +170 µA | 0 A | 0.00V | — |
| Light sensor | +158 µA | +15.79 mA | -3.47V | +1.58V |

The different spacing used by the existing current and voltage formatters is preserved in text content. Formatting is limited to the trace; global readouts are unchanged.

## Scope

The product change is limited to **CircuitActiveLessonTrace** and its scoped styles in **stem_lab/stem_tool_circuit.js**, with an identical public mirror. Differences come from the trace's fixed Before/After props. There are no new controls, saved fields, solver calls, editing callbacks, navigation effects, or AI payload changes.

Frozen product SHA-256:

```text
324026179f177a92b0c87817991a2fc2c425cdac8cfef80740bf4479e4fe1a28
```

## Verification evidence

All **250 tests across 14 files passed**, including 16 new trace-change cases. Each file ran in an isolated process with one fork worker and the existing timeout settings. The source, mirror, tests, and runner stayed byte-identical throughout; receipts preserve each command, full assertion names, raw output, and input hashes.

- [Regression aggregate](regression.json)
- [Regression receipts](regression-receipt.json)
- [Browser results](browser-results.json)
- [Visual review](visual-review.json)
- [Independent validation](validation.json)

The regression suite includes independently calculated gain, saturation, and sensor differences, plus synthetic component inputs whose rounded Before/After values hide a real difference. These cases verify subtraction from unrounded values. The synthetic tests expose the local component only in memory; product source files remain unchanged.

All **14 browser views passed**, covering each experiment at 1280, 390, and 320 pixels, current-limit and sensor traces with 200% text at 320 pixels, two forced-color views, and one RTL phone view. The browser reviewer inspected every final PNG; the primary reviewer separately inspected desktop, phone, enlarged-text, forced-color, and RTL pixels.

The audit verified 144 intact numeric magnitudes, 131 measured doubled-font sizes, 14 visible-focus checks, six native workflow checks, one keyboard disclosure sequence, and two lifecycle checks. Saved measurements remained fixed through live edits, replay, Undo, lesson switching, writing, locale changes, and JSON import/restore. The RTL order measurement verifies an actual 320-pixel viewport. No page errors, clipping, overflow, duplicate IDs, or failed accessibility scans were recorded.

Ordinary accessibility scans include contrast. Forced-color scans use the existing documented axe 4.12.1 exception for authored-color reporting, with actual used-color contrast and screenshot inspection recorded separately. The [diagnostic](../circuit-explanation-guide-2026-10-01/forced-colors-diagnostic.json) and its provenance are verified by hash.

From the repository root:

```powershell
node reports/circuit-trace-changes-2026-10-01/run-regression.cjs
node reports/circuit-trace-changes-2026-10-01/browser-check.cjs
node reports/circuit-trace-changes-2026-10-01/validate.cjs
```

Run the browser audit after the isolated regression processes exit. Reports record the original working-file bytes; Git may normalize text line endings. Use a fresh report directory and freeze inputs again if those bytes change.
