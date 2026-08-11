# Portable run — ed-parent-guide-idea.pdf (2026-08-10 → 08-11, two rounds)

Full agentic-skills pathway run, requested by Aaron as an effectiveness-evidence
run. Source: `mcp-testing/corpus/born-digital/ed-parent-guide-idea.pdf` — the
OSEP "Dear Colleague" letter (June 14, 2016) on IEP translation for LEP
parents. 2 pages, born-digital, already tagged. sha256 `31910c54…0753a5`.

This run drove engine **0.2.5 → 0.2.6**: round 1's verification discrepancies
were all engine gaps; the gaps were fixed, and round 2 verified clean.

## Before / after scoring (veraPDF PDF/UA-1, deterministic recall)

| Measure | BEFORE (source.pdf) | AFTER (v2 rebuild) |
| --- | --- | --- |
| veraPDF PDF/UA-1 | **FAIL — 5 rules, 18 checks** | **PASS — 0 failed rules** |
| 7.21.4.1 fonts embedded | fail ×2 | pass |
| 7.18.1 annots in tag tree | fail ×7 | pass |
| 7.18.5 link /Contents alt | fail ×7 | pass |
| 7.9 Note tag ID | fail ×1 | pass |
| 5(1) PDF/UA identifier | absent | claimed (earned: local pass) |
| sourceTextRecall | — (reference) | **1.0** (863/863 tokens) |
| outputTextRecall | — | **1.0** |
| Internal footnote links | 3 GoTo annots | 3 working `#note-N` anchors |
| URI links | 4 (2 mailto, http lep.gov, https justice.gov) | 4, schemes preserved |
| Independent verification | — | v1: 11/5/0 → **v2: 19/19/0, `verified`** |

BEFORE evidence: `before-verapdf.json` (validate-pdf on the untouched source).
Note the source was already TAGGED with language+title — this letter is the
*easy* end of the corpus, and it still failed UA-1 on 5 rules.

## Round 1 (engine 0.2.5) — what the two-model rule caught

Fresh-context verifier: 11 verified / 5 discrepancy / 0 unreadable (exit 9),
all text/emphasis/alt/links verified; every discrepancy traced to two ENGINE
gaps, not the plan: (1) `review_notes` rendered only into the report JSON —
invisible in the deliverable, so every honest disclosure graded as
undisclosed; (2) no addressable block ids, so the source's 3 GoTo footnote
links could not be carried (and nothing warned about the flattening).
Artifacts: `worksheet.json`, `verification-report.json` (kept as the round-1
record), v1 outputs in the top-level files.

## Engine 0.2.6 (shipped this session) — E1–E5

- **E1** `review_notes` now render into the accessible HTML (and tagged PDF)
  as a page-broken, clearly-marked "Remediation notes" appendix.
- **E2** Optional block `id` (validated: unique, `[a-z][a-z0-9-]*`, reserved
  names refused) + runs may carry `#id` hrefs; dangling `#target` is a
  validation ERROR. Renderer emits the ids.
- **E3** New `extract-annotations` command — per-page URI + internal GoTo
  links, deterministic. ★Annots arrays are often INDIRECT objects inside
  ObjStm containers; resolve via the object index, not raw-byte scan (first
  cut returned zero on this very file).
- **E4** New `extract-text --ordered` — best-effort reading order. TWO traps
  fixed en route: Td/TD operands are in SCALED text space (must go through
  the Tm matrix — adding them raw split words across line bins), and a page's
  `/Contents` array is ONE logical stream (this letter splits each page into
  8 streams; per-stream parsing dropped a whole line and cross-boundary font
  bindings — the ordered channel now concatenates per spec and recovers text
  the recall channel misses: 910 vs 863 tokens on this doc).
- **E5** remediate now cross-checks plan links against source annotations
  (warning-only): flags flattened internal navigation and scheme mismatches.
  Differentially proven: both warnings fire on the round-1 plan, neither on
  the round-2 plan.
- Version-drift: engine VERSION + both plugin manifests → 0.2.6; packages
  rebuilt (`dev-tools/build_alloflow_portable_packages.cjs`).

## Round 2 (engine 0.2.6)

Plan upgraded: footnote markers became `#note-1/2/3` linked runs (matching the
source's GoTo annotations), lep.gov href reverted to the annotation's actual
`http://`, notes paragraphs carry ids, disclosures updated. Rebuild: UA-1
**PASS first run**, recall 1.0/1.0, zero E5 warnings, notes appendix + anchors
verified in the HTML. Fresh-context verifier (second independent agent):
**19/19 verified, 0 discrepancies** — including confirming the h1/Notes
synthesis is now disclosed IN the deliverable and the http/https scheme split
matches the source exactly.

v2 artifacts: `repair-plan.json` (v2), `worksheet-v2.json`,
`verification-report-v2.json`, `alloflow-output-v2 copies (source-accessible.html,
source-alloflow-accessible.pdf, source-accessibility-report.json,
source-privacy-receipt.json)`.

## Deliberately NOT changed

The recall-bearing extractor (`_pdf_extract_text`) is byte-identical — the
ordered channel is additive, so no corpus scoreboard moved. Two follow-ups
noted for a future corpus round: (a) adopt /Contents concatenation in the
recall channel too (it drops a real line on this doc — its 1.0 was measured
against its own reference), re-baselining the corpus after; (b) WinAnsi
0x80–0x9F fallback decode (curly quotes currently pass through as C1 control
chars in both channels).
