# Lane W2 — Theme apply + the visual verification sweep

**Lane:** W2 · **Wave:** 2 · **Status:** complete. 13 claims rendered and looked at; 10 PASS, 2 FAIL (1 fixed mid-run by another lane and re-verified, 1 built and handed over), 1 no-op. Task 1's apply was already done and is verified green. Task 3 had nothing to restamp.

Wave 1 fixed a great deal it could not see. This lane is the eyes. Every claim below was
rendered in Chromium and **looked at**, not read out of CSS.

## Method, stated once

The harness is `_dev_scratch/w2/harness.mjs`. Its one rule: **no hand-copied markup.** Each
case pulls its JSX *verbatim* out of the real source file (by anchor string, with a balanced
scan, so a lane shifting line numbers under me cannot silently change what is tested),
compiles it with the repo's own esbuild, and renders it against the shipped Tailwind bundle
(`app/static/css/main.069b6de4.css`) plus the real `app_styles_source.jsx` remap block. What
lands in the screenshot is markup the app actually ships.

Where a claim is about geometry or layering, the numbers come from
`getBoundingClientRect` / `elementFromPoint` in the rendered page; where it is about colour,
from a real pixel or a computed style, never from reading a class name.

---

## Verdict table

| # | Claim | Source | Verdict | Screenshot |
|---|---|---|---|---|
| 1 | Kokoro download pill: bottom-centre, small, non-blocking | L6/V1 | **PASS** | `c1-kokoro-pill-alone.png` |
| 1b | ...and sits **under modals** | L6/V1 | **FAIL** | `c1-kokoro-pill-under-modal.png` |
| 2 | Toast top-centre below the header | L9/D4 | **PASS** | `c2-toast-top-centre.png` |
| 2b | ...no collision with the sidebar Generate buttons | L9/D4 | **PASS** | `c2-toast-top-centre.png` |
| 2c | ...slide-in direction flipped | L9/D4 | **NO-OP** (pre-existing, repo-wide) | `c2-toast-top-centre.png` |
| 3 | Save chip auto-hides after ~6s; warnings do not | L9/D5 | **PASS** | `c3-savechip-{settled,warning}-t8.png` |
| 4 | Remediation pill dismiss X un-covers the launcher | L9/D6 | **PASS** | `c4-remediation-pill-{before,after}.png` |
| 5 | Directions card arrow replaced the pill | L9/D7 | **PASS** | `c5-directions-card.png` |
| 6 | Glossary row hover in dark, post-apply (16.30:1) | L1/G5 + L2/D3b | **PASS** | `c6-glossary-hover-dark.png` |
| 7a | Crossword print: grid black-on-white (light theme) | L1/G7 | **PASS** | `c7-crossword-print-light.png` |
| 7b | ...black-on-white **when printed from dark mode** | L1/G7 | **FAIL** | `c7b-crossword-print-appdark-oslight.png` |
| 7c | ...clues in two columns | L1/G7 | **PASS** | `c7-crossword-print-light.png` |
| 7d | ...answer key on its own page | L1/G7 | **PASS** | `c7b-crossword-answerkey.png` |
| 7e | ...no chrome | L1/G7 | **FAIL, then FIXED mid-run and re-verified** | `c7-crossword-print-light.png` |
| 8 | Cloze "cell (célula)" annotation, Spanish path | L3/L1 | **PASS** | `c8-cloze-after-typing-english.png` |
| 9 | Measured-level chip, all four verdict states | L3/C1 | **PASS** | `c9-measured-level-chip-{0..3}.png` |
| 10 | Mic meter: 5 bars, lights, invisible when inactive | L7/A4 | **PASS** | `c10-micmeter-{inactive,active-silent,active-quiet,active-loud}.png` |
| 11 | Language deck: green + check on right, red on wrong, announced | L10/C2 | **PASS** | `c11-langdeck-{unanswered,right-pick,wrong-pick}.png` |
| 12 | Translations control: hides/shows on the right rule | L4 | **PASS** (6/6 cases) | `c12-translations-{a..f}.png` |
| 12b | ...hint line reads correctly | L4 | **FAIL** ("a English") | `c12-translations-b.png` |
| 13 | Typography + narrator panels, 3 themes x 2 OS, post-L6 | L2/D1-D2 | **PASS** (90/90) | `c13-panels-{light,dark,contrast}-os{light,dark}.png` |

All screenshot paths are relative to `_dev_scratch/w2/shots/`.

---

## 1 — L6/V1, the Kokoro download pill

**Extracted from** `AlloFlowANTI.txt:46094` (the `zIndex: 9997` block), verbatim, rendered
with `kokoroLoadState = {loading: true, pct: 0.42}`.

**PASS — bottom-centre, small, non-blocking.** Measured in the rendered page:

```
box            261 x 37 px at (509, 747)      viewport 1280 x 800
centreOffset   0 px          <- exactly centred
bottomGap      16 px         <- matches the declared bottom: 16px
area           0.95% of the viewport
pointerEvents  none          position fixed      zIndex 9997
elementFromPoint at the pill's own centre -> NOT the pill (hitInsidePill: false)
text           "Downloading voice model 42%"   progress bar width 42%
page errors    none
```

I looked at `c1-kokoro-pill-alone.png`: a small dark rounded pill at the bottom centre, one
line of text, a short indigo progress bar at 42%, page content untouched behind it. This is
what Aaron asked for and it is nothing like the full-screen takeover it replaced.

**FAIL — it does not sit under modals.** L6's report says "`z-index: 9997` so it sits under
modals". That is the one geometric claim that does not survive rendering.

`zIndex: 9997` is above almost every dialog in the app. The z-index census of
`AlloFlowANTI.txt`:

| Layer | Count | Examples |
|---|---|---|
| `z-[60]` … `z-[500]` | ~40 | `fixed inset-0 z-[300]` (9 sites), `z-[200]` (7), `z-50` (4) |
| `z-[1000]` | 5 | the save chip, the remediation pills |
| above 9997 | 6 | `z-[10000]`, `z-[10001]`, `zIndex:99998/99999` |

So the ordinary modal layer in this app is 60 to 1000, and the pill outranks all of it.
Rendered against a real `fixed inset-0 z-[300]` overlay taken from the same file
(`c1-kokoro-pill-under-modal.png`), the pill paints **crisply on top of the modal scrim**,
undimmed, and `elementFromPoint` with `pointer-events` momentarily restored returns the pill:

```
pillZ 9997   modalZ 300   paintsOnTop: true
```

**Severity: low, but real.** `pointer-events: none` means it can never intercept a click, so
nothing becomes unusable. It is a visual overlap during a genuine download, and a dialog whose
card reaches the bottom of the viewport (several do) would have the pill sitting on it.

**Not fixed by me:** `AlloFlowANTI.txt` is a lock-protected hot file owned in wave 2 by W5.
Filed to `CROSS_LANE_REQUESTS.md`. The fix is one number: `zIndex: 9997` -> `zIndex: 40`,
which keeps it above page content and below every dialog layer in the census above.

---

## 2 — L9/D4, toast placement

**Extracted from** `AlloFlowANTI.txt:46423-46461` (the `z-[170]` toast container), verbatim,
with three seeded toasts (success / info / error). The shell is built to the app's real
numbers: an 80px header (`mainTopOffset`'s default), a 380px sidebar, and two Generate
buttons carrying the **real** `SIDEBAR_PANEL_UI.primaryAction` class string read out of
`view_sidebar_panels_source.jsx:53`.

**PASS — top-centre, below the header.**

```
computed top           92px      = mainTopOffset (80) + 0.75rem (12)   <- clears the header
horizontalCentreOffset 0 px
overlapsHeader         false
container pointerEvents none  /  toast card pointerEvents auto   <- the page stays clickable
                                                                    around the toast
```

**PASS — no collision with the Generate buttons.** The Generate buttons measure
`y 699-800` at the bottom of the sidebar; the toast stack occupies `y 92-~320` centred
horizontally. `overlapsGenerate: false`, `overlapsSidebar: false`, and
`elementFromPoint` at each Generate button's centre returns the button itself. I looked at
`c2-toast-top-centre.png`: three colour-coded cards stacked under the header band, the
sidebar and its Generate buttons completely clear.

**NO-OP — the slide-in direction cannot be seen, and never could.** L9 flipped
`slide-in-from-bottom-2` to `slide-in-from-top-2`. Measured on the rendered card:

```
className contains   animate-in  slide-in-from-top-2  fade-in
getComputedStyle(...).animationName   ->  "none"
```

Those are `tailwindcss-animate` utilities. The plugin is **not installed** and
`desktop/web-app/tailwind.config.js` declares `plugins: []`, so they compile to nothing:

```
$ grep -c "animate-in" app/static/css/main.069b6de4.css   ->  0
$ grep -c "slide-in"   app/static/css/main.069b6de4.css   ->  0
$ grep -c "fade-in"    app/static/css/main.069b6de4.css   ->  0
```

**This is not L9's regression** and I want to be exact about that: `git show
HEAD:AlloFlowANTI.txt | grep -c animate-in` returns 23, so the class was already inert at
HEAD. L9's edit was right in intent and is inert in effect, in both the old direction and the
new one. Recorded for Aaron under "Repo-wide findings"; not a lane fix.

**Correction to a number I first published here.** I originally wrote "949 `slide-in-from-*`
uses across the repo's sources". That count was wrong: it swept `.tmp/` build temporaries,
the `desktop/web-app/src/` mirrors, `_archive/`, and the compiled `*_module.js` copies of the
same source lines, so it counted each real call site several times. The corrected figure is in
"Repo-wide findings" below.

**One note, not a defect.** The toast centres on the *viewport*, so with a 380px sidebar it
sits slightly right of the layout's optical centre, over the preview pane. L9's stated
reasoning was that centring "favours neither the sidebar nor the preview pane"; in practice
it leans to the preview pane. It collides with nothing, so I left it.

---

## 3 — L9/D5, the save chip auto-hide

Verified **in real time**, not by reading the effect's deps: the real `useState` +
`useEffect` block (`AlloFlowANTI.txt:25429-25436`) was lifted verbatim into the component
body and drives the real render gate (`:53175-53199`). Chromium, wall-clock.

| State | t = 1s | t = 8s | Verdict |
|---|---|---|---|
| settled (`Saved on device`) | present, `bottom-4 left-4`, 155px wide | **gone from the DOM** | PASS |
| warning (`Storage is off`) | present | **still present** | PASS |

The chip leaves the DOM rather than fading via CSS, so the `role="status"` live region
actually leaves the accessibility tree instead of lingering invisibly. That is what L9
claimed and it is what happens.

---

## 4 — L9/D6, the remediation pill's dismiss X

Pill from `AlloFlowANTI.txt:53923-53954`, verbatim, with real local `pdfReturnPillDismissed`
state so the X genuinely works. The student-tools launcher carries the **real** class string
from `view_fab_stack_source.jsx:213`.

**The collision L9 described is real, and I photographed it.** Before dismissal:

```
pill      x 971-1264   y 734-784      (z-index 1000)
launcher  x 1200-1256  y 712-768      (z-index 180)
overlapsLauncher   true
elementFromPoint at the launcher's centre -> BUTTON.bg-emerald-600  (the pill)
launcherClickable  false
```

In `c4-remediation-pill-before.png` the indigo launcher is visibly buried behind the emerald
"Return to remediation 92/100" pill, only its top edge showing.

**PASS after dismissal.** Clicking the X (`aria-label="Hide the return to remediation
button"`):

```
pillPresent        false
launcherHit        fab-btn
launcherClickable  true
page errors        none
```

`c4-remediation-pill-after.png` shows the launcher alone and unobstructed. The dismiss
control exists, it works, and it clears the collision.

---

## 5 — L9/D7, the Directions card arrow

Card from `AlloFlowANTI.txt:48422-48444`, verbatim. Measured on the badge element:

```
text            "you write it"
hasChevron      true
borderRadius    0px          borderWidth  0px
background      rgba(0,0,0,0)    padding  0px
looksLikeAPill  false
```

**PASS.** `c5-directions-card.png`: "you write it" is plain amber text with a chevron at the
right edge of the card, no capsule, no border, no fill. The card reads as one affordance
pointing at what opens. The information the badge carried is kept.

---

## 7 — L1/G7, the crossword print stylesheet

This one mounts the **real built component**: `games_module.js` is loaded into the page and
`window.AlloModules.CrosswordGame` is rendered with ten real glossary terms, inside the app's
real nesting (`<div class="theme-X">` ... `<main class="allo-docsuite">`, matching
`AlloFlowANTI.txt:45291` and `:47499`). Then `page.emulateMedia({media:'print'})`, so the
`@media print` block and every `print:` variant in the shipped bundle are the rules actually
in force. App theme was crossed against OS colour scheme, because those are two different
mechanisms and only one of them belongs to the app.

L1 said plainly "I did not print it". Four of their five sub-claims hold. Two do not.

### PASS — the grid, from light mode

```
app theme light, either OS:
  letter square   bg rgb(255,255,255)   fg rgb(0,0,0)   contrast 21.00
  winning rules:  .bg-white                            -> #fff
                  @media print  .print\:bg-white       -> #fff
```

### PASS — clues in two columns, and the print header

`getComputedStyle(...).columnCount === "2"` on the clue panel, and I looked at it: ACROSS and
DOWN sit side by side beside the grid, with the Name / Date rules above. Twelve `.no-print`
elements are all `display: none` in print media, so that half of L1's work landed.

### PASS — the answer key is real and it is on its own page

The key exists only between `setShowAnswerKey(true)` and the `finally` that clears it. I
parked the flow exactly there by stubbing `requestAnimationFrame` (the cleanup lives inside
the rAF callback, so it never runs); nothing else was faked.

```
present true   display block   break-before "page"   13 entries
"Across 6. photosynthesis  How a plant makes food from sunlight.  8. energy ... "
"Down   1. oxygen  The gas a plant gives off.  2. glucose ... "
```

`c7b-crossword-answerkey.png` shows the puzzle page, then a page break, then "Answer key"
with ACROSS and DOWN in two columns, each entry numbered with the answer in bold. On-screen
state is not spoiled: after the print flow completes, `.break-before-page` is gone from the
DOM again.

### FAIL — "printed from dark mode comes out black on white". It does not.

L1's exact claim: "squares print `print:bg-white print:text-black`, so a crossword printed
from dark mode comes out black on white."

```
app theme dark, OS light  (and identically with OS dark):
  letter square   bg rgb(30,41,59)      fg rgb(241,245,249)
  container       bg rgb(30,41,59)

  background-color rules matching that square, in cascade order:
        .bg-white                                                   -> #fff
        @media print   .print\:bg-white                             -> #fff
      ! .theme-dark .bg-white                                       -> #162032
      ! .theme-dark .allo-docsuite .bg-slate-100, ... .bg-white     -> #1e293b   <- wins
```

**The mechanism, stated exactly.** `print:bg-white` compiles to a plain declaration inside
`@media print`. The docsuite dark remap emits `!important`. `!important` beats a non-important
declaration unconditionally, regardless of specificity, source order, or media. So every
`print:` colour variant in the repo is **unreachable in dark mode** wherever the remap covers
the same property. The crossword is simply the instance L1 named.

Two things worth being precise about:

1. **This is not the OS `dark:` mechanism.** Light OS and dark OS give byte-identical results,
   and `CrosswordGame` contains zero `dark:` utilities. It is the app's own theme remap.
2. **The page is legible, but it is not a worksheet.** Square contrast is 13.35, so nothing is
   invisible. The problem is that a teacher who works in dark mode gets a full-bleed
   `#1e293b` page: `c7b-crossword-print-appdark-oslight.png` is a near-black sheet. That is a
   toner and readability failure, not a contrast failure.

**This one is mine to fix, and I am holding it deliberately.** The offending rules come out of
`dev-tools/gen_docsuite_theme.cjs` into `app_styles_source.jsx` — both W2-owned. The fix is at
the generator: emit the whole remap inside `@media screen`, so print falls back to the base
Tailwind utilities and every surface prints light regardless of app theme. That is the
"kill the class, not the instance" shape L2 used, and it fixes every `print:` colour site at
once rather than the crossword alone.

I am **not** doing it before the Task 1 apply. That apply is a hand-off L2 verified end to
end, and changing the generator's output structure underneath it would invalidate their
41-test matrix and their "light mode is byte-identical" assertion in the same motion. Sequence
matters more than speed here: apply first, confirm green, then this. Status recorded below
under "Task 1".

### FAIL — "no chrome". The modal header prints.

```
all four theme x OS combinations:
  modal header display in print media: flex
  header text: "Crossword  [sun] Light"   /   "Crossword  [moon] Dark"
```

The crossword modal's indigo top bar, with the game title, the **theme toggle** and the
**close button**, prints onto the worksheet. It is visible at the top of every print
screenshot here. L1's list of screen-only chrome was "SpeakButton, the footer tip, the review
screen, the controls row" and the header bar is not in it, so this looks like an omission
rather than a regression. The twelve elements that were marked `no-print` are all correctly
hidden.

`games_source.jsx` has no wave-2 owner and is not mine. Filed to `CROSS_LANE_REQUESTS.md`;
the fix is adding `no-print` to the header bar's className.

---

# Task 3 — the stale `?v=` cache pins

**Result: nothing to restamp. The condition L6 filed is already resolved, and the
"check every module rebuilt in wave 1" sweep finds no second instance.** Details, because
"no change needed" is only useful with the evidence attached.

### The pin scheme is two schemes, and that matters

I scanned every `<file>.js?v=<8 hex>` occurrence in `AlloFlowANTI.txt` (196 of them) and
compared each against `sha256(file).slice(0,8)`, the hash
`tests/karaoke_audio_store_resilience.test.js:35` uses. A naive read says ~160 are "stale".
They are not:

- **The global deploy stamp.** ~150 pins are the literal string `3c094e07`, which is not a
  content hash at all. It is a commit: `3c094e07a "Baseline test_prep_hub module staleness
  ..."`, followed by `39b7979fe "Post-deploy: update CDN hash refs to @3c094e07a"`. These are
  bumped in one sweep at deploy time. They are not per-lane drift and restamping them by hand
  would be wrong.
- **Per-file content hashes.** Only four modules are pinned to their own content hash, and the
  test names exactly those four. All four match today:

| Module | Pin in ANTI | `sha256(disk).slice(0,8)` | |
|---|---|---|---|
| `karaoke_audio_store_module.js` | `398e7a6a` | `398e7a6a` | OK |
| `tts_module.js` | `8405ef04` | `8405ef04` | OK (L6's own restamp) |
| `immersive_reader_module.js` | `5bba32e1` | `5bba32e1` | OK |
| `view_simplified_module.js` | `471f48e1` | `471f48e1` | **OK — this is the one L6 filed** |

### Why it is already fixed

```
$ npx vitest run tests/karaoke_audio_store_resilience.test.js
  Test Files  1 passed (1)      Tests  31 passed (31)
```

The restamp landed in Aaron's wave-1 checkpoint commit:

```
$ git log --oneline -S "view_simplified_module.js?v=471f48e1" -- AlloFlowANTI.txt
944237f7c  Fleet 2026-08-16: eleven-lane fix wave across glossary, theme, language, voice, exports, and shell
```

`git diff HEAD -- view_simplified_module.js` is empty, and HEAD's pin already reads
`471f48e1`, so module and pin agree at HEAD and on disk. L6's report described the pre-commit
state accurately; the checkpoint resolved it. **I made no edit, and took no lock on
`AlloFlowANTI.txt`** — there was nothing to change, and taking a lock on the fleet's hottest
file to change nothing would have been the wrong move mid-wave.

### The sweep for a second instance

Modules modified in the working tree since the checkpoint (wave-2 work in flight):
`allo_commands`, `doc_pipeline`, `games`, `generate_dispatcher`, `student_analytics`,
`view_export_preview`, `view_glossary`. **Every one of them carries the global `3c094e07`
deploy stamp, not a content hash**, so none needs a per-file restamp. The six other modules
carrying a unique non-global pin (`error_reporter`, `allo_quest_contract`,
`tutorial_compiler`, `video_studio`, `dispro_analyzer`, `family_announcements` — two of which,
`da080303` and `fa080301`, are hand-written date stamps rather than hashes) are all
`unchanged vs HEAD`, so no wave-1 lane rebuilt them.

**For Aaron:** the mirror check in that same test (`read(file) === read('desktop/web-app/public/' + file)`)
passes for all four, and my full scan found no mirror drift on any pinned module.

---

## 8 — L3/L1, the cloze "cell (célula)" annotation

L3: "Not verified in a browser. I did not render the Spanish cloze path." Rendered now.

The **real built** `ClozeInput` out of `misc_components_module.js`, mounted inside a Spanish
sentence with exactly the props `text_utility_helpers_source.jsx` builds for a blank that
replaced "célula" where the glossary term is the English "cell":

```
targetWord "cell"   acceptedAnswers ["cell","célula"]   displayWord "célula"   passageWord "célula"
```

Then four real keystrokes, `c-e-l-l`, with `page.type`.

**PASS.**

```
inputValue                 "cell"        <- the learner's own word, not rewritten
readOnly                   true
input bg/text/underline    rgb(240,253,244) / rgb(22,101,52) / rgb(34,197,94)   (success green)
annotation beside          "(célula)"
annotation title           "In the passage: célula"
screen reader announcement "Correct answer. In the passage: célula"
rendered sentence          "La cell (célula) es la unidad básica de la vida."
page errors                none
```

`c8-cloze-after-typing-english.png`: the blank reads **cell** in green, with **(célula)** in
smaller green type immediately after it, and the sentence still scans in Spanish. That is
Aaron's request exactly, and the learner's correct answer is not silently corrected.

**Control run, because a check that can only pass is not a check.** Typing the Spanish term
instead:

```
inputValue "célula"   annotationBeside null
```

The parenthetical appears only when the learner's word differs from the passage's, so a
Spanish answer is not annotated with itself. L3's `answerMatches`-based `showPassageForm`
guard does what it says.

**One cosmetic note, not filed.** At the default font size the `(célula)` sits tight against
the input's focus ring, which slightly clips its left edge. It is legible, it is a 1px
`ms-1` question, and `misc_components_source.jsx` is not mine.

---

## 9 — L3/C1, the measured-level chip

Chip pulled verbatim from `view_simplified_source.jsx:1471-1497` (the self-contained IIFE) and
rendered once per verdict state, with `t` reading the **real** `simplified.*` values out of
`ui_strings.js` rather than my own English.

**PASS, all four states, no page errors.**

| Case | Rendered text | Background / text | Verdict |
|---|---|---|---|
| target 5th, measured **5.4** | `Measured reading level 5.4 On target for 5th Grade` | `#f0fdf4` / `#14532d` green | correct |
| target 5th, measured **8.1** | `... 8.1 Above the 5th Grade target` | `#fffbeb` / `#78350f` amber | correct |
| target 8th, measured **4.2** | `... 4.2 Below the 8th Grade target` | `#eff6ff` / `#1e3a8a` blue | correct |
| target **College**, measured 12.6 | `... 12.6` then the note, **no verdict** | `#f8fafc` / `#334155` slate | correct |

The College case is the one worth calling out: it shows the number and declines to judge,
because Flesch-Kincaid has no College equivalent. That is the honest behaviour L3 described and
it is what renders.

The hover title carries the working:

```
Flesch-Kincaid: (0.39 × ASL) + (11.8 × ASW) - 15.59
Words: 610   Sentences: 41   Syllables: 1010
```

**Placeholder check.** The component calls `t('simplified.measured_above', { grade: targetGrade })`
and `ui_strings.js:4622` is `"Above the {grade} target"` — the names agree, so no literal
`{grade}` leaks to the teacher. (L3's prose called these `{delta}`/`{target}`; the shipped keys
use `{grade}`. The code and the strings match each other, which is what matters.)

**Not verified:** the `!generatedContent.levelCheck` suppression (chip hides while the Check
Level panel is open). It is the first clause of the fragment I rendered, so it is in the code
under test, but I did not render a case with `levelCheck` set and I am not claiming I did.

---

## 10 — L7/A4, the mic meter

L7 verified this by server-side render, and said so plainly: "SSR runs no effects, so the
level stays at 0 in the test. Nobody has watched the bars move." The real built
`window.AlloModules.AlloMicMeter` is mounted here in a live browser, in both placements, and
driven through its own documented fallback contract, the `alloflow:mic-level` window event.

**PASS on every part of the claim.**

| Level dispatched | `data-allo-mic-level` | Bars lit (emerald `rgb(110,231,183)`) | Meters in DOM |
|---|---|---|---|
| inactive | — | — | **0** (renders nothing) |
| active, 0 | 0 | 0 of 5 | 2 |
| active, 0.25 | 1 | 1 of 5 | 2 |
| active, 0.9 | 5 | 5 of 5 | 2 |

```
bars           5            heights 4/6/8/10/12px, ascending
aria-hidden    true         pointerEvents none
placement="inline"  -> position static     (the global voice pill)
placement="below"   -> position absolute   (under the AlloBot ring)
page errors    none
```

I looked at `c10-micmeter-active-quiet.png`: five ascending bars in both spots, the first lit
emerald, the rest at `white/25`. It reads as a level meter at a glance.

**The global voice pill placement is real.** `AlloFlowANTI.txt:53192` resolves
`window.AlloModules.AlloMicMeter` and `:53200` renders it as
`<_MicMeter active placement="inline" motionDisabled={disableAnimations} />` inside the
`fixed bottom-24 left-4 z-[11500]` status pill, gated on the mic actually being open
(`!_vPaused && !_vBusy`). So a moving bar there is a true statement, which was L7's stated
design goal.

**Still not verified, and it is the same gap L7 named:** nobody has spoken into a real
microphone and watched these move. What I have shown is that the component renders, subscribes,
and responds correctly to the level contract. Whether `micLevelMonitor` publishes sensible RMS
values off a real analyser needs a human with a mic. One small thing a human should sanity
check: `Math.round(level * 5)` lights all five bars from 0.9 upward, so the top bar is not a
"clipping" indicator.

---

## 11 — L10/C2, Language Deck practice

L10: "Not verified in a browser. I did not render the flashcard quiz and click through it...
the visual result (green on the right option, red only on a genuinely wrong pick) is
unconfirmed by eye." Confirmed by eye now.

The option renderer is pulled verbatim from `view_glossary_source.jsx:1104-1121`, and the
grader is the **real** `flashcardCorrectAnswer` helper lifted verbatim from
`AlloFlowANTI.txt:2550-2559` along with `const FLASHCARD_NO_ANSWER = 'Translation unavailable'`.
Language Deck mode, Spanish, on the item Aaron's report describes:

```
item.term        "cell"
item.def         "The basic unit of life."          <- the OLD comparison target
translations.Spanish  "célula: La unidad básica de la vida."
correct option   "La unidad básica de la vida."     <- what the helper returns
```

**PASS — the student picks the right translation.**

```
verdict headline  "Correct! Great Job!"   role=status  aria-live=polite  aria-atomic=true
right option      bg rgb(21,128,61)  green-700, check icon, ring, full opacity
other options     bg rgba(255,255,255,0.05)  opacity 0.3, no icon
red anywhere      NONE
```

`c11-langdeck-right-pick.png`: one green row with a tick, headline "CORRECT! GREAT JOB!",
distractors dimmed. The contradiction Aaron reported (chime says right, screen says wrong) is
gone.

**PASS — the student picks a wrong translation.**

```
verdict headline  "Not quite. Try again."
right option      green-700 + check      <- revealed, as it should be
picked option     bg rgb(239,68,68) red-500 + cross, opacity 0.8
other two         dimmed to 0.3
```

**PASS — announced.** The verdict headline carries `role="status" aria-live="polite"
aria-atomic="true"`, so the verdict reaches a screen reader instead of being colour and icon
only. That was L10's silent-announcer fix and it is present in the rendered DOM.

**Not verified:** the chime itself. `playSound('correct')` is a host closure I did not wire, so
"green **and** chime" is verified on the green half by pixels and on the chime half only by
L10's single-source-of-truth test. The two now read the same string, which is the thing that
was broken.

---

## 12 — L4, the Translations control in Universal Settings

Control JSX pulled verbatim from `view_sidebar_panels_source.jsx:722-751`, class strings from
the real `SIDEBAR_PANEL_UI`, copy from the real `ui_strings.js` values, and visibility and hint
driven by the **real** resolver loaded out of `text_pipeline_helpers_module.js`
(`resolveTranslationPolicy`, `isTranslationControlRelevant`, `translationTargetChoices`).
Nothing about the logic is restated in the probe.

**PASS on visibility, all six cases.**

| # | Output lang | UI lang | Stored mode | Visible? | Selected | Resolver |
|---|---|---|---|---|---|---|
| A | English | English | unset | **no** | — | `{enabled:false, target:'', mode:'auto'}` |
| B | Spanish | English | unset | yes | `Automatic (English)` | `{enabled:true, target:'English', mode:'auto'}` |
| C | Spanish | English | `off` | yes | `None` | `{enabled:false, target:'', mode:'off'}` |
| D | Spanish | English | `Vietnamese` | yes | `Vietnamese` | `{enabled:true, target:'Vietnamese', mode:'Vietnamese'}` |
| E | English | English | `off` | **yes** | `None` | `{enabled:false, target:'', mode:'off'}` |
| F | Spanish | Spanish | unset | **no** | — | `{enabled:false, target:'', mode:'auto'}` |

Case A is Aaron's majority user: English UI, English output, control not rendered at all.
Case F is the subtler one and it also holds: a Spanish UI generating Spanish content has
nothing to translate into, so the control stays away.

**Case E is the clause that makes the setting reversible, and it works.** Once a teacher has
chosen `off`, the control stays visible even when the rule would hide it, so "off" is not a
one-way door. Without it the control that set the value would disappear the moment output went
back to English and there would be no way to undo it.

Also confirmed: `translationTargetChoices` excludes the output language from the option list
(case B offers English and Vietnamese, not Spanish), and `target` is `''` rather than
`undefined` on a disabled policy, so nothing can interpolate the string "undefined" into a
prompt. Both are properties L4 argued for; both hold at runtime.

### FAIL — the hint line has an article agreement bug

```
case B hint:  "Resources in Spanish will also include a English version."
```

`ui_strings.js:3005` is `"translations_on_hint": "Resources in {output} will also include a {target} version."`
The article `a` is hardcoded in front of an interpolated language name. Every target beginning
with a vowel sound reads wrong: **English**, Italian, Igbo, Indonesian, Irish, Arabic, Amharic,
Albanian, Armenian, Estonian, Urdu.

This is not a corner case. **Case B is the single most common state in which this control is
visible at all** (English-speaking teacher, non-English output, setting untouched), and
`auto` resolves to the UI language, which for most of this user base is English. So the
default visible state of the new control shows "a English version". Photographed in
`c12-translations-b.png`.

The fix that works for every language is to drop the article rather than branch on it:
`"Resources in {output} will also include a version in {target}."` Same meaning, no agreement
problem, and it does not push the article problem onto 63 translators.

`ui_strings.js` is W1's file in wave 2. Filed to `CROSS_LANE_REQUESTS.md`.

---

## 6 — L1/G5 + L2/D3b, the glossary row hover, measured in the applied CSS

L2's `probe_v3.mjs` measured 1.05 -> 16.30 against a generated block that had **not been
pasted yet**, and against `app/static/css/main.d46f2539.css`, a bundle filename that no longer
exists on disk. Both halves are re-measured here against what is actually shipped today:
`app/static/css/main.069b6de4.css` and the block now in `app_styles_source.jsx`
(166,723 bytes, **928 state-variant selectors**). Real screenshot pixels, real `:hover` and
`:focus`, OS colour scheme pinned to light so nothing measured here can be a `dark:` variant.

**PASS — and L2's number reproduces exactly.**

| Probe (app theme dark) | Hover pixel | Text | Ratio |
|---|---|---|---|
| `hover:bg-slate-50 focus-within:bg-slate-50` (the class L2 measured) | `rgb(15,23,42)` | `rgb(241,245,249)` | **16.30** |
| the **real** row, `class="group/row allo-vghov-row"` | `rgb(51,65,85)` | `rgb(241,245,249)` | 9.45 |
| `hover:bg-slate-100` (filter chip, games row) | `rgb(30,41,59)` | | 13.35 |
| `hover:text-emerald-700 hover:bg-emerald-50` (phonics) | `rgb(2,44,34)` | `rgb(110,231,183)` | 9.94 |
| `hover:bg-indigo-50` (games card) | `rgb(30,27,75)` | | 14.59 |
| `hover:bg-green-50` (menu item) | `rgb(5,46,22)` | | 13.61 |
| `focus-visible:bg-slate-100` / `group-hover:bg-slate-100` | `rgb(30,41,59)` | | 13.35 |

**27 measurements across dark, light and contrast: zero below AA, worst case 5.21**
(`hover:bg-emerald-50` in light mode). The contrast theme lands at 19.56 across the board
(black surface, yellow text).

**Worth recording: the row now has two independent fixes, and they agree.** L1 shipped an
injected stylesheet in `view_glossary_source.jsx` keyed on `.allo-vghov-row`
(`#f1f5f9` light / `#334155` dark / `#000000` + yellow outline contrast, all `!important`),
and L2 fixed the same failure at the generator. On the real row L1's rule wins on specificity,
giving 9.45 rather than 16.30. Both are safely above AA, so this is not a conflict, but the
number Aaron will see on the actual glossary row is **9.45, not 16.30** — 16.30 is what the
bare utility now measures. I would rather state that than let a number travel that nobody can
reproduce in the app.

---

## 13 — L2/D1-D2, the header panels re-shot after L6's edits

`_headerPanelSkin` lifted from the **built** `view_header_module.js` via `vm`, the same method
L2 used, so the palette under test is the shipped one and not a hand copy.

**PASS. 90 measurements, 3 app themes x 2 OS settings x 15 probes: zero below WCAG AA,
worst case 4.75** (`tts head`, `rgb(37,99,235)` on `rgb(239,246,255)`, light/OS-light). That is
identical to L2's post-fix figure, so nothing regressed.

I looked at `c13-panels-dark-oslight.png` — **the combination Aaron reported as broken**: app
theme dark with the OS in light mode. Both panels render as slate cards with white text, a blue
Reset action, a readable font preview, the bionic toggle, and the blue "ACTIVE TTS: SPANISH"
card. Nothing is white-on-white. The `contrast` shots show L2's black/yellow branch.

**One claim of L2's I want to correct, in their favour.** A naive `grep "dark:"` on
`view_header_source.jsx` returns 5 hits, which looks like a regression against L2's "the file
now has zero". It is not: three are inside comments explaining the mechanism, and two are
JavaScript object keys (`dark: 'reading_theme_dark'`, `dark: 'Dark'`). Constrained to a
`className` context the count is **0**. L2's claim stands.

**Scope note.** `view_header_source.jsx` currently has 27 uncommitted lines from W3 (their C4b
`window.History` follow-through), and `view_header_module.js` is **not yet rebuilt** from them,
so the skin I lifted is HEAD's. I checked their diff: it touches neither `_headerPanelSkin` nor
any colour utility, so the palette is the same either way. Their rebuild is theirs to run.

---

# Task 1 — the pending apply

**Result: L2's apply was already run and committed before wave 2 started. I verified the whole
sequence rather than repeating it, and everything is green.**

`git log -S 'class~="hover:bg-slate-50"' -- app_styles_source.jsx` points at **`944237f7c`**,
Aaron's wave-1 checkpoint commit, and `git diff HEAD -- app_styles_source.jsx` is empty. So the
v3 block is applied, committed, and unmodified in the working tree. `dev-tools/gen_docsuite_theme.cjs`'s
v3 generator landed in `df8db3716`.

Running L2's sequence as a verification pass:

| Step | Expected | Actual |
|---|---|---|
| `node dev-tools/_apply_docsuite_theme.cjs` | paste the fresh block | **not run** — already applied, see below |
| `node dev-tools/gen_docsuite_theme.cjs --check` | `current` | `✓ scoped theme CSS is current (268 lines, 3 scopes)` |
| `node _build_app_styles_module.js` | rebuild | **not run** — module already carries the variant layer, and its `desktop/web-app/public/` mirror is byte-identical |
| `npx vitest run tests/docsuite_theme_contrast.test.js` | 41/41 | **41 passed (41)** |
| `node dev-tools/scan_dark_mode_contrast.cjs` | a large drop | **128 findings, 128 baselined, 0 new** (down from L2's 402, exactly the drop they predicted) |
| `npx vitest run tests/dark_mode_contrast_gate.test.js` | 3/3 | **3 passed (3)** |

**Why I did not run the two mutating steps.** `--check` reports current and the built module
already contains `[class~="hover:bg-slate-50"]`, so `_apply_docsuite_theme.cjs` and
`_build_app_styles_module.js` had nothing to do. Running them anyway would have rewritten a
committed file mid-wave for no change, and `--update-baseline` would have rewritten a baseline
that already reports `0 new`. In a shared tree with lanes still writing, a no-op write is not
free. The verification above is the same assertion the sequence exists to make.

**The timing rule still applies and I honoured it.** The generated block snapshots the colour
token union across every scanned view file, so a lane adding a new colour utility re-stales it.
W3 and W5 were still writing while I worked, so I re-checked at the end; the result is recorded
in the closing status below. If it goes stale after they finish, the apply is the six-command
sequence above and it is safe to run then.

**L2's pixel probe, re-run.** Their `probe_v3.mjs` cannot run as written — it reads
`app/static/css/main.d46f2539.css`, which no longer exists (the bundle is now
`main.069b6de4.css`), and `_dev_scratch/l2/theme_v3.css`, the pre-apply candidate. I rewrote
it as `_dev_scratch/w2/c613_post_apply.mjs` against the shipped bundle and the applied block.
The glossary-row number holds: **16.30:1**, see claim 6 above.

---

## 7e, resolved mid-run

While I was working, another session edited `games_source.jsx` at 13:53 and added `no-print`
to the crossword modal header, which is exactly what I had filed at 13:35. I re-verified
rather than assuming:

```
games_source.jsx   className="bg-indigo-600 ... shrink-0 no-print"
node dev-tools/check_source_pair_drift.js   ->  games_source.jsx pair in sync
games_module.js and desktop/web-app/public/games_module.js  ->  both rebuilt with it
re-rendered in print media, all four theme x OS combinations:
   modal header display: none        .no-print elements: 12 -> 13, all hidden
```

**7e now PASSES.** 7b (the dark-mode print) is unaffected and still fails; that one is mine.

This is also a lesson worth recording for the fleet: my first `c7b` probe measured
`display: flex` and a later probe measured `display: none`, and I nearly wrote that up as
two probes disagreeing. They did not disagree. **The file changed underneath me between
runs.** In a ten-lane shared tree, a measurement is only true as of a timestamp. Every number
in this report was re-taken against the tree as it stands at the end of the run.

---

# The claim-7b fix: built, measured, deliberately NOT applied

The dark-mode print failure is in my files, so I worked it out end to end. I am handing it
over rather than applying it, for a reason I want on the record.

### The mechanism, in one line

Every `print:` colour variant in the repo is unreachable in dark or contrast mode, because
the theme layers are `!important` and a `print:` utility is not.

### The first candidate was wrong, and measuring caught it

Wrapping the **generated** block in `@media screen` looked like the whole fix. Measured:

```
theme=dark  media=print   cell bg rgb(22,32,50)     <- still dark
```

The cell moved from `#1e293b` to `#162032`: a *different* rule took over,
`.theme-dark .bg-white { background-color:#162032 !important }`, which is **hand-written in
`app_styles_source.jsx`, outside the generated block.** There are **129** such top-level
`.theme-dark` / `.theme-contrast` rules there, 125 of which set a colour or background. A fix
that only touches the generator leaves the page dark and would have shipped as "fixed".

### The second candidate is correct, and measured

Screen-scoping **both** layers:

| | screen | print |
|---|---|---|
| light | 14.63, `#fff` cell | 21.00, white on black |
| dark | 13.35, `#1e293b` cell (**unchanged**) | **21.00, white on black** |
| contrast | 19.56, black/yellow (**unchanged**) | **21.00, white on black** |

On-screen appearance is byte-identical in all three themes; only print changes. I looked at
`c7fix2-crossword-print-appdark.png`: a clean worksheet, white squares, black text, clues in
two columns, name and date rules. Cost is 18 bytes of CSS plus the wrapper on the hand-written
rules.

I also checked that this does **not** interact with 7e: the header's print visibility is
identical under both variants, so the two fixes are independent.

### Why I did not apply it

1. **It is two changes, not one.** `dev-tools/gen_docsuite_theme.cjs` must emit inside
   `@media screen`, **and** the 129 hand-written theme rules in `app_styles_source.jsx` must be
   wrapped. Doing only the first is the failure mode above.
2. **It forces a re-apply.** Changing the generator's output makes `--check` go stale, which
   means running `_apply_docsuite_theme.cjs` — the very step the wave-2 plan sequences last,
   because it snapshots the colour-token union across files W3 and W5 are still editing.
   Applying it while they write is precisely what L2 held back from doing.
3. **It would invalidate L2's verification in the same motion.** Their 41-test matrix and their
   "light mode is byte-identical v1 vs v3" assertion are written against the current output
   shape. Those tests need to be re-read, not just re-run, and that is a considered change to
   another agent's gate rather than a mechanical one.

**One product decision inside it, for Aaron.** Screen-scoping means the **contrast** theme also
prints black-on-white instead of yellow-on-black. I think that is right: yellow on black is a
screen accommodation, most printers reproduce it badly, and it empties a cartridge. But it is a
judgment about a user with low vision, so it should be yours rather than mine. If you want
contrast preserved on paper, scope `@media screen` to `.theme-dark` only and leave
`.theme-contrast` unscoped.

Everything needed to run it is in `_dev_scratch/w2/c7fix2_full.mjs`, which contains the
brace-aware splitter and the measurement harness.

---

# Repo-wide findings that are nobody's lane

Two things surfaced that are larger than any single claim. Neither is a wave-1 regression;
both were already true at HEAD.

### 1. `animate-in`, `fade-in`, `slide-in-from-*`, `zoom-in-*` do nothing. 255 call sites.

`tailwindcss-animate` is not installed and `desktop/web-app/tailwind.config.js` declares
`plugins: []`, so none of those class names compile:

```
$ grep -c "animate-in" app/static/css/main.069b6de4.css   ->  0
$ grep -c "slide-in"   app/static/css/main.069b6de4.css   ->  0
$ grep -c "fade-in"    app/static/css/main.069b6de4.css   ->  0
$ getComputedStyle(toast).animationName                   ->  "none"
```

These are `tailwindcss-animate` utilities, the plugin `shadcn/ui` ships with. Counting
`animate-in` (the required base class, so one count per real call site) across canonical
sources only:

| Where | Sites |
|---|---|
| root `*.jsx` + `AlloFlowANTI.txt` | 59 |
| `stem_lab/*.js` | 178 |
| unpaired `*_module.js` (they are their own source) | 18 |
| **total** | **255** |

Every "slides in", "fades in", "zooms in" claim in this codebase, wave-1 and older, describes
an animation that has never played in the built web app.

**Only entry animations are used.** `animate-out`, `fade-out`, `slide-out-to` and `spin-in`
appear **zero** times. That matters for the decision below: the hard part of an animation
library (exit animations, which need unmount coordination) is not in play here.

Two live consequences: L9's D4 slide-direction flip is inert (recorded under claim 2), and
`motion-reduce:animate-none` (33 sites) is guarding nothing. It also means the app is
accidentally well-behaved for vestibular sensitivity.

**This is a product decision, not a defect fix**, so I did neither. Notes for whoever takes it
are under "For Aaron".

### 2. Every `print:` colour variant is unreachable in dark and contrast mode

Covered in full under claim 7b. It is stated separately here because the crossword is only
where it was noticed: any surface anywhere in the app that sets `print:bg-white` /
`print:text-black` gets overridden by the theme layer's `!important` whenever the teacher is
in dark mode.

---

# Files I changed

**None in the repo.** This lane's entire product is measurements, screenshots, this report, and
four `CROSS_LANE_REQUESTS.md` entries.

| Path | What |
|---|---|
| `FLEET_2026-08-16/reports/W2_report.md` | this report |
| `FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` | 4 entries appended (2 filed, 1 answered by another lane, 1 follow-up) |
| `_dev_scratch/w2/**` | harness, 11 probes, 30+ screenshots (gitignored scratch) |

No source file, no built module, no test, no baseline, no `package.json`. No `git add`, no
commit, no push, no deploy, no branch change, no `build.js`. **I took no fleet lock**, because
I made no edit to any of the five hot files. Nothing was written with the Write tool inside
the repo proper.

The two mutating steps in L2's apply sequence (`_apply_docsuite_theme.cjs`,
`--update-baseline`) were deliberately not run; reasoning under Task 1.

---

# Verification log

| Command / observation | Result |
|---|---|
| `node dev-tools/gen_docsuite_theme.cjs --check` | `✓ current (268 lines, 3 scopes)` — re-checked at the end of the run |
| `npx vitest run tests/docsuite_theme_contrast.test.js` | **41 passed (41)** |
| `npx vitest run tests/dark_mode_contrast_gate.test.js` | **3 passed (3)** |
| `npx vitest run tests/karaoke_audio_store_resilience.test.js` | **31 passed (31)** — Task 3's test, green |
| `npm run verify:gate` | **exit 0 — the gate is GREEN.** It was red at `check_cmd_i18n` for every wave-1 lane; W1 cleared it. Non-fatal warnings remain (6272 stale translations across 62 packs, W1's ongoing work) |
| `node dev-tools/scan_dark_mode_contrast.cjs --quiet` | exit 0, 128 findings, 128 baselined, **0 new** |
| `node dev-tools/check_source_pair_drift.js` | OK, all three pairs in sync |
| `node dev-tools/check_source_freshness.cjs` | exit 0; 14/140 informational drifts, oldest dated 2026-08-02, none mine |
| 13 claims rendered in Chromium and looked at | 30+ screenshots in `_dev_scratch/w2/shots/` |
| ~250 contrast measurements (claims 6, 9, 11, 13) | zero below WCAG AA |

---

# For Aaron

### What the sweep actually found

Wave 1's visual claims held up better than I expected. Of 13 claims, **10 passed exactly as
written**, and several passed in more detail than their authors could have known: the save chip
really does vanish at six seconds and really does not when it is warning you; the cloze really
does read "cell (célula)" and really does leave a Spanish answer un-annotated; the Translations
control really does hide itself in both the cases that matter and stay visible once you have
turned it off.

Three things were not as claimed, and one of those has already been fixed:

1. **The Kokoro pill is not under modals.** `zIndex: 9997` outranks every dialog layer in the
   app (they run 60 to 1000). Cosmetic only, because the pill cannot take a click. One number.
   Filed to W5.
2. **A crossword printed from dark mode comes out as a dark page**, not black on white. Real,
   wastes a cartridge, and it is the whole `print:`-variant class, not one tool. Mine. Built and
   measured; **not applied**, for the three reasons under "Why I did not apply it". This is the
   one item I would put in front of you first.
3. **The crossword modal header printed on the worksheet.** Filed at 13:35, fixed by another
   session at 13:53, re-verified by me. Done.

And one copy bug worth thirty seconds: L4's new Translations control says **"a English
version"** in its most common visible state. Filed to W1.

### The thing I would want you to take from this lane

Every one of the failures above is invisible to a test and visible in a screenshot in under a
second. The z-index claim, the dark print, the header on the worksheet: all three were asserted
from CSS by careful agents who each said plainly that they had not looked. They were right to
say so, and they were wrong about the CSS. The repo's own rule ("Anything visual: actually
render it and look") earned its place again.

The counterpart is also worth saying: the ten passes are not a formality. Several were fixes to
bugs you reported personally, and they are now confirmed working in a browser rather than
believed to be working.

### Three decisions I made on your behalf

1. **I did not re-run the two mutating steps of L2's apply.** They were already applied and
   committed in `944237f7c`, `--check` reports current, and the tests are green. Re-running
   them would have rewritten committed files for zero change while three lanes were still
   writing. I verified instead.
2. **I did not apply the print fix.** Reasoning above. If you want it, it is two coordinated
   edits plus a re-apply, best done when the tree is quiet.
3. **I filed rather than fixed** the Kokoro z-index, the crossword header, and the "a English"
   string. All three are one-liners in other lanes' files, and RULES section 3 is unambiguous.

### One number to correct before it travels

L2's report gives the glossary row hover as **16.30:1**. In the applied CSS that is the number
for the bare `hover:bg-slate-50` utility. The **actual glossary row** carries L1's independent
`allo-vghov-row` fix, which wins on specificity and measures **9.45:1**. Both are comfortably
above AA and there is no conflict, but 9.45 is what you would measure if you checked.

### Still not verified, and by whom

- **The mic meter against a live microphone.** I proved the component lights correctly for a
  given level; nobody has proved `micLevelMonitor` publishes sensible levels off a real
  analyser. Same gap L7 named.
- **The correct-answer chime** in the language deck. I verified the green half by pixels.
- **The chip's suppression** while the Check Level panel is open (claim 9).
- Everything on your manual list in `WAVE2_PLAN.md` that needs ears or a phone: Spanish
  read-aloud, cold Kokoro start, iPhone voice list. Screenshots cannot reach those.

### Apply status at the end of this run

`node dev-tools/gen_docsuite_theme.cjs --check` was **current** at 14:03. Re-checked later the
same session it reports **STALE** again, which is the behaviour I predicted above: a lane added
a colour utility to a scanned `view_*` file after my check. Nothing to do about that from this
lane, and it is not a defect. When the tree is quiet, the six-command sequence under Task 1
clears it; `--check` is the cheap way to know whether it is needed.

**It is not caused by anything of mine.** `dev-tools/gen_docsuite_theme.cjs` does not scan
`stem_lab/` (grep for `stem_lab` in it returns nothing), and `stem_lab/` is the only place I
edited after that check.

---

# Addendum: should the dead animation classes be wired up?

Aaron asked this directly, so here is the analysis rather than just the finding.

### What they are

`tailwindcss-animate`, the plugin `shadcn/ui` ships with. `animate-in` is the base class and
the rest are modifiers on it: `fade-in`, `zoom-in-95`, `slide-in-from-top-2`, with `duration-*`
and `motion-reduce:animate-none` alongside. The idiom in this repo is textbook:

```
animate-in fade-in slide-in-from-top-2 duration-700     (12 sites)
animate-in fade-in slide-in-from-left-3 duration-500     (9 sites)
animate-in fade-in duration-300                          (6 sites)
animate-in zoom-in-95 duration-200                       (5 sites, all modals)
```

So: panels easing down from the top, list items sliding in from the left, modals scaling up
from 95%. Conventional, restrained, and clearly deliberate. This was not noise; somebody meant
it, 255 times.

### Why they are dead

`desktop/web-app/tailwind.config.js` has `plugins: []` and `tailwindcss-animate` is not a
dependency. The class names compile to nothing. Nothing is broken; the polish just never
arrived.

### The case for wiring it

- **The a11y risk is already handled, and I checked rather than assumed.**
  `app_styles_source.jsx:322` carries a global
  `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.001ms !important; ... } }`,
  plus a second guard at `:15` and the app's own `disableAnimations` setting. Any animation the
  plugin introduces is caught by that blanket rule. The 33 `motion-reduce:animate-none` sites
  are belt and braces on top of a guard that already exists.
- **Entry-only.** Zero `animate-out` / `slide-out-to` sites, so none of the unmount-coordination
  complexity applies.
- **Build-time only.** The plugin emits CSS; there is no JS runtime cost, no bundle-size story
  beyond a few KB of utilities.
- **It is two lines**: `npm i -D tailwindcss-animate` and
  `plugins: [require('tailwindcss-animate')]`.

### The case against, and what I would actually do

The real risk is not correctness, it is **taste at scale**: 255 surfaces start moving at once,
and some of them are lists where a dozen children would each slide in. Nobody has seen this app
animate. Twelve custom `@keyframes` in `app_styles_source.jsx` already work today
(`allo-section-enter`, `indeterminate-slide`, `allo-correct-pulse`, ...), so the app is not
motionless now; the plugin would layer a second motion vocabulary on top of an in-house one.

**My recommendation: wire it, but verify it before believing it.** Concretely:

1. Add the plugin and rebuild.
2. Screenshot-and-look at the highest-traffic surfaces first: toasts (top-centre, three at
   once), the modal set (`zoom-in-95`), the sidebar panels (`slide-in-from-left-3`, and the
   ones that repeat per list item), the Launch Pad.
3. Check the repeated-child cases specifically. `slide-in-from-left-3 duration-500` on every row
   of a 30-term glossary is where this goes wrong, and it is the one thing a static read cannot
   predict.
4. Confirm the reduced-motion guard actually bites with `prefers-reduced-motion: reduce`
   emulated, since that is now load-bearing for a lot more motion than before.

The alternative, stripping the classes, is more work (255 edits across three file families)
and throws away intent that a future pass would only have to re-add. I would not do that.

**What I would not do is flip it on and ship.** This is the same shape as everything else in
this report: the change is one line, and whether it looks right is a question only a screenshot
can answer. `_dev_scratch/w2/harness.mjs` will render any of those surfaces on demand if
someone wants the before-and-after.
