# Immersive workspace fitting and comfort

The immersive lab now fits large models around the editor on wide screens, tablets, and landscape phones. The Corner view uses a stronger angle to make depth easier to see. Collapsing controls gives the model more room, and floating formula cards participate in the fit.

Headset settings add Standing, Seated, and Spacious presets, with independent panel distance, size, and height choices. Height is relative to the viewer's eye level. Presets are also available through a fourth button in the existing headset panel row. Custom choices save locally, survive reload, travel in shared scene links, and reset with display settings. They preserve geometry and Undo history.

Recentering keeps even large models behind the control panel. Controller rays extend far enough to reach their dimension handles. The panel renders above scene geometry so the floor cannot obscure its lower controls at seated eye heights. Exiting immersive mode restores the desktop view and framing.

## Verification

- 123 focused unit checks, including three new comfort behavior tests.
- Browser checks cover the largest Room-scale cube in Corner, Front, and Side views at 1440×960, 1024×768, 900×1200, 844×390, and 390×844; collapsed controls; and the floating formula card.
- Browser checks exercise preset/custom settings, persistence, sharing, reset, and simulated XR at a 0.95 m eye height. They verify panel positions, model clearance, controller reach, accessibility, geometry/history preservation, and desktop framing after exit.
- Eight screenshots and executable checks are in `scratch/geometry-immersive-comfort-2026-09-07/`.
- Physical headset/controller hardware was not tested; XR transitions used the actual browser scene with simulated events.

[Open the Immersive Stretch Lab](http://127.0.0.1:4177/immersive_geometry/immersive_geometry.html)

Final result: all 123 unit checks, four new browser workflows, and eleven existing browser regression workflows pass. Browser runs report no page errors or failed requests. Source/public mirrors match and scoped whitespace validation passes.
