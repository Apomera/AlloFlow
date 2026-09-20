# Geometry Sandbox — curved surface quality

Sculpt previews now use smoother sphere, cylinder, cone, and torus meshes by default. Settings → Curve quality offers Lightweight, Smooth, and Extra smooth; the choice persists with the workspace. Reset display settings restores Smooth.

This is a display preference. Shape dimensions, analytic measurements, material settings, recipe data, camera position, and undo/redo history remain unchanged. Flat boxes keep their existing geometry.

The shared Prim3D renderer accepts the optional `surfaceQuality` setting. Callers that omit it retain their previous lightweight geometry, so other tools do not receive an unsolicited detail increase.

## Verification

- 59 tests passed across real Three mesh checks, shared Prim3D regressions, and sculpt selection visuals.
- Browser checks passed at 1440, 390, and 320 pixels: expected mesh detail, unchanged defining dimensions/material/camera/recipe, preserved redo, disposal of replaced geometry and material, saved quality after reload, reset to Smooth without altering the sculpture, and no horizontal overflow.
- Torus vertex counts: Lightweight 377; Smooth 1,825; Extra smooth 3,201. These counts verify that the controls change actual mesh detail.
- No browser page errors or failed requests in the final run. Desktop and narrow-phone screenshots reviewed.
- JavaScript syntax and scoped whitespace checks passed. Both source/public-mirror pairs match.
- Prim3D SHA-256: `40CD26D7983C4F437A1ED4C2518A532A7D419717AA24D4D9E24B3500C2679181`.
- Geometry Sandbox SHA-256: `0F8959353F98B2535EBE7DEA7D58DA5ABB4911669D9C34D6092F240182279649`.

Browser results and screenshots: `scratch/geometry-curve-quality-2026-09-19/`.

This pass validates browser rendering; no headset or frame-rate benchmark was performed.
