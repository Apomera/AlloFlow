# Lane 8 — Exports, annotation, Document Builder

All seven issues investigated, all seven acted on. Everything below was measured in a real
browser against a real generated export, not read off CSS.

---

## Read this first, Aaron

**A concurrent session committed my in-flight work into an unrelated commit.**

`fc0cbcdcd "Auto-fix loop: stop paying 3 AI re-audit calls for passes where the AI fixed
nothing"` contains 877 lines of change to each of `doc_pipeline_source.jsx`,
`doc_pipeline_module.js` and `desktop/web-app/public/doc_pipeline_module.js`. Most of that is
Lane 8's export work, not auto-fix-loop work: `alloflow-wide-scroll`, `Erase my marks`,
`reprojectList`, `__alloflowReprojectAnnotations`, `readerWebFonts` and `alloflow-rt-readout`
are all mine and all present in that commit's tree. My later ARIA fix (`data-gloss-table`) is
not, so the sweep caught me partway through.

It happened **twice**. A second commit, `6a9eb11c3 "Call ledger: capture Retry-After + print the
HTTP trail on every failed call"`, swept the rest — my `data-gloss-table` ARIA fix and everything
after it. As of the end of this run all three `doc_pipeline` files show clean in `git status`
because someone else has committed every one of my changes to them, under two commit messages
about the auto-fix loop and the call ledger.

I verified the content survived intact: `data-gloss-table`, `Erase my marks`, `reprojectList`,
`alloflow-wide-scroll`, `readerWebFonts` and `alloflow-anno-draw` are all present in
`HEAD:doc_pipeline_source.jsx` at the expected counts. **Nothing is lost.** But the commit
messages no longer describe their contents, so if you ever bisect or revert either of those two
commits you will silently take out most of Lane 8.

Still uncommitted and still mine to hand over: `view_export_preview_source.jsx`,
`view_export_preview_module.js`, its `desktop/web-app/public/` mirror, and `ui_strings.js` —
that is E4, E7 and the new strings.

This is exactly the hazard `PLAN.md` section 0 warned about. I did not touch the index or
history: no `add`, `commit`, `reset`, `stash`, `checkout` or `push` was run by this lane, and
`git diff --cached --name-only` shows nothing of mine staged.

Related: `node dev-tools/fleet_lock.cjs status` showed `doc_pipeline_source.jsx` **held by
`fable-callvolume`** while I was mid-edit, and the Edit tool twice reported the file changing
under me. `doc_pipeline_source.jsx` is not in RULES section 3's four lock-protected files and
`PLAN.md` section 4 assigns it to no other lane, but it genuinely is shared (it houses both the
PDF remediation pipeline and the Document Builder generators). It should be on the lock list.

Also: `main` is now 3 commits ahead of where `PLAN.md` recorded it (`71e5ebd61`), so other
sessions have been committing throughout.

**Answer to your direct question about Worksheet vs Save/Print PDF is in E4 below.**

---

## Preflight

- `FLEET_2026-08-16/ORIENTATION.md` and `FEATURE_INVENTORY.md` do not exist in the tree, though
  RULES section 1 points at both. Proceeded from `RULES.md` + `PLAN.md`.
- Branch `main`, confirmed.
- `ui_strings.js` edited under `fleet_lock` (acquired, edited, released).
  `doc_pipeline_source.jsx` likewise once I saw another session locking it.

## Where these features actually live

E1, E2, E3, E5 and E6 all describe the **exported standalone HTML handout**, not the in-app
annotation suite. That handout, including its whole reading-and-annotation toolbar and its
vanilla-JS annotation runtime, is generated inside `doc_pipeline_source.jsx` between roughly
lines 39,300 and 42,600. Reading-tools bar: [doc_pipeline_source.jsx:40132](doc_pipeline_source.jsx#L40132).
The in-app suite in `annotation_suite_source.jsx` turned out to be in good shape and needed no
changes; see E5 and E6.

---

## E1 — Large text size clips content in export

### Found

Reproduced exactly, at the size Aaron saw it.

**Root cause:** [doc_pipeline_source.jsx:39389](doc_pipeline_source.jsx#L39389) —

```css
.section { ... border-radius: 12px; padding: 1.5rem; ... overflow: hidden; }
```

Every exported resource sits in a `.section`. `overflow: hidden` was there so the 12px radius
would clip its children, but it also **silently cuts anything wider than the card**: no
scrollbar, no reflow, no sign that content is missing.

The glossary hits it first because `table { width: 100% }`
([:39391](doc_pipeline_source.jsx#L39391)) cannot render narrower than the table's *min-content*
width, and that width scales linearly with the reader's text size while the card does not. Cell
padding was `0.7rem 1rem` ([:39396](doc_pipeline_source.jsx#L39396)) — `rem`, so it stayed fixed
while the text grew, eating an ever larger share of a narrow column.

**Measured, before the fix** (harness clicks the real `A+` button, then measures
`scrollWidth - clientWidth` on every element whose computed overflow is `hidden`):

| view | 100% | 115% | 130% | 150% | 175% |
|---|---|---|---|---|---|
| 390px wide, glossary section | 60px hidden | 102px | 144px | 199px | **269px** |
| 390px wide, quiz section | 0 | 0 | 0 | 25px | 79px |
| 1280px wide | 0 | 0 | 0 | 0 | 0 |

At 175% on a 390px view the Definition column was cut mid-word and the Translation column was
gone entirely. Screenshot confirms it.

So: **not** a fixed-height container, **not** a page-break calculation, **not** vertical. It is
horizontal overflow inside an `overflow: hidden` card, and it is width-relative — which is why
it bites hardest in the Document Builder's narrow preview iframe and on phones, and why every
A+ press makes it worse.

The `aspect-ratio` + `min-height` without `max-width` trap named in the brief is **not** present.
The flash-cards glossary layout ([:36449](doc_pipeline_source.jsx#L36449)) was a genuine fixed
`1fr 1fr` grid, but its cards carry `min-height` only, so they grow rather than clip; measured
clean (`scrollHeight === clientHeight` at every step, cards growing 166px to 205px).

### Changed

All in `doc_pipeline_source.jsx`:

1. **[:39389](doc_pipeline_source.jsx#L39389)** — dropped `overflow: hidden` from `.section`.
   Radius clipping is now done by the children that need it (the glossary table already has its
   own `overflow: hidden`).
2. **[:39396](doc_pipeline_source.jsx#L39396)** — `th, td { overflow-wrap: anywhere; hyphens: auto }`
   so a table can shrink to its container instead of forcing a min-width that grows with the
   text, plus `@media (max-width: 720px)` cell padding in `em` rather than `rem`.
3. **Column width hints** on the glossary header cells (22% term, 22% translation). Necessary:
   `overflow-wrap: anywhere` tells auto table layout that a one-character column is legal, and
   without the hints "Photosynthesis" ended up broken across three lines in a 40px column. I
   caught that from the screenshot, not from the numbers.
4. **Stacked reflow for the glossary** ([:36516](doc_pipeline_source.jsx#L36516) onward). The
   section is a `container-type: inline-size` container and a `@container (max-width: 30em)`
   rule turns each row into its own labelled card. Because the threshold is in `em`, it fires
   both when the window is narrow **and** when the reader turns the text up, which is the case
   that actually mattered. `@supports not (container-type)` viewport fallback and a `@media print`
   override back to the table grid ride along.
5. **A real scroll region for anything still too wide** — `.alloflow-wide-scroll` plus a runtime
   pass (`window.__alloflowRewrapWideBlocks`) that wraps any over-wide table in a focusable,
   labelled `overflow-x: auto` region and re-runs on resize and on every text-size change. So
   nothing is ever silently cut again, even in a case I did not anticipate.
6. **Venn diagram** ([:36749](doc_pipeline_source.jsx#L36749)) — its `overflow-x: auto` wrapper
   only applied under an 820px *viewport*, which missed the case that bites: a normal window
   whose section got narrow because the text grew. Now unconditional.
7. **Resource headers** ([:36407](doc_pipeline_source.jsx#L36407), [:39585](doc_pipeline_source.jsx#L39585))
   — `flex-wrap: wrap` so the title and its "(meta)" tag drop to a second line rather than
   running past the card edge.

### Verified

Same harness, after: **zero clipped elements at every text size, in both glossary modes, at both
1280x900 and 390x844.** The 269px case is now 0. Screenshots read, not just numbers: at 390px /
175% the glossary is a clean stack of TERM / DEFINITION / TRANSLATION blocks with nothing cut.

**One residual, stated plainly:** at 390px and 175% only, the page still scrolls horizontally by
**12px**. Nothing is clipped and nothing is unreachable; it comes from inside the Venn diagram's
own scroll region. It was present before my change too. I chose not to chase it further because
the only clean fixes are `overflow-x: hidden` on the page (which is the exact silent-clipping
behavior I just removed) or re-authoring the Venn's fixed 720px geometry, which is a larger job
than this issue.

---

## E2 — Text size control shape: keep the stepped buttons

### Decision, and why

**Kept the stepped `A- / A / A+` buttons. Did not switch to a slider.** Three reasons:

1. **The steps are the tested surface.** There are six of them (`[0.9, 1, 1.15, 1.3, 1.5, 1.75]`,
   [:40437](doc_pipeline_source.jsx#L40437)) and I have now verified the E1 layout fixes hold at
   every one, in two glossary modes at two viewports. A continuous slider means arbitrary scale
   values that nobody has looked at, which is how the clipping got in.
2. **Motor accessibility.** `A+` is a 44px target you press N times. A range input has to be
   grabbed and landed precisely, which is worse for the users most likely to need large text.
   Aaron's instinct that a slider matches the app UI is right about consistency; the app slider
   is a mouse-first control in a settings panel, and this one lives in a student handout.
3. **Cost per change.** Each size change now re-projects every annotation (E6). Six discrete
   steps means six re-projections; a slider means one per pixel dragged.

The button was still failing in a way worth fixing, and Aaron's complaint was fair: it gave **no
feedback at all**. Pressing A+ at maximum was indistinguishable from a broken button.

### Changed

- Added a live percentage readout next to the buttons (`[data-rt-text-readout]`, `role="status"`
  `aria-live="polite"`), so the reader sees "100%" become "115%" and knows where they are.
- `A-` and `A+` now **disable** at the ends of the scale rather than silently clamping.
- Styling for both, including dark / sepia / high-contrast variants
  ([:39777](doc_pipeline_source.jsx#L39777)).

### Verified

Browser run: readout reads `100%` at load, `130%` after two presses, `175%` at the top, and
`largerDisabled: true` at maximum.

---

## E3 — Font options in HTML export

### Found

The restriction was **deliberate, and half of it was justified**. There are two font mechanisms,
and Aaron is describing the second one.

1. **Build time** — the Document Builder's own font dropdown
   ([view_export_preview_source.jsx:7889](view_export_preview_source.jsx#L7889)) already offers
   the **entire 22-font app catalog**, and the `@font-face` / `@import` plumbing ships with the
   export ([doc_pipeline_source.jsx:39235](doc_pipeline_source.jsx#L39235)). Nothing wrong here.
2. **Read time** — the font picker *inside the exported handout*
   ([:40148](doc_pipeline_source.jsx#L40148)) offered **six** system-stack options. This is what
   Aaron saw.

The reason for six is real: an AlloFlow export has to keep working with **no network** — offline
classrooms, a file emailed home, and the no-egress FERPA posture. A font that must be fetched
cannot be the default. That is a good reason and I kept it.

But it was under-delivered in a way that matters for exactly the accessibility case Aaron
raises: the entry labelled **"Dyslexia-friendly" was Comic Sans MS**, not OpenDyslexic. A user
who picked OpenDyslexic in the app and then opened the handout got a different typeface under a
label that implied it was the same one.

### Changed

Two honest fixes rather than one dishonest one
([doc_pipeline_source.jsx:39339](doc_pipeline_source.jsx#L39339) onward):

1. **Widened the always-offline list from 6 to 9** and labelled each with its actual face:
   Original, Sans, Readable (Verdana), Humanist (Tahoma), Serif (Georgia), Book serif (Palatino),
   Rounded (Trebuchet), Dyslexia-friendly (Comic Sans), Monospace. These are all genuinely
   resolvable from system stacks on Windows, macOS, iOS, Android and most Linux desktops, and
   they cover the British Dyslexia Association's own recommended set. **Zero network requests.**
2. **Added the high-legibility web faces as an explicit opt-in**: OpenDyslexic, Atkinson
   Hyperlegible, Lexend, Andika (SIL), in an optgroup labelled "Needs internet", behind a new
   `cfg.readerWebFonts` flag with a checkbox in the Document Builder that says so plainly. **Off
   by default**, so no export starts phoning out that did not before.
3. The document's own build-time font is always offered back to the reader as "Document font
   (X)", since whatever CSS it needed already shipped inside the file.

**Which app fonts genuinely cannot travel, and why:** all 20 of the app's non-default faces are
Google-Fonts-loaded (or, for OpenDyslexic, jsDelivr-loaded). None is a system font. They can
only appear in a standalone export by fetching at open time, which breaks the offline and
no-egress guarantees. I did not embed them as base64 because the font binaries are not in this
repo and downloading them is a licensing and repo-size decision that is Aaron's, not mine. If he
wants OpenDyslexic and Atkinson available offline, self-hosting those two woff2 files (both are
SIL OFL, both around 40-60KB) and inlining them is the way, and it is a small job on top of what
is now here.

### Verified

Generated exports both ways. `readerWebFonts: false` → 9 options, zero font declarations in the
file. `readerWebFonts: true` → 13 options, and all four of the OpenDyslexic `@font-face` and the
Atkinson / Lexend / Andika `@import` rules present.

---

## E4 — "Worksheet" versus "Save / Print PDF"

### The plain-language answer, since Aaron asked directly

**They do the same thing to your printer and produce a different document.**

Both open your browser's print window, where you can either print on paper or choose "Save as
PDF". Neither one downloads a file directly. That part is identical — literally the same line of
code: [export_handlers_module.js:1004](export_handlers_module.js#L1004) is
`if (mode === 'print' || mode === 'worksheet')`, and both branches open a window and call
`print()`.

What differs is **the document each one builds**:

| | PDF | Worksheet |
|---|---|---|
| Answer boxes | shown as text boxes | become **ruled lines** to write on |
| Multiple choice | shown as radio buttons | become **bubbles** to fill in |
| Name / Date / Score header | no | **yes** |
| Glossary self-test reveal | works | off, everything shown flat |
| FAQ accordion, math hide-solution, timeline, concept-sort drag | interactive | off, everything printed open |
| Flash cards | click to flip | cut-and-fold instructions |
| "Save my work" encrypted submission block | included | omitted (paper is handed in physically) |
| "Student Copy" prefix and generated-on date | yes | no |

So: **PDF is a finished copy to read. Worksheet is a blank copy to write on.** The labels were
the problem, exactly as suspected. They are meaningfully different and should not be collapsed.

Code references for the difference: worksheet header
[doc_pipeline_source.jsx:39249](doc_pipeline_source.jsx#L39249); ruled lines and bubbles at
`:37503`, `:37577`, `:37896`, `:38042`, `:38328`; interactivity switches at `:36503`, `:37706`,
`:37961`, `:38095`, `:38203`; submission block `:39276`.

### Changed

In `view_export_preview_source.jsx`:

- A **one-line explanation under the Format row** that changes with the selection, wired as
  `aria-describedby` on the radiogroup. Plain language, grade 6ish, no em dashes. All four
  formats covered, not just the two Aaron asked about.
- The action button said **"Download PDF"** and did not download anything — it opened the print
  dialog. Now **"Print / Save as PDF"** for both print and worksheet mode. That was an outright
  false label, and it is the most likely single reason the two options felt interchangeable.
- Eight new `ui_strings.js` keys behind all of it.

---

## E5 — The "Mind" annotation tool

### Found

**It is the `🧹 Mine` button** in the exported handout's Annotate row
([doc_pipeline_source.jsx:40241](doc_pipeline_source.jsx#L40241)) — clear-my-own-annotations.
There is no tool named "Mind" anywhere in the repo; I checked every source file. Aaron read
"Mine" as "Mind", which is itself evidence of how badly the label worked.

**Not broken, and not merely unlabelled — both.** The handler at
[:41757](doc_pipeline_source.jsx#L41757) was
`if (studentAnno.length === 0) return;` — a **silent no-op**. And the person most likely to
press an unfamiliar button is exactly the person who has not annotated anything yet, so the
overwhelmingly common first encounter with this control was "I click it and nothing happens".
Aaron's report is precisely accurate.

Two further things found while I was in there:

- **Draw was missing from the export**, though the brief said it exists elsewhere. It does: the
  in-app suite has had a pen since Phase 9 (`annotation_suite_source.jsx:72`, six shapes plus an
  eraser). The exported handout offered Off / Note / Highlight / Voice only.
- **`renderAnno` had no `draw` branch at all** ([:41458](doc_pipeline_source.jsx#L41458)), so
  every drawing a teacher made in the app was **silently dropped from the export**. It
  round-tripped through the JSON and rendered as nothing. That is a data-loss bug nobody had
  reported.

### Changed

- **Renamed `🧹 Mine` to `🧹 Erase my marks`** — self-evident in the way Highlight is.
- It **disables** when there is nothing to erase, with a tooltip that says so
  ("Nothing to erase yet. Your highlights, notes and drawings will show up here."), and when
  there is, the tooltip counts them. `updateClearBtnState()` keeps it in sync on every render.
  No more silent no-op.
- **Added a Draw tool** to the export: freehand pen, five colours matching the in-app palette,
  three widths, pointer-capture based so it works with mouse, pen and touch, `touch-action: none`
  and selection suppression while active so a drag does not turn into a scroll. Same
  `{points, color, width}` envelope as the in-app suite, so a drawing round-trips both ways.
- **Added the missing `draw` renderer**, so in-app teacher drawings now actually appear in
  exports.

### Verified

Browser run, with a real mouse drag: stroke renders, persists to localStorage with 13 points and
an anchor, `Erase my marks` flips from disabled to enabled with the right tooltip, zero console
errors. Screenshot read.

### For Aaron

I did **not** port the in-app pen's other five shapes (line, arrow, rectangle, circle, eraser)
to the export. Freehand is what you asked for and what a student reading a handout needs; the
shape primitives are a diagramming feature that belongs with the teacher-side tool. Say the word
and it is a small addition.

---

## E6 — Annotations do not anchor to the resource

This was the important one, and the truth is a bit different from the report in a way that
matters for the fix.

### Found

**Annotations do scroll correctly.** I measured it: scrolling 900px moved a highlight and its
sentence together, drift constant at 3px. Marks are absolutely positioned inside
`<main id="main-export-content">`, which is in normal page flow, so they travel with the
document. Same in the in-app suite, where `contentAreaRef` is a `position: relative` scroll
container and the click handler already adds `scrollTop`.

**What is badly broken is reflow.** Coordinates were captured once, in pixels, at placement time,
and never revisited — the old resize handler said so out loud:
*"Coordinates are frozen at placement time"* ([:42546](doc_pipeline_source.jsx#L42546), old).
And this export's own reading tools change text size, font, line height and letter spacing,
every one of which moves the words the mark was placed on. Measured, before:

| after | highlight drift from its own sentence |
|---|---|
| scrolling 900px | 3px (correct) |
| **two presses of A+ (130%)** | **319px above its text** |
| **window 1100px → 640px** | **103px off, and 175px wider than the text** |

**And one thing that literally floats on the viewport**: opening a note appended the note card to
`<body>` as `position: fixed`, placed from viewport coordinates
([:39738](doc_pipeline_source.jsx#L39738) CSS, `showNotePopover` markup). Measured: scrolling
700px moved the note bubble from y=1024 to y=324 while its own open card **sat at y=647 the
entire time**. That is Aaron's sentence, verbatim, and it is the most likely thing he actually
saw — especially since this was the same testing session in which he was pressing A+.

### Changed

A document-anchor model, in `doc_pipeline_source.jsx`
([:41064](doc_pipeline_source.jsx#L41064) onward, ~200 lines):

- **Highlights** store `{ p: <node path>, s: <start char>, e: <end char> }` — a character range,
  not pixels. On reflow the range is rebuilt and `rects` are re-read from `getClientRects()`, so
  a highlight genuinely re-wraps with its text.
- **Point marks** (note, sticker, voice, draw) store `{ p, fx, fy }` — a fraction of the box of
  the element they sit in.
- **Drawings** translate their whole point list with the anchor. They move rigidly rather than
  stretching, deliberately: a pen mark is a gesture over a spot on the page, not a span of
  characters the way a highlight is.
- Node paths are child-index chains from the host. Annotation overlays are always appended after
  the content, so content indices stay stable.
- Re-projection runs on **text size, font, line spacing, letter spacing, window resize** and load
  (`window.__alloflowReprojectAnnotations`, called from the reading-tools `apply()`).
- **The note popover is now `position: absolute` inside the host**, so the open note belongs to
  the page and travels with the mark it came from.

**Every step is defensive.** Anchoring is an enhancement and must never be able to stop a mark
being created: `pointAnchor`, `highlightAnchorFromRange`, each per-item reprojection and the
init call are individually wrapped, and anything that cannot be anchored keeps its stored `x/y`
and behaves exactly as before.

### What happens to annotations saved under the old model

They are **migrated on first load**, and I want to be precise about this because it is the part
most likely to surprise:

- A saved **highlight** carries its own `text` (up to 500 chars). The migrator finds that text in
  the document and builds a character-range anchor from it. This is a stronger signal than the
  pixels ever were, so old highlights typically land **better** than they did before, not just
  the same.
- A saved **note / sticker / voice / drawing** is anchored to whatever element currently sits
  under its stored point.
- Anything that cannot be anchored — a mark on an image-only region, or a highlight whose text
  has changed — silently keeps its stored `x/y` and behaves exactly as it does today. Nothing is
  dropped, nothing errors, no annotation can disappear.
- Derived anchors persist on the next save, so an old annotation starts following its words from
  the first load after this update.
- The storage key and envelope are unchanged, so annotation JSON exported before this still
  imports.

Teacher annotations embedded in the export get the same treatment in memory. That is a genuine
improvement for teacher **highlights**, which previously carried in-app pixel coordinates into a
completely different DOM and landed more or less arbitrarily; they are now placed by text match.

### Verified

Same harness, after:

| after | drift before | drift after |
|---|---|---|
| scroll 900px | 3px | 3px |
| A+ ×2 (130%) | **319px** | **3px** |
| font change to monospace | 3px | 3px |
| width 1100px → 640px | **103px**, 175px too wide | **3px**, width tracks the text |
| draw stroke, A+ ×2 | **266px** | **4px** |
| note popover on 700px scroll | `fixed`, stuck at y=647 | `absolute`, moves with the page |

The constant 3px is the highlight's line box against the paragraph's block box, which is correct
and unchanged.

### In-app suite: no change needed

`annotation_suite_source.jsx` stores host-relative coordinates including `scrollTop`, renders
absolutely inside the `position: relative` scroll container, and re-renders on drag. It scrolls
and anchors correctly today. It has the same reflow limitation in principle, but the in-app
content area has no reader-facing text-size control driving constant reflow, so it does not bite
the same way. Porting the anchor model there is a reasonable follow-up, not a defect fix.

---

## E7 — Expert Workbench in Document Builder

### Found

**It was built, it is mounted, and it is reachable.** Not missing.

It lives on the Document Builder's ribbon as the sixth tab:
[view_export_preview_source.jsx:9261](view_export_preview_source.jsx#L9261) registers
`['expert', ...]` in the tablist, [:9872](view_export_preview_source.jsx#L9872) mounts the panel,
and both are unconditional — no mode gate, no feature flag. It calls the same
`processExpertCommand` the remediation panel calls, and the props
(`expertCommandInput`, `agentActivityLog`, `isAgentRunning`, ...) are threaded in from
[AlloFlowANTI.txt:52720](AlloFlowANTI.txt#L52720). I verified by tracing registration, per the
brief, rather than assuming the component's existence meant it was mounted.

**Why Aaron could not find it:** the tab was labelled just `Expert`. Next to Home / Insert /
Layout / Review / View that reads as a difficulty setting, not as the same named tool the
remediation panel offers. And the panel itself showed an unlabelled text box with no hint what
to type into it.

Worth saying: the Acrobat-parity surface Aaron was hoping for **also already exists**. The
Document Builder ribbon has Home / Insert / Layout / Review / View tabs with paragraph indents,
line spacing, keep-with-next, widow/orphan control, page breaks, page view, zoom presets, a
navigation pane, tracked changes and revision balloons.

There is one genuinely gated surface: **Advanced Review** ("Review Studio") requires
`exportPreviewSource === 'remediation'` ([:3580](view_export_preview_source.jsx#L3580)), so its
toggle only appears when the builder was opened from the PDF remediation pathway. That is
defensible — it diffs against a source PDF, and the AlloFlow-generated pathway has no source PDF
to diff against.

### Changed

- Tab relabelled `🤖 Expert Workbench`, matching the remediation panel's name for the same tool.
- A one-line description at the top of the panel with three concrete examples of what to type
  ("make every heading a proper H2", "add alt text to the images", "fix the color contrast in
  the table"), since an unlabelled text box tells you nothing.
- Inner disclosure relabelled `⌨️ Command` so it stops competing with the panel title.

No new build was needed. Reusability assessment is moot: it is already the same implementation.

---

## Verification summary

| what | result |
|---|---|
| `node --check` on every built module touched | pass |
| Export clipping harness, 2 glossary modes × 2 viewports × 5 text sizes | 0 clipped, 0 page overflow except the 12px Venn residual at 390px/175% |
| Annotation anchoring harness, 7 conditions | all drift ≤ 4px |
| Draw tool, real pointer drag | renders, persists, anchors, 0 console errors |
| Glossary ARIA roles, 4 states | roles present only while stacked |
| Reader font opt-in, both states | 9 options / no network, vs 13 options / 4 declarations |
| `npx vitest run` 16 targeted test files | **190 passed, 0 failed** |
| `node dev-tools/check_translation_keys.cjs` | 0 missing keys |
| `node dev-tools/check_source_freshness.cjs` | my pairs in sync |
| `npm run verify:gate` | **fails on someone else's drift, see below** |

### Regressions I caused and fixed

Both caught by the targeted tests, both fixed and re-verified:

1. **Note creation broke in jsdom.** `pointAnchor` called `document.elementFromPoint`, which
   jsdom does not implement, and the throw happened before the note editor was built. Killed 3
   tests. Fixed by guarding and wrapping every anchor call.
2. **9 new IBM Equal Access violations** (`table_aria_descendants`). I had hardcoded
   `role="table"/"row"/"cell"` on the glossary table so the stacked layout would keep its
   semantics, but explicit descendant roles inside an explicit `role="table"` is itself a
   finding. Fixed by applying the roles **at runtime, only while the stack is actually in
   effect** — measured by computed style, re-checked on resize and on text-size change. The
   shipped HTML carries no explicit roles, so the audit is clean, and a screen reader still gets
   a table when the display changes. Verified in four states.
3. A test asserting on literal source text (`document_builder_ui_a11y.test.js:18`) broke because
   my `aria-describedby` split the substring it greps for. Reordered the attribute; noted why in
   a comment so the next person does not undo it.

### Failures that are not mine

- **`npm run verify:gate` fails at `check_cmd_i18n`** with 21 `cmd.*` keys new in
  `allo_commands_source.jsx` and missing from the manifest. That is Lane 7's file. L2 already
  filed it (CROSS_LANE_REQUESTS line 28). It is the gate's first failure so it masks everything
  after it for every lane. Not touched, not bypassed.
- **`tests/doc_pipeline_build_parity.test.js` times out at vitest's default 5000ms.** It rebuilds
  a 2.9MB source in-process, which takes ~28s. It **passes** with
  `npx vitest run tests/doc_pipeline_build_parity.test.js --testTimeout=120000`. The source was
  already 2.92MB before I touched it and I added 2%, so this was red before this lane and will
  stay red until the test declares its own timeout. Worth a one-line fix by whoever owns it.
- 16 compiled-newer-than-source pairs reported by `check_source_freshness.cjs`, including
  `annotation_suite` (mtimes from 2026-07-23, well before this fleet). Pre-existing; my own pairs
  are in sync.

---

## New `ui_strings.js` keys, for Lane 5

Added under `export_preview`, lock acquired and released:

`format_help_print`, `format_help_worksheet`, `format_help_html`, `format_help_slides`,
`action_print_pdf`, `action_download_html`, `action_export_slides`, `workbench_help`, and
`edit_in_page_designer` — that last one was already being read through `t()` at
[view_export_preview_source.jsx:8754](view_export_preview_source.jsx#L8754) with no entry behind
it, so it fell through to its English fallback in every language.

The `format_help_*` values are user-facing prose rather than labels, so they are longer than a
typical key. Reading level is around grade 6 deliberately: the audience is teachers, not
students.

**Not localizable, flagged not fixed:** everything in the exported handout's reading and
annotation toolbar is hardcoded English written into a template literal, because the export is a
self-contained file with no `t()` at runtime. I added several new ones there (`Erase my marks`,
`Draw`, the pen colour and size labels, the widened font names, the size readout). Making that
surface localizable means snapshotting resolved strings into the generated HTML at build time —
a real piece of work and a design decision, not a sweep.

---

## Deliberately left, and honest gaps

- **12px of horizontal page scroll** at 390px / 175% only, from the Venn diagram's fixed 720px
  geometry. Nothing clipped, nothing unreachable, pre-existing. Fixing it properly means
  re-authoring the Venn as a responsive layout.
- **Offline OpenDyslexic / Atkinson.** Available today only with the "needs internet" opt-in.
  Self-hosting the two woff2 files would make them work offline; that is a repo-size and
  licensing call for Aaron, not a lane decision.
- **In-app annotation suite not re-anchored.** Correct today for scroll and drag; the reflow
  model I built for the export would port cleanly if wanted.
- **The five extra pen shapes** (line, arrow, rectangle, circle, eraser) exist in-app but not in
  the export. Freehand was the ask.
- **Printable cloze (L3's request in CROSS_LANE_REQUESTS line 20).** L3 wrote a good, concrete
  design against my files. I did not build it: it is Lane 3's issue L4, not one of my seven, and
  `doc_pipeline_source.jsx` was already contended enough this session. The design is sound and
  the `isWorksheet` pattern it targets is exactly where it belongs.
- **The exported quiz renders literal keys** `output.quiz_mcq` and `output.quiz_reflection`, plus
  an `undefined` under the reflection prompt. Reproduced and visible in my screenshots. Missing
  `t()` coverage on the export path, filed to Lane 5.
