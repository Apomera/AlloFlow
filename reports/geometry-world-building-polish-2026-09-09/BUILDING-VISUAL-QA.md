# Building preview and control QA

This bounded before/after check runs the actual React UI and Three.js renderer in one touch-enabled Chromium/SwiftShader browser at a time. Source snapshots are preserved. A controlled, explicitly handler-level raycast payload targets three authored fractional blocks (rotated half wedge, quarter wedge, and horizontal half slab). Source geometry, materials, world/STL data, and history are checked for unwanted changes.

## Baseline

The original hover wireframe/fill uses a full cube regardless of the aimed block's shape. The phone quarter-wedge image clearly shows this phantom cubic volume. The preview's 1.006 scale also extends its vertices slightly outside the geometry an actual placement creates.

Maximum nearest-corresponding-vertex errors, in world units, were identical at1440×900 and390×844:

| Target | Hover outline | Hover fill | Placement preview |
|---|---:|---:|---:|
| Half wedge,90° |1.00251|1.01010|0.00735|
| Quarter wedge,270° |0.71065|0.72132|0.00424|
| Horizontal half,180° |0.50251|0.51020|0.00450|

The baseline preserves authored geometry/materials/STL/history. Occupied-cell placement through actual B is rejected without mutation. Results: `before-results.json`; evidence includes `before-hover-quarter-r3-390x844.png`.

## Full after run

All six actual-render cases now have **zero vertex error** for hover outline, hover fill, and placement preview. The new ghost scale is exactly1. The outline uses the target's actual edge geometry; the filler follows the rotated shape instead of describing a full grid cube. The same authored geometry/materials/STL/history remains exact, including denied actual B placement.

Actual first placement changes the empty guide to selection guidance. Actual Ctrl+Z returns the empty guide while the cumulative placement counter remains1, proving the guide tracks the presence of authored blocks rather than that counter. The guide also matches the rendered input mode (B or Place).

The full run found two concrete control issues:

1. The document-level Space handler prevents native Rotate button activation. Space leaves rotation at0°; Enter then correctly increments once to90°. The later expected180° assertions cascade from the failed Space activation.
2. The shape cue overlaps the utility row at1440,390, and320px. At390, cue x121.88,y669.81,width146.23,height32.19 intersects the utility row x8,y660,width374,height52. At320 the cue is y525.81–558 and the row y516–568. The same issue occurs on desktop at cue y732.81–765 versus row y716–768.

`after-results.json` preserves these failures and the passing preview/guidance evidence. Images include `after-hover-quarter-r3-390x844.png` and `after-shape-feedback-320x700.png`.

## Corrected controls and final return

The supplemental run verified native Space and Enter each activating once, Q/R/tap parity, 44-pixel controls, and readable cues clear of other controls at 1440 × 900, 390 × 844, 320 × 700, and 844 × 390. The final rotated-quarter preview remained exact. Corrected phone and landscape screenshots were visually inspected.

That run caught one additional issue: Print Lab's saved project snapshot restored an old shape cue after Revise. Its raw result remains in supplemental-results.json. The builder now clears temporary actionFeedback both when capturing a project and when restoring it, including older snapshots.

The final return-only run passed on the current source. An actual Send click listener confirmed the cue was still active at dispatch. It was empty after unmount and after Revise, with no feedback node rendered. Full-world data, STL bytes, and undo/redo history stayed exact, and Print Lab and the restored workspace both retained the custom 12.5 mm-per-block scale. There were no page, console, or shader errors.

return-results.json records that successful roundtrip. building-pass-summary.json verifies the exact source differences across all three runs, final source hashes, mirrored files, and 336 unique passing tests across 14 files. The source snapshots and initial findings are preserved rather than rewritten as successful runs.

The browser used Chromium software WebGL and controlled handler-level hit payloads. This is not physical-device Safari or frame-rate coverage.
