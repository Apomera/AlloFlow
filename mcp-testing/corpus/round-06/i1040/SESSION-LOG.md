# i1040 long-document rebuild — session log

Target: `mcp-testing/corpus/born-digital/irs-i1040-instructions.pdf`
(2025 Instructions for Form 1040, Feb 25 2026 revision, 126 pages, ~133k tokens).
Protocol: `../LONG-DOCUMENT-PROTOCOL.md`. Tranches live in this directory as
`tranche-NN-pages-A-B.json`, each produced by a checked-in `gen_tranche_NN.py`
generator so the authoring is reviewable and re-runnable.

## Sessions

### Session 1 (2026-08-04) — pages 1-5 · tranche-01 · 42 blocks · VALIDATED

Authored: cover (synthesised title, disclosed), two-column TOC (flattened with
parent-context prefixes, disclosed), the page-3 IF/THEN schedule guide rebuilt
as a real table from per-item geometry, TAS/LITC/TAP page, ACA page.
Standalone validation: PASSES full plan validation (tranche 1 carries the h1).
No partial rebuild was delivered.

**Method established for every later session** (all tools in `mcp-testing/tools/`):

1. `node mcp-testing/tools/page_outline.cjs <pdf> <first> <last>` — per-page
   structured lines with font size + bold flags = heading candidates. (Page
   IMAGE rendering is useless for this document: the embedded fonts paint as
   tofu boxes in headless Chromium — `render_pages.cjs` exists but shows
   layout only.)
2. Content-stream per-page text (writing order, survives multi-column) via
   `window.__alloCsPageTexts` — see the session-1 shell snippets in git
   history, or add a flag to `page_text.cjs`.
3. For drawn tables: per-item x/y dump, pair cells by y-band. NEVER pair table
   cells from stream-order text: page 3's guide arrives scrambled.
4. Author a `gen_tranche_NN.py`; wording follows pdf.js item text where the
   byte-level pass loses fi-ligatures ('qualified', not 'qualied').
5. Validate: tranche 1 alone validates fully; later tranches validate only
   through `merge-plans` (they carry no h1 by design). Checkpoint after each
   session: `merge-plans --tranches t01 ... tNN --out /tmp/checkpoint.json`
   and read `pagesWithoutBlocks`.

### Sessions 2+ — REMAINING (suggested boundaries from the printed TOC)

| Tranche | Pages | Content | Notes |
| --- | --- | --- | --- |
| 02 | 6-11 | What's New, Filing Requirements, Charts A/B/C | 3-column prose; charts are drawn tables → geometry method |
| 03 | 12-22 | Name/SSN, Filing Status, Dependents | includes flowchart-like boxes; expect review notes |
| 04 | 23-38 | Income, AGI, Tax and Credits | line-instruction structure: `Line N` headings |
| 05 | 39-60 | Payments (EIC!) | EIC worksheets + tables; heavy geometry work |
| 06 | 61-67 | Refund, Amount You Owe, Sign, Assemble | |
| 07 | 68-80 | 2025 Tax Table | MECHANICAL: generate rows from extract-text with a per-tranche generator; thousands of rows; verify row count against page count |
| 08 | 81-87 | General Info, Tax Help, Refund Info | |
| 09 | 88-110 | Schedule 1 + 1-A instructions | |
| 10 | 111-117 | Schedules 2-3 instructions | |
| 11 | 118-126 | Tax Topics, Disclosure, Outlays, Index | index = long reference list; consider list-per-letter |

After tranche 11: `merge-plans` (expect `pagesWithoutBlocks` ≈ [] plus known
blanks) → `remediate` → recall channels → `verify-init` → independent verifier
(multiple passes; budget for discrepancies) → `verify-check`. Expected recall
shortfall to explain: the hidden per-page print-control lines (see findings).

## Findings for the wider project (surfaced by this document)

1. **Column detector misses i1040's 3-column pages.** `_alloOrderTextItems`
   reported 1 column on page 6 (a dense 3-column What's New page), so the
   connector's extraction interleaves those pages mid-sentence. The
   content-stream pass reads them correctly (writing order). Candidate fix:
   feed the gutter detector the drawn column rules, or lower the min-item
   threshold; needs its own measured round against the corpus.
2. **Hidden print-control text layer.** Every page carries invisible
   production text ('Fileid: ... MUST be removed before printing' + cycle/date)
   — same class as the 1913 print-master's hidden layer. Any recall metric on
   this document must expect that uncovered share; tranche review notes
   disclose the omission once.
3. **fi-ligature divergence between extractors.** The byte-level pass emits
   'qualied'/'le' where pdf.js decodes the ligature ('qualified'/'file').
   Recall comparisons between the two must tolerate it; authored text follows
   pdf.js.
4. Embedded fonts in this PDF do not rasterize in headless Chromium
   (tofu boxes) — structure reading must go through textContent, not images.
