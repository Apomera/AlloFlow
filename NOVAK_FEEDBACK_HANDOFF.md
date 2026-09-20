# Handoff: Novak Education feedback → adapted-text redesign

**Date:** 2026-09-18
**Repo root:** `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` (the AlloFlow tree)
**Audience:** an AI coding assistant (ChatGPT) picking this up cold, with no prior context on this codebase.

---

## 0. Why this document exists

Novak Education (the Katie Novak UDL organization) reviewed AlloFlow's text-leveling
feature at Aaron's request and sent written feedback. Their critique is legitimate and
points at a real design problem. This document captures the critique, the code-level
diagnosis behind it, and a scoped plan.

A second, unrelated bug (module loading stalls behind Quick Start) is documented in
§7 because it was diagnosed in the same session and should not be lost.

**Everything below marked "VERIFIED" was read directly in the source. Everything marked
"UNVERIFIED" is inference and must be checked before you rely on it.** Nothing in this
plan has been implemented yet. No files have been modified.

> **Headline finding (VERIFIED):** the data model for the correct fix **already exists and
> is already threaded through the whole stack**. A prior design pass built an instructional
> schema with `role` ∈ {primary, supplemental, unspecified} and `form` ∈ {original,
> **same-text-supported**, adapted}. `same-text-supported` means exactly what Novak is
> asking for — the original text, kept intact, with supports attached. It is validated in
> ~19 files, audited, exported, synced, and labeled in the UI ("Supported primary text").
> **What is missing is a way for a user to actually produce an artifact in that state.**
> This is substantially cheaper than building the feature from scratch. See §3.

---

## 1. The feedback, verbatim in substance

Lindie Johnson (COO, Novak Education) relayed a review by "Katie". The reviewer pasted a
passage of *Macbeth* Act 1 Scene 1 into the text leveler and compared the output to the
original, line by line.

**Her two points:**

1. **Do the "gloss" move throughout.** In one place, the tool kept an original word and
   appended a plain-language definition:

   > THIRD WITCH — "Upon the heath." → "Upon the heath. **A heath is an area of open land
   > with grass and small bushes.**"

   She singled this out: *"What I LOVE above is what the tool did with the word heath…
   I wonder if there is a way to build that kind of support throughout the text instead
   of replacing the original language. The same could be done with words like hurlyburly,
   anon, etc."*

2. **The leveling feature is positioned in a way that implies an anti-UDL practice.**
   *"If the rewritten text replaces the original, that would not align with a UDL approach
   because students would no longer have access to the grade-level text… As it is currently
   embedded, though, the leveling feature could suggest that replacing grade-level text with
   an easier version is a UDL strategy, which it is not."*

   She names the legitimate uses explicitly: leveled text may be used to **activate
   background knowledge, build context, preview key concepts, or scaffold students toward
   the original.** What it must not do is **replace** grade-level text, especially when
   students are working toward literacy standards in ELA, science, and history.

### 1.1 The precise shape of the objection (read this carefully)

It is easy to misread her as saying "the leveling changes the text too much." **That is
not her claim.** She never objects to the degree of rewriting. Her objection attaches to a
conditional: *if the rewritten text **replaces** the original.*

The distinction is load-bearing for the design:

- She is **not** asking for gentler leveling.
- She **is** asking for the original to remain present and reachable.
- Her own preferred example is *longer* than the original, not simpler. Additive
  scaffolding at any intensity is fine. **Substitution is the problem.**

Restated as one design principle, which should govern every decision below:

> **The adapted text is a ramp to the original, not a detour around it.**

Test for any proposed feature: *does this move the student toward the original, or does it
let them finish somewhere else?* Build the first kind.

---

## 2. The gap, precisely located (VERIFIED)

The original text **already exists** in the app as an `analysis` artifact ("analyzed source
text"). What it lacks is the **reader toolset**.

| | `view_analysis_source.jsx` (original text) | `view_simplified_source.jsx` (adapted text) |
|---|---|---|
| Lines | 265 | 2702 |
| `handleSpeak` (TTS) | **0** | present |
| Immersive reader | **0** | present |
| Define popup (`definitionData`) | **0** | present |
| Explain/Simplify popup (`revisionData`) | **0** | present |
| Text selection (`handleTextMouseUp`) | **0** | present |
| Line focus / chunk reader / karaoke | **0** | present |

*(Literal `grep -c` counts per identifier. VERIFIED.)*

`view_analysis_source.jsx` is not a reading surface at all. Its props are
`selectedDiscrepancies`, `selectedGrammarErrors`, `isEditingAnalysis`,
`sourceRefineInstruction` — it is a **teacher-facing source review/edit tool** (fact-check
discrepancies, grammar, refine).

**Consequence:** Novak's core worry — "students would no longer have access to the
grade-level text" — is *literally true as shipped*. Not because the original is deleted,
but because the only surface where a student can comfortably read anything is the one
showing the rewritten version.

### 2.1 The right direction of travel

There are two ways to close that gap:

- **(A)** Port the reader toolset into `view_analysis_source.jsx`.
- **(B)** Bring the original text *into the existing reader* as an artifact it already
  knows how to render.

**Do (B).** Rationale: `view_analysis_source.jsx` is a teacher edit surface and the wrong
home for a student reading path; the reader is 2702 lines of mature, accessible, i18n'd,
TTS-wired functionality that must not be duplicated; and — decisively — the data model
already supports (B) (§3).

---

## 3. The decisive finding: the schema already exists (VERIFIED)

A prior design pass in this codebase built an instructional-context schema that anticipates
precisely Novak's distinction. **This is the single most important fact in this document.**

### 3.1 The schema

From `view_simplified_source.jsx:178-183`:

```js
var role = ['primary', 'supplemental', 'unspecified'].indexOf(raw.role) >= 0
  ? raw.role : 'unspecified';
var form = ['original', 'same-text-supported', 'adapted'].indexOf(raw.form) >= 0
  ? raw.form : (resource.type === 'simplified' ? 'adapted' : 'original');
```

`form: 'same-text-supported'` **is** Novak's ask, already named in the type system: the
original text, unchanged, with supports attached.

### 3.2 It is threaded through the entire stack (VERIFIED)

`same-text-supported` is validated and handled in ~19 files, including:

- `instructional_context_module.js:17` — the canonical `FORMS` list
- `agent_core_contracts_module.js:381`, `agent_core_resource_pack_module.js:110`
- `generate_dispatcher_source.jsx` — audit flag `flags.sameTextSupport = true` (line ~1395)
- `generate_dispatcher` — `evidence.supportedPrimaryArtifactIds` when
  `role === 'primary' && form === 'same-text-supported'`
- `export_handlers_module.js:154`, `export_module.js:116`
- `firestore_sync_module.js:435`
- `doc_pipeline_module.js:697`
- `view_export_preview_module.js:8376`
- `view_history_panel_source.jsx:431,449` — and at line ~500 it already renders the UI
  label **"Supported primary text"**

Also note `view_history_panel_source.jsx:431` (VERIFIED):

```js
const isTextArtifact = item && (itemType === 'analysis' || itemType === 'simplified'
  || profile.form === 'same-text-supported');
```

**`analysis` and `simplified` are already treated as one class of text artifact.** The
conceptual merge this plan needs has partly happened already.

### 3.3 The audit layer already rewards the right behavior (VERIFIED)

In `generate_dispatcher`, the audit distinguishes:

```js
if (profile.role === 'primary' && profile.form === 'adapted'
    && !profile.replacementAuthorization.authorized && id) {
  evidence.unauthorizedPrimaryAdaptationIds.push(id);
}
if (profile.role === 'primary' && profile.form === 'same-text-supported' && id) {
  evidence.supportedPrimaryArtifactIds.push(id);
}
```

The system **already knows** that an adapted text serving as primary without authorization
is a problem, and that a supported primary text is the good state. The reporting exists;
the production path does not.

### 3.4 What is actually missing

**A way for a user to create an artifact with `form: 'same-text-supported'.**

Today (VERIFIED, `generate_dispatcher_source.jsx:3904-3936`) every generated artifact is
hardcoded at birth to:

```js
role: 'supplemental',
form: 'adapted',
designationSource: 'workflow-default',
```

and the only place `form` is later changed is `updateSimplifiedInstructionalRole`
(`view_simplified_source.jsx:~229`), which sets `form` to `'adapted'` if
`type === 'simplified'` and otherwise leaves it alone. **Nothing in the app ever writes
`'same-text-supported'`.** It is a fully-supported state with no door into it.

### 3.5 Why this is cheaper than the obvious approach

Because the artifact is **a plain object pushed into history** (VERIFIED,
`generate_dispatcher_source.jsx:3928-3941`):

```js
const tempItem = { id: newId, type, data: "", meta: metaInfo,
  title: ..., timestamp: new Date(), config: _itemConfig,
  instructionalText: _baseInstructionalText };
setHistory(prev => ... [...prev, tempItem]);
```

There is no server round-trip and no model call required to *construct* one. An "open this
source in the reader" action can build an artifact carrying the original text verbatim with
`role: 'primary'`, `form: 'same-text-supported'` and hand it to the existing reader.

**The text never passes through the model, so it cannot be altered.** That directly answers
Novak: the grade-level text is preserved byte-for-byte, and the supports ride alongside it.

> **Caution (must be checked first):** do **not** attempt this by running the original
> through the leveling pipeline at a "neutral" slider setting. The complexity slider always
> routes through `handleComplexityAdjustment` → generation (VERIFIED,
> `view_simplified_source.jsx:2605`; the apply button is merely *disabled* at the neutral
> value `Number(complexityLevel) === 5`). Any round trip through the model risks altering
> the text, which defeats the entire purpose. **Construct the artifact directly.**

---

## 4. The plan

Phases are ordered so each ships independently. Phase 0 is a prerequisite for the rest.

### Phase 0 — Scouting + guarantee the original is retained (FOUNDATION)

**Problem (VERIFIED).** `generate_dispatcher_source.jsx:1747-1751`:

```js
} else if (!out.sourceText && adaptedFallbackText) {
  out.sourceText = adaptedFallbackText;
}
```

When the original is missing, `sourceText` is silently backfilled **with the adapted
text**. An artifact can end up holding only the rewrite while *appearing* to have a source.

**Work:**
1. Always persist the true original alongside the adapted version.
2. Replace the fallback with an explicit "original not captured" state — never a silent
   substitution.
3. Trace whether the original survives exports, Full Pack, audit harvest, and history
   persistence.

**Scouting questions to answer and report before implementing Phases 2-3:**
- How is an `analysis` artifact shaped vs a `simplified` one? Is body text at `.data` as a
  string in both? (`view_simplified_source.jsx:515` suggests `.data` is a string for
  `simplified`, with `splitReferencesFromBody` applied only when `isLeveledText`.)
- Does `getSimplifiedInstructionalText` / `instructional_context_module` expose a setter
  that accepts `form: 'same-text-supported'`, or is `updateSimplifiedInstructionalRole` the
  only writer? (It currently hardcodes `form`.)
- What does the reader do today if handed `type: 'analysis'`? Which gates reject it?

**Risk: unknown blast radius** on the retention fix. Report scope before committing.

---

### Phase 1 — Make the supplemental framing actually reach people (CHEAPEST)

Most of this already exists and simply never reaches the user.

**Already built (VERIFIED):**
- `view_simplified_source.jsx:2164` — an "Instructional use" control
  (`supplemental` / `primary` / `unspecified`), defaulting to supplemental, with copy:
  *"Adapted text remains supplemental by default. Choosing Primary replacement records
  your educator authorization."* It warns when a supplemental version is not linked to a
  source.
- `standards_context_module.js:224` — prompt directive: *"ADAPTED COMPANION: Treat this as
  supplemental access unless the educator explicitly designates it as a replacement."*

**Two gaps (VERIFIED):**
1. The UI control sits inside an `isTeacherMode` branch, so the Novak reviewer never saw it.
2. The prompt directive only fires when `_activeStandardsContext` is set — i.e. only when
   standards are attached. **A bare passage paste (exactly her path) gets no supplemental
   framing at all.** This is why the Macbeth output came back as a clean substitution.

**Work:** ungate the role *display* so all modes see it as read-only status (keep the
*selector* teacher-only); make the supplemental directive unconditional.

---

### Phase 2 — "Read the original with supports" (THE STRUCTURAL FIX)

Give the grade-level text the full reader toolset by routing it into the existing reader as
a `same-text-supported` artifact.

**Work:**
1. An action on the source/analysis artifact — *"Open in reader"* / *"Read with supports"*.
2. It constructs a history item carrying the original text **verbatim** (no model call),
   with `role: 'primary'`, `form: 'same-text-supported'`,
   `sourceArtifactId` / `primaryArtifactId` pointing at the source, and
   `designationSource: 'educator'`.
3. Widen the reader's gates to accept it. Known type gates (VERIFIED):
   - `view_simplified_source.jsx:384` — `if (... generatedContent.type !== 'simplified') return;` (hard early return)
   - `:515` — `var isLeveledText = generatedContent.type === 'simplified';` branches text extraction
   - `:183, :229` — role/form inference keys on `resource.type === 'simplified'`
   - `:2605` — complexity slider gates on `['simplified','quiz','sentence-frames','glossary']`

   **Classify each gate** as *"this is an adapted artifact"* (keep) vs *"this is a reading
   surface"* (widen). Those two meanings are currently conflated. Search for further sites;
   that list is not guaranteed complete.

4. **Suppress or fork the mutation controls.** The Explain/Simplify popup carries an
   *"Apply text revision"* button (`view_simplified_source.jsx:2605`, `applyTextRevision`,
   teacher-only) that **replaces text in place**. On a `same-text-supported` artifact that
   is exactly the substitution Novak objected to. It must be hidden, or must fork a new
   `adapted` artifact rather than mutate the primary text. Same for the complexity slider.

**Payoff:** the existing audit layer (§3.3) starts reporting
`supportedPrimaryArtifactIds`, and the history panel's "Supported primary text" label
starts appearing — both already built.

---

### Phase 3 — Preserve-and-gloss generation (what she asked for by name)

A generation mode that keeps original sentences intact and attaches glosses to hard words
instead of rewriting them. Output artifacts are `form: 'same-text-supported'`.

**Assets already present:** the Tier 2 / Tier 3 vocabulary classification used by the
glossary path (including an LLM correction pass for heuristic false positives). Selecting
*which* words need support is largely solved; this is a new consumer of existing analysis.

**Add an archaic/literary detector.** `anon`, `hurlyburly`, `Grimalkin` are neither
academic (Tier 2) nor domain-specific (Tier 3). Existing tiering will miss them — and that
is precisely the material Novak tested. Without this, the mode underperforms on its
showcase use case.

**Design decisions:**
- *Inline vs on-tap glosses.* Inline flows in reading order and works with TTS and screen
  readers, but lengthens the text. On-tap preserves the line exactly but hides support
  behind an interaction — weaker for the students who most need it. Recommended default:
  **inline, with a density control.** A support a struggling reader must know to ask for
  reaches the wrong students.
- *Cap gloss density.* Glossing every third word reproduces substitution in slow motion.
  Attach glosses to **words, not clauses**, and enforce a ceiling.

**Integrity requirement:** the original words must be preserved exactly. Consider verifying
the model's output against the source (the untouched original is available) and rejecting
any pass that altered original tokens rather than only adding glosses.

**Test fixture:** Macbeth 1.1 is the acceptance test. If `heath`, `hurlyburly`, `anon`, and
`Grimalkin` all get support while the verse stays intact, the feature works.

---

### Phase 4 — Original-vs-adapted side-by-side

**Finding (VERIFIED):** `view_simplified_source.jsx:2367` — the existing two-pane view
pairs **source language vs target language** (translation), *not* original vs adapted.
There is currently no view in which a student sees the original beside the scaffold.

Layout machinery, paragraph pairing, and the graceful "these don't line up one-to-one"
notice already exist. The work is a second pairing mode plus a toggle for which comparison
is active when translation is also in play. Three panes is probably too many.

*(Novak's own feedback arrived as a two-column original/modern table — a hint about what
teachers want to see.)*

---

### Phase 5 — Guidance at the decision point

One or two sentences where the teacher **chooses the mode** — not in documentation, where
it changes nothing. Name her four legitimate uses (activate background knowledge, build
context, preview key concepts, scaffold toward the original) and the caution about literacy
standards.

**Tone: informative, not nagging.** Teachers are the professionals, and there are real
cases for full adaptation — a student with an IEP specifying modified curriculum, or a
newcomer several years below level in a content class where the science concept is the
target rather than the prose. A tool that nags gets ignored, and would be wrong on the
merits some of the time.

---

## 5. Explicitly out of scope

- **Comprehension layers** (questions, checks). Different product surface; not raised.
- **Auto-detecting "this text shouldn't be leveled."** Guesses at instructional intent,
  will be wrong often, and substitutes the tool's judgment for the teacher's. The complexity
  dial plus honest framing achieves the same outcome without pretending to know the lesson.

---

## 6. End state

A teacher pastes Macbeth. They can read the **original** with the full support suite — TTS,
Define, Explain, immersive reader, line focus — because it opens in the reader as a
`same-text-supported` primary artifact with its text preserved verbatim. They can
additionally generate a preserve-and-gloss version, or a fully adapted one; the latter is
`supplemental` by default and requires explicit educator authorization to serve as primary.
Whatever they generate, the original is retained and one click away.

One line: **a complexity dial, with the original always one click away and fully readable,
and preservation as the default.**

---

## 7. Unrelated bug diagnosed in the same session: modules don't load during Quick Start

**Symptom (Aaron's report):** tools don't begin loading until after Quick Start is
completed, and clicking something in the meantime produces an error.

**Cause (VERIFIED).** The background module pump refuses to run while the Quick Start /
Launch Pad surface is up. `AlloFlowANTI.txt:14680-14681`:

```js
var workspaceConcealed = !body || body.classList.contains('alloflow-workspace-concealed')
  || body.classList.contains('alloflow-launchpad-active');
if (document.hidden || workspaceConcealed) { schedule(300); return; }
```

**Two independent guards** set those classes:

1. `alloflow-workspace-concealed` — `AlloFlowANTI.txt:21019`:
   ```js
   const concealWorkspace = !isAppReady || (!hasSelectedMode && !shellDeepLinkTool);
   ```
   `hasSelectedMode` starts `false` (`AlloFlowANTI.txt:12280`) and only flips when the user
   picks a mode in Quick Start.
2. `alloflow-launchpad-active` — set by the Launch Pad component on mount, removed on
   unmount (`desktop/app-build/view_launch_pad_module.js:811` / `:814`), alongside a scroll
   lock.

**Sequence:** boot registers ~162 modules; 20 critical load immediately, ~142 queue →
Quick Start appears, both classes on → queue frozen at 142 → user finishes Quick Start →
pump finally starts → user clicks a tool → module not loaded → error.

The guard's comment states the intent: *"The launch path is its own complete surface. Do
not parse or execute workspace features behind it."* It was protecting Quick Start's
responsiveness — but it means **the best prefetch window (the 10–30s spent reading Quick
Start) is the one window loading is forbidden.**

**Recommended fix.** Replace the binary stop with a **reduced-budget path** while
concealed: one module in flight, longer inter-dispatch gaps, all existing protections still
honored (`isInputPending`, `requestIdleCallback`, `deadline.timeRemaining() > 10`,
hidden-tab). The two classes mean different things: `workspace-concealed` = "workspace not
visible yet" (ideal prefetch window); `launchpad-active` = "a modal surface with a scroll
lock is mounted" (be gentler, but don't stop entirely).

Because **either** class alone re-sleeps the pump, the fix must change the **guard**, not
just one class.

**Supporting work:**
- **Priority ordering.** Quick Start ends with the user stating what they want; that choice
  should *reorder* the queue, not merely unfreeze it. Promotion machinery already exists
  (opening a feature promotes its module).
- **Fix the error state.** A fast clicker can still beat the loader, so the failure mode
  matters independently: clicking a not-yet-loaded tool should show a loading state and
  then open, not error. **UNVERIFIED** whether `CDNModuleGate` already handles this and a
  specific path bypasses it, or whether the promote-on-click path lacks a pending state.

**Prior art — read before touching the pump.** The pump was tuned on 2026-09-04
(`PUMP_PARALLEL = 3`, budget counted only from `pumpDispatched`, `PUMP_STARVE_MS = 8000`
starvation relief), with an 8-test suite at `tests/deferred_module_pump.test.js` that
slices the shipped IIFE and runs it on a fake clock. **That work is intact and correct;
this gate sits upstream of it and zeroes it out during Quick Start.** Do not undo it.
Extend that suite rather than writing a parallel one.

**Caveat:** code-level read only. Real cold-load behavior has **not** been measured in a
browser. Verify with a throttled-network cold load.

---

## 8. Working notes for this repo

- **Repo-wide greps are slow and produce enormous output.** `desktop/app-build/`,
  `desktop/web-app/build/`, and `app/static/` contain minified bundles; one search returned
  9.1 MB and matched single-line bundles.
- **But do not blanket-exclude build dirs.** That is how the `alloflow-launchpad-active`
  setter was initially missed — it exists only in a module file, not in the ANTI shell.
- **Recommended search scope:** `*_source.jsx` + `AlloFlowANTI.txt` + unminified
  `*_module.js`. Exclude only `static/js/main.*.js`, `.codex-artifacts/`, `.codex-patches/`,
  `scratch/`, `.tmp-release-monitor/`, `node_modules/`.
- **`.codex-artifacts/` and `.codex-patches/` hold `*-before` snapshots.** They match almost
  every query and are never the live code.
- **Architecture:** `*_source.jsx` files are built into CDN `*_module.js` bundles. Editing
  source alone is not enough — there is a build step and a `?v=` pin that must be restamped
  in **both** ANTI copies (repo root and `desktop/web-app/src`). Confirm the current build
  command before shipping; a rebuilt-but-unstamped module will not be picked up.
- **There are multiple copies of key files** (repo root, `desktop/web-app/src`,
  `desktop/web-app/public`, `desktop/app-build`). Determine which is authoritative before
  editing; line numbers in this document refer to the **repo-root** copies unless a path is
  given.

---

## 9. Suggested first move

Phase 0's scouting pass (§4, Phase 0). Specifically: confirm whether
`instructional_context_module` exposes a writer that accepts
`form: 'same-text-supported'`, and determine which reader gates reject a non-`simplified`
artifact. Those two answers size Phase 2, which is now the critical path.

Report scope before implementing.
