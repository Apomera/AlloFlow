# Glossary games: additional review and refinements

Completed September 8, 2026. This pass builds on the earlier glossary review and preserves other workspace changes.

## Added: Definition Detective

A new glossary game asks learners to choose a term from its definition. It uses the current glossary directly and requires no additional model calls.

- One clue per distinct definition. Synonyms sharing a definition are excluded from misleading wrong choices.
- Feedback stays visible until the learner chooses Next. Incorrect answers explain both the target term and the selected term.
- A summary offers practice on missed clues. Practice does not award duplicate points or add completion records.
- First-pass scoring awards 10 points per correct answer. Teacher analytics converts correct answers / clue count into comparable accuracy.
- Registered in the glossary Games menu, learning-goal choices, completion history, and teacher game statistics.
- Native choice buttons, named dialog, keyboard focus handling, readable progress, phone layouts, and dark/high-contrast presentation.
- Empty or unsuitable glossaries show guidance rather than starting an unanswerable round.

## Existing games refined

| Game | Issue | Change |
| --- | --- | --- |
| Memory | Larger glossaries always used the first ten eligible terms. | Shuffle the full eligible pool before taking ten. |
| Matching | Larger glossaries always used the first eight eligible terms. | Shuffle before selecting eight. |
| Student Bingo | A mounted card could retain vocabulary from a previous glossary. | Rebuild on meaningful vocabulary changes, while equivalent rerenders preserve marks. |
| Student Bingo | Starting another card required leaving the game. | Added New card; it clears marks and allows a fresh completion. |
| Word Scramble | Hints could subtract points already earned on earlier words. | Hints reduce only the current word reward; available points are visible. |

## Validation

- 210 tests passed across 17 files in the final two runs, including behavioral regressions, scoring, analytics, game contracts, and accessibility checks.
- An earlier focused run also passed 87 tests. These overlap with final coverage and are not added to the total.
- Chromium checked 24 game/viewport combinations across desktop (1280px), phone (390px), and narrow phone (320px), with zero captured page errors or page-width overflow.
- Browser interactions exercised Detective feedback, review, missed-clue practice, and completion counts; Bingo caller/marked states; and Syntax keyboard focus.
- Detective and Syntax dark/high-contrast screenshots were captured. Detective phone feedback and dark desktop screenshots were visually inspected.
- 5 source/deployed mirror pairs matched. Generated module syntax and desktop host JSX parsed successfully. Affected game/view/analytics cache pins were refreshed; translations retain the existing build-stamp loader.
- The initial broader fork-worker run stalled during shutdown and produced no final report. The subsequent thread-worker runs above completed successfully.

## Evidence

- [Browser results](browser-results.json)
- [Definition Detective on a phone](DefinitionDetectiveGame-390.png)
- [Phone answer feedback](DefinitionDetective-feedback-390.png)
- [Round review](DefinitionDetective-review-390.png)
- [Dark presentation](DefinitionDetective-theme-dark.png)
- [High-contrast presentation](DefinitionDetective-theme-contrast.png)
- Reproducible browser check: dev-tools/check_glossary_games_second_review.cjs.
- Regression and build records: .codex-artifacts/glossary-games-second-review/.

## Remaining opportunities and limits

- Smaller 3x3/4x4 Bingo boards would avoid repeated vocabulary when a glossary is shorter than the standard 5x5 card. This pass preserves the existing 5x5 behavior.
- A context-clue game would be a useful next activity when entries contain reviewed example sentences; it should not invent ambiguous cloze answers from definitions.
- Example/non-example sorting could add conceptual practice when the glossary includes suitable examples and counterexamples.
- New learner-facing strings are in the English catalog with readable English fallbacks; additional language translations remain to be authored.
- Browser validation used production game bundles in a local fixture. This pass did not publish a deployment or run a complete authenticated teacher-to-student save/import workflow.

