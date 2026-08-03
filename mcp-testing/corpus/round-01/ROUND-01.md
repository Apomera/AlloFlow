# Corpus refinement — Round 1 (2026-08-03)

**Pathway under test:** `alloflow-portable-remediation` (no-key). **Cost: $0 in API fees.**
**Corpus:** 11 public-domain documents (see ../MANIFEST.json) in three bands:
8 born-digital, 2 scanned/historical, 1 form. Sizes 64 KB – 77 MB, English + Spanish,
plus a 126-page instruction book and a 74-page NASA report.

## What ran

1. Deterministic sweep over all 11: `audit-source` + `extract-text`
   (`baseline.json` = before fixes, `baseline-v2.json` = after).
2. Full remediation + independent verification on one born-digital target
   (UDHR English, `runs/udhr-english/`).
3. Blocked-type probe on one form (1913 Form 1040).

## Defects found and fixed this round (all in the portable engine)

The corpus caught **five real bugs in one round** — four in the extractor, one in the
recall metric. Every fix is regression-covered by the existing suites (22/22 green).

| # | Defect | Caught by | Fix |
| --- | --- | --- | --- |
| 1 | Lazy `<<.*?>>` regex truncated any PDF dictionary containing a nested dict, silently dropping keys like `/Contents` | v2 tagged output extracting 0 tokens | balanced `<<>>` scanning in the object walk |
| 2 | `audit-source` pageCount used a raw byte regex; over-counted on incrementally-updated files (revised page objects appear twice) and appearance streams | UDHR: 10 reported, 8 real | count distinct page object numbers via the object walk |
| 3 | Strict `zlib.decompress` rejected every stream whose `/Length` is an indirect reference (trailing bytes after the deflate data) | 1913 Form 1040: all content streams unreadable | `decompressobj`, tolerant of trailing bytes |
| 4 | `/Contents N 0 R` pointing at an **array object** of stream refs was never resolved (dict-only object walk) | 1913 Form 1040: text layer invisible | raw-byte resolution of array objects; also added Form-XObject recursion with per-XObject font resolution |
| 5 | Source-recall counted ordered-list numerals as "missing" (they are carried structurally by `<ol>`) | UDHR recall 0.9821 with all 32 missing tokens being bare digits | `_plan_text` emits list positions; recall now compares semantics |

Also fixed: `audit-source`'s text detection matched bare `BT` in vector line-work;
it now requires an actual show operator with operand (`)Tj`, `]TJ`, …).

## Corpus surprises (why internet documents beat synthetic fixtures)

- **The "1913 scan" is not a scan.** It is the IRS print-master: page images plus a
  hidden vector text layer of printer specifications ("INSTRUCTIONS TO PRINTERS",
  margin specs). 2,424 tokens recovered after fixes 3+4. A remediation pathway must
  expect documents that are simultaneously scanned and text-bearing.
- **The 1954 form is a true pure scan** (0 tokens, no show operators) — the honest
  negative case, correctly reported after the text-detection fix.
- **The UDHR PDF carries an incremental update** (two revised page objects) — the
  same structure our own finalizer emits, present in the wild.

## Flagship result: UDHR English (runs/udhr-english/)

```
verdict:           pdf_generated_validation_passed_review_required
veraPDF PDF/UA-1:  PASS (0 failed rules), identifier claimed and earned
sourceTextRecall:  1.0   (1,783 source tokens — measured, not self-reported)
outputTextRecall:  1.0   (tagged PDF carries every plan token)
verification:      57/57 items attested by a fresh-context verifier
                   (headings, all 13 ordered lists cell-by-cell, page attributions,
                   3 cross-page rejoins, the verbatim "Article I" quirk)
```

Every rigor channel agreed independently. This is the full-rigor template for
future corpus rounds.

## Blocked-type probe

A `document_type: "form"` plan against the 1913 Form 1040 was refused by plan
validation with the exact intended message ("Automatic rebuild is blocked for
forms, signed records, and legal records."). Gate works on real-world input.

## Known gap carried forward (backlog for round 2)

1. **Object streams / xref streams (PDF 1.5+ compressed objects).** `nist-hb44`
   (77 MB) reports 0 pages and 0 tokens: its page dictionaries live inside
   `/ObjStm` streams the byte-walk cannot see. This is the single largest
   extractor blind spot; fix = inflate ObjStm streams and index their embedded
   objects. Until then, such documents fall back to host-model reading (which
   still works — extraction is a rigor channel, not a prerequisite).
2. **Language flags on real documents:** UDHR (both languages), USCIS civics,
   and IRS f1040 all lack a declared language — common enough that the keyed
   pipeline's language handling deserves a corpus round of its own.
3. **Remediation targets queued:** `irs-i1040-instructions` (126 pp, untagged,
   370k tokens — a stress test for plan size limits), `ohchr-udhr-spanish`
   (Spanish plan + `variant` exercise), `uscis-civics-100q` (Q&A structure).

## Verdict on the loop itself

One round, one afternoon, zero API spend: 5 engine bugs fixed with regression
coverage, 1 honesty gate validated on real input, 1 fully-verified flagship
rebuild, and a concrete backlog. The refinement loop works as designed.
