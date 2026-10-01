# Water Worlds: field observations and storm phases

This enhancement gives learners a way to collect and compare evidence from the actual model.

## Changes

- Rainfall and the following 60-minute drainage period have separate progress segments and phase explanations. Recorded-time inspection drives the same display.
- The highest sampled-flow shortcut revisits the earliest maximum in the minute samples. It distinguishes sampled flow from the peak measured at smaller solver steps.
- Follow this patch saves the selected cell, exact model minute, recorded land cover, weather, local stores, valley totals, stream flow, and an optional note. Capture pauses playback atomically.
- Up to six observations survive land edits, later storms, resets, and mode changes. Explicit removal frees space; observation numbers remain stable. Notes remain editable.
- Learners can compare two observations using signed differences. Context explains whether they refer to the same patch, different places, or different storm setups.
- Revisit is available for completed current runs whose starting world and weather match the saved record. It selects the recorded place and time without changing the completed result.
- JSON and readable reports include observation evidence. Exports remain available when observations are the only retained records. Restored readings are recomputed from their recorded conditions.
- Keyboard section shortcuts and return controls connect the landscape, ground inspector, and notebook.

The numerical water equations are unchanged. Source and desktop copies match. The observation collection extends the existing saved-state format; older sessions start with an empty collection.

## Validation

- All 55 model tests passed across seven Water Worlds suites. The 12 new observation tests cover exact readings, provenance, immutability, capture limits, restoration, note editing, and exports. See `model-tests.json`.
- All 12 new browser workflow groups passed, plus all 22 existing Water Worlds browser groups. No browser exceptions were detected.
- All seven new axe audits passed: light desktop/390px/320px, dark desktop/320px, and high contrast desktop/320px.
- Desktop, notebook, comparison, and phone captures were visually inspected. JavaScript syntax, focused whitespace checks, and source/desktop hashes passed.

Run the model suite with:

```text
node node_modules/vitest/vitest.mjs run tests/water_worlds --maxWorkers=1 --pool=threads --testTimeout=30000
```

Run the new workflow checks with `node dev-tools/water_worlds_evidence_qa.cjs` and the existing regression workflows with `node dev-tools/water_worlds_qa.cjs`.

These checks use the local isolated Water Cycle preview. The runtime files are ready for the project's normal release process.
