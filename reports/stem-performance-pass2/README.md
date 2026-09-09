# Browser performance: STEM persistence and road sampling

Local validation, September 9, 2026. This pass implements two measured improvements: less autosave work in the shared STEM host and constant-time endpoint lookup in Road Ready's road cache. Solar System was profiled; its experimental canvas change was reverted because the results did not establish a benefit.

## Implemented changes

**STEM autosave:** the host watches the existing saved tool buckets, combines rapid updates within a fixed 400 ms window, and serializes only when that window is flushed. An update to an unsaved tool does not trigger serialization. An identical serialized payload does not trigger another storage write. The fixed window is not reset by every update, so continuous activity cannot indefinitely postpone saving.

Pending data flushes when the modal unmounts, the document becomes hidden, or `pagehide` fires. Failed storage writes remain retryable on a later update or lifecycle event. The existing storage key, hydration flow, whitelist, Flight Sim exclusions, and Beehive resume sanitization remain intact. This follows the host's immutable `update`/`updateMulti` contract: changed tool buckets receive new references.

**Road Ready:** `ensureUpTo` and `ensureDownTo` previously enumerated every cached sample on every position/heading query. The spline now tracks its cached endpoints as samples are added. Cleanup updates those endpoints during its existing pruning pass. The seeded road calculations and interpolation are unchanged, including their existing boundary and empty-cache behavior.

The canonical host and Road Ready files were copied to their existing public/app-build mirrors. This pass does not produce a new desktop installer or publish a release.

## Evidence

The autosave benchmark executes the actual old effect and new helper in isolated Chromium at 4× CPU throttling. It uses a synthetic approximately 57 KB saved payload and 300 synchronous state updates. It measures persistence work, not full-app React rendering or INP.

| Workload | Before | After | Measured persistence-path time |
| --- | --- | --- | --- |
| 300 updates to an unsaved tool | 300 serializations / 300 writes | 0 / 0 | 196.9 → 3.2 ms |
| Burst of 300 saved-state updates | 300 serializations / 300 writes | 1 / 1 | 200.9 → 0.9 ms |

Both versions produced the same final saved values. The burst benchmark explicitly flushes at its end; the timer and lifecycle behavior are covered separately by regression tests. Raw results: [autosave.json](autosave.json).

An instrumented road-cache benchmark made 2,000 warmed position/heading queries. Enumeration fell from **2,000 scans / 2,008,000 visited entries to zero**, with an identical output checksum. Proxy instrumentation exaggerates wall-clock cost, so its timings are not presented as application speedups. Raw counts and source hashes: [spline-cache.json](spline-cache.json).

The actual Road Ready residential driving scene was also profiled in local Chromium with 4× CPU throttling and SwiftShader:

| Measurement | Before | After |
| --- | ---: | ---: |
| Mount request to detected live WebGL canvas | 22.8 s | 4.8 s |
| Script time during mounting and the subsequent sample | 27.0 s | 8.4 s |
| `ensureUpTo` + `ensureDownTo` self time | 11.1 s in top CPU costs | Neither in top 35 CPU costs |

These single-run timings are directional evidence. This is a busy shared Windows checkout, other tool edits continued during the audit, and SwiftShader is software rendering. It is not a physical Chromebook GPU or field Core Web Vitals benchmark. Frame-gap samples include startup and must not be read as steady-state FPS. The cache-operation comparison above provides a timing-independent confirmation of the specific improvement.

Raw traces: [Road Ready before](roadReady-before.json), [Road Ready after](roadReady-after.json), and the corresponding `.cpuprofile` files in this directory.

## Solar System and the next measured targets

Solar System's initial profile attributed about 1.7 seconds of self time to `solarWorldPortrait`. Its existing module-level portrait cache already avoids regeneration on later renders. A CPU-backed canvas experiment did not establish an improvement; only that experimental change was removed, preserving concurrent Solar System work. [Initial profile](solarSystem-before.json) and [reverted experiment](solarSystem-after.json) remain for inspection; the latter does not describe an accepted optimization.

The next focused targets are:

- Defer or pre-generate Solar System's initial portrait images, with a visual comparison of the geographic detail and a frozen-source startup comparison.
- Reduce Road Ready's roughly 1,400 draw calls through batching repeated scenery and reusing geometry. The post-change profile is now dominated by Three.js scene updates and rendering; this pass does not claim to have fixed that remaining rendering cost.
- Profile optional-mode parsing/loading before splitting the largest tool modules or moving computations into workers.

## Validation

- **217 unit tests passed; 7 existing legacy-adapter cases skipped**, across six focused suites.
- Autosave: burst coalescing, unrelated state, hydration, identical data, continuous updates, removed state, Flight Sim exclusions, Beehive sanitization, visibility/pagehide/unmount flushes, write retry, and cleanup/remount.
- Spline: 12 captured pre-change scenarios across three seeds and four road profiles, covering forward/reverse interpolation, pruning, revisiting ranges, and complete cache eviction. Repeated cached queries also preserve memory size and sample identity.
- Existing Road Ready logic and Beehive persistence/investigation suites passed.
- **10 browser conformance checks passed**: live context, nonblank pixels, stable size, keyboard reachability, and unmount cleanup for both profiled tools.
- Canonical host and Road Ready syntax checks passed. Final source/mirror hashes are in `validation.json`. No deployment was performed.

Reproduce focused tests:

```powershell
node node_modules/vitest/vitest.mjs run tests/stem_autosave_performance.test.js tests/roadready_spline_performance.test.js tests/roadready_logic.test.js tests/beehive_host_persistence.test.js tests/beehive_honey_investigation.test.js tests/stem_runtime_performance.test.js --maxWorkers=1 --testTimeout=30000
node node_modules/@playwright/test/cli.js test tests/e2e/22-stem-gl-conformance.spec.ts --grep 'roadReady|solarSystem' --workers=1 --retries=0 --reporter=list
```

Reproduce profiling with `node dev-tools/stem_simulation_performance.cjs --after --tool=roadReady`. The autosave and spline benchmarks accept a pre-change canonical file path as their first argument; by default they use this pass's local snapshots under `scratch/stem-performance-pass2`. Preserve those snapshots before rerunning a before/after experiment. Compact release artifacts from the previous pass require regeneration from the final release checkout; this pass makes no new all-artifact freshness claim.
