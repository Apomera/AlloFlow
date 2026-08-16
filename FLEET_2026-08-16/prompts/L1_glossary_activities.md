You are **Lane 1** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L1**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context on
how your work fits with the other nine lanes.

## Your mission: glossary and word activities

The glossary and its activity set are the most-used surface in AlloFlow and the least
consistent. Some activities accept a non-English word list, some silently do not, emoji
corrupt at least one of them, dark mode is broken in several, and a phantom empty state
appears with no search entered.

## Files you own

- `games_source.jsx` (and its byte-identical twin `desktop/web-app/src/games_source.jsx`)
- `glossary_helpers_source.jsx`
- Builders: `node _build_games_module.js`, `node _build_glossary_helpers_module.js`
- Any glossary/game tests under `tests/`

`games_module.js` contains `CrosswordGame`, `BingoGame`, `StudentBingoGame`,
`WordScrambleGame`, `MatchingGame`, `MemoryGame`, `SyntaxScramble`, `TimelineGame`, and the
sort-game family. It is **generated** — edit `games_source.jsx`, then run the builder, then
run `node dev-tools/check_source_pair_drift.js` because `games_source.jsx` is one of the three
duplicated sources.

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`.

## Scope

**G1 — Language support across all activities.** Aaron wants every glossary activity to work
with a non-English word list, for example a Spanish-only bingo game. Some already do. Start by
building an honest matrix: for each activity in `games_source.jsx`, does it accept the
glossary term list as-is, and does anything in its path assume ASCII, English word order, or
Latin letters? Fix the ones that do not. The matrix itself is a deliverable; put it in your
report.

**G2 — Non-Latin scripts.** Crossword nominally accepts other languages, but Aaron has hit
problems and suspects Arabic and Chinese are broken. Letter-grid activities are the likely
failure: they assume one character per cell, left-to-right fill, and a case-folding model that
does not exist in CJK. Arabic additionally needs RTL grid direction and has contextual letter
forms that make per-cell rendering wrong even when the data is right. Determine what actually
happens, and be specific about what is fixable versus what is a real script limitation. If a
script cannot be supported honestly in a given activity, the right answer may be to exclude
that activity for that script with a clear message rather than to render something broken.
Watch for `\b` word-boundary regex on non-ASCII — it does not do what it looks like it does.

**G3 — Rename.** "Glossary and Language Selection" should read just "Glossary". It no longer
selects language; that moved to Universal Settings. Find every user-facing occurrence,
including `ui_strings.js` (under lock), any language pack that carries the old label, and any
help string reference. If the string key itself is named for the old label, leave the key
alone and change only the value. Coordinate nothing; just do it and note it.

**G4 — Emoji corrupt Word Scramble.** With emoji enabled in Universal Settings, Word Scramble
shows question-mark-in-circle glyphs. Aaron's read is that the emoji attached to a glossary
term is being fed into the scramble as scrambleable characters. Confirm the mechanism, then
fix it properly: activities that operate on letters need to strip emoji and other non-letter
symbols from the token before scrambling, matching, or grid-filling, while still displaying
the emoji where it belongs as decoration. Emoji are multi-codepoint with ZWJ sequences and
skin-tone modifiers, so a naive per-character split will tear them apart and produce exactly
the tofu boxes Aaron saw. Check every activity for the same bug, not just Word Scramble.

**G5 — Dark mode.** Matching worksheet text is too dark to read; crossword looks too dark;
hovering a glossary item in dark mode turns the row white and makes the text disappear. That
last one is almost certainly a hover style written for the light theme that hardcodes a light
background while the text color stays theme-driven. Lane 2 owns the shell-wide contrast bug
class and will file anything it finds in your files into `CROSS_LANE_REQUESTS.md`; you own the
fixes inside `games_source.jsx` and `glossary_helpers_source.jsx`. Match the contrast *ratio*
across themes rather than mirroring luminance, and verify by rendering and reading actual
pixels, not by eyeballing a thumbnail.

**G6 — Phantom empty state.** Aaron hit "no words match your search" in the glossary filter
without ever typing a search term, and could not reproduce it deliberately. Look for filter
state that persists across mounts, a search value restored from storage without the input
being repopulated, or an empty-vs-undefined confusion where `''` and `undefined` take
different branches. The bug class to suspect: a state value that survives a tool switch. If
you cannot reproduce it, harden the empty state so that it can only render when a non-empty
query is actually present, and say in your report that the root cause is unconfirmed.

**G7 — Printables.** Most non-generated activities are already printable. Aaron wants
crossword and the rest of the glossary activity set printable too. Find the existing printable
path, see what it takes to extend it per activity, and extend it. A crossword printable needs
both the grid and the clue list, and ideally a separate answer key. Do not invent a second
printing mechanism; reuse the one that exists.

## Notes

- Verify with `npm run verify:gate` and targeted vitest runs. Roughly 98 tests were red before
  you started; only your own regressions count.
- Any claim about how something looks must come from actually rendering it.
- Write `FLEET_2026-08-16/reports/L1_report.md` as you go, per the format in RULES section 6.
