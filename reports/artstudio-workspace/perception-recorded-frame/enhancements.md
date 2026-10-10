# Perception Lab: drawing-adjacent viewing controls

Enlarged saved trial drawings now keep their viewing state beside the artwork. **Whole drawing** offers **Inspect**; a magnified drawing shows its percentage and **Cropped view**, with **Fit** to restore the complete drawing.

The local action uses the existing shared A/B camera. Inspect opens the controls and focuses the zoom selector. Fit resets both drawings and leaves focus on the same nearby button. Drawing rows stay aligned in Switch mode even when labels wrap. Ordinary observations, saved records, notes, and complete report drawings are unchanged.

## Verification

- **27 focused native Chromium groups passed**, including shared camera state, local action/focus behavior, native input, actual SVG projection, translated label wrapping, responsive layouts, and complete report export.
- **41 existing native groups passed**: saved-drawing inspector 37 and Switch edge cases 4. This pass totals **68 browser groups**.
- **84 baseline scene/model/measurement cases passed**. Engine API, defaults, metadata, and measurements are unchanged; source/desktop copies match and all **564 English catalog entries** agree.
- **24 screenshots and 16 accessibility audits** cover narrow and wide layouts, 200% text, longer translated labels, dark and contrast modes, forced colors, and RTL. Every audit reported no violations.
- Existing Vitest/jsdom DOM suites remain unexecuted because their worker stalls before collection. Native browser and pure-engine checks provide separate evidence.

Source SHA256: `689692a6622b638365b432c00949833e65092445bede9b294a24883f94f11df1`.

## Evidence

- [Desktop cropped drawing](browser/recorded-frame-1600-16-cropped.png)
- [Desktop complete drawing](browser/recorded-frame-1600-16-whole.png)
- [Phone at 200% text](browser/recorded-frame-390-32-cropped.png)
- [Phone after Fit](browser/recorded-frame-390-32-whole.png)
- [Long translated labels](browser/recorded-frame-long-390.png)
- [Dark view](browser/recorded-frame-dark.png)
- [Complete exported report](browser/recorded-frame-complete-comparison-report.html)
- [Verification summary](verification.json)
- [Browser evidence manifest](browser-evidence-manifest.json)
- [Focused native results](browser/recorded-frame-browser-results.json)
- [Inspector regression](recorded-inspector-browser-results.json)
- [Switch edge regression](switch-edge-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Native regression runner](../../../dev-tools/perception_lab_recorded_frame_qa.cjs)
- [Pure validator](validate-perception-recorded-frame.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-recorded-frame/validate-perception-recorded-frame.cjs`. The included baseline is the preceding saved-drawing inspector version.

No staging or commit was performed. All changes remain uncommitted.
