# Sculpt visual refinement — 2026-09-08

Refined the Sculpt canvas and editing controls in `stem_lab/stem_tool_geosandbox.js` and its matching public copy.

- Replaced dense selection lines on curved solids with a soft silhouette and sparse feature edges, with contrast adjusted for the paper background.
- Preserved intentional wireframe and transparent material appearances; selection decoration does not intercept pointer input.
- Reduced visible move caps and shortened axis stems to sit outside the selected part's rotated bounds. Larger invisible hit targets preserve usability.
- Added a persistent **Show move handles** option beside the selected-part controls. Locked parts show no move handles.
- Automatically frame the whole sculpture on entering Sculpt. Refresh world transforms before framing so initial scale is included.
- Selected-part framing now leaves room for the handles while keeping the selected part centered.

## Validation

- 60 tests passed across `geosandbox_sculpt_visuals`, `geosandbox_sculpt_editor`, `geosandbox_sculpt_drag`, and `geosandbox_visual_clarity`.
- The new geometry tests use the project's real Three.js build to verify curved-surface outlines, material preservation, rotated handle placement, and enlarged raycast targets.
- Final browser checks passed at 1440 × 1000 with midnight and paper backgrounds, and at 390 × 844 with midnight. Verified initial model fit, selected-handle fit, actual pointer taps and drags, undo, lock behavior, preference persistence, unchanged geometry, and no horizontal overflow. No page errors or failed requests were recorded.
- Visually inspected desktop and phone screenshots, including the final framing correction.
- Scoped `git diff --check` passed. Source and public mirror SHA-256 hashes match.

Browser evidence: `scratch/geometry-sculpt-visuals-2026-09-08/browser-results.json` and the adjacent screenshots. This pass covers browser Sculpt rendering; physical headset behavior was not tested.
