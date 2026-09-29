# Dissection Lab: clearer labels while zooming

September 29, 2026

## Changes

- Anatomy callouts keep a consistent reading size when the specimen is enlarged. Long names still wrap, including with the large-text preference.
- Label bounds follow the visible canvas during zoom and pan. Mirrored views use the same geometry for drawing and selection.
- At adjusted camera positions, callouts leave space for the orientation panel, fullscreen system key, scale, and physiology panels.
- Unselected structures outside the visible canvas no longer add callouts. Selected and guided structures retain their labels.
- Cards leave room around enlarged hotspot rings. Numbered markers, card corners, and label strokes also keep a consistent display size.

## Visual review

| Previous 2× fullscreen view | Updated 2× fullscreen view |
| --- | --- |
| [Clipped, oversized labels](before-fullscreen.png) | [Readable labels within the canvas](fullscreen-dorsal-2x.png) |

- [Ventral view at 3× zoom](fullscreen-ventral-3x.png)
- [Phone with large text, dorsal view](phone-dorsal.png)
- [Phone with large text, ventral view](phone-ventral.png)
- [Perch selected through its zoomed label](perch-selected.png)

## Verification

- **17 Chromium scenarios passed.** The six new scenarios cover 2×–3× zoom, pan, both orientations, constant text size, card bounds and overlap, long selected names, assessment hiding, and actual label clicks. Existing label, physiology, and system-key scenarios also passed. See [final-browser-tests.log](final-browser-tests.log).
- The browser checks inspect real canvas drawing transforms and rendered text bounds.
- **109/109 focused canvas and workspace regression checks passed.** See [unit-results.json](unit-results.json).
- Both JavaScript files pass syntax checks and match byte for byte. Scoped whitespace checks pass.

Included in the accumulated Dissection Lab clarity changes.
