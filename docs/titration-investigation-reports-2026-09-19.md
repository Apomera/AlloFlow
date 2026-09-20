# Titration investigation reports — September 19, 2026

Completed **Find and explain the endpoint** investigations now have a **Review report** action. Students can review their work in the bench, download a standalone HTML copy, and open that copy in a browser to print or save as PDF.

## Report contents

- The reaction, indicator, starting sample volume and concentration.
- The student's prediction, saved color-change interval, and equivalence volume for the activity.
- The starting reading and the exact pair reviewed before the conclusion, with notebook IDs, added volumes, and pH values.
- The student's conclusion and any saved notes attached to those three readings.
- A reminder that completion is not an automatic grade and that the simulation's 0.1 mL resolution supports an interval.

The example report in the validation folder contains demonstration answers, not student work. The report excludes unrelated notebook entries. The ordinary notebook CSV remains available for all saved readings and notes.

## Evidence, interaction, and accessibility

The report comes from validated saved evidence. Changing the live volume, reaction, or indicator cannot substitute the current flask readings for the student's evidence. It remains available after returning to free exploration or choosing another setup. Editing the conclusion or removing required evidence hides the report until the investigation is completed again. Editing a saved observation note updates the preview and the next download; previously downloaded copies remain unchanged.

Opening the preview focuses its heading. Close and Escape return focus to **Review report**. Leaving the guide now focuses **Resume investigation** when a saved investigation exists. The preview has an accessible evidence table, wraps long student text, stacks its summary on narrow screens, and supports forced colors. The light preview uses a darker focus outline.

Downloads include their own styles, print button, semantic table, and language/direction attributes, with no external assets. Student text and labels are escaped; truncated Unicode surrogate pairs are normalized so they cannot break the download link. Creating or opening a report does not alter the saved investigation or send it to a teacher. Sharing is a separate student or teacher action.

The report uses the existing fixed version-1 activity: 25.0 mL of 0.1 M HCl, 0.1 M NaOH, and phenolphthalein. A future activity with different quantities needs its own report setup metadata. No chemistry calculations were changed.

The [prediction and evidence diagram follow-up](titration-prediction-diagram-2026-09-19.md) adds a visual comparison to the preview and downloaded report, with its own updated verification record.

## Initial report validation

The final run passed **23 tests across three suites** and **44 scoped browser accessibility/layout scans**, with no browser page errors. The browser fixture completes the activity using actual additions and notebook controls, downloads and opens the real HTML file, checks the print action and print CSS, and exercises keyboard handling, pause/resume, other setups, missing evidence, long/hostile text, Unicode truncation, serialization, the 3D viewer, and WebGL fallback.

Scans cover 1200- and 320-pixel widths. Normal-mode scans include axe contrast checks. Forced-color scans omit that rule because of axe's limitation in that mode. Desktop, mobile, print-media, and forced-color screenshots were visually inspected. Printing was checked with print-media emulation and a stubbed print dialog; physical printer output and PDF pagination have not been manually tested.

An earlier isolated-worker attempt encountered a Vitest fork startup timeout. The final run used one reusable fork and completed all 23 tests successfully. See the validation JSON for the exact command and results.

Source/public copies match, syntax and scoped whitespace checks pass, and all 14 new English strings match their fallbacks. Other-language translations remain pending. No dependencies were added and no deployment was performed.

- [Example downloaded report](../reports/chemistry-refinement-2026-09-06/alloflow-titration-investigation.html)
- [Desktop report preview](../reports/chemistry-refinement-2026-09-06/titration-investigation-report-paper.jpg)
- [Validation record](../reports/chemistry-refinement-2026-09-06/titration-investigation-report-validation.json)

Browser rerun: node reports/chemistry-refinement-2026-09-06/titration-investigation-report-browser.cjs
