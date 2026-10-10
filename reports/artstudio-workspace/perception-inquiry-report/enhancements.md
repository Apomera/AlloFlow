# Perception Lab: inquiry reports

**Export inquiry report** makes the evidence from **Try one change** durable. Café wall, ambiguous cube, and moiré can now export a standalone HTML file with both the fixed starting view and current drawing at the same scale. Each drawing keeps its own measurement-guide visibility, impression, and full normalized note. The chosen setting, all starting/current values, and exact drawing-setting changes appear in accessible tables, followed by the existing reflection prompt and scientific reference.

The report distinguishes a change to the chosen setting from other changes, multiple changes, and unchanged drawing settings. Measurement guides are listed separately; a warning identifies differing guide visibility because that difference is excluded from the drawing-setting count. Hidden-grid and face-cue caveats remain explicit. Missing notes and impressions say **Not recorded**. The only date is report generation time; no capture time is invented.

Export uses independent normalized snapshots and does not write tool data, move focus, pause moiré, replace the fixed starting view, or alter the saved pin/notebook. A moving moiré report records the angle visible at activation, while animation continues. Numeric edits apply on native blur before the report is generated. Switch-view layout can show either drawing; the report always contains both snapshots.

The action is available after capture and guarded during pending capture/restore, imports, studies, matching starts, and focused experiment browsing. Requesting another experiment immediately invalidates the temporary report session before a delayed parent update commits; local renders cannot resurrect it. Reselecting the current experiment retains its baseline. Report creation and download errors use the existing recoverable feedback and URL cleanup.

Reports use safe text DOM APIs for notes and translations, unique SVG accessibility labels, embedded styles, and a script-blocking Content Security Policy. They contain no learner/profile identifiers or unrelated experiment/notebook data and make no external resource requests. Two equal-scale drawings sit side by side on desktop and stack on narrower screens. Printed drawings retain their colors and scale; browser print styles keep each figure together. Source and desktop copies match, with thirteen English keys added and the existing inquiry export hint clarified. Experiment definitions, scientific helpers, scene geometry, and saved formats are unchanged. Nothing was committed.

## Verification

- **646 targeted tests passed:** 77 new inquiry-report cases and 569 regressions across 15 existing suites covering inquiry capture/control restoration, experiments, notebook preservation, matching starts/free matching, focus browsing/workspace, live comparison, precision controls, PNG export, repeated/guided studies, surroundings comparisons, and existing study reports.
- **38 Chromium check groups passed** on the same final source. Native HTML downloads match the generated blobs, both drawings match exact rendered SVG geometry, and state/focus are preserved. Cases include the three experiments, selected/other/multiple/unchanged changes, hidden surroundings, independent guides, literal markup in notes, native numeric blur, keyboard activation, delayed operations/navigation, and rotating moiré snapshots.
- The export action was checked in six focused-workspace viewport/text combinations. Standalone reports were checked in eight combinations from 320 px to 1440 px, including 200% text and short landscape windows, plus dark/forced-light/forced-dark modes. Targeted WCAG A/AA axe checks passed with no reported runtime errors or external requests. Screenshots were visually reviewed.
- The browser generated an A4 print sample. Both pages were rendered with Poppler and visually reviewed for legible text, intact figures/tables, and clean page transitions. The sample is QA evidence; PDF export is provided through the browser's print function.
- This is a targeted unit-test and software-rendered Chromium pass. Other browsers and the full repository were not audited.

## Evidence

- [Validation](validation.json)
- [New test results](inquiry-report-tests.json)
- [Unit execution metadata](inquiry-report-unit-run.json)
- [Regression summary](regression-summary.json)
- [Browser results](browser-results.json)
- [Sample inquiry report](necker-multiple.html)
- [Desktop report](report-1440-16.png)
- [Phone report at 200% text](report-390-32.png)
- [Short-window export action at 200% text](app-action-760-32.png)
- [Forced dark colors](forced-dark.png)
- [Print preview](print-preview.png)

Final source SHA-256: `2596a28e45d0dc4f8a348ca712d8e45584fc25b8dd159bb3c79a64961ae9a00c`.
