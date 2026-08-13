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

A read-only Wrangler inventory on August 13, 2026 reconfirmed the current
deployment boundary:

| Existing item | Decision |
| --- | --- |
| Cloudflare login and account | Reuse for synthetic technical staging |
| Domain/DNS and Zero Trust administration | Reuse only after the institution-controlled zone, admins, and IdP are confirmed |
| Public `alloflow-cdn` Pages deployment | Keep public and separate; never route MCP document traffic through it |
| `alloflow-catalog-submit` Worker | Do not reuse; it has unrelated submission/search behavior and secrets |
| `BUG_REPORTS`, `PD_SUBMISSIONS`, `PLUGIN_SUBMISSIONS`, `SEARCH_RATE` KV | Do not reuse; create a new OAuth KV namespace |
| Current account data services | No D1 or Workflow exists; the staging Worker is absent; R2 returns disabled code 10042 |
| Containers | Unauthorized on the current Workers Free plan; requires Workers Paid |

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

No remote MCP Worker or supporting pilot resource has been provisioned or
deployed yet. A checked storage reconciler now provides a read-only remote plan
and an explicitly confirmed, idempotent apply for the dedicated KV, D1, and R2
resources. It fails clearly until R2 is activated and deliberately stops before
secrets, Access, migrations, lifecycle, Worker/Workflow/Container deployment,
or acceptance. Wrangler provisions the Worker, Workflow, and Container together
during the later checked deploy; the storage reconciler does not.

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
- in-flight checkpoints: validated extraction evidence and accepted
  remediation rounds are stored as immutable gzip objects under an opaque
  per-job R2 prefix. D1 stores only the current sequence, object pointer,
  hashes, stage, schema, and timestamp. Checkpoint content is deleted after
  successful publication or terminal cleanup; prefix cleanup also removes
  crash-before-pointer or stale-attempt objects. A snapshot is bounded to
  128 MiB before gzip and 32 MiB after gzip; exceeding either limit fails with
  the explicit non-retryable `checkpoint_snapshot_too_large` policy instead
  of silently continuing past a false durability boundary;
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
eligibility time. The checked `config/r2-lifecycle.json` policy is an
independent delayed backstop: it expires every `tenant/` object after two days
and aborts incomplete multipart uploads after one day. `npm run
lifecycle:check` validates that exact policy without changing Cloudflare; both
staging deployment paths run `lifecycle:apply:staging` before Worker deploy.
Monitor cleanup failures/backlog and use the institution-approved upper bound
in privacy notices.

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

## Release canary, telemetry, and alerts

The checked staging template requires both a `PILOT_METRICS` Analytics Engine
binding and a `CF_VERSION_METADATA` Worker version-metadata binding. Preflight
rejects a staging configuration that omits either binding or changes the
dedicated dataset name. Fixed, content-free metrics cover runner liveness,
model throttling, lease renewal, checkpoints, cleanup, and the release canary.
The Worker release ID is attached to each record; opaque job and attempt IDs
remain only in structured Workers Logs and are not Analytics Engine
dimensions. The stable column layout and incident-query details are in
[`OPERATIONS.md`](./OPERATIONS.md).

`RELEASE_CANARY_SECRET` must be one high-entropy value of at least 32
characters, installed in two places:

- as a Worker secret in the exact staging configuration; and
- as a masked/protected `RELEASE_CANARY_SECRET` environment variable in the
  deployment process that runs `npm run deploy:staging` or
  `npm run deploy:staging:accepted`.

Do not put the value in JSONC, source, a command argument, shell history, or
logs. The deployment chain reads the protected process variable only to send
an Authorization bearer token to the deployed Worker's `/readyz` endpoint.
The endpoint compares the non-local Worker version, the Worker's declared
database/checkpoint schema contract, runner protocol and identity, idle state,
staged manifest, runner bytes, model route, and checkpoint-engine identity. It
also queries D1 for every lease and checkpoint column introduced by migrations
0004 through 0006 and validates migration 0007's singleton admission-control
row. It returns 503 if that live schema sentinel or any runner check
fails. The canary command retries a cold or transient failure, emits only
bounded release identifiers and hashes, and exits non-zero if compatibility is
not proven.

After migration 0007 exists, the two checked deployment commands execute this
order:

1. explicitly pause new upload/job admissions with operator and reason audit
   fields, then poll the atomic D1 gate until active jobs reach zero;
2. rebuild and verify the staged runner closure;
3. run `runner:canary` and staging preflight;
4. replace the remote bucket policy and read it back through the R2 API,
   failing unless the normalized policy exactly matches the checked source;
5. deploy the Worker and container definition;
6. run the authenticated post-deploy release canary while admissions remain
   paused; and
7. attempt a token-fenced resume in a `finally` path only when this release
   acquired the pause.

The lifecycle policy remains in force if a later deploy or canary step fails.
The command stops on a failed step, but a failed post-deploy canary does not
automatically undo the deployment. Keep admissions stopped and follow the
coordinated rollback procedure below. The Durable Object migration declared
in Wrangler deploys with the Worker; the seven D1 SQL migrations are separate
and must already have been applied in order.

Run `npm run alerts:check` every five minutes from the institution's external
monitor. It queries the previous 15 minutes and requires these process
variables:

- `CLOUDFLARE_ACCOUNT_ID`; and
- protected `CLOUDFLARE_ANALYTICS_TOKEN`, scoped only to Account Analytics
  Read.

Leave `PILOT_METRICS_DATASET` unset for the checked template so the monitor
uses `alloflow_institution_pilot_metrics`. A future reviewed dataset rename
must update the binding, preflight, and monitor variable together. Exit 0
means no checked threshold fired, exit 2 means alerts fired, and exit 1 means
configuration or
query failure; route both non-zero outcomes to the institution's normal alert
channel. The checked policy treats any `failed` outcome, fatal
`lease_renewal`, or unavailable `checkpoint_resume_pointer` as critical;
three deferred `lease_renewal` records and ten `model_throttled` records in the
window are warnings. This five-minute external monitor is separate from the
Worker's hourly cleanup cron.

## Provisioning sequence

The existing account may be used for synthetic engineering staging, but it is
not yet proven institution-owned. Do not reuse its AlloFlow application
resources and do not upload real documents.

1. Confirm account ownership and add the appropriate institutional
   administrators. Upgrade the same account to Workers Paid and activate R2.
2. Copy `wrangler.pilot.example.jsonc` to the ignored exact path
   `wrangler.pilot.local.jsonc`.
3. Pin the intended 32-hex account ID, then run the checked read-only plan.
   Review the account, Worker, exact resource names, and every `create`, `adopt`,
   or `keep` action before copying the emitted confirmation into apply:

   ```powershell
   $env:CLOUDFLARE_ACCOUNT_ID = "REPLACE_WITH_32_HEX_ACCOUNT_ID"
   npm run provision:staging:plan
   npm run provision:staging:apply -- --confirm "alloflow-remediation-institution-staging@REPLACE_WITH_32_HEX_ACCOUNT_ID:create-staging-storage"
   npm run provision:staging:plan
   ```

   Apply creates or adopts only the exact dedicated OAuth KV, staging D1, and
   private staging R2 names. It re-inventories all three before normalizing the
   ignored local config with the verified KV and D1 IDs. A retry is idempotent;
   a configured ID/name mismatch fails closed. The final plan must report only
   `keep`. Keep the dedicated `PILOT_METRICS` Analytics Engine dataset and
   `CF_VERSION_METADATA` binding from the template. Never paste an existing
   catalog KV ID.
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
7. Store the four declared required secrets with Wrangler's interactive
   prompt; never put values in the config:

   ```sh
   npx wrangler secret put ACCESS_CLIENT_SECRET --config wrangler.pilot.local.jsonc
   npx wrangler secret put GEMINI_API_KEY --config wrangler.pilot.local.jsonc
   npx wrangler secret put RELEASE_CANARY_SECRET --config wrangler.pilot.local.jsonc
   npx wrangler secret put RUNNER_AUTH_SECRET --config wrangler.pilot.local.jsonc
   ```

   Store the same `RELEASE_CANARY_SECRET` value in the deployment platform's
   protected environment without printing it. A Worker secret alone is not
   available to the local/CI post-deploy canary process.
8. Generate and verify both runtime and pilot bindings: `npm run types` and
   `npm run types:check`.
9. Run `npm run runner:stage`, then `npm run runner:stage:check` and
   `npm run runner:canary`. Staging also generates the Worker-side release
   contract used by `/readyz`.
10. Run `npm run check`, `npm run runner:check`, and
    `npm run startup:check`.
11. Run `npm run preflight:staging`. It must fail until every placeholder and
    resource-isolation requirement is resolved.
12. List, apply, and re-list the D1 migrations against the remote pilot
    database:

    ```sh
    npx wrangler d1 migrations list PILOT_DB --remote --config wrangler.pilot.local.jsonc
    npx wrangler d1 migrations apply PILOT_DB --remote --config wrangler.pilot.local.jsonc
    npx wrangler d1 migrations list PILOT_DB --remote --config wrangler.pilot.local.jsonc
    ```

    Inspect the first list and stop on any unexpected migration state. Require
    the final list to show no pending migrations. The seven SQL files must apply
    in order:
    `migrations/0001_institution_pilot.sql`,
    `migrations/0002_remediation_effort_and_admission.sql`, then
    `migrations/0003_upload_attempt_admission.sql`, then
    `migrations/0004_job_attempt_leases.sql`, then
    `migrations/0005_job_checkpoints.sql`, then
    `migrations/0006_throttle_wait_and_verification.sql`, then
    `migrations/0007_admission_control.sql`.
    `/readyz` verifies that the live D1 `jobs` table exposes every required
    lease/checkpoint/throttle-wait/verification column. Still verify the remote migration history: the
    sentinel does not prove migration ordering or index creation.
13. Build the container as `linux/amd64` on an x64 CI host. The deny-by-default
    `.dockerignore` permits only runner inputs and the hash-recorded staged
    closure into the build context.
14. Set `ALLOFLOW_RELEASE_OPERATOR` to the bounded institution operator or CI
    identity. With protected `RELEASE_CANARY_SECRET`,
    `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` available to the
    deployment process, run `npm run deploy:staging`. It reapplies the exact checked R2
    lifecycle policy before deploy and must finish with a compatible
    authenticated `/readyz` response. A non-zero result is a failed release,
    even if Wrangler already uploaded the Worker.
15. Schedule `npm run alerts:check` every five minutes with the protected
    Analytics credentials described above and verify that exit 1 and exit 2
    reach the institution's notification channel.
16. Connect Claude with the exact custom-domain `/mcp` URL.
17. Connect a ChatGPT staging app using the exact callback copied into
    `CHATGPT_REDIRECT_URI` and complete the linking and tool-call gates below.
18. After every synthetic acceptance gate passes, set
    `PILOT_ACCEPTANCE_VERSION=institution-pilot-synthetic-v2` and deploy with
    `npm run deploy:staging:accepted` to expose the seven document tools. The
    accepted preflight requires the explicit local acceptance switch already
    composed into that command.

For an upgrade of an already-running pilot, use this order:

1. Apply the backward-compatible migration 0007 first. It creates the
   singleton gate in the open state, so old code remains available.
2. Set `ALLOFLOW_RELEASE_OPERATOR`, then use `npm run deploy:staging` (or the
   accepted variant). The command explicitly pauses admission before its
   bounded 35-minute drain. Do not unset `PILOT_ACCEPTANCE_VERSION` or set
   `PILOT_ENABLED=false`; those settings also remove status, cancel, delete,
   and transfer access. Migration 0004's lease is a safety margin, not a
   substitute for the checked drain.
3. Record the currently accepted Worker version, source revision, matching
   runner manifest/build hashes, container release, checked config, and D1
   migration list as the rollback target. Preserve secrets through the
   institution's normal protected backup/recovery process.
4. List, apply, and re-list migrations 0004 through 0007 with the remote D1
   commands above, in that order, after the drain and before deploying code
   that reads their lease/checkpoint columns. Require no pending migrations.
   Do not improvise a destructive down-migration during release recovery.
5. Deploy the new Worker and container together with the checked deployment
   command. Keep maintenance controls in place until `/readyz` succeeds and a
   new-version synthetic job has renewed its lease, committed and resumed a
   synthetic checkpoint, and completed successfully.
6. If the post-deploy canary fails, keep admissions stopped. Roll the Worker
   and container back together to a release proven compatible with the current
   migrated D1/checkpoint schema; never roll back only the Worker across this
   boundary. Re-deploying the recorded prior source with its matching staged
   runner/container is the safe default; a Worker-version rollback alone does
   not roll back bound D1, R2, KV, Durable Object, or container state. Re-run
   the authenticated canary and synthetic checkpoint/resume job before
   reopening admissions. The two-day R2 lifecycle privacy backstop should
   remain in force.

The wrapper acquires only an open gate, rechecks its unique local pause token
before every release step, and attempts a fenced resume even after a failed
release. It will not reopen an existing incident pause or a pause changed by an
operator during release. If ownership was lost or resume fails, admissions
remain closed and it prints the recovery command
`npm run admission:resume:staging`; this command is an explicit operator
`--force` override. Inspect the current pause owner/reason before using it. A
standalone pause prints the token needed for a deliberate fenced release; do
not copy that token into Worker configuration, telemetry, or shared logs.

Wrangler bindings are non-inheritable. If staging and production use
`env.*`, repeat KV, D1, R2, Workflow, Durable Object, Container, and route
bindings explicitly for both environments.

## Current verification commands

Do not use frozen test counts as evidence; concurrent hardening changes the
suite. From `services/alloflow-remote-mcp/`, rerun the checked entry points:

```sh
npm run runner:stage
npm run runner:canary
npm run lifecycle:check
npm run check
npm run runner:check
npm run startup:check
```

For focused diagnosis, `npm run types:check`, `npm run typecheck`, `npm test`,
`npm run preflight:test`, and `npm run runner:stage:check` are component
commands already composed by the higher-level checks. `lifecycle:check` is
offline-only; `canary:staging` is the authenticated remote check and requires
the protected release secret. A passing local command is not a deployment,
live OAuth acceptance, or edge-health result.

## Required acceptance gates

Use synthetic PDFs until all gates pass:

- unauthenticated `/mcp` returns a 401 OAuth challenge;
- unauthenticated `/readyz` returns 401 without disclosing compatibility data,
  while the protected release canary returns a non-local Worker version and an
  idle, byte-compatible runner, and proves the live D1 lease/checkpoint column
  sentinel;
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
- the remote bucket has the exact checked two-day `tenant/` object expiry and
  one-day incomplete-multipart abort policy before admissions open;
- Analytics Engine records carry the Worker release ID without job/attempt
  dimensions, and the five-minute external alert check reaches the expected
  notification path for both alert and query-failure exits;
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
