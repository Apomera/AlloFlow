# Table / Reading-Order Golden-Master Corpus

Fixtures for `tests/table_ro_eval.test.js` — the deterministic half of the
Beat-Adobe-on-3 benchmark (see `C:/tmp/beat_adobe_on_3_plan.md` §4 and
`docs/table_readingorder_golden_master_plan.md`). Scoring primitives live in
`tests/lib/teds.js` (TEDS / TEDS-Struct) and `tests/lib/edit_distance.js`
(reading-order normalized edit distance).

## What this is (and is NOT)

- **IS:** a CI-runnable regression guard + benchmark. It scores the real shipped
  deterministic emitter and/or stored pipeline outputs against ground truth, and
  asserts each item meets a committed baseline in `../table_ro_baselines.json`.
- **IS NOT:** a Canvas/Gemini run. The vision extraction is browser-only and
  never runs in CI. To benchmark the *vision* output you capture it once from a
  Canvas run and store it as a `captured` fixture here.
- **TEDS ≠ accessibility.** It measures structural/content **preservation**, not
  screen-reader usability — `<td>`→`<th>` promotion, `scope`, and `<caption>` are
  deliberately outside the metric. Never report a TEDS number as an
  "accessibility score" (cf. the veraPDF/PDF-UA track + FTC v. accessiBe).

## Fixture formats

Each `*.json` in this directory is one corpus item.

**Table (`kind: "table"`):**
```jsonc
{
  "name": "unique-id",
  "kind": "table",
  "mode": "emit" | "captured",     // emit = run the real _emitAccessibleTableHtml on inputGrid; captured = score a stored output
  "metric": "teds" | "tedsStruct", // tedsStruct ignores cell text (structure only)
  "source": "synthetic" | "omnidocbench" | "alloflow-failure",
  "inputGrid": { "caption": "...", "rows": [ { "cells": [ { "text": "...", "isHeader": true, "scope": "col", "colspan": 1, "rowspan": 1 } ] } ] }, // mode:emit only
  "captured": "<table>...</table>", // mode:captured only — the pipeline/OmniDocBench output to score
  "groundTruth": "<table>...</table>"
}
```

**Reading order (`kind: "reading-order"`):**
```jsonc
{
  "name": "unique-id",
  "kind": "reading-order",
  "groundTruth": ["block-id-in-human-order", "..."],
  "captured":   ["block-id-as-produced", "..."]
}
```

Add the baseline in `../table_ro_baselines.json`: `minScore` for tables (TEDS ≥),
`maxDistance` for reading order (distance ≤).

## Adding a real corpus

1. **OmniDocBench v1.5 subset** — pick the **borderless/merged-table** and
   **multi-column** subsets (where Adobe fails). ⚠️ **Verify redistribution
   license before committing any source PDF/page.** If unclear, do NOT vendor the
   binary — store only the ground-truth HTML/order + a `captured` AlloFlow output,
   and reference the source by doc-id. (A `dev-tools/eval/prepare_omnidocbench.cjs`
   fetch-and-cache script is the clean way to handle the PDFs.)
2. **AlloFlow real-failure PDFs** — documents that broke in the wild. Annotate the
   correct table HTML + reading order once; this is the regression set that
   matters most as OmniDocBench saturates.
3. **Capture the AlloFlow output once** (Canvas), paste it as `captured`, set a
   baseline at-or-just-below the captured score, and commit.

## Re-baselining

Only after a **deliberate, reviewed** improvement: update the item's `minScore` /
`maxDistance` in `../table_ro_baselines.json` in the same commit, with a one-line
note saying why. A drop without a baseline change is a regression and fails CI.

## Beat-Adobe panel (run once, offline — not CI)

Run Adobe Auto-Tag on the same corpus, record its TEDS / reading-order, and emit a
comparison report. On the `BAD_PDF_COMPLEX_TABLE` cases Adobe scores 0 / errors —
that contrast is the defensible, reproducible headline. **Until a real candidate
is captured, the AlloFlow-vs-Adobe numbers are ILLUSTRATIVE, not measured** — keep
the "external citation / to-reproduce" label per the honest-claims rule.
