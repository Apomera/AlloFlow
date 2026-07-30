# AlloFlow remediation remote MCP

This is the isolated remote gateway for AlloFlow's document-remediation
connector. It uses the current stateless MCP SDK v2 handler and Streamable HTTP
at `/mcp`.

## Current milestone

The institution-owned pilot is implemented behind a fail-closed configuration
gate. The default `wrangler.jsonc` leaves it disabled and advertises only
`remediation_capabilities`. Configuration alone does not expose document tools:
an operator must set the exact documented synthetic acceptance version after
the staging gates pass. Transfer pages also require a path-scoped Cloudflare
Access identity matching the MCP owner. The acceptance flag enables synthetic
upload, start, status, privacy-safe report, result, cancel, and delete testing;
it does not authorize real documents. Public dynamic client registration is
guarded by a dedicated Cloudflare Rate Limiting binding, and the staging
configuration declares every required secret so deployment fails closed.

The example is deliberately non-deployable. A local staging copy must pass the
offline preflight before Wrangler can deploy it.
No remote MCP Worker or supporting Cloudflare resource has been provisioned or
deployed from this service.

See [INSTITUTION_PILOT.md](./INSTITUTION_PILOT.md) for the architecture,
identity flow, retention policy, provisioning sequence, security exceptions,
and acceptance gates. The working local MCPB under `desktop/mcp/` remains
available and exposes the broader 27-tool surface.

## Remote tool and remediation coverage

Version 0.3.0 exposes eight tools after the synthetic acceptance gate passes:

1. `remediation_capabilities`
2. `create_document_upload`
3. `start_remediation`
4. `get_remediation_status`
5. `get_remediation_report`
6. `get_remediation_result`
7. `cancel_remediation`
8. `delete_remediation`

`start_remediation` has two bounded `effort` profiles:

| Profile | Default target | Default fix passes | Polish passes | Auto-continue |
| --- | ---: | ---: | ---: | --- |
| `standard` | 95 | 2 | 0 | Disabled; 0 rounds |
| `thorough` | 95 | 3 | 1 | Enabled; at most 2 rounds |

## One remediation engine, three wrappers

The remote MCP is not a second document-remediation product. The ordinary app,
local MCPB, and remote runner all execute the canonical pipeline in
`doc_pipeline_source.jsx` / `doc_pipeline_module.js`. They share the same
audit/fix implementation, round reducer, progress/regression policy, exact-HTML
verification binding, active-content scan, distribution verdict, and tagged-PDF
delivery verdict.

| Surface | What the wrapper adds |
| --- | --- |
| Ordinary AlloFlow app | Interactive preview, Stop/continue controls, review choices, local project saving, and the existing `runAutoFixLoop` orchestration |
| Local MCPB | Local filesystem/browser adapter and the broader 27-tool private-file surface |
| Remote MCP | OAuth, opaque IDs, D1/R2/Workflow/Container isolation, quotas, wall-clock bounds, and fail-closed public delivery |

Auto-continue therefore already exists in the non-MCP app. The remote wrapper
does not own a different definition of a successful round: both wrappers use
the canonical `loopPolicy` and `finalizeRemediationRound` reducer. Their limits
intentionally differ. In the app, the ordinary Auto-fix control defaults to
three rounds, while the recommended hands-off Make Accessible path may run an
eight-round continuation and resume that loop up to three times when it keeps
improving. Those runs remain plateau-, ownership-, and Stop-gated. A person
using the app can inspect, stop, retry, or save an incomplete result; a public
unattended job must fit a predictable cost and time budget. That is why remote
`standard` performs no extra rounds and `thorough` permits at most two.

The same distinction applies to delivery. The interactive app may offer an
explicit review or clean-rebuild choice. The public remote route emits only
`original_layout` tagged output and withholds it when the source contains
executable/interactive content, the safety walk cannot completely examine the
PDF structures, the exact HTML binding is stale, or canonical distribution and
delivery evidence is incomplete.

Callers may still choose a target from 80 through 100 and one through three fix
passes. The optional `ocrLanguage` accepts a supported lower-case ISO 639-1
language tag with one optional 2-4 letter BCP 47 subtag, for example `en`,
`es`, or `zh-hant`. It is capped at 12 characters; legacy Tesseract codes,
multi-language composites, and free-form document text are rejected. A repeated
start with the same upload and identical resolved options returns the existing
job. Because the upload has one immutable remediation contract, a repeat with
changed options fails with `job_options_conflict` rather than silently changing
or duplicating the work.

`get_remediation_report` returns only an allowlisted quality summary. Unknown
fields and fields that might contain document-derived content are discarded.
The tagged PDF and private JSON report are each checked against their R2
SHA-256 metadata, and the report's artifact digest must match the published
PDF. Independent PDF/UA validation is intentionally reported as `not_run`:
the validator JAR is not packaged while licensing/provenance and a separately
bounded validation timeout architecture remain unresolved. No PDF/UA or WCAG
conformance claim is made.

Workload admission is enforced atomically in D1. Defaults are three open
uploads per user, 20 upload attempts per user and 100 per institution per
rolling 24 hours, one active job per user, two active jobs per institution, ten
jobs per user per rolling 24 hours, and 50 jobs per institution per rolling 24
hours. An upload grant is claimed once before bytes are accepted; a failed or
expired claim is not reopened, so repeated failed attempts still consume the
daily admission budget. Operators may lower or raise the bounded defaults with the documented
`MAX_*` variables. Rejected upload admission returns
`upload_quota_exceeded`; rejected job admission returns
`remediation_quota_exceeded`. Both are stable 429 errors.

The next high-value remote coverage is an independently licensed offline PDF/UA
validation step with its own timeout, followed by accessible HTML, an explicit
artifact table, and selected alternative formats. Batch and PII-heavy remote
tools stay deferred because they materially increase data, abuse, retention,
and review scope.

## Why stateless does not mean storage-free

The MCP handler creates a fresh protocol server for every HTTP request. It does
not need a long-lived MCP session, a per-client Durable Object, or an in-memory
job queue.

A future remediation still has durable application facts:

1. an authenticated user created upload `upload_id`;
2. private object storage holds the input;
3. a workflow/container processes `job_id`;
4. status and results remain readable on later independent requests.

Those facts belong behind opaque authenticated IDs in storage. They do not
belong in MCP transport state.

## Claude and ChatGPT authentication status

Claude's exact documented callback remains allowed without extra runtime
configuration. ChatGPT is a separate optional profile: copy the exact
`https://chatgpt.com/connector/oauth/<callback_id>` value shown in ChatGPT app
management into `CHATGPT_REDIRECT_URI`. The service rejects guessed defaults,
wildcards, query strings, fragments, alternate hosts, and near-match URLs.
Leaving the variable unset keeps a Claude-only deployment valid.

Every tool advertises both top-level `securitySchemes` and the mirrored
`_meta.securitySchemes` field, with a least-privilege scope for each protected
operation. Authentication and insufficient-scope failures also return
`_meta["mcp/www_authenticate"]`, which ChatGPT requires to open its account
linking UI. These contracts have Worker wire tests. A real ChatGPT staging
link, OAuth round trip, and document-tool call have not yet been accepted, so
the service must not be described as live ChatGPT support until that release
gate passes.

## Local development

Requires Node.js 24 or newer.

```sh
npm install
npm run types
npm run types:check
npm test
npm run check
npm run runner:check
npm run dev
```

This repository's current Windows workstation is ARM64, while Cloudflare's
`workerd` package ships a Windows x64 binary but no Windows ARM64 binary. On
that machine, run install, Wrangler, and Vitest with the documented x64 Node
toolchain under emulation; see
`docs/CLAUDE_HANDOFF_CLOUDFLARE_WRANGLER_2026-07-26.md`. Other supported
development machines use the standard commands above.

The local MCP URL is normally `http://localhost:8787/mcp`. Test it with the MCP
Inspector or add that URL to a client that can reach localhost.

## Existing Cloudflare account

A read-only inventory on July 29, 2026 confirmed that the existing AlloFlow
Cloudflare login and account can be reused for **synthetic engineering
staging**. Reuse the account/login and, once confirmed, its domain and Zero
Trust administration. Do not reuse the existing catalog Worker, public Pages
deployment, or any of the four catalog KV namespaces.

The account currently has no D1 databases or Workflows, R2 is not activated,
and Containers are unavailable because it is on Workers Free. The present
Playwright runner therefore needs the same account upgraded to Workers Paid
and R2 activated. Create new staging-only KV, D1, R2, Workflow, Worker,
rate-limit namespace, Access applications, and secrets.

The account name currently appears maintainer-owned rather than demonstrably
institution-owned. It must remain synthetic-only until institutional
administrators own or formally accept billing, domain, Access/IdP policy,
incident response, data processing, and offboarding.

## Pilot deployment sequence

The code boundaries now exist; institution resources and approvals do not.
Provision and validate a staging deployment using
`wrangler.pilot.example.jsonc` as the source template:

```powershell
Copy-Item wrangler.pilot.example.jsonc wrangler.pilot.local.jsonc
# Fill only dedicated staging resources and required institution values.
npm run preflight:staging
npm run deploy:staging
```

`wrangler.pilot.local.jsonc` is ignored by Git. The preflight rejects
placeholders, existing catalog KV IDs, public workers.dev/Pages hostnames,
shared or non-staging resource names, missing secret declarations, a missing
registration limiter, and accidental acceptance enablement. Complete the
synthetic end-to-end, cross-user isolation, deletion, container, abuse, and
privacy gates in `INSTITUTION_PILOT.md`. Only then rerun the preflight with the
explicit `npm run deploy:staging:accepted` command after setting
`PILOT_ACCEPTANCE_VERSION=institution-pilot-synthetic-v2`. Do not enable real
teacher documents or submit for broader Claude discovery until the separate
privacy, data-processing, and runner-asset gates pass.

Keep this service separate from `catalog/cloudflare-worker`. The catalog Worker
has a different purpose, data boundary, dependency generation, and deployment
risk.
