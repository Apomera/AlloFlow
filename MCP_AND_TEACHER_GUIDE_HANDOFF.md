# AlloFlow continuation handoff

**Workstreams:** Agent Core MCP resource-pack authoring and the searchable teacher guide
**Last verified:** 2026-08-13
**Audience:** the next maintainer, agent, or school/district implementation partner

## Executive summary

The repository now has two complementary paths:

1. **AlloFlow remains the canonical interactive authoring and teaching experience.**
2. **An agent can draft a resource pack through the local MCP service, then use AlloFlow-compatible validation, preview, and export contracts without opening the app.**
3. **The teacher guide is maintained as Markdown/data in Git and generated into searchable, accessible HTML plus an offline/print artifact.**

The MCP implementation is intentionally provider-neutral. It does not read a Gemini key, make unsolicited Google calls, or silently send teacher/student content to a model provider. The agent supplies the draft resource history; the MCP composes, validates, previews, and exports it. A future model/provider adapter must be explicitly designed and approved before it is connected.

## What is implemented

### Agent Core / MCP

The local stdio MCP server exposes these resource-pack tools:

- `resource_pack_generate` — compose a completed pack from an agent-supplied resource history and request metadata.
- `resource_pack_validate` — return contract and quality diagnostics.
- `resource_pack_preview` — return a teacher-facing checklist/preview model.
- `resource_pack_export` — return serialized JSON and a safe filename; it does not write arbitrary paths.

The existing Blueprint tools remain available. Resource-pack jobs use the same job/result lifecycle and redacted audit model as the rest of Agent Core.

Current supported resource types are:

`directions`, `simplified`, `glossary`, `outline`, `quiz`, `sentence-frames`, `faq`, `concept-sort`, `timeline`, `math`, `note-taking`, and `anchor-chart`.

Important: this is a composition/finalization path, not yet a provider-backed “call Gemini and generate every artifact” path. The `generate(request, provider)` seam exists in the core module for future adapters and tests, but production MCP currently exposes the provider-neutral compose operation.

### Teacher guide

The canonical guide sources are:

- `docs/teacher-guide/guide.json`
- `docs/teacher-guide/chapters/*.md`
- `docs/teacher-guide/assets/screenshots/*`

The generator produces:

- `guide/index.html` and chapter pages;
- a client-side searchable index;
- `guide/offline.html`, a self-contained offline/print artifact;
- accessible navigation, headings, skip links, no-JavaScript browse fallback, responsive layout, and print CSS;
- the consolidated `AlloFlow Complete User Manual.md` output.

The current guide includes ten teacher-centered chapters, including school rollout/coaching, and uses dated screenshots of the public deployment. Screenshot dates and deployment caveats should remain visible when screenshots are refreshed.

Chapter titles and cross-reference link text are sentence case. Two gates hold this: every chapter must be linked under one consistent name, and link text may shorten or paraphrase a title but may not capitalize a shared word differently from it.

### Text-integrity and completeness gates

The build hashes every generated artifact, which guarantees the output is reproducible but not that it is correct. A corrupted character therefore survives as a permanently "verified" fixture. Four defects were live under a fully green suite before these gates existed:

- CP1252 mojibake in `guide.json` reaching `index.html` and two chapter pages;
- a middot in the generator's footer string flattened to a literal `?`, published on all generated pages, the offline edition, and the consolidated manual;
- `10-school-rollout-and-coaching.md` truncated mid-sentence, ending on a colon with the promised list never written;
- chapter titles and cross-links split between sentence case and Title Case;
- `classroom-workflows`, the eleven-recipe chapter, absent from every task path and so unreachable from the index chooser.

`tests/teacher_guide_build.test.js` now asserts, over both sources and generated output: no mojibake signature and no U+FFFD; an intact footer separator; no chapter ending on a colon or a bare heading; no heading above an empty section; consistent chapter naming; and that every chapter is reachable from at least one task path while no path routes to a chapter that does not exist.

Two traps worth knowing before editing these gates:

- **Do not scan generically for a stray `?`.** `guide/offline.html` inlines `guide-search.js`, whose ternaries false-positive. Assert the intact separator instead.
- **Compare heading depth, not adjacency.** A section may legitimately open on a nested subheading; only a following heading at the same or a shallower level means the section is empty.

Keep the generator's source pure ASCII. The footer separator is built as `String.fromCharCode(0xb7)` and `&#183;` precisely because a literal middot there has already been flattened once by a non-UTF-8 write. Author guide sources with an explicit UTF-8 write rather than through a shell pipe.

## Key files

### MCP/resource-pack files

| Purpose | File |
|---|---|
| Resource-pack module and contracts | `agent_core_resource_pack_module.js` |
| Shared Agent Core contracts | `agent_core_contracts_module.js` |
| Local stdio MCP server | `desktop/mcp/alloflow-mcp-stdio.cjs` |
| MCP configuration/readme | `desktop/mcp/README.md` |
| Authoring skill | `agent_skills/alloflow-resource-pack-authoring/SKILL.md` |
| Human-readable authoring contract | `docs/AGENT_CORE_RESOURCE_PACK_AUTHORING.md` |
| AlloPack format | `docs/ALLOPACK_FORMAT_SPEC.md` |
| Long-term federated-agent roadmap | `docs/ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md` |
| Service tests | `tests/agent_core_resource_pack_service.test.js` |
| MCP smoke tests | `tests/mcp_stdio_smoke.test.js` |
| Existing AlloPack tests | `tests/allopack_flagship.test.js`, `tests/allopack_catalog.test.js` |

### Teacher-guide files

| Purpose | File |
|---|---|
| Guide source manifest | `docs/teacher-guide/guide.json` |
| Chapter source | `docs/teacher-guide/chapters/` |
| Screenshot assets | `docs/teacher-guide/assets/screenshots/` |
| Generator | `dev-tools/build_teacher_guide.cjs` |
| Guide CSS/search assets | `docs/teacher-guide/guide.css`, `docs/teacher-guide/guide-search.js` |
| Guide tests | `tests/teacher_guide_build.test.js` |
| Generated site | `guide/` |
| Generated consolidated manual | `AlloFlow Complete User Manual.md` |

## Safe MCP usage sequence

The intended remote-agent flow is:

1. The agent gathers the teacher’s goal, audience, source material, constraints, and privacy boundary.
2. The agent drafts typed resource entries locally, preserving provenance and a human-readable rationale.
3. Call `resource_pack_generate` with the request and history.
4. Retrieve the result with the normal job/result flow.
5. Call `resource_pack_validate` and `resource_pack_preview`.
6. A teacher reviews the preview and approves edits.
7. Call `resource_pack_export` to obtain the portable pack JSON.
8. Import or stage the pack in AlloFlow/AlloPack workflows.

The agent should never treat “generated” as “approved for students.” Review, accessibility checks, privacy checks, and local curriculum review remain required.

## Safety boundaries

- The current MCP server is local stdio-only. It is not a public remote endpoint.
- Do not add direct Gemini/Google egress or read `.env`/environment secrets without explicit institution authorization and a written data policy.
- A future provider adapter must define: provider/model, data residency, consent, retention, quotas, key storage/rotation, audit fields, cancellation, and failure behavior.
- Never put API keys, raw student identifiers, private answers, or provider credentials in an AlloPack, guide screenshot, audit record, or generated HTML.
- Keep host-side privacy gates, UID mapping, retention policy, Firebase/mailbox writes, and security-sensitive state in the host application.
- Validate bounds and resource types before export; fail closed on malformed or ambiguous output.
- Treat generated resources as drafts until a human has reviewed accuracy, accessibility, differentiation, and student visibility.

## Highest-value next MCP work

### P0 — production-quality composition

- Expand validators and fixtures for every supported resource type.
- Add explicit diagnostics for missing provenance, empty instructional purpose, overlong fields, unsupported types, and privacy-sensitive content.
- Add renderer/preview fixtures so each exported type has a teacher-readable preview.
- Add deterministic IDs, bounded job size, cancellation, and repeatable result snapshots.

### P1 — provider adapter, only after approval

Define a small adapter interface around the existing `generate(request, provider)` seam. Start with a locally configured provider or district-owned gateway. Keep provider calls outside the MCP contract so the same validation/preview/export path works with no model at all.

The adapter should return typed drafts plus provenance, not opaque prose. The MCP should remain responsible for validation, redaction, audit, and export. Add integration tests with a fake provider before any real key is used.

### P1/P2 — richer pack coverage

- Add asset slots and optional image/audio references without embedding secrets.
- Add explicit AlloFlow import/staging status and human approval metadata.
- Add a district-owned authenticated remote adapter only after the local contract is stable.
- Add a separate asynchronous worker path for long-running model calls; do not block the stdio request indefinitely.

## Highest-value next teacher-guide work

### P0 — keep the guide trustworthy

- Re-run screenshot capture after meaningful UI/deployment changes. **This is the largest open gap: eight of ten chapters carry no screenshot at all, including Live sessions, and `01-workspace.png` sits in the assets folder unreferenced.**
- Use synthetic, non-identifying examples for any future AI-output screenshots.
- Keep “last verified” dates and deployment caveats beside screenshots.
- Do not hand-edit generated files; edit source Markdown/JSON and rebuild.
- Prove any new gate fails on the defect it targets before trusting it. Every gate above was replayed against the original broken input first.

### P1 — make it even more task-oriented

Done, and asserted by the suite rather than by hand:

- A generated searchable tool reference (`guide/tool-reference.html`) built from `tool-catalog-data.js`, so no feature counts are hand-maintained. No chapter now hard-codes a tool, language, or feature total.
- Eleven classroom recipes in `06-classroom-workflows.md` covering differentiation, multilingual learners and newcomers, word and sound practice, evidence-based writing, formative checks, STEM stations, SEL routines, accessible media, live differentiation without public labels, absent-student paths, and an AAC expression route.

Still open:

- Add current screenshots for Live Session Center, Run/Guide/Signals, Teacher Dashboard/evidence, Guided Mode, and end-session review.
- Add role-specific print packets for teachers, students, and school leaders. The seven-question staff handoff closing `10-school-rollout-and-coaching.md` is the natural source for the school-leader packet.

### P2 — collaboration and distribution

- Offer a reviewed Google Docs export for districts that require comments or shared editing; keep Git Markdown/data canonical.
- Add a deliberate service-worker route if the multi-page guide must be available inside the packaged desktop app. Until then, distribute `guide/offline.html` for offline use.
- Add a separate Admin/IT deployment guide rather than overloading the teacher journey.

## Validation commands

Run these after MCP changes:

```text
npx vitest run tests/agent_core_resource_pack_service.test.js --maxWorkers=1
npx vitest run tests/mcp_stdio_smoke.test.js --maxWorkers=1
npx vitest run tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/allopack_flagship.test.js tests/allopack_catalog.test.js tests/mcp_stdio_smoke.test.js tests/agent_core_resource_pack_service.test.js --maxWorkers=1
npm run verify:mcp-parity
node --check agent_core_resource_pack_module.js
node --check agent_core_contracts_module.js
node --check desktop/mcp/alloflow-mcp-stdio.cjs
```

Run these after guide changes:

```text
npm run build:teacher-guide
npm run verify:teacher-guide
npm run audit:docs
npm run audit:promo
npm run verify:build
git diff --check
```

The last verified baseline passed the new resource-pack service tests (5/5), MCP smoke tests (13/13), the focused Agent Core/AlloPack suite (210/210), MCP remediation parity (72/72), docs audit, build verification, and teacher-guide build checks.

The teacher-guide suite is now 35/35 after the text-integrity, completeness, naming, and reachability gates, up from 30. Treat a drop below 35 as a removed gate, not a flaky test.

## Handoff checklist

- [ ] Read `docs/AGENT_CORE_RESOURCE_PACK_AUTHORING.md` and the authoring skill.
- [ ] Run the focused MCP tests before changing the contract.
- [ ] Preserve the local/provider-neutral behavior unless an approved provider decision exists.
- [ ] Edit guide sources, rebuild, and inspect both a chapter page and `guide/offline.html`.
- [ ] Refresh screenshots only with synthetic or approved content.
- [ ] Run docs/build/parity checks before publishing.
- [ ] Keep unrelated dirty-worktree changes; do not reset the repository to make this work clean.
- [ ] Record any new provider, data-flow, or retention decision in this handoff and the relevant contract docs.
