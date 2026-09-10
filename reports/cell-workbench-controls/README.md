# Cell workbench controls and navigation

Continued the cell simulator UI refinement with controls that remain available in focused study.

- Moved the existing zoom, study-label, and high-contrast controls beside the diagram, so the full and focused workspaces share one set of controls.
- Added Reset diagram to restore zoom, labels, contrast, and annotations while preserving the selected structure, learning progress, and animation pause.
- Added a structure/function search with a review-only filter and clear-filter recovery. Search preserves typed case and spaces.
- Structure choices now show New, Explored, Mastered, or Needs review.
- Added Browse structures in the inspector, returning keyboard focus to the search field.
- Kept the 44px-or-larger touch controls, responsive layout, and recall answer-hiding behavior.

The root simulator and desktop public mirror are synchronized. No deployment was performed.

## Validation commands

```text
npx playwright test -c reports/cell-workbench-controls/playwright.config.cjs
npx vitest run tests/cell_study_workflow.test.js tests/cell_processes_and_contrast.test.js tests/cell_progress_persistence.test.js tests/cell_sim_render_warning.test.js --maxWorkers=1 --testTimeout=30000
```

Browser checks cover the previous study and visual flows plus the new control/search workflow at 1200px and 320px. The local configuration uses software rendering and disables video recording to avoid the previously observed GPU teardown instability.

Screenshots: [Desktop](workbench-1200.png), [Narrow phone](workbench-320.png).

Final verification: all 8 browser checks passed and the structured unit report records 16 passed, 0 failed. The final 320px screenshot was visually reviewed. JavaScript syntax, scoped whitespace, and source/mirror parity checks passed. The tooltip test now checks minimum readable text size and bounds across viewport sizes and device pixel ratios instead of pinning obsolete fixed dimensions.
