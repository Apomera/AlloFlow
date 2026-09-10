# Focus creation — independent camera review

The integrated `geometryWorldBuilderPure.fitCreationCamera(box, camera, rect, minCameraY)` passes **24 actual Three.js projection tests**, including 60 deterministic varied configurations inside one property-style case. There are no failed tests or suites. The tests load the production builder export, not the design snippet.

Evidence: `camera-fit-tests.json` and `tests/geometry_world_creation_camera_fit.test.js`. `creation-camera-fit.txt` preserves the proposed pure helper for review. No production source was edited by this audit agent.

## Fitting method

The bounds are an exact transformed world-space `Box3`. The helper chooses a stable elevated three-quarter bearing and uses the camera's actual effective vertical FOV, zoom, and aspect ratio. It shrinks the available NDC rectangle inward by 4%, preserving its center.

Let `D` be the unit direction from target toward camera, `R = normalize(worldUp × D)`, and `U = D × R`. Let the safe rectangle have center `(cx, cy)` and half-size `(hx, hy)`, and let `tx = tan(effectiveFOV / 2) × aspect`, `ty = tan(effectiveFOV / 2)`. For each bounds corner relative to the box center, calculate `(x, y, z) = (p·R, p·U, p·D)`.

The camera distance must satisfy all of:

```
d >= z + near + nearClearance
d >= z + abs(x + cx*z*tx) / (hx*tx)
d >= z + abs(y + cy*z*ty) / (hy*ty)
```

With `shift = -cx*d*tx*R - cy*d*ty*U`, the returned target is `center + shift`, and position is `target + d*D`. This translates the camera without modifying its perspective projection. The box center projects exactly at the safe rectangle's center, including rectangles wholly left of or above the screen center.

The elevated bearing accounts for the downward camera translation needed to put an object in an upper clear area. The helper then enforces minimum camera height before returning the pose. Clamping camera Y afterward would invalidate the fit. The result also reports actual nearest/farthest view depths and a conservative extended far plane.

## Independently checked cases

- Tall 128-unit towers and 129-unit-wide low slabs on portrait phones.
- Wide and extremely narrow viewports, from aspect .08 to 10.
- Offset authored coordinates around X1000 and Z−700 with an elevated minimum eye position.
- Actual half-slab, diagonal-half and quarter-wedge vertices under rotated/scaled parent transforms.
- Asymmetric rectangles, including left-only, upper-only and small upper-right clear areas.
- Optical zoom and narrow/wide effective FOV, large near planes, far-plane extension and degenerate point bounds.
- Previous top-view up vectors and complete immutability of camera, bounds, requested rectangle and mesh inputs.
- Invalid/empty/non-finite bounds, projection parameters and rectangles return null.

Every successful case projects all eight bounds corners through an actual r128 `PerspectiveCamera` and checks NDC X/Y, near/far clipping, minimum camera Y, exact safe-rectangle center, and reported depth bounds. The transformed fractional case also checks every original mesh vertex.

## Runtime integration review

The old editing presets (`getStructureFocus` / `getViewPresetTarget`) use a radius capped at14, ignore height/aspect/FOV and aim near the structure's top. Their old return representation retains position and a look target only. They are not a suitable basis for a general selected-build fit. The new path correctly records position, quaternion, up, FOV, far plane and fog for return.

The caller must set world-up `(0,1,0)` before applying the returned target. Normal editing eases FOV toward75 and walking applies gravity whenever world input is active. The integrated focus state suspends that movement branch while framing is held, so merely returning keyboard focus does not immediately change the fitted camera. Intentional movement can take over without forcing the model to stay framed.

Three integration concerns were sent to the root implementation owner for review:

1. An environment fade or auto-cycle can overwrite the extended focus fog after the fit unless it is paused during held focus or focus fog is reapplied. A large framed model beyond the ordinary fog range can otherwise disappear.
2. Minimum camera height must use authored ground Y plus the normal eye clearance, rather than always2.8, when general lesson selections are supported.
3. Bounds sampled during a placement pop can describe a temporarily shrunken mesh. Use its intended settled scale for bounds or refit when the short pop completes, so the final model does not grow outside the reserved margin.

Actual UI layout, motion, return behavior and browser screenshots are verified separately by the root/QA agents. The numerical test result is not a claim that those lifecycle concerns have already been resolved.
