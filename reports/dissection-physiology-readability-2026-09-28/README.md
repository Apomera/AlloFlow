# Dissection Lab: physiology readability

September 28–29, 2026

## Changes

- Larger model and pathway captions scale with the canvas display size and the large-text setting. Model phase names wrap across two lines.
- The model status has an opaque background, independent of the translucent anatomy overlay. High contrast uses black panels and white status text.
- Phone pathway captions use a short system name and playback state, with direction arrows underneath. Full explanations remain in the controls.
- Narrow layer badges prioritize the layer name instead of displaying an icon followed by an ellipsis.
- Model and pathway controls use larger text and buttons at least 44 px high. Status text wraps on narrow screens, and paused/static states have distinct badges.
- Both control groups now show **Static · reduced motion** when motion is reduced through the lab setting or the browser preference. The model's paused, playing, and off states remain visible.
- Web and desktop modules contain the same changes.

## Visual review

- [390 px phone](physiology-390.png)
- [320 px phone with high contrast](physiology-320.png)
- [Larger model controls](model-controls-phone.png)

## Verification

The regression checks measure actual canvas text, opacity, and panel bounds; exercise the model buttons; and verify reduced-motion status, touch-target size, and control overflow.

The existing five footer checks pass, including zoom/orientation layout, numbered-marker navigation, preservation of observations, assessment, and model playback/pause.

The three new readability checks pass in [verified-browser-tests.log](verified-browser-tests.log). The first run sampled a legend label instead of the pathway caption; the test now identifies the caption in the footer before measuring it.

JavaScript syntax, scoped whitespace, and binary equality of the web/desktop modules pass.

Final checks:

- **8 browser scenarios pass** across the footer and readability runs. The final compact layer-label change also passes its [320 px recheck](compact-layer-test.log).
- **109/109 canvas and workspace checks pass** in [canvas-workspace-results.json](canvas-workspace-results.json).
- The targeted living-function regression passes in [unit-results.json](unit-results.json), bringing the focused unit total to **110**. That filtered report contains only the living-function test; the other two suites were verified separately.
