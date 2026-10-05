# Shared device-storage loader coherence

The first combined run retained 296 passes and one failure out of 297 cases. The existing `tests/device_storage_bridge.test.js:251–265` lists eight shared loader files and requires the same DS6 client URL as the source hosts. All eight still fetched `ds5-partition-consent`. The expectation remains unchanged; this proposal repairs the actual URLs.

`prepare_cache_coherence.cjs` is report-local and unrun by this worker. Default mode creates immutable before/candidate bytes, patches, fresh content pins and a preparation receipt. Only the coordinator uses `--apply`. Its eleven production targets are:

- UtilsPure source, root module and public module;
- View Persona Chat source, root module and public module;
- ExportHandlers root/public modules;
- The canonical source host and its two desktop source copies.

Each shared loader changes exactly one complete URL literal to `https://alloflow-cdn.pages.dev/allo_device_storage_module.js?v=ds6-media-removal-intent`. Each host changes only its unique UtilsPure, View Persona Chat and ExportHandlers module URL to the corresponding new module SHA-256 prefix (eight hexadecimal characters). The global plugin/build token is preserved. These query values are opaque fetch versions; their new values avoid reusing cached modules which would still select DS5.

## Generation and pin chain

- `_build_utils_pure_module.js:31–40` embeds the pure source directly in its IIFE template, then writes root/public outputs. Preparation extracts only the guarded `outputCode` string-template expression, verifies it interpolates only `source`, and checks current and proposed module bytes against that wrapper entirely in memory. It does not invoke the write-producing builder.
- `_build_view_persona_chat_module.js` transforms JSX with the existing Babel options and wraps `result.code` in its `moduleSrc` literal concatenation. Preparation admits only that guarded literal-plus-`result.code` wrapper and checks current and proposed output equality in memory. The full builder hash is retained/rechecked; no builder writes occur.
- ExportHandlers is maintained as the canonical module itself; no separate export-handler source/builder exists in this chain. Its public copy must match before and after the single URL replacement.
- The existing Persona Chat host URL is content-pinned (`8178e750` at audit), and `build.js:2445–2480` includes `view_persona_chat_module.js` in `CONTENT_HASH_PINNED`. UtilsPure and ExportHandlers are absent that set and their host URLs used the global `6770c29ca` token. The coordinator explicitly selected narrow fresh content queries for all three own module URLs; no global token or build list is restamped. A later normal coordinated build can choose fresh global queries for the two nonlisted modules through its existing transform (`build.js:2494–2528`).

Guards require exactly one original full URL per loader and one own module URL per host, zero already-present replacement literals, exact reverse reconstruction, unchanged EOL/BOM/final-newline signature, root/public and three-host parity, syntax parsing, unchanged builder/build context hashes, and unchanged HEAD/production hashes. Apply validates fresh guards before each replacement. Prepared full files cannot silently replace later shared work.

```powershell
node reports/classroom-reliability-followup-2026-10-03/prepare_cache_coherence.cjs
```

No tests, builds, global cache restamp or production writes were run by this worker. The failed combined report and existing assertion must remain as evidence. Final combined unit/native learner acceptance and before/after receipts belong to the coordinator after guarded cache integration; this proposal alone establishes no deployment or current-CI status.
