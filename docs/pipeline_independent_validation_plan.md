# Plan: Independent PDF/UA Validation for AlloFlow's Tagged-PDF Output

> **Plan snapshot note (2026-07-09):** This June 2026 plan predates the July PDF/UA documentation sweep and later veraPDF guidance. Verify current `PIPELINE_ARCHITECTURE.md`, `docs/verapdf_install.md`, PDF pipeline tests, and actual validator availability before treating "no code written" or implementation steps below as current.

**Status:** Proposed (plan only — no code written)
**Author:** Claude (research + architecture verification session, 2026-06-13)
**For:** The agent currently working on the remediation pipeline
**Scope:** A prioritized, self-contained implementation plan. Primary item = wire in **independent PDF/UA validation (veraPDF)**. Two supporting low-cost upgrades included.

---

## ⚠️ Coordination note (read first)

Another agent (you) is actively working on the pipeline. This document is a **plan, not a patch** — it deliberately does **not** prescribe exact diffs, so it won't collide with in-flight edits. When you implement:
- Multiple Claude sessions share **one** working tree. Check `git status` / `git log` / `origin` before any commit/push/deploy, and **stage only the files you changed by path**. Don't push others' unpushed commits, and don't let `deploy.sh` bundle WIP that isn't yours.
- Edit the **`*_source.jsx`** file, then rebuild the `*_module.js` (and keep the `desktop/web-app/public` mirror in sync) via the existing `_build_*.js` script. Run `node --check` on generated files and the relevant **golden-master** tests before considering anything done.
- This validation work is **additive and read-only with respect to the remediation logic** — it should not change how documents are fixed, only how the *result is independently checked and reported*.

---

## Background & motivation

AlloFlow's remediation pipeline was verified from source this session (`doc_pipeline_source.jsx` + `PIPELINE_ARCHITECTURE.md`, which match). Key verified facts:

1. **AlloFlow generates a genuine, native tagged PDF** — *not* browser print-to-PDF. It builds a real structure tree with `pdf-lib`: registers content streams and sets `/StructParents` on the page node, creates `StructElem`s, and marks decorative content as `/Artifact` so screen readers skip it (~`doc_pipeline_source.jsx:4333`). An HTML-tag→PDF-role map (`TAG_TO_PDF_ROLE`, ~`:1465`) carries semantic structure into the tag tree, and a "typeset tagger" path (~`:7130`) tags even born-digital/transcript content that has no source PDF. On intake, `extractPdfStructTree` (~`:3521`) reads existing tag trees via pdf.js.
2. **Scoring is currently self-referential.** The final score is a 50/50 blend of axe-core and the *same family of AI auditors* that proposed the fixes. axe-core is the only independent (non-LLM) axis, and **axe-core does not validate PDF/UA** — it evaluates the HTML accessibility tree, not the emitted PDF's tag structure.

**The gap:** We can say "AlloFlow produces a tagged PDF" (verified at the code level). We **cannot yet** say "its tagged PDFs are validated as PDF/UA-conformant by a tool that didn't build them." That second statement is what institutional reviewers, the UMaine/Garry reliability gate, and any compliance-sensitive buyer actually want — and it is exactly the credibility advantage the comparable AWS/ASU open-source solution has.

**Comparison anchor (AWS/ASU, `github.com/ASUCICREPO/PDF_Accessibility`):** that solution outsources tagging to Adobe's Auto-Tag API and brackets remediation with **Adobe's independent `PDFAccessibilityCheckerJob`** pre/post. Its credibility comes from validation by a tool independent of the fixer. (It's also *open-loop* — it never diffs the before/after reports or gates on them — which is a place AlloFlow's closed-loop self-correction is actually *more* advanced. Don't trade that away.)

**Why veraPDF specifically:** it is the open-source, industry-standard **PDF/UA** validator (maintained by the PDF Association), free, scriptable, and produces machine-readable output. It fits AlloFlow's no-vendor-lock-in / runs-anywhere / School-Box philosophy — unlike Adobe's paid API. It lets us validate our *native* tag tree against an authority that didn't build it, at $0.

---

## Goal & success criteria

**Goal:** Produce independent, machine-readable PDF/UA conformance evidence for AlloFlow's tagged-PDF output, and surface it honestly — separate from the self-referential AI score.

**Done looks like:**
- A reproducible way to run veraPDF (PDF/UA-1) against AlloFlow's tagged-PDF outputs and capture pass/fail + the specific failed clauses.
- A small corpus of representative test documents (simple, multi-column, tables, figures, math, forms, long doc) with their veraPDF results recorded — answering the still-open question *"do our tagged PDFs validate clean on complex docs?"*
- Honest reporting language wherever results are shown (see Guardrails).
- No regression to existing golden masters or the remediation logic.

**Explicitly NOT a goal:** claiming "PDF/UA compliant" anywhere until veraPDF actually confirms it on real outputs. (See the FTC v. accessiBe note in Guardrails.)

---

## The browser constraint (important — shapes the whole approach)

veraPDF is a **Java** application (CLI + Greenfield validation library; an official **Docker image** exists). There is **no official browser/WASM build**. AlloFlow is browser/client-side (Canvas-first) with a Desktop local runtime and an optional Docker School Box stack for server/appliance deployments.

Therefore validation **cannot** run inline in the pure browser/Canvas path. The plan is **two-tier**, sequenced so the highest-value, lowest-risk work comes first and **does not touch the runtime pipeline at all**:

- **Tier A — Dev/QA validation harness (do first).** Runs outside the app, in CI/dev. Validates the *claim* and produces the reliability evidence. Zero runtime-pipeline changes.
- **Tier B — Optional local-service integration (later).** For the School Box / local-deployment path, expose veraPDF as a local validation microservice the app can call to show a PDF/UA result next to the axe/AI score. The browser-only/Canvas path documents the limitation and offers a "download & validate" workflow.

> Confirm current veraPDF specifics against its docs before implementing (CLI flags, flavour ids, output formats can change). As of writing: PDF/UA-1 flavour is invoked roughly as `verapdf --flavour ua1 <file.pdf>`, with machine-readable XML/JSON ("MRR") output; a Docker image and a Java API (Greenfield/PDFBox model) are available; PDF/UA-2 support is newer — verify whether ua2 is needed for your target.

---

## Work items (prioritized)

### 1. PRIMARY — veraPDF dev/QA validation harness (Tier A)

**What:** A scriptable harness (CI job or a `dev-tools/` / `tests/` utility, matching existing project conventions) that:
1. Takes a set of AlloFlow tagged-PDF outputs (generated from a fixed corpus of source docs through the normal pipeline export).
2. Runs each through veraPDF PDF/UA-1 (via Docker or a local Java install).
3. Parses the machine-readable result into: overall pass/fail, count of failed checks, and the specific failed PDF/UA clauses (e.g., reading order, table structure, tagged-content vs artifact, role mapping).
4. Emits a concise report (JSON + a human-readable summary) recording per-document conformance.

**Why first:** It directly answers the open reliability question, requires **no change to the runtime pipeline**, and produces exactly the evidence the Garry/UMaine reliability gate wants — with no Adobe dependency and no risk to the live fix logic.

**Corpus suggestion** (cover where automation is known to degrade): a clean simple doc, a multi-column layout, a data-table-heavy doc, a figure/chart doc, a doc with math, a form, and a long (30+ page) doc. The USM catalog already used as a demo is a good real-world anchor.

**Outputs feed:** the reliability narrative, and a punch-list of which PDF/UA clauses AlloFlow's native tagger most often fails — which becomes the prioritized backlog for improving the `TAG_TO_PDF_ROLE` mapping / `StructElem` construction.

**Integration points to read (do not necessarily modify):** the tag-tree construction (~`doc_pipeline_source.jsx:4333`), `TAG_TO_PDF_ROLE` (~`:1465`), the typeset tagger (~`:7130`), and wherever the final PDF bytes are assembled for export.

### 2. OPTIONAL/LATER — veraPDF as a local validation microservice (Tier B)

**What:** For the School Box / local-deployment path, add a veraPDF microservice (Docker) alongside the existing local stack. The app POSTs the generated tagged-PDF bytes and receives a PDF/UA pass/fail + failed clauses, displayed **as a separate, independent panel** next to the existing axe/AI blended score.

**Browser-only / Canvas fallback:** when no local validator is reachable, show a clear "Independent PDF/UA validation not available in this environment — download the PDF and validate with veraPDF or PAC 2024" affordance. Do **not** silently imply validation happened.

**Guard:** this is the only item that touches runtime UI/flow. Keep it behind capability detection (validator reachable or not), and keep the existing score display unchanged in the no-validator case.

### 3. SUPPORTING (low-cost, portable) — alt-text prompt discipline

Borrowed from the AWS/ASU alt-text generator, both rules are model-agnostic and improve quality at near-zero architectural cost. In AlloFlow's Gemini Vision **alt-text micro-tool** (one of the 23 surgical tools; find the alt-text diagnosis/generation prompt in `doc_pipeline_source.jsx`):
- **Decorative classification:** classify each image as decorative vs informative; for decorative, emit `alt=""` rather than a description (matches WCAG 1.1.1 decorative handling and reduces screen-reader noise). Consider a small "decorative vs informative" gate before alt-text generation.
- **Math/figure verbalization:** for equations/charts, instruct the model to spell out every symbol, number, and operator (e.g., "2 open paren 4 y plus 1 close paren equals 3 y").

**Guard:** changing prompt text can shift golden-master snapshots — re-baseline intentionally and review the diff.

### 4. SUPPORTING (organizing/explainability) — WCAG-SC issue→fix registry

Catalog each of the **39 deterministic fixes** and **23 surgical micro-tools** against a WCAG success-criterion id (and the issue type it resolves), the way the AWS/ASU `awslabs` engine maps `issue_types.py` 1:1 to named strategies. Output: a coverage table showing which SCs are handled deterministically, which via AI, and which are unhandled. This is a documentation/metadata refactor (could live as a data table + a generated coverage report), not a behavior change — high explainability payoff for institutional reviewers, low risk.

---

## Guardrails & constraints

- **No overclaiming — this is the whole point.** The FTC fined accessiBe **$1,000,000 (April 2025)** for marketing automated "WCAG compliance" without evidence. Until veraPDF confirms conformance on a given document, the honest framing is **"first-pass automated remediation toward WCAG 2.1 AA / PDF-UA; independent validation recommended,"** never "compliant." Report the veraPDF result as the independent signal and keep the AI blend explicitly labeled as a heuristic.
- **Keep the self-referential score honest.** Where the 50/50 AI+axe blend is shown, weight/label **axe-core** (and, when present, **veraPDF**) as the independent axes and the AI auditors as a heuristic — consistent with the academic finding that rule-based tools are the trustworthy technical-verification layer (arXiv 2509.18965, best LLM ≈ 0.85).
- **Don't regress the closed loop.** AlloFlow's accept-or-revert + regression-guard + plateau-detection loop is a genuine strength (more advanced than AWS/ASU's open loop). Validation is an *additional* independent check, not a replacement for that loop.
- **Build/verify discipline:** edit `*_source.jsx` → rebuild module → sync mirror → `node --check` → run golden masters → `verify_all`. Stage only your files.
- **Don't break the air-gap/School-Box value.** Keep validation runnable locally/offline (veraPDF Docker), no external SaaS dependency.

---

## Acceptance / verification

1. Harness runs veraPDF PDF/UA-1 against the test corpus and emits per-doc pass/fail + failed clauses (JSON + summary).
2. Results are recorded (committed report) so the "do tagged PDFs validate clean?" question has a real, dated answer.
3. Any in-app surfacing (Tier B) shows the PDF/UA result as a **separate** panel, with an honest "not available" fallback in the browser-only path.
4. No golden-master regressions; `node --check` clean; remediation behavior unchanged except for the intentional alt-text prompt update (item 3), whose snapshot changes are reviewed.
5. No "compliant" claim appears anywhere a veraPDF pass hasn't been demonstrated.

---

## Open questions for the implementer

- **PDF/UA-1 vs UA-2:** target ua1 first (broadest tooling); decide if ua2 matters for any institutional partner.
- **Where the harness lives:** `dev-tools/` vs `tests/` — follow whatever the current convention is (the repo already has `dev-tools/check_*.cjs` validators wired into `verify_all`; a veraPDF check could follow that pattern as an *informational* gate first, not blocking, until the true-positive rate is understood).
- **Tier B priority:** only worth it once Tier A shows the tagged PDFs are close to conformant; if Tier A reveals systematic tag-tree gaps, fix those (improving `TAG_TO_PDF_ROLE` / `StructElem` construction) **before** building the in-app panel.

---

## References

- AlloFlow architecture: `PIPELINE_ARCHITECTURE.md`; source `doc_pipeline_source.jsx` (tagging ~`:1465`, ~`:4333`, ~`:7130`; struct-tree intake ~`:3521`).
- AWS/ASU comparator: `github.com/ASUCICREPO/PDF_Accessibility` (MIT) + `github.com/awslabs/content-accessibility-utility-on-aws` (Apache-2.0). Adobe Auto-Tag for tagging; independent Adobe `PDFAccessibilityCheckerJob` pre/post (report-only, open-loop).
- veraPDF: https://verapdf.org/ (open-source PDF/UA validator; CLI + Java API + Docker).
- PAC 2024 (free Windows PDF/UA checker) — useful as a manual cross-check, not automatable.
- Benchmark: arXiv 2509.18965 (best LLM ≈ 0.85; prescribes rule + LLM + human).
- Cautionary precedent: FTC v. accessiBe, $1M final order, April 2025 (automated "compliance" overclaim + fake reviews).
