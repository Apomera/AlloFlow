# AlloFlow Professional Development (PD) modules

Community-authored, self-paced PD modules that educators take inside AlloFlow
(Educator Hub → Community Catalog → **Professional Development**).

- **Browse / Run / "My learning"** read the *approved* manifest below — only
  reviewed content ever appears in the app.
- **Submit** (paste, or **✨ Create with AI**) POSTs to the worker's private
  `/submitPd` route → `PD_SUBMISSIONS` KV (never the public repo). A maintainer
  reviews and publishes.

The runtime logic lives in [`pd_core_module.js`](../../pd_core_module.js)
(`window.AlloModules.PdCore`); the UI lives in
[`catalog_module.js`](../../catalog_module.js). Validate any module with
`PdCore.validatePdModule(jsonOrObject)`.

## Layout

```
catalog/pd/
Catalog identity has two deliberately separate fields: entry `slug` is the
lowercase URL/path handle used by learning paths, while entry `moduleId` must
exactly equal `pd_module.metadata.id` and is the authoritative progress,
history, and completion identity. New IDs may therefore be namespaced (for
example, `ums:microcredential:inclusive-course-design`) without changing a
friendly catalog URL. Slug fallback exists only for older manifest entries that
do not yet declare `moduleId`.

  index.json            # the pd_catalog manifest the app reads (approved only)
  approved/<slug>.json  # one pd_module per file
```

A learner's completion produces a **self-paced completion record** (JSON) and an
optional printable **certificate**. Both are explicitly *not* accredited contact
hours or a verified credential. A separate protected server-to-server adapter
can sign reviewed decisions, but it is not yet connected to UMS identity,
reviewer authorization, evidence storage, Open Badges, or Parchment systems.

## Local evidence package

After completion, a learner can explicitly prepare a local
`pd-review-candidate-1.0` JSON package for human review. AI advisory notes and
aggregate paste-event counts are independent optional scopes and default off.
The learner sees an artifact-kind/count preview, a warning that written
responses may contain personal data typed or pasted into free text, and a
second confirmation before download. Nothing is uploaded by this action.

The package omits structured identity and raw clipboard fields, but its
written evidence is labeled `learner-provided-unverified`, not anonymous. It
is bound to the exact module ID, version, language, module digest, activity
roster, consent notice payload/digest, artifact digests, and package digest.
It remains a review candidate rather than an institutional decision.

In-progress response drafts stay in the browser for at most 30 days; stale or
module-mismatched drafts are purged and completed responses are not kept in
persistent progress. **My learning** offers a separate **Delete all saved PD
responses** control. Completion history is summary-only and imported entries
are reduced to an allowlist, so hidden response/identity fields are dropped.

## `pd_module` schema (v `pd-1.0`)

```jsonc
{
  "schema_version": "pd-1.0",
  "kind": "pd_module",
  "metadata": {
    "id": "my-module-slug",        // stable id; used for progress + history keys
    "version": "1.0.0",           // publisher version; bump when content changes
    "language": "en-US",          // primary language for accessibility review
    "title": "Module title",        // required
    "topic": "UDL",                 // shown as a chip + a browse filter
    "summary": "1–2 sentences.",
    "estMinutes": 15,
    "audience": "educator",
    "license": "CC-BY-SA-4.0",
    "credit": "Your name / org"
  },
  "sections": [                      // ≥ 1 section
    { "title": "Learn", "activities": [ /* ≥ 1 activity */ ] }
  ]
}
```

### Activities

Every activity needs `id` (unique), `type`, `title`, and a `gate`.

| type        | `content`                                                        | completes when                | scorable |
|-------------|------------------------------------------------------------------|-------------------------------|----------|
| `read`      | `{ body, keyPoints?: [], links?: [{label,url}] }`                | learner acknowledges          | no       |
| `video`     | `{ url, body? }`                                                  | learner marks "watched"       | no       |
| `quiz`      | `{ questions: [{ prompt, options:[…≥2], correctIndex, explanation? }] }` | all answered and submitted     | **yes**  |
| `reflect`   | `{ prompt }`                                                      | non-empty response            | no       |
| `checklist` | `{ items: [string, …] }`                                          | ≥ 1 item checked              | no       |
| `sim`       | `{ scenario, rubric }`                                            | AI returns a formative masteryScore — or, if AI is unavailable, on a written response | no¹ |

> ¹ `sim` is an **AI-assessed scenario**: the learner writes a response and the
> shared AI returns a *formative* `masteryScore` (0–100) + feedback. That score
> is informational only and **must never gate** advancement (`gate.kind` must be
> `none`); a score gate on a `sim` is rejected by `validatePdModule`. If AI is
> unavailable, a written response still completes the activity.

### Gates (advance/“Next” is blocked until the gate passes)

- `{ "kind": "none" }` — passes once the activity is *completed*.
- `{ "kind": "score", "threshold": 0.75 }` — only on **scorable** types
  (`quiz`); `threshold` is a fraction in `(0, 1]`. A score gate on a
  non-scorable type, or a quiz question without a valid `correctIndex`, is
  rejected by `validatePdModule` (so a module can never be uncompletable).

## Learning paths (curated sequences)

`index.json` may include an optional `paths` array that groups modules into a
recommended order (a mini-curriculum). The app shows these under "Learning paths"
with per-path progress, and marks a path complete when every module in it is done.

```jsonc
"paths": [
  {
    "slug": "evidence-based-teaching-essentials",
    "title": "Evidence-Based Teaching Essentials",
    "summary": "Short curated sequence …",
    "moduleSlugs": ["retrieval-practice-quickstart", "actionable-feedback-quickstart", "udl-representation-quickstart"]
  }
]
```

Each `moduleSlugs` entry must match a published entry's `slug`. Paths are purely a
presentation layer over completion history — they add no new storage or gating.

## Authoring

- **By hand:** write a `pd_module` JSON (copy a file in `approved/`), then submit
  it via the PD tab's "Submit a module", or open a PR adding it under `approved/`.
- **With AI:** the PD tab's **✨ Create with AI** builds a constrained prompt,
  calls the shared `window.callGemini`, validates the result, and auto-repairs
  once. Output is tagged `ai_generated` / "AI-assisted draft" — **always review
  the content and quiz answer keys before publishing.** Be evidence-based; do
  not present neuromyths (e.g., "learning styles") as established fact.

## Publishing a submission (maintainer)

1. Read submissions: `wrangler kv key list --binding PD_SUBMISSIONS` /
   `wrangler kv key get --binding PD_SUBMISSIONS <id>` (or `GET /pdSubmissions`
   with the `ADMIN_TOKEN`).
2. Review for accuracy, PII, and license. Save the approved `pd_module` to
   `approved/<slug>.json`.
3. Run the standalone preflight while editing:
   `node dev-tools/check_pd_publish.cjs --module catalog/pd/approved/<slug>.json --json`.
4. Add an entry to `index.json` (`slug`, exact `moduleId`, `title`,
   `topic`, `summary`, `estMinutes`, `credit`, `license`, `path`,
   `version`, `language`, and `contentDigest`).
5. Run `npm run pd:check`. Resolve every blocking finding before review or
   publication. Warnings and the manual-review checklist remain reviewer work.
6. Optionally create a shareable machine report with
   `npm run pd:report -- --out reports/pd/<new-report-name>.json --quiet`,
   then push the approved module and bound manifest entry to `main`. Reports
   are created exclusively: existing files, paths outside `reports/pd`, and
   symlink/junction/reparse traversal are rejected rather than overwritten.

The checker is read-only unless `--out` is explicitly provided. Its
`pd-publish-report-1.0` output contains stable identity, version, language,
digests, paths, and check results, but never module bodies, response content,
unknown key/value samples, or suspected PII. Strict `pd-1.0` preflight rejects
unknown fields, prohibited control characters, oversized inputs, excessive
nested collections, and approved paths that fail `lstat` plus `realpath`
containment. Quiet blocking runs still print content-free findings to stderr.

Catalog reports include binding-only `runtime_build_digest`,
`renderer_digest`, `styles_digest`, and `state_inventory_digest` values
for the runtime, deploy mirrors, style inputs, and canonical interaction-state
inventory. These hashes identify what must be audited; they do not assert that
an audit ran. Every report says `conformanceClaim: false` and can advance only
to `ready-for-render-audit`, never WCAG or institutional approval. The focused
repository gate is `npm run verify:pd`.

## Immutable publishing and accessibility readiness

Every approved manifest entry must carry exact `moduleId`, `version`,
`language`, and the `contentDigest` returned by
`PdCore.moduleContentDigest(module)`. The learner
runtime fails closed when a bound manifest digest does not match the fetched
module. Completion records retain both the publisher version and exact digest.

Before publishing, run `PdCore.auditAccessibilityReadiness(module)`. A result
of `ready-for-render-audit` means only that required content alternatives are
present; it is not a conformance claim. The complete rendered process and every
interactive state still require automated and manual WCAG 2.2 AA verification.
Video activities need captions plus a transcript or documented accessible
alternative.

## Typed-response paste policy

A module or individual activity may declare:

```json
{
  "assessmentPolicy": {
    "paste": {
      "mode": "allowed | monitored | restricted",
      "accessibleAlternative": "Optional accessible response path",
      "accommodationContact": "Optional facilitator/contact guidance"
    }
  }
}
```

`allowed` is the default. `monitored` permits pasting and records only
timestamp, activity/field ID, character count, word count, and blocked status.
Clipboard contents are never stored. `restricted` is opt-in and valid only
with an accessible alternative or accommodation contact. A paste event is a
review signal only and never automatically fails a learner.

## Reviewed institutional issuance

Local progress, imported history, completion JSON, and certificates remain
self-reported and unverified. They can satisfy personal learning-path displays
but cannot establish institutional badge eligibility.

Reviewed `POST /issuePd` calls require a server-held
`PD_ISSUER_AUTH_TOKEN` and a `pd-reviewed-decision-1.0` body. The trusted
upstream caller must authenticate the learner and reviewer, resolve evidence
references, establish the accessibility decision, and bind all of those facts
to the same module version/digest. The Worker validates the contract structure
and internal cross-bindings but does not independently establish those facts.
Arbitrary client `{ "record": { "complete": true } }` signing is rejected by
default. The optional self-paced signing lane is explicitly non-institutional
and requires a separate keypair.

See [the microcredential foundation](../../docs/PD_MICROCREDENTIAL_FOUNDATION.md)
for the contract, UMS pathway mapping, privacy boundary, and deployment steps.

The app reads `index.json` from GitHub raw, so a push is all it takes to publish.
