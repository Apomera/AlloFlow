# Live board return guidance — September 19, 2026

Changes are local and have not been deployed or committed.

## Learner guidance

A compact live-session guide explains the current move, activity location, next action, shared concept/project progress, and most recent resolved move. Learners see their own rotating roles or a contributor explanation if they are not assigned a role on this move. The guide handles route proposals, open activities, confirmed responses, retry rounds, shared review, pauses, and completion.

The guide opens for a late arrival, a restored visit, a browser reconnection, or board changes received while the page was hidden. Ordinary response updates do not reopen a dismissed guide. Reopening does not move keyboard focus; the explicit “Go to current move” control focuses the activity heading and closes the guide.

An optional per-tab orientation marker stores only move number, phase, location ID, retry round, and pause status. It is scoped to the app, session, board attempt, and learner. It contains no learner names, answers, or lesson text, and is not a saved game. Storage failures do not prevent participation. Hidden/offline views do not replace the last-viewed marker.

## Connection messages

Learners see the browser’s offline signal, pending delivery, or teacher-confirmation state. The guide does not claim that a browser online event verifies the live session or teacher connection. Reconnection explicitly says the session may still be catching up. No connection failure is inferred merely from a quiet board.

Teachers receive an offline advisory and an explanation when a pending update takes more than 20 seconds. The existing operation lock remains in place until that request settles; this pass does not cancel, replace, or duplicate uncertain teacher decisions. The notice clears when the request finishes. Existing learner delivery announcements remain authoritative, avoiding a second live-region announcement from the guide while an action is pending.

There are no additional live-session writes, backend schema changes, or AI calls. Solo play and existing Mailbox v22 / Firestore release requirements are unchanged. A connected teacher host is still required.

## Verification

- 87 tests passed across the return-guide, learner-delivery, teacher-recovery, and runtime suites. The new guide suite includes 18 cases. A duplicate React key found in the initial run was corrected; all four suites passed in the final rerun.
- A four-browser cooperative game passed through the production Class Mailbox adapter and real Apps Script handlers with local service substitutes: 42 writes, a 9,026-character final session document, and 27 automated accessibility configurations.
- 11 focused Chromium accessibility configurations passed, including 320/390/1280-pixel widths, offline/reconnected states, pending confirmation, pause, dark mode, 200% text, forced colors, and the teacher offline notice. No axe violations, horizontal overflow, or browser page errors were reported. The mobile return view was visually reviewed.
- Keyboard checks verify the explicit jump to the current move and preservation of focus on reconnection. The fixture recorded only the intentional learner answer write; the guide added none.
- The final UI polish moved the activity-jump button above the longer role explanations and made project-count wording neutral. The 18 focused guide tests and all 11 focused browser configurations passed again on this final build. The 27 cooperative configurations plus 11 focused configurations give 38 automated accessibility configurations.
- Six sources parsed. Generated module mirrors, all three application loader revisions, and board string mirrors match the final bundle (c6633cf6a3).

Reports are in `docs/lesson-board-return-guide-2026-09-19/`. The automated checks use local fixtures; they do not establish WCAG conformance, real AI content quality, or full classroom capacity. Manual screen-reader and classroom testing remain outstanding.
