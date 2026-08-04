# IMPLEMENTED (2026-08-04): content-stream text extraction inside the app pipeline

Status update: implemented the same day, in doc_pipeline_source.jsx, as scoped
below - with one design change discovered during implementation. The original
plan gated on whole-page character equality; that failed on ordering (the
content-stream pass reads stream order, pdf.js items are re-sorted, so a moved
footer made identical pages compare unequal). The shipped design is a
PER-SPACE ORACLE: each pdf.js space is dropped only when the content-stream
text contains the junction's surrounding characters (up to 4 per side, min 5
total) contiguous and unspaced, and never contains the same junction spaced.
Deletion-only, junction-anchored, order-independent; characters are never
touched. Form XObjects are recursed (the USCIS footnote lives in one - the
1913 lesson repeated).

Measured results (MCP connector vs portable referee):
  uscis-civics  44 -> 11 fragment sites; "permanent resident of the United
                States" extracts correctly for the first time
  fda-nexium    20 -> 3
  1913 master   23 -> 7
  4 already-perfect documents: unchanged at jaccard 1.000, zero glued words
  anywhere. Residue = junctions the oracle finds ambiguous or the byte-level
  pass cannot decode; deletion-only conservatism keeps them spaced.

Regression: tests/e2e/artifacts/kern-split.fixture.pdf (crafted; kern -110
makes pdf.js read "le gal" in ONE item) + driver e2e asserting repair fires
and real spaces survive. Original scoping analysis kept below for the record.

# Original scope (superseded): content-stream text extraction inside the app pipeline

## What remains broken and where

pdf.js (vendored 3.11.174 AND current 6.2.108 - measured, see
mcp-testing/tools/pdfjs_probe.mjs) inserts spurious spaces INSIDE the text
items it emits for some kerned documents: "legal p ermanent resident of the
U nited S tates" arrives as a single item. The geometry-aware join (committed
67a4c022b) fixed everything BETWEEN items; nothing outside pdf.js can fix what
happens inside one. Affected corpus documents: uscis-civics, fda-nexium,
irs-f1040-1913 (44/20/23 fragment sites respectively).

## Why the fix is NOT in the MCP connector

The connector's design premise is transport-not-reimplementation ("if you find
yourself writing remediation logic in the connector, stop"). A Node-side
second extractor would make the connector's output diverge from what the app
actually does - the exact property the connector exists to test. Rejected.

## Where the real fix goes

doc_pipeline_source.jsx: extractPdfTextDeterministic gains a content-stream
extraction pass (the algorithm the portable engine already proves out:
per-font ToUnicode decode, TJ kern threshold ~0.15em, line operators as
breaks) and reconciles it with the pdf.js text: same token sequence -> prefer
the content-stream spacing. The portable implementation in
alloflow_portable.py (_pdf_extract_text and helpers, ~400 lines of Python) is
the reference; the port must run inside the browser context on a Uint8Array.

## Why it is deferred rather than done

- It rewrites the "ground truth every downstream stage inherits" for every
  document the app touches; a regression corpus and A/B recall measurement
  against the portable referee must gate it.
- The reconciliation rule (when do we trust which extractor?) needs design:
  a token-sequence-equality precondition is safe but must be measured for how
  often it actually fires.
- Estimated as a full session with its own round report.

Prerequisites already in place: the referee extractor, the corpus, the
fragment-site counts above, and the regression test pattern from the join fix
(tests/mcp_driver_scripted_e2e.test.js).
