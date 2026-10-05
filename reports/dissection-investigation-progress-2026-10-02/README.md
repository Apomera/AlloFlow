# Dissection Lab: investigation progress and unfinished records

October 2, 2026

Layer review now shows what is complete and what still needs attention. Learners can finish an existing observation record and return to their progress without losing their place.

## Improvements

- **Three visible progress measures.** Verified technique, structures inspected, and evidence recorded each show a count, a native progress bar, and a short explanation. Desktop uses three columns; narrow layouts stack them.
- **Accurate readiness.** Completing the technique now shows “Inspect structures” while inspection is incomplete, then “Record evidence” while notes or confidence ratings are missing. “Ready to reveal” appears when those requirements are complete.
- **A useful list of unfinished records.** The optional list contains only already inspected structures in the current layer. Each row identifies whether it needs a note, a confidence rating, or both.
- **Direct access to the missing field.** “Finish record” opens the existing observation and focuses its missing note or confidence control. Focusing a rating leaves it unchecked. “Review layer progress” returns focus to the progress heading.
- **Consistent evidence counts.** Inspection, a nonempty note, and a valid rating of 1–3 are required for a complete record. Ratings outside that scale remain unfinished across the directory, progress counts, and reveal check. A rating of 1 remains valid.
- **Preserved learning state.** Reviewing an observation across anatomical views preserves the guided route, stored procedure, notes, scores, and identification credit. Opening a record does not mark it inspected or award completion. Quiz and timed practical modes hide these shortcuts.

The two renderer copies remain byte-identical. The change keeps the existing stored data schema and score weights.

## Verification

- **50 distinct local Chromium checks passed:** 14 new investigation checks, 32 existing explanation/feedback checks, and four older completion journeys. No automatic retries or skipped cases in these runs.
- **349 regression tests passed:** canvas loop 3, reference workbench 149, workspace bands 106, and broad improvements 91.
- Five scoped layer-review axe audits found **zero violations**. Phone, tablet, desktop, narrow embedded large-text/high-contrast, and forced-color layouts had no clipped text, clipped controls, or horizontal overflow. Controls were at least **48 pixels** tall; text was at least **14 pixels**, or **16 pixels** with large text enabled.
- Interaction checks cover explicit note edits, unchecked rating focus, returning to progress, invalid ratings, uninspected/unknown records, guided navigation, and genuine layer reveal followed by fresh progress for the next layer.
- Both renderer copies parse successfully and retain LF line endings. Final source SHA-256: `49121c0ae1b224c7805c9ddf1c91d9679c2c886ef45cde3a13bceb8cbec4722f`.

### Follow-up checks and retained diagnostics

Initial accessibility checks found references to observation controls that were not yet mounted. The buttons now reference the mounted structure directory and describe the missing part through their own row. All five layout audits subsequently passed.

The main new browser run passed 13 cases. Its reveal journey needed to open the collapsed technique controls before requesting review of the next layer. That corrected case passed separately on the same final renderer. Six older status expectations were updated for fixtures with completed technique but uninspected structures. An older feedback locator was narrowed to its intended action badge because a second badge exists inside collapsed guidance; all four legacy journeys then passed.

The first combined core run passed 256 of 258 tests. One canvas test reported `STACK_TRACE_ERROR`; the other failed a pointer-state assertion. The unchanged three-test canvas suite passed in isolation, then the full 258-test core group passed on rerun with the original assertions and time limits. The cause of the initial failures is unconfirmed. Initial and final reports are retained in this folder.

## Screenshots and results

- [Desktop progress](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-investigation-progress-2026-10-02/desktop-review.png)
- [Phone progress](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-investigation-progress-2026-10-02/phone-review.png)
- [Large-text unfinished records](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-investigation-progress-2026-10-02/embedded-large-queue-focus.png)
- [Verification data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-investigation-progress-2026-10-02/verification.json)

Checks use the local renderer in GlHarness. Static layout captures use a capture-only next-action stub; interaction checks use the actual actions. Changes remain uncommitted.
