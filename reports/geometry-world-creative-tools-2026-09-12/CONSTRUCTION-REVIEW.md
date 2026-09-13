# Geometry World construction tools

This pass adds deliberate, previewed construction operations to Free Build while keeping single-block placement as the default.

## Build workflow

- **Line:** snaps the endpoint to the dominant grid axis. Keyboard/touch aiming can create vertical rows; mouse/pen dragging lays rows on the starting horizontal plane.
- **Floor:** creates an inclusive X/Z rectangle at the starting cell's Y level.
- **Wall:** creates a one-cell-thick wall along the dominant X/Z direction, with an explicit height of 1–32 blocks.
- The preview reports width, depth, height, and cell count. It uses the selected material/shape/rotation recipe for the eventual construction and shows exact shape edge geometry.
- Mouse/pen users drag on the unlocked canvas, release to review, then press B or choose Place. Keyboard/touch users press B or Place to anchor the first face, aim at another face, then press B or Place again.
- Escape or Cancel abandons the draft. A rejected destination does not partially build the operation.

The starting point uses the existing transformed face-normal conversion, including rotated shapes. Pointer endpoints project onto the starting horizontal plane so a floor or wall does not jump between surfaces while dragging.

## Shared transaction API

`engine.previewBuildBatch(additions, removals, options)` returns a pure plan with `ok`, `code`, `reason`, normalized `additions`, captured `removals`, `count`, and `label` on success. Additions use `{x,y,z,type,shape,rotation}`; removals require `{x,y,z}`. Rotation is an integer quarter turn, 0–3.

`engine.commitBuildBatch(...)` validates again, detaches original source meshes while preserving them for rollback, places every destination, and releases the original resources only after all destinations succeed. It rejects protected scenery, invalid cells, duplicates, unknown materials/shapes, invalid rotations, collisions outside removed cells, and net construction capacity violations. The per-operation allocation limit is 1,500 cells.

Successful operations create one grouped Undo entry. Replay checks the original material/shape/rotation before removing anything, preserving later unrelated edits at those coordinates. Legacy individual placements/removals retain their existing history format. Options `beforeSelection` and `afterSelection` store copied coordinate selections for transforms and stamps.

The placement count changes by the net addition/removal amount, preserving existing progress totals through moves/recolors. Failed attempts do not change counters, histories, selection, or session events. Successful operations produce bounded per-block events plus one operation event after completion.

## Preview ownership and rendering

`showBuildBatchPreview(plan, ownerToken)` and `clearBuildBatchPreview(ownerToken)` allow drawing and selection editing to share one overlay. Failed plans may be supplied with their requested additions for a coral preview. Owner-specific clearing cannot erase another operation's overlay.

Exact shape edges are merged into one line mesh for the entire preview. Source shape geometry, live construction materials, and terrain remain untouched. Preview geometry/materials are disposed on replacement, cancellation, lesson changes, and engine teardown.

The follow-up cache patch avoids rebuilding the same cell array on every animation frame. Recipe, endpoint, height, history, or preview ownership changes invalidate the cache. Commit always performs fresh validation.

## Verification

The final targeted run passed **72 tests across four files**: 28 atomic/drawing geometry cases, 7 mounted drawing UI cases, 24 legacy placement transaction cases, and 13 existing builder navigation cases. The report is `drawing-tests-final.json`, including cache invalidation coverage.

Coverage includes collision/protection/bounds rejection, net capacity, exact rotated fractional shape replay, cloned selection history, stale-source replay refusal, rollback with mesh identity retained, cleanup of a mesh attached before a failed creator registers it, inclusive drawing dimensions, oversized rectangles rejected before allocation, one-draw-call previews, keyboard/touch endpoint routing, modal cancellation, and accessible UI commands.

Parent-owned browser verification covers actual drag, camera targeting, narrow screens, final panel placement, and the combined selection/lesson/printing changes. These are local source changes; this subtask did not commit or deploy them.
