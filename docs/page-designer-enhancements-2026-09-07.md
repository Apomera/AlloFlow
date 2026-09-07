# Page Designer enhancements — 7 September 2026

Implemented the opportunities identified in page-designer-ui-ux-review-2026-09-07.md.

## Changes

- Recovery now follows document edits, flushes on close, page hide and unmount, and commits the focused text field before normal close. Device-storage failures remain visible with retry, project download and an explicit exit option. Project downloads preserve the recovery copy.
- On smaller screens, Canvas, Insert, Properties and Objects controls show one tool panel at a time. Selecting an object opens Properties; pointer selection waits for the gesture to finish before changing the mobile layout.
- Fit page measures the actual canvas viewport in both dimensions; Fit width is a separate action. Explicit zoom levels remain available.
- Properties put text, font, color and object-specific editing first. Geometry is available under Layout and position. Objects has its own view.
- The header prioritizes Undo, save status, project download, Export and Close; secondary actions are in More. Template Favorites and project downloads have distinct labels.
- Export choices are grouped by purpose, with worksheet files and detailed guidance in expandable sections. Existing export handlers and accessibility gates are retained.
- Selected controls have an explicit readable foreground. Reading-order numbers are optional review overlays; document reading-order semantics remain available.
- Escape dismisses open panels before closing the designer. More supports keyboard dismissal and focus return, and selecting an object from the navigator transfers focus to its visible editing field.

## Verification

- 208 focused Vitest tests passed across Page Designer suites and the use-before-assignment regression check. The run uses a 30-second test/hook timeout because the first cold React mount exceeded the default timeout on this machine.
- Real Chromium component checks exercised desktop (1280×900), short laptop (1280×720), tablet (1024×768), and phone (390×844) layouts. Fit page stayed within the measured canvas in all four sizes.
- At 390×844, canvas height increased from the review baseline of 128 pixels to 540 pixels. The whole page fits in the Canvas view.
- Browser checks covered visible text properties, immediate close recovery, edited text persistence, optional reading-order overlays, selected-control colors, export grouping and Escape handling. No browser page errors occurred.
- JavaScript syntax and free-variable checks passed. Source and desktop runtime copies are byte-identical. Targeted patch whitespace checks passed.

Evidence: ../reports/page-designer-enhancements-2026-09-07/ (browser-results.json, core-tests.json, browser-check.cjs and screenshots).

## Scope

Changes are local and have not been deployed. Browser verification mounted the actual Page Designer component in an isolated React host; it did not exercise the full application shell or regenerate every export format for downstream-reader validation.
