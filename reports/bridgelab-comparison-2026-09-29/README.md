# Bridge Lab: compare earthquake experiments

## What changed

- **Choose a reference trial.** Either the notebook or timeline can select any of the four saved trials. Both selectors stay synchronized. Changing the reference pauses playback and preserves the current experiment and student writing.
- **Overlay the responses.** The timeline's new **Compare trials** view plots reference and current displacement, acceleration, or stored energy. Both curves use the same vertical scale and the same model time. A saved inspection time never shifts a curve. Dashed violet and solid gold lines distinguish the trials, with numerical readings at the cursor.
- **Quantify the difference.** The notebook compares peak relative motion, peak absolute deck acceleration, peak stored energy per modal mass, and cumulative dissipation at 24 seconds. Each row shows current minus reference in units and as a percentage of the reference. Percentages are omitted for zero or near-zero reference values.
- **Match the input.** When the ground motion differs, **Use reference shaking** copies its frequency and intensity. It keeps the current response mode, damping, static design, and notes, and pauses at the event start. The lab still identifies every changed model setting.
- **Keep the reference in the report.** Printable evidence includes the selected reference, current experiment settings, and the same recalculated comparison values. This remains available when the experiment is disabled.
- **Read the results on a phone.** Each measure becomes a labelled group of values at narrow screen widths. Numbers remain intact and every comparison column is visible. Desktop and paper layouts retain the table and its row/column semantics.

## Try it

1. Enable **Earthquake experiment**, inspect a useful moment, and save a trial in the earthquake notebook.
2. Change only damping. Select **Compare on timeline** in the notebook to open the overlay and focus its time control.
3. Inspect displacement, acceleration, and stored energy at the same time. The 3D scene continues to show the current experiment.
4. Save the second trial. Choose either saved trial as the reference and inspect the numerical differences.
5. Open the earthquake evidence report to retain the selected comparison with the saved student observations.

## Model and data details

The response calculation remains the existing elastic teaching model. The new plots use its full response histories, with one shared scale determined by both trials. Cached chart geometry is reused while the cursor moves. Reference records store their original inputs and notes; calculated results are rebuilt from those inputs.

Comparisons use full-event peaks independently of the inspected time. Matching shaking means matching the synthetic input frequency and peak ground acceleration. At zero acceleration, both ground histories are zero even if frequency settings differ. Changing several settings still prevents attributing the result to one factor. A lower response value alone does not establish the safety of a real bridge. See the [model notes](../bridgelab-immersive-earthquake-2026-09-28/model-notes.md) for the assumptions and primary references.

The reference selection follows a trial when earlier records are removed. Removing the selected reference chooses the first remaining valid trial; removing the last trial returns the timeline to its energy view. Unsupported imported records remain in storage. Invalid reference indices and chart-measure names recover to supported choices. Student text is rendered through React, including trial names in selectors and reports.

## Verification

**172 distinct checks passed:** 157 unit/interaction checks, one unchanged Bridge render snapshot, and 14 Chromium browser workflows. The final unit run completed all 22 selected files. Both source copies are byte-identical, all 899 literal English fallbacks match both registries, and parsing and scoped whitespace checks pass. Desktop and phone previews were visually reviewed.

The focused tests cover common plot scales and units, linear displacement/acceleration scaling and quadratic energy scaling, zero-input plots, malformed settings, reference selection/removal, synchronized inspected times, matching only the ground input, safe percentage handling, and identical on-screen/print comparison values.

Browser workflows exercise desktop and 320 px layouts, keyboard timeline inspection, visible narrow-screen values, reference switching, matching the input, and printing. Existing immersive playback, fullscreen recovery, reduced motion, saved-investigation, and 2D fallback workflows are included in regression coverage.

- [Final unit and snapshot results](regression-unit-results.json)
- [Final browser results](browser-final-results.json)
- [Source and coverage verification](source-verification.json)

Recheck source mirrors, English fallbacks, and completed result coverage from the repository root:

    node reports/bridgelab-comparison-2026-09-29/verify.cjs

## Previews

- [Desktop displacement comparison](bridge-1000-comparison-motion.png) · [Phone displacement comparison](bridge-320-comparison-motion.png)
- [Desktop energy comparison](bridge-1000-comparison-energy.png) · [Phone energy comparison](bridge-320-comparison-energy.png)
- [Desktop results](bridge-1000-comparison-table.png) · [Phone results](bridge-320-comparison-table.png)
- [Desktop evidence report](bridge-1000-comparison-report.png) · [Phone evidence report](bridge-320-comparison-report.png)
