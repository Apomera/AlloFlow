# Anatomy compact camera controls — 2026-09-19

## Changes
- Consolidated included Surface and Blueprint camera controls into a single zoom/reset dock and a Rotate & tilt disclosure.
- Automatically expanded rotation controls in Focus model and reading mode.
- Kept the Clinical Atlas and imported-model camera toolbars intact.
- Clarified Reset versus Refit view in button labels and model guidance.
- Added theme-aware styles, visible keyboard focus, and touch-sized rotation controls.

## Validation
- 36 tests passed across anatomy_ui_polish.test.js and anatomy_view_model_refinement.test.js.
- Compact camera Playwright scenario passed using the actual bundled body model and WebGL viewer.
- Verified keyboard disclosure operation, region selection, rotation, zoom, reset, Focus model expansion, Blueprint controls, and persistent canvas identity.
- No page errors or phone horizontal overflow in the browser scenario.
- Scoped Axe scans of the rotation disclosure and viewer dock reported zero violations in light, dark, and high-contrast themes. This is not a whole-application accessibility audit.
- Phone and desktop Focus model screenshots captured for visual review.

Artifacts: phone.png, focus.png, accessibility.json.
