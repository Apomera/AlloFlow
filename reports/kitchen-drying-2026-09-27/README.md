# Kitchen Lab: gradual drying with an absorbent cloth

Produce preparation now has a spatial moisture model. Hold the cloth over one of eight wet areas to absorb water. The cloth holds eight moisture marks and then stops absorbing; hold it over the bowl to wring it out. Releasing, cancelling, or moving away stops contact, while completed blotting stays recorded.

The same interaction works with the actual cloth and wet sample in the 3D kitchen, an illustrated preparation board, held keyboard input, and measured keyboard alternatives. The board uses the existing preparation tabs so it does not add another permanently expanded panel.

## Find the feature

Refresh the Kitchen Lab and **start a fresh cook**. Wash hands and rinse the produce, then select **Blot produce with cloth** above the 3D kitchen. Drag the cloth at the right onto wet areas of the board and hold. The small bowl at the back right is the wringing target.

Alternatively, select **Prep board → Dry produce**. With the illustrated cloth focused, arrow keys choose an area, Space holds contact, and W selects the wringing bowl. The selected-area and wringing buttons provide equivalent effects. The 3D toolbar's keyboard-controls button opens this board directly.

## Cooking consequences and compatibility

- Wet areas transfer individual moisture marks into the cloth. Capacity is bounded, wringing empties the cloth without rewetting produce, and brief clicks or fast crossings do not complete contact.
- Partial drying changes surface moisture entering the pan. Under matching heat, drier mushrooms reach browning sooner. Blotted tomatoes retain their internal juices while carrying less surface water.
- The illustrative model starts with 30 mL of surface water per two-serving batch. Full drying leaves the existing 35 mL mushroom moisture base or a 220 mL tomato base. Four servings scale the water amounts, with the same representative eight-area task.
- Fully blotted and simplified-dry preparation have identical cooking effects in new cooks. New `dryingModel: 1` state distinguishes this behavior from older attempts.
- Existing saves restore with their original drying physics, including the old tomato moisture amount. A genuine pre-change completed tomato cook is retained in `tests/fixtures/kitchen_recipe_pre_drying.json` and reconstructs exactly for preparation, pot, pan, clock, and action history. Older cooks explain that a fresh cook enables gradual drying.
- Evidence, review, saved state, and replay preserve wet areas and cloth loading. Historical or finished work is locked.
- Also corrected the reserve buttons and empty-cup shelf item: a partial ladle now leaves topping up the remaining allowance available.

## Verification

- **157 tests passed across 15 kitchen test files**, including 15 new drying tests (`unit-results.json`). Both cloth-prepared recipe variants complete and reconstruct through save and replay.
- Real browser mouse, keyboard, and CDP touch tests passed for cloth contact, saturation, wringing, release and Escape, partial-state restoration, graphics-context loss, switching tools, restarting a cook, legacy behavior, replay, evidence export, and partial-reserve control availability (`browser-results.json`, `drying-evidence.json`).
- Both full browser recipes passed (mushroom for two and tomato for four), including evidence restoration and locked replay (`recipe-regression`). Existing 3D transfers, seven cutting strokes, circular stirring, individual-piece actions, and continuous pouring also passed (`scene-regression`).
- Desktop, 320px, and forced-colors automated accessibility checks reported no violations. Touch contact and wringing also passed without WebGL.
- Reviewed screenshots: `cloth-in-kitchen.png`, `saturated-cloth.png`, `drying-desktop.png`, and `drying-mobile.png`.
- A final focused browser check confirmed that selecting another area preserves the saturated-cloth message and that wringing restores the ready message and blot control (`final-feedback-results.json`).
- All twelve browser/desktop kitchen runtime pairs match (`mirror-check.json`). JavaScript syntax and scoped whitespace checks passed; Git only reported line-ending normalization notices.

Changes are limited to the kitchen module and mirrored assets, targeted tests and QA, compatibility fixture, and this report. Contact time is bounded per animation frame, and hidden or cancelled interactions cannot accumulate unattended work. Cooking time remains paused during handling, consistent with the other direct tools.
