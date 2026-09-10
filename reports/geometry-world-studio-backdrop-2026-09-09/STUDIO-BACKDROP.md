# Geometry World: a softer, consistent Studio backdrop

Studio now has a calmer ivory backdrop and floor, replacing the visible gray-to-white horizon in straight-on views. The existing contact shadows and pool of light remain, giving the structure depth while keeping attention on its shape and materials.

## Before and after

![Previous Studio front view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/before-saver-front-844x390.png)

![Refined Studio front view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-saver-front-844x390.png)

![Refined Detailed Studio perspective](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-detail-perspective-1200x820.png)

[Phone preview](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-saver-perspective-390x844.png) · [Side view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-saver-side-844x390.png) · [Balanced view](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-balanced-front-844x390.png) · [Detailed PNG export](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-detail-export.png)

## What changed

The vendored THREE r128 renderer clears a color background directly and applies fog after material output encoding. The direct rendering path therefore needs display-space background/fog colors, while the linear render target used by Detailed postprocessing needs their linear equivalents. A Studio-owned before-render callback now selects the correct cached colors for the actual target before the background clears. It preserves any existing callback and restores it when Studio closes.

The floor's albedo is now a restrained neutral value that works with the existing warm lighting. This avoids the near-white clipping that made the horizon stand out. Lights, contact-shadow intensity, fog distances, block materials, and printable geometry are unchanged.

## Verification

**53 tests passed across four suites**, covering color handling, callback ownership and cleanup, Studio resource disposal, camera composition, delayed image saving, and high-resolution export restoration.

Eight matched actual-browser comparisons cover Saver, Balanced, and Detailed modes on desktop, landscape, and phone layouts. Detailed uses the real pinned THREE r128 EffectComposer and output pass, loaded locally from the same dependency versions requested by the application. The QA dependency files are stored with this report; no production dependency was added.

Every comparison preserves the camera pose, framing, rendered object/triangle counts, and Studio resource count. Full block data, mesh attributes and transforms, STL bytes, retained selection, and undo/redo history remain exact. Switching back to Meadow and leaving Showcase restore the previous scene callback, environment, and building camera. No page, console, or shader errors were reported.

The sampled direct-render horizon step drops from **13 to 2 RGB levels** in the front-view fixture. This is a controlled framebuffer measurement at a clear area beside the model. Visual inspection also covered the complete rendered views.

Both Saver and Detailed exported PNGs were decoded and checked independently. Each retains a 2048-pixel long edge and the intended ivory background, with a maximum sampled floor/background difference of six RGB levels or less.

| Quality | View | Viewport | Rendering path | Draw calls | Triangles |
| --- | --- | --- | --- | ---: | ---: |
| saver | front | 844 × 390 | Direct | 87 | 502 |
| saver | side | 844 × 390 | Direct | 87 | 502 |
| saver | perspective | 1200 × 820 | Direct | 87 | 502 |
| saver | perspective | 390 × 844 | Direct | 87 | 502 |
| balanced | front | 844 × 390 | Direct | 129 | 998 |
| detail | front | 844 × 390 | Render target + output pass | 130 | 999 |
| detail | side | 844 × 390 | Render target + output pass | 130 | 999 |
| detail | perspective | 1200 × 820 | Render target + output pass | 130 | 999 |

The scene uses the same 42-block selected fixture and one unrelated workspace block as the previous composition pass. Browser rendering uses Chromium software WebGL, with phone dimensions emulated. Render-count parity is not a hardware frame-rate measurement.

Only the Geometry World builder module and desktop mirror changed. Both match the final browser source snapshots and parse successfully.

[Verification summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/backdrop-summary.json) · [Final browser evidence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/after-results.json) · [PNG pixel checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/export-pixels.json) · [Focused test details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/STUDIO-BACKDROP-TESTS.md) · [Pinned postprocessing asset manifest](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-studio-backdrop-2026-09-09/postfx/manifest.json)
