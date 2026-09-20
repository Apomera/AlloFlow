# Cell review workflow refinement

The structure inspector now provides a direct next-review action with the destination's name and the remaining queue count. Marking a structure mastered keeps it on screen so students can read the feedback and choose when to move on. The final review item and empty list have explicit guidance, including a return to all structures.

Manual study-status changes can be undone. Reset study status removes that structure's mastery/review mark while keeping its exploration history and recall scores. Importing or resetting progress, restoring a session, or answering a recall question clears the transient undo action so it cannot overwrite newly restored or assessed status.

Opening the review queue from Focus view now selects the first review structure without leaving Focus view. If the queue is empty, it focuses the structure search and displays the existing empty-list recovery controls. The full-workspace directory entry remains available.

Validation: 13 unit checks and 12 distinct browser scenarios passed. The seven review/study scenarios were rerun after the Focus-view entry refinement. Source syntax, whitespace, and mirror equality checks passed.

Validation artifacts:

- `unit-results.json`: review ordering, status changes, recall rounds, and portable-progress integrity/persistence.
- `playwright.config.cjs`: desktop/320px review and undo checks, stale-undo invalidation, empty-queue recovery, existing study workflow, recall rounds, and diagram controls.
- [Phone inspector](inspector-320.png) and [desktop inspector](inspector-1200.png): rendered UI reviewed for readable layout and no horizontal overflow.

The source module and desktop mirror are synchronized. Changes remain local.
