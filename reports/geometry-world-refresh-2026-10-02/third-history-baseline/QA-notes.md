# Measurement History Baseline

Checked October 3, 2026 in real Chromium with the existing React/Three.js renderer harness. The previous user preview at port 61309 was unavailable, so this run started and closed its own private server. All browsers and servers opened by this audit were closed.

## Live Evidence

Two actual measurements produced a 60-cubic-unit rectangular prism and a 48-cubic-unit composite structure inside a 5 by 4 by 3 bounding box. These are live renderer measurements, not injected history fixtures.

- Desktop 1280x800: history is 280px wide and 352px tall. The initial viewport clips the retrieval input and Check control. Header close is 28 by 28px.
- Narrow phone 320x844: history is 148px wide. Its header overflows by 13px normally and 32px under increased text spacing. Increased spacing moves the close control outside the panel's clipped right edge; its center hit test fails.
- Short phone 320x568: the compact measurement inspector at y78..285 covers the history header at y137..184, including its close control. The two overlapping reading surfaces are both still rendered.
- History rows display `5 x 4 x 3` beside `=48` for the composite structure. This visually implies a product equality even though those dimensions describe the 60-cubic-unit bounding box, not occupied volume.
- Comparison volume values have no cubic-unit label. Surface area does include square units. Record rows contain neither quantity labels nor units.
- Retrieval requires scrolling a long, narrow panel on phones. At 320x844 the input and Check start at y769 and y819 respectively, outside the initial history panel bottom y606.

## Artifacts

`report.json` records exact bounds, overflow, control hit testing, measurement data, and empty runtime-error arrays. Nine screenshots show normal history, history beside the inspector, and increased text spacing across the three viewports.

Recommended next iteration: a wider notebook directly under the toolbar, distinct record/comparison/practice views, sticky 44px close control, explicit dimension/occupied-volume units, and mutual visibility between history and the retained current inspector. Short portrait should suspend covered touch controls while the reading surface is open.
