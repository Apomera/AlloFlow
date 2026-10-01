# Kitchen Lab: moving cookware and stored heat

The sauce pan can be dragged from its burner onto a wooden trivet and returned to the burner. Moving it changes the heat reaching the pan while preserving the burner setting, food, and current temperature. The shared simulation clock controls gradual cooling and continued cooking from stored heat.

## Using the feature

Refresh `stem_lab/kitchen_studio/recipe_lab.html`. Select **Move pan off heat** above the 3D kitchen, then drag the actual pan body or handle onto the trivet at the right. Select **Use keyboard controls**, or expand **Move the pan off heat** below the burner dials, for a touch-friendly pan diagram and keyboard alternatives. Left and Right place the pan on the burner and trivet; an equivalent button is also available.

The burner remains visibly active when the pan is removed. Plating still requires turning both burners off. Food can continue browning, softening, losing moisture, or scorching as the pan cools. Moving the pan does not erase existing damage. Ingredient drops, stirring, pouring, and individual-piece manipulation follow its current location.

## Compatibility and cancellation

- Existing saves stay on the burner until the learner moves the pan. No placement field is injected into untouched old attempts, and their previous physics remain unchanged.
- Pan movements persist through reload and appear in evidence, the review timeline, and replay. Finished cooks and historical frames cannot be changed.
- Invalid drops, Escape, pointer cancellation, loss of focus, and graphics-context loss discard uncommitted movement. Text and keyboard controls remain available without WebGL.
- Source assets and the desktop public copies match across all ten kitchen runtime files; see `mirror-check.json`.

## Verification

- All 130 unit tests across 13 kitchen suites passed, including ten new thermal-placement tests. The initial run passed 105 tests but two workers timed out before starting; rerunning those two suites passed the remaining 25 tests without errors. See `unit-results.json` and `unit-retry-results.json`.
- New browser checks passed for actual 3D movement, relocated ingredient drops/pours/stirring/piece turning, residual cooling, invalid drops and Escape, graphics-context loss, save restoration, evidence export, and replay locking. Real touch transfer and cancellation also passed without WebGL. See `browser-results.json` and `heat-evidence.json`.
- Desktop, 320px, and forced-colors automated accessibility checks reported no violations. Screenshots were reviewed for the 3D trivet and narrow heat controls: `pan-on-trivet-3d.png`, `heat-controls-desktop.png`, and `heat-controls-mobile.png`.
- Existing 3D ingredient, cutting, stirring, pouring, and piece interaction regression checks passed, including desktop and 320px accessibility checks. See `scene-regression`.
- Both full recipe browser flows passed (mushroom for two and tomato for four), including hand-drawn cuts, spatial transfers, continuous pouring, circular mixing, restored evidence, locked replay, and touch interaction without WebGL. Desktop, 320px, and forced-colors accessibility checks reported no violations. See `recipe-regression`.
- JavaScript syntax checks and scoped `git diff --check` passed. Git only reported its existing line-ending normalization notices.

This is the lab's illustrative thermal model, not a calibrated predictor of real cooking temperature or time. Changes are limited to the kitchen module, its mirrored assets, targeted tests, QA scripts, and this report.
