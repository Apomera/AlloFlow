# View together — Enhancement 64

Nearby destination cards now offer **View together**. The camera turns toward the two landmark centers and widens the lens when needed. It stays at the same position, preserving distance traveled and both journey clocks. Two labels identify the centers, and the panel reports their angular separation.

You can pan or zoom while the labels follow the projected centers. If a center leaves the view, the panel reports how many remain visible. **End paired view** keeps the framing and returns to the collapsed inspector. **Back** restores the original camera view, expanded Details, travel speed and viewing-distance setting. Flyby return points remain available.

## Model and limits

This frames landmark centers, not entire objects. The existing inspection distances are not treated as physical radii. The fit respects the camera's pitch limit, 100° lens limit and viewport shape, with a 16% margin around the centers at launch. Wider existing lenses are preserved. Pairs that cannot fit from the current viewpoint have a disabled action with an explanation. No camera translation is introduced to make them fit.

The scene remains generated teaching scenery. Angular separation is calculated from the model positions and the current camera position. The renderer, relativity calculations, landmark data, and all 18 existing preview assets are unchanged.

## Verification

See [verification.json](verification.json) for hashes and completed checks.

- [Nine focused tests](unit/pair-final-summary.json), including 240 projection cases checked against the renderer across scene scales, headings and viewport shapes. Edge cases include aligned or opposite sightlines, near-pole views, invalid input and centers coincident with the camera.
- [Eleven browser workflows](browser-final/check.json), including keyboard activation, lens widening, fixed position and counters, marker reprojection during pan/zoom, unavailable pairs, exact Back restoration, paused orbit, flyby detours, and cleanup when travel starts.
- Three accessibility scopes, phone controls at 320 pixels, and four screenshots reviewed visually.

Browser graphics use Chromium SwiftShader. The full application suite and physical-device GPU matrix were not run. Nothing was staged or committed.
