# Lesson board library refinements — September 10, 2026

This pass improves board reuse, solo recovery, and cooperative-session visibility. Changes are local; nothing was committed or deployed.

## Board files

Teachers can download a validated `.alloboard.json` file containing a board, its lesson source, and its language. Files include activities, solutions, and hints, but exclude learner identities, responses, and session progress. They are reusable board templates, not progress checkpoints.

Opening a file first shows a review with its title, mission, language, location count, and included lesson. Teachers explicitly choose to open it. Importing a different lesson uses that source and language inside board setup without changing the main lesson. Returning to the main lesson requires confirmation. Importing does not call AI, save to the library, or launch a session. Subsequent generation uses the imported lesson context.

Imports enforce file-size limits and validate the complete board, including source evidence and game rules. Unknown fields are discarded. Invalid files preserve the current preview; delayed reads from an earlier lesson are ignored.

## Saved copies and solo recovery

When the four-board library is full, the message opens the saved-copy list and focuses the replacement action. A named confirmation lets teachers replace a specific copy without deleting another board first. Removal and replacement check the intended saved content again, preventing an old dialog from overwriting a copy that another tab has removed or changed. These are stale-intent checks, not a cross-tab database transaction.

Solo launch now distinguishes a new game, a resumable game, and a completed game. A read-only summary shows the saved move, concepts explored, and projects built. Progress remains specific to the board, learner, and current browser tab. An unavailable progress record is explained before entering recovery.

The existing requirement to save a board before solo or live launch remains. A full library needs explicit replacement; unavailable storage still reports an error. Preview and board-file download remain available.

## Live sessions and keyboard behavior

The teacher activity panel now lists learners whose responses have not been confirmed. It uses confirmed session state rather than optimistic sends and explains that missing responses are not marked incorrect. The list is absent from the learner interface and adds no network writes.

Escape now dismisses an import review or saved-copy confirmation before the enclosing setup dialog handles the key. Focus returns to the relevant control. A browser check exposed the previous interaction between the parent native listener and child React handlers; a board-specific native listener fixes it without changing other activity dialogs.

## Verification

- **196 tests passed** across seven suites: 158 board tests, 11 connected escape-room runtime tests, and 27 Concept Quest runtime/review tests.
- Coverage includes file validation, exact export fields, import cancellation and context changes, stale file reads, generation after import, full-library replacement, changed saved copies, solo resume, teacher-only waiting lists, and nested Escape behavior.
- **Four browser contexts** completed the cooperative journey through the production Class Mailbox adapter and actual Apps Script handlers with local service substitutes: 33 writes, an 8,892-character completed session document, and no browser page errors.
- The browser journey also exercised real downloads/uploads, invalid and staged imports, replacement cancellation, full-library recovery, solo resume, late joins, pause/restart, responses, and completion.
- **18 automated accessibility configurations passed** with no reported axe violations. Coverage includes mobile widths, dark mode, 200% text, increased spacing, forced colors, import/replacement controls, the editor, and teacher reviews. Overflow checks passed, and the new import, resume, and waiting-list screenshots were visually reviewed.
- Application/module syntax, generated-module mirrors, UI strings, and loader revision hashes were checked.

Evidence: `docs/lesson-board-library/tests.json` and `docs/lesson-board-library/live/verification.json`, with screenshots and the exported fixture board in the live directory.

AI responses were fixtures; no paid generation request or production classroom was used. Automated scans do not establish WCAG conformance. Manual screen-reader and real-classroom testing remain outstanding. The existing Mailbox v21 / updated Firestore rules release requirements still apply; this pass adds no server schema or permission changes. The previously documented unrelated project-wide Word Cloud source-text assertion was not changed or included in this selected regression run.
