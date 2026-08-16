You are **Lane W7** of the wave-2 fleet in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`,
branch `main`. Read `FLEET_2026-08-16/RULES.md` and `FLEET_2026-08-16/WAVE2_PLAN.md` (including
the duplicate-lane guard: if `reports/W7_report.md` already has content you did not write,
STOP). Lane ID **W7**.

## Your mission: one AI-capability resolver, honest surfaces when there is no backend

A shell install with no API key, no Canvas, and no local model currently shows every
AI-invoking control as if it worked. Aaron's decision, after design discussion:

- **Teacher surfaces: DISABLE with a doorway.** The control stays visible, visually disabled,
  with a small "Needs AI setup" affordance that opens AI Backend Settings in one click.
  Rationale: hiding would make a fresh shell install look like a fraction of the product.
- **STEM/STEAM tools and student/visitor surfaces: HIDE the AI extras entirely**, plus ONE
  quiet indicator in the STEAM Lab header (see below). Rationale: a deep-link stranger must
  never see a dead button, and the sims are fully functional without AI.

## Architecture (follow the L4 translations pattern — it is the house style now)

**One resolver, consumed everywhere, gated so new features cannot skip it.** Do not gate
hundreds of call sites by hand; that is how the translations mess happened.

1. **The resolver.** A single `resolveAiCapability()` (place it with the existing backend
   plumbing near `_alloEffectiveGeminiApiKey`, `AlloFlowANTI.txt:~1980-2060`) returning a
   struct, not a boolean — the backends differ per capability:

   ```js
   { text: bool, images: bool, tts: 'full'|'local'|'none', search: bool, reason: 'canvas'|'api-key'|'local-backend'|'none' }
   ```

   - `text`: true in Canvas (`_isCanvasEnv`), with an effective Gemini key, or with a local
     text backend (`_usesLocalTextBackend`).
   - `images`: the Imagen key path — note it is a SEPARATE key and already has graceful
     notices at `AlloFlowANTI.txt:29459-29616`; reuse that logic, do not duplicate it.
   - `tts`: 'local' when only Kokoro/browser voice are available (keyless installs still
     speak English); 'full' when a cloud/AIProvider path exists. Read L6's engine map in
     `reports/L6_report.md` before touching this.
   - `search`: the Cloudflare Worker proxy — its own configuration, independent of the key.
   - Read the state the VERIFIER reads (the same stored config the backend actually uses).
     This codebase has a documented lockout caused by a gate reading a different source of
     truth than the consumer — see the UnknownFailsClosed memory pattern in RULES lineage.
     Unknown/unreadable state fails to `none` for gating BUT the runtime call path stays
     unchanged (belt and suspenders: gating hides/disables UI, it never blocks a call that
     would otherwise work).

2. **Reactivity.** Capability changes when the user saves AI settings. The resolver result
   must be state the shell re-derives on config change, not a compute-once constant.

3. **Teacher-surface sweep (disable + doorway).** Gate the major generation entry points:
   the sidebar tool cards' generate actions, Full Pack, Quick Start's generate step, AlloBot's
   generative offers (coordinate with the offer-first policy: an offer for an unavailable
   capability should not be made — file to L7's files owner if the edit lands there),
   Research Hub, image generation. Shared affordance: one small badge component, one click →
   AI Backend Settings. Do the top ~10 surfaces thoroughly rather than 40 shallowly; list
   what you deliberately left in the report.

4. **STEAM Lab (hide + header pill).** Hide AI-invoking extras inside STEM tools when
   `text` is unavailable. **Caution:** `stem_lab/` is worked by other sessions — run
   `git status --short -- stem_lab/` first, and prefer gating at the HOST/bridge layer
   (the props/context handed to tools) over editing individual tools, so one edit covers
   ~140 tools. If per-tool edits prove necessary, write that up instead of doing a blind
   sweep. The header pill: quiet, neutral styling, text like "✨ AI extras: off" (NOT
   "AI disabled" — the sims work; alarming wording would read as breakage to a deep-link
   visitor). Click opens the setup panel below.

5. **The setup panel.** Opened from the pill and from every "Needs AI setup" badge. Content,
   in this order:
   - **Easiest: use AlloFlow inside Gemini Canvas** — free with a Google account, uses the
     Gemini plan's daily quota (personal, Education, or paid). Button: **Open AlloFlow in
     Canvas** → the app's existing Canvas share link (find the current one in the repo; it
     was restamped recently — grep for the share URL rather than hardcoding a stale copy).
     Also link Google's official Gemini page for plan details. **Do NOT state quota numbers
     or plan pricing** — they rot into false claims; say "your plan's daily quota" and link.
   - **Add a Gemini API key** → opens AI Backend Settings.
   - **Connect a local model** (LM Studio and similar; nothing leaves the device) → same
     settings surface. FERPA-relevant, so keep the no-egress phrasing accurate.
   - All strings through `ui_strings.js` under lock; list new keys for W1. No em dashes.

6. **The gate (phase 3, do not skip).** A scanner or vitest contract that keeps coverage
   honest. Full static detection of "AI call reachable from ungated UI" is not tractable;
   aim for what is: assert the resolver exists and is threaded into the surfaces you gated
   (the L4 coverage-test shape: one assertion per gated surface), plus a tripwire that the
   badge component is imported wherever `callGemini`-invoking onClick handlers live in the
   files you touched. State plainly in the report what the gate cannot see.

## Files

Yours: the new badge/panel components (place per house pattern), `view_sidebar_panels_source.jsx`
(LOCK — shared), relevant view sources. Under lock: `AlloFlowANTI.txt`, `ui_strings.js`.
Coordinate anything in `allo_commands_source.jsx`/`allobot_source.jsx` (W3 owns commands this
wave) and `stem_lab/` via `CROSS_LANE_REQUESTS.md`.

## Verification

Builders + `node --check`; `check_build_smoke`; targeted vitest incl. your new coverage test;
exercise all four states by stubbing config: Canvas / key / local / none. The "none" state is
the one that must be rendered and screenshotted: teacher sidebar (disabled+badges), STEAM Lab
header (pill), one STEM tool (extras hidden), the setup panel itself.
Report → `FLEET_2026-08-16/reports/W7_report.md`, incrementally.
