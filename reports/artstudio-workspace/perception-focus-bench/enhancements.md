# Perception Lab: drawing and controls together

The compact focused workspace now gives the controls and drawing separate scrolling areas when there is enough space. Scrolling through settings or writing a note keeps the live drawing visible. The layout responds to the actual space below the heading and the text size. Narrow, short, and enlarged-text views use a single-column layout with ordinary scrolling; the expanded viewing area remains available.

**Go to drawing** and **Go to controls** move keyboard focus and scroll directly to the relevant content. Going to controls opens a collapsed panel. Going to the drawing preserves a selected pinned comparison. Hidden comparison links are excluded from the modal's keyboard focus wrap. The live drawings now come before detailed result tables, and comparison switching reserves more room for its toolbar. Status messages stay outside the independently scrolling panes.

This pass changes layout and navigation only. Experiment definitions, normalization, drawing geometry, measurements, study calculations, and stored data formats are unchanged. The source and desktop copy are identical. Four new English strings and the updated focused-view hint are present in both catalogs. No commit was created.

## Verification

- **78 targeted tests passed:** 23 focused-workspace cases, 15 live-comparison cases, and 40 precision-control cases. Suites ran individually and each complete result was checked.
- **18 Chromium browser check groups passed:** all six experiments, real wheel scrolling while the drawing remains stationary, numeric edits and notes, all three comparison layouts, revealed study results and nested-viewer focus, expanded/compact switching, resizing, 320–1440 px widths, 200% text, dark and high-contrast themes, and forced colors.
- The browser checks verify reachable fields, no horizontal overflow, equal comparison scales, and no targeted WCAG A/AA axe violations or browser runtime errors. Final screenshots were reviewed. This was a targeted Chromium pass, not a cross-browser or full-repository audit.
- Chromium used software rendering after the local GPU process crashed during an earlier attempt. The final browser run completed successfully.

## Evidence

- [Validation](validation.json)
- [Unit summary](unit-summary.json)
- [Browser checks](browser-results.json)
- [Drawing visible beside a note](desktop-live-drawing-and-note.png)
- [Pinned comparison](comparison-switch.png)
- [Phone with 200% text](workspace-390-32.png)
- [Short landscape with 200% text](workspace-760-32.png)
- [Dark theme](dark.png)

Final source SHA-256: `2fb5306469bff7d04a900e1021ec28ee513d8c5ffc2365d59cedd5461e3a2668`.
