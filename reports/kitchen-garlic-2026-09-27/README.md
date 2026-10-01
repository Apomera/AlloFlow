# Prepare individual garlic cloves

Garlic preparation now supports a knife gesture in the 3D kitchen and an illustrated tool. Each peeled clove progresses from whole to sliced, chopped, and minced. A pass requires pulling the knife down through the clove, lifting it back to its starting point, and releasing. Taps, partial passes, sideways movement, early reversal, and cancellation leave preparation unchanged.

Two servings provide two cloves; four servings provide four. Wash hands first, then finish every clove before carrying the minced garlic to the sauce pan. The batch appears in its existing bowl when ready. Completed passes persist across reloads, appear in replay, and are included in the downloaded recipe evidence. The simplified preparation control can still complete the batch with the same cooking effect. No cooking coefficients or old recipe logs change.

## Try it

Refresh the kitchen preview and wash hands in Prep. Select **Mince individual garlic cloves** in the 3D tool menu. The camera frames the garlic board. Start on a clove, pull straight down, lift back, then release. Repeat until the cloves are minced. Select **Move ingredients** and carry the bowl into the oiled sauce pan when ready.

For the illustrated tool, open **Prep board → Mince garlic with the knife**. Select a clove and drag the knife down and back. With the knife focused, Left/Right selects a clove and Enter/Space performs one pass. An equivalent button is also available. The scene's **Use keyboard controls** button opens this tool and focuses the knife.

Handling pauses the cooking clock. The three preparation stages are illustrative, not an assessment of physical knife skill. The cloves are provided peeled; peeling is not modeled.

## Verification

- [209 tests passed across 19 kitchen files](unit-results.json), including 14 new tests for full knife motion, invalid gestures, handwashing, individual stages, portion scaling, finite progress, partial restoration, simplified-control equivalence, old saves, complete recipes, evidence, and replay.
- [Browser interaction and accessibility results](browser-results.json) cover actual 3D cuts, all four clove targets, ingredient transfer, keyboard selection and key-repeat protection, illustrated pointer input, interruption, reload, locked replay, downloaded evidence, real touch, graphics-context loss, and illustrated touch without WebGL.
- [Complete recipe regressions](recipe-regression/browser-results.json) cover mushroom/two and tomato/four preparation, transfers, pouring, mixing, restoration, and replay.
- [Existing 3D tool regressions](scene-regression/browser-results.json) cover ingredient transfer, seven produce cuts, circular stirring, individual food handling, pouring, and camera controls.
- Desktop, 320px, and forced-color views are checked with axe. Narrow layouts are checked for horizontal overflow, and browser errors are recorded in the results.
- [Runtime parity and syntax](mirror-check.json) checks all 20 recipe assets against their desktop copies, all recipe JavaScript syntax, and scoped whitespace.

## Visual review

- [Knife cutting a clove](knife-through-garlic.png)
- [All four clove targets](four-cloves-on-board.png)
- [Minced batch ready to carry](minced-garlic-ready.png)
- [Illustrated preparation](garlic-preparation-desktop.png)
- [Narrow-screen preparation](garlic-preparation-mobile.png)

The close-up hides other station labels so they do not obscure the knife. Changes are local and mirrored into the desktop public assets; they have not been committed or deployed.
