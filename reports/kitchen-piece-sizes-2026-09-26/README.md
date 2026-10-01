# Kitchen Lab: preparation affects individual pieces

Preview: <http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html>. Refresh and start a fresh cook for the new size-dependent model. Make cuts on the preparation board, add the produce, and open **Sauce pan → Each piece tells a story**.

## Changes

- Representative pieces retain their recorded preparation widths. Under matching heat and contact, smaller pieces brown and soften faster than larger ones. A thin contacting surface can scorch while larger pieces remain less cooked. Moving, turning, or mixing preserves each piece's width and accumulated cooking history.
- A draggable pan map shows each piece's relative size, exposed color, and position. Drag to move; tap to turn. The warmer center is marked, and numbered pieces correspond to the inspection selector. The same state drives the 3D food, text observations, export, and replay.
- Keyboard users can focus pieces and use arrow keys to move or Enter/Space to turn. Existing selector and movement controls remain available. Handling a piece pauses the shared clock.
- Out-of-pan releases, Escape, pointer cancellation, lost focus, workspace changes, and new cooks discard uncommitted movement. Replay and finished dishes remain locked.
- Earlier saved attempts retain their original cooking rates. The new `pieceModel` version is only enabled for fresh cooks; old spatial and whole-pan models remain reconstructable. The interface explains when a saved cook uses the earlier model.
- Preparation feedback now describes actual consistent or varied widths instead of always claiming cuts are even. Inspection choices include each piece's width, and the board explains how sizes affect cooking.

This is an illustrative teaching model, not calibrated kitchen physics. Fourteen representative pieces show preparation and positioning effects; they are not a literal count of every ingredient in the recipe.

## Owned files

Updated source assets under `stem_lab/kitchen_studio/`: `recipe_lab.html`, `recipe_lab.js`, `recipe_lab_engine.js`, `recipe_lab_scene.js`, and `recipe_lab_hands.css`. Their desktop mirrors under `desktop/web-app/public/stem_lab/kitchen_studio/` are synchronized. No dependency or shared build/manifest change was needed.

New validation files: `tests/kitchen_recipe_piece_sizes.test.js`, `tests/fixtures/kitchen_recipe_legacy_sizes.json`, and `dev-tools/kitchen_recipe_pan_map_qa.cjs`. The legacy fixture was captured from the actual engine before changing the size model. The existing 3D browser script now accepts `KITCHEN_QA_OUT` to preserve prior reports.

No commit, push, or deployment was performed. Other workspace changes were preserved.

## Validation artifacts

Final verification: **all three browser runs passed**, with no page errors or automated accessibility violations. All nine source/desktop asset pairs match; JavaScript syntax and focused whitespace checks passed.

- `unit-results.json`: **120 tests passed across twelve suites**. Tests cover different cooking rates at matching positions, persistent scorching and widths, time-step independence, exact preservation of a pre-change saved cook, restored rescues, exports, and replay.
- `browser-results.json`: pan-map pointer, keyboard, real touch, cancellation, clock pausing, saved work, replay locking, and legacy behavior. No browser page errors or automated axe violations on desktop, at 320px, or in forced colors.
- `recipe-regression/browser-results.json`: full-recipe workbench checks for mushroom pasta for two and tomato pasta for four, including pouring, mixing, inspection, evidence restoration, and replay.
- `scene-regression/browser-results.json`: existing direct 3D ingredient transfer, cutting, stirring, pouring, piece movement/turning, and keyboard equivalents.
- `pan-map-desktop.png` and `pan-map-mobile.png`: visually inspected pan-map captures.

All four model fixtures (both recipes at two and four servings) satisfied all five recipe criteria with no corrections. Automated accessibility checks are not exhaustive assistive-technology testing.

Run the focused browser test with `node dev-tools/kitchen_recipe_pan_map_qa.cjs` while the preview is running. `KITCHEN_RECIPE_URL` can target another preview URL. For existing recipe and 3D scripts, set `KITCHEN_QA_OUT` to keep earlier reports intact.
