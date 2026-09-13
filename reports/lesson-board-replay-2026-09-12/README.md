# Growing world and adaptive practice routes

Implemented locally on 2026-09-12. Not deployed.

## A world that reflects the game

Board view now includes **Your growing world**. Construction blueprints become completed landmarks as projects are built. Attached project artwork appears on completed landmarks, and concept markers reflect successful explorations. Existing world artwork remains the backdrop; no additional image generation is required.

Open **See how your world changed** to compare the beginning with the current state. The construction history shows when each project was built, which destination a shortcut opened, and how many extra resources each income project actually produced. These values come from successful engine-derived moves, excluding failed attempts, duplicate location rewards, and unaffordable constructions. A shortcut destination being explored does not imply the shortcut was the route used.

Inspecting a construction or comparing states does not make moves, spend supplies, or clear an unfinished answer. Text labels remain when pictures are hidden. Focus view continues to concentrate on the current move.

## Saved adaptive practice

After a mission is complete, or the final move has been reviewed, open **Learning trail** and choose **Build my practice route**. Choose up to three or five activities.

Routes prioritize a learner's latest incorrect game responses, then activities improved after a retry, then activities without recorded responses, followed by previously correct responses. The route explains each selection. Unattempted activities are not described as incorrect.

A missed activity stays in the route. Other available activities come first, with concept variety used when possible. The activity returns with a different answer order when its wording permits rearrangement. Pictures and equivalent descriptions stay attached to their original answer meanings. Choice, configuration, and sequence activities all use the existing answer checker.

A route finishes when each selected activity has a correct practice response. The summary reports all checks, including retries, and offers source explanations. It does not claim mastery. **Build another practice route** covers activities not yet completed in these routes, returning to a fresh review cycle after all board locations have been covered. Each route is bounded to 30 checks and offers a review break at that limit.

The existing free-practice activity picker remains available below the route.

## Persistence and classroom behavior

- Solo route targets, unfinished responses, feedback, and completed coverage save with the current account's board attempt. Existing save validation and conflict handling apply.
- Classroom routes remain in each participant's browser tab and survive reloads there. They are not sent to the teacher or added to the shared game score.
- Teacher practice is a separate modeling route with wording appropriate to demonstration.
- Pausing the shared board disables practice edits and continuation. Restarting opens a fresh workspace.
- Practice, finale drafts, picture preferences, and board presentation settings coexist without erasing one another.
- Board backups and classroom move history do not contain private practice results.

## Verification

- **528 tests across 34 suites passed**, including 21 new world and adaptive practice tests. Coverage includes assessment integration, glossary reuse, live writes, transfer, storage, and existing finale behavior. See [regressions](regressions.json).
- The production UI completed eight-location missions, finale activities, and two adaptive routes at **1280, 390, and 320 pixels**. The **62 accessibility/layout checks** cover world comparisons, construction income, keyboard choices and sequences, adaptive correction, reloads, route completion, preserved finale state, forced colors, reduced motion, and enlarged text. See [browser verification](browser-verification.json).
- **Four browser clients** passed the production Class Mailbox adapter and local Code.gs sandbox flow, including **23 accessibility/layout checks**. The flow verifies private practice drafts and feedback after reload, unchanged shared progress, paused controls, separate participants, and restart isolation. See [classroom verification](live/verification.json).
- Production bundles, desktop mirrors, loader versions, and board string mirrors were checked. See [integrity](integrity.json) and [validation summary](validation-summary.json).

The source and browser tests used authored activities and previously generated sample artwork. The classroom text provider used a fixture. No new AI image request was needed. Automated accessibility scans do not establish full accessibility conformance. No deployment or learner pilot was performed.

## Examples

- [World after its first construction](1280-world-first-construction.png)
- [Completed world and construction history](1280-world-completed.png)
- [Phone world comparison](390-world-completed.png)
- [Practice correction on a phone](390-practice-correction.png)
- [Completed practice route](1280-practice-complete.png)
- [Keyboard sequence practice](320-practice-sequence.png)
- [Classroom practice](live/student-practice-route.png)
- [Example private practice data](1280-practice-snapshot.json)

The reusable [sample board](1280-visual-challenges.alloboard.json) retains glossary pictures and reviewed visual activities from the preceding pass. The evolving world is rendered from game progress; it does not generate new scene images for each stage.

## Reproduce

```powershell
node _build_lesson_board_module.js
node dev-tools/refresh_lesson_board_integrations.cjs --board-visuals
node _build_lesson_board_module.js --check
node node_modules/vitest/vitest.mjs run tests/lesson_board tests/assessment_game_loading.test.js tests/assess_toolbar_presentation_runtime.test.js tests/quiz_review_game_coverage.test.js tests/quiz_review_game_runtime.test.js tests/glossary_games_review_runtime.test.js tests/glossary_image_reuse.test.js --pool=threads --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
node dev-tools/check_lesson_board_replay.cjs
$env:LESSON_BOARD_QA_DIR='reports/lesson-board-replay-2026-09-12/live'
$env:LESSON_BOARD_VISUAL_FIXTURE_PATH='reports/lesson-board-finale-2026-09-12/1280-visual-challenges.alloboard.json'
node dev-tools/check_lesson_board_live.cjs
```
