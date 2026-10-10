# Perception Lab: live settings comparison

The live settings comparison now keeps each changed setting beside its reference and current values on narrow screens. On wider screens it remains a three-column table. Compact rows repeat the existing column labels visually, while native table headers retain the relationships for assistive technology.

This is a presentation change to the existing comparison. Pinned and starting-view comparisons continue to use their own reference settings. Hidden matching values remain hidden, and the same-experiment requirement and empty comparison message remain unchanged. The table adds no controls or keyboard stops and does not alter saved data.

The layout supports enlarged text, long labels, right-to-left layouts, dark and high-contrast themes, and forced colors. Adjustment control labels also wrap long translated text to prevent it from extending past the workspace at narrow widths. All 584 existing English labels are reused without catalog changes. Engine calculations, exported engine function implementations, defaults, saved data, and exports remain unchanged.

## Verification

- **17 focused native Chromium groups passed**, covering reference and current values, hidden matching values, preserved state, responsive layouts, enlarged text, translated labels, themes, and accessibility.
- **84 baseline scene/model/measurement cases passed**. Engine API, exported function implementations, defaults, metadata, and measurements are unchanged. Source and desktop copies match. All **584 English catalog entries** remain unchanged and agree with both runtime Perception catalogs.
- **9 screenshots and 9 accessibility audits** document the final layouts. Every audit reported no violations.
- Three selectors in the existing matching regression test now read the value element, so repeated mobile column labels do not change the asserted values. The updated test file passes a syntax check; this is not a Vitest execution result.
- No older browser suite was rerun in this pass. The Vitest/jsdom DOM suite remains unexecuted because its existing worker stalls before collection; native browser and pure-engine checks provide separate evidence.

Source SHA256: `64e1feeb153f179311bbed8f7ee11dbb2ca188c6deaa5a64d8382387c1f24749`.

## Evidence

- [Desktop settings comparison](browser/drawing-changes-1600.png)
- [Narrow phone settings comparison](browser/drawing-changes-320.png)
- [Phone settings comparison](browser/drawing-changes-390.png)
- [Settings comparison at the mobile breakpoint](browser/drawing-changes-700.png)
- [Settings comparison at 200% text](browser/drawing-changes-320-200.png)
- [Long labels and right-to-left layout](browser/drawing-changes-long-rtl-320-200.png)
- [Dark settings comparison](browser/drawing-changes-dark.png)
- [High-contrast settings comparison](browser/drawing-changes-contrast.png)
- [Forced-color settings comparison](browser/drawing-changes-forced.png)
- [Verification summary](verification.json)
- [Browser evidence manifest](drawing-changes-evidence-manifest.json)
- [Focused native results](browser/drawing-changes-browser-results.json)
- [Baseline and catalog results](regression-validation.json)
- [Focused native regression runner](../../../dev-tools/perception_lab_drawing_changes_qa.cjs)
- [Updated matching regression test](../../../tests/perception_lab_matching.test.js)
- [Pure validator](validate-perception-drawing-changes.cjs)

Run the pure validator with `node reports/artstudio-workspace/perception-drawing-changes/validate-perception-drawing-changes.cjs`. The included baseline is the preceding drawing conditions version.

No staging or commit was performed. All changes remain uncommitted.
