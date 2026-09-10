# Ecosystem field notebook

Open **Ecosystem → Food web**, run a comparison, inspect a time and species, write an explanation, and choose **Save observation** below the results. The **Field notebook** remains available below the experiment controls.

## Added behavior

- Up to 12 observations retained in the tool's saved state. Changing the setup, rerunning, or switching tabs preserves them.
- Each observation stores independent copies of the original setup, selected time/species, committed prediction, explanation, and both sample rows for all five groups, including cover and capacity.
- Cards show the selected species; expandable details expose the original community, prediction, and all paired biomass values.
- **Reopen setup and time** restores the observation's working configuration, prediction, explanation, time, and species, and pauses active meadow playback. Reopening recalculates working charts; the stored evidence is unchanged.
- Individual removal and an explicit full-notebook state. New observations never silently replace older ones, and identifiers are not reused after removal.
- **Export field notebook** downloads a plain-text document containing every observation and its evidence. Eight significant digits retain tiny positive values using scientific notation when appropriate.
- Keyboard controls, theme-aware colors, responsive cards, and safe plain-text rendering of written explanations.

The notebook uses the app's existing saved tool state. Export a file to retain an independent copy. It is a record of modeled observations, not a collection of statistical replicates or calibrated field measurements.

## Visual review

- [Desktop notebook](desktop.png)
- [Mobile notebook](mobile.png)
- [Example export](example-notebook.txt)

## Verification

Tests cover independent snapshot copies, serialization, corrupt/duplicate/unsupported saved entries, optional text limits, precision in export, persistence through edits and tab changes, reopening, actual downloads, mobile overflow, and the 12-observation limit. Existing overview and food-web browser workflows also passed. Verification: 107 distinct ecosystem unit tests passed across the full run and targeted rerun. The full run passed 106 and hit the default five-second timeout in one existing React interaction test; its 13-test file then passed in 2.32 seconds with a 30-second allowance. Three browser workflows passed, and the notebook workflow passed again after the final wording changes. Syntax and scoped whitespace checks passed; source and desktop mirror hashes match.

Implementation: `stem_lab/stem_tool_ecosystem.js` and its desktop public mirror. Tests: `tests/ecosystem_field_notebook.test.js` and `tests/e2e/ecosystem-field-notebook.spec.ts`.
