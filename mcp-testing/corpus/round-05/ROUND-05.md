# Corpus refinement — Round 5 (2026-08-03)

**Focus:** closing the two format-level gaps round 4 surfaced — inline emphasis
and predictor-encoded images. **Cost: $0 in API fees.** Suites 25/25 green.

## 1. Inline emphasis: the format gap the verifier flagged twice

Rounds 3 and 4 both ended with the same finding: the plan format had no inline
bold or italic, so a passage that the source set in italics *as a quotation
without quotation marks* read in the rebuild as ordinary narration. The verifier
called this out as real meaning loss on two separate documents. It is now
implemented.

**Design — strictly additive, so it cannot corrupt content.** Paragraphs and
blockquotes take an optional `runs` array; lists take `item_runs` (one entry per
item). Each run is `{text, style}` with style `normal | emphasis | strong`.
`text` remains the authoritative content, and **validation rejects any plan
whose runs do not concatenate to it exactly**. Styling can therefore never add,
drop, or alter a character, and every recall and verification measurement keeps
measuring the same text whether or not styling is present.

The verification worksheet grew a matching item kind: `inline_style` items list
the spans the plan marks emphasised and ask the verifier to check them against
the source's actual fonts — so styling is checked, not merely asserted.

## 2. Making inline emphasis survive PDF/UA — two structure-tree repairs

Adding `<em>`/`<strong>` immediately broke UA-1 conformance in two distinct
ways, both requiring structure-tree surgery in the finalizer:

| Rule | Cause | Fix |
| --- | --- | --- |
| 7.1-5 | Chromium emits `/Em` and `/Strong`, which are **not standard PDF structure types**, and writes no `/RoleMap` | finalizer adds `/RoleMap <</Em /Span /Strong /Span>>` to the StructTreeRoot |
| 7.2-20 | "LI may contain only Lbl and LBody" — Chromium **never emits `/LBody` at all**, so any inline element inside `<li>` becomes a direct child of `/LI` | finalizer inserts the missing `/LBody`, moving every non-`Lbl` child into it and re-parenting |

The second one is worth recording as a method note. I probed five `<li>` markup
variants (inline, span-, div-, p-wrapped, and a plain control) against veraPDF
before writing any code: **all four styled variants failed identically and only
the plain control passed**, which proved no HTML-level wrapper could fix it and
that the repair had to happen in the PDF structure tree. The insertion moves
structure only — no content, MCIDs, or ParentTree entries change, so the page
content stream is untouched. After the fix all five variants pass, control
included (no regression).

## 3. Predictor-encoded images

32 of 152 figures in the NASA Artemis report were being skipped with
"Unsupported filter chain: /FlateDecode". The cause was over-conservatism rather
than a hard limit: the code skipped **any** image carrying `/DecodeParms`, but
`/Predictor` defaults to 1 (no prediction) when absent, and most of these images
had no predictor at all. Full PNG predictor support (Sub/Up/Average/Paeth) is now
implemented alongside that fix.

Result on Artemis: **120 → 139 figures extracted** (19 recovered), verified by
rendering one and reading it — a full page with crisp text and figures, not
plausible garbage. Remaining 13 skips are honest: 10 unsupported colour spaces
and 3 below the decorative-size floor. TIFF predictor 2 is rejected explicitly
rather than mis-decoded.

## 4. A test that was passing for the wrong reason

The first version of the new `runs` tests used a placeholder `source_sha256`.
Two "rejects invalid input" tests passed — but on the **plan/source binding
check**, never reaching the runs validation they claimed to test. Fixed to
compute the real digest of the fixture. Recording it because it is the same
failure class as a vacuous assertion: a red test that goes green for an unrelated
reason is worse than no test.

## Engine improvements this round (16-19)

| # | Improvement |
| --- | --- |
| 16 | Inline emphasis: `runs` / `item_runs`, additive-and-validated, with schema, renderer, worksheet coverage, and 3 regression tests |
| 17 | PDF/UA `/RoleMap` for non-standard `/Em` and `/Strong` structure types |
| 18 | PDF/UA `/LBody` insertion so list items may carry inline markup |
| 19 | PNG predictor support + correct `/Predictor` default, recovering 19 Artemis figures |

## Verification: three more passes, and the error class inverted

Styling had to be verified like everything else, and the verifier ran three more
passes on the FDA letter before converging:

| Pass | What it caught |
| --- | --- |
| A | **Five italic runs silently dropped** — a page-3 quoted protocol title, a page-4 quoted FDA guidance title, both page-4 quoted waiver-denial reasons, and a page-4 quoted statement. Plus one paragraph containing *two* italic runs where only one was styled, and a bold-italic "or" folded into an italic run. The note claiming completeness was false again. |
| B | Confirmed every emphasis run now reproduced — then caught the **opposite** error: spans were **over-inclusive**. The page-4 bullets italicised `", and`, which is the letter author's own connective, making it read as part of FDA's quoted words. Three quoted titles absorbed enclosing quote marks the source sets in roman. |
| C | Both fixed; caught the last one — the **opening** curly quotes of both waiver bullets are roman in the source and were still inside the `<em>`. |
| D | **35/35 verified, 0 discrepancies**, checked in both directions from a per-character font dump. |

The error class inverting from *under*- to *over*-inclusive is the useful signal:
after the first correction the remaining defects were no longer "content lost"
but "meaning added" — styling the author's own words as though they were quoted.
That is exactly the kind of subtle fidelity error a structural checker cannot
see and a second reader can.

The verifier also surfaced an undisclosed loss no one had asked about:
**superscript raise is not reproduced** (two registered-mark glyphs and the table
footnote asterisk render at normal size; characters preserved). Now disclosed.

**Open wording item, carried forward:** the final pass noted, without scoring it
a discrepancy, that the styling note says heading "bold and underline" are
conveyed by heading semantics, while `Module 1:` and `Module 5:` are bold with no
underline. Nothing is lost or added — the note is over-general. It is recorded
here rather than silently fixed, because correcting it changes the plan and would
invalidate the 35/35 stamp taken against these exact bytes.

## Flagship re-run: FDA PREA letter, now with styling

```
verdict:           pdf_generated_validation_passed_review_required
veraPDF PDF/UA-1:  PASS, 0 failed rules, identifier earned
structure:         12 LBody inserted, RoleMap present, pdfuaid present
sourceTextRecall:  0.9099 (unchanged — styling is additive, as designed)
outputTextRecall:  1.0    (unchanged)
styled blocks:     10, covering every emphasis run in the source body text
verification:      35/35 verified, 0 discrepancies (pass D)
```

Recall is byte-identical before and after styling, which is the additive design
working: styling changed how 10 blocks render without changing a character of
what they contain.

The review note that previously disclosed the styling *loss* was itself now
false and was rewritten to state what is carried and to name the two remaining
exceptions (table cells cannot carry styling; heading bold is conveyed by
heading semantics).

## Carried to round 6

1. Inline **links** remain unrepresentable inside paragraph text. Same shape of
   gap as emphasis was; the same additive-overlay design would work
   (`runs` entries gaining an optional `href`).
2. Table cells cannot carry inline styling — currently disclosed per-document.
3. 10 Artemis figures still skip on unsupported colour spaces (ICCBased,
   Indexed, Separation).
4. Untouched from earlier rounds: multi-figure alt-text-at-volume exercise
   (`nist-cyber-framework-quickstart`, `usgs-water-cycle`), and the
   126-page `irs-i1040-instructions` multi-session authoring protocol.
