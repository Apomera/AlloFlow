# Additional organizer refinements — September 8, 2026

This focused follow-up to the 24-resource review reproduced and fixed two additional Visual Organizer problems.

## Connection targets survive concept removal

Connection fields store branch positions. Removing an earlier branch previously left those positions unchanged. A link could consequently point at a different concept or fall outside the remaining list.

The removal handler now drops connections to the removed branch and shifts surviving targets in both the simple and labeled connection fields. Labels and other connection metadata are preserved. Active content and history receive the same edit. Invalid removal indexes are ignored, and an unrelated malformed branch does not introduce a new crash.

The fix is present in all three app entry files.

## Invalid AI coordinates cannot damage the layout

The layout handler previously accepted any parseable response. Missing coordinates and nonnumeric values could become NaN positions, while unrelated IDs or empty entries could still produce a success message.

Only finite numeric coordinate pairs belonging to requested nodes are now usable. Valid coordinates are bounded to the canvas, and nodes with invalid entries retain their current positions. A response with no usable coordinates reaches the existing failure feedback instead of claiming success. The existing layout action remains available to retry.

## Verification

- Before the repair, 22 of 28 targeted assertions failed, reproducing connection corruption, invalid-index deletion, bad coordinates, and false success.
- Final result: **90/90 assertions passed in four test files**, including **32 focused integrity cases** plus existing host-mutation, organizer hardening, and live-organizer contracts.
- The generated controller contains the current source, parses successfully, and matches its desktop public mirror byte-for-byte.
- All three host files parse successfully and reference controller version 6d689cd7.
- The affected diff passed the whitespace check.

Evidence: [initial reproductions](before.json), [final regressions](final.json), [build and host integration](integration.json).

These were controlled handler and source-contract checks. This follow-up did not perform live AI calls or a new visual-browser matrix.

## Further opportunities

The saved reading view already prefers its resource's saved language. A full multilingual playback matrix would still provide stronger integration evidence.

Saved interactive node snapshots versus edited static branch content remain a separate consistency question. A dedicated map initialization/layout test across navigation and manual dragging is also worthwhile. Exact dependency provenance for Lesson Plan, Study Guide, and Family Guide remains a useful product addition.

These follow-up questions are separate from the two repaired and regression-tested behaviors above. Changes remain local.


## Approved continuation completed

[Saved-map synchronization and planning provenance](../map-planning-refinements-2026-09-08/REVIEW.md) are implemented, with 190 passing targeted checks and nine browser cases. These follow-up counts are separate from the earlier review above.
