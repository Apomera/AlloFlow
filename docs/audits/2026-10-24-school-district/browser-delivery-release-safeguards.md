# Browser delivery and release safeguards — 2026-10-24

Implemented locally for review. Nothing was deployed, uploaded, tagged, or published during this task. The existing hosted site and historical compiled `app/` artifacts were left running as before. A fresh release build and normal release review remain required.

**Final release status: held for concurrent work.** A strict 652-asset source/public snapshot was successfully embedded in all three hosts. Other agents then continued changing modules, and the final gate correctly rejected the resulting stale/mismatched assets. No additional modules were overwritten to force a green result. Regenerate the manifest and build from the completed release checkout after that work settles. The last observed gate result is retained in `final-source-gate.json` beside the receipt.

## Browser delivery

The trusted host embeds a deterministic inventory of approved script paths, SHA-384 integrity values, and byte lengths. Downloading a different manifest cannot authorize different code. The browser receives `integrity`, anonymous CORS, and a no-referrer policy before script insertion.

The host's core module loader, AI bridge, STEM/SEL/arcade plugin loader and retries, optional speech/image/plugin injectors, QR loader, and storage/recovery module helper use that policy. Unknown paths and mutable GitHub `main`/`latest` script URLs fail before insertion. Existing load states, deferred-module promotion, bounded failures, and retries remain available.

Remote fallback is disabled in the current local manifest. A production fallback requires a full 40-character commit and proof that **every** approved asset in that commit has exactly the same bytes. It uses an immutable jsDelivr repository URL with the original integrity value. `--force` cannot bypass this proof. The protected first-party Desktop loader routes stay local, including after a failed request.

The subsequent [optional browser loader coverage pass](optional-browser-loader-coverage.md) removes the unsigned storage exceptions, pins the host's optional VexFlow/LameJS/JSZip/jsonrepair/PptxGenJS chains and the shared STEM vendor routes, and verifies their packaged bytes. Model downloads, tool-private loaders, module/worker import graphs and fetched translation/data resources remain separate review surfaces. Neither pass claims that every network resource is authenticated by these policies.

## Release and offline caches

Postbuild adds native SRI to local boot scripts and styles. The emitted worker contains SHA-384 and length records for final HTML, boot assets, and generated JS/CSS chunks. It verifies those network responses and cached bytes before use. Unknown generated code is refused; altered cached boot/static code fails verification. Authorization-bearing, `/api/`, non-GET, and no-store requests bypass offline handling; responses marked private/no-store are excluded from caches. Deployment backends still need correct response headers for other sensitive routes.

An older worker retains its own approved classroom shell until the user accepts a newer release. It cannot cache newer HTML under the older release identity. Update dismissal and cross-tab activation behavior remain covered by real Chromium tests.

Build order matters: public modules are synchronized before manifest generation; source/public equality is mandatory. HTML path normalization and Desktop key removal happen before release hashing. Postbuild verifies the trusted host block, current source/public assets, copied dynamic assets, and the compiled main bundle's manifest marker. Desktop staging and cached-build reuse repeat the final artifact checks. Student-shell publication verifies the artifact before replacing output, copies approved HTML unchanged, and checks final digests after its cache-prefix adjustment.

The main-bundle marker catches stale output; it does not authenticate a malicious compiler. The initial trusted HTML, checked-out source, build tooling, and hosting account remain trust anchors. These controls do not replace account security or independently hosted disaster recovery.

## CI and publishing

All ten workflows are included in the shared workflow policy. MCP workflows now use verified immutable action pins, read-only defaults, checkout without persisted credentials, and narrowly scoped trusted release/attestation permissions.

The manually confirmed MCP Registry path separates tagged-source verification from the OIDC publishing job. It verifies exact checksum targets, bounded regular files, tag/source provenance, and metadata parity. The privileged publishing job receives validated data rather than executing the selected tag's source. MCP dependency update coverage is restored in a separate Dependabot group.

The existing blocking browser job now runs delivery-policy/host-loader tests, release/cache/publication/Desktop parity tests, native Chromium SRI acceptance, and real browser update scenarios. Repository checks govern their workflows. Required branch checks and Cloudflare automatic-deployment settings are account configuration; they were not changed or verified in this task.

## Validation and release use

Local evidence is retained in `tmp/browser-delivery-security-20261024/verification-receipt.json`. Tests use synthetic code and isolated local servers; remote-looking browser URLs are intercepted locally.

Completed validation includes actual tampered primary/fallback rejection in Chromium, Desktop refusal of remote scripts, module/plugin/AI/optional-loader behavior, cache poisoning and release separation, stale/missing/changed built assets, post-stamp drift, symlink rejection, safe publication, and workflow/Registry permission boundaries. Production minifier, SVG, CSS, selector, YAML, and proxy compatibility checks also passed.

The final 15-suite run passed 252 of 254 cases; two Git/file-I/O fixtures exceeded their original time limits on the busy shared machine. The complete 51-case integrity suite then passed with bounded 60-second/30-second budgets for those fixtures and unchanged assertions, resolving both failures. All 254 focused cases are covered by passing results. Native Chromium integrity acceptance passed 7/7, browser update lifecycle passed 10/10, and workflow/platform/dependency policy tests passed 34/34. All three host sources parsed successfully.

Six broader QR/UI test failures were reproduced against the saved pre-task host snapshots. Their details are in `baseline-regressions.json` beside the receipt. No full CRA build, Desktop GUI/installer smoke test, new Linux/macOS run, or live-site deployment was performed for this browser change.

Use the normal build on a clean checkout so integrity values describe the actual served bytes, including checkout line endings. Review generated assets and the embedded manifest together. For a read-only source/host check:

```sh
node dev-tools/build_browser_delivery_manifest.cjs --check --host=AlloFlowANTI.txt
node dev-tools/build_browser_delivery_manifest.cjs --check --host=desktop/web-app/src/App.jsx
node dev-tools/build_browser_delivery_manifest.cjs --check --host=desktop/web-app/src/AlloFlowANTI.txt
```

Explicit `--sync --host=<known-host>` regenerates a reviewed host block and still requires exact source/public equality. The real postbuild CLI has a mandatory built-delivery gate; an environment skip flag cannot bypass it. Fixture-only programmatic postbuild calls explicitly report `deliveryValidated:false` unless supplied with a complete fixture delivery contract.

Before deployment, build from the intended release commit, verify the final artifact, run the blocking checks, and smoke-test hosted and Desktop launch surfaces. Retain the previous complete release for rollback; HTML, modules, styles, and worker must be rolled back together.

Reference behavior: [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity), [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use), and [Cloudflare Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/).
