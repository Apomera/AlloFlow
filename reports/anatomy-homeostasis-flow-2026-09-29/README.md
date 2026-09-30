# Anatomy Homeostasis and scan guidance

This pass makes the Homeostasis activities easier to read and preserves learners’ written work. It also corrects two mismatches between Imaging guidance and the rendered teaching scan.

## Homeostasis

- Named navigation actions move focus to the temperature experiment or reference readings. Both activities remain available on the page.
- Each reading has a larger value, its own teaching reference range, and an explicit below, within, or above label. The chart uses larger axis labels and shades the period when the disturbance is applied.
- Warm and cool experiments retain their own predictions and explanations. Returning to a completed comparison focuses its results. Predicting again preserves the explanation.
- Reset measurements restores the starting readings. Clear observations clears the table. Restart checks starts a new check attempt. Each action keeps written work, and restarting keeps the last completed score.
- Question groups show explanatory feedback, explicit answer labels, and keyboard focus after submission. Only valid answer choices count; older valid completed checks can be preserved on restart.
- Updates use the latest activity state. Duplicate or outdated answers cannot overwrite a newer attempt, and malformed saved observation cells are filtered before rendering.

## Imaging

The axial slice indicator now follows the painter’s superior-to-inferior sequence in the head, chest, and abdomen. Its locator moves in the same direction as the slice control. Regression checks also cover the coronal and sagittal mappings.

The scale bar and ruler now share the same phantom calibration: **0.8 mm per source pixel**. A bar labeled **50 mm** therefore spans **62.5 source pixels**. Verification measures the actual painted endpoints through the ruler at several display widths, including pointer rounding in the browser.

## Visuals and accessibility

Homeostasis has distinct activity sections, readable observation tables, larger inputs and feedback, visible keyboard focus, and clear action labels. The panel supports light, dark, high contrast, and larger text. The **35 new labels and 31 existing learner labels** have French, Latin American Spanish, and Arabic translations in both distributions, including all three questions and their answer choices.

Arabic scientific ranges keep their minimum-to-maximum value order in right-to-left text. Question wording spells out the lower and upper bounds.

## Verification

Final test counts, browser checks, source hashes, and locale checks are recorded in [verification.json](verification.json). The focused suites cover both anatomy sources. Browser checks exercise saved explanations, observation handling, check scoring and restart, keyboard navigation, responsive layouts, Arabic text, slice correspondence, and ruler calibration.

- **388 unique regression checks across 10 suites passed**, combining the final full run with the corrected 70-check legacy suite and six translation checks. The new suites include 42 Homeostasis checks and 24 Imaging checks.
- **Two browser walkthroughs passed** with zero browser errors.
- **15 scoped accessibility scans found zero violations** across four widths and three themes, including Arabic with larger text at 320 px. No tested layout had horizontal overflow.
- **Six slice-to-locator correspondences and 24 ruler measurements passed**. The largest distance rounding error was 0.9 mm, within the display’s pointer tolerance.
- Anatomy source copies and scoped language candidates match their desktop mirrors.

The accessibility checks are scoped to the changed Homeostasis panel and its compact controls. Imaging verification checks the rendered geometry and the locator. The web source and desktop mirror must match before the commit is prepared.

## Visual evidence

- [Before: phone checks](before-checks-phone.png)
- [After: desktop activity](after-desktop.png)
- [Reference readings on a phone](after-phone.png)
- [Answer feedback on a phone](retrieval-feedback-phone.png)
- [Temperature experiment on a phone](experiment-phone.png)
- [Dark theme feedback](after-dark.png)
- [Arabic with larger text at 320 px](arabic-320.png)
- [Corrected scan scale](imaging-guidance-390.png)
- [Matching axial locator](imaging-bodyscope-390.png)

## Commit scope

The commit includes the two anatomy sources, focused new tests, the six language catalogs with only the 66 scoped Homeostasis labels, this report, verification data, and the images above. Updated legacy assertions for slice position, keyboard shortcuts, camera controls, retrieval controls, and learning-level selection are included with `ANATOMY_COMMIT_EXTRA_TESTS=tests/microdissection_anatomy3d.test.js`. Locale candidates and anatomy changes use an isolated index so unrelated work can remain in the workspace.

Learning progress is stored locally in the activity. The scan is a synthetic teaching phantom.
