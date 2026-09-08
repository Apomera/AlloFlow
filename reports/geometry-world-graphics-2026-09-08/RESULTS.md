# Geometry World graphics update

The local app now has warmer oak-style wood, terracotta brick, finer stone and sand surfaces, a calmer grass palette, and clearer construction edges. Reduced ambient fill gives the directional lighting more definition. The ground grid is quieter while its countable unit squares remain visible.

Diagonal halves and quarter wedges now have texture coordinates on every face. Their texture scale follows the actual slope length, so the grain stays consistent instead of stretching or appearing as a flat color. Their vertices, dimensions, volume, and print geometry are unchanged.

Four shared normal maps add subtle material relief without adding mesh faces. Detailed and Balanced use this detail; Battery saver switches it off. Painted material grain is deterministic across loads.

## Before

![Original Geometry World graphics](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/before-desktop.png)

## After

![Updated Geometry World graphics at the same camera position](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/after-desktop.png)

## Material detail

![Updated materials and properly textured wedges](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/after-materials.png)

## Verification

- **146 tests passed, zero failed** across seven targeted test files, including all 768 shape-pair combinations in the print workflow regression.
- New tests verify that every wedge triangle has usable UVs and that each UV edge has the same length as its corresponding geometric edge.
- The actual React/WebGL tools rendered a 751-block scene without page errors or reported shader compilation failures.
- All 44 diagonal halves in the capture have texture coordinates. Detailed mode enabled surface relief on 116 applicable blocks; Battery saver disabled it on all of them.
- The source and desktop public copy match exactly; whitespace checks passed.

The screenshots use a consistent fixture in a local tool harness. They demonstrate the rendering changes; they are not a frame-rate benchmark or a deployed-app verification. The original phone capture used Auto quality, so only the desktop images should be treated as a matched quality comparison.

[Graphics tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/geometry_world_material_graphics.test.js) · [Test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/test-results.json) · [Browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/after-results.json)
