# Saved-resource history performance — September 9, 2026

This pass reduces repeated formatting work in the real HistoryPanel. The source, generated module, existing module mirrors, and the three shell references to its cache version were updated. No deployment or new desktop installer was produced.

## Changes

- Reuse one lazily created `Intl.DateTimeFormat` for the visible row dates during each render, instead of calling `toLocaleDateString` separately for every row. Preserve the same default locale, timezone, and month/day/year options, with the native fallback when `Intl.DateTimeFormat` is unavailable.
- Resolve each shared resource-type label once per render, including labels used by type sorting, filtering, and row metadata.
- Keep item-specific default-title calls separate: each row can still supply its own title. Both caches reset every render, so a stable title-provider function that changes language also produces fresh labels immediately.

The date change follows the documented recommendation to reuse a formatter for repeated formatting with the same arguments. [MDN: Date.toLocaleDateString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString).

## Measured work

The instrumented browser fixture renders the actual component with 400 synthetic resources across four types, using production React and 4× CPU throttling.

| Initial render work | Before | After |
| --- | ---: | ---: |
| Per-row `toLocaleDateString` calls | 400 | 0 |
| Explicit shared date formatters | 0 | 1 |
| Shared type-title provider calls | 412 | 4 |
| Item-specific title calls | 400 | 400 |
| Displayed resource rows | 400 | 400 |
| Search matches for `Resource 39` | 11 | 11 |

The formatter-constructor counter only observes explicit JavaScript construction; it does not count constructors internal to native date methods. **All 400 date labels and ISO timestamps match exactly** between versions. Raw instrumented results: [before.json](before.json), [after.json](after.json).

The first independent runs had mixed mount timing on the busy host. A follow-up used fixed before/after sources in one browser page, warmed both once, then alternated three measured runs per version without instrumentation:

| Paired median, after warmup | Before | After |
| --- | ---: | ---: |
| Mount the 400-row panel | 138.9 ms | 55.2 ms |
| Four panel updates | 408.8 ms | 139.2 ms |

These are local component measurements, not cold-page startup, field INP, or whole-app Core Web Vitals. The fixture omits the production utility CSS framework. Three samples per version give directional evidence rather than a cross-device guarantee. Full samples: [paired-timing.json](paired-timing.json).

## Validation

- **46 tests passed** across eight focused history test files; no failures or skips.
- Date formatting matches native output in English, French, Arabic, and Japanese, including leap-day and near-midnight inputs. Invalid dates remain excluded, and the fallback without `Intl.DateTimeFormat` is covered.
- Actual generated-panel tests preserve individual row titles, refresh language with the same provider function, and check valid/invalid dates.
- Existing identity, reorder, move-to-unit, discovery/search, sharing, theme, and navigation tests passed.
- Module syntax, source/mirror hashes, loader version references, and scoped whitespace were checked. See [validation.json](validation.json) and [tests.json](tests.json).

## Reproduction

Run `node dev-tools/history_panel_performance.cjs` against current source. Add `--before` to use the local pre-change snapshot at `scratch/history-performance/source.before.jsx`. Run `node dev-tools/history_panel_paired_timing.cjs` for the alternating comparison; it also requires that snapshot.

```powershell
node node_modules/vitest/vitest.mjs run tests/history_display_performance.test.js tests/history_panel_theme.test.js tests/history_panel_discovery_controls.test.js tests/history_panel_reorder_a11y.test.js tests/history_panel_move_to_unit_a11y.test.js tests/history_panel_share.test.js tests/history_instance_identity.test.js tests/history_navigation_lane_visual.test.js --maxWorkers=1 --testTimeout=30000
```

This does not reduce the number of rendered history rows. Very large packs can still incur DOM/rendering cost. Any later paging or virtualization work should separately verify keyboard navigation, reordering, find-in-page, and screen-reader behavior.
