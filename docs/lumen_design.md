# Lumen — Evidence Workspace and Reactive Research Canvas

> Implemented and expanding · `registerTool` id `lumen` · Study Sources + Analyze Data modes · quantitative design below remains the honesty contract for Data mode · source-study architecture: `docs/lumen_evidence_workspace.md`.

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
- Module conventions: built from `lumen_source.jsx` → `lumen_module.js`; must add a catalog tile and mirror to `desktop/web-app/public/`; pass the `verify_all.cjs` gate suite (render-refs, keyless-map, css-template-literals, eval, xss-surface, translation/lang-json, stem-tile-catalog, deploy-mirror, pair-drift) **plus** the new `check_lumen_floor.cjs`.

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

## 16. Sourced provenance — external & benchmark data

> *Synthesizes four critiqued facets (data-model, AI-assist, render, curated-spine) into one specification for a fourth provenance — external/benchmark facts such as ORF norms, percentiles, and literature statistics. Decisive picks where facets conflicted; every critic finding folded in. Added 2026-06-02. The kernel function names below were re-verified against the real bytes of `stem_lab/stem_tool_lumen.js` (the Phase-1 33-test-green pure core).*

### 16.1 Why Sourced is a fourth, *orthogonal* provenance — and the one rule that keeps it honest

The L0–L3 ladder answers exactly one question: **how was *this number* produced from the researcher's own data?** Observed (L0) → Derived by Lumen's math (L1) → AI-reorganized (L2) → AI-reading (L3). A **pulled fact** — "the Hasbrouck & Tindal 2017 grade-4 winter 50th-percentile ORF is 120 words/min" — does not belong anywhere on that ladder, because its truth was **never produced from this child's dots at all.** Its truth lives in a **citation.** A national norm is not "more certain than an AI reading" or "less certain than an observation"; it is a *different kind* of claim whose warrant is an external source you can open and check.

So Sourced is a **second, orthogonal axis**, keyed `'SRC'`, kept **out of the `LEVELS` array**. This is not cosmetic: keeping `LEVELS = ['L0','L1','L2','L3']` means `levelIndex`, `aiAllowed`, and the export `maxLevel` math are structurally blind to a benchmark — the AI dial can never touch it, and a benchmark can never inflate the AI level of an export. The ship-gate already pins this (`check_lumen_floor.cjs:30` asserts `LEVELS` unchanged; `:34` asserts `caution` is L3-only) — the orthogonal-`'SRC'` choice is the one design that slots in without breaking either assertion or the `encodes every level` golden snapshot (which maps over `LEVELS`, never over `'SRC'`).

**The one rule that keeps it honest** (the worst case is a parent or IEP team reading the norm line as *the child's score* — "she's at 120!"): a Sourced fact is **structurally never the student's data, in all four channels at once.**
1. **Data-model separation** — a Sourced fact lives in `comp.sourceRefs[]`, a *separate array* from `comp.observations[]`. Because `deriveTrendClaim` and `markDirty` read only `observations`, a benchmark **cannot** be regressed through, re-derived, or listed as a student data row. The misread is impossible by construction, not styled-away.
2. **Render separation** — the benchmark draws as a **line with no data marker** (no `<circle>`). The marker's *absence* is load-bearing and survives grayscale, print, and a crop.
3. **Sentence separation** — every Sourced sentence is hard-prefixed `External benchmark (not this student): …` with the **full norm key inline**, exactly the way `trendSentence` already burns `across these 6 of 10 probes`. The prefix is *content*, not CSS, so it travels through copy/paste, the SR peer, and a one-mark crop.
4. **Face separation** — the Family face states the norm as *"where a typical 4th-grade reader is in winter"* and **never blends it into the child's growth sentence.**

### 16.2 The data model — the Sourced element, the citation, the verification state, and how it slots into the built kernel

**The atom** — `sourceRef`, parallel to an `observation`, never pushed into `comp.observations`:

```js
sourceRef = {
  id: 'src1',                 // makeSourceRef assigns 's'+seq, mirroring addObservation's 'o'+seq
  provenance: 'SRC',          // the orthogonal origin (NOT a member of LEVELS)
  kind: 'percentile',         // v1: 'percentile' | 'cut-point'.  ('aimline-target','growth-norm' = Phase 2)
  measure: 'ORF-WCPM',        // an ENUMERATED measure code — must equal comp.measure (refuse, not warn)
  unit: 'words/min',          // must equal comp.unit (refuse on mismatch)
  grade: 4, season: 'winter', percentile: 50,   // the load-bearing KEY (mis-key = mis-apply)
  value: 120,                 // the y the reference line sits at — LOOKED UP, never user-typed (curated path)
  // ── the citation record: a citation is the truth-bearer; no citation => no existence ──
  source: 'Hasbrouck & Tindal', year: 2017,
  population: 'national compiled (DIBELS / DIBELS Next / easyCBM)',
  table: 'Tech. Rpt. 1702 — Grade 4',                 // the SPECIFIC cell used (anti-misapplication)
  locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf',  // resolvable URL/DOI/report# — MANDATORY
  citation: 'Hasbrouck, J. & Tindal, G. (2017). An update to compiled ORF norms (Tech. Rpt. 1702). U. of Oregon, BRT.',
  keyLabel: 'H&T 2017 · G4 · winter · 50th %ile · national compiled',  // printed inline on chart + sentence
  // ── verification state ──
  verified: true,             // curated spine = true; AI-retrieved (Phase 2) = false by construction
  retrievedBy: 'curated',     // 'curated' | 'ai-search'
  reviewedOn: '2026-06-02',   // when a human signed THIS cell against the source (see §16.3)
  _hash: cyrb53(JSON.stringify([     // EVERY truth-bearing field — folds in the critics' "hash too narrow" fix
    measure, grade, season, percentile, value, unit,
    source, year, population, table, locator, citation
  ]))
};
```

**Slots into the built kernel by *additive widening* of named functions — no rewrites, every new param trailing-optional:**

| Real function | Extension | Empty-`sourceRefs` behaviour |
|---|---|---|
| `encode(level, palette)` | add `GRAMMAR.SRC` + `GRAMMAR['SRC-U']` (unverified) sibling keys, add `pal.reference` to `DEFAULT_PALETTE`, return `isReference: g.reference === true` so the render layer knows to draw a line not a dot. `LEVELS` is **untouched.** | unchanged — `'SRC'` reached only via `encode('SRC')` |
| `plotGeometry(observations, claim, box, sourceRefs)` | new trailing arg; reuse the existing internal `sx`/`sy` closures to emit a new `refLines:[{ id, sy, dPath, label, bundle, verified }]` field; expand the y-window to include each `value` so a high norm never clips. `points`/`trendPath`/`bandPath`/`phaseLines`/`xTicks`/`yTicks` **byte-identical.** | `refLines: []` — output diffs only by gaining one empty key |
| `dataTableModel(observations, claim, sourceRefs)` | append `{ reference:true, label:'External benchmark (not this student): …', verified }` rows **after** the data rows, reusing the existing `{boundary:true}` row branch in the table render | no reference rows emitted |
| `chartSummaryText(observations, claim, sourceRefs)` | append one clause per ref naming the benchmark, its key, and the "not this student's data" status | unchanged |
| `faceFor(claim, audience)` | leave claim faces untouched; add sibling `sourcedFace(ref, audience)` (working / iep-team / family) | n/a |
| `assertDefensible(req)` | add sibling `assertSourcedDefensible(req)`; both fold into **one** `assertExportClean(req)` (see §16.4) | returns `{ok:true}` with no refs |
| `buildExportHtml` / `buildExportCsv` | add an escHtml'd **"References"** section / aggregate benchmark rows; route both through `assertExportClean` | no References section |
| `makeCompendium(variable, unit, meta)` | add `sourceRefs:[]`, `_srcSeq:0`, and **`measure`/`grade`/`seasonWindow`** to the returned object; `schemaVersion` 1→2 (defensive read for v1 docs) | a v1 compendium reads as before |

**The new `GRAMMAR` entries** (verified to pass `check_lumen_floor.cjs:34` because `caution:false`):

```js
GRAMMAR.SRC   = { label:'Sourced — verified', glyph:'▣', opacity:1.00, dash:'2 4', texture:'reference', caution:false, reference:true };
GRAMMAR['SRC-U'] = { label:'Sourced — AI-retrieved, UNVERIFIED — check the source',
                     glyph:'▢', opacity:1.00, dash:'1 4', texture:'reference', caution:false, reference:true }; // Phase 2 only
DEFAULT_PALETTE.reference = '#0e7490';   // reserved teal — NOT pal.neutral (student ink), NOT pal.caution (L3 amber)
```

### 16.3 The curated norm spine — the default, and the only thing that renders in v1

The spine is a small, hand-keyed, **citation-complete** table that Lumen *owns* (the repo's `FLUENCY_BENCHMARKS` is grade×season single-value with no percentile / year / citation metadata, and — critically — gives **G4 winter = 112**, a *different, non-percentile* number; it must **not** seed the spine. See the risk ledger). The norm-record shape and the honest seed:

```js
NORM_SPINE = {
  schemaVersion: 1, source: 'Hasbrouck & Tindal', year: 2017, edition: '2017 compiled (Tech. Rpt. 1702)',
  measure: 'ORF-WCPM', unit: 'words/min', population: 'national compiled (DIBELS/DIBELS Next/easyCBM)',
  citation: 'Hasbrouck, J. & Tindal, G. (2017). An update to compiled ORF norms (Tech. Rpt. 1702). U. of Oregon, BRT.',
  locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf',
  gradeRange: [1, 6],     // EXPLICIT — H&T does NOT cover K (no spring ORF) or 7/8. selectNorm REFUSES outside it.
  reviewedOn: null,       // set ONLY after a human transcribes every cell against ED594994 (release blocker — §16.7)
  cells: { /* cells[grade][season] = {p50, p25, wg}; values transcribed + double-checked before reviewedOn is set */ }
};
```

> **The year is load-bearing and stays in the key.** `H&T 2017` is the current compiled edition; `1992`/`2006` differ materially and DIBELS-8 (2020) uses *cut-points*, not percentiles. The edition + `reviewedOn` print in the chip and the export footer so staleness is **visible**, not invisible metadata. **Only one edition per measure ships live** — never two contradictory tables.

**Right-norm selection + mis-selection prevention** — the #1 domain hazard is a norm *correct in the abstract, wrong in context.* Three structural defenses:
- **Keyed lookup, never free-text.** `selectNorm(NORM_SPINE, { measure, grade, season, percentile })` is a pure *lookup*; the value is never typed. This eliminates the transcription-error class for the curated path.
- **Refuse — not warn — on hard mismatch** (folds in every render/curated critic): `selectNorm` returns `{ ok:false, refused:true, hazard }` and **draws nothing** when (a) `measure` ≠ `comp.measure` (an *enumerated code*, not a unit string — catches "right unit, wrong construct," e.g. maze vs ORF), (b) `unit` ≠ `comp.unit`, (c) `grade` outside `gradeRange`, or (d) the cell value is `null` (e.g. G1 fall). **Season is never inferred** from the x-window — it is a *mandatory explicit pick* (the Jan-vs-spring error is the most common real one, so the picker forces it).
- **Auto-bind PRE-FILLS, never finalizes.** The picker pre-fills `grade`/`season` from `comp.grade`/`comp.seasonWindow` (now real fields, §16.2) for human confirmation; it never silently selects a cell, because a wrong `comp.grade` would otherwise launder the wrong norm as authoritative.

**The King 8th-grade pilot is the concrete case the refusal is built for.** H&T tops out at G6, so a G7/G8 request **hard-refuses** with a pointer: *"H&T 2017 covers grades 1–6; grade 8 is out of range. Use a DIBELS-8 cut-point table or a constructed aimline."* The tool *knows the gap* rather than extrapolating a plausible-but-wrong line. **Consequence, decided:** v1 ships a second curated **DIBELS-8 ORF cut-point** entry covering G7/G8 (`kind:'cut-point'`) so the pilot's flagship overlay actually exists for its own classroom — *not* deferred (a spine empty for the only grades the pilot serves would mean the safe path doesn't exist for the real users).

**Updatability** — bump `year`/`edition`/`cells`/`locator`/`reviewedOn` together; the `_hash` over every truth-bearing field means any cell edit invalidates a stale verification automatically.

### 16.4 AI-assist-then-verify — **Phase 2**, specified now so the seam is right

AI-search is a strictly-optional *"help me find it"* assist, never the default, and **cut from v1.0** (it concentrates every hallucination and screenshot-laundering risk, and the policy already calls it assist-only). It is specified here so v1's seams are correct and the critics' real-API corrections are recorded.

**Flow (Phase 2):** `findNormViaAI(query)` builds a **PII-free, numberless** retrieval request (only `measure/grade/season/percentile` — leaner than `buildClaimContext`, zero student data) and calls the **real** signature:

```js
callGemini(prompt, /*jsonMode*/ true, /*useSearch*/ true, /*temperature*/ 0.2)
// on useSearch the return is { text, groundingMetadata } — NOT a string (gemini_api_source.jsx:140–146)
```

**Two corrections the critics verified against real bytes (do not repeat the facets' errors):**
1. There is **no 5th `searchQuery` arg** that does anything — the query *is* the prompt; the provider derives any sub-query internally. The signature is 4 meaningful args here.
2. **`processGrounding` is NOT a `{url,title}` extractor** — it returns *annotated prose + an optional bibliography string.* Resolvable locators live in **`result.groundingMetadata.groundingChunks[].web.{uri,title}`**; read those directly (and a locator must come from a real chunk, never model free-text).

**Always-unverified by construction.** The result is a **candidate**, never a `sourceRef` with `verified:true` — the AI has *no code path* to set `verified:true`. It is marked `Sourced — AI-retrieved, UNVERIFIED — check the source`, and:
- **It does not draw on the chart and does not print its load-bearing number** until a human opens the locator. (This closes the screenshot-laundering hole *at the source* — an unverified line/number that never reaches pixels can't be screenshotted past the gate. The candidate lives in a verify panel showing citation + locator, value revealed only after the human opens the source.)
- A null/absent `groundingMetadata` (best-effort and nullable even with `useSearch=true`) → **no resolvable locator → born already-failing**, value never shown.

**Human-verify + sign-off (reuses the L3 mechanism verbatim).** Opening the locator and clicking *"Verify against source"* sets `verified:true`, stamps `reviewedOn`, and stores `sourceSignoff[id] = sourcedSignoffHash(ref)` over **every truth-bearing field**. Editing *any* of them (value, citation, **population**, year, locator…) changes `_hash`, orphans the signoff, and **re-blocks** — exactly like a regenerated `aiHyps` invalidates `signoff`.

**The hard block.** `assertSourcedDefensible(req)` returns the same `{ ok, blocked, need, reason }` contract as `assertDefensible`. Both are folded into **one** export entry point — **`assertExportClean(req)`** — that ANDs them and through which **every** artifact (HTML *and* CSV, present + future) must route. (Today `buildExportCsv` has *no* defensible gate; the unified entry point closes that ungated path.) `verified:false` everywhere is treated as unverified, **including a `stale` (edited-after-signoff) ref** — stale is unverified, not "verified-but-edited," so a stale number is hidden everywhere, not just at the export boundary.

### 16.5 The benchmark reference line — render, chip, SR peer, color/contrast

**Distinct from data, trend, and band, by construction:**
- **Channel:** reserved **teal `#0e7490`** + dotted-dash **`'2 4'`** + flag glyph **`▣`** — neither the solid L0/L1 student ink (`pal.neutral`) nor the L3 amber+hatch (`pal.caution` + `hatch45`, dash `'6 3'`). Four dash vocabularies now coexist (data solid, phase `'2 3'`, band fill, reference `'2 4'`); because dash-as-meaning degrades for low-vision and is invisible to SR users, **every** distinction is also carried in the SR peer and summary text (below).
- **No data marker.** `plotGeometry` emits the benchmark in `refLines[]` as a `dPath`, never in `points[]` — so it is impossible to read it as a measurement at the mark level.
- **Layer order:** gridlines → band → **reference line** → phase lines → trend → data points (data on top).

**The citation chip** is a real focusable element: an accessible group named with `keyLabel`, and the locator a real `<a>` whose `href` is **escHtml'd AND scheme-allowlisted to http/https** (a `javascript:` locator from any pasted/AI text is *blocked*, not merely escaped — the symbol_studio `printBook` href/scheme lesson). The flag `▣` must **never clip** (it is the print/grayscale fallback channel); confirm `▣`/`▢` (U+25A3/U+25A2, both BMP) render in the Canvas font stack rather than tofu.

**SR / data-table peer** (the design's strongest dimension — keep it). `dataTableModel` prepends/appends a labeled `{ reference:true }` row peer to the existing `{ boundary:true }` phase rows: *"External benchmark (not this student): H&T 2017 G4 winter 50th = 120 words/min [verified]"* — and the row label **carries the verify state in words** (`[verified]` / `[UNVERIFIED — check the source]`), so an SR user hears the trust status, not just sighted users. `chartSummaryText` (which **is** the SVG `role="img"` `aria-label`) names every benchmark aloud with its full key and the not-this-student clause. **Do not** promise a per-line `aria-label` — children of a `role="img"` subtree are atomic and would be swallowed; the summary + the table row are the real SR channels.

**Color/contrast (asserted-but-wrong figures corrected).** Teal `#0e7490` on white is **≈3.9:1**, which **passes** WCAG 1.4.11's 3:1 bar for the **1.5px line and the glyph** but **fails** 4.5:1 for normal text. Therefore **chip text is near-black `#0f172a`; teal is used only for the line, border, and glyph.** `markOpacity` is 1.0 (a benchmark is a fact, never faded) and clamped above `OPACITY_FLOOR`. A new `check_lumen_floor.cjs` assertion pins that `pal.reference` is non-caution and color-distinct (Δ from both neutral and caution) across shipped palettes.

### 16.6 The no-external-data default — strictly opt-in, fully robust with none

**`comp.sourceRefs` starts `[]` and the tool is 100% functional with zero benchmarks.** Every widened function is **byte-identical** to today on the empty array: `plotGeometry` returns `refLines:[]` and an otherwise unchanged object; `dataTableModel`/`chartSummaryText` emit no reference content; `encode` is reached for `'SRC'` only when a ref exists. The deterministic-L1, n<3-refusal, graceful-fallback "no-AI / no-external" path remains the robust default — Sourced never degrades it.

**The regression test that pins it** (added to the golden-master suite + `check_lumen_floor.cjs`):

```js
// EMPTY-SOURCED INVARIANCE — the no-external-data default must not move.
const g0 = L.plotGeometry(comp.observations, claim, undefined);          // pre-Sourced call shape
const g1 = L.plotGeometry(comp.observations, claim, undefined, []);      // new arg, empty
delete g1.refLines;                                                      // the only permitted new key
ok(JSON.stringify(g0) === JSON.stringify(g1), 'empty sourceRefs must leave plotGeometry byte-identical');
ok(JSON.stringify(L.dataTableModel(comp.observations, claim)) ===
   JSON.stringify(L.dataTableModel(comp.observations, claim, [])),       'empty sourceRefs must leave the SR peer byte-identical');
ok(JSON.stringify(L.LEVELS) === JSON.stringify(['L0','L1','L2','L3']),   'SRC must NOT enter LEVELS');
```

### 16.7 v1.x scope — decisive

**SHIPS (v1.0 — curated-only, zero `callGemini`):**
- `GRAMMAR.SRC` + `pal.reference`, `encode('SRC')` with `isReference`; `LEVELS` untouched.
- `sourceRefs[]` on the compendium (physically separate from `observations`); `makeSourceRef`/`addSourceRef` mirroring the `'o'+seq` id pattern; `comp.measure`/`grade`/`seasonWindow` (schema 1→2, defensive read).
- The **curated spine**: H&T 2017 ORF percentiles **G1–G6** (`kind:'percentile'`) **plus one DIBELS-8 G7/G8 cut-point** entry (`kind:'cut-point'`) so the King pilot has an in-range source. Each cell **byte-transcribed and double-checked against ED594994** before `reviewedOn` is set — a **release blocker**.
- `selectNorm` keyed lookup with **hard refuse** on measure/unit/grade-range/null-cell mismatch; **mandatory explicit season** (no inference); auto-bind **pre-fills only**.
- **One** flat horizontal reference line at a time (default = the p50 aimline for the chart's season; 25th available as the "some-risk" floor) — a one-active-reference cap kills the benchmark-vs-benchmark misread.
- `plotGeometry` `refLines`, `dataTableModel` `{reference:true}` peer (with verify-state in words), `chartSummaryText` benchmark clause, `sourcedFace` (working/iep-team/family) with the **population caveat inline** ("a national reference, not an individualized goal").
- One unified **`assertExportClean`** gate through which **both** `buildExportHtml` and `buildExportCsv` route; benchmarks rendered in an escHtml'd + scheme-allowlisted **"References"** section; `maxLevel` unchanged (Sourced reported on a separate footer line: *"External references: N verified"*).
- New `check_lumen_floor.cjs` assertions (LEVELS-unchanged, SRC-non-caution + color-distinct, empty-Sourced invariance, fronted-cell-equals-published-value) + golden-master cell snapshot of the spine.

**CUT (explicit, folding every critic's cut):**
- **The entire AI-search assist** (`findNormViaAI`, grounding extraction, the candidate state machine, `assertSourcedDefensible`, the on-line UNVERIFIED stamp) → **Phase 2**, behind a golden-master extension, using the corrected `callGemini`/`groundingChunks` APIs (§16.4). Because v1 renders **only verified** lines, screenshot-laundering of an unverified number is *structurally impossible* and no on-line UNVERIFIED stamp is needed this round.
- **`aimline-target` and `growth-norm` kinds** (sloped/constructed lines) — the slope-vs-source provenance-blending question is unresolved and `plotGeometry` draws horizontal lines only; ship `percentile` + `cut-point`. The killer use case is fully served by a horizontal reference line.
- **Seeding from the repo `FLUENCY_BENCHMARKS`** — it injects a wrong number (112 ≠ the H&T 50th-percentile). Hand-key from the primary source instead.
- **Season inference** from the x-window; **silent auto-bind**; the **per-SVG-line `aria-label`** promise.

### 16.8 Risk ledger (top four + the mitigating decision)

| # | Risk | Mitigating decision (decided) |
|---|---|---|
| **S1** | **Screenshot/print launders an unverified number** — the export gate never fires on a Canvas screenshot, and an unverified line in the same teal channel reads as authoritative external *fact* (worse than an L3 reading). | **v1 renders only `verified` curated lines** — an unverified number never reaches pixels. When the AI path lands (Phase 2), the candidate value is **hidden until a human opens the locator** and never auto-draws; gate the *line*, not just the file. |
| **S2** | **"Verified" conflates "from our table" with "the number is correct."** A hand-recalled cell with a real citation stapled on is the worst laundering — and the facets' headline number (G4 winter = 120) was *recalled, not byte-checked*, and the repo's own table says 112. | **`verified` means "a human signed THIS cell against the source."** Every spine cell is byte-transcribed + independently double-checked against ED594994 and snapshot-pinned **before `reviewedOn` is set**; a wrong cell is a **release blocker**, not an open tension. A `check_lumen_floor` assertion pins the fronted cell against the published value. |
| **S3** | **Misapplication** — right number, wrong *grade/season/measure/population/year* (the #1 domain hazard). | **Keyed lookup + refuse-not-warn** on out-of-range grade / wrong unit / **wrong enumerated measure code** (catches right-unit-wrong-construct) / null cell; **mandatory explicit season** (no inference); **population caveat inline** in the iep-team & family faces; **edition + `reviewedOn` in the chip + footer** so staleness is visible; **G7/G8 hard-refuse → DIBELS-8/aimline** for the King pilot. |
| **S4** | **Two contradictory ORF tables ship in one product** (`FLUENCY_BENCHMARKS` G4-winter=112 vs the spine's 120) — a clinician sees conflicting "benchmarks." | The spine **does not seed from** `FLUENCY_BENCHMARKS`; the two are **date+namespaced** (the legacy table is the fluency-module's own non-percentile median; the spine is the citable H&T 2017 percentile set) so the discrepancy is *explained*, not duplicated. Reconciling/deprecating the legacy table is a tracked follow-up. |

### 16.9 Pure-function contracts to build next (brains-first, golden-master pinned)

Net-new `LumenCore` exports for the v1.0 (curated-only) slice. All pure, Node-requirable, no DOM, deterministic (no `Date`/`Math.random`). Build + snapshot these *before* any render wiring, the same brains-first pattern that put 33 tests green.

```js
// ── spine + selection ──
NORM_SPINE                                  // the curated, citation-complete table (data, release-gated)
DIBELS8_ORF                                 // the curated G7/G8 cut-point table (data, release-gated)
selectNorm(spine, { measure, grade, season, percentile })
  -> { ok:true, ref:<sourceRef> }
   | { ok:false, refused:true, hazard:'wrong-measure'|'wrong-unit'|'out-of-range'|'no-cell', reason:string }

// ── the atom ──
makeSourceRef(spec, comp)                   // builds + validates a sourceRef; THROWS on missing citation/locator
                                            //   or measure/unit mismatch; computes keyLabel + _hash. -> sourceRef
addSourceRef(comp, ref)                     // comp._srcSeq+=1; ref.id='s'+seq; comp.sourceRefs.push(ref) -> id
sourcedRenderable(ref)                      // false (announceably, never silently) if citation/locator absent
                                            //   or locator scheme not http/https -> { ok:bool, reason:string }

// ── encoding (the one encode() widening + a hue check) ──
encode('SRC' | 'SRC-U', palette)            // -> bundle incl. { ink:pal.reference, isReference:true, caution:false }
referenceContrastOK(palette)                // -> bool: pal.reference is Δ-distinct from neutral AND caution

// ── geometry + peers (the trailing-optional widenings) ──
plotGeometry(observations, claim, box, sourceRefs)      // adds refLines:[{id,sy,dPath,label,bundle,verified}]
dataTableModel(observations, claim, sourceRefs)         // adds {reference:true,label,verified} rows (state in words)
chartSummaryText(observations, claim, sourceRefs)       // appends one not-this-student benchmark clause per ref
benchmarkChipText(ref)                                  // -> 'External benchmark (not this student): '+keyLabel+' = '+value+' '+unit

// ── faces + the unified export gate ──
sourcedFace(ref, audience)                  // 'working' | 'iep-team' (full citation + population caveat) | 'family'
sourcedSignoffHash(ref)                     // cyrb53 over EVERY truth-bearing field (Phase-2 verify; defined now)
assertSourcedDefensible(req)                // {ok,blocked,need,reason} — Phase-2 (no-op pass in v1: all verified)
assertExportClean(req)                      // ANDs assertDefensible + assertSourcedDefensible; THE export entry point
```

**Build order:** (1) `NORM_SPINE`/`DIBELS8_ORF` data + cell golden-master + fronted-cell-vs-published assertion; (2) `selectNorm` + refusal tests; (3) `makeSourceRef`/`addSourceRef`/`sourcedRenderable`; (4) `encode('SRC')` + `referenceContrastOK` + the LEVELS-unchanged + empty-Sourced invariance assertions; (5) the four geometry/peer/face widenings; (6) `assertExportClean` routing both export builders. Then wire the render.

---

**Bottom line:** §16 lets Lumen **pull external stats safely — or use none at all.** The curated, byte-checked, citation-mandatory spine renders external benchmarks in their own channel, structurally separate from the student's data, refusing the wrong norm rather than drawing it; the no-external-data path stays the robust default; and the AI-retrieval assist is deferred behind the same proven sign-off gate — so this adds a fourth provenance **without reopening the overclaim debt.**

---

## 17. Ingest — file formats beyond CSV (Phase 1.5 + the deferred fork)

§5 Pillar 1 already commits Lumen to "INGEST is a binding, not a paste." This section spec's the *file-format* surface for the student-data lane (the §16 SOURCED lane has its own ingest spec at §16.4). The 2026-06-04 audit-driven extension shipped Phase 1.5; this section pins what was built, what was deliberately deferred, and the rule that keeps the deferred path from being smuggled in.

### 17.1 What's in (Phase 1.5 — shipped 2026-06-04)

A file-picker button (`⇪ Import file…`) sits next to **Use sample**. It accepts four extensions — `.csv`, `.tsv`, `.txt`, `.xlsx` — and routes each through one of two pure parsers exported from `LumenCore`:

| Type | Parser | Library | Determinism |
|---|---|---|---|
| `.csv` / `.tsv` / `.txt` | `parseTextTable(raw, opts?)` | none (~115 lines of in-file RFC-4180) | byte-stable |
| `.xlsx` (single sheet) | `parseWorkbookSheet(XLSX, buffer, sheetName?)` → `XLSX.utils.sheet_to_csv` → `parseTextTable` | SheetJS via `lazyLoadXLSX()` CDN script tag | byte-stable when SheetJS pinned; wrapper degrades to a structured error if the library never loads |

The text parser autodetects the delimiter (`,` vs `\t` vs `;`) from the first line, strips a UTF-8 BOM, normalizes CRLF→LF, handles RFC-4180 quoted fields with embedded delimiters and doubled-quote escapes, downgrades `hasHeader` when the first row is all numeric, trims wholly-empty trailing rows (Excel artefact), caps at **2 MB / 10 000 rows** with structured errors on overflow.

**Mapping is decoupled from parsing.** `parseTextTable` returns `{ headers, rows, delimiter, notes }`. The user picks column roles (x / y / phase / y2 / series) in a preview panel — the column-mapper — that shows the first ≤5 rows. On **Confirm + bind**, `mapTextTableToObservations(table, mapping)` coerces the chosen columns and returns `{ rows, dropped }`; only `rows` reach `addObservation`. Numeric fields refuse non-numerics; refused rows go to `dropped` with `rowIdx` + a structured reason (`'missing-xy'` or `'non-numeric-xy'`) — **never silently lost**.

### 17.2 The L0 contract — verbatim echo, no AI in the parse path

Every observation that survives mapping is **L0** by §6.1: "verbatim echo of a value the user entered/pasted/imported." The implementation guarantees this with five invariants, all gated in `check_lumen_floor.cjs` group 11:

1. **No AI call in the ingest path.** Parsers, mapper, and the wrapper UI never reach for `callGemini`. The parse → preview → bind sequence is fully deterministic.
2. **Headers never enter the AI surface.** Headers stay on `d.importPreview` (preview-shape only). They never copy into `comp.variable`, `comp.observations`, or `buildClaimContext`. A header that happens to read `"Reyna_Hernandez_grade4_wcpm"` produces a chart-context JSON with zero PII (golden-master-pinned).
3. **Kept + dropped = total.** The mapper never invents a row and never silently drops one.
4. **`y2` and `series` are conditional-spread** (the same single-var byte-identity invariant `addObservation` enforces). A single-var mapping never carries `y2: undefined` or `series: undefined`, so the imported rows are byte-identical to typed ones at the compendium level.
5. **Round-trip is L1.** Imported observations bind into an existing compendium and `deriveTrendClaim` produces an L1 claim — no level inflation from the ingest channel.

### 17.3 What's deliberately deferred (and the rule that keeps it deferred)

The four file types **not** in Phase 1.5 — `.pdf`, `.docx`, `.png`/`.jpg` (data-sheet photos), and Google Sheets URLs — were deferred. Each carries a different version of the same risk:

| Type | Why deferred | What it would need before ship |
|---|---|---|
| **`.pdf` (born-digital, student data)** | A PDF table is not a table — `pdf.js` extracts a text stream, and reconstructing rows/columns requires AI layout inference. That makes the parse step **L2 producing L0 numbers** — exactly the L0-contract violation §6.1 is designed to prevent. | A "Parse Receipt" UI that shows every extracted cell with an edit box BEFORE binding; the L2 parse is marked L2 in the preview, and only the user-edited-and-confirmed values flip to L0 at bind time. Even with that, a sweep-accept of 30 cells where one is wrong is a credible harm in a school-psych progress chart — wait for the **v2 L2 claim-verb detector** (the same one that makes L2 a real boundary). |
| **`.docx` (Word with embedded tables)** | Mammoth.js can extract a clean HTML/text representation, but real-world progress-monitoring Word docs are narrative ("Reyna read 53 wcpm with 4 errors") not tables. Parsing narrative → numbers is again **L2 over an L0 contract.** | Same Parse Receipt + v2 detector. Until then, encourage the practitioner to paste the numbers into a CSV. |
| **`.png` / `.jpg` (handwritten data-sheet photo)** | Vision-OCR over a handwritten sheet inherits *all* of the PDF risk plus character-recognition error. It is the maximum-laundering path. | Multi-pass OCR + per-cell confidence + a Parse Receipt that defaults every low-confidence cell to "edit required". Not in scope until a real classroom workflow demands it. |
| **Google Sheets URL** | The data is fine (it *is* a sheet); the problem is OAuth + cross-origin + a permanent network dependency in a tool that ships zero-cost in Canvas. | If the maintainer wants it, ship a "paste the public CSV-export URL" flow first (which is still text + `parseTextTable`); leave OAuth until v2. |

**The rule:** **a file type may join the ingest menu ONLY when its bind step produces L0 *without* an AI parse on the path from bytes to numbers.** CSV/TSV/TXT meet the rule trivially. XLSX meets it because `sheet_to_csv` is a deterministic transformation written by SheetJS, not a model inference. PDF/DOCX/images do not meet it today — they would require AI structuring, and the audit's "L0 must be verbatim" line is precisely the one that protects the school-psych use case.

### 17.4 Where the §16 SOURCED lane fits

The §16 SOURCED lane (curated norm spine) is a **separate ingest surface** with a separate rule: external benchmark documents *can* feed it via PDF/DOCX extraction (§16.4 "AI-assist-then-verify, Phase 2"), because the SOURCED lane requires a sign-off for every cell and the lane is **structurally never the student's data**. The same PDF that is unsafe for the student-data lane is safe for the SOURCED lane *because the SOURCED lane was designed for it.* This is the cleanest place to land the "PDF support" the practitioner asked about — but as a **§16 Phase-2** unblock, not a §17 student-data extension. (Phase 2 of §16.4 specifies the verify-every-cell pattern; the byte-transcription release-blocker on the H&T spine is the right next milestone.)

### 17.5 Pure-function surface (LumenCore exports)

Wire this into any new ingest UI or test:

- `parseTextTable(raw, opts?)` — text → `{ headers, rows, delimiter, notes, error? }`.
- `mapTextTableToObservations(table, mapping)` — table + role assignment → `{ rows, dropped, error? }`.
- `parseWorkbookSheet(XLSX, buffer, sheetName?)` — workbook → `parseTextTable` result with `sheetName` + `sheetNames`.
- `lazyLoadXLSX(cdnUrl?)` — Promise-based on-demand load; returns `null` in Node.
- `ingestFileTypeFromName(name)` — `'csv' | 'tsv' | 'txt' | 'xlsx' | null` (the gate the file-picker uses; PDF/DOCX/images return `null` by design).
- Constants: `INGEST_MAX_BYTES` (2 MB), `INGEST_MAX_ROWS` (10 000), `INGEST_DELIMS` (`[',', '\t', ';']`), `INGEST_FILE_TYPES` (`['csv','tsv','txt','xlsx']`).

Coverage: `tests/lumen_ingest.test.js` (29 unit tests on the pure parsers + the L0/PII contract); `tests/lumen_render_golden.test.js` (4 new snapshots covering the import button + column-mapper preview + parse-error inline surface); `dev-tools/check_lumen_floor.cjs` group 11 (10 ingest invariants, blocking).

---

## 18. §16 SOURCED — Phase 2A: human-assisted spine-cell population

§16.7 ships v1 with the curated NORM_SPINE **empty** — every cell must be byte-transcribed against ED594994.pdf before `reviewedOn` is set. §16.4 specs AI-assist-then-verify as Phase 2 but **explicitly cuts** AI-search from v1 because it concentrates every laundering and screenshot risk. The 2026-06-05 audit-driven extension shipped a third path between those two: **Phase 2A — human-assisted spine-cell population**. The benchmark PDF / DOCX text extracts deterministically (no AI on the path from bytes to numbers), a side-by-side workspace surfaces the source excerpts next to a scaffold of empty cells, the human types each value + signs off per cell, and verified cells fold into a paste-back JSON snippet for `NORM_SPINE.cells`.

This section pins what Phase 2A is, what it pointedly is NOT, and the contract that keeps the §16.4 always-unverified-by-construction rule intact even with a workspace that visibly fills cells.

### 18.1 What's in (Phase 2A — shipped 2026-06-05)

A toggle-button on the entry row opens a SOURCED workspace panel distinct from the §17 student-data importer (teal accent + ▣ glyph to match §16.5's reserved channel). The panel accepts the §17 file types **plus** `.pdf` and `.docx`:

| Type | Extractor | Library | Determinism |
|---|---|---|---|
| `.pdf` (born-digital, text-extractable) | `extractPdfText(pdfjsLib, buffer)` | pdf.js via `lazyLoadPdfJs()` | per-page text stream; library handles font kerning + glyph ordering deterministically |
| `.docx` | `extractDocxText(mammoth, buffer)` | mammoth.js via `lazyLoadMammoth()` | raw text (mammoth's `extractRawText`); no AI structuring |
| `.csv` / `.tsv` / `.txt` / `.xlsx` | the §17 parsers, reused | none / SheetJS | already deterministic per §17 |

Extracted text lands in a normalized `{ kind, pages: [{pageNum, text}], notes }` shape via `normalizeBenchExtraction`. The workspace renders it in a left pane (page-tabbed for PDFs, single blob for the others) and a right pane with a scaffold of empty cells generated by `buildSpineCellScaffold(spineMeta, opts)`. The maintainer types each value into the cell input, optionally pastes the source excerpt for traceability, and clicks **✓ Verify this cell** — which calls `signoffSpineCell(cell, isoDate)` and stamps `verified:true` + `reviewedOn` + a `signoffHash` over every truth-bearing field. A live `<pre>` block at the bottom shows the deterministic `spineCellsToJSON` output ready to paste into source.

### 18.2 What Phase 2A is NOT — and the rule that keeps it that way

- **NO AI parses bytes into numbers.** pdf.js and mammoth produce TEXT, not "the value for grade 4 winter p50." The maintainer reads the extracted text and types the cell value themself. The §16.4 cut of AI-search retrieval (`findNormViaAI`, `groundingChunks` extraction, the on-line UNVERIFIED stamp) **stays cut** to Phase 2B. The render layer in this commit never calls `callGemini` on the benchmark path.
- **NO cell reaches the spine without an explicit `signoffSpineCell` call.** `bindVerifiedCellsToSpine` refuses cells with `verified:false`, refuses cells whose `signoffHash` doesn't match a freshly-computed `sourcedSignoffHash(cell)` (a post-signoff edit is a stale-block), and refuses to overwrite an existing populated cell with a different value (the stable-spine invariant). Test group 12 in `check_lumen_floor.cjs` pins all four.
- **NO cell ever lands in `comp.observations`.** The bind operates on a separate `cells[grade][season][p*]` structure (the spine), never on the student-data array. §16.1 separation holds at the data-model channel by construction; the workspace cannot conflate the two even by accident.

The rule, stated as a contract: **`bindVerifiedCellsToSpine(existing, [c])` returns added:1 if and only if `signoffSpineCell(c, iso)` returned `ok:true` AND the freshly-computed hash matches AND no existing cell at `[grade][season][p*]` has a different value.** Anything else is a structured collision report, never a silent overwrite.

### 18.3 Pure-function surface (LumenCore exports)

Wire this into any future spine workflow (CLI scripts, batch builders, alternative UIs):

- `buildSpineCellScaffold(spineMeta, opts?)` — pure scaffold; opts.grades / opts.seasons / opts.percentiles default from the spine. Returns an array of empty cells with `verified:false`.
- `validateProposedSpineCell(cell)` → `{ ok, errors[] }` — schema check (measure, unit, grade in [0,12], season string, percentile in [1,99], value positive number, locator http(s), citation/source present).
- `signoffSpineCell(cell, reviewedOnIso)` — mutates the cell with `verified:true` + `reviewedOn` + `signoffHash`; refuses without a reviewedOn (no implicit `Date` in this layer).
- `bindVerifiedCellsToSpine(existingCells, newCells)` → `{ cells, added, skipped, collisions[] }`. Idempotent for identical-value re-binds.
- `spineCellsToJSON(cells, indent?)` — deterministic pretty-print sorted grade → fall/winter/spring → p25/p50/p75.
- `normalizeBenchExtraction(input)` → `{ kind, pages, notes, ... }` — accepts the §17 text-table shape, a `{pages}` shape, or a `{text}` shape; never throws.
- `benchDocTypeFromName(name)` → `'pdf' | 'docx' | 'csv' | 'tsv' | 'txt' | 'xlsx' | null`. Images return `null` (handwritten OCR is the maximum-laundering path and stays out of scope).
- `lazyLoadPdfJs(cdnUrl?, workerUrl?)` / `lazyLoadMammoth(cdnUrl?)` — Promise-based on-demand CDN load with 15-second hard timeout.
- `extractPdfText(pdfjsLib, buffer)` / `extractDocxText(mammoth, buffer)` — return `{ pages, notes, error? }`; never throw.
- Constants: `BENCH_DOC_TYPES`, `BENCH_DOC_MAX_BYTES` (8 MB).

### 18.4 Where Phase 2B (deferred AI-search) plugs in next

When the `callGemini` claim-verb detector ships (v2), Phase 2B opens the seam already set in §16.4: `findNormViaAI(query)` returns CANDIDATES with `verified:false` and an `aiAsked:'L3'` chip; the UI lands them in the same scaffold, in the same workspace, with the same signoff button. The `bindVerifiedCellsToSpine` contract still holds — the AI candidate is just another unverified cell until the human signs it off, and the line/number never reaches pixels in the meantime. Nothing in Phase 2A's contract or render path needs to change to admit Phase 2B; the AI step is a separate `LumenCore` export that produces input to the EXISTING scaffold path.

### 18.5 The user-facing distinction from §17

§17 ingests **student data** (L0 observations bound into the trend/scatter/etc. claims). §18 (this section, §16 Phase 2A) ingests **benchmark documents** that produce verified cells of a separate, citable norm spine, structurally never the student's data per §16.1. They share file-type vocabulary (CSV/TSV/TXT/XLSX overlap, PDF/DOCX are §18-only) but **never share data structures**: an imported student observation cannot become a benchmark cell, and a verified benchmark cell cannot become an observation. The UI keeps the two lanes visually distinct (amber accent for §17 student-data; teal `#0e7490` for §18 SOURCED) so a maintainer can't drop a benchmark PDF into the student-data lane (or vice versa) by accident.

Coverage: `tests/lumen_sourced_workspace.test.js` (32 unit tests on the pure scaffold/validate/signoff/bind/JSON pipeline + §16.1 separation invariant); `dev-tools/check_lumen_floor.cjs` group 12 (12 §16 Phase 2A invariants, blocking). The render-layer wiring is pinned by `tests/lumen_render_golden.test.js` (the 18 pre-existing snapshots re-baselined to include the new "▣ Open benchmark workspace" toggle in the entry row).

---

## Appendix — provenance of this document

This design was produced over several maintainer conversations and **four multi-agent design workflows** (2026-06-02):
1. *alloflow-datacanvas-vision* (14 agents): grounded the concept in the real architecture + practitioner reality + product-evolution landscape; produced the reactive-research-canvas thesis, the provenance-bound-claim primitive, and the dashboard-monitors/Lumen-argues positioning.
2. *lumen-probabilistic-engine* (11 agents): designed the epistemic ladder, the AI-involvement dial, the unified certainty grammar, the uncertainty-first stats layer, and the anti-laundering floor, each adversarially critiqued and grounded in a verified code audit.
3. *lumen-ux-and-feasibility* (11 agents): a read-only feasibility spike into the real `dataplot` internals + a 4-approach UX panel (single-canvas / three-pane / document / single-column), adversarially critiqued. Produced §15 (UX & interaction — the "Living Brief" lane) and a set of feasibility-verified corrections folded back into §4.1, §6.2, §6.4, §7, §9, §10.3–§10.4, §11, §12, and §13 (net verdict: *buildable-with-cuts* — no assumption fatally refuted; the "extends dataplot" framing sharpened to "injects + re-derives," and the delete-on-Enter per-mark group flagged for replacement).
4. *lumen-sourced-provenance* (grounded against the built Phase-1 kernel + 4 critiqued facets: data-model / AI-assist / render / curated-spine): produced §16 (Sourced — the fourth, orthogonal provenance for external & benchmark data). Decisive synthesis verdict *buildable-with-cuts*: cut the AI-search path, the sloped-aimline kind, and `FLUENCY_BENCHMARKS` seeding to Phase 2/never; ship a curated-only, byte-checked, citation-mandatory H&T-2017 + DIBELS-8 spine that renders verified horizontal benchmarks in their own teal/`▣` channel, physically separate from `comp.observations`, refusing the wrong norm rather than drawing it. Folded-in critic fixes: render-only-verified closes the screenshot hole; `verified` redefined as a human cell sign-off (not table-membership); the signoff hash widened to every truth-bearing field; one unified `assertExportClean` gates both export sinks; corrected the fictional `callGemini` 5th-arg + `processGrounding`-as-extractor errors (read `groundingMetadata.groundingChunks[].web` directly); corrected the asserted teal contrast (≈3.9:1 — line/glyph only, chip text near-black).

The compendium/view separation (§4) and the control surface (§10) were added 2026-06-02 as direct design refinements from follow-up discussion (no workflow); the document was then reflowed into this textbook ordering (compendium/view promoted to §4 after the core primitive; controls placed at §10 after UDL), with all `§` cross-references updated.

Code line references in §12 were captured during that audit and spot-verified by the orchestrator; **re-confirm them at implementation time.** This is a design draft to be shredded, not a build spec frozen for handoff.
