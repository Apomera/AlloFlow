# Provisional Taught-Pattern Inventory (Grades 1–2)

**Status: PROVISIONAL.** This is the reference behind the decodability screen in
`dev-tools/pm_passage_check.cjs` (PM_BANK_FORM_SPEC.md §2, open question 2). It is a
conventional mid-year scope-and-sequence, not a site-specific one. Reviewers
(Aaron, Dr. Howorth, Dr. Wickerd) may **approve it as the default or swap in a
program-specific inventory**; the checker is the single implementation, so a swap
is one edit, and every passage re-screens in seconds.

The spec's constraint: in grades 1–2, no more than **5% of tokens** may fall
outside (taught patterns + sight-word list). Proper nouns are budgeted
separately (≤3 distinct per passage) and are excluded from this screen.

## Grade 1 patterns (assumed taught by mid-year)

- Closed syllables with short vowels: CVC, CCVC, CVCC (`hen`, `stop`, `pond`)
- Consonant digraphs: `sh`, `ch`, `th`, `wh`, `ck`
- Doubled final consonants: `ll`, `ss`, `ff`, `zz`
- Inflected forms of the above: `-s`, `-es`, `-ed`, `-ing`, possessive `'s`

## Grade 2 patterns (adds)

- Three-consonant blends on closed syllables (`string`, `splash`)
- Silent-e (CVCe): `kite`, `slide`
- Vowel teams: `ai ay ee ea oa ow oo ue ew igh`, plus `ind old olt` families
- R-controlled vowels: `ar or er ir ur`
- Open-syllable `-y` and final `-le`: `fly`, `little`
- Two-syllable words built from two closed syllables: `mitten`, `until`, `basket`
- `-ing` forms with dropped e: `riding` → `ride`

## Sight-word list

The core list is a conventional high-frequency set (Dolch/Fry-style, ~230
words), embedded in `pm_passage_check.cjs` (`SIGHT_WORDS`). It includes a
**small schoolroom annex** that reviewers should note explicitly: `school`,
`teacher`, `book`, `friend`, `paper`, `write`. These are standard in decodable
program word lists but are not pattern-decodable at these grades.

## How the screen behaves

- Every token is checked as itself and as each plausible base form
  (`trees` passes via `tree`; `sees` passes via the sight word `see`).
- The classifier is a **machine screen, not the final word**: it is
  deliberately conservative in places (some legitimately taught words will be
  flagged) and generous in others (a few pattern-matching words a given
  program has not taught will pass). The per-passage `decodability.outside`
  list in the bank JSON shows exactly which words were counted against the 5%
  budget, so a human reviewer can audit every decision.

## What sign-off means here

Approving this inventory (or supplying a replacement) closes open question 2 in
PM_BANK_FORM_SPEC.md. If a replacement arrives after more batches are drafted,
re-running the checker re-screens the whole bank against the new inventory —
no passage needs re-authoring unless it newly exceeds the 5% budget.
