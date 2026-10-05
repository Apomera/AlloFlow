# Maine SLD Leadership integration — final local verification

Verified October 2, 2026. The current source app opens **Maine SLD Case Lab** through its native shell reader and the Leadership Hub card. This work is local and uncommitted; no push, deployment, installed-desktop rebuild or full application build was performed.

## Entry and access

- Card ID: `maineSldPractice`; title: Maine SLD Case Lab.
- Lazy registration: `AlloModules.MaineSldPractice.MaineSldPracticePanel`; failed loads use the existing CDNModuleGate retry path.
- Canonical activity URL prepared for a future release: `https://alloflow-cdn.pages.dev/app/?tool=maine-sld-practice&case=alex`. The same URL accepts `case=jordan` and the alternate Alex case.
- Root and desktop-public `_redirects` contain the manual rule `/maine-sld-practice /app/?tool=maineSldPractice 302`, outside the generated STEM block. Case-specific copy links use the canonical app query; no assumption about incoming-query preservation on the short path is needed.
- Native reader accepts `maineSldPractice`, `maine-sld-practice`, and the short pathname. Boot waits for app readiness, history hydration and the Canvas recovery decision. Public entry sets teacher mode false.
- Back to Leadership from public entry waits for the existing educator access-code configuration to settle; a configured code triggers the existing gate, rather than entering Leadership directly. A launch from the actual Leadership card records that trusted source and can return to the Hub.
- Loaded CDNModuleGate children are returned directly, with no wrapper stacking context; the activity owns its dialog overlay. Its loading screen continues to use the existing gate UI.

## Validation

- 22/22 tests passed across `tests/stem_deep_links.test.js`, `tests/admin_hub_shell_a11y.test.js`, and `tests/admin_hub_rewards_card.test.js`, no skips. Raw JSON: `nearby-tests-final.json`.
- Four JSX sources parse: canonical host, both desktop host source mirrors and Admin Hub source. Scoped `git diff --check` passes.
- All three host copies use Maine pin **94bb5197** and Admin Hub pin **9e9f9641**. The new Maine module's four copies have SHA256 **94bb51978ae58be5b7e88e36fc1cdc0150d4cf35ecc9f5ad91ae82c62062ef1f**. Admin Hub root and desktop-public runtime match SHA256 **9e9f9641a17436d9430bc901adecc580f40a92119a1f44f3db862762c4037097**.
- Five native-reader inputs covering both tool query aliases, the short pathname and case queries resolve correctly. Root/public redirect files match byte-for-byte. Static build mapping and content-hash pin entries are present.
- No `functions/`, `_worker.js` or `_routes.json` exists in the current CDN root or desktop-public directory, so there is no repository Pages Function route intercepting this static redirect. The unrelated Firebase Functions directory is a different deployment target.
- Official Cloudflare redirect syntax reference: https://developers.cloudflare.com/pages/configuration/redirects/ . Destination queries are supported. The public short link was not deployed or verified against a released app.

## Source preview

Open http://127.0.0.1:65058/app/?tool=maine-sld-practice . The isolated report-only esbuild bundle uses the exact current `desktop/web-app/src/App.jsx`, copied as `source-preview/tested-host.jsx`, plus the existing preview stylesheet. **No production source transformations are applied.** The existing localhost /app/ detector already localizes module URLs; the preview server supplies current root/public assets under that path. App and Maine module requests returned HTTP 200.

Preview provenance and owned hidden-helper PID are recorded in `source-preview/preview.json`. The helper was restarted only after the old recorded PID no longer existed; no unrelated process was stopped. Reproduction scripts are in the Codex workspace at `work/sld-react/source_preview.cjs`.

## Scope and preservation

Initial October 1 changes and immediate reverse-baseline verification remain in `changes.json`, `before/` and `verification.json` as historical evidence. Other agents have since edited shared host files. This resume changed **only the Maine module URL pin in the three host sources**, saved immediate before copies in `pin-before/`, re-read each write and reversed just that pin to prove every other current byte remained intact. See `final-pin-verification.json` and `final-static-verification.json`.

Older packaged Admin Hub assets were deliberately left for their release owner; only the current root/public Admin Hub runtime pair is claimed here. Full activity behavior and the actual-host browser smoke are recorded separately by the test owner in the parent report folder. Shared source and index work remain untouched.
