# Anatomy viewing angles — 2026-09-09

Added Front, Right, Back, and Left camera shortcuts for the included body models. They retain the current close-up and zoom. Left/right refer to the body's perspective, including when the underlying body orientation is posterior. The live angle indicator clears the selected preset and shows Free angle when the learner rotates away from a principal view.

Soft and Contour lighting follow the camera around the included bodies, keeping profiles and the back readable. Clinical Atlas and imported meshes retain their existing lighting behavior. Preset changes clear residual orbit momentum before setting the new view. The 3D heading now says Explore in 3D so it does not imply the camera still faces the original atlas orientation.

## Validation

- Real Chromium WebGL test passed: all four camera angles, unchanged region/zoom, viewer identity, lighting selection, free-angle detection, reset, posterior laterality, and keyboard activation on a 390 px phone layout.
- 36 existing anatomy interface/model regression tests passed.
- Scoped Axe checks of the new angle controls found zero WCAG A/AA violations in light, dark, and high-contrast themes. This is not a whole-app audit.
- No browser page errors or horizontal phone overflow.
- Inspected back.png and phone.png; right.png records the other profile.
- JavaScript syntax and diff whitespace checks passed. Source and desktop runtime remain synchronized.

Test: tests/e2e/anatomy-view-angles.spec.ts. Evidence: accessibility.json, back.png, right.png, phone.png.
