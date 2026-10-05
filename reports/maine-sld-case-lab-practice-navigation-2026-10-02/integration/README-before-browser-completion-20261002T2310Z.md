# Maine SLD Case Lab practice navigation: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files retain their current bytes. No full application build, staging, commit, push or deployment was performed.

## Reviewed module and exact source preview

- Maine activity SHA256: `189081606d02a6b7178c5c8046fdd5cefd62b98b9d5768fc6ea89f7b08b85f25`; pin: `18908160`.
- All four module copies match the reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: `5aca767b8f1e6466afaf2a4ed366b06d465f6ee90cc76600c4017d3bbe8466ef`.
- Exact isolated bundle SHA256: `ff636aa9912c61d45c30f4fcfdb608e30586c743dbdd0bc52f1e995561f01b61`.
- The report contains an exact App.jsx snapshot compiled with esbuild, without production-source transformations. Compilation requires source stability, and final verification requires all three current host copies to match the exact tested snapshot.

## Local preview and reproduction

Open http://127.0.0.1:65063/app/?tool=maine-sld-practice . The source preview and hidden helper metadata are in `source-preview/preview.json`. App, host bundle and activity module returned HTTP 200; served bundle and module bytes match the final hashes in `served-verification.json`.

Existing previews on ports 65058, 65059, 65060, 65061 and 65062 and their reports were preserved. No existing helper was stopped. This preview uses a separate helper and report directory, serving current root/public assets with the exact compiled host snapshot.

Reproduction helper: `C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/navigation_integration.cjs`, with `prepare`, `pin <SHA256>`, `build`, `verify`, `http` and `serve` modes. Preparation refuses to overwrite preview template assets. `pin` requires four-copy module parity and three-copy host parity, validates one Maine loader match in each source, verifies all immediate before copies and complete staged replacement bytes before its first host write, checks source stability before each atomic replacement, and reverses the one string replacement in memory to prove preservation of all unrelated current bytes.

## Preservation and verification

Immediate source copies are saved under `pin-before/`. `pin-verification.json` records before/after hashes, while `static-verification.json` records final module parity, JSX parsing and exact tested-source equality. `served-verification.json` confirms the served bytes.

Final browser validation is pending. Prior-pass browser results are historical and are not claimed as coverage of this module.

Full browser assertions, accessibility scope, logs and screenshots remain in the parent practice-navigation report's browser-validation directory. These local results do not describe a published release or a new desktop installer.
