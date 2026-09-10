# Selection polling refinement

The builder's 250 ms refresh now avoids repeating the connected-component measurement when a complete retained selection and its six-face boundary are semantically unchanged. The cache stores the engine and measurement-function identities, normalized selected membership, and primitive tuples for every selected or adjacent occupied/missing cell. Tuples cover dictionary occupancy, grid position, shape, rotation, material type, volume, measurement layer, and lesson protection flag. Idle checks compare these saved fields without constructing a JSON world snapshot or rebuilding the boundary.

This boundary is sufficient for the actual core traversal: any new path connecting another block to a complete component must first change one of its six-face neighbors. Every disconnected retained part contributes its own boundary. A fresh measurement rebuilds the cache after it has expanded connected additions and removed vanished retained cells. Unrelated remote edits do not invalidate it. Null or incomplete measurements are never cached, so a truncated component is retried. Engine or selected-membership changes force fresh validation.

The interval also skips its downstream selected signature and outline/STL refresh when the cached result is unchanged. Its changed-selection signature now includes volume and lesson/layer metadata, fixing a volume-only edit that previously left an open inspector stale. Closed and unrelated inspectors keep their existing state. Explicit Print Lab, Showcase, Focus, and measurement actions continue using the uncached `selectionMeasurement` path.

Production changes are limited to the selection helper/refresh sections of `stem_lab/stem_tool_geometryworld_builder.js` (helpers beginning at line 618; refresh beginning near line 1438) and its matching desktop mirror. No geometry, rendering material, camera, STL, collision, or history behavior was changed.

## Verification

`selection-cache-final-tests.json`: **32 passed, 0 failed, 0 failed suites** across the actual-core polling fixture and mounted retained-selection/dock suites. Coverage includes new connecting bridges, removal splitting retained parts, metadata edits without dirty/history flags, engine/measurement-function replacement, remote edits, every retained part's boundary, real 1501-block truncation and retry, transient null retry, selected volume updates, and closed/unrelated inspector preservation. Direct deliberate selection validation remains fresh after warming the polling cache. Canonical/mirror parity and syntax passed.

The earlier report is preserved as `selection-cache-initial-tests.json` (also retained at its original `selection-cache-tests.json` filename). Its two failures were overly strict new mounted call-count assertions: a mutation can cause both the poll and the existing render-summary measurement. Final assertions require the correct fresh value and zero additional measurements after that mutation has settled. The actual-core helper tests independently verify exactly one traversal per invalidation.

## Bounded CPU and traversal diagnostic

`selection-tuple-diagnostic.json` uses the actual source `measureStructure` and measurement helpers in Node 24.11.1 on Windows ARM64, with 625 protected floor cells and 1, 45, or 875 retained student blocks. Each timing has 20 warm-up calls and 7 samples; sample repetitions are respectively 150, 60, and 15. Values below are medians per synchronous invocation.

| Selected blocks | Cached guard | Fresh measurement | Accepted block visits avoided over 40 idle polls |
| ---: | ---: | ---: | ---: |
| 1 | 0.0023 ms | 0.0103 ms | 40 |
| 45 | 0.0299 ms | 0.2975 ms | 1,800 |
| 875 | 0.3688 ms | 3.9809 ms | 35,000 |

All three fixtures performed **zero extra measurements over 40 unchanged polls**, versus 40 without the cache. These are shared-host, synchronous Node microbenchmarks; browser QA could also run on the host. They exclude downstream React render, STL construction, GPU work, and frames per second. Absolute timings varied considerably with host load, so they should not be presented as browser FPS improvements or universal runtime guarantees. First measurement and actual edits still pay for measurement plus a fresh boundary snapshot.

Two earlier approaches were measured and retained separately: `selection-polling-diagnostic.json` scanned and serialized the entire world, which cost more than measuring a tiny selection; `selection-frontier-diagnostic.json` rebuilt and serialized the boundary every poll, which was slightly slower than fresh measurement for the broad 875-block fixture. The final saved-tuple guard was faster in all three fixtures within its own timing run.

To reproduce the final diagnostic, run `node reports/geometry-world-mobile-refinement-2026-09-09/measure-selection-polling.cjs`. For regression verification, run Vitest on `geometry_world_selection_poll_cache.test.js`, `geometry_world_retained_selection.test.js`, and `geometry_world_dock_selection.test.js` with one worker and a 30-second test timeout.
