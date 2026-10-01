# AlloFlow Catalog Submission Worker

A small Cloudflare Worker that accepts lesson submissions from the in-canvas form, validates them, runs a server-side PII rescan, and commits each one to `catalog/pending/<timestamp>-<slug>.json` in this repo via the GitHub API.

The Worker holds the GitHub token as a Cloudflare secret. Clients (the Canvas form) only see the public Worker URL; they never see the token.

## One-time setup

### 1. Create a free Cloudflare account
- Go to https://dash.cloudflare.com/sign-up
- No credit card needed for the Workers free tier (100K requests/day).

### 2. Install the Wrangler CLI

```
npm install -g wrangler
```

### 3. Authenticate

```
wrangler login
```

Opens a browser window. Authorize Wrangler with your Cloudflare account.

### 4. Create a fine-grained GitHub Personal Access Token

- Go to https://github.com/settings/personal-access-tokens
- Click **Generate new token** → **Fine-grained token**
- **Resource owner**: your account (Apomera)
- **Repository access**: Only select repositories → `Apomera/AlloFlow`
- **Repository permissions**:
  - Contents: **Read and write**
  - Metadata: **Read-only** (auto)
- **Expiration**: 90 days (set a calendar reminder to rotate)
- Click **Generate token**, then copy it once. You will not see it again.

### 5. Store the token as a Worker secret

From this directory (`catalog/cloudflare-worker/`):

```
wrangler secret put GITHUB_PAT
```

Paste the token when prompted. The token is encrypted at rest in Cloudflare and is only injected into the Worker at runtime.

### 6. Deploy

```
wrangler deploy
```

Wrangler will print the public URL of your Worker, e.g.:

```
https://alloflow-catalog-submit.<your-cf-subdomain>.workers.dev
```

Copy this URL. You will paste it into one constant in the AlloFlow main app code (the `WORKER_SUBMIT_URL` near the in-canvas Submit view).

### 7. Smoke-test

```
curl https://alloflow-catalog-submit.<your-cf-subdomain>.workers.dev/healthz
```

Should return `{"ok":true}`.

Then a fake-submission test:

```
curl -X POST https://alloflow-catalog-submit.<your-cf-subdomain>.workers.dev/submit \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_payload": {"title":"Test","content":"hello"},
    "metadata": {"title":"Test","subject":"Other","grade_level":"K"},
    "affirmations": {
      "author_or_authorized": true,
      "no_pii": true,
      "license_agreed": true,
      "age_eligible": true
    }
  }'
```

Should return `{"ok":true,"slug":"test","filename":"<ts>-test.json","pii_findings_count":0}` and you should see a new file appear in `catalog/pending/` on GitHub within a few seconds.

## Local development

```
wrangler dev
```

Runs the Worker on http://localhost:8787. Note that you still need the secret set (Wrangler uses the same secret in dev). The Worker will commit to the real GitHub repo unless you change `wrangler.toml` to point at a fork.

## Updating

After editing `src/index.js`, redeploy:

```
wrangler deploy
```

## Rotating the GitHub token

Every 90 days when the token expires:

1. Generate a new fine-grained PAT (same scope as before)
2. `wrangler secret put GITHUB_PAT` and paste the new token
3. Worker picks up the new secret on the next request; no redeploy needed

## Security notes

- The Worker is rate-limited only by Cloudflare's default Worker limits. If abuse appears, add Cloudflare WAF rules or KV-based rate limiting in the handler.
- The Worker writes to `catalog/pending/`. The PAT cannot push directly to a branch protection rule; consider adding branch protection on `main` for additional safety.
- Lesson and translation submissions enter public Git history, including pending records. Keep PII out of those routes. Bug, PD-module, and plugin submissions use their private KV namespaces and must follow the corresponding retention and access controls below.
- The Worker does not implement spam protection beyond size + schema validation. If submission volume warrants, add Cloudflare Turnstile to the form and verify the token in the Worker.

## Additional submission types (same Worker)

This Worker also serves two other intake routes that reuse the same `GITHUB_PAT` secret / PII
scanner / CORS. Re-deploy after pulling (`wrangler deploy`).

### `POST /submitTranslation` → GitHub (public)
Community translation corrections. Validates `{language, suggested, key?, current?, english?, note?}`,
PII-rescans, commits one record to `translations/pending/<ts>-<lang>-<keyslug>.json`. Low-PII (UI
string suggestions), so public-repo storage is acceptable — same as lessons. Maintainer applies via
`node dev-tools/i18n/ingest_translation_feedback.cjs --apply`. No extra setup beyond the existing PAT.

### `POST /submitBug` → Cloudflare KV (PRIVATE)
Bug reports from the in-app error reporter. Validates `{what|steps, type?, browser?, url?}`, PII-rescans,
and stores the record in the **private** `BUG_REPORTS` KV namespace — **NOT** GitHub, because error
logs + free text can contain FERPA-sensitive student data and this repo is public. One-time setup:

```
wrangler kv namespace create BUG_REPORTS      # paste the printed id into wrangler.toml
wrangler secret put ADMIN_TOKEN               # optional — enables the GET /bugs reader
wrangler deploy
```

Read reports either with the CLI (`wrangler kv key list --binding BUG_REPORTS`,
`wrangler kv key get --binding BUG_REPORTS <id>`) or, if `ADMIN_TOKEN` is set, via
`GET /bugs?token=<ADMIN_TOKEN>&limit=50` (returns newest-first JSON). KV reports persist until
manually purged; periodically delete handled ones (and remember KV is private but still contains PII —
treat accordingly). Smoke test for all routes: `npm test`.

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
