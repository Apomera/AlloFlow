# Scoop, share, and serve

The kitchen now supports individual serving plates and a finite batch of pasta. Use a spoon to carry food from the pan onto a plate. Drag from a plate back into the pan to adjust a portion, then serve it elsewhere. Each modeled serving contains four representative spoonfuls, giving eight for two people or sixteen for four.

Food visibly decreases in the pan as the plates fill. Once the pan is empty, its food steam and mixing spoon disappear. Each plate displays its count. The serving camera frames the pan and plates, and the 3D toolbar provides **Finish serving & review** once the batch has been transferred.

## Try it

Refresh the kitchen preview, combine and check the finished dish, then turn both burners off. Choose **Serve onto individual plates** in the 3D tool menu. Drag from the pan to a plate and release to carry one spoonful. Aim for four per plate; return extras to the pan to rebalance. When all food is served, finish and review the dish.

The illustrated version is under **Serving plate → Scoop, share & serve**. Drag between its pan and plates, or choose a plate and use the serving and return buttons. With the pan focused, Enter/Space serves to the selected plate. With a plate focused, Enter/Space returns a spoonful. The scene's **Use keyboard controls** button opens the illustrated tool and focuses its pan.

## Simulation behavior

- A checked, combined dish and both burners off are required before serving.
- Transfers conserve the batch. Empty pans and empty plates cannot supply extra food.
- Partial portions survive reload. Wrong drops, taps, Escape, interrupted gestures, and cancelled touch do not transfer food.
- Cooking time pauses while food is on the plates. Return every spoonful to the pan to resume cooking. Advancing time then invalidates the old dish check as before.
- A partly served dish cannot be finalized until the pan is empty. Unequal portions can still be finished and reviewed; ordinary recipe reviews flag them under the portion criterion. Prepared rescue challenges retain their original sauce-focused criteria.
- The original simplified plating route remains available before any food is placed on individual plates. Old cooks retain their exact cooking state and action logs.
- The spoonfuls represent quarters of a serving; they are not calibrated food masses or volumes. The dish's cooking state stays fixed during serving.

## Verification

- [224 kitchen tests across 20 files](unit-results.json), including 15 new tests covering destinations, finite transfers, prerequisites, cooking guards, returning all food, restoration, partial and uneven portions, rebalancing, complete recipes, replay, rescue dishes, and old saves.
- [Serving browser checks](browser-results.json) cover actual 3D carries, wrong drops, empty cookware, cancellation, reload, balancing, the 3D finish action, all four plates, serving from the trivet, illustrated controls, keyboard input, locked replay, evidence download, real touch, and graphics loss during a carry.
- [Complete recipe regressions](recipe-regression/browser-results.json) cover mushroom/two and tomato/four preparation, transfers, pouring, mixing, restoration, and replay.
- [Existing 3D tool regressions](scene-regression/browser-results.json) cover ingredient transfer, produce cutting, individual food handling, stirring, pouring, and camera controls.
- Desktop, 320px, and forced-color views are checked for accessibility violations; narrow layouts are checked for horizontal overflow, and browser errors are recorded.
- [All 21 recipe assets and desktop copies](mirror-check.json) are checked for byte parity. JavaScript syntax and scoped whitespace checks are recorded there.

The final full suite passed using `npx vitest run tests/kitchen_recipe --pool=threads --maxWorkers=1 --testTimeout=30000`. An earlier process-worker run hit two worker startup timeouts; its [diagnostic report](unit-worker-timeout-results.json) is retained separately. The [final visual check](final-visual-check.json) verifies the updated portion views and serving-location display without browser errors.

## Visual review

- [Carrying a spoonful](spoon-carry-in-kitchen.png)
- [Unequal portions](uneven-serving-portions.png)
- [Rebalanced portions](balanced-serving-portions.png)
- [Four plates with the pan on the trivet](four-plates-pan-on-trivet.png)
- [Illustrated serving controls](serving-controls-desktop.png)
- [Narrow-screen serving controls](serving-controls-mobile.png)

Changes are local and mirrored into the desktop public assets. They have not been committed or deployed.
