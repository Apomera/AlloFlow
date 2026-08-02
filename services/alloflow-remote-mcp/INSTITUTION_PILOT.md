# AlloFlow institution-owned remote MCP pilot

## Outcome and boundary

This service contains an institution-owned pilot implementation, but the
default `wrangler.jsonc` keeps it disabled. `PILOT_ENABLED=true` plus validated
identity, storage, Workflow, Container, model, and runner configuration means
the infrastructure is configured; it is not an operational-health claim.
Document tools remain hidden until an operator also sets the exact manual gate
`PILOT_ACCEPTANCE_VERSION=institution-pilot-synthetic-v2` after the synthetic
acceptance suite passes. That flag enables a synthetic pilot only and does not
authorize real teacher or student documents.

The MCP transport itself is stateless: every HTTP request receives a fresh MCP
server. The following are application state and remain durable by design:

- OAuth clients, grants, and tokens in `OAUTH_KV`
- pseudonymous ownership and job transitions in D1
- PDF inputs and outputs in a private R2 bucket
- retryable execution in Cloudflare Workflows
- one isolated Cloudflare Container per job

No MCP session or user document is stored in Worker global memory.

## Verified Cloudflare reuse decision

A read-only Wrangler inventory on July 29, 2026 established the current
deployment boundary:

| Existing item | Decision |
| --- | --- |
| Cloudflare login and account | Reuse for synthetic technical staging |
| Domain/DNS and Zero Trust administration | Reuse only after the institution-controlled zone, admins, and IdP are confirmed |
| Public `alloflow-cdn` Pages deployment | Keep public and separate; never route MCP document traffic through it |
| `alloflow-catalog-submit` Worker | Do not reuse; it has unrelated submission/search behavior and secrets |
| `BUG_REPORTS`, `PD_SUBMISSIONS`, `PLUGIN_SUBMISSIONS`, `SEARCH_RATE` KV | Do not reuse; create a new OAuth KV namespace |
| Current account data services | No D1 or Workflow exists; R2 is not activated |
| Containers | Unavailable until this account moves from Workers Free to Workers Paid |

The same account can host the full synthetic architecture after Workers Paid
is enabled, R2 is activated, and dedicated pilot resources are provisioned.
This does not make the account institution-owned. The visible account name is
maintainer-oriented, and the current Wrangler token cannot administer Access
applications. Real documents remain prohibited until institutional
administrators control or formally accept billing, domain, Access/IdP,
incident response, data processing, and offboarding.

Dedicated staging names in the checked template include:

- `alloflow-remediation-institution-staging` (Worker)
- `alloflow-institution-pilot-staging` (D1)
- `alloflow-institution-pilot-staging-documents` (private R2)
- `alloflow-institution-remediation-staging` (Workflow)
- a new OAuth KV namespace and account-unique DCR rate-limit namespace

Production is intentionally not configured. It gets a different hostname and
an entirely separate set of bindings only after the synthetic, privacy,
vendor-asset, and institutional-ownership gates pass.

No remote MCP Worker or supporting pilot resource has been provisioned or deployed.

## Pilot scope

The first remote slice accepts one PDF up to 25 MiB. Version 0.3.0 exposes
eight tools:

1. `remediation_capabilities`
2. `create_document_upload`
3. `start_remediation`
4. `get_remediation_status`
5. `get_remediation_report`
6. `get_remediation_result`
7. `cancel_remediation`
8. `delete_remediation`

`remediation_capabilities` is always available. The seven document tools are
registered only when the infrastructure is configured and the exact manual
synthetic acceptance version is present.

There is one canonical remediation engine and three wrappers. The ordinary app,
local MCPB, and remote runner all execute the pipeline in
`doc_pipeline_source.jsx` / `doc_pipeline_module.js`; they share its audit/fix
implementation, round reducer, progress/regression policy, verification
binding, active-content scan, and delivery verdict.

| Surface | Wrapper responsibility |
| --- | --- |
| Ordinary AlloFlow app | Interactive preview, review/save controls, and the existing `runAutoFixLoop` orchestration |
| Local MCPB | Local filesystem/browser adapter and the broader private-file tool surface |
| Remote MCP | OAuth, opaque IDs, D1/R2/Workflow/Container isolation, quotas, wall-clock bounds, and fail-closed public delivery |

Auto-continue already exists in the ordinary app. Its ordinary Auto-fix control
defaults to three rounds; the recommended hands-off Make Accessible path may
run an eight-round continuation and resume it up to three times while it keeps
improving. Both paths are plateau-, ownership-, and Stop-gated. The remote
runner invokes `desktop/mcp/remediation_headless_driver.cjs` and the same
canonical `loopPolicy` and `finalizeRemediationRound` reducer. Its smaller
limits are deployment policy for predictable unattended cost and time, not a
second remediation algorithm. `start_remediation` exposes:

| Profile | Default target | Default fix passes | Polish passes | Auto-continue |
| --- | ---: | ---: | ---: | --- |
| `standard` | 95 | 2 | 0 | Disabled; 0 rounds |
| `thorough` | 95 | 3 | 1 | Enabled; at most 2 rounds |

The caller may override the target within 80-100 and fix passes within 1-3.
The optional `ocrLanguage` is capped at 12 characters and accepts a supported
lower-case ISO 639-1 language tag with one optional 2-4 letter BCP 47 subtag,
such as `en`, `es`, or `zh-hant`. Legacy Tesseract codes, multi-language
composites, and free-form document text are rejected. The resolved options are
immutable for an upload. Replaying the same options returns the same job, while
changing any resolved option returns `job_options_conflict` with status 409.

Both profiles produce a tagged PDF with the browser-side validator disabled. The runner invokes its local veraPDF CLI separately after the PDF is written.
`get_remediation_report` retrieves the owner-bound private report, verifies its
R2 size, type, and SHA-256, and returns only an allowlisted schema. Unknown
fields and document-derived fields are stripped. The sanitizer also requires
the report's artifact size and SHA-256 to equal the separately R2-verified
tagged PDF metadata.

The runner invokes the pinned veraPDF 1.30.2 CLI locally with the ua1 profile
after producing the tagged PDF. The public report contains only bounded status,
version, and rule/check counts. Missing Java/JAR or a timeout is reported as
unavailable; neither a pass nor a noncompliant result is a legal PDF/UA or
WCAG conformance certificate. The institution still needs to review this
evidence and define its acceptance policy.

## Workload admission

D1 enforces admission in the same statements that create uploads and jobs, so
parallel requests cannot intentionally bypass the configured counts. The
defaults and bounded Worker variables are:

| Boundary | Default | Variable |
| --- | ---: | --- |
| Open uploads per user | 3 | `MAX_OPEN_UPLOADS_PER_OWNER` |
| Upload attempts per user per rolling 24 hours | 20 | `MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H` |
| Upload attempts per institution per rolling 24 hours | 100 | `MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H` |
| Active jobs per user | 1 | `MAX_ACTIVE_JOBS_PER_OWNER` |
| Active jobs per institution | 2 | `MAX_ACTIVE_JOBS_PER_INSTITUTION` |
| Jobs per user per rolling 24 hours | 10 | `MAX_JOBS_PER_OWNER_24H` |
| Jobs per institution per rolling 24 hours | 50 | `MAX_JOBS_PER_INSTITUTION_24H` |

The rolling attempt counters include every upload row created during the
window, even if the upload is later rejected, fails after its one-time grant is
claimed, or the grant expires. An expired pending grant no longer occupies the
open-upload count, but it still consumes daily attempt budget; a failed or
expired claim is never reopened. Upload admission failures return the stable
`upload_quota_exceeded` code with status 429. Job concurrency or 24-hour quota
failures return `remediation_quota_exceeded` with status 429. These D1 limits
protect document workload and cost; the separate `/register` Rate Limiting
binding and recommended WAF rule protect anonymous OAuth client registration.

## Identity architecture

Claude or ChatGPT can connect to `https://mcp.<institution-domain>/mcp` using
the MCP OAuth flow. `@cloudflare/workers-oauth-provider` supplies OAuth discovery, dynamic
client registration, authorization-code exchange, PKCE, bearer validation,
refresh rotation, and protected-resource metadata.

`POST /register` is protected by a dedicated Cloudflare Rate Limiting binding
before OAuthProvider receives the request. Its constant per-institution key
limits anonymous registration writes without collecting IP addresses. The
binding is per-location and eventually consistent, so add a zone-level WAF
rate-limit rule for `/register` as defense in depth and monitor 429 responses.

The authorization UI then uses the institution's Cloudflare Access for SaaS
OIDC application:

- PKCE S256 is required at both layers.
- The Access ID token is verified against a pinned JWKS URL, issuer, audience,
  RS256 signature, lifetime, and configured stable subject claim.
- D1 receives only SHA-256-derived opaque owner and institution identifiers.
- The upstream Access refresh token is stored only inside the OAuth provider's
  encrypted grant properties.
- Each downstream refresh revalidates upstream Access. A removed teacher must
  authenticate again rather than retaining a seven-day connector session.
- Dynamic registration always preserves Claude's exact documented callback.
- ChatGPT support is an optional runtime profile. If
  `CHATGPT_REDIRECT_URI` is present, it must exactly equal the HTTPS callback
  shown in ChatGPT app management. There is no guessed default, wildcard,
  query, fragment, userinfo, alternate host, or normalized near-match.
- Localhost is optional and must be enabled explicitly for Inspector testing.

The Access for SaaS redirect URI for this Worker is:

```text
https://mcp.<institution-domain>/oauth/callback
```

The Claude public-client callback allowed by this pilot is:

```text
https://claude.ai/api/mcp/auth_callback
```

A Claude-only staging configuration remains valid when
`CHATGPT_REDIRECT_URI` is absent. To enable ChatGPT, copy the exact callback
from app management into that variable; do not construct it from an example.
Protected tools advertise least-privilege OAuth scopes and return an MCP
`mcp/www_authenticate` challenge for missing or insufficient authorization so
ChatGPT can open account linking.

This compatibility path is locally tested. No live ChatGPT staging acceptance
has occurred, and no ChatGPT distribution or approval claim is supported yet.

## Document security and retention

Upload and download pages use 32-byte capability grants in URL fragments. A
fragment is not sent in the initial HTTP request or referrer. Page JavaScript
clears it from the address bar immediately and moves it into an Authorization
header. D1 stores only its SHA-256 hash.

The complete fragment URL is returned to Claude in the MCP tool result, so
Claude and its tool transcript can see and retain the short-lived bearer grant.
The fragment prevents that grant from entering the initial HTTP request and
referrer; it does not hide the grant from Claude.

Possession of the grant is not sufficient to redeem it. A separate,
path-scoped Cloudflare Access application must protect `/upload/*` and
`/result/*`; those families include each page and its `/content` or `/download`
API. The Worker verifies the
`Cf-Access-Jwt-Assertion` issuer, RS256 signature, 64-hex application audience,
lifetime, and subject, derives the same opaque owner ID used by MCP OAuth, and
requires that owner and institution to match the upload or job. Keep real
documents prohibited until this Access policy and cross-owner tests pass.

Uploads are:

- one use and ten minutes by default;
- owner- and institution-bound at creation and browser redemption;
- written to private R2 with opaque keys and no original filename;
- gated by content type, declared size, and `%PDF-` signature;
- rejected if the grant is unknown, expired, reused, or being consumed in a
  parallel request.

Configured cleanup eligibility targets:

- unstarted input: eligible after two hours;
- successful input: deletion is attempted after verified output publication;
- failed or cancelled input and partial outputs: deletion is attempted during
  terminal cleanup;
- output: eligible after 24 hours;
- after first download: the eligibility deadline moves forward to one hour;
- pseudonymous operational metadata: eligible after seven days;
- OAuth access token: one hour;
- OAuth refresh token: seven days;
- dynamic client registration: 30 days.

These are not guaranteed deletion instants or absolute maxima. The hourly
scheduled handler reconciles Workflows, retries cleanup, deletes eligible R2
objects, and purges eligible D1/OAuth data in bounded batches. Cron delay,
transient failures, and backlog can extend physical retention beyond the
eligibility time. Configure an R2 one- or two-day lifecycle rule as a delayed
backstop, monitor cleanup failures/backlog, and use the institution-approved
upper bound in privacy notices.

D1 Time Travel can retain recoverable database history beyond application
deletion. The institution's privacy notice must disclose the recovery window
for its Cloudflare plan.

## Runner and model boundary

Run this before building or deploying the container:

```sh
npm run runner:stage
```

The staging script copies the canonical driver closure into ignored
`.runner-context/` and records SHA-256 hashes. The Docker image uses Node 24,
Playwright 1.60, Chromium, an unprivileged user, and port 8080.

The real Gemini key never enters the container. The Worker derives a stable
per-job runner bearer credential from `RUNNER_AUTH_SECRET`. Container requests
to `gemini.internal` are intercepted; the Worker strips the placeholder key,
checks the job is still running and the model path is exact, then injects the
institution's Gemini key in `x-goog-api-key`.

The runner stages the pinned browser dependencies under
`desktop/mcp/vendor/` and verifies every byte against `manifest.json` before
opening a document. Production containers set `ALLOFLOW_MCP_OFFLINE_ASSETS=1`;
the browser route aborts unexpected public requests, and the container allowlist
does not include asset CDNs. The bundle includes the English Tesseract model;
other OCR languages remain an explicit follow-up rather than a silent network
fallback.

The runner never forwards free-form browser/driver telemetry to stderr because
it can contain document text, filenames, model errors, or credential-shaped
strings. Its persisted report omits the input document SHA-256 fingerprint and
dynamic warning/error strings.

Institution-owned Cloudflare infrastructure does not mean document content
stays inside Cloudflare. The remediation pipeline sends document-derived
content to the institution-approved Gemini project. The institution must
approve that data path, model, account, contract, logging, and retention before
real documents.

## Provisioning sequence

The existing account may be used for synthetic engineering staging, but it is
not yet proven institution-owned. Do not reuse its AlloFlow application
resources and do not upload real documents.

1. Confirm account ownership and add the appropriate institutional
   administrators. Upgrade the same account to Workers Paid and activate R2.
2. Copy `wrangler.pilot.example.jsonc` to the ignored exact path
   `wrangler.pilot.local.jsonc`.
3. Create a new private OAuth KV namespace, staging D1 database, and private
   staging R2 bucket. Never paste an existing catalog KV ID.
4. Create a Cloudflare Access for SaaS OIDC application and connect the
   institution IdP. Create a separate self-hosted Access application scoped to
   `/upload/*` and `/result/*`, require the same institution identity, and copy
   its 64-hex audience tag into `TRANSFER_ACCESS_AUDIENCE`.
5. Add a zone-level WAF rate-limit rule for `POST /register`; the Worker binding
   remains the in-code backstop.
6. Replace every `REPLACE_WITH_...` value. Leave
   `PILOT_ACCEPTANCE_VERSION` unset during staging. For a release-candidate
   ChatGPT profile, copy the exact callback displayed by ChatGPT app management
   into `CHATGPT_REDIRECT_URI`. The runtime can remain Claude-only without that
   variable, but the checked staging template and preflight intentionally
   require it so ChatGPT acceptance cannot be silently skipped.
7. Store the three declared required secrets with Wrangler; never put values in
   the config:

   ```sh
   npx wrangler secret put ACCESS_CLIENT_SECRET --config wrangler.pilot.local.jsonc
   npx wrangler secret put GEMINI_API_KEY --config wrangler.pilot.local.jsonc
   npx wrangler secret put RUNNER_AUTH_SECRET --config wrangler.pilot.local.jsonc
   ```

8. Generate and verify both runtime and pilot bindings: `npm run types` and
   `npm run types:check`.
9. Run `npm run check`, `npm run runner:check`, and
   `npm run startup:check`.
10. Run `npm run preflight:staging`. It must fail until every placeholder and
    resource-isolation requirement is resolved.
11. Apply all three D1 migrations, in order:
    `migrations/0001_institution_pilot.sql`,
    `migrations/0002_remediation_effort_and_admission.sql`, then
    `migrations/0003_upload_attempt_admission.sql`.
12. Build the container as `linux/amd64` on an x64 CI host. The deny-by-default
    `.dockerignore` permits only runner inputs and the hash-recorded staged
    closure into the build context.
13. Deploy staging with `npm run deploy:staging`, then configure the R2
    lifecycle backstop.
14. Connect Claude with the exact custom-domain `/mcp` URL.
15. Connect a ChatGPT staging app using the exact callback copied into
    `CHATGPT_REDIRECT_URI` and complete the linking and tool-call gates below.
16. After every synthetic acceptance gate passes, set
    `PILOT_ACCEPTANCE_VERSION=institution-pilot-synthetic-v2` and redeploy to
    expose the seven document tools. The local preflight additionally requires
    the explicit `--allow-synthetic-acceptance` switch.

Wrangler bindings are non-inheritable. If staging and production use
`env.*`, repeat KV, D1, R2, Workflow, Durable Object, Container, and route
bindings explicitly for both environments.

## Current verification commands

Do not use frozen test counts as evidence; concurrent hardening changes the
suite. From `services/alloflow-remote-mcp/`, rerun the checked entry points:

```sh
npm run check
npm run runner:check
npm run startup:check
```

For focused diagnosis, `npm run types:check`, `npm run typecheck`, `npm test`,
and `npm run preflight:test` are the component commands already composed by the
higher-level checks. A passing local command is not a deployment, live OAuth
acceptance, or edge-health result.

## Required acceptance gates

Use synthetic PDFs until all gates pass:

- unauthenticated `/mcp` returns a 401 OAuth challenge;
- DCR, authorization code, PKCE S256, token exchange, refresh, and revocation;
- Claude's exact callback remains accepted, the exact configured ChatGPT
  callback is accepted, and wildcard, query, fragment, wrong-host, or
  different-app callbacks are rejected;
- a missing or insufficiently scoped tool token returns `isError` plus an MCP
  `mcp/www_authenticate` challenge with the required scope;
- two teacher identities cannot read, cancel, delete, or download each other's
  IDs;
- two institutions cannot cross the ownership boundary;
- unknown, expired, parallel, and reused upload capabilities fail;
- transfer pages and APIs reject missing Access assertions, the wrong Access
  audience, and a valid different teacher's identity even when that teacher has
  the fragment grant;
- duplicate start calls create one job and Workflow;
- duplicate starts with identical resolved options return that job, while a
  changed effort, target, fix-pass count, or OCR language returns
  `job_options_conflict`;
- a fourth open upload for one user returns `upload_quota_exceeded` with 429,
  the twenty-first daily attempt for one user and the one-hundred-first daily
  attempt for one institution also return `upload_quota_exceeded`, and
  rejected, failed-claim, and expired-claim attempts remain in that rolling
  budget; active/daily job-limit overflow returns
  `remediation_quota_exceeded` with 429;
- output bytes, type, size, and SHA-256 metadata match;
- the private report's R2 SHA-256 matches its D1 metadata, its artifact digest
  matches the independently verified result PDF, and unknown or
  document-derived report fields never reach the MCP result;
- cancellation hard-stops the container and cannot race a later R2 write;
- explicit delete attempts input, result, and report removal synchronously, and
  scheduled reconciliation completes interrupted cleanup;
- scheduled reconciliation handles dispatch and cleanup interruptions;
- failure logs contain no document text, filenames, bearer grants, OAuth
  tokens, cookies, or keys;
- repeated anonymous registration receives 429 without creating unbounded
  30-day client records;
- the `linux/amd64` image passes runner self-tests and a vulnerability/secret
  scan;
- a real Claude staging connection completes upload, standard/thorough job,
  privacy-safe report, result, and delete;
- a real ChatGPT staging connection completes account linking and the same
  synthetic upload, standard/thorough, report, result, and delete path.

The ChatGPT staging gate has not run because nothing is provisioned or
deployed. Do not submit the connector for broad Claude or ChatGPT discovery
until every gate and the institution's privacy/data-processing review are
complete.


Passing these gates and setting the synthetic acceptance version still does not
authorize real documents; the institution privacy/data-processing review and
the remaining OCR-language coverage, validator operational-acceptance, and institutional privacy/review gates are separate.

## Recommended next remote coverage

PDF/UA evidence is now available from the packaged CLI. The next remote
capability should be accessible HTML, an explicit artifact table, and selected
alternative formats. Keep batch remediation and PII-heavy tools deferred until
quotas, retention, privacy review, and operational ownership are ready for their
larger blast radius.
