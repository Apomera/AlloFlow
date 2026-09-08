# Geometry World workspace verification

The populated workspace passes desktop, portrait-phone, and narrow-phone checks using the actual React UI and Three.js WebGL renderer. The fixture is a connected 150-block pavilion with a pitched roof, masonry platform, oak structure, and front step. Both displayed placed counts are synchronized to the fixture.

| Viewport | Resize continuity | 0 / − / = shortcuts | Dock body | Palette and touch controls |
| --- | --- | --- | --- | --- |
| 1440 × 900 | Same engine; 150 blocks | All three pass | 592 px, scrollable | No overlaps |
| 390 × 844 | Same engine; 150 blocks | All three pass | 189 px, scrollable | No overlaps |
| 320 × 700 | Same engine; 150 blocks | All three pass | 129 px, scrollable | No overlaps |

All material and shape targets tested measure at least 44 × 44 pixels. Clicking or tapping materials updates selection; keyboard shortcuts select Ice, Lava, and Torch and reveal the entire tile in the scrolling palette. Shape selection and keyboard rotation work. Menu close, toolbar hide/reveal, fullscreen, and touch-mode buttons remain visible and hit-testable.

Select build, Send to Print Lab, and Collapse remain pinned, inside the viewport, and hit-testable when the dock is scrolled to the final workspace option. Both native disclosures open. The last workspace action can be reached at every tested size. High-contrast focus outlines pass the 3:1 check; tested action text reaches at least 15.30:1 against its resolved solid background.

Every viewport preserves the same 150 selected student blocks, undo and redo history, and byte-identical STL export (31,784 bytes; SHA-256 4320e16c857d3aa501d4035ce761621748cd45e75d65d9417947f9263cb2fb1a). No page errors or failed shader programs were recorded.

The first responsive check exposed an existing mobile-entry gate that unmounted an active desktop world when narrowing the window. The production gate now preserves an active world. This final run deliberately starts with the onboarding flag unset and checks the original engine object survives both phone widths. The first failed run is retained as [diagnostic evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-first-run-results.json).

## Screenshots

- [Desktop with expanded build dock](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-1440x900-expanded.png)
- [390px touch workspace](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-390x844-collapsed.png) and [expanded dock](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-390x844-expanded.png)
- [320px touch workspace](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-320x700-collapsed.png) and [scrolled dock](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-320x700-scrolled.png)
- [High-contrast keyboard focus](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-320x700-contrast.png)

[Machine-readable results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/workspace-pass-results.json). Reproduce with `node reports/geometry-world-graphics-2026-09-08/verify-workspace-pass.cjs`. Rendering uses Chromium SwiftShader, DPR 1, and Battery saver mode; these are interaction and layout checks, not hardware frame-rate measurements.
