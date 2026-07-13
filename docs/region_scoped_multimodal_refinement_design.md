# Region-Scoped Multimodal Refinement — Design Spec

> **Roadmap snapshot, not current shipped-status authority (2026-07-09):** This June 23 design captures the region-scoped refinement direction and local implementation status at that time. Verify current code, deployment state, and Canvas smoke status before treating any "shipped so far" item below as available to users.

**Status:** Roadmap (2026-06-23). **SHIPPED so far:** S2 palette-with-guaranteed-contrast (all 4 slices), S1 scoped-intent + freehand drag-region select, the S3 reading-order guard `checkReadingOrderPreserved`, and S3 block-restyle (slice 1: curated callout/list transforms, triple-gated; slice 2: the AI "where would a callout/list help?" proposal pass; slice 3: outline-safe heading promotion — all adversarially hardened). All local/unpushed, deploy held; Canvas-smoke pending for the UI surfaces.
**One-line vision:** *Direct, multimodal annotation on the live document → an agent interprets intent → it executes via region-scoped deterministic micro-tools, with readback + per-region accept/revert.*

This is **not a rebuild.** It is three additive things on top of machinery that already exists and is tested:
1. **New input surfaces** (type / voice / box / sketch) that all feed the same command path.
2. **A region-scoping primitive** (the "box") that bounds blast radius and makes each region its own accept/revert unit.
3. **New deterministic tool classes** (palette, block-transform, image) alongside the table/surgical tools.

---

## 1. The design law (everything obeys this)

> **AI proposes *intent* → a deterministic layer enforces *correctness + accessibility* → readback + per-region accept/revert.**

The model is good at *taste and intent* (which block, which mood, what the user meant) and bad at *guarantees* (contrast math, structural validity, reading order). So the model never gets to emit final state directly. It selects and parameterizes **vetted, deterministic tools**; the tool produces the bytes; a deterministic check certifies the result; the user accepts or reverts a single region. This is the same pattern we already run (AI diagnoses → `SHARED_SURGICAL_TOOLS[fix.tool](html, p)` applies; AI picks a theme → *we* compute the hex). Stated as law, it is the thing that lets us be "engaging" without ever betraying the accessibility mission.

**Corollary — no slice ships without its own deterministic enforcement gate.** If a slice can't name the deterministic check that certifies its output, it isn't ready.

---

## 2. Foundations that already exist (this is why it's additive)

| Capability | Where | Reused as |
|---|---|---|
| AI-discoverable micro-tool registry | `doc_pipeline_source.jsx` `SURGICAL_TOOL_REGISTRY` (~3374), `SURGICAL_TOOL_PROMPT` (~3969), flat executor `SHARED_SURGICAL_TOOLS[name](html, p)` (~3983) | The agent's tool backbone — new tool classes register here and become AI-callable for free |
| Free-text intent → agent → tools | `processExpertCommand` (Expert Workbench command path) | The single command path every input modality feeds |
| Locate the exact block for an issue/region | `_peekIssueSource` / `out.fullHtml`, the `iss.locator` anchors | The basis for hit-testing a region to DOM elements |
| Region edit + single-occurrence splice | `_spliceBlock` (view) — refuses moved/ambiguous | The "apply to exactly this region, touch nothing else" primitive |
| Re-check a region after an edit | `_reauditAndScore` (`auditOutputAccessibility` + axe + weakest-layer min + `recomputeIssueResolution`) | The shared readback used by Workbench **and** the shipped expert-direct-edit |
| Deterministic contrast math | `_contrastRatio` (~5320), `fixContrastViolations`, `sanitizeStyleForWCAG` | The palette enforcement layer (already verified) |
| Deterministic table op executor | table `applyOp` (~20773) | The template for a "scoped deterministic op" tool class |
| Honest AI-content labeling precedent | "clearly-AI-ESTIMATED data" chart tables (~10135), AI-estimated header-colour clamp (~302) | The fabrication red-line + the label convention generated images must inherit |
| Per-region accept/revert + Keep/Undo | the table popup readback; the Tier-B `_preCmdHtml` one-click revert | The accept/revert UX, generalized to any region |

The shipped **expert-direct-edit** path (`_saveManualEdit`) is *slice 0 of this exact vision*: scope to one located block → `_spliceBlock` → `_reauditAndScore` → per-region revert. The roadmap below generalizes the *scoping* and adds *modalities* and *tool classes*; it does not invent the backbone.

---

## 3. The core primitive: the box = "range open for adjustment"

A drawn box (or a selected block, or a located issue) defines a **region**: a set of DOM elements via hit-test. Everything good follows from scoping intent to a region:
- **Bounded blast radius** — a transform can only touch elements inside the region.
- **Localized intent** — "make *this* a callout" is unambiguous in a way "make the doc nicer" never is.
- **Its own accept/revert unit** — snapshot the region's HTML before, diff after, Keep/Undo per box.
- **Its own readback** — run `_reauditAndScore` (or a deterministic structural check) scoped to the region.

The box is the safety primitive. Treat it as load-bearing, not cosmetic.

---

## 4. Phased slices (each ships value; each carries its own gate)

Ordered by **value-to-risk**, not by ambition. Palette is deliberately early because its enforcement already exists and is deterministic; sketch/Imagen are the clearly-labeled frontier.

### S0 — Text → region (SHIPPED)
The expert-direct-edit path. Establishes the pattern. *Done.*

### S1 — Box → scope → typed/spoken intent
- **Slice 1 SHIPPED (`878b6f14`):** located-block scope → intent → `processExpertCommand` on the block fragment → `_spliceBlock` → `_reauditAndScore` → per-region revert (the "✨ Apply with AI" control in the Source panel).
- **Slice 2 SHIPPED (`08b5c678`) — freehand drag-region:** a marquee that lives *inside* the preview iframe (so all geometry is in the iframe's own `getBoundingClientRect` space — no cross-frame mapping) → `_elementsInBox` (top-most blocks ≥50% covered) + `_dominantBlock` (largest in-box area) → bridge the live element back to the stored `accessibleHtml` source by anchor text → open the region editor keyed off `'__region__'`, **reusing** the slice-1 `_applyScopedIntent` + the throttle-proof `_saveManualEdit`. The drag only *scopes*; the bounded apply is the proven path. Hit-test = 13 unit tests (mocked rects); marquee geometry = Canvas-smoke.
- **Voice** is just speech-to-text into the same intent field (reuse the command-palette/bot voice infra) — *not* a separate backend. *(Not yet wired.)*
- **Enforcement gate:** the surgical tools already run on a fragment; constrain their selectors to the region; `_reauditAndScore` on the region after. **(Now also: `checkReadingOrderPreserved` is available to certify the region edit didn't reorder/drop — see S3.)**
- **Value:** high (the generalization of S0 to arbitrary regions + voice). **Risk:** low-moderate (mostly UI + scoping).

### S2 — Palette with **guaranteed** contrast  ← recommended build-first "wow"
- **AI proposes intent only:** a mood / brand color / colors extracted from an uploaded image / "warmer, calmer, more energetic."
- **Deterministic enforcement (this already exists):** map the palette to **semantic tokens** (text, surface, accent, link, border, callout-bg, …); for every foreground/background pair, compute relative luminance via `_contrastRatio` and **nudge luminance until it clears the floor** — 4.5:1 body, 3:1 large/UI. *Never trust the model's hex to be accessible — verify and correct.*
- **Three guardrails (hold firm):**
  1. Check the **final rendered combination** (text over a tinted callout, text over an image), not raw hex in isolation.
  2. **Color never carries meaning alone** — keep link underlines, keep icon+label on status.
  3. The palette must **survive export to the tagged PDF and respect the reading themes** (light/dark) — or the contrast badge is lying.
- **Promise vs. offer:** we can *guarantee* the contrast math (live ratio badge); we cannot guarantee "tasteful" → curated presets + preview.
- **Bonus:** tokenize-first unlocks "harmonize this messy document" (detect ad-hoc palette → unify → clamp), which is half the visual-polish backlog.
- **Value:** very high. **Risk:** low — *the enforcement is deterministic and verified.* This is the strongest feature in the vision.

### S3 — Block restyling for engagement (behind a deterministic reading-order guard)
- **AI analysis pass** (an audit-like pass for *visual rhythm*): propose where a vetted block helps — key takeaway → callout (`<aside>` with a real heading), definition → sidebar, item-wall → card grid (still a `<ul>`), stat → pull-quote (`<blockquote>` that does **not** duplicate content into the reading order). Surfaced as a **plan for accept/revert**, never auto-applied.
- **Curated, vetted block library only** — the AI **selects and parameterizes**; it does **not** author freeform HTML. *Non-negotiable.* Freeform model markup = pretty divs that break the tagged-PDF structure and the screen-reader reading order, which defeats the tool's reason to exist.
- **Enforcement gate — the hard part:** restructuring is *exactly* the operation that silently corrupts reading order / MCID linkage (the `b0d24ae3` scar). Re-running the AI audit is **not sufficient** — this session proved the audit can be throttled, partial, and non-authoritative. The accept gate must be a **deterministic structure/reading-order preservation check**: same content leaves, same document order, no content duplicated into the flow.
- **Prerequisite BUILT (`280d4d14`):** `checkReadingOrderPreserved` — subsequence-of-reading-order-tokens check (now `\p{L}\p{N}/u`, all scripts + single chars), exported, hardens the pipeline against the `b0d24ae3` scar class.
- **Slice 1 SHIPPED (`e94af5c7`) — curated, content-preserving transforms:** `restyleBlock(blockHtml, kind, opts)` with `callout` (wrap in `<aside role="note">`, decorative border, no recolour) and `list` (DOM-level top-level-`<br>` split / bullet glyphs). The AI authors **no** HTML — a later slice will only have it SELECT a vetted transform. Each transform is **triple-gated**: `checkReadingOrderPreserved` (text order) + `_restyleContentFidelity` (the `<a href>` / `<img src,alt>` multisets are unchanged — catches markup loss the token guard can't see) + context guards (refuse `li`/`dt`/`dd`/`figcaption`/`td`, multi-block containers, already-list/callout). One-click "no-AI edit" chips in the region editor; reuses `_spliceBlock` → `_preCmdHtml` revert → re-audit. **Hardened by a 6-dimension / 3-skeptic adversarial review** (26 raised, 19 confirmed, all fixed + regression-tested): non-Latin/single-char guard blindness, wrong-target re-find, invalid nesting, `<br>` link-multiplication, `textContent` markup flatten, eaten minus signs, dropped inline colour, "no-AI" overclaim, stale throttled re-audit.
- **UDL caveat:** "engaging" is not universally good — some learners need uncluttered, low-load pages. So: offered transform + preview, conservative default, ideally profile-aware.
- **Slice 2 SHIPPED (`c30ddf6a`) — AI proposal pass:** `proposeRestyles(html, opts)` asks the model WHERE a callout/list would help — **selection only** (`ref` + `kind` + `reason`, never HTML). Each pick is run through the `restyleBlock` triple-gate, so an unsafe suggestion is auto-rejected and never shown; surfaced as an **accept/revert plan** (per-suggestion Apply/Dismiss). FERPA: sends only truncated block-text snippets (selection task), disclosed in the UI. Hardened by a 4-dim / 3-skeptic review (the splice-key lesson: only surface suggestions whose markup is *findable + unique* in the raw stored string, since `accessibleHtml` isn't DOMParser-canonical; collect leaf-most blocks only; surface the filtered count).
- **Slice 3 SHIPPED (`9fb0d4f7`) — heading transform (outline-safe):** promote a title-paragraph to a real `<hN>` (re-tag only), as a region chip + an AI proposal kind. A 3-skeptic review proved heading promotion is an OUTLINE operation the re-audit could NOT backstop (axe loads only WCAG-tagged rules; `heading-order`/`page-has-heading-one` are best-practice → never run). Hardened before first commit: outline-safe no-skip leveling (≤ preceding+1, never H1), a deterministic `headingOutlineIssue` warning (the honest backstop), attribute carry (id/lang/dir/aria-*), title-likeness + ancestor guards, chrome/dup filtering, and a single-h1 Ctrl+1 gate.
- **Value:** high (real differentiator). **Risk:** low (deterministic, gated, adversarially hardened three times). **General lesson:** the gate is only as good as what it *measures* — each review found a blind spot (markup, then serialization, then best-practice axe rules); adding a transform means asking "what does the gate not see?" **NEXT:** more vetted transforms (definition→sidebar, stat→pull-quote without duplicating into the flow), profile-aware defaults, voice intent.

### S4 — Freehand sketch → intent (assistive frontier)
- Interpret a sketch over a region screenshot via `callGeminiVision`; treat strictly as **assistive** — "here's what I think you meant — confirm" — because sketch→intent is genuinely error-prone.
- **Enforcement gate:** the *interpretation* is a proposal; the *execution* still goes through the deterministic tools + region accept/revert. The sketch never edits bytes directly.
- **Value:** medium (delight). **Risk:** higher (interpretation accuracy; AI dependency). Frontier — clearly labeled, never the default path.

### S5 — Image generation / image-to-image as a micro-tool class
- "Regenerate this figure," "accessible version of this diagram," "clean up this scan" — a new tool class the agent can call within a box (Imagen 4 / image-to-image).
- **Enforcement gates (all firm):**
  1. **No fabricated data — the red line.** Decorative / illustrative / diagram-cleanup is fine. An AI-generated *chart that invents numbers* is forbidden; any data figure must derive from real data or carry the honest **"AI-generated illustration — verify"** label (the same convention as the existing AI-ESTIMATED chart tables).
  2. **Alt-text through the tagger** — every generated image gets real alt-text via the pipeline; no untagged images.
  3. **FERPA egress** — image-to-image sends *document content* (student figures/scans) to Google's image models. This needs the same K-12 egress framing as the rest, likely a **"disable when FERPA-strict"** toggle. (The other-agent framing under-weighted this.)
- **Value:** high for STEM/diagram docs. **Risk:** moderate-high (FERPA + fabrication + a whole new tool class + cost). Frontier.

---

## 5. Cross-cutting guardrails (apply to every slice)

- **No AI-fabricated data** (S5 red line, but a principle everywhere): generated/edited content never invents numbers; honest labels where AI estimated anything.
- **The authoring UI must itself be accessible** — keyboard- and screen-reader-operable. A sketch-only annotation surface on an *accessibility* tool is self-refuting. Every modality needs an equivalent typed/keyboard path.
- **Graceful degradation under throttle.** Every "AI proposes" step is another Gemini call into the same throttle that wrecked a 90-minute run this session. The deterministic enforcement layers are throttle-immune; the propose steps are not. Design "AI's busy → here are the curated presets, pick manually" in from the start, not as a bolt-on.
- **Curated tools, never freeform model HTML/CSS/bytes.** The model selects + parameterizes vetted tools; deterministic code emits final state.
- **Re-check is deterministic where correctness must be guaranteed** (contrast, reading order, structure) — *not* the AI audit, which can be partial/throttled.
- **Per-region accept/revert + readback on every transform.** Nothing applies silently; every box is Keep/Undo.

---

## 6. Sequencing vs. the institutional gate (be honest about this)

This is the right **north star for the product** — but the **pilot gate** (Garry / UMaine / Paul Cochrane) is **reliability of the PDF pipeline**, and the stated energy split is ~80% there. These features win **adoption**; they do **not** unblock the **pilot**.

Recommended posture:
- Build the **deterministic-safe** slices opportunistically — **S2 (palette) first** (enforcement already exists), then **S1 (box→scope)** (generalizes what shipped).
- Keep **S3 (block restyling)** gated behind the deterministic reading-order guard — it's the slice most able to silently regress the very thing UMaine cares about.
- Keep **S4 (sketch)** and **S5 (Imagen)** as the clearly-labeled frontier; do not let the ambitious tail pull oxygen from the reliability work that's actually load-bearing for the partnership.

---

## 7. Open decisions (need Aaron)

1. **Build order confirm:** S2 (palette) before S1 (box)? Palette has lower risk + higher immediate "wow," but S1 is the structural generalization. (Recommend: palette first.)
2. **Profile-awareness for S3** — should engagement transforms be suppressed/softened for low-load UDL profiles by default?
3. **FERPA toggle scope** — does image generation (S5) get disabled wholesale in FERPA-strict mode, or allowed for decorative-only with a hard "no document content egress" boundary?
4. ~~**The deterministic reading-order guard** (S3 prerequisite) — is that worth building as standalone infrastructure first?~~ **ANSWERED + BUILT (`280d4d14`):** `checkReadingOrderPreserved` shipped as standalone infrastructure; it hardens the existing pipeline against the `b0d24ae3` scar class independent of block restyling. Open follow-up: wire it as a post-apply assertion on the *existing* transforms (region edit, restoration) now that it exists.
5. **Voice input** — reuse the command-palette/bot STT verbatim, or a dedicated dictation surface?

---

## 8. Summary

It makes sense, it's architecturally aligned, and it's safe *if and only if* every slice obeys the design law — **AI proposes intent, a deterministic layer enforces correctness + accessibility, and every region is its own accept/revert unit.** The safest, highest-value entry point is **palette-with-deterministic-contrast** (the enforcement already exists and is verified), then **box → scope → typed/voice intent** (generalizing the expert-direct-edit that already shipped), with **block restyling behind a deterministic reading-order guard**, and **sketch / image generation as the clearly-labeled, FERPA-aware frontier.**
