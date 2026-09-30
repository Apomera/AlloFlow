# CircuitTool: explore voltage and make room for reasoning

The Active electronics workbench gains an interactive view of the lamp loop's voltage differences. The explanation field also gives students more room to read saved evidence and develop their reasoning.

## Voltage explorer

- One voltage column shows the lamp and collector-emitter voltage differences on the same scale. Their spans add to the supply voltage. The collector marker moves with the solved operating point.
- Named readings explain the supply, collector, common return, lamp drop, transistor drop, and lamp current. Text and controls carry the same meaning as the colored spans.
- **Measure lamp drop** and **Measure transistor drop** place the existing red and black probes across the selected component. The board markers and voltmeter follow that choice; reversing or moving the probes updates the selection feedback.
- Cutoff, active operation, and saturation each have a short explanation. Sensor experiments identify the displayed lamp loop separately from the divider branch.
- Zero and tiny voltage spans keep their actual proportions. The measurement controls remain outside the graphic, so every component is selectable even when its span is very small.

The visual uses `solveActiveCircuit` through a small `circuitActiveVoltageBudget` helper. It introduces no additional electrical equations. Voltage is shown as a potential difference; a voltage at cutoff does not imply current or dissipated power.

## Writing space

The investigation explanation has a nearby reasoning cue, a larger default editing area, an optional **Expand writing space** control, and a quiet character count against its existing 4000-character limit. Expanding and reducing the space retain the same textarea, writing, and selection. The count has no live announcement on each keystroke.

Adding or reviewing saved evidence still focuses the explanation. The writing-space preference remains local view state, while authored text continues through the existing investigation JSON and HTML report.

## Validation

Regression and browser receipts record the source, desktop mirror, tests, and screenshot hashes. The browser harness renders the local CircuitTool component with React and generated app styles, then checks the interactive probe choices, writing continuity, keyboard focus, touch targets, contrast, phone layouts, enlarged text, and reduced motion.

The final regression suite passed **320 tests across 21 files**, including 22 new cases for independently calculated voltage spans, sensor endpoints, tiny fractions, probe actions, and writing-space continuity. A new endpoint fixture initially assumed the dark sensor reached saturation at minimum light; the independently calculated loaded-divider current and voltage corrected that expectation to active operation before the final run.

Browser validation passed **22 accessibility and layout scans**, **44 visible-focus checks**, **21 rendered voltage geometry checks**, and **two 200% text scenarios**. It saved 22 screenshots. Phone and enlarged-text views passed a separate visual review; no page errors or visual issues were recorded. The source and mirror hashes stayed identical throughout the audit.

### Preview

- [Voltage explorer on desktop](active-voltage-1280.png)
- [Voltage explorer on a phone](active-voltage-390.png)
- [Cutoff and zero lamp voltage](cutoff-voltage-390.png)
- [Saturation and a small transistor span](saturated-voltage-390.png)
- [Room to write and review evidence](expanded-writing-space-390.png)

### Reproduce

From the repository root:

```powershell
node reports/circuit-voltage-explorer-2026-09-29/run-regression.cjs
node reports/circuit-voltage-explorer-2026-09-29/browser-check.cjs
node reports/circuit-voltage-explorer-2026-09-29/validate.cjs
```

The repository's installed Vitest, Playwright, Chromium, React, and axe-core dependencies are required. Final counts and the screenshot inventory are recorded in `validation.json`, `regression-receipt.json`, and `browser-results.json`.
