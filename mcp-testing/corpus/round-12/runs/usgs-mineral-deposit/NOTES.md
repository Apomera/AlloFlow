# Run record: usgs-water-cycle.pdf (really USGS GIP-17), 40pp, engine 0.2.5

Date: 2026-08-10. The corpus's first alt-text-at-volume exercise.

## Identity surprise

The corpus catalogues this file as `usgs-water-cycle.pdf`. It is actually
**USGS General Information Product 17, "The Life Cycle of a Mineral
Deposit—A Teacher's Guide for Hands-On Mineral Education Activities"**
(Frank, Galloway, and Assmus, 2005) — 40 pages, 10 hands-on classroom
activities, 9 figures, 4 tables, glossary, and a minerals-and-their-uses
appendix. The manifest name is a misnomer (the `pubs.usgs.gov/gip/…`
URL and the word "cycle" evidently suggested the water-cycle poster). Kept
under its catalogued name; the plan's first review note states the identity.

## Command sequence

```
python …/alloflow_portable.py remediate \
  --source mcp-testing/corpus/figures/usgs-water-cycle.pdf \
  --plan   mcp-testing/corpus/round-12/plans/usgs-mineral-deposit/usgs-mineral-deposit.plan.json \
  --out-dir mcp-testing/corpus/round-12/runs/usgs-mineral-deposit \
  --pdf required --verapdf required
```

Exit 0 on the first full run. Verdict
`pdf_generated_validation_passed_review_required`.

## Results

| Check | Result |
| --- | --- |
| PDF/UA-1 (veraPDF) | **PASS, 0 failed rules, identifier claimed and earned** |
| outputTextRecall | **1.0** (16,584 plan tokens) |
| sourceTextRecall | **0.9683** (530 of 16,734 tokens missing) |
| static HTML audit | clean (0 errors, 0 warnings) |
| tagged PDF | 2,330,768 bytes, 0 blocked network requests |

**The 0.9683 is this document's ceiling under the disclosed-furniture
policy**, same shape as the i1040's 0.9349 slug ceiling. The top missing
tokens are exactly: the running head ("deposit/teacher/guide/life/cycle"
×16-17 = the title on every even page), "hands/activities" (the section
running head on odd pages), folio digits, and hyphenation fragments
("min", "ing", "com", "tion") whose joined forms ARE carried — the source
breaks words at line ends and the extractor keeps the fragments. Do not
chase this number toward 1.0.

## What the plan carries (452 blocks, 13 review notes)

- 17 image blocks, every one content-bearing with authored alt text.
  Two figures carry text that exists NOWHERE in the PDF text layer (the
  Activity 6 tin-man's 10 element labels; the Activity 7 jester-mask's 6
  cosmetic-word labels) — their alt text is the only machine-readable
  carrier, and the generator GATES on every label being present.
- Figures 5/7/8/9 are vector pictures of text/tables in the source;
  rebuilt as real blockquotes and real tables (machine-readable), spanned
  headers flattened into column names.
- 8 tables; the generator gates worksheet arithmetic (A×B=C, C+D=E,
  column E totals 12,772.77) so a transcription typo cannot survive.
- Source data inconsistency carried as printed and disclosed: figure 6
  says Salt 29,336 lbs; worksheets say 32,061.
- Source numbering embedded in list text (the Activity 10 list skips
  item 8 in the source itself).

## Asset preparation (documented for reuse)

The 16 content rasters total 3.20 MB in the source — over the 4 MiB
base64 budget. They were downscaled from print to screen resolution
(scratch tool `process_assets.cjs`, Chromium canvas): luminosity soft
masks composited and flattened onto white (the jester-mask oval, the
orange, pennies, cards, gold pan, figure 6), the figure 4 raster rotated
upright (stored rotated 90° for its landscape page), and the vector-only
tin-man cropped from a page render. Final: 17 assets, 1.34 MB, ~1.78 M
base64 chars. Every composite was verified by eye before embedding.

## Independent verification (two-model rule)

`verify-init` derived 389 items (40 page, 38 heading, 58 list, 8 table,
17 image_alt, 203 inline_style, 21 inline_link, 4 global).

**First reading (`verify-worksheet-filled.json`): 382 verified / 7
discrepancies / 0 unreadable.** All seven were authoring flaws, no
content invention: one added bold ("Cover." in the imprint prints
roman), the undisclosed flattening of table 3/4 spanner rows, the
dropped preprinted "$" prompts in both blank worksheets, and the two
global roll-ups (which also named the composed "(completed example)"
captions as undisclosed). Everything else held, including both
label-carrying alt texts word-for-word and all worksheet arithmetic.

**All seven fixed at the generator**; the corrected plan re-passed the
full e2e (this directory's artifacts are the corrected build: UA-1 PASS,
0 failed rules, outputTextRecall 1.0, sourceTextRecall 0.9685/527
missing — same furniture, three tokens reclaimed by the caption
extension). `verify-worksheet-v2.json` re-derived 388 items (the removed
bold run deletes one inline_style item); 376 unchanged attestations
carried by content-key transplant; a second fresh-context reader
re-attested the 12 open items (4 corrected tables, 4 globals by design,
4 lists whose v1 notes were multiset-ambiguous). Outcome in
`verify-worksheet-v2-filled.json` + `verification-report.json`, and in
ROUND-12.md.
