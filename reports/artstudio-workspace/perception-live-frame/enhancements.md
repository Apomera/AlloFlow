# Perception Lab: see the whole drawing

Magnified drawings now show a “Cropped view” indicator beside a direct Fit whole drawing shortcut. The status remains available when the inspection controls are closed, making the relationship between the visible crop and the whole experiment clear.

Fit whole drawing restores the shared camera to the whole image, then moves keyboard focus and scrolls the visible drawing into view. It follows the current comparison view in both the normal workspace and the focused experiment. This is a viewing action: it does not select an impression, record a result, change saved experiment data, or write tool state.

The status appears only while the drawing is magnified. It supports narrow screens, enlarged text, right-to-left layouts, dark and high-contrast themes, and forced colors. It reuses existing labels. All 586 English labels retain their values. Engine calculations, exported engine function implementations, defaults, saved-data formats, and exports remain unchanged.

## Verification

- **19 focused native Chromium groups passed**, covering the magnified drawing status, fitting the whole drawing, keyboard focus, comparison views, saved-state preservation, matching boundaries, responsive layouts, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API, exported function implementations, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **586 English catalog entries** agree with both runtime Perception catalogs.
- **9 screenshots and 9 accessibility audits** document the final layouts. Every audit reported no violations.
- No existing regression test file changed in this pass. No older browser suite was rerun. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `96d8b48cec2f0e5f84016d9b8f8fed310068cbb7a42dc7a60334b2127fb92b49`.

## Evidence

- [Desktop magnified drawing](browser/live-frame-1600.png)
- [Narrow phone magnified drawing](browser/live-frame-320.png)
- [Phone magnified drawing](browser/live-frame-390.png)
- [Magnified drawing at the mobile breakpoint](browser/live-frame-700.png)
- [Magnified drawing at 200% text](browser/live-frame-320-200.png)
- [Long labels and right-to-left layout](browser/live-frame-long-rtl-320-200.png)
- [Dark magnified drawing](browser/live-frame-dark.png)
- [High-contrast magnified drawing](browser/live-frame-contrast.png)
- [Forced-color magnified drawing](browser/live-frame-forced.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](live-frame-evidence-manifest.json)
- [Focused native results](browser/live-frame-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_live_frame_qa.cjs)
- [Pure validator](validate-perception-live-frame.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-live-frame/validate-perception-live-frame.cjs`. The included baseline is the preceding drawing return version.

No staging or commit was performed. All changes remain uncommitted.
