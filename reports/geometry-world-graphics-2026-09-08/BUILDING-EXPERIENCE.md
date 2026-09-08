# Geometry World: building and presentation refinement

Geometry World now has clearer placement feedback, a cohesive set of labeled touch controls, and repeatable Showcase views for inspecting and presenting a creation.

## What changed

- Touch actions use matching pine and sage buttons with SVG icons and visible labels. Flight includes held Up and Down controls; releasing, cancelling, blurring, or disabling touch stops the held action. Talk appears when the world has characters. Short landscape screens give camera settings, utility actions, building actions, the joystick, and materials separate space.
- A release-anchored click guard prevents long touches from repeating a placement or restarting flight. Touch-generated clicks that land on the canvas after a control disappears no longer acquire pointer lock. Mouse and keyboard activation remain available.
- The placement ghost and actual placement share eligibility rules. Mint means ready; coral shows a blocked cell with a reason. Occupied cells, floor restrictions, sandbox bounds, and the block limit are checked before geometry, history, counters, rewards, or effects change. Failed Undo/Redo restoration retains history, and multi-step Redo keeps its remaining entries.
- Showcase adds Perspective, Front, Side, and Top controls in Meadow and Studio. Framing accounts for every bounding corner and reserved interface space. Top has a stable orientation, orbit returns to Perspective, and exiting restores the original camera. Studio's decorative floor extends beyond full fog, removing its visible edge while retaining two triangles.

## Verification

**299 distinct focused regression cases passed** across controls, pointer lock, placement transactions, rotated shapes, geometry fidelity, rendering, lifecycle, STL, and Print Lab integration. Counts and current source hashes are recorded in [building-enhancement-summary.json](building-enhancement-summary.json). Core, builder, and Print Lab source files parse and match their desktop mirrors byte for byte. The targeted diff check passed.

The combined actual React/WebGL run passed at 1440 × 900, 390 × 844, 320 × 700, and 844 × 390. It checked 12 Showcase view combinations, 18 touch-button targets, held flight release/cancel/blur/mode switching, blocked-placement immutability, valid placement and Undo, native pointer-lock rejection, and preserved selection/history/STL. The 48-block selected model's 12,984-byte STL retained SHA-256 `d89ff2407b55695caea0a5a5b1f0a8972d2cc3849c8d2b0ab8f030d04ab51715`. There were no page or shader errors. See [CONTROLS-VIEWS-VERIFICATION.md](CONTROLS-VIEWS-VERIFICATION.md).

Separate browser checks covered four views in both Meadow and Studio on desktop and a 320 px phone, actual PNG export, exact camera restoration, and a larger 150-block pavilion on the seamless Studio stage. See [SHOWCASE-STANDARD-VIEWS.md](SHOWCASE-STANDARD-VIEWS.md).

Phone checks used Chromium touch and viewport emulation, including a phone user agent for rotation; physical devices were not used.

## Reviewed previews

- [Seamless Studio, desktop](studio-seamless-desktop.png)
- [Seamless Studio, phone](studio-seamless-phone.png)
- [Touch building, 320 px phone](controls-views-320x700-touch.png)
- [Touch building, landscape](controls-views-844x390-touch.png)
