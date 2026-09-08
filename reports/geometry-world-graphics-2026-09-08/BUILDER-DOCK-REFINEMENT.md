# Free Build Studio dock and launcher refinement

The builder now shares Geometry World's deep pine, cream and sage palette. The dock uses a clearer hierarchy: the title and Select → Inspect → Print Lab guide lead into two pinned 48 px actions, a readable creation summary, Showcase and measurement controls, and the physical print envelope. Printer details live in the native **Printer profile & scale** disclosure; saving and opening editable worlds remain visible in the scrollable body, with lesson/reset actions under **Workspace options**.

On phones the expanded dock sits below the scene center and temporarily hides the lower building controls. Its header and Select/Send actions remain fixed while details scroll. Collapsing restores the building palette and touch controls. Selecting again returns the body to its creation summary. The launcher is an ivory dialog with a restrained vector cube motif, numbered steps, a clear replacement notice, and 46 px actions. Existing action names, keyboard focus restoration, high contrast, and reduced motion are retained.

Only `stem_lab/stem_tool_geometryworld_builder.js` and its desktop mirror changed for this refinement. Showcase scene behavior, mesh geometry, and Print Lab code are preserved.

## Verification

- Syntax check passed; both focused Print Lab integration suites passed: **40 tests, zero failures**. See `builder-dock-tests.json`.
- Actual React + WebGL browser verification passed at **1440 × 900** and **390 × 844**, using DPR 1. See `verify-builder-dock.cjs` and `builder-dock-results.json`.
- Both pinned actions measured 48 px high and remained hit-testable at the top and bottom of the scrolling body. Neither layout overflowed horizontally or covered the scene center.
- Launcher cancel restored keyboard focus. All three phone launcher buttons fit without scrolling and measured 46 px high. Opening/canceling a fresh sandbox through Workspace options restored focus to its trigger.
- Printer details expanded and exposed their volume explanation. Selecting again returned the dock body to the top.
- Saving produced valid editable JSON: 4,507 bytes, schema `alloflow-geometry-world/2`, all 36 selected-fixture blocks.
- Actual **Send to Print Lab** transferred the exact selected STL bytes: 36 blocks, 232 triangles, 11,684 bytes. The half-block roof correctly produced a 20 × 15 × 22.5 mm mesh at 5 mm/block versus the conservative 20 × 15 × 25 mm block envelope in the builder.
- Actual **Revise in Geometry World** restored all 37 workspace blocks, including an unrelated gold wedge, plus exact selection, undo/redo history, camera position/quaternion and fly mode.
- No page, console, or shader errors were observed.

The final browser verifier includes the normal phone dock expansion and bounded waits for existing delayed focus restoration. Earlier verifier attempts that omitted these steps were corrected; the passing artifact is the final run. The shared core's desktop-to-phone welcome-gate issue was fixed by the root agent, and this run used that fix without bypass flags.

## Screenshots

- `builder-launcher-desktop.png`
- `builder-launcher-phone.png`
- `builder-dock-desktop.png`
- `builder-dock-phone.png`

The building fixture is placed through the engine for deterministic UI coverage, then selected through the actual UI. Its placed-action counter therefore stays at zero; normal user placement increments that counter. The independent full-workspace verifier also covers 320 px width, high contrast, scrolling and touch-control separation.
