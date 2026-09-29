# Water Worlds: account for a saved change

Choose two saved observations in the field notebook, then open **Account for this change**. When both moments describe the same cell and starting conditions, the learner can choose surface water, soil water, or delayed storage. The panel shows water before, water entering, water leaving, and water after, with the modeled processes contributing to each amount.

The account follows elapsed time from the earlier observation to the later one. A message explains reversed selection order. Pairs from different places or storm setups explain why a cell interval account is unavailable; identical times have no interval to account for. Recorded observations can still be used after the live valley is edited or a later storm begins.

## Scientific scope

`WaterWorldsKernel.observationBudget` is a pure reconstruction helper. It uses the existing solver and its process traces at each saved moment, then subtracts the cumulative totals. Reconstructing both endpoints preserves the solver's fixed steps and final partial step for fractional saved times. It uses the saved starting world, rain, cell, and elapsed time; cached observation measurements do not drive its calculations.

The solver equations, saved evidence, and live world are unchanged. The panel separates internal store transfers from water leaving the local valley. Delayed releases enter a shared stream pool, as in the existing model; individual underground routes are not represented. An interval account describes this model run. A controlled replay is still needed to test a ground-cover claim.

## Validation

- 26 tests passed in `water_worlds_observation_budget.test.js` and `water_worlds_budget.test.js`.
- The tests check independent solver-trace totals, all stores, rainfall patterns, stream receipts, arbitrary fractional minutes, storm boundaries, later storms, reversed order, malformed inputs, and immutability.
- 118 browser checks passed, including exact and rounded readings, each store choice, keyboard selection and focus, disclosure state, unchanged exported evidence, and incompatible-pair explanations.
- 14 full-view accessibility audits passed with no violations. Light, dark, and high contrast themes were checked at 1440, 390, and 320 pixels, alongside collapsed, incompatible-pair, and forced-colors states.
- No horizontal page overflow or browser errors were found. Desktop and narrow-phone screenshots were visually reviewed.

Run `node dev-tools/water_worlds_observation_budget_qa.cjs` for an isolated preview and browser checks. Use `--serve` to leave a preview running at port 8771, or set `WATER_ACCOUNT_PORT` to choose another port.

The report includes `browser-results.json`, `model-tests.json`, and screenshots of the expanded account in light and dark themes.
