# X6 report — teacher-surface AI gating + voice doors (wave 3)

**Status: COMPLETE** (both tasks) · 2026-08-17 · run inline by the coordinator
**Interim state note:** `check_cmd_i18n` is RED at this commit-point because Task 2's 18 new
`cmd.*` keys are not in the packs yet — the X3 segment of tonight's run lands them (same
session, same night). Do not deploy between X6 and X3.

## Task 1: the gated surfaces

| Surface | Where | Gate |
|---|---|---|
| 15 sidebar generate buttons (adventure, simplified, math, glossary, timeline, concept-sort, brainstorm, image, outline, note-taking, anchor-chart, faq, sentence-frames, lesson-plan, analysis) | `view_sidebar_panels_source.jsx` | `disabled … \|\| !aiTextAvailable` + AiSetupNotice |
| DBQ generate | same file | same |
| Quiz generate | same file | same |
| Full Pack (plan/generate) | ANTI, `fullpack_generate` | `\|\| !aiCapability.text` + inline notice |
| **Quick Start wizard** | quickstart_module.js | **DEFERRED ON RECORD** — its `onCallGemini` is `await`ed unguarded inside the search fallback; nulling the prop trades an explained error toast for a crash, and the wizard has AI-free paths. Pinned by a test so if the wizard ever guards the call, the pin fails and gating becomes safe to add. |

W7's report said "five" generate buttons; the real count was **17**. All are gated.

**Design deviation from the prompt, with reasons:** the prompt assumed one sidebar prop bag;
the panels are 18 separately-mounted CDN components (~17 prop-bag edits per future panel).
Instead: a module-level `useAiTextAvailable()` hook reads `window.__alloResolveAiCapability` —
the SAME resolver the host and backends use, never a parallel truth — and re-derives on the
same `alloflow:ai-config-changed` + `storage` events as the host state. It **fails open**: an
older host without the resolver behaves exactly as before (behaviorally lifted and tested).
The doorway is `window.__alloOpenAiSetup`, registered beside the host's aiCapability effect,
opening AI Backend Settings where the Canvas card leads. Strings: `sidebar.needs_ai_setup`,
`sidebar.needs_ai_setup_cta` in ui_strings (mirrored) — **listed for X3**.

## Task 2: voice doors (the six 08-16 baseline surfaces)

| Command | Covers | Chain |
|---|---|---|
| use_gemini_canvas | ai_backend_guided_card_canvas | setShowAIBackendModal → Canvas card leads |
| open_brainstorm_modes | brainstorm_mode_picker | openBrainstormActivity(null) → expand accordion |
| open_discussion_builder | brainstorm_discussion_config | …('discussion') → panel bridge sets local state |
| open_jigsaw_builder | brainstorm_jigsaw_config | …('jigsaw') → same bridge |
| jump_to_lesson_plan | header_jump_lesson_collapsed | jumpToLatestLessonPlan (null until a plan exists → `when` hides it honestly) |
| open_block_suggestions | doc_builder_block_suggestions | openExportPreview (suggestions panel is `<details open>` at the top) |

`activityMode` is component-local state in BrainstormPanel, so the host capability hands the
mode through `window.__alloSetBrainstormActivityMode` — registered by the panel while
mounted, mode-validated against ACTIVITY_MODES, deleted on unmount. Retry loop (20×150ms)
because the CDN module mounts async. All six are `when`-guarded and CMD_GROUP-registered
(the step W3 learned the hard way — including that the group must be in GROUP_ORDER;
'settings' isn't, so use_gemini_canvas is 'navigate' beside open_ai_settings).

I did not add the "up to ~4 more" extra picks: the AI-gating sweep tripled in scope
(5 → 17 surfaces) and the six baseline doors are complete and chain-verified. Honest trade.

## Verification

- `tests/ai_capability_gating.test.js` — extended to **35/35**: one assertion per gated
  panel (L4 coverage shape: a new panel copied from an old one fails), fail-open lift of
  the hook with 4 window shapes, doorway bridge in both files, Full Pack gate, strings,
  built module + mirror byte-equality, Quick Start deferral pin.
- `tests/new_surface_commands_reachability.test.js` — **9/9**: command → guard → group →
  built module → host capability → panel bridge → render-state string, per chain.
- `tests/voice_surface_coverage_budget.test.js` ceiling **327 → 326** (downward, per the
  prompt) with the list in the comment; baseline regenerated (187 commands / 555 surfaces /
  326 uncovered — new surface `sidebar_ai_setup_notice` joins as a doorway whose destination
  already has two commands).
- cmd manifest re-extracted: **585 keys** (was 567). The 18 new keys for X3:
  `cmd.{use_gemini_canvas,open_brainstorm_modes,open_discussion_builder,open_jigsaw_builder,jump_to_lesson_plan,open_block_suggestions}` × `{,_hint,_done}`.
- Builders + `node --check` on sidebar and commands modules; ANTI parsed after each burst.
- Not browser-verified: the disabled states and notices on a live keyless shell (needs the
  next deploy; spec 43's journey covers the STEM half already).
