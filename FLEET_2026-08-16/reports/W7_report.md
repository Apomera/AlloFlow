# Lane W7 — AI capability gating (run inline by the coordinator, at Aaron's request)

**Status:** core delivered and tested; one teacher-surface sweep deliberately deferred (below).

## Built

**The resolver** — `resolveAiCapability()` in `AlloFlowANTI.txt`, directly beside the three
config readers it depends on (`_readAlloAiUserConfig`, `_alloEffectiveGeminiApiKey`,
`_usesLocalTextBackend`), so it can never read a different source of truth than the backends.
Returns `{text, images, tts, reason}`:

| Install | text | images | tts | reason |
|---|---|---|---|---|
| Gemini Canvas | ✅ | ✅ | full | canvas |
| Shell + Gemini key (user or deployment) | ✅ | ✅ | full | api-key |
| Shell + local model (LM Studio etc.) | ✅ | ❌ | local | local-backend |
| Shell, nothing configured | ❌ | ❌ | **local** | none |

TTS is never `'none'` — Kokoro and the device voice speak on keyless installs. Unknown/broken
state fails to `none` for **display only**; the runtime call path is untouched by design.

**Reactivity** — host state derived from the resolver, refreshed on
`alloflow:ai-config-changed` (dispatched by the AI Backend modal's config writer) and the
cross-tab `storage` event. Exported as `window.__alloResolveAiCapability` for modules.

**STEM Lab (hide + pill)** — the host mount nulls `callGemini` / `callGeminiVision` /
`callGeminiImageEdit` when the capability is off; the module's own guarded layer
(`getHint`, `aiChat`) then self-disables everywhere, and the teacher AI-hints toggle no longer
renders as a dead control. In its place, one quiet header pill: **"✨ AI extras: off"** —
neutral wording on purpose (the sims work fully; "AI DISABLED" would read as breakage to a
deep-link visitor) — whose click opens AI Backend Settings via a host callback. Tools also get
`ctx.aiAvailable` so per-tool extras can gate themselves. All three module copies synced;
`check_stem_render` green across 144 tools.

**The setup panel (Canvas-first)** — the AI Backend modal's guided chooser gains a first card
when not connected: **"Use AlloFlow inside Gemini Canvas"**, badge "No setup", opening the
live share link (`share.gemini.google/SdsF4DiVkTwu`, the same one launch.html carries). Copy
says "your Gemini plan's daily quota (personal, Education, or paid)" and points at Google's
page — **no quota numbers or pricing**, which rot into false claims. The existing key and
local-model cards are unchanged, so all three of Aaron's paths sit in one list.

**Gate** — `tests/ai_capability_gating.test.js`, **11/11**: the resolver exercised
behaviourally (lifted with the real reader bodies, five installs), plus wiring assertions for
the export, the reactive state, the mount nulls, the pill, `ctx.aiAvailable`, the Canvas card,
the no-quota-numbers rule, and the change event.

## Deliberately deferred: the teacher-surface disable-with-doorway sweep

The sidebar's five `primaryAction` generate buttons (plus Full Pack / Quick Start) still render
enabled on a keyless shell and fail with error toasts on click — the pre-existing behaviour.
Gating them needs `aiCapability` threaded into the sidebar prop bag (ANTI) plus a shared badge
at five sites in `view_sidebar_panels_source.jsx`. Deferred because the visitor-facing half
(STEM tools, the deep-link audience) is the distribution-critical path and is fully done, the
teacher-facing failure mode is noisy-but-explained rather than silent, and this run had already
consumed the session's remaining safe scope. The resolver, event, and doorway pattern are all
in place — the sweep is now mechanical. Recorded as the first item of any next work window.

## Verified

`check_build_smoke` clean after every ANTI burst (lock acquired/released around each);
`node --check` + builders on `view_misc_modals_module.js` and the STEM module trio;
`check_stem_render` 144/144; new suite 11/11. Not verified in a browser: the pill and the
Canvas card have not been screenshotted — same class of gap W2 exists to close, flagged
honestly rather than claimed.
