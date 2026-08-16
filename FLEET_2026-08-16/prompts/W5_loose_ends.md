You are **Lane W5** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md`, `FLEET_2026-08-16/WAVE2_PLAN.md`, and
`FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` in full — you are the lane that clears the requests
no wave-1 lane could take. Lane ID **W5**.

## Files you own

- `doc_pipeline_source.jsx` + `view_export_preview_source.jsx` (L8 is done; doc_pipeline is
  now on the lock list — acquire before editing, another non-fleet session held it in wave 1)
- `generate_dispatcher_source.jsx` (under lock; L3/L4 are done with it)
- `text_utility_helpers_source.jsx`, `misc_components_source.jsx` (L3 done)
- `video_studio_module.js` and `video_studio/**`

Under lock: `AlloFlowANTI.txt`, `ui_strings.js`, `generate_dispatcher_source.jsx`,
`doc_pipeline_source.jsx`.

## Tasks

**1. Printable cloze (build it; the design is written).** Wave 1's L3 wrote a complete design
with line numbers into `CROSS_LANE_REQUESTS.md` and its report (section L4): a
`cfg.clozeWorksheet` flag + checkbox beside `includeSimplified` in the export preview; in
`doc_pipeline_source.jsx`'s `simplified` renderer branch, when `isWorksheet && cfg.clozeWorksheet`,
blank the glossary terms with fixed-width underlines, append a shuffled word bank from
`latestGlossary`, and an answer key behind the existing `isTeacher` gate. Two traps L3 named
from experience: the blank must carry the **passage-language** term (ground truth = the text
replaced, not the language setting), and the term regex must use `\p{L}` Unicode boundaries —
a bare `\b` matches nothing beside non-ASCII letters. Note the line numbers in the design
predate L8's edits to the same file; re-locate by content. Verify by generating a worksheet
export with a Spanish fixture and reading the output HTML.

**2. Emoji field in the glossary schema (L1's upstream fix).** In
`generate_dispatcher_source.jsx` (~2080, 2121), the emoji-on prompt says "Include a relevant
emoji for each term" but the JSON schema has no emoji field, so the model smuggles it into
`term` — the root cause of the Word Scramble tofu. Add `"emoji"` to the schema and prompt.
`games_source.jsx` already reads `item.emoji` via `gameTermParts`, so this is purely additive;
check the glossary *renderers* and exports also tolerate/display the field, and that a
term arriving with a legacy inline emoji still works (L1's consumer-side stripping stays).

**3. GLOSS_RESET (L1's recommended root fix, deferred as a product call — Aaron's brief to
this wave approves it).** In `AlloFlowANTI.txt`: dispatch the already-written, never-called
`GLOSS_RESET` action and clear `glossarySearchTerm` when `generatedContent.id` changes, so a
stale filter/search cannot survive into a new glossary. L1's report (G6) documents the three
causes; its test `tests/glossary_empty_state_and_print.test.js` has a guard that fails when
`GLOSS_RESET` gains a call site — update that guard per its own comment.

**4. Mic meter in dictation (L7 → L6 request).** `voice_module.js`'s
`recordAudioBlob({ onLevel })` is a documented stub. L7 shipped
`AlloModules.AlloCommands.micLevelMonitor` (reference-counted, accepts an existing stream).
Wire the dictation controller to acquire it on start and release on stop — L7's request in
`CROSS_LANE_REQUESTS.md` says it is about one line each way. Verify no second `getUserMedia`
call results.

**5. Re-examine C6 (Video Studio) with a correction in hand.** Wave 1's L10 concluded "there
is no IT-helper demo to remove" — but that search missed the standalone: it exists at
`it_coach/it_coach.html` (see also `docs/IT_COACH_STANDALONE_SCOPE_2026-08-11.md`); grepping
`getDisplayMedia` finds it instantly where "IT helper" does not. Re-run the C6 question
properly: compare what `it_coach` covers against Video Studio's **Demo Autopilot** and any
other overlapping recorder surface, and determine whether Aaron's "take the demo out of Video
Studio" now has a real target. If removal is warranted, confirm the standalone genuinely
covers the ground first; if the two are different features (L10's read of Demo Autopilot as a
distinct capability may still be right), say so with the comparison table. Do not delete
anything you have not proven redundant.

**6. FLASHCARD_NO_ANSWER key** — if W1's report says they filed it to you (the ANTI edit),
make `'Translation unavailable'` read from `ui_strings.js` under lock; W1 adds the key.

## Verification

Builders + `node --check` on every touched module; source-pair drift; targeted vitest
including L3's cloze tests and L1's glossary tests; `npm run verify:gate` status at end.
Report per RULES section 6 → `FLEET_2026-08-16/reports/W5_report.md`, incrementally.
