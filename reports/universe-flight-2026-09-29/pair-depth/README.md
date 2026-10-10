# Enhancement 65 — Compare distances

Paired landmark views now include a **Compare distances** disclosure. It shows each landmark's distance from the camera and the distance between the two centers, in light-years. Two numbered rows use one linear distance scale, with a circle and square marking the endpoints.

The comparison starts collapsed. It opens with a click, Enter, or Space and scrolls within the paired-view card when space is limited. Panning and changing the lens preserve the measurements. Back restores the previous view and expanded inspector; returning to the flyby restores its saved stop. End paired view remains reachable on narrow screens and in fullscreen.

## Model and limits

Distances are Euclidean lengths calculated from the current camera and generated landmark coordinates. They describe this scene's model positions, not surveyed astronomical measurements, physical object boundaries, or light-travel-time observations. Apparent angular closeness does not imply closeness in space. The graph compares camera ranges; it is not a perspective drawing of the objects.

The renderer, catalog, and all 18 scenic preview images remain unchanged. The new disclosure does not move the camera or alter scene pixels. Existing field notes retain their previous behavior.

## Verification

- Nine inherited math and inspector tests, including 240 pair-projection cases.
- Seven browser workflows covering independently calculated coordinate fixtures, exact camera and pixel preservation when opening the disclosure, invariant measurements during pan and zoom, keyboard toggling, exact flyby restoration, and mobile exit controls.
- Four scoped accessibility audits: desktop, 320-pixel phone layout, fullscreen, and forced colors.
- Six screenshots and four checks for reachable controls at least 44 by 44 pixels.
- Exact source mirrors, syntax checks, a reversible UI patch, unchanged asset hashes, and an empty Git index.

See [verification.json](verification.json), [browser results](browser-final/check.json), and [unit results](unit/pair-depth-final-colors-summary.json). Numeric fixtures were calculated independently using the square root of summed coordinate differences squared. The browser harness serves the pinned repository files and records their hashes.

The first browser attempt exposed a forced-color audit timing issue and note text selectors that outranked the explicit system-color rule. The final harness waits for repaint after switching media, and the new disclosure's system-color text override takes precedence. Earlier diagnostic evidence is retained in `browser-attempt1` and `diagnostic1`.

Validation used Chromium with SwiftShader. The full application suite and a physical-device GPU matrix were not run. Changes remain uncommitted.
