# Titration Lab: saved-reading plot close-up

Updated 19 September 2026. Local changes only; not deployed.

Open Plot readings and choose Around selected volume to separate observations clustered near an endpoint. The plot shows saved points within 0.5 mL of the selected volume; its volume window is clipped to 0–150 mL. The response axis fits the visible points. All saved volumes returns to the full range for the selected setup.

The plot displays both the visible/total reading count and the exact axis window. Changing the reading list, Previous/Next reading, or a plotted point moves the close-up. The complete reading list stays available, including repeated-volume observations and readings outside the window. No curve is fitted between points.

Scale and selection are local viewing state. Saved values, notes, investigation evidence, comparison choices, exports, and the 3D viewer remain intact. Notebook filters do not constrain the plot. If a selected reading is removed, the plot follows the normal surviving-reading fallback; undo can restore its selection. Closing and reopening the plot starts at the full scale.

The scale buttons expose their pressed state, keep keyboard focus, and show a distinct active style. High-contrast mode now uses system colors for chart labels, the chart background, grid, points, and selected-reading marker. Manual review caught faint axis labels before this correction.

## Validation

- 130 tests passed across eight targeted suites, including eight new close-up cases. Cases cover endpoint separation, exact window boundaries, 0/150 mL clipping, redox precision, duplicate points, missing selection, incompatible/extreme data, and bounded coordinates.
- 92 workflow accessibility/layout scans passed at 1200 and 320 px with no browser errors. Coverage includes point/list navigation, off-window readings, notebook filters, removal/undo, keyboard focus and Escape, reopening, and stable 3D viewer identity, alongside prior investigation and report regressions.
- The final high-contrast CSS correction passed two focused browser scans with checks for distinct chart colors. Automated contrast checks are disabled in forced-colors mode; dedicated screenshots are reviewed visually.
- Desktop and phone close-up screenshots and the corrected phone high-contrast chart reviewed.
- Syntax and whitespace checks pass; source/public copies match. Seven new English fallback strings match the catalog. Other translations remain pending.

Results: [validation](../reports/chemistry-refinement-2026-09-06/titration-notebook-zoom-validation.json), [workflow harness](../reports/chemistry-refinement-2026-09-06/titration-notebook-zoom-browser.cjs), [high-contrast harness](../reports/chemistry-refinement-2026-09-06/titration-notebook-zoom-visual.cjs).

Previews: [desktop](../reports/chemistry-refinement-2026-09-06/titration-notebook-zoom-closeup-1200.jpg), [phone](../reports/chemistry-refinement-2026-09-06/titration-notebook-zoom-closeup-320.jpg), [high contrast](../reports/chemistry-refinement-2026-09-06/titration-notebook-zoom-plot-forced-colors-320.jpg).
