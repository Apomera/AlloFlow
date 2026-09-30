# Water Cycle transfer guide and mobile 3D view

The scene guide gives each transfer a clear process heading and two water cards. Each card separates the store from its physical state. One arrow connects the starting and destination cards, and heat evidence has its own region. The reading order stays consistent on phones, including long labels.

The 3D camera label follows actual pointer and keyboard input. Dragging or adjusting the camera enters **Free orbit**; F or the follow control restores **Follow camera**. Pausing preserves the camera mode. Initialization reconciles a restored status to the newly created renderer, and cleanup cancels queued observations from detached canvases.

On phones, the camera dock and route choices now sit below the 3D scene. The model retains at least 380px of height. Its controls keep large targets and remain inside the same fullscreen view. The scene grows when space allows; native and fallback fullscreen can scroll to reach controls when space is limited.

## Visual review

| View | Before | After |
| --- | --- | --- |
| Phone water transfer | [Reordered process chip](before-root-uptake-light-320.png) | [Stores and physical states](root-uptake-light-320.png) |
| Phone 3D model | [Dock covering the scene](before-mobile-dock-root-uptake-3d-light-320.png) | [Scene above its controls](root-uptake-3d-light-320.png) |

Additional captures show [desktop evaporation](evaporation-light-1280.png), [dark precipitation](precipitation-dark-320.png), [forced colors](precipitation-forced-colors-320.png), and [expanded phone labels](expanded-text-light-320.png).

## Verification

Final runtime SHA-256: `3b733011f6f4842a41572ac605e2db17b2b7791cbea724f9e81bf78c154e620b`.

| Final verification | Passed |
| --- | ---: |
| Focused tests | 44 |
| Guide and mobile layout browser assertions | 1,148 |
| Camera and fullscreen browser assertions | 182 |
| Scoped accessibility audits | 9 |

- [Final unit results](final-unit-results.json): 44 focused tests passed, including native desktop fullscreen, renderer lifecycle, camera status, immutable state preservation, and existing scene contracts.
- [Guide browser results](results.json): six native process selections, root uptake/transpiration/groundwater journey fixtures, phone and desktop layout, themes, water cards, keyboard pause, and scoped accessibility audits.
- [Camera browser results](camera-results.json): real OrbitControls drag, native arrows and F, pause independence, ref reuse, renderer recreation, detached callback cancellation, and mobile native/fallback fullscreen controls.

The guide harness uses React state fixtures for specific journey steps and a DOM text replacement for expanded-label layout stress. That stress check does not claim to validate a translated catalog. The camera harness exercises native view and camera controls. Both use owned isolated browsers; the guide harness also owns an ephemeral server. The final reports record source/public hashes and resource cleanup.

Earlier reports remain alongside the final evidence. `results-initial.json` retains the first harness's incorrect assumptions about decorative heat symbols, desktop region placement, and fixture restoration. `results-before-mobile-dock.json` and `camera-before-mobile-dock-results.json` record the earlier validated guide and camera status. The paired 3D phone capture exposed the dock covering the scene and prompted the responsive layout correction.

`pre-final-mobile-results.json` and `camera-mobile-selector-results.json` retain the mobile selector failures. `results-before-forced-colors-dock.json` retains the subsequent dock text contrast finding. The final selectors use a quoted view value, the phone mode kicker yields space to the process heading, and forced-color dock text uses system colors.

## Reproduce

From the repository root:

```powershell
node dev-tools/watercycle_handoff_guide_qa.cjs
node dev-tools/watercycle_camera_mode_qa.cjs
node node_modules/vitest/vitest.mjs run tests/watercycle_camera_mode.test.js tests/watercycle_canvas_loop.test.js tests/watercycle_3d_handoff.test.js tests/watercycle_subsurface_camera.test.js tests/watercycle_host_surface_a11y.test.js tests/watercycle_journey_fullscreen.test.js --maxWorkers=1
```
