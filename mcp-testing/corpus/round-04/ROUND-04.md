# Corpus refinement — Round 4 (2026-08-03)

**Focus:** the hardest document types yet — images with alt text, a real bordered
table, a redacted region, and the safety-refusal path. **Cost: $0 in API fees.**
Suites 22/22 green, packages resynced.

## Flagship: FDA / AstraZeneca PREA letter (runs/fda-nexium/)

A 7-page regulatory letter that exercises five paths no previous corpus document
touched: **an embedded image with alt text** (no plan had ever contained an image
block), a bordered 4-row data table with an in-cell footnote marker, a
**FOIA-redacted grey block** hiding four bulleted items, lettered a)/b) list
markers, and multi-line address/signature blocks.

```
verdict:           pdf_generated_validation_passed_review_required
veraPDF PDF/UA-1:  PASS (0 failed rules), identifier claimed and earned
sourceTextRecall:  0.9099   (missing = the 6 dropped running heads + extractor
                             word-joining artefacts; verifier-confirmed)
outputTextRecall:  1.0
verification:      25/25 verified, 0 discrepancies — after SIX independent passes
```

## The headline result is the verification loop, not the artifact

The independent verifier **found real problems on five consecutive passes**, every
one of them in my authored review notes, and every one caught by reading the PDF
bytes rather than trusting my reading of the pages:

| Pass | What it caught |
| --- | --- |
| 1 | 4 substantive errors: claimed the e-mails were live hyperlinks (the source has **zero** link annotations); claimed a cross-page sentence rejoin that does not exist; claimed multi-line blocks kept their line breaks when HTML was collapsing them; two undisclosed syntheses (h1, table caption) |
| 2 | Confirmed all 4 fixed; caught "all three e-mails underlined" — only 2 of 3 are |
| 3 | Caught inline bold/italic dropped document-wide and undisclosed, naming the page-2 italic-quotation loss |
| 4 | Caught the new disclosure over-claiming exhaustiveness — a second unmarked italic run exists on page 4 |
| 5 | Caught "the source prints those fragments in capitals" — one of the two is mixed case and carried verbatim |
| 6 | **25/25 verified, 0 discrepancies.** Converged. |

The pattern is the finding: each pass drove the error from *substantive falsehood*
to *wording precision*, and the terminal lesson is that **a prose disclosure must
not claim exhaustiveness it cannot mechanically verify**. The fix that finally
converged was to make the emphasis list explicitly illustrative and tell the
reader to consult the original for the complete set.

This is the strongest available evidence that the two-model rule is not
ceremonial. An unverified rebuild of this document would have shipped four false
claims in its own honesty notes.

## Defects found and fixed (engine improvements 11-15)

| # | Defect | Caught by | Fix |
| --- | --- | --- | --- |
| 11 | Literal strings decoded per-byte regardless of font: a 2-byte Identity-H composite font produced pure binary garbage | FDA letter at 0.39 source recall | shared `_decode_font_bytes`, used by both literal and hex paths |
| 12 | Code length taken from the ToUnicode codespacerange, breaking every simple font whose generator wrote `<0000><FFFF>` | civics doc regressing 2980 → 271 tokens during the #11 fix | code length now comes from the **font subtype** (Type0 = 2 bytes, else 1) |
| 13 | `<figure>` wrapper became a second `/Figure` structure element with no `/Alt` → PDF/UA-1 clause 7.3-1 failure on every captioned image | first-ever image block | emit `<div class="alloflow-figure">` + `<img alt>` + `<p>` caption bound by `aria-describedby` |
| 14 | Newlines inside paragraphs, table cells and list items collapsed on render, so address blocks read as run-on lines | verifier pass 1 | `esc_lines()` renders intentional line breaks as `<br>` (also fixes the round-1 flattened table cells) |
| 15 | `outputTextRecall` counted image alt text as missing, because alt lives in `/Alt`, not visible page content | FDA letter at 0.9992 | output recall compares against plan text **excluding** alt |

## Safety finding: the blocked-type gate was purely declarative

Probing the refusal path exposed a real hole. Declaring the 1954 Form 1040
honestly as `document_type: "form"` was refused correctly — but **relabelling a
fillable form as `"report"` bypassed the gate completely** and the tool cheerfully
rebuilt it.

The gate now cross-checks the source: a PDF carrying genuine interactive fields is
refused regardless of what the plan declares. Getting this right required care —
the first attempt refused the FDA letter too, because Word and Acrobat leave an
**empty** `/AcroForm` behind on ordinary prose. Detection now requires a non-empty
`/Fields` array or a real `/Widget`, and is regression-tested across six corpus
documents (1 true form, 5 non-forms, 0 errors).

Honest limit: this catches **digital** forms only. The 1954 document is a *scan* of
a form and carries no machine-detectable fields, so classifying it still depends
on the reader. The gate is now defence-in-depth, not a guarantee.

## Scale: measured, not guessed

`irs-i1040-instructions` (126 pages) against the engine's actual caps:

| Measure | Value | Cap | Headroom |
| --- | --- | --- | --- |
| Extracted characters | 649,123 | 2,000,000 | 68% free |
| Paragraph-scale runs | ~2,579 | 5,000 blocks | ~48% free |
| Estimated HTML bytes | ~876 KB | 8 MB | 90% free |

**The engine is not the constraint at 126 pages.** The binding constraint is model
reading and plan-authoring time, exactly as round 3 predicted. A document of this
size needs a multi-session, generator-driven authoring protocol — not a bigger cap.

## Cumulative scoreboard after 4 rounds

| Document | Type challenge | UA-1 | src recall | out recall | Verified |
| --- | --- | --- | --- | --- | --- |
| High Impact Reports (8pp) | pure scan, tables, sidebars | PASS | n/a (scan) | 1.0 | 51/51 |
| UDHR English (8pp) | cross-page joins, ordered lists | PASS | 1.0 | 1.0 | 57/57 |
| UDHR Spanish (9pp) | non-English, subset fonts | PASS | 1.0 | 1.0 | 58/58 |
| USCIS civics (11pp) | 4-level Q&A, furniture, asterisks | PASS | 0.76* | 1.0 | 228/228 |
| FDA PREA letter (7pp) | image+alt, table, redaction, letterhead | PASS | 0.91* | 1.0 | 25/25 |

\* fully explained disclosed furniture; verifier-confirmed zero content loss.

**5 documents · 5 UA-1 passes · 419/419 verification items · 15 engine improvements ·
$0 in API fees.**

## Round 5 queue

1. `nces-condition-of-education` (54pp) or `nist-cyber-framework-quickstart`
   (32pp) — multi-figure reports; the first alt-text-at-volume exercise, using
   `extract-images` to reuse source figures.
2. Image extraction gap: 32 of 152 Artemis figures skip with
   "Unsupported filter chain: /FlateDecode" — these carry `/DecodeParms`
   predictors. Implementing PNG predictor undo would close it.
3. Inline emphasis and inline links remain unrepresentable in the plan format.
   Both are now disclosed per-document; a schema extension is the real fix and
   should be weighed against keeping the format small.
4. `irs-i1040-instructions` — the multi-session authoring protocol itself.
