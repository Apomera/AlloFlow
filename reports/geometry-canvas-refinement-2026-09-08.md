# Geometry canvas refinement — 2026-09-08

Consolidated the canvas controls into a single compact row. Edit and Measure remain directly accessible, while Front, Side, Top and Iso now sit in a Views popover beside Fit. This reduces the canvas area covered by controls, especially on phones.

The camera picker supports keyboard activation, Tab navigation, Escape dismissal with focus return, and dismissal when focus leaves. Choosing a view returns focus to Views. Existing camera animation and reduced-motion behavior are preserved.

Selected Sculpt parts now display their custom name in the canvas label. Long names truncate visually before the focus controls. At widths of 380 pixels or less, inspector shortcuts use three columns so Arrange and Material remain readable.

Changed files: `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

## Validation

Final browser checks passed for Sculpt at 1440, 390 and 320 pixels wide, plus Single Shape and Stretch at 390 pixels. Checked unobstructed compact controls, label fit, inspector shortcut fit, no horizontal overflow, camera-menu containment, pointer and keyboard interaction, Escape and focus dismissal, top-view camera orientation, Fit, and Sculpt navigation to editing, measurements and focus mode. No page errors or failed requests occurred.

Visually reviewed the desktop and phone canvas, including the camera popover. JavaScript syntax and scoped diff formatting checks passed; source and public copy hashes match.

Evidence: `scratch/geometry-canvas-refinement-2026-09-08/browser-results.json`, browser script and adjacent screenshots. Physical headset behavior was outside this browser UI pass.
