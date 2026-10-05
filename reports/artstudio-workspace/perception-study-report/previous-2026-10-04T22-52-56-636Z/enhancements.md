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

Final evidence will be recorded in [validation.json](validation.json).

The new verification files are `tests/perception_lab_study_report.test.js` and `dev-tools/perception_lab_study_report_qa.cjs`. Root and desktop implementations are mirrored, with the Perception English catalog synchronized. PDF fixtures used to check browser printing contain synthetic test observations, not a learner's notebook.
