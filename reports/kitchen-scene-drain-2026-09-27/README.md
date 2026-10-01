# Lift, drain, and carry pasta in the kitchen

The 3D kitchen now has a draining basin and colander. Select **Lift & drain the pasta pot**, drag the actual pot over the colander, then move downward to tilt it. The pot lifts away from its burner; its contents and handles travel with it. Once positioned over the colander, greater tilt produces faster flow. Raising the pointer levels the pot and stops the flow. Releasing, pressing Escape, losing focus, or losing graphics support stops handling without restoring water that already went down the drain.

A pasta sample is required before draining. Water is conserved in the recipe model: draining removes only water still in the pot, while any water saved in the jug remains available for the sauce. The cooking clock pauses during handling. The burner setting stays unchanged, and the scene reports when the empty pot's burner is still on.

When drainage finishes, pasta appears in the colander. Select **Move ingredients** and drag the colander to the sauce pan to combine the dish. The illustrated **Pasta pot → Save water & drain pasta** controls remain available; the scene's keyboard route opens them and focuses the hold-to-drain pot. Mouse, touch, keyboard, and equivalent discrete controls use the same cooking effects.

This pass also added [individual tomato pressing](../kitchen-crushing-2026-09-27/README.md): softened pieces split and then crush, releasing a finite amount of juice that needs folding into the sauce. Start a fresh tomato cook to use that model. Existing saved cooks retain their original physics.

## Try it

Refresh the kitchen preview. Cook pasta, check a sample, and save some cooking water. Use **Lift & drain the pasta pot** to move the pot to the front-left colander, then draw downward and hold. Raise the pointer or release to pause drainage. Once the pot is empty, carry the colander to the sauce pan with **Move ingredients**.

## Verification

- [195 tests passed across 18 kitchen test files](unit-results.json), including flow-rate bounds, finite water transfers, fractional remnants, state restoration, completed recipe criteria, replay, and equivalent interaction routes.
- [Direct-drain browser checks passed](browser-results.json): positioning, tilt and leveling, sample prerequisites, partial drainage and reload, Escape, full drainage, colander transfer, graphics loss, keyboard focus and held Space, real touch and cancellation, locked replay, and exported evidence.
- [Complete recipe regression checks passed](recipe-regression/browser-results.json) for mushroom/two and tomato/four, including preparation, transfers, pouring, mixing, restoration, and replay.
- [Existing 3D tools passed regression checks](scene-regression/browser-results.json), including cutting, individual food handling, circular stirring, water pouring, and camera controls.
- Tested desktop, 320px illustrated, and forced-color views had no automated accessibility violations. Browser checks recorded no page errors, and the narrow layout had no horizontal overflow.
- [All 19 recipe assets match their desktop copies](mirror-check.json). JavaScript syntax and scoped whitespace checks passed.
- [Lifted-pot visual check](visual-check.json) confirmed that an upright pot held over the colander retains its water. The screenshot is captured before tilting so rendering latency does not affect the drainage test.

## Visual review

- [Pot lifted over the colander](pot-lifted-over-colander.png)
- [Drained pasta in the colander](pasta-in-colander.png)
- [Pasta carried into the sauce](colander-pasta-in-sauce.png)
- [Narrow-screen water handling](water-handling-mobile.png)

Changes are local and mirrored into the desktop public assets; they have not been committed or deployed. The simulation uses illustrative cooking behavior rather than a physical skills assessment.
