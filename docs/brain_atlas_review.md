_Generated 2026-06-15 via a 32-agent review workflow (map -> 8-dimension analysis incl. 3 neuroscience-accuracy passes -> adversarial verification in BOTH directions -> synthesis). The accuracy verdicts are calibrated: 21 of 22 verified findings confirmed the tool wrong, 1 rejected. Cross-checked by hand on the retina/ADHD literature + codebase neurodiversity coverage._

# brainAtlas — Decision-Ready Deep-Dive

> **Historical review snapshot, not current open-bug status (2026-07-09):** This June review is preserved for its evidence trail and neuroscience/accuracy concerns. Later code and QA work may have changed individual findings; verify against current `stem_lab/stem_tool_brainatlas.js`, mirrors, tests, and a11y/visual reports before treating an item as open.

**Target:** `stem_lab/stem_tool_brainatlas.js` (~4663 lines, hand-maintained; `build.js` mirrors root → `desktop/web-app/public/` at deploy). Deploy is HELD — this is analysis only.

**Bottom line:** This is the most scientifically careful tool in the STEM Lab. The clinical neuroanatomy is, view after view, *correct at USMLE depth* — and verified as such. There is **one hard factual error** (cerebellum neuron fraction), **a small cluster of localizationism/overclaim string-edits** (dopamine, insula, angular/supramarginal, ACC, gamma, callosum maturation, alpha-wave pop-neuro, plus two pharm/timeline nits), and **three structural problems that matter more than any single fact**: an **ungated AI tutor** (house-norm violation), **two dead quest hooks** that can never complete, and **no golden-master test** for a 4663-line file. Do **not** manufacture an accuracy crisis here — the accuracy fixes are a tidy, low-risk string batch. The real work is governance + safety net + audience fit.

---

## 1. What it is

A clinical-depth neuroanatomy/neuropharmacology atlas registered as StemLab tool `brainAtlas`, shipped inside a K-12 STEM Lab.

**Views (9, `VIEWS` opens L101, all defs through L362):**
- **lateral** (L103-137, default via viewKey fallback L366) — 4 lobes + cerebellum + brainstem; 12 cortical/subcortical regions incl. Broca/Wernicke/insula/angular/supramarginal.
- **medial** (L139-171) — 13 deep/limbic structures (corpus callosum, thalamus, hypothalamus, cingulate, hippocampus, amygdala, basal ganglia, ventricles, pineal, fornix, mammillary, septum pellucidum).
- **superior** (L173-191) — top-down, 5 regions incl. SMA, central sulcus.
- **inferior** (L193-217) — bottom-up, 8 regions incl. cranial nerves, pituitary, Circle of Willis.
- **neurotransmitters** (L219-265, `isNT`) — 20 NT entries with synthesis/receptors/pathways/drugs; drives drug-sim scenario buttons (`SIM_SCENARIOS` L406-422) + tolerance panel (L3943-3964).
- **neuron** (L269-291, `isNeuron`) — action-potential single-cell view (6 parts) + AP panel (L3967-3988).
- **sleepStages** (L292-312, `isSleep`) — hypnogram, 5 stages.
- **eegWaves** (L314-334, `isEEG`) — delta/theta/alpha/beta/gamma bands; in-canvas EEG-activity buttons.
- **crossLateral** (L336-360, `isCrossLateral`) — hemisphere lateralization, 7 regions (decussations, callosum, language, handedness, split-brain).

**Region schema:** plain literals in `VIEWS[*].regions`; duck-typed per view (detail panel conditionally renders each field, L4419-4489). Guaranteed field is `fn`; quiz/AI/search all assume it. Anatomical views add `brodmann`/`blood`; NT entries drop those and add `category`/`synthesis`/`receptors`/`pathways`/`drugs`.

**Cross-cutting surfaces:** region-detail panel (L4397-4623), text search (L3652), two quiz systems (damage→region Quiz L3992-4065; **Function Match** 12-vignette mini-game L3681-3861), the Neurotransmitter "Predict the State" felt-state inquiry widget (L3494-3593), and the Brainwave Visualizer canvas (L4070-4140).

**AI tutor:** single "Explain at my level" control in the detail panel (L4493-4619). Grounded prompt injects the region's name+fn (+conditions/damage/drugs), asks for 2-3 plain-prose sentences, temp 0.5 (L4543-4551). 3 reading levels (plain/grade5/hs, L4513-4521).

**A11y:** wrapper `role=region` + tabIndex=0 + `onBrainKey` (1..9 views / Q quiz / Esc / `/` search, L3443-3476); polite live region #allo-live-brainatlas (L86-96); reduced-motion CSS (L1-9); canvas `role=img` with dynamic aria-label naming view+selected region (L3905-3907); a keyboard/SR region-list fallback below the canvas (L4631-4649).

---

## 2. Real strengths (do not regress these)

These are *verified-from-code*, and several fixes below touch the same strings — preserve the surrounding correct content.

- **The hard clinical content is accurate at med-school depth.** Aphasia dissociations (Broca non-fluent/intact-comprehension vs Wernicke fluent/word-salad/unaware vs conduction = arcuate fasciculus/poor-repetition, L125-127/L352); vascular territories (MCA face/arm, ACA leg, PCA occipital, lenticulostriate "arteries of stroke" L157); Brodmann numbers for primary areas; decussation figures (**corticospinal ~85-90%** L344 — verified FINE; DCML internal arcuate/medial lemniscus L346); **language lateralization ~95% R-handers / ~70% L-handers** (L352 — verified FINE, with the correct "handedness correlates but doesn't predict" nuance L354). Lesion syndromes (Wallenberg, Wernicke-Korsakoff/mammillary/thiamine + Papez circuit, Parinaud, Klüver-Bucy, Dejerine-Roussy) are textbook-correct.
- **The obvious neuro-myths are genuinely ABSENT** — no learning styles, no left/right-brain personality, no "10% of brain", no triune/reptilian. This is uncommon and real.
- **The Neurotransmitter felt-state widget is an exemplar of scientific-integrity framing** (L3494-3593): every state prefixed "Monoamine model:", repeated "toy mapping" language, **Moncrieff et al. 2022 cited** for the contested chemical-imbalance claim, Schultz reward-prediction-error reframe in the open-questions block, no-score/no-reveal, strong bottom disclaimer "teaching heuristic, NOT a clinical model" (L3591). The invented linear formulas are honestly and repeatedly disclosed — verifier's verdict: **disclaimer is adequate, leave as-is.**
- **Pharmacology + receptor/G-protein coupling is accurate throughout** (D1-like Gs/D2-like Gi; α1 Gq/α2 Gi/β Gs; NMDA glycine co-agonist + Mg²⁺ block + memantine/ketamine; GABA-A benzo PAM vs baclofen; NO/sildenafil PDE5; vasopressin vaptans). No fabricated pharmacology found.
- **Function Match is the assessment to copy** (L3681-3861): syndrome→region (tests transfer not recall), curated fixed distractors, **per-item rationale** (`v.why` L3836), confusable-pair coaching, canonical cases (HM, Phineas Gage), and **proper `role=radiogroup`/`role=radio`/`aria-checked`** (L3796-3811). The team already knows how to build a valid, accessible item.
- **Real keyboard/SR path exists.** The region-list fallback (L4631-4649) renders a focusable `<button>` per region over the same `filtered` set the canvas hit-tests — every mouse hotspot has a keyboard equivalent. Better than most canvas tools.
- **The AI tutor prompt is grounded and reading-level-scaffolded**, fails closed when `callGemini` is absent (L4525), announces completion to SR (L4557). The gap is purely the missing gate, not the prompt.

---

## 3. Accuracy findings (Verify-phase CONFIRMED only)

The verifier read the actual bytes and ruled on each. Below are **only** findings where `theToolIsWrong=true`. **The cerebellum error was independently confirmed by 8 separate verifier passes** — it is the one fact to fix above all.

### 3a. FACTUALLY-WRONG (correct fact stated; high confidence on the fact)

| # | Claim (line) | Current | Corrected | Sev | Conf |
|---|---|---|---|---|---|
| **A1** | Cerebellum (L121 `fn`) | "Contains 50% of brain's neurons." | "Contains ~80% (about four-fifths) of the brain's neurons (~69B of ~86B, mostly granule cells) despite being only ~10% of brain mass." (Azevedo 2009 / Herculano-Houzel 2009 isotropic-fractionator) | **med** | **high** |
| **A2** | Insula Brodmann (L129) | "BA 13, 14, 15, 16" | "BA 13 (and BA 14 anteriorly)." BA 15/16 are Brodmann's **non-human-primate** areas; no standard human homologue. | low | high (on convention) / med |
| **A3** | Corpus callosum maturation (L350) | "Develops fully by age 10–12; continues myelination through adolescence." (internally contradictory) | "Grows through childhood, but callosal myelination/white-matter maturation continues into the mid-to-late 20s (among the latest-maturing structures)." (Lebel & Beaulieu 2011; Giedd) | **med** | high (direction) / med (endpoint) |
| **A4** | Conivaptan (L249) | "Conivaptan/tolvaptan (V2 antagonist…)" | "Tolvaptan (V2-selective) / conivaptan (non-selective V1a+V2) vaptans…" | low | high |
| **A5** | Anandamide (L255) | "memory extinction (forgetting)" | "fear/memory extinction (**new inhibitory learning, not erasure**)." Extinction ≠ forgetting (spontaneous recovery/renewal/reinstatement); CB1 *promotes* extinction (Marsicano 2002). The parenthetical is also redundant with the correct short-term-memory claim in the same entry's `damage`. | low | high |

**Note on A1's framing:** one verifier filed it under "localizationism" by title — it is **not**; it is a pure numeric error needing no hedge, just the right number. Fix propagates automatically into the quiz feedback panel (`quizQ.fn` L4050) and the grounded AI prompt (`parts.push('Function: ' + sel.fn)` L4535), so fixing the source fixes all three surfaces.

### 3b. OVERCLAIM / localizationism (true-ish but misleads; hedge, don't delete)

| # | Claim (line) | Fix | Sev | Conf |
|---|---|---|---|---|
| **B1** | Dopamine `fn` (L227) "Reward and pleasure signaling…" | Drop "pleasure"; reframe to **reward-prediction/motivation** (Schultz RPE; Berridge "wanting" vs "liking"). The tool's *own* widget (L3581) tells students to question the "reward chemical" frame, and its own dopamine `pathways` field already says "reward/motivation" — only this `fn` uses "pleasure." Internal inconsistency. | med | high |
| **B2** | Serotonin `fn` (L229) "Mood regulation…" un-hedged | Soft consistency fix: its `conditions` field already says "monoamine hypothesis"; mirror that hedge into `fn`. | low | high |
| **B3** | Insula (L129) — **`damage`: "reduced empathy"** | **Drop "reduced empathy" from the discrete damage list** (no clean focal-insula-lesion → empathy-loss dissociation). In `fn`, hedge empathy to a network-node phrasing. | med | high |
| **B4** | Angular gyrus (L131) "theory of mind"; supramarginal (L133) "empathy" | Hedge: angular → "contributes to the theory-of-mind **network** (TPJ/mPFC/precuneus)"; SMG → "(right SMG) reducing emotional egocentricity bias." Keep all their strong, correct roles (reading/calculation/Gerstmann; phonology/repetition/conduction aphasia). | low | high |
| **B5** | ACC (L151) "error detection" / "impaired error monitoring" | One-clause hedge: "performance/conflict monitoring (whether the core computation is error/conflict/surprise/EVC is debated; a salience-network node, not the sole 'error detector')." The dACC/ERN link itself is robust — keep it. | low | med |
| **B6** | Gamma 40 Hz (L330/L331) — "consciousness," "the binding problem," "deficits impair…conscious awareness" presented as settled | Hedge the binding/consciousness causal framing as an **influential but contested hypothesis** (Crick & Koch 1990 / Singer; critiques Shadlen & Movshon 1999). **Keep verbatim** the accurate facts: PV+ interneuron generation, schizophrenia 40 Hz ASSR deficit, 40 Hz entrainment. The same file hedges the chemical-imbalance theory (L3506/3591) but not this — internal inconsistency. | med | high |
| **B7** | Alpha-wave pop-neuro (L4096/L4152/L4208) "Bridge between conscious thinking and subconscious mind" | **Delete the clause** (3 sites). No EEG/cognitive-neuroscience construct supports it; the tool's *own* clinical EEG view (L326) describes alpha correctly. Keep the (correct) Berger-effect note. | low | high |
| **B8** | Septum pellucidum (L167) nucleus accumbens "(pleasure)" | Change gloss to "(reward/motivation circuitry)." Matches the tool's own L227 pathways label and its Schultz reframe at L3581. | low | high |
| **B9** | Frontal/Gage (L3702 Function Match "why") "…live in the frontal lobe **specifically**" | Soften "live there specifically" → effect-on-trait framing ("frontal/prefrontal damage **can change** personality/planning/impulse control while leaving memory/speech intact"). L109/L111 are already fine — **no change there.** Optional: note Gage's lesion-extent/severity is historically debated. | low | high |

### 3c. Findings the verifier REJECTED — DO NOT change

- **GABA "~40% of synapses" (L235) — `theToolIsWrong=FALSE`.** Verdict **reject**: "~40% of all synapses" is a standard, widely-cited textbook figure (CSHL: "GABA occurs in 30-40% of all synapses"), already hedged with "~". The finder *under*-stated the conventional value and conflated "% of all synapses" with "% of inhibitory synapses." **Leave as written** (optional cosmetic widening to "~30-40%" only).
- **Insula "disgust" (within B3/B4 scope) — partially rejected.** Verifiers **revise**: disgust↔anterior insula is one of the *strongest* single-region emotion mappings (Calder/Wicker/patient NK) — **keep disgust listed**; only the *empathy* attribution and the *"reduced empathy" damage sign* are the real issues. A finder who wanted to hedge/remove disgust was mistaken.

**Everything else the MAP flagged as "FINE" was confirmed FINE** and must not be touched: corticospinal ~85-90% (L344), language lateralization 95%/70% (L352), corpus callosum ~200M axons, serotonin 90%-gut, melatonin 460nm, epinephrine 80/20 adrenal ratio, NMDA Mg²⁺/glycine, AComm aneurysm 30-35% (L213), AP velocity ~120 m/s, AP threshold/rest/hyperpolarization values, Na⁺/K⁺ pump 3:2, delta >75µV SWS, sleep spindles 11-16 Hz, olfaction-bypasses-thalamus. **Circle of Willis "~25% complete" (L213)** was the one MAP-flagged "borderline/MED" item the verify phase did **not** confirm as wrong — treat it as acceptable (range-dependent), not a required edit.

**Plain statement for Aaron:** This tool is **largely accurate**. The factually-wrong set is 5 small string edits (one of which — cerebellum — is the only one that materially matters); the overclaim set is 9 hedges/word-swaps. None is a safety or clinical-decision error. The integrity exposure is *consistency* (the tool already knows how to hedge — it just didn't apply that voice to the region cards).

---

## 4. Other problems that matter (graded, evidence-backed)

### AI governance — **HIGH**
- **The AI tutor is UNGATED (L4525/L4551).** Grep for `aiHintsEnabled`/`allowAIHints`/`getHint`/`consent` = **0 matches**. Any student clicking "Explain" triggers live `callGemini`. This violates the house default-OFF pattern (`geometryworld` L6272 gates on `ctx.aiHintsEnabled` and routes through `ctx.getHint`). OFF must mean zero traffic; here there is no OFF. Cost + kid-safety + norm violation.
- **The tutor injects `sel.fn` verbatim with no epistemic hedge (L4535),** so every overclaim in §3b is laundered into kid-facing generated prose at grade-5 level. A one-clause prompt addition fixes it.
- **`ctx.gradeLevel` is dead** (aliased L64, never read); AI level hardcodes `'grade5'` (L4507) regardless of host grade band.

### Architecture / correctness — **HIGH (quests) / MED (rest)**
- **Both quest hooks are permanently 0/3 and can never complete.** `explore_3_views` reads `d.viewsExplored` (L33) — never written (view switches write `view`, L3453/L3605). `quiz_3` reads `d.quizCorrect` (L34) — never written (quiz writes `quizScore` L4028; copy-paste drift from dino_lab, which *does* write `quizCorrect`). The entire quest/gamification surface is dead. No test catches this.
- **Main brain rAF loop has no unmount cleanup.** It re-arms via `requestAnimationFrame` (L3397) and is only cancelled on view/sim cache-key change (L442); the null-ref callback early-returns (L434) without cancelling. Runs forever on a detached canvas after the tool closes — wasted CPU/battery on the K-12 Chromebook target. (The brainwave mini-canvas *does* clean up via `_bwCleanup` L4389 — the pattern exists, just not applied to the main loop.)
- **`upd()` reducer is impure** (L84-96): DOM-creating IIFE inside the `setLabToolData` updater runs on every state update. Idempotent (getElementById-guarded) but violates reducer purity (StrictMode double-invoke = undefined behavior).

### Golden-master / test coverage — **MED (but a prerequisite)**
- **No dedicated golden/snapshot test.** Only a smoke entry (`stem_widgets_smoke.test.js:62`, renders the default lateral view + asserts an inquiry signature) and a CDN module-load check (`13-stem-tools-all-cdn.spec.ts:12`). For a 4663-line file with 9 views, 2 quiz systems, and an AI path, **all region content, every claim, the quiz logic, and the disclaimers are unprotected against regression.** Peer tools (dino_lab, symbol_studio, lumen, arc_city) all have `*_golden.test.js`. This is the safety net that must exist *before* any refactor.

### A11y (canvas/keyboard) — **HIGH (3 holes) / MED (color)**
The scaffolding is real and commendable, but four fixable gaps:
- **Region selection is silent + steals no focus.** Both `handleClick` (L3435) and the list-button (L4635) call `upd('selectedRegion',…)` with **no `announceToSR`** and no focus move — view-switch/quiz-toggle/deselect/AI-ready all *do* announce, so selection is the lone gap. An SR user selects a region and is never told the rich detail panel appeared (WCAG 4.1.2/1.3.1). **HIGH.**
- **The keyboard region-list — the only non-mouse selection path — is unlabeled and disappears once a region is selected** (the `sel ? detail : list` ternary L4397/L4625). After picking region A there's no keyboard way to browse to B except Esc-then-rescan; absent entirely in quiz mode. **HIGH.**
- **EEG activity-mode buttons are painted INTO the canvas** (`_eegBtnRects` L2906-2917) and mouse-hit-tested (L3415-3422) — no keyboard, no SR, color-only active state. A whole sub-feature is invisible to non-mouse users (WCAG 2.1.1/1.1.1). The file already renders DOM buttons for NT scenarios (L3869) and wave-type (L4108) — the pattern exists. **HIGH.**
- **EEG band traces + decussation motor/sensory lines lean on color** (L2887-2891, L3158/3165). EEG bands carry Greek-letter labels (mitigates); decussation is partly mitigated by the midline "X" node (L3144) but line identity still leans on color (WCAG 1.4.1). **MED.** Plus the Brainwave Visualizer canvas has a static, meaningless aria-label "EEG waveform animation" (L4134) — cheap data-bearing fix.

### UDL / audience fit — **HIGH**
- **No grade-appropriate static layer.** Every region's only guaranteed field is the clinical `fn` (Dejerine-Roussy, Gerstmann, "internal arcuate fibers"). The **only** simplification path is the AI tutor — **which is gated/default-OFF**, so a struggling reader/ELL/younger learner with AI off gets *only* raw clinical prose in the detail panel, search, quiz options, and Function Match. Grep for `simple`/`kid`/`plain`/`summary`/`bigIdea` fields = 0. The representation burden rests entirely on the *wrong* (conditional) lever. **HIGH.**
- **Framing sets dishonest expectations.** Header is just "🧠 Brain Atlas" + a clinical `desc`; the SR intro calls it "an interactive 3D model" (L78 — it's a 2D canvas). Nothing signals this is USMLE-Step-1 depth. **MED.**
- No glossary/term support for recurring jargon (contralateral, saltatory conduction, allosteric…). **MED.**

### Assessment integrity (damage→region Quiz) — **MED/HIGH**
- **Distractor pool is a flat cross-ontology union** (L382-384: all regions across all views with a `damage` field). NT/neuron/sleep/EEG/tract entries all carry `damage`, so a "Frontal Lobe" stem can draw distractors "Dopamine," "REM Sleep," "Alpha Waves" — most items are trivially eliminable by category-spotting, not discrimination. **HIGH.**
- Single item template (one `damage`-recall format), fixed sequential order (`quizIdx % length`), 100-char truncation creates a length/"…" tell, and **no rationale on why a wrong choice is wrong** (feedback only restates the correct region; the chosen id at L4026 is available but unused). Function Match already does contrastive rationale (L3834-3836) — port it. **MED.**
- No measurement overclaim in the score UI (plain star tally, honest) — good.

---

## 5. Prioritized roadmap

All edits respect: deploy is HELD; root file is hand-maintained and mirrored to `desktop/web-app/public/` by `build.js` at deploy; gated-AI + integrity norms; no mutating agent fan-out — apply directly, `node --check` after, re-baseline golden masters deliberately.

### Quick wins (S)

**QW-1 — Accuracy data-edit batch (the §3 corrections).** *What:* 5 factually-wrong fixes (A1-A5) + 9 hedges (B1-B9), all pure string edits to region `fn`/`damage`/`drugs` literals + 3 alpha-wave `desc` copies. *Why-K12:* the cerebellum number feeds the quiz feedback panel and AI prompt; the localizationism is exactly what the integrity norm flags, and the tool is internally inconsistent (it hedges these very claims one panel away). *Effort/impact:* S / high integrity payoff, near-zero risk. *Sketch:* edit literals in place; the detail panel renders `sel.fn`/`sel.damage` verbatim so no logic is touched; the AI prompt inherits fixes for free via L4535. Do **not** touch the §3c rejected items (GABA ~40%, insula "disgust"). *Golden note:* region `fn` strings are not currently snapshot-pinned, but after QW-3 exists, add literal assertions: cerebellum `fn` matches `/~?80%|four-fifths/` and **not** `/50% of brain/`; alpha desc does not contain "subconscious"; gamma desc contains a hedge token. *Risk:* very low — pure data; only "risk" is forgetting the deploy mirror (deploy held, so root-only now).

**QW-2 — One-clause honesty instruction in the AI prompt.** *What:* append to the prompt (L4547-4549): "If any listed function is a simplification or a contested single-region claim (e.g. dopamine as the 'pleasure chemical', or pinning empathy/theory-of-mind/consciousness to one region), say so briefly in plain words." *Why-K12:* stops the tutor laundering region overclaim into kid-facing prose; extends the widget's honesty norm to the AI surface. *Effort/impact:* S / high. *Sketch:* single-string change, no schema/state, AI output isn't snapshotted. *Risk:* negligible; keep the "2-3 short sentences" cap after the new clause.

**QW-3 — Wire both dead quest hooks.** *What:* at L4028 also `upd('quizCorrect', (d.quizCorrect||0)+1)` (separate monotonic counter — `quizScore` resets at L3458/L3666, so don't reuse it); at L3453 and L3605 `upd('viewsExplored', Object.assign({}, d.viewsExplored, {[vk]:true}))`. *Why-K12:* the entire quest/engagement surface is currently un-earnable. *Effort/impact:* S / high. *Risk:* low (options disabled after first answer L4020, so no double-count). Relabel the quest "Get 3 brain quiz questions correct" to match the `>=3` check.

**QW-4 — Announce + focus region selection (shared helper).** *What:* `function selectRegion(r){ upd('selectedRegion', r.id); announceToSR(r.name + '. ' + (r.fn||'')); }`, called from both `handleClick` (L3435) and the list button (L4635); give the detail-panel root `tabIndex:-1` + ref and `.focus()` it on a selection-*changed* check. *Why-K12:* closes the WCAG 4.1.2 gap that currently defeats the otherwise-good keyboard path. *Effort/impact:* S / high. *Risk:* gate focus on changed-id (not every rAF tick) to avoid focus-stealing.

### Bigger bets (M/L)

**BB-1 — Add the SSR golden-master harness `tests/brain_atlas_golden.test.js` (M).** *What:* mirror `dino_lab_golden.test.js`; SSR-render each of the 9 views, one sampled region's detail panel per view, both quiz STEMs, Function Match vignette 1, and **assert the felt-state disclaimer literals** ("teaching heuristic, NOT a clinical model" + "Moncrieff") so the integrity hardening can't silently regress. Wire into the existing blocking CI unit job. *Why-K12:* prerequisite safety net before any AI-gating/refactor; protects the accuracy batch from re-breaking. *Sketch:* ctx stub (React, t passthrough, no-op `callGemini`, `gradeLevel`, `announceToSR`); stub `getContext` for jsdom. *Risk:* intentional rewords require a deliberate `vitest -u` — that's the point. **Do this first; everything else re-baselines against it.**

**BB-2 — Gate the AI tutor behind `ctx.aiHintsEnabled` (M).** *What:* render the "Explain at my level" block (L4569-4617) only when `ctx && ctx.aiHintsEnabled` (default OFF); ideally route through `ctx.getHint('brainAtlas', …)`, else guard inside `explain()` before L4525 so OFF = zero traffic. *Why-K12:* brings the tool into house compliance (one teacher switch across STEM Lab, kid-safety, cost). *Sketch:* use the **same** flag as the rest of STEM Lab — verify the live prop name (`studentProjectSettings.allowAIHints` / `ctx.aiHintsEnabled`) against the ctx contract before wiring; the tree has fossils, so confirm reachability. *Risk:* if `getHint`'s signature is Q/A-shaped the grounded prose prompt won't fit — fall back to the in-`explain` guard. Coordinate on the shared working tree.

**BB-3 — Static "Big Idea" plain-language tier per region (L).** *What:* optional `big` field on region literals, rendered above the clinical `fn` in the detail panel and as the search-result subtitle; the duck-typed panel already tolerates new optional fields (L4419+). *Why-K12:* the missing lowest UDL-Representation tier that **works with AI OFF** — currently a struggling reader has nothing. *Sketch:* start with the ~12 lateral-view regions; phrase as "helps with" not "is the seat of" to avoid new localizationism. *Risk:* authoring volume + new i18n strings; scope to lateral first; re-baseline the new render branch. Decouple the reading-level buttons so "plain" shows `big` even when AI is off.

**BB-4 — Promote in-canvas EEG buttons + same-view quiz distractors (M).** *What:* (a) move the 5 EEG activity-mode buttons out of the canvas into DOM `<button>`s with `aria-pressed` + `announceToSR` (reuse the L4108 pattern), state into React; (b) tag each region with `_view` in the L382 loop and constrain quiz distractors to the same view with a cross-view fallback when <4 exist. *Why-K12:* (a) makes a whole sub-feature keyboard/SR-operable; (b) turns category-spotting into genuine discrimination. *Risk:* verify the rAF closure picks up `d.eegActivity`; guard the <4-region fallback. Re-baseline.

### Strategic
- **Hoist VIEWS/region data + formula tables to module scope (L)** — prerequisite for decomposing the 4663-line file; do **only after** BB-1 proves byte-identical output. Region `name` uses `t()` calls, so hoist names as keys/getters.
- **Honest framing line + "2D interactive brain map" copy fix (S)**, **lightweight glossary (M)**, **beginner difficulty for Quiz/Function Match reusing `big` (M)**, **rAF unmount cleanup + pure `upd()` (S)** — all real, lower-priority.

---

## 6. Recommended first slice

**Ship the accuracy data-edit batch (QW-1) + the AI honesty clause (QW-2), gated behind the golden-master harness (BB-1).**

*Why this first:* It is the highest integrity-payoff-per-risk move, it's the deliverable Aaron most cares about (scientific correctness for K-12/special-ed), every edit is a verified string change with the corrected fact in hand, and pairing it with BB-1 means the corrections are *locked* so a future bulk edit can't silently revert them. The cerebellum fix alone — confirmed 8× — corrects a memorable wrong "fun fact" that currently propagates into both the quiz feedback panel and the grounded AI tutor. QW-2 ensures the tutor stops re-narrating the overclaims you're fixing. Everything fits cleanly behind the held deploy as analysis-validated, root-only edits.

**Definition of done:**
1. **BB-1 lands first:** `tests/brain_atlas_golden.test.js` SSRs all 9 views + sampled detail panels + both quiz STEMs + Function Match + the felt-state disclaimer literals; green in the blocking CI unit job; baseline committed.
2. **QW-1 applied** to the root file: A1-A5 (factually-wrong) + B1-B9 (overclaim hedges) — and **explicitly NOT** the §3c rejected items (GABA ~40%, insula "disgust" stays). `node --check` clean.
3. **QW-2 applied:** the one-clause honesty instruction in the AI prompt (L4547-4549), 2-3-sentence cap preserved.
4. **Golden-master assertions added & re-baselined deliberately** (`vitest -u`, eyeball the diff): cerebellum `fn` matches `/~?80%|four-fifths/` and not `/50% of brain/`; alpha desc has no "subconscious"; gamma desc contains a hedge token. The diff is exactly the ~14 intended strings + 3 alpha copies — nothing else moves.
5. Verified against **real bytes** before/after (not assumed); root-only (deploy held — `build.js` mirrors to `desktop/web-app/public/` at the next deploy, not now); concurrent-session check on the shared tree before committing your files by path.

**Out of scope for this slice (next slices):** BB-2 (AI gating — needs the live `ctx` flag confirmed), QW-3/QW-4 (quest + a11y, independent), BB-3/BB-4 (UDL tier, EEG buttons, same-view distractors).

---

## 7. Neuromyths & Neurodiversity view (Aaron's request, 2026-06-15)

Added after the workflow, from a conversation with Aaron (school psychologist). The workflow confirmed the obvious neuro-myths are **absent** and there is **no neurodiversity brain-science content** anywhere in brainAtlas. A codebase-wide check found neurodiversity is well-covered *elsewhere* — but only from the **support/identity/accommodations** angle (SEL Hub: `sel_tool_advocacy.js` has a 180+ item accommodations library sourced from ASAN/CHADD/Wrightslaw/IDEA; plus `zones`/`anxietytoolkit`/`howl`/`identitysupport`). The **honest brain-science** angle (structural differences, the myths, emerging research) is covered nowhere. That gap is brainAtlas's unique, non-duplicative lane.

**Proposed new view: "Neuromyths & Neurodiversity — the brain science, honestly"** (complements, links to, does NOT duplicate the SEL advocacy tool):

1. **Debunk learning styles (VAK).** The actionable claim — matching instruction to a learner's "style" improves learning (the *meshing hypothesis*) — has been directly tested and failed (Pashler, McDaniel, Rohrer & Bjork 2008; Coffield 2004 reviewed 71 models; Willingham). Preference ≠ improved outcome. Fills a genuine product-wide gap (no clean learning-styles debunk exists anywhere in the codebase).
2. **Honest ADHD / ASD structural differences.** Real, replicated **group-level** differences exist but are **small, dimensional, heterogeneous, and developmental — not diagnostic.** Anchors: ENIGMA-ADHD (Hoogman 2017, *Lancet Psychiatry*, ~3,200 cases; small subcortical-volume effects, d≈0.1-0.2, most in children); Shaw 2007 delayed cortical maturation ("late, not broken"); ENIGMA-ASD (van Rooij 2018, small age-dependent effects, heterogeneity dominant). Explicitly flag that **no brain scan diagnoses ADHD or autism** and that SPECT/QEEG-diagnosis (Amen clinics, theta/beta-as-diagnostic) is **not** evidence-supported.
3. **"Promising vs proven" emerging-research callout — the retina/ADHD study as the worked example.** Choi et al., *npj Digital Medicine* (2025), Yonsei/Severance, South Korea: 323 children with ADHD vs matched controls, ML on retinal fundus photos, **95.5-96.9% AUROC**. Teach the gap: matched **case-control** AUROC systematically overstates real-world screening accuracy (spectrum + base-rate); the authors frame it as **screening, not diagnosis**; single group, one population, **not externally validated or deployed**; biologically plausible (retina = CNS tissue) but media framing ("your eye reveals ADHD") overstates it. This single artifact teaches the difference between a promising finding and a validated clinical tool better than any fact about a lobe.
4. **"Brain styles" framing caution.** Discrete "brain type" essentialism overstates the science the same way learning styles does — these are *shifted distributions on continuous dimensions* with massive neurotypical overlap, not separate hardware. The valuable part of the neurodiversity frame is social/strengths-and-fit, not categorical type.
5. **Cross-link** to `sel_tool_advocacy` (the "what do I *do* about it" side).

**Also fix (an integrity flag the workflow's accuracy passes did not surface):** the existing EEG content states **"ADHD shows elevated theta/beta ratio"** as a flat fact (in the theta-band entry / brainwave panel). The theta/beta ratio is **not** a reliable diagnostic marker — its diagnostic value declined across decades and it doesn't separate ADHD from controls reliably (Arns et al. 2013 meta-analysis); the FDA-cleared NEBA device was controversial. Hedge it as contested, not fact. This belongs both as a direct one-line fix AND as a teaching point in the new view.

**Gate before shipping:** Aaron (school psychologist) red-pens every claim in this view before it ships — for K-12-facing neuroscience claims about ADHD/ASD, subject-matter sign-off is the right gate. Effort: **M** (mostly content authoring + one new view following the existing `VIEWS[*]` + detail-panel pattern; honest-framing voice already exists in the felt-state widget to copy). Sits behind the held deploy.
