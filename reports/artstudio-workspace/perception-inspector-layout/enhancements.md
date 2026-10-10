# Perception Lab: a compact drawing inspector

The live drawing inspector now groups zoom and pan controls in a compact panel that wraps with the available space. The zoom row keeps its controls in proportion on wider screens, with a bounded width that keeps related actions close together. Viewing tips open in a native disclosure, keeping the main controls close to the drawing while preserving the existing instructions for moving and cropping the view.

Long unbroken translations wrap within the inspector, including zoom labels, the overview caption, and the crop reminder, so they remain readable at enlarged text sizes and in right-to-left layouts. In narrow spaces and at enlarged text sizes, the Zoom, Fit, and Pan actions stack at full width to leave comfortable room for their labels.

At a 390-pixel viewport in Fit mode, the inspector is 215 pixels tall, down from 317.5 pixels, leaving 102.5 more pixels for the drawing. The measured height also falls from 259 to 161 pixels at a 700-pixel viewport, and from 166 to 161 pixels at 1600 pixels.

A concise crop reminder remains visible while magnified, with its accent and rounded corners following right-to-left layouts. The comparison-link explanation remains outside the tips so the relationship between the drawings stays clear. The layout applies to the live workspace and focused experiment; recorded drawing inspectors retain their existing presentation.

The drawing retains its accessible pan and crop descriptions when the tips are closed, open, or the inspector is closed. The hidden description anchors reuse the same translated text as the visible instructions.

These changes improve the presentation of the existing viewing controls. Experiment calculations, saved-data formats, and exports remain unchanged. Two English labels are added; the previous 586 labels retain their values. Catalog delivery replaces only the Perception object in each current runtime catalog, preserving every unrelated byte.

## Verification

- **20 focused native Chromium groups passed**, covering the live inspector layout, native Viewing tips disclosure, crop reminder, pan and zoom controls, comparison views, keyboard and touch behavior, saved-state preservation, responsive layouts, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API, exported function implementations, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **588 English catalog entries** agree with both runtime Perception catalogs.
- **9 screenshots and 9 accessibility audits** document the final layouts. Every audit reported no violations.
- No existing regression test file changed in this pass. No older browser suite was rerun. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `7025a784e72e551be738a0b278a999fe27ca7167c61712d817200ce20aebe99a`.

## Evidence

- [Desktop inspector](browser/inspector-layout-1600.png)
- [Narrow phone inspector](browser/inspector-layout-320.png)
- [Phone inspector](browser/inspector-layout-390.png)
- [Inspector at the mobile breakpoint](browser/inspector-layout-700.png)
- [Inspector at 200% text](browser/inspector-layout-320-200.png)
- [Long labels and right-to-left layout](browser/inspector-layout-long-rtl-320-200.png)
- [Dark inspector](browser/inspector-layout-dark.png)
- [High-contrast inspector](browser/inspector-layout-contrast.png)
- [Forced-color inspector](browser/inspector-layout-forced.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](inspector-layout-evidence-manifest.json)
- [Focused native results](browser/inspector-layout-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_inspector_layout_qa.cjs)
- [Pure validator](validate-perception-inspector-layout.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-inspector-layout/validate-perception-inspector-layout.cjs`. The included baseline is the preceding scene toolbar version.

No staging or commit was performed. All changes remain uncommitted.
