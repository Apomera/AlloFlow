# DuckDB-Wasm analytical runtime

This directory contains the pinned, locally served DuckDB-Wasm browser runtime used by
AlloFlow Data Studio, Data Plotter, and Stats Lab's read-only analytical workspace.

- Package: @duckdb/duckdb-wasm@1.32.0
- License: MIT
- Runtime: duckdb-browser.mjs, MVP worker, and a chunked MVP WebAssembly module
- Rebuild/check: node dev-tools/build_data_kernel_assets.cjs or --check

The upstream duckdb-mvp.wasm binary is larger than Cloudflare Pages' 25 MiB
per-file limit. The builder therefore writes an integrity manifest plus numbered
chunks under 16 MiB. The browser loader fetches those same-origin chunks,
reassembles the exact WASM bytes in memory, and revokes the temporary object URL
after DuckDB initializes. The reproducible monolithic build output stays ignored.

The loader registers a same-origin table named data, permits only read-only
SELECT/WITH/DESCRIBE/SUMMARIZE/SHOW statements, and does not load the runtime until a
teacher or student runs a query. Each tool passes its current table in memory; it
does not send cell values to AlloFlow's AI bridge. Shape-aware starter recipes are generated locally from column names and numeric types. The optional query notebook stores SQL/provenance metadata only (not result values) for reruns and reproducible exports.