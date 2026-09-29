# Scale Explorer: inspection, landmarks, and field notebook

The explorer now connects close-up specimen study with saved student observations.

- Preserves the improved bee, ladybird, dust mite, giraffe, and T. rex models, inspection magnification, pinch gestures, and mitochondrial cutaway.
- Adds fifteen selectable landmarks across six specimens. Selecting a landmark centers the camera on the feature; its notes link to the science source. Insects have a leafy habitat scaled against a centimetre reference.
- Saves up to 24 observations, with an optional student note of up to 1,200 characters. Each object or landmark has a separate draft. Updating an observation replaces that record without duplicating it.
- Remembers the viewing angle, magnification, and cutaway state. Returning from the chart to a saved 3D landmark recreates its view. A recorded personal height remains the observation's reference size.
- Downloads saved notes as plain text with dimensions, scientific notation, landmark descriptions, source links, uncertainty notes, and links to the specimens. Unsaved drafts are excluded.
- Supports the scale chart when WebGL is unavailable, keyboard operation, a 320px phone layout, and removal with predictable keyboard focus. Drafts and observations use the host's existing tool state and retain unrelated tool data.
- Validates restored records and bounds storage. A full notebook explains how to make room and continues to allow updates.

The models are educational illustrations; their colors and anatomical details are approximate. Inspection moves the camera without changing measured model dimensions.

## Verification

Final results: **93 / 93 focused unit and fullscreen checks passed** in 18 seconds, and **10 / 10 browser scenarios passed**, without retries, in 5.4 minutes. The unit JSON result is saved locally as `unit-results.json`. Source syntax, whitespace, and desktop source parity checks also passed.

Run the unit and browser suites sequentially to avoid competing with the software GPU:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scaleexplorer_fullscreen_state.test.js tests/scale_explorer_notebook.test.js --maxWorkers=1 --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=list
```

Browser checks exercise actual WebGL camera state and dimensions, every catalog destination, touch input, landmark projection, model and texture fallbacks, saved-view restoration across renderer recreation, downloads, reopening drafts, personal height, capacity limits, mobile layout, and context release.

The new notebook scenarios found and resolved two navigation issues: a feature selection could overwrite the restored camera angle, and a changed personal height could briefly select a neighboring object from the previous size list.

Screenshots: [desktop notebook](desktop-notebook.png), [320px phone notebook](phone-notebook.png).

## Landmark sources

The feature notes retain their primary references: [Natural History Museum insect anatomy](https://www.nhm.ac.uk/schools/teaching-resources/key-stage-1/animal-and-human-bodies/parts-of-an-insect.html), [beetle wing cases](https://www.nhm.ac.uk/discover/uk-beetles-british-most-spectacular-and-beautiful.html), [AMNH T. rex reconstruction](https://www.amnh.org/exhibitions/permanent/saurischian-dinosaurs/tyrannosaurus-rex), [NLM mitochondrial cristae](https://www.ncbi.nlm.nih.gov/mesh/68051336), [NHLBI red blood cells](https://www.nhlbi.nih.gov/health/sickle-cell-disease), and [NHGRI DNA](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet).
