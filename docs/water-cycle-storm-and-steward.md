# Storm experiments and watershed decisions

## Storm Lab: One change, two storms

Choose **Compare two setups** in the Storm Lab header to reach the experiment workspace.

Three starting questions explore below-cloud humidity, a warm middle layer, and updraft strength. Each loads a starting storm and pins its model inputs as setup A. Learners can also pin their own current setup. Setup B follows the chamber controls.

1. Record a prediction and select a variable.
2. Adjust **Test value for B**. The paired cards show temperature layers, precipitation type, surface arrival, and intensity.
3. Read the changed-input list. **Hold other inputs at A** preserves the selected test value and restores every other model condition, including storm time.
4. Explain the observed difference and save the comparison. Up to four comparisons retain both setups and the learner's writing. Download an individual text record or view either saved setup in the chamber.

Pinning and guided adjustments pause storm time to prevent an unnoticed change in storm stage. Animation and camera settings are presentation choices and are excluded from the comparison. If several physical inputs change, the workspace labels the result as a scenario comparison that cannot isolate one cause. Unchanged results are also evidence.

### Model boundaries

The comparison uses the existing precipitation model. It recomputes both outcomes from their saved inputs; it does not change model equations or trust saved result labels. Twelve conditions are recorded: cloud moisture, cloud/middle/surface temperatures, below-cloud humidity, updraft, cloud depth, wind speed and direction, terrain, storm time, and lightning distance. Distance affects thunder timing rather than precipitation intensity.

Intensity is a relative 0–100 index, not a measured rainfall rate. The temperature column has three levels. A controlled result describes this simplified model and does not establish what every real storm will do.

New tests can retain previous writing so learners can revise it. Saved comparisons remain unchanged by later controls, new questions, resets, and mode changes. The older observation notebook remains available separately.

## Steward: Preview, act, explain

Steward action buttons now open a decision preview. The preview names the affected components, shows quality, connectivity, and community support before and after the action, and shows the time remaining. Effects use the same capped calculations as the applied action. A score near 100 therefore shows only the available improvement. Support losses appear alongside gains.

**Apply action** spends the hours and records the result. **Cancel** returns focus to the originating action without spending hours or changing the watershed. Actions outside the available budget cannot be applied.

The year review includes **Where did the change come from?** Select a watershed component to trace its scores through:

- the start of the year;
- the learner's actions;
- routine yearly changes;
- the year's event;
- the difficulty adjustment;
- connected watershed effects.

Each stage records the actual model state, so the changes reconcile to the final scores. Campaigns saved before these records existed clearly identify missing start-of-year evidence rather than reconstructing it.

These are qualitative campaign scores. Their changes are game rules, not measured ecological effects or predicted recovery times. The annual event and the connected effects are shown after the year ends; an action preview describes its immediate effects.

## Validation commands

```powershell
node node_modules/vitest/vitest.mjs run tests/watercycle_storm_experiment.test.js tests/watercycle_steward_decisions.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node dev-tools/watercycle_storm_experiment_qa.cjs
node dev-tools/watercycle_steward_decisions_qa.cjs
```

The browser scripts cover workflow behavior, preserved evidence, keyboard focus, narrow screens, and scoped accessibility checks. Generated screenshots and reports are stored under `scratch/storm-experiment-review` and `reports/watercycle-steward-decisions`.

### Verified in this pass

- 85 targeted tests passed across seven test files. One existing server-render check exceeded 30 seconds while other checks were running; its isolated retry passed in 11 seconds.
- 12 Storm Lab and 5 Steward browser workflow groups passed.
- 17 scoped axe audits passed across desktop and narrow layouts. Storm Lab additionally covers high contrast and reduced motion.
- The existing connected storm-to-stream investigation browser check passed, including evidence export and fair-test restoration.
- The water-cycle accessible-name language scan has 194 findings against its existing limit of 197; these changes introduce no regression. New copy has English fallback keys registered in both catalogs. Additional language translations were not authored.

Repository-wide language checks still report failures in other tools. Those unrelated files and their existing catalog differences were left intact. The separate campaign-adventure prototype's frozen source snapshot was not regenerated by this pass.
