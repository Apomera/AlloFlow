# Geometry Sandbox: new-shape placement

The sculpt shape chooser now defaults to **Open spot**. New primitives find a clear grounded position near the grid center instead of appearing inside existing parts. **Placement → Center** remains available for intentionally overlapping forms. The placement preference persists with workspace settings and affects only future additions.

The bounded search uses conservative bounds for rotated primitives, a small separation gap, and the editor's permitted X/Z center coordinates. It also permits placement beneath raised parts when there is room. When no candidate fits, the chooser explains how to make room or use Center without changing the recipe, selection, panel, or undo history. Successful additions remain a single undoable edit; existing parts, including locked ones, stay unchanged.

Implementation is mirrored in `stem_lab/stem_tool_geosandbox.js` and `desktop/web-app/public/stem_lab/stem_tool_geosandbox.js`. Both SHA-256 hashes: `061E516DC7F6957C68635D38E3E4B918B6E634F834C070F80F39636EF0BBC228`.

## Validation

- Syntax check passed; source and public mirror match.
- 74 distinct unit tests passed: placement 14, starter shapes 20, chooser 7, editor 33. The first placement run exposed an incorrect test assumption about a rotated sphere's enclosing box; the test was corrected to inspect transformed mesh vertices and all 14 placement tests then passed.
- Real Chromium/WebGL checks passed at 1440, 390, and 320 pixels: separate grounded meshes, rotated locked original preservation, camera continuity, undo/redo, deliberate Center overlap, persistence after reload, and no horizontal overflow. No page errors or failed requests were recorded.
- Desktop and 320-pixel screenshots visually inspected. Browser evidence and screenshots: `scratch/geometry-placement-2026-09-19/`.

Placement is intentionally conservative; it may reserve empty space around rotated shapes or inside rings. Center and the existing position controls support precise overlapping arrangements. No physical VR headset testing or performance benchmark was performed.
