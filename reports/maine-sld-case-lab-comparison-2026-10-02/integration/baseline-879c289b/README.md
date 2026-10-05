# Maine SLD Case Lab extended practice: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files retain their current bytes. No full application build, staging, commit, push or deployment was performed.

## Reviewed module and exact source preview

- Maine activity SHA256: `879c289b65b47014fb07be571c9e55c51c3df31653d109bb29f21d7ec2e9e48c`; pin: `879c289b`.
- All four module copies match the reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: `7d97b8fb3d93340890f1f2d81c6e47d820a58d3892ba346a4b3e4db96d8c205d`.
- Exact isolated bundle SHA256: `a039b280afc485d222af35d3f516fed2d54d4915b73dc36b7d23baea0a699e27`.
- The report contains an exact App.jsx snapshot compiled with esbuild, without production-source transformations. Compilation requires source stability, and final verification requires all three current host copies to match the exact tested snapshot.

## Local preview and reproduction

Open http://127.0.0.1:65061/app/?tool=maine-sld-practice . The source preview and hidden helper metadata are in `source-preview/preview.json`. App, host bundle and activity module returned HTTP 200; served bundle and module bytes match the final hashes in `served-verification.json`.

Existing previews on ports 65058, 65059 and 65060 and their reports were preserved. No existing helper was stopped. This preview uses a separate helper and report directory, serving current root/public assets with the exact compiled host snapshot.

Reproduction helper: `C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended_integration.cjs`, with `prepare`, `pin <SHA256>`, `build`, `verify`, `http` and `serve` modes. Preparation refuses to overwrite preview template assets. `pin` requires four-copy module parity and three-copy host parity, validates one Maine loader match in each source, checks source stability immediately before writing, and reverses the one string replacement in memory to prove preservation of all unrelated current bytes.

## Preservation and verification

Immediate source copies are saved under `pin-before/`. `pin-verification.json` records before/after hashes, while `static-verification.json` records final module parity, JSX parsing and exact tested-source equality. `served-verification.json` confirms the served bytes.

The complete initial validation applies to candidate `7b17750545fa2cd8e177671e2888fa520a53226026cf56be5fa05a36f5c7409e`: **22/22 browser scenarios**, **15/15 focused core tests**, and **46 clear activity-scoped axe scans**, with one worker, zero retries and exit 0. Its exact module, tested App.jsx snapshot, isolated bundle, metadata, verification records and integration report are retained under `preserved-candidates/7b177505/`; the original full browser results remain in the parent browser-validation report. These are historical results, not a claim that all scenarios were rerun on the final print-corrected bytes.

The source owner then added only print heading keep-with-next rules for h2/h3, with core/data/builder bytes unchanged. The current final candidate is the reviewed hash and exact source/bundle above. Its five-case worksheet/print scenario passed, and the source owner visually accepted all nine final PDF pages at 90 dpi with the orphan headings fixed. Final PDF SHA256: `a2167d11efacf233e998640db16b63020be604d5379035d9173cd314a2aa01e5`.

The first two-scenario follow-up attempt had one print pass and one source-host timeout. All source-host interaction assertions had completed; the test exceeded its unchanged 120-second limit in the final `ungated.close()` cleanup call. The failing raw attempt, trace and artifacts were preserved under the parent browser-validation report's `print-followup/attempt-1-timeout/`. Independent static, HTTP and helper-health checks passed unchanged. A fresh process then reran only the affected source-host scenario with unchanged source, tests, timeout and zero automatic retries: it passed in 22.4 seconds (24.9 seconds total), exit 0. Thus the final print and actual-source-host scopes both passed on the final candidate, across the retained combined attempt and the successful focused recheck. These follow-up results are recorded separately from the historical complete 7b run.

Final post-recheck verification again parsed all three host sources, required their exact equality with the tested App.jsx snapshot, checked their latest loader pins and the four module hashes, and confirmed HTTP 200 with exact served bundle/module bytes. Scoped whitespace checks passed. No rebuild or production mutation followed the successful focused recheck.

A disk-full error interrupted the three-source pin refresh during creation of the third before-snapshot. The first two production hosts had complete, byte-verified new pins, and App.jsx remained the intact old snapshot; no production source was truncated. After capacity returned, only the own zero-byte App before-snapshot was repaired, and App's single pin was completed with a checked temporary file and atomic replacement. All three final sources reverse exactly to their immediate before copies. `pin-recovery-verification.json` records this scoped recovery. The prior helper had expired; its absence and a vacant port were confirmed before the same local helper was restarted with separate print-follow-up logs. No other process was stopped.

Full browser assertions, accessibility scope, logs and screenshots remain in the parent extended-practice report's browser-validation directory. These local results do not describe a published release or a new desktop installer.
