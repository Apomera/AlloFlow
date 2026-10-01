# Weighing in the 3D kitchen

Refresh the recipe kitchen and choose **Lift & weigh dry pasta** in the 3D tool menu. Use a fresh cook if its pasta has already entered the pot.

Lift the packet at the back left over the scale. Pull down to tilt and pour, move back up to level it, and release to put it down. Falling pasta and the growing pile show the transfer. Drag a 10 g handful from the tray back to the packet to correct an overshoot, then use **Record portion** beside the scene.

The scene and illustrated workspace share the same draft, 800 g supply, flow calculation, and recording function. The scene displays the draft, packet remainder, recorded portion, and recipe target. Its keyboard control opens the existing accessible weighing workspace. Only recorded amounts enter the cook and affect the existing cooking model.

Switching tools, selecting a camera preset, resizing, pressing Escape, losing focus, cancelling touch, changing the amount elsewhere, or performing another cooking action stops an unfinished pour. Graphics loss retains completed pours in the illustrated workspace. Cooking and historical replay lock measurements. Replay and exported evidence retain the `scene-weigh` interaction.

## Verification

- **247 tests passed in 22 kitchen test files**, including eight new tests for scene geometry, input normalization, method parity, evidence, replay, and old saves. [Unit results](unit-results.json)
- Real mouse raycasts passed lift, tilt, leveling, return-handful, capacity, cancellation, recording, reload, cross-workspace synchronization, cooking locks, replay, and evidence export. [3D browser results](browser-results.json)
- Real touch poured and returned pasta. Touch cancellation and WebGL context loss stopped flow while preserving the draft for recording in the fallback workspace.
- The existing illustrated weighing browser suite also passed. [Illustrated regression results](illustrated-regression/browser-results.json)
- Both browser suites reported zero page errors and zero accessibility violations across desktop, 320 px, and forced-color checks.
- All **22 recipe runtime assets** match their desktop copies. Runtime syntax checks and scoped `git diff --check` passed. [Asset checks](asset-check.json)

Commands:

```text
npx vitest run tests/kitchen_recipe --pool=threads --maxWorkers=1 --testTimeout=30000
node dev-tools/kitchen_recipe_scene_weighing_qa.cjs
node dev-tools/kitchen_recipe_weighing_qa.cjs
```

## Screenshots

- [Pouring in the 3D kitchen](pouring-in-3d.png)
- [Scale and packet at rest](scale-ready-in-3d.png)
- [Scene controls](weighing-scene-controls.png)
- [Mobile scene controls](weighing-scene-mobile.png)
- [Exported weighing evidence](scene-weighing-evidence.json)
