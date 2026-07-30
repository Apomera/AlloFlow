# MCP Connector — Handoff, July 29, 2026

**Written for:** the next Claude Code session picking up the AlloFlow remediation MCP connector.
**Author:** Claude (Opus 5, 1M context)
**State at handoff:** 27 tools, deployed and pushed at `@ef3fe3c91`. All 25 deploy gates green.

> **Historical snapshot:** the header and sections 1-8 record the local
> connector/app state at Claude's handoff. They do not claim that the later
> remote Worker was deployed. Section 9 is the current remote continuation;
> rerun its verification commands instead of relying on frozen test counts.

Read this before `agent_skills/document-accessibility/SKILL.md`. The skill tells an agent how to
*use* the connector. This tells you how to *change* it, and which of the ways it can bite you have
already bitten someone.

---

## 1. What this thing is, in one paragraph

`desktop/mcp/alloflow-remediation-mcp-stdio.cjs` is a stdio JSON-RPC MCP server. It drives
`desktop/mcp/remediation_headless_driver.cjs`, which boots the real AlloFlow pipeline modules in
headless Chromium and calls them. Nothing is reimplemented: the connector is a transport onto the
same bytes the app ships. That is the whole design premise, and it is the thing to protect. If you
ever find yourself writing remediation logic *in the connector*, stop — the logic belongs in the
pipeline, and the connector should reach it.

---

## 2. Where things are

| File | Role |
| --- | --- |
| `desktop/mcp/alloflow-remediation-mcp-stdio.cjs` | Tool registry, schemas, arg validation, jobs, output paths |
| `desktop/mcp/remediation_headless_driver.cjs` | Chromium, module boot, AI bridge, every capability call |
| `desktop/mcp/zip_writer.cjs` | Zero-dep ZIP (ePub/DAISY). Required at driver load — omitting it breaks startup, not just a feature |
| `desktop/mcp/build_mcpb.cjs` | `.mcpb` bundle: `SERVER_FILES` + `ASSET_FILES` + a manifest tool list |
| `agent_skills/document-accessibility/SKILL.md` | What an agent reads to use it |
| `dev-tools/mcp_capability_inventory.cjs` | Measures connector coverage vs the pipeline |
| `dev-tools/agent_remediate.cjs` | The no-key, agent-does-the-reading path |
| `tests/mcp_*.test.js` | Historical MCP regression area; rerun the current suite rather than relying on a frozen count |

Three lists must stay in sync or something breaks silently:

1. `TOOLS` in the server (the registry)
2. `OUTPUT_SCHEMAS` in the server — **startup throws** if a tool has no schema, by design
3. the manifest tool list in `build_mcpb.cjs` — a **test** enforces parity

That third one is not theoretical. On July 29 I added `export_alt_format` to the registry and forgot
the manifest; the parity test caught it before commit. Trust that test.

---

## 3. Current coverage

Run `node dev-tools/mcp_capability_inventory.cjs` — do not trust this section over the tool.

At handoff: **27 tools · 30 of 117 pipeline functions · 13 of 16 capability areas.**
**Ten tools need no API key at all.**

Remaining gaps the inventory reports:

- **Resource / pack HTML generation** (`generateFullPackHTML`, `generateResourceHTML`) — a real gap,
  and the most straightforward next tool.
- **Preview + expert commands** (`getPdfPreviewHtml`, `updatePdfPreview`, `processExpertCommand`) —
  real, but stateful; think before wiring it.
- **"Batch a folder"** — reported as a gap and **arguably mislabeled**. The connector *does* batch;
  it loops its own audit rather than calling `runPdfBatchRemediation`. Decide whether to wire the
  pipeline function or teach the inventory that this capability is met another way. Do not "fix" it
  by adding a redundant tool.

---

## 4. Traps that have already cost a session

**The connector was once completely unable to remediate**, and a quarantined test hid it. The driver
never stamped a document-ownership epoch, so every run threw `DocumentOwnershipError`. Fixed by
publishing `__alloPdfDocumentEpoch` per run. Lesson: when an MCP test goes red, diagnose it. Do not
quarantine it. `tests/QUARANTINE.txt` should never gain an `mcp_*` entry.

**Reading the code is not enough — run it.** Every capability I added, testing contradicted what the
source appeared to say:

- `sanitizeStyleForWCAG` returns `{html, fixCount}`, not a string. Chaining it naively writes
  `"[object Object]"` into a document.
- The DOCX extractor returns `fullText`, not `text`. My first version reported success with zero
  characters.
- axe puts unresolvable contrast in `incomplete`, not `violations`. Counting only violations reports
  zero problems on unreadable text.
- The view module dies without React, so "just add it to the bundle list" ships something broken.
- My own capability inventory under-reported coverage by 7 functions (it missed aliased calls inside
  `page.evaluate`) and separately reported stale bundle state (it read `MODULE_FILES`, the boot list,
  instead of `ASSET_FILES`, what ships).

Five bugs, none visible from reading, all would have shipped.

**Correct your instruments in both directions.** Twice my measuring tool was wrong about work that
*was* done. Over-reporting and under-reporting are the same class of error.

**Do not add parallelism to batch runs.** `_geminiEffectiveMax` resets per run
(`doc_pipeline_source.jsx:4616`). Concurrency does not buy throughput here; it buys throttling.
Recommend fewer files, not faster.

**Windows/encoding.** Write non-ASCII as `\uXXXX` escapes in source. During this work, typing literal
private-use sentinels into `view_pdf_audit_source.jsx` silently produced empty strings. Verify with a
NUL/U+FFFD count after any scripted write.

---

## 5. What changed on July 29 (the alt-format work)

Commit `81bfb839e`, deployed at `@ef3fe3c91`.

ePub 3, DAISY 3 and Braille generation lived **inside `PdfAuditView` as download handlers**, so the
only way to produce them was to render React and click. Extracted to module scope in
`view_pdf_audit_source.jsx` as pure `HTML in → { path: contents } out` builders, published as
`window.AlloModules.AltFormatExports`, and the handlers now only zip and download.

New tool: **`export_alt_format`** (epub | daisy | brf). Model-free.

Things to know before touching it:

- **`view_pdf_audit_source.jsx` is the source; `view_pdf_audit_module.js` is generated.** Edit the
  source, then `node _build_view_pdf_audit_module.js`. The build script also writes the
  `desktop/web-app/public/` mirror and holds the `window.AlloModules.*` publish block — a new export
  must be added *there*, not in the source.
- **`mimetype` must be the first ZIP entry, STORED, no extra field.** `zip_writer.cjs` handles this
  and a test asserts the literal bytes at offset 38. Break it and you produce a file that opens
  nowhere while every layer above reports success.
- **DAISY deliberately reports `selfChecked: false` and omits `valid`.** There is no DAISY validator
  here. Do not "improve" this by returning `valid: true` off an empty error list — a check that never
  ran is not a pass. A test asserts `valid` is `undefined`.
- Braille is **Grade 1 / uncontracted only.** Contracted UEB needs the liblouis plugin, which is in
  the app and not in the connector.

---

## 6. Suggested next steps, in the order I would do them

1. **Publish the `.mcpb`.** It builds (`node desktop/mcp/build_mcpb.cjs`) but **no artifact is
   checked in and none is distributed**. This is the single largest gap between "exists" and "gets
   used" — every capability below matters less than this one.
2. **`generate_resource_pack`** — the last non-UI capability gap. Follow the `export_alt_format`
   shape: driver function → tool → outputSchema → manifest entry → tests.
3. **Decide the batch question** in §3 rather than leaving the inventory reporting a gap nobody
   intends to close.
4. **epubcheck** if ePub becomes load-bearing. The current self-check is structural only. A CheerpJ
   spike is risky — EPUB is a ZIP needing reverse seeks, unlike veraPDF's linear scan.
5. **A second remediation reference run** on a document that is *not* App E. Every honest claim
   currently rests on a sample of one.

---

## 7. Claims you may make, and claims you may not

This matters more than the feature list. The project's credibility is the asset.

**Supported by artifacts in this repo:**
- Two independent engines disagree on the same file: axe **100**, IBM Equal Access **92**. Nobody
  selling remediation shows you that.
- veraPDF caught **four real structural failures** that axe scored 100 on.
- axe reported **zero** contrast findings — violations *and* incomplete — on text at ~1.6:1.
- The reference run: 8 scanned pages, ~7 minutes, **no API key**, 94.7% Tesseract agreement,
  veraPDF 5 failures → 1 (the by-design PDF/UA declaration).

**Not supported yet:**
- That the $5–25/page remediation market is overcharging. That needs a sample larger than one
  document and a human conformance review nobody has done.
- That any output is "WCAG compliant." Automated checks cover only machine-decidable criteria.
  Whether a heading level is *right*, a reading order *logical*, or alt text *meaningful* needs a
  person.
- That the MCP improved remediation *quality*. It did not. It made the pipeline **reachable**. Keep
  those separate when describing it.

---

## 8. Repo hygiene (shared tree)

Many agents work in this one checkout, often uncommitted for a full day.

- **Pathspec commits only:** `git commit -m "..." -- <paths>`. `-m` comes *before* `--`.
- **Never** amend, reset, stash, or `git add -A`.
- **Chain add + commit.** A new file left staged gets swept into another session's broad commit.
- A hook-blocked commit leaves files **staged** — `git restore --staged` before retrying.
- `deploy.sh "message"` broad-adds `desktop/web-app/public/` and `app/`. **Commit your work first**
  or it lands under a "Post-deploy: update CDN hash refs" message.
- After deploying, always run `node dev-tools/check_cdn_live.cjs`. deploy.sh has historically exited
  0 without pushing to origin.

---

*Last verified: July 29, 2026, against `@ef3fe3c91`. If the inventory tool and this document
disagree, the tool is right.*

---

## 9. Codex continuation: institution-owned remote pilot

**Continuation date:** July 29, 2026. **Remote service version:** 0.3.0.
**Status:** implemented and hardened locally; existing Cloudflare inventoried
read-only; not provisioned or deployed; no live Claude or ChatGPT remote
acceptance has run.

The original handoff remains authoritative for the 27-tool local MCPB. A separate
optional remote service exists under `services/alloflow-remote-mcp/`.

The ordinary app, local MCPB, and remote MCP are three wrappers around one
canonical remediation engine in `doc_pipeline_source.jsx` /
`doc_pipeline_module.js`. The app adds interactive review/save controls, the
local MCPB adds a broad private-file adapter, and the remote MCP adds OAuth,
opaque IDs, durable Cloudflare state, quotas, and fail-closed delivery. None
owns a second audit/fix algorithm.

The base app already has `runAutoFixLoop`. Its ordinary Auto-fix control
defaults to three rounds, while the recommended hands-off Make Accessible path
may run an eight-round continuation and resume it up to three times while
progress continues. Those paths remain plateau-, ownership-, and Stop-gated.
The remote wrapper uses the same canonical `loopPolicy` and
`finalizeRemediationRound` reducer, but deployment policy sets `standard` to
zero extra rounds and `thorough` to at most two.

Implemented:

- Cloudflare Access for SaaS behind MCP-standard OAuth, DCR, and PKCE S256
- pinned Access issuer, audience, JWKS, lifetime, and stable-subject validation
- one-time fragment grants for private PDF upload and result download
- pseudonymous D1 ownership, R2 document storage, and Workflow job state
- one Cloudflare Container per job using the canonical remediation driver
- real Gemini credentials injected only at the Worker outbound boundary
- cancel/delete race protection and hourly reconciliation/retention cleanup
- a fail-closed default: document tools appear only after complete configuration and
  `PILOT_ACCEPTANCE_VERSION=institution-pilot-synthetic-v2`; this gate still
  authorizes synthetic documents only
- Claude's exact OAuth callback remains valid;
- optional ChatGPT compatibility through `CHATGPT_REDIRECT_URI`, which, when
  present, must exactly equal the HTTPS callback shown in ChatGPT app
  management, with no default, wildcard, query, fragment, userinfo, alternate
  host, or normalized near-match;
- least-privilege per-tool OAuth schemes and MCP account-linking challenges for
  missing or insufficient authorization; no live ChatGPT acceptance yet

Independent final review additionally added:

- a separate path-scoped Access JWT and same-owner check on `/upload/*` and `/result/*`;
- atomic D1 job creation/publication and replay-safe Workflow completion;
- R2-enforced SHA-256 verification for stored PDF and report bytes;
- confirmed Workflow and Container shutdown before cancel/delete becomes terminal;
- deferred cleanup that preserves valid completed output; and
- fixed-code runner logging plus a document/filename/bearer privacy canary.

Version 0.3.0 remediation and report coverage:

- Eight accepted-pilot tools: `remediation_capabilities`,
  `create_document_upload`, `start_remediation`, `get_remediation_status`,
  `get_remediation_report`, `get_remediation_result`,
  `cancel_remediation`, and `delete_remediation`.
- `start_remediation` now has bounded `standard` and `thorough` `effort`
  profiles. Standard defaults to target 95, two fix passes, zero polish passes,
  and zero auto-continue rounds. Thorough defaults to target 95, three fix
  passes, one polish pass, and at most two auto-continue rounds.
- Callers may override the target within 80-100 and fix passes within 1-3.
  Optional `ocrLanguage` accepts a supported lower-case ISO 639-1 language tag
  with one optional 2-4 letter BCP 47 subtag, such as `en`, `es`, or
  `zh-hant`. It is capped at 12 characters; legacy Tesseract codes,
  multi-language composites, and free-form document text are rejected.
- The first resolved option set is immutable for an upload. An identical replay
  returns the existing job; a changed replay returns
  `job_options_conflict` with status 409.
- `get_remediation_report` returns an allowlisted, owner-bound summary. It
  discards unknown and document-derived fields. The private JSON report and
  tagged PDF each have their R2 SHA-256 checked, and the report's artifact
  digest must match the independently verified PDF metadata.
- Independent PDF/UA validation remains explicitly `not_run`. The validator
  JAR is not packaged because its redistributable licensing/provenance has not
  been established for the remote image, and validation needs its own bounded
  timeout architecture. No PDF/UA or WCAG conformance claim is supported.

D1 workload admission defaults:

| Boundary | Default | Configurable variable |
| --- | ---: | --- |
| Open uploads per user | 3 | `MAX_OPEN_UPLOADS_PER_OWNER` |
| Upload attempts per user per rolling 24 hours | 20 | `MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H` |
| Upload attempts per institution per rolling 24 hours | 100 | `MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H` |
| Active jobs per user | 1 | `MAX_ACTIVE_JOBS_PER_OWNER` |
| Active jobs per institution | 2 | `MAX_ACTIVE_JOBS_PER_INSTITUTION` |
| Jobs per user per rolling 24 hours | 10 | `MAX_JOBS_PER_OWNER_24H` |
| Jobs per institution per rolling 24 hours | 50 | `MAX_JOBS_PER_INSTITUTION_24H` |

The upload and job counts are enforced inside the D1 admission statements. An
expired pending grant stops counting as open, but every created upload remains
in the rolling attempt counts; rejected uploads and failed or expired
one-time claims therefore consume daily budget and are never reopened.
Overflow returns stable 429 errors: `upload_quota_exceeded` for upload
admission and `remediation_quota_exceeded` for active/daily job admission.

Apply all migrations in order: `0001_institution_pilot.sql`,
`0002_remediation_effort_and_admission.sql`, then
`0003_upload_attempt_admission.sql`.

Cloudflare hardening subsequently added:

- generated runtime and pilot binding types, including required secret names;
- `wrangler types --check` as a blocking local/CI invariant;
- a Cloudflare Rate Limiting guard in front of public dynamic client
  registration;
- a deny-by-default container build context that excludes local secrets,
  dependencies, tests, and Wrangler state;
- an offline staging preflight that rejects placeholders, existing catalog KV
  IDs, public preview hosts, non-staging/shared resources, and premature
  acceptance enablement;
- explicit staging-only deployment commands; no generic live deploy command;
- low-sampled traces with invocation logs disabled; and
- a path-scoped GitHub Actions gate for Worker checks, runner staging/tests,
  startup profiling, and a `linux/amd64` image build.

Current verification is command-based rather than count-based. From
`services/alloflow-remote-mcp/`, rerun:

```sh
npm run check
npm run runner:check
npm run startup:check
```

For focused diagnosis, use `npm run types:check`, `npm run typecheck`,
`npm test`, and `npm run preflight:test`. Historical green runs remain useful
context, but their exact counts are not a current release claim. These local
commands do not prove deployment, edge health, or live Claude/ChatGPT OAuth
acceptance.

Read-only existing-account inventory:

- Wrangler OAuth is authenticated to the maintainer-named Cloudflare account;
- existing Pages/catalog Worker infrastructure and four catalog KV namespaces
  must remain separate from MCP data;
- no D1 databases or Workflows exist yet;
- R2 is not activated;
- Containers are unavailable until the same account moves from Workers Free to
  Workers Paid; and
- the current token cannot confirm or administer Cloudflare Access apps.

Important unresolved release gates:

- decide whether to institutionally govern the existing account or use a
  different institution-controlled account;
- enable Workers Paid, activate R2, and create dedicated staging KV/D1/R2,
  Workflow, Container, Worker, custom-domain, and Access resources;
- apply all three D1 migrations and run the full synthetic OAuth, cross-user,
  upload, standard/thorough, report, quota, Workflow, result, cancel, and delete suite;
- complete exact-callback account linking and the full synthetic staging path
  in both Claude and ChatGPT; the ChatGPT acceptance gate has not run;
- build and scan the `linux/amd64` image on a Docker-capable x64 host;
- vendor/hash-lock the canonical runner's current CDN dependencies;
- obtain institution approval for the Gemini project, model, data path, and agreements;
- resolve offline PDF/UA validator licensing/provenance and its independent
  timeout architecture before packaging the validator; and
- disclose the applicable D1 Time Travel recovery window in the privacy review.

Recommended next remote coverage:

1. Package an independently licensed offline PDF/UA validator in a separately
   bounded validation step.
2. Add accessible HTML, an explicit artifact table, and selected alternative
   formats.
3. Keep batch and PII-heavy remote tools deferred until quotas, retention,
   privacy review, and operational ownership can support their larger blast
   radius.

The MCP transport is still stateless. That removes protocol-session storage only.
OAuth grants, one-time capabilities, object ownership, documents, jobs, results, and
retention deadlines remain explicit application state in KV, D1, R2, Workflows, and Containers.

Read `services/alloflow-remote-mcp/INSTITUTION_PILOT.md` for the architecture,
provisioning sequence, retention rules, security exceptions, and acceptance gates.

Do not submit this remote connector for broader Claude or ChatGPT discovery
until those gates are completed.
