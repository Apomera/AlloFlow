# AlloFlow Catalog Submission Worker

Community lessons, translation corrections and practice-item corrections are staged
in **private `COMMUNITY_SUBMISSIONS` KV**, with a 30-day expiration. They are never
committed to GitHub by this Worker. A maintainer reviews the private record and
publishes a separately reviewed copy through the existing publication workflow.
The PII scanner records only finding types/counts; it is not a de-identification guarantee.

## Required configuration before release

This source change is local. No namespace, secret, live binding, deployment or old
record was changed by the security repair. An authorized operator must choose an
institution-owned private KV namespace for `COMMUNITY_SUBMISSIONS` and a separate
KV namespace for `SUBMIT_RATE`, then record their real IDs in the corresponding
commented blocks in `wrangler.toml`. Do not use a public repository or a public
object bucket as the pending queue. Do not reuse the other submission namespaces.

All six public intake routes require `SUBMIT_RATE`: `/submit`,
`/submitTranslation`, `/submitItemCorrection`, `/submitBug`, `/submitPd`, and
`/submitPlugin`. An absent binding or failed rate-store read/write returns 503
before a submission write. The optional self-paced credential signer uses the same
guard; the separately authenticated institutional signer retains its own controls.
Lesson/correction intake additionally refuses missing `COMMUNITY_SUBMISSIONS`.
Keep existing BUG_REPORTS, PD_SUBMISSIONS and PLUGIN_SUBMISSIONS bindings intact.

`GITHUB_PAT` and the GITHUB_* variables are no longer used by this Worker. Once the
operator verifies the new release and confirms no other integration uses the old
token, revoke/remove it through the authorized credential process. This change
does not revoke credentials or remove old public Git history.

## Client/server release compatibility

Updated lesson/correction clients use `/v2/submit`, `/v2/submitTranslation` and
`/v2/submitItemCorrection`. The new Worker accepts these and the legacy names,
with the same private handling. An older Worker refuses the `/v2/` routes instead
of silently using its historical public-Git intake. Release the verified Worker
and clients together. A successful community response includes `id`,
`storage: "private"`, `review_status: "pending_review"` and `expires_at`.
Failure leaves the correction draft in its form; there is no automatic Google
Forms fallback. A lost response can mean storage succeeded without confirmation.

## Protection and retention

The shared per-client default is 3 requests/minute and 20/day. Operators may set
`SUBMIT_RATE_PER_MINUTE` and `SUBMIT_RATE_PER_DAY` for expected school/NAT traffic.
KV read-modify-write counters and dedupe are approximate across concurrent edges;
they are not an atomic global quota. Use an appropriate edge rule or serialized
rate service for stronger distributed guarantees before opening high-volume intake.
Failures are closed, and spoofable X-Forwarded-For is not used as the client key.

When `TURNSTILE_SECRET` is configured, every public intake route requires a verified
challenge in `X-Turnstile-Token` or the top-level `turnstile_token` field. The field
is removed before domain validation, hashing and storage. The current built-in
forms do not render a challenge widget; do not enable this optional secret until
the authorized widget/client flow is implemented and tested. A configured but
unavailable verifier refuses the request. CORS includes the challenge header.

Community records expire after 30 days and include `expires_at`; queue metadata
contains kind, time and the presence of scanner findings, not submitted text.
There is no public HTTP queue reader. Authorized operators can review the private
namespace with their existing Cloudflare administrative tooling. Remove sensitive
details before exporting a reviewed copy into the existing lesson, translation or
item-correction publication workflow. Exports, approved public copies, backups and
platform logs have separate retention; the TTL does not delete them or older Git
history. Bug-report TTL remains 30 days. Existing PD/plugin retention is unchanged.

## Local validation

`node smoke_test.mjs` runs synthetic mocked-KV/fetch checks without network access.
From the repository root, run the dedicated security suite and relevant existing
bug-report, PD and plugin tests. Do not validate intake by posting to the public
Worker or using real student information. Provisioning, live configuration and
publication require the owner's separate authorization.

## Other submission types

The following route-specific setup is additional to the required shared
`SUBMIT_RATE` binding above. These descriptions do not certify deployed state.

### `POST /submitBug` → Cloudflare KV (PRIVATE)
Bug reports from the in-app error reporter. Validates `{what|steps, type?, browser?, url?}`, PII-rescans,
and stores the record in the **private** `BUG_REPORTS` KV namespace — **NOT** GitHub, because error
logs + free text can contain FERPA-sensitive student data and this repo is public. One-time setup:

```
wrangler kv namespace create BUG_REPORTS      # paste the printed id into wrangler.toml
wrangler secret put BUG_REPORTS_ADMIN_TOKEN   # optional — enables the private developer inbox
wrangler deploy
```

Read reports either with the CLI (`wrangler kv key list --binding BUG_REPORTS`,
`wrangler kv key get --binding BUG_REPORTS <id>`) or through `/bug-inbox`. The JSON reader
`GET /bugs?limit=50` requires `Authorization: Bearer <BUG_REPORTS_ADMIN_TOKEN>` and returns
newest-first JSON. Query-string tokens are not accepted. The legacy `ADMIN_TOKEN` secret
works only when the dedicated bug token is absent; a dedicated token does not authorize
the unrelated PD/plugin readers.

`POST /submitBug` accepts `application/json` with an optional UTF-8 charset. It rejects a
declared body above 1,048,576 bytes before reading, independently caps actual streamed bytes,
and rejects malformed UTF-8/JSON with private, content-free errors. This remains an anonymous
intake endpoint; CORS is not district authentication or an admission control.

New bug-report records receive a server-owned `expires_at` and a **30-day KV expiration**.
This bounds free-text/log retention while allowing a month for triage. Clients cannot override
that window. New `/bug-review` status/note events expire no later than the parent report;
for a legacy parent without `expires_at`, newly written events receive at most 30 days.
New notes are refused near the parent's expiry instead of extending retention to meet KV's
60-second storage minimum. Existing report/review records are not migrated, deleted, or
given retroactive expiration by this change; the operator must review those separately.
Downloaded exports, email/digest-provider copies, backups, and platform logs have separate
retention controls. KV is private storage, not a guarantee that free text contains no PII.
Smoke test for all routes: `npm test`.

### `POST /submitPd` → Cloudflare KV (PRIVATE)
Professional-development module submissions from the in-app PD catalogue (Educator Hub → Community
Catalog → Professional Development → "Submit a module"). Validates `{pd_module, credit?, affirmations}`
against an exact, bounded server-side `pd-1.0` contract, including metadata version/language, safe
links, type-specific content, gates, paste/accommodation policy, and all four affirmations. Unknown
fields are rejected at every object boundary with content-free errors. The Worker independently
canonicalizes the accepted module, returns and stores its `sha256:` content digest, PII-rescans the
serialized module, and stores the record in the **private** `PD_SUBMISSIONS` KV namespace — **NOT**
GitHub, since educator-authored content can reference student/classroom detail and this repo is public.
One-time setup:

```
wrangler kv namespace create PD_SUBMISSIONS    # paste the printed id into wrangler.toml
wrangler deploy
```

Until the namespace id is set, `/submitPd` returns HTTP 500 (fail-closed, never silent data loss).
`PD_SUBMISSIONS` has no automatic TTL. It is an author-submission queue, not an authenticated learner
evidence vault or institutional assessor system. The optional shared `ADMIN_TOKEN` reader is an
operational maintainer control, not reviewer identity or authorization.

Review submissions with `wrangler kv key list --binding PD_SUBMISSIONS` /
`wrangler kv key get --binding PD_SUBMISSIONS <id>`; to publish an approved one, save its `pd_module`
to `catalog/pd/approved/<slug>.json`, add an exact manifest `moduleId`, version, language, path, and
content digest to `catalog/pd/index.json`, then run `npm run pd:check` before pushing. Smoke test for
all routes: `npm run verify:pd`.

### Reviewed PD credential adapter (OPTIONAL) — `POST /issuePd`, `GET /pdIssuerKey`, `POST /verifyPd`

The secure lane accepts a bearer-authenticated `{ "decision": { ... } }` using
`pd-reviewed-decision-1.0`. It binds the stable learner ID, authorized reviewer,
immutable module, governed evidence plus its distinct storage-envelope digest, and
consent/retention/legal-basis references. Its accessibility record binds the rendered
runtime, renderer, styles, state inventory, component-library version, full process
and state scope, browser/assistive-technology environments, automated and manual
report digests, validity window, status reference, and revalidation triggers into an
Ed25519-signed `reviewed-evidence` credential. Configure the reviewed keypair,
issuer metadata, server-only `PD_ISSUER_AUTH_TOKEN`, and private
`PD_ISSUANCE_LEDGER` R2 binding described in `wrangler.toml`. Issuance fails
closed on incomplete configuration, ledger failure, contract failure, or key mismatch.

**Trust boundary:** the Worker authenticates only the calling review service through
the bearer token. It validates schema, chronology, and cross-field bindings, then
signs the claims supplied by that service. It does not authenticate the learner or
reviewer, query an authorization registry, retrieve evidence by digest, perform WCAG
testing, or independently validate replay in the upstream review/evidence workflow.
It does enforce create-once credential issuance for each issuer ID plus decision ID:
an identical retry returns the exact stored credential, while changed claims under
the consumed decision ID return `409 decision_id_conflict`. A valid signature proves
integrity and issuance by the configured key—not independent completion, WCAG
conformance, accreditation, or UMS approval.

Create and bind a private R2 bucket before enabling reviewed issuance:

```sh
npx wrangler r2 bucket create alloflow-pd-issuance-ledger
```

```toml
[[r2_buckets]]
binding = "PD_ISSUANCE_LEDGER"
bucket_name = "alloflow-pd-issuance-ledger"
```

R2 conditional create (`etagDoesNotMatch: "*"`) is the concurrency boundary.
Do not substitute Workers KV: reviewed issuance requires strongly consistent
create-once storage.
The stored credential excludes learner names and qualitative response text, but its
stable learner ID, decision, evidence, and governance references can still be personal
data. Apply private-bucket access control, encryption, residency, incident response,
and an institution-approved retention/deletion/legal-hold policy. Deleting a live
create-once ledger record can reopen a consumed decision ID; use an authorized archive
or non-PII tombstone design that preserves replay safety before purging records.


- `POST /issuePd` with `Authorization: Bearer ...` and `{decision}` returns
  `201` for first issuance or `200` with `idempotent_replay: true` for an exact
  retry. Arbitrary browser `{record}` signing remains rejected by default.
- The signed payload binds a deterministic credential ID, canonical decision digest,
  stable learner ID (never the learner name), evidence and evidence-store digests,
  consent/governance references, exact rendered-surface/report/environment bindings,
  accessibility validity window, and issuer key ID.
- `GET /pdIssuerKey` exposes the current reviewed public key only as metadata or
  compatibility output. The catalog does not use it to promote assurance.
- `POST /verifyPd` is the authoritative verifier. It validates the exact wrapper
  and payload contracts, configured issuer identity, deterministic ID, all cross-bindings
  and chronology, then verifies with the trusted current or historical key. The embedded
  `public_key_spki_b64` field is untrusted metadata and must exactly match that keyring.
  Invalid or malformed credentials always return
  `assurance: {reviewed:false,institutional:false}`.
- A reviewed achievement can remain cryptographically valid after its bounded accessibility
  verification window ends. The response then has `accessibility_current: false`;
  consumers must check the authoritative status reference and reverify before claiming
  current WCAG 2.2 AA assurance.

`PD_ISSUER_PUBLIC_KEYS_JSON` may contain at most nine exact historical
`{key_id,public_key_spki_b64}` entries so old credentials and ledger retries
survive a controlled key rotation. IDs must be unique within one deployment. This is
not an institutional key registry: multiple issuers or administrative writers need an
authoritative control plane (for example a transactionally coordinated Durable Object
or equivalent service) for globally unique key IDs, custody, publication, and status.

The ledger provides issuance idempotency, not credential revocation. No authorized
revocation/status service is implemented, so deployment must not claim revocation,
accreditation, or UMS approval.

The optional browser-requested self-paced lane is disabled by default. If a
non-institutional deployment deliberately enables `PD_ALLOW_SELF_PACED_ISSUANCE`,
it must configure a separate `PD_SELF_PACED_PRIVATE_KEY` /
`PD_SELF_PACED_PUBLIC_KEY` and separate issuer metadata. It produces only
`self-paced-non-institutional` attestations and must never reuse the reviewed key
or identity. These attestations are verified through `/verifyPd`, not
`/pdIssuerKey`.

Canonicalization (`pd_core_module.js` ↔ Worker), key separation, binding checks, and
profile assurance are cross-checked in `tests/pd_worker.test.js`. The browser, strict
publisher, and Worker validators are still separate implementations and therefore a
drift risk; the planned `pd-2.0` contract package should generate all three. Smoke test:
`npm run verify:pd`.
