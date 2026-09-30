# CircuitTool: plan the experiment before predicting

The Active guided experiments now show the planned change and fixed circuit settings beside the prediction question. Students can reason about the experiment's actual setup when they arrive from a tuned live circuit.

## Experiment plan

Each lesson shows its circuit type and a labeled **From** and **To** setting:

| Experiment | Planned change |
| --- | --- |
| Small input, larger current | Input voltage: 1.00 V → 1.50 V |
| Find the limit | Input voltage: 3.30 V → 5.00 V |
| Make a night light | Relative light: 80 / 100 → 20 / 100 |

**Settings held constant** opens a native disclosure with the 5.00 V supply, 10 kΩ base resistance, 220 Ω lamp resistance, and transistor gain of 100. The night-light experiment also holds its 10 kΩ divider resistor constant. The light-dependent resistance changes with the relative light setting, so it is excluded from the held settings.

The plan is derived from the normalized lesson templates. It stays fixed when students edit the live bench and remains available alongside saved evidence after testing. Generating the plan performs no electrical calculations and reveals no resulting currents, voltages, power, or operating regions before Test.

For a prediction in progress, the existing notice about whether the live bench matches the experiment now appears before the choices. It remains the same status message, with the existing replay controls below the activity. Opening the plan's disclosure changes only the view.

The control magnitudes and units use separate spans. Grids respond to font size and available width so narrow and enlarged-text views keep numeric magnitudes intact. Each reading isolates its left-to-right quantity order, including when the surrounding page uses right-to-left direction.

## Matching replay

Loading a matching baseline or result now preserves unused controls and electrical history. Previously, differences in inactive light/divider settings in a manual circuit, or inactive input voltage in a sensor circuit, could add an empty Undo entry and clear Redo even though the replay control already indicated a match.

The replay guard uses the existing physical circuit comparison. Loading a physically different circuit still records the prior design for Undo. Starting or testing an experiment retains its existing fixed-settings behavior.

## Validation

The regression and browser receipts record the exact source, mirror, tested files, action checks, screenshots, accessibility scans, and numeric layout checks. The validator checks that those files still match the recorded evidence, verifies JavaScript compilation and source parity, and checks report formatting.

- **362 tests passed across 23 files**, including 24 cases for the plan and matching replay behavior.
- **20 browser captures and accessibility scans** cover all three experiment plans, expanded fixed settings, prediction context, saved results, and matching replay at desktop and phone widths.
- **23 visible-focus checks**, five focus transitions, keyboard disclosure checks, and reduced-motion checks passed.
- **115 numeric magnitudes remained intact**. Two cases doubled the plan's text sizes at 320 px; four readings retained the correct quantity order under right-to-left page direction.
- Source and desktop mirror stayed byte-identical and unchanged throughout both runs: `7e8163bdea895ddfe487bcdb18abb5993ceb907496afa1eb8cdd760700a9b3ba`.

The 18 ordinary accessibility scans include the full contrast rule. The two forced-colors scans exclude only axe's `color-contrast` rule because axe 4.12.1 reports authored colors in this mode despite Chromium rendering system colors. The earlier reproduction is copied into [forced-colors-diagnostic.json](forced-colors-diagnostic.json) with its original path and hash; it was not rerun for this update. Separate computed-color checks cover 49 rendered plan text nodes, all at 21:1 contrast, and both forced-colors captures were visually reviewed. These checks describe the reviewed views rather than certify the entire application.

### Visual review

- [Desktop plan with fixed settings](gain-plan-constants-1280.png)
- [Phone prediction and changed-bench notice](gain-prediction-context-320.png)
- [Night-light plan at 200% text](sensor-plan-200pct-text-320.png)
- [Night-light plan in forced colors](forced-colors-sensor-plan-320.png)

### Reproduce

From the repository root:

```powershell
node reports/circuit-experiment-plan-2026-09-29/run-regression.cjs
node reports/circuit-experiment-plan-2026-09-29/browser-check.cjs
node reports/circuit-experiment-plan-2026-09-29/validate.cjs
```

The repository's installed Vitest, Playwright, Chromium, React, and axe-core dependencies are required.
