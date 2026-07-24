# UnitWeave — Spatial Unit Builder Design Doc

> **Design snapshot note (2026-07-09):** This Throughline/UnitWeave design reflects the host and unit-system state at the time it was drafted. Verify current `mind_map_module.js`, unit tagging/import behavior, and live-session broadcast behavior before treating "today's unmodified app" or host file references below as current.

> Re-envisioning the `mind_map_module.js` Learning Hub tool from a student knowledge-graph into a teacher-facing spatial unit builder. **Status: design only — not approved to build. See Timing (§6) and Decisions for Aaron.**

---

## TL;DR

- **Name: Throughline** (not "UnitWeave"). The obvious teacher-vocabulary pick "Unit" *collides head-on with a feature AlloFlow already ships* — `units`/`item.unitId` tagging (`handleCreateUnit`, "Unit created" toast, a unit filter in the history panel). Shipping a second "Unit" thing next to the first is user confusion, not branding. Throughline is honest Understanding-by-Design vocabulary and dodges the collision. (Cosmetic rename only — `moduleKey="MindMap"` and the whole `window.AlloModules.MindMap` / lazy-loader / CDN-filename chain stay.)
- **Core idea: a unit file IS an existing lesson pack + one additive `unitLayout` sidecar key.** Nodes reference `history[]` lessons by `lessonId` (never copy them); edges carry pedagogical meaning. Because today's importer destructures only known keys, a Throughline file **loads in the unmodified app** (history populates, layout ignored) and round-trips as one durable, exportable file — the artifact that matters because Gemini Canvas wipes localStorage.
- **The single biggest risk: this re-implements and collides with the existing `units` feature.** Mitigation (a precondition, not a feature): Throughline must *read* `item.unitId` to seed its nodes and **enhance** the shipped unit concept, not stand up a parallel one. The design must answer "why two unit systems?" — and the answer is "it's one system; Throughline adds structure + a printable sequence on top."
- **v1 is deliberately tiny** (trimmed hard from the first draft): reference-by-`lessonId`, **two** edge types (`sequence` + `prerequisite`), empty/planned placeholder nodes, a title + essential-question header, rich node cards, and the **one feature non-spatial admins actually use — a printable topo-sorted linear outline**. Export-only. Cut: status-chip UI, the 5-way role enum, `builds-on`, the localStorage migrator, and "load whole unit into app."
- **Two host footguns must be hardened before any "Open lesson" path ships:** opening a node silently *broadcasts that lesson to connected students* in a live session (Firestore `currentResourceId` write), and "load whole unit" doesn't "replace the session" — it flips app mode + resets `studentProjectSettings`.
- **Timing: defer.** Aaron's 80% is the UMaine/Garry PDF pipeline, and Garry's "yes" is conditional on that pipeline's reliability. This touches nothing in the PDF path — which is exactly why it should wait. The only zero-risk thing worth doing now is *reserving* the additive `unitLayout` schema + dormant Commons fields so future work isn't a format break. **Recommendation: keep this a design; build after the PDF pipeline is green.**

---

## 1. The Re-Envisioned Tool

**Throughline** 🧭 — a teacher-facing **spatial unit builder**. A canvas where each node holds one already-generated lesson (a `history[]` item) plus the teacher's own note about why it lives there, and where the connections between nodes carry pedagogical meaning — teaching **sequence** and **prerequisite** dependency. A "unit" is a coherent multi-lesson arc (a *unit of study* in K-12 vocabulary). A Throughline file **is just an existing AlloFlow lesson pack with one extra `unitLayout` key**, so a unit loads in today's unmodified app, the real teacher packs in `Lesson JSONs/` become importable units once auto-laid-out, and the spatial structure round-trips as one durable, exportable file.

**Why the name changed from the obvious "Unit*" pick.** AlloFlow **already has a units feature**: `units`/`activeUnitId` state, `handleCreateUnit` (which mints ids from `Date.now().toString()`), `handleMoveToUnit`, a "Unit created" toast, and a unit filter in the history panel. Teachers already create named units and tag `history[]` items via `item.unitId`. So "UnitWeave"/"UnitForge" would put **two** overlapping "unit" concepts in front of the same teacher with the same noun — the exact confusion the rename was supposed to avoid. **Throughline** is direct Understanding-by-Design vocabulary (the enduring idea a unit returns to), reads as on-brand with the pedagogical-integrity constraint, and sits cleanly beside the coined-name siblings (LitLab, StoryForge, PoetTree).

**Disqualified:** anything with *Unit* (collides with the shipped `units` feature); anything with *Map / Mind / Concept* (collides with `KeyConceptMapView`, rendered as "Mind Map"/"Concept Map"); *Blueprint* (already the AI session-plan term, `modifyBlueprintWithAI`); *UnitForge* (both the Unit collision *and* rhymes with StoryForge). Optionally reserve **Constellation** for a future Commons *library* view, so the authoring tool and any future shared library are named separately.

---

## 2. Core Concept: the Unit

A **unit** is a coherent multi-lesson teaching arc. Three primitives:

- **Node** = one lesson. It *references* a `history[]` item by `lessonId` (it does **not** copy the lesson) and carries the teacher's planning note (`description`). A node may be **empty/planned** (`lessonId: null`) — a deliberate "I need a lesson here" placeholder, essential because backward design starts from the assessment and works back, so teachers block out a unit *before* every lesson exists.
- **Edge** = a *typed, directed* relationship between two nodes:
  - `sequence` — teach B after A (the spine).
  - `prerequisite` — A must be mastered before B (a hard gate; this is the relationship a flat list genuinely cannot express).
- **Unit** = the whole canvas: a lightweight header (title + essential question) over the graph of nodes and edges.

**What spatial relationships mean.** One convention is load-bearing: **horizontal axis (X) = teaching order** (scope-and-sequence, read left-to-right). The derived outline (§5.4) sorts primarily by `node.x`. Vertical placement (Y) is free for *non-sequential* meaning — clustering by theme/strand. This keeps the spatial claim honest (reading left-to-right *is* reading the lesson sequence) without a grid or any contested "learning styles" framing.

**A unit is a lesson pack + spatial layout — and it builds on the existing units feature.** The pack already bundles lessons in `history[]`; the shipped `units` feature already lets teachers tag those lessons into named groups. Throughline does **not** re-bundle and does **not** invent a second grouping concept — it reads `item.unitId`, treats an existing named unit's lessons as the seed set, and adds a `unitLayout` sidecar that records where each lesson sits and how the lessons relate. The pack is the **inventory**; the existing unit tag is the **grouping**; Throughline is the **structured plan + printable sequence** over that group.

---

## 3. Data Model

### 3.1 The `unitLayout` sidecar (EXTEND, do not embed)

**Verdict: extend the pack with one additive top-level key. Do NOT embed lesson copies in nodes.** Confirmed greenfield — zero `unitLayout` references in the tree. Decisive reasons:

- **Forward-compatible by construction.** `handleLoadProject` destructures only the keys it knows (`mode`, `history`, …); an unknown `unitLayout` key is silently ignored. A `{mode, history:[...], unitLayout:{...}}` file **loads in today's unmodified app**. An embed-the-lesson-in-the-node file would not be a pack and the existing importer couldn't read it.
- **Zero new ingest.** Open-one reuses `handleRestoreView(history[i])`; load-all reuses `loadProjectFromJson(parsed)`. Nodes hold `lessonId` references, not payloads.
- **No duplication/drift.** A single quiz item is ~11KB; embedding copies inside nodes creates two desyncing sources of truth. References can't drift.
- **Instant corpus.** The real teacher packs (`Lesson JSONs/`, `examples/`) become importable units the moment you auto-layout their `history[]`.
- **Gate-safe.** `dev-tools/check_sample_lessons.cjs` (requires `mode` + `history`; each item `id/type/data`) still passes — `unitLayout` is purely additive.

### 3.2 Node & edge shape

```
node:  { nodeId, lessonId|null, x, y, description, role, status, category|null }
edge:  { from, to, type }     // from/to = nodeId; directed

type   ∈ sequence | prerequisite                 // v1: TWO types only
role   : free-text/2-value in v1 (dormant 5-way enum in schema; see §7)
status : DERIVED in v1 (lessonId:null ⇒ planned, else draft) — no manual UI
```

`lessonId` references a `history[]` item's `id`. On round-trip reimport, `handleLoadProject` repopulates `history` with the **same ids** and every node re-resolves.

### 3.3 Two failure modes the node guard must handle

1. **Missing `lessonId`** (hand-edited or layout-only file): render "lesson missing," disable Open. This reuses the existing defensive posture of `normalize()` dropping dangling edges (`mind_map_module.js:79-82`).
2. **Resolvable-but-unrenderable `type`** (the one the first draft missed): `handleRestoreView` routes purely on `item.type` (`setActiveView(item.type)`). If a unit references a lesson whose `type` this build doesn't render, the `lessonId` resolves fine — so the "missing" guard does **not** fire — but Open lands on a blank view. **Before enabling Open, validate `item.type ∈ known render types`; otherwise show "this lesson type isn't supported in this version" and disable Open.**

### 3.4 Versioning & normalize (NO migrator)

- **Bump the localStorage key** to `alloflow_throughline_v1`. **Do not migrate** the old `alloflow_mindmap_v1` data: the old shape is `{id,x,y,text}` student knowledge-graph doodles with **no `lessonId`** and no relation to any `history` item. Migrating them (`text→description, lessonId:null`) yields a canvas of orphan "planned" nodes labeled with random student concept-words — that is noise injection, not data preservation. Just version-gate and ignore the old key. (Canvas wipes localStorage anyway.)
- **`normalize()` gains:** tolerate missing `role/status/category` (default), coerce any untyped edge to `sequence`, mark nodes whose `lessonId` doesn't resolve against `props.history` as `lesson-missing`, and mark nodes whose resolved type isn't renderable as `type-unsupported`.
- **Stamp `unitLayout.generator` + `minAppSchema`** on export and warn (don't crash) on mismatch when a newer file opens in an older build — this is the compat hook that catches the unrenderable-type skew above.

### 3.5 Auto-layout a plain pack / existing unit

When a file (or any teacher pack) has **no** `unitLayout`, derive one as a non-persistent view: place each `history[]` item left-to-right in creation order (a sensible first sequence). If `item.unitId` tags exist, group by them first (so the existing units feature seeds clusters). **Persist the derived layout only on export** — never mutate `history` order.

### 3.6 Concrete annotated example

```jsonc
{
  "mode": "independent",                       // handleLoadProject reads this — UNCHANGED pack key
  "history": [                                 // the lesson payloads — UNCHANGED pack key
    { "id": "h_a1", "type": "analysis",     "title": "Source Intro",    "meta": "5th Gr · Analysis · English", "unitId": "u_1718...", "data": { /* ... */ } },
    { "id": "h_b2", "type": "glossary",     "title": "Key Terms",       "meta": "5th Gr · Glossary · English",  "unitId": "u_1718...", "data": [ /* ... */ ] },
    { "id": "h_c3", "type": "concept-sort", "title": "Sort the Stages", "meta": "5th Gr · Concept Sort",        "unitId": "u_1718...", "data": { /* ... */ } },
    { "id": "h_d4", "type": "quiz",         "title": "Exit Ticket",     "meta": "5th Gr · Quiz (5MC/1Ref)",     "unitId": "u_1718...", "data": { /* ... */ } }
  ],
  "responses": {}, "probeHistory": [],         // session state — kept for the teacher's own reuse (strip before any Commons share, v2)

  "unitLayout": {                              // ◀── THE ONLY NEW KEY. Unknown to today's app ⇒ ignored on load.
    "schemaVersion": 1,
    "generator": "throughline@1",              // compat-check hook (also encodes the tool name)
    "minAppSchema": 1,                         // warn-on-mismatch when a newer file opens in an older build
    "unitId": "tl_8f3a2c91",                   // stable identity (Commons-forward; dormant in v1)
    "sourceUnitId": "u_1718...",               // ◀ links to the EXISTING units feature's item.unitId
    "title": "The Water Cycle",
    "essentialQuestion": "How does Earth recycle its water?",
    "author": "",                              // attribution, NOT PII-required (default '' or studentNickname)
    "license": null,                           // optional, dormant
    "parentUnitId": null, "forkedFrom": null,  // fork-and-suggest slot, dormant in v1
    "createdAt": "2026-06-13T15:00:00Z",
    "updatedAt": "2026-06-13T15:00:00Z",
    "nodes": [
      { "nodeId": "n1", "lessonId": "h_a1", "x": 80,  "y": 200, "description": "Hook — surfaces prior knowledge.",       "role": "", "status": "draft",   "category": null },
      { "nodeId": "n2", "lessonId": "h_b2", "x": 320, "y": 200, "description": "Vocab strand — gates the exit ticket.",  "role": "", "status": "draft",   "category": null },
      { "nodeId": "n3", "lessonId": "h_c3", "x": 560, "y": 200, "description": "Hands-on sort of the stages.",           "role": "", "status": "draft",   "category": null },
      { "nodeId": "n4", "lessonId": "h_d4", "x": 800, "y": 200, "description": "Checks the 3 key terms before the lab.", "role": "evidence", "status": "draft", "category": null }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "type": "sequence" },
      { "from": "n2", "to": "n3", "type": "sequence" },
      { "from": "n3", "to": "n4", "type": "sequence" },
      { "from": "n2", "to": "n4", "type": "prerequisite" }   // Key Terms must be mastered before the Exit Ticket
    ]
  }
}
```

> **Note the dormant fields.** `unitId / author / license / parentUnitId / forkedFrom / createdAt / updatedAt` are zero-cost additive keys that make a private unit forward-compatible with a future Commons object **without a format break**. They are inert placeholders in v1 — not a promise of a moderation/licensing/review service (that is a future *staffed human* function, not a code feature).

---

## 4. Host Integration

Zero new host *functions* — only a wider prop contract on the existing `CDNModuleGate` block. Every callback reuses a host function that already exists and is already passed to other modules.

### 4.1 New props (gate block ~AlloFlowANTI.txt:28119)

**Current (5 props):** `isOpen, onClose, addToast, studentNickname, t`.

**Proposed v1** — change `displayName`/`icon`, add props that reuse existing host wires. **Keep `moduleKey="MindMap"`** (§8).

```jsx
<CDNModuleGate moduleKey="MindMap" isOpen={showMindMap} onClose={() => setShowMindMap(false)} icon="🧭" displayName="Throughline" t={t}>
    {(MindMap) => React.createElement(MindMap, {
        isOpen: true,
        onClose: () => setShowMindMap(false),
        addToast,
        studentNickname,
        t,
        // ── NEW (v1) ──
        history: Array.isArray(history) ? history : [],   // read-only: resolve lessonId, drive picker, seed from item.unitId, show titles
        currentLesson: generatedContent || null,          // the lesson the teacher currently has open ("Attach current")
        inLiveSession: !!(isTeacherMode && activeSessionCode),  // ◀ so the module can WARN before a broadcasting Open
        onOpenLesson: (item) => {                          // open ONE node's lesson
            if (!item || !item.id) { addToast('Lesson not found in this unit.', 'info'); return; }
            setShowMindMap(false);                         // close unit modal FIRST so it isn't stacked over the restored view
            setTimeout(() => { handleRestoreView(item); }, 50);   // 50ms = host's commit-unmount-then-restore idiom
        },
        // onLoadUnit deliberately OMITTED in v1 (see §4.2(3) and §6) — export-only.
    })}
</CDNModuleGate>
```

`onOpenLesson` is wrapped **host-side** (closure over `setShowMindMap` + `handleRestoreView`). No new host *function* is defined — `handleRestoreView` and `loadProjectFromJson` already exist; only `generatedContent`/`history`/the live-session flag are newly *exposed* to this gate.

### 4.2 The four core flows (V1 vs later)

**(1) Attach a lesson to a node**
- (a) *Attach current open lesson* — **V1**: reads `currentLesson`, writes `node.lessonId = currentLesson.id`. Guard with a `type` allowlist so a non-lesson view (e.g. a STEM Lab tool) isn't attachable.
- (b) *Pick from history* — **V1**: a picker over the `history` prop (title + type badge + meta) → sets `lessonId`. If `item.unitId` exists, default-filter the picker to the active unit.
- (c) *Bulk-add an existing unit / pack* — **V1**: read `history[]` (optionally filtered by a chosen `unitId`) and auto-place nodes left-to-right (§3.5). This is the killer one-click path — it turns an existing tagged unit into a Throughline instantly.
- (d) *Generate a new lesson for a node* — **V2** (needs deep-linking the generator).

**(2) Open a node's lesson** — **V1**, *hardened*: click Open → resolve `lessonId` via `history` → validate `type ∈ renderable` (§3.3) → **if `inLiveSession`, confirm** ("You're in a live class session — opening this will show the lesson to connected students. Continue?") because `handleRestoreView` writes `currentResourceId` to Firestore (broadcast). Only then `props.onOpenLesson(item)`. The broadcast is already type-gated by `TEACHER_ONLY_TYPES`, but a teacher *previewing* during class is exactly the footgun, so the confirm is required, not optional.

**(3) Save / load whole unit**
- *Save (export)* — **V1**, client-only: serialize `{mode:'independent', history:[items referenced by nodes], unitLayout:{...}}` to a file via the existing `exportJSON` path. **Subset `history` to only referenced lessons** so unit files stay small and self-contained.
- *Load whole unit into app* — **NOT in v1.** Verified: this path does far more than "replace the session" — `handleLoadProject` flips `setIsTeacherMode(true)` + `setIsIndependentMode(true)`, **resets `studentProjectSettings` wholesale**, and fires a "Welcome back" toast. A teacher in student-link/parent mode would be silently switched. Export-only in v1; the file is the durable value by this doc's own argument. If added in v1.1, the confirm must spell out *mode switch + settings reset*, not just "replaces session."

**(4) Round-trip** — works in V1 because `lessonId == history.id` is stable; the dangling-reference and unrenderable-type guards (§3.3) handle hand-edited/version-skewed files.

> **Cross-author merge caveat (latent, v2).** `id`s come from `uid()`/`Date.now()` generators, so merging two units authored on two machines **can** produce duplicate `history` ids → a node could resolve to the wrong lesson silently. This is fine for v1 (single-author round-trip) but is a real hazard the moment Commons sharing/merging exists. Mitigation when that day comes: namespace `lessonId` by source `unitId` or content-hash on merge. Flag now; the dormant Commons fields are a promissory note this caveat must be paid before honoring.

### 4.3 3-surface mirror discipline

```
[ ] AlloFlowANTI.txt                          gate block ~28119  +  launcher card  +  i18n strings
[ ] desktop/web-app/src/AlloFlowANTI.txt     same blocks
[ ] desktop/web-app/src/App.jsx              same blocks (built artifact)
[ ] mind_map_module.js  ×3                     root + desktop/web-app/public/ + desktop/web-app/build/
                                               → publish to alloflow-cdn.pages.dev (lazy loader AlloFlowANTI:4589)
[ ] view_learning_hub_modal_source.jsx  + its 2 generated/mirror copies (launcher card text)
```

Per MEMORY, the `*_module.js` generated/mirror copies frequently **drift** from source — verify byte-consistency across all three host trees and the module's three copies before deploy, and stage your own paths explicitly (concurrent sessions share one tree). The feature is **not live until the CDN copy is published**.

---

## 5. Spatial UX

### 5.1 Node card (HTML overlay over the SVG edge layer)

Switch the node from a 28px SVG `<circle>` to a rich, absolutely-positioned HTML card (`left:node.x, top:node.y`) in an overlay div, with edges remaining in the SVG layer beneath. The module already renders an absolute overlay for its empty state (`mind_map_module.js:425-432`), so this dual-layer pattern is established. Both layers read the same `node.x/node.y` in the same scroll container so edges stay pinned during drag. The type badge **reuses the canonical `typeIcons` map** (`view_misc_panels_module.js:734-751`: quiz 📝, glossary 📖, outline 📋, lesson-plan 📚, concept-sort 🗂️, sentence-frames 💬, simplified ✨, persona 🎭, timeline 📅, adventure 🎮, image 🖼️, faq ❓, default 📄) so badges match the rest of AlloFlow.

```
POPULATED NODE                              EMPTY / PLANNED NODE (lessonId: null)
+--------------------------------------+    +········································+
| [📝 QUIZ]                       ⋮   |    :  [+]  Attach a lesson               :
|--------------------------------------|    :                                    :
|  Exit Ticket                         |    :  "Need a hook that surfaces prior  :
|  "Checks the 3 key terms before we   |    :   knowledge about the water cycle" :
|   move to the lab. Gates Lesson 5."  |    :                                    :
|  5th Gr · Quiz (5MC/1Ref) · English  |    :  [ From this session ] [ Mark plan]:
|--------------------------------------|    +········································+
|     [ Open lesson ↗ ]   [ Edit ]     |       (grey hollow = planned)
+--------------------------------------+
  ◦ prereq-in (dashed)   sequence-out ▸
```

`Open lesson ↗` → the hardened flow in §4.2(2). **No status chip and no role badge in v1** — `status` is derived (hollow = planned vs filled = has lesson) and `role` is an optional free-text field, not a chip taxonomy. Disabled-with-tooltip when the lesson is missing or its type is unsupported.

### 5.2 Edge semantics (typed, directed — the load-bearing differentiator)

Two edge types in v1, visually distinct via one shared `<marker>` arrowhead in `<defs>` plus `strokeDasharray`:

```
sequence:     solid  arrow   stroke #475569  width 2     markerEnd url(#tl-arrow)
prerequisite: dashed arrow   stroke #d97706  width 2     strokeDasharray "6 4"  markerEnd url(#tl-arrow)
```

After "Connect" picks two nodes, pop a 2-way relation picker **defaulting to `sequence`** so the fast path is one extra click. A legend row documents the two. (`builds-on` is deferred to v1.5 — it carried almost no decision weight and added a third legend/picker entry for little signal.)

### 5.3 Canvas (X = teaching order)

```
Essential Question: "How does Earth recycle its water?"            (5th Grade · 8 lessons)
────────────────────────────────────────  teaching order ▸  ────────────────────────────────

 [📊 ANALYSIS ]          [📖 GLOSSARY ]          [🗂️ CONCEPT-SORT]        [📝 QUIZ      ]
 | Source Intro |──seq──▶| Key Terms   |──seq──▶ | Sort the Stages|──seq──▶| Exit Ticket |
 +-------+------+        +------+------+         +-------+--------+        +------+------+
                                :                                                :
                                :······· prerequisite (dashed, amber) ···········:
                                :        (Key Terms must be mastered before Exit Ticket)

Legend:  ──▶ solid = teach next      - - -▶ dashed = prerequisite gate
```

### 5.4 Derived linear outline (printable scope-and-sequence — IN v1, the keystone)

Compute an ordered list: topological-sort the DAG of `sequence` + `prerequisite` edges, breaking ties / placing disconnected nodes by `node.x` then `node.y`. On a cycle (teacher draws A→B→A) show a soft warning ("this unit has a loop — sequence is ambiguous here") and fall back to x-order rather than crashing.

```
UNIT OUTLINE — "How does Earth recycle its water?"  (5th Grade)
1. Source Intro          [analysis]
2. Key Terms             [glossary]       prereq-for #4
3. Sort the Stages       [concept-sort]
4. Exit Ticket           [quiz]           ⚠ needs #2 mastered first
5. Venn: Solid vs Liquid [outline]
[ Print / Copy scope & sequence ]
```

**This is the keystone of v1.** It is the single feature non-spatial teachers and admins actually use (a familiar table-of-contents/scope-and-sequence artifact), is trivially printable (`window.print` / copy-to-clipboard) — durable across Canvas's localStorage wipe — and it encodes the **two** things the existing flat units/notebook genuinely cannot: a *taught order* and a *prerequisite dependency*. **It and `prerequisite` edges are the load-bearing justification for the whole tool; if they were cut, "this is just a prettier notebook" would be a fair kill.**

### 5.5 Build workflow (end-to-end)

1. **New unit** → prompt title + essential question (→ `unitLayout` header).
2. **Seed from an existing unit** → "Add all lessons from \<unit\>" pulls the `item.unitId`-tagged lessons in, auto-laid-out left-to-right *(or "Add all current lessons" for an untagged session)* — the one-click path.
3. **Attach/adjust** → per-node picker over `history[]` for anything not auto-placed; drop empty/planned nodes for lessons not yet generated.
4. **Connect** in sequence (typed edges, default `sequence`; add `prerequisite` gates where they matter).
5. **Annotate** `node.description`.
6. **Export** one file. Persistent in-UI message that **the exported file is the durable artifact** (Canvas wipes localStorage) — and a *blocking* nudge if a save-to-localStorage attempt fails on quota (see §3.4 / §7).

---

## 6. Pedagogy & Distinctiveness

**Framing: Understanding by Design / backward design — not mind-mapping, not learning styles.** The anchor is Wiggins & McTighe: desired results → acceptable evidence → learning plan. The unit header carries the essential question; nodes carry the teacher's intent and (optionally) a one-bit "is this assessment evidence?" `role`. A *future* UDL-coverage read-out (which means of Representation/Engagement/Action the node *types* touch) is legitimate **because it is descriptive of artifacts already in `history[]`** and makes no contested "styles" claim — but it is **v1.5**, not v1. **Explicitly avoid** VAK / "visual learners" / multiple-intelligences-as-modality; use scope-and-sequence / learning-progression / prerequisite language for edges.

**The honest clash-check — including the one the first draft missed.** The **altitude rule** resolves most of it: *Throughline is the only tool whose unit-of-composition is the whole-lesson (a `history` item) and whose output is a taught **sequence with dependencies**; every other tool composes things that sit **inside** a lesson.* The critical addition is the **existing `units` feature** — the real baseline:

| Tool | Overlap? | Keep-distinct |
|------|----------|---------------|
| **Existing `units` / `item.unitId`** (shipped: `handleCreateUnit`, history filter) | **YES — THE real baseline** | The shipped feature is a *flat folder/tag* — group + chronological list, no order, no dependency, no per-node intent. Throughline is **not a parallel system**: it *reads* `item.unitId` to seed nodes and **adds** typed `sequence`/`prerequisite` edges + a printable topo-sorted outline on top. One unit concept, two altitudes (tag vs structured plan). |
| **Save/Load lesson pack** | PARTIAL | Pack = INVENTORY (flat, all items). Unit = the structured plan over it. The unit *file* **is** a pack + `unitLayout`, so same artifact at two altitudes, not rivals. |
| **lesson-plan generator** (`lesson-plan` history type) | **NO** | A lesson-plan is ONE node's payload (single-period doc — the real water_cycle pack has a `lesson-plan` item beside the quiz/glossary). Throughline **arranges/annotates, never generates** a plan. |
| **History / Notebook panel** | PARTIAL (same data) | Notebook = capture/restore-one. Throughline = curate a SUBSET into ordered structure; opening reuses `handleRestoreView`. |
| **KeyConceptMapView** | **NO** | Stateless render of CONCEPTS inside one lesson (Bezier branches). Throughline nodes = whole LESSONS. Different altitude — and the reason the name avoids "Map/Concept." |
| **Visual Organizers** (Frayer/fishbone/tchart/Venn) | NO | Within-lesson graphic organizers; live inside a node as payload. |
| **Research Hub** | NO | Inquiry workspace; produces artifacts. A Research Hub output could *become* a node. |
| **AlloHaven** | NO | Separate surface, not a lesson-sequencer. |

**Why more than a saved pack + the existing unit tag + a notes field?** Honestly, only two things, and they are enough: (1) **prerequisite dependency as data** — "B assumes A," which neither a flat list nor the `unitId` tag can express; and (2) **a printable topo-sorted teaching order** that survives Canvas's localStorage wipe. Per-node planning notes and a title/EQ header are *nice* but not, by themselves, a reason to build a tool. **So v1 is justified strictly by `prerequisite` edges + the derived outline, layered on the existing units feature — and scoped to little else.** The spatial canvas is the *expressiveness* layer; it is the weakest justification and the biggest cost, and it earns its place only because it is the natural authoring surface for those two load-bearing artifacts.

**Commons forward-compat (north-star).** Bake the dormant identity/provenance fields into `unitLayout` v1 (§3.6) so a private teacher unit can later become a forkable Commons object **without a format break**. Build **none** of the Commons machinery (review/voting/moderation/sync/sharing). Be honest with Aaron: moderation/licensing/safety is a future **staffed human function**, so these fields are inert placeholders, not a promise of a service. **Privacy:** a unit file inherits the pack's full session state (`responses`, `probeHistory`, `interventionLogs`, `externalCBMScores` = student data); a local teacher export keeping it is fine, but any future Commons share **must strip it** — a v2 requirement, flagged now, and a precondition of the cross-author merge caveat above.

---

## 7. Phased Roadmap

**v1 — genuinely minimal ("arrange existing lessons into an ordered unit with dependencies, annotate, export/reimport as one file"):**
- Rename to Throughline (display only; keep `moduleKey`/global/filename — §8).
- Node shape `{id,x,y,text}` → `{nodeId,lessonId,x,y,description,role,status,category}`; empty/planned nodes (`lessonId:null`). `status` **derived** (no manual chip UI); `role` an optional free-text field (dormant 5-way enum reserved in schema).
- Attach: *current open lesson* + *pick from history* + *bulk-add an existing unit (`item.unitId`) / all current lessons*.
- Rich node cards (canonical type badge, description, meta, Open lesson) over SVG edges.
- **Two typed directed edges** (sequence + prerequisite), default sequence.
- Lightweight header: **title + essential question** only (no desired-results/grade-band/standards form in v1).
- **Derived linear outline** (topo-sort, cycle-safe, print/copy) — the keystone.
- **Export only** = subsetted pack + `unitLayout` (one file); auto-layout packs/units lacking `unitLayout`. **No "load whole unit into app" in v1.**
- localStorage persistence of **`unitLayout` only** (never the subsetted `history`); version-gate the old key — **no migrator**; persistent UI message that the **export file** is the durable artifact, and a **blocking nudge on quota-save-failure** (the existing `saveToStorage` swallows quota errors silently — fix that for this tool).
- Guards: dangling-`lessonId` → "lesson missing"; resolvable-but-unrenderable `type` → "unsupported in this version" (both disable Open); `generator`/`minAppSchema` compat warn.

**v1.5 (additive, no format break):** the 5-way `role` enum + UDL-coverage read-out + backward-design gap hint; manual status promotion + "N of M ready" readout; `builds-on` edge type; full UbD header (desired results, grade band) + standards roll-up from `history[].config.standards`; "load whole unit into app" with the honest mode-switch confirm; swimlanes (week/phase) toggle; minimap/pan-zoom; category coloring; "add lesson to unit" directly from the generator.

**v2+ (heavier / AI / Commons, after the PDF pipeline):** AI unit-coherence/gap/sequence analysis (gated, default OFF); auto-sequence from prerequisites; generate-into-an-empty-node; assign-unit-to-students/push to session; selective per-node merge (with the **cross-author id-collision fix** as a precondition); **Commons** (share *with mandatory student-data strip*, fork-and-suggest, fact-check/review — requires staffed moderation).

**Explicitly OUT of v1:** any AI call; assign-to-students; generate-into-node; "load whole unit into app"; the Commons review/voting/moderation/sync/share path; the `alloflow_mindmap_v1` migrator; status-chip UI; the 5-way role enum; `builds-on`; embedding lesson copies in nodes; renaming `moduleKey`/global/CDN filename.

---

## 6.5 / Timing — honest, vs the PDF pipeline

**This is a side quest, and right now it should stay a design.** Aaron's stated 80% is the UMaine/Garry PDF remediation pipeline, and Garry's stewardship is *conditional on that pipeline's reliability* ("doesn't work every time"). Throughline touches **nothing** in the PDF path — the first draft framed that as a virtue ("clean seam"); it is more honestly a reason to **wait**, because the real cost isn't the ~6 host lines:

- the **3-host × 3-module mirror discipline** (MEMORY repeatedly documents these copies drift and eat hours to reconcile),
- a **CDN publish** step (not live until `alloflow-cdn.pages.dev` is updated),
- golden-master / `node --check` / gate runs,
- and the genuinely hard parts (node-card overlay + drag math, the two edge-type UX, topo-sort + cycle handling, and the host-coupling footguns in §4.2).

That is several evenings with a long verification tail in a tree shared by concurrent sessions — and every hour here is an hour not spent on the thing UMaine's "yes" depends on. **Recommendation: do not start v1 now.** Honor the design's own gate: *gate further investment behind PDF-pipeline reliability being green.* The only thing worth doing in a spare hour is the two zero-risk, forward-compat moves — **reserve the additive `unitLayout` key + dormant Commons fields** — which cost nothing and prevent a future format break. Stop there.

---

## 8. Implementation Plan

Ordered steps for an engineer **once Aaron green-lights a build**. The rename is **cosmetic at the wiring layer**; the `moduleKey`/global/CDN-filename chain is load-bearing and stays.

**Step 0 — Branch & stage discipline.** Working tree is shared by concurrent sessions; stage only the paths below by name; do not push others' commits. `node --check` every edited `.js`; run `npm test` (golden masters) before any deploy.

**Step 1 — Module data model (`mind_map_module.js`, ×3 copies + CDN).**
- New `STORAGE_KEY = 'alloflow_throughline_v1'`; **no migrator** — version-gate and ignore `alloflow_mindmap_v1`.
- Persist **only `unitLayout`** to localStorage (never the subsetted `history`); make the existing quota-swallow in `saveToStorage` raise a **blocking UI nudge** for this tool.
- Extend `emptyState()`/`normalize()` for the new node/edge fields; default missing `role/status/category`; coerce untyped edges to `sequence`; mark unresolved-`lessonId` nodes `lesson-missing` and resolvable-but-unrenderable-type nodes `type-unsupported` against `props.history`.
- New ID field `nodeId` (keep `uid()`); `lessonId` is the reference; stamp `generator`/`minAppSchema` on export.

**Step 2 — Module UI.**
- Dual-layer render: edges in SVG (one `<marker>` arrowhead in `<defs>`, `strokeDasharray` per type); nodes in an absolutely-positioned HTML card overlay sharing the scroll container.
- Card: canonical type badge (lift the `typeIcons` map — ideally move it to `utils_pure_module.js` so the history panel and Throughline share one source of truth, else copy with a drift note), `description`, `meta`, Open/Edit. **No status chip / role badge.** Open disabled-with-tooltip when missing or unsupported.
- Empty/planned card: "From this session" (picker over `props.history`, default-filtered by active `unitId`) + "Mark planned."
- **2-way** typed-edge relation picker on connect (default sequence); legend row.
- Header bar (title + essential question).
- Derived linear-outline panel (topo-sort, cycle warning, print/copy) — the keystone.
- `exportJSON` → write `{mode:'independent', history:[subset referenced by nodes], unitLayout:{...}}`; populate dormant Commons fields; generate `unitId`/`createdAt` on first export, preserve on re-export.
- `importJSON` → detect a pack (`history[]`): if `unitLayout` present, render it (compat-warn on `minAppSchema` mismatch); else auto-layout (group by `item.unitId` if present). Confirm-before-replace (existing pattern at `mind_map_module.js:205`).
- **No "Open whole unit in app" button in v1.**

**Step 3 — Host gate (`AlloFlowANTI.txt` :28119; mirror to `desktop/web-app/src/AlloFlowANTI.txt` and `desktop/web-app/src/App.jsx`).**
- Change `displayName="Mind Map"` → `"Throughline"`, `icon` → `🧭`.
- Add v1 props from §4.1: `history`, `currentLesson`, `inLiveSession`, `onOpenLesson` (host-side wrapper). **Omit `onLoadUnit`** (export-only v1). **Keep `moduleKey="MindMap"`** — coupled to `window.AlloModules.MindMap`, `__alloLazyMindMap` at :4589, the CDN filename, and `setShowMindMap` at :4196-4197; renaming that chain is a separate, riskier refactor across CDN + 3 mirrors + lazy loader and is **not needed** to ship.

**Step 4 — Launcher card (`view_learning_hub_modal_source.jsx` :48-56 + its 2 generated/mirror copies).**
- `🧩` → `🧭`; `mindmap_title` default `'Mind Map'` → `'Throughline'`; `mindmap_desc` → e.g. *"Arrange your lessons into a connected teaching sequence and export the whole unit as one file."* Keep the `setShowMindMap` prop name. Regenerate the module copy via its build path or hand-edit + verify minimal diff (generated modules drift per MEMORY).

**Step 5 — i18n.** Add new keys (`throughline.*`, `learning_hub.throughline_*`) with English defaults; keep old `mindmap.*` keys as aliases for one release so nothing breaks mid-migration. (Lang-pack translation of new strings is a later sweep.)

**Step 6 — Gates.** `dev-tools/check_sample_lessons.cjs` is unaffected (`unitLayout` additive). Add an **optional** validator: every `unitLayout.nodes[].lessonId` resolves to a `history[]` id and every resolved `type` is renderable; **warn (don't fail)** on dangling/unsupported. Keep render-ref + lang-json gates green.

**Step 7 — Build & mirror.** No new `build.js` wiring for the host gate (inline JSX compiled into App.jsx via the existing pipeline). For the module: update all three `mind_map_module.js` copies (root + `desktop/web-app/public/` + `desktop/web-app/build/`) and **publish to `alloflow-cdn.pages.dev`** — the host lazy-loads it on first open (AlloFlowANTI:4589), so the feature is not live until the CDN copy is published. Verify byte-consistency across the three host trees and three module copies.

---

## Decisions for Aaron

These are the calls only you can make; the rest is mechanical once you choose.

1. **Build now, or keep it a design until the PDF pipeline is green?** Strong recommendation: **keep it a design.** Garry's "yes" rides on PDF reliability; this is several evenings with a drift-prone mirror/CDN tail and touches nothing in that path. If you want *anything* now, take only the zero-risk move: reserve the additive `unitLayout` key + dormant Commons fields, and stop.

2. **Name: Throughline (recommended) — confirm.** The obvious "Unit*" pick collides with the existing `units`/`item.unitId` feature, so it's off the table unless you intend Throughline to **absorb/replace** that feature rather than sit beside it. If you want to keep "Unit" framing, that's a bigger decision (one unit system, not two). Optionally reserve **Constellation** for a future Commons library view. Lock the name before `schemaVersion` ships — `generator` encodes it and becomes a Commons compatibility surface.

3. **Reconcile-vs-coexist with the existing `units` feature.** Recommendation: Throughline **reads `item.unitId`** and enhances the shipped unit concept (one system, two altitudes). Confirm you don't want a separate file-based unit concept standing parallel to the in-app one — that would be the redundancy this whole design is trying to avoid.

4. **Launch surface.** The gate currently passes *student* props (`studentNickname`); the new framing is teacher-facing. Confirm Throughline stays in the Learning Hub slot, or moves to a teacher surface.

5. **The live-session broadcast guard (§4.2(2)).** Opening a node's lesson during a live class **shows it to connected students** (Firestore `currentResourceId` write; already type-gated by `TEACHER_ONLY_TYPES`). v1 wraps Open in a confirm when `inLiveSession`. Confirm that's the behavior you want — or whether Throughline should always use a non-broadcasting preview path instead.

6. **1 node = 1 lesson, firm?** Recommended (keeps the linear outline simple). Confirm you don't want multi-lesson "station" nodes.

7. **Stable `unitId`/timestamps** owned by the module on first export (recommended), or a host helper — so re-exports preserve Commons identity. Minor, but pick one before the first export ships.
