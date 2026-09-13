# Solo Concept Quest browser checks

Run `node dev-tools/check_concept_quest_solo_gm.cjs` from the repository root.

The production QuizView and solo bundle run on a local HTTP origin with real browser localStorage. A deterministic callback simulates the configured AI provider; no external AI requests are made.

Checks cover automatic AI scenes, typed character dialogue, question/recap, close/reopen/resume, page reload, preserved game progress and conversation memory, restored keyboard focus, and horizontal overflow at 1280, 390, and 320 pixels. Screenshots cover setup, dialogue, recap, saved adventure selection, and resumed encounters.

Results: 3 of 3 viewport runs passed. See `browser-results.json`.
