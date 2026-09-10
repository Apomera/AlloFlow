# Retained creation after closing the inspector

The builder dock now reads a validated retained-selection summary when the measurement inspector is closed. Selected count, Showcase, Explore measurements and the Print Lab envelope remain available. Explore measurements explicitly restores the result when reopened.

The render-only cache compares the engine and live block metadata, so the existing 250 ms selection poll can discover connected edits without adding a duplicate measurement during unchanged renders. Changed shape, rotation, material, volume, layer or missing blocks invalidate the summary. The polling effect refreshes a visible inspector but preserves a deliberately closed one.

Validation: **46/46 focused tests passed**, using a 30-second per-test timeout. Six new regressions cover close/expand/reopen/Clear, unchanged polling, connected additions while closed, fractional shape/rotation edits, partial then full deletion, and replacement by lesson blocks. Existing 40 Geometry World/Print Lab bridge and workflow cases also pass. JavaScript syntax passes and canonical/desktop builder files are identical.

- Tests: `tests/geometry_world_retained_selection.test.js`
- Machine-readable results: `retained-selection-tests.json`
- Final builder SHA256: `83dd9e8661568139e666c6a1e3d0066b2bf739e48b52c826d3e335241dfb319e`

No additional browser was launched for this bounded fix; the final workspace browser verification is coordinated by the parent task.
