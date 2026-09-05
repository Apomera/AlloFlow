# Geometry Sandbox finishing pass (Claude, September 4, 2026)

Picks up `reports/geometry-sandbox-claude-handoff-2026-09-04.md`. Everything in that handoff still applies; this report covers only the four remaining items it listed. Nothing is committed or deployed.

## What changed in this pass

### 1. Stale browser assertion (done)

`tests/e2e/19-geosandbox-gl.spec.ts` now expects the SVG profile title "Cross-sectional area by height (local Y)". The drag expectation "Moved X +1.00 u" was left as the handoff set it. The long case "clicking a sculpt primitive selects it and reveals its formulas in the viewport" was rerun alone and passed.

### 2. Immersive Stretch Lab flat-mode framing on phones (done)

Files: `immersive_geometry/immersive_geometry.html` and its `desktop/web-app/public` mirror (byte-identical).

The old `positionDesktopWorkspace` placed the figure at a fixed world pose (3.2 m ahead, 0.65 m to the right, base at 1.05 m) regardless of viewport. On a 390x844 portrait viewport the horizontal field of view is only about 42 degrees, so the 3.25 m measure card and a 2.35-unit rectangle both spilled past the edges, and the lower part of the scene sat behind the bottom-anchored HUD.

New behaviour:

- Desktop and landscape viewports keep the original fixed pose exactly, so nothing moves under mouse users and the existing screenshots stay valid.
- Compact viewports (width at most 760 px, or portrait) solve the workspace distance and height from the camera field of view, the viewport aspect, and the band of screen left visible above a bottom-anchored HUD. The figure is centred horizontally and placed in the middle of that visible band, with the view angle capped at about 20 degrees upward so the figure is never seen from far beneath.
- The HUD band is rounded to 5 percent of the screen so small HUD content changes do not shuffle the scene.
- A `resize` and `orientationchange` hook re-frames on the next animation frame. Collapsing or expanding the HUD also re-frames, so a collapsed HUD lets the workspace drop into the freed space.
- `resetView` resets the frame direction and re-frames. Flat-mode Recenter (the HUD button and the `c` key) now delegates to the viewport-aware placement in front of the current view direction; the XR path in `recenterSpatialPanel` is unchanged, as is every headset code path.
- `positionMeasurePanel` now shares one `measurePanelLift` helper with the framing code, so the card sits exactly where the framing assumed.

Floor-anchored overlays (the dashed plan projection, floor lattice and drop lines) stay on the floor by design. On a phone with the HUD open they run behind the HUD; with the HUD collapsed they are visible. That is intentional and not counted as clipping.

### 3. Visual harness refreshed (done)

`scratch/geometry-implementation-2026-09-04/browser-check.cjs` now clears the DOM text selection left by the Ctrl+A test before every immersive screenshot, waits for the reframe after the desktop-to-phone resize, and adds four projected-bounds checks (desktop fit, mobile fit above the HUD, mobile horizontal centring, mobile fit with the HUD collapsed). It also saves `immersive-mobile-hud-collapsed.png`.

A dedicated `framing-check.cjs` in the same folder exercises the framing on its own: desktop pose unchanged, desktop-to-phone resize, HUD collapsed, fresh phone load, 3D growth, landscape, turn-then-Recenter, plus a page-error check. It projects every visible figure mesh and the card back through the real camera, so the evidence is the actual rendered bounds rather than HUD dimensions. Results land in `framing-results.json` and `framing-*.png`.

One emulation trap surfaced while writing it: with Playwright's `isMobile` emulation, rotating the viewport fires a synthetic device-orientation event and A-Frame's magic-window tracking pitches the camera 90 degrees down. The landscape and Recenter checks therefore run on the non-emulated page. Real phones follow their actual orientation sensor, which was already the product's behaviour before this pass.

### 4. Parity and reporting (done)

Source/public byte parity was re-checked for `stem_lab/stem_tool_geosandbox.js`, `immersive_geometry/immersive_geometry.html` and `ui_strings.js`. One `cmp` on `ui_strings.js` reported a difference mid-session while OneDrive was busy; an immediate re-check showed identical size, timestamp and content. Treat any single failed comparison on this tree as suspect and re-run it.

## Verification

All runs below happened after the framing change, from the workspace root, with the existing local dependencies. Runs were sequential; running vitest alongside a SwiftShader browser run on this tree makes vitest fork workers time out on startup ("Timeout starting forks runner"), which is an environment stall, not a test failure.

| Suite | Result |
| --- | --- |
| Eight geometry unit files (vitest, one worker) | 335 passed, 0 failed. Six files ran in one pass (216); the two whose workers stalled were rerun alone (119). |
| tests/e2e/19-geosandbox-gl.spec.ts + tests/e2e/geosandbox-workbench.spec.ts (full run, one worker, no retries) | 22 passed, 0 failed, 8.2 minutes |
| scratch/.../browser-check.cjs (real Three.js, OrbitControls, A-Frame) | 29 checks passed, 0 page errors (browser-results.json) |
| scratch/.../framing-check.cjs | 13 checks passed, 0 failed (framing-results.json) |

Screenshots inspected after the run: immersive-desktop-after.png (pose identical to before), immersive-mobile-after.png (figure and card inside the band above the HUD, no selection highlights), immersive-mobile-hud-collapsed.png, framing-mobile-fresh.png, framing-mobile-3d.png. SwiftShader still renders scene text with slight ghosting; that is the software renderer, not a product defect.

Not tested, as in the handoff: physical headsets, controllers, real touch devices, production deployment, full app integration, OS fullscreen, screen readers, and external AI requests.

## Remaining opportunities (not done)

- Landscape phones (for example 844x390) use the desktop pose. The left-anchored HUD can overlap the left edge of the measure card by a small amount. A left-band variant of the framing would fix it.
- The measure card is small on phones at the solved distance (about 60 percent of the width). A larger phone-specific card scale would help readability; it was not changed to avoid altering the card layout tests.
- Translations of the 68 new interface strings, physical-device and headset QA, and the immersive sculpture transfer remain future work as the handoff stated.
