# Press tomatoes into the sauce

Fresh tomato cooks now support a masher in the 3D kitchen and an illustrated pressing tool. Start on an individual piece, draw a straight downward press, and release. Firm pieces resist; softened pieces split, then become crushed pulp with a second press. Prepared widths continue to affect softening, so uneven cuts can yield at different times.

Each representative piece holds a finite supply of retained juice. Pressing transfers that juice into the sauce without changing the saved-water jug or the amount of pasta water added. Repeatedly pressing a fully crushed piece does nothing. Released juice needs folding through; pressing after a final dish check invalidates that check. Spoon observations record the chosen texture, and crushed pulp changes the modeled coating trail. A sauce with excess liquid still needs reduction. Scorch damage remains visible and cannot be undone by crushing.

Crushing is optional: a chunky sauce can meet the same recipe criteria. Handling pauses simulation time, and these illustrative gestures do not assess physical utensil skill.

## Try it

Refresh the kitchen, choose **Tomato & garlic pasta**, and start a fresh cook. Prepare the tomatoes, add them to the pan, and let them soften. Select **Press softened tomatoes** in the 3D tool menu, or open **Sauce pan → Press tomatoes into the sauce** below the scene. Keep some chunks or press more pieces for a finer texture; fold released juice through before checking the sauce.

The illustrated masher supports mouse, touch, keyboard arrow selection, Enter/Space, and an equivalent button. Partial, sideways, cancelled, or interrupted presses leave the selected piece unchanged. Completed texture changes survive reload and appear in locked replay and exported evidence. Older saved cooks retain their original tomato physics.

## Verification

- [188 tests passed across 17 kitchen files](unit-results.json), including 15 new tests for gesture geometry, resistance, finite juice conservation, portion scaling, unequal cuts, persistent damage, mixing, samples, old saves, completed recipes, and replay.
- [26 affected tests passed again after visual refinements](final-visual-unit-results.json).
- [Masher browser checks passed](browser-results.json): actual 3D and illustrated presses, keyboard and real touch input, cancellation, finite transfers, reload, spoon observations, wide pan on the trivet, visible scorch persistence, graphics-context loss, old saves, replay, and evidence download.
- [Keyboard announcement check](keyboard-announcement-results.json) verifies that arrow navigation updates the focused masher's accessible name and live selection status, and Space acts on that piece.
- [Complete recipe regressions](recipe-regression/browser-results.json) passed for mushroom/two and tomato/four, including cutting, ingredient transfers, pouring, mixing, and replay.
- [Other 3D tools](scene-regression/browser-results.json) passed their regression checks.
- Desktop, 320px, and forced-color accessibility scans reported no violations in the tested views. Browser checks reported no page errors. Narrow layouts had no horizontal overflow.
- [All 19 recipe assets match their desktop copies](mirror-check.json). Changed JavaScript passes syntax checks; scoped whitespace checks pass.

## Visual review

- [Masher in the 3D kitchen](masher-in-kitchen.png)
- [Individual tomato pressing](tomato-press-desktop.png)
- [Narrow-screen tool](tomato-press-mobile.png)
- [Spoon coating after folding](crushed-tomato-coating.png)
- [Touch without WebGL](tomato-touch-no-webgl.png)

The changes are local and mirrored into the desktop public assets. They have not been committed or deployed.
