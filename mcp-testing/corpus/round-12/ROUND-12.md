# Corpus refinement — Round 12 (2026-08-10)

**Focus: the alt-text-at-volume authoring exercise** (queued since round
4) — a full-fidelity rebuild of a 40-page, figure-heavy USGS teacher's
guide in which every image is content-bearing and two figures carry text
that exists nowhere in the PDF text layer. Plus one engine honesty fix.
**Cost: $0 in API fees.** Engine 0.2.5.

## 0. The document is not what the corpus says it is

`figures/usgs-water-cycle.pdf` is really **USGS General Information
Product 17, "The Life Cycle of a Mineral Deposit—A Teacher's Guide
for Hands-On Mineral Education Activities"** (2005; 40pp; 10 classroom
activities, 9 figures, 4 tables, glossary, minerals-uses appendix). The
manifest name is a misnomer, presumably from the `gip/…` URL and the
word "cycle". A happy accident: a grades 5-8 teacher's guide is a better
match for this project than a poster would have been. The file keeps its
catalogued name (sha256 pinned); the plan's first review note records the
identity.

## 1. Engine 0.2.5: audit-source no longer invents form fields

`audit-source` flagged this booklet "Interactive form fields are present"
while the remediate gate, correctly, let the same file through. Cause:
the audit used a raw `/AcroForm` byte scan, while the gate uses
`_has_interactive_fields` (round 4: empty `/Fields[]` shells left by
authoring tools are NOT forms — this PDF has exactly that, plus zero
Widget annotations). The audit now uses the same detector. One command
claiming a defect that the pipeline's own gate disproves is precisely the
kind of dishonesty the corpus loop exists to catch.

## 2. The alt-text-at-volume rebuild (the round's core)

Plan: `plans/usgs-mineral-deposit/gen_plan.py` → 452 blocks, 13 review
notes, **17 image blocks, all content-bearing, all with authored alt
text** written from looking at the actual images. Highlights of what
"alt text at volume" turned out to mean in practice:

* **Two figures are the sole carriers of their own text.** The Activity 6
  tin-man (vector art, no raster to extract) is labeled with 10 element
  names; the Activity 7 jester-mask photo has 6 cosmetic words baked into
  the raster. Neither string set exists in the PDF text layer — if the
  alt text drops a label, the rebuild silently loses content no recall
  metric can see. The generator gates on every label appearing in the alt.
* **Information-dense figures got information-dense alt**: figure 6
  (© Mineral Information Institute, used with permission — credit
  preserved) lists all fifteen labeled quantities and the 3.5-million-pound
  total; figure 1A carries its fifteen diagram labels; figure 1B walks the
  rock cycle's stations, processes, and rock lists.
* **Pictures of text became text.** Figures 5, 7, 8, and 9 are vector
  drawings of flash cards and worksheets. Rebuilt as real blockquotes and
  real tables (spanned headers flattened into column names) instead of
  images-with-alt — machine-readable beats described. The worksheet pages
  (30-32) extract as mojibake (no usable ToUnicode on those fonts), so the
  visual read was the only reliable source for them.
* **Arithmetic as a transcription gate**: the completed-worksheet tables
  must satisfy A×B=C, C+D=E per row, and column E must total the printed
  $12,772.77 — the generator refuses to write a plan with a typo'd cell.
  The gate also surfaced a genuine SOURCE inconsistency, carried as
  printed and disclosed: figure 6 says Salt 29,336 lbs/lifetime, the
  worksheets say 32,061.
* **The 4 MiB embedded-image budget bit for the first time.** The 16
  content rasters total 3.20 MB (4.3 M base64 chars). Authoring-side
  answer, not an engine change: downscale print-resolution images to
  screen resolution, composite the six luminosity-soft-masked photos onto
  white (the jester oval actually needs its mask), rotate the
  stored-rotated figure 4 upright, crop the vector-only tin-man from a
  page render. 17 assets, 1.34 MB, every composite checked by eye.

Result, first full run: **exit 0 under `--pdf required --verapdf
required`, PDF/UA-1 PASS (0 failed rules, identifier earned),
outputTextRecall 1.0, sourceTextRecall 0.9683 = this document's
furniture ceiling** (running heads ×17 even pages + section heads + folios
+ hyphenation fragments whose joined forms are carried). Run record:
`runs/usgs-mineral-deposit/NOTES.md`.

## 3. Independent verification (two-model rule)

`verify-init` derived **389 items** — including 203 individual
inline-style attestations (the item class that caught the i1040's three
emphasis bugs) and 17 image_alt items with look-at-the-image
instructions.

**First reading: 382 verified / 7 discrepancies / 0 unreadable.** The
reader rendered all 40 pages, aligned every worksheet item to its block,
and adjudicated emphasis with high-zoom crops plus a font-face dump. What
held up: both label-carrying alt texts word-for-word (tin-man's 10
elements, jester's 6 cosmetic words, including the clockwise-order
claim), figure 6's fifteen quantities, every preserved source typo, the
no-item-8 list, all 21 links, and all worksheet arithmetic. The 7 real
findings, all authoring flaws, none content-invention:

1. `emphasis-008` — the plan bolded the imprint's "Cover." label;
   the source prints it roman. The one added-emphasis error in 203
   styled runs.
2. `table-003` / `table-004` — the spanner rows of tables 3 and 4
   ("National Science Content Standards" over A–G; "ELEMENT" over
   Name/Symbol) were flattened away UNDISCLOSED and their text carried
   nowhere.
3. `table-005` / `table-006` — the blank worksheets' preprinted "$"
   currency prompts were dropped undisclosed.
4. Two global roll-ups of the above (completeness, review-note accuracy),
   which also named two undisclosed transformations: the composed
   "(completed example)" captions and the added bold.

**All fixed at the generator** (bold removed; table 3's spanner carried
by a disclosed caption extension; table 4's folded into "Element
Name"/"Element Symbol"; "$" prompts carried as cell values; two new
review notes disclosing header flattening and composed captions), the
corrected plan re-passed the full e2e (UA-1 PASS, 0 failed rules,
outputTextRecall 1.0, exit 0), and a second fresh-context reader
re-attested the changed items against the corrected build (12 items: the
four tables, all four globals by design, and four list items whose v1
attestations could not be carried unambiguously; the other 376
attestations carry byte-identical by content-key transplant).

**Second reading: all 12 open items verified — `verify-check`
result: "verified", 388/388, 0 discrepancies**
(`verification-report.json` in the run dir). The second reader confirmed
binding hashes before trusting anything, re-read the corrected tables
cell-for-cell, sampled nine pages line-by-line for the completeness
attestation, and confirmed all 15 review notes describe exactly what the
build does. The protocol's full chain — author → conform →
independently verify → fix at the generator → re-verify clean —
has now run end-to-end twice (i1040 126pp, GIP-17 40pp).

## Scoreboard addition

| Document | UA-1 | srcRecall | outRecall | Verification |
| --- | --- | --- | --- | --- |
| USGS GIP-17 mineral-deposit guide (40pp, 17 images) | PASS | 0.9685* | 1.0 | 388/388 verified |

\* disclosed furniture ceiling (running heads, folios, hyphenation
fragments); triaged token-by-token in the run NOTES.

## What the exercise taught (why alt-text-at-volume was its own round)

1. **Alt text can be the only carrier.** Recall metrics are blind to
   raster-only and vector-only text; the discipline that works is a
   generator GATE listing every label that must appear in the alt.
2. **The embedded-image budget is an authoring constraint, not an engine
   defect.** Print-resolution sources overflow 4 MiB; screen-resolution
   re-encodes with mask compositing preserved appearance at 42% of the
   raw source bytes.
3. **"Pictures of text" divide into carriers and describers.** Worksheets
   and card templates became real tables/blockquotes; photographs and
   diagrams stayed images with information-dense alt.
4. **The verifier catches what self-review cannot.** All 7 first-reading
   discrepancies were authoring choices I believed were fine (added
   label bold, silent spanner flattening, dropped "$" prompts) — the
   same lesson as i1040's 19, at 40-page scale.

## Still queued

* The splitter region-classifier round (round-10 ROUND-10.md, fixture
  pages 105/121/124/125; five rejected policies recorded there — do not
  retry those constants).
