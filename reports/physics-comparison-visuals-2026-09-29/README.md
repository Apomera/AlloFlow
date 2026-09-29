# Physics comparison visuals

Paired vacuum and air-drag flights now show range, maximum height above ground, and flight time as separate cards. Each card presents both measured values, their difference, and the percentage change from the no-drag flight.

## Changes

- Both model bars start at zero and use the same scale within each measure. The six bar lengths come from the two completed flights, including after launch controls change.
- Solid and patterned bars distinguish the models alongside their text labels. The layout adapts to desktop and phone widths in the default, dark, and contrast themes.
- Changes follow the measured direction. An elevated horizontal launch can have the same maximum height and a longer flight time with drag. Zero baselines omit undefined percentages, and tiny differences remain visible.
- Each inspection button opens its original retained flight on the canvas, graphs, sample slider, and data table. A link requires matching run ID, model version, launch settings, impact, and maximum height.
- The detailed table opens with the keyboard. On phones it scrolls horizontally while the measure column stays visible. Displayed values are rounded to three decimal places; the recorded evidence keeps its full precision.
- Nineteen new physics strings are registered in both catalogs. The source and desktop copies match, and the browser checks are included in the physics workflow.

Older summaries remain readable when their original samples are unavailable. Inspection is available while the matching samples are retained; the simulator keeps up to five flight trails.

## Before and after

| View | Before | New cards | Detailed table |
| --- | --- | --- | --- |
| Desktop, 1100 px | [Before](comparison-before-default-1100.png) | [After](comparison-default-1100.png) | [Expanded](comparison-default-1100-exact.png) |
| Phone, 320 px | [Before](comparison-before-default-320.png) | [After](comparison-default-320.png) | [Expanded](comparison-default-320-exact.png) |
| Dark phone, 320 px | | [After](comparison-dark-320.png) | [Expanded](comparison-dark-320-exact.png) |
| Contrast phone, 320 px | | [After](comparison-contrast-320.png) | [Expanded](comparison-contrast-320-exact.png) |

The [visual audit results](comparison-results.json) include all nine combinations of theme and width, their captured measurements, bar geometry, text contrast, and evidence hashes. The [baseline results](comparison-before-results.json) contain the two earlier layouts.

## Verification

- **179 unit checks passed** across 14 physics test files.
- **52 browser checks passed** across 11 physics specifications, including keyboard inspection, narrow layouts, retained flight records, paired-flight cancellation, and existing learning activities.
- **Nine visual configurations passed:** 1100, 375, and 320 px viewports in each of the three themes. Both the cards and expanded tables were captured. There was no page overflow or browser error; visible comparison text was at least 12 px with contrast of at least 5.19:1.
- All six bar lengths matched their recorded measurements within 0.05 px. Inspection preserved the ball, original samples, experiment log, last-flight result, and comparison evidence.
- All nine captures used the original launch settings after the current controls changed. Their range, height, and flight time matched the earlier baseline exactly.
- Source syntax, source/desktop parity, physics catalog parity, and existing English physics strings were checked.

The final visual audit includes the polished table spacing and model note. Its recorded source SHA-256 is `63cab3f44b6ec290ada365ebbe40e85833f4a0ac134908836da72f5da016417a`.

## Reproduce

Run from the repository root:

```powershell
node reports/physics-comparison-visuals-2026-09-29/verify-comparison.cjs
```

This uses local React, app styles, and the simulator controller to complete two real flights before taking screenshots. It checks the measured bar geometry and captured settings, then opens both original flights and verifies that their evidence is unchanged.

The full regression commands are in [the physics workflow](../../.github/workflows/physics.yml). The new cases are in [the comparison unit tests](../../tests/physics_comparison_visuals.test.js) and [the comparison browser tests](../../tests/e2e/physics-comparison-visuals.spec.ts).
