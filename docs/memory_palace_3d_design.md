# Memory Palace (Method of Loci) in 3D — design + local-compute assessment

Three questions from Aaron (2026-07-02), answered against the actual codebase:
1. Can Imagen / Gemini / an open-source-or-homemade tool **create 3D objects** to populate a
   memory palace?
2. Could the **veraPDF-popup pattern give us GPU** for open-source 3D generators, gated by a
   "you need a high-end device" disclaimer?
3. Local LLMs work on the Firebase build today — could a **popup bring local-LLM capability to
   Gemini Canvas**?

Short answers: (1) yes, via a tiered hybrid — Imagen billboards ship first, real generated 3D
is an offline/popup tier; (2) yes in principle, and the exact stack is already proven in-repo,
but the blocker is model *porting*, not the popup — with one shortcut that ships now;
(3) yes — WebLLM in a popup + a postMessage provider shim into the existing multi-backend
abstraction.

---

## 0. The rails this rides on (all already in the tree)

- **Popup escape-hatch, proven twice.** The Canvas iframe's CSP blocks external
  scripts/workers, so heavy client-side compute runs in a popup on our own origin:
  veraPDF/CheerpJ (typed postMessage request/response: `verapdf-ready` →
  `verapdf-validate` → result, [view_pdf_audit_source.jsx:2109-2168](../view_pdf_audit_source.jsx))
  and Video Studio (Blobs posted back to `window.opener`,
  [video_studio/video_studio.html:704-705](../video_studio/video_studio.html)).
- **WebGPU ML inference in that popup, already shipping.** Video Studio runs
  transformers.js `3.3.1` from jsDelivr with WebGPU-first + WASM-q8 fallback
  (`navigator.gpu ? webgpu : wasm`, [video_studio.html:1094-1113](../video_studio/video_studio.html)),
  including model-weight downloads with size labels in the UI (~40-80 MB Whisper variants).
  "High-end device gating + consent + fallback" is therefore an *existing pattern*, not new risk.
- **Multi-backend AI abstraction.** `ai_backend_module.js` already routes
  `gemini | openai | localai | ollama | claude | custom`, with Ollama defaulting to
  `http://localhost:11434` (L899) — this is what "local LLMs on the Firebase build" means today.
- **The 3D stack.** ConceptGraph engine (acg/v1) + WebGL renderer with lazy three.js,
  orbit/keyboard/SR spine (`deriveOutline` = reading order), constrained editing, saved
  arrangements, and the Strand Challenge game loop (pure scorer, flagNodes feedback,
  XP/misconception reporting, live-session arming). All committed 2026-07-02.

---

## 1. Can Imagen or Gemini make 3D objects?

- **Imagen: no.** 2D images only. But method of loci is *literally* "vivid images at
  locations" — a framed Imagen image at each locus is the textbook technique, not a fallback.
  `callImagen` is already plumbed (54 call sites in AlloFlowANTI.txt).
- **Gemini: not meshes, but two useful adjacents.** It reliably emits (a) *structured scene
  JSON* (primitive assemblies: "apple = red sphere + brown cylinder stem + green cone leaf")
  and (b) *semantic selections* from a catalog (pick asset/icon per concept). Same
  semantics-not-geometry principle the ConceptGraph engine already uses.
- **True text/image→3D**: open-weight models exist (TripoSR, TRELLIS/MIT, Hunyuan3D-2) but need
  GPU inference — see §3.

### Asset tiers for the palace (cheapest → richest; all compose)

| Tier | What | Cost | Status |
|---|---|---|---|
| A | **Imagen billboards** — framed mnemonic image per locus | days | `callImagen` exists; sprite/billboard pattern exists in cg3d |
| B | **Extruded Lucide icons** — `SVGLoader` + `ExtrudeGeometry`; Gemini picks the icon name | days | icons already shipped; ~1500 concepts covered deterministically |
| C | **Primitive assembly** — Gemini emits a JSON recipe of three.js primitives; pure builder renders (unit-testable; cache the recipe in the saved resource) | ~1 wk | new small module, `prim3d` |
| D | **Curated CC0 low-poly library** (Kenney/Quaternius `.glb` on our CDN); Gemini selects | ~1 wk + curation | needs lazy `GLTFLoader` (same addon pattern as bloom) |
| E | **Generated meshes** (popup GPU or offline) | weeks / offline | see §3 |

Recommended blend: A everywhere (guaranteed coverage) + B/C for graspable "objects" + D where
a match exists. E is an experiment, never the critical path.

---

## 2. The Memory Palace feature (maps almost 1:1 onto the shipped engine)

- **Route = `deriveOutline()`.** The Kahn topo-sort that is already every 3D view's a11y spine
  IS the fixed walking order a memory palace needs. Rooms = strands (depth planes become
  literal rooms), loci in a room = items, route = reading order.
- **Generation**: deterministic corridor/room layout from `{main, branches}` (pure, golden-able)
  → Gemini writes one **vivid, bizarre, concrete** mnemonic image description per item (the
  vividness is the pedagogically load-bearing part — prompt for absurd/emotional/sensory) →
  Tier A-D assets placed at each locus. Persist descriptions + image refs in
  `data.memoryPalace` (same pattern as `data.conceptSpace`).
- **Walk mode**: first-person camera on the route spline; click / ArrowRight = next locus;
  orbit within a locus. SR/keyboard/reduced-motion fallback = the ordered outline
  ("Locus 3 of 9, Biology room: giant glowing mitochondria eating a battery") — zero
  information loss, same contract as cg3d.
- **Recall game**: reuse the Strand Challenge scaffolding wholesale — walk the palace with
  empty frames, student recalls what belongs at each locus (type / pick from bank), pure
  scorer, flagNodes-style feedback, XP + misconception reporting, live-session arming via a
  new `interactiveOrganizer` key. Follow-on: spaced "revisit the palace" prompts.
- **Epistemic framing (per the scientific-integrity house rule)**: method of loci has solid
  lab evidence for trained recall of ordered material; classroom-transfer evidence is more
  modest and the technique needs explicit instruction. In-app copy frames it as *a practice
  strategy you learn*, with a "why this works / what the evidence says" note — no memory-magic
  claims.

---

## 3. Aaron's Q: "veraPDF popup → GPU for open-source 3D generators?"

**The popup mechanics are a solved problem** (§0). The honest blocker is **model porting**:

- **TripoSR** (image→3D, feedforward, ~0.5s on A100, weights ≈ 0.7-1.6 GB): the most plausible
  browser candidate. Needs an ONNX/WebGPU-clean export, a JS/WASM marching-cubes step (three.js
  ships a MarchingCubes addon), and OPFS/Cache-Storage weight caching (Whisper pattern).
  Realistic estimate: a multi-week spike with real failure risk — same class as the
  CheerpJ/veraPDF spike (which worked, but only after AOT + dup2 wrangling).
- **TRELLIS / Hunyuan3D-2**: CUDA-specific sparse ops / multi-stage diffusion, several GB —
  not realistically browser-portable today. Offline only.
- **Gating recipe when we do it** (mirrors Video Studio): `navigator.gpu` feature-detect →
  `requestAdapter()` limits check → explicit "~1 GB download, high-end GPU recommended"
  consent → WASM/billboard fallback. Never on the critical path; palace must be complete
  without it.
- **Offline authoring tier (no porting at all)**: Aaron runs TRELLIS/TripoSR on Colab/local
  GPU once per asset batch → mints `.glb`s → commits to the CDN as Tier-D library entries.
  This is the pragmatic way to get *custom* generated 3D now.

### The shortcut that ships NOW: depth-relief "statues"

transformers.js **officially supports depth-estimation pipelines** (Depth-Anything small,
~25 MB — runs even on WASM). Popup: Imagen image → depth map → displace a plane mesh →
a 2.5-D relief "statue" of any concept at its locus. Uses the already-shipping transformers.js
popup stack, tiny download, no exotic ops. ~90% of the "generated 3D object" wow at ~5% of
the porting risk. Recommended as the first "generated 3D" tier (E-lite).

---

## 4. Aaron's Q: "local LLMs in Gemini Canvas via a popup?"

Yes — two lanes, both behind one shim:

- **Lane 1 (primary): WebLLM (MLC) in the popup.** Pure WebGPU inference on our origin; no
  local server, no CORS/PNA anywhere. Prebuilt small models (Llama-3.2-1B/3B, Phi-3.5-mini,
  Qwen2.5-1.5B) with 0.6-2.5 GB cached downloads. Same consent + `navigator.gpu` gating as §3.
- **Lane 2 (power users): Ollama bridge.** The popup (https, our origin) fetches
  `http://localhost:11434`. Chrome treats loopback as potentially-trustworthy (no
  mixed-content block), **but** Private Network Access enforcement means users need the
  local-network permission prompt and Ollama must be started with
  `OLLAMA_ORIGINS=<our-origin>`. Document as advanced/opt-in; the existing
  `ai_backend_module.js` Ollama code is reused verbatim — only the transport moves into
  the popup.
- **The shim**: a `popup-local` backend in `ai_backend_module.js` that postMessages
  `{type:'llm-generate', prompt, opts}` to the popup and awaits the reply — the exact
  veraPDF request/response shape. `callGemini` call sites don't change; the backend picker
  gains one entry. Popup must stay open during use (same UX as Video Studio); auto-reopen
  affordance on 'llm-ready' timeout.
- **Why bother**: FERPA — student text never leaves the device on the local path. That is a
  *stronger* privacy story than any cloud call and directly serves the pilot-readiness
  findings. Quality is below Gemini, so route it to bounded tasks first (hints, sentence
  frames, glossary glosses, translation gap-fill) with the honest "local model — lighter but
  private" label.

---

## 5. Phased plan

1. **P0 — this doc** (decisions below).
2. **P1 — Palace core**: layout generator + Gemini mnemonic descriptions + Imagen billboard
   loci + walk mode + outline fallback. New organizer type or a mode on 3D Concept Space.
3. **P2 — Recall game**: Strand-Challenge-pattern recall at loci + XP/misconception + arming
   key. Optional spaced-revisit toasts.
4. **P3 — Object tiers B/C/D**: extruded icons, prim3d recipes, CC0 library + GLTFLoader.
5. **P4 — Popup compute spike(s)**: depth-relief statues first (ships), then the local-LLM
   shim (WebLLM lane), then — only if still wanted — the TripoSR-in-browser spike.

Each phase independently shippable; P1 has zero new infra.

## 6. Risks

- Imagen quota/cost per palace (one image per locus; cache aggressively in the saved resource;
  regenerate only on demand).
- First-person camera + a11y: keep the walk optional; outline route is the canonical artifact
  (same contract that saved cg3d).
- Popup deploys: popup pages 404 until pushed (Video Studio lesson) — palace must not
  hard-depend on popup tiers.
- Weight downloads on school hardware/networks: consent screens with real MB numbers; WASM
  fallbacks; never auto-download.
- Golden tests: layout generator is pure → golden-able; GL walk needs live Canvas smoke
  (same as cg3d).

## 7. Decisions for Aaron

1. Palace = **15th organizer type** or a **mode on 3D Concept Space**? (Lean: separate type —
   different prompt, different pedagogy, cleaner analytics.)
2. Recall answer mode: **type the answer** (harder, better retrieval practice) vs **pick from
   bank** (more accessible)? Both, teacher-selectable?
3. Ship order for P4: depth-relief statues → local LLM → TripoSR spike — agree?
4. CC0 library curation: who picks the ~100 starter assets, and do we theme them
   (science/history/ELA packs)?
5. Local-LLM scope: which affordances go local-first when available (hints? frames? all
   callGemini traffic behind a toggle)?

---

*Grounded against: view_pdf_audit_source.jsx (veraPDF popup), video_studio/video_studio.html
(transformers.js WebGPU popup), ai_backend_module.js (multi-backend + Ollama),
concept_graph_engine_module.js + concept_graph_3d_module.js (acg/v1 + renderer + challenge).
Companion to docs/concept_graph_engine_design.md. Written 2026-07-02.*
