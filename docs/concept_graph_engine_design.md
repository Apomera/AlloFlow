# A reusable ConceptGraph engine + can Gemini work in 3D?

Two questions from Aaron: (1) can the Throughline/concept-map spatial logic be **extracted into a
reusable visual-support format**, and (2) **can Gemini operate in a 3D plane**, or is 2D a hard
limitation? Both answered below, grounded in the actual code (every claim cited + spot-verified).

---

## 1. Is 2D a hard Gemini limitation? — No. It's an AlloFlow-side choice.

AlloFlow's AI concept map is a **two-stage pipeline**, and the model never does geometry as its main job:

- **Stage 1 — semantic graph, no coordinates.** Gemini is asked for
  `{ "main": …, "branches": [{ "title", "items", "connectsTo": [idx] }] }`
  ([generate_dispatcher_source.jsx:1560-1575](../generate_dispatcher_source.jsx)). `connectsTo` is a
  *relationship* (a 0-based branch index), not a position. `structureType` is added by JS afterward.
- **Stage 2 — JS computes every x/y.** `handleInitializeMap`
  ([concept_map_handlers_source.jsx:14-342](../concept_map_handlers_source.jsx)) switches on
  `structureType` and hard-assigns coordinates per layout family (Venn token-bank, Cause/Effect zones,
  Problem/Solution top-down, Structured-Outline columns, Flow-Chart, hub-and-spoke). The model supplies
  *none* of these numbers.
- **The one place Gemini emits coordinates** is an *optional* "beautify" pass, `handleAutoLayout`
  ([concept_map_handlers_source.jsx:344-429](../concept_map_handlers_source.jsx)), whose prompt literally
  reads *"determine the optimal **2D spatial arrangement**… **Assign (x, y) coordinates** to every node
  ID"* and returns `{ "node_id_1": { "x":…, "y":… } }`. The "2D" is a hard-coded string + a two-key schema.
- **Data model is strictly 2D**: node = `{id, x, y, text, type, colorVariant?}`, edge =
  `{id, fromId, toId, style?, color?, status?}`. There is **no `z` anywhere** in the concept-map code
  (the only `z`/3D hits in the whole repo are an unrelated D20 dice roll and a decorative CSS dodecahedron).
- **No 3D renderer exists today** — grep for `THREE.`/`WebGLRenderer`/`PerspectiveCamera` across the
  codebase = 0 hits. (The voxel STEM tools fake 2.5D on a 2D canvas.)

**Conclusion:** Gemini emits `z` exactly as readily as `x`/`y`. The dimensionality is decided 100% by
AlloFlow's JS. The real work is AlloFlow-side: a renderer, and **making `z` mean something**.

### The honest catch (and the right pattern)

LLMs are strong at **relational/semantic** structure (what connects to what, what belongs to which
strand, what precedes what) and **weak at precise geometric placement** (overlap-free, balanced raw
coordinates) in *any* dimension — your `handleAutoLayout` already needs a clamp-to-bounds pass + an
AI-repair retry because of this. Asking for raw `{x,y,z}` makes it *worse* (blind 3D crowding, no visual
feedback).

So the winning move — and the **only way "spatial relationships carry real meaning"** — is to **never ask
the model for final geometry**. Ask it to score each node on **named, interpretable axes** + typed
relationships, and let **deterministic JS project** those into coordinates:

- `x` = chronology / sequence position
- `y` = abstraction level (concrete → abstract, or Bloom/DOK tier)
- `z` = theme / strand / discipline → **categorical = discrete depth planes** (this is exactly the
  existing `deriveLanes()` "lane index = depth plane" design in `mind_map_module.js`)

Every axis is then labeled and legible ("left = earlier, up = more abstract, depth = strand"), the layout
is reproducible/testable (goldens possible), and — for free — **the same axis labels become the
screen-reader description** of each node. Depth is *derived from* semantics, not decoration.

### Concrete Gemini schema (semantic axes, not pixels)

```jsonc
{
  "title": "…",
  "axes": {
    "x": { "label": "Chronology / Sequence", "kind": "ordinal" },
    "y": { "label": "Abstraction (Bloom)",   "kind": "ordinal" },
    "z": { "label": "Strand",  "kind": "categorical", "categories": ["Biology","Chemistry","Ethics"] }
  },
  "nodes": [{
    "id": "n1", "label": "Cell membrane", "summary": "ELL-friendly gloss",
    "axisValues": { "x": 0.12, "y": 0.30, "z": "Biology" },  // ordinal 0..1; categorical = one of axes.z.categories
    "category": "Biology", "role": "concept", "importance": 0.8
  }],
  "edges": [{ "fromId": "n1", "toId": "n2", "type": "sequence", "label": "leads to", "confidence": 0.9 }]
}
```

Prompt rules: ordinal `axisValues` are **normalized 0..1** (model *ranks*, JS scales to pixels —
sidesteps the model's bad absolute-pixel sense); categorical `z` must be one of the declared categories;
**no raw pixels ever**; every node has a value for every declared axis; `edge.type` from a closed enum
(`sequence|prerequisite|cause|contrast|elaborates|associates`). This is a strict superset of today's
`{main,branches,connectsTo}` — a thin adapter upgrades existing generations, and axes default
(x=outline order, y=tree depth, z=branch index) when absent so old content still renders.

---

## 2. Extract into a reusable format + engine? — Yes; strong, concentrated fit.

Today there are **two** strong, *independent* node/edge engines that each reinvent the same ideas:

| Surface | What | Node/edge model | Layout | Render |
|---|---|---|---|---|
| **Visual Organizer** concept map (`concept_map_handlers` + `view_renderers` `renderInteractiveMap`) | AI, draggable relationship map | `{id,x,y,text,type}` / `{id,fromId,toId}` | AI-structure + JS families + optional Gemini beautify | HTML cards + SVG edges |
| **Throughline** ([mind_map_module.js](../mind_map_module.js)) | spatial unit builder | `{nodeId,lessonId,x,y,category,…}` / `{from,to,type}` | manual drag + lanes + AI co-author | own SVG canvas + cards |

Weaker consumers share only the upstream data shape and would consume engine *output*: static Key
Concept Map (radial), Concept-Sort (buckets → could become labeled z-planes), Brainstorm. Domain graphs
(worldbuilder rooms, arcade concept-atlas, lumen claim graph) have different node identity → adapters, not
core reuse.

> **Don't over-scope.** ~All the value is in unifying those two engines behind one format; the rest are
> output-consumers or adapters.

### The shared format — `ConceptGraph` (acg/v1)

A **superset of both** existing schemas, so neither breaks (lossless round-trip both ways):

```jsonc
{
  "version": "acg/v1",
  "title": "…",
  "axes": { "x": {…}, "y": {…}, "z": {…} },          // optional; absent ⇒ 2D + JS default placement
  "nodes": [{
    "id": "…",            // ↔ concept-map node.id AND throughline nodeId
    "label": "…",         // ↔ concept-map text / throughline description
    "summary": "…?",
    "type": "…",          // unified enum incl. legacy types
    "category": "…|null", // swim-lane key / colorVariant source
    "axisValues": { "x": 0.0, "y": 0.0, "z": "…" }?,  // SEMANTIC (normalized); the source of meaning
    "x": 0, "y": 0, "z": 0,                           // CACHED projected/dragged coords (engine-owned)
    "role": "…?", "status": "…?", "lessonId": "…?", "importance": 0?,
    "provenance": { "source": "gemini|js-layout|user-drag|import", "sourceDocId": "…?", "span": [0,0]? }
  }],
  "edges": [{ "id": "…", "fromId": "…", "toId": "…",
    "type": "sequence|prerequisite|cause|contrast|elaborates|associates",
    "label": "…?", "style": "…?", "color": "…?", "status": "correct|incorrect|null", "confidence": 0? }],
  "layers": [{ "key": "…", "label": "…", "index": 0 }]   // = deriveLanes() output = z planes
}
```

`axisValues` + `layers` carry the new semantic-3D meaning; `x/y/z` are engine-cached results, never the
AI's primary output. `provenance` is net-new and is what makes **document knowledge-graphs** trustworthy
(each node points back to a source span).

### The engine module — `window.AlloModules.ConceptGraphEngine`

Dependency-light, UMD-style attach, only `window.React` assumed; `callGemini`/`safeJsonParse`/`t`/`addToast`
**injected as deps** (mirrors `handleAutoLayout`'s deps object — never a free `t()`).

- **Normalize/adapt:** `normalizeGraph(input)`; `fromConceptMap`/`toConceptMap`;
  `fromThroughlineUnit`/`toThroughlineUnit`; `adaptGenerated({main,branches,connectsTo,structureType})`.
- **Layout (the extracted positioner):** `project(graph,{mode,width,height,depth})` (axisValues → x/y/z;
  categorical z → `layers[].index * planeGap`); `relaxWithinPlane(graph)` (short JS force pass that
  de-overlaps **within** a z-plane only, never crossing a semantic band); `layoutDeterministic(graph,
  structureType)` (= today's `handleInitializeMap` families); `async layoutWithGemini(graph, callGemini)`
  (asks for **axisValues**, then calls `project`).
- **A11y spine:** `deriveOutline(graph)` (Throughline's cycle-safe Kahn topo-sort, generalized);
  `deriveLanes(graph)`.
- **Render:** `render(container, graph, {mode:'2d'|'iso'|'3d', interactive, onNodeMove, onSelect, t})`.

### Render modes (all inside the Canvas iframe, `React.createElement`, no new build step)

- **`2d` (default, ships first):** the existing proven HTML-cards + SVG-edges approach. Full keyboard/SR/drag parity.
- **`iso` (2.5D — the sweet spot):** project `(x,y,z)` → screen via a fixed isometric transform in
  **pure JS** (`sx = x + z·cosθ·k`, `sy = y − z·sinθ·k`); keep the same HTML cards + SVG edges, sorted
  back-to-front by z (painter's order) with per-plane shadow/opacity. Each z-plane = a swim-lane **floor**.
  No WebGL, no GPU, contrast preserved, prints cleanly. **~90% of the "3D" wow at ~10% of the risk.**
- **`3d` (optional, gated):** true scene only if warranted — either CSS 3D transforms on the same cards
  (zero deps, but edges/occlusion/SR suffer) or lazy-load three.js from CDN behind a teacher toggle with
  `iso`/`2d` as the **guaranteed fallback**. Default-off; never the canonical view.

### Accessibility — the spine survives everywhere

`deriveOutline()` (Kahn topo-sort) is the load-bearing a11y artifact and already exists. Move it into the
engine; **every** render mode renders the same hidden ordered list as the primary DOM, with the canvas as
a supplementary layer. Each node's accessible name announces its **semantic axis position** ("Cell
membrane, step 2 of 8, abstraction: concrete, strand: Biology") — possible *because* we used named axes.
Turning 3D off (reduced-motion / SR / keyboard) degrades to the 2D list with **zero information loss**.

### Who reuses it

- **Visual Organizer** → drops its bespoke `handleInitializeMap` into `layoutDeterministic`, gains iso/3d + semantic axes for free.
- **Throughline** → thin consumer via `fromThroughlineUnit`; its swim-lane=depth design finally becomes real z-planes; *donates* its outline spine to the engine.
- **Concept-Sort** → categories→layers, items→nodes; optional graph/3D view of bucket membership.
- **Document knowledge-graphs (NEW — the big payoff):** the PDF/doc pipeline emits `acg/v1` nodes with
  `provenance.span` back to source text → a navigable, AI-built map of any uploaded document, reusing the
  whole engine + a11y spine.

### Migration (incremental; each step independently shippable, never breaks a live surface)

0. Create `concept_graph_engine_module.js` with **only pure functions copied** (not rewritten) from
   existing code (`deriveOutline`/`deriveLanes` from Throughline; `handleInitializeMap` families →
   `layoutDeterministic`; adapters), with **round-trip golden tests** proving lossless conversion both ways.
1. Re-point Throughline at the engine for `deriveOutline`/`deriveLanes` (it already owns these → low-risk proof).
2. Add `render(…,{mode:'2d'})` reproducing today's `renderInteractiveMap`; route Visual Organizer through
   it behind a flag; diff goldens until equivalent; flip default.
3. Add `axes`/`axisValues` + `adaptGenerated` + a Stage-1 prompt variant requesting semantic axis values
   (defaults when absent so old generations still work). Add `project()`. Still mode `2d`.
4. Ship mode **`iso`** (pure-JS 2.5D) as a teacher toggle on both surfaces — the visible "3D concept map" win.
5. *(optional, gated)* lazy-load three.js for mode `3d`; add the document-knowledge-graph consumer.

### Risks

- Concurrent shared tree → check `git status` before committing; stage engine files by path.
- Golden re-baselining → hand-edit the specific block; **`vitest -u` re-baselines the WHOLE suite** (it
  drifted 4 unrelated snapshots during the Throughline lanes work — confirmed).
- Free `t()` / missing `window.React` in the iframe = ReferenceError crash → inject all deps.
- AI geometry quality even with axes → ordinal collisions need `relaxWithinPlane`; too many categorical
  planes = visual mush (cap/merge).
- True WebGL 3D a11y regression + CDN-load failure → keep `3d` opt-in with `iso`/`2d` always reachable.
- Lossless `to*/from*` is mandatory before flipping any default, or saved projects corrupt on load.

### Open questions for Aaron

1. Default axis assignment — fixed (x=sequence / y=Bloom / z=strand), or should the **AI propose** axes per
   content type and the teacher confirm/relabel?
2. Should categorical `z` (strands = discrete floors, your swim-lane model) be the **only** 3D axis at
   first, reserving continuous depth for later?
3. Is **iso 2.5D sufficient** as the shipped "real 3D," or do you specifically want **orbitable WebGL 3D**
   (with the a11y + dependency cost)?
4. Document knowledge-graphs with click-to-source provenance — now, or a follow-on?
5. Long-term: unify Visual Organizer + Throughline into **one surface**, or keep two surfaces sharing one engine? (recommend: share engine, keep surfaces.)

---

*Companion to `docs/throughline_3d_exploration.md`. Verified against source 2026-06-22.*
