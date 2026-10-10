# Enhancement 67 — Frame both

Paired landmark views now include **Frame both**, available in the expanded and minimized comparison panels. After looking away or zooming in, this action turns toward both landmark centers and widens the lens only if needed. An existing wider lens is preserved.

The camera position, traveled distance, elapsed times, selected landmark, display settings other than the lens, and return history remain intact. Reframing keeps the distance disclosure open and preserves keyboard focus. The panel then checks its placement against the reframed landmarks.

If both centers cannot fit the current window within the supported lens range, the button is disabled and the panel explains that a wider view area is needed. Resizing to a suitable shape makes the action available again. This check never moves the camera to force a fit.

## Implementation and limits

The action reuses the existing pair-framing calculation, which frames both centers with a 16% viewport margin. It plans from a fresh renderer snapshot and current canvas aspect ratio before making changes. It applies a look-direction change and the planned lens directly, without restoring a snapshot or adding a return-history entry.

These are generated scene landmarks. Framing targets their centers rather than their full visual or physical extents. The renderer, physics, catalog, and all 18 scenic preview images are unchanged.

## Verification

- Seventeen inherited math and inspector tests, including 240 projection cases and 288 panel-layout viewport combinations.
- Ten browser workflows: narrow-lens recovery, independent distance checks, repeated framing, preserving a 100° lens, minimized recovery, impossible-fit handling, exact Back/flyby restoration, and phone/fullscreen/landscape recovery.
- The browser checks verify that only yaw, pitch, and the lens may change. Repeating a completed frame also preserves rendered pixels exactly.
- Six scoped accessibility audits, seven screenshots, and seven checks for reachable controls at least 44 by 44 pixels.
- Syntax checks, exact source mirrors, a reversible UI patch, unchanged preview assets, and an empty Git index.

See [verification.json](verification.json), [browser results](browser-attempt1/check.json), and [unit results](unit/pair-reframe-final-summary.json).

Validation used Chromium with SwiftShader. The full application suite and physical-device GPU matrix were not run. Changes remain uncommitted.
