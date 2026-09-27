# Kitchen Lab hands-on cooking enhancement

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.

Entry: **Kitchen Lab → Recipe Sim → Open the Recipe Kitchen**. Local preview: <http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html> while the preview server is running.

## Findings and changes

The Recipe Kitchen already modeled heat, moisture, crowding, pasta texture, and irreversible scorching. The main gap was interaction: selecting 3D cookware opened action buttons; board dragging only positioned the knife; the jug preview needed a confirmation button to transfer water.

- The pot, pan, and serving workspaces now expose a visual ingredient/tool shelf and cookware destinations. Dragging transfers ingredients, takes samples, saves water, drains pasta, combines the dish, or serves it. Incorrect destinations do not execute actions, and the engine still enforces preparation, boiling, sampling, and burner rules.
- A steady downward knife stroke through the representative sample makes a measured cut. Taps, short strokes, horizontal scrubbing, cancellation, and lost focus do not cut. Piece dimensions feed the existing cooking-rate model.
- Holding and tilting the jug transfers actual 10 mL doses. Greater tilt increases flow; returning upright, releasing, changing tools, losing focus, hiding the page, or starting another cook stops it. Already transferred water stays in the sauce. Empty-jug and first-action rescue cases are handled.
- Burner dials update the existing heat model and all other heat controls. Temperature changes gradually; direct manipulation does not bypass the model.
- Existing circular pan mixing remains available. Sauce assessment now requires newly added water to be mixed through. Both mixing alternatives invalidate an earlier final dish check after combining.
- Keyboard selection/destination controls, arrow-key burner adjustments, keyboard-held pouring, simplified actions, text view, reduced motion, and touch remain supported. Input method does not change assessment credit. Handling pauses the shared cooking clock, preserving deliberate pacing.
- Optional interaction metadata is retained in the action log, restored attempts, replay, and downloaded reports. Replay and completed cooks lock the new tools.

## File ownership and integration

Six source assets under `stem_lab/kitchen_studio/`:

- `recipe_lab.html`
- `recipe_lab.js`
- `recipe_lab_engine.js`
- `recipe_lab_hands.js` (new gesture geometry and flow helpers)
- `recipe_lab_hands_ui.js` (new workbench and direct controls)
- `recipe_lab_hands.css` (new styling)

Their exact counterparts under `desktop/web-app/public/stem_lab/kitchen_studio/` are synchronized. The existing `build.js` directory-copy entry for `stem_lab/kitchen_studio` covers the new assets; no shared build, manifest, catalog, host-module, or dependency change is required. No broad generator, deployment, push, or commit was performed.

Additional owned files: `tests/kitchen_recipe_hands.test.js`, `dev-tools/kitchen_recipe_hands_qa.cjs`, and this report directory. The temporary integration script was removed after applying its edits. Other contributors' working changes were preserved.

## Final validation

- **89 tests passed across 9 suites**, including engine, cuts, pouring, stirring, replay, rescue, clock, comparison, new gesture rules, and exact desktop mirror checks. See `unit-results.json`.
- **Final complete browser run passed**. Mushroom pasta for two completed with pointer transfers; tomato pasta for four completed with keyboard alternatives. Both used hand-drawn cuts, continuous pouring, circular mixing, restored evidence, and locked replay. See `browser-results.json`.
- Real touch dragging worked with the Three.js runtime blocked. Pointer cancellation and keyboard release/focus/new-cook interruption were checked.
- Axe reported **zero violations** for the desktop workbench, 320px text view, and forced colors, using WCAG 2 A/AA, WCAG 2.1 AA, and best-practice tags. These are automated checks, not a claim of exhaustive assistive-technology testing.
- No browser page errors. JavaScript syntax and focused diff whitespace checks passed.

The earlier mirror mismatch, native SVG drag cancellation, and first-dose rescue interruption were corrected before the final successful runs. `browser-edges-results.json` records the focused intermediate confirmation; `browser-results.json` is the final full run.

Screenshots: `workbench-desktop.png`, `workbench-mobile.png`, and `workbench-forced-colors.png`.

Reproduce with `node dev-tools/kitchen_recipe_hands_qa.cjs` after starting `dev-tools/kitchen_studio_preview.cjs` with `KITCHEN_PREVIEW_PORT=53061`. `KITCHEN_RECIPE_URL` can target a different preview port. The browser QA supports `--edges-only` for focused interruption, touch, and accessibility checks.
