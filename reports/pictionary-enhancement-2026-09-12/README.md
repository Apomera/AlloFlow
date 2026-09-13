# Solo Pictionary enhancement

Implemented locally on 2026-09-12. Not deployed.

## Drawing and revision

Solo Concept Pictionary in AlloHaven Arcade now supports pen, line, rectangle, ellipse, and eraser tools, with fine, medium, and thick strokes. Single taps leave visible dots. Undo and redo work from named buttons and keyboard shortcuts on the canvas. Clearing the canvas can be undone.

Pointer capture keeps a stroke together when a drag leaves the canvas. Drawing history is bounded, and interrupted pointer gestures do not become unfinished strokes. Switching between drawing and written clues preserves both responses and redraws the canvas correctly.

Learners can revise their clues after an AI guess, with up to three usable guesses per concept. Review without AI supports drawing and written responses when a provider is unavailable or when the learner prefers self-review. The summary separates AI matches, self-review, and skipped concepts, and provides a focused revisit set. It does not treat AI recognition as a grade or evidence of mastery.

## Lesson concepts and references

The concept source is explicit: the current lesson glossary, a generated topic, or built-in concepts. A typed topic is used when topic generation is selected. Small glossaries remain usable, including a single term. Selected glossary entries beyond item 100 remain eligible. Duplicate names and deselected entries are excluded. Each set uses up to five distinct concepts.

Available glossary definitions and pictures can be opened as optional references. The summary indicates when that reference was opened. References are displayed separately and are not sent with the AI request. A one-term glossary uses free guessing so the answer is not handed to the AI as a one-option list.

## Reliability and session behavior

AI requests use the configured arcade provider. A drawing request contains the canvas, while a text request contains the current written clues. Neither includes the hidden alternative response or glossary reference. Provider responses are validated before display, and related concept names are not automatically collapsed into a match through substring matching.

Duplicate activations do not create duplicate guesses or token charges. Stopping an AI wait, skipping, ending a session, or leaving the component invalidates late responses. A failed or malformed result preserves the learner's clues. Stopping the wait does not guarantee cancellation of a request already running at the provider.

More sets and revisit sets use the existing arcade session without another token charge. Failed topic generation can be retried or switched to another source within that session. The existing shared arcade timer continues to control the session. Drawings and set history remain in the mounted panel; this pass does not introduce cross-reload storage.

## Accessibility and presentation

The refreshed layout uses named native selects, visible selection states, large controls, keyboard focus on the current concept and feedback, status/error messages, and a written response alternative. Controls wrap at phone widths. Light and dark themes, forced colors, and enlarged text were checked.

## Verification

- **219 tests across 25 suites passed**, including 22 Pictionary runtime tests and three new integration checks. The suite also covers existing live Pictionary and Sketch Response behavior, arcade timers and entitlement, assessment loading, glossary games, and plugin-loader recovery.
- **52 accessibility and layout checks passed** across six combinations: 1280, 390, and 320 pixels in light and dark themes.
- Production browser tests compare actual canvas pixels after drawing, clearing, undo, redo, and mode switching. They exercise dots and shapes, reference display, revision, stop-wait and skip races, session expiration, self-review, and repeat-set token behavior.
- Desktop mirrors and three host integrations were verified. The solo plugin has a scoped content-based cache version. The AlloHaven provider-context change is mirrored and its CDN version is refreshed.
- Two adjacent boss-battle assertions relied on the exact spelling of an equivalent last-question expression. They now execute that boundary expression against before-last, last, and after-last cases. Boss-battle production behavior was not changed.

See [regression results](regressions.json), [browser verification](browser-verification.json), and [validation summary and integrity](validation-summary.json).

Browser AI requests used deterministic fixtures. The reference picture reused a prior board fixture; no new AI image requests were made. The browser flow used the shipped solo plugin in a local arcade context, while live behavior was covered through the existing protocol and UI tests. Automated accessibility checks and visual review do not establish full accessibility conformance. No deployment or learner pilot was performed.

## Examples

- [Desktop drawing tools](dark-1280-drawing.png)
- [Phone feedback and revision](light-390-feedback.png)
- [Phone concept summary](dark-390-summary.png)
- [Glossary reference](light-390-reference.png)

## Reproduce

~~~powershell
node --check arcade_mode_concept_pictionary.js
node --check allohaven_module.js
node dev-tools/check_pictionary_solo.cjs
node node_modules/vitest/vitest.mjs run tests/arcade_ tests/concept_pictionary tests/live_activity_review_runtime.test.js tests/live_game_modes_balance.test.js tests/live_quiz_p2p.test.js tests/hosted_arcade_entitlement.test.js tests/lan_live_session_identity.test.js tests/allohaven_theme_contrast.test.js tests/stem_plugin_dependency_order.test.js tests/plugin_progress_tick_defer.test.js tests/performance_plugin_manifest.test.js tests/assessment_game_loading.test.js tests/glossary_games_review_runtime.test.js --pool=threads --maxWorkers=1 --hookTimeout=120000 --testTimeout=60000
~~~
