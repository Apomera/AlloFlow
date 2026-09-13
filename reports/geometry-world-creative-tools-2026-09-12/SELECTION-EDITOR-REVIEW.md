# Whole-creation editing and camera review

Implemented in the canonical Geometry World builder and engine; parent owns desktop mirror synchronization and browser verification.

## Creation editing

- The retained outline is the editing scope, including disconnected pieces. Move on X/Y/Z, duplicate, rotate 90° around Y, mirror across X or Z, and change material all operate on those same cells.
- Rotation keeps the footprint's minimum grid corner fixed. This keeps odd/even rectangular footprints on integer cells. Mirroring updates diagonal-half and quarter-wedge rotations to preserve the actual reflected solids.
- Every operation first produces a wireframe preview and a textual result. Apply revalidates the source selection and transaction destinations. Changed source cells, occupied destinations, protected ground, world bounds, and capacity limits reject the operation without partial edits.
- Each commit uses the shared atomic batch API and records one Undo action. Undo and Redo restore the before/after selection, including disconnected parts, and retain exact fractional recipes.
- Edit controls and the stamp library are closed disclosures initially. Numeric grid fields have explicit labels, and controls have 44 px minimum targets.
- Selection previews cancel active drawing and switch to single-block mode. Choosing another drawing mode clears the selection proposal. A replaced preview cannot be applied silently.

## Reusable stamps

- Save a named selection as editable block recipes in browser-local storage; choose a whole-number grid corner or use the aimed cell, preview, then apply.
- At most 12 named stamps, 1,500 blocks per stamp, 6,000 blocks total, and 768 KiB of stored data. Recipes use the existing editable-world schema's coordinate, material, shape and rotation validation.
- Duplicate names do not replace earlier recipes. Invalid libraries are not overwritten; denied storage or quota errors leave the world and existing library unchanged.
- Placing a stamp creates one Undo action. Removing a saved recipe leaves every placed block intact. Exported editable worlds remain the portable way to keep and share work.

## Camera tools

- Front, Side, Top, and Free view appear beside Focus creation. Existing native view controls also target selected geometry bounds in Free Build and retain authored lesson targets elsewhere.
- Orbit & views extends the existing compact camera return bar with left/right orbit, tilt, closer/farther, and preset controls. Repeated keyboard adjustments retain button focus.
- Camera fitting uses the selected transformed geometry and available viewport rectangle. It supports narrow displays, keeps the camera above the floor, and adjusts far clipping and fog only while focused.
- Previous view restores the exact original position, quaternion, up vector, projection and fog. Focus keeps flight mode unchanged and yields to manual movement and look input.

## Verification

- `selection-camera-regressions.json`: 208 passing tests across seven files, including 83 new selection/stamp tests, 14 new selected-camera tests, and existing camera, inspector, import and Print Lab regressions.
- `selection-ui-final.json`: 103 passing tests across three files after preview ownership integration: 83 selection/stamp tests, seven mounted editor UI tests, and 13 builder navigation tests.
- Unique latest coverage across both runs: 228 passing tests across nine files. Tests use the production batch and placement functions with real Three.js geometry. All 48 combinations of four shapes, four initial rotations, and rotation/X-reflection/Z-reflection are compared against transformed world-space vertices.
- Mounted UI checks cover closed disclosures, labelled coordinates, drawing/selection preview ownership, stale overlay rejection, named stamp saving, aimed-cell capture, and library availability without a selected creation.
- Whitespace checks passed. Browser visual checks and final whole-pass aggregation belong to the parent task. No deployment or commit was performed by this subtask.

The initial selection-only run had one test fixture ordering mismatch (expected X-first ordering; canonical recipes sort Y-first). It was corrected, and all 83 tests passed in both subsequent runs.
