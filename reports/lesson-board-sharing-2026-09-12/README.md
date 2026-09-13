# Board completion guide and readable learning summaries

Implemented locally on 2026-09-12. Not deployed.

## Clear next steps

Completed missions now show a compact guide with the current final challenge and adaptive practice statuses. Learners can open or return to a plan, resume practice, or preview their learning summary. The suggested action changes as these follow-ups are completed. Follow-ups remain optional and do not change the completed mission score.

Navigation opens the relevant learning panel and moves keyboard focus to its heading. Reaching the move limit offers practice and sharing without claiming the mission is complete. Completed practice routes also link directly to the summary controls.

## Review before sharing

Learners choose whether to include the board mission and their original game results, their final challenge plan, the current practice route, and source excerpts. The optional name begins blank. A readable preview appears before download or print. Changing the selected content, name, or relevant learning responses marks the preview as outdated and disables export until it is refreshed.

The summary can be downloaded as a self-contained HTML document or plain text. Print or save as PDF opens the browser print flow only after an explicit click. If printing is unavailable, the interface offers the HTML download as a fallback. The final challenge also has a direct readable-plan text download; its existing JSON export remains available as Download plan data (JSON).

Original game results and practice checks are reported separately. Draft plans are labeled as drafts; self-review does not claim automated grading of an explanation. Practice reports include checked responses from the current route, including retries, and exclude unfinished responses. Oral or communication-tool plans exclude any hidden written draft. No document claims mastery.

## Classroom behavior

Each learner summary includes only that learner’s game results and local follow-up work. Roster names and participant IDs are not copied into it. Teachers see a separately labeled demonstration summary; class results remain in the existing teacher report. Previewing, printing, or downloading does not send the summary to the teacher or modify shared game progress.

The section choices, optional display name, and preview are temporary controls. Existing saved finale and practice work remains unchanged. A restarted board opens a fresh workspace.

HTML exports escape all lesson and learner content, contain no scripts or remote media, and use semantic headings and table headers. The embedded preview has a restrictive sandbox. Screen and print styles keep long text and narrow tables within the available width.

## Verification

- **546 tests across 36 suites passed**, including 18 focused completion and sharing tests. Coverage also includes assessment loading, glossary reuse, storage, gameplay, classroom writes, final challenges, and adaptive practice. See [regressions](regressions.json).
- The production browser flow passed at **1280, 390, and 320 pixels**, including **71 accessibility/layout checks** and **6 standalone HTML screen/print checks**. It verifies keyboard navigation, section selection, preview invalidation, repeated refresh, user-triggered print invocation, HTML/text downloads, safe markup, hidden oral draft exclusion, and unchanged game/workspace state. See [browser verification](browser-verification.json).
- **Four classroom clients** passed **26 accessibility/layout checks** using the production Class Mailbox adapter and local Code.gs sandbox. Learner and teacher summaries remained separate; sharing made no shared writes; restarting removed the previous completion/share panels. See [classroom verification](live/verification.json).
- Production bundles, desktop mirrors, loader versions, and English fallback strings were checked. See [integrity](integrity.json), [string verification](sharing-string-verification.json), and [validation summary](validation-summary.json).

Visual inspection covered the desktop completion guide, phone sharing controls and preview, and the exported document’s screen and print styles. Automated accessibility scans do not establish full accessibility conformance. Print invocation was tested with a browser-method stub and print-media styling; no physical print or saved PDF was exercised. The board used authored activities and earlier generated sample pictures; the classroom AI provider used a fixture. No new AI requests, deployment, or learner pilot were performed.

## Examples

- [Desktop completion guide](1280-completion-finished.png)
- [Phone sharing controls](390-summary-options.png)
- [Phone summary preview](390-summary-preview.png)
- [Readable learning summary](1280-learning-summary.html)
- [Plain-text learning summary](1280-learning-summary.txt)
- [Written final challenge plan](1280-readable-plan.txt)
- [Classroom learner summary](live/student-learning-summary.html)

## Reproduce

~~~powershell
node _build_lesson_board_module.js
node dev-tools/refresh_lesson_board_integrations.cjs --board-visuals
node _build_lesson_board_module.js --check
node node_modules/vitest/vitest.mjs run tests/lesson_board tests/assessment_game_loading.test.js tests/assess_toolbar_presentation_runtime.test.js tests/quiz_review_game_coverage.test.js tests/quiz_review_game_runtime.test.js tests/glossary_games_review_runtime.test.js tests/glossary_image_reuse.test.js --pool=threads --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
node dev-tools/check_lesson_board_sharing.cjs
$env:LESSON_BOARD_QA_DIR='reports/lesson-board-sharing-2026-09-12/live'
$env:LESSON_BOARD_VISUAL_FIXTURE_PATH='reports/lesson-board-finale-2026-09-12/1280-visual-challenges.alloboard.json'
node dev-tools/check_lesson_board_live.cjs
~~~
