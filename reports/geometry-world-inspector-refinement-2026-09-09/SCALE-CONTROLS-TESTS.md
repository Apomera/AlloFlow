# Print-scale controls verification

The new focused suite passes **39 tests in one loaded test file**, with process exit code **0**. It loads the current production builder, mounts its actual React UI and uses local THREE r128 geometry and production STL/export helpers. No production files were changed by this verification subtask.

- Valid numeric values and numeric strings at the supported boundaries publish one context patch, preserving AI disclosures and unknown context fields.
- Blank, nonnumeric, boolean, object/array, nonfinite and out-of-range values return an error without changing or publishing state. The existing update-only host fallback works.
- The **Adjust print size** disclosure contains labeled native numeric editing, three accessible presets, explicit Apply and custom validation with linked error text.
- A user-opened disclosure stays open through oversized and fitting presets and custom Apply, retaining its form/input and input focus. An explicit close survives rerenders and a later oversized scale; an initially oversized creation opens automatically.
- Presets update the selected width/depth/height immediately. Custom text stays a draft until Apply; a valid applied value updates dimensions, occupied volume and per-axis fit together.
- Invalid drafts preserve their text and the applied scale. A subsequent preset clears the error. A new live scale from Print Lab synchronizes the draft, and later edits preserve the new context fields.
- All these transitions preserve actual construction geometry, transforms, materials, selection, camera, history and raw selected STL bytes.
- Selected STL download changes only the copied coordinates and unit header: triangle count, normals and triangle attributes remain unchanged. Existing pending handoff/return state remains untouched.
- Print Lab receives the original selected block-unit STL with the same applied `unitMm` and AI context. An unrelated student block remains outside the exported selection.

The parent task's browser check covers phone/desktop layout and actual pointer/keyboard interaction. This suite does not claim rendered GPU output.

## Evidence

- Test source: `tests/geometry_world_scale_controls.test.js`
- Final JSON: `reports/geometry-world-inspector-refinement-2026-09-09/scale-controls-tests.json`
- Command: `node node_modules/vitest/vitest.mjs run tests/geometry_world_scale_controls.test.js --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile=reports/geometry-world-inspector-refinement-2026-09-09/scale-controls-tests.json`
- Console and JSON agree: one loaded suite, 39 passing cases, zero failures; process exit 0.
- Canonical builder and desktop mirror are byte-identical. SHA-256: `c82515d98464649fdbf3bec62118ef3abe6aa8dc3cac2e81cdaf2e8c1df6948f`.
