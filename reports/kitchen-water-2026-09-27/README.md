# Kitchen Lab: ladling and controlled draining

Learners can dip a ladle into the cooking pot, carry it to the jug, and release to save up to 50 mL at a time. The actual 3D ladle and the illustrated pot station share the same conservation rules. Carrying directly to the jug without dipping, or cancelling an unfinished carry, transfers nothing.

The pot station also supports gradual draining. Drag the pot handle down and hold; a larger tilt drains faster, and releasing stops the flow. Water already drained remains removed. The jug stays separate, and pasta appears in the colander once the pot is emptied. Cooking time pauses during handling, consistent with the lab's other direct tools.

## Find the tools

Refresh `stem_lab/kitchen_studio/recipe_lab.html` and select **Ladle cooking water** above the 3D kitchen. For the illustrated ladle and draining pot, select **Pasta pot** and expand **Save water & drain pasta**. The 3D toolbar's **Use keyboard controls** opens that station directly.

Keyboard users can dip and empty the ladle in two steps, hold Space on the pot to drain, or use the measured **Drain 100 mL** alternative. Existing simplified reserve and drain controls remain available. Reserving after partial ladling fills only the remaining recipe allowance.

## Model and compatibility

- Saved water plus water already used in the sauce cannot exceed the scaled recipe allowance. A nearly empty pot cannot create a full ladle of water.
- Pasta must be sampled before draining. Partial drainage leaves the pasta in the pot; combining requires completed drainage. Burner settings stay independent.
- New actions record exact transferred amounts and interaction methods. Evidence, the review timeline, saved cooks, and replay retain them.
- Untouched older saves retain their pot state and action history. The genuine legacy fixture still reconstructs exactly.
- Release, Escape, touch cancellation, closing the station, loss of focus, and starting a fresh cook stop active handling. Unfinished carries are discarded; completed drainage persists. Replay and finished cooks are locked.
- Removed a duplicate heat-runtime script inclusion discovered while integrating the new runtime.

## Verification

- **142 tests passed across 14 kitchen test files**, including 12 new water-handling tests (`unit-results.json`). The 12 water tests passed again after final visual and hit-area refinements (`final-water-tests.json`).
- Actual browser mouse, keyboard, and CDP touch input verified 3D and illustrated carries, prerequisite enforcement, recipe limits, partial drainage, release/cancellation, restart isolation, colander visuals, reload, locked replay, and exported evidence (`browser-results.json`, `water-evidence.json`).
- Both complete recipe flows passed: mushroom for two and tomato for four (`recipe-regression`).
- Existing 3D transfers, seven cutting strokes, circular stirring, individual-piece movement/turning, and continuous pouring passed (`scene-regression`).
- Desktop, 320px, forced-colors, and no-WebGL interaction checks passed; automated accessibility checks reported no violations. Reviewed screenshots: `ladle-3d.png`, `water-tools-desktop.png`, `water-tools-mobile.png`, and `drained-colander.png`.
- All eleven browser/desktop kitchen runtime pairs match (`mirror-check.json`). JavaScript syntax and scoped whitespace checks passed, with only Git's line-ending normalization notices.

The initial browser check caught a pot-handle hit-area gap. Both illustrated utensils now have larger invisible grab areas, and the final gesture checks passed. The simulation remains an illustrative teaching model, not calibrated real-world cooking guidance.
