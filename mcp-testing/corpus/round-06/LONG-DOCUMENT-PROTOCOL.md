# Long-document authoring protocol (multi-session tranches)

Round-4 measurement settled that the engine is not the constraint on long
documents — the 126-page `irs-i1040-instructions` sits at 32% of the text cap
and ~52% of the block cap. The constraint is **model reading and authoring
time**: no single session can read 126 pages carefully and author the plan.
This protocol splits that work across sessions without weakening any guarantee.

## The tranche contract

Each session authors one **tranche**: a complete, self-contained plan file
(`schema_version`, `document`, `blocks`, `review_notes`) covering a contiguous
page range it actually read. Every tranche binds to the same source sha256.
Only the first tranche carries the document's single h1.

Sessions do not need to trust each other. `merge-plans` enforces the contract
mechanically:

```text
python alloflow_portable.py merge-plans \
  --tranches t01-pages-1-12.json t02-pages-13-30.json t03-pages-31-52.json \
  --out merged-plan.json
```

- **Identical document headers** across tranches, or refusal — tranches cannot
  silently describe different files or disagree on title/language.
- **Reading order across boundaries** — a tranche starting before the previous
  tranche's last page is refused (mis-ordered or duplicated tranche).
- **Full plan validation of the merged result** before anything is written:
  single h1, heading ladder, budgets, blocked types. A tranche split can never
  produce a plan that a single session could not have produced.
- **Coverage report** — `pagesWithoutBlocks` lists every page no tranche
  assigned a block to. Blank pages are fine; content pages there mean a missing
  tranche. Partial coverage is visible, never silent.

## The session loop

1. Session 1: `source-info` + `audit-source` + `extract-text` once; store the
   receipt beside the tranches. Author tranche 1 from page 1 until attention
   budget runs out; record the last page read in the tranche filename.
2. Session N: read from the previous tranche's boundary; author tranche N.
   Heading levels must continue the document's ladder (the merge validator
   catches skips).
3. Final session: `merge-plans` → `remediate` → recall channels → `verify-init`
   → independent verifier → `verify-check`. Verification runs on the MERGED
   plan, so the verifier sees the whole document, not the tranche seams.

## What this deliberately does not do

- No per-tranche remediation: partial rebuilds of a document are never
  delivered. Tranches are an authoring format, not an output format.
- No automatic tranche sizing: the author decides where attention ends. The
  boundary check only enforces that the story told by the tranches is
  consistent.
- Recall still measures the merged plan against the full source text layer, so
  a dropped tranche shows up as a large, explained recall deficit even before
  the coverage report is read.

Status: protocol + tooling shipped and tested (happy path, out-of-order
refusal, header-mismatch refusal, merged-validation refusal, merged plan
remediates). The i1040 itself remains queued as the first real exercise.
