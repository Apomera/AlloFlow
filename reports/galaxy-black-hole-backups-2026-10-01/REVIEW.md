# Galaxy: named experiments and backup import

Date: 2026-10-01

Saved black-hole experiments now have editable names, and exported JSON backups can be reopened through a preview and explicit import selection. Existing notes and the active run are preserved.

## Changes

- Names support up to 80 characters and persist with the experiment. Unnamed records retain their numbered label. Names appear in headings and comparison, restore, and removal actions.
- Import opens a local JSON backup and previews every incoming record with its name, note, release settings, and center outcome recalculated by the current model.
- The preview shows available notebook places and selected records. It enforces the eight-record limit without replacing existing work.
- An unchanged saved ID is marked Already saved. If a local record with that ID has different content, the backup can be added as a separate record with a new ID.
- Imported experiments receive new sequence numbers. The counter remains monotonic after Undo.
- Restoring the backup’s kept reference is an explicit option, unchecked by default. Importing saved records preserves the current release, playback time, and camera view.
- Undo removes unchanged additions and keeps imported records with later name or note edits. It preserves unrelated work and a reference selected after import.
- Files are limited to 256 KiB and use the existing version-1 export schema, including older backups without names. Invalid releases, duplicate IDs, invalid text, unsupported versions, and malformed JSON are rejected as a whole.
- File reads use the latest selection. Cancellation, mode changes, and unmounting retire pending reads and clear obsolete loading feedback.
- Selection labels are concise, with release details available as accessible descriptions. Long names and note labels wrap within cards, including phone and RTL layouts.
- Both Galaxy source files match. Thirty English labels are synchronized across both shared registries and the Galaxy catalog; other locales use the existing fallback.

## Verification

- 560 tests passed across all 20 Galaxy test files, including 37 new backup tests.
- Browser checks passed naming, export/import round trips, ignored stored predictions, explicit reference restoration, conflicts, capacity, separate removal/import Undo, preservation of later edits, and cleanup.
- Overlapping reads, cancellation, delayed completion after mode changes or unmounting, and read failures passed without stale previews or saved-data changes.
- The earlier notebook and reference-comparison browser regressions passed.
- Desktop at 1440 px, phones at 390 and 320 px, and RTL passed overflow and target-size checks. Internal card/list overflow was checked, and screenshots were reviewed.
- Source and QA scripts passed syntax checks; the scoped diff passed whitespace checks.

## Backup and model scope

Backups contain saved release inputs, names, notes, and a kept reference. The current nonrotating Schwarzschild model rebuilds predictions and paths from those inputs. Stored prediction metadata and scene geometry are ignored. Tidal deformation remains illustrative.

## Review files

- [Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/validation-summary.json)
- [Full test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/galaxy-tests.json)
- [Backup browser checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/browser-results.json)
- [Desktop import preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/workflow-preview-1440.png)
- [Phone import preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/workflow-preview-320.png)
- [Named experiment on a phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/workflow-named-320.png)
- [Long content in RTL](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-backups-2026-10-01/import-preview-320-rtl.png)
- [Backup model source](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_galaxy.js:320)
- [Local preview](http://127.0.0.1:53693/): choose Black holes, then Saved experiments.

Changes remain uncommitted.
