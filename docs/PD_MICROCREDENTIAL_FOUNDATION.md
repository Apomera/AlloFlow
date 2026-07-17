# Professional Development → Microcredential Foundation

This document defines the institutional-readiness boundary for AlloFlow's
professional-development modules. It is an implementation guide, not a claim
that AlloFlow is affiliated with, approved by, or able to issue credentials on
behalf of the University of Maine System (UMS).

The intended role of AlloFlow is:

1. author and version accessible learning modules;
2. collect learner evidence, including qualitative work;
3. assist an authorized reviewer with criterion-level analysis;
4. preserve the human review decision and its provenance; and
5. prepare a reviewed, tamper-evident package for a future authorized adapter
   to an institution's badge system.

The institution remains the credential authority. No Parchment, Open Badges,
or other badge-system issuance adapter is implemented in this repository today.

## Trust lanes

### Personal self-paced learning

Local progress, imported history, completion JSON, and printable certificates
are learner-controlled. They are useful portfolio artifacts, but are always
marked `self-reported`, `unverified`, and non-institutional. They must not be
used as the source of truth for badge eligibility.

### Reviewed institutional evidence

An institutional decision must bind all of the following:

- authenticated learner identifier;
- immutable module ID and publisher version;
- SHA-256 digest of the exact canonical module;
- the complete set of required activity IDs;
- an evidence envelope and its SHA-256 digest;
- criterion/activity decisions and evidence references;
- reviewer identity, authority, timestamp, and review-record provenance;
- WCAG 2.2 AA verification for the same module digest; and
- both automated accessibility results and a dated manual review.

Only this lane is eligible for reviewed credential issuance.

### Local review-candidate bridge

After a module is complete, the learner may prepare a
`pd-review-candidate-1.0` package for a separate human review workflow. This
is an intentionally intermediate trust lane, not reviewed institutional
evidence:

- the learner must accept an exact versioned consent notice bound by locale
  and SHA-256 digest;
- learner-response evidence is the base scope; AI advisory analysis and
  aggregate interaction summaries are separate optional scopes and default
  off;
- a local preview shows artifact kinds and counts without echoing response
  contents, warns that free text may contain names, email addresses, or data
  typed or pasted by the learner, and requires a second confirmation before
  download;
- structured identity fields, raw clipboard events, clipboard content, exact
  event times, and field identifiers are excluded, but free-text artifacts
  are explicitly labeled `learner-provided-unverified` and are not claimed to
  be anonymous;
- the package binds module ID, version, language, content digest, activity
  roster, artifact digests, and a package digest; and
- preparation and download are local-only. They do not upload, submit, approve,
  authenticate, or issue anything.

In-progress responses are retained only in the learner's browser for at most
30 days. Stale drafts and drafts whose module digest changed are purged;
completed response data is removed from persistent progress storage. A
separate learner control deletes all saved PD response drafts. Completion
history remains distinct and is reduced to a bounded, allowlisted summary, so
imported hidden response or identity fields are not retained or re-exported.

An institution may ingest this package only into an authenticated evidence
workflow with its own identity, consent, retention, accessibility, and human
review controls. The local package is a review candidate, never badge
eligibility or proof of WCAG conformance.

## UMS pathway mapping

The UMS three-level framework can be represented without making the module
runtime itself a credential issuer:

| UMS level | AlloFlow learning/evidence pattern |
| --- | --- |
| Level 1 — foundation | Accessible instruction, low-stakes knowledge checks, reflection, and a documented learning outcome. |
| Level 2 — training and practice | Scenarios, constructed responses, revision, criterion-level rubric feedback, and an authorized competency decision. |
| Level 3 — real-world application | Workplace/project artifact references, supervisor or assessor evidence, feedback, revision, and a final human decision. |
| Stacked credential | Institutional badge-system action after all required reviewed decisions are verified. |

Module metadata should eventually identify the pathway, level, competency
standard, earning criteria, evidence requirements, rubric version, approving
unit, and badge-system mapping. These fields belong in a versioned `pd-2.0`
contract rather than being inferred from prose.

## Exact module binding

`PdCore.moduleContentDigest(module)` produces:

```text
sha256:<64 lowercase hexadecimal characters>
```

The digest covers the complete canonical module object. Changing a prompt,
answer option, answer key, gate threshold, rubric, accessibility alternative,
or assessment policy therefore produces a different digest. Completion and
review records must carry both:

- `moduleVersion`: the publisher's human-facing version; and
- `contentDigest`: the authoritative binding to exact bytes/content.

A catalog manifest may publish the expected digest. The runtime must reject a
fetched module when its computed digest does not match the manifest.

The private author-submission route independently validates the exact `pd-1.0`
field contract and records this same canonical digest in its response, KV record,
and KV metadata. `PD_SUBMISSIONS` is an author review queue with no automatic
publication or retention policy; it is not a learner-evidence vault.


## Reviewed issuance contract

`POST /issuePd` uses secure reviewed issuance by default. It requires a bearer
secret held by a trusted server/reviewer service, never by a learner browser, and
a private `PD_ISSUANCE_LEDGER` R2 binding. From the Worker's perspective, the
bearer-token holder is the credential authority. The Worker authenticates that
caller, validates decision schema, chronology, and cross-field bindings, and
signs the claims supplied by the caller.

The Worker does not authenticate the learner or reviewer, resolve reviewer
authority, retrieve evidence by digest, perform WCAG testing, or independently
prevent replay inside the upstream review/evidence workflow. It does enforce
create-once credential issuance for each issuer ID plus decision ID using a
strongly consistent conditional R2 write. An identical retry returns the exact
stored credential; different canonical decision claims under the consumed ID
return `409 decision_id_conflict`. A valid signature proves integrity and
issuance by the configured key—not independent completion, WCAG conformance,
accreditation, or UMS approval.

The body shape is:

```jsonc
{
  "decision": {
    "schema_version": "pd-reviewed-decision-1.0",
    "decision_id": "decision-2026-0001",
    "status": "approved",
    "decided_at": "2026-07-16T18:00:00Z",
    "reviewer": {
      "id": "reviewer-123",
      "name": "Authorized reviewer",
      "authority": "Institutional microcredential review team"
    },
    "provenance": {
      "system": "institution-review-system",
      "review_record_id": "review-record-0001"
    },
    "learner": { "id": "institution-learner-id" },
    "module": {
      "id": "ums:accessible-module-authoring",
      "version": "1.0.0",
      "content_digest": "sha256:...",
      "title": "Accessible Module Authoring",
      "topic": "Accessibility",
      "required_activity_ids": ["knowledge-check", "practice-response"]
    },
    "evidence": {
      "schema_version": "pd-evidence-1.0",
      "evidence_id": "evidence-0001",
      "evidence_digest": "sha256:...",
      "collected_at": "2026-07-16T17:00:00Z",
      "learner_id": "institution-learner-id",
      "module_id": "ums:accessible-module-authoring",
      "module_version": "1.0.0",
      "content_digest": "sha256:...",
      "evidence_store": {
        "system": "institution-evidence-vault",
        "record_id": "evidence-record-0001",
        "record_digest": "sha256:..."
      },
      "governance": {
        "record_id": "consent-record-0001",
        "notice_version": "notice-1.0",
        "notice_digest": "sha256:...",
        "notice_locale": "en-US",
        "granted_at": "2026-07-16T15:00:00Z",
        "scopes": ["credential-review", "learner-response", "integrity-monitoring"],
        "retention_policy_id": "retention-7y",
        "legal_basis_record_id": "legal-basis-0001"
      },
      "activity_results": [
        {
          "activity_id": "knowledge-check",
          "satisfied": true,
          "evidence_refs": ["response-knowledge-check"]
        },
        {
          "activity_id": "practice-response",
          "satisfied": true,
          "evidence_refs": ["response-practice-response", "review-note-1"]
        }
      ]
    },
    "accessibility_verification": {
      "schema_version": "pd-accessibility-verification-1.0",
      "module_id": "ums:accessible-module-authoring",
      "module_version": "1.0.0",
      "content_digest": "sha256:...",
      "rendered_surface": {
        "runtime_build_digest": "sha256:...",
        "renderer_digest": "sha256:...",
        "styles_digest": "sha256:...",
        "state_inventory_digest": "sha256:...",
        "component_library_version": "alloflow-components-1.0",
        "process_scope": "full-process",
        "state_scope": "all-states"
      },
      "environments": [{
        "browser": "Chrome",
        "browser_version": "126",
        "platform": "Windows",
        "platform_version": "11",
        "assistive_technology": "NVDA",
        "assistive_technology_version": "2026.1"
      }],
      "standard": "WCAG 2.2",
      "level": "AA",
      "status": "verified",
      "verified_at": "2026-07-16T16:00:00Z",
      "valid_through": "2027-07-16T16:00:00Z",
      "reverify_on_change": {
        "runtime_build": true,
        "module_content": true
      },
      "status_url": "https://institution.example/credential-status/accessibility-0001",
      "automated": {
        "completed": true,
        "blocking_issues": 0,
        "tools": [
          { "name": "axe-core", "version": "4.12.1" },
          { "name": "IBM Equal Access", "version": "3.1.83" }
        ],
        "report_digest": "sha256:..."
      },
      "manual_review": {
        "completed": true,
        "result": "pass",
        "reviewer_id": "accessibility-reviewer-1",
        "checklist_version": "wcag22-manual-1",
        "checklist_digest": "sha256:...",
        "report_digest": "sha256:...",
        "reviewed_at": "2026-07-16T16:00:00Z"
      }
    }
  }
}
```

The signed credential contains a deterministic credential ID, canonical decision
digest, issuer key ID, stable learner ID, immutable module binding, governed evidence
references, and the exact rendered accessibility scope—not private response text or
the learner name. The input `evidence_digest` is the digest of the normalized
evidence payload; `evidence_store.record_digest` is the digest of its stored
institutional envelope. They are deliberately different digest domains and must not
be equal. Consent scopes are allowlisted and must include `credential-review`.

The wrapper key ID and signed issuer key ID must agree. Its embedded
`public_key_spki_b64` is metadata only and must match the server's trusted
current/historical keyring. The private R2 ledger stores the canonical decision
digest and exact issued credential so a network retry cannot mint a second variant.

`/issuePd` does not receive or persist qualitative response text. A production
integration must retain that material in an authenticated, encrypted institutional
store with approved consent, retention, learner-access/correction, reviewer-access,
and legal-hold policies. The ledger still contains a stable learner ID and governance
references, so it is personal data even without names. Deleting a live ledger record
can reopen a consumed decision ID; any purge needs an authorized archive or non-PII
tombstone that preserves replay safety.

The optional `PD_ISSUER_PUBLIC_KEYS_JSON` keyring retains at most nine unique
historical reviewed keys. It supports verification and exact ledger replay after a
controlled rotation, but it is not a key-management control plane. Cross-deployment
or multi-issuer key-ID allocation needs an authoritative transactional registry (for
example a coordinated Durable Object or equivalent). The ledger/keyring do not
implement credential revocation or an authorized status service, and this foundation
must not be represented as UMS approval or accreditation.

## Worker configuration

Reviewed issuance requires:

- `PD_ISSUER_PRIVATE_KEY` — Ed25519 PKCS8 private key, stored as a secret;
- `PD_ISSUER_PUBLIC_KEY` — the corresponding SPKI public key;
- optional `PD_ISSUER_PUBLIC_KEYS_JSON` — at most nine exact historical
  `{key_id,public_key_spki_b64}` entries for verification during rotation;
- `PD_ISSUER_AUTH_TOKEN` — a high-entropy server-to-server bearer secret;
- `PD_ISSUER_NAME`, `PD_ISSUER_ID`, and `PD_ISSUER_KEY_ID` — issuer metadata
  assigned by the authorized institution; and
- `PD_ISSUANCE_LEDGER` — a private R2 bucket binding dedicated to reviewed
  create-once issuance records.

Create and bind the R2 bucket as documented in the Worker README. Do not replace
it with Workers KV: eventual consistency is not a safe replay/idempotency gate.
Missing, unreadable, corrupt, or unwritable ledger storage disables reviewed
issuance. Self-paced attestations deliberately remain outside this institutional
ledger.

Leave all reviewed issuer settings unset until institutional authorization and
key custody are established. The issuer private key and bearer token must never
be shipped in browser JavaScript, local storage, module JSON, an LMS launch URL,
or repository configuration.

Self-paced signing is disabled. `PD_ALLOW_SELF_PACED_ISSUANCE=true` re-enables
only the explicitly non-institutional profile and also requires separate
`PD_SELF_PACED_PRIVATE_KEY` and `PD_SELF_PACED_PUBLIC_KEY` values. Optional
`PD_SELF_PACED_KEY_ID`, `PD_SELF_PACED_ISSUER_NAME`, and
`PD_SELF_PACED_ISSUER_ID` values must not impersonate or reuse the reviewed
issuer identity. Reviewed and self-paced profiles must never share signing keys.
`GET /pdIssuerKey` exposes the current reviewed key only as compatibility
metadata; the catalog does not use it to promote assurance. `POST /verifyPd` is
authoritative: it validates the complete credential contract and uses the trusted
current/historical keyring. Invalid/malformed inputs return no assurance. A valid
reviewed achievement also returns `accessibility_current`, which is false after
the signed verification window ends even though the historical achievement remains valid.

## Accessibility workflow

Automated testing is necessary but cannot establish WCAG conformance alone.
The current publisher performs semantic/content readiness checks and binds the
module digest to the runtime source, renderer, styles, and a versioned learner-state
inventory. Its report deliberately says `verification_status: "binding-only"`,
`automated_audit_status: "not-evaluated-by-publisher"`, and
`conformanceClaim: false`. The PD render tests exercise that inventory with
axe-core in jsdom; they do not yet run Equal Access in a real browser or validate
assistive-technology behavior. The credential Worker only validates report metadata
and digests supplied by an authorized upstream reviewer; it performs no WCAG test.

A production verification workflow should:

1. author with a restricted semantic component library;
2. validate content requirements and safe external links;
3. render every learner state and full multi-step process;
4. run axe and Equal Access checks;
5. complete keyboard, focus, zoom/reflow, screen-reader, media-alternative,
   error-recovery, and cognitive-accessibility manual checks;
6. bind the report to the module digest; and
7. invalidate verification whenever the digest changes.

Use wording such as “WCAG 2.2 AA verification workflow completed for module
version X.” Do not market an automated scan as “fully compliant.”

## Paste and authorship policy

Paste behavior is an assessment policy, not a universal integrity control.
Supported policy modes are:

- `allowed` — default;
- `monitored` — disclose and record only timestamp, activity, character count,
  word count, and whether the action was blocked; and
- `restricted` — opt-in for a specific response and valid only when an
  accessible alternative or accommodation contact is documented.

Never store clipboard text. Never make a paste event an automatic failure.
Reviewers may consider it alongside revision history, sources, oral follow-up,
prompt-specific reasoning, artifacts, and an authorship attestation.

## Main-pipeline reuse boundaries

PD now reuses the main application shell, catalog/runtime renderer, active
`window.callGemini` route, `PdCore` in both browser and Node publishing,
source/deploy mirror checks, and the default verification gates. The remaining
reuse should be deliberate adapters rather than calls into the monolithic dispatcher:

| Capability | Current boundary | Next shared infrastructure |
| --- | --- | --- |
| Module contract | Browser/Node share `PdCore`, but the strict publisher and Worker validators still duplicate limits and canonicalization. | Generate one environment-neutral `pd-2.0` contract package and cross-runtime golden vectors for browser, Node, and Worker. |
| AI | PD uses the main provider route, but owns JSON extraction/repair and simulation prompts. | Add a typed PD adapter over `AIProvider` with cancellation, provider/model/prompt-version provenance, validated output, and a no-learner-PII default. |
| Accessibility | Publisher binds source/style/state inputs; PD tests run axe-only jsdom checks. | Extract the pinned axe 4.12.1 and Equal Access 3.1.83 browser runner, enumerate every PD state/process, save content-free reports, and retain manual WCAG-EM review. |
| Qualitative evidence | Review candidates are consented local JSON; institutional evidence storage is absent. | Reuse the RSA-OAEP/AES-GCM envelope primitives from `submission_crypto_module.js` behind authenticated institutional storage, managed keys, retention, deletion, and learner correction?not the existing classroom key-custody model. |
| Assessment review | PD has its own simulation scoring; the Submission Inbox already has rubric and anchor patterns. | Extract rubric/anchor UI and parsing into an authenticated assessor queue with criterion decisions, evidence references, human override rationale, and immutable provenance. |
| Identity | LTI is intentionally fail-closed; `/issuePd` authenticates only a server caller. | Add institutional OIDC/LTI 1.3 through a one-time server exchange plus learner/reviewer role resolution. Never trust query-string identity or roles. |
| Credential export | Reviewed signing, historical keys, and create-once R2 issuance exist; no badge adapter or revocation service exists. | Add an authorized Parchment/Open Badges 3 adapter, status/revocation, key-custody runbook, and replay controls across newly issued decision IDs. |
| Knowledge checks | Main QTI export exists but PD does not use it. | Add a narrow adapter for eligible PD multiple-choice activities without coupling PD to the entire export pipeline. |
| Build/test | `pd:check`, `verify:pd`, default `verify_all`, and the main fast-test selector cover PD. | Make missing test-runner dependencies fail release CI and add real-browser state audits plus shared schema vectors. |

Do not couple native module JSON to PDF remediation or treat local gradebook,
anonymous Firebase, shared admin-token, or classroom encryption flows as an
institutional identity/evidence system.

## Current institutional limitations

- no UMS affiliation, approval, accreditation, or issuer authorization;
- no authenticated learner evidence upload/store or digest-verified retrieval;
- no institutional learner identity, reviewer role resolution, or assessor queue;
- no credential status/revocation service or Parchment/Open Badges adapter;
- no global replay prevention when the same evidence is assigned a new decision ID;
- no automated WCAG conformance claim; and
- LTI remains intentionally fail-closed.

## Next institutional integration steps

1. **Authoring pilot:** adopt the strict publish report, schema-driven visual editing,
   versioned metadata, runtime/state binding, and manual accessibility checklist.
2. **Reviewer sandbox:** define `pd-2.0` competency/pathway/rubric/evidence fields
   with UMS reviewers and test the assessor workflow without issuing badges.
3. **Institutional evidence pilot:** add authenticated identity, encrypted storage,
   consent/retention/access/correction, digest-verified retrieval, and human review;
   AI remains advisory.
4. **Authorized issuance pilot:** establish key custody/rotation, status/revocation,
   global replay controls, and a Parchment/Open Badges adapter before enabling any
   institutional name, logo, issuer ID, or badge issuance.
