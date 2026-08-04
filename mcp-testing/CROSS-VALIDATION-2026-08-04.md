# Cross-validation: MCP connector vs portable pathway (2026-08-04)

The two pathways are **independent implementations**. Pointing the MCP connector's
keyless tools at the portable pathway's output is therefore real corroboration,
not self-agreement: separate code reaching veraPDF, separate text extraction,
separate accessibility engines. Disagreement means one of them is wrong.

No Gemini key was used or needed. Every tool below is keyless.

## A. PDF/UA-1 verdict — two independent paths to veraPDF

| Document | MCP connector | Portable engine | |
| --- | --- | --- | --- |
| High Impact Reports (scan, 8pp) | compliant, 0 failed rules | compliant, 0 failed rules | AGREE |
| UDHR English (8pp) | compliant, 0 failed rules | compliant, 0 failed rules | AGREE |
| UDHR Spanish (9pp) | compliant, 0 failed rules | compliant, 0 failed rules | AGREE |
| USCIS civics (11pp) | compliant, 0 failed rules | compliant, 0 failed rules | AGREE |
| FDA PREA letter (7pp) | compliant, 0 failed rules | compliant, 0 failed rules | AGREE |

**5/5 agreement, zero failed rules.** The PDF/UA claim is no longer resting on a
single implementation.

## B. Independent accessibility audit — axe-core AND IBM Equal Access

`audit_two_engines` runs two industry-standard engines over the portable
pathway's HTML:

| Document | axe violations | Equal Access fail-violations | Engine disagreements |
| --- | --- | --- | --- |
| High Impact Reports | 0 | 0 (score 92) | 0 |
| UDHR English | 0 | 0 (score 94) | 0 |
| UDHR Spanish | 0 | 0 (score 96) | 0 |
| USCIS civics | 0 | 0 (score 92) | 0 |
| FDA PREA letter | 0 | 0 (score 88) | 0 |

**Zero violations from either engine on any document, and the two engines never
disagreed.** This is external validation by tools the project does not own.

## C. Structure check (MCP `check_document_structure`)

| Document | Headings | Skips | Missing h1 |
| --- | --- | --- | --- |
| High Impact Reports | h1:1 h2:2 h3:6 h4:13 h5:5 | 0 | no |
| UDHR English | h1:1 h2:31 | 0 | no |
| UDHR Spanish | h1:1 h2:31 | 0 | no |
| USCIS civics | h1:1 h2:3 h3:9 **h4:100** | 0 | no |
| FDA PREA letter | h1:1 h2:3 h3:3 | 0 | no |

Exactly one h1 everywhere, no skipped levels. The 100 h4s are the 100 civics
questions, confirming the question-per-heading decision survived to the output.

`detect_form_fields` correctly found 0 form blanks in all five (they are prose).

## D. Defect found in the PORTABLE engine — fixed

`extract-text` reported `characters: 3` for a pure scan (the 1954 Form 1040),
because a document with no text layer still yields the per-page newline joins.
The MCP's independent extractor reported `0` for the same file, which exposed it.
Overstating "3 characters recovered" where nothing was recovered is exactly the
kind of small dishonesty this project exists to avoid. Fixed: a whitespace-only
extraction now collapses to a true `0`, and the two engines agree.

## E. Defect found in the APP PIPELINE — reported, NOT fixed

**The app's deterministic PDF text extraction fragments words.**

Evidence, from the same source document (USCIS civics, page 1 footnote):

```
MCP connector : "...have been a legal p ermanent resident of the U nited S tates for 20 or more"
portable      : "...have been a legal permanent resident of the United States for 20 or more"
```

Split-word instances in that single 11-page document: **44 via the connector, 0
via the portable extractor.** Across the corpus the connector consistently
recovers fewer usable tokens (USCIS: 2,783 vs 2,980), and the surplus tokens on
the connector side are fragments: `u`, `nited`, `s`, `tates`, `p`, `ermanent`,
`j`, `ust`.

Root cause — `doc_pipeline_module.js:10513`:

```js
const pageText = items.map(i => i.str || '').join(' ').replace(/\s+/g, ' ').trim();
```

Every pdf.js text item is joined with a space, but pdf.js emits separate items
for kerned glyph runs *within* a word, so any kerned pair splits. The portable
extractor avoids this by joining consecutive show operators with no separator and
breaking only on real line operators.

Why it matters: the comment three lines above this call calls the result "ground
truth every downstream stage inherits". Fragmented words degrade the audit, the
AI fix passes, and any search or semantic analysis built on that text.

**Not fixed here, deliberately.** This is the live app's core extraction; the
module is compiled from `doc_pipeline_source.jsx` by the build watcher, is
mirrored, and is covered by deploy gates. A wrong fix degrades every document the
app touches. The fix wants a real gap test (compare each item's x-advance against
the next item's origin, insert a space only on a genuine gap, newline on `hasEOL`)
plus a regression corpus. Worth doing, worth doing carefully, and worth Aaron
deciding when.

## Conclusion

Every claim the portable pathway makes about its five reference documents now has
independent corroboration: PDF/UA from a second veraPDF path, WCAG from two
third-party engines, structure from a separate checker. The cross-check also paid
for itself twice, finding one defect in each pathway.
