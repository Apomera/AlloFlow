# Geometry World: softer Studio shadows

Studio now gives structures a softer projected floor shadow in Balanced and Detailed modes. The edge fades gently into the ivory stage while the block surfaces and contact shading remain crisp.

## Before and after

![Previous Studio shadow](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/before-detail-perspective-1200x820.png)

![Refined Studio shadow](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/after-detail-perspective-1200x820.png)

[Phone preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/after-detail-perspective-390x844.png) · [Top view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/after-detail-top-1200x820.png) · [Landscape preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/after-detail-perspective-844x390.png) · [2048px PNG export](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/after-detail-perspective-export.png)

## Implementation

The Studio floor receives a material-local shadow filter using 16 fixed disk samples. The filter replaces only the pinned THREE r128 PCFSoft branch on that floor. Its radius scales with the creation’s bounds up to 0.14 world units, so single-block close-ups retain clean edges. The radius stays consistent across live and exported views of each build. Fixed sample positions avoid animated grain; the existing contact texture anchors the creation.

The original lighting, backdrop calibration, construction materials, and render-wide shaders remain intact. The floor and its shader belong to the Studio session and are disposed with it. Unsupported shader layouts fall back to the original material behavior. This is a constant artistic softness, rather than a physical area-light simulation.

## Verification

**84 tests passed across five suites.** They cover the pinned shader branches, world-space scaling, invalid-input fallback, material ownership, Studio resource cleanup, camera composition, and high-resolution image capture.

**12 matched browser views passed** across Saver, Balanced, and Detailed modes, including desktop, phone, short landscape, front, side, top, and perspective. The Detailed checks use the application's actual r128 composer and output pass. Six additional browser views cover a single rotated quarter wedge, a tall tower, and a wide span in desktop Balanced and phone Detailed modes. Every edge fixture preserves exact world data, STL bytes, history, and the returning camera.

In the sampled clear region of the perspective floor shadow, the largest adjacent-pixel RGB step falls from **32 to 12**, and steps over 20 levels fall from **25 to 0**. The complete final views were visually reviewed. All three matched Saver screenshots and the Saver PNG are pixel-identical to the baseline.

Saver and Detailed PNGs retain their 2048-pixel long edge and calibrated ivory backdrop. The perspective PNG also retains the new shadow appearance. Block material identities, geometry attributes, transforms, selected-world data, STL, selection, and undo/redo remain exact through the main review. Scene environment and camera restoration pass after switching looks and leaving Showcase. No page, console, or shader errors were reported.

The filter uses the same 16 depth comparisons as the original r128 PCFSoft branch. It adds no shadow maps, render passes, lights, textures, or scene objects. All matched views retain their draw-call, triangle, and resource counts:

| Quality | View | Viewport | Draw calls | Triangles |
| --- | --- | --- | ---: | ---: |
| saver | front | 844 × 390 | 87 | 502 |
| saver | perspective | 1200 × 820 | 87 | 502 |
| saver | perspective | 390 × 844 | 87 | 502 |
| balanced | front | 844 × 390 | 129 | 998 |
| balanced | perspective | 1200 × 820 | 129 | 998 |
| balanced | perspective | 390 × 844 | 129 | 998 |
| detail | front | 844 × 390 | 130 | 999 |
| detail | side | 844 × 390 | 130 | 999 |
| detail | perspective | 1200 × 820 | 130 | 999 |
| detail | perspective | 390 × 844 | 130 | 999 |
| detail | top | 1200 × 820 | 130 | 999 |
| detail | perspective | 844 × 390 | 130 | 999 |

These are Chromium software-WebGL checks with emulated phone dimensions; render-count parity is not a hardware frame-rate measurement.

Only the builder module and its desktop mirror changed in production. Both match the tested browser snapshots and parse successfully. Geometry World's core and Print Lab source hashes match the baseline.

[Verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/softlight-summary.json) · [Browser evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/after-results.json) · [Edge-build evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/edge-build-results.json) · [Shadow pixel comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/shadow-pixels.json) · [Focused tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/softlight-tests.json) · [Regression tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-softlight-2026-09-09/softlight-regression-tests.json)
