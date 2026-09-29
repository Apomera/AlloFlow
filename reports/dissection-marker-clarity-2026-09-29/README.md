# Dissection Lab: clearer hotspots and inspection captions

September 29, 2026

## Changes

- Exposure symbols, depth markers, selection reticles, and guided target cues keep a consistent display size as the anatomy zooms. They remain anchored to the same anatomical points.
- Covered and emerging structures keep their distinct symbol shapes. Marker size respects the existing large-text and touch presentation settings.
- Label connectors start at the resized symbols, and their endpoint dots stay compact. Label spacing now follows the smaller marker footprint.
- The technique target cue and its leader line no longer become oversized at high zoom.
- Inspection depth captions remain upright in mirrored views and keep a consistent text size. A dark background separates the caption from the specimen.

## Visual review

| Previous 3× view | Updated 3× view |
| --- | --- |
| [Large symbols covering anatomy](before-3x.png) | [Compact symbols and closer labels](fullscreen-ventral-3x.png) |

- [Dorsal view at 3×](fullscreen-dorsal-3x.png)
- [Selected structure in ventral view](selected-ventral.png)
- [Phone with high contrast and large text](phone-high-contrast.png)

## Verification

- **15 Chromium scenarios passed.** Coverage includes marker dimensions and anatomical alignment from 0.5× to 3×, clicks in both orientations, upright inspection captions, high-contrast phone markers, guided rings, label wrapping, label overlap, and assessment hiding. See [final-browser-tests.log](final-browser-tests.log).
- Canvas checks record the actual drawing transforms. The existing label recorder now waits until the canvas is visible before sampling it.
- **110 regression checks passed:** [109 canvas/workspace checks](unit-results.json) and [one focused instrument-workflow check](workflow-results.json).
- JavaScript syntax and scoped whitespace checks pass; the web and desktop renderers match byte for byte.

Included in the accumulated Dissection Lab clarity changes.
