# Lumen norm-spine transcription worksheet

Lumen's benchmark feature ships with **empty** curated norm spines. Until a human
byte-transcribes the cells from the **primary source** and sets `reviewedOn`, the
benchmark picker honestly refuses (`selectNorm` returns `no-cell`) — so nothing
fabricated or unverified can ever render on a student's chart.

This worksheet is the fill-in guide. **Do not** copy numbers from memory, from another
tool, or from an LLM. Transcribe each cell **directly from the source PDF**, then have a
second person spot-check, then set `reviewedOn`.

- **Spines live in:** `stem_lab/stem_tool_lumen.js` → `NORM_SPINE` and `DIBELS8_ORF`
- **Check progress anytime:** `node dev-tools/check_lumen_spine.cjs`
- **The gate:** `validateNormSpine()` blocks the unsafe in-between — *cells populated but
  `reviewedOn` still null*. You cannot ship transcribed-but-unverified norms; you also
  cannot set `reviewedOn` with no cells. It also flags `p25 > p50` and non-numeric values.

---

## ⚠️ Honesty rules (read first)

1. **`p50` is the 50th PERCENTILE, not a mean.** Do not seed from the repo's
   `FLUENCY_BENCHMARKS` table — that gives a *non-percentile median* (e.g. G4 winter ≈ 112),
   a **different construct**. Mixing them would silently misrepresent the norm.
2. **Byte-transcribe.** Read the digit off the source table, type it, move on. No rounding,
   no interpolation, no "looks about right."
3. **Verify the page/table** for each value (note it in the `table:` field if helpful).
4. **Set `reviewedOn` LAST**, only after every cell is filled and a second person has
   spot-checked. That date is the signal that says "a human stands behind these numbers."

---

## Spine 1 — `NORM_SPINE`: Hasbrouck & Tindal 2017 ORF (grades 1–6)

- **Source:** Hasbrouck, J. & Tindal, G. (2017). *An update to compiled ORF norms* (Tech. Rpt. 1702). University of Oregon, Behavioral Research & Teaching.
- **Primary PDF:** https://files.eric.ed.gov/fulltext/ED594994.pdf
- **Table:** the single "Compiled ORF Norms" table (Grade × Percentile × Fall/Winter/Spring, in WCPM).
- **Cells Lumen uses:** `p50` and `p25` for each grade × season.
- **Note:** Grade 1 has **no Fall** ORF norm in H&T — leave the G1 `fall` cell **absent** (do not invent it).

Fill each blank with the WCPM value read from the source (leave `—` truly blank/omit the key):

| Grade | Fall p50 | Fall p25 | Winter p50 | Winter p25 | Spring p50 | Spring p25 |
|------:|:--------:|:--------:|:----------:|:----------:|:----------:|:----------:|
| 1     | — (n/a)  | — (n/a)  |            |            |            |            |
| 2     |          |          |            |            |            |            |
| 3     |          |          |            |            |            |            |
| 4     |          |          |            |            |            |            |
| 5     |          |          |            |            |            |            |
| 6     |          |          |            |            |            |            |

**Paste-ready skeleton** (fill the numbers, delete the `0`s; keep only seasons/percentiles you transcribe):

```js
// NORM_SPINE.cells  — replace each 0 with the byte-verified WCPM; delete any cell you don't fill.
cells: {
  1: {                 winter: { p50: 0, p25: 0 }, spring: { p50: 0, p25: 0 } }, // G1: no fall
  2: { fall: { p50: 0, p25: 0 }, winter: { p50: 0, p25: 0 }, spring: { p50: 0, p25: 0 } },
  3: { fall: { p50: 0, p25: 0 }, winter: { p50: 0, p25: 0 }, spring: { p50: 0, p25: 0 } },
  4: { fall: { p50: 0, p25: 0 }, winter: { p50: 0, p25: 0 }, spring: { p50: 0, p25: 0 } },
  5: { fall: { p50: 0, p25: 0 }, winter: { p50: 0, p25: 0 }, spring: { p50: 0, p25: 0 } },
  6: { fall: { p50: 0, p25: 0 }, winter: { p50: 0, p25: 0 }, spring: { p50: 0, p25: 0 } }
}
// then set:  reviewedOn: '2026-..-..'   // ISO date; only AFTER a second-person spot-check
```

---

## Spine 2 — `DIBELS8_ORF`: grade 7–8 ORF benchmark goals (cut-points)

- **Source:** University of Oregon (2020). *DIBELS 8th Edition benchmark goals.*
- **Locator:** https://dibels.uoregon.edu/  (use the official DIBELS 8 benchmark-goals document)
- **Kind:** a **cut-point** (the benchmark goal), not a percentile distribution.
- **Why it exists:** so the King Middle **8th-grade** pilot has an in-range source (H&T stops at grade 6).
- **Mapping:** DIBELS Beginning/Middle/End-of-year → `fall`/`winter`/`spring`. Store the goal WCPM under `p50`.

| Grade | Fall (BOY) goal | Winter (MOY) goal | Spring (EOY) goal |
|------:|:---------------:|:-----------------:|:-----------------:|
| 7     |                 |                   |                   |
| 8     |                 |                   |                   |

```js
// DIBELS8_ORF.cells — the benchmark GOAL (cut-point) per season, under p50.
cells: {
  7: { fall: { p50: 0 }, winter: { p50: 0 }, spring: { p50: 0 } },
  8: { fall: { p50: 0 }, winter: { p50: 0 }, spring: { p50: 0 } }
}
// then set:  reviewedOn: '2026-..-..'
```

---

## Done checklist

- [ ] Every intended cell filled with a byte-verified WCPM (positive integer)
- [ ] `p25 ≤ p50` in every cell (the gate will flag a swap)
- [ ] Grade 1 `fall` left absent
- [ ] Second-person spot-check complete
- [ ] `reviewedOn` set on each populated spine (ISO date)
- [ ] `node dev-tools/check_lumen_spine.cjs` reports **READY** for the populated spine(s)
- [ ] `npm run verify:lumen-floor` still green
- [ ] Smoke-test the benchmark picker in Canvas: it now draws a teal ▣ verified reference line
