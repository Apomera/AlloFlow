# Lesson board live recovery — September 19, 2026

This pass improves learner recovery when live-session requests stall or the device loses its connection. Changes are local and have not been deployed.

## Behavior

- A send or join request that remains unresolved for 20 seconds releases its busy state. This is a UI deadline, not cancellation of the transport request or proof that the server rejected it.
- Retrying a proposal or response sends the same stored request ID and payload. The existing host acknowledgement and deduplication rules remain authoritative. A late result from an older transmission cannot overwrite the current delivery status.
- Delivery messages distinguish sending, a transport-confirmed write awaiting teacher acknowledgement, an uncertain timeout, a restored unconfirmed action, and a locally retained action. A slow teacher acknowledgement explains that the teacher must keep the shared board open and connected.
- If the browser reports offline, learners can still prepare and retain an action. Reconnection does not automatically resend it. Manual retry remains available because the browser's connectivity signal should not prevent use of a reachable classroom session.
- Paused, ended, or replaced action windows cannot be retried. A confirmed response or a new teacher move clears the old pending action. Session and learner identity continue to scope pending storage.
- A join confirmed through the shared session update wins over a later failure or timeout from the original join request. A stalled join can also be retried.
- A “Review delivery status” button beside pending proposals and responses moves keyboard focus to the retry controls. This makes recovery reachable from the current activity on a long mobile board.
- Nested Escape listeners now install during the layout effect, before an imported-board review can receive focus. Cancelling the nested review keeps board setup open.

## Scope

The game rules, learner action schema, shared-session permissions, and solo save format are unchanged. Solo play remains available. This pass does not add a server-side queue, automatically resend teacher decisions, or claim that offline submissions have reached the teacher. Pending-action storage still uses the existing per-tab mechanism and reports storage failures.

The new delivery helper is `lesson_board_delivery.js`. Learner integration is in `lesson_board_source.jsx`; activity recovery links are in `lesson_board_ui.jsx`. Generated modules and board loader revisions are refreshed for the root and desktop application.

## Verification evidence

- **178 tests passed** across 8 selected suites, including 13 delivery/recovery cases and 11 solo-resume cases. The final run reported no unhandled errors.
- **Four browser contexts** completed the cooperative game through the production adapter and Apps Script handlers: 39 writes and a 9,021-character completed session document.
- **25 automated accessibility configurations passed** with no axe violations or browser page errors. The new timeout and offline panels were visually reviewed at mobile widths; keyboard focus and overflow checks passed.
- Six changed source/test files parsed. The generated module matches its source and desktop mirror; all three application loader revisions and board string mirrors were checked.
- The extended browser fixture advances its cache clock between accessibility audits to simulate quiet intervals. Production rate limits are unchanged; this is functional verification, not a classroom load test.


The selected regression report is `docs/lesson-board-delivery-2026-09-19/tests.json`. It covers learner delivery, setup/runtime integration, retry rounds, fresh-document writes, snapshot revision protection, game rules, Mailbox permissions, and solo resume.

The cooperative browser checker runs with `LESSON_BOARD_DELIVERY_QA=1` and `LESSON_BOARD_QA_DIR=docs/lesson-board-delivery-2026-09-19/live`. It deliberately holds a write, retries the identical action, releases the old write, restores an unconfirmed action after reload, and retains an action while the browser reports offline. It then completes the existing four-context cooperative journey through the production Class Mailbox adapter and Apps Script handlers with local service substitutes. Its result and screenshots are in that live directory.

No paid AI requests or production classrooms are used by these checks. Automated accessibility scans do not establish WCAG conformance; manual screen-reader and real-classroom testing remain outstanding. Existing Mailbox v22 and Firestore deployment requirements still apply; this pass introduces no additional backend release changes.
