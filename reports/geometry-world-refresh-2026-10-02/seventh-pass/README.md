# Geometry World: Seventh Enhancement Pass

Date: 2026-10-04

This pass improves inspection clarity and protects keyboard and focus behavior while students move between tools.

## Changes

- Measurement captions distinguish solid-prism dimensions from grid bounding-box dimensions. Composite spans explicitly include gaps and partial cells; they are not occupied volume.
- Exposed surface area is visible outside the details disclosure and uses square units only for complete, exact measurements. Partial blocks and incomplete scans receive honest unavailable messages; the unsupported "press N" promise is removed.
- Larger text now covers metric labels, values, units, inspector title, and details control. Compact panels have adaptive height, stable content, internal scrolling, and a sticky close/title row.
- Touch-layout measurements temporarily hide the collapsed Studio launcher, including landscape layouts. Tall phones reserve the complete touch action rail. Short portrait screens temporarily hide building trays and touch controls during inspection, restoring them on close.
- Selected creations show separately labeled Width (X), Depth (Z), and Height (Y) grid-cell spans, with a bounds-versus-volume caption and a readable short-phone layout.
- Front, Side, and Top controls reflect the actual active view. Manual/orbit movement shows Custom view. One Previous view command restores the saved camera pose, including decimal coordinates exactly.
- Delayed tool focus checks current engine identity, transitions, and dialogs at both animation frames. Shapes & materials opens the actual palette. Launcher keys and native form fields no longer leak into world shortcuts; Escape and native dropdown behavior remain available.
- Inspector accessibility removes an invalid reference to an unmounted notebook panel and explicitly respects system text/button colors in forced-color mode.

No measurement algorithms, scoring rules, answer drafts, project data, or workspace preference schema were changed. Source and public copies are synchronized.

## Verification

**120/120 focused regression tests passed in one clean eight-file run**, with exit code 0 and no failed or pending assertions. Coverage: 21 inspector clarity, 12 existing mobile inspector, 16 selected inspector, 16 camera selection, 2 dock selection, 15 builder navigation, 14 deferred focus/navigation, and 24 native-form keyboard cases. See [final regression report](final-focused-tests.json). Earlier overlapping batches are not added to this total.

**92/92 browser checks passed** across two final harness runs: [70 measurement checks](measurement-browser-verified.json) and [22 selected-creation checks](selected-browser-report.json). Their **11 scoped accessibility audits reported zero violations**. Twenty screenshots are retained; representative desktop, phone, narrow, and short-phone views were visually inspected. All private QA browsers/servers and test sessions were closed.

Final JavaScript syntax, source/public SHA-256 parity, scoped whitespace checks, and HTTP 200 preview checks passed. Both live served module hashes match the final production sources. See [final source and preview verification](final-verification.json).

The measurement browser checks use actual student geometry and native crosshair measurements: a 2-by-2-by-3 prism (12 cubic / 32 square units), stepped structure (8 / 28), hollow ring (8 / 32), and cube-plus-half-block (1.5 cubic units, exact surface unavailable). Profiles cover 1280-by-800 desktop, 390-by-844 phone, 320-by-568 narrow phone, 320-by-480 short phone, 844-by-390 landscape, contrast mode, and Windows forced colors. The browser verifies internal scrolling, unobstructed close controls, restored building controls, unchanged geometry/drafts, and a nonblank WebGL scene without runtime errors.

Selected-creation QA uses real fractional/gapped blocks, actual camera animations, native finder navigation, and screenshots on desktop and a narrow touch phone. Its four scoped accessibility audits reported zero violations.

## Diagnostics and Limits

Earlier diagnostic files are retained, not counted as clean final runs. Initial inspector test failures came from fixture assumptions about the half-block glyph and in-place enrichment. Browser checks found and repaired notebook ARIA, compact-panel clipping, heading contrast, phone overlaps, and final camera interpolation rounding. A direct programmatic aim needed a Three.js world-matrix update before immediate raycasting; no production raycasting change was made. One private QA server stalled on keep-alive cleanup after checks; its verified owned process was closed, and the final harness explicitly closes private connections.

These are local harness checks, not a deployment or physical-device/WebXR validation. The previous preview listener was unavailable at final verification, so the local preview was restarted and verified. It is intentionally left running at [Geometry World](http://127.0.0.1:61309/?mode=home).
