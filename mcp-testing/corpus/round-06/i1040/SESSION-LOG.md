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

### Session 6 (2026-08-04) — pages 20-22 · tranche-06 · 55 blocks · VALIDATED (merged)

"Definitions and Special Rules", the ~20-entry glossary closing "Who Qualifies
as Your Dependent". `merge-plans t01..t06` → 380 blocks, `ok: true`, pages
1-22 covered.

**Recall 0.9989** — the best of the rebuild so far, and the first tranche where
the only shortfall is the three printed page numbers. Getting an honest number
here needed the baseline to account for the tranche boundary: pages 20-22 open
with Step 5 question 3's Yes/No branches, which tranche 5 owns because the
question begins on page 19. Scored naively that reads 0.9599; counting
tranche 5's page-19 blocks as covered gives 0.9989. Worth reusing whenever a
tranche starts mid-page.

**These pages were authored from the TEXT LAYER, which round 8 made possible.**
They are two-column prose whose columns used to extract interleaved — session 5
recorded them as "author from renders". The 10pt-gutter fix means they now read
in order, and the whole tranche was authored without a single page image. That
is the round-8 work paying for itself immediately.

Structure decisions: every glossary entry is a bold run-in term, authored as a
level-5 heading (period dropped) under the level-4 "Definitions and Special
Rules" that sits beside the five Steps — the Steps send readers here by name,
so term-by-term navigation is the point. The worked "Example." under
"Qualifying child of more than one person" is left as a strong run-in rather
than a heading: it illustrates one entry rather than defining a term, so the
heading level stays a clean list of terms.

### Session 7 (2026-08-04) — pages 23-26 · tranche-07 · 95 blocks · VALIDATED (merged)

The start of the "Income" line instructions: general income rules (PPP
forgiveness, foreign-source income, chapter 11, community property, rounding)
and lines 1a through 4b. `merge-plans t01..t07` → 475 blocks, `ok: true`,
pages 1-26 covered. Recall 0.9856, all shortfall furniture plus one familiar
extraction artifact (`divtip`/`idends` — "dividends" split at a column break
with the TIP icon label wedged between the halves, the same shape as
`informa6` in tranche 2 and `employ12` in tranche 4).

**Scope narrowed from the planned 23-38.** That span is 16 pages and two
structures: pages 23-26 (and on to 28) are three-column line instructions,
but from page 29 the section switches to fill-in **worksheets** — "Simplified
Method Worksheet—Lines 5a and 5b", with dot leaders and numbered entry
lines — which are a new shape and need their own session.

**Line headings carry both parts.** The source prints each instruction as a
small bold `Line 1a` above a larger bold description. They are authored as one
heading, "Line 1a. Total Amount From Form(s) W-2, Box 1", because a reader
navigating by heading needs both halves; neither alone says enough.

**An interrupted list became two lists.** Line 1h's bulleted income types are
broken on page 25 by a caution callout, and a flat list cannot hold a callout
mid-list. Authored as two lists with the callout between them, exactly where
the source prints it, with no item reordered.

Also settled here: numbered worked examples (`Example 1/2/3` under line 3a)
ARE headings, unlike the single run-in "Example." in tranche 6 — these are
parallel, self-contained scenarios a reader may jump between.

### Session 8 (2026-08-04) — pages 27-29 · tranche-08 · 55 blocks · VALIDATED (merged)

IRA distribution exceptions, pensions and annuities, and **the document's
first fill-in worksheet**. `merge-plans t01..t08` → 530 blocks, `ok: true`,
pages 1-29 covered. Recall 0.9757; shortfall is furniture plus the worksheet's
repeated line numbers (the source prints each number twice — once at the start
of the line, once again beside the entry box — and the plan keeps one, in the
Line column).

**THE WORKSHEET SHAPE — decided here, reuse it for every later worksheet:**

A worksheet is a **table** with columns `Line / Instruction / Amount` and
`row_headers` on.

* The line **number is a real column**, not list numbering, because the
  instructions reference it constantly ("Subtract line 6 from line 2"). With
  row headers on it renders `<th scope="row">1.</th>`, so each row announces
  which line it is.
* The **Amount column is deliberately empty**. It is where the reader writes;
  a blank cell says that honestly. A placeholder would add content the IRS
  never printed, which this rebuild does not do to a tax document.
* **Dot leaders are dropped** — they lead the eye to the entry box on paper
  and carry no meaning in linear reading.
* Material the source nests **inside** a numbered line (the Note under line 2,
  the Yes/No branches with STOP under line 10) is folded into that line's
  instruction cell, since a table cell cannot hold a sub-block.

Verified by rendering the merged checkpoint to a temp directory (deleted
after; no partial rebuild delivered): the worksheet emits `<th scope="col">`
headers, `<th scope="row">` line numbers, and well-formed empty `<td></td>`
entry cells.

**Spanning headers had to be written out.** Table 1 prints one header spanning
two date-range columns; a flat header row cannot span, so each column header
carries the full phrase ("AND your annuity starting date was before
November 19, 1996, enter on line 3…"), which is what a screen reader
announces with each cell.

**Handoff to tranche 9:** page 28's closing paragraph runs *past* the
worksheet insert and finishes at the top of page 30. It is authored whole at
page 28, so **tranche 9 starts at "Payments when you are disabled" and must
not re-author it.**

### Session 9 (2026-08-04) — pages 30-33 · tranche-09 · 91 blocks · VALIDATED (merged)

Rest of the pension/annuity rules, social security benefits (with the second
worksheet), capital gain or loss, and the start of Tax and Credits.
`merge-plans t01..t09` → 621 blocks, `ok: true`, pages 1-33 covered. Recall
0.9772, shortfall all furniture plus worksheet repeated line numbers.

**The tranche-8 worksheet shape carried over with no changes needed** — the
Social Security Benefits Worksheet (18 lines) is a table of
`Line / Instruction / Amount` with row headers, dot leaders dropped, entry
column blank. Lines 7 and 9 fold in their No/Yes branches (keeping STOP) and
line 8 folds in its three filing-status options, exactly as the shape
prescribes. That is the design paying off: a new worksheet cost no new
decisions.

**Page 32 is a full-page insert** that interrupts the line 7a instructions:
"Exception 2" begins on page 31 and its consequences resume on page 33. Each
block is authored where it begins, so the merged reading order runs
31 → 32 → 33, the printed order.

**Level 6 reached.** Three worked examples sit inside level-5 topics, so they
are level-6 headings — the deepest this document goes, and the floor for the
heading scheme.

**Bare line headings.** Lines 5c, 6c, 6d, 7b, 10 and 12a-12d print only
"Line 5c" with no description, unlike 1a-4c. Authored bare rather than
inventing descriptions.

**Handoff to tranche 10:** page 33's final bullet ("You can download, or view
online, tax forms and publications in a variety of formats…") completes at
the top of page 34. It is authored whole at page 33, so **tranche 10 starts at
"Line 12e" and must not re-author it.**

## GOAL: finish all 126 pages, at the rigor established above

Set by Aaron on 2026-08-04: complete the whole document, doing more per
session where possible, but **without reducing per-page scrutiny**. That trade
was offered and declined, so do not re-propose it.

What makes "more per session" achievable honestly:

* **The structural shapes are settled** — flowchart (t5), glossary (t6), line
  instructions (t7), worksheet (t8), merged-cell table (t3). New pages of
  those kinds cost authoring time, not design time. A tranche only needs fresh
  design when it shows a shape not in that list.
* **Two spans are MECHANICAL and must not be hand-authored.** The 2025 Tax
  Table (~pages 68-80) and the Index (~118-126) are thousands of short,
  regular rows. Generate them from extracted text with a per-tranche
  generator, then VERIFY: row count against page count, spot-check rows
  against the render, and a recall pass. Hand-authoring them would be slower
  and less accurate, not more careful.
* **The limit is context per session, not willingness.** A validated 4-6 page
  tranche that is committed beats an ambitious one that runs out of context
  half-authored. Prefer several tranches per session over one oversized one.

Per-session checklist (unchanged): read the handoff note for the tranche
BEFORE authoring; author from the text layer where the columns are detected
correctly, from the render where they are not; `merge-plans` all tranches;
recall check with print-control stripped and any cross-tranche overlap
credited; verify no marker leakage; commit with the decisions written down.

### Sessions 10+ — REMAINING

| Tranche | Pages | Content | Notes |
| --- | --- | --- | --- |
| ~~10~~ | ~~34-37~~ | DONE — see session 10 below | |
| 11 | 38-47 | Qualified Dividends worksheet, lines 16-26, credits | starts at page 38's "Qualified Dividends and Capital Gain Tax Worksheet"; expect more worksheets |
| 12 | 48-60 | Line 27a EIC and its worksheets/tables | heaviest remaining hand-authoring; EIC tables may be partly mechanical |
| 13 | 61-67 | Refund, Amount You Owe, Sign, Assemble | |
| 14 | 68-80 | **2025 Tax Table** | ★ MECHANICAL — generator + verification, not hand-authored |
| 15 | 81-87 | General Info, Tax Help, Refund Info | |
| 16 | 88-110 | Schedule 1 + 1-A instructions | long; may split |
| 17 | 111-117 | Schedules 2-3 instructions | |
| 18 | 118-126 | Tax Topics, Disclosure, Outlays, **Index** | ★ Index MECHANICAL (list per letter) |

After the last tranche: `merge-plans` all of them (expect `pagesWithoutBlocks`
empty but for genuinely blank pages) → `remediate` → recall channels →
`verify-init` → independent verifier → `verify-check`. Only then is a rebuild
delivered.
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

### Session 10 (2026-08-04) — pages 34-37 · tranche-10 · 67 blocks · VALIDATED (merged)

Standard deduction (line 12e) with its worksheet and chart, qualified business
income deduction, and line 16 Tax with the Foreign Earned Income Tax
Worksheet. `merge-plans t01..t10` → 688 blocks, `ok: true`, pages 1-37
covered.

**Recall 0.9935** once furniture is removed and tranche 9's page-33 blocks are
credited (page 33's last bullet finishes on page 34). Raw it reads 0.9701; the
difference is entirely that cross-tranche overlap, the same accounting first
needed in session 6. Remaining shortfall is only the worksheet sub-line labels
the source prints twice ("2a." at the start of the line, "a." again beside the
entry box).

**No new shapes were needed** — the first session where that is true of a
structurally busy span. Both worksheets reuse the tranche-8 shape and the
Standard Deduction Chart reuses the tranche-3 merged-cell flatten. Two small
decisions worth recording:

* **Sub-numbered worksheet lines are their own ROWS**, not folds (4a/4b/4c on
  page 35, 2a/2b/2c on page 37). The source numbers them as separate entry
  lines and later lines reference them individually, so they need their own
  row headers.
* **The chart's checkbox block became a sentence.** Four checkboxes and an
  arrow lead to a "total number of boxes checked" blank. The boxes and arrow
  are paper-form furniture, but their labels tell you what to count, so the
  labels are kept as a sentence and the blank is not reproduced.

**Line 16's list spans the page-35 insert** (begins page 34, finishes page 36),
authored whole at page 34, so merged order runs 34 → 35 → 36 as printed.

### Session 11 (2026-08-04) — pages 38-39 · tranche-11 · 29 blocks · VALIDATED (merged)

The Qualified Dividends and Capital Gain Tax Worksheet (25 lines, the longest
so far), the child tax credit (line 19), and the start of Payments
(lines 25-26). `merge-plans t01..t11` → 717 blocks, `ok: true`, pages 1-39
covered.

**Recall 0.9794 with the cleanest shortfall profile yet: every missing token
is a numeral** — the worksheet line numbers, which the source prints twice
per line (once at the start, once beside the entry box), plus one printed page
number. No prose is missing at all.

One rule sharpened, worth carrying forward:

> **Worksheet rows follow the printed ENTRY lines, not the printed layout.**

Lines 6 and 13 stack three filing-status amounts beside a *single* entry box,
so those options stay inside that line's instruction cell. That looks like the
opposite of tranche 10, where 4a/4b/4c became separate rows — but it is the
same rule: 4a/4b/4c each have their own entry box, these do not.

**No handoff note this time** — page 39 ends on a complete sentence, so
nothing spans the 39/40 edge.

**Next up is the EIC**, pages 40-60: the longest and most structurally
involved section left, with a flowchart, multiple worksheets, and the EIC
tables. Worth starting fresh rather than at the tail of another session.

### Session 12 (2026-08-04) — pages 40-41 · tranche-12 · 50 blocks · VALIDATED (merged)

The start of the Earned Income Credit (lines 27a, 27b, 27c) and Steps 1-4 of
its eligibility flowchart. `merge-plans t01..t12` → 767 blocks, `ok: true`,
pages 1-41 covered.

**Recall 0.9987 — the best of the rebuild. The only missing tokens are the
two printed page numbers.**

**The EIC flowchart reused the tranche-5 shape with no changes.** Second
flowchart in the document, zero new decisions: Step headings carry their
printed badges, questions keep their numbers, Yes/No branches are a two-item
list with strong labels, STOP kept as text, checkboxes and arrows dropped.

Two print constructs needed judgment rather than a new shape:

* **Conditions-then-branches.** Step 1 q1 and Step 2 q4 print a bulleted set
  of conditions and *then* one Yes/No pair covering the whole set. Authored as
  question → condition list → branch list, so the branches still read as the
  question's, and no condition is folded into branch text.
* **Step 2 q1 is an addition grid** in print (Line 2a + 2b + 3b + 7a =
  Investment Income). There is one result, not four entries, so it is a
  sentence naming the same four lines in order with the footnote kept — NOT a
  worksheet table, which would imply four entry boxes the form doesn't have.

**Column-detector note, not a defect:** pages 40, 46, 47 report 5-6 "columns".
That is the round-8 band cut counting REGIONS of a page whose layout changes
down the page. Reading order was checked and is correct, which is why these
pages could be authored from the text layer at all.

**Handoff to tranche 13:** Step 4's question 2 begins on page 41 and its
branches print atop page 42. Authored whole at page 41, so **tranche 13 starts
at Step 4 question 3 ("Was your main home…") and must not re-author it.**

### Session 13 (2026-08-04) — pages 42-43 · tranche-13 · 52 blocks · VALIDATED (merged)

Rest of EIC Steps 4-6, lines 27b/27c, and the start of the EIC's own
Definitions and Special Rules. `merge-plans t01..t13` → 819 blocks,
`ok: true`, pages 1-43 covered. **Recall 0.9989** once tranche 12's page-41
blocks are credited (Step 4 q2 spans 41→42); only the two page numbers remain.

**A worksheet inside a flowchart branch** — a new *combination*, not a new
shape. Step 5 q1's No branch says "Complete the following worksheet" and a
five-line worksheet follows; it uses the tranche-8 shape unchanged.

**Callouts attached to worksheet lines fold into those lines.** The worksheet
prints a Tip after line 2 and a Caution after line 4, each about the line
above. Both fold into their line's cell with the label kept, so the numbering
a reader must add up stays continuous. (Contrast tranche 7, where a callout
*between* list items split the list in two — there the callout belonged to
neither item.)

**The EIC has its own Definitions section**, separate from the tranche-6
glossary, and several terms appear in both with *different* wording (the EIC
versions cite Pub. 596 and EIC-specific rules). Both kept in full, per the
tranche-6 rule.

### Correction: the band cut is recursive X-Y cut

Recorded 2026-08-04. The round-8 "band cut", combined with the vertical gutter
search it falls back from, is the classic **recursive X-Y cut** page
segmentation algorithm (Nagy, Seth & Viswanathan, ~1992): alternate cutting on
vertical and horizontal whitespace, recurse. It was arrived at here by
measurement, not from the literature, and the earlier notes described it as if
it were new. It is not. The source comment now carries the attribution so
anyone extending it reads the existing work — including its known weaknesses
on non-Manhattan layouts — instead of re-deriving it. The measurements stand;
only the novelty claim was wrong.

### Session 14 (2026-08-04) — pages 44-45 · tranche-14 · 32 blocks · VALIDATED (merged)

The rest of the EIC's Definitions and Special Rules. `merge-plans t01..t14` →
851 blocks, `ok: true`, pages 1-45 covered. **Recall 0.9986 — only the two
printed page numbers missing.**

No new shapes; glossary entries as level-5 headings exactly as tranches 6
and 13. Clean boundaries both sides — nothing spans 43/44 or 45/46, so no
handoff note.

**Duplicated definitions, kept deliberately (again).** "Full-time student",
"Permanently and totally disabled" and "Qualifying child of more than one
person" all appear in the tranche-6 glossary too, with *different* wording:
the EIC versions cite Pub. 596 and EIC line numbers, and the "more than one
person" list differs in its first item. Both kept in full — a reader working
the EIC must not have to consult another section for a rule stated
differently there.

The worked example even uses a named child ("Lee") where the tranche-6 one
said "your child". Each is kept exactly as printed rather than harmonised;
both are the IRS's own text.

### Where the rebuild stands at session 14

45 of 126 pages, 851 blocks, 14 tranches. Every structural shape the document
uses is settled and has now been reused at least twice without change.
Remaining: EIC worksheets and tables (46-60), refund/sign/assemble (61-67),
the MECHANICAL Tax Table (68-80), general info (81-87), the schedules
(88-117), and the back matter including the MECHANICAL Index (118-126).

### Session 15 (2026-08-04) — pages 46-47 · tranche-15 · 27 blocks · VALIDATED (merged)

EIC Worksheet A and Worksheet B — the most form-like pages so far.
`merge-plans t01..t15` → 878 blocks, `ok: true`, pages 1-47 covered.

**ONE TABLE PER PART, not per worksheet.** Each worksheet divides into
numbered Parts whose titles are load-bearing: "Filers Who Answered 'No' on
Line 4" tells you whether to fill that Part in at all, and "Self-Employed NOT
Required To File Schedule SE" is a precondition, not a label. Each Part is a
level-5 heading followed by its own worksheet table, so the title stays
attached to the lines it governs. Numbering is unaffected — the printed
numbers live in the Line column, so 1a-1e, 2a-2c, 3, 4a-5 read continuously
across Worksheet B's four tables.

**The arithmetic column is not reproduced.** Worksheet B Parts 1-2 print +, −
and = down the entry column. Each line's instruction already states the
operation ("Combine lines 1a and 1b", "Subtract line 1d from line 1c"), so the
symbols are dropped and nothing is lost. Disclosed in the captions.

**A measurement caveat worth reusing — token recall under-reports on
form pages.** Raw recall here reads 0.9698, but the *source* baseline is
degraded: on tightly-packed form layouts adjacent text runs abut with no space
in the content stream, so the extraction produces glued tokens
(`recordsbefore`, `1aenter`, `27a10401040sror`). BOTH extractors do this, so
it is a property of the PDF, not of one reader. Verification used instead:
segment each shortfall token against the plan's vocabulary — 15 of 27 fully
decompose into words the plan contains, and the rest are the same glue class
plus page numbers and sub-line letters. **No content is missing.** Authored
token count (1158) exceeds source (927) precisely because the plan separates
what the source runs together.

For future form-heavy pages: don't read a sub-0.99 raw recall as a defect
without first checking for glue.

### Session 16 (2026-08-04) — page 48 · tranche-16 · 11 blocks · VALIDATED (merged)

EIC Worksheet B continued, Parts 5-7. `merge-plans t01..t16` → 889 blocks,
`ok: true`, **pages 1-48 covered**. Shape identical to tranche 15; numbering
runs continuously 1a…5, 6…11 across pages 47-48 because the printed numbers
live in the Line column.

**Deliberately a one-page tranche.** Page 49 begins the 2025 EIC Table, which
should be GENERATED with verification rather than hand-authored. Ending here
keeps hand-authored and generated work in separate tranches with an
unambiguous seam.

**Second measurement lesson — the recall normalisation had its own bug.**
Raw recall read 0.9653 and blamed `2025`, `27a`, `continued` as missing. They
were not: the normalisation replaced em dashes with hyphens and then closed
hyphens (the rule that repairs line-broken words), which glued my own heading
"Worksheet B—2025 EIC—Line 27a—Continued" into a single token. An em
dash JOINS PHRASES; a hyphen joins a broken WORD. Treating em/en dashes as
separators instead gives 0.9740, with the remainder being the page number, a
repeated line number, and source-side glue.

> **For future tranches:** in the recall check, map `—`/`–` to a space and
> only close `-`. Both this and the session-15 glue caveat mean a raw number
> below 0.99 on form-heavy pages should be investigated, not assumed to be a
> defect — and equally, not assumed to be fine.

### Session 17 (2026-08-04) — pages 49-60 · tranche-17 · 57 blocks · VALIDATED (merged)

The 2025 EIC Table, and **the first mechanical tranche**. `merge-plans
t01..t17` → 946 blocks, `ok: true`, **pages 1-60 covered**. 1,374 lookup rows,
13,740 cells, none of them transcribed.

**The generator refuses to write a plan unless six checks pass.** The
load-bearing one is CONTIGUITY: every bracket's "But less than" must equal the
next bracket's "At least", unbroken from the first row on page 49 to the last
on page 60. A dropped cell, a misassigned column or a panel read out of order
all break it. It came out clean at 1,374 rows spanning $1 to $68,700.

Contiguity proves the two bracket columns and says *nothing* about the eight
credit columns, so three more checks pin those: each column is single-peaked
across all 1,374 rows; credit never falls as the number of qualifying children
rises (0 violations in 8,244 comparisons); and the joint credit is never below
the single-group credit at the same income (0 in 5,496). The eight column
maxima come out at 649 / 4,328 / 7,152 / 8,046 in both status groups, which
are the published 2025 maximum EIC amounts. A sixth check ties each of the
eight `*`/`**`/`***` cells to its own footnote: the column a marker sits in
must match the number of children its note names, and the note must name the
bracket the marker sits in. All eight agree.

**Two panels per page, merged.** Each printed page sets two 10-column panels
side by side; left panel top to bottom then right gives one ascending run that
continues across page breaks. Stream-order text is useless here — it
interleaves a left-panel row and a right-panel row on every visual line — so
rows are rebuilt from geometry, as the protocol requires for drawn tables.

**One table per printed page, not one table of 1,374 rows.** The logical table
is continuous, but every page must carry blocks or `merge-plans` reports it
uncovered. Twelve tables, each repeating the full column header, each with a
level-5 heading and caption naming its range and part number so a reader can
jump to the right part instead of scanning twelve tables.

**Two new checked-in tools**, both of which the remaining mechanical spans need:

* `mcp-testing/tools/page_items.cjs` — per-item x/y/size/bold geometry as JSON.
  The protocol has called for a per-item dump since session 1; sessions were
  doing it with throwaway shell snippets.
* `mcp-testing/tools/tranche_recall.cjs` — the per-tranche recall check, with
  session 16's normalisation rule (em/en dash is a SEPARATOR, only the hyphen
  closes) written into the code and its reasoning in the header comment, so it
  cannot be re-derived wrongly next time. `--source cs|pdfjs|union` switches
  the baseline; `--segment` marks shortfall tokens that decompose into plan
  vocabulary, which is the session-15 glue caveat made mechanical.

**The recall check earned its keep by finding a real defect.** First run: 0.9597.
Tracing the largest shortfall showed the flattened column names never said the
word *credit* — the printed header carries "Your credit is—" on a row of its
own, and flattening had dropped it. A cell announced on its own would have
given a filing status, a child count and a bare number, and never said the
number was a credit. Putting it back into all eight column names took recall to
**0.9713**. The fix was to change the plan, not to explain the shortfall away.

**The remaining 466 token instances are fully accounted for, with none left
over:** 131 page furniture (the standing footer, page numbers, "(Continued)"),
324 the duplicated panel header, 5 the resolved "Use this column" deixis, and 6
source-side glue. The header claim was tested rather than asserted — counting
the header PHRASES per page shows "And your filing status is" exactly twice on
every page in *both* extractors, so the duplication is in the PDF and
collapsing it is the correct treatment, not a loss.

**Three independent confirmations, on three different paths.** (1) All 13,740
cell values re-derived from the byte-level content-stream reader, which shares
no code with the pdf.js geometry that built them — every value backed. (2) Six
rows read by eye off the rendered page images against the plan — 6/6. (3) Pages
49 and 60, the two irregular ones, checked visually: page 60's tail is 8 left
rows plus 6 right, ending on the `*` cell, exactly as parsed.

**`render_pages.cjs` is now usable on this document.** Session 1 recorded that
page images were useless here because the embedded fonts paint as tofu. With
`pdfjs-dist` present, the round-7 renderer path produces fully legible pages,
so the render is a real check again rather than a layout sketch.

### Session 18 (2026-08-04) — pages 61-62 · tranche-18 · 47 blocks · VALIDATED (merged)

Lines 28, 29 and 30 (the last refundable credits) and the opening of the
Refund section. `merge-plans t01..t18` → 993 blocks, `ok: true`, **pages 1-62
covered**. Recall **0.9865**, with the whole shortfall accounted for: the
standing footer and "Page N of 126" twice over, the glued `DIRECTDEPOSIT`
logotype, and `nu62`/`trition` — the printed page number sitting inside a
hyphen-split word at the column break, the same artifact session 2 found.

**A tool defect that had been live since session 1.** pdf.js reports this
document's fonts as synthetic ids (`g_d0_f1`..`g_d0_f17`) with generic
`serif`/`sans-serif` families. There is no font NAME to test, so
`page_outline.cjs`'s "does the font name contain bold" check was false for
**every item on every page of this PDF**, and its heading detection had
silently degraded to size-only for seventeen sessions. Subheads set at body
size were invisible to it: "Refund Offset", "Injured Spouse", "Benefits of
Direct Deposit", "Account must be in your name". `page_items.cjs` shipped the
same misleading `bold` field in session 17.

Both tools now classify by how RARELY a page uses a face: body copy is set in
one or two faces covering most of the page, while subheads and run-in leads
use faces that appear a handful of times. The threshold is 20%, and both
bounds were measured, not guessed — page 6's run-in lead face sets 10% of that
page (so a tighter threshold misses it), and page 61 sets its CAUTION-box copy
in a second roman face at 35% (so a looser one swallows body text). It is a
CANDIDATE generator, not a classifier: it cannot tell a second body face from
a heavily used display face, so the header comment now says to confirm against
a rendered page, which is what this tranche did.

**Two authoring decisions the fix made possible.** The italic face does double
duty — it sets both the CAUTION/TIP box bodies and the cross-references in
running text. The cross-references are marked emphasis; the callout bodies are
not, because there the italic marks the box (which the callout already
conveys) and emphasising a whole paragraph tells a screen-reader user nothing.
And "do not" on page 61 turns out to be bold, not italic.

**A review note that was wrong, caught by checking it.** The first draft
asserted these pages carry no Link annotations, so the addresses were left as
emphasis. The rendered page showed them underlined; page 62 in fact carries
five Link annotations for three logical links (two report twice because they
wrap across a line). Targets now come from the annotations, as in tranche 2,
so no URL is guessed from visible text. Page 61 genuinely has none — the
render distinguishes them, underlined versus merely italic.

**The recall check gained one narrow rule.** A margin icon's LABEL is real
text in the content stream, so it lands wherever the icon sits — including
inside a word broken across lines: page 61 reads "you must have a val- !
CAUTION id SSN". An interposed label is now dropped before the hyphen is
closed, or the halves survive as `val` and `id` and read as dropped content.
That the icon sits *inside* the word is also the clearest evidence yet that
restoring the sentence around it (the tranche-3 convention) is right.

### Session 19 (2026-08-04) - pages 63-64 - tranche-19 - 52 blocks - VALIDATED (merged)

The direct-deposit mechanics, line 36, and the whole Amount You Owe payment
section. `merge-plans t01..t19` -> 1,045 blocks, `ok: true`, **pages 1-64
covered**, zero heading skips across the merged outline. Recall 0.9689, with
every shortfall token accounted for.

**The first image block in this rebuild.** Page 63 carries the sample-check
illustration, and its whole purpose is to answer one question: which number on
a cheque goes on which line. So the alt text carries the instruction, not the
appearance. It names the three groups of digits along the bottom edge in
order, says which label points at which group, and spells out that the third
group repeats the check number that must NOT be entered.

The cheque's generic boilerplate is deliberately left out - "PAY TO THE ORDER
OF", "DOLLARS", the dollar sign, "For", the fractional routing code. None of
it bears on the instruction, and reciting it would bury the part that does.
The alt opens by saying the image is a personal check, which is what that
furniture signals to someone who can see it. **Consequence worth remembering:
a token-recall check will always report cheque boilerplate as uncovered on
this page.** That is expected, and the note in the tranche says so.

**The figure is moved to a sentence boundary.** In print the check sits at the
top of column 2, which drops it into the MIDDLE of the line 35d paragraph -
the column-aware reading order splits "On the sample check shown later," from
"the account number is 20202086." The paragraph is authored whole and the
figure placed straight after it, which is also where the text's own "shown
later" points.

**The first table built from non-tabular print.** The two card-payment
providers are set as indented address blocks with no rules, but the content is
strictly parallel (provider, phone, website), so it is authored as a table -
otherwise a reader has to infer the structure from indentation they cannot
see. Disclosed in the caption.

**Link targets derived by position, not guessed.** Page 64 carries 19 Link
annotations covering 11 distinct URLs; each rect was matched against the text
items falling inside it. Two would have been wrong from a guess:
`IRS.gov/Account` resolves to `irs.gov/your-account`, and `IRS.gov/OPA` to
`irs.gov/paymentplans`. Page 63 has no annotations at all.

**The validator settled a heading level, and it was right to.** "Insufficient
funds" has the same modest print weight as "Installment agreement", so it was
first authored at level 5 - but it sits directly under the "Amount You Owe"
banner with no "Line NN" heading between, so the outline skipped h3 to h5 and
`merge-plans` rejected the plan. It is in fact a SIBLING of "Line 37": both
are direct children of the section. Printed weight and structural depth are
not the same thing, and only the merge step catches the difference.

### Session 20 (2026-08-04) - pages 65-67 - tranche-20 - 62 blocks - VALIDATED (merged)

Line 38, Third Party Designee, Sign Your Return, Identity Protection PIN, Paid
Preparer Must Sign Your Return, and Assemble Your Return. **This completes the
Line Instructions section.** `merge-plans t01..t20` -> 1,107 blocks, `ok:
true`, **pages 1-67 covered**, zero heading skips. Recall 0.9830, shortfall
entirely the standing footer and "Page N of 126" over three pages, plus the
two ordered-list markers "1." and "2." that the list structure now generates
instead of carrying as literal text.

**The type sizes were not enough to fix the heading levels, and the TOC was.**
Two banner sizes are printed here, 16pt over a thick rule and 14pt over a thin
one, which separates "Sign Your Return" from "Line 38" and "Third Party
Designee" cleanly. But "Assemble Your Return" is ALSO 16pt over a thick rule
and is nevertheless a different depth: the page-2 TOC lists it as a top-level
entry beside "What's New", "Filing Requirements" and "Line Instructions",
while "Sign Your Return" appears there nested UNDER Line Instructions. So
"Assemble Your Return" is level 2 and "Sign Your Return" level 3, though they
are typographically identical. Type size states prominence; the TOC states
structure, and where they disagree the TOC wins.

**Two headings nest where the source puts them, not where they belong.**
"Third Party Designee" is 14pt over a thin rule inside the run of headings
following the "Amount You Owe" banner, so it lands as a subsection of Amount
You Owe - a poor fit for what it says. "Phone Number and Email Address" is a
12pt subhead after the Identity Protection PIN banner, so it lands under IP
PINs though it is about the phone and email fields. Neither is in the TOC, so
there is no independent evidence to promote either. Re-parenting would mean
overriding the document's own structure on a judgment call; both are followed
and disclosed instead.

**Paragraph breaks come from the first-line indent, not from where a sentence
sounds like it ends.** "Assemble Your Return" reads as four separate
instructions and was first authored as four paragraphs. The rendered page has
no indent anywhere in the block, and "attach them last." and "File your
return," fall on the same line - it is ONE paragraph. This document indents
every genuine new paragraph, which makes the render the deciding evidence;
extraction alone cannot show it. Worth carrying into every remaining prose
tranche.

**The same visible link text resolves differently on different pages.**
"IRS.gov/Account" on page 66 targets `irs.gov/account`; the identical text on
page 64 targets `irs.gov/your-account`. Take every href from that page's own
annotation, never from a document-wide table.

### Session 21 (2026-08-04) - pages 68-79 - tranche-21 - 41 blocks - VALIDATED (merged)

The 2025 Tax Table, and the second mechanical span. `merge-plans t01..t21` ->
1,148 blocks, `ok: true`, **pages 1-79 covered**, zero heading skips. 2,062
lookup rows, 12,372 cells, none transcribed.

**Verified before a plan was written.** Contiguity holds unbroken from $0 on
page 68 to $100,000 on page 79. The row count is checked against what the
printed bracket scheme requires - 6 rows below $100, 116 rows of $25 steps to
$3,000, then 1,940 rows of $50 steps - and comes out at exactly 2,062. Three
further checks pin which column is which, and one of them is unusually sharp:
**the Single and Married-filing-separately columns are identical in all 2,062
rows**, because the 2025 brackets for the two coincide below $100,000. A
column read into the wrong slot breaks that immediately. Plus married filing
jointly <= head of household <= single row by row, and all four columns
non-decreasing as income rises.

**Both identical columns are kept.** One of them is strictly redundant as
data, but a reader looking up "married filing separately" has to find that
column; collapsing them would make them hunt for their status under someone
else's name. The identity is a verification result, not a licence to merge.

**Panels are read independently here, which the EIC Table did not need.** Each
page sets three 6-column panels, but unlike the EIC Table they are NOT aligned
by y: page 68's first panel carries 42 rows because income under $100 is
bracketed in finer steps, while panels 2 and 3 carry 40 rows plus a section
heading. Banding across the full page would pair a row from one panel with an
unrelated row from another.

**Nothing inside a panel is dropped silently.** The parser collects every band
in a panel's x-range that is not a six-cell numeric row and asserts the
collection is exactly one known item - the note in page 79's third panel
sending filers at or above $100,000 to the Tax Computation Worksheet. Any
other stray content aborts the run rather than vanishing.

**Recall reads 0.9060, and that is the metric measuring the source's
typography rather than the plan.** The whole shortfall is accounted for: 131
page furniture, 411 words of the column header that each page prints THREE
times (once per panel) against one header row per table, 492 single-character
tokens because the header sets "Married" in letter-spaced type so it extracts
as m,a,r,r,i,e,d, 144 header words split across lines inside their cells, 78
glued header fragments, 12 instances of "this" from resolving "* This column"
into "The married filing jointly column", and ~99 dropped $1,000 section
headings (each appears 3x in source, 2x in plan - the two bracket boundaries
survive, the block label does not). Zero genuinely unexplained.

> **Lesson: on a page that is mostly repeated table header, token recall is
> the wrong instrument.** The real check is the cell-level cross-check, and it
> is unambiguous: all 12,372 values re-derived from the byte-level
> content-stream reader, which shares no code with the pdf.js geometry that
> built them, and every one is backed. `tranche_recall.cjs` now reports the
> single-character share on its own line so a low score on a table-heavy
> tranche is legible at a glance.

Eight rows read by eye off the rendered page 68 match the plan, including both
panel seams; the sample table carries the 2,562 its worked example arrives at.

### Session 22 (2026-08-04) - page 80 - tranche-22 - 11 blocks - VALIDATED (merged)

The 2025 Tax Computation Worksheet for line 16: four sections (A-D by filing
status), five rate-band rows each. `merge-plans t01..t22` -> 1,159 blocks,
`ok: true`, **pages 1-80 covered**, zero heading skips. Recall 0.9837 and the
cleanest shortfall of the rebuild so far: all ten instances are the page
number and the standing footer, and nothing else.

**Twenty rows, and still generated rather than transcribed** - these are rate
bands and subtraction amounts where one transposed digit changes someone's
tax. Checked: four sections of exactly five rows, rate bands in the order 22,
24, 32, 35, 37 in every section, subtraction amounts strictly increasing, each
band starting where the previous stopped, the first at $100,000 and the last
left open ended.

**The check worth reading cross-verifies this tranche against tranche 21.**
The worksheet computes tax as (income x rate) - subtraction. The Tax Table
computes the same tax by lookup, at each bracket's MIDPOINT. So the
worksheet's parameters, applied to the Tax Table's own brackets, must
reproduce the Tax Table's printed figures. They do:

| Filing status | Tax Table rows reproduced | run ends at |
|---|---|---|
| Single | 1,031 | $48,450 |
| Married filing separately | 1,031 | $48,450 |
| Head of household | 703 | $64,850 |
| Married filing jointly | 61 | $96,950 |

Each run stops exactly where that filing status's 22% bracket begins and a
different rate takes over. That is **2,826 cell values in one table reproduced
from the parameters of another**, through arithmetic neither parser knows
about, catching any error in either.

> **Python's `round()` would have broken this, and did.** Every bracket
> midpoint lands on x.5 exactly, and Python rounds half to EVEN while the IRS
> rounds half UP: `round(16908.5)` is 16908, but the table prints 16909. The
> first run of the check reported 0 matching rows out of 2,062 and looked like
> a catastrophic parse failure. Use `math.floor(x + 0.5)` for anything
> compared against printed money.

**A tooling note.** The full-fidelity renderer needs `pdfjs-dist`, which is not
a declared dependency and had vanished from `node_modules` again. Reinstalling
it risks disturbing `@babel/core`, which is also undeclared and which the build
needs - and another session had work in flight. The structure was confirmed
from the vendored layout-only render instead (rules and cell boxes are exact
even where the glyphs are tofu) plus the per-item geometry, which was enough.

### Session 23 (2026-08-04) - pages 81-82 - tranche-23 - 32 blocks - VALIDATED (merged)

The opening of General Information. `merge-plans t01..t23` -> 1,191 blocks,
`ok: true`, **pages 1-82 covered**, zero heading skips. Recall **0.9942**, the
highest of any multi-page tranche so far: eight instances of page furniture,
one "of" from "Page N of 126", and `adprovide`/`vance` - the word "advance"
split across a column break with the full-width IRS Mission box landing
between its halves.

**Link targets matter more here than anywhere so far.** Page 82 alone carries
20 Link annotations, and several point nowhere near their visible text:
`ftc.gov/complaint` goes to reportfraud.ftc.gov, `www.ftc.gov/idtheft` goes to
a consumer.ftc.gov feature page, `IRS.gov/GetAnIPPIN` goes to irs.gov/ippin.
**Three have no visible URL at all** and reading the text would have missed
them entirely: "Tax Withholding Estimator" (irs.gov/w4app), "IRS Impersonation
Scam Reporting" (tigta.gov) and "FTC Complaint Assistant"
(reportfraud.ftc.gov). One is a `mailto:`. Every href came from matching the
annotation rect against the text items inside it.

**A sentence-long bold run-in promoted to a heading.** "Protect yourself from
suspicious emails, texts, and social media messages, phishing schemes, and
phone scams." is set in the same bold face as "The IRS Mission." and heads
seven paragraphs. It is an imperative sentence rather than the noun phrase
these leads usually are, which makes for a long heading, but leaving it inside
a paragraph would leave that whole discussion unnavigable.

**The marker-leakage check earned its keep again.** The first draft's review
note used the generator's own emphasis markers as quotation marks, exactly the
slip session 5 made. Review notes do not pass through `rich()`, so the markers
would have shipped literally. Normalised to curly quotes. Worth remembering:
the leakage check must cover `review_notes`, not just blocks.

### Session 24 (2026-08-04) - page 83 - tranche-24 - 26 blocks - VALIDATED (merged)

Amended Return, Need a Copy of Your Tax Return Information?, Past Due Returns,
and the opening of How To Get Tax Help. `merge-plans t01..t24` -> 1,217
blocks, `ok: true`, **pages 1-83 covered**, zero heading skips. Recall 0.9843.

**A one-page tranche because the page earns it:** 31 Link annotations, three
section headings, a top-level section opening halfway down, and six
run-in-led topics with four embedded lists.

**"How To Get Tax Help" is level 2 though printed at 14pt**, the same size as
the level-3 heads immediately above it. The TOC lists it as a top-level entry
while those neighbours are not listed at all. Same conflict "Assemble Your
Return" posed in session 20, resolved the same way.

**The validator caught the consequence.** With that section at level 2, its
run-in topics are its DIRECT children, so authoring them at level 4 (the level
run-in leads get everywhere else in this rebuild) skipped h2 to h4 and
`merge-plans` rejected the plan. They are level 3 here. **The level a run-in
lead takes depends on what encloses it, not on what it looks like** - that is
the second time this rebuild has learned it from the validator rather than
from the page.

**The recall shortfall was predicted in advance and matched exactly.** The
records-retention paragraph finishing at the top of page 83 was authored whole
at page 82 in tranche 23, so a page-83 recall shows "replacement property. For
more details, see chapter 1 of Pub. 17." as uncovered. Every other shortfall
token is page furniture. Nothing unexplained.

**A four-item list runs across the 83-84 break and is authored whole here.**
Splitting it would leave a reader two orphaned fragments. The page-84 tranche
must NOT re-author its last two items (IRS.gov/Forms, and the e-filing
software note).

**Four tool names are linked twice each and both links are kept** - the source
sets "The Earned Income Tax Credit Assistant (IRS.gov/EITCAssistant)" with the
name and the parenthetical both carrying the same target. Collapsing them
would mean choosing which half to drop and rewriting the sentence.

### Session 25 (2026-08-04) - page 84 - tranche-25 - 36 blocks - VALIDATED (merged)

How To Get Tax Help continued, from choosing a preparer through the
online-account tools. `merge-plans t01..t25` -> 1,253 blocks, `ok: true`,
**pages 1-84 covered**, zero heading skips. Recall 0.9642.

**Fifteen run-in leads become level-3 headings** on this one page. It is
essentially a directory of IRS services, and it is unusable without them:
fifteen topics buried inside paragraphs cannot be skimmed or jumped between.
Level 3 and not 4 for the reason tranche 24's validator failure established -
"How To Get Tax Help" is level 2, so these are its direct children.

**The recall number is low and entirely predicted.** The two list items at the
top of page 84 close the "Getting answers to your tax questions" list, which
tranche 24 authored WHOLE at page 83 rather than splitting across the page
break. So a page-84 recall reports their every word as uncovered: `find`,
`forms`, `instructions`, `interactive`, `links`, `answers`, `efiling`,
`software` and the rest. Everything else is page furniture. **A per-page
recall score is structurally unable to see content the previous tranche
carried** - when a block deliberately spans a page break, expect the receiving
page to score low and check the shortfall against what was carried, not
against zero.

**The CAUTION box runs longer than it looks.** Its italic body continues past
the sentence about the preparer signing, through "Anyone paid to prepare tax
returns for others should have a thorough understanding of tax matters" and
the pointer to Tips for Choosing a Tax Preparer. The face data settles where
it ends; splitting it into a callout plus a loose paragraph would have been
the natural guess from reading alone, and would have been wrong.

**"Using direct deposit" spans the 84-85 break** and is authored whole here.
Its link target had to come from page 85's annotations, since that is where
the second half of the paragraph is printed. The page-85 tranche must NOT
re-author it.

### Session 26 (2026-08-04) - page 85 - tranche-26 - 25 blocks - VALIDATED (merged)

How To Get Tax Help continued: identity theft, refund status, making a
payment, paying late, amended returns, notices, and contacting a local TAC.
`merge-plans t01..t26` -> 1,278 blocks, `ok: true`, **pages 1-85 covered**,
zero heading skips.

**The most link-dense page of the rebuild: 28 Link annotations, NINE of them
phrase links with no visible URL at all.** The entire payment-options list
works that way - "IRS Direct Pay", "Debit Card, Credit Card, or Digital
Wallet", "Electronic Funds Withdrawal", "Electronic Federal Tax Payment
System", "Check or Money Order", "Cash" and "Same-Day Wire" each carry their
own target, as do "Digital assets", "online payment agreement" and "Offer in
Compromise Pre-Qualifier". Reading the visible text would have produced a list
of seven payment methods with no way to reach any of them.

**One target is deliberately not normalised.** Every other link on the page
resolves to a `www.irs.gov` address; the Offer in Compromise Pre-Qualifier
resolves to `irs.gov/oictool` with NO www. That is what the annotation
contains, and quietly "fixing" it to match its neighbours would be inventing a
URL.

**Session 25's lesson is now a checked-in tool, not a note.**
`mcp-testing/tools/carried_block_check.cjs` splits a receiving page's recall
shortfall three ways: words present in the block the previous tranche carried,
page furniture, and anything left over. Only the leftover needs
investigating. On this page: recall 0.9366, **60 shortfall instances = 54
carried + 6 furniture + 0 unexplained**. Run it on any page that receives a
spanning block instead of eyeballing the token list.

### Session 27 (2026-08-04) - pages 86-87 - tranche-27 - 25 blocks - VALIDATED (merged)

Interest and Penalties, and Refund Information. **This completes everything
before the schedule instructions.** `merge-plans t01..t27` -> 1,303 blocks,
`ok: true`, **pages 1-87 covered**, zero heading skips.

**A stacked fraction reassembled.** The late-payment penalty is printed as a
raised "1" over "/2" - three separate glyphs at three positions - and the
raised numerator sits high enough that the reading order delivers it several
words early: *"If you pay your 1 taxes late, the penalty is usually /2 of
1%"*. Authored as "½ of 1%" with U+00BD, which screen readers announce as "one
half". Reading the extraction alone would have produced a sentence with a
stray 1 and a penalty rate of "/2 of 1%".

**Page 87's three graphics are not reproduced, and that is a decision.** A
"where's my refund?" logotype, a computer icon and a telephone icon mark the
online and by-phone routes, and the body text wraps around all three - which
is why the extraction shows those paragraphs' first lines indented. None
carries information the adjacent sentence does not already state. They are
decorative, so the rebuild carries their meaning in the prose rather than
emitting image blocks a screen reader would skip. The TIP icon is different:
its label is real text, so it becomes a callout as everywhere else.

> **The first-line-indent rule from session 20 does not apply mechanically on
> a page with text wrapping around graphics.** The wrap puts a large left
> indent on lines that are not paragraph starts. Page 87's real breaks were
> read off the render, including the one before "The IRS can't issue refunds
> before mid-February 2026", which the indent test alone would have missed.

**`carried_block_check.cjs` now derives the page numbers from the receiving
tranche** instead of taking one as an argument, so a multi-page tranche no
longer under-counts its own page numbers as furniture. On this tranche: 59
shortfall instances = 46 carried + 10 furniture + 3 residual, and all three
residuals are documented artifacts (the fraction's raised numerator, and
`im86`/`posed` where "imposed" is split by the page number at a column break -
the same artifact tranches 2 and 4 found).

### Session 28 (2026-08-04) - page 88 - tranche-28 - 25 blocks - VALIDATED (merged)

The opening of the Instructions for Schedule 1: General Instructions, Form(s)
1099-K with its four worked examples, and the start of Additional Income at
line 1. `merge-plans t01..t28` -> 1,328 blocks, `ok: true`, **pages 1-88
covered**, zero heading skips. Recall 0.9758.

**The reading order was rebuilt from geometry, not taken from the
column-aware text.** This page changes layout down the page - a full-width
subtitle banner over three columns, then two TIP boxes the body wraps around -
and the column detector loses the thread partway, interleaving sentences from
different columns:

> "The remaining amounts reported to you on Form(s) 1099-K in 88 Additional
> Income and Adjustments to Income box 1(a) should be reported elsewhere would
> enter $1,500 in the entry space at..."

Each column was banded independently and read top to bottom instead, which is
what session 3 prescribed for pages whose layout changes down the page.

**The recall shortfall is degraded SOURCE, not lost content**, and this is the
clearest example the rebuild has produced. The missing tokens are
`comtaxable`, `detransactions`, `elec$700`, `incorstate`, `onoffsets` - words
from DIFFERENT COLUMNS glued together by the failing detector - plus `ceive`,
`coveries`, `ductions`, `fund`, which are hyphen halves whose partners landed
in another column so the hyphen-close could not reach them. None of these
strings exists in the printed document. The plan contains the correct forms
(`receive Form 1099-G`, `Itemized Deduction Recoveries`, `itemize deductions`,
`taxable refund`), verified explicitly.

> **When the column detector fails on a page, the recall baseline is damaged
> in the same way the reading order is.** Check the shortfall for cross-column
> glue before treating it as loss - session 3 said this and it is worth
> repeating now that the schedules bring more mixed-layout pages.

**Nothing spans the 88-89 break.** The "Exception" paragraph ends on page 88
with "...if any of the following applies.", and the list it introduces is
printed wholly on page 89. The page-89 tranche opens with that list and should
keep it attached to this Exception heading.

### Session 29 (2026-08-04) - page 89 - tranche-29 - 22 blocks - VALIDATED (merged)

Schedule 1 lines 2a/2b, 3, 4, 7, and the opening of lines 8a through 8z.
`merge-plans t01..t29` -> 1,350 blocks, `ok: true`, **pages 1-89 covered**,
zero heading skips. Recall 0.9842, with the whole shortfall accounted for:
page furniture plus the nine digits 1-9, which are the ordered-list markers
the list structure now generates rather than carrying as literal text.

**A CAUTION box runs from page 89 to page 91, SKIPPING page 90 entirely.** The
full-page State and Local Income Tax Refund Worksheet is printed on page 90
and interrupts the lines 8a-8z caution mid-sentence ("...income from a hobby
or a" / "sporadic activity)..."). It is authored whole at page 89, so neither
the page-90 nor the page-91 tranche may re-author it.

> **This is the first block in the rebuild that spans a NON-ADJACENT page
> pair.** Every earlier spanning block ran N to N+1. Run
> `carried_block_check.cjs` on page **91** against tranche 29, not on page 90 -
> page 90 is a self-contained worksheet and carries nothing.

**The page opens with a list belonging to the previous page's heading.** The
nine numbered conditions complete the "Exception" paragraph authored at page
88. The paragraph ended on 88 and the list is printed wholly on 89, so nothing
had to be carried in either direction; the list is authored on its own page
and stays attached to that heading in the merged reading order.

**Pages 89 and 90 carry no Link annotations at all.** The only link in this
stretch sits on page 91, inside the caution carried from here, and its target
is nothing like its text: "IRS.gov/1099K" resolves to
`irs.gov/businesses/understanding-your-form-1099-k`.

### Session 30 (2026-08-05) - page 90 - tranche-30 - 3 blocks - VALIDATED (merged)

The State and Local Income Tax Refund Worksheet for Schedule 1, line 1.
`merge-plans t01..t30` -> 1,353 blocks, `ok: true`, **pages 1-90 covered**,
zero heading skips. Recall 0.9746, all of it explained: page furniture plus
seven single digits, because this worksheet prints each line number TWICE -
once as the line label and once again beside the entry box - and the Line
column makes the repeat redundant.

**Three blocks for a whole page, and that is the right answer.** Heading,
"Before you begin" callout, one nine-row table. The worksheet shape settled in
tranches 15 and 16 is reused completely unchanged; this is the fifth worksheet
to take it without alteration, which is the clearest sign yet that the
structural vocabulary for this document is closed.

**The checkbox grid on line 6 is linearised.** The source prints four
checkboxes in a two-by-two grid (born before January 2 1960, blind, and the
same pair for a spouse) - a layout a linear reading cannot convey. They are
given as one list within the line, in printed order, so the count a filer has
to make survives. The asterisked footnote qualifying the spouse boxes is
folded into the same line rather than left at the foot of the worksheet, where
the asterisk would send a reader with nothing to return to.

**A self-contained page, unusually.** No Link annotations, nothing spans
either edge, and it INTERRUPTS rather than continues its neighbours: the lines
8a-8z caution runs from page 89 straight past this worksheet to page 91.

### Session 31 (2026-08-05) - page 91 - tranche-31 - 34 blocks - VALIDATED (merged)

Schedule 1 lines 8a through 8o, the Other Income series. `merge-plans
t01..t31` -> 1,387 blocks, `ok: true`, **pages 1-91 covered**, zero heading
skips. Recall 0.9381, and the non-adjacent carried-block check worked exactly
as session 29 predicted: **51 shortfall instances = 43 carried + 8 furniture +
0 unexplained**, run against tranche 29 rather than the page-90 tranche.

**"Line 8x" and its bold run-in lead are merged into one heading.** Left as
printed, this page's heading list would read "Line 8a, Line 8b, Line 8c..." -
fourteen entries that tell a reader nothing, on a page whose whole purpose is
to let someone find the one kind of income that applies to them. Merged it
reads "Line 8b. Gambling", "Line 8c. Cancellation of debt", "Line 8k. Stock
options". The lead is removed from the paragraph rather than duplicated, which
is what tranche 2 established, and the two conventions agree here.

**Line 8g is absent, and that is the source's own numbering** - the series
runs 8a-8f then 8h, with no gap in the text. Nothing was dropped.

> **A near miss worth recording.** The column dump appeared to end mid-sentence
> at "Enter on line 8o from your Forms 8992 the", and the obvious inference was
> that line 8o spanned into page 92. It does not: page 92 opens a new topic at
> line 8p. The sentence finishes on page 91 ("...the sum of ANY amounts
> reported on Part II, line 5. Remember to attach copies of your Forms 8992."),
> and a THIRD caution box follows it. A first draft had a fabricated ending and
> no third caution, both caught only by reading the column to its end before
> authoring. **Never infer a continuation from a truncated dump - check the
> next page and re-read the column tail.**

### Session 32 (2026-08-05) - page 92 - tranche-32 - 21 blocks - VALIDATED (merged)

Schedule 1 lines 8p through 8z, completing the Other Income series.
`merge-plans t01..t32` -> 1,408 blocks, `ok: true`, **pages 1-92 covered**,
zero heading skips. Recall **0.9947, the highest of any prose tranche in the
rebuild**: five shortfall instances, three page furniture and two the
mid-word break `nontaxa`/`nontaxa92` that the whole-word authoring resolves.

**Nothing was carried in, and that was checked rather than inferred** - line
8o completes on page 91, verified against page 92's opening, which is the
mistake session 31 nearly made in the other direction.

**The line 8z examples list spans the 92-93 break and is authored whole
here.** Its eighth and last item breaks mid-word at the foot of page 92
("Nontaxa-" / "ble distributions from these accounts...") and finishes at the
top of 93. The page-93 tranche must NOT re-author that item; it opens instead
with the CAUTION that follows it.

**The series skips from 8v to 8z**, as page 91 skipped 8g. Both are the
source's own numbering with no gap in the text.

### Session 33 (2026-08-05) - page 93 - tranche-33 - 29 blocks - VALIDATED (merged)

The end of Schedule 1 Part I and the opening of Part II, Adjustments to
Income, lines 11-16. `merge-plans t01..t33` -> 1,437 blocks, `ok: true`,
**pages 1-93 covered**, zero heading skips. Carried-block check against
tranche 32: **55 shortfall instances = 48 carried + 3 furniture + 4 residual**,
all four residuals documented artifact classes (`ble` from the Nontaxa-
mid-word break, `decaution` where the CAUTION label lands inside a split word,
`deduc93` where the page number does, and `duct`).

**Line 16 spans the 93-94 break past a full-page worksheet, and finding its
ending took looking.** Page 93 stops mid-word at "you may be able to take this
deduc-"; page 94 opens with the Self-Employed Health Insurance Deduction
Worksheet running the full page width, and the next heading below it is Line
17. The continuation is not missing - it sits in a two-line fragment between
the foot of the worksheet and the Line 17 heading ("tion. See Pub. 560 or, if
you were a minister, Pub. 517."). Authored whole at page 93.

> **Second block in the rebuild to jump a full-page insert**, after the lines
> 8a-8z caution in tranche 29. When a page ends mid-word and the next page
> opens with a worksheet, look BELOW the worksheet before concluding anything -
> three separate looks were needed here before the fragment turned up.

**The nested Form 3520 conditions keep their printed "1." and "2." markers
inside their bullet.** The schema takes flat lists only and this is a list
inside a list item, so the markers stay verbatim inside the parent - the
treatment Chart C got in tranche 3.

### Session 34 (2026-08-05) - page 94 - tranche-34 - 13 blocks - VALIDATED (merged)

The Self-Employed Health Insurance Deduction Worksheet and Schedule 1 line 17.
`merge-plans t01..t34` -> 1,450 blocks, `ok: true`, **pages 1-94 covered**,
zero heading skips. Recall 0.9814; carried-block check against tranche 33:
**16 shortfall instances = 11 carried + 4 furniture + 1 residual**, the
residual being `tion`, the front half of "deduc-tion" - the carried Line 16
block was authored with the word whole, so the source's split fragment cannot
match. Same class as `ble` in tranche 33.

**The worksheet shape is now used six times without alteration.**

**Both asterisked footnotes are folded into the line they qualify.** Line 2
carries a `*` on "net profit" and a `**` on "other earned income", with the
notes printed below the table. An asterisk a reader cannot see is a dead end,
so each note moves inside line 2 at the point it applies and the markers are
dropped - the treatment the line 6 footnote got in tranche 30.

**The worksheet is placed before the line 17 prose, as printed.** It occupies
the full page width at the top and the prose runs beneath it in three columns,
so the printed reading order puts the worksheet first even though the prose is
what introduces it. Kept rather than reordered: the "Before you begin" note
already sends a reader to the Exceptions in the line instructions, so the
worksheet points at its own context.

### Session 35 (2026-08-05) - page 95 - tranche-35 - 22 blocks - VALIDATED (merged)

The end of the line 17 discussion, then Schedule 1 lines 18, 19a-19c and 20.
`merge-plans t01..t35` -> 1,472 blocks, `ok: true`, **pages 1-95 covered**,
zero heading skips. Recall 0.9839, all fifteen shortfall instances explained:
page furniture plus the ten ordered-list markers the list structure now
generates.

**The ten-item list under line 20 is WHOLLY on this page, and confirming that
took reading column 3 to its end.** A truncated dump stops at item 6 mid-word
("You must file a joint return to de-") and page 96 opens on an unrelated
fragment - together a very convincing case that the list spans the break. It
does not: items 6 through 10 and the following run-in lead all sit in the rest
of column 3. **This is the third page in a row where the truncated-dump
inference was wrong**, in three different directions (t31 invented an ending,
t33 concluded a continuation was missing, t35 would have split an intact
list).

**"Were You Covered by a Retirement Plan?" is what spans 95-96**, not the
list. Authored whole here, so the page-96 tranche must open at "The
'Retirement plan' box in box 13 of your Form W-2...".

**Line 19b has no instruction of its own.** The heading pairs 19a, 19b and 19c
as the source does, but only 19a and 19c carry text. 19b is the recipient's
SSN field and the printed instructions say nothing about it.

**Third Tax Topic link in three tranches with no visible URL** - Tax Topic 452
resolves to irs.gov/taxtopics/tc452.html. Reading the text alone leaves a dead
cross-reference every time.

### Session 36 (2026-08-05) - page 96 - tranche-36 - 6 blocks - VALIDATED (merged)

The rest of the retirement-plan coverage discussion under Schedule 1 line 20.
`merge-plans t01..t36` -> 1,478 blocks, `ok: true`, **pages 1-96 covered**,
zero heading skips.

> **Recall reads 0.7531, the lowest of the whole rebuild, and nothing is
> missing.** The carried-block check settles it exactly: **59 shortfall
> instances = 55 carried + 4 furniture + 0 unexplained.** Page 96 has only 239
> source tokens and the "Were You Covered by a Retirement Plan?" paragraph
> carried from page 95 accounts for 55 of them, so raw recall is
> arithmetically meaningless here. **On a short page receiving a large carried
> block, the raw number says nothing; run `carried_block_check.cjs`.** This is
> the clearest demonstration yet of why that tool exists.

**A short tranche on purpose.** Page 97 is the IRA Deduction Worksheet - the
most complex worksheet in the document so far, with TWO entry columns (Your
IRA, Spouse's IRA) rather than the single Amount column the six worksheets
before it used, plus nested i./ii. options inside branch arms and two STOP
conditions. That needs a column shape this rebuild has not used before, so it
gets its own tranche rather than being appended to a five-block page.

### NEXT: page 97, the IRA Deduction Worksheet

**Design decision required before authoring:** the settled worksheet shape is
`[Line, Instruction, Amount]`, and this worksheet needs
`[Line, Instruction, Your IRA, Spouse's IRA]`. Lines 1a/1b are Yes/No
checkboxes rather than amounts, lines 2/5/6/7 have per-column entries (2a/2b,
5a/5b, 6a/6b), and line 6's Yes arm contains a nested i./ii. option list.
Follow the tranche-30 precedent for branches and STOPs (fold into the line),
and the tranche-34 precedent for footnotes.

Then Schedule 1's remaining adjustments (98-100), Schedule 1-A (101-110),
Schedule 2 (111-114) and Schedule 3 (115-117), each a top-level TOC entry
opening at level 2. Then the back matter: Tax Topics (118), the
Disclosure/Privacy Act notice (120), Major Categories of Federal Income and
Outlays (122), and the MECHANICAL Index (123-126). Do not hand-author the
Index.
