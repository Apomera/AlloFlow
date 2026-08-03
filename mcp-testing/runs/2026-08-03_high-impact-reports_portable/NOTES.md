# Run: High Impact Reports 89-92 + Appendix E — portable (no-key) pathway

**Date:** 2026-08-03
**Pathway:** `agent_skills/alloflow-portable-remediation` (host model reads the pages; no Gemini)
**Source:** `C:/Users/cabba/OneDrive/Documents/High Impact Reports 89-92 App E.pdf`
**Source sha256:** `1d2a41fa13171c03de146cd609c1b280ebf4babffdcde31ea5248e4455e25473` (binding matched)

## Why this pathway and not the connector

The connector's Gemini-backed tools are dead on this machine. `pdf_audit` fails in ~10 s with
`API_AUTH_FAILED` on every Vision call, and `pdf_remediate` then refuses to start with
`BaselineAuditRequiredError` — correctly, since it has no baseline audit to work from. The key in
`desktop/web-app/.env.maintainer-demo` is the one Google disabled as leaked in the June Prismflow
incident; `README_REMEDIATION.md` already flags it.

Everything else about the connector is healthy: 28 tools registered, and `remediation_selftest`
passes all 11 checks (85 → 96) using its scripted loopback model.

## The document

A **fully scanned** PDF: 8 page images, **zero embedded fonts**, no text layer. `extract_document_text`
returns 0 characters. The keyed pipeline would have needed Vision OCR for this; on this pathway
the host model read the page images directly.

## Result

```
verdict:            pdf_generated_with_known_issues
sourceBinding:      matched (sha256)
blocks:             68 · 20,325 chars · 27 headings · 1 table · 0 unresolved images
semanticHtml:       completed
staticHtmlAudit:    ok — 0 errors, 0 warnings
taggedPdfGeneration:completed — structTreeRoot, markInfo, lang, title all present
blockedNetworkRequests: 0
pdfUaCompliant:     false
complianceClaim:    false
humanReviewRequired:true
```

### veraPDF PDF/UA-1 failures — both are renderer defects, not plan defects

| Clause | Test | Failed checks | Rule |
| --- | --- | --- | --- |
| 7.1 | 8 | 1 | Catalog must contain an XMP `/Metadata` stream |
| 7.1 | 3 | 11 | Content must be marked as Artifact or tagged as real content |

`scripts/render_tagged_pdf.cjs` sets only `printBackground: true` and never writes an XMP metadata
stream, which fully explains test 8. The 11 untagged-content failures in test 3 are not yet traced.

Neither failure is caused by the repair plan: the static HTML audit is clean and the PDF carries a
complete structure tree. Fixing the renderer would fix both for every document, not just this one.

## Fidelity notes carried in the report

13 authored by the model plus 2 added by the tool. The ones that matter for review: every word
came from the model reading page scans and needs human verification; the two sidebar boxes were
moved out of the body flow to the end of their sections to get one linear reading order; and
`source_pages` was deliberately left empty, because filling it from the same transcription would
make the plan-internal completeness check grade itself (hence `plan_internal_token_recall: null`).

---

# UPDATE 2026-08-03 (evening): rigor layer landed — see v3-verified/

The gap named in the parity analysis — "the generator grades itself" — is closed. Three
additions, all exercised on this document (artifacts in `v3-verified/`):

- **Independent verification (two-model rule).** `verify-init` derives a 51-item worksheet
  from the plan (one attestation per source page, heading, table, list, plus 4 global
  items); a fresh-context subagent that never saw the repair plan read all 8 source scans
  and the rebuilt HTML and attested every item; `verify-check` enforced bindings (3×sha256),
  completeness, and the isolation attestation, then stamped `result: verified`. Negative
  paths verified: unfilled item, deleted item, non-isolated verifier, and too-short
  discrepancy note all refuse with exit 3; a real discrepancy exits 9.
- **Deterministic source recall.** Stdlib-only PDF text extraction (literal strings +
  ToUnicode CMaps, per-page font resolution). On born-digital sources `remediate` now
  measures how much of the source's own text layer the plan carries, without trusting the
  plan author. On this scanned source it honestly reports `not_measurable`.
- **Output recall.** The tagged PDF's extractable text is checked against the plan on every
  run: **recall 1.0** here — the shipped PDF provably carries every plan token. A recall
  below 0.98 becomes a manual-review warning.

Verdict unchanged (`pdf_generated_validation_passed_review_required`, veraPDF PASS), now
with `checks.sourceTextRecall`, `checks.outputTextRecall`, and the external
verification-report.json. Test suites: 4 files, 22 tests, all green
(`tests/portable_verification.test.js` is new).

---

# UPDATE 2026-08-03 (later the same day): parity work landed — see v2-after-finalizer/

Engine 0.2.0. Everything below this line describes 0.1.0 and is kept as the before-state.
What changed:

- **Both veraPDF failures are FIXED.** `render_tagged_pdf.cjs` now finalizes Chromium's
  output with an incremental update: the untagged background fill on every page is wrapped
  in `/Artifact BMC...EMC` (11 streams on this document) and an XMP metadata stream with
  `dc:title` is appended. `v2-after-finalizer/` holds the artifacts:
  **veraPDF PDF/UA-1 = PASS, 0 failed rules**, verdict
  `pdf_generated_validation_passed_review_required`.
- **Honest identifier policy:** the file claims PDF/UA-1 (`pdfuaid:part`) only when local
  validation passes in full; on failure it is rebuilt with the identifier withheld and the
  report says so (`pdfUaValidation.identifierWithheld`) — the same withholding convention
  as the main pipeline.
- **New stdlib-only commands** in `alloflow_portable.py` (0.2.0): `audit-source`
  (deterministic before-facts + severity issue flags; correctly diagnosed this scan),
  `extract-images` (pulled all 8 page scans as intact JPEGs; closes the figure-loss gap),
  `extract-office` (.docx/.pptx text for plan authoring), `batch-remediate` (manifest of
  up to 60 pairs, per-file scoreboard, exit 8 on any failure). `remediate` now accepts
  .docx/.pptx sources; size cap raised 30 MiB → 200 MB (connector parity).
- **Plan variants:** `document.variant: translated|simplified` in the schema for
  translation/plain-language copies delivered alongside the faithful rebuild.
- **Harness portability:** JSON output is now UTF-8 regardless of console codepage (a real
  cp1252 crash on emoji), and `HARNESSES.md` documents ChatGPT/Codex/manual usage. The
  distribution builder already ships the skill as an OpenAI (Codex) plugin, a Claude Code
  plugin, and a clean-install ZIP; manifests bumped to 0.2.0 and the contract test now
  derives the version from the engine instead of pinning it.
- **Tests:** all 3 portable suites pass (16 tests). One test had asserted the old
  strict-mode failure that only existed because of the renderer defects; it now uses
  `ALLOFLOW_PORTABLE_DISABLE_UA_FINALIZE=1` to test that contract deterministically, and a
  new companion test asserts strict mode passes with the finalizer on.

Still not at parity with the keyed pipeline (unchanged): no semantic audit or score, no
iterative fix passes, no transcripts/translation/simplification/redaction/contrast-repair
by script (the host model does those in the plan), no resource packs, no preview. The
parity table below is the 0.1.0 state; rerun `capabilities --json` for current truth.

---

# Parity (as of 0.1.0): portable pathway vs the real pipeline

**It is not at parity, and it is not trying to be.** Capability areas below are the ones
`dev-tools/mcp_capability_inventory.cjs` measures for the connector.

| Capability | Pipeline / MCP | Portable |
| --- | --- | --- |
| Audit a document (score + severity issues) | yes | **no** — only a static audit of the HTML it just built (element counts); no before-score, no issue list |
| Remediate to accessible HTML | yes | yes — but the semantics come from the host model's transcription, not the pipeline |
| Tagged PDF export | yes | yes (Chromium) |
| Conformance reports | yes | partial — veraPDF PDF/UA-1 + a JSON report; no WCAG report |
| Image alt text / classification | yes | partial — model authors alt text; **cannot extract images from the source** |
| Batch a folder | yes | **no** |
| Office input (.docx/.pptx) | yes | **no** — PDF only, enforced by a `%PDF-` signature check |
| XLSX / spreadsheet input | yes | **no** |
| Audio / video transcripts | yes | **no** |
| Translate the output | yes | **no** |
| Plain-language simplification | yes | **no** |
| PII redaction | yes | **no** |
| Fillable form fields | yes | **no** — forms are deliberately blocked from rebuild |
| Contrast repair | yes | **no** |
| Resource / pack HTML | yes | **no** |
| Preview + expert commands | **no** | **no** (the connector's one known gap) |

Structural differences beyond the feature list:

- **Size cap** 30 MiB, vs 200 MB on the connector.
- **No iterative improvement.** One shot: plan → render. No fix passes, no target score, no
  auto-continue loop, no scoring at all — so "did this help?" has no number attached.
- **No OCR stage.** The host model reads the pixels. On this scanned document that was an
  advantage; it also means transcription quality is not measured by anything.
- **Fidelity notes are authored, not derived.** The pipeline computes its disclosures. Here they
  are only as complete as the model's honesty, which is why the human-review gate is unconditional.

## Where it genuinely wins

- **No egress whatsoever** — `blockedNetworkRequests: 0`, no key, no account, no Worker. For
  student-identifiable material that is a categorical advantage, not a convenience.
- **It works when the key is dead**, which is the situation this repo is actually in.
- **Handles scans** without an OCR budget.

## Enhancement backlog, in priority order

1. **Write an XMP metadata stream** in `render_tagged_pdf.cjs`. One deterministic rule, fixes
   clause 7.1 test 8 for every document. Cheapest real win available.
2. **Trace the 11 untagged-content failures** (clause 7.1 test 3) and mark or tag whatever
   Chromium is emitting bare.
3. **Extract source images.** Today an illustrated document silently loses its figures unless a
   human extracts them to files beside the plan first — and `unresolved_images: 0` looks like a
   pass when no image blocks were emitted at all. This is the largest content-fidelity gap.
4. **Accept .docx/.pptx**, matching the connector's input set.
5. **Emit a before-score**, so the value of a run is quantified rather than asserted.
