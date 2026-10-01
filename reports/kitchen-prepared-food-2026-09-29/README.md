# Prepared food detail — September 29, 2026

Prepared ingredients now keep recognizable cut shapes in the pan and on the plates. Mushroom slices have a cap, stem, gills, and a visible cut face. Tomato pieces have skin, flesh, seed chambers, and seeds. Actual masher actions change a softened wedge into two separated pieces and then a flattened, irregular piece of pulp.

The new `recipe_lab_food.js` renderer uses the existing piece widths, visible face colors, crushing stages, and portion assignments. Turning a mushroom reveals its recorded opposite face. Serving preserves each represented piece's appearance. Whole ingredients on the prep board retain their existing visuals.

This is a presentation change: it does not add recipe actions or modify time, heat, moisture, juice, portions, replay, or evidence. The original forgiving pointer targets remain in place; decorative geometry does not intercept them. Shapes and canvas textures are cached locally, and runtime files are mirrored into the desktop web app.

## Verification

- `food-results.json`: actual 3D masher gestures reject firm tomatoes, split and crush the selected softened piece, release only its finite juice, preserve time and saved water, and survive reload. A real mushroom turn reveals the recorded browned face. No browser errors.
- `visual-regression/visual-results.json`: both recipe presentations, real food-piece turns, plated food, compact expanded view, unchanged state while viewing, and graphics-loss fallback passed.
- `crushing-regression/browser-results.json`: mouse, touch, keyboard, partial/cancelled gestures, wide pan on the trivet, scorch persistence, reload, replay, export, legacy cooks, and graphics-loss fallback passed.
- Three automated axe scans found no violations in the tested rules: desktop, 320px layout, and forced colors.
- JavaScript syntax, all 30 runtime asset mirrors, and scoped `git diff --check` passed.
- Close-ups of cut food, split and crushed tomatoes, and plated dishes were visually inspected.

## Reproduction

Run `node dev-tools/kitchen_recipe_food_qa.cjs` against the preview server. Existing regression scripts are `dev-tools/kitchen_recipe_visual_details_qa.cjs` and `dev-tools/kitchen_recipe_crushing_qa.cjs`; set `KITCHEN_QA_OUT` to a new report directory when rerunning those. `KITCHEN_RECIPE_URL` can override the default local preview URL.

All changes were left uncommitted, as requested.
