# Perception Lab: compare saved matching studies

Updated October 3, 2026. Changes are left uncommitted.

Saved three-match studies can now be compared under the same experiment and reference. Open **Review study**, then select a second saved study. Each study has its own reveal action; selecting a study does not reveal its drawing values. Results appear only after both complete, consistent studies are revealed.

The shared-scale plot shows all six matches, both medians, and the fixed reference. A table keeps each study's starting positions, recorded values, range, and difference from the reference readable without relying on the plot. **Median shift · B minus A** uses RGB-code steps for brightness and drawing units for geometry; the geometric percentage uses the fixed reference.

The comparison explains which surrounding settings changed, whether settings were inactive because context was hidden, and whether starting positions differed. When several settings changed, it describes the comparison without claiming that one setting caused the shift. Predictions and notes are not treated as changed drawing settings.

## Notebook behavior

- The selector explains unavailable studies: incomplete or conflicting records, different experiments, and different references.
- Reviewing and revealing saved studies preserves the current drawing and pinned view.
- Deletion and the notebook's 24-observation limit immediately remove derived results when either selected study becomes incomplete. Undo can restore the comparison.
- Deferred reveals check the latest notebook and selected pair. Replacing the notebook or switching profile expires the action and its success feedback.
- Deleting an observation clears previous reveal feedback so it cannot overwrite the deletion and Undo announcement.

## Layout and accessibility

The plot uses a common value scale and distinct study markers. The complete data remains available in a table. The selector, reveal controls, headings, and focus transitions support keyboard use. Phone layouts wrap the comparison table and controls without horizontal scrolling.

Windows forced colors now overrides the authored theme variables and reading-link colors correctly. The system-color selectors match the dark and high-contrast selectors in specificity, so the later media rules take effect. Pressed buttons use the system Highlight and HighlightText colors and prevent additional text backplates from hiding their labels. This adjustment is scoped to selected buttons, which already use paired system colors, consistent with the [CSS Color Adjustment specification](https://drafts.csswg.org/css-color-adjust/#forced-color-adjust-prop). The visual stimulus retains its original drawing colors.

## Verification

Detailed evidence and source hashes are recorded in [validation.json](validation.json). The evidence distinguishes earlier passing tests from final-source checks and retains test-runner failures rather than counting them as passes.

Earlier in this enhancement pass, 161 existing Perception tests and 41 new comparison tests passed. A final regression assertion was then added for deletion feedback. Subsequent Vitest runs failed before any tests could execute because worker startup timed out, under both fork and thread pools. The standalone React/JSDOM feedback check and Chromium report provide the final-source verification listed in the validation file.

- The final-source standalone React/JSDOM probe passed four groups: independent reveal and shift, accurate deletion feedback while preserving the selected pair, Undo restoration, and clear/focus behavior.
- The final-source Chromium suite passed 23 groups with no browser errors. It checks all three matching experiments, independent reveals, changed settings and starting positions, incompatible options, Delete/Undo, notebook limits, stale actions, profile changes, and 320/390/768/1280/1600-pixel layouts.
- WCAG-tagged axe audits passed in hidden and revealed views at all five widths, with 44-pixel controls and no horizontal overflow. Dark theme, high-contrast theme, 200% text, forced dark colors, and forced high-contrast colors passed. No accessibility rule was disabled. The browser's loaded and final source hashes match.
- The pre-fix forced-color diagnostic is retained in `before-fix`, alongside the final passing audit, so the theme-cascade issue and its correction remain reviewable.

An automated contrast audit missed the selected-label paint issue. The final browser suite also checks rendered label contrast, including the smaller family label's opacity, and PNG text-region coverage to detect solid backplates hiding letter shapes. Revealed reading links and both light and dark system palettes are checked explicitly. The earlier clean audit and blocked-label captures are retained in `before-label-fix`.

The root and desktop plugin sources and the 254 Perception English entries are synchronized. Discovery verification preserves all 150 earlier catalog records and the 151-tool index; Perception Lab routing and loaders remain available.

## Previews

- [Comparison on a phone](comparison-panel-390.png)
- [Comparison on a desktop](comparison-panel-1600.png)
- [Dark theme](comparison-dark.png)
- [200% text](comparison-large-text.png)
- [Windows forced colors](comparison-forced-colors.png)

Three matches per study describe a small set of observations. These values are not a score, a calibrated display measurement, or proof that one surrounding setting caused a perceptual change.

Implementation: `stem_lab/stem_tool_perception.js` and its desktop mirror. Verification: `tests/perception_lab_study_comparison.test.js` and `dev-tools/perception_lab_study_compare_qa.cjs`.
