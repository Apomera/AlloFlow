# Selected creation inspector regression verification

The new focused suite passed **10 of 10 tests**, with **one test file present** and **process exit 0**. It mounts the production builder with actual React and the local THREE r128 geometry helpers. No production source was changed by this verification task.

Verified behavior:

- A valid retained student selection drives the two-metric selected-creation summary, even when the separate measurement inspector describes another build or the ground.
- Fallback-only, stale, ground, and incomplete measurements do not receive the retained-selection scope claim. Ordinary building controls and the three-metric summary keep their normal order.
- Clearing selection restores the ordinary layout without editing geometry, materials, transforms, placement totals, history, or camera.
- Selection changes and unrelated updates retain the exact scale input and form nodes, an unapplied draft, disclosure state, and keyboard focus. This also holds when the keyed sections move between retained-selection and fallback-only layouts.
- The existing Select action updates the displayed creation, and Print Lab receives the exact corresponding raw selected STL, selected block model, and applied physical scale. Both source builds remain unchanged.

Artifacts:

- Test: `tests/geometry_world_selected_inspector.test.js`
- Machine result: `reports/geometry-world-control-polish-2026-09-10/selected-inspector-tests.json`

Command:

```text
node node_modules/vitest/vitest.mjs run tests/geometry_world_selected_inspector.test.js --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile=reports/geometry-world-control-polish-2026-09-10/selected-inspector-tests.json
```

Tested builder SHA-256: `b62113856efd1f46144402fbadb649bee1c84ebe1d75004ab01c2c0fb0a51d51`. Canonical source and desktop mirror are byte-identical. No browser was launched; visual viewport verification is handled by the parent task.
