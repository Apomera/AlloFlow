# Cell simulator UI and visual refinement

The cell interior now opens as a visual workbench: the diagram and inspector come before the supporting study panels, with DOM order matching the reading flow.

## User-facing changes

- Desktop diagram and structure inspector sit side by side. On phones the inspector follows the diagram, with the structure list afterward.
- Cleaner cell diagrams remove overlapping information boxes by default. A diagram-annotations toggle restores the detailed overlays.
- Readable HTML headings, selected-structure captions, and model-scale notes supplement the canvas.
- High-density screens use a sharper backing canvas, with pointer coordinates kept in the logical diagram space.
- Larger structure buttons, consistent spacing, restrained borders, and stronger selection states.
- Structure and connection details expand on request; the core function and study status remain immediately readable.
- A helpful empty inspector gives a clear starting action.
- Cell type remains available in focus mode. Activity navigation uses a compact disclosure in the interior workspace.
- Phone structure selection focuses and reveals the inspector.

The simulator source and desktop public mirror are synchronized. Existing study, recall, accessibility, and biology behavior is retained. Changes are local; no deployment was performed.

## Verification

The regression suite covers cell biology, renderer contrast/fibers, recall, progress persistence, render warnings, and canvas stability. The browser suite covers desktop and phone study/recall plus animal, plant, and bacterial workbenches at 1200, 390, and 320 pixels.

Visual assertions check real viewport overflow, 44px structure buttons, inspector placement, progressive disclosure, high-density backing resolution, and diagram click alignment.

```text
npx playwright test -c reports/cell-visual-enhancement/playwright.config.cjs
npx vitest run tests/cell_study_workflow.test.js tests/stem_cell_interior.test.js tests/cell_interior_fibre_emphasis.test.js tests/cell_processes_and_contrast.test.js tests/cell_progress_persistence.test.js tests/cell_sim_canvas_ref_stability.test.js tests/cell_sim_render_warning.test.js --maxWorkers=1
```

The dedicated browser configuration uses software rendering and disables video recording after the machine reported a transient GPU/context shutdown failure.

## Screenshots

- [Animal cell — desktop](focused-animal-1200.png)
- [Plant cell — phone](focused-plant-390.png)
- [Bacterial cell — narrow phone](focused-bacterium-320.png)

Final results: 53 targeted unit checks passed; six browser checks passed. The render-warning unit check was rerun with a 30-second limit after an environment timeout and passed in 227 ms. Final syntax, scoped whitespace, and simulator-mirror checks passed. Desktop, phone, and narrow-phone screenshots were visually reviewed.
