# Anatomy camera continuity — 2026-09-19

Switching close-up regions now preserves the body's rotation and the camera's orbit direction, including free angles. Moving between Blueprint and Surface also retains the viewing angle while adapting the framing to each model's pose.

The region label in the camera dock is now a Refit view button with a region-specific accessible name. It restores the current region's framing without changing its angle. It also works for the whole-body view. The existing Fit/Reset and Whole body controls continue to restore the original overview.

Button and keyboard zoom use proportional steps on the included body views; opposite steps return to the same distance when no limit is reached. Clinical and imported-model zoom behavior is unchanged.

Fullscreen and lighting controls now have separate space. The fullscreen button has a larger touch target in 3D.

## Validation

- 36 existing interface/model regression tests passed.
- Camera continuity and existing camera-preset WebGL tests passed before the final spacing adjustment.
- Browser coverage includes angle preservation, free-angle continuity, reversible zoom, contextual and whole-body refit, unchanged renderer identity, model switching, keyboard activation, and phone overflow.
- Scoped Axe checks of the updated camera dock found zero WCAG A/AA violations in light, dark, and high-contrast themes. This is not a whole-app accessibility audit.
- Syntax and diff whitespace checks passed. Source and desktop runtime are byte-identical.

Evidence: tests/e2e/anatomy-camera-continuity.spec.ts, accessibility.json, desktop.png, phone.png.

Final spacing run: camera-continuity WebGL test passed after the fullscreen-size correction. Verified non-overlapping lighting/fullscreen bounds at 390 and 320 px, a fullscreen target at least 44 px in each dimension, and no horizontal overflow. The phone screenshot was reviewed during the pass; final images were refreshed by the successful run.

