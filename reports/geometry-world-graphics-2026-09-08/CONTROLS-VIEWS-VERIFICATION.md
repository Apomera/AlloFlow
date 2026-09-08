# Geometry World controls and camera views — verified

The final combined browser run passed at 1440×900, 390×844, 320×700, and phone landscape 844×390. It used the actual React/Three.js application and SwiftShader WebGL, with touch-capable Chromium and a phone user agent for portrait/rotation checks. The browser is closed. No application source was edited by this verifier.

The repeatable creation contains 48 connected blocks with pitched half-volume roof pieces, a quarter-volume wing, and a half-height step. Two detached blocks exercise occupied-cell placement. The full workspace has 50 student blocks and 99 authored ground blocks.

## Verified behavior

- **Placement:** A blocked occupied-cell preview displays coral fill and a visible outline; an allowed placement displays mint. Occupied, below-floor, outside-world, fractional-grid, non-finite, and block-limit calls reject without changing meshes, action counters, undo/redo history, XP, milestones, or selected STL. The block-limit branch uses a temporary bounded count stub instead of rendering 1,500 blocks. A real keyboard placement adds exactly one connected block; Undo restores the original model and preceding undo history. No-target keyboard and blocked touch placement also leave state unchanged.
- **Touch:** All six visible actions have readable labels and reachable centers. Portrait targets are 64×48px; landscape targets are 58×48px. Up and Down change camera height while held. Release, cancellation, a window blur event, and turning touch mode off clear movement flags. No release acquires native pointer lock. Touch mode can be re-enabled normally. Talk is absent when the world has no NPCs.
- **Layout:** The three phone layouts have no overlaps between touch actions and the palette, shape tray, build dock, look settings, or utility action bar. The joystick has no overlap with those controls or the Position panel. Both top-right viewport controls remain reachable. The final landscape screenshot was visually inspected: utility controls sit left, touch actions right, look settings clear the viewport controls, and the material palette clears the joystick.
- **Showcase:** All four actual view buttons passed on desktop and both portrait sizes: Perspective, Front, Side, and Top. Every selected mesh vertex remains within the camera frame. Front faces −Z, Side faces −X, and Top keeps −Z at screen top. Orbit returns to Perspective. Exiting from Top restores camera position, quaternion, up vector, and FOV. View changes and exits preserve the exact model, selected STL, counters, and history. The final Studio floor is visually seamless on both the desktop hero and 320px phone capture.
- **Continuity:** The same engine survives all viewport changes. The 48-block selected STL remains exactly **12,984 bytes**, SHA-256 `d89ff2407b55695caea0a5a5b1f0a8972d2cc3849c8d2b0ab8f030d04ab51715`. There are no page errors or failed shader programs.

## Defects found and verified after fixes

The first run found a native handoff defect: releasing a held Down control after disabling touch mode generated a touch-derived canvas click, then acquired pointer lock. Native event tracing recorded `pointerType: touch`, `sourceCapabilities.firesTouchEvents: true`, and a subsequent canvas `pointerlockchange`. The final core guard prevents this and all three phone layouts pass the same interaction.

The first landscape probe found Up/Down covered by the utility action bar, the two viewport controls covered by Look speed, and the Position panel covering the joystick. The final layout removes each conflict. The initial desktop Studio capture also showed a finite floor edge; the final capture uses the refined floor and no longer shows that edge.

## Evidence

- [Final results](controls-views-results.json) and [repeatable verifier](verify-controls-views-pass.cjs)
- [Desktop Studio hero](controls-views-1440x900-studio-perspective.png)
- [Desktop Front](controls-views-1440x900-studio-front.png), [Side](controls-views-1440x900-studio-side.png), and [Top](controls-views-1440x900-studio-top.png)
- [390px touch UI](controls-views-390x844-touch.png) and [320px touch UI](controls-views-320x700-touch.png)
- [320px Studio](controls-views-320x700-studio-perspective.png) and [Top](controls-views-320x700-studio-top.png)
- [Final phone landscape](controls-views-844x390-touch.png)
- [Blocked placement preview](controls-views-blocked-preview-desktop.png)
- [Original handoff failure](controls-views-first-run-results.json), [native event trace](touch-mode-off-results.json), and [original landscape probe](touch-landscape-results.json)

Run with `node reports/geometry-world-graphics-2026-09-08/verify-controls-views-pass.cjs`. This is a bounded functional and visual browser regression, not a physical-phone performance measurement.

Final decorative refresh: the 844×390 screenshot was reloaded after hiding the unused look reticle. Its computed display is none and its bounds are 0×0. All six action targets, both viewport controls, palette/joystick separation, exact STL, and error checks still pass. See [bounded refresh results](controls-views-landscape-refresh-results.json).
