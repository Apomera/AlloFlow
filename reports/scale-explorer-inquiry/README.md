# Scale Explorer: guided investigations and recorded predictions

The estimation activity now follows a complete prediction, exploration and reflection workflow. Students can investigate six themes, or generate mixed pairs that span two to twenty powers of ten. Themes cover personal height and Earth, DNA and a blood cell, Earth and Moon, Earth and Sun, the atomic nucleus, and the distance to another star.

Each investigation captures its measured references when it starts. Later height changes cannot alter an earlier prediction's answer. “Show me” opens the existing comparison studio with those recorded dimensions, including the original personal height. Returning to a saved investigation restores its prediction and reflection before exploring it again.

- Predictions accept zero, fractions and finite numbers from 0 to 45. Invalid or incomplete values cannot reveal an answer or advance the activity count.
- A logarithmic plot compares the prediction with the measured gap. Feedback explains whether the predicted ratio was larger or smaller, and gives the multiplicative difference.
- Measurement evidence states both dimensions and retains catalog uncertainty notes. Reflection prompts distinguish widths, volumes, model illustrations and distance references.
- The current prediction and reflection draft survive reopening. Up to twelve completed investigations can be saved, updated, revisited or removed. Existing entries remain editable at capacity.
- Notebook downloads include saved investigations alongside field observations. Unsaved reflections stay out of the download. Download failure keeps the saved work and reports the outcome beside the investigation controls.
- The workflow works with the 3D atlas and its chart fallback, including a 320px phone. Revisit and removal restore keyboard focus; the plot has a textual accessible description.

The source mirrors and all available English catalogs are synchronized. Existing host state, field observations and rendering lifecycle behavior are preserved.

## Verification

The numeric, persistence, localization, source and fullscreen suite passed **104 checks**. The complete Scale Explorer browser suite passed **16 scenarios** without retries. Browser checks inspect actual scene scales, preserve recorded height through reopening, verify plot coordinates, exercise invalid input and zero, update reflections without duplicates, inspect downloaded evidence, and cover notebook capacity and download failure without WebGL.

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scale_explorer_notebook.test.js tests/scale_explorer_comparison.test.js tests/scale_explorer_inquiry.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-inquiry.spec.ts tests/e2e/scale-explorer-comparison.spec.ts tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=line
```

Run the browser and fullscreen suites sequentially to avoid software GPU contention.

Screenshots: [recorded investigation](desktop-investigation.png), [phone investigation at capacity](phone-investigation.png).
