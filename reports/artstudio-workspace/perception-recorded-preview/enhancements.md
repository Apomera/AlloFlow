# Perception Lab: inspect recorded drawings

Updated October 4, 2026. Changes are left uncommitted.

Revealed three-match studies now connect their recorded values to the drawings that produced them. A **Recorded drawing** panel is available after revealing the active study and when reviewing a complete revealed saved study. Ready A/B comparisons include a separate preview for each study.

## Inspect actual trials

Choose Trial 1, 2, or 3 to see that trial's saved target sizes or gray fills, surroundings, impression, date, and full observation note. The preview uses the existing experiment renderer and the actual saved trial model. It does not synthesize a drawing from the median. Measurement guides can be toggled for each preview; the revealed recorded-value readout remains available.

A and B have independent trial selectors and guide toggles. Both SVG drawings use the same 800 by 480 drawing coordinate system and equal columns on wide layouts; they stack on narrower screens. The existing comparison results retain their starting-position and multiple-setting warnings. Selecting the same trial number does not establish identical starting positions or paired measurements.

## Preserve drafts and reveal boundaries

Preview controls are transient. They do not write notebook records, alter current experiment settings, change pinned drawings, or affect export content. Filters preserve open previews and their selections. Changing the study, comparison pair, retained study contents, or learner profile resets the affected previews to Trial 1 with guides enabled.

Each preview rechecks the current retained group. Missing or partial groups, inconsistent settings, duplicate trial numbers, incompatible pairs, and studies with any hidden member cannot expose a recorded scene. Deleting a retained match removes the affected previews immediately. Restoring a valid study through Undo starts with the default preview controls.

The existing notebook revision guard closes saved reviews when notebook data is replaced externally. Reopening the current study shows its updated records with default preview controls; a stale drawing cannot remain available through the previous review.

Each SVG has distinct title and description identifiers for its active, review, A, or B slot. Native trial selectors and pressed-state guide buttons carry their preview context. Author-written notes are rendered as text and preserved up to the existing 500-character limit. The drawings retain a white background and their original colors while surrounding controls follow the selected theme and Windows forced colors.

## Verification

Final validation passed all 63 new recorded-preview tests and all 374 existing Perception tests, for 437 unique current-source tests across ten files. Chromium passed 42 recorded-preview, 26 finder, 25 guided-study, and 23 comparison groups (116 total), with no reported browser errors. Every recorded WCAG-tagged axe stage was clear. Five viewport widths, 44-pixel controls, dark/high-contrast/Windows forced-color themes, and 200% text passed reflow checks. Phone and theme panels were visually reviewed. All 339 Perception English entries, source mirrors, discovery, and integration checks passed.

See [validation.json](validation.json) for final results, hashes, and integration checks. The new verification files are `tests/perception_lab_recorded_preview.test.js` and `dev-tools/perception_lab_recorded_preview_qa.cjs`. Root and desktop implementations are mirrored, with the Perception English catalog synchronized.

The [browser aggregate](browser-regression-results.json) preserves the verification history. Two earlier guided-study runs failed an immediate completion-view assertion ([first](guided-regression/guided-browser-first-attempt-failure.json), [second](guided-regression/guided-browser-second-attempt-failure.json)). A separate diagnostic observed correct completed studies and A/B selections immediately and after two paints for all three matching experiments. The final unchanged guided regression passed all 25 groups; the earlier failure cause was not conclusively reproduced. No prior regression assertions or product source were changed to obtain the passing result.

## Previews

- [Phone recorded trial](recorded-preview-a-panel-390.png)
- [Desktop recorded trial](recorded-preview-review-panel-1600.png)
- [Dark theme](recorded-preview-dark-b-panel.png)
- [Windows dark forced colors](recorded-preview-forced-dark-b-panel.png)
- [200% text](recorded-preview-large-text.png)
