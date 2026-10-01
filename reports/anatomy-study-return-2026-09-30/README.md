# Anatomy: resume review rounds and export current writing

This pass continues the pending Anatomy improvements. Changes remain unstaged and uncommitted.

## Changes

The study sheet now shows incomplete review rounds for the current learning level. Each card names its collection, current structure, position, and number rated. Saved rounds remain visible when structure filters hide their rows or improved ratings leave no cards due.

**Resume saved round** keeps the frozen deck, current position, and rated flags. **Refresh round** rebuilds that collection’s review deck from the latest ratings. Resuming reads the latest validated round in one update, checkpoints active Cards progress, and preserves other round histories, Quiz answers, Tutor writing, structure notes, and activity explanations. Obsolete actions cannot replace a changed deck or a different study context.

Text, JSON, and clipboard exports read current saved work when activated. Copy has a visible busy state and a recovery message for an interrupted request. Late clipboard replies and fallback attempts are ignored after leaving or replacing the sheet, changing the study context or content band, or starting another import. A valid fallback preserves the current writing control and caret. Closing or filtering clears abandoned copy notices, including notices saved in another language.

Delayed Cards focus uses the original control and checks the current mode, sheet generation, study context, and visible destination. It yields when the learner moves focus or reopens the study sheet.

The sheet explicitly labels **Recorded structures** and explains which content its filters affect. A learner with activity explanations and no structure records now sees a truthful message above their saved writing. Saved rounds use responsive cards and a clear primary Resume action. Numeric progress stays together in Arabic layouts. Eight new labels are translated into French, Latin American Spanish, and Arabic, with exact desktop mirror parity.

## Validation

All **1,095 checks passed across 17 unit suites**, including 152 new continuity checks and 23 localization checks. All four browser journeys passed. The **72 scoped accessibility scans found zero violations**, with no horizontal overflow. Larger-text content remained at least 17 px. Both study-sheet journeys checked black text on white paper and hidden interactive controls in light, dark, and contrast themes, for six print checks.

The browser journeys cover real review progress, a saved two-card round with no cards due, filter-independent Resume, delayed focus, deferred clipboard outcomes, actual text and JSON downloads, filtered print output, explicit Refresh, and reflection-only recovery. Screens and scans cover 320, 390, 768, and 1,440 px widths, all three themes, and Arabic with larger text. Scans cover the exercised study-sheet and activity components.

Final metrics, source hash, mirror checks, and the exact unit suite list are in [verification.json](verification.json). Detailed evidence is retained in [unit-results.json](unit-results.json), [study-return-browser-validation.json](study-return-browser-validation.json), [activity-writing-regression-validation.json](activity-writing-regression-validation.json), [reflection-regression-validation.json](reflection-regression-validation.json), and [study-record-regression-validation.json](study-record-regression-validation.json).

All five final screenshots were reviewed visually.

## Screens

- [Study sheet on a phone](after-phone.png)
- [Dark theme](after-dark.png)
- [Arabic with larger text](after-arabic.png)
- [Resumed review card](resumed-card-phone.png)
- [Saved activity writing without structure records](reflection-only-phone.png)
