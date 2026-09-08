# Showcase visual and interaction verification

Verified the local application in Chromium with actual Three.js WebGL rendering through SwiftShader. The harness uses the repository's React components, vendor assets, Geometry World engine, and builder extension. Geometry fixtures are created through the engine; selection, Showcase entry, orbit, PNG download, and exit use the rendered controls.

## Pavilion: 150 connected blocks

The fixture combines a stone platform and step, oak posts and beams, masonry footings, and 56 diagonal wedges arranged as a continuous pitched roof.

| Check | Result |
| --- | --- |
| Select build | All 150 student blocks selected |
| Desktop framing | All creation bounds fit a 1440 × 900 viewport |
| Portrait resize and entry | All bounds fit a 390 × 844 viewport; no horizontal overflow |
| Presentation | No backdrop blur and no placement ghost |
| Orbit | Right/left controls move the camera and return to the same framing |
| Editor shortcuts | Build, remove, shape, rotate, undo, and redo preserve the creation during Showcase |
| Save image | Valid 1418 × 828 PNG, 1,056,251 bytes |
| Escape | Restores camera pose/FOV, dock state, blocks, undo/redo, and persistent selection |
| Walking mode | Camera remains fitted after 650 ms, with zero movement velocity |
| Back to building | Restores the actual walking entry camera before ordinary gravity resumes |
| Diagnostics | No page errors or failed shader programs |

Screenshots: [desktop](showcase-desktop.png), [portrait](showcase-phone.png), and [downloaded PNG](showcase-download.png).

The camera-resize check waits for the actual resize observer rather than assuming a fixed 500 ms delay. The editor uses a resting FOV of 75 degrees; restoring a camera that was still easing toward that value is assessed separately from the Showcase framing.

## Long creation: 129 blocks

The separate portrait check selects a continuous 129-block row through the UI and evaluates all 3,096 mesh vertices. Every vertex fits the viewport and remains inside the camera clipping range. The furthest vertex is 453.81 world units from the camera; fog begins at 476.75, while the far clipping plane expands to 551.26. Closing restores the original far plane of 200 and fog range of 55–145.

A handler-level touch regression seeds active look/move identifiers and origins before entry. Showcase clears those identifiers, origins, and movement vector. A synthetic stale `touchmove` sent to the real canvas handler leaves the camera quaternion unchanged.

Reproduce with:

```text
node reports/geometry-world-graphics-2026-09-08/verify-showcase.cjs
node reports/geometry-world-graphics-2026-09-08/verify-showcase-large.cjs
```

Machine-readable evidence: [pavilion results](showcase-results.json) and [long-creation results](showcase-large-results.json). These are local functional and visual checks, not hardware frame-rate measurements or a physical printer test.
