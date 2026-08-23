# Progress-Monitoring Form Bank — Authoring Spec (DRAFT for clinical sign-off)

**Status:** DRAFT — awaiting review by Aaron, Dr. Sarah Howorth, and Dr. Garry Wickerd.
**Decision context (2026-08-23):** the Assessment Center's decision rules (`four_point`,
`median_3`, `trend_line`) need 4–6+ data points; the current bank holds three
benchmark forms per grade band (Fall/Winter/Spring), so weekly monitoring is
impossible without passage reuse. Aaron chose to build a real PM bank rather
than relabel the tool as benchmark-plus-manual-entry.

Passage drafting does not start until this spec is signed. Drafting against a
signed spec is fast; redrafting against taste is not.

---

## 1. Scope

| Measure | Grades | Forms needed | Item type |
|---|---|---|---|
| ORF (passages) | 1–6, per grade (no bands) | 20 per grade | Connected-text passage |
| NWF | K–1 | 20 per grade | Nonsense-word item bank |
| LNF | K | 20 forms | Letter-sequence forms |
| Math DCPM | 1–6 | 20 per grade | Computation form (existing generator may cover; confirm) |

Going per-grade for ORF also retires the current "3-5" band, which scores one
grade-3 passage against three different norm rows (readiness finding 3).

## 2. ORF passage constraints (per grade)

| Grade | Words | Readability check | Band |
|---|---|---|---|
| 1 | 80–120 | Spache | 1.3–2.0 |
| 2 | 120–180 | Spache | 2.0–2.8 |
| 3 | 150–220 | Spache | 2.8–3.8 |
| 4 | 180–250 | Dale–Chall (or Lexile if available) | grade-level band |
| 5 | 200–250 | Dale–Chall (or Lexile) | grade-level band |
| 6 | 220–280 | Dale–Chall (or Lexile) | grade-level band |

*The specific band cut-points above are proposals for the clinical reviewers to
confirm or adjust — they are conventional, not sacred.*

**All grades:**
- Narrative or light informational; no poetry, no dialogue-heavy text (quotation
  overhead distorts rate).
- Proper-noun budget: ≤ 3 distinct proper nouns per passage, each decodable or
  introduced in the first sentence.
- Grades 1–2: decodability constraint — no more than 5% of tokens outside the
  taught-pattern inventory plus a fixed sight-word list (reviewers to supply or
  approve the inventory reference).
- Banned content: food scarcity, injury/death, family disruption, religious
  practice, holidays tied to specific traditions, weather disasters. (Standard
  CBM practice: nothing that differentially loads on a student's home life.)
- No passage may share a topic with another passage in the same grade (topic
  familiarity is a difficulty confound between forms).
- Self-contained: no passage depends on picture support or a title to parse.

## 3. Equivalence over polish

Passages within a grade must be interchangeable — week-to-week movement must be
growth, not passage difficulty.

1. **Draft in batches of five per grade.** Run every batch through the
   readability check before human review. Discard misses; do not repair them.
2. **Field-check cheaply:** 5–8 readers per grade, two passages each,
   counterbalanced order. Flag any passage whose mean WCPM deviates > 10% from
   the grade's batch mean; revise or discard. This is an outlier screen, not an
   alternate-form reliability study — say so wherever results are reported.
3. Keep per-passage field notes (mean WCPM, n, dates) in the bank data so the
   provenance ships with the passage.

## 4. Data format

Extend `psychometric_probes.json` with a new section — data, not code:

```json
"PM_PASSAGES": {
  "3": [
    { "id": "pm-g3-01", "title": "...", "wordCount": 187, "text": "...",
      "readability": { "method": "spache", "score": 3.1 },
      "fieldCheck": { "n": 6, "meanWcpm": 94, "checkedAt": "2026-xx-xx" } }
  ]
}
```

Keyed by real grade (`"1"`–`"6"`). Loader falls through gracefully when a grade
is absent (same pattern as the existing banks).

## 5. Administration rules (code-side, ships with the bank)

- **Auto form assignment:** the tool picks the next unused form per student and
  refuses to reuse a form within 8 weeks. The practice-effect guard lives in
  code, not in teacher memory.
- Standardized timing: 1-minute cap with proration for early finish (this also
  closes readiness finding 12 — the `isScreeningORF` flag now has a consumer for
  attribution; timing standardization rides in with the PM lane).
- Decision rules do not run on in-tool weekly data until BOTH the bank and the
  ORF persistence path are live (the persistence path shipped 2026-08-23).

## 6. Sign-off

| Reviewer | Role | Approved | Date | Notes |
|---|---|---|---|---|
| Aaron | Maintainer, school psychologist | ☐ | | |
| Dr. Sarah Howorth | Clinical review | ☐ | | |
| Dr. Garry Wickerd | Clinical review | ☐ | | |

Open questions for reviewers:
1. Confirm/adjust the readability bands in §2.
2. Supply or approve the grade 1–2 taught-pattern inventory for the
   decodability constraint.
3. Is 20 forms per grade the right target, or is 15 acceptable for the first
   school year with a mid-year top-up?
4. Should grade 6 ship in wave 1, or after 1–5 (norms exist for 6; passages do
   not)?
