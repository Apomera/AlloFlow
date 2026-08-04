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
6. Per-tranche recall check (added session 2, worth keeping): tokenise the
   source pages and the authored blocks with the SAME normalisation — close
   `-\s*` on both sides, or justified line-break hyphens read as misses — and
   list the shortfall. Session 2 scored 0.9982 with every missing token
   explained (two printed page numbers, one of which sits *inside* a
   hyphen-split word at the column break). It catches a dropped sentence in
   the session that wrote it, instead of at the final merge.

### Session 2 (2026-08-04) — pages 6-7 · tranche-02 · 44 blocks · VALIDATED (merged)

The complete "What's New" section. Authored only after the round-7 column fix
landed: before it, these two pages interleaved their three columns
mid-sentence and could not be read in order at all.

Decisions, all disclosed in the tranche's 9 review notes: the 19 bold run-in
item leads promoted to level-3 headings (trailing period dropped) so the
section is navigable; justified line-break hyphens closed while genuine
compounds are kept; the four link URLs taken from the PDF's own Link
annotations rather than the visible text (each wraps across two lines, so
pdf.js reports two rects per logical link); the full-width banner authored as
the section's first paragraph; italic cross-references marked emphasis and
bold-italic bullet leads marked strong; the "Enhanced deduction for seniors"
bullet spans the 6→7 break and is authored whole at page 6.

`merge-plans t01+t02` → 86 blocks, `ok: true`. Recall 0.9982 (see step 6).

### Session 3 (2026-08-04) — pages 8-11 · tranche-03 · 62 blocks · VALIDATED (merged)

"Filing Requirements" plus Charts A, B, and C. `merge-plans t01+t02+t03` →
148 blocks, `ok: true`, pages 1-11 fully covered. Recall 0.9887 against a
content-stream baseline with the print-control layer stripped, and **every**
remaining shortfall is furniture that was deliberately dropped: the
"Page N of 126" markers and the page-11 standing footer. Nothing was lost.

Three structures appeared here for the first time, and the handling is worth
reusing:

* **Icon callouts.** TIP and CAUTION are margin icons, but their LABEL is
  real text in the content stream, so it lands mid-sentence in any extraction
  ("Even if you do not otherwise TIP have to file a return"). Each callout is
  a paragraph opening with a strong `Tip.`/`Caution.` and the sentence
  restored around it — the icon alone conveys nothing to a screen reader.
  Set in sentence case, not the printed all-caps, so it isn't spelled out.
* **Merged-cell table.** Chart A spans one filing status across two or three
  age rows. Flattened to ten rows with the status repeated; cell values kept
  exactly as printed, including continuation amounts that omit the dollar
  sign ("17,750" under "$15,750"). Its caption is the one place in the
  tranche where wording is ADDED — the printed title says nothing about what
  the table holds — and that is disclosed in the tranche's notes.
* **One-level nesting in a flat list schema.** Chart C keeps its printed
  "a."–"f." markers verbatim inside item 1, so its enumeration is unchanged.
  Chart B joins the two "larger of—" options into the parent sentence,
  lowercasing the second option's leading capital where it now sits
  mid-sentence.

**New engine finding — mixed-layout pages defeat the column detector.**
Page 9 sets three columns of prose ABOVE a full-width chart. The chart's
full-width rows fill the gutters the detector looks for, so it reports one
column and the prose interleaves ("still unable to file your return by the
end press Worldwide, DHL Express Enve- to IRS.gov/PDS"). Worse for tooling:
the interleave glues hyphen halves across columns (`enveto`, `overcaution`,
`mailform`), so a naive recall check reads those as authoring misses. That
section's reading order was rebuilt from the page image. A fix needs vertical
segmentation (split the page into y-bands, then detect columns per band)
before the gutter search runs — its own measured round, not a patch.
Meanwhile: for any page whose layout changes down the page, author from the
render, and use the content-stream text as the recall baseline.

### Sessions 4+ — REMAINING (suggested boundaries from the printed TOC)

| Tranche | Pages | Content | Notes |
| --- | --- | --- | --- |
| 04 | 12-22 | Name/SSN, Filing Status, Dependents | includes flowchart-like boxes; expect review notes |
| 05 | 23-38 | Income, AGI, Tax and Credits | line-instruction structure: `Line N` headings |
| 06 | 39-60 | Payments (EIC!) | EIC worksheets + tables; heavy geometry work |
| 07 | 61-67 | Refund, Amount You Owe, Sign, Assemble | |
| 08 | 68-80 | 2025 Tax Table | MECHANICAL: generate rows from extract-text with a per-tranche generator; thousands of rows; verify row count against page count |
| 09 | 81-87 | General Info, Tax Help, Refund Info | |
| 10 | 88-110 | Schedule 1 + 1-A instructions | |
| 11 | 111-117 | Schedules 2-3 instructions | |
| 12 | 118-126 | Tax Topics, Disclosure, Outlays, Index | index = long reference list; consider list-per-letter |

After the last tranche: `merge-plans` (expect `pagesWithoutBlocks` ≈ [] plus known
blanks) → `remediate` → recall channels → `verify-init` → independent verifier
(multiple passes; budget for discrepancies) → `verify-check`. Expected recall
shortfall to explain: the hidden per-page print-control lines (see findings).

## Findings for the wider project (surfaced by this document)

1. **Column detector misses i1040's 3-column pages — FIXED (round 7,
   2026-08-04).** The gutter search found the columns all along; the aligned-
   rows table veto killed the split, because justified prose columns share a
   baseline grid. The fix overrides the veto only when both sides READ as
   prose columns (median line fill ≥0.8, ≤2.5 items and ≥18 chars per line —
   the chars gate protects HB44's device-code table column). Measured across
   the corpus: 15 pages changed (13 i1040, 2 NSF brief), referee bigram
   agreement vs CS writing order improved on ALL 15 (typ. 0.80 → 0.99),
   0 regressions.
2. **Hidden print-control text layer.** Every page carries invisible
   production text ('Fileid: ... MUST be removed before printing' + cycle/date)
   — same class as the 1913 print-master's hidden layer. Any recall metric on
   this document must expect that uncovered share; tranche review notes
   disclose the omission once. (Document property, not a bug.)
3. **fi-ligature loss — FIXED (round 7).** Root cause was not the ligature
   itself: the subset fonts park fi at code 0x1F with no ToUnicode entry,
   named /f_i (AGL underscore rule) in /Encoding /Differences — or only inside
   the CFF program. Both extractors (Python portable + JS CS oracle) now
   layer ToUnicode → Differences glyph names → CFF built-in encoding, and
   expand U+FB00-06 presentation forms. The two ports agree byte-for-byte on
   this document (649,183 chars, 0 control chars).
4. **Tofu renders — FIXED (round 7).** Chromium's OpenType Sanitizer rejects
   these subsets ('cmap: Non zero cmap subtable segment padding'); the
   vendored pdf.js 3.11.174 cannot repair them. render_pages.cjs now prefers
   modern pdfjs-dist (`npm i pdfjs-dist --no-save`, does not persist) which
   rebuilds the cmap — i1040 pages render fully readable — and falls back to
   the vendored build (layout only) with a stderr hint.
