# Lane 1 — Glossary and word activities

**Lane:** L1 · **Date:** 2026-08-16

**Files changed**

| file | why |
|---|---|
| `games_source.jsx` (+ `desktop/web-app/src/` twin, both `games_module.js`) | G1, G2, G4, G5, G7 |
| `view_glossary_source.jsx` (+ both `view_glossary_module.js`) | G3 consumer, G5, G6 |
| `ui_strings.js` (+ `desktop/web-app/public/` mirror), under lock | G3 rename, new keys for G2/G5/G6/G7 |
| `tests/glossary_activity_scripts.test.js` (new) | G1, G2, G4 |
| `tests/glossary_activity_theme_contrast.test.js` (new) | G5 |
| `tests/glossary_empty_state_and_print.test.js` (new) | G6, G7 |
| `tests/helpers/games_live_harness.js` (new) | mounts games with effects; the SSR golden master cannot |
| `tests/glossary_game_correctness_contract.test.js`, `tests/crossword_game_dialog_a11y.test.js` | two assertions updated to the new markup |

`glossary_helpers_source.jsx` needed **no change**: it holds `applyAIConfig` and
`handleGenerateTermEtymology`, neither of which touches the activity set.

## Ownership note, read this first

My prompt's ownership list did not name `view_glossary_source.jsx`, but G3, G5's hover bug, G6
and G7 all live there and no lane prompt claims it. L2 is told to file glossary findings *to
L1*, which reads as L1 owning the glossary surface. **I claimed it and logged the claim in
`CROSS_LANE_REQUESTS.md`.**

Baseline when I started: `git status --short` showed zero modified tracked files. The
`view_pdf_audit_*` files PLAN.md warned were staged were no longer staged. By the time I
finished, nine other lanes had ~250 files modified in the tree; I touched none of them.

---

# G1 — Language support across all activities

## The matrix

Every cell was produced by **mounting the activity** with that word list in jsdom with effects
flushed, and looking at what it actually rendered. Nothing here is read off the source.
Harness: `tests/helpers/games_live_harness.js`; the matrix runner is in my scratchpad.

### Before (HEAD)

| word list | Crossword | Word Scramble | Matching | Memory | Student Bingo |
|---|---|---|---|---|---|
| English | 26 squares, 3 clues | 14 tiles | terms + defs verbatim | terms verbatim | terms verbatim |
| Spanish | 26 squares, 3 clues | ok | ok | ok | ok |
| Vietnamese (real diacritics) | **7 squares, 1 clue** (2 of 3 words erased) | ok | ok | ok | ok |
| Polish | **10 squares, 2 clues** | ok | ok | ok | ok |
| Turkish | **10 squares, 3 clues** | ok | ok | ok | ok |
| Russian | **EMPTY GRID** | ok | ok | ok | ok |
| Greek | **EMPTY GRID** | ok | ok | ok | ok |
| Hindi | **EMPTY GRID** | ok | ok | ok | ok |
| Arabic | **EMPTY GRID** | ok | ok | ok | ok |
| Hebrew | **EMPTY GRID** | ok | ok | ok | ok |
| Chinese | **EMPTY GRID** | ok | ok | ok | ok |
| Japanese | **EMPTY GRID** | ok | ok | ok | ok |
| Korean | **EMPTY GRID** | ok | ok | ok | ok |
| Thai | **EMPTY GRID** | ok | ok | ok | ok |
| English + emoji | 17 squares | **10 tiles, 2 holding a TORN SURROGATE** | ok | ok | ok |

### After

| word list | Crossword | Word Scramble | Matching | Memory | Student Bingo |
|---|---|---|---|---|---|
| English | 26 squares, 3 clues, ltr | 7 tiles | ok | ok | ok |
| Spanish | 26 squares, 3 clues, ltr | ok | ok | ok | ok |
| Vietnamese | 14 squares, 3 clues, ltr | ok | ok | ok | ok |
| Polish | 18 squares, 3 clues, ltr | ok | ok | ok | ok |
| Turkish | 12 squares, 3 clues, ltr | ok | ok | ok | ok |
| Russian | 21 squares, 3 clues, ltr | ok | ok | ok | ok |
| Greek | 24 squares, 3 clues, ltr | ok | ok | ok | ok |
| Hindi | 3 squares, 1 clue, ltr (all 3 words accepted; my sample shares no letters) | ok | ok | ok | ok |
| Arabic | 15 squares, 3 clues, **rtl** | ok | ok | ok | ok |
| Hebrew | 3 squares, 1 clue, **rtl** (sample shares no letters) | ok | ok | ok | ok |
| Chinese | 7 squares, 3 clues, ltr | ok | ok | ok | ok |
| Japanese | 9 squares, 2 clues, ltr | ok | ok | ok | ok |
| Korean | 3 squares, 1 clue, ltr (sample shares no letters) | ok | ok | ok | ok |
| Thai | 3 squares, 1 clue, ltr (sample shares no letters) | ok | ok | ok | ok |
| English + emoji | 17 squares | 6 tiles, letters only | ok | ok | ok |

**Read the Hindi / Hebrew / Korean / Thai rows honestly.** All of their terms are now
*accepted* (`skippedLength: 0` for the Hindi list, verified directly). The grid still places
one word because the placement algorithm only keeps words that **cross** an already-placed
word, and my three sample terms happen to share no character. That is a property of my test
words, not a remaining defect. It did surface a real gap though, and I fixed it: a word that
cannot cross was dropped in silence. The clue panel now reports
`{placed} of {total} terms fit this grid` when the two differ.

## What each activity does with a term, and where it can go wrong

| activity | how it handles the term | script-safe? | emoji-safe? | verdict |
|---|---|---|---|---|
| **Memory** | opaque string; pairs matched by `pairId`, never by comparing text | yes | yes, the emoji is decoration on the card, which is the point | already correct |
| **Matching** | opaque; `id: item.term`, matched by identity | yes | yes | already correct (see note) |
| **Bingo cards** (`pure_helpers_source.jsx`) | pure passthrough of glossary items | yes | yes | already correct |
| **Student Bingo** | maps `d.term` onto squares | yes | yes | already correct |
| **Word Search** (`text_utility_helpers_source.jsx:479`) | `text.replace(/[^\p{L}\p{N}]/gu,'')` | yes, already Unicode-aware | yes, emoji are not `\p{L}` | already correct |
| **Crossword** | was `/[^A-ZÀ-ÿ]/`, Latin-1 only | **no** | accidentally yes, the filter deleted emoji too | **fixed, see G2** |
| **Word Scramble** | was `scrambled.split('')`, UTF-16 code units | partly | **no** | **fixed, see G4** |
| **Syntax Scramble** | `/^[A-Z"“]/` sentence gate + space-splitting | **no** | yes (already strips emoji) | **left, see below** |

### Things I found but deliberately left

- **Bingo has no language selector.** The caller reads `item.def`, which is the English
  definition, then appends every translation (`games_source.jsx:5527`). Crossword and Word
  Search both have a language picker; Bingo does not. So "a Spanish-only bingo game" works
  today only if the glossary itself was *generated* in Spanish; you cannot take an English
  glossary with Spanish translations and get a Spanish bingo. **This is a feature, not a
  defect**, and it needs a design decision about whether the caller language, the card
  language and the definition language are one control or three. I did not invent that UI.

- **Syntax Scramble is not a glossary activity** (it takes free `text`, not the term list) but
  it is in my file and it is language-broken in two ways worth writing down. `games_source.jsx:5085`
  requires `/^[A-Z"“]/`, an ASCII capital, so **every** sentence is rejected for Chinese,
  Japanese, Arabic, Hebrew, Thai, Devanagari, Korean, and for Cyrillic and Greek, which have
  capitals but not A-Z. `:5080` splits sentences on `[.!?]`, missing 。！？ (CJK), ؟ (Arabic)
  and । (Devanagari). And it word-splits on spaces, which Chinese, Japanese and Thai do not
  use. The first two are fixable; the third is genuine word segmentation and is not something
  I can do honestly in this pass. I left the whole thing rather than half-fix it into looking
  supported. Worth its own scoped task.

- **Memory's accessible labels are hardcoded English** (`Term: `, `Definition: `,
  `Picture for `). Screen-reader users on a Spanish glossary hear English framing around
  Spanish content. Localization sweep territory (L5), not a script bug; left and noted.

- **Matching keys rows by `id: item.term`**, so two terms differing only by emoji would
  collide. Theoretical; left.

---

# G2 — Non-Latin scripts

## Found

`games_source.jsx:4633` (pre-fix) cleaned every crossword term with:

```js
term.toUpperCase().replace(/\s+/g, '').replace(/[^A-ZÀ-ÿ]/g, '')
```

`À-ÿ` is U+00C0 to U+00FF: ASCII plus Latin-1, nothing else. It deleted **every letter** of
Arabic, Chinese, Cyrillic, Greek, Hebrew, Hindi, Japanese, Korean and Thai, and also of Latin
languages whose letters sit above U+00FF: **Vietnamese** (ơ ư ạ ầ), **Polish** (ł ą ę),
**Turkish** (ğ ş ı), Czech, Romanian. Vietnamese is one of AlloFlow's three hand-translated
primary languages. The same class appeared twice more in the keyboard path
(`:4777`, `:4827`), so even a correct grid could not be typed into.

The failure was **silent**: with nothing over two characters left, the build effect ran
`setGrid([])` and returned. A blank page, no message.

Measured against the pre-fix bundle (`git show HEAD:games_module.js`, mounted live):

```
HEAD crossword arabic     filled squares = 0   dir = null
HEAD crossword chinese    filled squares = 0   dir = null
HEAD crossword russian    filled squares = 0   dir = null
HEAD crossword vietnamese filled squares = 7   dir = null   (1 of 3 words survived)
```

## Changed

`buildCrosswordWords()` at `games_source.jsx:4863` is now a **pure function**, so a word list
can be tested without rendering anything. Every word carries `cells`: grapheme clusters, one
per printed square. The placement algorithm (`:4945-5030`) indexes `cells`, never the string,
so a Devanagari matra or an Arabic harakat can never be split across two squares.

Supporting helpers, `games_source.jsx:1-245`: `gameGraphemes` (Intl.Segmenter with an
`Array.from` fallback), `gameWordLetters` (`\p{L}\p{M}\p{N}` with the `u` flag),
`gameScriptOf`, `gameScriptIsRtl`, `gameMinGridLength`, `gameNormalizeGridLetters`.

### What I decided is honestly supportable, per script

| script class | decision | why |
|---|---|---|
| Latin (any extension), Cyrillic, Greek, Armenian, Georgian | **full support** | alphabetic; one letter per square is exactly right |
| Han, Kana, Hangul, Thai, Devanagari and siblings | **supported**, minimum word length 2 | one printed character per square is the correct model. The alphabetic three-letter floor threw away real two-character words: 光线, and Hindi जल. Measured: with a floor of 3 the Hindi list placed one word; the floor is now 2 for these scripts |
| Arabic, Hebrew, Thaana | **supported**, grid direction RTL, plus one honest caveat in the UI | see below |
| nothing placeable | **explicit empty state** | replaces the blank page |

### Arabic and Hebrew: what I did, and what I am not claiming

Printed Arabic crosswords (الكلمات المتقاطعة) really do use one isolated letter per square
filled right to left, so this is an existing form rather than something I invented. I set
`dir="rtl"` on the grid, mapped the physical arrow keys to the logical column step
(`games_source.jsx:5101`), moved the clue number from `left-0.5` to `start-0.5` (physically
wrong in an RTL grid otherwise), and added the case-folding equivalent each script needs:

- **Arabic**: strip harakat and tatweel; collapse the alef variants (آ أ إ ٱ) to bare alef and
  alef maqsura to yeh, because a writer varies those freely but a puzzle square cannot.
- **Hebrew**: strip niqqud; fold the final forms (ך ם ן ף ץ) to their medial forms, since a
  letter in the middle of a grid word is medial by definition.

Verified in Chromium: the Arabic grid computes `direction: rtl`, and reading the longest row
by physical x position gives logical columns `[12,11,10,9,8,7]` — it genuinely fills right to
left. English and Chinese give ascending columns.

**What I am not claiming.** I cannot read Arabic or Hebrew. I verified direction, cell count
and folding, not that a native reader finds the puzzle natural. One real limitation survives
and I chose to surface it rather than hide it: an isolated Arabic letter is not the shape it
takes inside a joined word, and lam-alef (لا) is two letters in one glyph. The game now says
so once, quietly, under the grid (`games.crossword.rtl_note`), instead of letting a student
conclude the rendering is broken. **This is the one place I would want a native reader's eyes
before shipping.**

### Other changes in this issue

- `isCrosswordLetterKey()` (`:4858`) replaces `/^[a-zA-ZÀ-ÿ]$/` in both the key handler and
  the on-screen square input. It accepts any single grapheme made of letters and marks, which
  also means a composed CJK character from an IME arrives as one key rather than two.
- The clue-highlight range used `c.word.length` (UTF-16 code units) against a grid laid out in
  grapheme cells; now `c.cells.length`.
- The on-screen square input lost `autoCapitalize="characters"` and its `uppercase` class:
  both are wrong for CJK IME composition and for Turkish casing, and cosmetic for everything
  else.

**On `\b`, since the prompt flagged it:** there is no `\b` on any term path in
`games_source.jsx`, `view_glossary_source.jsx` or `glossary_helpers_source.jsx`. I added a
standing comment at the top of the helper block saying not to reach for one, because it is
ASCII-only and would silently match nothing next to any of the letters above.

## Verified

`npx vitest run tests/glossary_activity_scripts.test.js` — 23 pass. The same assertions were
run against the pre-fix bundle first and fail there, so the tests are known to bite.
Screenshot of the Arabic, Chinese and English grids side by side: scratchpad
`crossword_scripts.png`.

---

# G3 — Rename to "Glossary"

## Found

Live user-facing occurrences of "Glossary & Language Selection", excluding `_codex_archive/`,
`.tmp/` and the `examples/` + `catalog/` lesson fixtures (which are saved lesson data, not UI):

1. `ui_strings.js` → `sidebar.tool_glossary`, `glossary.title`, `tools.glossary`
2. `desktop/web-app/public/ui_strings.js` (mirror of the above)
3. `guided_mode_config_source.jsx:66` — hardcoded English, **not** a `t()` key
4. `guided_mode_config_module.js:69` and the public mirror (generated from 3)
5. **All 63 language packs**, all three keys each

Nothing in `AlloFlowANTI.txt` or `help_strings.js` carries the phrase; the app reads it
through `t()` everywhere.

## Changed

All three `ui_strings.js` values now read `"Glossary"`, edited under
`fleet_lock.cjs acquire ui_strings.js --lane=L1`, with Edit only and a re-read after acquiring
(the line numbers had already moved from 2643/3544/7437 to 2809/3725/7627 under another lane).
Mirrored to `desktop/web-app/public/ui_strings.js`.

The **key names** are untouched, as instructed: `tool_glossary`, `glossary.title`,
`tools.glossary` all stay.

## Not changed, filed instead

- `guided_mode_config_source.jsx:66` is **Lane 9's file** → filed to L9.
- `lang/*.js` is **Lane 5's exclusive ownership** → filed to L5, with the derivation spelled
  out. This is a deletion, not a translation: the new value is the pack's existing word for
  "Glossary", which is the first component of the current string
  (`"المسرد واختيار اللغة"` → `"المسرد"`, `"词汇表与语言选择"` → `"词汇表"`). About a third of
  the packs are half-English hybrids like `"መዝገበ ቃላት & ቋንቋ Selection"` and
  `"Glossary & leb Selection"`, so a blind split on the connector will not do for all of them.
  189 values.

**For Aaron:** until L5 lands the packs, a non-English user still sees the old label. English
users see the new one immediately.

---

# G4 — Emoji corrupt Word Scramble

## Found

Aaron's read is right, and it is two faults that compound.

**Where the emoji comes from.** `generate_dispatcher_source.jsx:2080` and `:2121` add
`Include a relevant emoji for each term.` when Universal Settings has emoji on. The JSON
schema on the very next line is `[{ "term": "Name", "def": "...", "tier": "..." }]` — **no
emoji field**. So the emoji has nowhere to go except inside `term`.

**Where it becomes tofu.** `games_source.jsx:6286` (pre-fix) tiled the scramble with
`scrambled.split('')`, a UTF-16 **code unit** split. Every pictographic emoji is non-BMP, so
each one was handed to two `<div>` tiles as two lone surrogates, and a lone surrogate is
exactly the question-mark-in-a-box glyph.

Measured against the pre-fix bundle, term `"🌊 Erosion"`:

```
HEAD word scramble -> tiles = 10 (letters in "Erosion" = 7)
  tile 0 "\ud83c" U+D83C <-- LONE SURROGATE (renders as tofu)
  tile 1 "\udf0a" U+DF0A <-- LONE SURROGATE (renders as tofu)
  tile 2 "E" ... tile 7 " " U+20 (a blank tile for the space) ...
```

Two tofu tiles and one blank tile from a seven-letter word. Exactly the report.

**Every activity was checked, not just Word Scramble** — see the G1 table. Word Scramble was
the only one broken; Crossword was safe by accident (its Latin-1 filter deleted emoji along
with everything else), Word Search was already correct, and the card games treat the emoji as
decoration, which is what it is for.

## Changed

Shared token helpers, `games_source.jsx:30-118`. `GAME_EMOJI_SEQUENCE_RE` matches **whole
presentation sequences** — keycaps, regional-indicator flag pairs, and a pictographic base
plus its variation selectors, skin-tone modifiers and ZWJ continuations — so a family emoji is
removed as one unit rather than torn into three people and two invisible joiners. It is built
from a string of `\u` escapes rather than a literal, because U+200D / U+FE0F / U+20E3 are
zero-width and a literal one is invisible in a diff.

In `WordScrambleGame`:
- items are built through `gameTermParts` into `{ display, letters, emoji, def }`
  (`:6529`); eligibility runs on `letters`, so three emoji and one letter is correctly not a
  scrambleable word
- tiles walk `gameGraphemes(scrambled)`, not `split('')` (`:6714`)
- the emoji renders beside the clue as decoration, `aria-hidden` (`:6704`)
- `e.target.value.toUpperCase()` on every keystroke is gone (`:6734`). It was destructive — it
  breaks IME composition for every CJK input method and applies the wrong casing rule for
  Turkish — and redundant, because the input already carries Tailwind's `uppercase` class, so
  the visual result is unchanged
- the answer check folds both sides through `gameFoldAnswer`, so a student who types the word
  without its emoji (there is no way to type it) is marked correct
- hint text and hint count walk grapheme clusters

## Verified

6 emoji cases in `tests/glossary_activity_scripts.test.js`, including a tile-by-tile assertion
that no tile contains a surrogate, and that a ZWJ family emoji is stripped as one unit leaving
no orphaned joiners. The pre-fix evidence above came from the same harness.

## For Aaron

The consumer-side fix is the durable one: it covers hand-edited glossaries and imported packs
too. But **the root cause is upstream** and worth fixing: the glossary prompt should ask for a
separate `"emoji"` field instead of smuggling it into `term`, which would also stop it leaking
into flashcards, exports and TTS text. `generate_dispatcher_source.jsx` belongs to Lanes 3 and
4, so I filed it rather than editing it. `games_source.jsx` already reads `item.emoji` via
`gameTermParts`, so adding the field is purely additive.

---

# G5 — Dark mode

## Found — the mechanism, measured

The dark theme is a **generated remap layer** (`dev-tools/gen_docsuite_theme.cjs` →
`<style data-docsuite-theme="v1">` in `app_styles_source.jsx`) that only ever emits selectors
for **base** utilities: `.theme-dark .allo-docsuite .bg-slate-50`. Tailwind compiles
`hover:bg-slate-50` to `.hover\:bg-slate-50:hover`, which that selector **cannot match**.
`grep -c hover app_styles_source.jsx` = 1, and it is not a theme rule.

Two consequences, and the second one is why my first reading was wrong:

- An element that **also** carries a base bg utility is accidentally safe, because the remap
  sets that base `!important` and it beats the non-important hover rule. It just loses its
  hover feedback in dark mode.
- An element with **no** base surface or text colour of its own is exposed.

My first pass predicted ten broken elements from a static model of the generator. Rendering it
showed that was wrong: the `!important` protection meant most of them were fine. **The browser
corrected me, not the other way round.** Everything below is Chromium computed styles over the
real shipped class strings, the real Tailwind build, and all six `<style>` blocks from
`app_styles_source.jsx` (there is a second, unscoped dark layer at `:356` and `:688` that the
generated one is only half of; missing it also gave me a wrong answer at first).

**Dark mode, HEAD, full sweep of every element with its own visible text:**

| element | resting | hovered |
|---|---|---|
| glossary term row | 17.19:1 | **1.05:1** `#f1f5f9` on `#f8fafc` |
| glossary definition cell | 12.68:1 | **1.42:1** |
| matching audio-hints chip | 12.02:1 | **1.48:1** |
| matching reset chip | 8.96:1 | **1.78:1** |
| crossword clue buttons (×6 nodes) | 13.35:1 | **1.85:1** `#4338ca` on `#1e293b` |

10 elements below AA, **all hover-only**. No resting-state failure anywhere, which is what the
existing `tests/docsuite_theme_contrast.test.js` matrix already guarantees — that gate simply
never looks at variants.

So, mapped to Aaron's three reports:
- **"glossary item hover turns white and swallows the text"** → 1.05:1. Confirmed exactly.
- **"crossword looks too dark"** → the clue list going near-black on hover, 1.85:1.
- **"matching worksheet text too dark"** → the toolbar chips, 1.48 and 1.78:1. The cards
  themselves measured 9.85:1 and 7.34:1 at rest and were never the problem.

**Light mode, HEAD:** one pre-existing failure, the Word Scramble hint button at
`text-amber-600 #d97706` on `bg-amber-50 #fffbeb` = **3.07:1** resting, 2.86:1 hovered.

## Changed

Fixed in **CSS, not by branching on the theme in JS**. I built the JS version first
(`useGameTheme` + MutationObserver + per-theme class names) and threw it away: it reads the
theme one frame late on first paint, re-renders every game on a theme change for something
purely presentational, and the probe caught it emitting the light class into a dark page. A
stylesheet is correct before the first paint and cannot drift from the theme class.

- `games_source.jsx:320-346` — `GAME_HOVER_CSS` + `ensureGameHoverStyles()`, injected once at
  module load, guarded by element id. Classes `allo-ghov-soft`, `allo-ghov-tint`,
  `allo-ghov-link`, each with a light, a `.theme-dark` and a `.theme-contrast` rule.
- `view_glossary_source.jsx:150-184` — the same shape, `allo-vghov-row`.
- `allo-ghov-link` (the crossword clues) deliberately changes **no colour at all**: an
  underline reads as hover in every theme and no remap layer can break it.
- High contrast keeps its black surface and signals with a yellow ring, since that theme is
  binary by design.
- Word Scramble hint button: `text-amber-600` → `text-amber-800` (6.9:1), matching the
  crossword's own hint button.
- I **reverted** my own changes to the crossword hint/check/reveal buttons, the scramble
  skip/close buttons and the matching cards. They measured fine; the `!important` base already
  protects them, and changing working light-mode hovers for no measured benefit is churn.

## Verified — actual pixels

Chromium, real computed styles, both resting and hovered, sweeping **every** element that
paints its own visible text (not a hand-picked list, which could only have confirmed what I
already suspected):

| theme | HEAD | after |
|---|---|---|
| dark | **10 below AA** | **0** |
| light | **1 below AA** | **0** |
| high contrast | 0 | **0** |

Dark hover now measures 9.45:1 (term) and 6.97:1 (definition), with the highlight visibly
present rather than merely "not white". Light hover is 13.35:1 / 6.92:1. The definition row
matches across themes almost exactly; the bold term is higher in light. **I chose a dark hover
surface (`#334155`) that is unambiguously visible against both possible resting backgrounds
over one that matches light's ratio to two decimals** — worth knowing, since the prompt asked
for ratio matching.

Two harness notes, because both nearly produced a false pass:
- Headless Chromium does not reliably give a `:hover` computed style from a synthetic mouse
  move. The probe rewrites `:hover`/`:focus-within` to `[data-hov]`/`[data-fw]` attribute
  selectors — same declarations, same cascade order, same specificity class — and reports
  whether the hover *changed anything*, so a missing rule cannot masquerade as a pass.
- A gradient paints no `background-color`, so the naive walk-up reported a perfectly readable
  white-on-indigo button at 1.05:1. Fixed by reading the gradient's first stop.

Regression gate: `tests/glossary_activity_theme_contrast.test.js` pins the stylesheet shape
and asserts that **every class given a surface in the default rules also has a `.theme-dark`
and a `.theme-contrast` rule** — a missing dark rule is exactly this bug and is invisible by
eye, because the light value simply carries over.

## For Aaron / Lane 2

Filed to L2 with the full measurement. Two things beyond my files that they should have:
- `TOKEN_RE` in the generator **does** scan the token out of `hover:bg-slate-50` (its leading
  `\b` matches after the colon), so the generator believes it has covered a token whose
  selector it cannot reach. It needs a variant-aware pass, not a wider scan.
- `appsuiteFiles()` only picks up `view_*_source.jsx`, so `games_source.jsx` is never scanned
  even though the games render inside `<main class="allo-docsuite">`. MemoryGame has 9 colour
  tokens with no dark mapping at all (`from-indigo-200`, `via-indigo-500`,
  `ring-yellow-400/40`, …), BingoGame 2, StudentBingoGame 2. Those are gradients and rings, so
  no text-contrast failure fell out of my sweep, but they are unthemed.

One small behaviour change to flag: the Matching close button lost its red hover tint
(`hover:bg-red-50 hover:text-red-500`) in favour of the neutral themed surface. The red was a
light-only affordance; if you want it back it needs the same three-theme treatment.

---

# G6 — Phantom empty state

## Found — reproducible, three separate causes

Aaron could not reproduce it deliberately because it is not one bug. Three things can empty
that table and only one of them is a search, but the message
(`view_glossary_source.jsx:1586`, pre-fix) claimed all of them:

> "No terms match this search or vocabulary filter."

1. **The vocabulary filter is sticky.** `glossaryFilter` lives in the host's glossary reducer
   (`AlloFlowANTI.txt:8627`). Its `GLOSS_RESET` action **has no call site anywhere in the
   monolith** — I checked; the string appears exactly once, at its own declaration. So the
   filter survives a tool switch, a history load and a fresh generation.
2. **Some glossaries carry no tier at all.** `AlloFlowANTI.txt:53891` writes
   `tier: entry.tier === 'Domain-Specific' || entry.tier === 'Academic' ? entry.tier : undefined`.
   A glossary from that path plus a tier filter left over from a previous glossary = zero
   rows, no search involved. This is the one that best matches Aaron's description.
3. **A search term the user never typed.** `view_glossary_source.jsx:605`,
   `handleOpenCurrentFlashcardInGlossary`, writes the flashcard's term into
   `glossarySearchTerm` when a student opens a card in the glossary. Only
   `generate_dispatcher_source.jsx:1971` ever clears it, on a fresh *generation*.

**Root cause: confirmed** for 1 and 2. Cause 3 is real but would leave the term visible in the
search box (it is bound at `:910`), so it is the least likely to have been what Aaron saw.

## Changed

`view_glossary_source.jsx:800-880`. The empty state now names **only the constraints actually
in effect**:

- the word "search" cannot appear unless `glossarySearchTerm.trim()` is non-empty — this is
  the hardening the prompt asked for, and it holds regardless of which of the three causes fired
- a tier filter with no search says so, and offers "Show all terms"
- a search with no tier filter says so, and offers "Clear the search"
- both says both
- **a glossary where no entry carries a tier at all** gets its own message: "These terms are
  not sorted into academic and subject vocabulary yet." Telling a teacher "no terms match your
  filter" would send them hunting for a filter they set correctly

Seven new `ui_strings.js` keys under `glossary.empty_*`, added under lock.

## Not changed

I did **not** add a reset of `glossarySearchTerm` / `glossaryFilter` on a content change. That
is the true root-cause fix and it is four lines in `AlloFlowANTI.txt`, but it is a behaviour
change on shared state that five other lanes are editing right now, and "your filter silently
resets when you load from History" is a product call, not a defect fix. **Recommendation for
Aaron: do it.** Dispatch `GLOSS_RESET` (already written, never called) and clear
`glossarySearchTerm` when `generatedContent.id` changes.

## Verified

`tests/glossary_empty_state_and_print.test.js` — 12 pass, including an assertion that the
tier-only and tierless branches never reference the query, and a guard that fails if
`GLOSS_RESET` gains a call site so these notes get revisited.

---

# G7 — Printables

## Found

There are already **two** printing mechanisms, and the prompt's "reuse the one that exists"
pointed at the wrong one until I looked:

- **Word Search** uses a popup window: `handlePrintGame` at `AlloFlowANTI.txt:29662` does
  `window.open` + `document.write` of `#printable-game-area` plus a teacher answer-key grid.
- **Everything else** — the Matching worksheet (`games_source.jsx:1178`, with
  `matching.print_*` strings already in `ui_strings.js`) and the Bingo cards (`:5751`) — uses
  `window.print()` over the live modal, with `no-print` on the chrome and `print:` variants on
  the sheet.

Crossword is a fullscreen modal with the grid already rendered, so the second mechanism is the
one that fits. I built the popup version first, then deleted it: it would have been a third
printer for no gain, and popups get blocked.

## Changed

`games_source.jsx`, CrosswordGame:
- `printCrossword()` at `:5240` — `window.print()`, exactly like Matching and Bingo
- a print header with name and date fields, reusing the existing `matching.print_*` keys
- a **Print** button in the clue-panel toolbar
- the clue list prints in two columns beside the grid instead of scrolling
- a **separate answer-key page** (`break-before-page`) listing each clue number, its answer and
  its clue. It renders only for the duration of the print (`showAnswerKey`, cleared in a
  `finally`), so the on-screen puzzle is never spoiled
- squares print `print:bg-white print:text-black`, so a crossword printed from dark mode comes
  out black on white
- screen-only chrome (`SpeakButton`, the footer tip, the review screen, the controls row) is
  `no-print`

## Verified

`tests/glossary_empty_state_and_print.test.js` — 5 print assertions, including that
CrosswordGame contains no `window.open` or `document.write` (no second printer).

**Not verified: I did not print it.** I have no way to drive a real print dialog or produce a
PDF from this environment, so the print layout is asserted structurally and by reading the
`print:` classes, not by looking at paper. Worth one manual Ctrl+P before shipping. The rest
of the activity set (Memory, Student Bingo, Word Scramble) still has no print path; those are
screen games rather than worksheets, so I left them.

---

# Verification summary

| check | result |
|---|---|
| `node _build_games_module.js` | clean (the one `WARN: <Math>` is pre-existing on HEAD) |
| `node _build_view_glossary_module.js` | clean |
| `node --check` on both built modules | pass |
| `node dev-tools/check_source_pair_drift.js` | pass, `games_source.jsx` twin in sync |
| `node dev-tools/check_source_freshness.cjs` | pass |
| `node dev-tools/check_render_refs.cjs` / `check_keyless_map` / `check_view_props` / `check_window_icons` / `check_lang_json` / `verify_module_registry` | pass |
| targeted vitest, 35 glossary/game files | see below |
| Chromium contrast sweep, 3 themes | 0 below AA (was 10 dark / 1 light) |

## `npm run verify:gate` — fails, on two things that are not mine

Both were failing before I started; neither touches my files.

1. **`check_cmd_i18n` exits 1** — "cmd i18n manifest STALE", new keys
   `cmd.describe_current_media*`, `cmd.open_learning_web_explorer*`,
   `cmd.read_media_descriptions*`, `cmd.suggest_contextual_next_steps` (+9 more). These come
   from `allo_commands_source.jsx`, which is **modified in the tree right now** — Lane 7's
   work in progress. Fix is theirs: `node dev-tools/i18n/extract_cmd_keys.cjs`.
2. **`check_iife_lazy_lookup` exits 1** — `mailbox_script_source_module.js:4`,
   `walkthrough_copilot_cdn_module.js:3043`, `walkthrough_script_source_module.js:14`. All
   three are **unchanged since HEAD** (`git diff --quiet HEAD` is clean on each), so this is
   pre-existing on `main`, not fleet drift.

Per RULES section 4 I reported these rather than fixing or bypassing them.

**Note on the earlier gate run:** my first `npm run verify:gate | tail -40` reported exit 0.
That was the exit code of `tail`, not of the gate. Running the checks individually showed the
two failures above. Worth knowing for anyone else piping the gate.

## Test results

34 glossary and game test files, run together:

```
Test Files  34 passed (34)
     Tests  307 passed (307)
```

Three assertions in pre-existing tests needed updating to the new markup. All three were
assertions on the old string, not on the old behaviour, so the intent is preserved:

- `tests/glossary_game_correctness_contract.test.js` — `canScrambleWord(item.term)` →
  `canScrambleWord(parts.letters)`. The eligibility check still exists; it now runs on the
  term's letters instead of the raw term, which is the point of the G4 fix.
- `tests/crossword_game_dialog_a11y.test.js` — the speech control still sits immediately after
  the clue button, now wrapped in a `no-print` span.
- `tests/glossary_ui_ux_contract.test.js` — asserted the exact old empty-state sentence. Now
  asserts the branching contract instead (`renderGlossaryEmptyState`, the targeted clear
  actions, and `clearGlossaryFilters` still present for the both-active case).

**One more failure, not mine:** `tests/docsuite_theme_contrast.test.js` →
"AppStyles carries the CURRENT generator output (no drift)". Lane 2 has `dev-tools/gen_docsuite_theme.cjs`
+188 lines in the working tree (very likely the variant-aware pass I filed to them) but has
not regenerated `app_styles_source.jsx` yet, so the generated block and its generator disagree.
`app_styles_source.jsx` is unchanged since HEAD; the generator is not. Theirs to land, and I
did not regenerate their file.

**Caveat that follows from that:** my contrast numbers were measured against
`app_styles_source.jsx` as it stands now. When Lane 2 regenerates it with variant support, the
numbers for the elements I fixed still hold (custom `.allo-*hov-*` classes are outside the
generator's token space and cannot be rewritten by it), but some of my per-component classes
may become redundant. That is a good outcome and worth a quick re-run of the sweep afterwards.

---

# Everything I deliberately left, in one place

| what | why |
|---|---|
| Bingo caller / card language selector | a feature with a real design question (one control or three?), not a defect |
| Syntax Scramble's ASCII-capital sentence gate and space word-splitting | fixable for the first two, genuine word segmentation for CJK/Thai in the third. Half-fixing it would make it look supported when it is not |
| Memory's hardcoded English accessible labels | localization sweep, Lane 5 |
| Resetting `glossarySearchTerm` / `glossaryFilter` on content change | the real G6 root-cause fix, but a product call on shared state during a ten-lane run. Recommended above |
| `guided_mode_config_source.jsx` G3 rename | Lane 9's file, filed |
| `lang/*.js` G3 propagation, 189 values | Lane 5's exclusive file, filed with the derivation |
| A separate `"emoji"` field in the glossary schema | Lane 3/4's file, filed. My consumer-side fix makes it non-urgent |
| The shell-wide `hover:` remap gap | Lane 2's D3, filed with the mechanism, the measurement and two specific generator bugs |
| Print layout on actual paper | cannot drive a print dialog here; asserted structurally and flagged for one manual check |
| A native reader's review of the Arabic and Hebrew crosswords | I verified direction, cell count and folding, not naturalness |
