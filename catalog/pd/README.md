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
  index.json            # the pd_catalog manifest the app reads (approved only)
  approved/<slug>.json  # one pd_module per file
```

A learner's completion produces a **self-paced completion record** (JSON) and an
optional printable **certificate**. Both are explicitly *not* accredited contact
hours or a verified credential — a purely client-side app cannot issue
tamper-proof credentials. The record schema is upgrade-ready for a future
server/Open-Badges issuer.

## `pd_module` schema (v `pd-1.0`)

```jsonc
{
  "schema_version": "pd-1.0",
  "kind": "pd_module",
  "metadata": {
    "id": "my-module-slug",        // stable id; used for progress + history keys
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
| `quiz`      | `{ questions: [{ prompt, options:[…≥2], correctIndex }] }`        | all questions answered         | **yes**  |
| `reflect`   | `{ prompt }`                                                      | non-empty response            | no       |
| `checklist` | `{ items: [string, …] }`                                          | ≥ 1 item checked              | no       |

> `sim` is reserved (Adventure-mode simulation) but not yet wired.

### Gates (advance/“Next” is blocked until the gate passes)

- `{ "kind": "none" }` — passes once the activity is *completed*.
- `{ "kind": "score", "threshold": 0.75 }` — only on **scorable** types
  (`quiz`); `threshold` is a fraction in `(0, 1]`. A score gate on a
  non-scorable type, or a quiz question without a valid `correctIndex`, is
  rejected by `validatePdModule` (so a module can never be uncompletable).

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
3. Add an entry to `index.json` (`slug`, `title`, `topic`, `summary`,
   `estMinutes`, `credit`, `license`, `path`) and push to `main`.

The app reads `index.json` from GitHub raw, so a push is all it takes to publish.
