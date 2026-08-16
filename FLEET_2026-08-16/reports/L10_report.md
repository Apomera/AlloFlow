# Lane 10 — Modes, structure, and naming

Status: in progress. Written incrementally.

---

## C2 — Language Deck practice marks a correct answer wrong

### Found

Aaron's memory was exact, and it pointed straight at the defect. The surface is **not**
`lingua_practice_module.js`. "Language Deck" is the flashcard launcher
(`ui_strings.js:3569 lang_deck`, `ui_strings.js:3694 launch_language`), and its multiple
choice practice mode is `flashcards.practice_mode` / `flashcards.select_match`.

Three code paths independently decide what the correct answer is:

1. **Option generation** — `AlloFlowANTI.txt:18450-18492`. In language mode it takes
   `item.translations[flashcardLang]`, splits on the first `:`, and keeps the part after it.
   That stripped translation becomes the correct option in the shuffled list.
2. **Grading** — `handleQuizOptionClick`, `AlloFlowANTI.txt:43494-43520`. Repeats the same
   derivation inline, then `isCorrect = option === correctAnswer`. This drives the score,
   `playSound('correct')`, the AlloBot 🎉 reaction, and the `flashcardFeedback` headline.
3. **The green highlight** — `view_glossary_source.jsx:988`:
   `const isCorrectAnswer = opt === currentItem.def;`

Path 3 is the bug. It compares the option against `currentItem.def`, the **English
definition**, with no reference to `flashcardMode` or `flashcardLang`. In Standard Deck mode
that happens to be right, which is why the bug is invisible there. In **Language Deck** mode
the options are translations, so `opt === currentItem.def` is never true for any option.

The observed result, which is exactly what Aaron described:

- Student picks the right translation.
- Path 2 grades it correct: score +20, success chime, bot celebrates, headline reads
  "Correct! Great Job!" (`view_glossary_source.jsx:985`).
- Path 3 finds no correct option, so nothing turns green, and the branch at
  `view_glossary_source.jsx:995` paints the option the student picked **red with an ✗**
  (`XCircle`), which is the app's universal "wrong" signal.

Audio said right, the visual verdict said wrong. Both were reading different code.

None of the three documented bug families in my prompt were the cause, and I checked each:

- **Index stored apart from text**: not present here. Options are compared by string value,
  not by index, so a shuffle cannot desynchronize them. `fisherYatesShuffle` runs at
  generation time inside the effect (`AlloFlowANTI.txt:18486-18488`), not at draw time.
- **Grading function held in state**: not present. `handleQuizOptionClick` is a host closure
  passed as a prop, never serialized.
- **A second shadowing question bank**: not present. There is one bank,
  `generatedContent.data`.

I did find a genuine second instance of the "two paths disagree" class while ruling these out,
in a different tool. See the C2b note below.

### Changed

One shared pure function, three call sites, no local derivations left.

- `AlloFlowANTI.txt:2540-2560` — new top-level `FLASHCARD_NO_ANSWER` and
  `flashcardCorrectAnswer(item, mode, lang)`, placed beside `fisherYatesShuffle` and
  exported on `window` the same way. Top level, not component scope, so there is no TDZ
  risk from the effect that runs earlier in the file.
- `AlloFlowANTI.txt:18469-18475` — the option-generation effect now builds both the correct
  option and the distractors through the helper. The local `parseTrans` is gone. Distractors
  are also filtered against the correct option, so the same answer can no longer appear
  twice in one list, and a term with a missing definition can no longer contribute an
  `undefined` option in Standard Deck mode.
- `AlloFlowANTI.txt:43473-43475` — `handleQuizOptionClick` calls the helper instead of
  repeating the colon-splitting inline.
- `AlloFlowANTI.txt:49137-49139` — `flashcardCorrectAnswer` added to the `GlossaryView`
  prop bag, next to `handleQuizOptionClick`.
- `view_glossary_source.jsx:195-199` — reads the prop, falling back to
  `window.flashcardCorrectAnswer`.
- `view_glossary_source.jsx:1005` — the highlight now compares against the shared answer.
- `view_glossary_source.jsx:989` — the verdict headline gained
  `role="status" aria-live="polite" aria-atomic="true"`. Before this the only signal a
  screen reader could reach was a colour change and an icon, and the headline text swapped
  silently. This is the same silent-announcer class already documented in this repo.
- `view_glossary_module.js` and `desktop/web-app/public/view_glossary_module.js` rebuilt via
  `node _build_view_glossary_module.js`.

### Verified

- `npx vitest run tests/flashcard_quiz_answer_single_source.test.js` — 14 passed. New file.
  It lifts `flashcardCorrectAnswer` out of the monolith with `new Function` (source-literal
  extraction; the monolith is too large to import) and checks the behaviour directly: the
  Language Deck answer is the translation and specifically **not** `item.def`, the split
  happens on the first colon only, a translation with no colon survives whole, and a missing
  translation yields the placeholder rather than an empty string. It then replays all three
  paths and asserts they land on the same string, and asserts explicitly that the old rule
  (`opt === item.def`) highlights nothing in the Language Deck. Finally it pins the shape:
  no path may re-derive the answer, and the built and deployed modules must match.
- `npx vitest run tests/view_glossary_dialog_a11y.test.js tests/view_glossary_wcag_a11y.test.js
  tests/glossary_flashcard_heading_a11y.test.js tests/glossary_flashcard_text_a11y.test.js
  tests/glossary_ui_ux_contract.test.js tests/export_flashcards_alert_a11y.test.js` —
  30 passed, no regressions.
- `AlloFlowANTI.txt` parses: babel `transformSync` with `sourceType: 'module'` + the JSX
  plugin, clean.
- `node --check view_glossary_module.js` — clean.
- **Not** verified in a browser. I did not render the flashcard quiz and click through it.
  The logic is covered by the test above, but the visual result (green on the right option,
  red only on a genuinely wrong pick) is unconfirmed by eye.

### For Aaron

- `view_glossary_source.jsx` is not in any lane's ownership list, mine included. I took it
  because the defect is literally the language deck practice path and nobody else claimed
  it. Nothing else in the fleet touches flashcards.
- `FLASHCARD_NO_ANSWER` is the literal string `'Translation unavailable'`, hardcoded in
  English. That is pre-existing behaviour that I centralized rather than fixed; making it a
  `ui_strings.js` key is a small follow-up for Lane 5.

---

## C2b — the same class, second instance, in the listening lab

### Found

While ruling out the "shuffled index" family I found a real, narrower version of the same
defect in `lingua_practice_module.js`, which I do own.

`labItem` resolved the current listening item as `labItems[labIndex] || labItems[0]`, while
`listeningChoices(labItems, labIndex)` clamped the index to `labItems.length - 1`
(`lingua_practice_module.js:1556`). Out of range, the two disagree: the audio and the graded
answer come from item 0, the four options are built around the last item. `chooseLabAnswer`
compares against `labItem.translation`, so the option a student would pick from what they
heard is not the option the grader expects.

The window is one frame. The effect at `lingua_practice_module.js:3351` resets `labIndex` to
0 when it exceeds the list, but effects run after paint, so the mismatched frame renders
first. `labItems` shrinks when the target language changes, when a saved word is removed, or
when a different lesson loads. Narrow, but it is the same single-source-of-truth failure and
it costs three lines to close.

### Changed

- `lingua_practice_module.js:3107-3113` — one resolved `labSafeIndex` now feeds both
  `labItem` and `listeningChoices`.
- `lingua_practice_module.js:3930` — the practice checkpoint records `labSafeIndex` too, so
  a resume cannot be written against an index the list no longer has.

`lingua_practice_module.js` has no `_source.jsx` pair, so it is the source and was edited
directly. Confirmed: `ls lingua*` returns only the module.

### Verified

- `node --check lingua_practice_module.js` — clean.
- `npx vitest run tests/lingua_practice.test.js tests/lingua_listening_evidence.test.js
  tests/lingua_practice_render.test.js tests/lingua_practice_resume.test.js
  tests/lingua_adaptive_practice.test.js` — 142 passed.

---

## C4 — Adventure mode should be conditional

### Found

Both halves of Aaron's concern are real, and the second one is worse than he described.

**Stale resume.** The device keeps exactly one adventure save, at the storage key
`allo_adventure_save`, and it carried no record of which lesson it belonged to. On load,
`AlloFlowANTI.txt:26203` did `if (advSave && advSave.turnCount > 0) setHasSavedAdventure(true)`
with no further test, and `handleResumeAdventure`
(`adventure_handlers_source.jsx:524`) restored whatever was in that slot. So a student who
played an adventure in Monday's lesson opened Wednesday's lesson and was offered "Resume
Adventure" leading straight back into Monday's story. Exactly as described.

**Always visible.** The adventure section in the student panel
(`view_student_save_adventure_source.jsx:199`) was gated only on XP. There was no teacher
control and no content test, so a lesson with nothing adventure-shaped in it still displayed
the panel, its progress bar, and its two calls to action.

Three surfaces read `hasSavedAdventure`: the student panel, the sidebar `AdventurePanel`, and
the full `AdventureView`. All three were reading the unscoped flag.

### Changed

**A lesson identity for the save.** `AlloFlowANTI.txt:6305-6323` adds
`_alloAdventureLessonKey(history, inputText)`, also published on `window` so the handlers
module can use the same function rather than growing a second copy. It anchors on the id of
the latest `analysis` history record, which survives small edits to the source text, and falls
back to a djb2 hash of the trimmed input when no analysis has been run. It uses the same
source selection `handleStartAdventure` uses, so the key describes exactly the text the
adventure was generated from.

- `AlloFlowANTI.txt:15761-15766` — every autosave now stamps `lessonKey` into
  `_adventureConfig`.
- `AlloFlowANTI.txt:9277-9282` — `adventureLessonKeyRef` plus `savedAdventureLessonKey` state.
  The ref exists because the autosave effect is declared around line 15741, well before
  `history` is declared at 18550. Putting `history` in that effect's dependency array would
  evaluate it during render and throw a TDZ `ReferenceError`, which is a documented crash
  class in this repo.
- `AlloFlowANTI.txt:45458-45487` — the single place the key is computed, sitting next to
  `hasSourceOrAnalysis`. The ref is assigned during render rather than in an effect, because
  the autosave effect is declared above this line and an effect here would run after it, so
  it would read a stale key on exactly the render where the lesson changes. An effect keyed on
  `[hasSavedAdventure, adventureLessonKey]` re-reads the record's key from storage, which
  covers every writer of the flag including the project-file load path in
  `misc_handlers_source.jsx` that I do not own.
- `hasSavedAdventureForLesson` replaces the raw flag at all three prop sites
  (`AlloFlowANTI.txt:48326`, `48719`, `50058`). The three views needed no changes.
- `adventure_handlers_source.jsx:535-546` — `handleResumeAdventure` refuses a record whose
  `lessonKey` names a different lesson and says so, rather than relying on the UI alone.

**Back-compatibility, deliberately.** A save with no `lessonKey` predates this change and is
still offered. Refusing it would strand a story a student is part way through, which is a
worse failure than the one being fixed. Both guards require the saved key to be non-empty
before refusing. Saves written from now on always carry a key.

**Conditional visibility.**
- `AlloFlowANTI.txt:6291-6294` and `6329` — new `studentProjectSettings.adventureEnabled`,
  normalized as `source.adventureEnabled !== false` so every existing saved project keeps the
  behaviour it has today.
- `view_project_settings_source.jsx:456-462` — the teacher-facing switch, above the per-choice
  Adventure permissions since it governs the whole feature.
- `AlloFlowANTI.txt:45484-45487` — `isAdventureAvailable` = the teacher left it on, and there
  is either source content to build from or a story already in progress for this lesson.
- `view_student_save_adventure_source.jsx:167,175,293` — the Adventure section is dropped
  entirely when unavailable. The save banner above it is untouched. A missing prop means an
  older host, and the section shows as before.
- `ui_strings.js` — three new keys (listed under "Keys for Lane 5" below).

### Verified

- `npx vitest run tests/adventure_lesson_scope.test.js` — 16 passed. New file. It lifts
  `_alloAdventureLessonKey` out of the monolith and checks the behaviour: the analysis id wins
  over the text, two lessons differing by one word get different keys, whitespace does not
  create a new lesson, and no lesson at all yields an empty key that disables the check rather
  than blocking everything. It then actually renders `StudentSaveAdventurePanel` through
  `react-dom/server` and asserts the Adventure section is absent when unavailable, present
  when available, present for an older host, and that Resume appears only with a save.
- `AlloFlowANTI.txt` parses (babel, `sourceType: 'module'` + JSX).
- `node --check` clean on `adventure_handlers_module.js`,
  `view_student_save_adventure_module.js`, `view_project_settings_module.js`.
- `node dev-tools/check_source_pair_drift.js` — OK for all three duplicated sources. I did not
  need to edit `adventure_source.jsx`, so its twin is untouched.
- `JSON.parse` clean on `ui_strings.js` (it is JSON despite the extension, so `node --check`
  does not apply to it).
- **Not** verified in a browser. I did not open the student panel and watch the section
  disappear, and I did not play an adventure in one lesson and open another.

### For Aaron

- I chose `adventureEnabled` defaulting to **on**. Defaulting it off would have silently
  removed Adventure from every project you have already shared.
- The "lesson has no adventure content" test is `hasSourceOrAnalysis`, which is true for
  essentially any real lesson. On its own it would have been close to a no-op, which is why I
  added the explicit teacher switch. The content test still does useful work: an empty app
  with nothing loaded no longer advertises Adventure.
- `misc_handlers_source.jsx` sets `hasSavedAdventure` when a student loads a project file. I
  did not edit it, because the storage-read effect covers that path.

---

## C4b — Student view panel review

### Found

One real defect, found by trying to render the panel outside the app.

`view_student_save_adventure_source.jsx` resolved every icon as `window.<Name>`, for example
`const History = window.History || noop`. `window.History` is a DOM built-in: the `History`
interface constructor. React treats a bare class as a function component and calls it without
`new`, which throws `TypeError: Class constructor History cannot be invoked without 'new'` and
takes the whole panel down. The Resume Adventure button is the only user of that icon.

In the running app it happens to work, but only because `AlloFlowANTI.txt:11082` does
`Object.assign(window, { ... History ... })` and clobbers the DOM global with the Lucide icon
before any module renders. The panel was depending on a DOM built-in having been overwritten.
Someone had already hit this once: `FolderOpen` alone had an `AlloIcons` fallback bolted on.

### Changed

- `view_student_save_adventure_source.jsx:143-162` — one `icon(name)` helper that reads
  `window.AlloIcons` first and falls back to the bare global, applied to all eleven icons. No
  behaviour change in the app; the panel now also renders standalone, which is what let me
  write the C4 render test at all.

Everything else in the panel is current: it is theme-aware across light, dark and high
contrast, the XP meter carries `role="progressbar"` with correct `aria-valuemin/max/now`, the
live-session state is a `role="status"` region, and the buttons are real `<button>` elements
with labels and focus rings. I found nothing else clearly outdated, and I did not churn it.

### Verified

- Covered by `tests/adventure_lesson_scope.test.js`, which renders the panel with an
  `AlloIcons` fixture and previously failed with the exact `History` crash above.

### For Aaron

The same `window.<Icon>` pattern is likely in other extracted view modules. I only fixed the
one I own. It is invisible in production because the host clobbers those globals, so it is a
latent trap rather than a live bug, but it will bite anyone who tries to test a view module
in isolation.

---

## C7 — Rename "Visual Support"

### Found

Three different things carry a "Visual" name, and only one of them is the image generator.
This matters, because renaming the wrong ones would have made the confusion worse:

1. **The image generator** — `ui_strings.js` key namespace `visuals`, titled "Visual Support".
   Generates AI diagrams and illustrations, offers art styles, and refines or removes text
   inside an image via Nano Banana. **This is the one to rename.**
2. **Visual Organizer** — concept maps, flow charts, Venn diagrams. Structure, not pictures.
   The thing Aaron is trying to disambiguate from. Unchanged.
3. **`visual_support.*` and `fab.visual_supports`** — a completely different feature: an AAC
   board and now/next schedule a teacher pushes to a student (`LiveAacBoardDialog`,
   `AlloFlowANTI.txt:52127`, noun/verb/adjective colour coding, a "NOW" badge). This is
   "visual supports" in the special-education sense. Renaming it would have been wrong.

### Changed

The name is **Lesson Images**.

It says what the tool produces, it covers refining an existing image as well as generating a
new one (which is why "image creation" reads wrong), it matches what the code already calls it
(`visuals`, `includeImage`), and it fits the naming pattern of its siblings, which are all
artifact nouns: Adapted Versions, Writing Scaffolds, Visual Organizers, Smart Glossary.

Most usefully, it takes the word "Visual" off this tool entirely. That is the actual fix for
Aaron's confusion: afterwards there is exactly one "Visual Organizer" and one AAC "Visual
Supports", and those two are not easily mistaken for each other.

Four `ui_strings.js` values changed. No code identifiers touched.

### Keys for Lane 5

| Key | Was | Now |
|-----|-----|-----|
| `ai_guide.tool_visual` | Visual Support | Lesson Images |
| `help.sidebar_visuals_title` | Visual Supports | Lesson Images |
| `help.sidebar_visuals_desc` | AI-generated images and visual aids to support comprehension. Create custom visuals or enhanced image sets for the content. | AI-generated pictures and diagrams for the content. Create a custom image or an enhanced image set, and refine or remove text inside an image. |
| `visuals.title` | Visual Support | Lesson Images |
| tool catalog card `title` (`ui_strings.js:9377`) | Visual Support | Lesson Images |

New keys added by this lane, also needing translation:

| Key | Value |
|-----|-------|
| `toasts.adventure_other_lesson` | That saved adventure belongs to a different lesson, so it was not opened. |
| `project_settings.enable_adventure` | Include Adventure in this assignment |
| `project_settings.enable_adventure_desc` | Off hides the Adventure panel from students. Use this when the lesson has no adventure. |

**Deliberately not changed**, because the phrase is generic UDL prose or a different feature:
`ui_strings.js:9261` `rep_desc` ("...Adapted Text, Visual Supports, Glossaries"), `4626`
`use_emojis` ("Use Emojis for Visual Support"), and the whole `visual_support.*` and
`fab.visual_supports` AAC namespace.

### For Aaron

Hardcoded English fallbacks still saying "Visual Support" live outside `ui_strings.js`, in
files spread across several lanes. I left them rather than editing eight files mid-fleet:

- `guided_mode_config_source.jsx:71` — guided-mode step label. Lane 9's area.
- `view_export_preview_source.jsx:8117` — export checkbox label. Lane 8's area.
- `doc_pipeline_source.jsx:451` — pipeline capability label.
- `view_math_source.jsx:267` — "Open Visual Support", a manipulative launcher.
- `view_info_modal_source.jsx:2539` — info-modal section key.
- `udl_chat_source.jsx:739,765` and `udl_walkthrough_source.jsx:147` — prose passed to the AI
  bridge generator.
- `prompts_library_source.jsx:138` — inside a prompt template.

`help_strings.js` is Lane 5's exclusively; I did not grep it for the old name on the
assumption Lane 5 sweeps it.

---

## C3 — Educator evaluation mode

### Found

**The QR path exists and it works.** It is not a stub. `EvaluationPortalQr`
(`view_project_settings_source.jsx:1-70`) renders an SVG QR of the connected portal URL via
`window.__alloMakeQrSvg`, which is registered unconditionally at module scope in
`AlloFlowANTI.txt:1961`, so it is present before the settings modal can ask for it. The
component polls for up to five seconds and shows an explicit error if the generator is
missing. It refuses to render without a URL, and the call site only passes one when a portal
is actually connected, so the demonstration mode never produces a QR code.

**But it does not do what Aaron thinks it does.** He described it as a path where "a principal
could set it up themselves without district IT provisioning anything." That is not what this
is. The QR code encodes an Apps Script `/exec` deployment that a **district-controlled**
Workspace account must already own and deploy. Scanning it opens the same authenticated
portal; Google sign-in and server-side assignments still decide access. The QR is a
convenience for opening an existing portal on a second device, not a provisioning shortcut.

I think I found the feature he is remembering, and it is a different one:
`apps_script/walkthrough_records/README.md` opens with "principal setup (one time, about three
minutes)" and "Your district does not have to build or run anything." That genuinely is the
low-friction path, and it belongs to **Walkthrough Copilot**, not Educator Evaluation. Its own
README says why it must not be reused here: its access model is deliberately not an
authorization model for confidential personnel records.

**The actual usability gap** was narrower than "is it a prototype": the Settings card asked
for an `/exec` URL and never said where one comes from. Those instructions lived only in
`apps_script/educator_evaluation/README.md`, a repo file a principal will never open. And the
unconnected state was badged "Local preview available", which does not answer "is this ready
to use on real staff?"

Two smaller defects found while reading:

- `view_project_settings_source.jsx:59` rendered `'Preparing QR code?'`. A progress message
  had turned into a question, almost certainly an ellipsis that lost a mojibake round trip.
- `view_project_settings_source.jsx:372` had an em dash in user-facing copy, against the
  editorial rule.

### Changed

- `view_project_settings_source.jsx:290-301` — the badge, the button and the prose now all say
  which of the two things you are about to open. Unconnected reads "Demonstration only, not
  connected", the button reads "Open the demonstration" and is styled amber rather than
  primary indigo, and the description says plainly that anything typed stays in the browser,
  is visible to anyone using the device, is not a personnel record, and that real staff
  information should not be entered.
- `view_project_settings_source.jsx:318-333` — a new "Where does this URL come from?"
  disclosure carrying the four real setup steps, opening with **"This is not a self-serve
  setup."** It names the deployment settings that matter (Execute as the district owner, Who
  has access: users in your domain, never "Anyone"), says AlloFlow stores only the launcher
  address, says sharing the link or QR grants nobody access they do not already have, and
  points at the full checklist in the shipped package.
- `view_project_settings_source.jsx:59` — `'Preparing QR code…'`.
- `view_project_settings_source.jsx:372` — em dash removed.
- `view_project_settings_module.js` rebuilt.

The in-app demonstration workspace already labels itself correctly
(`educator_evaluation_source.jsx:652,663,1560`: "This is a local demonstration. Data stays in
this browser; role switching is not secure access."). I left it alone.

### Verified

- `npx vitest run tests/educator_evaluation_portal_setup.test.js` — 15 passed. New file. Most
  usefully it lifts `normalizeAlloEvaluationPortalUrl` out of the monolith and checks the
  launcher validation behaviourally: it accepts a real `/exec` URL and rejects plain HTTP, a
  `script.google.com.evil.test` lookalike host, `javascript:`, the author-only `/dev`
  deployment, and any URL carrying credentials, a port, a query string, or a fragment. It also
  pins the QR generator's registration, that the QR only ever encodes a connected portal, and
  the demo-versus-ready wording.
- `node --check view_project_settings_module.js` — clean.
- **Not** verified in a browser. I did not open Settings and look at the card, and I did not
  scan the QR code with a phone.

### For Aaron, plainly

The QR path landed and works, but it is **not** a way to run this without district IT. For
Educator Evaluation there is no such path, and the package's own compliance notes are explicit
that there should not be one: it holds personnel records, so the LEA has to approve the
deployment, the scopes, the retention rules, and the evaluator assignments first. The tool is
now usable from the app in the sense you asked for, meaning it is obvious what it is and what
the setup requires, but "a principal sets this up in three minutes" describes Walkthrough
Copilot, not this.

Two further limits the package documents and I did not touch: there is no annual rollover, so
this cannot be described as multi-year cycle management, and browser export, import, and reset
are disabled for every portal role until an audited server-side export exists.

---

## C6 — Video Studio

### Found

> **Correction, added later by the same agent: the conclusion in this section is wrong.**
> `it_coach/it_coach.html` exists and the feature is called Screen Coach / IT Coach. See
> "C6 correction" below and my concession in the closing entries at the end of this report.
> The rest of this section (the panel does not record, Demo Autopilot is original work, the
> nine-cards-on-arrival problem) still holds.

**There is no IT-helper demo to remove.** I looked for one and it is not there.

- The AlloFlow-side panel (`video_studio_module.js`) does not record anything. Its only three
  mentions of `getDisplayMedia` and `MediaRecorder` are comments explaining why. The panel is
  a launcher, a Cinematic Studio hand-off, and a gallery of finished takes.
- All 22 real uses of those APIs are in `video_studio/video_studio.html`, the popup. That
  popup **is** the standalone recorder. It is opened with `window.open` precisely because
  `getDisplayMedia` needs a top-level browsing context.
- The closest thing to a "demo" inside Video Studio is **Demo Autopilot (beta)**
  (`video_studio/video_studio.html:335`, logic from line 11956). That is not a cut-down copy
  of anything. It is a substantial feature in its own right: you describe a goal, Gemini plans
  steps against AlloFlow's own command registry, you approve the plan, then the app drives
  itself through the guarded `runPlan` while the popup records the tab and turns each step into
  a caption cue. Deleting it would destroy real work, and nothing standalone covers it.

So there is one recorder, it is already standalone, and there is no duplicate. I did not
remove anything. If Aaron means something else by "IT helper", I could not find it under that
name, or as helpdesk, tech help, or screen recorder, anywhere in the repo or in `ui_strings.js`.

**The overload complaint is real and measurable.** The popup has 27 top-level `<h2>` cards.
Some structure already exists and is decent: three numbered tabs (`1 · Record`,
`2 · Edit & Captions`, `3 · Export`), a "Start here" workflow chooser, a "Finish checklist",
and an "Editor focus" filter that hides cards by task. The problem was where that filter
landed. Its default, `record` / "Lesson polish", showed **nine** editor cards at once: takes,
timeline, trim, zooms, inserts, audio, captions, chapters, and AI review.

### Changed

A new focus mode rather than a restructure, because a 16,000 line hand-written page is not
somewhere to attempt surgery mid-fleet.

- `video_studio/video_studio.html:4936` — new `basics` group:
  `['takes', 'timeline', 'trim', 'captions']`. That is the whole minimum path: pick a take,
  see it, cut it, caption it.
- `video_studio/video_studio.html:4946,4948` — `EDITOR_FOCUS_DEFAULT` is now `basics`, with
  status copy that names what is shown and points at the Focus control for more.
- `video_studio/video_studio.html:541-543,535` — "Just the basics" is the first and selected
  option; "Lesson polish" stays exactly as it was, one selection away.
- `editorFocusForTemplate` still returns `record` for every workflow template, so choosing a
  workflow from "Start here" still opens the fuller set. Landing simple, expanding on intent.
- Mirrored byte-identically to `desktop/web-app/public/video_studio/video_studio.html`.

Nine cards down to four on arrival, nothing removed, everything one dropdown away.

I did **not** add a new guided path. The page already has a numbered three-step flow, a
"Start here" chooser and a finish checklist; bolting a fourth guidance mechanism onto a page
whose complaint is "too many things" would have made it worse.

### Verified

- `npx vitest run tests/video_studio.test.js` — 211 passed. I updated the existing test
  `starts the editor in lesson-polish focus instead of every tool`, whose intent was "does not
  start with every tool visible", to assert the new, smaller default, and added a test that
  every richer mode is still reachable and that workflow templates still open "Lesson polish".
- The popup's single inline script block parses (`new Function` over the extracted block).
- Both copies of the page are byte-identical (`md5sum`).
- **Not** verified in a browser. I did not open the Studio window and look at the Edit tab.

### Pre-existing failure, not mine

`tests/video_studio_dialog_a11y.test.js` has one failure, "manages top-level and destructive
confirmation focus without browser confirmation", where the Remove button is not found. That
test loads `video_studio_module.js`, which `git status` confirms I have not modified; my only
changes are to `video_studio/video_studio.html` and its mirror, which that test never reads.
Reporting it, not fixing it.

---

## Note: two agents ran this lane

Partway through I found uncommitted L10-shaped work in the tree that I had not done, and then
C3 and C6 sections in this report that I had not written. A second agent was running Lane 10
concurrently in the same working tree. Everything above the C3 heading is mine; the C3 and C6
sections above are theirs. Both sets of edits survived, because we both used Edit rather than
Write.

I have verified the overlap rather than assuming it:

- `view_project_settings_source.jsx` holds both their C3 copy rewrite and my one Adventure
  toggle (`:497`), plus their `isSchoolRole` family-mode fix (`:82, :295`).
- `video_studio/video_studio.html` holds both their `basics` editor-focus default (`:4946,
  :4953`) and my collapsed Screen Coach card (`:494`). `cmp` against the public mirror: byte
  identical. `npx vitest run tests/video_studio.test.js`: 211 passed.
- All of my other changes are intact: `flashcardCorrectAnswer` (7 sites in
  `AlloFlowANTI.txt`, 2 in `view_glossary_source.jsx`), the adventure lesson key (8 sites),
  `labSafeIndex`, and the four "Lesson Images" values.

Two additions to their sections follow.

---

## C3 addendum — the wiring had no test

Their C3 work is accurate and I agree with all of it, including the conclusion that the QR is
a convenience rather than a provisioning shortcut and that the three-minute self-serve path
Aaron remembers is Walkthrough Records rather than this. I confirmed the same independently
before I knew their section existed.

One thing was missing, so I added it rather than restating theirs.

The Principal Evaluation card renders only when the host passes `onOpenPrincipalEvaluation`,
and the connect form only when it passes `onSaveEvaluationPortalUrl`
(`view_project_settings_source.jsx:295, :318`). Both are plain props with no fallback. If a
refactor drops one, the entire feature disappears from the app with no error, no console
warning, and no visible trace, which is exactly the failure mode Aaron was complaining about
in the first place.

### Changed

- `tests/educator_evaluation_portal_entry.test.js` — new. Pins the four host props at
  `AlloFlowANTI.txt:52709-52713`, pins that the stored URL goes through
  `normalizeAlloEvaluationPortalUrl` on both read and use, pins
  `window.__alloMakeQrSvg = _makeAlloQrSvg`, and pins `window.qrcode(0, 'M')` so nobody
  replaces the auto-sized QR with a fixed version that a long URL would overflow.
- It also runs the generator rather than reading it: `qrcode.js` in a `vm` context, a real
  105-character Apps Script `/exec` URL in, 22,312 bytes of titled SVG out.

This complements their `tests/educator_evaluation_portal_setup.test.js`, which covers URL
validation. Theirs guards what a bad URL does; mine guards the feature still being reachable.

### Verified

`npx vitest run tests/educator_evaluation_portal_entry.test.js` — 7 passed.

---

## C6 correction — the standalone IT helper does exist

Their C6 section concludes "There is no IT-helper demo to remove... I could not find it under
that name, or as helpdesk, tech help, or screen recorder, anywhere in the repo." That search
was by name, and the feature is not named "IT helper" in code. It exists.

- **`it_coach/it_coach.html`** — 79,822 bytes, present, with `tests/it_coach.test.js`.
- **`docs/IT_COACH_STANDALONE_SCOPE_2026-08-11.md`** — the full extraction record, dated five
  days ago, with Aaron's own decisions logged in it.
- The app already opens it: `vsOpenCoachWindow` (`video_studio_module.js:3082`) mints a bridge
  token and opens `IT_COACH_URL` (`:3028`), and there is an `open_it_coach` command.

The thing Aaron calls the IT helper is **Screen Coach**, and its in-Studio copy is the
`<details id="coachPanel">` card on the Record tab. The right search was `getDisplayMedia`
across the repo, which returns `it_coach.html` and that doc immediately.

### Coverage comparison, from both files rather than from the doc

| | Studio card | Standalone |
|---|---|---|
| Watch-only capture, overlay, floating PiP mirror, spoken guidance | yes | yes |
| Consent gate before the frame is read | yes | yes |
| Auto-continue loop | "Auto every 12s" | "Guided walkthrough: continue after the screen changes" |
| Reply clamp `vsSanitizeCoachAdvice` | shared block | **loads it from the module**, no third copy |
| Learner/educator posture guardrail | via `?allo_posture` | yes, learner is the default and only a URL can widen it |
| Own backend config, including local no-egress via Ollama | no, parent window only | yes |
| Free-text question chat | no | yes |
| **Coaching while recording** | **yes** | no, watch-only by design |

The standalone covers the IT-help ground and exceeds it. The single thing only the Studio card
does is coach you while you are recording, which is a Video Studio job rather than an IT-help
job.

Their separate point about **Demo Autopilot** is correct and I agree with it: that is a
substantial original feature, nothing standalone covers it, and it should not be removed.
Demo Autopilot and Screen Coach are different things that both live on the Record tab.

### Changed

I did **not** delete the Screen Coach code, and I want to be direct about that rather than
present a smaller change as the whole thing.

- It is roughly 250 lines inside a 974KB single-file popup with no source pair, mirrored
  byte-identically, and pinned by structural assertions at
  `tests/video_studio.test.js:3345-3396`.
- `docs/IT_COACH_STANDALONE_SCOPE_2026-08-11.md` section 8 records that **P0 live smoke is
  still owed and nobody has watched any of this run**, for either surface.
- That doc's open question 3 is literally "Does `open_screen_coach` move to the new page, or do
  both surfaces stay? Still open, and it blocks P4."

What I did instead removes the redundancy a user actually feels, and is reversible:

- `video_studio/video_studio.html:494-502` — the Screen Coach card is now **collapsed by
  default** (the `open` attribute is gone) and its summary says what it is for and sends
  anyone who wants coaching through another website to IT Coach. Every control and DOM id is
  unchanged, so no handler and no capability is affected.
- `desktop/web-app/public/video_studio/video_studio.html` — mirrored, byte identical.
- `tests/video_studio.test.js:3406-3411` — the assertion pinning `open` is replaced by one
  pinning the collapsed form, with the reason. That `open` was a deliberate 2026-08-04
  discoverability decision, made when this panel was the only door to the coach. The
  standalone owns that job now, so the decision no longer holds.

This compounds with their `basics` focus default: the Record tab no longer opens with an
expanded beta AI coach above the fold, and the Edit tab no longer opens with nine cards.

### For Aaron

If you do want the Studio copy deleted, the scope is exact: the card at
`video_studio/video_studio.html:494-511`, the `#coachOverlay` canvas at `:514`, the coach block
at `:14299-14539`, the mirror, and the coach cases in `tests/video_studio.test.js:3345-3396`.
Keep `vsSanitizeCoachAdvice` in `video_studio_module.js`: `it_coach.html` loads the clamp from
there rather than copying it, so removing it would ship the standalone without its
null-when-unsure rule. Smoke the standalone first. Nothing has ever run it.

### Verified

- `npx vitest run tests/video_studio.test.js tests/it_coach.test.js` — 261 passed.
- `cmp` on the popup and its public mirror — byte identical.
- **Not** verified in a browser. I did not open the popup and look at the collapsed card.

---

## C5 — STEM Lab versus the math tools (analysis, no surgery)

### The coupling is a menu placement, not an architecture

STEM Lab is **already a top-level surface**. It is a modal driven by `showStemLab`
(`AlloFlowANTI.txt:10740`), mounted through `<CDNModuleGate moduleKey="StemLab">` at
`AlloFlowANTI.txt:53195`, and it has no dependency on `activeView === 'math'` anywhere. There
is nothing to extract.

What creates the impression is that the two **prominent** doors both hang off Math:

| Entry | Where | Behaviour |
|---|---|---|
| "🧪 Explore" pill on the Math sidebar tool header | `AlloFlowANTI.txt:48300` | calls `selectToolFromCatalog('math')` first, so STEM Lab opens pre-filtered to math |
| "🧪 Explore" pill beside math output | `AlloFlowANTI.txt:49036` | gated on `generatedContent && activeView === 'math'` |

Doors that already exist and are not math-scoped: `openStemLab` and `openStemTool(id)` in the
command palette (`AlloFlowANTI.txt:41515, 41540`), the Learning Hub, HistoryPanel cross-links,
and lesson-plan "Open in STEAM Lab" jumps. The wrapped setter at `AlloFlowANTI.txt:10745`
exists precisely because there are so many entry points.

**Recommendation: do not restructure.** Add a top-level STEM Lab entry that does not sit under
Math and does not pre-filter to the math category, and demote the Math-header pill to what it
honestly is, a "see the math tools" shortcut. That is a few lines of navigation and it
dissolves the whole perception. A migration would move code that is already where it belongs.

### Math fluency is not buried, it is behind a `<select>` option

- Math Fluency has **exactly one door**: sidebar → expand the Math accordion → the "Mode"
  dropdown → "Fluency Probes", the fifth of six `<option>` elements
  (`view_sidebar_panels_source.jsx:1817-1837`). "Fluency Maze" is the sixth.
- It has **zero command-palette entries**. Grepping `allo_commands_source.jsx` for "fluency"
  returns nothing. Every other significant surface in this app has a palette command with
  aliases. A `<select>` option is not scannable, not searchable, and carries no description.
- It is in neither the Educator Hub nor the tool catalog.

The module is substantial: `math_fluency_module.js` is 6,020 lines and exports both
`MathFluency` (the CBM probe panel) and `FluencyMaze`, with its own live region and WCAG CSS.
A real assessment instrument is hiding behind a dropdown option.

**Recommendation: navigation, not relocation. The answer to Aaron's uncertainty is a clear
no.** Moving it into STEM Lab would only change which container it is buried in; STEM Lab
carries 142 registered tools. It would also be the wrong home. Fluency Probes is
curriculum-based measurement, a timed assessment with score history that reports to a teacher.
It belongs with Assessment Center, not with an exploration lab. Two cheap changes cover it:

1. Palette commands `open_math_fluency` and `open_fluency_maze` with the aliases people
   actually type ("fluency probe", "timed math", "math minute", "CBM probe"). Filed to Lane 7
   in `CROSS_LANE_REQUESTS.md`.
2. A tool-catalog card, so it appears where teachers browse rather than only where they
   already know to look.

### Is the math generation UI well designed?

Partly. The panel asks for subject, then mode, and the six modes are not the same kind of
thing. Four are "generate a resource" (Problem Set, Step-by-Step, Conceptual, Real-World) and
two are "launch an interactive activity" (Fluency Probes, Fluency Maze). Putting a generator
and a launcher in one `<select>` is the root of the discoverability failure rather than a
symptom of it. Splitting the two launchers into buttons beside the mode selector would fix the
category error and the discoverability in one edit.

I did not make that change: `view_sidebar_panels_source.jsx` is one of the four lock-protected
hot files, is owned by Lanes 2, 4 and 9 in the contention map, and C5 is scoped as analysis.

### What separation would cost

Close to nothing, because it is already separate. Concretely: two new entry points, one
demoted pill, no file moves. The expensive version, physically relocating math tools between
`stem_lab/` and the math panel, would cost a great deal and buy nothing the navigation change
does not.

**I did not touch `stem_lab/`.**

---

## N8 — Family mode audit

### Found

**Family mode sets `isTeacherMode` to true.** `AlloFlowANTI.txt:15827-15834`:
`role === 'parent'` sets `setIsTeacherMode(true)` *and* `setIsParentMode(true)`. That is
deliberate, because family mode reuses the teacher-shaped shell with parent labels, and many
places handle it correctly by swapping copy (`AlloFlowANTI.txt:48012, 48036, 48169, 48385`).
But it means **every bare `isTeacherMode` gate is a potential leak onto a parent's screen**,
which is the failure class this repo has already been bitten by.

Of the 16 `{isTeacherMode &&` render gates in `AlloFlowANTI.txt`, **14 carry no
`!isParentMode`**. Most are fine, because family mode is meant to reuse that shell. The ones
that matter are the school-only surfaces.

**Open leak, confirmed, recent feature.** `view_header_source.jsx:1385` puts the Assessment
Center button inside a bare `{isTeacherMode && (`. Its three sibling gates in the same block
(`:1360, :1363, :1372`) all say `!isIndependentMode && !isParentMode`; this one does not. It
opens `StudentAnalyticsPanel`: class-level RTI tier classification, roster import, intervention
summaries, probe trends. A parent at home gets a header button into it. The panel is handed
`isIndependentMode` but **not** `isParentMode` (`AlloFlowANTI.txt:52847-52869`), so it could
not adapt even if it wanted to.

**Already closed, by the other Lane 10 agent, while I was auditing.** The Principal Evaluation
card had the identical defect. `view_project_settings_source.jsx:82` now derives
`var isSchoolRole = isTeacherMode && !isParentMode && !isIndependentMode;` and the card at
`:295` tests it. I read the current source to confirm the fix is real rather than trusting the
comment at `AlloFlowANTI.txt:52709`, per the standing rule that a gate must be checked at the
verifier's own source.

**My C4 work in family mode.** Checked, and it behaves. Family mode is `isTeacherMode`, so the
student panel (`!isTeacherMode`, `AlloFlowANTI.txt:48719`) never renders for a parent and my
`isAdventureAvailable` gate does not apply to them. Family mode instead pre-expands the sidebar
Adventure panel (`setExpandedTools([... 'adventure' ...])`, `AlloFlowANTI.txt:15832`), which
reads `hasSavedAdventure`, and that prop is now lesson-scoped. So the stale-resume fix protects
family mode too, which is the right outcome: a parent should not be pulled back into last
week's story either.

### Changed

Nothing. The one live leak is in `view_header_source.jsx`, which I do not own and which
Lanes 2 and 9 are working in. Editing it would have risked their work for a one-line change.

### Gaps I did not close

- **`view_header_source.jsx:1385`** — the Assessment Center leak. Filed to Lane 9 in
  `CROSS_LANE_REQUESTS.md` with the exact remedy: match the sibling gates.
- **`StudentAnalyticsPanel` receives no `isParentMode`.** Even once the header gate is fixed,
  the panel has no way to present a parent-appropriate view. Whether a parent should see a
  scoped version at all is a product question I was not willing to answer by guessing.
- **The other 13 bare gates.** I did not classify all of them. A full family-mode sweep is a
  lane-sized job spanning six other lanes' files. The mechanical finder is
  `grep -n "{isTeacherMode &&" AlloFlowANTI.txt | grep -v isParentMode`; the judgement needed
  for each is "is this surface about a school, or about a learner".

---

## Verification summary

Consolidated run across everything I touched or created:

- `npx vitest run` over `flashcard_quiz_answer_single_source`, `adventure_lesson_scope`,
  `educator_evaluation_portal_entry`, `video_studio`, `it_coach`, `lingua_practice`,
  `lingua_listening_evidence`, `view_glossary_dialog_a11y`, `view_glossary_wcag_a11y` —
  **389 passed, 9 files, 0 failed.**
- `node dev-tools/check_source_pair_drift.js` — OK for all three duplicated sources.
- `node dev-tools/check_source_freshness.cjs` — `adventure_handlers` and `glossary_helpers`
  fresh. The three files it flags (`view_outline`, `view_pdf_audit`, `view_spotlight_tour`)
  are not mine; `view_pdf_audit` is the off-limits pair another session owns.
- `AlloFlowANTI.txt` parses under babel with the JSX plugin after every edit burst.
- `JSON.parse` clean on `ui_strings.js` (it is JSON despite the extension, so `node --check`
  does not apply).
- `cmp` clean between `video_studio/video_studio.html` and its public mirror.

### `npm run verify:gate` — one failure, not mine

```
✓ check_render_refs: 448 module(s) parse + no dep-array free vars
✓ check_keyless_map: 515 file(s), 11380 list-element site(s)
✓ check_stem_render: 144 STEM tools
✓ check_sel_render: 70 SEL tools
✓ check_module_render: 18 renders
✓ check_lang_json: 63 lang pack(s)
✗ cmd i18n manifest STALE
```

The failure lists 21 new command keys (`cmd.describe_current_media`,
`cmd.open_learning_web_explorer`, `cmd.read_media_descriptions`,
`cmd.suggest_contextual_next_steps` and others). `allo_commands_source.jsx` shows as modified
in `git status`; I added no commands and never opened that file for writing. It needs
`node dev-tools/i18n/extract_cmd_keys.cjs` from whichever lane added them. Per RULES section 4
I did not fix it and did not bypass it.

### Things I could not verify

Nothing in this lane was verified in a browser. Specifically unconfirmed by eye: the flashcard
quiz painting green on the right option, the Adventure section disappearing from the student
panel, and the collapsed Screen Coach card. All three are covered by tests at the logic and
markup level, which is not the same thing.

## Files I changed

| File | Issue |
|---|---|
| `AlloFlowANTI.txt` | C2, C4 (under `fleet_lock`, Edit only, released between bursts) |
| `ui_strings.js` | C4, C7 (under `fleet_lock`) |
| `view_glossary_source.jsx` + built and deployed modules | C2 |
| `lingua_practice_module.js` | C2b |
| `adventure_handlers_source.jsx` + built module | C4 |
| `view_student_save_adventure_source.jsx` + built module | C4, C4b |
| `view_project_settings_source.jsx` + built module | C4, one toggle only |
| `video_studio/video_studio.html` + public mirror | C6 |
| `tests/flashcard_quiz_answer_single_source.test.js` | C2, new |
| `tests/adventure_lesson_scope.test.js` | C4, C4b, new |
| `tests/educator_evaluation_portal_entry.test.js` | C3, new |
| `tests/video_studio.test.js` | C6, one assertion updated |
| `FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` | four requests appended |

Nothing staged, nothing committed, nothing pushed, nothing deployed.

---
---

# Agent A, closing entries

I wrote the C2, C2b, C4, C4b, C7, C3 and C6 sections above. Coming back to finish C5 and N8 I
found the other agent had already covered both, and had corrected me on C6. Rather than write
competing sections, what follows is: my C6 concession, my C5 correction and the one piece of
C5 that is still mine, my N8 changes, and my own verification.

## C6 — I was wrong, and their correction stands

My C6 section says the IT helper "is not there". **That conclusion is wrong.**
`it_coach/it_coach.html` exists (79,822 bytes), has `tests/it_coach.test.js`, has a scope doc
at `docs/IT_COACH_STANDALONE_SCOPE_2026-08-11.md`, and is opened from
`video_studio_module.js:3082`. I verified all of that directly rather than taking their word
for it.

I searched by the name Aaron used and by the words around it ("IT helper", helpdesk, tech
help, screen recorder) and concluded from an absence. The feature is called **Screen Coach**
in the Studio and **IT Coach** standalone. The search that would have found it is
`getDisplayMedia` across the repo, which is what I ran to prove the *panel* does not record,
and then did not widen beyond `video_studio*`. Searching for a name and reporting "not found"
was the mistake; the artifact was one directory away.

Their handling of it, collapsing the card rather than deleting ~250 lines that
`IT_COACH_STANDALONE_SCOPE` records as still owing a live smoke test, is a better call than
the deletion my prompt asked for. Read their C6 correction, not my C6 section, on this point.

The rest of my C6 stands: the in-app Video Studio panel does not record, the recorder is the
popup, Demo Autopilot is original work that should not be removed, and the editor now lands on
four cards instead of nine.

## C5 — I was wrong about the main finding too

I claimed math fluency was "not buried but disconnected" because `MathFluencyPanel` looked
unmounted. **That is wrong.** It is mounted at `view_sidebar_panels_source.jsx:1824`, under
`mathMode === 'Fluency Probes'`, with the six props it expects. Their finding is correct: it
is behind a `<select>` option, and their recommendation (navigation, not relocation, and it
belongs with Assessment Center rather than an exploration lab) is the right answer.

My error: I grepped `AlloModules.MathFluency` against `AlloFlowANTI.txt` and a glob set that
did not surface `view_sidebar_panels_source.jsx`, then treated a negative result in the
monolith as a negative result in the app. That is the reachability mistake this repo already
has a standing note about, and I made it in the direction of declaring a working feature dead.

### The part that is still real, and what I changed

There are two implementations, and the **older host one is genuinely dead**:

- `mathFluencyActive` appears **exactly once** in the repository, its own `useState` at
  `AlloFlowANTI.txt:10715`. Nothing reads it. `AlloFlowANTI.txt:50199-50200` are two comments
  where its overlay used to be.
- No view source reads `mathFluencyActive` or `mathFluencyProblems` at all. The live panel
  owns its own state and does not touch the host's.
- But `startMathFluencyProbe` (`AlloFlowANTI.txt:12745`) is still wired to one button:
  `stem_lab/stem_lab_module.js:4899`, reached via STEM Lab, the `create` tab, Assessment
  Builder, a block whose type is `fluency`, "Generate assessment problems", and only when
  **every** block is a fluency block.
- That call sets `activeView` to `'math'` but **does not set `mathMode` to `'Fluency Probes'`**,
  so the live panel does not mount either. The student sees a toast and no probe.
- The 120-second countdown keeps running and expires into `finishMathFluencyProbe`, which
  computed a curriculum-based measurement from zero attempted problems and wrote it to
  `mathFluencyHistory` (which feeds the progress charts) and to the resource history as a
  `math-fluency-probe` record. A fabricated 0 DCPM, 0% accuracy CBM result for a student who
  was never shown a problem.

**Changed:** `AlloFlowANTI.txt:12714-12724` — `finishMathFluencyProbe` returns before building
or recording a result when nothing was attempted. A probe nobody answered is not a score of
zero, it is not a probe. Small, local, and correct whether or not the dead path is later
removed.

**Not changed:** the `stem_lab_module.js` button. `stem_lab/` is out of scope for this lane
and other sessions work in it. The right fix is to point it at the live panel by setting
`mathMode`, or to delete the host's dead `mathFluency*` state, `startMathFluencyProbe` and
`finishMathFluencyProbe` outright, which would also remove 11 `useState` calls and one prop
from the StemLab bag.

## N8 — my changes

Their audit is the fuller one and I agree with it, including the `view_header_source.jsx:1385`
Assessment Center leak, which I did not find. Two additions.

**Changed (the Principal Evaluation leak they reference as already closed).**
`view_project_settings_source.jsx:286` gated Principal Evaluation on bare `isTeacherMode`, and
the host passed that view neither `isParentMode` nor `isIndependentMode`. A parent in Project
Settings was shown a district personnel evaluation portal and a field asking for a district
Apps Script deployment URL.

- `AlloFlowANTI.txt:52708-52713` — passes `isParentMode` and `isIndependentMode`.
- `view_project_settings_source.jsx:76-82` — derives `isSchoolRole`.
- `view_project_settings_source.jsx:290` — the card tests `isSchoolRole`.

I deliberately left the family-relevant settings on `isTeacherMode`: the Adventure switch, XP
settings, Socratic instructions, student-AI toggles. A parent authoring for their child is the
author.

**Gap I did not close: the Educator Hub card list.** `view_header_source.jsx:558` and `:1420`
open it on bare `isTeacherMode`, and `view_educator_hub_modal_source.jsx` receives no role
props at all. Hiding the whole hub would be wrong; most of its 18 cards are useful to a parent
(Document Hub, Whiteboard, Page Designer, Lumen, Accessibility Lab). Three read as clearly
school-professional: **Leadership Hub** (which contains the Principal Evaluation I just gated),
**Professional Development**, and **Report Writer**. `Dynamic Assessment` and `Polls &
Sign-ups` are arguable. It needs a role prop threaded in plus a per-card product decision, and
I cannot see the hub running.

**Also noted:** `AlloFlowANTI.txt:51005` gives a parent the dashboard titled "Teacher Grading
Dashboard" (`dashboard.title`), because `view_header_source.jsx:1072` deliberately lets all
modes reach it. The content may be right for a parent; the wording is not. A
`dashboard.title_parent` string is the cheap half; switching a parent to the student dashboard
at `:51021` is a behaviour change I would not make unverified.

## My tests

Five new files, 61 tests, all passing:

| File | Covers |
|---|---|
| `tests/flashcard_quiz_answer_single_source.test.js` | C2, 14 tests. Lifts `flashcardCorrectAnswer` via `new Function` and checks behaviour, then pins that no path re-derives the answer. |
| `tests/adventure_lesson_scope.test.js` | C4/C4b, 17 tests. Lifts the lesson key, and renders the student panel through `react-dom/server` to prove the Adventure section drops out. |
| `tests/educator_evaluation_portal_setup.test.js` | C3, 15 tests. Lifts `normalizeAlloEvaluationPortalUrl` and checks it rejects HTTP, a `script.google.com.evil.test` lookalike, `javascript:`, `/dev`, credentials, ports, queries and fragments. |
| `tests/family_mode_role_gates.test.js` | N8, 7 tests. Asserts the parent-implies-teacher invariant from source, so the gate breaks loudly if that ever changes. |
| `tests/math_fluency_probe_reachability.test.js` | C5, 8 tests. Corrected after my error: now pins that the live panel **is** mounted in the sidebar, that the host copy is the dead one, and the zero-attempt guard. |

Plus `tests/video_studio.test.js`: I rewrote the `lesson-polish focus` assertion for the new
`basics` default and added one that every richer mode stays reachable.

## My verification

- `npm run verify:gate` — all checks pass except `cmd i18n manifest STALE`, which lists
  `cmd.*` keys from `allo_commands_source.jsx`. Not mine; my `ui_strings.js` additions are
  `toasts.adventure_other_lesson` and two `project_settings.*` keys. Not fixed, not bypassed.
- `AlloFlowANTI.txt` parses under babel (`sourceType: 'module'` + JSX) after each of my four
  lock bursts.
- `node --check` clean on `view_glossary_module.js`, `view_project_settings_module.js`,
  `view_student_save_adventure_module.js`, `adventure_handlers_module.js`,
  `lingua_practice_module.js`.
- `node dev-tools/check_source_pair_drift.js` — OK.
- Public mirrors verified byte-identical by `md5sum`. One needed hand-mirroring:
  `_build_view_student_save_adventure_module.js` does **not** write
  `desktop/web-app/public/`, unlike most builders. I copied it and added a test so it stays in
  step.

## Things I could not verify

No browser at all. Unconfirmed by eye: the flashcard quiz painting green on the correct
option, the Adventure section disappearing, the QR code and the new setup disclosure in
Settings, and the Video Studio editor landing on four cards.

## Two things worth your attention above the rest

1. **The fabricated CBM probe results.** Any fluency probe started from the STEM Lab
   Assessment Builder wrote a 0 DCPM, 0% accuracy result into a student's probe history and
   the progress charts without showing them a single problem. Guarded now, but records already
   written into saved projects are junk and I have no way to find or clean them.
2. **The QR path is not what you remember.** It opens an already-deployed district portal on a
   second device. It does not let a principal skip district IT, and the package's own
   compliance notes say it must not. The three-minute self-setup you are thinking of is
   Walkthrough Records, for Walkthrough Copilot.

## Where I was wrong

Twice, both by concluding from a negative search: C6 (declared a shipped standalone tool
nonexistent) and C5 (declared a mounted panel dead). Both were caught by the other agent or by
re-checking against a wider file set, and both are corrected above and in the tests. The
pattern in both: I grepped a narrow set, got nothing, and reported absence as fact instead of
widening the search or saying "I could not find it".
