# Anatomy camera and surface refinement — 2026-09-09

Added regional camera presets for Whole body, Head, Torso, Hand, and Feet to the included detailed surface and teaching models. Region buttons focus the canvas. Close-up framing accounts for canvas aspect ratio; arrow controls orbit around the region. Whole body, Reset, Home, R, and 0 restore the overview. Switching Blueprint/Surface recalculates the region for each pose without replacing the viewer. Clinical Atlas and unknown imported meshes retain their existing camera controls.

Close-ups hide the decorative platform, ring, and reference grids. Reset restores the overview stage. Surface lighting uses a softer neutral rim and lower exposure, with bundled material colors converted from sRGB before rendering. No paid assets or services were added.

## Validation

- Chromium WebGL camera test passed: regional presets, canvas focus and identity, zoom/reset, centered rotation, model-pose reframing, stage visibility, skin-tone changes, and 390 px phone overflow.
- Scoped Axe checks of new camera controls: zero WCAG A/AA violations in light, dark, and high-contrast themes. This is not a whole-app audit.
- JavaScript syntax and git diff whitespace checks passed; source and desktop runtime mirror are byte-identical.
- Screenshots: head.png, torso.png, hand.png, feet.png, deep-tone.png, phone.png. Inspected head, hand, feet, deep tone, and phone views during refinement.

The included surface remains a generic external body reference. Blueprint and 2D Atlas provide teaching structure pins.

Final regressions: 36 interface/model tests passed. The 6 bundled-asset tests passed in isolation (18.51 s); one source-render test had exceeded the 60 s timeout in the earlier combined run. The final real-WebGL camera suite passed (1.6 min).

