# Scale Explorer: length, area and volume

The similar-shape lab gives the explorer's shape assumptions a concrete visual model. Learners change every edge of a unit cube and compare copies at one shared scale. Doubling an edge produces four times the one-face area and eight times the volume; halving it produces one-quarter the area and one-eighth the volume. The surface-to-volume ratio changes by the reciprocal of the edge factor.

- A numeric field, logarithmic slider and half/double/triple/tenfold presets support factors from 0.01 to 10⁴⁵. Invalid factors cannot create or save a model.
- Square and cube diagrams retain the true edge ratio. Whole-number ratios up to eight use visible grid divisions. Dashed locators identify copies below two diagram units without enlarging their dimensions.
- A table distinguishes one-face area, six-face surface area, volume and surface-to-volume ratio. It states the units and displays three significant figures, including scientific notation for extreme values.
- A selected object comparison can supply the numeric edge factor. The model records both references, including personal height, and explicitly supplies the geometric-similarity assumption. Distance references cannot become solid edges; different objects' volume or mass is not inferred from one length ratio.
- The current factor and explanation survive reopening. Saving records a separate notebook snapshot. Later drafts do not change downloaded evidence. The saved model can be updated, restored or removed while preserving field observations and investigations.
- The lab works without WebGL and does not create another rendering context or rescale the measured atlas specimens. Keyboard focus returns to its summary when restoring or removing a record. Figures have textual descriptions and the table has row and column headers.

## Verification

All 112 numerical, source-contract and fullscreen checks and all 19 browser scenarios passed. The exhaustive catalog-pair check was rerun with a longer timeout after the busy host exceeded the initial 30-second limit.

Numerical checks cover complete input validation, every catalog-pair ratio, squares and cubes of the factor, shrinking, reciprocal surface-to-volume changes, true diagram dimensions, grid limits, malformed records, captured height and scientific notation. Browser checks exercise the existing 3D studio, reopen drafts and saved evidence, inspect notebook downloads, and verify a 320px fallback with the maximum factor and a simulated download failure.

Run the browser and fullscreen suites sequentially to avoid software GPU contention:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scale_explorer_notebook.test.js tests/scale_explorer_comparison.test.js tests/scale_explorer_inquiry.test.js tests/scale_explorer_scaling.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=180000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-scaling.spec.ts tests/e2e/scale-explorer-inquiry.spec.ts tests/e2e/scale-explorer-comparison.spec.ts tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=line
```

Screenshots: [comparison-derived model](desktop-model.png), [phone model at an extreme ratio](phone-extreme-model.png).
