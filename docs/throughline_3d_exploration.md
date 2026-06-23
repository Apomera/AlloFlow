# Throughline — exploring a 3rd ("3D") mapping dimension

**Question explored:** should Throughline (`mind_map_module.js`) expand to a three-dimensional
mapping space, in addition to or instead of the current 2D canvas?

**Bottom line:** No literal third *spatial* axis, and no WebGL/three.js in the Canvas iframe.
The genuine want behind "3D" is **layering / containment**, not a coordinate. Express it as
(1) a meaningful **second visible axis** (swim-lanes) on the flat plane, and later (2) **macro
nesting** as discrete drill-down zoom *levels* (course → unit → lesson). Reserve any pixel-3D for
one specific future scenario (a Commons at hundreds-of-units scale), and only as an optional,
default-OFF, non-authoritative *view*.

This was produced by a multi-lens analysis (pedagogy, rendering, accessibility, data model, prior
art) + an adversarial stress-test; every load-bearing claim below was checked against the source.

---

## 1. What the current 2D model actually encodes

- **node** = `{ nodeId, lessonId, x:number, y:number, description, role, status, category, bundledLessonIds }`.
  Each node references **one** existing lesson (a `history[]` item) by `lessonId`.
- **`x` (left→right) = teaching order** is the *primary* semantic. **`y`** is loose/secondary
  (rows, grouping). Edges are typed `sequence` (solid) / `prerequisite` (dashed, gated).
- **Render is two flat layers in one scroll container** (`L1187‑1206`): an SVG (2400×1400) draws the
  grid + edge `<line>`s between node **centers**, and an absolutely-positioned **HTML overlay** draws
  the *interactive* node cards via `left:n.x / top:n.y`. The two share one coordinate space.
- **The accessibility spine is `deriveOutline()`** (`L227‑256`): a cycle-safe Kahn topological sort,
  tiebroken by `(a.x‑b.x)||(a.y‑b.y)`, that produces the linear scope-&-sequence outline — which is
  *also* the print / copy / screen-reader reading order. **This 1-D outline, not the spatial layout,
  is the pedagogical payload.**
- **Interaction is a flat affine map:** `svgCoords()` (`L631‑637`) = `clientX − rect.left + scrollLeft`;
  drag writes `p.x−ox / p.y−oy`. Cards are keyboard-operable (`tabIndex=0`, `role=group`, `aria-label`,
  Enter/E/Delete — `L1059‑1072`).
- **Runtime cage:** plain `React.createElement` inside a **Gemini Canvas iframe**; only `window.React`
  is guaranteed; **no bundler, no JSX, no imports**. Extra libs would have to load from a CDN at runtime.
- **Persistence / sharing:** localStorage stores layout only; export = a normal lesson pack
  `{mode, history}` plus an additive `unitLayout` sidecar that round-trips in the *unmodified* app
  (importer ignores unknown keys; the only hard gate is numeric `x`/`y`). FERPA scrub walks `history`,
  never the layout.

**Key latent fact:** `node.category` is *written* by five creation paths (`L345/433/468/606/872`,
mostly from `unitId`) and back-filled in `normalizeUnit` (`L185`) — but **read by no render, edge,
outline, or export-logic path**. It is a persisted, round-tripping grouping field that is simply never
shown. That is why surfacing it costs almost nothing.

---

## 2. The options spectrum (cheapest → richest)

| # | Approach | What it is | Effort | Risk | Verdict |
|---|----------|-----------|--------|------|---------|
| A | **Swim-lanes / grouping bands** | Render the latent `category` as horizontal lanes; `y` becomes a real strand/phase/tier axis | low | low | **Recommended (Phase 1)** |
| B | **Toggleable layers / "floors"** | Optional discrete `layer` int; show one plane at a time (a *filter*, not a coordinate) | low–med | low | Good Phase-2 fallback |
| — | **Macro nesting (drill-down zoom levels)** | Course-canvas of unit-nodes → zoom into a unit's lesson-canvas; each level has its own outline | high | med | **Recommended (Phase 2)** |
| C | **Isometric / 2.5D SVG projection** | Project `x,y,z` → screen with a fixed affine transform; cards stay HTML | high | med | Rejected — cosmetic, breaks picking + skews text |
| D | **CSS3DRenderer (three.js)** | Real 3D scene that keeps HTML cards as DOM objects | high | high | Only for the optional Commons view |
| E | **Native CSS 3D transforms** | `perspective` + `preserve-3d` + `rotateX/translateZ` | med | high | Rejected — SVG/preserve-3d flatten unreliably; picking breaks |
| F | **Full WebGL orbit (three.js / 3d-force-graph / r3f)** | Nodes/edges as GL meshes, orbit camera | high | high | Rejected — the textbook "3D-graph trap" |

---

## 3. Why not a literal third spatial axis (the decisive reasons)

Each is grounded in the file:

1. **The canonical artifact is 1-D.** `deriveOutline()` is a linear topo-sort; a third spatial axis
   has no defined slot in `(a.x‑b.x)||(a.y‑b.y)`, so it adds no ordering meaning that survives collapse
   to the outline and makes the reading order ambiguous (WCAG 1.3.2 Meaningful Sequence).
2. **The a11y contract *is* the DOM cards.** Cards are accessible because they're real HTML with
   `tabIndex`/`role`/`aria-label`/keyboard handlers and `<button>`s. Any WebGL/GL-textured path deletes
   that contract and forces a from-scratch parallel a11y layer — hostile to the ELL/struggling-reader/SR
   ethos that defines AlloFlow.
3. **The runtime forbids it cheaply.** The module guards `window.React` only, with no bundler/JSX.
   three.js/r3f means a fragile CDN load into the Canvas iframe (CSP/network/load-order) plus a
   rAF/WebGL-context **zombie hazard** the repo has hit before (the async gen loop already needs an
   unmount guard at `L687‑694`).
4. **Picking/drag break deeper than "invert the projection."** `svgCoords` samples `getBoundingClientRect`
   + `scrollLeft/Top` off the scroll container. Under CSS `perspective`/`preserve-3d`, that rect becomes
   the AABB of the projected quad → silently wrong world coords. And a 2D mouse delta maps to infinitely
   many world deltas along the view ray, so true 3D needs axis-gizmo constraint UI — itself an SR nightmare.
5. **It's untestable here.** Goldens are **SSR HTML sha snapshots**; a WebGL/CSS3D canvas renders nothing
   meaningful under jsdom, so 3D would ship with zero automated render coverage while churning snapshots.

Plus **occlusion**: a card behind another is both unreadable and un-clickable; the flat overlay never
occludes today.

---

## 4. What the 3rd dimension *should* mean instead

- **Primary (near-term): a meaningful second axis via swim-lanes.** Let `y` mean something — a content
  **strand**, a **UbD phase** (Acquire / Make-Meaning / Transfer), a **UDL mode**, or a **scaffolding/MTSS
  tier** — by rendering `category` as lane bands. This is what serious curriculum/knowledge tools actually
  do (Trello/Notion lanes, Obsidian groups), not depth. *Comparison and reading-order are 2D-native tasks.*
- **Later (if still wanted): containment/altitude via macro nesting.** "A lesson is inside a unit; a unit
  is inside a course" is a **tree you expand/collapse, not a volume you orbit.** Realize it as discrete
  drill-down zoom *levels*: a course-level 2D canvas whose nodes are units (each a collapsed Throughline);
  Enter/double-click zooms in. Each level runs its own Kahn sort, so the reading spine becomes
  course-outline → unit-outline → lesson-outline. This is precisely the maintainer's "macro view that
  organizes units" and the **AlloFlow Commons** vision the provenance fields (`unitId/parentUnitId/forkedFrom/license`)
  already encode.

> Slogan: **more *meaningful* axes, not more *spatial* axes. Don't orbit a hierarchy.**

---

## 5. Recommended phased plan

**Phase 1 — Swim-lanes from the latent `category` (free, fully reversible).**
Render `category` as horizontal lane bands in the existing SVG (drawn *under* edges and the HTML overlay,
so `svgCoords`/drag/connect stay byte-identical); snap auto-layout rows into lanes; add a category picker
to the node-edit panel; add lane-grouping headers to the outline panel and the card `aria-label`.
*No schema change, no migration, no CDN lib.*

**Phase 1b — Harden 2D keyboard/SR (the real a11y win; do regardless).**
Add roving-tabindex + arrow-key nav across cards in `deriveOutline` order; make outline rows focusable;
replace the `window.confirm` connect prompt (`L667`) with an inline accessible choice. This is also the
honest precondition for evaluating any dimensional expansion.

**Phase 2a — Migration must-dos (gate before ANY new field).**
- Relax `loadUnitFromStorage`'s strict `parsed.schemaVersion !== SCHEMA_VERSION` (`L206`) to accept `<=`
  and normalize-up — **otherwise the first deploy with a bumped schema silently discards every user's
  saved layout.** (The single real hazard.)
- Keep `minAppSchema` pinned at `1` (`L144/169`) so the unmodified production app still imports shared units.
- Add an explicit **export → import-as-old-app round-trip test** (export v2 → `normalizeUnit` as old app →
  still N nodes), since the Commons back-compat promise is currently asserted only by behavior.

**Phase 2b — Macro nesting as discrete drill-down zoom levels.**
Add an additive `level`/use `parentUnitId`; course-level canvas of unit-nodes that zoom into lesson-level
canvases; per-level outlines. Bound it to *view + arrange + export units* — do **not** let it grow into an
LMS / full curriculum-map.

**Phase 3 — Optional Commons-scale 3D *view* (ONLY if the Commons materializes).**
If hundreds of units with **dense cross-unit prerequisites** actually exist, a 2D node-link diagram
degrades into spaghetti past ~50 nodes, and a 3D force layout is the one prior-art form that handles dense
many-to-many cross-cluster graphs. *Then* offer a default-OFF, non-authoritative **CSS3DRenderer** force-graph
(preserves card DOM), route every keyboard/SR user to the 2D + outline source of truth, and wire
GL-context/rAF disposal into the existing unmount guard. Mirror, never replace, 2D.

---

## 6. Data-model & back-compat notes

- If/when a discrete field is needed, add it **optional + back-filled**, mirroring the `role`/`category`
  idiom: in `normalizeUnit`'s `.map` (~`L178‑187`) add `layer: (typeof n.layer === 'number') ? n.layer : 0`.
- **Never** extend the accept-gate at `L172‑173` to require `layer`/`z` — old/hand-edited 2D nodes lacking it
  would be silently dropped and their edges pruned (`L192‑196`). **Back-fill, never gate.**
- `deriveOutline` keeps `x` as the **primary** ordering key — a lane/level is a render/grouping concern, not
  an ordering one — so the Kahn sort and its goldens stay untouched until you *deliberately* make grouping a
  header (group-by-lane, topo-within).
- FERPA scrub stays correct because lane/level/category carry no PII — **keep the layout strictly non-PII.**
- Golden churn: Phase-1 lane rects add DOM, so populated snapshots re-baseline (the `sampleUnit` fixture has
  no category). Expected — hand-edit the one snapshot block; do **not** `vitest -u` the whole suite
  (concurrent sessions share one tree).

---

## 7. Decisions for the maintainer (Aaron)

1. **What is the "3D" goal really** — macro nesting (drill-down), richer 2D grouping (swim-lanes), or a
   literal spatial/visual experience? If nesting, Phase 1 + 2 fully serve it and no spatial `z` is needed.
2. **What should the lane/grouping axis mean** — UbD phase, UDL mode, content strand, or MTSS/scaffolding
   tier? This sets the default `category` vocabulary and the Generate-Unit placer's lane assignment.
3. **Is the Commons realistically reaching hundreds of units with dense cross-unit prerequisites?** That is
   the *only* scenario that reopens an optional 3D force-graph view.
4. **Cross-unit prerequisite edges** (a lesson in unit A gating one in unit C) have no clean representation
   in nested-2D or stacked floors. Represent them (faint inter-unit links / sidebar list) or keep implicit?
   Needs a decision before Phase 2.
5. **Bundle Phase 1b (keyboard/SR hardening) with swim-lanes, or ship it first** as a standalone a11y win?
6. **Swim-lanes default-on or a toggle**, given some teachers prefer the free-form plane?

---

*Related: `docs/generate_unit_design.md`, the `unitLayout` provenance fields, the "AlloFlow Commons"
shareable-unit vision. Status of Throughline itself: built, local/unpushed, deploy held, live Canvas
smoke pending — so any of the above lands behind the same gate.*
