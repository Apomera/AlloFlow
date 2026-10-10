# Enhancement 68 — Paired landmark directions

Each paired landmark now has its own direction row. A center inside the projected view is labeled **Center in view**. An offscreen center gets a directional arrow, a written instruction such as **Look upper left**, and its angular distance from the center of the camera view. Rear landmarks also say **Behind you**.

The rows retain their original 1/2 order and names, even when both landmarks share a bearing. They live inside the existing scrollable comparison panel. Minimize hides them with the rest of the comparison; Frame both remains available to restore the pair. No new overlays cover the scene controls.

## Model and accessibility

Directions come directly from the renderer's camera-relative `targetView` projection in free exploration. At the exact rear direction, the projection has no unique turn direction, so the guide says **Behind you · Turn around** without an arbitrary arrow. Angle values describe separation from the view axis, not the angular separation between the two landmarks or an object's physical size.

Center inclusion does not establish whole-object visibility or occlusion. Directions describe generated scene landmark positions. The renderer, physics, and all 18 preview images remain unchanged.

Arrows are decorative and excluded from the accessibility tree. The direction and angle are ordinary readable text. The guide does not issue live announcements on every camera turn. Offscreen state uses text as well as color, with system colors in high-contrast mode.

## Verification

- Twenty-one focused tests: four new component tests and seventeen inherited framing, layout, and inspector tests.
- New tests use the real renderer projection for eight directions, rear quadrants, the exact antipode, different camera orientations, narrow and wide lenses, and same-bearing landmarks with distinct labels.
- Nine browser workflows verify initial guides, one and both centers offscreen, rear guidance, minimize/reframe, exact flyby return, and phone/fullscreen/landscape behavior.
- Five scoped accessibility audits, seven screenshots, and three checks for reachable controls at least 44 by 44 pixels.
- Source syntax, exact mirrors, a reversible UI patch, unchanged preview hashes, and an empty Git index.

See [verification.json](verification.json), [browser results](browser-attempt1/check.json), and [unit results](unit/pair-guidance-final-summary.json).

Validation used Chromium with SwiftShader. The full application suite and physical-device GPU matrix were not run. Changes remain uncommitted.
