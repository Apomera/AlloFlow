# Board-game plan previews and mission comparisons

Implemented locally on September 19, 2026. Not deployed.

## What changed

The existing Plan A / Plan B workspace now includes an optional step-by-step map preview. Learners can inspect the starting board, move forward or backward through planned explorations and constructions, and switch between map and location-list views. Each preview shows projected supplies and newly opened routes. Selecting a location stays inside the preview; the separate real-game inspection action retains its existing behavior.

Switching or editing routes resets the preview to the current route's final outcome. Real progress changes mark plans outdated and keep their earlier starting point visible until the learner explicitly starts fresh. Pausing classroom play continues to prevent edits to the plan.

The comparison explains move and resource differences without ranking one plan as automatically better. Each plan identifies the new lesson concepts it explores, the remaining goals for the selected mission, and construction effects within the planned route. It distinguishes new shortcuts from destinations already reachable or explored, and reports actual projected bonus earnings from later planned explorations. A mission-ending project does not promise additional explorations.

The preview reuses existing board art and glossary pictures while respecting Hide pictures and glossary review settings. Hypothetical successful exploration does not unlock review-only glossary pictures. Projected route coverage never records learner understanding, submits a response or class proposal, awards learning credit, or changes the saved game.

## Verification

- **587 tests across 41 suites passed**, including 14 new tests for mission-specific requirements, construction-order effects, step navigation, route switching, stale plans, glossary review limits, picture preferences, and isolation from actual play.
- **76 solo browser accessibility/layout scans passed** at 1280, 390, and 320 pixels in light and dark themes. These exercise the production bundle, map and list previews, keyboard controls, comparisons, real-versus-projected state, unchanged storage during planning, forced colors, reduced motion, and 200 percent text.
- **30 classroom browser scans passed with four clients**, using the production Class Mailbox adapter and a local Code.gs sandbox. Teacher and learner previews preserved the full shared document and write count, kept real selections unchanged, and withheld review-only glossary pictures. Existing live gameplay, pause/resume, retry, reconnect, review, and restart checks passed.
- **106 browser scans in total.** Desktop and phone screenshots were visually reviewed. Automated checks do not establish full accessibility conformance or replace learner testing.
- Generated bundles match source; root and desktop bundles and English strings match. All three hosts use board revision **ca59bf86cb**. Scoped whitespace checks passed.

The initial focused test run caught an old preview position returning when switching back to a plan. That issue was fixed before the full regression run. The classroom fixture honors cache expiry and models quiet intervals between accessibility scans; production rate limits are unchanged. Browser content uses authored board fixtures and existing generated illustrations. No live AI call, deployment, or learner pilot was performed.

## Evidence

- [Validation summary](validation-summary.json)
- [Regression results](regressions.json)
- [Solo browser verification](browser-verification.json)
- [Classroom browser verification](live/verification.json)
- [Bundle and integration integrity](integrity.json)
- [Desktop plan preview](light-1280-plan-preview.png)
- [Phone plan preview](dark-390-plan-preview.png)
- [Desktop mission comparison](light-1280-mission-comparison.png)
- [Phone mission comparison](dark-390-mission-comparison.png)

## Implementation

Projection explanations and glossary filtering live in lesson_board_plan_review.js. The comparison and preview components live in lesson_board_plan_review.jsx and extend the existing sandbox. The shared board map has a clearly labeled projection mode. No changes were made to gameplay rules, saved-run formats, AI prompts, or classroom write protocols.
