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
5. export a reviewed, tamper-evident package to an institution's badge system.

The institution remains the credential authority.

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

## Reviewed issuance contract

`POST /issuePd` uses secure reviewed issuance by default. It requires a bearer
secret held by a trusted server/reviewer service, never by a learner browser.
From the Worker's perspective, the bearer-token holder is the credential
authority. The Worker authenticates that caller, validates the decision schema
and cross-field bindings, and signs the claims supplied by the caller. It does
not authenticate the learner or reviewer, resolve reviewer authority, retrieve
evidence by digest, perform WCAG testing, or prevent replay. Those controls must
be implemented by the upstream institutional review service. A valid signature
proves integrity and issuance by the configured key—not independent completion,
WCAG conformance, accreditation, or UMS approval.

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
      "id": "accessible-module-authoring",
      "version": "1.0.0",
      "content_digest": "sha256:...",
      "title": "Accessible Module Authoring",
      "required_activity_ids": ["knowledge-check", "practice-response"]
    },
    "evidence": {
      "schema_version": "pd-evidence-1.0",
      "evidence_id": "evidence-0001",
      "evidence_digest": "sha256:...",
      "collected_at": "2026-07-16T17:00:00Z",
      "module_id": "accessible-module-authoring",
      "module_version": "1.0.0",
      "content_digest": "sha256:...",
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
      "module_id": "accessible-module-authoring",
      "module_version": "1.0.0",
      "content_digest": "sha256:...",
      "standard": "WCAG 2.2",
      "level": "AA",
      "status": "verified",
      "verified_at": "2026-07-16T16:00:00Z",
      "automated": {
        "completed": true,
        "blocking_issues": 0,
        "tools": ["axe-core", "IBM Equal Access"]
      },
      "manual_review": {
        "completed": true,
        "result": "pass",
        "reviewer_id": "accessibility-reviewer-1",
        "checklist_version": "wcag22-manual-1",
        "reviewed_at": "2026-07-16T16:00:00Z"
      }
    }
  }
}
```

The signed credential contains digests, decisions, and minimal evidence
references—not private response text. `/issuePd` does not receive or persist
private qualitative response text. A production integration must retain that
evidence in an authenticated, encrypted institutional store with approved
retention, consent, learner-access, correction, and reviewer-access policies;
this repository does not yet provide that store.

## Worker configuration

Reviewed issuance requires:

- `PD_ISSUER_PRIVATE_KEY` — Ed25519 PKCS8 private key, stored as a secret;
- `PD_ISSUER_PUBLIC_KEY` — the corresponding SPKI public key;
- `PD_ISSUER_AUTH_TOKEN` — a high-entropy server-to-server bearer secret; and
- `PD_ISSUER_NAME`, `PD_ISSUER_ID`, and `PD_ISSUER_KEY_ID` — issuer metadata
  assigned by the authorized institution.

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
`GET /pdIssuerKey` exposes only the reviewed key; `POST /verifyPd` selects the
trusted key from the signed profile and returns profile-specific assurance.

## Accessibility workflow

Automated testing is necessary but cannot establish WCAG conformance alone.
The publishing workflow should:

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

Reuse these capabilities through small services/adapters:

- AI provider routing, structured-output repair, cancellation, and provenance;
- source grounding and accuracy checks;
- axe/Equal Access execution and canonical verification policy;
- exact-output verification binding;
- encrypted qualitative submissions;
- rubric/anchor-based reviewer assistance;
- QTI export for compatible knowledge checks; and
- privacy-preserving interaction event summaries.

Do not call the monolithic generation dispatcher as the PD domain API. Do not
couple native module JSON to PDF remediation. The existing LTI surface remains
fail-closed until a verified one-time identity exchange is implemented; do not
restore query-string identity or role trust for this workflow.

## Next institutional integration steps

1. Define `pd-2.0` competency, pathway, rubric, and evidence-requirement fields.
2. Add authenticated evidence storage, encryption, retention, consent, and
   learner access/correction workflows.
3. Build an assessor queue with criterion-level qualitative analysis and human
   override; AI feedback must remain advisory.
4. Add replay/idempotency storage for review decisions and issuer events.
5. Map the approved export to the institution's Parchment/Open Badges workflow.
6. Pilot the metadata and evidence package with the UMS microcredential team
   before enabling institutional names, logos, issuer IDs, or badge issuance.
