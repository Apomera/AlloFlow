# Perception Lab: stationary saved-drawing comparison

Saved A/B reviews now offer **Switch drawings in one position**. Each complete recorded drawing occupies the same position and scale, so learners can inspect differences without scrolling between two drawings.

## Drawing and controls

- Choose **Drawing A** or **Drawing B**. With either button focused, Left/Right Arrow selects A/B; Home/End also selects the first/second drawing. Enter and Space retain normal button behavior.
- The A/B selector stays visible while scrolling through the drawings, making touch comparisons practical with enlarged text and long captions. Buttons use a full row when enlarged text needs more room.
- Each drawing keeps its independent trial selection, measurement guides, recorded impression, and full note. Switching layouts preserves those choices.
- Shared rows reserve space for both headings, toolbars, captions, and notes. Alternating A/B keeps the SVG drawing in place even when text lengths differ. Original scene trees and scientific colors are preserved.
- The inactive panel stays outside the accessibility tree and keyboard tab order. Switching programmatically while a control is focused returns focus to the visible drawing's selector. Escape closes the viewer through its existing behavior.
- Switching mode off restores the prior side-by-side or stacked layout. Selecting **Stack drawings for more space** from Switch mode always opens the stacked layout. Opening a new viewer starts in the regular layout.

The view preference is local to the enlarged review. Current experiment settings, saved observations, pinned comparisons, and notebook data remain unchanged. Existing eligibility and identity guards still prevent hidden or invalidated studies from remaining open. Single recorded drawings and ordinary observation reviews retain their existing behavior.

## Verification

- **37 native Chromium Switch check groups passed** across the saved browser runs below, with no page runtime errors. Coverage includes all three matching experiments, actual trial/guide geometry, stable A/B positioning, keyboard and touch, focus handling, layout transitions, invalidated studies, responsive presentation, RTL, themes, and accessibility checks.
- **60 existing viewer browser groups passed** on the same final source: 32 paired-viewer and 28 single-viewer groups.
- Native report verification checks that the exported A/B HTML report retains all six complete recorded drawings and notes after different local trial/guide choices in Switch mode.
- **84 baseline drawing/model/measurement combinations passed** with unchanged engine APIs, defaults, experiment metadata, and matching definitions. Compilation, byte-identical source/desktop copies, and all **561 English/runtime catalog entries** passed.
- **27 focused DOM regression cases** were added and passed syntax/static review. Their assertions remain **unexecuted** because the installed Vitest/jsdom worker stalls before collection; browser and pure-engine checks are separate evidence.
- Source review identified a Stack transition edge case, which was fixed and included in regression coverage. Scoped whitespace checks passed.

Source and desktop SHA256: `6b0604420affc9e6697ec2979e4ab3d854c297516a3ee5bf6999891a19d01cae`.

## Evidence

- [Desktop comparison](browser/switch-1600-16.png)
- [Phone at 200% text](browser/switch-390-32.png)
- [Dark theme](browser/switch-dark.png)
- [Right-to-left presentation](browser/switch-rtl.png)
- [Complete exported A/B report](browser/switch-complete-comparison-report.html)
- [Verification summary](verification.json)
- [switch browser results](browser/switch-browser-results.json)
- [switch edge browser results](browser/switch-edge-browser-results.json)
- [switch report browser results](browser/switch-report-browser-results.json)
- [Paired-viewer regression results](paired-viewer-regression-results.json)
- [Single-viewer regression results](single-viewer-regression-results.json)
- [Source, catalog, and baseline validation](regression-validation.json)
- [Native browser runner](../../../dev-tools/perception_lab_recorded_switch_qa.cjs)
- [DOM regression suite](../../../tests/perception_lab_recorded_switch.test.js)

Run the [pure validator](validate-perception-recorded-switch.cjs) with `node reports/artstudio-workspace/perception-recorded-switch/validate-perception-recorded-switch.cjs` from the repository. The included baseline is the preceding overview-navigator version.

No staging or commit was performed. All changes remain uncommitted.
