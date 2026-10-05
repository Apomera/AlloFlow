# Perception Lab: portable study reports

Updated October 4, 2026. Changes are left uncommitted.

Revealed three-match studies now include **Export study report**. Ready A/B comparisons include **Export comparison report**. Each action downloads a standalone HTML file that can be opened in a browser and printed through its ordinary print dialog.

## Recorded evidence in one file

A study report contains all three actual recorded drawings, full observation notes, impressions, valid saved dates, starting values, recorded matches, and signed differences from the fixed reference. It also includes the recorded settings, median, range, and interpretation guidance. Preview trial selections and guide toggles do not restrict report content; every drawing includes its measurement guides.

A comparison report includes both complete studies and their six actual drawings. Its summary retains the B-minus-A median shift, changed settings, and warnings for different starting positions, multiple active setting changes, or inactive surroundings. Brightness uses RGB for absolute gray values and RGB-code steps for differences; it does not imply a percentage brightness change. No drawing is synthesized from a median.

## Portable and readable

The exported file contains its own styles and native SVG drawings. It needs no network resources or scripts. Author-written notes and translated labels are serialized as text, with a restrictive content security policy. The footer retains the selected experiment's scientific reference link.

Phone layouts stack the drawings. Wide layouts show three trials together. Print styles use white paper, dark text, visible borders, and keep individual trial cards together. Each SVG has its own accessible title and description. Surrounding text follows Windows forced colors while drawings preserve their original colors and white background.

## Current saved results only

Export rechecks the current notebook when clicked. Incomplete, hidden, inconsistent, missing, or incompatible studies cannot create a report. Exporting preserves the current experiment draft, pins, notebook, filters, review selections, and preview controls. The report is a snapshot; later notebook changes do not update an already downloaded file.

## Verification

Final validation passed all 78 new report tests and all 437 existing Perception tests, for 515 unique current-source tests across eleven files. Chromium passed 36 report, 42 recorded-preview, 25 guided-study, and 23 comparison groups (126 total), with no reported browser errors or unexpected report network requests. Every recorded WCAG-tagged axe stage was clear. Five viewport widths, 44-pixel controls, Windows forced colors, and 200% text passed reflow checks. Both printed fixture PDFs were rendered with Poppler; all seven pages were visually inspected and all nine complete 500-character notes verified by per-column PDF text extraction. All 354 Perception English entries, source mirrors, discovery, and integration checks passed.

See [validation.json](validation.json) for final results, hashes, and integration checks.

The new verification files are `tests/perception_lab_study_report.test.js` and `dev-tools/perception_lab_study_report_qa.cjs`. Root and desktop implementations are mirrored, with the Perception English catalog synchronized. PDF fixtures used to check browser printing contain synthetic test observations, not a learner's notebook.

Initial checks and their diagnostics are retained. The new test harness needed native Blob delegation, correct absolute RGB expectations, and isolation of download cleanup timers. The first existing-test launch used an unsupported Vitest option and started no tests; the corrected launcher retains one fork worker. These were harness changes, with existing tests unchanged.

The first print review found a Study A section heading separated from its results. A print-only page break corrected that layout before the final source was frozen and retested. The guided-study browser check also captured an immediate locator count before React finished its completion commit. The next page snapshot already contained the complete study, review, comparison selection, and completion announcement; an unchanged final regression passed. See the [browser aggregate](browser-regression-results.json), [retained failure](guided-regression/guided-browser-failure.json), and [timing diagnostic](guided-diagnostic/ebbinghaus-completion-timing.json) for that distinction.

## Previews

- [Phone report](report-artifact-390.png)
- [Wide report](report-artifact-1600.png)
- [Windows dark forced colors](report-forced-dark-b-panel.png)
- [200% text](report-large-text-a-panel.png)
- [Print verification](print/print-verification.json)
- [Brightness print fixture](print/brightness-single-500-character-notes.pdf)
- [A/B print fixture](print/muller-lyer-comparison-500-character-notes.pdf)
