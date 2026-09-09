# History unit lookup performance — September 9, 2026

History rows previously searched the unit array independently to display their unit badges. This pass keeps an incremental ID index for the current render. It stops scanning when it finds a requested ID and reuses scanned IDs for subsequent rows. Each unit ID is normalized at most once for row lookup during a render, including when multiple resources refer to missing units.

The first matching normalized ID still wins when units have duplicate IDs. The index resets every render, so renames, ID changes, reorderings, deletions, and resource reassignment appear immediately. Unassigned rows do not initiate a scan. This avoids constructing a full index when a small view only needs units near the beginning of the array.

## Browser evidence

The probe compares the actual component against commit `7f1fdcd39`, using production React, 400 synthetic resources, 4× CPU throttling, and one isolated Chromium page. Both versions are warmed before three alternating measured runs each. ID reads are measured separately so their counters do not affect the timings. Full row text matched exactly for all 400 rows in both scenarios; no page errors occurred.

| Units | All unit-ID reads, before → after | Median mount, before → after | Median four updates, before → after |
| --- | ---: | ---: | ---: |
| 40 | 8,280 → 120 | 119.8 → 141.1 ms | 264.4 → 192.8 ms |
| 400 | 81,000 → 1,200 | 152.4 → 89.3 ms | 325.9 → 183.8 ms |

The ID counts include two existing selector reads per unit. Row lookup alone therefore falls from 8,200 to 40 reads and from 80,200 to 400 reads respectively. Those selector reads remain unchanged.

Both update comparisons improved. The smaller scenario's mount comparison was slower, so these measurements do not establish a universal mount improvement. Timings are local component evidence from a busy host with three measured samples; they omit production utility CSS and do not measure cold-page startup or field Core Web Vitals. The bounded scan counts are the deterministic improvement. See [browser.json](browser.json) for all samples.

## Validation and delivery

- **51 tests passed across nine files**, with no failures or skips. New coverage checks lazy scanning, repeated misses, first duplicate selection after normalization, malformed IDs, fresh edits, and the actual generated panel's unit badges after rename, reassignment, reorder, and removal.
- Existing history display, search/discovery, identity, theme, reorder, move-to-unit, sharing, and navigation tests passed.
- Generated module syntax and scoped whitespace were checked. Root, public, and existing app-build module bytes match.
- The main shell's CDN version is updated. Desktop sources currently use local module paths; those concurrent changes were preserved.
- No deployment, push, or new desktop installer.

## Reproduce

```powershell
node dev-tools/history_unit_lookup_performance.cjs
node node_modules/vitest/vitest.mjs run tests/history_unit_lookup_performance.test.js tests/history_display_performance.test.js tests/history_panel_theme.test.js tests/history_panel_discovery_controls.test.js tests/history_panel_reorder_a11y.test.js tests/history_panel_move_to_unit_a11y.test.js tests/history_panel_share.test.js tests/history_instance_identity.test.js tests/history_navigation_lane_visual.test.js --maxWorkers=1 --testTimeout=30000
```

The browser probe reads the preceding source from Git, so it does not depend on an untracked snapshot. `HISTORY_BASELINE_REF` can select another baseline. This pass retains all history rows and their interaction model; it does not address DOM cost from extremely large resource lists.
