# Root and Firebase dependency checks

The root tooling and optional Firebase Functions locks are audited at every
reported severity. The security workflow checks changed scopes on pull requests
and pushes, and every maintained scope on scheduled/manual runs. A separate
Node 22 job installs and exercises root and Firebase dependencies even when
another dependency scope fails its audit.

Install from the repository root without package lifecycle scripts:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix desktop/web-app/functions --ignore-scripts --no-audit --no-fund
node --test --test-concurrency=1 dev-tools/security/test-root-dependencies.cjs dev-tools/security/test-firebase-dependencies.cjs
npm audit --package-lock-only --ignore-scripts --audit-level=low
npm audit --prefix desktop/web-app/functions --package-lock-only --ignore-scripts --audit-level=low
```

Keep the repository's existing `.npmrc` when installing root tooling; it records
the existing Blockly/jsdom peer-resolution policy. The Firebase runtime remains
Node 22. Firebase Admin 13.10.0 and Firebase Functions 7.2.5 are unchanged.

The October 2026 update uses Markdown-it 15.0.3, Vitest and its V8 coverage
provider 4.1.12, Vite 8.1.6, brace-expansion 1.1.21, source-map-js 1.2.2 and
Undici 7.30.1. Firebase's transitive packages move to Express 4.22.3,
body-parser 1.20.9 and qs 6.16.1 within the existing dependency ranges.
No application handlers, deployment settings or MCP dependencies are changed.

The tests use synthetic data and loopback HTTP servers. They cover ordinary
Markdown and malformed input, glob expansion, source maps, compressed HTTP
responses, integrity checks, Vite file/host boundaries, Vitest mocks, jsdom,
fake timers, V8 coverage, nested forms and compressed request bodies. Firebase
SDK exports load without contacting a service; a separate handler test stubs
authentication, App Check, quota storage and upstream services to verify normal
and rejected requests. This is not a live Firebase deployment/emulator test.

Relevant upstream fixes include [compressed request parsing](https://github.com/advisories/GHSA-27r3-jxmh-p828),
[HTTP response error handling](https://github.com/advisories/GHSA-xjj6-f33q-929c),
[response integrity](https://github.com/advisories/GHSA-f72v-6w45-q472),
[query serialization](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g),
[source-map offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) and
[Vitest mock access](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

These locks take effect in deployed Functions after the usual reviewed
deployment. Updating and testing the local dependencies does not deploy them.
