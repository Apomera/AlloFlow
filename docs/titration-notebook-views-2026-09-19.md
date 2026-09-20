# Titration Lab: notebook views

Updated 19 September 2026. Local changes only; not deployed.

The notebook can hold readings from multiple setups and investigations. Its new Show saved readings control makes those readings easier to find without changing stored observations.

- All readings shows the complete notebook in saved order.
- Current setup and indicator matches the live preset, displayed setup, signal type, and indicator. Changing the live volume does not hide readings.
- Investigation evidence shows only readings credited to the current study, including while paused. Older readings and reused IDs with changed values do not count as evidence.

The visible count distinguishes filtered results from total saved readings. Empty views explain that other readings remain available; Show all readings returns focus to the view selector. Capacity and the save limit reflect the entire notebook.

Comparisons, plots, CSV downloads, and Clear notebook use the complete dataset, as the interface explains. Editing a visible observation preserves hidden notes. Removal and undo preserve the active view and saved snapshot. Changing views does not invalidate undo.

The collection tracker's Open observation buttons reveal hidden readings and focus the matching note field. Repeated visits work, and subsequent filter changes remain under the learner's control. View selection is local UI state and returns to All readings after remount; saved data and investigation progress persist. Filtering keeps the existing 3D viewer instance.

## Validation

- 122 tests passed across seven targeted suites, including eight new filtering cases.
- 84 browser accessibility/layout scans passed at 1200 and 320 px with no browser errors. The harness checks panel overflow, accessibility violations, and ARIA references where applicable.
- Browser checks cover mixed setups and indicators, hidden notes, complete CSV and plot datasets, paused evidence, removal/undo, hidden full-capacity readings, repeated guided focus handoffs, remount, and 3D viewer identity. Prior investigation, report, and context-loss regressions also pass.
- Evidence, empty-state, and forced-colors phone screenshots reviewed. Automated contrast checks run in normal colors; forced colors receive structural checks and visual review.
- JavaScript parses; source and desktop public copies match. Ten new English fallbacks match the catalog. Other translations remain pending.

Results: [validation](../reports/chemistry-refinement-2026-09-06/titration-notebook-views-validation.json), [browser harness](../reports/chemistry-refinement-2026-09-06/titration-notebook-views-browser.cjs).

Previews: [evidence view](../reports/chemistry-refinement-2026-09-06/titration-notebook-views-evidence-320.jpg), [empty view](../reports/chemistry-refinement-2026-09-06/titration-notebook-views-empty-320.jpg), [forced colors](../reports/chemistry-refinement-2026-09-06/titration-notebook-views-forced-colors-320.jpg).
