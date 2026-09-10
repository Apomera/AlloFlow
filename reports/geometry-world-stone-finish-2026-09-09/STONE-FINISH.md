# Geometry World: a calmer stone finish

Stone now has a pale, neutral mineral finish with finer grain and sparse quartz flecks. This replaces the large blue-gray cloudy patches that competed with the geometry of foundations, steps, and roof slabs. The palette icon uses matching colors and small mineral details.

The new texture uses deterministic periodic fields with restrained broad variation and finer detail. It keeps the existing 256 × 256 color texture, shared cache, color encoding, and quality behavior. Balanced uses the existing normal and roughness maps generated from the new surface; Saver keeps those maps disabled. The printable mesh and building rules are unchanged.

![Refined stone in Studio](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/after-studio-saver-1200x820.png)

## Matched visual review

The same 42-block creation was rendered from the same cameras before and after the change. It combines stone cubes, slabs, and rotated wedges with wood and brick. Review covered desktop Balanced, desktop Saver, phone Saver, and Studio Saver. The new finish makes the shape and lighting of the steps and lintels easier to read, while keeping the warmer materials distinct.

[Before, desktop](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/before-build-balanced-1200x820.png) · [After, desktop](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/after-build-balanced-1200x820.png) · [Phone preview](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/after-build-saver-390x844.png)

## Verification

**122 tests passed across six suites**, covering materials, surface maps, rendering, model fidelity, Showcase export, and Print Lab workflows. Canonical and desktop copies match and parse successfully.

Both actual React/THREE browser runs passed without page, console, or shader errors. World data, all captured geometry attributes and indices, transforms, and STL bytes match exactly between versions. Quality changes and entering/leaving Studio preserve the model and history. Cameras match across all four comparisons.

Draw calls and triangle counts also remain identical: 381 calls in desktop Balanced, 238 in desktop/phone Saver, and 87 in Studio Saver for this fixture. The change adds no rendered objects or texture resolution. These are rendering-work checks, not a frame-rate claim.

Browser coverage uses Chromium with software WebGL; the phone view is emulated. No physical printer or physical-device browser was involved.

[Verification summary](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/stone-pass-summary.json) · [Browser results](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/after-results.json) · [Texture sample](/C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-stone-finish-2026-09-09/after-stone-texture.png)
