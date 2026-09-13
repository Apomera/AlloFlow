# Mission finale and balanced visual choices

Implemented locally on 2026-09-12. Not deployed.

## Playable mission finale

Every completed board now offers **Final challenge: put your discoveries to work**. The learner plans an investigation for a new team using a construction actually built during that attempt.

1. Choose a completed construction and identify its board effect.
2. Select two explored locations representing different lesson concepts. Open each location's source excerpt and explanation as evidence.
3. Explain how the construction and connected concepts support the investigation. Write a response, or use speech, signing, a drawing, or communication tools.
4. Review the connection, evidence, and construction purpose. Review the plan for specific feedback, revise, and discuss an alternative construction.

Rule feedback checks the construction effect and whether the selected evidence covers two concepts. Written explanations are not semantically graded. A completed self-review means the plan is ready to discuss, not that its reasoning has been independently verified. No microphone, recording, or additional AI request is required.

The finale does not alter the completed mission, supplies, scores, or classroom responses. Solo drafts and reviews use the existing account-scoped durable save and conflict handling. Classroom plans remain private in each participant's browser tab and survive reloads there. Teacher plans are separate, paused boards disable edits, and a restarted board has a fresh workspace. Learners should discuss or download a plan before the teacher ends or restarts the board.

**Download my plan** produces a bounded JSON artifact containing the selected construction, evidence excerpts, explanation or oral-completion indication, and review status. It excludes learner names, shared run data, and hidden written drafts when the learner chose oral response mode. Plans are separate from the class results report and are not submitted automatically to the teacher.

## Balanced visual support

In board setup, open **Vocabulary and optional artwork**, then **Visual learning challenges**. The editor now counts pictures and descriptions for each choice group, including each configuration control separately. It names missing alternatives and flags when only the correct answer has a picture. Sequence-item coverage is checked without treating an item as the correct answer.

Teachers can:

- Fill missing descriptions from unique, exact glossary matches while preserving their existing wording.
- Switch an entire group to descriptions only, retaining the descriptions.
- Move a single picture into the question clue without replacing an existing clue.
- Select vocabulary with or without artwork and toggle a cue's picture individually.

These changes return the activity to draft review and require another learner preview before enabling. Explicitly text-only cues remain text-only through save, backup, classroom compression, shuffled practice, and later glossary image changes.

Coverage counts identify gaps; they do not judge equivalent difficulty or scientific accuracy. Existing visual challenges remain usable, and teachers can review uneven support rather than being blocked. Automatic suggestions do not invent definitions or assign ambiguous vocabulary senses.

## Verification

- **507 tests across 32 suites passed**, covering the board, assessment integration, glossary reuse, live writes, transfer, and storage. This includes 21 new finale and visual-balance tests. See [regressions](regressions.json).
- A final phone-layout refinement added full selected concept labels and kept checkbox labels next to their controls. Its seven UI tests passed again. See [final UI check](final-ui-check.json).
- The production board bundle completed eight-location expeditions and two constructions at **1280, 390, and 320 pixels**. The 41 accessibility/layout checks include visual coverage repair, keyboard response controls, source evidence, correction feedback, written and communication-tool finales, downloads, reloads, forced colors, reduced motion, and enlarged text. See [browser verification](browser-verification.json).
- **Four browser clients** passed the production Class Mailbox adapter and local Code.gs sandbox flow. The 22 accessibility/layout checks include private finale completion and reload. Verification also checked no shared finale writes, separate teacher plans, paused editing, downloads, and fresh workspaces after restart. See [classroom verification](live/verification.json).
- Board bundles, desktop mirrors, loader versions, and English string mirrors were checked. See [integrity](integrity.json) and [validation summary](validation-summary.json).

Browser checks used authored lesson activities and the previously generated sample artwork. No new image generation was needed. The classroom text provider used a fixture. Automated accessibility scans are not a complete accessibility certification. No deployment or learner pilot was performed.

## Examples

- [Teacher coverage warning](1280-visual-coverage-warning.png)
- [Balanced choices on a phone](320-teacher-preview.png)
- [Finale feedback on desktop](1280-finale-feedback.png)
- [Finale feedback on a phone](320-finale-feedback.png)
- [Communication-tool response](390-oral-finale.png)
- [Classroom finale](live/student-finale.png)
- [Example written plan](1280-finale-plan.json)
- [Example classroom plan](live/student-finale-plan.json)
- [Board backup with three reviewed visual activities](1280-visual-challenges.alloboard.json)

The backup demonstrates balanced descriptions for the Heating station choices and a separate question-clue picture. Other activities retain the prior visual examples so their coverage warnings can be explored. The evaporation artwork is supplementary, not a scientific diagram.

## Reproduce

```powershell
node _build_lesson_board_module.js
node dev-tools/refresh_lesson_board_integrations.cjs --board-visuals
node _build_lesson_board_module.js --check
node node_modules/vitest/vitest.mjs run tests/lesson_board tests/assessment_game_loading.test.js tests/assess_toolbar_presentation_runtime.test.js tests/quiz_review_game_coverage.test.js tests/quiz_review_game_runtime.test.js tests/glossary_games_review_runtime.test.js tests/glossary_image_reuse.test.js --pool=threads --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
node dev-tools/check_lesson_board_finale.cjs
$env:LESSON_BOARD_QA_DIR='reports/lesson-board-finale-2026-09-12/live'
$env:LESSON_BOARD_VISUAL_FIXTURE_PATH='reports/lesson-board-finale-2026-09-12/1280-visual-challenges.alloboard.json'
node dev-tools/check_lesson_board_live.cjs
```
