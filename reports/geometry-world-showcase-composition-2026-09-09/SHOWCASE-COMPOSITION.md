# Geometry World: more room for the creation

Showcase now frames the selected structure around its actual controls. On short screens, the heading and Meadow/Studio choices form a compact top row, while the camera views and export actions share a bottom row when space allows. Orbit buttons are vertically centered on their anchors. All tested buttons retain at least 44-pixel height.

In the 844 × 390 landscape comparison, the framed model is **2.7 times taller** and clear of the toolbar. The normal desktop comparison gains **15%** in framed height. At 667 × 375, height increases by **2.1 times** while the narrower two-row toolbar remains usable.

## Before and after

![Before: landscape Showcase](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/before-perspective-844x390.png)

![After: landscape Showcase](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-perspective-844x390.png)

[Desktop preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-perspective-1200x820.png) · [Narrow phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-perspective-320x700.png) · [Front](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-front-844x390.png) · [Side](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-side-844x390.png) · [Top](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-top-844x390.png)

## Camera and scene behavior

The fit measures the persistent caption, view controls, and orbit targets in canvas coordinates. It uses every bounding corner and perspective depth, honors camera zoom, and keeps Front, Side, and Top on their chosen bearings. Shallow Front and Side views stay above the Studio floor. The first fit runs again after the controls mount; resizing uses the current layout.

Entering Showcase during placement animation now uses the completed block dimensions. Studio contact footprints use temporary canonical transforms so slabs and rotated wedges ground correctly without changing the live meshes, materials, or printable geometry.

Opening or closing the file panel leaves the camera unchanged. PNG saving preserves the chosen view. If the user changes the view or resizes while encoding is pending, a single deferred fit applies the latest state after saving completes. It is canceled or ignored when the owning Showcase session exits or its engine is replaced or destroyed.

## Verification

**115 unique tests passed across 8 files**, including real-THREE projection, canonical placement bounds, partial-block contact polygons, lifecycle cleanup, delayed image encoding, file-panel keyboard/import behavior, selected JSON/STL exports, and Print Lab continuity and geometry stress tests.

Actual-browser comparisons passed at eight viewport/view combinations. Every model stayed in the viewport, and every final framing rectangle stayed clear of the controls. Full world data, STL bytes, retained selection, and undo/redo history remained unchanged. Leaving Showcase restored the building camera exactly. A controlled delayed-PNG browser test confirmed that Top view and resize requests are applied after encoding.

| Viewport | View | Before framed height | After framed height | Ratio |
| --- | --- | ---: | ---: | ---: |
| 1200 × 820 | perspective | 340.6 px | 391.1 px | 1.15× |
| 390 × 844 | perspective | 188.9 px | 195.3 px | 1.03× |
| 320 × 700 | perspective | 136.1 px | 140.7 px | 1.03× |
| 844 × 390 | perspective | 67.9 px | 182.7 px | 2.69× |
| 844 × 390 | front | 72.5 px | 202.7 px | 2.80× |
| 844 × 390 | side | 72.1 px | 193.2 px | 2.68× |
| 844 × 390 | top | 72.3 px | 199.2 px | 2.75× |
| 667 × 375 | perspective | 66.4 px | 137.2 px | 2.07× |

These measurements describe the projected canonical bounding box of the same 42-block selected creation, with one unrelated block retained in the workspace. The comparison uses Saver mode in Chromium software WebGL. Render counts remain **87 draw calls and 502 triangles** in every matched Studio view; this pass adds no scene objects or textures. These are rendering-work checks rather than a frame-rate claim.

Some initial Vitest runs exited with errors and omitted suites from their JSON output. The missing files and geometry stress test were rerun with console output, explicit suite counts, and successful exit codes. Final totals deduplicate tests and use their latest results. An initial placement test fixture was corrected to include the existing production placement-animation marker.

Core rendering and Print Lab source files are unchanged; the canonical builder and desktop mirror match the final browser snapshots and parse successfully.

[Verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/composition-summary.json) · [Final browser evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/after-results.json) · [Baseline browser evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-showcase-composition-2026-09-09/before-results.json)
