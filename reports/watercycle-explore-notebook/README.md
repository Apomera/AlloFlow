# Explore: explain the evidence and isolate one change

The experiment workspace now connects a claim, a fair comparison, recorded evidence, an explanation, and a next test. Its paper and teal surfaces, readable tables, and large controls follow the shared Water Cycle visual design.

## Meaningful choices

- The comparison lists which of the eight inputs changed. One changed input identifies the other seven as held fixed. Several changes explain why the comparison cannot isolate one effect.
- Choose an input and use **Keep only this change** to restore the other seven inputs to their recorded baseline. The new comparison stays visible, receives keyboard focus, and preserves saved observations and writing.
- Evidence checks each claim independently. More than one effect may be supported. Evaporation can increase or decrease; the temperature claim explicitly requires crossing below 0°C. The comparison retains signed changes and does not award points for agreement.

## Evidence notebook

Each saved observation retains both setups, their model values, the selected claim, and the supported effects. Open **Explain this observation** to write **My explanation**, **Evidence I used**, and **My next test** beside the recorded values.

The four-observation limit is explicit. Saving never silently discards an earlier record. A comparison is identified by both complete setups, so the same current setup against two different baselines produces two distinct observations. Removing observations or clearing the trail offers undo; multiple removals restore their original order and writing. A new save ends that undo window.

**Download trail** exports a readable text report using the saved values and notes. Missing information in older observations is labeled as not recorded. Explore's independent teaching indices and relative pathway choices do not establish measured water volumes or a physical water budget.

## Validation

- All 32 notebook and claim tests passed, including identity, capacity, incomplete records, independent effects, export, and accumulated undo order with distinct notes.
- All nine existing prediction, comparison, and trail integration regressions passed.
- All 123 browser checks passed, with no runtime errors or horizontal overflow. The checks cover writing, downloaded content, replay, section switching, capacity, repeated comparisons, freezing claims, removing and restoring evidence, preset selection, one-input isolation, keyboard focus, and visible controls.
- Light, dark, and high contrast layouts are checked at desktop and 320px widths. All 12 accessibility audits passed with no violations across notebook and climate/fair-comparison controls; forced colors checks exercise a visible keyboard focus outline.
- Desktop and dark phone notebook screenshots were visually reviewed. Preset and fair-comparison captures document the restored climate controls.

The browser review found a legacy first-child style hiding the preset selector. A scoped climate-header rule restores it. The combined report records the source hash and coverage of the initial notebook run and the focused follow-up, which checks the repaired header and remaining workflow. The model and notebook logic are unchanged between those two browser runs.

See capture-results.json for the final screenshot visibility checks, results.json for browser checks and accessibility audits, unit-results.json for the 32 behavioral tests, and integration-regressions.json for the nine integration tests. [Water Worlds accounting review](../water-worlds-observation-budget/README.md) covers the related saved-interval store accounting.

Run node dev-tools/watercycle_explore_notebook_qa.cjs for an isolated browser review. The shared live preview is served by node dev-tools/watercycle_visual_system_qa.cjs --serve at http://127.0.0.1:8770/.
