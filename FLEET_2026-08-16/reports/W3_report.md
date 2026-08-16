# Wave 2, Lane W3 — L10 completion, mode-gate leak, math fluency discoverability

Status: COMPLETE. Written incrementally.

Startup checks: no pre-existing `W3_report.md` (not a duplicate lane).
`git status --short -- stem_lab/` — clean, and I did not edit anything under `stem_lab/`.

---

## 1. The family-mode Assessment Center leak — FIXED, but not where it was filed

This is the item I was told to do first because a user can be harmed by it today. It is real,
but **the filed remedy would have been wrong**, and it is worth reading why before anything
else in this report.

### Found

The mechanism is exactly as described:

- **Family mode is teacher mode.** `AlloFlowANTI.txt:15852-15853`, `executeRoleSelect`,
  `role === 'parent'` sets `setIsTeacherMode(true)` **and** `setIsParentMode(true)`. (L10 cited
  `:15828`; the file has drifted under other lanes.)
- **The button sits in a bare gate.** `view_header_source.jsx:1257` opens `{isTeacherMode && (`
  around the whole `data-header-utility-cluster="teacher"` box, and the Assessment Center
  button inside it has no further test, while its three siblings in the same box (`:1360`,
  `:1363`, `:1372`, the LMS section) all carry `!isIndependentMode && !isParentMode`.

Two things then turned up that change the answer.

**1. It is not an oversight. It is a recorded decision by Aaron.**
`view_header_source.jsx:184-188` carries a comment pointing at `MODE_AUDIT_2026-08-03.md`, and
that document's F1 is this exact audit, run four months ago on this exact file. Its status
section says:

> **F1 FIXED.** Parent mode now excludes: class session start, Family Bridge send, QTI/IMS
> exports and their "LMS Integration" section label, TeacherHistoryTab, and the roster
> target-group selector. **Kept for parents by decision:** the teacher/student view toggle,
> **Class Analytics**, and the password-gated Educator Tools.

The audit even names the reason: Class Analytics is "arguably useful for a home-schooling
parent". The three sibling gates at `:1360-1372` are literally the F1 fix; Assessment Center
was left out of it deliberately, not missed. L10 did not cite F1 and, I think, did not know it
existed, which is how this reached me as an unqualified access bug.

**2. The exposure is narrower than filed, in one way that matters.** The panel renders only
data held on this device. There is no server-side class roster to disclose, so a parent opening
it does not see another family's child. The defect is scope and coherence, not disclosure. What
a parent actually got was three tabs (`student_analytics_module.js:5852-5866`):

| Tab | Family-appropriate? |
|---|---|
| 🎯 Administer — run probes | **Yes.** Defaults to "Practice Mode (No Student)". This is the thing F1 meant to keep. |
| 📋 Student Data — import & review | **No.** Class roster import. |
| 📊 Research — insights & growth | **No.** An embedded research study suite: IRB consent, Likert instruments, custom questions. |

So hiding the button would have deleted the half F1 deliberately kept, to suppress the half
F1 never considered.

**The second door was already safe, and I checked rather than assumed.**
`open_class_analytics` (`allo_commands_source.jsx:794`) carries `roles: 'teacher'`, and
`getCommandAudience` (`:616-623`) tests `isParentMode` *before* falling through to `'teacher'`,
so a parent resolves to the `'parent'` audience and never sees that command in palette, chat or
voice. The command layer has a real role resolver. The JSX does not.

### Changed

The door stays open, per F1. What is behind it is scoped.

- `student_analytics_module.js:1278-1286` — the panel accepts `isParentMode`, **defaulting to
  `false`**, so an older host that passes nothing behaves exactly as it does today.
- `student_analytics_module.js:5866` — the tab array is filtered:
  `.filter(tab => !isParentMode || tab.id === 'assessments')`. A parent gets Administer only.
  The default tab is already `'assessments'` (`:1335`), so a parent always lands on a tab that
  exists.
- `student_analytics_module.js:9471, 9645` — the Student Data and Research **bodies** also test
  `!isParentMode`, so a stale or restored `assessmentCenterTab` cannot render roster import or
  the research suite even with the tab hidden.
- `AlloFlowANTI.txt:52877-52882` — the host passes `isParentMode={isParentMode}` (under
  `fleet_lock`, Edit only, released immediately after). A gate whose prop nobody supplies is a
  dead gate, which is a documented failure mode in this repo, so the prop pass is pinned by a
  test.
- `desktop/web-app/public/student_analytics_module.js` — mirrored byte-identical. This module
  has no builder; an existing test (`student_analytics_probe_overlay_a11y.test.js`) pins the
  two copies equal, so the mirror is mandatory.
- `view_header_source.jsx:1385-1400` — **no gate added.** Instead the button carries a comment
  explaining that the missing `!isParentMode` is F1's decision, where the real fix lives, and
  that independent mode is excluded from neither because the panel has its own "My Learning
  Journey" presentation for it (`student_analytics_module.js:5833`). I had the `!isParentMode`
  gate written and built before I found F1, and took it back out.

Independent mode is untouched throughout. Adding `!isIndependentMode`, as the filed remedy
asked, would have deleted a working learner surface: `:5833` retitles the panel "My Learning
Journey" and `:5852, :5881, :5885, :9471, :9645` already hide all three school tabs for it.

### Verified

- `npx vitest run tests/family_mode_assessment_center_scope.test.js` — **11 passed.** New file.
  It pins the parent-implies-teacher invariant from source, asserts the F1 decision is still
  recorded in `MODE_AUDIT_2026-08-03.md` and that the reason travels with the gate, asserts the
  button is *not* wrapped in a parent exclusion (so a future lane does not "fix" the asymmetry
  back), runs the tab filter behaviourally rather than only grepping for it, pins the host prop
  pass, pins the stale-tab bodies, pins that the default tab still exists for a parent, and
  pins that the independent branch was not swept up.
- `AlloFlowANTI.txt` parses: babel `transformSync`, `sourceType: 'module'` + JSX plugin, clean
  after the edit. (My first version of that prop comment used `{/* ... */}` in JSX **attribute**
  position, which is a syntax error; the parse caught it and it is now a bare `/* */`.)
- `node --check` clean on `student_analytics_module.js`, its public mirror, and
  `view_header_module.js`. `cmp` clean between the analytics module and its mirror.
- `node _build_view_header_module.js` — clean; it writes both the root and public copies and
  they are byte-identical.
- `npx vitest run` over `student_analytics`, `student_analytics_probe_overlay_a11y`,
  `student_analytics_ferpa_confirmations_a11y`, `student_analytics_subdialogs_a11y`,
  `family_mode_role_gates`, `header_compact`, `header_controls_a11y` — **75 passed.**
- **Not** verified in a browser. I did not switch to family mode and open the panel.

### For Aaron — one decision is yours, not mine

I kept your F1 decision and scoped the panel under it. The part F1 never ruled on is whether a
parent should be able to **administer a CBM probe** at all. I kept it, because it is the
concrete thing "useful for a home-schooling parent" refers to, and because a probe scored on
this device produces a benchmark tier for your own child. If you would rather parents not see
tier language at all, the change is small now that the flag is threaded.

Also worth knowing: the panel's learner presentation is written in the second person
("Welcome to Your Learning Journey!", `:5959`). If you ever do want parents on that view rather
than Administer, the copy would need a third voice, because it currently addresses the reader
as the student.

---

## 2. N8 — family mode audit

### The gate sweep (the core of N8, per my prompt)

I swept every bare `isTeacherMode &&` render gate in the files I own, and read-only across all
139 `*_source.jsx` plus the monolith. Counts: **13** bare gates in `view_header_source.jsx`,
**14** in `AlloFlowANTI.txt`, and a long tail across the other view sources.

Two findings collapsed most of that list, and both are worth stating because they are what makes
the audit tractable rather than a 40-row table of maybes.

**One: the command layer is already correct.** `getCommandAudience`
(`allo_commands_source.jsx:616-623`) tests `isStudentLinkMode`, then `isIndependentMode`, then
`isParentMode`, and only then falls through to `'teacher'`. Every `roles: 'teacher'` command is
therefore already invisible to a parent. The leak class is confined to JSX.

**Two: a parent cannot reach a live class session** (after the one fix below), which neutralises
about seven gates whose real condition is `activeSessionCode`: the adventure action vote, the
live polling host panel, Concept Pictionary host, the anchor-chart Pictionary launch, the Gemini
bridge session block, the live session dock.

What is left, classified:

| Gate | Verdict |
|---|---|
| `view_header:546, :1451` Learning Hub (STEAM Lab, SEL Hub, LitLab, PoetTree, StoryForge) | Keep. Learner content, squarely family-appropriate. |
| `view_header:616` Setup and Guided Mode | Keep. A parent authoring for their child is the author. |
| `view_header:1144` recall hints and the new toast log (L9/D4) | Keep. Generic message log, no class data. |
| `view_header:1197` cloud sync | Keep. The device owner's own storage choice. |
| `view_header:1208` app tour | Keep. |
| `view_header:1257` teacher utility cluster (translate, documents) | Keep. Its class-specific children (QTI, IMS, the LMS heading) are already sub-gated by F1. |
| `view_header:1416` AI backend configuration | Keep. A parent supplies their own provider key. |
| `view_header:558, :1432` **Educator Hub** | **Filed, not fixed.** See below. |
| `AlloFlowANTI:52871` StudentAnalyticsPanel mount | Fixed one level down (section 1). The mount gate is bare but harmless: visibility is `isOpen={showClassAnalytics}`. |
| `AlloFlowANTI:48534` **Start live session** | **Fixed.** See below. |
| `AlloFlowANTI:52127` StoryForge submissions | Keep. In a family context these are the parent's own child's submissions. |
| `view_history_panel:662, :707, :1089, :1103` save project, project settings, rename, reorder | Keep. Authoring actions. |
| `view_renderers`, `view_adventure`, `view_analysis`, `view_image`, `view_outline`, `visual_panel` and the rest | Keep. Content authoring and interactive-organizer controls. The teacher/learner split there is about who edits, not about school data. |

### The one fix: a second door to a live class session

`AlloFlowANTI.txt:48534` is a **"Start live session"** button inside Guided Mode's "Preview,
Package and Deliver" step, and it had **no role gate at all**.

This is not a product judgment, it is a miss against Aaron's own decision. F1 excluded parents
and independent learners from starting a class session and gated both header entries
(`view_header_source.jsx:586` and `:1481`) to do it. This third entry point either postdates that
audit or was not found by it. `setShowSessionStartOptions(true)` leads to `startClassSession()`,
the same function the header calls.

**Changed:** wrapped in `{!isIndependentMode && !isParentMode && (`, matching the header gates
exactly, with the reason and the F1 reference in a comment.

With that closed, the claim above holds: family mode has no route to `activeSessionCode`, so the
session-scoped gates are unreachable rather than merely unlikely.

### The recent features, walked

- **Translations control (L4).** Correct in family mode, and not a role question at all.
  `showTranslationControl` (`view_sidebar_panels_source.jsx:507-509`) gates on *relevance* via
  `isTranslationControlRelevant`, so it is hidden for the English-in / English-out majority and
  shown to anyone actually working in another language, parent included. Nothing to fix. It also
  just became more coherent for family mode: my task-4 change means Adventure, which family mode
  pre-expands, now takes its gloss target from this same control instead of hardcoding English.
- **Lesson Images (C7).** Coherent for a parent as-is. Family mode relabels five tools for a home
  audience (`glossary.word_helper`, `simplified.parent_mode_label`,
  `sidebar.tool_scaffolds_parent`, `lesson_plan.family_guide`, `sidebar.tool_alignment_parent`),
  and "Lesson Images" needs no parent variant: it is already plain language and names the artifact
  rather than a school role. It is an improvement over "Visual Support", which reads as
  special-education jargon to a parent.
- **Adventure switch (C4).** Confirmed rather than restated. Family mode is `isTeacherMode`, so
  the student panel (`!isTeacherMode`) never renders for a parent and the `isAdventureAvailable`
  gate does not apply to them. Family mode instead pre-expands the sidebar Adventure panel, which
  reads the now lesson-scoped `hasSavedAdventure`, so a parent is protected from the stale-resume
  bug too. The teacher-facing enable switch stays on `isTeacherMode` deliberately.
- **Toast log (L9/D4).** `view_header_source.jsx:1144` is bare `isTeacherMode`, so a parent gets
  the lightbulb and its replayable message log. Correct: it holds this device's own toasts.

### Filed, not fixed: the Educator Hub

`view_header_source.jsx:558` and `:1432` open the Educator Hub on a bare `isTeacherMode`, and
`view_educator_hub_modal_source.jsx` receives **no role props at all** (verified: zero matches for
`isParentMode`, `isIndependentMode` or `isTeacherMode` in that file). So it cannot adapt even if
the header gate changed.

I did not fix this, and would rather say so than present something smaller as done. Hiding the
whole hub would be wrong: most of its cards are useful to a parent. Three read as clearly
school-professional (Leadership Hub, which now contains the Principal Evaluation portal L10 gated;
Professional Development; Report Writer). Fixing it properly means threading a role prop into a
file I do not own and then making a per-card product decision. That is L10's original assessment
and I agree with it. Re-filed with current line numbers.

---

## 3. C5 — STEM Lab and the math tools

`git status --short -- stem_lab/` was clean when I started, and **I did not read or edit anything
under `stem_lab/`.**

### Analysis: the coupling is a menu placement, not an architecture

I re-verified L10's analysis against current source rather than restating it, and it holds.

STEM Lab is already a top-level surface: a modal driven by `showStemLab`, mounted through
`<CDNModuleGate moduleKey="StemLab">`, with no dependency on `activeView === 'math'` anywhere.
There is nothing to extract. What creates the impression of coupling is that both *prominent*
doors are "Explore" pills hanging off Math, one of which calls `selectToolFromCatalog('math')`
first so STEM Lab opens pre-filtered to math. Doors that already exist and are not math-scoped:
`openStemLab` and `openStemTool(id)` in the palette, the Learning Hub, HistoryPanel cross-links,
and lesson-plan "Open in STEAM Lab" jumps.

**What separation would cost: close to nothing, because it is already separate.** Two new entry
points and one demoted pill. No file moves. The expensive version, physically relocating math
tools between `stem_lab/` and the math panel, would cost a great deal and buy nothing the
navigation change does not.

**Recommendation: do not restructure.** Add a top-level STEM Lab entry that does not sit under
Math and does not pre-filter to the math category, and demote the Math-header pill to what it
honestly is, a "see the math tools" shortcut.

**And specifically, do not move Math Fluency into STEM Lab.** It would only change which container
it is buried in; STEM Lab carries 142 registered tools. It is also the wrong home: Fluency Probes
is curriculum-based measurement, a timed assessment with score history that reports to a teacher.
It belongs with Assessment Center, not an exploration lab. Which makes the fix navigation, not
relocation.

### The one safe fix: Math Fluency now has a door — DONE

Confirmed the premise first: grepping `allo_commands_source.jsx` for "fluency" returned
**nothing**. Math Fluency's only entry was the 5th `<option>` of the Mode `<select>` inside the
collapsed Math accordion (`view_sidebar_panels_source.jsx:1817`), Fluency Maze the 6th. A
6,020-line CBM probe instrument with its own live region and WCAG CSS, reachable only by someone
who already knew where it was.

**Changed:**

- `allo_commands_source.jsx:783-789` — `open_math_fluency` and `open_fluency_maze`, with the
  aliases asked for ("fluency probe", "timed math", "math minute", "cbm probe") plus "curriculum
  based measurement", "mad minute", "timed math facts", "math facts practice", "math maze",
  "fluency game".
- `AlloFlowANTI.txt:41186-41208` (under `fleet_lock`) — `openMathFluency` and `openFluencyMaze` on
  the command context, built on the same shape as `openSourceInput`: close the hubs, show the
  create sidebar, set `mathMode`, expand the Math accordion, scroll `#tour-tool-math` into view.
- Built with `node _build_allo_commands_module.js`, which writes the deploy mirror itself.

**Offer-first left alone, as instructed.** Both ids start with `open_`, which
`SCREEN_CHANGING_COMMAND_RE` (`allo_commands_source.jsx:2274`) matches, so `commandChangesScreen`
returns true and L7's policy confirms before acting. That is right for a timed probe.

**Two judgment calls I made:**

1. **Student audience excluded.** `roles: ['teacher', 'independent', 'parent']`. The panel lives in
   the create sidebar, which a student view does not render, so including `'student'` would have
   produced a command that reports success and shows nothing.
2. **`open_fluency_maze` opens the maze's launch card, not the maze.** `mathMode === 'Fluency Maze'`
   renders a launch button; the maze itself is a standalone view that button switches to, and it
   writes a history entry when it starts. Auto-launching from a voice command would create a
   history record from a spoken phrase. The launcher is also not reachable from the host context
   (`launchMaze` is local to the sidebar panel), so auto-launch would have meant a refactor.
   Recorded in the test so the choice is visible rather than looking like an oversight.

### Verified — reachability, not just registration

`npx vitest run tests/math_fluency_palette_reachability.test.js` — **11 passed.** New file. It
walks every link rather than asserting the command exists:

command registered, `run()` calls `c.openMathFluency()`, that name is defined **inside
`_alloCmdCtx`** (sliced between `const _alloCmdCtx = () => {` and `_alloCmdCtxRef.current = ctx;`,
so a definition elsewhere in the file cannot pass), it sets the exact strings `'Fluency Probes'`
and `'Fluency Maze'`, `view_sidebar_panels_source.jsx` tests those same strings, it expands
`expandedTools` with `'math'` which is what the accordion actually reads, `#tour-tool-math` exists
as a scroll target, `math_fluency_module.js:5995-5996` registers both exports, and
`loadModule('MathFluency', ...)` at `AlloFlowANTI.txt:11632` loads it with the loader key matching
the `AlloModules` key per that contract. Plus the built module and its deploy mirror both carry
the commands.

`node --check allo_commands_module.js` clean; root and `desktop/web-app/public/` copies both
written by the builder.

### The cmd i18n manifest — re-extracted, and it unblocked the gate

My six new keys re-staled the manifest, as my prompt anticipated, so I ran
`node dev-tools/i18n/extract_cmd_keys.cjs` myself: 561 to **567 canonical keys** (524 `cmd.*` plus
43 `palette.*`). `node dev-tools/check_cmd_i18n.cjs` no longer reports STALE.

**Keys W1 needs to translate (6 new, mine):** `cmd.open_math_fluency`,
`cmd.open_math_fluency_hint`, `cmd.open_math_fluency_done`, `cmd.open_fluency_maze`,
`cmd.open_fluency_maze_hint`, `cmd.open_fluency_maze_done`. All 63 packs are now missing 27
cmd/palette keys: the 21 already outstanding plus my 6.

---

## 4. Adventure translation contract (L4's handoff)

### Found — the plumbing was NOT done

My prompt said the resolver and `translationMode` were already in the deps object this file
receives, and that the plumbing was done. **That is not the case**, and I checked three ways
before concluding so, because concluding from a negative search is exactly how L10 went wrong
twice:

1. `grep -n "resolveTranslationPolicy|translationMode" adventure_handlers_source.jsx` — zero hits.
2. The deps destructure at `adventure_handlers_source.jsx:53` carries `adventureLanguageMode`,
   `selectedLanguages` and `currentUiLanguage`, and neither of the two.
3. The host builder `_alloAdventureHandlersDeps` (`AlloFlowANTI.txt:38817-38925`), extracted to its
   own file and read line by line, contained exactly four language-related keys:
   `adventureLanguageMode`, `selectedLanguages`, `currentUiLanguage`, `setAdventureLanguageMode`.

L4's own inventory row 23 says the same thing in its target-language column: "**Hardcoded
English.**" So I did the plumbing as part of this task.

### How I reconciled the two controls — the question my prompt asked me to answer

The two systems answer different questions, and the reconciliation is to keep them that way:

- **Adventure's tri-state decides WHETHER to gloss.** Its `"<Lang> + English"` versus bare
  `"<Lang>"` pair is how a teacher asks for a second block or for immersion with none, and its
  "multilingual mix" state has no equivalent anywhere else. That control stays authoritative.
- **The universal setting decides INTO WHAT LANGUAGE.** Nothing more.

Concretely: a universal `translationMode: 'off'` does **not** delete a gloss block Adventure was
explicitly asked for. It only stops steering the target, which then falls back to English, the
historical behaviour. Adventure wins on mode; the universal setting only ever supplies a language.

For the multilingual mix the shared resolver deliberately returns `{enabled: false}` (its
`'All Selected Languages'` early-out), because with content spanning several languages there is no
single output language to reason about. Adventure still wants exactly one gloss block, so the
helper supplies the UI language there rather than dropping to English. That is the one place the
helper adds a rule the resolver does not have, and it is commented as such.

**Practically: for an English UI, which is almost everyone, nothing changes at all.** Behaviour
differs only when the teacher has set AlloFlow's own language to something else, and then it
glosses into their language instead of English.

### Changed

- `adventure_handlers_source.jsx:20-58` — one `adventureGlossLanguage(deps)` helper at module
  scope. It never re-derives the policy, it only asks the shared resolver, which is the whole point
  of L4's single-resolver design. English fallback on every path: no resolver, no UI language,
  translations off, a throwing resolver, or no deps at all.
- The five prompt builders from row 23 now interpolate the resolved language:
  `executeStartAdventure`, `handleAdventureTextSubmit`, `handleAdventureChoice`,
  `handleGuidingHand`, `handleAdventureHint`.
- The three "no gloss" branches were hardcoded too ("Do NOT provide **English** translations",
  "without **English** translations"). They now say "no translation into any other language", which
  is what that branch actually means and removes the last English assumption.
- `"Language: English."` at three sites is deliberately **unchanged**: that is the
  mode === 'English' branch naming the *content* language, not a gloss target. Pinned by a test so
  nobody "finishes the job" by rewriting it.
- Destructures updated in the handlers that gloss, including adding `currentUiLanguage` to
  `handleAdventureHint`, which did not have it.
- `AlloFlowANTI.txt:38842-38848` (under `fleet_lock`) — `translationMode` and
  `resolveTranslationPolicy` added to `_alloAdventureHandlersDeps`.

### Verified

- `npx vitest run tests/adventure_gloss_language.test.js` — **16 passed.** New file. It lifts the
  helper out of the source **and the real resolver out of the monolith** with `new Function` and
  runs them as the pair they actually are, rather than testing the helper against a stub of the
  other half. Covers: an English UI still gets English; a Spanish UI glossing a French adventure
  gets Spanish; the multilingual mix resolves; a language is never glossed into itself; and
  translations off, a missing resolver, an empty UI language, a *throwing* resolver and no deps at
  all each fall back to English. Then it pins that no hardcoded English gloss target survives
  anywhere in the file, that the helper is called in exactly five places, that the three
  content-language defaults are untouched, that the host passes both deps, that `translationMode`
  is declared before the deps builder so there is no TDZ, and that the built module matches its
  mirror.
- `npx vitest run` over `adventure_guiding_hand`, `adventure_runtime_regressions`,
  `adventure_refinements`, `adventure_free_response_drive`, `adventure_character_runtime` and
  `adventure_lesson_scope` — **98 passed**, no regressions.
- `node --check adventure_handlers_module.js` clean; root and public copies byte-identical.
- **Not** verified by running an adventure. I did not generate a turn in a non-English UI and read
  the gloss.

### For Aaron — one thing I could not fix in my lane

The option **value** is the literal token `"<Lang> + English"`, parsed with `.endsWith(' + English')`
in four places, and its **label** is `t('adventure.lang_options.plus_english')`. So when the gloss
target is not English, the control still says "+ English" while the output is in the UI language.
The value token is a parsing contract across files I do not own (`view_sidebar_panels_source.jsx`
is lock-protected, `view_adventure_source.jsx` is not mine) and the label is W1's string. Filed to
W1. It is cosmetic and only appears for non-English UI users, but it is a real mismatch and I would
rather name it than let you find it.

---

## 5. C4b follow-through — the `window.<Icon>` DOM-global trap

### Found

`window.History` is a DOM built-in: the History interface **constructor**. React treats a bare class
as a function component and calls it without `new`, throwing
`TypeError: Class constructor History cannot be invoked without 'new'`. In the running app it works
only because `AlloFlowANTI.txt` `Object.assign`s the lucide icons onto `window` and clobbers the DOM
global before any module renders. Depending on that is the trap.

I swept all 139 `*_source.jsx` for `const <Name> = window.<Name>` where the name collides with a DOM
global, checking 23 names (`History`, `Image`, `Text`, `Range`, `Option`, `Audio`, `Event`, `Node`,
`Location`, `Screen`, `Selection`, `Notification`, `Comment`, `Attr`, `Document`, `Element`,
`Headers`, `Request`, `Response`, `Worker`, `Path2D`, `Touch`, `Menu`).

**Four hits, all `History`, none of the other 22 names:**

| File | Line | Mine? |
|---|---|---|
| `view_header_source.jsx` | 130 | **yes — fixed** |
| `view_history_panel_source.jsx` | 317 | no — filed |
| `view_info_modal_source.jsx` | 1749 | no — filed |
| `view_sidebar_tabs_nav_source.jsx` | 29 | no — filed |

A method note, since it nearly cost me the finding: my first sweep script reported "none found"
because the heredoc that wrote it ate the regex backslashes, turning `\b` into a literal backspace.
This repo already has a standing note about the shell mangling escapes. I rewrote the script as a
file write and got the four hits. A clean negative from a script you have not verified is worth
nothing.

### Changed

`view_header_source.jsx:130-139` — L10's helper,
`const icon = (name) => (window.AlloIcons && window.AlloIcons[name]) || window[name] || noop;`,
applied to `History`. The other ~47 icons in this component stay on the direct
`window.<Name> || noop` form: none of them collide with a DOM global, converting them would be churn
in a file three lanes have touched this fleet, and HeaderBar cannot render standalone anyway (it
needs three React contexts). The comment records that reasoning so the mixed idiom does not read as
an oversight.

### Verified

`node _build_view_header_module.js` clean, `node --check view_header_module.js` clean, and the sweep
re-run reports 3 remaining, all in files I do not own.

`node dev-tools/check_window_icons.cjs` passes, but note it does **not** cover this class: it
verifies the host assigns every imported lucide icon to `window`, which is the opposite direction.
Nothing in the gate catches a DOM-global collision. If you want this permanently closed, my sweep
script is the basis for a check.

---

## Verification summary

### Tests

Consolidated run across everything I touched or created — **19 files, 285 passed, 0 failed:**

`family_mode_assessment_center_scope` (new, 11) · `math_fluency_palette_reachability` (new, 12) ·
`adventure_gloss_language` (new, 16) · `family_mode_role_gates` · `math_fluency_probe_reachability` ·
`adventure_lesson_scope` · `adventure_guiding_hand` · `adventure_runtime_regressions` ·
`adventure_refinements` · `adventure_free_response_drive` · `adventure_character_runtime` ·
`student_analytics` · `student_analytics_probe_overlay_a11y` ·
`student_analytics_ferpa_confirmations_a11y` · `student_analytics_subdialogs_a11y` ·
`header_compact` · `header_controls_a11y` · `header_popovers_a11y` · `allo_commands`.

**One regression I caused and fixed.** `tests/allo_commands.test.js` failed with
`expected ['open_math_fluency', 'open_fluency_maze'] to deeply equal []`: the registry requires
every command to be listed in `CMD_GROUP` or the palette renders it with no heading. Added both as
`'tools'` (they open an existing instrument rather than generating a resource) at
`allo_commands_source.jsx:4263-4265`, rebuilt, 71 passed. I also pinned the grouping in my own
palette test, since "register the command" and "group the command" are two steps and only one of
them is obvious.

### Builders, checks and mirrors

- `node _build_view_header_module.js`, `node _build_allo_commands_module.js`,
  `node _build_adventure_handlers_module.js` — all clean.
- `node --check` clean on `view_header_module.js`, `allo_commands_module.js`,
  `adventure_handlers_module.js`, `student_analytics_module.js` and its two mirrors.
- `AlloFlowANTI.txt` parses under babel (`sourceType: 'module'` + JSX plugin) after **every** one
  of my four lock bursts. It caught one real error: `{/* ... */}` in JSX attribute position.
- `node dev-tools/check_source_freshness.cjs` — none of my three source pairs are stale. It flags
  14 compiled files newer than their source; `view_outline`, `view_spotlight_tour` and
  `view_pdf_audit` are not mine (`view_pdf_audit` is the off-limits pair another session owns).
- `node dev-tools/check_source_pair_drift.js` — OK for all three duplicated sources. I did not need
  to edit any of them.
- **Three mirrors, not two, for `student_analytics_module.js`.** It has no builder, so I mirrored by
  hand to `desktop/web-app/public/` and then the gate caught a third copy I did not know about:
  `desktop/app-build/student_analytics_module.js`, listed in `sync_allosheet_assets.cjs`'s
  `rootMirrorFiles`. I synced that one file by hand rather than running the tool without `--check`,
  because the tool also syncs five other modules that other lanes may be mid-edit on.
  `node dev-tools/sync_allosheet_assets.cjs --check` now reports synchronized.

### `npm run verify:gate`

**Everything through `check_window_icons` passes.** `check_cmd_i18n` is now fully green (567
canonical keys, lang 63/63, mirror 63/63, manifest fresh) after my re-extraction plus W1's
translation pass landing mid-run.

That matters beyond my own lane: `check_cmd_i18n` had been failing for every session, and the gate
is a single `&&` chain, so **every check after it had never run all fleet**. With it cleared the
chain reaches `check_iife_lazy_lookup`, which **fails** on 3 top-level snapshots of
`window.AlloModules.X` in `mailbox_script_source_module.js:4`,
`walkthrough_copilot_cdn_module.js:3043` and `walkthrough_script_source_module.js:14`. All three
files are **committed and unmodified** (`git status` clean for them), so this is pre-existing and
was simply hidden. Per RULES section 4 I did not fix it and did not bypass it. Filed to the
coordinator.

### Pre-existing failures I confirmed are not mine

- `tests/view_header_reflow_a11y.test.js` — 3 failures. It expects
  `id="tour-header-actions" className={\`w-full flex flex-wrap`, but `git show HEAD:view_header_source.jsx`
  already carries `w-full sm:w-auto sm:ml-auto flex flex-wrap` at that site. **Failing at HEAD**,
  before this fleet and before my edits, which touched lines 130 and 1385-1400 only.
- `tests/header_nav_i18n.test.js` — 1 failure listing unregistered `header.voice_*` keys (Kokoro and
  voice work, L6's area, W1's namespace). I added no `t()` calls to the header.

### What I did not verify

**Nothing in this lane was verified in a browser.** Specifically unconfirmed by eye:

- a parent opening Assessment Center and seeing one tab instead of three;
- the palette actually opening the Math accordion onto Fluency Probes when you type "math minute";
- an adventure turn generating a non-English gloss in a non-English UI.

All three are covered at the logic, wiring and markup level, which is not the same thing. The
adventure one in particular changes a prompt sent to a model, and no test I can write proves what
the model returns.

---

## Files I changed

| File | Why |
|---|---|
| `student_analytics_module.js` (+ `desktop/web-app/public/`, + `desktop/app-build/`) | Task 1 — family-mode tab scoping |
| `view_header_source.jsx` + built module | Task 1 (comment only), Task 5 (`icon()` for `History`) |
| `allo_commands_source.jsx` + built module + mirror | Task 3 — two palette commands, plus their `CMD_GROUP` entries |
| `adventure_handlers_source.jsx` + built module + mirror | Task 4 — gloss-target resolver and five prompt builders |
| `AlloFlowANTI.txt` | Task 1 prop pass, Task 2 session-start gate, Task 3 ctx openers, Task 4 deps (four lock bursts, Edit only, released between each) |
| `dev-tools/i18n/cmd_keys_en.json` | Task 3 — re-extracted manifest, 561 to 567 keys |
| `tests/family_mode_assessment_center_scope.test.js` | new, 11 tests |
| `tests/math_fluency_palette_reachability.test.js` | new, 12 tests |
| `tests/adventure_gloss_language.test.js` | new, 16 tests |
| `FLEET_2026-08-16/CROSS_LANE_REQUESTS.md` | 7 requests appended |

Nothing staged, nothing committed, nothing pushed, nothing deployed. No locks held at exit.
`stem_lab/` untouched and unread.

---

## For Aaron — the three things worth your attention

1. **The Assessment Center item reached me as an access bug, and it is not one.** You decided on
   2026-08-03 to keep Class Analytics for parents, and that decision is recorded in
   `MODE_AUDIT_2026-08-03.md` F1 with a comment in the header source pointing at it. What nobody had
   checked was what a parent actually gets once inside: roster import and an embedded research study
   suite with IRB consent and Likert instruments. I kept your decision and scoped the panel instead,
   so a parent now gets Administer and progress only. If you would rather parents not administer CBM
   probes either, that is a one-line change now that the flag is threaded, and it is your call
   rather than mine.

2. **A parent could start a live class session, and F1 thought it had closed that.** F1 gated both
   header entry points; Guided Mode's "Preview, Package and Deliver" step has a third, ungated
   "Start live session" button. Fixed, with the same exclusion as the header. This is the kind of
   thing that argues for a gate check rather than another audit: a fourth door added next month
   would be invisible again.

3. **The verify gate has been running at about half length all fleet.** `check_cmd_i18n` was failing
   and the chain is `&&`, so the eight checks after it never executed for anyone. It is clear now,
   and the first thing behind it is a real pre-existing failure in three committed files
   (`check_iife_lazy_lookup`). Worth knowing that "the gate passed except cmd i18n" in earlier
   reports meant less than it sounded like.
