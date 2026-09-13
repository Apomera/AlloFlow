# Board glossary and optional artwork

Implemented locally on 2026-09-12. Not deployed.

The board can now reuse lesson vocabulary and glossary pictures, and optionally generate pictures for its world, constructions, and selected terms. The new controls are under **Vocabulary and optional artwork** in board setup.

## Experience

- A glossary is suggested automatically only when its lesson source or canonical source fingerprint and language match. Other glossaries can be selected explicitly after review.
- Search the whole available glossary, including entries after item 100, and choose up to 12 terms for a board. Definitions and up to four available translations per term are copied into the board. Reuse existing glossary pictures without generating replacements.
- Selected vocabulary guides new board generation through application, examples, classification, and explanation. Activities still need evidence in the lesson source.
- Review each term's suggested location links. Links use words in the visible activity, not the hidden answer or the full lesson quote. Identical terms with different meanings require manual links.
- Choose whether definitions, translations, and vocabulary pictures are available during play or only after review. Teachers can inspect support while learners are answering.
- Generate a world setting, a completed construction picture, or an illustration for a selected term. Requests use the app's configured image provider only after clicking Generate picture. Preview, replace, remove, cancel, and customize the style. Failed or late requests retain existing pictures and cannot install into a different lesson.
- Completed construction pictures appear when built. The world picture supplements the interactive map; routes, labels, controls, and answers remain rendered as accessible interface text.
- Hide pictures without changing an active response, game progress, location, or construction goal. The preference survives reload in solo and classroom play. Focus view keeps the current activity and relevant vocabulary available.

## Persistence and classroom sharing

Vocabulary and artwork use a separate, scoped device record, so image changes do not change a solo attempt's identity. Existing records are preserved on corruption or conflicting saves. Routine board edits and mission changes carry their attached support forward; game progress continues to belong to its original board and mission.

Board files can carry sanitized vocabulary, location links, and their referenced pictures. Older board files remain supported. Backups omit learner identities, responses, and live progress. Imports with a different lesson context preserve their included artwork.

Classroom launch creates one compact support snapshot with an asset dictionary. Repeated references reuse one image, and move history contains no image payloads. Learners cannot edit the shared support. Late joiners and restarted attempts receive the same support. Image compression failures retain vocabulary text and produce a visible omission notice. A shared support package is capped at 30,000 characters; unusually extensive vocabulary may require choosing fewer terms. Other session size checks continue to apply.

The illustrated four-client fixture used three unique pictures, with no omissions: support occupied 26,234 characters and the completed classroom document occupied 35,272 characters.

## Validation

- **458 passing tests across 28 suites**, covering the board engine, setup, storage, live writes, glossary support, transfer, assessment toolbar, and review-game integration.
- **55 focused tests passed again after final wording changes.** These overlap the 458 tests and are not additional distinct cases.
- Complete eight-location expeditions with two constructions passed at **1280, 390, and 320 pixels**, including glossary reuse, explicit image requests, illustrated backups, reload, review-only definitions, and picture visibility without progress loss.
- **Four browser clients** passed the production Class Mailbox adapter and Code.gs sandbox flow, including learner write rejection, late joins, private picture preferences, restart retention, response retries, and shared completion.
- **40 accessibility/layout scans** passed across solo and classroom checks. Checks included narrow screens, enlarged text, forced colors, and reduced motion. Desktop setup/map and mobile vocabulary screenshots were visually inspected. Automated checks are not a complete accessibility certification.
- Both production bundles match their public mirrors. All three board loader versions match the bundle; the assessment CDN version and desktop local module references are verified. Board strings match their desktop mirror.

See [validation summary](validation-summary.json), [regression results](regressions.json), [browser verification](browser-verification.json), [classroom verification](live/verification.json), and [bundle integrity](integrity.json).

The sample artwork was generated with the built-in image_gen tool and copied into this workspace. Browser tests used a fixture image provider returning those real sample assets; they exercised actual browser image decoding and compression. They did not call the user's configured in-app provider. Classroom testing used a local transport sandbox, not a deployed classroom or learner pilot.

## Preview and sample assets

- [Desktop world and map](1280-world-map.png)
- [Artwork setup](1280-artwork-setup.png)
- [Phone vocabulary and translations](320-vocabulary-review.png)
- [Completed construction in focus view](390-project-reveal.png)
- [Illustrated classroom board](live/student-illustrated-board.png)
- [Illustrated board backup](1280-illustrated-board.alloboard.json)
- [Generated waterworks setting](assets/waterworks-setting.png)
- [Generated evaporation glossary illustration](assets/evaporation-glossary.png)
- [Exact sample prompts and generation mode](sample-art-prompts.json)

The evaporation illustration uses symbolic wisps alongside a text definition. It is supplementary artwork, not a complete scientific diagram. The test fixture reuses the world sample for a construction slot to test that slot's lifecycle; real construction requests use project-specific prompts.

## Reproduce

```powershell
node _build_lesson_board_module.js
node _build_view_quiz_module.js
node dev-tools/refresh_lesson_board_integrations.cjs --board-visuals
node _build_lesson_board_module.js --check
node node_modules/vitest/vitest.mjs run tests/lesson_board tests/assessment_game_loading.test.js tests/assess_toolbar_presentation_runtime.test.js tests/quiz_review_game_coverage.test.js tests/quiz_review_game_runtime.test.js tests/glossary_games_review_runtime.test.js tests/glossary_image_reuse.test.js --pool=threads --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
node dev-tools/check_lesson_board_visuals.cjs
$env:LESSON_BOARD_QA_DIR='reports/lesson-board-visuals-2026-09-12/live'
$env:LESSON_BOARD_VISUAL_FIXTURE_PATH='reports/lesson-board-visuals-2026-09-12/1280-illustrated-board.alloboard.json'
node dev-tools/check_lesson_board_live.cjs
```

The live harness retains its existing nonvisual mode when LESSON_BOARD_VISUAL_FIXTURE_PATH is unset. The visual harness uses the two saved sample assets in this report directory.
