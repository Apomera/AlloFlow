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

### Session 4 (2026-08-04) — pages 12-16 · tranche-04 · 127 blocks · VALIDATED (merged)

The start of "Line Instructions for Forms 1040 and 1040-SR": Name and Address,
Social Security Number, Filing Status (all five statuses), Digital Assets, and
the Dependents lead-in. `merge-plans t01..t04` → 275 blocks, `ok: true`,
pages 1-16 covered. Recall 0.9856, every shortfall furniture: the "Page N of
126" markers, the standing footer on all five pages, and `employ12`/`ment` —
"employment" split across the 12→13 break with the page number between the
halves, the same artifact tranche 2 saw.

**Scope narrowed from the planned 12-22.** Pages 12-16 are prose; pages 17+
are the qualifying-child decision charts, a different structure that earns its
own session. 16/17 is a clean semantic boundary.

Two things worth carrying forward:

* **Five heading levels, from the printed type sizes.** 23pt → level 2
  (the section), 16pt → level 3 (Name and Address, SSN, Filing Status,
  Digital Assets, Dependents), the subsection heads → level 4 (Single,
  Head of Household, …), and bold run-in topics → level 5 (Test 1,
  Joint and several tax liability, Adopted child, …). Level 1 stays the
  document title in tranche 1. Final counts: 1 h2, 7 h3, 15 h4, 15 h5.
* **Inline-markup helper.** This tranche has ~40 italic cross-references
  ("see Who Qualifies as Your Dependent, later"). Hand-building that many run
  arrays is error-prone, so the generator writes text with markers —
  `«…»` emphasis, `‹…›` strong, `[[text|url]]` link — and a
  `rich()` function expands them, asserting the runs concatenate back to the
  plain text. Reuse it for later tranches; the output was checked for marker
  leakage.

Cross-references are deliberately NOT turned into links: the source has no
link annotations for them and their destinations live in later tranches, so
anchors invented now would risk pointing at nothing. Revisit after the merge.

**Page 12 hit the same mixed-layout trap as page 9** (full-width title block
above three columns → detector says one column → the title interleaves into
the body). Reading order rebuilt from the render. That is now two of sixteen
pages; the vertical-segmentation fix is looking more worthwhile.

### Session 5 (2026-08-04) — pages 17-19 · tranche-05 · 50 blocks · VALIDATED (merged)

"Who Qualifies as Your Dependent" — the document's first DECISION FLOWCHART,
all five steps. `merge-plans t01..t05` → 325 blocks, `ok: true`, pages 1-19
covered. Recall 0.9812, all shortfall furniture (page markers + the standing
footer on three pages).

**The flowchart shape to reuse for every later chart:**

* Each step is a level-4 heading carrying its printed step badge —
  "Step 1. Do You Have a Qualifying Child?" — so the reader always knows
  where they are.
* Each numbered question keeps its printed number as a paragraph, followed by
  a two-item list holding the Yes and No branches with strong labels. That
  preserves the pairing a sighted reader gets from the two-column layout
  without inventing a table the source doesn't have, and keeps branch text
  verbatim.
* The AND/OR criteria stacks are connector-joined boxes. The connectives are
  real text, so each criterion is a list item keeping its leading `AND`/`or`
  and the logic survives linearisation.
* `STOP` is kept (it is that branch's whole meaning); checkbox glyphs and
  connector arrows are dropped as decoration.

**One branch is deliberately bare.** Step 4 question 1's No branch is the STOP
badge ALONE in the source — no sentence, unlike every other STOP in the chart.
It is authored as "STOP." with nothing added. Filling that gap would mean
writing tax guidance the IRS did not publish.

Scope stops at the flowchart: pages 20-22 are "Definitions and Special Rules",
a two-column glossary that is a separate job. Step 5 question 3 begins on
page 19 and its branches print atop page 20; it is authored whole at page 19,
so **tranche 6 starts at "Definitions and Special Rules" and must not
re-author it**.

**FIXED in round 8 (2026-08-04).** Both this and the mixed-layout finding
above were fixed together; see the round-8 notes at the end of this file. The
description below is kept as the diagnosis.

**New engine finding — repeated Form XObjects are extracted once per page,
not once per draw.** Chasing an odd recall result (the plan had 8 more
`STOP` tokens than the source baseline) turned up a real bug: the STOP badge
is ONE Form XObject stamped four times on page 18 via `Do`, and the
content-stream extractor walks the page's `/XObject` resource dictionary —
visiting each XObject once — instead of following the `Do` operators in
stream order. So every repeated stamp is counted once: 2 `STOP`s recovered
across pages 17-19 where pdf.js correctly reads 9. Same for the `AND`
connectors. Two consequences: (1) the CS recall baseline under-counts
repeated stamped content, so "extra" tokens in a recall check are not
automatically authoring additions — check for stamps first; (2) following
`Do` in stream order would also fix XObject text ORDER, which today is
appended after the page text rather than interleaved. Needs its own measured
round against the corpus, like the round-7 fixes.

### Sessions 6+ — REMAINING (suggested boundaries from the printed TOC)

| Tranche | Pages | Content | Notes |
| --- | --- | --- | --- |
| 06 | 20-22 | Definitions and Special Rules | two-column glossary; extracts INTERLEAVED (author from renders); starts at the "Definitions and Special Rules" heading — Step 5 q3 is already in tranche 5 |
| 07 | 23-38 | Income, AGI, Tax and Credits | line-instruction structure: `Line N` headings |
| 07 | 39-60 | Payments (EIC!) | EIC worksheets + tables; heavy geometry work |
| 08 | 61-67 | Refund, Amount You Owe, Sign, Assemble | |
| 09 | 68-80 | 2025 Tax Table | MECHANICAL: generate rows from extract-text with a per-tranche generator; thousands of rows; verify row count against page count |
| 10 | 81-87 | General Info, Tax Help, Refund Info | |
| 11 | 88-110 | Schedule 1 + 1-A instructions | |
| 12 | 111-117 | Schedules 2-3 instructions | |
| 13 | 118-126 | Tax Topics, Disclosure, Outlays, Index | index = long reference list; consider list-per-letter |

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

## Round 8 (2026-08-04) — both queued engine findings fixed

Measured like round 7: change the engine, sweep the whole corpus, and let the
content-stream text referee the reading order (token-bigram agreement; the CS
pass is ordering-independent of the text layer).

### 1. Column detection — two independent causes

**Cause A: the minimum gutter was wider than a real gutter.** The search used
96 fixed bins, so a letter page got 5.5pt bins and a 3-bin minimum of 16.5pt,
while a normal two-column gutter is 10pt. The i1040 definition pages carry a
*completely empty* 10pt channel at x=302 that could never be detected. Bins
are now ~2pt and the minimum gutter is stated in POINTS (8pt).

**Cause B: layouts that change down the page.** Columns above a full-width
chart (p9), or a full-width title block above columns (p12), fill the gutters
and defeat the whole-page search. A horizontal band cut now runs whenever the
vertical search is *rejected* — not only when no gutter is found, since such
pages often present a gutter that the balance or table gate then vetoes.

Two guards, both added because the corpus said so:

* the band cut keeps the widest gap that leaves two *substantial* regions —
  the widest blank strip on a page is usually the one above the footer, which
  would peel off a one-item band;
* a band cut is kept only if some band then finds real columns. Without this,
  ordinary single-column pages were sliced into stacked bands: the first
  measurement was 433 pages changed with 9 regressions. With it, **131 pages
  changed: 108 better, 0 worse, 3 unchanged**.

Column order is now decided at each split (right side first for RTL) rather
than by sorting the finished column list by x — with band cuts in play, a
global x-sort would shuffle a lower band's left column above an upper band's
right column. The RTL pins still pass.

Target pages: p9 1→4, p12 1→4, p17/18/20/21/22 1→2. Tax tables p68/p70
correctly stay unsplit.

### 2. Form XObjects — read per DRAW, in stream order

Both extractors (the JS content-stream oracle and the Python portable engine,
changed in lockstep) now follow `Do` operators instead of walking the page's
`/XObject` resource dictionary. Two bugs fell out of the one change, both
refereed against pdf.js:

| | before | after | pdf.js |
| --- | --- | --- | --- |
| i1040 `STOP` badges | 14 | **32** | 32 |
| USCIS civics footer | 18 | **11** | 11 (11 pages) |

The first is the under-count logged in session 5. The second was the opposite
and was NOT previously known: an XObject whose own `/Resources` names the
page's dictionary made the old walker re-enter itself, so a page footer came
out several times per page. A stack-based cycle guard settles it, with a draw
budget and an inflate cache for stamps. Corpus-wide only these two documents
changed; the other fourteen are identical.

**The session-5 caveat is retired** — the recall baseline is trustworthy for
repeated stamped content again.

### Tests

`R8` blocks in `remediation_pipeline_audit_fixes` (10pt gutter splits; columns
above a full-width block; a full-width block above columns; a single column
with a big blank gap is NOT carved into bands; stamp read once per draw and in
place) and in `portable_verification` (same fixture through the real CLI),
sharing `tests/helpers/stamped_xobject_fixture.js`. Portable engine 0.2.2.
