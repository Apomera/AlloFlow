# Water Cycle: plan the next experiment

In Explore, open **What the data shows** and find **Plan your next test**. Choose an input, read which model readings to watch, then open the named control. The existing **Change the weather** shortcut also reaches Climate Lab from every Explore section.

## Learning and navigation

- Seven choices connect sunlight and temperature to the evaporation index, and rainfall intensity, saturation, permeability, slope, and cover to the two land indices.
- The initial choice follows the current focus. A valid learner choice stays selected when the focus changes.
- Selection changes the intended target only. Opening a control switches to the conditions workspace, opens its climate or land disclosure, exits Focus Canvas, and focuses the selected slider or categorical option.
- Existing inputs, saved evidence, process-comparison writing, and paused journey state remain intact. A new baseline is saved only when none exists, using the existing explicit baseline action and its prediction/replay reset behavior.
- Missing, incomplete, unchanged, one-input, and several-input baselines have distinct guidance. Existing baselines are preserved. Several changes point to **Keep only this change** in the comparison workspace; choosing a control does not isolate those changes.
- Land Lab retains its open/closed choice in tool state. Reduced motion uses immediate scrolling to the focused control.

## Scope of the evidence

The panel uses the existing comparison readings. It does not add a new simulation or change model equations. Wind remains available for scene transport observations; it does not affect the three saved comparison readings and is omitted from this quantitative bridge.

Evaporation is limited to the model's index range, and land readings are rounded. A real input change can leave a displayed reading unchanged. The panel asks learners to inspect signed differences rather than promising a rise or fall. Land indices are independent teaching scores, not measured water amounts or groundwater recharge. The evaporation index cannot establish cloud formation or isolate plant water use.

## Verification

The focused review covers helper behavior, actual rendered navigation, baseline handling, preservation, visible keyboard focus, reduced motion, and narrow/theme layouts. Raw results and representative captures are retained in this directory.

All 200 unique targeted tests passed: 65 new helper tests, 83 process-comparison tests, 32 notebook tests, four baseline tests, and 16 host/land regressions. See [behavioral aggregate](unit-results.json) and [compatibility results](compatibility-results.json). The aggregate preserves the initial 183/184 result and the 2/2 automatic-baseline follow-up. One stale assertion was aligned with the already committed prompt **Which effect will you investigate?**; its original failure remains in [raw initial results](unit-initial-results.json).

The [browser aggregate](results.json) records 118 passing assertion executions, 116 unique labels, and 17 clean scoped axe audits. No unresolved failures or page runtime errors remain. It covers all seven destinations, weather shortcuts from Journey/Data/Check, Focus Canvas exit, baseline variants, native keyboard focus, reduced motion, desktop and 320px layouts, and accessible themes.

Two complete learning loops verify actual numerical changes: Sunlight changes the evaporation readout from 1.00x to 1.05x; changing permeability changes runoff from 47 to 43 and infiltration from 55 to 65. Each changes one input, keeps the baseline and saved writing, and returns to Data with an accurate one-input status. These are local model examples, not physical measurements.

Raw reports retain two harness interruptions before weather-shortcut activation, the initial three forced-colors Land Lab contrast nodes, and two follow-up predicates that incorrectly expected a static metric name to change. The aggregate links those records to corrected native-disclosure/accessible-name handling, explicit `CanvasText` declarations, and checks of the actual numerical readout. See [initial run](initial-results.json), [shortcut interruption](shortcut-results.json), [pre-correction run](pre-forced-colors-results.json), [color/learning-loop follow-up](followup-results.json), and [numerical checks](learning-loop-results.json).

The functional matrix, behavioral suites, and light/dark captures used source SHA-256 `5022d843e629bff62ad3eec609c5191254d2d9cb465ae851d37f06e58322d335`. Final forced-colors audits and numerical loops used source/public SHA-256 `35eff63fc4c5ecc4d2755a92c2b0a688e80801daea5520d797b46af21a7fbdaa`. The only product change between them was explicit forced-colors text declarations. Forced-colors captures were refreshed on the final hash. The isolated review's owned browsers and servers were closed.

Repeat the browser review with `node dev-tools/watercycle_next_experiment_qa.cjs`. Behavioral and compatibility results identify their test files and source provenance.
