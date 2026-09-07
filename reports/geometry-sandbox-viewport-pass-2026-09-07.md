# Geometry Sandbox viewport pass (September 7, 2026)

Follows the September 6 redesign and the September 7 second enhancement pass. Those two passes rebuilt the sidebar, navigation, lessons and editing. This pass leaves that work alone and concentrates on the 3D viewport itself: what the student sees in the scene and how the scene responds to the pointer and the camera.

## What changed

- **Orientation triad.** A small X/Y/Z indicator sits under the scene chip and turns with the camera every frame, so a student always knows which way the model is facing after an orbit or a preset. It uses the same red/green/blue coding as the sculpt handles. It is decorative for assistive technology (the camera bar and arrow keys remain the controls), hidden in forced-colors mode, and recoloured on the Paper background.
- **Origin cross on the floor.** The two grid lines through the origin now read a little brighter than the rest, so the anchor and facing of a construction are visible at a glance. The lines are children of the grid, so **Show grid** hides them too. Colours stay in the slate family on purpose: the WebGL regression spec isolates solids from scene furniture with an "r > g" pixel rule, and floor furniture must never cross it.
- **Hover affordance.** In Stretch and Sculpt modes a selectable object under a resting pointer turns the cursor into a pointer and gets a faint sky emissive lift. The lift is restored only if nothing else (selection, sculpt preview) rewrote the emissive in the meantime, so it cannot clobber a highlight owned by another code path. Sculpt handles change the cursor without a lift. Throttled to about 25 Hz and cleared on pointer leave.
- **Camera presets glide.** Front, Side, Top and Iso now swing the camera around the target over 380 ms with the same ease as **Fit**, instead of cutting. Reduced motion keeps the instant cut.
- **Scene theme follows the background.** Switching to Paper darkens the origin cross and lightens the ground shadow; Slate and Midnight restore the dark-theme values.
- **Viewport vignette.** A subtle radial darkening at the viewport edges (lighter on Paper) adds depth without any in-scene haze. It is a CSS pseudo-element beneath the overlays, disabled in the contrast theme and in forced-colors mode. Bloom, fog, motes and physical materials stay off, as the visual-clarity test requires.

## Files

- `stem_lab/stem_tool_geosandbox.js` and the desktop mirror `desktop/web-app/public/stem_lab/stem_tool_geosandbox.js` (byte-identical).
- New pure helper `geoProjectAxes(q)` exported on `StemLab.geoPure`.
- New test `tests/geosandbox_viewport_orientation.test.js` pins the triad projection against three.js r128 itself for the default pose, every camera-bar preset and 40 arbitrary rotations.

## Verification

- 15 geosandbox and immersive unit files: **440 tests passed** (8 files / 154 in the first run, 7 files / 286 in the second).
- Real-WebGL browser check (`scratch/geometry-viewport-2026-09-07/browser-check.mjs`, Chromium + SwiftShader, OrbitControls present) against the working tree:
  - origin lines present, parented to the grid, theme setter exposed, triad mounted with a live updater;
  - triad endpoints change when the camera moves;
  - hovering the prism sets `data-geo-hover`, computed cursor `pointer`, emissive `#38bdf8` at 0.22; leaving restores emissive 0 / intensity 1 and cursor `grab`;
  - Top preset: camera has moved but not arrived 120 ms in, and ends directly above the target with the animation handle cleared;
  - Paper background through the real Settings select: cross `#64748b`, background `#e9eef4`, shadow opacity 0.2, viewport `data-background="paper"`;
  - unticking **Show grid** hides the cross with the grid;
  - zero page errors.
- Screenshots before and after for single/stretch/sculpt desktop, single phone, hover and Paper: `scratch/geometry-viewport-2026-09-07/captures/`.
- WebGL e2e specs (`19-geosandbox-gl`, `geosandbox-workbench`, `geosandbox-navigation`): see the addendum at the end of this report.

## Not done

- Nothing in the sidebar, lessons or editing flows was touched.
- The triad is passive. Making its axes clickable shortcuts to Side/Top/Front is a small follow-up if wanted.
- Physical devices and headsets were not exercised.

## Addendum: WebGL e2e result

`npx playwright test tests/e2e/19-geosandbox-gl.spec.ts tests/e2e/geosandbox-workbench.spec.ts tests/e2e/geosandbox-navigation.spec.ts` against the working tree: **40 passed, 1 skipped (a pre-existing skip in the spec), 0 failed** in 17.8 minutes under SwiftShader. The pixel discriminators in the GL spec still hold with the origin cross on the floor.
