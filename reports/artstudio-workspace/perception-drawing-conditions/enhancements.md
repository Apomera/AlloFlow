# Perception Lab: drawing conditions

Current and reference drawing captions now identify whether surroundings and guides are visible. Each caption describes its own drawing's settings, making differences between the live experiment and a pinned reference easier to read.

The labels appear in normal, switched, sliding, and focused drawing views. Switch view places the conditions in a shared space above the drawing, reserving room for either set of labels and exposing only the selected drawing's conditions visually and to assistive technology. For the cube experiment, the caption identifies the lower-left or upper-right face cue, or the absence of a face cue, instead of describing general surroundings. The labels are passive text and introduce no new controls.

The captions support enlarged text, long labels, right-to-left layouts, dark and high-contrast themes, and forced colors. This pass adds five English labels. Engine calculations, exported engine function implementations, defaults, saved data, and exports remain unchanged.

## Verification

- **17 focused native Chromium groups passed**, covering independent current and reference drawing conditions, cube face cues, drawing modes, preserved state, responsive layouts, enlarged text, translated labels, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API, exported function implementations, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **584 English catalog entries** agree, including the five new labels.
- **9 screenshots and 9 accessibility audits** document the final layouts. Every audit reported no violations.
- Explicit text-contrast checks in both light and dark forced-color modes passed at **4.5:1 or better** for the condition labels.
- No older browser suite was rerun in this pass. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `0172a87887dfded48dcdaed4465e232882bfc890e9f8e353c90885ee0749f3ab`.

## Evidence

- [Desktop drawing conditions](browser/drawing-conditions-1600.png)
- [Narrow phone drawing conditions](browser/drawing-conditions-320.png)
- [Phone drawing conditions](browser/drawing-conditions-390.png)
- [Drawing conditions at the mobile breakpoint](browser/drawing-conditions-700.png)
- [Drawing conditions at 200% text](browser/drawing-conditions-320-200.png)
- [Long labels and right-to-left layout](browser/drawing-conditions-long-rtl-320-200.png)
- [Dark drawing conditions](browser/drawing-conditions-dark.png)
- [High-contrast drawing conditions](browser/drawing-conditions-contrast.png)
- [Forced-color drawing conditions](browser/drawing-conditions-forced.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](drawing-conditions-evidence-manifest.json)
- [Focused native results](browser/drawing-conditions-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_drawing_conditions_qa.cjs)
- [Pure validator](validate-perception-drawing-conditions.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-drawing-conditions/validate-perception-drawing-conditions.cjs`. The included baseline is the preceding mobile experiment preview gallery version.

No staging or commit was performed. All changes remain uncommitted.
