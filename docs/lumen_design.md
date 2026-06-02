# Lumen — Reactive Research Canvas

> Educator / clinician / researcher instrument · `registerTool` id `lumen` · `category: 'data'` · a CDN module that **extends** `stem_lab/stem_tool_dataplot.js`, not a third chart engine · design draft 2026-06-02 · **NOT built** · house style: adversarially honest, critic findings folded directly into the design (per `arc_city_design.md`).

## Executive Summary

**Lumen** is a *reactive research canvas*: a tool where a researcher or educator brings their own data, and the **finding, the chart, and the sentence that explains it are three faces of one live object** rather than three artifacts stitched together by hand in Excel and PowerPoint. Its atomic unit is the **provenance-bound claim** — a chart/statistic/sentence that is a live rendering of its source observations, carries its own lineage (which observations, n, uncertainty, what was assumed), re-derives when the data changes, and **refuses to render more confidence than its provenance licenses**.

The single hard design gate — and the property no BI tool (Tableau) or AI-deck tool (Gamma) has — is **honesty made cheaper than spin**: small samples render *as* small samples, AI inference is *always* visibly marked and burned into each individual mark and sentence (not into chrome a screenshot can crop), and the degree of AI involvement is a **user-set dial** that controls *permission* while the marking that records what actually happened is *always-on*. You can buy all the AI lift you want, but **speculation can never be drawn as crisply, or copied as cleanly, as an observation.**

**Positioning (decisive): the dashboard *monitors*; Lumen *argues*.** Lumen is a pure research/presentation function for *bring-your-own* data. It is explicitly **NOT** a tracker of AlloFlow's own internally-collected student data — that is the existing dashboard's job, and duplicating it is rejected as redundant.

**v1 scope (decisive):** one CDN module extending `dataplot`'s SVG renderer; ingest (typed + one CSV importer); the provenance-bound-claim kernel; the **epistemic ladder L0–L3** (L4 deferred); the **AI-involvement dial** (default ceiling **L1**, zero AI calls until opt-up); the **unified certainty grammar**; an **uncertainty-first stats core** (`n<3` hard-refuse, `n<8` flag); **probabilistic L3 interpretations** (a ranked hypothesis set, not a verdict); and the **anti-laundering floor** as a `verify_all` ship gate. Live multi-stakeholder sessions and AI prose beyond L3 are later phases. See §11.

---

## 1. Positioning — the dashboard monitors, Lumen argues

| | The existing dashboard | **Lumen** |
|---|---|---|
| **Question it answers** | "How is this student/class doing right now?" | "Here is what my study/observation shows, interpreted and presented for *this* audience." |
| **Data source** | the app's own collected data | **bring-your-own** (typed, CSV/paste, a finding, a literature value) |
| **Verb** | monitor / track | **argue / present** |
| **Output** | a live operational view | a defensible, audience-scoped artifact |

This boundary is load-bearing: it is what stops Lumen from being "a second dashboard." Lumen never plumbs into clinical app modules; it is a general research/presentation instrument that happens to live in AlloFlow and rides its session rails for *sharing*, not for *collection*.

---

## 2. The evolutionary conclusion

Each rung of the lineage nailed exactly one face and severed the next:

| Rung | Nailed | Severed |
|---|---|---|
| **Spreadsheet** (Excel) | the *cell* — collect + compute in one place | no narrative, no audience |
| **Slide** (PowerPoint) | the *unit of persuasion* | **dead on paste** — the chart is a screenshot severed from its source |
| **BI dashboard** (Tableau/Power BI) | the *live binding* — charts stay bound and refresh | hides uncertainty to *look* authoritative; built for big clean low-stakes rows |
| **Notebook** (Jupyter/Observable) | *reactivity + reproducibility* | un-shareable to a parent; the output story is code |

Every generation treated **collect / analyze / present as separate objects connected by export.** The evolutionary move is to **invert the dependency**: the presentation is not built *from* the data — it is a live *rendering of a binding to* the data. Once a claim is a pure function of its observations plus a stated method, those three words stop being workflow *stages* and become **three faces of one object**: ingestion mutates it, analysis is derived state, presentation is a view, sharing is a scoped projection. The Excel→Slides rebuild seam doesn't get automated — **it ceases to exist, because there was never more than one object.**

**Honest scoping of the novelty:** charting, regression, CI bands, and CSV/PNG export already exist in the repo (see §12). The genuinely net-new layer is narrow and real: **the binding + provenance + audience-projection + honesty-gate layer.** Everything else is recombination. That narrow layer is what Tableau and Gamma structurally cannot offer.

---

## 3. The core primitive — the provenance-bound claim

```js
// Every element on the canvas is one of these. The chart and the sentence
// are two RENDERINGS of the same binding, so they cannot numerically disagree.
ClaimNode = {
  id,
  binding,            // pointer to the source observations (the L0 data)
  derivation,         // human-readable, reproducible-by-hand string for L1 math
  estimate,           // an Estimate atom (point is render-only; never shown without its interval)
  level,              // L0..L3 — assigned by PROVENANCE (which code path produced it), never by the AI
  prov,               // { ai?: {requestedModel, requestedTemp, promptHash, responseHash}, dataHash }
  audienceTags,       // which faces this is allowed to appear in
  text,               // the sentence face — its level token is the FIRST LITERAL CHARACTERS (see §7)
  styleBundle,        // from certaintyGrammar.encode() — the ONLY source of how it looks
}
```

A claim renders into **audience-scoped faces** (e.g. *IEP-team/full* and *Family/plain*) that are renderings of the *same* binding, so two faces can never contradict each other. Switching audience re-renders; it never copies. How claims aggregate into a full record and project into focused views is §4; the collect/analyze/present pillars are §5 (Pillars 1–3).

---

## 4. Compendium vs. view (and the anti-cherry-picking rule)

*Extends §3 (the provenance-bound claim) into a record + views model; §5 Pillar 3 (scoped projection) is a view in this model. Added 2026-06-02.*

Lumen separates two layers that Excel and PowerPoint fuse and confuse:

- **The compendium** — the full record of a study: every variable tracked, every observation, every derived claim, with complete provenance. The single source of truth. Persisted.
- **A view** — the focused subset selected and arranged for a given moment or audience. A view is a lightweight, **reactive pointer-set** into the compendium — never a copy.

```js
Compendium = { studyId, variables[], observations[], claims[ClaimNode], schemaVersion }
View = {
  id, label,                 // "Working board" · "Parent view" · "Team summary"
  selection,                 // which variables / claims / observation-ranges are shown (pointers, not data)
  density: 'clean'|'standard'|'detailed',
  audience: 'working'|'iep-team'|'family',
  aiCeiling: 0|1|2|3,        // the dial (§6.2)
  shownRange,                // e.g. a date window
}
// Many Views over ONE Compendium. A View stores no data — only references + render settings.
```

**Why this is core, not cosmetic:**
- **Focusing never destroys.** Hiding a probe from a view leaves it in the compendium; the claim's provenance still rests on the full record. (Excel/Tableau make you delete or duplicate to declutter; Lumen does not.)
- **Reactive by construction.** Add an observation to the compendium → every view that includes it re-derives. This *is* the "collect once, presentations stay live" thesis.
- **The exported/shared artifact IS a view.** This unifies with the write-time mask (§7): `publishFace` computes and writes only the granted view; the compendium and other views are never written to the shared doc.
- **Default stays clean (§10).** Lumen opens to one focused default view; the full compendium lives in a data picker one click away.

### 4.1 The anti-cherry-picking rule (the integrity twin of the AI-laundering floor)

The power to choose *what is visualized* is the exact mechanism of selective omission: show the 6 probes that trend up, drop the 4 that do not. A tool that makes curation frictionless makes cherry-picking frictionless. The same principle that governs AI inference (§7) governs data selection:

> **Hiding data to focus is allowed. Hiding *that you hid it* is not.**

Mechanics — do **not** prevent focusing (that makes the tool useless); make omission **visible and recoverable**:
1. **Subset declaration — burned into the sentence, not just the chip.** A header/on-canvas "showing 6 of 10 probes" chip is croppable and is **not** captured by SVG export, so it is only a *convenience copy*; the load-bearing channel is the subset fact **burned into each affected sentence's text** ("across these 6 of 10 probes…") and into the SVG where a mark is affected. The chip itself is quiet, **non-removable**, focusable + SR-announced (a screen-reader user must get this too).
2. **Excluded data is one click away, never deleted** — the chip expands to show what was omitted (and the reason, if given).
3. **Exports / shared faces carry full-n vs shown-n** in provenance (rides the existing lineage field on every claim — §3). A defensible (IEP-team) export with an *undeclared* subset is a **`check_lumen_floor` + sign-off** concern, parallel to the L3 sign-off gate.
4. **Statistics compute on the SELECTED data and say so.** A slope over "6 of 10" is labeled as such; the engine never silently computes on a subset (or the full set) without naming which — closing the subtler laundering where a number implies the whole record.
5. **Honest carve-out.** Like the AI floor, this makes *Lumen's* artifacts self-declaring; it cannot stop someone retyping "+12 WCPM" into an email with no context. **Omission-transparent, not forgery-proof.**

This keeps "the dashboard monitors, Lumen argues" honest: you may argue from a slice, but the slice always points back to the whole record.

---

## 5. The three intertwined pillars

### Pillar 1 — INGEST is a binding, not a paste
A "study" defines its variables once (what is being measured, units, phase boundaries). Adding an observation **dirties the bound graph**; every dependent rendering recomputes.
- **v1 ships:** manual/typed entry + **one** CSV importer with a visible column-mapper. Bring-your-own only.
- **Net-new:** a thin reactive dependency graph that topologically recomputes only dirty claims (~250 lines; the load-bearing core — build and pin it *first*, before any chart polish).

### Pillar 2 — ANALYZE is uncertainty-first and deterministic
Every transform emits an interval/distribution with an attached level, never a bare point. See §6.5. The renderer reads the caveat and refuses to overclaim.

### Pillar 3 — PRESENT is a scoped projection, not an export
One claim set renders multiple faces; the **Family face must preserve uncertainty** (a bare growth arrow handed to the least-equipped stakeholder is the *least* honest projection). v1 ships **two faces** (IEP-team/full + Family/plain); an admin-aggregate face is cut (aggregating across small cohorts re-identifies and manufactures authority). The compendium-vs-view model these projections sit on — and the rule that selective omission must declare itself — is specified in §4; the full control surface and its defaults are in §10.

---

## 6. The probabilistic engine

The engine lets the AI do heavy **non-deterministic** interpretive lifting while keeping that lifting *visible, tunable, and impossible to launder*. The maintainer's requirement, hardened: **the dial controls PERMISSION; the marking is ALWAYS-ON and computed from the level that actually survives, burned into each individual rendered mark and sentence.**

### 6.1 The epistemic ladder (L0–L3; L4 deferred)

**The engine assigns the level by provenance (which prompt rung fired), never the AI.** If a model could self-label its certainty, an L3 reading could come back tagged "L1" and the floor would collapse. Honest caveat the critics forced: provenance records what the engine *asked for*, not what *came back* — so the chip reads **"AI was asked to stay at L3,"** never "this *is* L3."

| Level | Name | Meaning | Produced by | AI? | Response guard |
|---|---|---|---|---|---|
| **L0** | Observed | Verbatim echo of a value the user entered/pasted/imported | ingestion | no | it *is* the input |
| **L1** | Derived (math) | Transparent math over an L0 binding (mean, slope, R², Pearson/Spearman, IQR, bootstrap/t interval); `derivation` stored | Lumen's own pure stats core | no | deterministic, data-hashed |
| **L2** | AI-organized | AI re-words/reorders the **same facts**. Promise narrowed to *"introduces no new NUMBER"* (numeric-whitelist) — **not** "no new claim" | `callGemini` temp 0.2, jsonMode | yes | every numeric token in the reply must already exist in the L1 facts; novel number ⇒ reject |
| **L3** | AI reading | AI proposes inferences/readings the math doesn't state — as a **ranked hypothesis set** (§6.3) | `callGemini` temp 0.7, jsonMode | yes | rendered at fixed maximal-uncertainty grammar |
| ~~L4~~ | ~~Conjecture~~ | ~~AI extrapolates beyond the data / hypothesizes mechanisms~~ | — | — | **DEFERRED to v2, behind the sign-off gate** (Aaron's decision) |

**L2 honesty correction (non-negotiable):** the numeric-whitelist catches invented *figures*, not invented *relationships built from real numbers* ("the steep slope shows students are improving rapidly" — every number real, the claim is inference). So **L2 is advertised as "AI re-organized your numbers; it may still emphasize or frame," never as a 'no-new-claims' safety tier.** A claim-verb detector is the v2 path to a real boundary.

### 6.2 The dial (default ceiling **L1**)

A single global **CEILING** over L0–L3: the maximum level any element is *allowed* to reach this pass. Set **before** visualization and adjustable **during**. It is the *only* control that gates whether a `callGemini` call fires at all — "curtail the AI" literally means fewer/cheaper network calls.

**Default ceiling = L1 (Aaron's decision).** Lumen opens showing *your data + transparent math, firing zero `callGemini` calls*. AI is strictly opt-**up**. Evidentiary rationale: a fluent explanation raises trust *even when wrong* (Zhang/Liao/Bellamy 2020), and the deterministic-construal error (Joslyn & Savelli 2021) makes any AI reading get acted on as fact — so "AI on by default" is the dangerous default.

| Preset | Ceiling | Description shown on select |
|---|---|---|
| **Data only** | L1 | "Your data + transparent math. No AI." *(default)* |
| **Assisted** | L2 | "AI re-words & re-organizes your numbers." |
| **Interpretive** | L3 | "AI proposes readings. Marked as inference; export needs your sign-off." |
| ~~Brainstorm~~ | ~~L4~~ | *visible-but-disabled, "v2" note* |

**What fires at each ceiling:**
- **L0 / L1:** no `callGemini` ever; all AI affordances `disabled` (reuse `dataplot`'s `disabled` pattern, ~`:1460`). The privacy/integrity floor.
- **L2:** one `callGemini(prompt, true, false, 0.2)`. Ships only the PII-free numeric summary (§6.6), never raw labeled rows.
- **L3:** **one** `callGemini(prompt, true, false, 0.7)` per element. The N=3 "sampling agreement" apparatus is **cut** — no batch API, throwing quota, silent model fallback (§12). Honest substitute: every L3 element renders at fixed maximal-uncertainty grammar regardless.

**Per-element override is demote-only.** *Pin* freezes an element at its level so a dial change skips it. *Override* can only push an element **down** (own less certainty); there is **no UI path to promote** an AI element above its engine-assigned rung.

**Lowering the dial purges the written slice.** Greying-out above-ceiling elements keeps their burned-in marking and is reversible — *but* because `dataLayer` writes the whole session doc with no field scoping, retained L3 prose would otherwise persist in the synced doc after you "cleaned" the screen. So **lowering below a rung purges that rung's cached prose from the written slice** (held in volatile memory until re-enabled, which re-fires the call). Greyed above-ceiling marks keep their burn, so the header/footer manifest reflects **`maxLevelPresent` / post-purge written state**, not the bare ceiling — it can never read "L1 · no AI" over a chart still carrying faded L3 marks, and greyed cards are excluded from the manifest count ("what you see is what you ship").

**Keyboard + pointer:** the dial is a single native slider — `role="slider"`, `aria-valuemin=0`, `aria-valuemax=3`, `aria-valuenow=ceiling`, `aria-valuetext="Ceiling L1, Derived — your data and transparent math, no AI"`. Arrows move one rung; Home/End jump; presets are quick-jump buttons that *set* the slider (slider stays the single source of truth). Drag announces only the final ceiling.

### 6.3 Probabilistic interpretations — L3 is a hypothesis set, not a verdict

*(Aaron's refinement, adopted — it makes L3 more honest, not less.)*

When the AI interprets (L3), it does **not** emit one confident explanation. It emits **a set of competing explanations, ranked by relative plausibility**, in a single `jsonMode` call:

```js
// One callGemini(prompt, true, false, 0.7) returns:
{ hypotheses: [
    { text, kind: 'effect'|'rival'|'null', rank },   // rank: 1 = most plausible
    ...                                               // capped at 3–4
] }
// Prompt REQUIRES >= 1 non-effect explanation (chance / regression to the mean /
// maturation / measurement noise) whenever any causal story is proposed.
```

Why this is the right shape:
1. **It is the AI-layer analog of the uncertainty-first stats** — the stats show a distribution over *values*; the interpretation shows a distribution over *explanations*. Same thesis, one rung up.
2. **It defeats the over-trust trap** the L1 default was built around: a set of rival explanations *reads as inference*; one polished sentence reads as fact.
3. **It forces null/rival hypotheses into view** — the scientific-integrity reflex this project already enforces (don't present a confound-blind causal story as the finding).

**The integrity catch (non-negotiable): an LLM's stated probability is uncalibrated — a vibe-number, not a posterior.** Rendering "55%" as a crisp statistic recreates overclaim one level up. Therefore:
- Confidence renders as **coarse ordinal bands — "More likely / Plausible / Less likely," ranked relative to each other, never a percentage**, with the standing caveat *"the model's own ranking of its guesses, not a measured probability."* If any number is shown it is bucketed and explicitly labeled as the model's self-rank.
- The whole set is **L3** (hatched, amber, "AI reading," sign-off-gated). Multiplicity does not promote it; it reinforces "inference."
- Within the L3 card, the certainty grammar **fades lower-ranked hypotheses** (fainter / more hatched) so "solidity = certainty" holds at the hypothesis level too.
- Because L3 is unpinned and regenerates each run, **the set and the ranks shift between runs** — itself honest evidence it's not a measured probability. The card says so.

This turns the riskiest output (one confident causal claim) into the most defensible one (an explicit, ranked, rival-inclusive hypothesis set the clinician evaluates).

### 6.4 The unified certainty grammar

One pure, deterministic resolver — `certaintyGrammar.encode(level, palette)` (no React, no DOM) — is the **single source of truth** for how any element looks. It takes the theme palette as a parameter and owns dash/opacity/texture/glyph, layering them over the palette's colors (so "single source of truth" means the certainty *encoding*, not the palette). Every renderer calls it; no renderer hand-picks opacity/dash. This is what makes a claim's two faces unable to visually disagree.

**Resolved conflict — AI-level and statistical uncertainty share the grammar but NOT the axis.** A researcher must be able to tell *"the math is uncertain"* from *"the AI guessed."* So two distinct, simultaneously-visible encodings share one channel vocabulary: the **AI-inference ladder** (glyph + level-word + texture + caution-ink) and **statistical uncertainty** (the CI band / interval, styled by opacity + hatch), shown alongside, never merged. The unifying principle *solidity = certainty for both* holds; the viewer can always read *which kind* of doubt is in play.

| Channel | L0 Observed | L1 Derived | L2 AI-organized | L3 AI reading |
|---|---|---|---|---|
| **Opacity** (rank only) | 1.00 | 1.00 | 0.85 | 0.60 (clamped) |
| **Texture/fill** | solid | solid | solid | **45° hatch** |
| **Glyph** (real `<text>`, aria-hidden) | ● | ◈ | ◧ | ◑ |
| **Color/ink** (LAST, redundant) | neutral | neutral | neutral | **caution amber** |
| **Text label** | "Observed" | "Derived (math)" | "AI-organized" | "AI reading" |
| **SR announce** | yes | yes | yes | yes |

- **Opacity is rank-only** (humans read alpha ordinally); the glyph + texture + label is the authoritative carrier. **The level word is always full-opacity**, so an L3 label never fades away.
- **Color is the last, fully-redundant channel.** Colorblind-safe mode forces neutral ink for all levels and the grammar still works in grayscale. **Amber, not red** (red is reserved for outliers/errors and *falsely alarms* a parent reading a wide interval).
- **WCAG contrast measured on BOTH canvases.** `dataplot` renders on hardcoded `bg-white`; 0.38-opacity ink on white is a *measured* 1.4.11 failure, so the opacity floor (~0.6 for any legible mark; full opacity for all text) is enforced on white too, not just `.theme-contrast`. In contrast mode, opacity clamps to one readable value and the geometric channels (texture, glyph, label) carry the meaning.

**Charts** extend `dataplot`'s SVG in place: swap the hardcoded `strokeDasharray`/`fillOpacity` on the regression line, CI band, and points for `bundle.svg.*`. **Texture is the one net-new SVG primitive** — authored as inline `<defs><pattern>` injected once into the SVG root and referenced by `fill="url(#cg-hatch45)"`, because export = `XMLSerializer` (`dataplot:591`) and **CSS-class textures would not travel with the file**.

**Sentences** (the claim-card face — the thing people paste into IEPs): the level token is the **first literal characters of `element.text`** — e.g. `"AI reading, unverified: scores rise after the seating change."` Content, not CSS decoration, so a plain-text copy carries its own status. L3 sentences also get a wavy underline as the visual analogue of hatch. **Prose-template invariant (the SR-channel guarantee):** every sentence emits the level word **and** the interval/n in a fixed order — so when both visual encodings collapse to text for a screen-reader user (§9), the statistical-uncertainty channel is never silently dropped. The golden master asserts the serialized sentence contains both an L-token and an interval substring.

**Uncertainty-viz technique — adopted vs rejected:**
- **ADOPTED — frequency framing** for small-n and the Family face (lowest-variance lay reading, Kay et al. 2018), worded as a *description of the procedure*: *"In 1,000 resamples of these 6 points, the slope came out positive 870 times"* — **never** "87% chance the slope is positive."
- **REJECTED — bare error bars** as the primary mark (deterministic-construal error: read as a hard fence and acted on as fact).
- **REJECTED — Hypothetical Outcome Plots / animation** (no static screenshot; breaks SR/print — fatal for an export-proof accessible instrument).
- **REJECTED — VSUP as a literal bivariate colormap** (makes uncertainty color-load-bearing). Adopted only its *principle*: uncertainty suppresses fine detail (a speculative band loses interior ticks; speculative text loses numeric precision).

### 6.5 The probabilistic stats layer

Ships as **`LumenStatsCore`** — a self-contained, Node-requirable pure core in one file (`module.exports` + `window`, per the arccity precedent). **It does NOT refactor `dataplot`** (whose slope/r/IQR/seRegression are closure-locals exported nowhere); it owns its own small copies of the formulas it needs, and a **golden-master equivalence test asserts Lumen's slope/r/IQR equal `dataplot`'s on shared fixtures** — pinning "no numeric drift" without coupling the files.

**Uncertainty-first: every quantity is an interval/distribution with an attached level — never a bare point.** The `Estimate` atom's `point` is render-only and never shown without its interval.

**v1 ships exactly:** mean (t-interval), median (bootstrap interval), linear slope+intercept (t-interval from closed forms), `predictY@x` (with extrapolation refusal), Pearson r and Spearman ρ (each with n attached), IQR/quartiles (bootstrap). Nonlinear fits render as **interval-free, clearly-caveated "illustrative only" curves** — refusing a fake interval beats fabricating one.

**Bootstrap is deterministic:** 1,000 resamples via a `mulberry32` PRNG **seeded off the data hash** (`cyrb53`), so resampling gives the same interval every run — honest about sampling variability *and* snapshot-pinnable.

**Small-n rule (Aaron's decision: n<3 refuse, n<8 flag) — first-class, rendered, announced:**
- **n < 3:** **hard refuse** every trend/slope/correlation/CI. Emit a focusable, SR-announced refusal object: *"n=2: too few points to estimate a trend — no line drawn."* (A missing line is invisible to a screen-reader user; the refusal must be an element, not a silent null.)
- **3 ≤ n < 8:** trend allowed but flagged small-n; wide small-sample interval; rendered with frequency framing and at the **same maximal-uncertainty grammar as L3** — never a crisp solid line.
- **n ≥ 8:** normal interval rendering, still uncertainty-first.
- Degenerate fit (`Sxx ≈ 0`, perfect fit on tiny n) ⇒ refusal.

**t-quantiles:** Lumen ships its **own local t-table** (never touches `dataplot`'s CI-band pixels). v1 is plain percentile bootstrap *labeled as such* (BCa / inverse-CDF deferred).

### 6.6 The deterministic ↔ non-deterministic boundary

`buildClaimContext(estimates)` produces a **PII-free numeric summary** (aggregated stats + ranges only, never raw labeled rows) — the *only* thing that crosses into `callGemini`. **A hard n-floor gates AI entirely (recommend n ≥ 8):** below it, no `callGemini` fires at any level, because a small distinctive summary can re-identify a student and the interval is too wide for responsible interpretation.

**AI non-determinism is labeled honestly:**
- AI estimates default **unpinned** ("regenerates each run"). Gemini exposes **no seed**, so L2/L3 computational reproducibility is not promised.
- **Pinning freezes the bytes** (returned text + metadata) — *reproducible-as-artifact, not -as-computation.*
- Because `callGemini` silently retries malformed JSON at temp 0.1 and falls back to a different model on 429 (§12), `prov.ai.temperature`/`model` are recorded and labeled as **REQUESTED, not actual** ("requested temp 0.7; actual may differ on retry/fallback"). The cleaner fix — extend `callGemini` to return `{text, effectiveModel, effectiveTemp}` — is offered as an option (§14, Q2).

---

## 7. The anti-laundering floor

This is the **core of v1** — the rest of the engine feeds it. Its job: make the epistemic level physically inseparable from every artifact Lumen produces. Honest about its limit: **it makes Lumen's own artifacts un-launderable; it is NOT forgery-proof** — nothing stops a human retyping an L3 sentence into Word. We don't market it as more.

- **`stampElement()` is the only path to the renderer.** The renderer takes a stamped node, not raw props, so an un-marked element is structurally impossible (enforced by single-entry-point convention + golden-master bytes, not a brittle AST proof).
- **The sole load-bearing channel is the PER-MARK burn**, because a screenshot captures a user-chosen rectangle and a footer strip can simply be cropped. Each mark carries opacity + `strokeDasharray` + inline `<defs>` hatch + a small glyph and level word drawn as **actual `<text>` inside the mark's group** — so a crop of one mark still carries its level, and `XMLSerializer` captures it on SVG export for free. The level-word `<text>` is its **own `opacity:1.0` child node** (not merged opacity on the `<g>`), or it would fade with the mark. **Lumen REPLACES dataplot's per-mark group**, which today is a `role="button"` whose Enter/Space *deletes the point* (`:976`), with a read-only epistemic-status announcer — extending its `aria-label` is not enough (reusing it would make Enter destroy data on a research instrument).
- **The sentence burn** (level token = first literal characters of `element.text`) is the prose floor — survives plain-text copy-paste.
- **Footer/legend, CSV header + per-row `level` column, SR announcement, SVG `<desc>`** mirroring the manifest, and a strippable `<metadata>` block (secondary, honest about it). The dormant `#allo-live-dataplot` region (`:29-39`) is *created-but-never-populated* with no push wiring, so it is **not** reusable infrastructure: Lumen builds its own pipeline and owns its own regions — a **polite** `#allo-live-lumen` (routine changes, recompute fan-out coalesced into one summary) plus a **separate assertive** `#allo-live-lumen-alert` reserved for the safety-critical message ("AI ceiling now L3; sign-off required before IEP export") so a density toggle can never clobber it.
- **Export reality:** `dataplot` ships **SVG + CSV only, no PNG/raster path** — SVG is covered by the per-mark burn; PNG/print/OS-screenshot are *outside any code Lumen can run*, which is exactly why honesty lives in the on-screen pixels of each mark, not in an export gate.
- **Legacy `askAI` hole (prerequisite):** `dataplot:595` fires `callGemini` at temp 0.8 and dumps an **unmarked** narrative. The Lumen surface must **reroute/disable** that path so no un-stamped AI render survives.
- **L3+ human sign-off gate (ships WITH L3 or L3 doesn't ship):** `assertDefensible()` runs before any `audience='iep-team'` export. Each L3 element needs a `signoff` whose hash equals the element's current hash; no signoff ⇒ **export BLOCKED**. The human must **OWN it** (type into a *fixed* attribution string — *"Reviewed by {name} — remains AI reading, not a measured finding"*; owning never bleaches the texture/label) or **DEMOTE it** (re-derive at ≤L2 and re-stamp). **No auto-demote** (it manufactures the exact mislabel it set out to prevent). `elementHash` binds the **actual AI response text** (`promptHash + responseHash`), and the predicate re-checks `dataHash` at export time, so a stale sign-off can't validate new prose/data. Sign-off identity is honestly weak (client-set string through an unauthenticated `dataLayer`) — an honor-system attribution, not a cryptographic actor.
- **FERPA gate:** OFF by default; default audience `'self'`. Any export/share with identifiable data requires an explicit per-action toggle. **Every field — all bring-your-own ingested data treated as untrusted — runs through `escHtml`** (the symbol_studio `printBook` pattern) on *every render*, before entering SVG `<text>`, copied HTML, or a shared face.
- **Shared view = WRITE-TIME mask:** `onSessionSnapshot` ships the entire doc with no read-side scoping, so client-side filtering is theater. `publishFace()` computes and writes **only** the one granted face (self/raw and other faces are never written), carrying the full stamp legend + `maxLevelShown`. v1 is single-author publish with a `faceFor` guard.
- **Ship gate:** `check_lumen_floor.cjs` wired **blocking** into `verify_all.cjs` statically asserts (a) `escHtml` wraps every PII field site, (b) no `{self/raw}` face key is ever written in `publishFace`, (c) a single exported render entry point exists. The golden master pins the stamped SVG bytes and asserts the serialized export of an L3 element literally contains the substring **"AI reading"**, and that every drawn mark + card span carries a `StyleBundle` from `encode()`.

---

## 8. Live sessions + exports

- **Live multi-stakeholder sharing is CUT from v1** (highest-severity failure surface; the killer scenario works almost as well from the author's own screen). It is **Phase 3**, gated on the tested write-time-mask invariant + a DPA/security-rules review + a session-expiry/revoke story + debounced SR announcements.
- **Exports** are the evolutionary conclusion made tangible — *the thing you hand a parent and the data you collected are the same object, re-derived not re-typed.* Three shapes: (1) a **rendered-face brief** (self-contained, lineage chips + uncertainty band + caveats intact on its face); (2) a **defensible CSV/JSON** of observations *with* provenance columns (separately, higher-gated); (3) a **methods/citations appendix**. The "living HTML report with embedded re-derivable data" is **cut** — a portable child-data artifact is materially higher-risk; the small-n dated series is itself quasi-identifying and is treated as PII.

---

## 9. UDL & accessibility

The bound-claim atom is the a11y opportunity: because every claim carries a natural-language render, **the sentence IS the screen-reader peer of the chart**, and it must carry the *same* epistemic status in the accessible tree (n, uncertainty, AI-authorship, descriptive-only) as the visual band carries in pixels — otherwise blind users get a *more* confident artifact than sighted users.

- **Two chart types in v1** (phase-annotated trend + bar), each with full keyboard operation and a **semantically-equivalent navigable data table** (**net-new, first-class** — `dataplot` has a data-*entry* grid, not an equivalent read view; this is the SR user's chart) carrying a `level` column, an explicit phase-boundary row + per-segment slope, and the full ranked L3 hypothesis set (incl. its non-effect line), plus a text summary conveying trend/aimline-crossing/phase-change without sight. One honest accessible chart beats five thin ones.
- **Provenance is keyboard-focusable and SR-announced**, not mouse-only.
- **No silent reflow:** single-device, explicit-action recompute, plus a **"freeze view"** affordance (WCAG 2.2.2).
- **Keyboard-operable authoring** throughout (bind, override chart, switch face, accept/reject/demote AI). Drag-to-arrange uses an ordered list + move-up/down, not free drag.
- **No fake reading-level badge** — show "plain-language draft (verify)," never "6th-grade level" unless measured.

---

## 10. Controls, defaults & progressive disclosure

*Pulls together the control surface implied across §4–§9 (selection, the three pillars, the engine, anti-laundering, sharing, and UDL). Principle: **calm by default, powerful on demand.** Added 2026-06-02.*

"Highly customizable" and "clean and focused" pull against each other; a wall of sliders loses that fight. Resolution: one hero control in reach, everything else defaulted well and one click away — the same progressive-disclosure pattern Arc City uses (Play → zero setup → config only *after* the first action).

**Match the control to the data type — NOT everything is a slider.** Sliders are for continuous/ordinal, frequently-adjusted quantities; categorical things are segmented controls or toggles; rare things are set-once config; per-element things are contextual actions. A slider for a binary reads as noise, and a wall of `role="slider"` controls is hostile to screen-reader/keyboard users.

### 10.1 The four orthogonal axes of focus

| Axis | Question | Control type | Default |
|---|---|---|---|
| **Selection** (§4) | *which* data/claims are shown | a view (pointer-set) + the subset chip | one focused default view |
| **Density** | how much detail per shown element | 3-stop segmented: Clean / Standard / Detailed | **Standard** |
| **Audience** | worded/styled for whom | segmented: Working / IEP-team / Family | **Working** |
| **AI ceiling** | how much inference is layered on | **the one slider** (L0→L3) | **L1 (no AI)** |

### 10.2 Control taxonomy

| Control | Type | Default | Lives where |
|---|---|---|---|
| AI involvement (L0→L3) | **the one slider** (genuinely ordinal) | L1 | top of canvas, always visible |
| View density | segmented Clean/Standard/Detailed | Standard | beside the dial |
| Audience face | segmented | Working | beside the dial |
| Active view / open compendium | view switcher + data picker | default view; compendium one click away | beside the dial |
| Small-n thresholds, citation framework, decimals | set-once author config | n<3/n<8 etc. | settings drawer (opt-in) |
| Colorblind mode, reduced motion, freeze-view | toggles | off / off / off | settings drawer |
| Pin · demote · expand provenance · expand hypotheses · sign-off · view-omitted | per-element actions | collapsed | element "⋯ more" |
| **Epistemic marking · n<3 refuse · level-promotion · subset declaration · escHtml/FERPA** | **no control — invariant** | always on | — |

### 10.3 Density is the clutter lever (not a pile of per-thing toggles)

The single best control for "clean and focused" is the **Density** segmented control — one control governs canvas clutter globally, and maps onto the codebase's existing **"Reduced clutter"** UDL knob:
- **Clean:** chart + the plain sentence only — Clean strips the *lineage* chip + CI numbers, but the **level marking and the subset declaration persist at every density** (they ride the per-mark burn + the sentence text, never a Standard-only chip; this resolves the §10.5 invariant).
- **Standard:** + the quiet uncertainty band + lineage/subset chips. *(default)*
- **Detailed:** + intervals, the full ranked L3 hypothesis set (§6.3), provenance numbers.

### 10.4 Default opening state (the answer to "comfortable, clean, focused")

AI dial **L1** · density **Standard** · **one** audience face (Working) · **one** focused view · uncertainty as a soft band with numbers on demand. The canvas opens as *a clean chart + a couple of plain sentences + one dial* — not a cockpit. Only the **AI dial and the subset chip** are persistent (the two integrity signals that must never be a scroll or tap away); **Density, Audience, and the View switcher collapse behind one `[View options ▾]` disclosure, collapsed at first paint** (see §15.1). That is what makes "not a cockpit" literally true on the pilot's 768px viewport. Everything else is discoverable, not displayed.

### 10.5 Invariants are not toggles (the rule that quietly erodes if unwritten)

Customizability stops at the honesty floor. There is **no control** that: dims or hides the epistemic-level marking (§7); drags the **n<3 refuse** (§6.5) to "draw it anyway"; **promotes** an AI element's level (§6.2); hides the **subset-omission chip** (§4.1); or disables **escHtml / FERPA** gating (§7). These are structural invariants. "Highly customizable" governs *what you see and how much AI you invite* — never *whether the truth is allowed to show.*

### 10.6 Accessibility note

Prefer segmented/toggle for categorical controls (clearer, and cheaper for a screen reader than a slider whose `aria-valuetext` must enumerate categories); reserve the slider for the genuinely ordinal AI ceiling. Every control is keyboard-operable with an explicit label + SR value-text; the **Clean density + reduced-clutter** pairing is the low-cognitive-load UDL path.

---

## 11. v1 scope — decisive

**SHIPS:** the reactive kernel + provenance-bound-claim atom; ingest (typed entry as the first-value path + a **rigid-shape** CSV importer — header + x col + value col + optional phase, comma/dot — sequenced *second*; the multi-column/grouped mapper defers to Phase 1.5); ladder **L0–L3** + dial (ceiling L0–L3, **default L1**, four presets, L4 visible-but-disabled); `certaintyGrammar.encode()` + inline `<defs>` hatch + swapped `dataplot` styles on the **one** primary scatter/line path (other chart types hidden until stamped); two distinct simultaneous encodings (AI-level glyph ladder + statistical CI band); `LumenStatsCore` (own pure core, data-seeded bootstrap, uncertainty-first `Estimate`, **n<3 refuse / n<8 flag**, nonlinear-as-illustrative); single `callGemini` per L2/L3 element; **probabilistic L3 hypothesis sets** (ranked, ordinal-band confidence, ≥1 non-effect explanation); the full anti-laundering floor + `check_lumen_floor.cjs` + golden master in `verify_all`; two audience faces (IEP-team + Family-with-uncertainty); FERPA gate OFF by default. **Prerequisites:** reroute/disable legacy `askAI`; bind `elementHash` to the AI response text.

**CUT (explicit):** **L4/Brainstorm** (deferred to v2 behind the sign-off gate — Aaron's decision); live multi-stakeholder sessions (Phase 3); AI prose beyond the ranked L3 set; the N=3 sampling/"agreement" apparatus; the `effectiveLevel = max(aiLevel, spreadLevel)` axis-collapse; the quantile-dot *visual* (ship the frequency sentence only); the contrast-mode opacity→texture-density swap; HOPs/animation; free-text sign-off "own" statements (fixed string in v1); BCa/inverse-CDF (own t-table + percentile bootstrap, labeled); auto-demote-L3-to-L2; multi-author face-race; a claim-verb detector for L2; the embedded-data living report; the admin face; 3 of 5 chart types; auto-phase-inference (phase lines are human-set).

### Phased roadmap
- **Phase 0 — Kernel.** Module skeleton + registration + catalog tile + deploy mirror; the reactive dependency graph + bound-claim atom + `certaintyGrammar.encode()`; golden master for recompute determinism. No charts yet.
- **Phase 1 — v1 pilot.** Everything under SHIPS above, on one stream type (e.g. ORF/WCPM) and the two chart types.
- **Phase 2 — second stream + L4 behind the gate** (only if demand) + claim-verb detector for a real L2 boundary.
- **Phase 3 — live multi-stakeholder sessions** behind the tested write-time-mask invariant.
- **Phase 4 — multi-stream fusion** (several streams, one timeline, one canvas) — the full killer scenario; v2 demo.

---

## 12. Architecture & build notes (verified against the real repo)

Facts confirmed by reading the source (line numbers captured 2026-06-02; **re-pin at build time — they drift**):

- **`callGemini(prompt, jsonMode=false, useSearch=false, temperature=null, searchQuery=null, signal=null, useCodeExecution=false)`** — `gemini_api_source.jsx:12`, with `temperature` passthrough at `:25`. Silent **429 model fallback** (`:74`) and **self-healing JSON repair at temp 0.1** (`:104–105`) — the source of the "requested, not actual" provenance honesty.
- **`dataplot`** (`stem_lab/stem_tool_dataplot.js`, ~1,563 lines): legacy unmarked **`askAI` at `:595`** fires `callGemini(prompt, true, false, 0.8)` (`:605`); button at `:1460` (`disabled` pattern). **Export = `XMLSerializer().serializeToString` → `image/svg+xml` Blob at `:591`; no `toDataURL`/`toBlob`** (SVG/CSV only). Stats (slope/r/IQR/seRegression/Sxx) are **closure-locals** (~`:388–454`), exported nowhere. Hardcoded `bg-white` canvas; live region `#allo-live-dataplot` (~`:29–39`, created-but-unpopulated). A second engine, `stem_tool_datastudio.js` (~1,317 lines), also exists — Lumen extends **`dataplot`**, not a third engine. **Precisely (feasibility-verified):** Lumen *injects* certainty marks into dataplot's SVG and *re-derives* statistics independently (`LumenStatsCore`, golden-master equivalence); it pattern-copies the rendering idioms and **calls none of them** (`regPath`/`ciPath`/`toSX`/`toSY` and all stats are closure-locals, exported nowhere). There are **five SVG roots** (one per chart type — `:933`/`:1011`/`:1037`/`:1082`/`:1111`) and the export selector grabs the *first* `[data-dataplot-svg]` (`:589`), so Lumen v1 keeps **exactly one** root (the trend path) — a golden-master-pinned ship-blocker — to avoid serializing the wrong SVG.
- **`dataLayer`** (`src/dataLayer.js`): `onSessionSnapshot(appId, code, cb)` at `:255` subscribes to the **entire** session doc via `onSnapshot` (`:176`) with **no read-side auth/field scoping** → write-time mask is the only sound sharing model.
- **`window.__alloUtils`** (`AlloFlowANTI.txt:1969–2206`) exposes only url/json/fluency helpers; RTI-tier / Modifiability-Index classifiers are **private closures** (not relevant to Lumen's bring-your-own posture, but confirms there is no shortcut stats API to borrow).
- **`escHtml`** — the symbol_studio `printBook` escaping pattern (~`:16`) is the reuse target for the FERPA/XSS surface.
- Module conventions: built from `lumen_source.jsx` → `lumen_module.js`; must add a catalog tile and mirror to `prismflow-deploy/public/`; pass the `verify_all.cjs` gate suite (render-refs, keyless-map, css-template-literals, eval, xss-surface, translation/lang-json, stem-tile-catalog, deploy-mirror, pair-drift) **plus** the new `check_lumen_floor.cjs`.

---

## 13. Risk ledger

| # | Risk | Mitigation |
|---|---|---|
| **1** | **The sentence is what gets laundered** — people paste the L3 narrative into an IEP; texture/opacity can't live in plain text. | The level token is the **first literal characters of `element.text`** (content, not CSS), so a plain-text copy carries its status. Prioritized above the SVG texture work. |
| **2** | **Screenshot/crop defeats chrome-level marking; PNG/OS-screenshot is outside our code.** | Honesty lives in the **per-mark** burn (survives a crop of one mark), not a footer; the floor is on-screen-pixel honesty, not an export gate. |
| **3** | **`callGemini` lies about its own provenance** (silent 429 fallback, temp-0.1 JSON repair; no seed, no batch). | AI metadata labeled **REQUESTED, not actual**; AI estimates default **unpinned**; pinning is reproducible-as-artifact only; N-sampling cut. Optional one-line wrapper extension offered (§14 Q2). |
| **4** | **Uncalibrated AI confidence read as real probability** (the new probabilistic-interpretation feature's landmine). | Confidence is **coarse ordinal bands, never a percent**; labeled "the model's own ranking, not a measured probability"; the set regenerates each run (visible proof it's not a posterior); whole set stays L3 + sign-off-gated. |
| **5** | **Retained L3 prose leaks via the whole-doc unscoped session write.** | Lowering the dial **purges that rung's prose from the written slice** (volatile memory only); shared faces use the **write-time mask**. |
| **6** | **L2 sold as "no new claims" while policed only for new numbers.** | L2 re-advertised as "AI re-organized your numbers; may emphasize/frame"; claim-verb detection deferred to v2. |

---

## 14. Open questions for Aaron

*(Q on default ceiling, L4, and small-n threshold are **decided**: L1 default, L4 deferred to v2 behind the sign-off gate, n<3 refuse / n<8 flag.)*

1. **The Family-face uncertainty register.** How much uncertainty should a *parent* see — the full stamp legend + count of hidden AI elements (maximally honest) or simplified (lay-clean)? And is the frequency-framed sentence (*"in 1,000 resamples the slope was positive 870 times"*) the right register for a parent, or too technical? (The manifest also leaks "N hidden AI elements" — keep or suppress on the lay face?)
2. **Will you touch the shared `callGemini` wrapper** to return `{text, effectiveModel, effectiveTemp}` (one-line additions at its return sites, behind its existing tests)? If yes, AI provenance becomes *honest-as-fact*; if no, we ship the "requested (actual may differ)" label.
3. **The probabilistic-interpretation confidence display** — coarse ordinal words ("More likely / Plausible / Less likely") only, or coarse words **plus** a bucketed, explicitly-labeled self-rank number? And the hypothesis cap — 3 or 4?
4. **Pilot dataset shape** — for the small-n rule, does the n<8 flag apply to the *total* series or *per-phase* counts in your real progress-monitoring data? (This changes when a trend is allowed across a phase boundary.)
5. **Standards/method citations** — which framework(s) do the methods appendix and any benchmark language cite (CCSS, NCII, Hasbrouck & Tindal, a Maine/state framework), and who signs off on net-new citation copy?

---

## 15. UX & interaction design

> *Synthesizes four critiqued UX approaches (single-canvas, three-pane, document, single-column) into one shell. Decisive picks where they conflicted; critic findings folded in. The earlier sections settled **what** Lumen is and **what it refuses**; this section settles **what a person actually touches.** Added 2026-06-02.*

### 15.1 The chosen shell — a single vertical "Living Brief" lane, Chromebook-first

**Decision: ship the document/single-column hybrid — one scrollable lane of claim cards under a collapsing control header — and reject the three-pane studio for v1.**

Three approaches converged on the same skeleton (single `h('div')` render tree: header → controls → stacked card siblings, matching the verified `dataplot` shape, §12), and they were right. The deciding factors:

1. **The pilot surface is a 1366×768 Chromebook inside Gemini Canvas (per MEMORY).** A persistent three-column studio collapses to a drawer + slide-over sheet there anyway, which means the three-pane design's headline advantage (all panes at once) only exists on hardware the pilot does not use — while costing *two* hand-rolled focus traps on a surface with no dialog framework. Cut.
2. **"Lumen *argues*" (§1) is a document thesis, not a dashboard thesis.** A vertical brief you scroll top-to-bottom *is* the argument, and **the on-screen artifact and the export are the same object** (`publishFace` prints the view you were reading — no Excel→PowerPoint seam, the §2 conclusion made literal).
3. **A vertical document already IS a linear reading order** — the cheapest possible peer-parity for screen readers (§9).

But we fold in the document critic's sharpest correction: **do not oversell "Export simply prints the document" as an honesty guarantee.** Print/OS-screenshot is outside any code Lumen runs (§7, Risk 2); honesty rests *entirely* on the per-mark burn and the sentence prefix, never on the layout. The shell is the convenient carrier of honesty, not its source.

We also take the calm-default fix every critic raised: **the four axes do NOT all sit open in a persistent cockpit.** Resolution: **the AI dial + the subset chip are the only persistent controls; Density, Audience, and the View switcher live behind one `[ View options ▾ ]` disclosure that is collapsed on first paint and expands in place.** This makes §10.4 literally true at first paint and reclaims ~50px on a 768px viewport.

**Default opening state** (dial L1, density Standard, audience Working, one focused view, zero `callGemini`):

```
┌────────────────────────────────────────────────────────────────────┐
│ ‹ Lumen · "Reyna — ORF/WCPM"                       [⚙] [⛶ freeze]   │  title row (back · settings · freeze-view)
│ ┌─── sticky header (the ONLY persistent controls) ───────────────┐  │
│ │ AI ceiling  ●━━○──○──○   L1 · Data only (no AI)        [presets▸]│  │  THE one slider (role=slider, valuetext)
│ │ showing 6 of 10 probes ⓘ                  [ View options ▾ ]    │  │  subset chip (non-removable) + disclosure
│ └────────────────────────────────────────────────────────────────┘  │  (Density/Audience/View live in the ▾)
│                                                                      │
│ §1  ◈ Derived (math)                                     [⋯ more]   │  LEVEL STRIP: glyph + word, full opacity
│ ┌──────────────────── chart (bg-white SVG) ───────────────────────┐ │
│ │  WCPM                                       ___———● ◈            │ │  per-mark BURN: each mark = glyph + level
│ │   70┤                       ●___———'''  ░░░ CI band (stat unc.)  │ │  <text> inside its <g>, opacity 1.0
│ │   50┤        ●___———'''                                          │ │  solid L1 line; band = SEPARATE encoding
│ │     └──┬────┬────┬────┬────┬──►  ┃ phase line (human-set)        │ │  (math-uncertain ≠ AI-guessed)
│ │       w1   w3   w5   w7   w9     [▦ data table]                  │ │  data-table PEER, one tap away
│ └──────────────────────────────────────────────────────────────────┘ │
│ ◈ Derived (math): across these 6 of 10 probes, WCPM rose ~1.8       │  SENTENCE: level word = FIRST literal chars;
│   words/week (95% interval +0.4 to +3.2; n=6, small).               │  subset "6 of 10" + n burned INTO the prose
│ [🔗 6 of 10 probes · n=6 · slope, t-interval]                       │  lineage chip (Standard density)
│                                                                      │
│ §2  ● Observed: highest score 92 WCPM, week 6.           [⋯ more]   │  a sentence-only card (no chart binding)
│                                                                      │
│  + Add observation     + Bind a claim                                │  compose affordances (calm; one tap)
├──────────────────────────────────────────────────────────────────────┤
│  [ Export this view ▾ ]      3 claims · max level L1 · Working        │  footer = the view's manifest (= what ships)
└──────────────────────────────────────────────────────────────────────┘
  live region #allo-live-lumen (sr-only, polite)  ·  #allo-live-lumen-alert (assertive)
```

**Richer state** — dial raised to L3, `[⋯ more]` expanded on §1, Density = Detailed. Nothing reflows the chart; the card grows downward:

```
┌────────────────────────────────────────────────────────────────────┐
│ AI ceiling  ○──○──○──●  L3 · AI proposes readings (export needs sign-off) │
│ showing 6 of 10 probes ⓘ      [ View options ▴ ]                     │
│  └ Density [Clean·Std·●Detailed●]   Audience [●Working●·IEP·Family]   │  ← disclosure OPEN: the other 3 axes
├──────────────────────────────────────────────────────────────────────┤
│ §1  ◑ AI reading · unverified         ⚠ needs sign-off   [⋯ less]   │  amber band (LAST channel), ◑ glyph
│ ┌──────────────────── chart ──────────────────────────────────────┐ │
│ │  ░╱░╱ trend now 45°-HATCHED + amber + ◑ (texture is primary)     │ │  L3 marks: hatch + opacity 0.6 clamp,
│ │  ░░░ CI band still its OWN encoding (the math-uncertainty axis)  │ │  level <text> stays opacity 1.0
│ └──────────────────────────────────────────────────────────────────┘ │
│ ~~AI reading, unverified:~~ the gain may reflect the Tier-2 block.   │  sentence: literal prefix + wavy underline
│ ▾ Ranked hypotheses  (the model's own ranking, not a probability;    │  L3 = hypothesis SET, ordinal bands
│    regenerates each run — itself a sign it's a guess)                 │
│   1  More likely  ◑   Tier-2 phonics block reduced off-task time     │  rank word is LOAD-BEARING (not the fade)
│   2  Plausible    ◑░  practice / maturation effect over weeks        │  fainter + more hatch = redundant only
│   3  Less likely  ◑░░ ⊘ regression to the mean — wk1–2 were low (null)│  ≥1 non-effect explanation (forced, §6.3)
│ ── intervals + provenance (Detailed) ── slope +1.8 [+0.4,+3.2] · req. temp 0.7 │
│ ⚠ Sign off before IEP-team export:  ( ) Own it   ( ) Demote ≤L2   (•) Block │  inline gate (default = Block)
│ [🔗 6 of 10 probes]   [▦ data table]                                │
└────────────────────────────────────────────────────────────────────┘
```

**Where the four axes (§10.1) physically live:**

| Axis | Home | Persistent? |
|---|---|---|
| **AI ceiling** | the one slider, top of the sticky header | **always visible** (the hero; only network/PII gate) |
| **Selection** | the non-removable subset chip (sticky header) + the View switcher (inside `[View options ▾]`) | chip always; switcher behind disclosure |
| **Density** | 3-stop segmented, inside `[View options ▾]` | behind disclosure (collapsed at first paint) |
| **Audience** | 3-stop segmented, inside `[View options ▾]` | behind disclosure |

The subset chip and the dial are persistent *because they are the two integrity signals that must never be a scroll or a tap away* (§15.6). Density/Audience/View are powerful but not safety-critical, so they earn the one-tap disclosure.

### 15.2 The claim-card anatomy

One card = one `ClaimNode` (§3), rendered top-to-bottom so a **vertical crop still carries status first**. Four bands, all driven by the single `styleBundle` from `certaintyGrammar.encode(level, palette)` (§6.4) — chart and sentence cannot disagree because they read the same bundle:

1. **LEVEL STRIP** — left: glyph (`●/◈/◧/◑` as real `<text>`, `aria-hidden`) + the level **word**, at **full opacity even when the marks below fade**. Right: `[⋯ more]` (pin · demote · expand provenance · expand hypotheses · sign-off · view-omitted) and, at L3, a `⚠ needs sign-off` marker. Amber ink only at L3, and only here paired with glyph + word (color is never alone).
2. **CHART FACE** — `dataplot`'s SVG extended in place (§6.4): per-mark `strokeDasharray`/`fillOpacity`/`opacity` read from `bundle.svg.*`; the 45° hatch is an inline `<defs><pattern id="cg-hatch45">` referenced by `fill="url(#cg-hatch45)"` so it survives `XMLSerializer` export. **Each mark's `<g>` carries its own small glyph + level `<text>` at `opacity:1.0`** — a cropped single mark still states its level. The CI band is a **separate simultaneous encoding** (statistical uncertainty), styled distinctly from the AI-level hatch so "the math is uncertain" reads apart from "the AI guessed."
3. **SENTENCE FACE** — same binding as prose; the level token is the **first literal characters** of `element.text` (`"AI reading, unverified: …"`). **The subset declaration ("across these 6 of 10 probes") and `n` are burned into the sentence too**, not only the chip — so a cropped/pasted card self-declares both its level *and* its omission. L3 prose also gets a wavy underline (the visual analogue of hatch). **Invariant: the prose template always emits both the level word AND the interval/n, in fixed order** — so the screen-reader peer never loses the statistical channel (§15.5).
4. **LINEAGE / GATE ROW** — `[🔗 6 of 10 probes · n=6 · method]` chip; at Detailed, the intervals + ranked hypothesis set + `requested temp` provenance unfold here; for L3, the inline `Own it / Demote / Block` sign-off lives here.

**By density** (§10.3):

- **Clean** — LEVEL STRIP + chart + sentence only. **The level marking and the subset declaration survive** (they are in the strip, the per-mark burn, and the sentence text — never in a Standard-only chip). Lineage chip and CI numbers drop.
- **Standard** *(default)* — + the quiet CI band + lineage/subset chip.
- **Detailed** — + intervals, the full ranked L3 set, provenance numbers.

### 15.3 The end-to-end journey

1. **Ingest.** Open from the STEM Lab catalog tile (`registerTool('lumen', { icon, label, desc, color:'amber', category:'data', render })`). Empty lane shows `+ Add observation`, `Import CSV`, and a `Use sample ORF data` shortcut, dial parked at L1. Typed entry adds one L0 observation at a time; the v1 CSV importer is a **rigid-shape file picker** (header row, one x col, one value col, optional phase col, comma-delimited, dot-decimal — no delimiter sniffing, no date coercion). No chart yet; binding precedes drawing.
2. **Define study.** The first set fixes the variable + unit once (editable in `[⚙]`). A human drops the phase line (no auto-phase inference). Compendium now holds variables + observations + phase boundaries; the default Working view is auto-created.
3. **Bind a claim.** `+ Bind a claim` → pick variable(s) → `LumenStatsCore` derives the L1 slope + interval deterministically (§6.5), zero `callGemini`. A §1 card stamps in. **`n<3` ⇒ a focusable refusal card** ("n=2: too few points — no line drawn"), never a blank.
4. **Switch view / density / audience.** Open `[View options ▾]`: tap Density → Clean strips to chart + sentence; tap Audience → Family re-words the sentence to plain register **while preserving the interval + frequency-framed caveat** (Pillar 3); the View switcher swaps the pointer-set and the subset chip updates. Each is one `upd()` on `ctx.toolData.lumen`, committed **on release/select (not per-tick)** to avoid 60Hz re-renders, and announced once.
5. **Dial AI up to L3.** Drag the slider L1→L3 (crossing into L2/L3 shows a "this will call the AI" confirm). **One** `callGemini(prompt, true, false, 0.7)` per element over the PII-free summary (`n≥8` floor, §6.6). The §1 card re-renders as L3: hatch + amber + ◑, a wavy-underlined sentence, and the **ranked hypothesis set** with ≥1 non-effect line, ordinal bands (never a %).
6. **Sign off.** The L3 card shows `⚠ needs sign-off`; the inline gate offers **Own it** (type into the fixed attribution string), **Demote ≤L2** (re-derive + re-stamp), or **Block** (the pre-selected safe default). `assertDefensible()` hard-blocks any `audience='iep-team'` export until every L3 element's sign-off hash matches its current bytes. No auto-demote (§7).
7. **Export.** `Export this view` → `publishFace()` writes **only** the granted face (self/raw never written): SVG via `XMLSerializer` (per-mark burn travels), a defensible CSV/JSON with a per-row `level` column, and a methods appendix. FERPA gate OFF by default; identifiable export needs an explicit per-action toggle; every field passes `escHtml` on every render.

### 15.4 First five minutes (the Arc City "Play → zero setup" precedent)

Zero setup, zero AI, zero PII. The tile opens straight into the lane with the dial pre-pinned at L1 and a `Use sample ORF data` shortcut beside the two compose buttons. **Fastest honest path = typed entry**, not CSV: type a few points → the moment `n≥3` an L1 card draws itself (solid line, soft CI band, two plain sentences) with **zero `callGemini`** — a defensible, honestly-marked chart of real data before a single decision about AI, and the dial sitting at L1 quietly advertises "AI is here when you ask, off until you do." If the user types only 2 points, they get the focusable **refusal card**, not a fabricated line — so even the degenerate first run teaches the honesty floor in the first minute.

*(Build-sequencing note, folded from critics: this first-value loop depends on the reactive kernel + `LumenStatsCore` + `encode()` + the SVG-style swap. Phase 0 must prove the kernel on a single card with typed entry only, before the multi-card scroll or CSV — §15.7.)*

### 15.5 The keyboard + screen-reader journey (peer, not fallback)

A non-visual user does the **identical** journey, because a vertical document already *is* a linear reading order. Tab order follows the lane: back → settings → freeze → **dial** → **subset chip** → `[View options ▾]` (then its segmented controls when open) → each claim card → its `[⋯ more]` → compose → export.

- **The sentence IS the chart's SR peer** (§9), carrying the same epistemic status the pixels do. Its **first words are the level token**, so the SR user hears `"AI reading, unverified:"` before the content — never a more confident artifact than the sighted user gets. The prose-template fixed-order invariant (§6.4) guarantees every sentence speaks the level word *and* the interval/n, so the statistical channel is never dropped in linearization; the golden master asserts the serialized sentence contains both an L-token and an interval substring.
- **The `[▦ data table]` peer** is a first-class deliverable (§9): arrow-navigable, with a `level` column, an explicit phase-boundary row + per-segment slope, and the full ranked L3 hypothesis set incl. its non-effect line.
- **Per-mark `<g>` interaction is REPLACED, not extended** (§7): the legacy `:976` group is a `role="button"` whose Enter **deletes the point**. Lumen's mark group is a read-only epistemic-status announcer: `aria-label="Trend, L3 AI reading, unverified, hatched, +1.8/week, 95% interval +0.4 to +3.2"`; the glyph is `aria-hidden`, the level **word** is in the accessible name.
- **The dial** is one native `role="slider"`; arrows move one rung, Home/End jump, `aria-valuetext` speaks the full meaning, change announces **only the final ceiling** (debounced). Density/Audience are `aria-pressed` segmented controls. A `skip to claims` link sits before the header; the header is `role="banner"` and each card is a labeled region.
- **Live regions, hardened** (§7): a **polite** `#allo-live-lumen` (routine changes, recompute fan-out coalesced into one summary) + a **separate assertive** `#allo-live-lumen-alert` for the safety-critical message ("AI ceiling now L3; sign-off required before IEP export") so a density toggle can never clobber it.
- **Authoring is fully keyboard-operable** (bind, switch face, accept/demote, sign off); reorder is move-up/down, not free drag; recompute is explicit-action with a freeze-view toggle (WCAG 2.2.2). The subset chip's "view omitted" disclosure is a **focusable inline list with Escape-to-close and focus-restore**, never a hover tooltip.

### 15.6 Integrity-surfacing in the layout

The three signals stay visible *and crop-resistant* without clutter, by living where their job demands:

1. **Level marking — burned, never chrome.** Per-mark (`<text>` glyph + level word inside each `<g>`, opacity 1.0) and per-sentence (literal prefix). It scrolls with the content, survives a crop of one mark, a plain-text paste, and `XMLSerializer` export. **Density never touches it** — even Clean keeps the strip, the per-mark burn, and the sentence prefix.
2. **Subset chip — persistent AND burned.** It lives in the sticky header (always co-visible with the slice) **and** the "6 of 10" fact is burned into each affected sentence (a cropped single card still declares its omission — the header chip alone is croppable, so it is a convenience copy, not the load-bearing channel). Non-removable, focusable, SR-announced, and **exempt from Clean's chip-stripping** (§10.3/§10.5).
3. **The dial — pinned, and labeled by what SURVIVES.** It never scrolls away and always shows its current word. The header/footer label reflects **`maxLevelPresent` / post-purge written state** (§6.2), never the bare ceiling — it can never read "L1 · no AI" over a chart still carrying faded L3 marks; greyed above-ceiling cards are excluded from the footer manifest count ("what you see is what you ship").

**Density is the clutter lever (§10.3), not a per-thing toggle pile.** **The honesty floor is structurally not a toggle** (§10.5): no control dims the marking, drags `n<3` to "draw anyway," promotes a level, hides the subset declaration, or disables escHtml/FERPA. The FERPA gate is surfaced visibly **at the export moment**. Amber is the LAST redundant channel; the whole layer reads in grayscale.

### 15.7 v1 UX scope — decisive

**SHIPS (UX):**
- One vertical "Living Brief" lane: sticky header (dial + subset chip + `[View options ▾]`) → stacked claim cards → footer manifest. Single `h('div')` render tree; state in `ctx.toolData.lumen`; compendium library in `localStorage['alloflow_lumen_compendia']`.
- The claim-card anatomy at all three densities; per-mark burn + sentence prefix + subset-burned-into-sentence.
- The one AI-ceiling slider (default L1, L2/L3 confirm-before-callGemini); Density + Audience segmented controls behind the disclosure; the View switcher (the **single** default view; create/name/switch is the only "many views" UI in v1).
- One chart type (phase-annotated trend) **fully done** — keyboard, SR data-table peer with phase row + per-segment slope + hypothesis set, per-mark burn, export burn — before the bar type is duplicated.
- The SR data-table peer as a **first-class deliverable**; the polite + assertive live-region pair.
- Inline L3 sign-off (Own / Demote / Block-default); `assertDefensible()` export gate; `publishFace` write-time mask; FERPA off by default.
- First-value: typed entry + `Use sample ORF data` fixture + the `n=2` refusal card.

**DEFERS / CUTS (fold critics' cuts):**
- **Three-pane studio / persistent side panels** → Phase 2 (not needed on Chromebook).
- **Both hand-rolled modals** (compendium overlay, sign-off sheet) → **eliminated**; compendium edit and sign-off are inline expanding regions, no focus-trap plumbing.
- **Free-form CSV / "paste from Google Sheets" parser** → rigid-shape file importer in v1; column-mapper, grouped/tier variable, delimiter sniffing → Phase 1.5.
- **Bar chart** → Phase 1.5 (after the trend chart's full a11y + burn surface is proven on one path).
- **Detailed-density full provenance-number dump** → ship Clean + Standard fully; Detailed's deepest numbers are a fast-follow.
- **The four preset quick-jump buttons** → behind a `[presets ▸]` disclosure; the native slider is primary.
- **Family-face wireframe** → must resolve §14 Q1 before build; ships **only if** uncertainty-preservation is fully built and tested. Working + IEP-team are the must-haves.
- **Multi-view comparison / split screen, live multi-stakeholder sessions** → per §8, Phase 3+.

**Ship-blockers (the credibility surface — none may slip):** (1) the prose template's level-word-AND-interval fixed-order invariant + its golden-master assertion; (2) the per-mark `<g>` interaction REPLACING the delete-on-Enter contract; (3) the subset declaration burned into the sentence (not chip-only); (4) the header/footer label reflecting `maxLevelPresent`/post-purge state; (5) exactly one `[data-dataplot-svg]` in the DOM (golden-master pinned) so the single-element export selector (`:589`) can never grab the wrong SVG.

---

## Appendix — provenance of this document

This design was produced over several maintainer conversations and **three multi-agent design workflows** (2026-06-02):
1. *alloflow-datacanvas-vision* (14 agents): grounded the concept in the real architecture + practitioner reality + product-evolution landscape; produced the reactive-research-canvas thesis, the provenance-bound-claim primitive, and the dashboard-monitors/Lumen-argues positioning.
2. *lumen-probabilistic-engine* (11 agents): designed the epistemic ladder, the AI-involvement dial, the unified certainty grammar, the uncertainty-first stats layer, and the anti-laundering floor, each adversarially critiqued and grounded in a verified code audit.
3. *lumen-ux-and-feasibility* (11 agents): a read-only feasibility spike into the real `dataplot` internals + a 4-approach UX panel (single-canvas / three-pane / document / single-column), adversarially critiqued. Produced §15 (UX & interaction — the "Living Brief" lane) and a set of feasibility-verified corrections folded back into §4.1, §6.2, §6.4, §7, §9, §10.3–§10.4, §11, §12, and §13 (net verdict: *buildable-with-cuts* — no assumption fatally refuted; the "extends dataplot" framing sharpened to "injects + re-derives," and the delete-on-Enter per-mark group flagged for replacement).

The compendium/view separation (§4) and the control surface (§10) were added 2026-06-02 as direct design refinements from follow-up discussion (no workflow); the document was then reflowed into this textbook ordering (compendium/view promoted to §4 after the core primitive; controls placed at §10 after UDL), with all `§` cross-references updated.

Code line references in §12 were captured during that audit and spot-verified by the orchestrator; **re-confirm them at implementation time.** This is a design draft to be shredded, not a build spec frozen for handoff.
