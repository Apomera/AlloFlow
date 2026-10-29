# Rocks & Minerals learning workspaces

The Rocks & Minerals tool now connects reference study, field identification, and a saved evidence portfolio. These activities run locally without AI requests.

## Specimen catalogues

Both specimen catalogues also support search and sorting. Search names, textures, properties, uses, or formulae; combine search with a rock-family filter, or sort minerals by hardness or density. Results are announced without moving focus while typing. Opening a specimen focuses its card, and **Back to specimens** returns to the selected tile or search field. The activity skip link and retained quiz round make it easier to move between investigations.

The detail card's **Previous specimen** and **Next specimen** controls follow the displayed, filtered order and show their destination names. A position counter gives context, endpoints stay disabled, and moving between specimens focuses the new heading. Search, sort, family filters, saved work, and lab-result ownership are preserved. A specimen opened from another activity can remain outside the current filters; **First matching specimen** offers a direct return to the filtered sequence when results exist.

Open a specimen's **My specimen notes** panel to bookmark it, record observations, or write a question to investigate. **My saved specimens** filters to bookmarks and written work; search also includes your own notes and questions. Writing is bounded to 3,000 characters for a note and 1,000 for a question. These personal records do not award identification credit or mark an unknown as solved. Removing a bookmark keeps existing writing.

## Compare

Open **Compare** to place any two of the 24 rocks or 23 minerals beside each other. Search by name, property, or use, or start with a suggested pair. Rock comparisons use texture, formation, and diagnostic clues. Mineral comparisons include formula, hardness, luster, streak, cleavage, density, crystal system, and occurrence. The scratch comparison applies the same reference to both specimens and marks equal modeled hardness as uncertain.

The differences filter hides shared rows without removing them from the exported report. Explanations are retained for each pair, including when its order is reversed. Download a text notebook or display selectable text when downloads are unavailable. Reference facts are explicitly distinguished from observations of an unknown specimen.

Rock and mineral look-alike panels offer **Compare these specimens**, opening that exact pair and retaining existing pair explanations and catalogue filters. The handoff clears an old displayed report so it cannot be mistaken for the newly selected pair.

## Focused quiz practice

After a round, choose **Practise all missed questions** or **Practise weakest topic**. Practice uses the existing question bank and maintains a separate answer trail, progress count, feedback, and completion score. Return to the original results and resume practice later, or retry only the questions still missed. The original first-try score, vocabulary progress, and earned points stay unchanged. Starting a new full round clears the previous practice.

Practice retains the quiz's keyboard rules, explicit answer/correctness labels, persistent live feedback, and focus transitions. Modified keystrokes and IME composition are ignored by the shortcuts. Saved queues and answers are validated against the original missed questions and current bank; saved feedback text is never trusted as a result.

## Field cases

Open **Field cases** for six authored investigations: an exposed mountain core, a pebble-bearing cliff, a carbonate contact, a resistant ridge, a roofing quarry, and a floating volcanic stone. Each includes an accessible setting sketch and four observations to collect.

Learners choose a rock, cite collected observations, and write a reasoned explanation. Checks assess the selected identification and diagnostic evidence. Written reasoning remains available for learner or teacher review; it is not automatically graded for scientific correctness. Successful cases reveal an interpretation, comparisons with alternatives, limits of the evidence, and a primary geology reference.

Cases retain independent progress and up to 30 distinct recent attempts per case. Notebook exports contain observations, claims, reasoning, and revisions; unfinished cases do not disclose the answer. Clipboard failures expose selectable text.

## Workbench portfolio

Successful mineral identifications now save a report containing the observation trail, cited evidence, reasoning, and confidence. The portfolio retains the latest 30 reports when a new unknown is drawn. Learners can add reflections and download one report or the portfolio. Repeated submission of the same solved specimen does not duplicate a report. Clipboard success is announced only after the copy promise resolves.

## Density lab

Open **Density lab** to investigate seven representative minerals with a virtual balance and graduated cylinder. Change specimen size or starting water level, make a prediction, and take separate dry-mass, initial-water, and final-water readings. Calculate density from the displayed mass and the rise in water level. The lab accepts g/cm³, g/mL, and kg/m³ and gives specific feedback for common subtraction, division, mass-versus-density, and conversion errors.

Recording a trial preserves its measurements, answer, prediction, and explanation. Compare the same mineral at different sizes or different minerals at equal volume, using a mass-versus-volume plot and a keyboard-scrollable table. The lab retains 30 trials and exports a readable investigation report. Calculations account for rounding on the balance; written explanations are retained for discussion rather than automatically graded. The model assumes uniform composition, complete immersion, and no pores, trapped bubbles, or reaction with water; these limits are stated alongside the activity.

## Unified notebook and portable work

Open **Notebook** to review specimen notes, bookmarks, and questions; resume comparison explanations and individual field cases; revisit density trials; and read completed mineral reports. **Continue studying** reopens the exact specimen and focuses its journal heading while preserving catalogue filters. A readable report includes unfinished written work and cited evidence without revealing unfinished field-case interpretations.

The specimen journal has illustrated, expandable cards sorted by name. Search saved specimen names, observations, or questions, then narrow to **Bookmarked** or **Has questions**. A live count and empty state explain the result; **Reset journal filters** returns focus to search. These are view preferences only: readable reports and portable notebook files always include every saved record.

**Save notebook file** now creates a version 2 JSON file containing all five sections. **Open a saved notebook** checks the file before showing a preview; the learner then explicitly chooses whether to replace current notebook records, including empty sections. Version 1 files remain supported and preserve the current specimen journal because older files did not contain one. The preview explains this distinction. Invalid, oversized, or unsupported files leave existing work unchanged. Opening a valid file preserves the active mineral workbench sample, quiz progress, and other tools. The active workbench sample is deliberately excluded from portable files; completed reports are included. Files have a 1 MB UTF-8 limit, and selectable text remains available when downloads fail.

## Visual presentation

Activities now have a dedicated navigation row with consistent outline icons and labels that wrap with enlarged text. Research progress and the rock collection use keyboard-accessible expandable summaries, bringing the working area higher on small screens. Catalogue cards show larger specimen drawings, readable texture/luster labels, and a clear selected state. Comparison specimens have numbered display areas and an explicit illustration-scale caption.

The density workspace has numbered steps, a refined balance and cylinder diagram, prominent measurement readouts, and more readable trial tables. On narrow screens the instruments and plot scroll within their own keyboard-accessible regions, preserving legible markings. The Mohs scale and mineral evidence table are also keyboard-scrollable. Presentation styles remain scoped to Rocks & Minerals, respect reduced motion, and distinguish selected controls in forced-colors mode.

Specimen detail controls wrap into a compact navigation strip with 44-pixel targets. Journal cards distinguish specimen kind and bookmark status with text as well as drawings. Workbench property-guide tiles expand with their captions instead of clipping enlarged or widely spaced text inside fixed squares.

## Integration

- Source: `stem_lab/stem_tool_rocks.js`; synchronized deployment copy: `desktop/web-app/public/stem_lab/stem_tool_rocks.js`.
- Host state: `rocks.compare`, `rocks.fieldCases`, `rocks.densityLab`, `rocks.wb.archive`, `rocks.specimenNotes`, and `rocks.quizPractice`; transient notebook controls use `rocks.notebookUi`. No extra network or storage dependencies. Quiz practice stays in the session and is not included in notebook exports.
- English keys are registered under `stem.rocks` in both `ui_strings.js` copies. Existing language packs may use English fallback for the new content until translated.
- New suites: `tests/rocks_comparison.test.js`, `tests/rocks_field_cases.test.js`, and `tests/rocks_workbench_archive.test.js`.
- Density and portable-work suites: `tests/rocks_density_lab.test.js`, `tests/rocks_notebook.test.js`, and `tests/rocks_notebook_codec.test.js`.
- Browser QA exercises keyboard navigation, actual notebook downloads, revisions, phone layouts, and axe accessibility checks. Detailed local results are in `tmp/rocks-enhancement/browser-results.json`.

## Verification

The latest navigation/journal pass passed all 1,003 tests across 42 files and all 20 browser workflows. Its 99 layout checks found no core rule violations, unresolved meaningful-label mismatches, overflow, clipping, or browser errors. [Navigation and journal evidence](rocks-minerals-navigation-evidence.json) records the exact scope and remaining validation boundaries.

The broader accessibility implementation, repeatable browser runner, and review boundaries are documented in [Rocks & Minerals accessibility review](rocks-minerals-accessibility.md).

The study-journal and practice pass verified 983 unique tests across the full run and targeted reruns. The browser checks passed all 18 workflows and 152 layouts across 38 states; additional checks cover the new states in forced colors/reduced motion and the final practice boundary refinement. [Study improvement evidence](rocks-minerals-study-evidence.json) records source hashes, test outcomes, reviewed findings, screenshots, and the tool-level scope. The codec tests now extract the real implementation from the source file, removing their former dependency on a temporary snapshot.

The latest general/accessibility pass adds catalogue search and sorting, a landscape transformation selector, preserved quiz rounds, improved keyboard focus and live feedback, complete visible-label names, and comparison translation coverage. It passed the full 924-test Rocks/Rock Cycle run and an additional translation regression (925 unique passing checks across the full run and targeted comparison rerun). See the accessibility review for the final browser evidence and the remaining assistive-technology validation boundary.

The 801 Rocks and Rock Cycle checks passed across the full run and targeted reruns, including 33 new comparison, field-case, and portfolio tests. The final browser run passed 12 workflow checks, verified both downloaded files and Blob cleanup, and found no axe WCAG A/AA violations in four new-mode states. Comparison, field cases, and landscape navigation fit a 390-pixel viewport without horizontal overflow. Source/public tool files and the rocks translation registries match.

The repository-wide STEM registration check reports zero unregistered Rocks keys. Its overall gate still reports unrelated keys in aquarium, butterfly, magnetism, and stewardship; those tools were outside this change.

The second enhancement pass passed all 220 tests across nine focused suites, including 82 new density, notebook, and codec checks (`tmp/rocks-enhancement-2/final-tests.json`). Its browser report is at `tmp/rocks-enhancement-2/browser-results.json`. Ten workflows cover density trials, readable and portable exports, invalid-file rejection, import preview/cancel/restore, preserved active work, and resumed investigations. Axe found no WCAG A/AA violations in four new-mode states. Both modes fit a 390-pixel phone viewport; the density table scrolls with the keyboard, and import controls return focus after closing the preview.

The visual pass passed 315 focused tests across 13 suites, followed by a targeted rerun after the final responsive refinements. Browser verification passed 13 checks across seven modes at 1280, 390, and 320 pixels, with no runtime errors or axe WCAG A/AA violations. Checks include all activity buttons, expandable summaries, keyboard scrolling, enlarged text, reduced motion, and forced-colors selection and diagrams. The final report and 32 screenshots are in `tmp/rocks-enhancement-3/visual-results.json`; test results are in `final-tests.json` and `final-touched-tests.json` in the same directory. Source/public files and the Rocks translation registries match.

## Science references

New reference guidance uses the [National Park Service mineral overview](https://www.nps.gov/subjects/geology/minerals.htm) and [USGS distinction between rocks and minerals](https://www.usgs.gov/faqs/what-difference-between-a-rock-and-a-mineral). Each field case links its supporting source in the debrief.

Existing catalogue corrections replace the siltstone teeth test with grain-size and breakage observations; clarify [blue topaz irradiation and heating](https://www.gia.edu/gems-gemology/spring-1985-topaz-color-nassau); and describe [garnet composition and surrounding minerals](https://commonminerals.esci.umn.edu/minerals-g-m/garnet), rather than crystal size alone, as evidence of metamorphic conditions.
