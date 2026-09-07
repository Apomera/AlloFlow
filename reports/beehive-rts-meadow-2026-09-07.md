# Colony Network RTS: living meadow

The spatial model described below was subsequently corrected. See [the spatial-science review](beehive-spatial-science-review-2026-09-07.md) for shared foraging, removal of the territorial border, and the current scientific limitations.

The default RTS layout now opens with its 3D meadow. Nearby controls pause and resume the game or advance exactly one cycle while paused. The existing 2D battlefield, keyboard placement grid, command dock, and strategy panels remain available below it. Saved overview-layout and 3D-visibility preferences are respected.

## Visual changes

- Raised terrain with a beveled earth base, stream, banks, stone edges, a footpath, trees, batched grass, and shaped flowers.
- Detailed hives with entrances, landing boards, team-colored trim, and health rings. Scaling with health keeps the hive grounded.
- Distinct brood, honey, pollen, guard, nursery, and fan structures. Upgrades change height, placement follows the existing model coordinates, and additional structures expand the scene without replacing the WebGL canvas.
- Visible forager routes and a ground-level frontier. Flower colors, bee traffic, raiders, and signal domes follow their existing game readings. Zero forage control remains zero in both map presentations.
- Seasonal terrain and foliage, including a winter treatment and no summer forager traffic when the model's seasonal forage multiplier is zero.
- Optional routes, signal domes, and labels. Tactical pause and reduced motion stop scene-owned animation. The camera framing adapts to narrow canvases.

The labels distinguish strategy symbols and game indices from real buildings, flower ownership, or measured pheromone distances. Decoration uses fixed positions rather than adding random decisions to the game.

## Engagement and access

Three optional field objectives ask learners to read the meadow, protect the colony, or build while retaining a nectar reserve. Each objective shows two actual readings and their targets, connects to an existing command, displays its resource cost, and can focus the relevant part of the 3D map. Target completion reflects the current game state; it does not award a biological mastery claim or change the game's victory conditions.

Recent action and cycle outcomes appear beside the map with their recorded before-and-after values. Construction has a direct keyboard-focus link. Camera buttons, labeled checkboxes, focus indicators, mobile reflow, dark theme, and forced-color styles support the new controls. Viewer status is synchronized even when its initial render begins off-screen.

## Validation

The full Bee regression suite passed all 398 tests across 41 files, with no failures or skipped tests. This includes seven new scene and objective checks covering structure silhouettes and placement, expansion beyond twelve buildings, reusable geometry, zero control, overlay state, winter traffic, pause/resume timing, reduced motion, and paired objective targets.

All eighteen distinct browser scenarios passed across combined and focused runs: ten discovery, four new RTS, and four existing forage-map WebGL scenarios. One combined run hit a browser-context teardown timeout; the affected case passed on rerun. Additional framing checks project the complete terrain bounds into the actual desktop and mobile camera views. Checks include live commands and costs, single-cycle stepping, objective focus, construction navigation, canvas identity after building and layer changes, seasonal rendering, 320px reflow, dark theme, keyboard controls, and Axe accessibility checks including color contrast. Desktop and mobile scene screenshots were visually reviewed.

Reproduce:

```text
node node_modules/vitest/vitest.mjs run beehive --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node node_modules/@playwright/test/cli.js test tests/e2e/beehive-rts-meadow.spec.ts tests/e2e/beehive-discovery-studio.spec.ts --workers=1 --reporter=line --retries=0
node node_modules/@playwright/test/cli.js test tests/e2e/24-beehive-hive-forage-3d-gl.spec.ts --grep "Beehive 3D forage map" --workers=1 --reporter=line --retries=0
```

Visual previews are in `scratch/beehive-rts/`. The source and desktop mirror are synchronized. Changes are local; no production deployment was performed.
