# Micro Lab enhancement — September 27, 2026

## What changed

- Growth Lab now supports control/trial experiments across four organism profiles, three starter questions, predictions, 24-hour modeled curves, an accessible data table, and explanations tied to the original evidence.
- A 12-trial notebook preserves conditions, control snapshots, predictions, and notes. Students can return to trials, remove selected trials, download the full notebook, or export a CSV summary. Earlier Growth Lab notes remain available.
- Comparisons identify whether zero, one, or several variables changed. Oxygen is explicitly a relative availability scale; suppressed growth is distinguished from death.
- The microscope now has practical magnification presets, calibrated scale bars, separate display zoom, focus guidance and assistance, optical-resolution limits, and persistent observed-slide progress. A size reference replaces the misleading apparent-visibility slider. Method reference cards no longer change the illustrated viewing mode.
- Resistance simulations now use consistent starting cultures for Step and Play. Extinction stops the run and makes the resistant share undefined. Counts and outcome-specific explanations distinguish selection, chance, absent variation, and zero exposure.
- Active sections have more room, keyboard-operable tabs, and responsive layouts. New Growth Lab and microscope strings are registered in both UI registries; runtime deployment copies are identical.

## Validation

48 focused tests passed across the growth model, mounted growth workflow, microscope, resistance simulation, and existing quiz suites. The local browser suite passed all four scenarios covering the complete growth workflow, state restoration, both downloads, microscope calibration, extinction, keyboard tabs, phone layout, and all 18 sections. No browser page errors were recorded.

```text
node node_modules/vitest/vitest.mjs run tests/microbiology_growth_model.test.js tests/microbiology_growth_workflow.test.js tests/microbiology_microscope.test.js tests/microbiology_resistance_sim.test.js tests/stem_microbiology_quiz.test.js --maxWorkers=1 --testTimeout=20000
node node_modules/@playwright/test/cli.js test tests/e2e/microbiology-investigation.spec.ts --workers=1 --reporter=line --output=reports/micro-lab-enhancement-2026-09-27/browser-results
```

The quiz/mirror check was rerun after the final microscope integration and passed. Syntax and scoped whitespace checks passed. The repository-wide suite was not run.

## Model scope

Growth uses illustrative environmental envelopes, an initial population of 5, a capacity of 100, and a shared maximum rate of 0.4 per model hour. It includes lag and bounded growth, but omits death and random variation. These values are teaching scales, not calibrated culture measurements. Final populations within 2 units count as similar; this is not a statistical test.

Concept references: [OpenStax growth](https://openstax.org/books/microbiology/pages/9-1-how-microbes-grow) and [oxygen requirements](https://openstax.org/books/microbiology/pages/9-2-oxygen-requirements-for-microbial-growth).

## Visual checks

- [Growth results, desktop](growth-result-desktop.png)
- [Growth workspace, phone](growth-phone.png)
- [Growth workspace, high contrast](growth-contrast-phone.png)
- [Microscope, desktop](microscope-desktop.png)
- [Microscope, phone](microscope-phone.png)
- [Resistance results, phone](resistance-phone.png)

Changes are local; no deployment was performed.
