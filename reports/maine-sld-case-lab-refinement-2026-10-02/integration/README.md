# Maine SLD Case Lab refinement: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files are unchanged. No full application build, staging, commit, push or deployment was performed.

## Final module and source

- Maine activity SHA256: `2a2e0dd185b387eda6325be662a98a9969155511bbe8c9a3a1bfb44fe5b2b607`; pin: `2a2e0dd1`.
- All four module copies match that reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: `f734222b7cfaad3264b75e93fc8e4deccbc345813a5eb65e63c4eee5962248fa`.
- Exact isolated bundle SHA256: `51efc4304070b625e5b2ab920325bdc2cb5347eb5f7ca5f0520ed24344185509`.
- App.jsx was copied into the report and compiled with esbuild. No production-source transformations were applied. The existing localhost `/app/` asset routing loads current local modules.

## Preview

Open http://127.0.0.1:65059/app/?tool=maine-sld-practice . The source preview and own hidden helper metadata are in `source-preview/preview.json`. App, host bundle and activity module returned HTTP 200; the bundle and module's served bytes match the recorded final hashes in `served-verification.json`. The earlier 65058 preview and previous integration report were preserved; no existing helper was stopped.

Reproduction: `C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/refinement_integration.cjs`, with `prepare`, `pin <SHA256>`, `build`, `verify`, `http` and `serve` modes. The setup mode refuses to overwrite existing preview template assets. The server reads current root/public modules and serves the exact compiled host snapshot from this report.

## Preservation and validation

Immediate source copies are saved under `pin-before/`. Each write was re-read and its single loader-pin change reversed in memory to prove all other current bytes were preserved. `pin-verification.json` records each before/after hash; `static-verification.json` records final module parity and source parsing.

The validation owner's stable final 16/16 browser scenarios passed with no failures, skips or flaky cases, including public-entry access gating and the real Leadership Hub card roundtrip. Final host captures are in `../browser-validation/final-browser/actual-app-host.png` and `actual-hub-card.png`. Full raw results remain with that owner in the parent refinement report.

The earlier 22/22 nearby integration tests remain recorded in the previous report. They were not repeated for a pin-only host refresh; this pass makes no host behavior change. These local results do not describe a published release or a new desktop installer.
