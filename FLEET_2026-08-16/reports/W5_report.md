# W5 — Loose ends: the cross-lane requests no wave-1 lane could take

Lane W5. Written incrementally. Startup check: `reports/W5_report.md` did not exist, so this
lane is not a duplicate.

Tree state at start: `doc_pipeline_source.jsx` and `view_pdf_audit_source.jsx` both held by a
non-fleet session (`fable-auditmodal`) per `fleet_lock.cjs status`. `doc_pipeline_module.js`,
its public mirror and `doc_pipeline_source.jsx` were already modified in the working tree
(Lane 8 wave-1 work plus that session's edits). ~49 untracked files and the staged
`view_pdf_audit_module.js` left alone per RULES section 3.

---

## Task 2 — Emoji field in the glossary schema (L1's G4 upstream fix)

### Found

Confirmed exactly as L1 described, and there is a **third** site they did not list.

- `generate_dispatcher_source.jsx:2125` (multilingual glossary) and `:2166` (English-only
  glossary): the prompt said `Include a relevant emoji for each term.` while the return
  shape on the following lines (`:2132`, `:2170`) was
  `[{ "term": "Name", "def": "...", "tier": "..." }]` with no emoji field. The model has
  nowhere to put the emoji except inside `term`.
- `generate_dispatcher_source.jsx:2054` / `:2059` — **third site, not in L1's report**: the
  on-device (local text backend) glossary prompt has the same mismatch
  (`Include a helpful emoji only when it clarifies the term.` against a
  `{ "terms": [{ "term", "def", "tier" }] }` shape).

The leak is wider than the games: `generate_dispatcher_source.jsx:2221` builds the term image
prompt as `Icon style illustration of "${item.term}"`, so an emoji smuggled into `term` was
also being sent to the image model as part of the subject.

### Changed

`generate_dispatcher_source.jsx`, all three sites, under the fleet lock (acquired, edited,
released; Edit only):

- `:2054` — prompt now says to put the emoji in the separate `"emoji"` field, never inside
  `"term"`.
- `:2059` — `${useEmojis ? ', "emoji": "one emoji, or omit the field"' : ''}` added to the
  local-backend return shape.
- `:2125` and `:2166` (identical strings, replaced together) — prompt now reads
  `Include a relevant emoji for each term in the separate "emoji" field shown in the return
  shape below. Never place the emoji inside the "term" text itself.`
- `:2132` and `:2170` — same conditional `"emoji"` field added to both return shapes.

All four schema additions are gated on `useEmojis`, so an emoji-off glossary prompt is
byte-identical to before.

Rebuilt: `node _build_generate_dispatcher_module.js` (the builder writes both
`generate_dispatcher_module.js` and the `desktop/web-app/public/` mirror; verified identical).

### Verified

`node --check generate_dispatcher_module.js` clean. Consumer survey below.

### Consumer survey (the "does anything break / does anything show it" half)

| Consumer | Tolerates an unknown `emoji` field | Displays it | Action |
|---|---|---|---|
| `games_source.jsx` letter activities | yes | **no** | fixed, see below |
| `view_glossary_source.jsx` glossary table | yes | no | fixed, see below |
| `doc_pipeline_source.jsx` glossary export (table + flash-card modes) | yes | no | fixed, see below |
| Flashcard front/back (`view_glossary_source.jsx:1072-1120`) | yes | no | left, see "For Aaron" |
| Glossary TTS / download audio | yes (reads `item.term` only) | n/a | improved by the fix: the emoji is no longer inside the string sent to TTS |
| Term image generation (`generate_dispatcher_source.jsx:2221`) | yes | n/a | improved: the emoji is no longer part of the image subject |

**L1's note that `games_source.jsx` "already reads `item.emoji` via `gameTermParts`" is not
quite right, and it matters.** `gameTermParts(rawTerm)` (`games_source.jsx:108`) *derives* an
emoji by parsing it back out of the term string; the call site at `:6527` passes `item.term`,
not `item`. So with the schema fixed and the model behaving, `parts.emoji` would be empty and
the letter games would have shown **no** emoji at all. Adding the field without this would
have quietly removed the decoration that "use emojis" is supposed to produce.

Three one-line display fixes, all additive, all guarded on the field being present:

- `games_source.jsx:6530` (+ the byte-identical `desktop/web-app/src/games_source.jsx`) —
  `emoji: parts.emoji || item.emoji || ''`. Legacy inline emoji still wins, so L1's
  consumer-side stripping is untouched and a legacy glossary behaves exactly as before.
  `node dev-tools/check_source_pair_drift.js` clean; `node _build_games_module.js` rebuilt.
- `view_glossary_source.jsx:1231` — the term cell renders `item.emoji` in an `aria-hidden`
  span before the term, so it is decoration rather than something a screen reader announces
  as part of the word. Rebuilt.
- `doc_pipeline_source.jsx:36695` and `:36848` — the same, in the glossary flash-card and
  glossary table export renderers.

**Ownership note:** `games_source.jsx` and `view_glossary_source.jsx` are not in W5's list.
L1 claimed the glossary surface in wave 1 and no wave-2 lane owns either file. Both changes
are single-line Edits (never Write) and are recorded in `CROSS_LANE_REQUESTS.md`.

### For Aaron

I did **not** put the emoji on the flashcard front. The card already sizes its term to fill
the card, and an emoji there is a layout change rather than a one-line addition. Nothing is
lost: a legacy glossary with the emoji inside the term still shows it there exactly as today.

---

## Task 1 — Printable cloze worksheet

### Found

L3's design holds up, with three things the line numbers could not tell them:

1. `doc_pipeline_source.jsx:36494` (was `:36410` in L3's report; L8's edits moved it) is
   indeed the whole `simplified` renderer.
2. `generateResourceHTML` has **exactly one** call site, `:39411` inside
   `_materializeRenderable` inside `generateFullPackHTML`, and it is handed a single `item`.
   There is no `latestGlossary` in this module at all. So the glossary has to be resolved in
   `generateFullPackHTML`, which does hold the whole pack, and handed down.
3. The teacher copy **early-returns `''` for `simplified`** (`:36461`), and a *second*
   copy of that same rule lives in `_willRenderForCtx` (`:39388`), which filters the item out
   before `generateResourceHTML` is ever called. An answer key "behind the existing
   `isTeacher` gate" therefore needs both derivations relaxed, in step, or the key silently
   never renders. (This is the two-derivations-of-one-verdict shape that has bitten this repo
   before.)

### Changed

**`doc_pipeline_source.jsx`** (under the fleet lock, two bursts, Edit only):

- `:36442-36545` — new helpers next to the existing `ruledLines` / `fillableCircle` /
  `fillableBlank` worksheet family: `_clozeIsOn`, `_clozeBlank(n)`, `_clozeBuild()`,
  `_clozeShuffle()`, `_clozeWordBankHTML()`.
- `:36494` (`simplified`, student copy) — when `isWorksheet && cfg.clozeWorksheet`, renders
  the blanked passage, an instruction line, and the word bank. Falls back to the plain
  passage when no term matched.
- `:36461` (`simplified`, teacher copy) — returns the numbered answer key instead of `''`.
- `:39388` (`_willRenderForCtx`) — the matching relaxation, with a comment on each side
  pointing at the other.
- `:39399` (`generateFullPackHTML`) — resolves the pack's most recent glossary onto
  `cfg.__clozeGlossary`, using the same "last glossary item in history" rule as the
  on-screen `latestGlossary` (`AlloFlowANTI.txt:28257`), including its string-JSON fallback.

**`view_export_preview_source.jsx`** — one checkbox, nested under the existing
`includeSimplified` row (`:8153`), visible only when the export format is Worksheet, Leveled
Text is included, and the pack actually contains a glossary to blank against. Writes
`exportConfig.clozeWorksheet`.

Design decisions I made rather than asking:

- **Both traps are handled at the same place.** The answer pushed onto the key is the matched
  text itself, so an English term still sitting in a Spanish passage keys to the English word.
  The regex uses the `(?<![\p{L}\p{N}])` boundary with the CJK/Thai substring branch and the
  ASCII-`\b` fallback, mirrored from `highlightGlossaryTerms`.
- **Blanking runs over the rendered HTML, split on tags**, so a term never matches inside an
  `src`, `alt` or `style` attribute. Markdown structure (headings, `<strong>`) survives.
- **Fixed-width blanks** (120px min) so the length of the line does not give the answer away,
  with a visible number rather than an `aria-label`, because the number has to survive
  printing and it is what the key counts against.
- **The word bank is built from the blanks that were actually made**, deduped, not from the
  glossary. A word therefore cannot be missing from the bank.
- **A third trap I hit that L3 did not name:** the bank was offering the *matched* text, so a
  term that happened to open a sentence was offered capitalised (`Мозг` rather than `мозг`),
  which reads as a different word and hints at where it goes. The bank now offers the
  canonical passage-language spelling; the answer key still shows the exact replaced text.
  Caught by the Russian fixture, not by reading.
- **Deterministic shuffle** seeded from the term list. The student copy and the teacher key
  are two separate render passes, and a `Math.random()` bank would put them out of step in a
  way nobody notices until a class is holding the sheets.
- **`data-ka-readable` is deliberately dropped** on the cloze variant. That attribute makes
  the HTML export offer sentence karaoke over the passage, and reading a passage full of
  blanks aloud is not a thing anyone wants.
- **Chose not to silently no-op.** If no glossary term appears in the passage, the student
  gets the ordinary readable passage and the teacher key says
  "No glossary terms appear in this passage, so no blanks were made."

### Verified

New: `tests/cloze_worksheet_print.test.js`, **15/15 pass**. It drives the REAL built
`doc_pipeline_module.js` through the same injected-state factory seam
`tests/doc_pipeline_headless.test.js` uses, so these are assertions about the shipped path.
Covers: off by default; inert in PDF mode; blank count including a repeated term; the prose
actually losing the words; blank numbering; a passage-language bank with the English kept
beside it; bank dedupe; **trap 1** (an English term in a Spanish passage keys to English);
**trap 2** (Cyrillic blanks, which a plain `\b` produced zero of); the teacher key contents
and ordering; key suppression when `includeTeacherKey` is off; the honest no-blanks message;
no literal `export.cloze_*` keys leaking; and shuffle stability across two render passes.

Then generated a real Spanish worksheet export and **read the output HTML** (per the prompt):
6 blanks numbered 1-6 across two paragraphs, markdown headings and `<strong>` intact, blank 3
correctly nested inside its `<strong>` rather than corrupting it, word bank
`célula (cell)` / `mitochondria` / `membrana (membrane)`, answer key
`célula, célula, membrana, célula, mitochondria, membrana` in blank order. The glossary
section of the same export showed
`<strong class="gloss-term"><span aria-hidden="true">🔬</span> cell</strong>`, which is
task 2's export consumer confirmed in the same artifact.

`node --check doc_pipeline_module.js` and `view_export_preview_module.js` clean; both
builders sync their `desktop/web-app/public/` mirror automatically (verified).

### For Aaron

- Four new user-facing strings use the `t('export.cloze_*') || 'English fallback'` pattern the
  rest of this renderer uses. The keys do **not** exist in `ui_strings.js` yet, which is W1's
  file under lock. `t()` returns `undefined` for a missing key (`AlloFlowANTI.txt:4990`), so
  the English text renders correctly today and nothing leaks a raw key (asserted by a test).
  Filed to W1 in `CROSS_LANE_REQUESTS.md`.
- `exportConfig` in `AlloFlowANTI.txt:25211` has no `clozeWorksheet` default. The checkbox
  reads `!!exportConfig.clozeWorksheet` so this is harmless; I added the explicit default in
  the ANTI burst below so the export presets round-trip it cleanly.
- Not wired into the **Document Builder's** "detected leveled text" surface. That is the same
  `isWorksheet` pipeline as L3 said, but it is a second entry point with its own config
  plumbing, and I would rather ship the export path verified than two paths half-checked.

---

## Task 3 — GLOSS_RESET (L1's G6 root fix)

### Found

L1's diagnosis is correct: `GLOSS_RESET` (`AlloFlowANTI.txt:8669`) had exactly one occurrence
in the monolith, its own declaration, so the vocabulary filter and everything else in the
glossary reducer outlived the glossary it belonged to.

**What their report could not have known without reading `GLOSS_INITIAL_STATE`:** dispatching
`GLOSS_RESET` as written would have been a worse bug than the one it fixes. Seven of the
seventeen fields it resets are the teacher's **generation settings**, not view state:

```
glossaryTier2Count: 4        glossaryTier3Count: 6        glossaryDefinitionLevel: 'Same as Source Text'
glossaryImageSize: 128       glossaryImageStyle: ''       includeEtymology: false    etymologyScope: 'tier3'
```

A teacher who sets "10 Tier 3 terms, include etymology" and then generates anything at all
would have had that silently reverted to 4/6/off, every time. `GLOSS_RESET` has no other call
site, so redefining what it means was free.

Three more fields are **index-keyed maps** (`isGeneratingTermImage`,
`glossaryRefinementInputs`, `isGeneratingEtymology`) whose keys are positions in the term
list. Carrying those across a content change is its own latent bug: index 3 of the new
glossary inherits the spinner and the refinement text of index 3 of the old one.

### Changed

**`AlloFlowANTI.txt:8669`** (under lock) — `GLOSS_RESET` now means "a different glossary is on
screen", not "forget everything". It clears `glossaryFilter`, the health check, edit mode, the
definition popups, the half-typed add-term box, and the three index-keyed maps. It
**preserves** the seven generation settings, with a comment saying why.

**`AlloFlowANTI.txt:28288`** (under lock) — the call site, placed immediately after the
`latestGlossary` memo:

```js
const prevGlossaryResourceIdRef = React.useRef(null);
React.useEffect(() => {
    const currentId = generatedContent?.id || null;
    if (prevGlossaryResourceIdRef.current === currentId) return;
    prevGlossaryResourceIdRef.current = currentId;
    glossaryDispatch({ type: 'GLOSS_RESET' });
    setGlossarySearchTerm('');
}, [generatedContent?.id]);
```

Two placement decisions worth recording:

- **Keyed on the id through a ref**, following the existing sticker-loading effect at
  `:13827`. `generatedContent` is re-created on every edit to the *same* resource, so an
  effect keyed on the object would clear the teacher's filter while they were using it.
- **Placed after `glossarySearchTerm`'s `useState` (`:21126`)**, not next to the sticker
  effect, or `setGlossarySearchTerm` is in its temporal dead zone and the app crashes on
  render.

I checked L1's cause 3 for a collision: `handleOpenCurrentFlashcardInGlossary`
(`view_glossary_source.jsx:634`) writes a search term but does **not** change
`generatedContent`, so opening a flashcard in the glossary still works.

**`AlloFlowANTI.txt:25231`** — `clozeWorksheet: false` added to `DEFAULT_EXPORT_CONFIG`
(task 1 tidy-up).

**`view_glossary_source.jsx:808`** — L1's G6 comment said `GLOSS_RESET` "has NO call site
anywhere in the monolith". That is now false, so it says what is true instead, and why the
per-glossary branches below it still matter.

### Verified

`tests/glossary_empty_state_and_print.test.js` updated per its own instruction (its guard
told the next reader to revisit these notes when `GLOSS_RESET` gained a call site). The guard
is the same guard turned the other way up, plus two new ones the change needs: that the
generation settings are **not** in the reset, and that the three index-keyed maps **are**.
**15/15 pass.**

`node dev-tools/check_build_smoke.cjs` → both `AlloFlowANTI.txt` and the generated `App.jsx`
parse cleanly as JSX. I did **not** run `build.js`, so `App.jsx` is unchanged on disk, in line
with what every wave-1 lane did.

### For Aaron

The tier counts and etymology settings surviving a content change is a **product decision I
made on your behalf**, and it is the one place I departed from L1's literal recommendation.
Reverting it is one line (restore `return { ...GLOSS_INITIAL_STATE }`), but I think a teacher
losing their glossary setup on every generation would be the louder complaint.

---

## Task 4 — Mic meter in dictation (L7 -> L6 request)

### Found

L7's request says "one line each way". It is one line each way for the **recorded** engines
and it cannot be for the browser one, and the difference matters because of the exact thing
the prompt asked me to verify.

`micLevelMonitor.acquire()` (`allo_commands_source.jsx:3227-3242`) calls
`navigator.mediaDevices.getUserMedia` itself whenever it is handed no stream **and** no
analyser is already running. So `acquire(null)` on the browser speech path, which is what the
request literally proposes, opens a second microphone capture next to the one
`SpeechRecognition` is already running, and on most browsers a second recording indicator.
The Web Speech API does not expose its stream, so there is nothing to hand over.

`recordAudioBlob` already emits its stream through `onStream(stream)` (`voice_module.js:332`),
so the recorded engines have a stream to hand over and cost nothing.

### Changed

`voice_module.js` (no source pair; it *is* the source. Mirrored to
`desktop/web-app/public/voice_module.js`):

- `:994` — `acquireMicMeter(stream)` / `releaseMicMeter()` inside `createDictationController`,
  resolving the monitor through `window.AlloModules.AlloCommands.micLevelMonitor` with the
  `window.__alloMicLevelMonitor` fallback, the same two-step lookup `allobot_source.jsx:243`
  uses. `acquireMicMeter(null)` **returns without acquiring** unless the monitor is already
  active.
- `:1078` (`startRecordedEngine`) — `onStream` now takes its `stream` argument and hands it
  over. This is the case that lights the meter for Browser Whisper and cloud transcription.
- `:1157` (`startWebSpeech`) — `acquireMicMeter(null)`, which piggybacks on a live monitor
  (AlloBot's, typically) and otherwise does nothing.
- `:1024` (`releaseActive`) — releases the meter. Every terminal path (`fail`, `abort`, the
  completed and no-speech paths) already funnels through here, so there is one release site
  rather than five.
- `:1090` — an extra release the moment transcription starts. The microphone is shut by then,
  and bars still running through a cloud round-trip read as "still listening".
- `:323` — the `onLevel` doc comment said "deferred, needs Web Audio analyser; stubbed for now
  to keep this commit small". That is no longer true and it is the note that made this look
  like a missing feature rather than a deliberate one. It now says where the analyser actually
  lives and what a caller wanting a meter should do.

### Verified

New: `tests/dictation_mic_meter.test.js`, **5/5 pass**, with a fake monitor honouring the real
`acquire`/`isActive` contract:

- recorded engine acquires **with the existing stream**, and `getUserMedia` is called
  **exactly once** in the whole flow (`recordAudioBlob`'s own);
- the meter is released before the transcription call is made, not after it returns;
- the browser engine piggybacks when a monitor is already live (`getUserMedia` calls: **0**);
- the browser engine does **not** acquire when nothing else holds the monitor
  (`getUserMedia` calls: **0**) — this is the "no second capture" guarantee;
- dictation still starts and stops cleanly when `AlloCommands` has not loaded at all.

Regression: `voice_dictation_controller`, `voice_session_coordinator`, `voice_start_resilience`,
`voice_barge_in`, `allobot_disable_and_mic_feedback` — **42/42 pass**.
`node --check voice_module.js` clean; mirror byte-identical.

### For Aaron

The meter lights for Browser Whisper and cloud transcription always, and for the browser
speech service only when something else already has the monitor open. I judged a sometimes
absent meter better than a second microphone light appearing whenever a student dictates.
If you want it always on for the browser engine too, it is a one-line change
(`acquireMicMeter` dropping its `isActive()` guard) and the cost is that second capture.

---

## Task 5 — C6 re-examined (Video Studio vs the standalone)

### Found

**L10 searched for the wrong noun, and Demo Autopilot is a name collision.** Aaron's C6 reads:
"The IT helper screen-recording tool now exists standalone, so its **demo version inside Video
Studio** is redundant." L10 read "demo version" as a feature *called* a demo, found **Demo
Autopilot**, and concluded correctly that nothing standalone covers it. But "its demo version"
means *the cut-down copy of the standalone tool*, and that copy exists: it is the **Screen
Coach** panel at `video_studio/video_studio.html:501`, whose standalone twin is
`it_coach/it_coach.html` (1,535 lines, titled "AlloBot Screen Coach", scoped in
`docs/IT_COACH_STANDALONE_SCOPE_2026-08-11.md`).

So both halves of L10's C6 need correcting, in opposite directions:

- **L10 is right about Demo Autopilot.** It is not a coach at all. You state a goal, the model
  plans steps against AlloFlow's own command registry, you approve the plan, and *the app
  drives itself* through `runPlan` while the popup records the tab and turns each step into a
  caption cue. It is gated to a browser-tab capture of AlloFlow itself
  (`video_studio_module.js:2566`) and needs the opener window. `it_coach` contains nothing of
  this and structurally cannot: it has no `MediaRecorder`, no command registry, no opener.
  **It is not the C6 target and must not be removed.**
- **L10 missed the real target**, and the "there is no IT-helper demo to remove" conclusion is
  wrong. There is one, it is Screen Coach, and `grep getDisplayMedia` finds it in three
  seconds where "IT helper" finds nothing.

### The comparison Aaron asked for

| Capability | Video Studio Screen Coach (`video_studio.html:501`) | Standalone IT Coach (`it_coach/it_coach.html`) |
|---|---|---|
| Watch a shared surface without recording | yes (`startCoachWatch`, `:14332`) | yes |
| Coach off the **live recording stream** | **yes** — `coachCaptureActive()` (`:14326`) accepts `rec.state !== 'inactive'` | **no** — 0 uses of `MediaRecorder` |
| Highlight box on our mirror of the capture | yes | yes |
| Document Picture-in-Picture float-on-top | yes | yes |
| Spoken guidance | yes (`speechSynthesis`) | yes |
| Consent gate before the first frame is read | yes | yes |
| One downscaled frame per suggestion | yes | yes |
| Advice sanitizer (null-when-unsure box) | `vsSanitizeCoachAdvice` | **same one**, loaded from `video_studio_module.js`, not copied |
| Works with **no AlloFlow window open** | no — AI leg goes through `bridgeRequest`/`opener` | **yes** — its own `AIProvider.analyzeImage` transport |
| Backend choice (gemini/openai/claude/ollama/local/...) | no, the app's Gemini | **yes** |
| Educator / learner posture with the learner guardrail | partial (`?allo_posture=`, `:14324`) | **yes**, 23 `learner` sites vs 14 |
| Conversation log with sources, walkthrough step controls | no | **yes** |
| Discoverable on its own | inside a `<details>` inside a 16,251-line popup | `open_it_coach` command, aliases "coach me through another website", localized in all 63 packs |

### Verdict: **not redundant, do not remove.** Here is the one thing that stops it.

Everything in that panel is covered by the standalone **except one row**: the Video Studio
copy can coach you off the **capture you are already recording**, sharing the single
`getDisplayMedia` stream. That is what its own summary line claims it is for ("AI guidance
while you record"), and it is structurally impossible in `it_coach`, which has no recorder.
Deleting the panel would delete that, and the alternative for a teacher recording a tutorial
would be a second screen-share into a second window.

Per the prompt's "do not delete anything you have not proven redundant", I did not delete it.
Twelve of thirteen rows redundant is not redundant.

### Changed

One thing, and deliberately small. Someone had already added the disambiguation to the panel's
`<summary>` ("To be coached through another website, use IT Coach instead") but the body copy
directly under it still opened with "Pick **any tab or window**", which reads as an invitation
to do the exact thing the summary just redirected. `video_studio/video_studio.html:503` now
says the panel is for the take you are making here, and names the standalone and the phrase
that opens it. Mirrored byte-identically to
`desktop/web-app/public/video_studio/video_studio.html`.

### Verified

`npx vitest run tests/video_studio.test.js tests/it_coach.test.js` → **261/261 pass**, before
and after. Both mirrors byte-identical (checked with `cmp`). Capability rows read from source
at the line numbers given, not from the scope doc, which predates both by five days.

I did **not** run either surface in a browser. Every row above is a source-level claim about
which APIs and code paths exist, which is what a redundancy question turns on; none of it is a
claim about how either page looks or feels.

### For Aaron

- **Demo Autopilot stays.** L10's read of it was right and it is the one thing here nothing
  else covers.
- **Screen Coach in Video Studio stays**, on the strength of one row. If you decide that
  coaching-while-recording is not worth a duplicated panel, the removal is clean and I would
  take it next time: delete `#coachPanel` (`:501-517`), the `Screen Coach` block
  (`:14306-14400`), and the four test pins at `tests/video_studio.test.js:3327-3396`. The
  shared sanitizer lives in `video_studio_module.js` and is used by both, so it stays either
  way. That is your call, not a defect.
- **L10's C6 section is wrong in its headline** and already carries a self-correction pointing
  at `it_coach`. Worth not reading the original conclusion at face value later.

---

## Task 6 — FLASHCARD_NO_ANSWER key

### Found

**Not filed to me, so not done.** The task was conditional on W1's report filing the ANTI edit
to W5. `reports/W1_report.md` landed mid-run and contains no mention of `FLASHCARD_NO_ANSWER`
or `'Translation unavailable'` (grepped both), and there is no `[W1 -> W5]` line for it in
`CROSS_LANE_REQUESTS.md`. W1's only request to me was the `check_iife_lazy_lookup` blocker,
which I took (below).

Recorded for whoever picks it up, because it is **not** the one-line swap it looks like:
`AlloFlowANTI.txt:2549` is a module-level `const` outside the component, so it cannot call
`t()` where it sits (`t` is a `useCallback` at `:4973`). It is read at `:2551`, `:2554`,
`:2556`, `:2558` inside a pure helper, and at `:18672` it is compared **by identity** to
filter flashcard distractors. Making it localizable means turning it into a function resolved
at use time and threading `t` into that helper, and keeping the `:18672` comparison honest
across a mid-session language change. Filed back to W1 in `CROSS_LANE_REQUESTS.md`.

---

## Cross-lane requests I picked up mid-run

Three arrived addressed to W5 after I started. All three are in my report because I did them.

### W2 -> W5: Kokoro download pill z-index

`AlloFlowANTI.txt:46161`, `zIndex: 9997` -> `zIndex: 40`, under the fleet lock. W2 measured
the modal layer in this file at z-[60] to z-[1000], so 9997 put a `position: fixed` pill on
top of every dialog. Their measurement is recorded in a comment at the site so nobody
"restores" the old number. `node dev-tools/check_build_smoke.cjs` clean.

I nearly shipped a real bug here: my first version of that comment used JSX `{/* ... */}`
syntax **inside a style object literal**, which is a syntax error. Caught and corrected before
the build check. Worth noting because ANTI is a `.txt` and `node --check` cannot see it.

Not re-rendered. This is W2's pixel finding applied, not independently re-verified.

### W2 -> coordinator: crossword print header

`games_source.jsx:5251` gained `no-print`. W2 rendered the crossword under
`page.emulateMedia({media:'print'})` and found the indigo header bar, with the theme toggle
and close button in it, landing at the top of every printed worksheet; the twelve other
`no-print` marks in that modal were all correct, so this was one omission rather than a broken
mechanism. Mirrored to `desktop/web-app/src/games_source.jsx`, drift check clean, module
rebuilt. Also not re-printed by me.

### W1 -> W5: the `check_iife_lazy_lookup` gate blocker

**This one I did not fix the way I was asked to, and the reason matters.**

W1 reported the three failures and said "Fix is the lazy-getter wrap the check prints".
Applying that would have broken all three files. Every one of them is a module reading the
`window.AlloModules` key **it itself registers**:

- `mailbox_script_source_module.js:4` and `walkthrough_script_source_module.js:14` —
  `var previous = window.AlloModules.<Self>`, then `if (previous && previous.version === N &&
  previous.sha256 === '...') return;`. A **dedupe guard**: "am I already loaded at this exact
  version?". Behind a lazy getter it never fires and the module re-registers on every load.
- `walkthrough_copilot_cdn_module.js:3043` — `var wcopCoreApi =
  window.AlloModules.WalkthroughCopilot || {}`, merged with the panel's own exports and
  written back to that same key three lines later. It reads a value it consumes immediately.

The check's own header says what it is for: "Module A cannot assume module B has finished
loading". When A **is** B, the read is registration-time by construction. These are false
positives, on three files unchanged in git since Aug 13.

So I fixed the check, in `dev-tools/check_iife_lazy_lookup.cjs`:

- `collectOwnedKeys()` walks the IIFE and collects every key it **assigns** (at any depth, so
  a module registering itself from inside an init function still counts).
- A flagged read is exempted only when its key is in that set. The exemption is **per key,
  not per file**: a module that registers X and also snapshots Y is still flagged on Y.
- Exempted sites are **printed** with file and line, never silently dropped, so the rule can
  never hide a real finding.

**I am aware this sits close to the line RULES section 4 draws around "do not bypass".** My
reasoning: the alternative was to introduce three real defects into working, committed code to
satisfy a check that was wrong about them, and W1 filed this to me as a task rather than as
drift to report. Reverting is deleting `collectOwnedKeys` and the two call sites; the three
module files are untouched either way.

Verified the narrowing did not blunt the check: I dropped a throwaway `_w5_probe_module.js`
into the repo root doing a genuine cross-module snapshot
(`var fetcher = window.AlloModules.SomeOtherModule;` while registering its own `W5Probe` key).
The check **flagged it and exited 1**, proving the exemption is key-scoped rather than
file-scoped. Removed it again; exit 0. The probe file is gone (`ls` confirmed).

---

## Gate and test status

### `npm run verify:gate` -> **exit 0. Green.**

All 17 checks pass. This is the first green gate of this fleet: `check_cmd_i18n` blocked every
wave-1 lane, W1/W3 cleared it, that exposed `check_iife_lazy_lookup` as the next failure, and
this lane cleared that. Nothing after `check_cmd_i18n` had run for any lane before today.

### Targeted vitest

| File | Result |
|---|---|
| `tests/cloze_worksheet_print.test.js` (new) | 15/15 |
| `tests/cloze_multilingual_word_bank.test.js` (L3's) | pass |
| `tests/glossary_empty_state_and_print.test.js` (L1's, updated) | 15/15 |
| `tests/dictation_mic_meter.test.js` (new) | 5/5 |
| `tests/video_studio.test.js` | 211/211 |
| `tests/it_coach.test.js` | 50/50 |
| `tests/doc_pipeline_headless.test.js` | pass |
| `tests/export_correctness.test.js` | pass |
| `tests/glossary_helpers.test.js`, `tests/glossary_activity_scripts.test.js` | pass |
| **batch total** | **379/379** |
| `voice_dictation_controller`, `voice_session_coordinator`, `voice_start_resilience`, `voice_barge_in`, `allobot_disable_and_mic_feedback` | 42/42 |
| `tests/dark_mode_contrast_gate.test.js`, `tests/docsuite_theme_contrast.test.js`, `tests/doc_pipeline_export_a11y_gate.test.js`, `tests/export_preview_wcag_a11y.test.js` | 73/73 |
| `tests/doc_pipeline_build_parity.test.js` | **timeout at the 5s default; passes at `--testTimeout=180000`** (see below) |

**Zero red tests attributable to this lane.** The one failure is
`doc_pipeline_build_parity.test.js` hitting vitest's default 5s timeout while it shells out to
a full `_build_doc_pipeline_module.js` (~23s here). Re-run with `--testTimeout=180000`: passes,
both shipping locations byte-identical to a fresh source build. It needs a per-test timeout in
the file; not my file, not a real parity failure, filed to the coordinator.

### Builders run, and mirrors

| Source edited | Builder | Mirror |
|---|---|---|
| `generate_dispatcher_source.jsx` | `_build_generate_dispatcher_module.js` | auto to `desktop/web-app/public/` (verified `cmp`) |
| `doc_pipeline_source.jsx` | `_build_doc_pipeline_module.js` | auto (verified) |
| `view_export_preview_source.jsx` | `_build_view_export_preview_module.js` | auto (verified) |
| `view_glossary_source.jsx` | `_build_view_glossary_module.js` | auto (verified `cmp`) |
| `games_source.jsx` | `_build_games_module.js` | hand-copied to `desktop/web-app/src/`, `check_source_pair_drift.js` clean |
| `voice_module.js` (no pair, IS the source) | n/a | hand-copied to `desktop/web-app/public/`, `cmp` identical |
| `video_studio/video_studio.html` (no pair) | n/a | hand-copied to `desktop/web-app/public/video_studio/`, `cmp` identical |
| `AlloFlowANTI.txt` | **not built** — `App.jsx` deliberately left untouched, as every wave-1 lane did | `check_build_smoke.cjs` confirms both parse |

`node --check` clean on every built module.

### Lock discipline

`generate_dispatcher_source.jsx` (1 burst), `doc_pipeline_source.jsx` (2 bursts),
`AlloFlowANTI.txt` (2 bursts). Acquired with `--wait`, re-read the anchors after acquiring,
Edit only, released immediately after each burst. Never held across a test run or an
investigation. `doc_pipeline_source.jsx` was held by the non-fleet `fable-auditmodal` session
at startup; I waited rather than editing around it. One Edit reported the file had changed on
disk under me during the ANTI burst; the edit applied cleanly and I re-read before continuing.

### What I did not do

- No `git add`, `commit`, `push`, `stash`, `reset`, `checkout`, or `rebase`. No `deploy.sh`, no
  `build.js`. Index untouched.
- Did not touch `view_pdf_audit_*` (off-limits, staged by another session) or any of the ~49
  untracked files.
- Did not run `dev-tools/_apply_docsuite_theme.cjs`. W2's hand-off says the last lane standing
  should, once the tree is quiet. The tree is **not** quiet: `fable-severitycolors` held
  `view_pdf_audit_source.jsx` during this run and W6 has not started. Leaving it to whoever
  actually finishes last, per W2's own instruction. I added no new colour tokens (`mr-1`,
  `no-print`), so I did not add to that queue.

---

## For Aaron, in one place

1. **Cloze worksheet is built and verified end to end**, including a real Spanish export I read
   line by line. Both traps L3 warned about are handled, plus a third (a sentence-initial term
   being offered capitalised in the word bank) that only showed up under a Russian fixture.
   Four English strings are still awaiting `ui_strings.js` keys from W1; they render correctly
   today and a test guarantees no raw key can leak.
2. **The emoji schema fix needed a consumer fix nobody had spotted.** L1's note said the games
   already read `item.emoji`; they do not, they parse it back out of `term`. Shipping the
   schema change alone would have silently removed emoji from the letter games, the glossary
   table and the exports. Three one-line display fixes cover it.
3. **I deliberately did not implement `GLOSS_RESET` as written.** Seven of its seventeen fields
   are your glossary generation settings, and resetting them on every content change would
   have been a worse bug than the stale filter. Documented, tested, and one line to revert.
4. **C6: do not remove Screen Coach from Video Studio.** L10 answered the wrong question
   (Demo Autopilot is a name collision, and their read of it is right). The real target is the
   Screen Coach panel, and it is redundant with `it_coach` on twelve of thirteen capability
   rows. The thirteenth is that it can coach off the take you are recording, which the
   standalone structurally cannot do. Comparison table is in the C6 section; the removal recipe
   is there too if you decide that row is not worth it.
5. **The gate is green for the first time this fleet**, but the last step of getting there was
   me narrowing a dev-tools check rather than changing three source files. Read that section if
   you read nothing else in this report; it is the one place I substituted my judgement for an
   instruction from another lane.
6. **Not done, deliberately:** the `FLASHCARD_NO_ANSWER` key (W1 never filed it, and it is not
   a one-liner), and wiring cloze into the Document Builder's leveled-text surface (a second
   entry point I would rather do properly than half-check).
---

## Addendum — two late W1 requests, and one correction to my own method

### W1 -> W5: `view_sidebar_panels_source.jsx:745` stale inline fallback

W1 landed W2's article-agreement fix in `ui_strings.js` (`universal.translations_on_hint`) but
the call site still carried the old wording as its `|| '...'` fallback, which is what renders
on a cold paint before i18n loads, so "a English version" still showed. Changed to
`'Resources in {output} will also include a version in {target}.'`, matching the new
`ui_strings.js` value exactly.

### W1 -> W5/W3: `view_sidebar_panels_source.jsx:2445` missing 7th and 8th grade

Confirmed and fixed. The glossary "Def. Level" select ran Kindergarten, 1st-6th, then jumped
to 9th-12th and College. Two `<option>` lines added between 6th and 9th.

Checked three things before adding them, because a select's option *values* are stored data:

- `grades.g7` and `grades.g8` already exist in `ui_strings.js` (`:2970-2971`), so no new key
  and no pack work.
- The value strings `"7th Grade"` / `"8th Grade"` match the canonical grade list in
  `allo_data_source.jsx:635`.
- The **sibling select in the same file** (`:649`, the global grade level) already renders
  `<option value="7th Grade">{t('grades.g7')}</option>`, so this is the file's own established
  pattern, copied rather than invented.

Both under the fleet lock (`view_sidebar_panels_source.jsx` is one of RULES section 3's four),
Edit only, rebuilt with `node _build_view_sidebar_panels_module.js` (auto-mirrors to
`desktop/web-app/public/`), `node --check` clean. `npm run verify:gate` **still exit 0** and
`tests/dark_mode_contrast_gate.test.js` 3/3.

Neither is visually verified. The first is a string swap; the second adds two options to a
list of thirteen that already renders.

### Correction to my own method: a false negative from a drifted shell cwd

Late in the run I reported "no such file" for `view_educator_hub_modal_source.jsx`. That was
wrong. The Bash tool's working directory had drifted to `C:\Users\cabba` (the session's primary
directory) and my relative-path grep was running outside the repo. The file exists.

Re-run correctly, the finding it was after stands and is now properly evidenced: the Educator
Hub has **no card for IT Coach**. Its single `coach` match (`:332`) is `hubRoleRaw.includes('coach')`,
an instructional-coach *role* string, unrelated. So the standalone's only door is the
`open_it_coach` command palette entry with its seven aliases, which matches gap 2.3 / P4-open
in `docs/IT_COACH_STANDALONE_SCOPE_2026-08-11.md`. That does not change the C6 verdict.

I re-ran the two claims that would have mattered most if the drift had touched them, from an
explicit `cd` into the repo: **`npm run verify:gate` exit 0**, and W1's report still contains
**zero** mentions of `FLASHCARD_NO_ANSWER` / `'Translation unavailable'` (task 6 correctly not
done). Every build, test run and `git status` in this report produced repo-relative output that
is only possible from the repo root, so those were unaffected; the drift produced exactly one
bad result and it is corrected above.

Flagging the mechanism rather than just the mistake: **a relative-path grep that returns
nothing is not evidence of absence in this harness**, because the shell's cwd is not guaranteed
between calls. This repo's memory already carries that lesson in a different form
(`feedback_verify_reachability_before_fixing`: a negative grep is not absence). Use an explicit
`cd`, or the Grep tool, for any claim that something does not exist.
---

## Addendum — BirdLab flight sprites (requested directly, outside the W5 lane scope)

Aaron asked for this mid-run: "improve Bird Lab visuals and birds". It is not a W5 issue ID
and touches no W5-owned file, but it is in this shared tree, so it is recorded here. Files
changed: `stem_lab/stem_tool_birdlab.js` and its byte-identical
`desktop/web-app/public/stem_lab/stem_tool_birdlab.js` mirror. Nothing else.

### Found

Captured all 83 visual-QA scenarios, then built a zoom harness (bounding box of every
`[data-birdlab-species]` at `deviceScaleFactor: 4`) because a scene shot renders a bird at
about 20px and you cannot judge a sprite at that size. The perched and ground poses are good
(the cardinal, mallard, heron and eagle all read clearly). **The flight sprites were the
outlier, and they were the worst artwork in the tool.**

Raven, Cooper's hawk and herring gull all soared as **one shape with three palettes**: a
double-lobed wing on each side, so four wings; the bill drawn as an upward spike above the
head; a forked tail below. Zoomed, the hawk and raven read as moths and the gull as a
dragonfly. These are also the most conspicuous birds in the tool, because they are alone in a
large empty sky.

**It was a teaching defect as well as an ugly one.** `targetSearchSilhouetteClue`
(`:12552`) tells the learner "compare body proportions, **bill shape, tail length**, and
posture before relying on color", `TARGET_SEARCH_CLUE_ORDER` makes silhouette the second clue
revealed, and there is an entire **Silhouette Quiz** sub-tool (`:10043`) whose own description
is "the skill experienced birders use for distant flying birds". The artwork gave all three
species the same body proportions, the same bill and the same tail.

Three species, three different code paths, which is how they drifted into one shape:

- `raven-soar` and `coopershawk-soar` had dedicated branches.
- `herring-gull-flight` is returned by `sceneBirdFieldPose` but had **no branch at all** — it
  rendered by falling through to the generic fallback.

### Changed

One renderer replaces all of it: `SOARING_FLIGHT_ART` (a table) plus `renderSoaringBird()`,
called from all three pose branches and from the fallback. The three silhouettes now differ in
exactly the features the clue names:

| | wings | tail | other |
|---|---|---|---|
| raven | long, fingered tips | **wedge** | heavy bill |
| Cooper's hawk | broad, rounded, near-full span | **long, dark, pale-banded** | small head out front |
| herring gull | long, pointed | short, square | **black tips with white mirrors** |

Only the left wing is authored; the right is mirrored through x = 15 by flipping the
even-indexed numbers in the path, so the halves cannot drift apart. That is valid only because
every path uses absolute M/L/C/Z coordinate pairs, which is stated in a comment at the site.
The kingfisher's hover wings (a separate pose) were also widened; they were slivers running to
y=1, above the head, which read as feelers.

Everything stays inside the documented centered 30x30 contract, so the shared 60-unit hotspot
and every scale and anchor calculation are untouched.

Four things I got wrong first and fixed by looking, all worth knowing:

- **Draw order.** Body-first let the wings cover the outer third of the body on each side and
  what remained read as a thin strip between two paddles. Wings first, body over them.
- **A separately stroked tail is an abdomen.** An outlined oval with an outlined bar hanging
  off it reads as thorax-and-abdomen whatever colour the bar is. Body and tail are now one
  stroked silhouette, with a differing tail tone painted as an unstroked overlay inside it.
- **Pale tail with dark bands is a wasp.** Inverted to a dark tail with pale bands, which is
  also how the bird is actually marked.
- **I "corrected" the accipiter to short wings and made it worse.** Its wingspan is about 1.9x
  its body length; the "flying cross" birders describe is the long tail, not short wings.

### Verified

- `node dev-tools/birdlab_visual_qa.mjs` → **83 core states passed, 402 exhaustive states
  validated, exit 0**, including `assertPaintReferencesResolve`.
- `npx vitest run` on `bird_lab_accessibility`, `birdlab_visual_qa`, `birdlab_progression`,
  `birdlab_ispy_tracking` → **47/47**.
- `npm run verify:gate` → **exit 0**.
- `cmp` confirms the `desktop/web-app/public/` mirror is byte-identical (the mirror gate in
  `tests/bird_lab_accessibility.test.js` requires it).
- **Looked at every claim.** Zoomed sprite shots at 4x across ten iterations, plus full-scene
  shots at 1120px to confirm the silhouettes still read at the size a learner actually sees.
- Bounds-checked every new path against the 30x30 contract by hand.

### For Aaron

- The gull is the best of the three and the hawk is still the weakest; it reads as a bird now
  rather than an insect, but it is the one I would revisit first.
- **I did not touch the scenery**, and there is real work there. From the same screenshots:
  the coast and marsh wave lines are ruler-straight full-width white strokes that read as
  scratches; the distant island is a flat grey ellipse; the coast snag is a plain rectangle
  with three stick branches; forest canopies are flat ellipses with a single lighter ellipse
  on top. None of it is broken, so I left it rather than half-finish a second pass.
- `test-results/birdlab-visual-qa` was wiped by a concurrent session while I was capturing
  into it (83 scenarios came back as 32 files, then the directory vanished between two
  commands). The harness hardcodes that path. Worth an output-dir flag; I worked around it by
  importing the harness and passing my own directory.
### Second pass — the scenery (same request, continued)

The list I left at the end of the first pass, worked through. Still only
`stem_lab/stem_tool_birdlab.js` and its mirror.

**Coast.** The horizon was a 4-unit solid bar across all 900 units, which reads as a ruled
line rather than as distance: now a fine line over a soft haze band. The distant island was a
plain `<ellipse>` floating on it like a grey saucer: now a low headland with a wooded crown,
plus a second fainter island to give the horizon depth. The two "wave crests" were full-width
sine waves on a fixed 80-unit period at 5 units of amplitude, stacked one above the other:
now broken, unequal swell in three distance bands that get shorter, finer and denser toward
the horizon, over three translucent depth bands. The snag was a uniform 8-wide `<rect>` with
three equal straight branch strokes, i.e. a pole with a TV aerial: now tapered, wider at the
waterline, with drooping branches and two snapped stubs. The foam was one 3.2-wide stroke
running the entire width and was the brightest, straightest thing in the picture: now heaviest
against the ledge where water actually meets rock, breaking into scattered patches offshore.

**Marsh.** The "water reflections" were three dead-straight horizontal white rules
(`M 100 420 L 200 420` and two more) at full white. That is why the water read as scratched.
Now curved, uneven, dimmer and broken. Lily pads were plain green ellipses: they now carry the
notch that makes a lily pad read as one, plus a paler rim so they sit on the water.

**Ambient shimmer (coast + marsh).** Two more full-width single strokes on a regular T-chain.
Stacked with the swell and the foam they made a set of parallel rules across the water. Broken
into segments; light on water catches in patches.

**Forest and backyard canopies.** Every broadleaf tree was one `<ellipse>` — a green balloon
on a stick. New `birdlabCanopy()` / `birdlabLeafBlob()` helpers build a lumpy outline with a
sunlit clump up-left and a shaded clump down-right. Applied to all five forest trees, the
backyard tree and the backyard shrub. Deterministic by construction (fixed lobe count and
phase, no randomness) so the QA screenshots stay stable. First attempt looked low-poly: few
lobes plus a deep wobble turns a quadratic blob into visible flat facets, so the inner clumps
now carry more lobes and a gentler wobble than the outline.

**Backyard deck rail.** A top rail with four thin posts hanging off it at 70-unit spacing and
nothing else, which rendered as a table standing on the lawn. Now a real railing: bottom rail,
twelve balusters, corner posts, and decking under it. Found by probing the DOM for elements in
the band rather than guessing from the picture.

**Mountain conifers.** Every fir was a plain triangle. New `birdlabFirPath()` builds the
stepped whorl edge that separates a spruce from a green cone, from the same four numbers the
triangle used. Applied to the twelve-tree mid-distance band and both tall conifers; the
pileated's `data-birdlab-trunk-anchor` trunk and its draw order are untouched.

### Verified (second pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; `node dev-tools/check_keyless_map.cjs` clean (the new baluster loop is
keyed); `npm run verify:gate` **exit 0**; mirror byte-identical. Every habitat re-rendered and
looked at after each change — forest, marsh, coast, backyard and mountain.

### Still open, for Aaron

- The **kingfisher hover** sprite is better (its wings were slivers running above the head)
  but is the weakest bird left, along with the Cooper's hawk.
- The **coast granite ledge** is still a flat mauve polygon with a single thin crack line; it
  wants the faceting the mountain boulder already got.
- The **eider** on the water reads as a grey lozenge.
- The forest's **distant treeline** is still a regular row of identical `Q` arches.
### Third pass — the rest of the open list, plus one real bug

**Kingfisher hover.** The worst remaining bird. A belted kingfisher is top-heavy: an oversized
shaggy-crested head and a dagger bill on a compact body. This had it exactly backwards — a
small dark head circle sitting on a big pale oval, with two narrow wings above it — so zoomed
it read as a cat's face and at scene scale as a moth. Head is now larger than the body, the
bill is the longest thing in the sprite, the crest is several ragged points rather than one
smooth triangle, and it carries the white collar and blue breast band that separate it from
everything else in that marsh at a glance.

**Coast granite ledge.** One flat mauve fill with a single thin crack scratched on it, i.e.
the same paper-cutout defect the mountain boulder had already had fixed. Now four facets in
different tones with joint lines along the breaks, because granite breaks along planes and the
joints are what describe the shape.

**Forest distant treeline.** Eleven identical `Q` arches on a constant 50-unit pitch, which
reads as a scalloped border rather than as trees. Crown width and height now vary tree to
tree, and a second nearer band in a darker tone gives the ridge depth.

**The vireo was standing on nothing.** Chasing a small unidentified sprite in the marsh
mid-air turned up a genuine bug rather than an art nit. The vireo's hint reads *"Hidden in the
reeds — only the song betrays it"* and there was **no vegetation anywhere on its route**: it
crossed open sky above the bank with its legs dangling. The clue described scenery that did
not exist, and the marsh's hardest I-Spy target was its most exposed bird.

Fixing it needed a measurement, not a guess. The bird config's `x`/`y` are **not** scene
units, and the actor **travels** — measured at scene x 198 to 405 across the behaviour states,
so my first attempt (one clump at the config's x=380) landed to the right of the bird. Built a
`where.mjs` probe that reports each actor's rendered box in viewBox space, took the range, and
laid a sparse sedge bed across the whole stretch. Deliberately sparse: the bird has to stay
findable through the gaps or a hard target becomes an impossible one.

### Verified (third pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; `check_keyless_map` clean (the new reed loop is keyed); `npm run
verify:gate` **exit 0**; mirror byte-identical. Kingfisher checked zoomed at 4x and at scene
scale; ledge, treeline and reed bed checked in full-scene renders; the vireo confirmed
half-occluded in the wide marsh view.

### Method note worth keeping

Two of the three defects this round were invisible in the code and only showed up by
**cropping a region of the rendered scene at 4x** (`crop.mjs`) or by **measuring rendered
geometry** (`where.mjs`) rather than reading coordinates out of the config. The bird `x`/`y`
in `HABITATS[...].birds` do not map directly to the `viewBox` space the scenery paths are
authored in, so any scenery meant to line up with a bird has to be derived from a measurement.
I got that wrong once and the reeds missed the bird entirely.

### Still open

- The **Cooper's hawk** soaring silhouette is the weakest bird left.
- The **eider** is fine zoomed (black cap, white body, wedge bill) but at 20px it loses
  contrast against the water and reads as a grey lozenge; it wants a darker outline or a
  stronger white/black split rather than a redraw.
- Backyard **house roofs** and the forest **trunk rectangles** are still untextured flats.
### Fourth pass — the last of the list, and a correction to my own report

**Cooper's hawk.** The bird I had been calling the weakest, now fixed properly. Two things
were wrong and only one of them was shape. The wings tapered to a thin blade almost
immediately, so they read as propeller paddles rather than a raptor's broad soaring surface:
the leading edge is now straight, the trailing edge bulges back, and the rounded tip carries
slotted fingers. The larger problem was **tone**: dark grey wings either side of a bright pale
body split the bird into three objects, two paddles and a lozenge between them, which is most
of why it read as an insect however the outlines were tuned. Real underwing coverts are close
to the body tone with the flight feathers darker along the trailing edge and at the tips, so
the wing is now pale like the body and carries a dark trailing-edge band and dark tips. The
body was also a 2.8:1 lozenge and is now shorter and broader through the chest.

Wing markings are authored once on the left and mirrored with the wing, through a new
`mirroredOverlays` list on the art entry, for the same reason the outline is: two hand-written
halves drift the moment either is retouched.

**Forest trunks.** The two prominent ones were uniform `<rect>`s, i.e. posts. Both now flare
toward the base and carry vertical bark in two tones. The mid-right one is the trunk the
nuthatch walks head-down, so it is worth having bark to walk on.

**Backyard roofs.** Flat triangles read as paper folded over a box. Two shingle courses and a
ridge line each, kept faint so they do not compete with the feeder.

**Eider — and a correction.** My previous report said "the eider reads as a grey lozenge at
20px". **That was wrong: the grey shape I was looking at in the coast scene is the seal**, a
distractor animal, and it is drawn correctly. I cropped it at 4x to be sure. The eider itself
was never the problem I described.

I had already rebalanced the eider before catching this, and I have kept the change because it
stands on its own: a drake common eider's field mark is "white above, black below" in roughly
equal halves, and the sprite had the white covering about twice the depth of the black. The
two bands are now balanced and the outline is darker. That is an accuracy fix, not the
legibility fix I originally claimed, and the distinction matters because the thing I set out
to fix did not need fixing.

### Verified (fourth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; `check_keyless_map` clean; `npm run verify:gate` **exit 0**; mirror
byte-identical. Hawk and eider checked zoomed at 4x and in the wide scene; trunks and roofs in
full-scene renders.

### Still open

- The hawk's tail bands are the highest-contrast thing left on that sprite; defensible, since
  the banded tail is the field mark the silhouette clue names, but it is what I would look at
  next.
- Forest back-row trunks (the four thin ones at z=1) are still plain rects. Left deliberately:
  they are distant and small, and barking them would add noise behind the canopies.
- Nothing else on my list. The five habitats have each been rendered and read at scene scale
  after every change in these four passes.
### Fifth pass — a sprite sweep, plus the conditions I had never looked at

Having worked from a list for three passes, this one started by **zooming every species
sprite** in the day/desktop states rather than by picking from notes, and by rendering the two
lighting conditions and the mobile viewport I had never once looked at.

**Great blue heron: the owl eye.** The `heron-strike` pose appeared to have one enormous eye
with an iris ring. It does not, and this is worth recording because the cause was not where it
looked. The eye is a 0.65-unit dot and is correct. The ring was the **head circle's own
outline**: an outlined blob at the end of a neck of the same colour reads as an eye, because
the outline is the only thing separating head from neck, and the real eye was lost inside it.
Flattening the head to an ellipse helped a little; removing the stroke entirely fixed it. Head
and neck are now one continuous shape whose only dark point is the eye, which is what makes an
eye read.

**Cooper's hawk tail.** Softened the band contrast and lightened the tail tone, as flagged.
The bands were the highest-contrast thing on the sprite and pulled the eye off the silhouette.
They are still clearly legible, because that banded tail is the field mark the Target Search
silhouette clue names.

**Dawn and dusk: checked, no change needed.** My new pale-winged hawk, the lobed canopies and
the barked trunks all hold up under the dusk grade, and the Cooper's hawk actually reads
*better* at dusk than in daylight because a pale bird separates cleanly from a darkened sky.
The grade releasing before the actor band, which a previous session built, is doing its job.

**Mobile: looked at, and I cannot conclude from it.** The wide-sweep mobile render puts the
whole 900-unit scene into roughly 310px and the birds are a few pixels each. But the QA
harness renders with `sceneViewportWidth === 0`, which the tool treats as "unmeasured" and
keeps on the wide sweep — so the lens auto-focus that a real phone would trigger never fires
here. **This harness cannot tell me what a phone shows.** Saying so rather than reporting the
screenshot as a mobile result.

### Sprites reviewed and left alone

Bald eagle, blue jay, cardinal, pileated woodpecker, junco, chickadee at the feeder, mallard,
puffin, eider. All read correctly at drawing size. The eagle's talons sit slightly beside the
snag rather than gripping it and the blue jay's eye slash gives it a permanent scowl; both are
stylistic rather than wrong, and I left them.

### Verified (fifth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; `npm run verify:gate` **exit 0**; mirror byte-identical. Heron confirmed
zoomed at 4x before and after; dusk, dawn and mobile rendered and read.

### Still open

- **Mobile needs a real device or a Playwright mount with a measured viewport.** Everything I
  have said about this tool's mobile rendering across five passes comes from a harness that
  deliberately stays on the wide sweep. Per the memory note from a previous session, the way
  to do it is mounting the real tool in Playwright with React UMD, not `renderToStaticMarkup`.
- Forest back-row trunks (four thin distant rects) still plain, deliberately.
### Sixth pass — mobile, properly, and a real bug it found

Five passes of caveats about mobile being unverified, so this one closed it. Mounted the REAL
tool in Playwright at 390x844 through the repo's existing `GlHarness` (the same helper
`tests/e2e/32-birdlab-diagram-keyboard.spec.ts` uses) instead of the static-markup QA harness.

**A near-miss first, worth recording.** My first run said the scene rendered **540px wide
inside a 390px viewport** — the exact `300 x 1.8` overflow number from a defect a previous
session had already fixed. It looked like a regression. It was not. `GlHarness` gives `#wrap`
`display:flex`, which makes the tool root a flex ITEM with the default `min-width:auto`, so it
refuses to shrink below its content; `maxWidth:100%` on the scene card is then useless because
its ancestors have already grown to 540. The **real** host does not do that: `StemLab.renderTool`
wraps every tool in a plain block div (`stem_lab_module.js:1560`). I traced the ancestor chain
before believing the number, restored the host's box model in the spec, and the overflow
vanished. Reporting that as a phone bug would have been the seal mistake again.

**Then the real bug, which nothing else could see.** With the box model right, the auto-focus
works as designed: the lens narrows to a 450-unit sector and birds go from ~7px to 44-52px.
But the focused lens is **450x500 (aspect 0.9)** and the card kept the habitat's **1.8**
aspect, with the SVG painting `preserveAspectRatio="xMidYMid slice"`. Cover-scaling therefore
threw away **half the scene height, centred**.

Measured on the real mount: card occupied y 103..403, and the one bird the tool marked
`presence="visible"` — the forest towhee, its findable I-Spy target — sat at **y=406, three
pixels below the card**. Entirely clipped. A vireo was cut too. The auto-focus made the birds
big enough to identify and then hid them, and because the crop is applied automatically rather
than chosen, a student on a phone had no way to know anything was missing.

**Fix:** when the stage is small and the lens has auto-focused, the card takes the **lens's**
aspect instead of the habitat's, so `slice` has nothing left to crop. Desktop is untouched —
the stage is never small there, so a deliberately chosen focused lens keeps its cinematic crop.

Measured before and after on the same mount:

| | card | towhee (`presence=visible`) |
|---|---|---|
| before | 390 x 300 | **0% on screen** |
| after | 390 x 433 | **100% on screen** |

**New regression test:** `tests/e2e/33-birdlab-ispy-mobile.spec.ts`, three cases — the scene
fits the phone column with no sideways scroll, the lens narrows itself on a small stage, and
every bird the tool marks findable is actually **on screen**, not merely large. That last
assertion is the one that would have caught this: `getBoundingClientRect` still returns a box
for SVG content clipped out of view, so "has a rect" is not "is visible", and a size-only
check passes happily while the bird is off the card.

### Verified (sixth pass)

`tests/e2e/33-birdlab-ispy-mobile.spec.ts` **3/3**; `node dev-tools/birdlab_visual_qa.mjs`
**83 core / 402 exhaustive, exit 0** (unchanged — the QA harness renders with
`sceneViewportWidth === 0`, so it never takes the small-stage path and the desktop baseline
cannot move); the four BirdLab test files **47/47**; mirror byte-identical; the real phone
composition screenshotted and read.

**One gate note.** `npm run verify:gate` came back exit 1 once, on
`PARSE FAIL stem_tool_fisherlab.js: Unterminated string constant (2421:97)`. That is another
session's file, `node --check` parses it fine, and a re-run was **exit 0** — a concurrent
session was mid-write when acorn read it. Not mine, and not a real break. Also note the gate
script itself grew five new scans while I was working (`scan_silent_announcer`,
`scan_mouse_only_controls`, `scan_fn_in_tool_state`, `scan_window_key_listeners`,
`scan_answer_position_bias`); I ran all five against BirdLab individually — clean, zero
findings in this tool.

### Still open

- The mobile fix makes the card taller (390x433) on a phone. That is right for portrait and
  shows the whole sector, but it does push the panels below it further down; worth a look on a
  real device.
- Forest back-row trunks still plain, deliberately.
### Seventh pass — the Silhouette Quiz, i.e. the rest of the tool

The live mount opened up the other **123 views** of this tool, none of which I had ever
looked at. Screenshotting the illustration-heavy ones found the worst remaining art in
BirdLab, and it was not in a habitat scene.

**The Silhouette Quiz was drawing ellipses and rectangles.** This is a sub-tool whose entire
content is silhouettes and whose own description calls it "the skill experienced birders use
for distant flying birds". What it actually drew:

- `buteo` (Red-tailed Hawk) — a plain `<ellipse>`, `rx 110 ry 20`
- `loon` — another plain `<ellipse>`
- `crow` — a plain `<rect>`, 140x16
- `raven` — a flat six-point bar
- `eagle` — wings, plus a literal 10x25 rectangle for the body, which reads as a bird impaled
  on a post
- `duck` — an ellipse with a wedge stuck on the side

So several species were not merely crude, they were **mutually indistinguishable**: a quiz
that shows a horizontal blob and asks which of four birds it is cannot be answered from the
picture. That is the same defect class I fixed in the habitat scene in the first pass, where
raven, Cooper's hawk and herring gull shared one outline — except here it is the whole point
of the exercise.

**Rebuilt as a generator plus a table**, the approach that worked for the soaring sprites: one
`renderSilhouetteParts`, one row of numbers per species, the left wing authored once and
mirrored (via a generalised `birdlabMirrorPathX(d, axis)`, which the scene sprites' mirror now
also calls). Nineteen shapes, each differing in the things that actually separate species in
the air: span and chord, how pointed or fingered the tip is, dihedral, tail shape
(square / wedge / fork / fan / long), head and neck projection, and trailing legs.

Specific marks now carried: the osprey's M-kink at the wrist; the turkey vulture's dihedral V;
the accipiter's short wings against a very long tail; the falcon's swept sickle; the tern's
deep fork against the gull's square tail; **crow square vs raven wedge**, which is the classic
pair and was previously a rectangle against a bar; the heron's folded neck with legs trailing
past the tail; the loon's drooping neck and trailing feet; the kingfisher's outsized head and
dagger bill.

Body and tail are one tapered outline, not two stacked shapes, and the wings are drawn behind
the body — both lessons carried directly from the Cooper's hawk earlier in this session.

### A third harness artifact, caught before reporting

The quiz screenshot also showed the heading, the instructions and the habitat clue as dark
text on the dark navy shell — a glaring contrast failure. It is not real. That contrast fix is
injected by a `React.useEffect` inside `StemLabModal` (`stem_lab_module.js:1716`), the host
component; my harness calls `StemLab.renderTool()` directly and never mounts it. The real app
has the stylesheet.

That is now **three** times in this session that something that looked like a bug was an
artifact of how I was looking at it — the seal I mistook for the eider, the 540px overflow
from the harness's flex `#wrap`, and this. All three were caught by checking the mechanism
before writing it down; the pattern is worth more than any of the individual saves.

### Verified (seventh pass)

Silhouettes reviewed as a 20-up contact sheet built by stepping the real quiz, before and
after. `node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four
BirdLab test files **47/47**; both BirdLab e2e specs **7/7**; `check_keyless_map` clean (the
generator's parts are keyed); mirror byte-identical. Scratch capture specs removed; only the
mobile regression spec from the previous pass remains in `tests/e2e/`.

### Gate: red, and NOT mine

`npm run verify:gate` exits 1 at `check_render_refs`:

```
❌ word_sounds_module.js
   line 11357: setBlendingProgress  [dropped useState setter (render crash)]
```

`word_sounds_module.js` is **clean against HEAD** and untouched by me. HEAD advanced during
this session, and commit `f6262f166 "Dead state sweep: recallBank, blendingProgress,
preloadProgress"` removed the `blendingProgress` state while leaving `setBlendingProgress(0)`
called at `:11357` with no declaration anywhere in the file. That is a real render crash in
Word Sounds, committed, and it will take out that tool at runtime — worth someone's attention,
but per RULES section 4 I have not fixed it and have not bypassed it.
`node dev-tools/check_render_refs.cjs` reports **0 findings in BirdLab**.

Earlier in the session the same gate also went red once on
`PARSE FAIL stem_tool_fisherlab.js` and passed on re-run — that one was a concurrent session
mid-write, a different thing from this.
### Eighth pass — the Beak & Feet bill shapes

Reviewed the other nine views I had captured but not yet looked at. The foot illustrations in
**Beak & Feet Lab** are good — perching, raptor talons, zygodactyl, webbed, wading and
shorebird are all clearly drawn and distinguishable. The **bills next to them were not.**

Each of the eight bills was drawn **floating alone** in a 35x20 box at only 2-6 units tall,
which paints a 3-10px sliver at the rendered 60x32. The result was eight near-identical
horizontal dashes under a heading that reads "8 bill shapes — click to learn what each one
eats". You could not tell a cone from a hook from a chisel, which is the entire lesson, and
the summary underneath ("Bill shape → diet. Cone = seeds. Hook = meat. Spear = fish...")
depends on being able to.

**Fix: draw each bill on a head.** A bill has no readable shape without a head to give it
scale and somewhere to attach, which is why every field guide draws it that way. Shared
neutral-grey head with an eye, so the bill carries the colour and is the only thing that
changes between the eight. Each bill was then redrawn to its actual proportion rather than a
generic sliver:

| | what now reads |
|---|---|
| cone | short and DEEP — depth is the seed-cracker's whole point |
| hook | tip curls down past the jaw line |
| spear | long straight dagger |
| tube | longest and finest, slightly decurved |
| chisel | stout with a BLUNT end, no taper |
| filter | broad flat spatula with a rounded nail |
| parrot | deep triangular wedge, deeper than it is long, with the colour band |
| thin probe | short and fine — the deliberate contrast against the long tube |

Checked at 4x: all eight now match their labels and are mutually distinguishable, which is the
requirement the panel sets for itself.

### Verified (eighth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both BirdLab e2e specs **7/7**; `check_keyless_map` clean; mirror
byte-identical. Bill row reviewed both at rendered size and cropped at 4x. Scratch capture
spec removed.

### The clear next target

**`flightPatterns` ("Flight Patterns + Wing Shape") has no illustrations at all.** It is a
view entirely about shape and motion — soaring, direct powered, bounding/undulating,
hovering — taught in prose, and its own text describes pictures that are not there: "Note wing
posture — V = vulture, flat = eagle", "Distinctive wave-pattern flight path", "Look for wing
dihedral (V-shape)". That is the same class as the vireo's missing reeds: the copy promises
something the art does not supply. It wants a small flight-path trace per pattern (a wave for
bounding, a straight line for direct, a spiral for soaring, a fixed point for hovering) plus a
head-on wing-posture pair for the V-versus-flat distinction. I have not built it — it is a new
illustration set rather than a repair, and I would rather hand it over described than half
done.

Also still open: the gate remains red on the committed `word_sounds_module.js:11357` render
crash reported in the previous pass, which is not mine.
---

## Word Sounds render crash — investigated and fixed (Aaron asked directly; outside W5's lane)

Aaron asked me to take this over after the owning session stopped. `word_sounds_module.js` is
not in W5's ownership list, so recording that clearly.

### Found — a guaranteed crash, not a lint nit

`word_sounds_module.js:11357` called `setBlendingProgress(0)`. Evidence it is undeclared,
not merely unusual:

- `grep "blendingProgress"` over the whole file returns **exactly one line** — the call. A
  `const [blendingProgress, setBlendingProgress] = useState(...)` would show the identifier in
  its destructuring; there is none.
- Control: `setSoundChips`, the setter on the very next line, returns **10** occurrences
  (declaration plus call sites). Same grep, so the method is sound.
- No dynamic setter creation anywhere in the file (no `window['set'+…]`, no `setters[…]`, no
  `eval`).
- `git log` on the file: commit `f6262f166 "Dead state sweep: recallBank, blendingProgress,
  preloadProgress"` removed the state. `setRecallBank(` and `setPreloadProgress(` have **zero**
  call sites, so those two were swept cleanly — `blendingProgress` was the one left half-done.

**Severity is higher than "a render crash somewhere".** The call sits inside `startActivity`,
the `React.useCallback` that begins *every* activity, invoked from eight sites including the
mount and activity-change effects (`:11628`, `:11642`, `:11687`, `:11729`, `:11758`) and the
answer handlers (`:12857`, `:12876`, `:12972`). Starting any Word Sounds activity would throw
`ReferenceError: setBlendingProgress is not defined`.

**Why no test caught it.** I ran the whole `word_sounds` suite: the runtime/golden/view-identity
files pass because they are structural and never execute `startActivity`'s body. This is
exactly the class `dev-tools/check_render_refs.cjs` exists to catch statically, and it did.

### Changed

Deleted the orphaned line. `word_sounds_module.js` has **no `_source.jsx` pair**, so per RULES
section 2 it is itself the source and is edited directly; mirrored to
`desktop/web-app/public/word_sounds_module.js` (`cmp` identical).

Behaviourally this is a no-op beyond removing the throw: nothing reads `blendingProgress`
anywhere, so setting it was already dead. `grep` now returns 0 occurrences — the sweep the
commit intended is complete.

### Verified

- `node --check word_sounds_module.js` clean; mirror byte-identical.
- `node dev-tools/check_render_refs.cjs` → **exit 0**, and 0 mentions of word_sounds (was the
  single blocking finding).
- Full `word_sounds` suite: **459 passed, 4 failed / 46 files**. All four failures are other
  sessions' files and cannot be caused by deleting a line in this module:
  - 2x "mirrors are byte-identical" — that test checks **five** mirrors, and the one that
    differs is **`ui_strings.js`**, W1's lock-protected file, mid-wave. The other four,
    including `word_sounds_module.js`, are identical.
  - 2x `word_sounds_live_progress` — expects a `wsProgress: 1` validator region in
    `AlloFlowANTI.txt` and extracts `''`.

### Gate

`check_render_refs` is green. `npm run verify:gate` still exits 1, but now on a **different**
check and a different session's file: new hardcoded user-facing strings in
`educator_evaluation_source.jsx` (488 → 495, +7), which is ` M` in the working tree and not in
my ownership. Reported, not fixed, not bypassed.
### Ninth pass — flight-path diagrams, a size scale, and the finding underneath both

**`flightPatterns` now has diagrams.** Ten patterns, ten traces, drawn to a common baseline so
they can be compared: soaring as circles rising inside a thermal column with the V-versus-flat
posture pair the text names; direct as a straight line with even beat ticks; bounding as a wave
dipping below a dashed reference with folded wings at each trough; hovering as a true crossed
figure-8 over a fixed point; gliding as a long shallow descent with no beats; diving as a steep
plunge to a splash with wings folded; erratic as a jagged zigzag; heavy plowing as dense beats
low over water; aerial insect-catching as a winding path past insects; slow flapping as three
deep, widely spaced beats. Each is `aria-hidden` and every claim it makes is also in the prose
beside it, so nothing is lost to a screen reader.

Three defects found by looking at them on the right background and fixed: the two soaring
labels collided into "V = vultureflat = eagle"; the hovering figure was two facing arcs around
a dot, which read unmistakably as an **eye**; and the "few, deep beats" caption sat across the
flight line. Worth noting how the first two were caught — the harness has **no Tailwind**, so
every `bg-white` card renders dark and I could not judge stroke colour against it. I rebuilt
the traces onto a white sheet, which is where the collisions showed.

**`dichotomous` — the size question now shows sizes.** The very first question of the key asks
"Roughly what size is the bird?" and answered it with five lines of text. "Robin-sized" and
"crow-sized" only help someone who already knows those birds, which is not who opens a
dichotomous key. Each option now carries a perched-bird glyph drawn to scale from its band's
body length, on a fixed baseline so only the bird changes size.

### The finding underneath all of this

Three passes have now turned up the same thing in four different views, and it is worth stating
as one defect rather than four:

> **BirdLab teaches visual identification almost entirely in prose.**

- Silhouette Quiz — ellipses and rectangles for a quiz that is nothing but shape (fixed)
- Beak & Feet — eight bill shapes as 3px slivers (fixed)
- Flight Patterns — no illustrations at all (fixed)
- Dichotomous Key — a size question with no sizes (fixed)
- **Common Confusing Pairs — ten look-alike pairs, described only in words (NOT fixed)**

That last one is the largest remaining instance and the most visual content in the tool by
definition: "these two birds look alike, here is how to tell them apart", with no pictures.
Its own text names exactly the marks I now have vocabulary for — "Sharp-shinned has square tail
tip, Cooper's rounded", "Hermit has rusty-red tail", "Goshawk plain gray with white eyebrow".
Ten pairs is twenty illustrations, so it is a real piece of work rather than a repair, and I
have left it described rather than half-built.

### Verified (ninth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7**; `check_keyless_map` clean; mirror byte-identical.
Traces reviewed twice on a white card background, before and after the three fixes; size glyphs
reviewed in the live view. All scratch capture specs removed — `tests/e2e/` holds only the two
real BirdLab specs.

### Prioritised list of what is still open

1. **Common Confusing Pairs** — 10 pairs, no art. Largest instance of the class above.
2. **The remaining ~110 unreviewed views.** I have now looked at 22 of 123. Of the six
   illustration-bearing ones examined closely, **five had real defects**. That rate has not
   dropped as I have gone.
3. `word_sounds` suite: 2 failures from a missing `wsProgress` validator region in
   `AlloFlowANTI.txt` (not mine, still open).
4. `npm run verify:gate` red for every lane on the i18n staleness ratchet (23,054 vs 22,930).
5. The taller mobile scene card pushes panels down — wants a real device.
### Tenth pass — Common Confusing Pairs, the last big instance

The largest remaining case of "teaches visual ID in prose", and the one I had left described
rather than built. Now built: **nine comparison plates**, one per pair.

The design decision that made twenty illustrations tractable: a learner comparing two
look-alike birds does not need two portraits, they need **the difference**. Each plate shows
the single decisive mark the entry's own text already names, side by side at one scale:

| pair | mark shown |
|---|---|
| Downy vs Hairy Woodpecker | bill length against a dashed head-width bracket, so "shorter / longer than head" is measurable rather than a phrase |
| Cooper's vs Sharp-shinned | square vs rounded tail tip |
| Greater vs Lesser Yellowlegs | bill length, and the slight upturn |
| White-throated vs White-crowned Sparrow | yellow lores + white throat vs neither |
| Magnolia vs Yellow Warbler | black mask vs plain face |
| Hermit vs Swainson's Thrush | rusty tail against a brown body vs uniform brown |
| Red-shouldered vs Red-tailed Hawk | boldly barred vs plain brick-red tail |
| Common vs Hooded Merganser | raised white hood vs green head |
| Sharp-shinned / Cooper's / Goshawk | three birds at true relative size |

Built from four primitives (`cmpHead`, `cmpTail`, `cmpSizeBird`, and the plate router
`confusePlate`), so the plates share one visual language with the silhouettes, flight traces
and size glyphs added earlier.

**One pair deliberately has no plate.** Black-capped vs Carolina Chickadee separates in Maine
on **range**, not on a mark — the entry's own text says "In Maine: only Black-capped present".
Drawing a plate for a feature that does not reliably separate them would manufacture a
confidence the field does not support, so that entry keeps its text and the code says why.
That is the one place in this whole run where the right answer was to draw nothing.

Caught in review, on a white sheet: the merganser's crest rendered as a thin wisp under a
caption reading "big raised white hood" — a diagram contradicting its own label, which is the
exact defect this pass exists to remove. Redrawn as a fan about as large as the head, behind
the head circle so it reads as raised.

### Verified (tenth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7**; `check_keyless_map` clean; `check_render_refs`
exit 0; mirror byte-identical. All nine plates reviewed twice on a white card background,
before and after the crest fix. Scratch capture spec removed; `tests/e2e/` holds only the two
real BirdLab specs.

### Where the class stands now

All five instances found are closed:

- Silhouette Quiz — ellipses and rectangles → 19 species-true silhouettes
- Beak & Feet — 3px bill slivers → eight bills drawn on heads
- Flight Patterns — no art at all → ten flight-path traces
- Dichotomous Key — a size question in words → to-scale size glyphs
- **Common Confusing Pairs — ten prose entries → nine comparison plates**

### Still open

1. **~110 unreviewed views.** 22 of 123 seen. Of the seven illustration-bearing ones examined
   closely, six had real defects. The rate has not dropped.
2. `word_sounds`: 2 failures from a missing `wsProgress` validator region in `AlloFlowANTI.txt`.
3. `npm run verify:gate` red for every lane on the i18n staleness ratchet (23,054 vs 22,930).
4. The taller mobile scene card pushes panels down — wants a real device.
### Eleventh pass — stopped sampling, measured instead

Six of the seven illustration-bearing views I had opened by hand were broken, but eyeballing
the other hundred is the wrong tool. So I built a detector for the defect class rather than
hunting more instances of it.

**The audit.** Mount every one of the 123 views in the live harness and, for each, count how
much of its text makes a **visual claim** (`shape`, `silhouette`, `posture`, `look for`,
`note the`, `barred`, `crest`, `wingbar`, `field mark`, ~40 terms) against how much
illustration it actually renders — where "illustration" means an `<svg>` with at least three
drawing elements, so a lone icon glyph does not count as art.

The headline number:

> **123 views measured. 24 have any art at all.**

And the ranked worklist, claims per thousand words with zero illustrations:

| view | claims | words | claims/1k |
|---|---|---|---|
| **shapediff** | 32 | 309 | **104** |
| plumage | 9 | 107 | 84 |
| colorId | 24 | 300 | 80 |
| drawing | 18 | 257 | 70 |
| agesex | 23 | 385 | 60 |
| footTypes | 7 | 117 | 60 |
| irruptions | 14 | 343 | 41 |
| glossaryDeep | 49 | 1309 | 37 |
| behaviorGloss | 11 | 299 | 37 |
| wingTypes | 7 | 268 | 26 |

That is a measured worklist instead of my impression, and it survives me: anyone can re-run it.

**Fixed the top entry.** `shapediff` — "Bird Shape + Size Quick Reference" — is the single most
diagram-shaped content in the tool: eight morphological features, every one of them a shape,
all in prose. It now carries **eight glyph strips**, one labelled mini-diagram per named
variant: bill length short/medium/long; bill shape cone/needle/hook/spear/spoon/pelican-like;
wing shape long-pointed/short-rounded/broad-slotted/aquatic-stiff; tail length; tail shape
forked/notched/square/pointed/round; body size across five bands at true relative scale; leg
length; body shape round/slim/compact. Built on the primitives added earlier in this run, so
the quick reference now matches the art it is a reference for.

Caught on the white sheet and fixed: `needle` and `spear` were both thin lines and `spoon` and
`pelican-like` were both rounded blobs — four variants collapsing into two pairs, which defeats
a reference strip. Needle is now short and hair-fine against a long heavy spear, and
pelican-like carries the throat pouch that is its actual mark.

**Note on `footTypes`.** It appears on the worklist with zero art, yet the foot illustrations I
praised in an earlier pass are real — they live in `beakFeet`. So `footTypes` is a *second*
view covering the same ground in words while a good drawn version already exists elsewhere in
the tool. Worth reconciling rather than re-drawing.

### Verified (eleventh pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7**; `check_keyless_map` clean; mirror byte-identical.
Strips reviewed twice on a white background, before and after the bill differentiation. All
four scratch specs removed — `tests/e2e/` holds only the two real BirdLab specs.

### Still open, in priority order

1. **The worklist above.** `plumage`, `colorId`, `drawing`, `agesex` are the next four, and
   `agesex` (ageing and sexing birds) is arguably the highest-value of them because plumage
   difference is the whole subject.
2. `footTypes` duplicates `beakFeet`'s drawn content in prose — reconcile, do not redraw.
3. `word_sounds`: 2 failures from a missing `wsProgress` validator region in `AlloFlowANTI.txt`.
4. `npm run verify:gate` red for every lane on the i18n staleness ratchet (23,054 vs 22,930).
5. The taller mobile scene card pushes panels down — wants a real device.

The audit spec itself is removed rather than kept: it prints a worklist rather than asserting
anything, and a test that cannot fail does not belong in the suite. It is reproduced in full in
this report's history if it is wanted as a standing gate.
### Twelfth pass — Aging + Sexing Birds, next off the measured worklist

`agesex` scored 60 claims per thousand words with zero art. It ranks higher than that number
suggests because **plumage difference is its entire subject**: six of its eight topics are
male-versus-female or juvenile-versus-adult comparisons, which is the same plate pattern built
for Confusing Pairs.

Six plates added, using a new `cmpPlumageBird` primitive. The silhouette is held **constant**
across each comparison and only the paint changes, so the eye compares plumage and nothing
else — which is exactly the skill the view is teaching:

- **Aging Songbirds** — first-fall brown-and-tan crown vs adult black-and-white
- **Aging Raptors** — juvenile eagle mottled brown throughout vs adult dark body with white
  head and tail
- **Aging Gulls** — the **four-winter progression** the text calls the hardest ID group, as
  four birds from mottled brown to full adult
- **Sexing Songbirds** — cardinal male bright red vs female buff with a red wash
- **Sexing Raptors** — kestrel male blue-grey wing vs female brown and streaked
- **Sexing Waterfowl** — wood duck male green-headed vs female brown with the white eye-patch

Banding + Marking and Citizen-Reportable Marks keep text only: they are about metal bands and
wing tags, not plumage, so a plumage plate would say nothing.

**Two mistakes of mine, caught before they shipped.** I typed an invalid colour
(`'#a89madeup'`) into the second-winter gull, which would have painted as no fill; found by
scanning every hex literal in the file for malformed values, and fixed. Then on the white sheet
the four gull captions ran together — "browner, cleane**pproaching** adult" — because four
items at that spacing cannot carry phrases; shortened to mottled / cleaner / near-adult /
adult.

### Verified (twelfth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7**; `check_keyless_map` clean; mirror byte-identical.
Plates reviewed on a white background before and after both fixes. Scratch specs removed;
`tests/e2e/` holds only the two real BirdLab specs. I used the 90+ number range for scratch
specs this time, after noticing other sessions had taken 42-48 while I was working.

### Worklist status

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | **done** (8 glyph strips) |
| plumage | 84 | open |
| colorId | 80 | open |
| drawing | 70 | open |
| agesex | 60 | **done** (6 plumage plates) |
| footTypes | 60 | open — but see below |
| irruptions | 41 | open |
| glossaryDeep | 37 | open |
| behaviorGloss | 37 | open |
| wingTypes | 26 | open |

Next two by value rather than by score: **`plumage`** (84, and it will reuse `cmpPlumageBird`
directly) and **`colorId`** (80, colour being the one property the tool has never once drawn).
`footTypes` should be **reconciled with `beakFeet`, not redrawn** — the good foot art already
exists there.

Still open elsewhere, unchanged: the two `word_sounds` failures from a missing `wsProgress`
region in `AlloFlowANTI.txt`; `verify:gate` red for every lane on the i18n staleness ratchet;
and the taller mobile scene card wanting a real-device look.
### Thirteenth pass — Seasonal Plumage, and a bug of my own worth recording

`plumage` ("Seasonal Plumage + Molt") scored 84 claims per thousand words with no art. Its
shape is fourteen species, each with a breeding and a non-breeding description — the two-item
plate again.

**The honest design decision.** Only four of the fourteen actually change: goldfinch
(lemon-yellow to olive-buff), loon (black head and checkered back to grey-and-white), snow
bunting (white-and-black to warm buff), and wood duck (breeding to eclipse). The rest say
"same plumage year-round" in their own text. Drawing a fabricated difference for those would
teach the exact opposite of the view's real lesson, which is *which* species change. So the
non-changers get **one** bird and a caption saying so, and two species that vary by sex or
morph rather than season (snowy owl, white-throated sparrow) show that pair instead.

### The bug: String.replace took the first match in a 25,000-line file

My tagging script used `s.replace("{ species: 'Northern Cardinal',", ...)`. A plain-string
`replace` substitutes the **first** occurrence anywhere in the file, and this file has **287**
`species: '` keys across many arrays. Eleven of the fourteen `art:` blocks therefore landed in
the **egg gallery**, sitting next to `dimensions`, `clutch` and `pattern`. Three happened to
land correctly only because their species appeared first in `PLUMAGE_CYCLES`.

The script reported `tagged 14/14` and `node --check` passed, because an unused extra key on
an egg object is valid JavaScript that nothing reads. **Nothing failed.** What caught it was
going back to verify the result rather than the report: a DOM check across all fourteen
species showed eleven rendering zero drawing elements.

I nearly mis-diagnosed it too — the first capture attempt looked like a screenshot race, and I
said so. Re-running as a hard DOM assertion rather than an image gave the same eleven zeroes
every time, which is what turned "flaky harness" into "real defect, and it is mine".

**Repair:** a line-scoped script instead of a global replace — strip any `art:` sharing a line
with `dimensions:`, find the `PLUMAGE_CYCLES` bounds, and insert only between them. Result:
11 stripped from the egg array, 11 inserted correctly, 3 already right. Verified the egg rows
still carry their `dimensions`/`clutch`/`color`/`pattern` (34 intact) and that all fourteen
species now render, 6 to 14 drawing elements each, **zero with too little art**.

### Verified (thirteenth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7**; `check_keyless_map` clean; `check_render_refs`
exit 0; mirror byte-identical. Scratch specs removed.

### Worklist status

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done |
| plumage | 84 | **done** (14 species) |
| colorId | 80 | next |
| drawing | 70 | open |
| agesex | 60 | done |
| footTypes | 60 | reconcile with `beakFeet`, do not redraw |
| irruptions | 41 | open |
| glossaryDeep | 37 | open |

### For Aaron

The `String.replace` trap is worth knowing beyond this file: **any scripted edit keyed on a
name that recurs in a large source file needs a scoped range, not a global first-match**, and
the tell is that it fails silently and reports success. I have written it to memory.
### Fourteenth pass — Birds By Color

`colorId` scored 80 with zero art, and it is the sharpest instance of the whole class: the view
is titled **"Birds By Color — Visual ID"**, is organised entirely by colour, and showed no
colour at all. Seven groups, each a list of species names in prose.

Each group now leads with three representative birds drawn in that group's actual colours,
reusing `cmpPlumageBird` so the swatches are birds rather than paint chips:

- **Red** — cardinal all red, house finch with a red wash on a brown body, scarlet tanager
  scarlet-and-black, which is the point the group's own tip makes about how much of the bird
  is red
- **Yellow** — goldfinch with black cap, all-yellow warbler, yellowthroat's black mask
- **Blue** — bluebird blue-backed with a rust breast, indigo bunting deep blue, blue jay
- **Black + White** — chickadee, downy woodpecker, checkered loon
- **Brown + Streaked** — the hardest group, so it shows the distinction its tip names:
  **streaked** vs **spotted** vs **plain** breast
- **Gray** — junco with white belly, titmouse, raven
- **Iridescent** — mallard green head, grackle purple-bronze, and **the same bird at a bad
  angle looking plain black**, which is exactly what the group's tip warns about

**Design calls I made.** The iridescent group gets a deliberate third panel showing the
failure mode rather than a third species, because "may look black at the wrong angle" is the
whole teaching point and a list of iridescent birds does not convey it. And the brown group
shows a pattern contrast rather than three species, because its own tip says the ID hinges on
breast pattern, not on colour.

**Caught in review.** "Spotted breast" used the head `patch` field, which draws near the eye,
so it rendered identically to "plain brown" — a caption contradicting its own picture, the
same defect this whole pass exists to remove. Added a proper `spots` option that puts round
marks on the breast, distinct from `streaks` lines. The triad now genuinely differs: lines,
dots, nothing.

**On accessibility:** colour is the subject here, so these are decorative (`aria-hidden`) and
every species name and distinction remains in the text beside them. Nobody relying on a screen
reader loses information they had before.

**Method note:** this insert used the line-scoped script from the previous pass, and I verified
where it landed (line 9129, immediately inside `BIRDS_BY_COLOR` at 9127) rather than trusting
the script's count — which is exactly the check that was missing when the plumage edits went
into the egg array.

### Verified (fourteenth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7**; `check_keyless_map` clean; `check_render_refs`
exit 0; mirror byte-identical. Scratch spec removed.

### Worklist status

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done |
| plumage | 84 | done |
| colorId | 80 | **done** |
| drawing | 70 | next |
| agesex | 60 | done |
| footTypes | 60 | reconcile with `beakFeet`, do not redraw |
| irruptions | 41 | open |
| glossaryDeep | 37 | open (49 claims, the largest absolute count) |
| behaviorGloss | 37 | open |
| wingTypes | 26 | open — likely folds into `shapediff`'s wing strip |

Five of the top ten are now closed. `drawing` is next by score, though I would look at
`glossaryDeep` first on absolute volume: 49 claims is the most in the tool, and a glossary of
visual terms is a natural place for small inline diagrams.
### Fifteenth pass — glossaryDeep, and a measured fix to the diagram it points at

`glossaryDeep` carries 49 visual claims, the largest absolute count in the tool. But the right
answer turned out not to be new art.

**The reconciliation call.** About two dozen of its 98 terms are places ON a bird — lore,
malar, auriculars, nape, rump, speculum, coverts. The tool **already draws all of them**, on a
labelled bird, in the Bird Topography Lab. Adding 98 inline diagrams would have created a
second, worse set competing with a good existing one — the same trap I flagged for
`footTypes` duplicating `beakFeet`. So the glossary now carries one cross-link to the
Topography Lab, naming the kind of term it answers. One button, no duplication.

**Then I checked the diagram it points at, and it had a real defect.** The 22 numbered
hotspots are drawn directly on their anatomical points, at radius 12 in a 280x360 viewBox.
Several facial marks are only ~15 units apart, so the badges collided. Measured, not eyeballed:

| pair | overlap |
|---|---|
| Eyeline ↔ Eye ring | **46%** |
| Supercilium ↔ Eyeline | 38% |
| Supercilium ↔ Eye ring | 34% |
| Throat ↔ Malar | 30% |
| Lores ↔ Bill | 13% |

Five overlapping pairs, and the worst three are supercilium, eyeline and eye ring — precisely
the fine facial marks a beginner most needs to tell apart, on 33px targets where a click could
land on the wrong one.

**Fix:** separate the badge from the anchor. Anatomy stays exactly where it is; the numbered
badge moves out to clear space with a leader line back to its real point, plus a small anchor
dot. Five badges offset. Re-measured: **0 overlapping pairs**.

**A measurement mistake of mine, caught immediately.** The first re-measure came back
*worse* — 7 pairs including two at 100%. That was my metric, not the fix: once a leader line
joins badge to anchor, `getBoundingClientRect()` on the `<g>` spans both, which is not what
anyone clicks. Corrected to measure the badge circle specifically (r>=10, distinguishing it
from the r=2.6 anchor dot). The corrected metric is consistent across both versions, since the
original had exactly one circle per hotspot: **5 before, 0 after**.

`tests/e2e/32-birdlab-diagram-keyboard.spec.ts` still passes, so the hotspots remain focusable
and named by their part — the badge moved, the `<g>` role, tabIndex and aria-label did not.

### Verified (fifteenth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **47/47**; both e2e specs **7/7** including the topography keyboard spec;
`check_keyless_map` clean; mirror byte-identical. Diagram inspected before and after. Scratch
specs removed.

### Worklist status

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done |
| plumage | 84 | done |
| colorId | 80 | done |
| drawing | 70 | open — next |
| agesex | 60 | done |
| footTypes | 60 | open: reconcile with `beakFeet` (same call as glossaryDeep) |
| irruptions | 41 | open |
| glossaryDeep | 37 | **done** by cross-link, plus the overlap fix |
| behaviorGloss | 37 | open |
| wingTypes | 26 | open — likely folds into `shapediff`'s wing strip |

Six of the top ten closed. Two of them (`glossaryDeep`, and `footTypes` when it is done) close
by **pointing at existing art rather than drawing more**, which I think is the more valuable
pattern: this tool's problem is not only missing diagrams, it is also good diagrams that
nothing else references.

Still open elsewhere, unchanged: the two `word_sounds` failures from a missing `wsProgress`
region in `AlloFlowANTI.txt`; `verify:gate` red for every lane on the i18n staleness ratchet;
the taller mobile scene card wanting a real device.

### Sixteenth pass — the drawing lesson that had no drawings, and closing footTypes

**`drawing` (70 claims/1k).** Nine text sections teaching field sketching: "capture posture
and proportions first", "after basic shape, add bill, eye, wing pattern, tail shape, feet",
"birds have characteristic postures — woodpecker on a trunk, sandpiper running, hawk soaring,
capture these". Not one drawing anywhere in it. Of everything in the visual-debt list this was
the clearest case: a lesson about drawing, delivered entirely in prose.

Four pieces added, one per topic that describes a shape:

- **Build strip (Quick sketches).** Four cumulative panels: two construction ovals -> join
  plus posture axis -> bill, eye, tail, legs -> wing and marks. Panel 4 is literally panels
  1-3 plus more, so the strip reads as one drawing growing rather than four pictures.
- **Detail-order plate (Adding details).** The finished sketch with five numbered callouts in
  the exact order the prose lists, badges offset with leader lines.
- **Posture plate (Drawing posture + behavior).** The three postures the text names by name,
  each with its body axis drawn as a dashed line, because that angle is the thing being taught.
- **Journal page (Note-taking) and colour notes (Color).** A page with date/place/weather/
  species/behaviour, and separately the contrast between "brown bird" and "bill black, legs
  yellow, breast warm rust" with swatches.

All of it stroke-only in graphite, so it reads as a field sketch a learner could plausibly
match, rather than finished artwork they cannot.

**Two colour collisions caught by looking at the render.** Amber was doing two jobs at once.
In build step 4 the amber posture axis was still drawn while the amber plumage marks came on —
a construction guide and a field mark in the same colour saying different things; the axis is
now dropped at step 4, which is also what happens on paper. On the detail plate the amber
callout leader for "wing pattern" ran collinear into the amber wingbar and read as one long
stroke crossing the bird, and the eye callout's anchor dot vanished into the eyeline; marks
are graphite there now, so amber means "a callout points here" and nothing else.

**A fragility worth keeping.** The colour swatches rendered as nothing, because their size came
from `w-3.5 h-3.5` and the QA harness loads no Tailwind. The harness is not the product, so
that is an artifact — but the swatch IS the entire lesson on that card, and a utility class
failing to resolve would delete it silently. Size is inline now. Same reasoning fixed the
detail list double-numbering ("1. 1 Bill"): the `<ol>` marker is killed inline rather than
relying on a preflight reset.

**Three postures redrawn after the first render.** The soaring hawk read as a paper aeroplane
(straight wings on a narrow body), the sandpiper's two parallel leg lines merged into a single
pedestal, and the woodpecker's "stiff tail" was a thin tick rather than the third leg of a
tripod. Second versions: swept wings with finger slots and a fanned tail, bent splayed legs
with toes, and a tail wedge propped against the bark.

**`footTypes` (60 claims/1k) — closed the way `glossaryDeep` was.** The Beak & Feet Lab already
draws feet, so this view points at them instead of growing a duplicate set. But the drawn set
did not actually cover the prose:

- Six feet were drawn against eight described. **Lobed** (coot, grebe, phalarope) and
  **gamebird walking** (turkey, grouse) are now drawn, in the existing 40x40 style.
- Lobed could **not** be pointed at the existing "Shorebird (small webbing)" entry. Separate
  lobes on each toe and a small web between toes are different feet on different birds; that
  link would have taught something false.
- The header said **"6 foot types"** in a hardcoded string. It now counts the array, so it
  cannot drift again. The intro paragraph's "eight bill shapes and six foot patterns" lost its
  numbers for the same reason.
- The new gamebird foot came out at **1.20:1** against its panel where the amber feet sit at
  1.60:1 — washed out beside its siblings. Repalletted to 2.41:1. Worth noting the amber
  baseline is low too; those feet are carried by their dark stroke, not their fill.

**One thing I did not fix, deliberately.** The prose entry "Grasping foot (large toes)" lists
`birds: Cranes, herons (modified)` but `examples: Osprey`. Those are not the same foot — an
Osprey grips fish with a reversible outer toe and spiny scales, which is not a crane's foot.
I did not draw it, because drawing it means choosing which half of a contradictory entry is
right, and that is a content call on the science rather than a visual one. It is also why the
new cross-link says "these feet are drawn in the Beak & Feet Lab" rather than "every foot
below" — seven of the eight have a correct counterpart, and the button does not claim eight.
**Flagging for whoever owns this content: that entry needs its birds and example reconciled.**

### Verified (sixteenth pass)

`node dev-tools/birdlab_visual_qa.mjs` **83 core / 402 exhaustive, exit 0**; the four BirdLab
test files **45/45**; both e2e specs **7/7**; `check_keyless_map` clean; `check_render_refs`
clean; mirror byte-identical. Every new piece of art inspected in a real browser render, and
the postures re-inspected after redrawing. Scratch spec removed.

**Correction to earlier passes in this report:** I recorded the BirdLab unit total as "47/47".
The four files hold 32 + 7 + 4 + 2 = **45** tests. No tests were lost — the files are unmodified
— the earlier figure was simply a miscount.

### Worklist status

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done |
| plumage | 84 | done |
| colorId | 80 | done |
| drawing | 70 | **done** |
| agesex | 60 | done |
| footTypes | 60 | **done** by cross-link + 2 feet drawn |
| irruptions | 41 | open — next |
| glossaryDeep | 37 | done by cross-link |
| behaviorGloss | 37 | open |
| wingTypes | 26 | open — likely folds into `shapediff`'s wing strip |

Eight of the top ten closed. Three of them closed by pointing at art that already existed —
and in this pass that reconciliation is what exposed the missing feet and the stale "6 foot
types" count. Cross-linking is not just cheaper than redrawing; it is the thing that finds the
gaps, because a link forces you to check that the destination actually delivers.

### Seventeenth pass — researched the contradictory foot, and found the view was never rendering

I said last pass that the "Grasping foot (large toes)" entry needed its birds and example
reconciled, and that I would not guess. Looked it up instead.

**The prose was wrong on both halves, and the fix is not a judgement call.**

- Herons and cranes take prey with the **bill**, not the feet. Their claws are small, blunt and
  straight, and their foot is the wading foot already listed two entries above. "Grasps fish +
  amphibian prey / Cranes, herons" describes no real bird.
- The genuine fish-grasping foot is the **Osprey's**, and it is built quite specifically: a
  reversible outer toe that swings back to give 2 toes forward and 2 back (semi-zygodactyly),
  plus **spicules** — short spiny scales on the toe pads that stop a wet fish sliding free. The
  trait is shared with the Grey-headed and Lesser Fish Eagles and almost nothing else.

Entry rewritten to that, and **now drawn**, showing both marks: the outer toe swung back, and
the spicules. The cross-link could also be strengthened from "these feet are drawn" to "every
foot below is drawn", because with the Osprey added all eight prose feet finally have a correct
counterpart.

**A second correction in the same array.** The Raptor entry claimed "Hawks + owls have
reversible outer toe (zygodactyl) for stronger grip." Owls do; most hawks and falcons do not —
the Osprey is the notable exception among diurnal raptors. Reworded.

**The file already knew.** The Osprey *tracks* entry has read "two toes forward + two back
(zygodactyl when grasping fish)" all along. So the tool was contradicting itself in two places,
and the correct fact was already sitting in it.

**Then the screenshot showed the whole view was broken — and had been.** With the Osprey added
I re-rendered Foot Types and got **nine cards, every heading reading "undefined"**, with
Shape/Birds/Function blank and Examples showing the *Beak & Feet Lab's* text.

Root cause, and it is not mine: the diagram array is declared `var FOOT_TYPES` in the
**component scope, outside `BeakFeetLab`** — so it shadowed the module-level `FOOT_TYPES` prose
array for every view in the component. `FootTypesView` has been mapping over diagram objects
that carry `label`/`lifestyle` and reading `type`/`shape`/`birds`/`function` off them. Confirmed
pre-existing against HEAD, where the same shadowing sits at lines 5540 and 15751 with
`BeakFeetLab` starting later at 15913. Before this pass it rendered **six** undefined headings;
adding three feet made it nine. Renamed to `FOOT_DIAGRAMS`, with the reason recorded at the
declaration. Everything renders now.

**Why nothing caught it.** I have been quoting "83 core / 402 exhaustive states" as
verification for fifteen passes. Those states are **all I-Spy scene states** — the harness
asserts on `data-birdlab-ispy` markers and never renders a text view at all. It is deep
coverage of one view, not broad coverage of the tool, and I should have said so earlier.

**New test, calibrated against the bug.** `tests/birdlab_view_data_binding.test.js` renders
**every** menu view id (read from the source, so new views are covered automatically) and fails
if any renders the literal text "undefined" or comes back nearly empty, plus two guards on the
foot arrays staying separately named and the Osprey correction surviving. I reintroduced the
shadow to check it actually fires: **all 3 tests fail on the bad code**, and the failure output
prints the nine `undefined` headings. A gate that has never failed proves nothing.

**The first-match trap, caught by its own counter.** My scoped recolour script anchored on
`indexOf("id: 'osprey'")` — there are **four** of those in the file, and it landed on a species
record ~12,000 lines earlier. It was a harmless no-op only because that block contained none of
the three colours. The replacement counters printed `0/0/0`, which is why I noticed; the script
now throws when a scoped edit matches nothing, and anchors on a unique translation key instead.

### Verified (seventeenth pass)

`birdlab_visual_qa` **83 core / 402 exhaustive, exit 0** (I-Spy states only — see above); five
BirdLab test files **48/48**; both e2e specs **7/7**; `check_keyless_map` and `check_render_refs`
clean; mirror byte-identical. Foot Types and Beak & Feet re-rendered and inspected after the
fix. Scratch spec removed.

### Recommendation beyond this lane

The shadowing hazard is generic: any `var X` in a STEM tool's component scope silently shadows a
module-level `var X`, and the failure is invisible until someone reads the rendered page. I
scoped my test to BirdLab deliberately, so as not to turn other lanes red on pre-existing
issues, but **a repo-wide check for duplicate `var NAME = [` declarations at different scopes
would be cheap and is likely to find more of these.** Worth a gate with a runner attached.

Sources for the corrections:
- Londei, T. (2020), "The osprey-like reversible outer toe...", *Ibis* 162(3) —
  https://onlinelibrary.wiley.com/doi/10.1111/ibi.12812
- "Behavioral correlates of semi-zygodactyly in Ospreys" —
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6368007/
- Scottish Wildlife Trust, "Flying fishermen: the key features that help ospreys hunt" —
  https://scottishwildlifetrust.org.uk/2021/05/flying-fishermen-the-key-features-that-help-ospreys-hunt/

### Eighteenth pass — irruptions: the concept was a sentence where a chart belongs

`irruptions` listed eight species in prose. The gap here was not only ID art — the **concept the
view is named for** was invisible. "Some winters bring spectacular numbers; other winters very
few" is a chart written as a sentence.

**The irruption chart.** Ten winters at one feeder, three rows: a regular visitor (even bars
every winter), an irruptive one (near-zero, near-zero, then a flood), and underneath the driver
— the northern seed crop marked good or failed, with the failures lining up under the spikes.
That alignment is the mechanism the prose asserts and never shows: when the northern crop
fails, the birds have to come south.

It is labelled **schematic on its face**, in the note and in the alt text. Inventing per-species
counts per winter would be fabricating survey data, and the shape of the pattern is the
teachable part anyway.

**Two corrections, both researched rather than guessed.**

- **Bohemian vs Cedar Waxwing.** The prose offered "gray rump distinguishes them" — a mark both
  birds roughly share, so it separates nothing. The reliable marks are the **undertail coverts**
  (rusty on Bohemian, white on Cedar — the one that holds up at distance), the wing pattern
  (bold white + yellow on Bohemian, plain on Cedar) and the belly (grey vs yellow). Prose
  rewritten, and a side-by-side plate drawn with the undertail called out and labelled on each
  bird.
- **The two crossbills sit one above the other in this list and the prose never separates
  them.** Added the mark that does: White-winged has two bold white wing bars, Red has a plain
  dark wing.

**The crossed bill took three attempts, and the reason is worth recording.** "Unique
crossed-mandible bill for prying open cone scales" is accurate and completely unpicturable, so
it is exactly the kind of claim that needs art.

1. *At head scale* the two mandibles were thin slivers that overlapped into a single grey wedge.
   The cone was also drawn on the wrong side — behind the bird's head, so it was biting nothing.
2. *Zoomed to the bill, as filled wedges*, the pale lower mandible blanketed the dark upper's
   descending tip and the pair read as one hooked bill. Ending both tips at the same x only
   splayed it into a Y.
3. *Working version:* the shared base **ends**, and two short blades leave it at opposing angles
   and cross at roughly x=94. **A crossing needs an angle, not just an overlap** — that was the
   thing I kept missing. Two shafts running parallel and then diverging read as a hook however
   they are coloured or layered.

The second panel shows what the crossing is *for*: opening the bill drives the tips in opposite
directions and levers a cone scale up.

**The waxwing plate needed a redraw too**, for a mistake I have made in this tool before: the
white undertail patch was a free-floating pale oval on the bird's flank and read as a giant eye.
Redrawn as a wedge at the vent where the tail meets the body, with a leader line to a written
label, so it cannot be mistaken for anything else.

### Verified (eighteenth pass)

`birdlab_visual_qa` **83 core / 402 exhaustive, exit 0** (I-Spy states only); five BirdLab test
files **48/48**; both e2e specs **7/7**; `check_keyless_map` and `check_render_refs` clean;
mirror byte-identical. Every diagram inspected in a browser render, and the two that were wrong
re-inspected after each redraw. Scratch spec removed.

### Worklist status

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done |
| plumage | 84 | done |
| colorId | 80 | done |
| drawing | 70 | done |
| agesex | 60 | done |
| footTypes | 60 | done |
| irruptions | 41 | **done** |
| glossaryDeep | 37 | done by cross-link |
| behaviorGloss | 37 | open — next |
| wingTypes | 26 | open — likely folds into `shapediff`'s wing strip |

Nine of the top ten closed. Remaining in this view, deliberately not drawn: Redpoll's red cap,
Siskin's yellow wing flash and Evening Grosbeak's yellow-and-black are all things the words
already convey adequately to someone looking at the bird. The crossed bill and the waxwing pair
were not.

### Nineteenth pass — behaviour glossary, and two terms it could not tell apart

`behaviorGloss` is 25 terms with a one-line definition each and no art. Twelve of those
definitions **are a body shape or an arrangement of birds** — "spread-wing posture", "feigning
injury", "up-and-down tail motion", "one bird watching while others feed" — so those twelve are
now drawn. The abstract ones (philopatry, habituation, niche differentiation, site fidelity)
are not, because a picture of them would be decoration.

**The defect worth leading with.** The glossary defines two different behaviours with the *same
three words*:

- Sun-bathing — "**Spread-wing posture** for vitamin D + parasite control."
- Mantling — "**Spread-wing posture** over prey to hide it from competitors."

Read in the field, that separates nothing. So the view now opens with a three-panel plate
answering it directly: sun-bathing has wings **open and flat** to the sun with nothing
underneath; mantling has wings arched **forward and down** like a tent with prey underneath;
and the distraction display — the third "wings out" posture in the same list — has **one** wing
splayed and dragging while the bird stumbles away from the nest.

**Three glyphs failed on first render and were redrawn.**

- **Mantling** was the worst, and it failed at exactly the point of the diagram: the prey was
  drawn *under* the wing cloak, so it was completely hidden. That is realistic and useless —
  it removed the only thing distinguishing mantling from sun-bathing. The prey now protrudes at
  the front and back, the way a half-covered kill actually looks.
- **Sun-bathing** was drawn in profile, where two spread wings are just small blobs either side
  of the body. Redrawn from **above**: spread wings only read as spread when you can see both.
- **Mobbing** read as a single bird — the mobbers were specks in the corners. The predator is
  smaller and centred now, and the mobbers are gull-wing strokes, which read as birds in flight
  at 12px where a filled body does not.
- **Sentinel** had its feeding birds produced by rotating the shared body 28°, which just looked
  like debris. Drawn explicitly instead: one bird up on a post with its head **up**, two below
  with their bills **in the ground**. That contrast is the definition.

**New guard, calibrated.** The twelve glyphs are attached by a hand-typed lookup of glossary
term strings. A typo there does not throw — the lookup returns undefined and the card silently
loses its drawing, which is precisely the class of no-op nothing else would catch. Added a test
that every key in `BEHAVIOR_GLYPH_FOR` matches a real term, and injected a typo (`Mobbign`) to
confirm it fires. It does, naming the bad key.

### Verified (nineteenth pass)

`birdlab_visual_qa` **83 core / 402 exhaustive, exit 0** (I-Spy states only); five BirdLab test
files **49/49**; both e2e specs **7/7**; `check_keyless_map` and `check_render_refs` clean;
mirror byte-identical. All twelve glyphs inspected in a browser render, and the four that failed
re-inspected after redrawing. Scratch spec removed.

### Worklist status — top ten closed

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done |
| plumage | 84 | done |
| colorId | 80 | done |
| drawing | 70 | done |
| agesex | 60 | done |
| footTypes | 60 | done |
| irruptions | 41 | done |
| glossaryDeep | 37 | done by cross-link |
| behaviorGloss | 37 | **done** |
| wingTypes | 26 | open — folds into `shapediff`'s wing strip; see below |

**`wingTypes` is the last one, and it may not need new art.** `shapediff` already carries a
wing-shape strip (pointed / rounded / slotted / tapered). The right move is almost certainly the
`glossaryDeep` and `footTypes` treatment — check whether that strip actually covers what
`wingTypes` describes, cross-link if it does, and draw only the gap. That check is what found
the missing feet and the stale "6 foot types" count last time.

Beyond the measured worklist, the recurring finding across these passes is worth stating plainly:
**this tool's text and its diagrams were maintained separately, and drifted.** Three separate
content errors surfaced only because I went to draw the thing (cranes-and-herons vs Osprey, the
waxwing "gray rump", the two identical spread-wing definitions), plus one view that had never
rendered at all. Drawing a claim is a good way to discover it is wrong.

### Twentieth pass — wingTypes closed, and a 3D wing viewer

The last item on the measured worklist, and the one place in this tool where a flat silhouette is
genuinely not enough.

**First the cross-link check that closed the last two views — and it found another defect.**
`shapediff` already carries a wing strip with four variants: pointed, rounded, slotted, **stiff**.
But `shapeStripGlyph` has no `stiff` branch. It fell through to the generic tapered fallback, so
the strip labelled a wing **"aquatic stiff"** and then drew the same shape as everything else —
a label promising a distinction the drawing did not make. A puffin/auk wing is short, narrow and
blunt, barely clearing the body, which is exactly why those birds fly the way they do. Drawn now.

**The 3D viewer.** Built on the host's shared `makeBayViewer`, so it inherits WebGL context-loss
recovery, pause-when-unseen, reduced-motion and label chips rather than re-implementing them.
Five wing specs (span, chord, sweep, taper, camber, droop, slots) drive real geometry:

- **Planform and aspect ratio** you can look at rather than read. The ratio shown is computed
  **from the drawn geometry**, so the number and the model cannot disagree.
- **Slotted primaries** as separate upswept finger feathers — a 2D outline can only imply those
  with notches.
- **Droop** — how far the wings fall away from the shoulder, which differs by wing and is
  invisible in a silhouette.

Two presets go straight to those views. `reset()` returns to a fixed home pose, so a preset is
exactly reproducible rather than "wherever you happened to spin to".

**The accessibility contract is the same one the First Response body viewer uses**: every wing is
a button, the camera has buttons as well as arrow keys, and when WebGL is unavailable the panel
says so and points at the cards — *nothing here needs the picture*.

**Four things I got wrong, all caught by rendering it.**

1. **I "fixed" a hazard that was already handled, and broke the tool doing it.** Seeing a `useState`
   and a WebGL ref going into a view dispatched as bare `h(WingTypesView)`, I wrapped it in
   `stableType`. But `WingTypesView` is *already* rebound to a stable wrapper further up, so my
   call set `slot.impl = slot.Type` and it recursed until the stack blew — the whole tool rendered
   nothing. The live test caught it, which is why I wrote it before tuning anything.
2. **`readPixels` reported a phantom zero.** The shared renderer is created without
   `preserveDrawingBuffer`, so the drawing buffer is empty once the frame has been composited. A
   blank buffer was not a blank scene. Switched to Playwright screenshots, which capture what the
   student actually sees.
3. **What I built as "camber" was droop.** The height varied along the SPAN, not across the chord —
   that is dihedral, and captioning it "the curve that makes lift" would have been wrong. Rebuilt
   each span station from chord-wise slats following an aerofoil arc, and split the spec into
   separate `camber` and `droop`.
4. **Then camber turned out not to belong in the 3D at all.** Looking along the span foreshortens
   the wing to almost nothing and the section hides behind the leading edge. Rather than keep
   fighting the camera, camber now gets its own 2D cross-section with the air splitting over and
   under and a lift arrow — and the preset that used to promise camber now shows droop, which a
   front view genuinely does show. The panel title was updated too: it read "camber and slots only
   exist in 3D", which my own change had made false.

Also worth recording: the auto-spin was removed. A continuously turning model keeps sweeping past
the angle the student is trying to look at, and it made every screenshot an arbitrary pose.

**Honest scope note:** the aerofoil drawing exaggerates curvature so it is visible at 250px, and
says so in its caption. The equal-transit-time picture it implies is the standard classroom
account; it is a simplification of how lift actually works, and the caption stays on what differs
between wings (flatter sections trade lift for speed) rather than overclaiming the mechanism.

### Verified (twentieth pass)

`birdlab_visual_qa` **83 core / 402 exhaustive, exit 0** (I-Spy states only); five BirdLab test
files **49/49**; both e2e specs **7/7**; `check_keyless_map` and `check_render_refs` clean; mirror
byte-identical. The 3D viewer was exercised live in Chromium — real WebGL, three wing types and
both presets screenshotted and inspected, console clean. Scratch spec removed.

### Worklist — all ten closed

| view | claims/1k | state |
|---|---|---|
| shapediff | 104 | done (+ `stiff` glyph fixed this pass) |
| plumage | 84 | done |
| colorId | 80 | done |
| drawing | 70 | done |
| agesex | 60 | done |
| footTypes | 60 | done |
| irruptions | 41 | done |
| glossaryDeep | 37 | done by cross-link |
| behaviorGloss | 37 | done |
| wingTypes | 26 | **done — 2D fix + 3D viewer** |

The measured visual-debt list that started this work — 123 views, only 24 with any art — is
closed at the top. Four content errors and one never-rendering view were found along the way,
every one of them because drawing a claim forces you to check it.
