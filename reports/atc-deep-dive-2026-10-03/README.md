# ATC Tower deep dive — October 3, 2026

The ATC tool now has a working approach-and-sequencing workflow, readable aircraft controls, and a consistent simulation across screen sizes and refresh rates. Changes are in the canonical STEM tool and its desktop public mirror.

## Findings and implemented changes

| Finding | Result |
| --- | --- |
| Every animation frame advanced a fixed 1/30 second; movement also included display scale. | Elapsed frame time drives a fixed world grid. Knots, nautical miles, vertical rates and fuel use consistent conversions. Flight motion runs at an explicit 120× teaching speed. |
| Approach clearance chose the reciprocal heading while touchdown required the runway heading. | Automatic guidance intercepts a final entry waypoint, descends along a teaching glide path and captures the landing threshold on the correct heading. |
| Holding changed only the aircraft label. | Holds follow a bounded circular teaching path; release, vectors and go-arounds have visible state changes. |
| Altitude commands teleported aircraft. | Climb and descent now approach the requested altitude progressively. |
| The “crossing” airport did not have intersecting runways; landings had no occupancy protection. | Runways intersect and share an occupancy group. Occupied-runway arrivals automatically go around. Parallel runways have distinct identifiers and independent occupancy. |
| Most commands, feedback and math answers existed only inside the canvas; global shortcuts intercepted typing and trapped Tab. | Aircraft strips, runway board, command buttons, input forms, help, math and debrief are HTML. Shortcuts apply to the focused radar; Tab leaves it. Touch targets are at least 44px. |
| Pausing returned before painting; math traffic kept moving. | Paused frames still paint. Help, command entry and math freeze time, fuel and movement. Worked examples remain until Continue traffic. |
| Exact-zero math was always wrong, decimal input was unavailable, ties were awarded to B, and 15% tolerance admitted large errors. | Numeric answers accept decimals and exact zero with precision-based tolerance. Arrival ties have a Same time answer. Prompts state units and rounding; time explanations include ×60. |
| Fuel messages repeated; landed aircraft blocked spawning; badges could be awarded on every frame; the current streak was saved as the best. | One-time fuel alerts, active-aircraft capacity, bounded cleanup/logs, remembered badge awards and separate session-best streak tracking. Fuel reserves account for the approach route. |
| Ending a shift provided no accessible results screen. | Debrief records score, landings, best streak, conflict events and solved math once, adds cumulative totals, and provides retry/airport/lesson actions. |
| Lessons presented simplified separation and crosswind claims as general aviation rules. | Five lessons distinguish model assumptions from real operations and link to FAA sources. Versioned English entries prevent stale lesson translations from replacing revised content. |
| AI lesson requests used a global counter and could return an explanation for an obsolete reading level. | Requests belong to the mounted tool instance, validate lesson/level context and ignore obsolete responses. Changing level clears the previous explanation; deferred-request tests cover context changes and independent instances. |

The menu reflows on narrow screens. During a phone shift, aircraft controls appear before coaching and the event log. High-contrast hover states and Windows forced-color rendering were checked.

## Verification

- Final targeted Vitest suite: **8 test files, 43 tests passed**.
- `browser-qa.cjs`: 28 passing checks in installed Chrome, with desktop, 390px and 320px views; keyboard/touch actions; exact pause; input isolation; decimal/zero/tie answers; cumulative results; and same-frame runway/crossing arrivals. No uncaught browser errors.
- Axe checks pass on paused playing controls, math feedback (including high contrast), and debrief.
- `tests/atctower_simulation.test.js`: model regressions cover units, frame rates, progressive altitude, separation, runway identifiers/occupancy, holds, landing gates, pause, and 108 airport/runway/corner/speed approach combinations.
- `tests/atctower_math_learning.test.js`: seven checks, including 400 generated challenges and lesson rendering through the actual English catalog.
- `tests/stem_atctower_dialog_a11y.test.js`: live React tests validate heading ranges, auto-pause, field naming, input key isolation and native Tab navigation.
- `tests/atctower_lesson_requests.test.js`: five deferred-request tests cover reading-level changes, navigation, unmount, failed obsolete requests and instance isolation.
- The existing ATC accessibility and Ops Lab tests remain part of the targeted suite.

The browser fixture mounts the production tool with local React and the host update contract. Its test-only reference exposure is applied in memory and is absent from production. These checks validate the tool itself; they do not deploy or verify the complete hosted AlloFlow application. `run-tests.cjs` uses a workspace temporary folder and one shared worker because worker startup and filesystem latency were intermittent in this Windows workspace.

Further planning, recovery, pacing, and debrief improvements are documented in the [second quality pass](../atc-quality-pass2-2026-10-03/README.md). The runner now includes that pass's sequencing and recovery regressions. The first pass's 43-test run included a duplicate assertion, which the second pass removed.

Re-run from the repository root:

```text
node reports/atc-deep-dive-2026-10-03/run-tests.cjs
node reports/atc-deep-dive-2026-10-03/browser-qa.cjs
```

## Model boundaries

This is a teaching model. Arrival intervals use the real shift clock, while flight movement, fuel and vertical rates use 120× time. Wind is a visible briefing cue and math input; it does not change flight dynamics. Separation is a simplified 3nm/1,000ft rule with 6nm around Heavy/Super aircraft. Runway occupancy lasts two real seconds. Holds, runway geometry and automatic approach capture are teaching abstractions. The separate Ops Lab remains a visible weighted index and does not configure the tower shift.

New interface strings have English catalog entries and safe fallback behavior. Additional locale translations remain future work.

## Sources checked

- [FAA radar and wake separation](https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap5_section_5.html)
- [FAA arrival procedures](https://www.faa.gov/air_traffic/publications/atpubs/atc_html/chap3_section_10.html)
- [FAA radio communication and phraseology](https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_2.html)
- [FAA Pilot’s Handbook of Aeronautical Knowledge](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak)
- [FAA Airplane Flying Handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook)

Screenshots and the final browser results are stored beside this report. QA history records the issues found and corrected during review.
