# Kitchen Lab: direct 3D cooking and individual food behavior

Preview: <http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html>. Refresh the page and start a fresh cook to use the individual-piece model.

## What changed

- Move actual ingredients in the 3D scene into their cookware, cut on the board with downward strokes, stir with a circular gesture, and hold the saved-water jug above the pan to pour. Existing recipe prerequisites still apply.
- Each representative food piece tracks both faces, softness, position, and irreversible scorching. Center heat, contact, and crowding affect cooking. Turn pieces to expose their other face, move them around the pan, or spread them out; stirring also repositions and turns food.
- Inspect individual pieces through a keyboard-accessible panel with equivalent turning and positioning actions. Direct controls support touch, while text view remains usable without WebGL.
- Releasing, canceling, losing focus, or losing the graphics context stops continuous pouring. Completed doses remain in the dish. Replay and completed cooks cannot be changed by the new tools.
- New actions and per-piece evidence survive saving, restoring, replay, and report export. Older saved attempts retain their original whole-pan model and outcomes; starting a fresh cook enables individual pieces.

## Integration

The seven source assets under `stem_lab/kitchen_studio/` and their exact desktop mirrors under `desktop/web-app/public/stem_lab/kitchen_studio/` are synchronized:

- `recipe_lab.html`
- `recipe_lab.js`
- `recipe_lab_engine.js`
- `recipe_lab_hands.js`
- `recipe_lab_hands_ui.js`
- `recipe_lab_hands.css`
- `recipe_lab_scene.js` (new 3D interaction and piece-inspection runtime)

New checks: `tests/kitchen_recipe_spatial.test.js`, `dev-tools/kitchen_recipe_scene_qa.cjs`, and `dev-tools/kitchen_recipe_scene_edges_qa.cjs`. The original hands-on browser script now accepts `KITCHEN_QA_OUT` so subsequent regression runs can preserve earlier reports. The existing build directory-copy rule includes the new runtime. No shared manifest, dependency, host-module, deployment, commit, or push was needed.

## Final verification

- **100 tests passed across 10 suites.** Coverage includes individual faces, heat distribution, crowding, stirring, immutable damage, invalid movements, taste invalidation, restore/replay/export, legacy saved attempts, time-step-independent redistribution, and synchronized desktop assets. See `unit-results.json`.
- **Direct 3D browser checks passed**, including ingredient prerequisites, measured cuts, circular stirring, piece turning and movement, continuous pouring, and camera isolation. No page errors or automated axe violations on desktop or at 320px. See `browser-results.json`.
- **Interruption and touch checks passed**: first-action rescue pouring, Escape, completed rescue replay, actual WebGL context loss during pouring, touch transfer, and touch cancellation. See `browser-edges-results.json`.
- **Original full-recipe browser regression passed** for mushroom pasta for two and tomato pasta for four, including cuts, spatial transfers, pouring, mixing, restored evidence, and locked replay. Touch without WebGL, narrow layouts, reduced motion, and forced colors also passed. No page errors or automated axe violations. See `recipe-regression/browser-results.json`.
- All four recipe fixtures (both recipes at two and four servings) satisfied all five assessment criteria.

Automated accessibility checks do not substitute for exhaustive assistive-technology testing. Screenshots: `direct-pan-desktop.png`, `piece-controls-mobile.png`, and `direct-scene-touch.png`.

## Reproduction

With the local preview server running, execute:

```powershell
node dev-tools/kitchen_recipe_scene_qa.cjs
node dev-tools/kitchen_recipe_scene_edges_qa.cjs
$env:KITCHEN_QA_OUT='reports/kitchen-spatial-2026-09-26/recipe-regression'
node dev-tools/kitchen_recipe_hands_qa.cjs
```

The browser scripts accept `KITCHEN_RECIPE_URL` for another preview URL. Unit validation uses the ten `tests/kitchen_recipe_*.test.js` suites through Vitest with `--maxWorkers=1`.
