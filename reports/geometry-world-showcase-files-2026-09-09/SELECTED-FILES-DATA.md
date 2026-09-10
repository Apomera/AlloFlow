# Selected creation file helpers and Print Lab lifecycle

Implemented in `stem_lab/stem_tool_geometryworld_builder.js` and its desktop public mirror. This subtask changed data/export helpers and the Print Lab handoff; the parent implemented the Showcase file panel separately.

- `selectedEditableWorld(engine)` remeasures the retained selection, including disconnected retained pieces and connected edits made since the previous UI update. It excludes the floor, lesson structures, and other creations. The returned `{ok,value,summary}` uses the existing checked `alloflow-geometry-world/2` format, preserving materials, fractional shapes and rotations while centering X/Z and placing the minimum Y at 1. Oversized or invalid creations fail validation without clipping the live world.
- `saveSelectedEditableWorld(ctx)` downloads that checked JSON and returns success/failure. `selectedBuildStlDownload(ctx)` uses the selected production mesh bundle and current Print Lab scale. Both remain in Showcase and leave pending Print Lab and return-project globals untouched.
- `scaleStlForDownload(buffer,unitMm)` scales a binary STL copy to millimetres. Face normals, attributes and original block-unit bytes remain unchanged. The existing standalone Print Lab fallback uses this same helper and retains its prior filename, header and handoff behavior.
- Print Lab navigation prepares the selected bundle before leaving Showcase. It then restores the building camera synchronously and captures the return project with `showcaseActive:false`, `showcaseSaving:false` and the original dock collapsed state, even while the event's React context still describes Showcase. An active Showcase never substitutes an unrelated aimed creation if its selection disappears.
- File downloads and Print Lab handoff reject synchronous activation while a Showcase PNG is encoding.

The four helpers are exposed through `window.StemLab.geometryWorldBuilderPure` for UI integration and tests. The editable format remains a geometry/material document; it does not add printer scale or physical filament metadata.

Validation: **39 unique passing tests**. The new `tests/geometry_world_selected_files.test.js` contributes 23 tests using actual THREE r128 geometries, the production connected-selection measurement, and the unchanged production Showcase entry/exit closure. Existing Print Lab workflow tests contribute 14; existing standalone STL tests contribute 2. No browser was launched by this subtask.

Coverage includes fresh/disconnected selection, no aimed fallback, schema bounds, editable reimport, all normals and vertices through recentering, exact physical STL scaling at four scales, unchanged live world/history, download failure cleanup, image-export guards, preparation failure, and both expanded/collapsed dock states through a real Showcase camera → Print Lab → building round trip. Same-position project return and direct-download STL comparisons are byte exact. Recentered editable imports compare every numeric triangle component to 1e-6 because changing world-space coordinates changes floating-point cancellation.

Evidence:

- `selected-files-tests.json`: initial combined run; both existing suites passed. One initial new-test assertion compared raw bytes across intentional recentering and was corrected to compare physical geometry.
- `selected-files-retry-tests.json`: all 23 new tests pass after that assertion correction.
- `selected-files-verification.json`: concise final unique-test and source parity summary.
- `before-source/`: canonical core and builder frozen before this pass.

The parent's new file UI was reviewed against these contracts: actions invoke the helpers directly, import parsing leaves the current world intact, and replacement remains a separate explicit action. JSON import intentionally resets the printer context to the existing default scale.
