# Kitchen ingredients — 2026-09-28

The kitchen now connects recognizable ingredients with hands-on exploration. A pasta packet with visible noodles, an olive-labeled bottle, marked water jug, and whole mushrooms or tomatoes help learners identify objects. A completed cutting gesture replaces whole produce with the measured sample pieces.

The illustrated ingredient guide uses six selectable cards. Each includes its recipe quantity, a short role, a question to explore, an activity, and an observation from the current cook. Activities select the relevant 3D tool and camera or open the existing keyboard workspace. The guide follows serving changes, saved cooks, replay, text view, and graphics availability. Cards read canonical recipe state; physical gestures and keyboard controls record cooking actions through the shared engine.

## Verification

- 277 distinct recipe tests passed. The main run passed 269 tests in 24 files; its remaining replay worker timed out during startup. A focused rerun passed all 8 replay tests and all 9 ingredient tests. See `unit-results.json` and `focused-results.json`.
- `dev-tools/kitchen_recipe_ingredients_qa.cjs` passed seven browser checks: non-mutating exploration, tool/camera routing, expanded-view focus restoration, actual oil dragging, actual cuts for both recipes, recipe quantities and narrow layout, saved-water persistence, and live text-view switching.
- Four accessibility scans passed with no violations: desktop, 320px, text view, and forced colors. No browser page errors were recorded. See `results.json`.
- All 27 recipe runtime assets match the desktop copies; JavaScript syntax and scoped whitespace checks passed.
- Desktop, phone, pasta packet, and both produce screenshots were visually inspected.

Run the local preview with `KITCHEN_PREVIEW_PORT=53061 node dev-tools/kitchen_studio_preview.cjs`, then open `/stem_lab/kitchen_studio/recipe_lab.html` and choose **Meet the ingredients** beneath the 3D scene.

## Screenshots

- `ingredient-guide-desktop.png`
- `ingredient-guide-phone.png`
- `pasta-packet-3d.png`
- `mushroom-whole-produce-3d.png` / `mushroom-cut-produce-3d.png`
- `tomato-whole-produce-3d.png` / `tomato-cut-produce-3d.png`

The final sequential pasta-packet regression also passed: mouse and real touch pouring/returning, cancellation, the 800 g limit, recorded weight, keyboard input, replay and export, and graphics-loss fallback. Its three additional accessibility scans passed, for **7 scans with no violations** across both browser suites. See `weighing-regression/browser-results.json`.

On Windows PowerShell, set the preview port with `$env:KITCHEN_PREVIEW_PORT="53061"` before running `node dev-tools/kitchen_studio_preview.cjs`.
