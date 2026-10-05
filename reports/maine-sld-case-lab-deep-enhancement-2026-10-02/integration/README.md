# Maine SLD Case Lab deep enhancement: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files retain their current bytes. No full application build, staging, commit, push or deployment was performed.

## Reviewed module and exact source preview

- Maine activity SHA256: `4d5cba967c685e08fe7513ae7dd5e84b715edfea7e3c1a5443017ad6c310f2bf`; pin: `4d5cba96`.
- All four module copies match that reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: `aa349c6e414acaaeaa0cbe3df25a4c8241f5a12506bff8f3714b3c1bcd62dbbd`.
- Exact isolated bundle SHA256: `db67db68b3cfd45b7932e1707552f0df4dddc8f3a68090c3597af73b1a0e6b66`.
- The report contains an exact App.jsx snapshot compiled with esbuild. No production-source transformations were applied. Compilation and final verification require the current source to match the snapshot.

## Local preview and reproduction

Open http://127.0.0.1:65060/app/?tool=maine-sld-practice . The source preview and hidden helper metadata are in `source-preview/preview.json`. App, host bundle and activity module returned HTTP 200; served bundle and module bytes match the final hashes in `served-verification.json`.

The earlier previews on ports 65058 and 65059 and their reports were preserved. No existing helper was stopped. The new source preview uses its own helper and report directory. The server reads current root/public assets while serving the exact compiled host snapshot from this report.

Reproduction helper: `C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/deep_integration.cjs`, with `prepare`, `pin <SHA256>`, `build`, `verify`, `http` and `serve` modes. Preparation refuses to overwrite existing preview template assets. `pin` first requires four-copy module parity, validates one Maine loader match in each source, checks the current source has not changed immediately before each write, and reverses that one string replacement in memory to prove unrelated current bytes were preserved.

## Preservation and verification

Immediate source copies are saved under `pin-before/`. `pin-verification.json` records each before/after hash, while `static-verification.json` records final module parity, JSX parsing and exact tested-source equality. `served-verification.json` confirms the served bytes.

The stable final validation completed **19/19 browser scenarios**, exit 0, with one worker and zero retries. All **36 activity-scoped axe scans** were clear: 30 step/theme scans, four constrained-layout scans and two expanded-state scans. The exact source host passed Jordan direct entry, Alex's 52-score case switch, the configured educator return gate and the clean-page native Leadership Hub card/return path. The browser test source SHA256 was `353a7ac043dae10fbc4911023b04824c108b2f67efbc05df52230514df430472`.

After the stable browser run, all three current host sources still matched the exact compiled App.jsx snapshot; their three pins and all four activity copies matched the tested module. HTTP host/bundle/module requests again returned 200, with served bundle and module hashes matching the recorded tested bytes. No rebuild or production edit was needed after validation. Independent visual review accepted seven representative captures without requiring further changes.

Full browser assertions, accessibility scope, logs and screenshots remain in the parent enhancement report's browser-validation directory. These local results do not describe a published release or a new desktop installer.
