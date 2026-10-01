# Citation cache candidate

`cache-fragment.js` replaces `remember` and `lookup` inside the evidence runtime IIFE in `own_sources_module.js`. Its only outer dependencies are `root` and `storagePrefix`. Remove the old unused `memory` variable. The fragment defines `normaliseSnapshot`, `remember`, `lookup`, `cacheLimits`, and private helpers; public exports of the normalization helper or limits are optional.

## Contract

- `remember(items)` returns `true` only when every valid batch member is confirmed in persistent storage after writes and retention cleanup. It returns `false` for invalid/conflicting/unretainable batches or failed durability. Valid snapshots still fit within bounded session memory when persistent storage refuses them. An empty array succeeds.
- `lookup(id)` returns a fresh normalized copy or `null`; internal cache metadata and arbitrary stored properties are never returned. It accepts existing raw snapshot JSON without cache metadata. Recency updates are optional, throttled to one minute per resident entry, and never cause quota eviction.
- Citation IDs are immutable while an existing normalized snapshot is available in memory or storage. Identical re-remembering is accepted; changed snapshot content under the same ID is rejected before overwriting it. Legacy records retain their exact quotations.
- IDs use 1–128 lowercase ASCII letters, digits, or hyphens. The schema requires string source/evidence IDs (maximum 200), title (500), locator (200), passage (1–1200), and supplied date (64), plus a positive safe integer or null version. No quotation is truncated. Individual persistent records must fit 16 KiB, including reserved metadata space.
- Persistent retention is at most 200 owned entries and 512 KiB; resident memory is at most 64 entries and 256 KiB. Bytes estimate UTF-16 serialized key/snapshot payloads; memory also counts retained raw JSON. These are payload limits, not JavaScript heap measurements. A batch that cannot fit protected in memory is rejected before writes.
- Persistence uses the existing `alloflow.research-evidence.v1.<id>` keys and raw snapshot shape, with optional numeric `__cacheLastUsed`. There is no separate index or TTL. Only exact matching owned keys are eligible for cleanup. Document library, lesson, and other namespaces are untouched.
- New writes first attempt storage normally. Only a quota error initiates eviction/retry; access and other write errors trigger no further cleanup. Successful saves also enforce retention budgets. Current-batch IDs cannot be evicted. Malformed owned records have lower retention priority than valid records.
- Cleanup compares the stored raw value with its scanned value. Refreshed entries are skipped; entries already deleted by another context cause a retry/budget recheck before another eviction. A final read checks the complete batch before reporting durable success.

## Validation

`npx.cmd vitest run tests/own_source_citation_cache.test.js --maxWorkers=1`: **41/41 passed** against the fragment. Includes reload durability, count/byte limits, session fallback, blocked storage access, quota recovery, immutability, validation, legacy snapshots, current-batch protection, conflicting/concurrent changes, recency throttling, and original-library preservation. Scoped whitespace check passed.

The suite now defaults to the integrated `own_sources_module.js` runtime (only its evidence IIFE is evaluated). Set `CITATION_CACHE_SOURCE=reports/own-source-citation-durability-2026-09-26/cache-fragment.js` to retest the original candidate separately.

## Limits

LocalStorage offers no transaction or atomic compare-and-remove operation. The compare-before-delete and final-batch checks narrow cross-tab races, but another tab can still change storage after a successful check. Quota recovery can remove older cached citation copies before a later write fails; the original document library and generated source appendices are not part of this cache and remain untouched. Memory-only snapshots cannot survive reload. When a cached snapshot is unavailable, the inspector points to the exact source appendix; automatic restoration from exported appendices is deferred.
