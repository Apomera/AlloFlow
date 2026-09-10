# Match block and protected-break verification

The new focused suite passes **64 tests in one loaded file**, with process exit code **0**. It executes the actual core actions, keyboard/mouse handlers, feedback publisher, placement/preview functions, history and removal implementations using local THREE r128. No production files were changed by this subtask.

- Twelve material cases each exercise all four shapes and all four canonical rotations: **192 recipes**. Matching publishes one complete choices/feedback patch, preserves collaboration settings and does not mutate the creation, history, camera, selection, counters or rewards.
- A real key-handler `I` followed immediately by ghost preview and `B` places the copied recipe before any component rerender. Selected STL is byte-identical before intentional placement.
- Ground and lesson appearance can be sampled while their protection remains intact.
- Missing, NPC, decorative, stale, invisible and malformed targets preserve choices and show useful feedback without opening NPC dialogue.
- Destroyed/failed/inactive worlds, Showcase and all eleven real modals prevent matching. Inventory and the focused toolbar remain usable. Modifier/repeat/form-field keys are not intercepted; keyboard matching requires active world focus.
- Middle click requires native pointer lock on the actual canvas and routes to Match directly, including when the first hit is an NPC.
- New cues receive their full lifetime; old ruler timers cannot clear them, later measurement messages survive, and unmount cancels owned feedback timers.
- Protected ground/lesson blocks retain their bump feedback while keeping geometry, history and placed counts unchanged, without break sound, particles, shake, frustration or collaboration success effects.
- Actual removal produces one successful transaction and preserves a rotated block's recipe for Undo. Rejected removals and stale hits cannot trigger successful-break feedback or remove a replacement mesh.

The parent task's browser verification covers the real control layout, click/tap interactions and rendered preview. These focused tests do not claim GPU rendering.

## Evidence

- Test source: `tests/geometry_world_match_block.test.js`
- Final JSON: `reports/geometry-world-building-tools-2026-09-09/building-tools-tests.json`
- Command: `node node_modules/vitest/vitest.mjs run tests/geometry_world_match_block.test.js --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile=reports/geometry-world-building-tools-2026-09-09/building-tools-tests.json`
- Console and JSON agree: one loaded suite, 64 passing cases, zero failures; process exit 0.
- Canonical core and desktop mirror are byte-identical. SHA-256: `c58a4eb29a6fdd6bcdd94ed29d20c69919d7215a85ee5ffb525e666ffcc91676`.
