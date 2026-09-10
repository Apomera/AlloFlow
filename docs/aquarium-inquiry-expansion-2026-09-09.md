# Aquarium inquiry expansion — 2026-09-09

Paired experiments now support filter level and the biomass of each plant species present in the saved baseline, alongside biological lights and air-pump level. Saving a new baseline stores the plant names and species-specific model biomass limits. Changing one plant species preserves its health, all other plant species, water and residents. Multiple matching clumps share that species' biomass. Zero biomass retains the existing plant entry. Filter trials preserve bacterial state, faults and equipment condition.

Validation is shared by the UI and trial creation. It rejects missing values, invalid booleans, nonfinite or out-of-range biomass, unstocked species, unchanged values and invalid equipment levels. Plant trials retain their saved limits during deterministic replay. Older lights/pump trials remain replayable and exportable; older full baselines without plant metadata need a fresh save to offer plant experiments.

Learners can graph oxygen, carbon dioxide, ammonia, nitrite, nitrate, pH or temperature. Changing the graph preserves live and trial states. Solid and dashed lines distinguish A and B alongside exact numerical readings and units.

The Review and share disclosure provides reasoning prompts and three actual downloads:

- Text report: prediction, starting/control/intervention settings, final measured comparisons, learner explanation, review prompts and model limitations.
- CSV: every recorded time and water metric, with units, baseline, A, B and B-minus-A values.
- JSON: readable evidence metadata, model identifier, limitations, saved baseline, both trial states, hourly series, prediction and reflection. This is an export, not an import feature.

Exports are generated locally. They do not alter the aquarium or send the report to another person.

## Validation

87 tests passed in 3 targeted suites, including 20 inquiry tests. Actual handler tests cover biological effects, isolated state, replay, old trial compatibility, exported contents and selectable graphs.

Real Chromium/WebGL runs passed at 1440 and 390 pixels. Browser tests exercised the plant/filter controls, invalid biomass, six-hour runs, nitrate graph, three downloaded file formats, saved reflections, reload, baseline recovery and stable live canvas. No runtime or console errors or horizontal document overflow. Mobile screenshot reviewed.

Source and desktop mirror SHA-256: 66fee11cce2f28cee5d5578f4814ca36d01473566b289595d206dd318af93c6e

Evidence: .codex-artifacts/inquiry-v10/delivery-validation.json. Browser captures and sample downloaded reports: .codex-artifacts/aquarium-visual-qa/inquiry-v10-first/.
