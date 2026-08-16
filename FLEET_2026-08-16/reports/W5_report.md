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
