# Solar System: calculation practice and misconception review

Enhanced October 4, 2026. Changes remain uncommitted.

The Challenges and True/False sections now support a complete answer, explanation and review flow, with readable controls and feedback on phones and desktops.

## Changes

- A shared visual layout adds clear topic headings, semantic numbered navigation, visible progress, theme-aware feedback, focus outlines and controls at least 44px high. Navigator descriptions identify completed work and ideas needing review without relying on color alone.
- All ten calculation topics retain their original order, units, tolerances and first-completion reward. Targets now come from the same solar constants and orbital helpers as the simulation. Submit and Enter call one grading handler, give consistent high/low feedback and record the last finite checked answer.
- Hints lead to a numbered worked solution. A correct answer also unlocks it. Revealing a solution does not solve a question or award XP. “Practice again” retains earned progress and never awards a completed question twice.
- All fifteen True/False topics retain their original answer key. Each explanation can be followed by a review attempt. First answers remain unchanged; the latest review is saved separately. Reviews do not award additional XP. Checked, first-correct and reviewed counts remain distinct.
- “Next unsolved calculation” and “Next unchecked idea” wrap through unfinished work. Explicit navigation focuses the new heading. Successful answers focus feedback, incorrect calculations return focus to the input, and the last hint focuses the newly available solution control.
- Existing live challenge math, clock gates, rewards and focused Full Orrery routes remain. Their controls and feedback receive the same readable sizing and colors. The equation reference is an optional disclosure that wraps at phone widths.
- Partial saves use bounded finite indices and hint counts. Only known, own, strictly true calculation completion flags count toward the learner quest score. Only strict boolean first answers count as checked ideas. Numeric zero drafts stay visible; malformed drafts, completion flags and feedback cannot hide a question or become a renderable object. Full-string finite-number parsing rejects values such as `11.86junk` and `Infinity`.

Practice actions update the current entry in the existing answer/hint/completion maps and the new `orr_chpractice`, `orr_chsolution`, `orr_chlast`, `orr_tfreviewing` and `orr_tfreview` maps. Other saved entries remain. Display normalization does not rewrite raw restored records. The derived `_chalScore` synchronizes with the same bounded completion count used by the Challenges section. Simulation time, camera, selected bodies, Workshop settings, snapshots, journal writing and Inquiry evidence are preserved by these practice actions.

## Scientific explanations

The calculations use the existing ideal two-body solar model, SI gravitational constants and AU conversions. Period questions explicitly use the normalized `T² = a³` relation in Earth years and AU; speeds, transfer delta-v and transfer duration use the simulation's gravitational parameter. Worked solutions identify the units and the circular, coplanar, instantaneous-burn assumptions for Hohmann transfers. Their delta-v excludes launch and planet-centered capture maneuvers.

NASA's [Trajectories chapter](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/) supports the explanation of a transfer ellipse between planetary orbits. NASA's [Free Falling Objects explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/free-falling-objects/) supports the distinction between orbital free fall and the absence of gravity. The revised Sun-focus explanation includes the ideal circular exception; the gravity explanation uses acceleration `GM/r²`, independent of the orbiting object's mass in the test-body model. The comet explanation distinguishes bound ellipses from unbound paths. The doubling question specifies semi-major axis rather than instantaneous distance.

## Verification

All 136 distinct unit checks passed across seven suites:

| Suite | Passed |
| --- | ---: |
| Calculation and misconception practice | 26 |
| Control names | 21 |
| Canvas alternatives | 17 |
| Canvas loop | 31 |
| Theme safety | 6 |
| Visual science | 17 |
| Workshop inspection | 18 |

The initial full run passed 135 checks. After the final saved-map correction, the affected control-name and canvas-loop suites passed their 52 checks; the final practice rerun passed all 26, including the added malformed-array case. The [verification summary](verification-summary.json) selects the latest result for each suite and records the result file. See the [initial unit log](unit-checks.log), [affected-suite log](final-unit-checks.log) and [final practice log](practice-unit-checks.log). Server-render checks verify rendering and native production callbacks; effect-driven quest-score synchronization is verified in the browser.

All eight focused browser cases passed in 1.9 minutes. They cover Enter/Submit grading, successful and incorrect-answer focus, final-hint focus, accessible answer naming, solution disclosure, repeat practice, per-question persistence, malformed saves and stale quest scores, True/False first/review histories, exact rewards, and 320px readability in both themes. See the [focused browser log](browser-checks.log).

All five legacy browser regressions passed in 1.3 minutes: page overflow at 320px/736px, every teaching tab at 320px, navigator selection, calculation/live quest progress, and clock-gated live answers with the focused Full Orrery route. See the [regression log](regression-browser-checks.log).

All fourteen visual scenarios passed with no recorded errors or page overflow:

| Section | Checked layouts and states | Minimum enabled text contrast | Minimum visible control height |
| --- | --- | ---: | ---: |
| Calculations | 1060px dark pending/practice; 1060px light incorrect; 736px dark complete; 320px light pending/solution/reference; 320px dark complete | 6.84:1 | 44px |
| True/False | 1060px dark pending; 1060px light incorrect; 736px dark reviewed; 320px light pending/reviewed; 320px dark reviewing | 6.81:1 | 44px |

See [visual measurements](after-metrics.json), [visual log](visual-checks.log) and the [capture helper](visual-qa.cjs). The numbered hint and worked-step lists, feedback, review history, wrapped live controls and expanded equation reference were also visually inspected.

Canonical/mirror syntax, visual-helper syntax, byte parity and scoped whitespace checks passed. See the [final source-check log](final-checks.log). Canonical/mirror SHA-256: `074576C8E711D55408D9754AE3C7053078CA636E61D0B10C0140A3981576A0A8`.

Visual checks use fresh mounts at 1060px, 736px and 320px with fixed, paused/reduced-motion states. Contrast measurements cover visible enabled DOM text; target measurements cover visible controls. They do not establish live viewport-resize behavior or a screen-reader usability study.

## Previews

- [Calculations before: desktop](before-calculation-1060-dark-pending.png) / [phone](before-calculation-320-light-pending.png)
- [Calculations after: desktop](after-calculation-1060-dark-pending.png) / [phone worked solution](after-calculation-320-light-solution.png)
- [Correct calculation](after-calculation-736-dark-solved.png) / [repeat practice](after-calculation-1060-dark-practice.png) / [expanded phone reference](after-calculation-320-light-reference.png)
- [Ideas before: desktop](before-ideas-1060-dark-pending.png) / [phone](before-ideas-320-light-pending.png)
- [Ideas after: desktop](after-ideas-1060-dark-pending.png) / [phone review](after-ideas-320-light-reviewed.png)
- [Wrong first answer](after-ideas-1060-light-wrong.png) / [review in progress](after-ideas-320-dark-reviewing.png)

## Reproduction

Run checks serially from the repository root. The report-local browser configuration uses one Chromium worker and no retries. Before images represent the earlier implementation; the visual helper's default mode checks the current source.

```powershell
node --check stem_lab/stem_tool_solarsystem.js
node --check desktop/web-app/public/stem_lab/stem_tool_solarsystem.js
node --check reports/solar-practice-enhancement-2026-10-04/visual-qa.cjs

node node_modules/vitest/vitest.mjs run tests/solar_system_practice_review.test.js tests/solar_system_control_names_a11y.test.js tests/solar_system_canvas_alternatives_a11y.test.js tests/solar_system_canvas_loop.test.js tests/solar_system_themed_color_safety.test.js tests/solar_system_visual_science.test.js tests/solar_system_workshop_inspection.test.js --pool=threads --maxWorkers=1 --no-file-parallelism --testTimeout=180000 --hookTimeout=60000

node node_modules/playwright/cli.js test tests/e2e/109-solar-system-practice-review.spec.ts --project=chromium --config=reports/solar-practice-enhancement-2026-10-04/playwright.config.ts

node node_modules/playwright/cli.js test tests/e2e/20-solar-system-orrery-responsive.spec.ts --project=chromium --config=reports/solar-practice-enhancement-2026-10-04/playwright.config.ts --grep 'keeps the Orrery free of horizontal overflow at 320px and 736px|keeps every Orrery teaching tab within 320px|exposes selected states for transfer and challenge navigators|persists calculation and live challenge progress for learner quests|gates live answers until paused and opens the focused Full Orrery view'

node reports/solar-practice-enhancement-2026-10-04/visual-qa.cjs

git diff --check -- stem_lab/stem_tool_solarsystem.js desktop/web-app/public/stem_lab/stem_tool_solarsystem.js tests/solar_system_canvas_loop.test.js tests/e2e/20-solar-system-orrery-responsive.spec.ts
Get-FileHash -Algorithm SHA256 -LiteralPath stem_lab/stem_tool_solarsystem.js, desktop/web-app/public/stem_lab/stem_tool_solarsystem.js
```
