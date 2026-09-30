# Scale Explorer: drawing collections

The drawing workshop now holds up to eight measurements at one physical model scale. Open **Measurements on this drawing**, choose an addition, and use **Add to drawing**. The reference and second measurement retain their existing controls. Additions can be removed or sorted from shortest to longest; duplicate choices and a full collection explain why adding is unavailable.

- **Fit all on the drawing** makes the largest measurement a 160 mm reference while retaining every distinct captured measurement. The scale changes explicitly, and all length ratios remain exact. An invalid draft size can be recovered by fitting.
- The preview and dimension table cover the whole collection. Distances retain dashed lines, dimensions above 180 mm retain page-edge arrows, and dimensions below 0.5 mm retain separate locators. Tiny dimension lines keep their positive mathematical lengths.
- Each selection captures its stated dimension and personal height. Sorting, removal, later height changes and draft notes do not alter the saved collection. Returning to a saved plan restores its captured measurements and ordering. Removing a saved plan preserves the draft, field notes, investigations and cube models.
- Saved SVG and notebook downloads include every captured measurement. The SVG has exact millimetre coordinates, a 10 mm calibration ruler, printing guidance and an accessible description containing all real and drawing dimensions. Literal plan text is preserved safely.
- Collection sheets grow with the row count, up to **210 × 283 mm** for eight measurements, within an A4 sheet. Legacy two-measurement drawings retain their **210 × 145 mm** layout. Print at 100% and check the calibration ruler.
- Older saved plans remain compatible. Malformed additions are bounded, reconstructed from known measurements and deduplicated. Distinct captured personal heights remain distinct when fitting changes the reference. All controls work without WebGL and leave the atlas comparison's measured 3D specimens unchanged.

## Verification

The integrated explorer passed **136 numerical, compatibility, terrain, river and fullscreen checks across ten suites**. All **25 browser scenarios** were verified across the collection, drawing, scaling, inquiry, comparison, notebook, landmark, inspection and atlas suites.

The full browser run passed 22 scenarios. Its first atlas scenario reached the 180-second overall test budget after the long rendering sequence, leaving the two following serial scenarios unrun. An isolated rerun kept every atlas assertion and raised only the overall budget to 360 seconds; all three atlas scenarios and all three final collection scenarios passed. The final drawing compatibility and collection numerical rerun also passed all 12 checks.

The six new numerical checks cover legacy records, damaged collections, exact ratios, fitting all eight measurements, preserved heights and state, physical SVG dimensions, safe descriptions and printed label spacing. Three new browser scenarios exercise a live 3D comparison, printable output, collection capacity, saved evidence, reopening, height changes, a 320px fallback, download failure and accurate fitted counts when identical captures coalesce. Browser and fullscreen suites run sequentially.

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scale_explorer_notebook.test.js tests/scale_explorer_comparison.test.js tests/scale_explorer_inquiry.test.js tests/scale_explorer_scaling.test.js tests/scale_explorer_drawing.test.js tests/scale_explorer_collections.test.js tests/scale_explorer_terrain.test.js tests/scale_explorer_river.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=180000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-collections.spec.ts tests/e2e/scale-explorer-drawing.spec.ts tests/e2e/scale-explorer-scaling.spec.ts tests/e2e/scale-explorer-inquiry.spec.ts tests/e2e/scale-explorer-comparison.spec.ts tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --retries=0 --reporter=line
```

Review the [desktop collection](desktop-collection.png), [phone collection](phone-collection.png), [printed sheet](printable-collection.png), and [actual saved SVG](model-collection.svg).
