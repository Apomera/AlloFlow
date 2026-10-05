# Perception Lab: find and revisit saved studies

Updated October 4, 2026. Changes are left uncommitted.

The observation notebook now has **All observations** and **Saved studies** views. Filter by experiment, search visible notes, impressions, and titles, or narrow the study view to Complete, Partial, or Conflicting groups. The original notebook remains intact; filters are temporary and affect only the displayed results.

## Keep each study together

When one retained member satisfies both the experiment and search filters, all retained observations in its repeated study remain visible. This rule applies in both views. It prevents a search from turning a complete study into an apparent partial study, hiding conflicts, or separating its matching trials. Standalone observations match individually.

Study cards show their experiment, original study number, retained count, completion state, actual reveal state, latest retained date, and a short note preview. A group with several experiments is labeled Mixed experiments. Conflicting groups show their retained observation count rather than suggesting a valid three-match total. Partial and conflicting groups can be Hidden, Revealed, or Partly revealed according to their actual records.

The **Recorded observations** disclosure exposes individual Restore, Pin, Review, Repeat, and Delete actions. Observation and study numbers come from the full retained notebook, so filtering does not renumber results. Study cards provide one direct Review action for the group; notes are bounded to 160 characters in the preview and remain complete in the individual observation and export.

## Search what is visible

Search is a bounded, literal substring match over notes, recorded impressions, and experiment titles. It ignores case and surrounding query whitespace; accents remain significant. It follows translated title and impression labels as displayed in the tool. Hidden match values, references, starting positions, dates, and internal identities are not indexed. Author-written notes remain searchable as visible text.

Result counts and explicit no-match messages distinguish an empty filter result from an empty notebook. **Clear notebook filters** resets experiment, status, and query while keeping the chosen view, then focuses the search input. Changing learner profile resets the finder to its defaults. During match collection, the finder and its results are hidden with the rest of the notebook.

## Preserve review and recovery

An open study review, comparison, or one-setting planner remains available even when a filter hides its original entry. Import preview, deletion undo, import undo, and export controls are outside the filtered results. Export continues to save the entire retained notebook. Filtering does not change drawing drafts, pinned comparisons, notebook order, reveal states, or other tools.

Closing review returns to its original opener when that opener remains visible. If filters remove it or its Recorded observations disclosure has been collapsed, focus returns to the notebook heading. This fixes a confirmed browser issue where closing review left focus on the page body.

## Verification

Final validation passed all 44 new finder tests and all 330 existing Perception tests, for 374 unique current-source tests across nine files. Chromium passed 26 finder, 37 import, 25 guided-study, and 23 comparison groups (111 total), with no reported browser errors. Every recorded WCAG-tagged axe stage was clear. Five viewport widths, 44-pixel controls, dark/high-contrast/Windows forced-color themes, and 200% text passed reflow checks. Phone and theme panels were visually reviewed. All 332 Perception English entries, source mirrors, discovery, and integration checks passed.

See [validation.json](validation.json) for final current-source unit/component counts, browser evidence, hashes, syntax, English parity, integration, and unstaged status. The new verification files are `tests/perception_lab_notebook_finder.test.js` and `dev-tools/perception_lab_finder_qa.cjs`. Root and desktop implementations are mirrored.

## Previews

- [Phone finder controls](finder-controls-panel-390.png)
- [Phone study cards](finder-panel-390.png)

- [Dark theme](finder-dark-panel.png)
- [Windows dark forced colors](finder-forced-dark-panel.png)
- [200% text](finder-large-text.png)
