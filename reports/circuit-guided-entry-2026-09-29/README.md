# CircuitTool: enter an experiment and trace its result

The Active electronics introduction now gives students a direct route to the selected guided experiment. Saved results offer a compact comparison that makes the explanation easier to check against measurements.

## Find the next step

The entry card shows the experiment title, the number of experiments tested, and one action:

| Saved work | Action | Destination |
| --- | --- | --- |
| Experiment not started | Open guided experiment | Question and existing Start control |
| Prediction in progress | Resume prediction | Question and existing prediction controls |
| Experiment tested | Review saved result | Saved result and explanation |

Opening the activity focuses its existing question or result and scrolls it into view immediately. The navigation request stays in local React view state. Students keep their live circuit, electrical Undo history, notebook, and saved lesson records. Mounting, editing, importing, restoring, and returning to the workbench do not replay a consumed navigation request.

The tested count includes every tested experiment, including one whose original prediction did not match the readings.

## Trace the change

After testing, **Trace the change** opens a native disclosure with labeled Before and After readings:

- Base current
- Lamp current
- Collector–emitter voltage
- Connected divider junction voltage in the night-light experiment

Each experiment has a reasoning question that connects its measurements. For example, **Find the limit** shows base current rising from 260 µA to 430 µA while lamp current remains about 21.82 mA and collector–emitter voltage remains 0.20 V. Students can use those readings to explain why extra base drive does not increase lamp current in this model.

The comparison uses the existing solved baseline and result circuits for the saved lesson. Its evidence stays stable while students change the live bench. Readings remain hidden until the experiment is tested, and displayed numbers are rounded. The sensor comparison uses the connected divider junction voltage, which includes the base branch's load.

Narrow screens and enlarged text stack the Before and After readings when needed. This keeps each numeric magnitude intact instead of splitting a voltage across lines.

## Validation

The complete CircuitTool regression suite passed **338 tests across 22 files**, including 18 new interaction and saved-evidence cases. The receipt confirms that both source copies and all tested files stayed unchanged during the run.

The regression receipt records the source, desktop mirror, and tests used by the final run. The browser receipt records action checks, focus behavior, accessibility scans, layout measurements, and screenshot files. `validate.cjs` verifies those receipts against the saved files and checks matching source copies and JavaScript compilation.

Browser validation passed **22 captures and layout scans**, **22 visible-focus checks**, **eight focus transitions**, and **two 200% text scenarios**. All **62 checked numeric readings** stayed intact. Desktop, 390px, 320px, enlarged-text, and forced-colors previews passed visual review.

Twenty ordinary accessibility scans include the full contrast rule. In the two forced-colors scans, axe reported authored colors even though Chromium rendered black text on white; the same result occurred on a fresh page. [The diagnostic](forced-colors-diagnostic.json) records that discrepancy. Those two scans explicitly exclude axe's contrast rule and instead record computed contrast for all 28 visible text nodes in the new panels: **21:1**, with matching screenshots. Other accessibility rules remain enabled.

### Preview

- [Introduction and direct experiment entry](fresh-guided-entry-1280.png)
- [Resume a prediction on a phone](resume-prediction-entry-390.png)
- [Trace the saturation limit](limit-trace-320.png)
- [Night-light readings at 200% text](sensor-trace-200pct-text-320.png)
- [Forced-colors comparison](forced-colors-trace-320.png)

### Reproduce

From the repository root:

```powershell
node reports/circuit-guided-entry-2026-09-29/run-regression.cjs
node reports/circuit-guided-entry-2026-09-29/browser-check.cjs
node reports/circuit-guided-entry-2026-09-29/validate.cjs
```

The repository's installed Vitest, Playwright, Chromium, React, and axe-core dependencies are required.
