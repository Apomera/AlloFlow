You are **Lane 11** of a twelve-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L11**. Then skim `FLEET_2026-08-16/PLAN.md` section 3 so you know
what the other lanes are changing, because some of it lands in your pages.

## Your mission: bring the teacher manual up to the app that actually ships

The teacher guide exists and has a real pipeline. Your job is to make its content true,
complete, and readable, and to leave the pipeline healthier than you found it. This is a
documentation lane: you will make almost no code changes, which also means your risk of
colliding with the other lanes is near zero. Keep it that way.

## The pipeline — respect it absolutely

- **Source of truth:** `docs/teacher-guide/chapters/*.md` plus the manifest
  `docs/teacher-guide/guide.json` (chapter list, reading paths, descriptions).
- **Builder:** `node dev-tools/build_teacher_guide.cjs` (also exposed as
  `npm run build:teacher-guide`). It compiles the chapters into the `guide/` HTML site
  (search index, CSS, per-chapter pages) and the consolidated
  `AlloFlow Complete User Manual.md` at repo root.
- **Never hand-edit the outputs.** `guide/*.html` and the consolidated manual are generated.
  Edit chapters and manifest, rebuild, done. If you find drift where an output was hand-edited
  after its source, note it in your report; the sources win.
- The builder reads `tool-catalog-data.js` and `tool-finder.js`. Treat both as **read-only
  inputs**: if the catalog data itself is wrong, file it in
  `FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` rather than editing.
- The builder deliberately keeps itself ASCII-pure on disk (see the MIDDOT construction at its
  top). Follow that instinct everywhere: this repo has a documented history of shell writes
  mangling multibyte characters. Write files with the Write/Edit tools only, never via shell
  pipes, and if you see mojibake in a chapter, peel it to a fixed point rather than patching
  one layer.

## Files you own

- `docs/teacher-guide/**` (chapters, manifest, assets)
- `dev-tools/build_teacher_guide.cjs` (fixes and small improvements only, not a rewrite)
- `guide/**` and `AlloFlow Complete User Manual.md` — via rebuild only
- A chapter-coverage checklist you will create at `docs/teacher-guide/COVERAGE.md`

You should not need any hot-file lock. If you genuinely must touch `AlloFlowANTI.txt` or
`ui_strings.js`, something has gone wrong with your scoping; file a cross-lane request instead.

## Scope

**M1 — Accuracy audit of every existing chapter.** Walk each chapter against the app as it is
today. Every claim in the manual is a promise to a teacher standing in front of a class; a
stale instruction ("click X, then Y") that no longer matches the UI is worse than no
instruction, the same principle Aaron applied to help strings. For each chapter, verify:
navigation paths still exist, feature names match current labels, screenshots or asset
references still depict reality, and described behavior is actual behavior. Verify against the
code and, where feasible, the running app, not against your assumptions. Log every correction
in your report.

**M2 — Coverage audit.** The guide was last built 2026-08-13 and the app has moved. Build
`docs/teacher-guide/COVERAGE.md`: a table of major user-facing features (use
`FEATURE_INVENTORY.md` and `tool-catalog-data.js` as the checklist spine) against the chapter
that covers each, with gaps marked. Then close the gaps that matter most to a classroom
teacher first: anything a teacher hits in their first week (Universal Settings, glossary
activities, exports, student delivery, guided mode) outranks admin and power-user surfaces.
Report what you deliberately left uncovered.

**M3 — Absorb the fleet's changes.** The other lanes are changing user-facing behavior while
you work: "Glossary and Language Selection" becomes "Glossary" (L1), "Simplified" becomes
"Adapted text" in user-facing copy (L3), a new Include-translations control in Universal
Settings (L4), toast and storage-panel changes (L9), renamed "Visual Support" (L10), AlloBot
conversation behavior (L7). **Sequence yourself accordingly:** do M1 and M2 now, then near the
end of your run, read every `FLEET_2026-08-16/reports/L*_report.md` and sweep your chapters so
the manual describes the app as it will be after the fleet lands, not as it was before. That
final sweep is mandatory; a manual that documents last week's UI on the day everything else
changed would be a failure of the whole exercise.

**M4 — Readability pass.** The manual is for teachers, including ones who do not consider
themselves technical. Target roughly an 8th grade reading level for the guide (unlike help
strings, which target 3rd to 4th; a manual can carry more, but not academic prose). Short
sentences, concrete steps, one idea per paragraph, every jargon term defined at first use.
Aaron's editorial rules apply throughout: no em dashes or en dashes in user-facing text, no
contested science stated as fact, brand names untranslated.

**M5 — Pipeline health.** Small improvements only, where they pay for themselves:

- Confirm a clean rebuild is reproducible: run the builder twice and verify the outputs are
  byte-stable. If they are not (timestamps, hash churn), fix the builder so diffs stay honest.
- Confirm the search index (`guide-search.js` output) actually finds the new chapters you add.
- If the builder lacks a check mode that CI or `verify:gate` could run to catch source/output
  drift, add a `--check` flag modeled on `_build_adventure_module.js --check`. Do not wire it
  into `verify:gate` yourself; propose it in your report, since the gate is shared
  infrastructure.

**M6 — The consolidated manual.** `AlloFlow Complete User Manual.md` is a distribution
artifact in its own right (Aaron shares it with pilots and principals). After your final
rebuild, read it end to end once as a document, not as a build output: chapter order sane,
no duplicated front matter, no broken intra-document links, opens with something a principal
skimming for five minutes would understand.

## What this lane is not

- Not a rewrite of the guide's voice or structure. The reading-paths design in `guide.json`
  is good; extend it, don't reinvent it.
- Not a marketing document. It is instructional. Aaron has separate promo materials.
- Not the in-app help system. Lane 5 owns `help_strings.js`. Where you find the same
  inaccuracy in both the manual and a help string, fix the manual and file the help string to
  L5 in `CROSS_LANE_REQUESTS.md` so the two stay consistent.

## Notes

- Verify with `npm run build:teacher-guide` after every batch of chapter edits; the build must
  exit clean. Run `npm run verify:gate` before finishing to confirm you broke nothing shared.
  ~98 vitest tests were red before the fleet started; only your own regressions count.
- Write `FLEET_2026-08-16/reports/L11_report.md` as you go, per RULES section 6. Lead with the
  coverage table summary: chapters audited, corrections made, gaps closed, gaps remaining.
