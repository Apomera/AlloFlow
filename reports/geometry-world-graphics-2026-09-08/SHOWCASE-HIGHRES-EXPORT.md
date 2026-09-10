# High-resolution Showcase PNG export

**Save image** now renders the actual 3D scene at a **2048-pixel long edge**, preserving its aspect and camera framing. This is a new renderer/composer render at the output resolution, not enlargement of the screen bitmap. Output is bounded to at most 4.2 million pixels and capped by the device's texture, renderbuffer and viewport limits. No resolution wizard was added.

The exporter temporarily sets the renderer and active postprocessing composer to DPR 1 and the export dimensions, then calls native PNG encoding. Its `finally` block restores the live renderer **before encoding completes**, including logical dimensions, DPR, render target, viewport, scissor, clear state and XR setting. It also restores the composer's independent dimensions/DPR, read/write targets and pass output flags. Logical dimensions restore before DPR to avoid creating an unnecessarily large intermediate buffer on high-DPR displays. Camera, look, geometry, selection and undo history are not changed.

Save image reports its busy state, retains its accessible name and keyboard focus stop, and ignores repeated activation while encoding. Encoding has a bounded timeout after GPU work finishes. Capture and download failures clear the busy state; temporary download links and URLs are cleaned up even if clicking the link throws. Re-entering Showcase reconciles the busy state with the live engine.

## Verification

**51 tests passed:** 11 new export tests plus the 40 existing builder / Print Lab tests. New checks cover aspect and output bounds, actual render dimensions, deferred encoding, independent composer DPR, failures during renderer/composer rendering, resizing and encoding, a missing encoder callback, blocked downloads, cleanup and repeated Save clicks. The final run used a 30-second per-test budget because concurrent browser work caused existing exhaustive geometry cases to exceed their ordinary 5-second limit. See `highres-export-tests.json` and `tests/geometry_world_showcase_export.test.js`.

The real React + WebGL verifier `verify-highres-export.cjs` passed with a 150-block pitched pavilion containing 634 STL triangles, at DPR 1.25:

| Export | Live drawing buffer | Saved PNG | File size |
| --- | --- | --- | --- |
| Desktop Meadow, raw renderer | 1447 × 981 | **2048 × 1388** | 2,005,753 bytes |
| Phone Studio, real composer | 470 × 971 | **991 × 2048** | 397,414 bytes |

Instrumentation at the native `toBlob` call recorded the renderer—and the active composer—at the exact saved dimensions and DPR 1. Decoded PNG pixel samples confirmed substantial opaque, varied scene content. Both PNGs were visually inspected: material and roof details are clear, and the Studio backdrop is seamless.

Exact renderer/composer dimensions, DPR, targets, viewport, scissor, clear state and camera values matched before and after each save. The selected STL hash remained `4320e16c857d3aa501d4035ce761621748cd45e75d65d9417947f9263cb2fb1a`; block data, selection and undo/redo history were unchanged. An injected failure inside the real composer render path also restored the complete live state and reported a recoverable save error. There were no page, console or shader errors. See `highres-export-results.json`.

Final PNGs:

- `showcase-hires-phone.png` — Studio, 991 × 2048; recommended sharp preview.
- `showcase-hires-desktop.png` — Meadow, 2048 × 1388.

Production changes are limited to the builder source and its identical desktop mirror. Core rendering and Print Lab source were not edited.
