# Titration Lab: observations beside the saved-reading plot

Updated 19 September 2026. Local changes only; not deployed.

In Plot readings, choose Add observation or Edit observation beside the selected saved reading. The editor focuses its labeled field and saves changes as you type, with a 500-character limit and visible count. Done editing or Escape collapses the editor and returns focus to its button. A second Escape closes the plot.

The plot and notebook card edit the same saved observation. Changes appear in CSV downloads and, for investigation evidence, the completed investigation report. Plotted measurements, live experiment values, comparison choices, evidence attribution, and completion stay unchanged. Reads hidden by a notebook filter remain available in the plot and keep their notes.

Selecting a different reading, setup, or plotted point closes the editor to prevent accidental edits to another observation. Point selection returns keyboard focus to the reading list when it closes an active editor. Removal and undo, clearing and restoring the notebook, remount, and the 3D bench preserve the expected note data and focus behavior.

Both editors use one validated update helper. It preserves the full notebook and its order, applies the existing note length limit, and ignores unchanged text or invalid IDs. Opening and closing the editor leaves an available undo snapshot intact; making an actual note edit invalidates that older snapshot, matching existing notebook behavior.

## Validation

- 138 tests passed across nine targeted suites, including eight new shared-note update cases. The first run hit a fork-worker startup timeout before running tests; its report is retained, and a clean rerun passed.
- 16 focused browser accessibility/layout scans passed at 1200 and 320 px with no browser errors, missing ARIA references, or panel overflow.
- Browser assertions cover synchronized editing in both directions, filtered and mixed setups, CSV/report propagation, evidence preservation, maximum length, literal text rendering, keyboard focus, two-stage Escape, selection changes, removal/undo, real-edit undo invalidation, 3D viewer identity, remount, and clear recovery.
- Desktop, phone, and high-contrast screenshots reviewed. The preview fixture's endpoint label was corrected to match its saved volume before the final browser run. Forced-colors checks use structural assertions and visual review; automatic color-contrast checks run in normal colors.
- Syntax, source/public mirroring, whitespace, and all seven affected English strings checked. Six strings are new and one is revised; translations remain pending.

Results: [validation](../reports/chemistry-refinement-2026-09-06/titration-plot-notes-validation.json), [browser harness](../reports/chemistry-refinement-2026-09-06/titration-plot-notes-browser.cjs), [unit report](../reports/chemistry-refinement-2026-09-06/titration-plot-notes-tests.json).

Previews: [desktop editor](../reports/chemistry-refinement-2026-09-06/titration-plot-notes-editing-1200.jpg), [phone editor](../reports/chemistry-refinement-2026-09-06/titration-plot-notes-editing-320.jpg), [high contrast](../reports/chemistry-refinement-2026-09-06/titration-plot-notes-forced-colors-320.jpg).
