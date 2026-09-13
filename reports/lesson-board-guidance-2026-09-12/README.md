# Guided first build and visual learning challenges

Implemented locally on 2026-09-12. Not deployed.

This pass adds the two recommended next steps: a guide through the first construction and glossary pictures embedded in playable activities.

## Guided first build

Choose **Guide my first build** during solo or classroom play. The guide follows the actual game state through selecting a location, responding, reviewing rewards, gathering supplies, and constructing a project. Its suggested route uses the existing construction planner and legal available moves. It does not inspect answers or make moves for the player.

The guide responds to unsuccessful activities with review and retry guidance. Construction tools begin collapsed and open after the first successful exploration; the learning trail opens after the first review. Both remain available to open earlier. The guide can be dismissed at any point, and keyboard focus returns to the current activity.

Guide preferences survive solo reloads and classroom tab reloads. Classroom guidance explains the teacher's control of moves and resolution; choosing or inspecting guide suggestions does not write to the shared run. The guide celebrates the first construction and leaves the rest of the selected mission available.

## Visual learning challenges

Open **Vocabulary and optional artwork**, then **Visual learning challenges** in board setup.

1. Select the activity to illustrate.
2. Suggest exact vocabulary matches, or choose a glossary picture for a question clue, answer choice, sequence item, or configuration choice.
3. Check or edit the equivalent text description.
4. Review the existing solution and lesson evidence, then open the learner preview.
5. Enable the reviewed visual challenge and save the board or download a backup.

Picture choices are keyboard-operable buttons linked to the existing response controls. Sequence pictures move with their items, and configuration pictures update their own control. The same descriptions remain fully readable in answer cards when pictures are hidden or unavailable. Picture-based responses use the existing engine, answer key, rewards, and classroom transport.

Challenge cues are distinct from optional glossary definitions: enabled cues appear while answering, even when the teacher has selected glossary definitions after review. Setup explains this explicitly. Teachers are prompted to give choices comparable visual support, or use a single question clue when only one relevant picture is available.

Changes to an activity's question, choices, solution, explanation, or source evidence invalidate its cues. Changes to cue descriptions or pictures require another preview and review. New pictures added to previously text-only cues also require review. Shuffled practice preserves each reviewed picture's association with the answer text rather than its old numerical position.

## Persistence and sharing

Visual activities are bounded, sanitized metadata in the board support package. Backups retain reviewed cues and their referenced glossary assets without learner identities or responses. Existing board files without visual metadata remain compatible. Missing shared pictures retain equivalent descriptions.

In the illustrated classroom fixture, three reviewed activities and three unique assets occupied 27,091 characters of support metadata. The completed session document occupied 36,128 characters. There were no omitted pictures. Shared support remains separate from image-free move history and cannot be edited by learners.

## Verification

- 486 tests across 30 suites cover the board, new guide and visual interactions, assessment integration, glossary reuse, transfer, persistence, and live writes. Exact results are in the [validation summary](validation-summary.json) and [regression report](regressions.json).
- Complete eight-location expeditions with two constructions were exercised at 1280, 390, and 320 pixels, including teacher review, backups, guided reload, keyboard picture choices and sequences, text mode, and focus navigation.
- The browser harness checks 26 accessibility/layout states, including forced colors, reduced motion, and enlarged text. Desktop guide and teacher preview screenshots and mobile picture choice and sequence screenshots were visually inspected.
- Four browser clients passed the production Class Mailbox adapter and Code.gs sandbox flow. The 21 classroom scans include picture answering with the guide, private guide reloads, learner write rejection, late joining, restart retention, and shared completion.
- Production board and assessment bundles, their desktop mirrors, loader references, and board strings were checked. See [integrity](integrity.json).

See [browser results](browser-verification.json) and [classroom results](live/verification.json). Automated accessibility checks are not a complete accessibility certification.

Testing used authored activities and reused the generated sample pictures from the previous board artwork pass. No new AI image request was needed. The classroom text provider used a fixture, and transport ran in a local sandbox. No deployment or learner pilot was performed.

## Screenshots and reusable example

- [Desktop first mission](1280-first-mission.png)
- [Teacher visual challenge preview](1280-teacher-preview.png)
- [Phone picture choice](320-picture-choice.png)
- [Phone picture sequence](390-picture-sequence.png)
- [First construction completed](390-first-build.png)
- [Classroom picture challenge](live/student-picture-challenge.png)
- [Board file with three visual activities](1280-visual-challenges.alloboard.json)

The sample backup demonstrates attachment, review, transport, and answer behavior. Its shared evaporation picture is supplementary artwork, not a scientific diagram or a complete set of balanced picture choices.

## Reproduce

```powershell
node _build_lesson_board_module.js
node dev-tools/refresh_lesson_board_integrations.cjs --board-visuals
node _build_lesson_board_module.js --check
node node_modules/vitest/vitest.mjs run tests/lesson_board tests/assessment_game_loading.test.js tests/assess_toolbar_presentation_runtime.test.js tests/quiz_review_game_coverage.test.js tests/quiz_review_game_runtime.test.js tests/glossary_games_review_runtime.test.js tests/glossary_image_reuse.test.js --pool=threads --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
node dev-tools/check_lesson_board_guidance.cjs
$env:LESSON_BOARD_QA_DIR='reports/lesson-board-guidance-2026-09-12/live'
$env:LESSON_BOARD_VISUAL_FIXTURE_PATH='reports/lesson-board-guidance-2026-09-12/1280-visual-challenges.alloboard.json'
node dev-tools/check_lesson_board_live.cjs
```

The browser harness reads the illustrated board fixture saved in reports/lesson-board-visuals-2026-09-12. The classroom harness retains its existing nonvisual behavior when LESSON_BOARD_VISUAL_FIXTURE_PATH is unset.
