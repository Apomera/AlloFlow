# Cell illustration visual pass

This pass refines the native interactive illustrations, building on the existing cell workbench layout.

## Visual improvements

- Directional lighting, a soft specimen shadow, and a layered membrane rim give the cell more depth.
- Nuclei and nucleoli use shaded surfaces and clearer nuclear-envelope detail.
- Mitochondria have curved outlines, layered shading, and clipped internal cristae.
- Chloroplasts show shaded envelopes and distinct stacks of thylakoid discs.
- Vesicles and lysosomes have dimensional surfaces; selected organelles have quiet white brackets.
- Membrane lipid heads follow the actual rounded rectangular or capsule-shaped boundaries of plant and bacterial cells.
- The structure inspector includes an enlarged still crop rendered from the same specimen, keeping small structures legible on phones.
- Plant smooth ER and vesicles, already present in the structure catalogue, now have explicit positions in the illustration.

All illustrations remain teaching schematics; detail crops are not microscope images or calibrated magnifications. Existing unrelated and concurrent simulator enhancements were preserved.

## Validation

- 44 unit checks passed across illustration geometry, cell biology, cytoskeleton emphasis, process diagrams, and render stability.
- Nine Chromium checks passed across animal, plant, and bacterial cells at 1200, 390, and 320 pixels. Checks cover high-density rendering, nonempty detail crops, pointer selection, inspector placement, touch target sizes, and horizontal overflow.
- Desktop and phone screenshots visually inspected.
- JavaScript syntax, scoped whitespace, and source/deployment mirror parity passed.
- Existing canvas test doubles were updated to support linear gradients and to distinguish consecutive cytoskeleton strokes from mitochondrial folds.

## Previews

- [Animal cell, desktop](animal-mitochondria-1200.png)
- [Plant cell, desktop](plant-chloroplast-1200.png)
- [Bacterial cell, desktop](bacterium-plasmid-1200.png)
- [Plant cell, phone](plant-smoothER-390.png)
- [Animal cell, phone](animal-nucleus-390.png)
- [Bacterial cell, narrow phone](bacterium-cellMembrane-320.png)

## Reproduce

    npx playwright test -c reports/cell-illustration-pass/playwright.config.cjs
    npx vitest run tests/cell_illustration_geometry.test.js tests/stem_cell_interior.test.js tests/cell_interior_fibre_emphasis.test.js tests/cell_processes_and_contrast.test.js tests/cell_sim_render_warning.test.js --maxWorkers=1 --testTimeout=30000

Results: browser.log and unit-final.log in this directory. Changes are local; no deployment was performed.
