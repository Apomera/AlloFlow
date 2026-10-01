# Direct kitchen movement guidance

The kitchen now shows a compact guide inside the scene while a tool is in use. Its instruction follows the actual movement: carry, position, tilt, level, lift, release, or retry. Progress comes from the existing gesture recognizers and recipe state; the guide never advances time or commits an action.

Outlined destination rings identify the scale, cookware, jug, colander, drying bowl, burner, trivet, or serving plate. A positioned object gets a green marker and a release instruction where appropriate. Invalid cuts and knife passes display retry guidance. Tomato feedback distinguishes a completed press from whether the tomato is soft enough to yield.

The guide covers ingredient transfers, weighing and returning pasta, cutting, mincing, crushing, stirring, pasta separation, ladling, draining, pouring, blotting/wringing, pan placement, piece arrangement, and serving. Live readings show quantities already transferred. Completed work remains after cancellation according to the existing cooking rules.

**Movement hints** in the camera toolbar can be turned off; that preference survives reload. The overlay does not intercept mouse or touch input. Screen-reader announcements change with the movement phase instead of repeating every progress update. Long action feedback supports keyboard scrolling. Selected tool captions use full text opacity for contrast.

## Verification

- **268 tests passed across 24 kitchen test files**, including 13 new guidance tests.
- Browser checks passed real mouse weighing, correct cookware drops, knife passes and invalid strokes, ladle dipping/carrying, staged drainage, and partial circular stirring. Recipe state changes still occur through the existing cooking controls.
- Real touch progressed through a knife pass and recorded it. Graphics loss cleared the guide and restored the fallback. Cancellation retained completed transfers and stopped ongoing flow.
- The workspace regression passed grouped tools, automatic camera framing, expanded-scene weighing, focus containment and restoration, burner/clock controls, replay locks, and graphics fallback.
- **Nine automated accessibility scans passed with zero violations**, covering the active guide, 320px expanded guide, forced colors, desktop/expanded workspace, tablet, and fallback.
- All **25 recipe assets** match the desktop public mirror. All JavaScript parses; scoped Git whitespace checks passed.

```powershell
npx vitest run tests/kitchen_recipe --pool=threads --maxWorkers=1 --testTimeout=30000
node dev-tools/kitchen_recipe_gesture_guide_qa.cjs
$env:KITCHEN_QA_OUT='reports/kitchen-gestures-2026-09-28/workspace-regression'
node dev-tools/kitchen_recipe_workspace_qa.cjs
```

## Visually inspected captures

- [Carry to the scale](carry-to-scale.png)
- [Positioned packet and live portion](positioned-and-weighed.png)
- [Lift the knife](lift-the-knife.png)
- [Retry an incomplete pass](retry-a-knife-pass.png)
- [Release the filled ladle](release-the-ladle.png)
- [Circular stirring progress](stirring-progress.png)
- [320px movement guide](mobile-movement-guide.png)

Browser tests use Chromium with software WebGL. Automated accessibility scans supplement the exercised keyboard routes; they are not a complete assistive-technology audit.
