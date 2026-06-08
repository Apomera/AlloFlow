# PDF score calibration corpus

**Status: NOT YET POPULATED — needs a human WCAG reviewer (rank 11 of the 2026-06-08 pipeline audit).**

## Why this exists

AlloFlow's PDF accessibility score is a 50/50 blend of an **AI rubric** score and an **axe-core**
score (doc_pipeline_source.jsx). Two honesty gaps the audit flagged:

1. **The 50/50 weight is an unjustified prior.** Nobody has checked whether `0.5*ai + 0.5*axe`
   actually tracks an expert's WCAG verdict — the weight was picked, not derived.
2. **The axe half scores a *text reconstruction* of the extracted content, not the PDF bytes**
   (it runs axe on AlloFlow's own `minimalHtml`), so page-structure/landmark rules pass by
   construction and can inflate the number. (The live UI now discloses this; see the axe tile.)

The only way to fix this honestly is to compare AlloFlow's score against **expert / tool-grade
ground truth** on a real set of PDFs, then re-derive the weight from evidence. That requires
human-supplied scores — which is what this corpus holds.

## What a reviewer needs to provide

For **5–10 representative PDFs** (mix: born-digital, scanned, mixed, a heavily-tagged "good" one,
an untagged "bad" one), record an expert score 0–100 from ONE of:

- a **WCAG reviewer's holistic judgement** (preferred — a human who does this professionally), or
- **PAC 2024** (PDF Accessibility Checker) pass-rate, or
- **veraPDF** PDF/UA-1 conformance (pass = high, fail with N violations = scaled down).

Then run each PDF through AlloFlow's PDF Accessibility audit and record the three numbers the
results panel shows: the **AI Rubric** score, the **axe-core** score, and the **Blended** score.

## How to populate

Edit `manifest.json` — add one entry per PDF (drop the PDF itself in this folder):

```json
{
  "entries": [
    {
      "id": "scanned-iep-packet",
      "file": "scanned-iep-packet.pdf",
      "expertScore": 64,
      "expertSource": "PAC2024",
      "alloflowAiScore": 88,
      "alloflowAxeScore": 95,
      "alloflowBlendedScore": 92,
      "notes": "AlloFlow over-scored — axe passed wrapper rules on the text proxy; PAC failed it on tag-tree."
    }
  ]
}
```

`expertScore` + (`alloflowAiScore` & `alloflowAxeScore`) are the required fields; the rest are
documentation. As soon as ≥3 entries have both an `expertScore` and the AlloFlow sub-scores,
`tests/pdf_score_calibration.test.js` stops skipping and starts reporting:

- **MAE** of the current 50/50 blend vs the expert scores,
- the **Pearson correlation**, and
- the **blend weight that minimises error** — i.e. the evidence-based answer to "should it be 50/50?"

If the optimal weight is far from 0.5 or the MAE is large, that's the signal to re-weight the blend
(and/or drop the wrapper-artifact axe rules) — with data, not a guess.

## Why the harness can't auto-run the audit

AlloFlow's audit needs a real DOM + network (axe-core in an iframe, pdf.js to canvas, Gemini
Vision) — it can't run under headless vitest (the project's documented headless ceiling). So the
AlloFlow sub-scores are recorded by hand from the app once per PDF; the harness does the math and
the calibration verdict. This is a deliberate human-in-the-loop step, not an automation gap.
