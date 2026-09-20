# Titration notebook removal and recovery — September 19, 2026

Students can now remove a single saved reading to make room in the notebook. **Undo removal** restores the most recent removal or notebook clear, including observation notes and investigation evidence. The notebook shows its capacity and labels readings that belong to the current investigation.

## Student workflow

Each reading card has a **Remove reading** button with its reading number in the accessible name. Removing a row keeps the other rows, notes, identifiers, and order. Removing an unrelated observation leaves a completed investigation intact. Removing required evidence updates the investigation's progress and report availability immediately.

The investigation badges distinguish the starting reading and each side of the currently selected color-change pair. Other captured observations receive a general investigation-evidence badge. These labels remain visible when the guide is paused. Updated full-notebook guidance points students toward removing individual readings.

After a removal or clear, focus moves to **Undo removal**. Undo restores the saved rows and the investigation's original evidence references, prediction, reviewed pair, explanation, and completion state. It returns keyboard focus to the notebook heading. Clearing a comparison selection does not silently assign a replacement reading; the saved-reading plot falls back to an existing point if its selected row is removed.

## Recovery limits and state handling

There is one recovery entry, covering only the most recent removal or clear. It survives serialized remounting and changes to the live volume, reaction, or indicator. Undo never restores those live experiment settings or other equipment-practice records.

A new notebook save, note edit, or investigation edit clears recovery. Starting another investigation also clears it. The recovery helper independently verifies that the current notebook and investigation still match the recorded post-removal state before restoring anything. It rejects altered values, changed notes, reused identifiers, reordered rows, and newer investigation answers.

Snapshots contain at most 40 original readings and their remaining subset. Restoration uses validated copies and does not recapture older notebook entries as new investigation evidence. Removal prunes evidence references even while the guide is paused. No chemistry calculations, grading rules, or report export format were changed.

## Verification

**106 tests across five suites and 62 browser accessibility/layout scans passed, with no page errors.**

Validation commands and results are recorded in [the validation record](../reports/chemistry-refinement-2026-09-06/titration-notebook-recovery-validation.json).

The checks cover individual removal, full notebooks, clear/undo, removal of investigation evidence, note preservation, a paused guide, other live setups, serialized recovery, last-removal-only behavior, newer edits, reused identifiers, the final remaining row, comparison/plot selection, keyboard focus, forced colors, the existing guided report flow, and 3D viewer continuity.

Browser scans use 1200- and 320-pixel viewports. Forced-color scans exclude axe's contrast rule because of its limitation in that mode; other applicable rules, layout checks, and ARIA-reference checks still run. These are scoped automated checks and visual review, not a physical-device or classroom pilot.

Nine new English strings and two revised guide strings are registered. Other-language translations remain pending. Source/public copies are kept in sync. No dependencies were added and no deployment was performed.

- [Notebook evidence preview](../reports/chemistry-refinement-2026-09-06/titration-notebook-recovery-evidence-1200.jpg)
- [Phone recovery preview](../reports/chemistry-refinement-2026-09-06/titration-notebook-recovery-undo-320.jpg)

Browser rerun: node reports/chemistry-refinement-2026-09-06/titration-notebook-recovery-browser.cjs
