# Board game construction strategy

Implemented locally on 2026-09-12. Not deployed.

## Player experience

- Compare all three projects by the successful explorations needed, cost, supplies left after building, and project effect.
- Remember an optional construction goal. The map and location list mark the proposed exploration order; focus view keeps the planner available below the current move.
- Inspect the first planned activity without opening a move or spending supplies. Forecasts recalculate after confirmed progress.
- See when a shortcut destination would already be open, when construction would finish the mission, and when a plan exceeds the remaining move slots. Income estimates stop at the mission and move limit.
- Restore solo goals with the existing scoped device save and classroom goals in each person's tab workspace. A repeated-reload bug that could overwrite classroom view and goal preferences was corrected. Preview choices remain temporary.

## Planning boundaries

The funding search assumes successful explorations and no intervening construction. It uses the current resource bonuses and reachable locations, and finds a minimum exploration count under those assumptions. There are at most 4,096 location masks on a valid 12-location board. Plans that would finish the mission before the requested build are excluded. No activity answer keys are read by the search. Numbered map badges describe an exploration sequence; they do not imply that the pawn must walk continuously between those locations.

Choosing a goal changes workspace preferences only. In live play it does not send a vote, submit a response, choose a class move, or change the shared run. A personal goal can differ from another participant's goal.

## Verification

- 412 passing test cases across 25 suites. See [validation summary](validation-summary.json).
- Complete expeditions with all eight fixture locations and two projects at 1280, 390, and 320 pixels. Projected supplies were compared with the engine's actual rewards. Reload, location list, focus, forced colors, and reduced motion were exercised. See [browser results](browser-verification.json).
- Four browser clients using the production Class Mailbox adapter and a Code.gs sandbox passed response, retry, late-join, report, restart, and completion checks. Private goal selection, repeated student reloads, and teacher remounts preserved shared progress. All 18 classroom accessibility/layout scans passed. See [classroom results](classroom-live/verification.json).
- Desktop comparison and narrow-phone sequence screenshots were visually inspected. Automated scans found no included WCAG violations or horizontal overflow; they are not a complete accessibility certification.
- Board bundle mirrors, all three loader hashes, and 415 board string entries match. See [integrity](integrity.json).

Testing used authored fixtures and a simulated classroom transport. It did not call a real AI provider, deploy changes, or conduct a learner pilot.

## Screenshots

- [Desktop construction comparison](1280-comparison.png)
- [Desktop planned map](1280-planned-map.png)
- [Phone funding sequence](320-funding-plan.png)
- [Phone forced colors](320-forced-colors.png)

## Reproduce

Run the board build and scoped integration refresh, then the strategy browser harness and board Vitest suites. The live harness accepts LESSON_BOARD_QA_DIR to keep each verification run's files together.

Source: lesson_board_strategy.js, lesson_board_strategy_ui.jsx, lesson_board_play_extras.jsx, lesson_board_ui.jsx, lesson_board_storage.js, lesson_board_insights.js, and lesson_board_source.jsx.
