# Water Worlds: questions, land choices, and evidence

This pass improves the Water Worlds mode within the Water Cycle tool.

## Experience

- The question, prediction, and three-step investigation pathway lead into the landscape. Writing remains optional.
- Storm playback is above the canvas; stream comparisons are directly beneath it.
- Four cover cards explain infiltration and storage before a learner changes the land. Their explanations are linked for screen readers.
- Cell or patch selection previews the exact affected cells, count, and area. Apply commits the change; Undo restores the earlier land and any displaced result. Stream beds remain protected.
- Detailed ground stores and model parameters are available in expandable sections. Field notes prompt a claim, a reading, a process explanation, and a model limitation.
- The consecutive-storm guide checks recorded rainfall and cover before advancing to explanation. It identifies runs that changed other variables.
- The interface uses a warmer paper/forest palette, clearer selected states, responsive cards, and brighter graph lines in dark mode. Light, dark, high contrast, and forced-color styles are included.

## Model and evidence

The numerical water equations are unchanged. A pure land-plan helper shares its target selection with the actual edit operation. Choosing a cover or edit size preserves water and evidence; incomplete runs and recorded-time inspection block Apply. The analytical Differences map retains its own meaning and explains where to view the pending land footprint.

Source and desktop copies are synchronized. The existing model version and saved-session format are retained. New interface text follows Water Worlds' existing English-only scope.

## Local review

Run `node dev-tools/water_worlds_qa.cjs --serve` for the isolated preview at `http://127.0.0.1:8768/`.

Run `node dev-tools/water_worlds_qa.cjs` for the browser workflows, screenshots, and accessibility results in `reports/water-worlds-implementation/`.

Run `node node_modules/vitest/vitest.mjs run tests/water_worlds --maxWorkers=1 --testTimeout=30000` for the six focused model suites. The longer timeout accommodates the deterministic recorded-storm reconstruction tests.

Desktop and phone captures in this folder show the layout during implementation; the browser harness folder contains final workflow captures. These checks cover the isolated local tool, not a remote deployment.

## Validation outcome

- All 43 focused model tests passed across the original run and targeted retry. Five numerical tests initially exceeded the default five-second timeout; the three affected suites passed with the documented 30-second limit. The saved retry is `unit-retry.json`.
- All 22 browser workflow groups passed, including land previews, protected streams, undo, recorded-time inspection, baseline comparisons, exports, persistence, keyboard controls, 320/390px layouts, reduced motion, and retina rendering. The audited light, dark, and high-contrast states had no axe violations or browser exceptions.
- Three final browser checks verified screen-reader descriptions, matching-condition guidance for consecutive storms, and the final dark graph colors. The baseline and current lines have contrast ratios of 6.93:1 and 8.59:1 against the card. See `final-browser-checks.json` and `final-dark-graph.png`.
- JavaScript syntax, focused whitespace checks, and source/desktop file parity passed. Desktop, phone, and dark-mode captures were visually reviewed.
