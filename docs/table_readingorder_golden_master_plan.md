# Plan: Table & Reading-Order Quality — Golden-Master Benchmark + Inline TEDS Audit

> **Plan snapshot note (2026-07-09):** This June 2026 benchmark plan predates the current table/reading-order fixture work. Verify `tests/fixtures/table_ro/`, current PDF pipeline tests, and any committed baselines before treating "no code written" or "no test" below as current.

**Status:** Proposed (plan only — no code written)
**Author:** Claude (2026-06-14)
**For:** The agent working on the remediation pipeline
**Scope:** (1) An **offline golden-master benchmark** that proves AlloFlow beats Adobe on complex tables + multi-column reading order and catches regressions. (2) A clarified design for an **inline recursive TEDS audit** inside the accept-or-revert loop (answering "can we use OmniDocBench as a recursive audit loop?").

---

## ⚠️ Coordination note

This is a **plan, not a patch** — no diffs, so it won't collide with in-flight pipeline edits. Multiple Claude sessions share one tree: check `git status`/`log`/`origin` before any commit; stage only your own files by path; follow the existing build/verify discipline (edit `*_source.jsx` → rebuild module → sync `desktop/web-app` mirror → `node --check` → run golden masters → `verify_all`). The benchmark below is **additive test/eval code** (new files under `tests/` and/or `dev-tools/`); it should not change remediation behavior. The inline-audit section (Part B) *does* touch the pipeline — treat it as a separate, later change and coordinate before implementing.

---

## Background

Adobe Auto-Tag is **geometry-heuristic**: it rejects complex/borderless tables (`BAD_PDF_COMPLEX_TABLE`) and mis-orders multi-column reading order. AlloFlow uses **Gemini Vision**, which on the CVPR-2025 OmniDocBench v1.5 benchmark already scores top-tier (Gemini ~87.7 Table TEDS / ~0.08 reading-order edit-distance vs GPT-4o 67 / 0.15, and far above geometry heuristics). So AlloFlow is already on the winning side — but today there is **no test that measures table/reading-order quality**, so we can neither *prove* the advantage nor *prevent regressions* when prompts change.

Two metrics from that literature:
- **TEDS** (Tree-Edit-Distance-based Similarity, 0–1): compares two HTML table trees including cell content. **TEDS-Struct** ignores cell text (structure only). Reference impl: PubTabNet/IBM `teds` (Python, `apted` + `lxml`); JS ports of `apted` exist.
- **Reading-order normalized edit distance** (0–1, lower better): edit distance between the produced block order and the reference order.

---

## Part A — Offline Golden-Master Benchmark (do this first; zero pipeline-behavior change)

**Goal:** a reproducible score for table structure (TEDS) and reading order (edit distance) on a fixed corpus *with ground truth*, asserted against a committed baseline so prompt/model changes can't silently regress — and optionally reported next to an Adobe baseline to substantiate "we beat Adobe."

**Corpus (two sources, both have ground truth):**
1. **A subset of OmniDocBench v1.5** — real PDF pages with block-level table-HTML + reading-order annotations. Pick the **borderless/merged-table** and **multi-column** subsets specifically (that's where Adobe fails). ⚠️ **Verify the license before committing any pages into the repo** (OmniDocBench is opendatalab; source PDFs may carry their own licenses). If redistribution is unclear, ship a small **fetch/prepare script** (`dev-tools/eval/prepare_omnidocbench.cjs`) that downloads + caches locally instead of vendoring the PDFs.
2. **AlloFlow's own real remediation-failure PDFs** — a handful of documents that have actually broken in the wild (the USM catalog is a good anchor). Annotate the correct table HTML + reading order **once**; that becomes your *true* regression set (OmniDocBench is now considered "saturated," so your own failures matter more over time).

**Harness (follow the existing golden-master convention):**
- The repo already uses vitest golden masters (`tests/*_golden.test.js`, re-baseline with `vitest -u`) wired into `verify_all`. Add `tests/table_readingorder_golden.test.js` in that style.
- For each corpus doc: run AlloFlow's table-extraction + reading-order on the page → produce HTML table(s) + ordered block list → compute **TEDS** (and **TEDS-Struct**) vs ground-truth table HTML, and **reading-order edit distance** vs ground-truth order.
- TEDS is heavier than the existing snapshot tests; run it in **Node** (a small `apted`-based JS module) or invoke a tiny **Python** `teds` script as a child process from the test. Cache per-doc results.
- **Assertions:** each doc's TEDS / RO score must be **≥ a committed baseline** (the golden master) within a tolerance; fail on regression. Store baselines in a committed JSON (`tests/fixtures/table_ro_baselines.json`).
- **Optional "beat-Adobe" panel (run once, not in CI):** run Adobe Auto-Tag (API) on the same corpus, record its TEDS/RO, and emit a comparison report. This is the defensible, reproducible number for the Greg study / funders — *Adobe will literally score 0 / error on the `BAD_PDF_COMPLEX_TABLE` cases*, which is the headline.

**Wiring:** add as **informational** in `verify_all` first (report, don't block), like the other new gates; promote to blocking only once the baseline is stable and the corpus is trusted.

**Deliverables:** `tests/table_readingorder_golden.test.js`, `tests/fixtures/table_ro_baselines.json`, optional `dev-tools/eval/` prepare + Adobe-compare scripts, and a short README documenting how to re-baseline and how to read the scores.

---

## Part B — Inline Recursive TEDS Audit (the "recursive audit loop" idea, done correctly)

**The key clarification:** you **cannot** use OmniDocBench *the dataset* inline (a real user doc has no ground truth). But you **can** use the **TEDS metric** inside the accept-or-revert loop, compared against a **self-derived reference**. And you must split two questions that naive TEDS conflates:

> **Preservation** ("did remediation keep the table's content/topology?") and **Improvement** ("did remediation make it accessible?") are *different* checks. Raw TEDS-vs-original measures neither cleanly — and would *penalize* legitimate accessibility edits (promoting `<th>`, adding `scope`/`<caption>` intentionally lowers similarity to the raw original). **Do not gate on raw TEDS-vs-original.**

**Correct design:**

1. **Preservation gate (deterministic-first, cheap):** before/after remediation, compare the **original extracted grid** to the **remediated grid** on a **role-normalized** basis — strip `th`-vs-`td` role, `scope`, and `caption` so you compare only **cells, text, and spans**. Use TEDS-Struct (or a simple deterministic check: same cell count after span-expansion, same set of cell texts, row lengths reconcile). **High preservation = content intact → safe to accept; low = content scrambled/lost → revert or re-ask.** This is mostly deterministic JS (no extra AI cost) and fits "AI-diagnoses + code-executes."

2. **Improvement check (separate, deterministic):** confirm the remediation actually *added* accessibility — headers are now `<th>`, `scope` is set, header↔cell (`headers`/`id`) associations resolve, a `<caption>` exists where appropriate, and **axe-core's table rules pass**. This is the "did we help" half, and it's exactly the kind of check axe already supports.

3. **Optional high-assurance agreement check (AI, gated):** for high-stakes docs or when (1) is inconclusive, re-render the remediated table to an image (or reuse the original crop), run a **second independent Gemini extraction**, and TEDS the two structural extractions. High agreement = confident; low = flag for human review. **Gate this** — it doubles the Gemini call for that table, which matters on a free/quota budget — so use it only on the residue, not every table.

**Net loop:** existing accept-or-revert → add (1) as a cheap preservation gate, (2) as the improvement assertion, and (3) as an optional escalation. Revert/flag on preservation failure; accept only when preserved **and** improved.

---

## Guardrails

- **TEDS ≠ accessibility.** It scores structural similarity, not screen-reader usability. Treat it as a *preservation/agreement* signal, paired with the deterministic accessibility checks above and (ultimately) PAC/veraPDF + real screen-reader testing. Don't report a TEDS number as an "accessibility score."
- **No overclaiming.** The benchmark substantiates "we beat Adobe's geometry approach on tables/reading-order" — a *measured* claim. It does **not** prove WCAG/PDF-UA conformance (that's the veraPDF plan). Keep the two separate; cf. FTC v. accessiBe.
- **Honest residue.** Even SOTA VLMs find complex multi-column the hardest case (edit distance up to ~0.9 on the worst layouts). Keep human-review routing for low-confidence tables/order; the benchmark should *report* the hard-case scores, not hide them.
- **Cost.** Part A runs offline (no shipped cost). Part B's deterministic checks are free; gate the AI agreement check.
- **Licensing.** Confirm OmniDocBench + source-PDF licenses before committing any third-party pages; prefer a fetch script over vendoring.

---

## Acceptance

1. `tests/table_readingorder_golden.test.js` computes TEDS + TEDS-Struct + reading-order edit distance on the corpus and asserts against committed baselines; re-baseline via `vitest -u`.
2. The borderless/merged + multi-column subsets are represented (the Adobe-failure cases).
3. Optional Adobe-comparison report generated once and saved (the "beat-Adobe" evidence).
4. (Part B, later) Preservation gate + improvement check wired into the table path of the accept-or-revert loop, with the AI agreement check gated; no regression to existing golden masters; `node --check` clean.
5. Nothing is labeled "compliant"/"accessibility score" on the basis of TEDS alone.

---

## References
- OmniDocBench v1.5 (CVPR 2025) — opendatalab; live results at idp-leaderboard.org/benchmarks/omnidocbench
- TEDS — PubTabNet / IBM `teds` (apted + lxml); TEDS-Struct (structure-only variant)
- olmOCR document anchoring (arXiv 2502.18443) — coordinate hints for reading order (see the separate Beat-Adobe-on-3 notes)
- Existing AlloFlow golden-master pattern: `tests/*_golden.test.js` + `verify_all`
