# Scale Explorer: physical scale drawings

The drawing workshop turns a length comparison into a model a learner can print and measure. Choose a reference, set its size in millimetres, centimetres, metres or inches, and calculate the second measurement at that same physical scale. Unit changes preserve the chosen physical size. Both magnification and reduction work, and distance references keep their own measurement type.

- The preview keeps true dimensions. A page-edge arrow marks a dimension above the drawing's 180 mm usable width. A separate locator marks a dimension below 0.5 mm; even an extremely small line keeps its positive mathematical length.
- **Fit both on the drawing** makes the larger measurement a 160 mm reference. This changes the model scale explicitly, while preserving the underlying length ratio.
- Reference sizes accept complete positive decimal or scientific values from 10⁻⁶ to 10⁶ mm. Invalid sizes cannot save a plan. Real and drawing dimensions have a textual table with row and column headers.
- Saved plans capture the chosen measurements, including personal height. Draft edits, later height changes and unit changes do not modify the saved SVG or notebook evidence. Restoring and removing a plan return keyboard focus to the workshop summary. Removing a saved plan preserves its draft and other notebook records.
- The saved SVG is a standalone 210 × 145 mm sheet. Its dimension coordinates are millimetres, and it includes a 10 mm calibration ruler. Print at 100% and check that ruler; fit-to-page printing changes the dimensions. Each row represents one stated length, and dashed dimension lines distinguish distances from object diameters. The sheet does not map physical positions.
- Exports preserve literal explanations safely. The SVG's accessible description includes both real and drawing measurements, the model scale and printing guidance. The notebook includes saved drawing evidence alongside observations, investigations and cube models. Failed downloads retain the saved plan. The workshop works without WebGL and leaves the atlas's measured 3D specimens and context count unchanged.

## Verification

All 119 numerical, source-contract and fullscreen checks and all 22 browser scenarios passed against the integrated explorer, without browser retries. The final SVG accessibility refinement also passed focused reruns of 91 checks and all three drawing browser scenarios.

Numerical checks cover exact unit conversion, validation, every catalog-pair ratio, magnification, distances, captured height, damaged saved state, unclamped tiny lengths and physical SVG coordinates. Browser checks exercise the live 3D comparison, unit switches, page fitting, SVG rendering, drafts, height changes, saved notebook exports, a 320px fallback and a simulated download failure.

Run browser and fullscreen suites sequentially:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scale_explorer_notebook.test.js tests/scale_explorer_comparison.test.js tests/scale_explorer_inquiry.test.js tests/scale_explorer_scaling.test.js tests/scale_explorer_drawing.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=180000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-drawing.spec.ts tests/e2e/scale-explorer-scaling.spec.ts tests/e2e/scale-explorer-inquiry.spec.ts tests/e2e/scale-explorer-comparison.spec.ts tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=line
```

Review the [desktop workshop](desktop-workshop.png), [phone workshop](phone-workshop.png) and [rendered printable drawing](printable-drawing.png). The [Earth and Moon SVG](earth-moon-drawing.svg) is the actual saved browser download.
