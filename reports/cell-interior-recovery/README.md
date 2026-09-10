# Cell simulator enhancement verification

The shared simulator now includes focused structure study, answer-free adaptive recall, an osmosis experiment with trial comparisons, and portable learning records. This pass preserved those concurrent additions and strengthened the interior's recovery and inspection behavior.

## Changes in this pass

- Save the outgoing cell's guide position and selection before restoring the destination cell's study record.
- Reject unrelated JSON and malformed progress envelopes without replacing learning progress.
- Sanitize imported counters and guide indices to finite whole numbers, and reject inherited object names as structures or guides.
- Preserve typed spaces and capitalization in directory searches while matching case-insensitively.
- Clear conflicting review filters and show the full directory when there is no review queue.
- Improve contrast on active directory groups.
- Keep a single pause control, explain reduced-motion behavior, and allow keyboard inspection while the frame is paused.
- Advance interior animation using elapsed time instead of assuming a fixed display refresh rate.
- Keep the source and desktop public mirror identical.

## Verification

- 46 distinct focused unit tests passed across progress integrity/persistence, cell biology, process rendering, structure recall, and osmosis. One osmosis interaction test initially exceeded the default five-second timeout on the busy workstation; all seven osmosis tests passed on a rerun with a 30-second limit (2.25 seconds total).
- Four Chromium recovery tests passed: cell-type guide restoration, invalid-import preservation plus multiword search, pause/keyboard inspection/resume, and reduced-motion behavior.
- JavaScript syntax and scoped git whitespace checks passed.
- Inspected the 390-pixel focused-study screenshot in reports/cell-study-enhancement/focused-390.png; controls, diagram, and structure notes fit the phone layout.

## Reproduce

    npx vitest run tests/cell_progress_integrity.test.js tests/stem_cell_interior.test.js tests/cell_study_workflow.test.js tests/cell_osmosis_lab.test.js tests/cell_progress_persistence.test.js tests/cell_processes_and_contrast.test.js --maxWorkers=1 --testTimeout=30000
    npx playwright test tests/e2e/cell-interior-recovery.spec.ts --workers=1 --retries=0

Validation logs are in reports/cell-interior-unit-tests.log, reports/cell-interior-osmosis-retest.log, and reports/cell-interior-browser-tests.log. The full application suite and production deployment were outside this pass.
