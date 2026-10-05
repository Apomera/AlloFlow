# Maine SLD Case Lab extended practice: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files retain their current bytes. No full application build, staging, commit, push or deployment was performed.

## Reviewed module and exact source preview

- Maine activity SHA256: `7b17750545fa2cd8e177671e2888fa520a53226026cf56be5fa05a36f5c7409e`; pin: `7b177505`.
- All four module copies match the reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: `e8710ad71444417271d09e0af2f0c6ab47d45cc6c343cc735a841d6fc471655c`.
- Exact isolated bundle SHA256: `fee138393c278270563bc1ece61f9c46bb7321c678a4b1e76b85141846db0782`.
- The report contains an exact App.jsx snapshot compiled with esbuild, without production-source transformations. Compilation requires source stability, and final verification requires all three current host copies to match the exact tested snapshot.

## Local preview and reproduction

Open http://127.0.0.1:65061/app/?tool=maine-sld-practice . The source preview and hidden helper metadata are in `source-preview/preview.json`. App, host bundle and activity module returned HTTP 200; served bundle and module bytes match the final hashes in `served-verification.json`.

Existing previews on ports 65058, 65059 and 65060 and their reports were preserved. No existing helper was stopped. This preview uses a separate helper and report directory, serving current root/public assets with the exact compiled host snapshot.

Reproduction helper: `C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/extended_integration.cjs`, with `prepare`, `pin <SHA256>`, `build`, `verify`, `http` and `serve` modes. Preparation refuses to overwrite preview template assets. `pin` requires four-copy module parity and three-copy host parity, validates one Maine loader match in each source, checks source stability immediately before writing, and reverses the one string replacement in memory to prove preservation of all unrelated current bytes.

## Preservation and verification

Immediate source copies are saved under `pin-before/`. `pin-verification.json` records before/after hashes, while `static-verification.json` records final module parity, JSX parsing and exact tested-source equality. `served-verification.json` confirms the served bytes.

The stable final validation completed **22/22 browser scenarios**, exit 0, with one worker and zero retries, plus **15/15 focused core tests**. All **46 activity-scoped axe scans** were clear, including the new-case steps and Marisol's expanded request prompts. The exact source host passed Marisol direct entry and zero-score evidence requests, Jordan and Alex data checks, the configured educator access gate and the native Leadership Hub card/return path. Browser test source SHA256: `946bce14e44fbbd3114a58feaa608bfddf9d551af6be0801fc98776f97eef121`; unit test source SHA256: `89872d31b6afffa53d53ef005d111ba0e25b02fdf77eede7a2346de016edd572`.

After stable validation, all three current host sources still matched the exact compiled App.jsx snapshot, and all three pins and four activity copies matched the tested module. HTTP app/bundle/module requests again returned 200, with served bundle and module hashes matching the recorded tested bytes. No rebuild or production edit was needed after validation.

Full browser assertions, accessibility scope, logs and screenshots remain in the parent extended-practice report's browser-validation directory. These local results do not describe a published release or a new desktop installer.
