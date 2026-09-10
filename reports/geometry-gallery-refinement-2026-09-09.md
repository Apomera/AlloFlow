# Sculpt saved-gallery refinement — 2026-09-09

Replaced truncated saved-name chips with readable cards showing full titles, color swatches, part counts and shape summaries. Opening a sculpture and removing its saved entry now have separate, labeled controls.

Collections with more than three saves offer search across saved names, recipe names, part labels, groups and shapes. All search terms must match. Sorting offers Recently saved and Name A–Z, with a visible match count, empty-result guidance and Clear search. Escape clears the search field.

Saving reveals the gallery, clears search and puts the newest save first. Existing naming-collision handling, undoable loading and removal restoration are preserved.

Source: `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

## Validation

- 38 tests passed across saved-gallery and existing Sculpt editor suites. Covered sorting, multi-term search, summaries, undoable loading, removal/restoration without geometry changes, and saving a copy without overwriting another entry.
- Final browser checks passed at 1440, 390 and 320 pixels wide. Verified keyboard opening, search and Escape, sorting, Undo, deletion restoration, collision-safe copying, persisted saves and card fit. No page errors or failed requests occurred.
- Visually reviewed desktop and narrow-phone gallery layouts.
- Syntax and scoped formatting checks passed; source/public hashes match.

Evidence: `scratch/geometry-gallery-refinement-2026-09-09/browser-results.json` and adjacent screenshots. This pass covers the browser Project gallery.
