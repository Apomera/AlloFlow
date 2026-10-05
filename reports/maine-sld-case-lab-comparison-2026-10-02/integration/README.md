# Maine SLD Case Lab participant comparison: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files retain their current bytes. No full application build, staging, commit, push or deployment was performed.

## Reviewed module and exact source preview

- Maine activity SHA256: `ace588aeb71167631b24a7a2c07c0ad3dc02bbcc839322f995a2e8782b0f7aeb`; pin: `ace588ae`.
- All four module copies match the reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: `999519429f7cc27477b3e811fb2dee3f4275053cb227a1d079a3d824ab101318`.
- Exact isolated bundle SHA256: `d9b65d527588ca48da3e726bf02f370d273b607f784c7c93d4994be745c8c017`.
- The report contains an exact App.jsx snapshot compiled with esbuild, without production-source transformations. Compilation requires source stability, and final verification requires all three current host copies to match the exact tested snapshot.

## Local preview and reproduction

Open http://127.0.0.1:65062/app/?tool=maine-sld-practice . The source preview and hidden helper metadata are in `source-preview/preview.json`. App, host bundle and activity module returned HTTP 200; served bundle and module bytes match the final hashes in `served-verification.json`.

Existing previews on ports 65058, 65059, 65060 and 65061 and their reports were preserved. No existing helper was stopped. This preview uses a separate helper and report directory, serving current root/public assets with the exact compiled host snapshot.

Reproduction helper: `C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/comparison_integration.cjs`, with `prepare`, `pin <SHA256>`, `build`, `verify`, `http` and `serve` modes. Preparation refuses to overwrite preview template assets. `pin` requires four-copy module parity and three-copy host parity, validates one Maine loader match in each source, verifies all immediate before copies and complete staged replacement bytes before its first host write, checks source stability before each atomic replacement, and reverses the one string replacement in memory to prove preservation of all unrelated current bytes.

## Preservation and verification

Immediate source copies are saved under `pin-before/`. `pin-verification.json` records before/after hashes, while `static-verification.json` records final module parity, JSX parsing and exact tested-source equality. `served-verification.json` confirms the served bytes.

The stable final comparison run completed **7/7 targeted browser scenarios**, exit 0, with one worker, zero automatic retries and the unchanged 120-second test limit. There were no failures, skips or flaky cases. All **five activity-scoped axe scans** were clear, and 14 screenshots were retained. The targeted comparison/edit-navigation, case workflow and actual-source-host assertions passed on the reviewed final module; full results are in `../browser-validation/README.md`.

The independent reviewer accepted five new UI captures. The source owner visually accepted all nine final participant PDF pages. The full prior core suite and step/theme matrix were not rerun for this UI-only pass; core, data, builder and export schema remain unchanged, and their historical coverage is retained with the previous reports.

The exact accepted `879c289b` baseline module, tested host snapshot, isolated bundle, metadata and integration records were copied to `baseline-879c289b/` before the comparison pins changed. The initial `33563588` candidate was held for a case-specific accessible-name refinement and never received a production loader pin, source-preview bundle or served comparison preview. Only the final `ace588ae` candidate was integrated here.

Final post-run verification again parsed all three current host sources, required exact equality with the tested App.jsx snapshot, checked all three latest pins and four module hashes, and confirmed HTTP 200 with exact served bundle/module bytes. Scoped whitespace checks passed. No rebuild or production mutation followed the successful targeted run.

Full browser assertions, accessibility scope, logs and screenshots remain in the parent comparison report's browser-validation directory. These local results do not describe a published release or a new desktop installer.
