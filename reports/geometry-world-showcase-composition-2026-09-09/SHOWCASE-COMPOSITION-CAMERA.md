# Showcase camera composition and lifecycle

Showcase now fits the creation into the actual space between its caption, toolbar and orbit buttons. It previously reserved a fixed 320 vertical pixels, forcing the usable height down to 25% on short screens. The new camera uses canvas-relative control bounds and an offset viewing target. The parent's compact landscape CSS directly increases the measured area available to the model.

The current Perspective, Front, Side and Top directions remain unchanged. The fit accounts for each bounding corner's perspective depth and camera zoom/effective field of view. A parallel vertical correction keeps shallow Front and Side views above the Studio floor without tilting those cardinal views. A finite fallback supports initial entry and test hosts without DOM measurements.

`showcaseCompositionRect(engine)` measures only `.gwe-showcase-caption`, `.gwe-showcase-tools` and `.gwe-showcase-orbit`. The file panel and hidden building HUD are excluded. `fitShowcaseCamera(...)` returns the fitted pose, target, depth range and safe rectangle without mutating its inputs. Both helpers are exposed on `geometryWorldBuilderPure`.

Showcase entry uses `creationGeometryBounds` so a block's temporary placement scale cannot shrink the framing bounds. The parent also updated `studioGroundFootprints(meshes, baseY, poppingMeshes)` to use a temporary canonical transform for animated blocks, preserving exact support polygons. The Studio stage remains centered on the creation, and its existing floor extent now accounts for the offset camera-to-model distance.

After React commits the Showcase controls, a session-owned animation-frame callback performs the measured fit. The existing canvas resize path invokes subsequent fits. Opening the file panel does not trigger a refit. Camera fits requested during PNG encoding set a pending flag; the production image-save completion schedules one fit after encoding finishes or fails. Exit cancels queued work and restores the saved building position, orientation, up vector, field of view, far plane and fog.

The session records `engine._showcase.composition` for browser verification:

- `rect`: final inset NDC rectangle used by the fit.
- `pixelRect`: the same rectangle in local canvas CSS pixels.
- `canvasRect`: canvas viewport origin and CSS size.
- `bounds`, `position`, `target`, `depthNear`, `depthFar`, `minCameraY`, `view`, and `fallback`.

No construction geometry, materials, lighting or exported geometry changed. The camera introduces no render objects, passes or per-frame layout loop. The parent applied the prepared camera patch after this subtask's shell approval attempts timed out; its subsequent CSS, canonical-contact and deferred-fit changes are included in the tested source.

## Verification

**33 new tests pass, with both standalone test processes exiting 0.** The final camera run reports 27/27 tests in one loaded file; the contact run reports 6/6 tests in one loaded file. Both used console output alongside JSON so omitted suite-load failures could not be mistaken for a complete success.

- `tests/geometry_world_showcase_composition.test.js` uses actual THREE r128 cameras, source geometries, production Showcase entry/exit and production image-save completion. It checks all four views at portrait, desktop and short-landscape aspect ratios; every projected corner; three zoom values; very wide shallow/elevated builds; region measurements; no-DOM fallback; camera/history/STL preservation during placement pop; session cancellation; file-panel stability; queued view and resize changes after encoding; encoder failure; exit before/after completion; replaced and destroyed engines.
- `tests/geometry_world_showcase_pop_contacts.test.js` checks every block shape under a transformed parent, exact canonical support polygons while popping, unchanged geometry/transforms, raised-span exclusion, and Saver without a pop array.

The deterministic short-screen geometry test produces a projected model more than twice as tall as the previous fixed-reserve camera while retaining every corner inside the safe region. This is a camera-math comparison, not a frame-rate claim. The parent owns actual browser before/after captures and broader regressions; no browser was launched by this subtask.

Final evidence: `showcase-composition-final-tests.json`, `showcase-pop-contacts-tests.json`, and `camera-verification-summary.json`. Initial combined reports remain as diagnostics. An initial pop/STL test omitted the real `_popT` placement marker; the final fixture includes both `_popT` and `_popBlocks`. Combined invocations omitted a requested suite and exited 1 despite JSON success, so only the two complete exit-0 runs count here. The frozen original core, builder and Print Lab sources are in `before-source/`.
