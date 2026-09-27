# Kitchen Lab: hands-on food inspection

Preview: <http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html>. Refresh the page. In **Pasta pot**, use **Check a pasta sample** below the workbench. In **Sauce pan** or **Serving plate**, choose **Check doneness** beside the mixing and saved-water tools.

## Behavior

- Pull the fork down through a pasta sample, then release to inspect its center and resistance. The core and deformation reflect the cooking model: hard, firm, slight bite, soft, or overcooked. Taps and incomplete strokes do not record a sample.
- Draw the spoon from left to right through combined pasta and sauce. A dry track stays open; watery sauce closes it quickly; coating sauce closes it gradually. The spoon retains a visible thin layer, continuous coating, dry patches, or scorch marks. Unmixed saved water is identified before judging coating.
- Food checks pause the kitchen and record dated observations. Earlier observations remain snapshots, with a notice when the food has changed and a comparison with the preceding check. The station does not silently update an old sample into a fresh result.
- Keyboard buttons call the same guarded sample and sauce-check actions. Touch, text view without WebGL, reduced motion, and forced colors remain supported. Escape, cancellation, lost focus, changing workspaces, and starting a fresh cook cancel unfinished checks.
- Inspection snapshots are reconstructed from accepted actions when restoring saved work. Downloads include the observations, and replay displays only checks recorded up to the selected action. Completed dishes and replay cannot be modified.

The visual response is an illustrative teaching model, consistent with the existing simulation. It is not calibrated physical food behavior or a measure of the learner's motor skills.

## Integration

New source assets: `stem_lab/kitchen_studio/recipe_lab_inspection.js` and `recipe_lab_inspection.css`. Updated: `recipe_lab.html`, `recipe_lab.js`, and `recipe_lab_engine.js`. All five have exact desktop counterparts under `desktop/web-app/public/stem_lab/kitchen_studio/`; all nine kitchen assets from this enhancement series have matching hashes. The existing directory-copy build rule includes the new files.

New checks: `tests/kitchen_recipe_inspection.test.js` and `dev-tools/kitchen_recipe_inspection_qa.cjs`. The existing `dev-tools/kitchen_recipe_hands_qa.cjs` now pours more slowly and verifies conserved water and stopped flow, allowing for the browser automation's input latency during continuous pouring.

No dependency, shared manifest, host-module, commit, push, or deployment change was needed.

## Verification artifacts

Final result: **111 tests passed across eleven suites**, both browser scripts passed, and JavaScript syntax and focused whitespace checks passed.

- `unit-results.json`: recipe model, inspection snapshots, gesture geometry, restoration, replay, and desktop mirror checks across eleven suites.
- `browser-results.json`: real mouse and touch gestures, keyboard equivalents, cancellation, changing food, rescue completion, export, replay, reduced motion, and layout checks. Zero page errors and zero automated axe violations on desktop, at 320px, and in forced colors.
- `recipe-regression/browser-results.json`: full-recipe workbench regression for mushroom pasta for two and tomato pasta for four, plus interruption and accessibility checks.
- `inspection-evidence.json`: an exported rescue with dry, unmixed, and coating observations.
- Screenshots: `pasta-inspection-desktop.png`, `sauce-inspection-desktop.png`, `sauce-inspection-mobile.png`, and `pasta-inspection-touch.png`.

Automated accessibility checks do not replace exhaustive assistive-technology testing.

Run the focused browser checks with `node dev-tools/kitchen_recipe_inspection_qa.cjs` while the preview is running. Set `KITCHEN_RECIPE_URL` to use a different preview address. Full-recipe regression uses `node dev-tools/kitchen_recipe_hands_qa.cjs`; set `KITCHEN_QA_OUT` to preserve earlier reports.
