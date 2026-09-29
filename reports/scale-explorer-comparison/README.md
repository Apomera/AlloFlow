# Scale Explorer: measured comparisons and exact scale bridges

The comparison panel now opens a studio in the existing atlas renderer. Two catalog specimens use the same unit, with their characteristic dimensions kept in their true ratio. The camera uses parallel projection so depth does not introduce a perspective size difference. Fitting responds to the pair, viewport and orbit; inspection changes the camera without resizing either model.

- Compare from the focus card or the two selectors. Swap the specimens, orbit, inspect either one, or return to exploration with Escape. Remembered selectors use the host's existing tool state.
- The renderer keeps the smaller specimen's actual dimensions even below a screen pixel. A dashed position locator offers an accessible route to inspect it at its own scale. Both recorded dimensions remain available as text.
- A shared-scale length diagram supports the chart and WebGL failure path. Its bars retain the actual ratio, including proton-to-universe comparisons; locators do not inflate the bars.
- The scale bridge visits exact tenfold measurements. Nearby catalog examples show their separate measured sizes and have their own Inspect action. The final step closes the fractional gap, and exact whole-decade endpoints appear once.
- Personal height changes the comparison and bridge immediately. Saved notebook measurements remain recorded snapshots. Inspecting one specimen enables notebook saves again.
- Measurement notes expose uncertainty and distinguish distance references from specimen dimensions. Length ratios do not imply area, volume or mass ratios.

The studio reuses the existing WebGL context, model cache and disposal path. Catalog models remain educational illustrations with the existing science sources and asset provenance.

## Verification

All **97 numerical, source, notebook and fullscreen checks** passed. The complete browser suite passed **13 / 13 scenarios** without retries; targeted comparison and mobile checks also cover the final label spacing and accessible camera instructions. Source syntax, whitespace and desktop source parity checks passed.

The numerical suite checks every catalog pair, including endpoint identity, monotonic steps, exact tenfold factors, the final factor, and the complete product. Browser checks inspect actual scene root dimensions and camera projection, exercise locators and exact navigation, preserve notebook snapshots and other host data, reopen selections, and cover a 320px phone without WebGL.

Run browser and fullscreen suites sequentially to avoid software GPU contention:

```text
node --check stem_lab/stem_tool_scaleexplorer.js
node dev-tools/sync_scale_explorer_atlas.cjs
node node_modules/vitest/vitest.mjs run tests/scale_explorer.test.js tests/scale_explorer_notebook.test.js tests/scale_explorer_comparison.test.js tests/scaleexplorer_fullscreen_state.test.js --maxWorkers=1 --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/scale-explorer-comparison.spec.ts tests/e2e/scale-explorer-notebook.spec.ts tests/e2e/scale-explorer-landmarks.spec.ts tests/e2e/scale-explorer-inspection.spec.ts tests/e2e/scale-explorer-atlas.spec.ts --workers=1 --reporter=list
```

Screenshots: [Earth and Moon](earth-moon-studio.png), [subpixel locator](subpixel-locator.png), [phone diagram](phone-diagram.png).
