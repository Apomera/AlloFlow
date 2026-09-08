# Geometry World: crafted daylight and golden light

The selected lighting gives roof undersides, columns, and steps clearer depth. A lower daylight sun creates a more legible ground shadow, while reduced ambient fill keeps the grass calm. Golden light retains its warm surfaces with deeper, readable shadows.

All comparison images were captured in one live WebGL engine with the same pavilion, materials, landscape, camera position, and 48-degree field of view. The material finish and scenery additions are present in both lighting variants. Only the lighting and shadow parameters change.

## Daylight

Before:

![Original daylight lighting](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-day-original-detail.png)

Selected:

![Selected daylight lighting](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-day-crafted-detail.png)

## Golden light

Before:

![Original golden lighting](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-golden-original-detail.png)

Selected:

![Selected golden lighting](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-golden-crafted-detail.png)

## Selected values

| Setting | Previous | Selected |
| --- | --- | --- |
| Day ambient / hemisphere | 0.30 / 0.42 | 0.20 / 0.32 |
| Day sun intensity / elevation | 1.05 / 58 degrees | 1.00 / 48 degrees |
| Golden ambient / hemisphere | 0.40 / 0.34 | 0.22 / 0.28 |
| Rim intensity | 0.25 | 0.16 |
| Sun shadow bias / normal bias | -0.00050 / 0.020 | -0.00012 / 0.012 |

The existing color and output-encoding pipeline remains unchanged. These edits do not alter mesh vertices, dimensions, measurements, or STL export.

Eight captures covered original, selected, and gentler lighting variants. Every recorded field of view is exactly 48 degrees. The final run compiled 24 shader programs with 94 applicable material-finish instances and reported no page, console, or shader errors. The local fixture is a visual check, not a frame-rate benchmark.

[Browser measurements](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-lighting-results.json) · [Focused regression results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-lighting-tests.json) · [Standard pavilion wide view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/artisan-day-crafted-wide.png)
