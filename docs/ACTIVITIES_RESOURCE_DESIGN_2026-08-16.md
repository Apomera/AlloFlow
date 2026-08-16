# Activities Resource Design — brainstorm → Activity Designer
**Date:** 2026-08-16 · **Status:** BUILT (P0+P1+P2, same day — see §7) · **Owner:** Aaron

> **§7 BUILD RECORD (2026-08-16, uncommitted — fleet week, Aaron batches commits).**
> P0+P1+P2 shipped together: mode picker panel, discussion kit, jigsaw, rename
> to "Activities"/"Activity Designer", catalog + metrics + search + help strings,
> pins restamped (sha256-8) in BOTH ANTI copies. Q1/Q2 answered by Aaron
> (rename now; 4 protocols confirmed); Q3/Q4/Q5 went with the doc's
> recommendations. Tests: tests/activities_resource.test.js 40/40; dispatcher +
> gemini-bridge a11y neighbors 28/28; free_vars/render_refs/catalog/help-key
> gates green (view_brainstorm icon contract baselined, +MessageSquare +Users).
> **One deliberate deviation from §D2:** activityMode/protocol/groupSize are
> PANEL-LOCAL state carried to the dispatcher via
> `configOverride.{activityMode, activityConfig}` rather than host state — zero
> new deps threading through both ANTI copies during fleet week, and guided
> mode/blueprints stay ideas-only for free because they never pass the override.
> The §5.9 writer pin tests the panel setter instead. Still open: hand-translate
> ~40 new/changed `brainstorm.*`, `status_steps.*`, `meta.*`, tour, and help
> strings into the language packs; P3 composition (seating-chart grouping
> handoff, leveled expert packets, AlloBot passing activityMode).

## 1. Summary

Rebuild the brainstorm resource into an **Activities** resource with four subtypes,
absorbing gemini-bridge as one of them:

| Subtype | What it generates | Status today |
|---|---|---|
| **Idea starters** | 5-8 activity idea cards (current behavior) | Exists (= brainstorm) |
| **Discussion kit** | Seminar/protocol plan + ramped questions + talk stems | NEW — gap confirmed 2026-08-16 |
| **Jigsaw** | N expert packets + teach-back cards + synthesis + accountability check | NEW — gap confirmed |
| **Simulation** | Gemini Canvas prompt chain (current behavior) | Exists (= gemini-bridge) |

Motivations, from the 2026-08-16 holistic catalog review:
- Brainstorm is the weakest of the 22 resources: it emits *suggestions*, not
  runnable classroom materials — even though its enrichment ladder
  (guide → worksheet → cover → rubric) is already an activity-designer skeleton.
- The app has NO student↔student pedagogy artifacts (discussion, cooperative
  structures). UDL checkpoint 8.3; the UDL Walkthrough look-fors reference
  turn-and-talk that no resource can produce.
- The BrainstormPanel is ALREADY two tools stapled together with an "OR"
  divider (ideas vs. simulation). A subtype picker simplifies it honestly.
- Catalog stays at 22 tiles; house pattern is "few resources, many modes"
  (simplified has 7 formats, outline has ~12 diagram types).

## 2. Current state (verified against source, 2026-08-16)

- **Panel:** `BrainstormPanel`, view_sidebar_panels_source.jsx ~3094. Custom
  instructions + Generate button, then "OR" divider, then `BRIDGE_MODES`
  select (react / python / physics / chatbot — defined in ANTI ~8323,
  labels/descs from `bridge.modes.*` i18n) + step slider (1-10) + a second
  generate button (`handleGenerate('gemini-bridge')`).
- **Dispatcher:** `type === 'brainstorm'` ~4028 → 5-8
  `{title, description, connection, rubric:null}`; local-backend path has its
  own schema + `unwrapArray` and caps at 8. `type === 'gemini-bridge'` ~5132 →
  JSON array of prompt strings; `stackMap` translates `bridgeSimType`.
  Post-gen `flyToElement('tour-tool-brainstorm')` for BOTH types (~6067) —
  they already share a tour/scroll target.
- **Views:** view_brainstorm_source.jsx (232 lines) — idea cards + per-idea
  ladder: `guide` (markdown) → `worksheet` (+`coverImage`) → `rubric`
  (criteria/weights/4 levels). Ladder handlers live in ANTI
  (`handleGenerateGuide`, `handleGenerateWorksheet`,
  `handleGenerateBrainstormRubric` ~10172). view_gemini_bridge_source.jsx
  (1,871 lines) — prompt-chain UI + Canvas handoff; has its own a11y test
  (tests/gemini_bridge_a11y.test.js).
- **Catalog:** tool_catalog entries for both ids. `TOOL_CATALOG_GROUPS`:
  brainstorm in `engage`/`all`; gemini-bridge in NO group (it rides the
  brainstorm tile — this is why the "22" rail count excludes it).
- **Export:** doc_pipeline_source.jsx capability rows — brainstorm
  `status:'ready', fallback:'idea-list'`; gemini-bridge
  `status:'partial', fallback:'code-snapshot'`. export_source.jsx title map
  handles both.
- **Metrics drift (fix in passing):** `ALLO_GENERATION_METRICS.resourceTypes`
  (ANTI ~5721) includes 'brainstorm' but NOT 'gemini-bridge' — bridge runs
  log as 'unknown'. Add it.
- **Guided mode:** GUIDED_STEP_IDS includes 'brainstorm', not 'gemini-bridge'.
- **i18n:** `brainstorm.*` and `bridge.*` namespaces in ui_strings.js
  (NESTED objects — dotted-key greps miss them; `ctx.t(` alias greps too).

## 3. Design decisions

### D1. Internal ids do not change (recommended)
`'brainstorm'` remains the dispatcher type, history type, catalog id, station
id, tour id, and help-key prefix. Simulation runs KEEP emitting history
entries of type `'gemini-bridge'`. Only presentation changes ("Activities"
labels, one unified panel). Rationale: renaming ids touches saved projects,
blueprints, HISTORY_ADVANCE_STEPS, station styles, metrics, tour steps,
AlloBot, and both ANTI copies — churn with zero user value. The fold is a
**panel + catalog unification, not a data migration**.

### D2. Subtype state
New persisted UI state `activityMode: 'ideas' | 'discussion' | 'jigsaw' |
'simulation'` (default `'ideas'`; wsDispatch-style setter in the existing
settings reducer, included in project save like bridgeSimType is today).
`handleGenerate('brainstorm')` reads it; `'simulation'` routes to the
existing `handleGenerate('gemini-bridge')` path unchanged.

### D3. Panel UI
Replace the OR-divider layout with a 4-way segmented control at the top of
BrainstormPanel (`data-help-key="brainstorm_mode_picker"`), then per-mode
config below it:
- **ideas** — custom instructions (exactly today's top half).
- **discussion** — protocol select + question-set size + talk-stems toggle +
  group-size hint; custom instructions shared.
- **jigsaw** — expert-chunk count N (2-6, default 4) + accountability-check
  toggle; custom instructions shared.
- **simulation** — today's bottom half verbatim (BRIDGE_MODES select + step
  slider), just without the divider framing.
One Generate button, label switching by mode (keyboard/AT: `aria-pressed`
segmented buttons, min 44px targets, no mouse-only affordances — see
feedback_mouse_only_controls).

### D4. Data shapes (pure data — fn-in-state gate applies)
History entry for brainstorm gains optional `activityMode`; each data item
gains optional `kind`. **Absent `kind` ⇒ `'idea'`** — every pre-existing
saved project renders exactly as before (test-pinned).

Discussion kit item (`kind:'discussion'`, one per generation):
```json
{
  "kind": "discussion",
  "title": "…",
  "protocol": "socratic-seminar | think-pair-share | fishbowl | gallery-walk",
  "grouping": "1-2 sentence grouping/room setup note",
  "openingQuestion": "…",
  "questionSets": [
    { "depth": "literal", "questions": ["…"] },
    { "depth": "inferential", "questions": ["…"] },
    { "depth": "evaluative", "questions": ["…"] }
  ],
  "talkStems": { "agree": [], "disagree": [], "clarify": [], "build": [] },
  "facilitationNotes": "markdown",
  "lookFors": ["observable participation indicators"],
  "rubric": null
}
```
DOK directive reuse: `dokDirective` already exists in the dispatcher — the
depth ramp maps onto it rather than inventing a parallel notion.

Jigsaw item (`kind:'jigsaw'`, one per generation):
```json
{
  "kind": "jigsaw",
  "title": "…",
  "groupSize": 4,
  "chunks": [
    { "label": "Expert A — …", "expertPacket": "markdown",
      "teachBack": { "keyPoints": [], "checkQuestions": [] } }
  ],
  "homeGroupTask": "markdown",
  "synthesisOrganizer": "markdown (table/organizer students complete)",
  "accountabilityCheck": [ { "q": "…", "answer": "…" } ],
  "rubric": null
}
```
- Accountability check is **free-response** in v1 — deliberately NOT MCQ, so
  the answer-position-bias epidemic and its 3-tell audit don't apply. If MCQ
  is ever added, run all 3 bias tells + rotate at module level.
- **OneVerdict:** `answer` is stored once; teacher view and any future
  checking derive from that single field.
- Leveled expert packets (per-group reading levels via the differentiation
  machinery) are **P3**, not v1 — v1 packets are single-level with a
  "reading support" note.

Simulation: unchanged (array of prompt strings, type `'gemini-bridge'`).

### D5. Renderer
view_brainstorm becomes kind-aware: `idea` → existing card; `discussion` →
DiscussionKitCard (protocol banner, question sets grouped by depth,
printable talk-stem grid, facilitation notes); `jigsaw` → JigsawCard
(chunk accordion with teach-back cards, synthesis organizer, answer-gated
accountability list — answers behind a teacher-mode-only details toggle).
The existing ladder (guide/worksheet/rubric buttons) applies to ALL kinds:
`worksheet` = the student-facing handout (stems cards / expert packets
print view), reusing the existing markdown worksheet field + print path.
view_gemini_bridge untouched.

### D6. Catalog / AlloBot / blueprints
- `brainstorm` TOOL_CATALOG entry rewritten: "Activity designer — idea
  starters, class discussion kits, jigsaw cooperative activities, or
  interactive simulations (Gemini Canvas)." Keep `inAutofill: true`.
- `gemini-bridge` entry: keep id VALID (dispatcher branch remains; blueprints
  and saved packs reference it) but set `inAutofill: false` and note "reached
  via the Activities tile" — the bot recommends `brainstorm` and may pass an
  `activityMode` config. Run `node _check_tool_catalog.cjs` after.
- Blueprint-modify prompt: tool list text updates automatically from the
  catalog (that is the catalog's whole point — see the note-taking drift
  incident in the catalog header).
- `TOOL_CATALOG_SEARCH.brainstorm` += "discussion seminar debate jigsaw
  cooperative groups collaboration protocol simulation app".

### D7. i18n / strings (hand-translate — NEVER delegate)
New keys (namespace `brainstorm.*` to stay in the existing bundle):
mode labels ×4, mode descriptions ×4, protocol names ×4, depth labels ×3,
stem category headers ×4, section headers (~8: teach-back, synthesis,
accountability, facilitation notes, look-fors, expert packet, home-group
task, opening question), generate-button labels ×3 (simulation keeps
`brainstorm.canvas_prompt`). ≈ 30 strings × languages. Sidebar tile label:
change `sidebar.tool_brainstorm` to "Activities" in the SAME hand-translation
pass, or defer and keep "Brainstorm" (open question Q2).

### D8. Help / tour / station
New help keys: `brainstorm_mode_picker`, `brainstorm_discussion_config`,
`brainstorm_jigsaw_config`, `brainstorm_discussion_card`,
`brainstorm_jigsaw_card` (+ help strings; run _audit_help_keys /
_audit_help_anchors). Tour target unchanged. Station style label for
'brainstorm': kid-facing "Ideas" → consider "Activities" (i18n fallback in
_ALLO_STATION_STYLES; keep the emblem).

## 4. Phasing

- **P0 — Panel unification (ships alone, pure UI).** Segmented control;
  simulation config moves under it; divider dies. No new generators, no new
  strings beyond 4 mode labels/descs. Delivers Aaron's "simplify the panel
  UI" immediately. Files: view_sidebar_panels_source.jsx (+builder rebuild +
  mirror + ?v restamp in BOTH ANTI copies), ANTI (activityMode state),
  ui_strings.js. Also: metrics drift fix (add 'gemini-bridge' to
  resourceTypes) and TOOL_CATALOG_SEARCH/description updates + gemini-bridge
  `inAutofill:false`.
- **P1 — Discussion kit.** Dispatcher branch (cloud + local-backend schema
  paths), normalizeDiscussionKit pure seam + `_testing` export,
  DiscussionKitCard, exports (doc_pipeline notes row already static-safe),
  i18n, help strings, tests.
- **P2 — Jigsaw.** Same shape of work + accountability answer gating.
- **P3 — Composition.** Seating-chart grouping handoff (group size → chart),
  leveled expert packets via differentiation, AlloBot autofill passing
  `activityMode`, guided-mode step description update.

Each phase: scoped vitest (`npx vitest run tests/<file> --pool=threads`,
path FIRST before -u), free_vars/render gates on every file HANDED to them,
rebuild via module builders, restamp ?v pins in BOTH ANTI copies, NO deploy
unless Aaron asks.

## 5. Test pins (write with the feature, not after)

1. Back-compat: brainstorm data array with NO `kind` renders idea cards
   (fixture from a real pre-change saved project).
2. `activityMode:'simulation'` generation emits history type
   `'gemini-bridge'` (renderer/export/a11y paths unchanged).
3. Blueprint containing `'gemini-bridge'` still validates (id stays known).
4. Catalog sync: `_check_tool_catalog.cjs` green with rewritten entries.
5. fn-in-state scan clean on new shapes (scan_fn_in_tool_state.cjs).
6. Jigsaw accountability answers: stored once, hidden outside teacher mode.
7. Discussion kit normalizer: missing/partial questionSets degrade to
   fewer sets, never a crash; talkStems categories optional.
8. Mode picker keyboard operability (no mouse-only), aria-pressed state.
9. A WRITER exists for `activityMode` (toggle + reducer) — pin the writer,
   not just the plumbing (lesson from workStoryEnabled dead-toggle bug).

## 6. Open questions for Aaron

1. **Sidebar label:** rename tile to "Activities" now (≈1 string × all
   hand-translated packs) or keep "Brainstorm" until P1 ships real activity
   types? (Rec: rename at P1, when the name becomes true.)
2. **Protocol set for v1 discussion kits:** socratic-seminar,
   think-pair-share, fishbowl, gallery-walk — right four? Any district-usage
   reason to add/substitute (e.g., Harkness, affinity mapping)?
3. **Jigsaw accountability check:** free-response only in v1 OK? (Rec: yes.)
4. **Guided mode:** should discussion/jigsaw be reachable inside guided mode
   step 'brainstorm', or guided stays ideas-only? (Rec: guided stays
   ideas-only in v1; modes are a power-user affordance.)
5. **Ladder semantics for new kinds:** re-use `guide` (facilitation
   deep-dive) and `worksheet` (student handout) labels as-is, or re-label
   per kind? (Rec: as-is — zero new plumbing.)
