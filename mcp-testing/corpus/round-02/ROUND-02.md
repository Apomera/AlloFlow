# Corpus refinement — Round 2 (2026-08-03)

**Focus:** the ObjStm blind spot from round 1, plus the first multilingual full
remediation. **Cost: $0 in API fees.** Suites 22/22 green, packages resynced.

## Defects found and fixed

| # | Defect | Caught by | Fix |
| --- | --- | --- | --- |
| 6 | PDF 1.5+ object streams invisible: page dicts, fonts, and catalogs compressed inside `/ObjStm` were never indexed | nist-hb44 (77 MB): 0 pages, 0 tokens | expand each ObjStm container and yield its embedded dictionary objects |
| 7 | Literal strings decoded as latin-1 regardless of font: subset fonts remap codes arbitrarily | UDHR Spanish: every accented letter typed through a 6-glyph subset font whose "(!)" means "ó"; recall stuck at 0.82 with tokens like "declaraci"+"n" | decode literals through the current font's single-byte ToUnicode CMap |

Fix 6 results: nist-hb44 went **0 → 573 pages, 213,005 tokens in 6.9 s**. A side
effect improved two other documents: i1040 and Artemis token counts *dropped*
(370k → 133k; 24k → 17k) because their fonts, previously invisible inside
ObjStm, now decode properly — the delta was latin-1 garbage, verified by
sampling readable text. Corpus lesson: a token count going down can be a
correctness improvement; always sample.

## Flagship: UDHR Spanish (runs/udhr-spanish/) — first multilingual full-rigor rebuild

```
verdict:           pdf_generated_validation_passed_review_required
veraPDF PDF/UA-1:  PASS, identifier claimed and earned, lang=es
sourceTextRecall:  1.0   (1,959 tokens incl. every á é í ó ú ñ)
outputTextRecall:  1.0
verification:      58/58 items attested by a fresh-context verifier
                   (word-for-word identical text incl. accents; all 4 disclosed
                   transformations executed exactly as described)
```

Structural differences from the English rendering handled and disclosed:
Artículo 2 as two paragraphs, an adoption line under the title, a cross-page
paragraph rejoin (Art. 10), and two page-straddling lists (Art. 14, 29).

## Running defect tally across both rounds

7 real engine bugs found and fixed by 11 internet documents in two rounds, each
with a regression story. Nothing was found by the synthetic fixtures first.

## Carried to round 3

1. `irs-i1040-instructions` — 126-page untagged instruction book; stress test
   for plan authoring at scale (likely needs a chunked/multi-session authoring
   protocol; plan block cap is 5,000).
2. `uscis-civics-100q` — Q&A structure; candidate for a heading-vs-list
   structure decision study.
3. Minor: extraction emits an occasional lone surrogate from malformed
   UTF-16 CMap entries (seen once in i1040); harmless to recall, but
   `_parse_tounicode` could sanitize with surrogate filtering.
4. Scanned band still needs its own full remediation exercise (the 1954 pure
   scan) — vision-read plan + verifier, no recall channel available.
