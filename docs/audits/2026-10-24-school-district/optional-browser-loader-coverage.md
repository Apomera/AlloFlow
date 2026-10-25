# Optional browser loader coverage — 2026-10-24

Implemented locally with other agents actively editing the shared checkout. This pass uses narrow source patches, an independent fixed vendor catalog, and isolated tests. No full build, main asset-manifest refresh, deployment, publication, or overwrite of another workstream's generated modules was performed.

## Coverage closed in this pass

| Surface | Implemented boundary |
| --- | --- |
| VexFlow, jsonrepair, JSZip, LameJS and PptxGenJS host loaders | Exact local and fixed-version remote approvals, native SHA-384 SRI before `src`, anonymous CORS, no-referrer policy, readiness checks and deduplication. |
| Historical lz-string/idb-keyval storage mirrors | Removed the unsigned exceptions. Each approved URL has its own digest, including legitimate local/remote byte differences. |
| Shared STEM Three, OrbitControls, simulation and meadow loading | The canonical hub and both public hub copies call the trusted dispatcher. Hosted mirrors remain independent CDN fallbacks with integrity checks. Bundled Desktop maps the four known Three mirrors to reviewed local assets, including IPv6 loopback. |
| Six optional Three postprocessing effects | Hosted requests use exact pinned URL records. Desktop refuses remote-only effects and retains the viewer's existing simpler-rendering fallback. No model or third-party asset was added or upgraded. |
| Hanging optional scripts | The public promise settles within a bounded timeout. A still-pending classic script retains its dedup slot until its terminal event; no parallel mirror or retry starts merely because time elapsed. |
| Build, cached reuse, staging and student-shell publication | Check the optional policy block, local/public/built vendor bytes and compiled policy identifier. The identifier covers catalog and policy/loader code. Vendor records participate in release hashing and worker digest checks without forcing optional libraries into the boot precache. Publication rechecks primary module freshness before replacing an existing release. |

`browser_vendor_integrity.json` contains **15 libraries, 21 fixed mirror URLs, and nine local assets**. All four existing Three mirrors match the reviewed local files. LameJS and idb-keyval have legitimate byte differences across some sources; those sources retain distinct hashes. The cdnjs Three revision exception permits only the exact existing `r128/three.min.js` URL, never arbitrary revisions.

The standalone optional block can be checked without touching the main manifest or another agent's modules:

```sh
node dev-tools/build_optional_browser_delivery_policy.cjs --check --host=AlloFlowANTI.txt
node dev-tools/build_optional_browser_delivery_policy.cjs --check --host=desktop/web-app/src/App.jsx
node dev-tools/build_optional_browser_delivery_policy.cjs --check --host=desktop/web-app/src/AlloFlowANTI.txt
```

The protected module and vendor maps remain lexical host data. Modules can call the read-only `window.__alloConfigureTrustedScript(script, url)` dispatcher before insertion. Its property is configurable for a reviewed Canvas hot reload; it is not a security boundary against code that already controls the page. Unknown URLs fail closed. No unsigned fallback is provided when the dispatcher is absent.

## Validation

Evidence is retained in `tmp/browser-delivery-security-20261024/optional-coverage-receipt.json`. The native harness uses synthetic code, local servers and intercepted remote-looking URLs; it sends no classroom data to CDNs.

Real Chromium acceptance covers altered local and remote HTTP-200 bodies, independently pinned mirror variants, hosted remote-only dependencies, Desktop zero-external behavior, wrong-library/unknown/mutable URLs, concurrent calls, terminal-failure retry, timeout races and the actual VexFlow host wiring. A real native-timer binding issue discovered during this work was fixed and retested.

Final validation passed **192/192 cases across 11 focused suites**, **14/14 real Chromium cases**, and **34/34 workflow/platform/dependency policy tests**, with zero skips. All three optional host blocks passed independent checks and all three host files parsed. The canonical hub and both public hub copies match exactly. The combined fixture run used a 20-second per-test budget on the busy shared machine; feature timeouts and security assertions were unchanged.

Classic script removal does not reliably cancel a request. A late **approved** script can execute once after timeout; the promise remains false, its late callback cannot start a racing mirror, and a retry waits for the original terminal event. Tests explicitly exercise this behavior.

Unit/integration checks also cover directory-junction rejection despite matching target bytes, the mandatory real postbuild CLI despite an attempted environment skip, optional policy/source/built drift, current-source changes after compilation, prior-release preservation on rejection, storage readiness, STEM catalogs, cache identity, and host parsing. Existing slow BirdLab coverage was rerun with a larger bounded test budget; no production behavior or assertion was changed for that rerun.

## Remaining owner-specific coverage

This pass does **not** claim that every executable import in AlloFlow is protected. The read-only inventory identified these separate paths for coordinated work with their owners:

- Independent first-party script injectors in `allo_commands_source.jsx`, `utils_pure_source.jsx`, `text_utility_helpers_source.jsx` and `view_persona_chat_source.jsx`, plus other tool-owned bootstrap helpers.
- Tool-private STEM companion loaders in BirdLab, CoralReef, Raptor, Universe, Coding and FreeForms. They do not all use the shared hub helper.
- The document pipeline's `_loadCdnScript` and separate SheetJS bootstrap. That source is under active parallel work and was left untouched.
- ES module and Worker import graphs in the Piper, Kokoro, SD-Turbo and data-kernel loaders. Native classic-script SRI does not establish integrity for their entire imported graphs.
- Tested enforcement of a complete hosted content-security policy and the effective live account/backend configuration.

Those paths require targeted adoption of the trusted dispatcher or a separately verified module/worker delivery design, with the owning tool's functionality tests. The checked-in catalog must be deliberately reviewed when a library changes; response content cannot update its own approval.

## Release hold

The main shared asset manifest remains held for concurrent work. A passing optional-block check does not validate the combined application or authorize deployment. After all agents finish, build one coherent release, refresh the main reviewed hashes, verify complete artifacts, smoke-test the real supported surfaces and exercise rollback. Initial HTML, build tooling, account access and approved data flows remain independent trust boundaries.
