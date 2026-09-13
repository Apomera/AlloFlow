# Data integrity implementation notes — 2026-09-12

Product source: behavior_lens_module.js. Desktop mirror intentionally left to the root task.

## Changes

- Practice now uses the reserved immutable ID `behavior-lens-practice` and its own canonical local workspace. Entering practice preserves the real student's records. Clear Practice Data deletes only the practice workspace and returns to the prior student.
- Practice snapshots carry `isPracticeMode`, `practiceScenarioName`, and `practiceReturnStudent`. Reopening a saved practice workspace restores the simulation banner. Imported simulation snapshots are routed to the reserved practice identity even if their name/ID names a real student.
- Practice data bypasses cloud writes and normal cloud hydration.
- Workspace import resolves or creates the immutable roster identity, flushes pending local work, persists the destination, and only then changes selection. Hydration waits for a final roster ID and consumes pending imports only for that ID, preventing the former name-to-ID reset.
- Cloud-copy selection captures the active workspace generation; a late response is ignored after a student switch.
- Roster persistence and auto-add no longer silently discard students beyond twenty.
- Batch CSV uses the shared `parseCsvRows` parser. Quoted commas, multiline fields, and doubled quotes survive. Unknown intensity remains null; invalid dates/intensities are flagged and excluded from accepted rows.
- Student profile CSV requires a name, assigns immutable IDs, preserves each existing workspace's other data, and writes imported profile fields into the canonical studentProfile. Grade and diagnosis remain structured fields and are also included in profile Notes for visibility.
- Profile imports stage the first student with the same final-ID hydration discipline and enqueue cloud copies when available.

## Verification

- `tests/behavior_lens_safe_selection.test.js`: 7/7 mounted regressions passed.
- Earlier lifecycle run: new selection regressions plus `tests/behavior_lens_workspace_lifecycle.test.js`, 15/15 passed.
- Tests cover practice load/clear, practice reopening, new-student JSON import and reopening, simulation import isolation, roster growth, delayed cloud-copy response, quoted multiline CSV, unknown intensity/invalid dates, and separate durable profile imports.
- Final CSV/selection run passed in 67.92s; startup was slow (jsdom environment 30.26s). Root owns broader suite and final mirror synchronization.

No further product writes are pending from this agent.
