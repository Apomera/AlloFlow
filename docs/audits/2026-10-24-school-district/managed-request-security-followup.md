# Managed AI request security follow-up

October 24, 2026. Scope: local source changes for Gemini Canvas and the proposed Portland Public Schools, Maine workflow. This pass covers request authorization, dispatch, retry and legacy source-import paths. The other security workstreams retain ownership of dependency, loader, worker, packaging and release changes. Nothing was deployed; all request tests used synthetic text, credentials and responses.

## Confirmed problems and changes

| Trigger | Previous behavior reproduced | Reviewed behavior |
| --- | --- | --- |
| Provider settings or credentials change while asynchronous key fingerprinting is pending | Approval could inspect one connection/key and dispatch using later mutable settings. | Each logical request captures its backend, endpoint, credential, model, ordinary options and messages. Changes apply to the next request. Cross-window plain options are copied too. |
| Managed policy is replaced or edited during pending work | Work could continue using an earlier approval. | The canonical helper snapshots validated policy and returns a synchronous dispatch guard. A different policy object or changed normalized contents blocks pending work, including initially unmanaged work if a policy is installed before dispatch. |
| A retry, JSON repair, queued operation, model discovery or fallback is reached | An initial approval alone did not bind every subsequent handoff. | Provider and Gemini request scopes retain their approval and captured inputs. Guards run before first-party dispatch and every native retry; managed denial stops fallback. Existing cancellation semantics remain. |
| A Gemini model value includes a path or query fragment | Model interpolation could alter the request URL, including a credential query parameter. | All seven Provider Gemini URL construction sites and Gemini API model paths validate a bare model identifier, with an optional `models/` prefix. Query, fragment, backslash, control and extra-path input is rejected before dispatch. Other providers' JSON model names keep their existing behavior. |
| Search approval changes while Firebase authentication headers are loading | The query could be sent after policy revocation. | Search retains its policy snapshot across fallbacks and checks it again after asynchronous headers and immediately before fetch. |
| A managed deployment imports a web or video URL | The legacy importer could use public CORS relays or direct Gemini outside approved routing. | Any non-null managed profile blocks these legacy URL/video routes at entry and dispatch. Manual paste and local-file workflows remain available. `allowExternalSearch: true` does not approve URL relays or media imports. |
| An importer fails or logs diagnostic context | Source URLs, capability queries or provider response bodies could appear in diagnostics. | Import diagnostics use fixed categories/codes and omit these values. Synthetic canaries were checked in native-browser diagnostics. |

The shared retry helper and each host's early boot fallback accept a synchronous application-only `beforeRequest` callback and remove it from native `RequestInit`. The callback is checked after attempt callbacks and immediately before fetch. Only `undefined` or `true` is an accepted result; an explicitly null/invalid callback, denial or promise fails closed. Rejected promises are consumed to avoid unhandled rejection noise. A thrown abort remains cancellation.

## Deployment policy

`managed_ai_policy.js` is the canonical source copied into Provider and Gemini modules by `dev-tools/sync_managed_ai_policy.cjs`. `--check` verifies both copies; `--only` permits a narrow update without touching another agent's source.

An intentionally restrictive deployment can start with:

```js
window.ALLOFLOW_MANAGED_AI_POLICY = {
  version: 1,
  connections: [],
  allowExternalSearch: false
};
```

Install deployment-owned configuration before application modules run. Approval is not read from localStorage. An absent, undefined or null policy preserves unmanaged compatibility; it does not enable district restrictions. A configured but malformed profile blocks requests rather than reverting to unmanaged behavior.

Version 1 accepts only `version`, `connections` and optional boolean `allowExternalSearch`. Each connection requires `backend` and `baseUrl` and may contain boolean `keyless`, boolean `canvasHost` and an array `apiKeySha256`. It accepts at most 64 connections and 64 SHA-256 fingerprints per connection. Unknown fields, accessors, sparse or decorated arrays, malformed fingerprints and wrong types are rejected. Endpoints allow HTTPS, or HTTP on exact loopback hosts, without credentials, query or fragment. The normalized endpoint and backend must match; v1 approves text operations only. Media remains blocked.

Review the actual provider and runtime before adding a connection. A fingerprint identifies a configured key; `keyless` approves an empty-key route; `canvasHost` uses the runtime's Canvas condition. These are routing choices, not proof of staff identity, provider terms or PPS approval. The existing Provider and Gemini factory use different Canvas-key conditions, so a Canvas-only profile must be exercised in the actual generated app; synthetic injected-key tests do not establish Google's injection behavior. Never paste a real key into the policy, documentation or test evidence.

## Validation and delivery

Final targeted validation passed 521 tests across 38 files with no failures or skips, plus 12 native Edge checks and nine asset/host delivery checks. The selected files cover request timing, search, cancellation, model/media shapes, authentication recovery, speech fallback, source imports, retry behavior, storage compatibility and complete-host parsing. These counts exclude the separate Worker fixture failure described below.

The [validation record](managed-request-security-validation.json) records final source hashes, test commands/results and bounded delivery checks. The [native Edge checks](managed-request-browser-checks.json) use actual built modules, actual browser WebCrypto and controlled timing barriers. External requests were blocked and HTTP responses were synthetic. These tests do not call Google, PPS, production Firebase or any AI service.

Only the changed Provider, Gemini API and UtilsPure module records were refreshed in the three embedded delivery manifests. Their reviewed root/public copies match; remote loader cache identities were refreshed while existing unversioned local loader paths were preserved. Other asset records were preserved. No broad build or approval of the concurrently modified checkout is implied. Legacy compiled `app/` copies and packaged applications must be rebuilt and verified by the coordinated release process before publishing; do not distribute those old artifacts as the fixed release.

The earlier expanded Provider run also encountered a separate Worker test-fixture setup failure: `external_search_privacy.test.js` loads its Worker as a data URL, which cannot resolve the Worker's new relative `./bug_inbox.js` import. Its ten checks did not execute and are not counted as passing. Worker changes remain with their owning workstream.

## Remaining approval boundaries

These controls prevent accidental routing through the reviewed paths. They cannot recall a request already sent, enforce behavior inside an arbitrary injected transport, or withstand arbitrary script execution in the same page. Custom retry transports must honor the synchronous `beforeRequest` contract for their internal attempts. Server/network authorization and district-managed configuration remain separate requirements.

The three clinical tools retain their protected storage, default-disabled external AI, and explicit Canvas real-record gate. Identifier review does not guarantee de-identification. This pass does not approve new data categories, establish a retention schedule, verify staff SSO, configure a Canvas backend or certify legal compliance. PPS still needs exact-release validation, approved providers/purposes and service agreements, effective access controls, deletion/restore evidence and operational owners before real student-record use.
