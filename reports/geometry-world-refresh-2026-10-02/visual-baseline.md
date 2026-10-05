# Geometry World Visual Baseline

Captured on 2026-10-02 with Chromium software WebGL, local React and three.js, and the working-tree Geometry World modules.

The initial batch contains six screenshots in `baseline/`: desktop and phone profiles for the home chooser, Volume Explorer workspace, and Free Build. Desktop is 1280 x 800. Phone is 390 x 844 with a touch profile and iPhone user agent.

All six views have a live WebGL context, exactly one canvas filling its container, no workspace overflow, and no runtime errors. Center pixel samples are 1024/1024 nonblack with 142 to 459 distinct colors. The view is a rendered 3D scene rather than an empty canvas.

The working tree changed while this batch ran. `desktop-home.png` captures the earlier home design. `phone-home.png` captures an interim design with the Geometry World headline and investigation section. Use the full final capture after edits settle for a consistent visual review.

## Findings

- The original desktop home chooser has broad rounded containers and nested sections; My Worlds falls below the first viewport.
- The guided world stays open and spacious, but entry does not expose a concrete next geometry task. Estimate and Objectives are small toolbar actions.
- The desktop Free Build tool dock contains several stacked workflows and scrollable details. The initial clipping metric counted the dock's scroll contents; the reusable check now excludes these expected scroll regions.
- The upright phone leaves the world visible and provides movement, Measure, Talk, and More controls. Free Build adds shape and material rows plus Build tools, making the lower workspace dense.

## Reusable Preview

From the repository root:

```powershell
node scratch/geometry-world-refresh-2026-10-02/preview-server.mjs --port 4178
```

Use `http://127.0.0.1:4178/?mode=home`, `?mode=lesson`, or `?mode=build`. Omit `--port` for a free ephemeral port. The lesson can be selected with `&lesson=volumeExplorer`.

The server extracts the existing HARNESS from `tests/e2e/18-geometry-world-gl.spec.ts`, so it uses the same state bridge and real local assets as the WebGL tests. It is a focused tool preview, not the full application shell.

```powershell
node scratch/geometry-world-refresh-2026-10-02/visual-check.mjs --tag final
```

Optional flags: `--profile desktop`, `--profile phone`, `--mode home`, `--mode lesson`, `--mode build`, `--base http://127.0.0.1:4178`, and `--out reports/geometry-world-refresh-2026-10-02/final`.

The capture runner creates its own ephemeral server when no base is supplied and closes its browser and server when finished. It emits PNG screenshots and `report.json` with pixel checks, dimensions, overflow, visible clipping, touch activation, and errors. Browser runs should remain sequential with other Geometry World WebGL suites to avoid exhausting software-rendered contexts.
