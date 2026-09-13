# Lesson board play verification

Run `node dev-tools/check_lesson_board_enhancement.cjs` from the repository root. The script builds the production lesson board bundle and plays an authored water-cycle expedition on a local HTTP origin. It makes no AI provider or external service calls.

The browser report covers widths 1280, 390, and 320 pixels, with keyboard ordering, dark mode, 200% text, forced colors, WCAG axe checks, and horizontal-overflow checks. Scenarios include route and project planning, an incorrect response followed by a same-turn retry, draft/list-view recovery after reload, shortcut construction, all eight activities, final-location feedback, the completed learning journal, and independent practice that leaves localStorage unchanged.

- [Automated results](verification.json)
- [Desktop map and planner](1280-map-planner.png)
- [Mobile review](390-feedback.png)
- [Small-screen ordering in dark mode](320-order-dark.png)
- [Completed journal and practice](390-journal-practice.png)

Component regressions: `node node_modules/vitest/vitest.mjs run tests/lesson_board_play_ui.test.js --maxWorkers=1`. Nine focused cases cover guided actions, mission goals, exact rewards, retry improvement, controlled workspace persistence, shortcuts, learner privacy, final-location feedback, and practice at the move limit.

The [live class report](live/verification.json) also passed: four browser contexts, 33 writes, 18 accessibility scans, and an 8,909-character completed session document. It uses the production Class Mailbox adapter and Code.gs sandbox with the core mission selected explicitly. It covers teacher controls, participant privacy, missing responses, delayed requests, reloads, restart and end actions. See the [teacher review](live/teacher-learning.png) and [mobile live activity](live/student-order-mobile-dark.png).

Run live verification with `LESSON_BOARD_QA_DIR` set to this report's `live` subdirectory, then `node dev-tools/check_lesson_board_live.cjs`.

## Implementation and release notes

The board now supports Core mission (every concept and two projects), Full expedition (every board location and two projects), and Master builder (every concept and all three projects). New generated boards default to Full expedition. Board validation checks that the selected mission can be funded. Full expedition covers the generated board's activities; it does not promise to contain every item from an assessment bank.

Setup adds mission cards, a board blueprint, cancellable generation with timeout recovery, and play that remains available when the reusable-board library is full. Play adds route and resource planning, construction effects, a tabletop map and accessible list, an explicit move sequence, same-turn retries, personal first/latest response records, final-activity feedback, a learning journal, and independent practice.

Solo runs and drafts save on the device with account/app/board isolation, legacy session-save migration, quota recovery, and conflicting-tab notices. localStorage conflict checks are not atomic transactions.

Live retries isolate answers and receipts by round. Native Firebase controls use transactions. Class Mailbox controls use expected document revisions, with fresh plans after conflicts. LAN transport retains its existing adapter write behavior. Backend rules reject stale retry requests and accept the same bounded location IDs as the board engine.

Validation evidence includes the main focused regression run in `regressions.json`, additional classroom write checks in `live-write-regressions.json`, 29 Mailbox permission tests in `mailbox-regressions.json`, and 43 Firestore emulator checks in `firestore-rules.log`. Both complete browser reports above passed. A broader, unrelated Class Mailbox wiring assertion still expects an older Word Cloud dependency list without the existing `scopeToken`; that source and assertion were left unchanged. Some runs on the busy shared host exceeded the default five-second test deadline; the affected classroom checks were rerun with a 30-second deadline.

Changes are local and have not been deployed. Release the board bundle and app entry updates together with Class Mailbox v22 and the mirrored Firestore rules. Existing live Mailbox setups below v22 receive an update message before board launch.
