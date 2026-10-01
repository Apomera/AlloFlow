# Kitchen cooking surfaces — September 29, 2026

This pass connects the kitchen's visual detail to the recorded cooking state. It adds soft, rising vapor, water-surface ripples and bubbles, a waterline, gradually cloudy pasta water, oil glints, visible unmixed liquid, and sauce-dependent food gloss. Short surface observations accompany the existing pot and pan readings, including in text view.

`recipe_lab_cooking.js` reads the engine's temperature, moisture, pasta progress, mixing history, and portion counts. It never changes recipe state or creates cooking evidence. Burner-off cues follow retained temperature. Empty vessels and fully served pans lose their liquid effects; mixing alone cannot remove excess water or reverse scorching.

The animation runs only with the live kitchen clock and visible 3D mode, and stops on pause, reduced motion, hidden documents, replay, graphics loss, and disposal. Static cues remain available while motion is stopped. Decorative meshes do not intercept utensil and food hit targets. Runtime assets are mirrored into the desktop web app.

## Verification

- 17 focused unit tests passed: eight cooking-state transition tests and nine existing ingredient-guide tests. See `unit-results.json`.
- The real-browser cooking check passed for both recipes: actual circular stirring, preserved moisture, retained burner-off heat, cold-to-boiling water, pasta cloudiness, animation Run/Pause, reduced motion, phone-width text view, and graphics-loss fallback. See `cooking-results.json`.
- Two axe scans reported no violations for the tested WCAG A/AA and best-practice rules: sauce observations and the 320px text view.
- The existing visual-detail browser regression passed: real food-piece turns for both recipes, raw/cooked/plated presentations, compact expanded view, graphics loss, and unchanged evidence while viewing. See `visual-regression/visual-results.json`.
- JavaScript syntax, all 29 runtime asset mirrors, and scoped `git diff --check` passed.
- Close-up water, sauce, plated food, and narrow-screen screenshots were visually inspected. This is a stylized teaching representation of the existing model, not additional fluid or heat physics.

## Captures

- `clear-cold-water.png`, `boiling-water-and-vapor.png`, `cloudy-pasta-water.png`
- `dry-before-folding.png`, `dry-after-folding.png`
- `watery-before-folding.png`, `watery-after-folding.png`
- `compact-surface-notes.png`
- `visual-regression/` contains both complete recipe presentations.

Run with `node dev-tools/kitchen_recipe_cooking_qa.cjs`. The default preview URL is `http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html`; override it with `KITCHEN_RECIPE_URL` if needed.
