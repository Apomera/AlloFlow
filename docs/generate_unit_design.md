# Generate Unit — Throughline Multi-Lesson Builder (v2.0 Design)

> **Historical design snapshot, not approved current build scope (2026-07-09):** This design was finalized from a critique workflow and intentionally recommends shelving the feature until the PDF reliability gate clears. Verify current Throughline/Generate Unit source and project priorities before treating any implementation detail below as active.

## TL;DR

- **Flow name:** Generate Unit — an ultra-power-user flow inside the Throughline spatial unit builder.
- **Core idea:** One teacher intent ("a 4-lesson Water Cycle unit, grade 3-5") becomes (1) a cheap, editable backward-design **structure proposal** rendered as PLANNED Throughline nodes, then (2) a **paced, reviewable** per-lesson generation pass that wraps the *existing* blueprint engine (`handleExecuteBlueprint`) once per lesson, threaded by one shared UbD spine. It is "N lean blueprints with a proposal step before and an accept gate after each," not a bigger Full Pack.
- **v2.0 scope:** topic→proposal (one Gemini call); editable proposal + planned nodes/edges; **serial-with-backpressure** generation (generate one lesson, stop, wait for Accept/Skip, then the next); per-lesson Accept/Refine/Regenerate/Skip; live attach-to-node; flat retry-once-then-stop-and-export on quota; export-anytime. **Cap 5 lessons, lean 3-6 resources each.**
- **Single biggest risk + mitigation:** **Quality-at-scale dilution** (mass generation inverts AlloFlow's UDL/UbD thesis). Mitigated by making the **zero-cost structure review the load-bearing gate** and defaulting generation to **serial-with-backpressure** — the slowness *is* the pedagogy. The non-blocking "worker races ahead" queue from the draft is **cut**: it turns the accept gate into theater.
- **Cost-honesty stance:** This rides the **teacher's own Google Workspace Gemini quota** — $0 to the district but finite and shared with everything else the teacher does that day. The pre-flight estimate **counts image/vision fan-out and rounds UP** ("up to N calls"), is shown live as the teacher edits, and **hard-blocks when `inLiveSession`** (don't compete with the live class for quota). No "magic button" / "free" / "instant" framing anywhere.
- **Timing vs the PDF pipeline:** Orthogonal in code (a concurrent agent owns `doc_pipeline`), but **competing for the one scarce resource — Aaron's focus and the project's credibility narrative.** UMaine/Garry stewardship is gated on PDF-pipeline reliability, and a flashy "generate a whole unit" button *adds* over-promise surface. **Recommendation: finalize and shelve this doc; build after the Garry gate clears.**

This doc folds in an adversarial review that verified the draft against real bytes. Three "free" dependencies in the original draft were **fabricated or absent** and have been cut or rescoped: (a) explicit `signal` is **not** threaded through the generation dispatcher, so v2.0 abort stops *scheduling* but does **not** kill in-flight calls; (b) the `alloflow:quota-exhausted/recovered` events **do not exist** — replaced with flat retry-once-then-stop; (c) the error classifier returns a **single** `quota` bucket and explicitly cannot separate per-minute from per-day, so there is **one** honest "rate/quota limit hit — paused" state, not differentiated copy. Two corrections also flipped major decisions: **host owns the loop** (not the module), and a **Throughline golden master must be written first** (none exists today).

---

## 1. Overview

**Generate Unit** turns a single teacher intent into a coherent, sequenced, reviewable multi-lesson unit in four beats:

1. **Propose (cheap, ~1 call).** One Gemini call produces an editable, backward-design (UbD) unit outline: a unit-level essential question + golden-thread concepts + key terms, and a sequence of *planned* lessons, each with a measurable objective, a one-line focus, and a lean 3-6 resource pack. This renders immediately as PLANNED Throughline nodes (the node model was built for exactly this — `lessonId:null, status:'planned'`).
2. **Review structure (zero cost — THE load-bearing gate).** The teacher reorders, renames, retypes, adds, removes, and optionally NL-revises the outline *before any expensive generation fires*. A live, honest call-budget banner updates as they edit. This is the highest-leverage moment in the whole flow and is **unskippable**.
3. **Generate with backpressure + per-lesson review.** The teacher hits Generate; a host-owned outer per-lesson driver wraps the *existing* `handleExecuteBlueprint` inner loop verbatim, generating each lesson's resources with the proven coherence carry-forward and pacing. **Default is serial-with-backpressure: generate lesson k, stop, wait for Accept/Skip, then generate k+1.** Each finished lesson attaches to its node live.
4. **Populated unit.** The result is a wired Throughline unit (header + sequenced draft nodes + lesson payloads in host history) the teacher can export. The exported `.unit.json` is the **durable artifact** (Canvas wipes localStorage between sessions).

**Value vs Full Pack:** A *Full Pack* makes ~15 representations of **one** source for **one** lesson. *Generate Unit* makes **N lean, sequenced lessons** threaded by one shared UbD spine, with honest pacing and per-lesson human review. Replicating Full Pack across N lessons *is* the quantity-over-quality failure mode, so per-lesson packs are deliberately lean (3-6 types).

**The honest framing of what this produces:** a *strong skeleton plus a few lean lessons the teacher will then edit* — not a finished, ship-as-is unit. The UX copy must reflect this; it must not imply the tool authors curriculum for the teacher.

---

## 2. Structure Proposal

### 2.1 Input — a thin projection of existing host state (no new persistence)

The setup form maps 1:1 onto fields the blueprint path already reads:

| Field | Source / default | Notes |
|---|---|---|
| `topic` (free text) **or** `sourceText` (paste) **or** `standards` | `sourceTopic` / `inputText` / `standardsInput` (reuse `handleFindStandards`) | At least one required |
| `gradeBand` | `gradeLevel` | Seeds unit `lessonDNA.grade` |
| `desiredLessonCount` | default `'Auto'` → AI picks 3-5 | **Default cap 5**; raising shows an explicit quota warning; hard ceiling 8 |
| `tone` | `sourceTone` | Threaded into the prompt |
| Source mode | **`'Shared source'` only in v2.0** | per-lesson "deepen" deferred (schema field reserved) |

Every field already exists as host state, so the form is a projection — no new persistence surface.

### 2.2 Proposal JSON schema (validated client-side)

```jsonc
{
  "title": "string — unit title",
  "essentialQuestion": "string — overarching UbD question (→ unit.essentialQuestion)",
  "gradeBand": "string — e.g. '3-5' (seeds lessonDNA.grade)",
  "desiredResults": ["string", ...],   // 1-3 enduring understandings; unit-level only
  "goldenThread": ["string", ...],      // recurring concepts → unit lessonDNA.concepts
  "keyTerms": ["string", ...],          // → unit lessonDNA.keyTerms
  "lessons": [
    {
      "title": "string",                 // → node.role (short label)
      "objective": "string",             // measurable objective → node.description
      "focus": "string",                 // per-lesson FOCUS directive → opts.customInstructions
      "suggestedResourceTypes": ["analysis","glossary","quiz"],  // 3-6, validated vs the 20-type catalog
      "sourceStrategy": "shared"         // 'own' reserved for v2.5; v2.0 emits 'shared' only
    }
  ]
}
// Client adds (NOT from the model): each lesson gets a generated nodeId so the produced
// history item re-attaches to the SAME planned node after generation.
```

### 2.3 Concrete example — 4-lesson "Water Cycle" (Grade 3-5, shared source)

```jsonc
{
  "title": "The Water Cycle: Earth's Recycling System",
  "essentialQuestion": "How does water move and change as it travels around our planet?",
  "gradeBand": "3-5",
  "desiredResults": [
    "Water continuously cycles through evaporation, condensation, precipitation, and collection.",
    "The Sun is the engine that drives the water cycle."
  ],
  "goldenThread": ["evaporation","condensation","precipitation","collection","the Sun as energy source"],
  "keyTerms": ["evaporation","condensation","precipitation","collection","water vapor","runoff"],
  "lessons": [
    { "title": "What Is the Water Cycle?",
      "objective": "Students will identify and sequence the four stages of the water cycle.",
      "focus": "Big-picture overview: name the four stages and the Sun's role; build the shared vocabulary anchor.",
      "suggestedResourceTypes": ["analysis","image","glossary","brainstorm"],
      "sourceStrategy": "shared" },
    { "title": "Evaporation & Condensation Up Close",
      "objective": "Students will explain how the Sun's energy drives evaporation and how water vapor forms clouds.",
      "focus": "Zoom in on the energy half: heat → evaporation → cooling → condensation. Cause-and-effect emphasis.",
      "suggestedResourceTypes": ["simplified","concept-sort","sentence-frames"],
      "sourceStrategy": "shared" },
    { "title": "Precipitation, Collection & Local Weather",
      "objective": "Students will connect precipitation and collection to weather and water sources in their community.",
      "focus": "Apply the cycle to the local watershed and rainfall; bridge science to students' lived experience.",
      "suggestedResourceTypes": ["analysis","outline","faq"],
      "sourceStrategy": "shared" },
    { "title": "Show What You Know",
      "objective": "Students will demonstrate understanding of the full cycle by answering the essential question with evidence.",
      "focus": "Summative: assess the whole arc against the essential question; no new content.",
      "suggestedResourceTypes": ["quiz","lesson-plan"],   // lesson-plan LAST per blueprint convention
      "sourceStrategy": "shared" }
  ]
}
// Pre-flight estimate (pure, no AI), rounding UP for image fan-out:
//   L1: 4 types + 1 image-bearing = up to 5 | L2: 3 | L3: 3 | L4: 2
//   TOTAL: up to ~13 AI calls · runs on YOUR Google Workspace Gemini quota · the tool pauses between lessons.
```

### 2.4 Single-source decision

**v2.0 is shared-source only.** `handleExecuteBlueprint` already runs N resources off **one** `currentSourceText` with per-type directives and a `lessonDNA` spine; Generate Unit is the same loop one level up — lessons share `inputText`, each contributes a per-lesson `focus` string into `customInstructions`/`lessonDNA`. Unit cost ≈ Σ(resources per lesson) calls, with **0** extra source-generation calls.

Per-lesson "deepen" (`sourceStrategy:'own'`, +1 `handleGenerateSource` per lesson) is the central quota-doubling risk and is **deferred to v2.5**. The schema reserves the field so it can be added without a migration. (This is a decision for Aaron — see §8.)

### 2.5 The proposal prompt (one call, UbD backward design)

```text
You are an expert curriculum designer using Understanding by Design (backward design).
Design a coherent multi-lesson UNIT — NOT 15 representations of one text — for:
  Topic/Source: ${topic || firstNChars(inputText)}
  Standard(s):  ${standardsInput || '(none provided)'}
  Grade band:   ${gradeBand}
  Target lessons: ${desiredLessonCount === 'Auto' ? 'choose 3-5 based on the topic' : desiredLessonCount} (HARD MAX 8)
  Tone: ${tone}

Work in backward-design order:
  1. DESIRED RESULTS: write the essentialQuestion and 1-3 enduring understandings (desiredResults).
  2. EVIDENCE: ensure at least one lesson near the end carries assessment (quiz and/or dbq, with teacher-key).
  3. LEARNING PLAN: sequence lessons as a build (intro → develop → apply → assess). Each lesson must advance the
     essential question; later lessons build on earlier ones. Give each a measurable objective and a one-line focus.

For each lesson pick 3-6 resource types (LEAN — favor quality over coverage) from this catalog:
${formatToolCatalogInline(getToolCatalog())}
Rules: put 'analysis' first when a lesson introduces new text; put 'lesson-plan' LAST; only use valid tool ids.
Set sourceStrategy='shared' for every lesson.
Also extract goldenThread (recurring concepts) and keyTerms that thread the whole unit.

Return ONLY valid JSON matching: {title, essentialQuestion, gradeBand, desiredResults[], goldenThread[], keyTerms[],
lessons:[{title, objective, focus, suggestedResourceTypes[], sourceStrategy}]}.
```

This reuses the `modifyBlueprintWithAI` scaffold so the model sees the same tool descriptions the blueprint editor uses. **Note:** `formatToolCatalogInline` takes a `catalog` argument — pass the catalog explicitly (`formatToolCatalogInline(getToolCatalog())`); do not assume a no-arg default. Lean per-lesson packs (3-6, not the ~15-type Full Pack) are mandatory.

### 2.6 Validation

`suggestedResourceTypes` MUST be validated against the canonical 20-type catalog (`tool_catalog_module.js`): `[analysis, simplified, glossary, outline, image, quiz, sentence-frames, brainstorm, timeline, concept-sort, adventure, faq, persona, dbq, note-taking, anchor-chart, math, lesson-plan, gemini-bridge, alignment-report]`. Unknown/deprecated ids (`mind-map`, `study-guide`) and duplicates are **silently dropped/deduped**, mirroring how `modifyBlueprintWithAI` maps `recommendedResources` into `newSelection`. An unvalidated id makes `handleGenerate(type)` a no-op or throws inside the loop.

### 2.7 Editing the proposal — plain local state, before any AI fires

The proposal is a JS array (`proposalDraft`) in component state. Edits are pure-local:
- **Direct:** drag-reorder, inline-edit title/objective/focus, toggle resource chips per lesson (chips = the 20 catalog ids), add lesson (`push` a blank), remove lesson (`filter`).
- **One AI escape hatch:** a per-unit "Revise outline" text box → a `modifyBlueprintWithAI`-style call returning a whole new proposal array (same JSON contract).

**Generate stays DISABLED until the teacher confirms the structure.** This review gate is load-bearing pedagogy, not decoration — it is the cheapest and highest-leverage gate in the flow, and it is unskippable.

### 2.8 Mapping to Throughline — pure local transform, ZERO new node schema

```text
unit.title             = proposal.title
unit.essentialQuestion = proposal.essentialQuestion           // UbD header already renders in v1
unitLessonDNA          = { grade: proposal.gradeBand, topic, essentialQuestion: proposal.essentialQuestion,
                           concepts: proposal.goldenThread.slice(0,5), keyTerms: proposal.keyTerms.slice(0,8) }
for (i, lesson) in proposal.lessons:
    nodeId = addNode(140 + i*220, 200, null)        // PLANNED node: lessonId:null, status:'planned'
    setNodeFields(nodeId, { role: lesson.title, description: lesson.objective })
    if i>0: addEdge(prevNodeId, nodeId, 'sequence')
    lesson._nodeId = nodeId                           // remember so generation re-attaches the item here
```

`normalizeUnit` already defaults `status` from `lessonId` presence; `addNode(x,y,null)` already creates planned nodes; the header fields already render. The transform needs **no change to the unit/node data model** — only new host-driven status updates into Throughline.

### 2.9 lessonDNA threading

Build a UNIT-level `lessonDNA` once from `proposal.{essentialQuestion, goldenThread, keyTerms}`. For each lesson, pass that spine **plus** the per-lesson `focus` into the existing `opts.customInstructions` + `opts.lessonDNA` of `handleGenerate`. Later lessons cohere with earlier ones exactly as resources cohere within one blueprint today. The unit-level `goldenThread`/`keyTerms` are **authoritative** and passed into *every* lesson so per-lesson drift can't fray the spine.

---

## 3. Orchestration, Pacing & Resilience

### 3.1 The two-level loop — wrap, don't fork

`handleExecuteBlueprint` (`phase_o_misc_handlers_source.jsx:462-532`) **IS** the inner per-lesson engine, verified at real bytes (lines 491-523): it loops `finalResources`, awaits `handleGenerate(type, null, hasMore, currentSourceText, {customInstructions, historyOverride, lessonDNA}, false)`, carries coherence forward (`analysis`→concepts+sourceText, `glossary`→keyTerms, `image`→visualContext, `lesson-plan`→essentialQuestion), and `setTimeout(1000)`-paces between resources.

**Refactor the inner body into a named host helper** `executeOneBlueprint(blueprint, {historyOverride, dnaOverride, signal}) → {items, dnaOut, failures[]}`. `handleExecuteBlueprint` calls it once (unchanged single-blueprint behavior); the unit driver calls it per lesson. **Zero new generation logic, no divergent copy.**

**Critical correction — `handleGenerate` already appends to host history itself.** It calls `setHistory(prev => [...prev, newItem])` at its own call sites. Therefore the driver must **NOT** also push items into host history — doing so double-adds. The driver consumes the returned item only to (a) read its `id` for node attach and (b) carry coherence forward. (This fixes a contradiction in the original draft, which both "pushed items to host history" in §3.8 and said they were "already pushed" in §5.2.)

`handleGenerate` returns the item, or `null`/`undefined` on early-return (e.g. empty source). A null return is a normal, silent outcome today — so partial-failure handling is **required**, not optional.

### 3.2 Pacing — flat tiers + flat-retry-once-then-stop (NO phantom events)

```js
const PACE = {
  betweenResourcesMs: 1200,   // short pause inside a lesson (extends the proven flat 1000)
  betweenLessonsMs:   4000,   // longer pause between lessons (lets per-minute RPM drain)
  imageExtraMs:       2000,   // images are heavier; add after an image-bearing call
  quotaPauseMs:       60000,  // on a quota error: pause ~60s (per-minute window) then ONE retry
  maxRetriesPerItem:  1,      // transient OR quota: one retry, then mark failed / stop
};
```

**Cut from the original draft:** the `alloflow:quota-exhausted` / `alloflow:quota-recovered` event-driven adaptive backoff, the ×1.5 escalation, and `quotaBackoffMaxMs`. **Those events do not exist anywhere in the tree — there are zero emitters.** Building `addEventListener`/`raceRecoveryOr` on them is building on phantoms.

**Replacement (real and honest):** wrap each `handleGenerate` in try/catch. On a thrown error, classify it with the host's existing `_classifyGeminiError`. If `quota`, pause `quotaPauseMs` (~60s, the per-minute window) and retry the **same** item ONCE; if it fails again, **STOP the unit** and surface "Rate/quota limit hit — paused. Your unit is saved; export it and pick up later." If `transient`, one retry then mark failed. Otherwise (`auth`/`config`/`content`) mark failed immediately. **Never retry-storm.**

**One honest quota state, not two.** `_classifyGeminiError` returns a single `kind:'quota'` and explicitly documents it cannot reliably separate per-minute from per-day. So there is exactly one user-facing copy: *"Rate/quota limit hit — paused. Export your unit and resume later."* The differentiated "resuming in ~60s" vs "daily limit — tomorrow" copy from the draft is **cut** — it claims a distinction the classifier cannot make.

### 3.3 Abort — fresh AbortController, and an HONEST scope limit

**Verified:** `getAbortSignal` is bound to `window.__alloPdfAbortSignal` — it is **PDF/auto-fix-scoped**. Reusing it would abort unrelated calls; never write to it. `callGemini` honors an explicit `signal` first (`gemini_api_source.jsx:375`).

**Honest correction:** the explicit `signal` is **NOT threaded through the generation dispatcher** — `configOverride.signal` is never read or forwarded to the ~20 per-type `callGemini` sites in `generate_dispatcher_source.jsx`. Threading it is **net-new wiring across the whole dispatcher**, not "two lines."

**v2.0 decision:** do **NOT** take on the dispatcher rewrite. v2.0 abort is **cooperative scheduling only**: the driver holds a `cancelRef.current` boolean checked at the top of every lesson and every resource iteration. Abort stops *scheduling* new work; the **currently in-flight `handleGenerate` call finishes and its item lands.** The UX must say this plainly: *"Stopping after the current step finishes."* True mid-flight cancellation (threading `signal` through the dispatcher) is a separate, scoped follow-up — budget it honestly or leave it for v2.5.

### 3.4 Live attach — the proven path

`mind_map_module.js` already does `setNodeFields(nodeId, { lessonId: item.id, status: 'draft' })` for the manual attach button, and `setNodeFields` triggers `saveUnitToStorage`. The driver does the same the instant a lesson's anchor item returns. **Every completed lesson persists the moment it lands — that IS the in-session checkpoint.**

### 3.5 Resume / survivability — honest about what's possible

Node `status` encodes progress with zero new schema (`planned` / `generating` / `draft` / `failed`).

**Honest limits (folding in the critique):**
- **Cross-session resume is NOT possible** — Canvas wipes localStorage between sessions. The **exported `.unit.json` is the only durable artifact.** UX copy must never imply cross-session auto-resume.
- **In-session resume is best-effort.** On reload, treat any node stuck in `generating` as **`failed`+retryable, not resumable.** Do **not** attempt to reattach a possibly-orphaned in-flight call — that reconciliation (did `setHistory` fire before the tab closed?) is fragile. Simpler and safe: re-offer that one lesson via "Retry."
- The driver auto-offers an Export at job end and any time it stops on quota.

### 3.6 Partial failure — mark-and-continue (within backpressure), never abort the unit

Each `handleGenerate` is wrapped in try/catch: `quota` → pause+retry-once-then-stop (§3.2); `transient` → one retry; otherwise mark `node.status='failed'` with a `node.error` note, record in `job.failures[]`, and **continue to the next lesson** (after the teacher's accept/skip on the current one). A "Retry failed (N)" button re-runs only failed nodes. One bad lesson never aborts the whole unit.

### 3.7 Worst-case call-count math + honesty surface

```
text calls  = N_lessons × M_resourceTypesPerLesson
image calls = N_lessons × (#image-bearing types: image, glossary-image, timeline-image)  // fan out to >1 real call

Full pack  M≈15 → 5 lessons ≈ 75 text + image fan-out   (this is the failure mode — DO NOT do this)
Lean v2.0  M≈4  → 5 lessons ≈ up to ~24 calls
estimateCalls(proposal) = Σ_lessons (types.length + imageBearing(types).length)   // round UP
```

The estimate is **pure (no AI)**, computed from the editable proposal, updates live as the teacher edits, and is the single most important honesty surface. **It MUST count image/vision fan-out and round UP**, labeled "up to N":

> "4 lessons · **up to 24 AI calls** · runs on **your** Google Workspace Gemini quota — free to your district, but shared with your other AI use today. Large units may hit per-minute limits; the tool pauses to stay under them."

This is the one number that must **never** be value-engineered down. Image/vision resources fan out to more than one real call, so a count that could read as an undercount violates the honesty contract (the project memory flags this exact overclaim pattern repeatedly).

### 3.8 Orchestrator pseudocode (host-owned, serial-with-backpressure)

```js
// ============================================================================
// HOST-OWNED two-level unit driver (lives near handleExecuteBlueprint, outlives the modal).
// Inner body (executeOneBlueprint) = the refactored handleExecuteBlueprint loop.
// DEFAULT MODE: serial-with-backpressure — generate, STOP, await accept/skip, next.
// ============================================================================
async function generateUnit(lessonSpecs, ctx) {
  // ctx = { makeNode, setNodeFields, history, unit, addToast, cancelRef,
  //         awaitApproval /* 'continue'|'skip'|'stop' */, confirmPreflight,
  //         suggestExport, classify, executeOneBlueprint, t }

  // 1. PRE-FLIGHT: planned nodes already exist from the proposal transform (§2.8).
  const est = estimateCalls(lessonSpecs);                 // pure, counts image fan-out, rounds UP
  if (ctx.inLiveSession) { ctx.blockLiveSession(); return; }   // HARD block, not warn (§7)
  if (!await ctx.confirmPreflight(est)) return;           // honest "up to N calls on YOUR quota" gate

  const job = { failures: [], done: 0, stopped: false };

  for (const ls of orderByOutline(lessonSpecs, ctx.unit)) {   // deriveOutline → sequenced
    if (ctx.cancelRef.current) break;
    ctx.setNodeFields(ls._nodeId, { status: 'generating' });

    // ----- generate ONE lesson via the reused blueprint engine -----
    let res;
    try {
      res = await ctx.executeOneBlueprint(
        buildBlueprint(ls),                                // resourceTypes + per-type directives + focus
        { historyOverride: [...ctx.history()],
          dnaOverride: seedDNA(ls),                        // unit spine + per-lesson focus (authoritative)
          signal: null }                                   // v2.0: no mid-flight signal (dispatcher not wired)
      );                                                   // handleGenerate appends to host history ITSELF
    } catch (err) {
      const cls = ctx.classify(err);                       // single 'quota' bucket; no minute/day split
      if (cls === 'quota') {
        ctx.pauseUI('quota');                              // ONE honest "rate/quota limit — paused" state
        await sleep(PACE.quotaPauseMs);
        try { res = await ctx.executeOneBlueprint(buildBlueprint(ls),
                 { historyOverride:[...ctx.history()], dnaOverride: seedDNA(ls), signal:null }); }
        catch (_) { job.stopped = true; }                  // retry failed → STOP the unit
      }
    }

    const anchor = res && res.items && res.items.find(isAnchor);
    if (anchor) ctx.setNodeFields(ls._nodeId, { lessonId: anchor.id, status: 'draft' }); // attach + persist NOW
    else        { ctx.setNodeFields(ls._nodeId, { status: 'failed' }); job.failures.push(ls.id); }

    job.done++;
    if (job.stopped) { ctx.suggestExport(job, 'quota'); break; }   // export-and-resume-later

    // ----- BACKPRESSURE: stop and wait for the human before the next lesson -----
    const verdict = await ctx.awaitApproval(ls._nodeId);   // 'continue' | 'skip' | 'stop'
    if (verdict === 'stop') break;
    if (verdict === 'skip') ctx.setNodeFields(ls._nodeId, { lessonId: null, status: 'planned' });

    await sleep(PACE.betweenLessonsMs);                    // pacing between lessons
    ctx.suggestExport(job);                                // Canvas wipes LS → export is the durable artifact
  }

  if (job.failures.length)
    ctx.addToast(`Unit done with ${job.failures.length} failed item(s) — Retry available`, 'info');
}
```

The accept/skip gate sits **between** lessons by default, so the worker never races ahead of the teacher. "Generate-ahead" (race the worker while the teacher reviews) is an explicit opt-in for users who have carefully reviewed the structure — **not** the default.

---

## 4. Live Review/Refine UX

### 4.1 The principle — backpressure first; the slowness IS the pedagogy

**Default: serial-with-backpressure.** Generate lesson k → stop → the teacher Accepts/Refines/Skips → only then generate k+1. The original draft's "worker races ahead generating k+1, k+2 while you review k" is **cut from the v2.0 default**: by the time a teacher spots that lesson 2 is weak, lessons 3-5 would already be generated on the *same flawed spine*, quota already spent — and a time-pressured teacher rubber-stamps the pile exactly as fast as auto-accept. Backpressure is the feature, not a bug.

State mutations use **functional `setState`** (`setUnit(u => ...)`, as the module already does) to avoid stale-closure races. Because the driver is **host-owned** (§5), it outlives the modal: closing/reopening the Throughline modal does not orphan or kill the job, and there is no long-lived async loop holding closures over an unmounting component's state.

"Generate-ahead" (opt-in) parks at `await waitWhilePaused()` **after the current in-flight lesson finishes**, so an in-flight Gemini call is never orphaned by a pause.

### 4.2 ASCII mock — serial-with-backpressure generation view

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ 🧭  The Water Cycle            "How does Earth recycle its water?"      6 nodes · 5 links  ✕ │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  GENERATING UNIT   ▸ Lesson 3 of 5   •   up to 24 AI calls   •   8 used   •   est. ~3 min   │
│  ┃████████░░░░░░░░░░┃ 40%       [ ⏹ Stop after this step ]      ⓘ runs on YOUR Google quota   │
├───────────────────────────────────────────┬────────────────────────────────────────────────┤
│  LESSON QUEUE   role=log aria-live=polite  │   THROUGHLINE CANVAS (fills in as you accept)   │
│ ┌────────────────────────────────────────┐│    ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│ │ 1 ✅ ACCEPTED                           ││    │📊 L1    │──▶│📖 L2    │──▶│⏳ L3    │      │
│ │ 📊 Intro: Where Water Goes             ││    │ Intro   │   │ Vocab   │   │generating│      │
│ │ analysis·glossary·image                ││    │ (solid) │   │ (solid) │   │(pulsing) │      │
│ │ [Open ↗] [Refine ✎] [Regenerate ↻]     ││    └─────────┘   └─────────┘   └────┬────┘      │
│ └────────────────────────────────────────┘│                                    ▼            │
│ ┌────────────────────────────────────────┐│    ┌─ ─ ─ ─ ─┐   ┌─ ─ ─ ─ ─┐                    │
│ │ 3 ⏳ GENERATING…  resource 2/3 (outline)││    │  L4     │   │  L5     │                    │
│ │ 📚 Precipitation & Local Weather        ││    │ planned │   │ planned │                    │
│ │ ┃███████░░░░░░░┃   (no actions yet)      ││    │(dashed) │   │(dashed) │                    │
│ └────────────────────────────────────────┘│    └─ ─ ─ ─ ─┘   └─ ─ ─ ─ ─┘                    │
│  ── after it finishes, generation PAUSES ──│   Legend: solid=accepted  dashed=planned        │
│ ┌────────────────────────────────────────┐│           ⏳pulsing=generating now              │
│ │ Lesson 3 ready — review before L4 runs  ││           (reduced-motion: static "Generating…")│
│ │ [✓ Accept & continue] [Open↗][Refine✎]  ││                                                 │
│ │ [Skip] [⏹ Stop here]                     ││  ← worker does NOT start L4 until you click     │
│ └────────────────────────────────────────┘│                                                 │
└───────────────────────────────────────────┴────────────────────────────────────────────────┘
  (Quota stop:  "Rate/quota limit hit — paused. 💾 Export your unit and resume later."  [Export] )
  (Finish/Stop-with-work:  "Unit ready — 4 of 5 lessons. 💾 Export now so you don't lose it." )

PRE-FLIGHT CONFIRM (before any call fires):
  "Generate up to 5 lessons (UP TO ~24 AI calls) on YOUR Google account's Gemini quota.
   Free to your district, but shared with your other AI use today.   [ Review plan ]  [ Generate ]"
  (If a live session is active: BLOCKED — "Finish your live session first; this would compete for quota.")
```

### 4.3 Per-lesson card state machine (collapsed)

| STATE | ENTRY TRIGGER | NODE (Throughline) | CARD ACTIONS | ON EXIT → |
|---|---|---|---|---|
| `proposed` | structure proposal returns (zero AI cost) | planned, dashed | Rename · EditFocus · Reorder · Add · Delete | edits → stays; "Generate" → `queued` |
| `queued` | "Generate" confirmed | planned, dashed | Edit plan (still safe) | driver dequeues → `generating` |
| `generating` | driver runs the per-resource loop (covers refine/regenerate via a flag) | generating, pulsing | (none — show resource k/M bar) | item → `review`; null/throw → `failed` |
| `review` | the lesson's anchor item returned; announced via `alloAnnounce` polite | draft, solid + "new" pulse | ✓ Accept & continue · Open ↗ · Refine ✎ · Regenerate ↻ · Skip · Stop here | Accept → `accepted` (drives next lesson); Skip → `skipped`; Refine/Regen → `generating`(flag) |
| `accepted` *(terminal, revisitable)* | Accept | draft, solid | Open ↗ · Refine ✎ · Regenerate ↻ | Refine/Regen → `generating`(flag) |
| `skipped` | Skip | planned (lessonId:null), dashed | Un-skip · EditFocus | Un-skip → `queued` |
| `failed` | null/throw | planned + ⚠ badge | Retry ↻ (+ Refine/Regen) | Retry → `queued` |

`refining` and `regenerating` collapse into `generating` with a flag (per the critique — less surface, same behavior).

**Global queue state machine:**
```
running   → paused   : quota error (flat ~60s, then ONE retry) OR teacher Stop-here
paused    → running  : retry succeeds (quota) — otherwise → stopped
running   → stopped  : teacher Stop / quota-retry-failed → finish current step, prompt Export
running   → done     : last lesson reaches a terminal state
(any)     → interrupted (tab close/reload): on reload, any 'generating' node → failed+retryable; NO cross-session resume
BACKPRESSURE: the driver does NOT dequeue the next lesson until the current one is Accepted/Skipped.
```

### 4.4 Per-lesson actions map onto existing host capability

- **Accept & continue** = card `accepted` + node `draft` (pure local) **and** releases the driver to start the next lesson.
- **Skip** = card `skipped`, node reverts to `planned` (pure local).
- **Open** = the EXISTING `onOpenLesson(item)` → `handleRestoreView` path, including its `inLiveSession` warning — free.
- **Refine** = `handleGenerate(type, null, false, sourceText, {customInstructions: baseDirective + ' ADDITIONAL REFINEMENT: ' + teacherInstruction, historyOverride, lessonDNA})`; the returned item replaces the card's item and the node's lessonId. **Refinement is LOCAL to its own card** (see §4.5).
- **Regenerate** = identical but original directive only (new roll).

The only genuinely new host surface is status callbacks driving the node (host-owned loop — see §5). Refine/Regenerate run through the same `generating → review` cycle and the same call-counter accounting.

### 4.5 Refine-feeds-the-spine — CUT from v2.0 entirely

The original draft proposed an opt-in "apply this refinement to the rest of the unit" banner. **Cut entirely from v2.0** — not even the opt-in. It is the single biggest correctness hazard: it makes generation order-dependent and non-reproducible, can silently invalidate already-accepted later cards, and races the loop. In v2.0, **refinement is always local to its own card**; the spine that seeds future lessons is the ORIGINAL unit DNA, full stop. (Revisit in v2.5 if there's real demand — decision for Aaron, §8.)

### 4.6 Failure surfacing — ONE honest quota state

A failed card carries the host's coarse class and shows honest, actionable copy:
- **quota** (the single bucket) → "Rate/quota limit hit — the unit paused. Your work is saved; export it and resume later." (The classifier cannot tell per-minute from per-day, so we don't pretend to — no "resuming in 60s" vs "tomorrow" split.)
- **transient** → "Temporary error — Retry."
- **content/parse** → "The AI returned something unusable — Regenerate or Refine."
- **auth/config** → "Couldn't reach the AI — check your Gemini connection."

This is also where the teacher *learns* the job rides their finite, shared quota.

### 4.7 Honest live call-counter + ETA — first-class, not decoration

The control bar shows, live: *"Lesson 3 of 5 · up to 24 AI calls · 8 used · est. ~3 min."* Because image/vision resources fan out to >1 real Gemini call, the pre-flight number is **"up to N"** and counts the fan-out (§3.7); the live "used" counter counts **true API-call invocations** so it cannot read as an undercount. ETA = `(remaining resources × avg-observed-call-time) + (remaining pacing pauses) + (any quota cooldown)` — not a naive count.

### 4.8 Accessibility & style

- Queue announcements via the existing `window.alloAnnounce(msg, 'polite'|'assertive')`: polite for "Lesson N ready to review," assertive for "Rate/quota limit — paused."
- Card list container `role="log" aria-live="polite"` so SR users hear cards fill in without focus theft. Accept and global Stop are real focusable buttons.
- Spinner/progress honors `prefers-reduced-motion` → static "Generating…" + textual percentage (codebase already has this pattern).
- Stay in the pure-React `createElement` + inline-style idiom in `mind_map_module.js`: reuse its dashed `#cbd5e1` (planned), solid `#475569` (accepted), indigo `#4f46e5`/`#eef2ff` (primary), `#fef2f2`/`#991b1b` (failed), and the `tbBtn()` factory. **No Tailwind `dark:` classes — host theme arrives by prop** (per the visual-polish memory and the header theme-prop rule).

---

## 5. Host Integration

### 5.1 Ownership — HOST owns the loop (flipped from the draft)

The original draft had the *module* own the loop. **Flip it: the host owns the loop; the module is a renderer of `{queue, status}`.** Rationale (from the critique):
- The driver is a long-lived async job. If it lived in the CDN modal component, a `setShowMindMap(false)` unmount would leave it running against a dead tree, calling `setNodeFields` on unmounted state — lost work / React warnings.
- All AI plumbing (`handleGenerate`, `callGemini`, the classifier, `lessonDNA` carry-forward) already lives in the host. Keeping the loop there means abort/signal/classifier stay where they're defined — no need to thread three AI concerns *into* the module.
- A host-owned loop streaming status down is **more testable** (the module becomes a pure function of props) and is *less* total wiring than the alternative.

So: the **host** owns the proposal call, the per-lesson driver, pacing, the cancel flag, the accept-gate await, and partial-failure handling. The **module** owns the setup form, the proposal-review editor, and the live render of queue/card state — and exposes user intents (Generate, Accept, Skip, Refine, Stop) back to the host via callbacks.

### 5.2 New prop/callback contract (added to the mount at `AlloFlowANTI.txt:28147`)

All optional → feature hides if absent (graceful degradation preserved). The mount currently passes `addToast, history, currentLesson, units, onOpenLesson, inLiveSession` — **no AI capability reaches the module today**, so this is the module's first AI surface; keep it to intent callbacks, not raw AI handles.

```ts
props.onProposeUnit?: (input: {
    topic: string, gradeLevel?: string, standards?: string,
    lessonCount?: number,          // soft hint; v2.0 default cap 5, hard ceiling 8
    sourceText?: string, tone?: string, notes?: string
  }) => Promise<ProposalSchema>    // §2.2; host validates resource ids vs the 20-type catalog
  // Host impl: ONE Gemini call reusing modifyBlueprintWithAI scaffold + formatToolCatalogInline(getToolCatalog()).
  // Fail-soft: reject → module shows "couldn't draft an outline — retry" (only one cheap call wasted).

props.onGenerateUnit?: (
    plan: { lessons: LessonSpec[], unitDNA: UnitDNA, mode: 'backpressure'|'ahead' },
    callbacks: {
      onLessonStart:   (nodeId) => void,
      onLessonDone:    (nodeId, anchorItem) => void,   // host already appended items to history
      onLessonFailed:  (nodeId, errorClass) => void,   // single 'quota' bucket, etc.
      onProgress:      (used:number, estUpTo:number) => void,
      awaitApproval:   (nodeId) => Promise<'continue'|'skip'|'stop'>,  // BACKPRESSURE gate
    }
  ) => { stop: () => void }        // returns a cooperative-cancel handle (sets cancelRef; finishes current step)
  // Host impl: the §3.8 driver. Owns pacing, flat quota retry-once-then-stop, partial-failure mark-and-continue.
  // executeOneBlueprint per lesson reuses handleExecuteBlueprint's loop + carry-forward verbatim.

props.onEstimateBudget?: (proposal) => { callsUpTo:number, minutesLow:number, minutesHigh:number }
  // PURE, no AI. Counts image/vision fan-out and rounds UP (§3.7). May be computed module-side too.

props.onRefineLesson?: (nodeId, { type, refineDirective?, regenerate?:boolean }) => Promise<HistoryItem>
  // LOCAL to its card; never re-threads the shared spine (§4.5).
```

### 5.3 Engine reuse — no new generation logic

```
Refactor handleExecuteBlueprint (phase_o_misc_handlers_source.jsx:462) →
  executeOneBlueprint(blueprint, {historyOverride, dnaOverride, signal}) → { items, dnaOut, failures }
     body = lines 491-523 (the for-loop + carry-forward), returning produced items + final lessonDNA.
  handleExecuteBlueprint() = wraps executeOneBlueprint once (existing single-blueprint behavior, UNCHANGED).
  onGenerateUnit()'s driver = wraps executeOneBlueprint once per lesson.
```

`handleGenerate` appends items to host history **itself** — the driver does NOT re-push (§3.1). The `signal` param is plumbed through `executeOneBlueprint`'s signature for the future, but in v2.0 it is `null` and abort is cooperative-scheduling only (§3.3) — **do not** rewrite the dispatcher's ~20 `callGemini` sites for v2.0, and **never** write `window.__alloPdfAbortSignal`.

### 5.4 Three-surface mirror discipline + golden master FIRST

| Logical change | Files |
|---|---|
| Module (setup/proposal editor/queue renderer) | `mind_map_module.js` **+** `desktop/web-app/public/mind_map_module.js` (mirror) |
| Host driver + `executeOneBlueprint` refactor + mount props | `phase_o_misc_handlers_source.jsx` → regenerated `phase_o_misc_handlers_module.js` (+ mirror); `AlloFlowANTI.txt` (canonical) → `App.jsx` artifacts |

`AlloFlowANTI.txt` is canonical (App.jsx files are generated). **Stay entirely off `doc_pipeline`** (concurrent agent owns it). `*_module.js` generated files are often DRIFTED from `*_source.jsx` — if a single-module rebuild's diff isn't minimal, revert and hand-edit the one site in source + generated + mirror.

**Step 0 (mandatory, before any feature code): write the Throughline golden master.** `mind_map_module.js` is the **only** major module with no characterization safety net (10 other modules have one; this has none). Adding a long async driver + a state machine to an untested module is how a silent regression ships. Pin the existing v1 render + the proposal→planned-node transform first, exactly as was done for Symbol Studio / Behavior Lens.

---

## 6. Scope & Distinctiveness

### 6.1 Clash-check

| Existing thing | Relationship | Verdict |
|---|---|---|
| **Full Pack** preset | One blueprint = ~15 resources from ONE source | Generate Unit = N **lean** blueprints + a proposal step + a shared spine. **Enhances**, doesn't replicate ×N. |
| **handleExecuteBlueprint** | Executes ONE blueprint (loop + carry-forward + 1s pace) | **REUSE** via `executeOneBlueprint` refactor. No duplicate generation code. |
| **Wizard / handleWizardComplete** | Produces ONE blueprint via guided Q&A | Sibling at the *lesson* level; share the NL-refine idiom. **No second standards-lookup/grade-picker** — thread `globalSettings`. |
| **modifyBlueprintWithAI** | NL → edits one blueprint config | `onProposeUnit` reuses its prompt scaffold one level up. **Extends.** |
| **lesson-plan** resource type | A single resource WITHIN a blueprint (placed LAST) | Orthogonal. **No clash.** |
| **Throughline planned nodes** | `lessonId:null` nodes already exist | Proposal → planned nodes 1:1; accept flips planned→draft via the existing attach path. **No schema change.** |

### 6.2 v2.0 (smallest shippable) vs v2.5+

**v2.0 — IN:**
- "Generate unit" entry in the Throughline toolbar
- Setup form (topic/grade/standards/count/tone/notes), **default cap 5 lessons**, hard ceiling 8
- `onProposeUnit` → editable proposal (reorder/rename/retype/add/remove + one NL "revise outline")
- Up-front computed **"up to N calls"** budget + time estimate (counts image fan-out, rounds up)
- Planned nodes + sequence edges from the proposal (pure local transform)
- **Serial-with-backpressure** generation (default); accept/skip gate between lessons
- Per-lesson Accept / Refine (local only) / Regenerate / Skip / Retry-on-fail
- `unitDNA` spine carried lesson→lesson; per-lesson focus layered on top
- Live attach-to-node; cooperative Stop keeps partial unit; Export available throughout
- Flat quota handling (retry-once-then-stop-and-export); **export = durable artifact**
- **Throughline golden master written FIRST**

**v2.5+ — explicitly OUT of v2.0:**
- Per-lesson uploaded sub-source documents (`sourceStrategy:'own'`; schema field reserved, emitter disabled)
- Refine **re-threads** the shared spine downstream (cut entirely — biggest correctness hazard)
- "Generate-ahead" non-blocking queue (opt-in only at most; never default)
- True mid-flight abort (threading `signal` through the ~20-site dispatcher)
- Per-minute vs per-day quota differentiation (classifier can't distinguish today)
- Adaptive event-driven backoff (the `alloflow:quota-*` events don't exist)
- AI gap/coherence analysis; standards-coverage matrix; auto remediation/extension lessons; Commons publish
- Multi-source synthesis within one lesson; re-cohering neighbors after editing an accepted lesson
- `auto-accept-all` as a default (an opt-in toggle is acceptable; never the default)

---

## 7. Risks & Mitigations

| Risk | Sev | Mitigation |
|---|---|---|
| **Quality-at-scale dilution** — mass-generated lessons invert AlloFlow's UDL/UbD thesis; a time-pressed teacher rubber-stamps the pile | **HIGH (top risk)** | **Serial-with-backpressure default** (generate one, stop, await accept) — the slowness IS the gate; the **zero-cost structure review is unskippable** and load-bearing; default cap **5** lessons; lean 3-6 packs (not Full Pack ×N); UX framed as "skeleton + lean lessons you will edit," never "finished unit." Race-ahead queue **cut** from default. |
| **Runaway quota mid-class** — a one-click unit exhausts the teacher's per-minute quota right when the live class needs Gemini | **HIGH** | Up-front **"up to N calls" budget** (counts image fan-out, rounds up), live as they edit; **HARD-BLOCK when `inLiveSession`** (not a warning) or force a lighter preset; default cap 5; longer inter-lesson pause; deepen mode deferred. |
| **Long-job survivability vs Canvas LS wipe + tab close** | **HIGH** | Each completed lesson persisted via `setNodeFields`→`saveUnitToStorage` immediately; **host-owned loop survives modal unmount**; **cross-session resume NOT possible — exported `.unit.json` is the durable artifact**; on reload, `generating` nodes → failed+retryable (no orphan reattach); end-of-run + on-stop Export auto-offered, hard to miss; UX never implies cross-session resume. |
| **Honesty / "magic button" framing** | **HIGH** | "Up to N calls · runs on YOUR Google Workspace Gemini quota · shared with your other AI use today"; live counter counts true invocations (can't undercount); no "done"/"free"/"instant" copy; human is author of record. |
| **Phantom quota events** — draft's adaptive backoff used `alloflow:quota-*` events that **don't exist** | **MED (was a latent bug)** | **Cut.** Replace with flat **retry-once-then-stop-and-export** on the host's real `quota` classification. |
| **Abort doesn't kill in-flight calls** — `signal` is **not** threaded through the dispatcher | **MED** | v2.0 abort is **cooperative-scheduling only** (`cancelRef`); the in-flight step finishes and lands; UX says "Stopping after the current step." True cancellation deferred (dispatcher rewrite is net-new, ~20 sites). **Never** write the PDF-scoped `window.__alloPdfAbortSignal`. |
| **Double-add to history** — driver pushing items that `handleGenerate` already appended | **MED** | Driver does **not** push to host history; it reads the returned item only for node-attach + coherence. |
| **Partial-failure ambiguity** — a lesson returns null mid-unit | **MED** | Mark-and-continue: failed node → `failed` with retry affordance; unit stays valid + exportable; "Retry failed (N)" re-runs only failed nodes; one failure never aborts the queue. |
| **Stale-closure / unmount races** in a long async loop | **MED** | Loop is **host-owned** (outlives the modal); all card/queue mutations use functional `setState`; module is a pure renderer of streamed status. |
| **No characterization net** — Throughline has no golden master | **MED** | **Write the golden master FIRST** (Step 0), pinning v1 render + the proposal→planned-node transform, before any driver/state-machine code. |
| **Quota minute-vs-day overclaim** — classifier returns one bucket | **MED** | **One** honest "rate/quota limit hit — paused, export and resume later" state; no differentiated "60s vs tomorrow" copy. |
| **Schema validation** — model emits unknown/deprecated/duplicate ids | **MED** | Validate `suggestedResourceTypes` against the live 20-type catalog; silently drop/dedupe (mirror `modifyBlueprintWithAI`). |
| **Coherence drift** if deep mode ever ships | LOW (deferred) | When `'own'` lands in v2.5, always pass the **unit-level** `goldenThread`/`keyTerms` into every lesson — the spine is authoritative. |

---

## 8. Implementation Plan

Ordered, buildable steps. Files: `mind_map_module.js` (+ `desktop/web-app/public/` mirror), host handler in `phase_o_misc_handlers_source.jsx` (→ regenerated `_module.js` + mirror), mount props in `AlloFlowANTI.txt` (canonical; App.jsx artifacts regenerate). **Stay off `doc_pipeline`.**

**Step 0 — Throughline golden master (MANDATORY FIRST).**
Write `tests/throughline_golden.test.js` (SSR characterization), same playbook as Symbol Studio / Behavior Lens. Pin the v1 render across themes + the empty/planned-node states. **No feature code until this is green.**

**Step 1 — Extract `executeOneBlueprint` (host, zero behavior change).**
Lift the inner loop (`phase_o_misc_handlers_source.jsx:491-523`) into `executeOneBlueprint(blueprint, {historyOverride, dnaOverride, signal}) → {items, dnaOut, failures}`. `handleExecuteBlueprint` calls it once. **Verify:** byte-minimal diff, `node --check`, single-blueprint path unchanged.

**Step 2 — Add `onProposeUnit` (host).**
One Gemini call using the §2.5 prompt + `formatToolCatalogInline(getToolCatalog())` + the `modifyBlueprintWithAI` scaffold. Validate `suggestedResourceTypes` against the 20-type catalog. Fail-soft. Returns the §2.2 schema.

**Step 3 — Add the host-owned `onGenerateUnit` driver.**
The §3.8 loop: serial-with-backpressure default; flat quota retry-once-then-stop; mark-and-continue on failure; live `setNodeFields` attach; cooperative `cancelRef` Stop; functional `setState`. Confirm `handleGenerate`'s own `setHistory` append is the only history write (no double-add).

**Step 4 — Wire callbacks into the mount** at `AlloFlowANTI.txt:28147` (`onProposeUnit`, `onGenerateUnit`, `onEstimateBudget`, `onRefineLesson`), alongside existing props. All optional → feature hides if absent.

**Step 5 — Module: setup form + proposal review (`mind_map_module.js`).**
Setup form (projection of host state, cap 5). `proposalDraft` local state with reorder/rename/retype/add/remove + NL "revise outline." Live **"up to N calls"** budget banner via `onEstimateBudget`. On confirm: pure-local transform → planned nodes + sequence edges + unit header (§2.8). **Generate disabled until confirm.**

**Step 6 — Module: live review renderer + intent callbacks (§4).**
Pure renderer of host-streamed `{queue, status}`; the collapsed per-card state machine; Accept-&-continue / Open / Refine(local) / Regenerate / Skip / Stop; `awaitApproval` resolves the host's backpressure gate; classified failure copy (one quota state); `role="log" aria-live="polite"`; `prefers-reduced-motion`; theme-by-prop; reuse `tbBtn()` and the module color vocabulary. Counter labeled "up to N / N used."

**Step 7 — Module: survivability + honest copy.**
Keep a transient `_genPlan` checkpoint alongside `unitLayout` (excluded from export, like Lumen keeps synthetic/xLabel out of `_hash`); on reload, `generating` nodes → failed+retryable; hard-to-miss Export prompt at job end and on any quota stop; copy states plainly that cross-session resume is not possible and the exported file is the durable artifact; **hard-block when `inLiveSession`**.

**Step 8 — Mirror + verify.**
Apply each edit across all 3 surfaces; `node --check` every file; extend the Step-0 golden master to cover the proposal→planned-node transform and the non-default review states. Confirm no `doc_pipeline` files touched; check `git status`/`log` for concurrent-session commits before any commit.

---

## Decisions for Aaron

These are the calls only Aaron makes (the design is built to honor any of them):

1. **Build now, or after the Garry/UMaine PDF-pipeline gate clears?**
   **Recommendation: after.** The code is orthogonal (a concurrent agent owns `doc_pipeline`), but the build is genuinely large — host driver + state machine + 3-surface mirror + a golden master that doesn't exist yet — and it competes for the one scarce resource, *your focus and the project's credibility narrative*. A "generate a whole unit" button also *adds* over-promise surface precisely when the reliability gate needs the opposite. **Finalize and shelve this doc; build after the gate clears.**

2. **Default call-count cap + the live-session preset.**
   **Recommendation: default cap 5 lessons (hard ceiling 8); HARD-BLOCK generation when `inLiveSession`** (or force a 3-lesson / 3-resource / no-image lighter preset). 8×lean is already ~30-50 calls; 5 is the honest default, 8 the power-user ceiling. The live-class scenario is the one that directly harms kids in the room, so it's a block, not a warning.

3. **Auto-accept vs accept-required (the pedagogy gate).**
   **Recommendation: accept-required, serial-with-backpressure, as the default** — generate one lesson, stop, wait for Accept/Skip, then the next. The slowness is the feature. "Generate-ahead" (worker races ahead) may exist only as an explicit opt-in for users who've carefully reviewed the structure; auto-accept-all must never be the default.

4. **Single-source vs per-lesson-source for v2.0.**
   **Recommendation: shared-source only in v2.0**, with the `sourceStrategy:'own'` schema field reserved for v2.5. Per-lesson deepen doubles/triples call volume (the central quota risk) and isn't needed to deliver the core "propose → watch it generate with backpressure → review/accept → populated unit" loop.

(Two smaller engineering confirmations, not pedagogy calls: (a) v2.0 abort is cooperative-scheduling only — true mid-flight cancellation needs a ~20-site dispatcher rewrite, deferred; (b) the quota classifier returns one bucket, so there is one honest "rate/quota limit — paused" state, not a minute-vs-day split. Both are folded into the doc above.)
