# Maine SLD Case Lab practice navigation: host integration

October 2, 2026. This pass refreshes only the existing Maine activity loader pin in the canonical host and its two desktop source mirrors. Leadership Hub routing, card behavior, educator access gates, build mapping and redirect files retain their current bytes. No full application build, staging, commit, push or deployment was performed.

## Reviewed module and exact source preview

- Maine activity SHA256: 189081606d02a6b7178c5c8046fdd5cefd62b98b9d5768fc6ea89f7b08b85f25; pin: 18908160.
- All four module copies match the reviewed hash. All three host sources parse and reference the same pin.
- Tested App.jsx source SHA256: 5aca767b8f1e6466afaf2a4ed366b06d465f6ee90cc76600c4017d3bbe8466ef.
- Exact isolated bundle SHA256: ff636aa9912c61d45c30f4fcfdb608e30586c743dbdd0bc52f1e995561f01b61.
- The report contains an exact App.jsx snapshot compiled with esbuild, without production-source transformations. Compilation requires source stability, and final verification requires all three current host copies to match the exact tested snapshot.

## Local preview and reproduction

Open the [local activity](http://127.0.0.1:65063/app/?tool=maine-sld-practice). The source preview and current hidden-helper metadata are in source-preview/preview.json. The final read-only check at 2026-10-02T23:08:09 UTC confirmed HTTP 200 app, host bundle and activity module bytes, matching the frozen hashes; it is retained in [final-read-only-verification.json](final-read-only-verification.json).

The original helper PID 18480 was absent during the isolated availability check. Root authorized restoring only this owned preview in pure serve mode. Replacement PID 44448 started at 2026-10-02T23:00:59.288Z; no build, product-source, pin or test changes were made. The replacement record, exact served-byte checks, and current log paths are in [helper-restoration-20261002T230058Z.json](helper-restoration-20261002T230058Z.json). Original PID/start metadata is preserved in preview-before-helper-restoration-20261002T230058Z.json. The original served-verification.json, post-timeout-read-only-health.json and logs remain unchanged.

Existing previews on ports 65058, 65059, 65060, 65061 and 65062 and their reports were preserved. This preview uses a separate helper and report directory, serving current root/public assets with the exact compiled host snapshot.

Reproduction helper: C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/navigation_integration.cjs, with prepare, pin <SHA256>, build, verify, http and serve modes. The serve mode serves the existing snapshot and assets; it does not rebuild. Preparation refuses to overwrite preview template assets. Pin mode requires four-copy module parity and three-copy host parity, validates one Maine loader match in each source, verifies all immediate before copies and complete staged replacement bytes before its first host write, checks source stability before each atomic replacement, and reverses the one string replacement in memory to prove preservation of all unrelated current bytes.

## Preservation and final validation

Immediate source copies are saved under pin-before/. Pin-verification.json records before/after hashes; static-verification.json records module parity, JSX parsing and exact tested-source equality. Final-read-only-verification.json confirms that the canonical activity source, four module copies, three host sources, loader pins, tested snapshot, bundle and currently served bytes remain exact. The pending version of this report is preserved as README-before-browser-completion-20261002T2310Z.md.

All five distinct affected browser scenarios are validated across three invocations. The initial run passed four module scenarios; its host assertions completed, but Page.close and context teardown timed out. The next isolated host attempt failed at its first page.goto with connection refused in 3508 ms while the helper was absent; no host functional assertions ran. Both failed invocations and their raw evidence remain preserved. After pure serve restoration, the unchanged host scenario passed its full lifecycle, including cleanup, in 82968 ms (108114 ms for the invocation).

This is an aggregate outcome across the initial module run and the final isolated host run. It does not claim one five-pass initial run or that all 27 focused scenarios were rerun. All invocations retained one worker, zero automatic retries, the unchanged 120-second limit and the unchanged browser spec. Four scoped axe scans found zero violations. Core tests and printing were not rerun; retained prior evidence and its preservation basis are documented by the validator.

The authoritative [browser report](../browser-validation/README.md) and [validation summary](../browser-validation/validation-summary.json) contain scenario results, accessibility scope, timeout and availability diagnoses, exact commands, screenshots and historical evidence. Integration completion metadata is in [browser-validation-completion.json](browser-validation-completion.json). These local results do not describe a published release or a new desktop installer.
