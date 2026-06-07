# Garry Demo Email — Draft

**To:** Garry _<email>_
**Cc:** _(consider: Paul Cochrane if pre-cleared by Garry)_
**Subject:** Pipeline reliability demo — 3 documents, end-to-end

---

Hi Garry,

Per our last conversation about the PDF remediation pipeline needing to "work consistently before you'd be comfortable stewarding adoption" — here's what consistent looks like.

I picked three documents that represent the range UMaine actually deals with:

1. **_[doc 1 description]_** — an ordinary form/syllabus, the everyday case
2. **_[doc 2 description]_** — a complex-table document with merged-cell headers, the structural-correctness case
3. **_[doc 3 description]_** — a scanned non-Latin script document, the OCR + Unicode case

I ran each one through the pipeline end-to-end in one session. The attached screencast (5–8 min) walks through document 1 in full, then montages 2 and 3 to show the same flow repeats.

**Summary of results:** _(fill in from `docs/garry_demo_summary_template.md` after running the validator)_

| # | Document | Pipeline overall | Validator overall | Orphaned leaves |
|---|---|---|---|---|
| 1 | _name_ | _PASS / scores_ | _PASS / N pass, M fail_ | _0 / N_ |
| 2 | _name_ | _PASS / scores_ | _PASS / N pass, M fail_ | _0 / N_ |
| 3 | _name_ | _PASS / scores_ | _PASS / N pass, M fail_ | _0 / N_ |

The validator runs the same structural checks that PAC 2024 or Adobe's Accessibility Checker would flag — tagged-PDF tree, MarkInfo, /Lang, /Scope on table headers, /ActualText on cells, /Alt on figures, and content-linkage (the "no orphaned semantic elements" check that until last week we'd have failed).

A few things I'd want you to know upfront, before Paul's team puts it through whatever they put it through:

- This is **self-checked PDF/UA-1, advisory** — not a certification. The conformance report says so explicitly. If you want a formal compliance signoff, pair this with a Knowbility audit or run the exports through PAC 2024 / Acrobat Pro yourself; my offer stands to walk through whatever they flag.
- The reliability heuristics in the report (auditor agreement index, consistency heuristic) are **heuristic indices across AI passes**, not psychometric coefficients — the labels say "heuristic" everywhere they appear. We don't claim inter-rater reliability against expert verdicts.
- For scanned single-page PDFs, the tag tree currently uses **shared-MCID-0 linkage** — every semantic element points to the page-wrap MCID. Valid per PDF spec, passes PAC's orphaned-element check, but not maximally granular per-element. Per-leaf MCID granularity work is on the roadmap.
- The Canvas-mode pipeline is free (Google injects the API key); self-hosted deployment incurs Gemini Vision API costs at roughly $0.004–0.01 per call, ~32 calls per typical document. I'll surface that in deploy-mode docs separately.

**Asks:**

- Would Paul Cochrane's accessibility team be willing to run PAC 2024 (or Acrobat Pro Accessibility Checker) against the three attached exports? That's the independent check I can't do for them, and it's the one that matters for institutional adoption.
- Are there 5–10 representative UMaine documents you'd want me to run as a stress test? Different document types tend to expose different failure modes; happy to share both the pipeline output and the validator JSON for each.
- I have time _[day/morning/afternoon]_ for a live walkthrough on whatever document you want to throw at it. Bring a stack — I want to see what breaks before you do.

Appreciate you being honest about what wasn't working. The model name discoveries, OCR-layer fixes, and tag-tree work over the past two weeks were all directly downstream of that conversation, and the pipeline is meaningfully more reliable for it.

Best,
Aaron

---

## Attachments

- Screencast _(link or attached: ~5-8 min)_
- 3 exported tagged PDFs
- `validator-summary.json` (output of `dev-tools/demo/exported_pdf_validator.cjs --json --batch demo-pdfs/`)
- `docs/garry_demo_summary_template.md` filled out (optional — for if Garry wants the structured data)

---

## Draft notes (delete before sending)

- Tone: confident but caveated. Don't promise PDF/UA-1 compliance. Honest framing is the pitch.
- If Garry doesn't reply within 5 business days, the synthesis recommendation was a polite follow-up — don't assume silence is rejection.
- If Garry forwards to Paul Cochrane (likely), the asks are pre-written so Paul's team has a concrete entry point. Don't make them figure out what to test.
- Consider whether to mention the **AI Model Diagnostics panel** (in-app, behind the HeaderBar AI button) — it's the credibility-debt-asterisk feature that shows requested-vs-served Gemini models. Probably skip unless asked; mentioning preemptively reads as defensive.
- If the pipeline failed on ANY of the three demo PDFs during recording: do NOT send this email. Fix the gap, re-record, then send. The whole point is "consistent."
