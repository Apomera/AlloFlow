# Timeline Studio — Agentic Topic Mode (Grounded Two-Step Loop)
_Spec v2 — 2026-07-11. Status: **BUILT + unit-tested (17 tests green), LOCAL/UNCOMMITTED.** Canvas smoke pending._

## Build status (2026-07-11)
- Implemented in `timeline_studio_module.js` (+ synced `desktop/web-app/public/` copy, byte-identical).
- Helpers exposed on `window.AlloModules.TimelineStudioHelpers` for tests/reuse.
- Tests: `tests/timeline_topic_mode.test.js` — 17 pass (attachSourcesToEvents incl.
  missing/partial/null supports + dedupe + omitted-startIndex; coerceTimeline
  passthrough + prose-fence parse + paste regression; topic prompt contract;
  grounded-verify wiring through the REAL compiled timeline_revision factory;
  decoration honesty incl. XSS-escape + non-http URI rejection).
- Gates: check_free_vars / render-refs / iife-lazy all clean for this file. (verify:gate
  as a whole currently trips on a PRE-EXISTING statslab render-crash — `setStemLabTool`,
  not this change; must be resolved by its owner before any deploy.)

### ⚠️ Critical runtime constraint discovered
Gemini's `google_search` tool is **incompatible with `responseMimeType:"application/json"`**
in production (non-Canvas). content_engine proves the pattern: it grounds with
`shouldUseJsonMode = false` (content_engine_source.jsx:1246) and parses text.
→ BOTH grounded calls here (topic research + grounded verify) pass `jsonMode=false`
and rely on `cleanJsonLocal`/`coerceTimeline` to strip fences + extract the outermost
object/array. In Canvas the WebSearchProvider path augments the prompt instead of
setting the tool, so json+search would also work there — but jsonMode=false is correct
for both. DO NOT "restore" JSON mode on a grounded call.

## Goal
Let a teacher type a **topic / period / must-include events** ("French Revolution,
1789–1799, include the Tennis Court Oath") instead of pasting a passage, and get a
timeline whose events are (a) grounded in real web sources and (b) fact-verified
per event before display. Compose from existing modules; no new engines.

## Existing parts reused (verified on disk 2026-07-11)

| Part | Where | Role |
|---|---|---|
| `callGemini(prompt, jsonMode, useSearch, temperature)` | prop already passed to TimelineStudio (`timeline_studio_module.js:96`) | Step 1 grounded research: flip `useSearch` to `true`. With search on, result carries `groundingMetadata.groundingChunks` (title+uri per source) and `groundingSupports` (response-segment → chunk map). Same primitive content_engine uses (`content_engine_source.jsx:1248-1254`). |
| `coerceTimeline(raw)` | `timeline_studio_module.js:66` | Validates/cleans TimelineJS3 JSON. Unchanged; extended only to PASS THROUGH new optional per-event fields (`sources`, `verification`) instead of stripping them. |
| `handleVerifyTimelineAccuracy(ctx)` | `timeline_revision_source.jsx:386` (Sequence Builder utilities, `window.AlloModules` TimelineRevision factory) | Step 2 verification: per-item `isFactuallyAccurate`, `isPositionCorrect`, `concern`, `rationale`; writes `item.verification = {factual, position, concern, rationale}`. |
| `validateSequenceStructure(content, mode)` | `timeline_revision_source.jsx:32` | Cheap structural gate (ordering, dupes) run BEFORE the paid verify call. |
| Renderer + a11y shell | timeline_studio_module.js | Unchanged except badges (below). |

Explicitly NOT reused: `createContentEngine` factory itself — it is bound to the
App state bag (`_bindState`) and generates prose articles. We reuse its
callGemini-with-search pattern, not the factory.

## Data flow

```
[topic, period?, mustInclude?, grade]
  │  Step 1 — RESEARCH (grounded)
  ▼
callGemini(buildTopicResearchPrompt(...), jsonMode=true, useSearch=TRUE, temp=0.3)
  │  returns { text: eventsJson, groundingMetadata: { groundingChunks, groundingSupports } }
  ▼
attachSourcesToEvents(events, groundingMetadata)        ← NEW (the one real new piece)
  │  each event gains sources: [{title, uri}] via groundingSupports segment→chunk map;
  │  events whose JSON segment has no support entry get sources: [] (renders "unsourced")
  ▼
validateSequenceStructure(asSequenceItems(events), 'timeline')   ← existing, free
  │  structural failures → one auto-fix retry, else surface error
  ▼
handleVerifyTimelineAccuracy(ctx with items=[{date: year, event: headline+text}])  ← existing
  │  merges verification {factual, position, concern, rationale} onto each event
  ▼
coerceTimeline(...) → render with per-event badges
```

## New code (small, all inside timeline_studio + one prompt)

1. **`buildTopicResearchPrompt(topic, period, mustInclude, grade)`** — mirrors
   `buildTimelinePrompt`'s TimelineJS3 JSON contract + rules (6–14 events,
   numeric year strings, BCE negative years, ≤8-word headlines) but replaces
   "only events supported by the passage" with:
   - "Use Google Search. Only include events you can ground in retrieved sources."
   - "If a precise month/day is not confirmed by a source, give year only."
   - period constraint + must-include list if provided.
2. **`attachSourcesToEvents(events, groundingMetadata)`** — pure function.
   Maps `groundingSupports` segments onto the event whose serialized JSON they
   overlap; dedupes chunk URIs per event. Fallback when supports are absent:
   attach the doc-level chunk list to the timeline (not per event) and mark
   events `sources: []`. THIS IS THE PART TO UNIT-TEST HARDEST.
3. **`asSequenceItems(events)` / merge-back** — TimelineJS3 `{start_date, text}` ↔
   Sequence Builder `{date, event}` shims (index-aligned).
4. **UI**: input-mode toggle _Describe a topic ↔ Paste text_ (paste path 100%
   unchanged, still `useSearch=false` — no budget change for existing flow).
   Topic mode fields: topic (required), period (optional), must-include
   (optional), grade (existing select).
5. **Badges** (render): per event —
   - ✅ verified (factual && position, has ≥1 source): green check + rationale in tooltip/details
   - ⚠️ check this (any false, or `sources.length===0`): amber + concern text
   - Timeline footer: source list (title+uri) + honesty line: "AI-researched from
     the sources below; N of M events could not be tied to a source — verify before
     teaching." (mirrors content_engine's A3 disclosure stance, `content_engine_source.jsx:999-1006`).

## Honesty/scope rules (non-negotiable)
- Never render topic-mode results without the verify pass having run (or a
  visible "verification failed — treat as unverified" state if the call errors).
- Verify uses ungrounded Gemini (same as Sequence Builder today) — it is a
  consistency check, not proof. The footer wording must not overclaim (see
  scientific-integrity feedback memory).
- Budget: topic mode = 2 Gemini calls (1 grounded + 1 verify) + optional autofix.
  Paste mode stays at 1 ungrounded call. Gate grounded search behind topic mode only.

## Edge cases
- Topic with no datable events (e.g. "photosynthesis") → keep existing empty-events
  contract; suggest Sequence Builder's non-time modes as the right tool.
- BCE ranges, single-year periods, events outside requested period (drop + note).
- groundingChunks empty (search returned nothing) → refuse to render as "researched";
  offer ungrounded draft explicitly labeled, or ask for a pasted source.
- Must-include event that search can't ground → include with ⚠️ unsourced badge, never invent a date.

## Test plan
- Unit (vitest): attachSourcesToEvents (supports present / absent / partial overlap),
  shape shims round-trip, coerceTimeline passthrough of sources+verification,
  prompt builder snapshots.
- Golden: one canned groundingMetadata fixture → full pipeline → rendered badge states.
- Canvas smoke: French Revolution topic; verify badges, footer sources, paste-mode regression.

## Files touched
- `timeline_studio_module.js` (+ its `desktop/web-app/public/` copy — keep in sync; module is hand-maintained JS, no build script)
- `ui_strings.js` + lang packs for new strings (i18n wave later; English fallbacks day 1)
- No changes to `timeline_revision_*` or `content_engine_*`.
