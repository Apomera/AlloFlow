# Cell simulator study enhancement

Implemented a focused structure-study workspace in `stem_lab/stem_tool_cell.js` and synchronized its desktop public mirror.

## Changes

- Optional focused view keeps the cell diagram, selected structure, and study controls together. The full workspace remains one button away.
- Previous/next structure, next unexplored, practice recall, and review-queue shortcuts.
- Explicit animation pause/resume control, with reduced-motion handling retained.
- Short recall clues replace definitions that named the answer. Reference panels and the labeled diagram stay hidden until submission.
- Bounded distractor selection prevents short sampling cycles from hanging the renderer, while preserving existing answer order for resumed checks.
- Accurate recall percentage, duplicate-submission protection, and keyboard focus when entering, advancing, and leaving recall.
- Review queue resets conflicting directory filters; empty searches offer a clear recovery action.
- Improved selected-structure button contrast.

Existing concurrent osmosis, progress, and host changes were preserved. No deployment was performed.

## Validation

- 60 unit tests passed across eight cell-focused files.
- 17 existing mode-render checks passed.
- Three workflow browser checks passed: desktop study/recall, actual 390px phone study/recall, and review-filter recovery.
- Final workflow rerun passed after correcting the browser harness's fixed-width wrapper. It checks horizontal overflow, animation pause, focus, feedback, and full-workspace recovery.
- JavaScript syntax and scoped whitespace checks passed; simulator source and desktop mirror match.
- Phone screenshot visually reviewed; diagram labels are supplemented by selectable structure buttons and readable detail text.

Commands:

```text
npx vitest run tests/cell_study_workflow.test.js tests/stem_cell_interior.test.js tests/cell_progress_persistence.test.js tests/cell_processes_and_contrast.test.js tests/cell_sim_canvas_ref_stability.test.js tests/cell_sim_render_warning.test.js tests/cell_quiz_position_bias.test.js tests/cell_play_tutorials.test.js --maxWorkers=1
npx playwright test tests/e2e/cell-study-workflow.spec.ts tests/e2e/48-cell-every-mode-renders.spec.ts --workers=1 --retries=0 --reporter=list
npx playwright test tests/e2e/cell-study-workflow.spec.ts --workers=1 --retries=0 --reporter=list
```

Screenshots: [Desktop](focused-1200.png), [Phone](focused-390.png).

Biology cross-check: [OpenStax eukaryotic cells](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells) and [prokaryotic cells](https://openstax.org/books/biology-2e/pages/4-2-prokaryotic-cells). Clues condense the simulator's existing structure catalogue.
