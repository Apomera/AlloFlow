# Agentic AlloBot — Design Document

**Status:** Design (no code). **Author:** drafted with Claude, 2026-06-11.
**Goal:** a visually-impaired (or hands-busy) user can navigate and operate the entire app agentically — by voice or chat — with AlloBot as the embodied interface.

---

## 1. What exists today (the asset inventory)

The headline finding of the code dive: **we do not need to build an agent — we need to generalize one we already have.**

### 1.1 Auto-Fill Mode is a proto-agent (the seed)
The host's Auto-Fill Mode (`isAutoFillMode`, `guidedFlowState`) already implements the complete agent loop, scoped to one workflow (lesson creation):

| Agent-loop stage | Existing implementation |
|---|---|
| State | `guidedFlowState` — `{currentStage, history, pendingAction, lastBotQuestion, isFlowActive}` |
| Intent understanding | `detectWorkflowIntent(userText, currentStage, recentHistory)` — Gemini classifier returning `CONFIRM / SKIP / MODIFY / STOP / QUESTION` **plus extracted params** (format, language, interest) |
| Grounding | `getWorkflowContext()` — summarizes app state (topic, last generation) into the prompt |
| Action | stage handlers mutate real app state (source, mode, generation settings) and trigger generation |
| Narration | `generateDynamicBridge(currentStage, nextStage, contextData)` — the bot explains each transition |

"Yes, but in Spanish" already works — intent `MODIFY`, param `{language: "Spanish"}`. That is the hard part of an agent, and it is in production.

### 1.2 AlloBot is an embodied, voiced, mic-equipped surface
`allobot_source.jsx` (~2,300 lines): moods/accessories/flight, typed speech bubble, full TTS (voice/speed/volume controls), **a mic button** (`onMicClick`, `isListening`), theme/parent-mode/intro awareness. The body, voice, and ear already exist.

### 1.3 The supporting rails (each one composes into the agent)
- **Speech recognition**: shared `requestMicPermission` helper + a noted TODO that 7+ inline `SpeechRecognition` reimplementations should migrate to one helper — the agent work is the natural forcing function.
- **`window.alloAnnounce`** (2026-06-07): persistent ARIA live regions — every agent action can be announced to screen readers for free.
- **Tour engine**: `customTourSteps` + `_resolveTourEl` (targets by DOM id *or* helpKey) + `compactTour` — "show me how to X" can *walk the user there* instead of describing it.
- **Help system**: ~800 `helpStrings` keys with a BLOCKING coverage audit — a ready-made vocabulary of every control in the app, addressable by key.
- **Spotlight**: `showSpotlight(element, title, text)` — "where is X?" can *point*.
- **Named-handler convention**: `handleSetShowEducatorHubToTrue`, `handleToggleFocusMode`, … — the app's actions are already individually named functions, which is exactly what a command registry needs.
- **Show-Me Mode** (`isShowMeMode`) and the Onboarding Coach — existing demonstrate-don't-tell patterns.
- **Socratic chat** — the *student-facing* bot stays separate by design (different guardrails); this doc covers the teacher/operator agent.

### 1.4 What is genuinely missing
1. A **command registry** — the named handlers exist but nothing enumerates them as invokable, describable, guarded commands.
2. An **app-wide intent router** — `detectWorkflowIntent` only knows wizard stages.
3. A **continuous voice loop** — the mic exists but is push-to-talk per field, not a listening mode.
4. **Cross-surface reach** — the remediation pipeline and Builder are modal views whose handlers live outside the bot's current scope.

---

## 2. Design

### 2.1 Principle: one registry, three mouths
Voice, chat text, and a keyboard command palette are *the same feature* with different input transducers. All three resolve into the same `ALLO_COMMANDS` registry. This is the cohesion guarantee: nothing the agent can do is invisible to keyboard users, and nothing keyboard users can do is unreachable by voice.

### 2.2 The command registry
```js
// allo_commands_source.jsx (new module, ~declarative)
const ALLO_COMMANDS = {
  open_pipeline: {
    labels: ['open the remediation pipeline', 'make a document accessible', 'fix a pdf'],
    helpKey: 'educator_hub_pipeline_card',     // reused for spotlight/tours
    guard: { modes: ['teacher'] },              // student/parent modes: hidden
    destructive: false,
    run: (ctx) => ctx.openPdfPipeline(),
    narrate: 'cmd.open_pipeline.done',          // t() key, spoken + alloAnnounce'd
  },
  set_font_size: {
    labels: ['make the text bigger', 'increase font size', 'smaller text'],
    params: { direction: ['bigger', 'smaller'], amount: 'number?' },
    run: (ctx, p) => ctx.adjustFontSize(p),
    ...
  },
  close_modal: { destructive: 'confirm-if-work-pending', ... },
  ...
}
```
- **Seed scope (~30 commands)**: navigation (hub, pipeline, builder, settings, projects), accessibility self-service (font size, theme, high contrast, focus mode, reading ruler, read-this-page), generation verbs (the Auto-Fill wizard's stages, re-expressed), pipeline verbs (start audit, run fix, go to downloads, save project), and meta ("where is X", "show me how to X", "what can you do").
- `ctx` is a **capability object** the host assembles from the same named handlers it already passes to views — no new state paths, no `window` reaching.

### 2.3 The intent router (hybrid, same pattern as Smart Table)
1. **Deterministic first**: normalized fuzzy match of the utterance against `labels` — exact/alias hits run with **zero AI**, instantly. Expected to cover the majority of real usage ("open downloads", "bigger text").
2. **Gemini fallback** for everything else: a generalization of `detectWorkflowIntent` — prompt carries the registry's labels + current app context (which view is open, what's in progress), returns `{commandId, params, confidence}`.
3. **Below confidence threshold → clarify, never act**: the bot asks ("Did you mean the tagged PDF download, or the audio?").
4. Unknown but help-like → route to the help system (spotlight/tour) instead of failing.

### 2.4 The voice loop
- **Opt-in listening mode** started from the AlloBot mic (long-press or "🎙 Listen" in the bot menu) — never on by default, never auto-restarting after the session ends. Visible + announced state ("AlloBot is listening").
- Utterance → router → action → **narrate via bot bubble + TTS + `alloAnnounce`** (deaf/HoH users get the transcript in the bot chat; SR users get the live region; sighted users see the bubble).
- **Why opt-in is non-negotiable**: screen-reader users *navigate by speaking to their SR* in some setups, and classroom ambient audio is hostile. The agent must never grab the mic uninvited. (Same reasoning as the existing `focusNarrationEnabled` SR-conflict warning.)

### 2.5 Guardrails (the honesty architecture, applied to actions)
1. **Narrate everything** — no silent actions, ever. Every command speaks + announces its outcome.
2. **Confirm destructive** — close-with-work-pending, delete, anything FERPA-flagged (exports with student data) requires spoken/clicked confirmation. Registry marks these declaratively.
3. **One command per utterance in v1** — no autonomous chaining. The only multi-step flow is the Auto-Fill wizard, which is *already* a supervised stage machine. (Chaining is a v3 question, not a v1 feature.)
4. **Mode gates** — student/parent/independent modes see a reduced registry (accessibility self-service yes; pipeline/export no).
5. **Kill switches** — the existing bot mute and visibility toggles stop the loop; Escape always cancels a pending confirmation.
6. **Quota honesty** — deterministic matches are free; only fallback parses spend quota; the existing usage meter covers it.

### 2.6 Cohesive integration map (explicit)
| Existing feature | Agent integration |
|---|---|
| Auto-Fill Mode | Its stages become registry commands; `detectWorkflowIntent` becomes the router's wizard-mode; **no parallel wizard is built** |
| Show-Me Mode / tours | "show me how to remediate" → `startPipelineTour('triage')`; arbitrary how-tos → `customTourSteps` |
| Help system / spotlight | "where is X" → resolve helpKey → `showSpotlight`; unknown intents → help lookup, not failure |
| `alloAnnounce` | every action's narration goes through it (SR parity for free) |
| Mic / `requestMicPermission` | the voice loop consolidates the 7+ inline SR implementations into the shared helper (existing TODO) |
| Command palette (new, S0) | same registry, `Ctrl/⌘-K`, fuzzy search over labels — sighted-keyboard parity AND the registry's test harness |
| Pipeline/Builder modals | their handlers join `ctx` exactly as they're already passed to views — same prop-plumbing pattern, verified by `verify_view_props` |

### 2.7 Staged rollout (each stage ships value alone)
- **S0 — Registry + command palette** (no AI, no voice): `ALLO_COMMANDS` + ⌘K palette. Pure win for power users; the registry gets exercised and tested before any AI touches it. *Estimate: 1 session.*
- **S1 — Chat commands**: the bot's existing chat input routes through the hybrid router; typed "open downloads" works. *1 session.*
- **S2 — Voice loop**: opt-in listening mode on the AlloBot mic; SR-consolidation refactor rides along. *1–2 sessions.*
- **S3 — Wizard unification + read-back**: Auto-Fill stages re-expressed as commands; "read me the remaining issues" style query commands. *1–2 sessions.*

### 2.8 Open questions (need human/Canvas answers before S2)
1. **Does `SpeechRecognition` work inside the Gemini Canvas iframe?** Mic permission in a sandboxed opaque-origin iframe is the single biggest feasibility risk for voice (S0/S1 are immune). Needs a 5-minute Canvas smoke: the existing dictation feature is the test vehicle.
2. **Wake word or push-to-toggle?** Continuous wake-word listening burns battery and raises classroom-privacy questions; recommendation is **toggle listening, no wake word** in v1.
3. **i18n depth**: registry labels need translation for the 50-pack matrix eventually; v1 ships EN + ES aliases and the deterministic matcher falls back to the AI router for other languages (which already handles them).
4. **Student access**: should independent-mode students get voice accessibility commands ("bigger text")? Recommendation: yes, accessibility-only registry, no generation/export verbs.

### 2.9 Success criteria
- A blindfolded tester can: open the pipeline, run Make Accessible on an attached file, hear progress, and download the tagged PDF — voice only.
- ≥70% of test utterances resolve deterministically (no quota).
- Zero unnarrated actions; zero unconfirmed destructive actions, in tests.
- The palette/registry passes a golden test enumerating guards (student mode never sees pipeline verbs, etc.).

---

## 3. Why this is the right shape (and what it is not)

- It is **not** a new AI system: one new module (registry) + one generalized prompt (router) + UI glue. The agent loop, the body, the voice, the ear, the announcement rail, and the show-me machinery all exist.
- It is **honest by construction**: deterministic-first routing (the Smart Table pattern), narrate-everything, confirm-destructive, mode-gated.
- It is **cohesive by construction**: one registry feeds voice, chat, and keyboard; help/tours/spotlight are the answer surface; Auto-Fill is absorbed, not duplicated.
- It strengthens the **K-12 story**: hands-free operation serves motor-impaired teachers, low-vision users (with SR support remaining the baseline, agent as complement), and any teacher mid-lesson with chalk in one hand.
