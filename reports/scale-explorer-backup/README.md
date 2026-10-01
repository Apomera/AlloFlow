# Scale Explorer: portable notebook backups

The Notebook workspace can download saved evidence as a JSON file and restore it
through a record-by-record preview.

- Backups include saved observations, linked investigations, similar-shape model
  explanations and standalone drawing plans. Save current drafts before making a
  backup. Captured personal heights, comparison and drawing evidence, drawing
  collections and viewing settings travel with the saved records.
- The restore preview identifies new records, duplicates and conflicts. New
  records are selected when space is available. Replacing a saved observation,
  model or standalone drawing requires selecting that record explicitly. A
  conflicting investigation can be added as a separate copy with its own ID.
- Duplicate investigations are recognized by their evidence, including across
  different IDs. Importing the same file repeatedly does not duplicate the work.
- The existing limits remain 24 observations and 12 investigations. Selections
  that exceed capacity cannot be applied partially. Current drafts, personal
  height and other tool data survive a restore.
- **Undo last restore** restores the previous saved notebook. Once later saved
  work changes the notebook, undo becomes unavailable so it cannot remove that
  newer work.
- Versioned files are bounded to 512 KiB. Unsupported, malformed and oversized
  files leave saved work intact. Recoverable records are rebuilt from the known
  catalog and previewed with a recovery notice. Cancelled, superseded or completed
  reads after unmount cannot update the workspace.

## Verification

The focused tests cover faithful round trips, personal heights, all eight drawing
measurements, terrain flight and camera views, legacy and damaged records,
duplicate and collision handling, capacity and independent restored data.

Browser coverage exercises real downloads and restore, an exact 3D comparison,
the 320 px phone layout and keyboard choices, undo, failed downloads, file-size
limits, read errors, cancellation, out-of-order reads and unmount cleanup.

Across the verification runs, **164 checks passed in 12 unit suites** and
**15 browser scenarios passed** (five backup scenarios and ten existing
investigation, notebook and workspace scenarios). Seven unit suites initially
failed to start fork workers; all 59 checks in those suites passed when retried
with a single shared thread worker. The remaining five suites passed 105 checks.

The final focused run repeated all 18 backup unit checks and the five backup
browser scenarios after polishing the recovery message and phone preview.
The browser report artifacts use the exact source prepared for the commit.

## Examples

- [Desktop restore preview](desktop-review.png)
- [Phone restore preview](phone-review.png)
- [Downloaded notebook backup](notebook-backup.json)
- [Drawing exported after restore](restored-drawing.svg)

## Reproduce

```powershell
npx vitest run tests/scale_explorer_backup.test.js --pool=threads --no-isolate --maxWorkers=1 --testTimeout=30000
npx playwright test -c reports/scale-explorer-backup/playwright.config.cjs scale-explorer-backup.spec.ts
```
