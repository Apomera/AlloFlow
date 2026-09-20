# Board map construction and planning sandbox

Implemented locally on September 19, 2026. Not deployed.

## What changed

Constructions now appear directly on the exploration map as inspectable landmarks. Blueprints become built projects after confirmed construction. Built shortcuts gain a distinct connector to their actual destination, with matching text in the location list. Resource projects show the extra supplies they have actually earned. Unexplored locations show rewards including current construction bonuses; completed missions do not offer future rewards. Existing project illustrations and glossary pictures are reused when available, and Hide pictures keeps the same gameplay information accessible in text. The original world history remains available for before/current comparison.

The new “Try and compare construction plans” panel offers Plan A and Plan B. Each supports up to 12 legal projected moves, including explorations, constructions, resource bonuses, and shortcuts. Learners can copy a route to the other plan, undo the last planned move, and compare supplies, move slots, new concepts, locations, and constructions. Only currently reachable and affordable projected moves are offered. Mission completion and the real 48-move limit stop a projection.

All projected explorations explicitly assume a successful response. The sandbox never answers activities, awards learning credit, changes a saved game, submits class proposals, or writes to the classroom session. Returning to the game opens the first real move for inspection. Explore, Build, or Propose remains a separate deliberate action.

Plans are temporary for the open board. They are cleared when it is closed or restarted. If confirmed game mechanics change, both earlier plans remain visible and are marked outdated. Editing and first-move inspection wait for an explicit fresh start from current progress. Proposals and response receipts do not invalidate a plan; pause and pending-action states disable editing. Each teacher and learner has an independent workspace.

The board palette also now uses explicit system colors in forced-color mode, including primary buttons and the current-turn indicator. The construction heading has an opaque background so shortcut lines stay behind its text on narrow screens.

## Verification

- **573 tests across 39 suites passed**, including 25 new simulation and UI tests plus two mailbox fixture tests. Coverage checks legal and illegal routes, all three mission goals, construction ordering, the 12-step preview cap, final move slots, failed and unanswered real activities, duplicate activation, stale plans, and state isolation.
- **58 solo browser accessibility/layout scans passed** across light and dark themes at 1280, 390, and 320 pixels. They cover actual versus projected resources, unchanged local/session storage during planning, keyboard focus, copied/edited routes, stale plans, real shortcut geometry, illustrations, list/focus views, image-free play, reload, forced colors, and 200 percent text.
- **28 classroom browser scans passed with four clients** using the production Class Mailbox adapter and a local Code.gs sandbox. The teacher and learner planning workspaces made no shared writes, inspection did not submit a proposal, pause/resume worked, and a real classroom move invalidated both plans. Existing live response, retry, reconnect, role, finale, practice, sharing, and restart flows also passed.
- **86 browser scans in total.** Screenshots were visually reviewed for the desktop construction map, desktop comparison, and phone comparison/map. Automated scans do not establish full accessibility conformance or replace learner testing.
- Source and generated plugin bundles match. Root and desktop bundles and English string mirrors match. All three hosts use board cache revision **e1d2be6cd3**.

The browser board was authored fixture content. Existing generated glossary, world, and bridge illustrations were reused; no new image generation or live AI calls were made. Classroom generation used a deterministic test provider. No deployment or learner pilot was performed. The final cosmetic heading adjustment was made after classroom verification and rechecked in the solo browser suite.

The initial broad run passed all board suites but found three stale glossary-print assertions after a previous handler extraction. Those assertions now inspect the extracted implementation and passed on the targeted rerun. Both raw reports are retained. The long classroom run also exposed that its in-memory cache never expired rate counters. The fixture now honors cache TTLs, with tests proving rate enforcement and recovery. The browser harness advances only its cache clock between accessibility audits to model quiet intervals; production rate-limit code is unchanged.

## Evidence

- [Broad regression run](regressions.json)
- [Targeted follow-up results](regressions-followup.json)
- [Combined validation summary](validation-summary.json)
- [Solo browser verification](browser-verification.json)
- [Classroom verification](live/verification.json)
- [Bundle, cache, and string integrity](integrity.json)
- [Desktop comparison](light-1280-compare.png)
- [Desktop construction map](light-1280-built-map.png)
- [Phone comparison](dark-390-compare.png)
- [Phone construction map](dark-390-built-map.png)

## Implementation

The map lives in lesson_board_map.jsx; the pure projection logic in lesson_board_sandbox.js; and the comparison workspace in lesson_board_sandbox_ui.jsx. BoardView integrates both. Existing gameplay rules, persistence formats, and classroom write protocols remain unchanged. The builder and cache/string refresh script produce the desktop mirror and loader updates.
