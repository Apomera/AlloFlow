_Generated 2026-06-15 via a 27-agent review workflow (map -> 8-dimension analysis incl. a dedicated ABA-ethics pass -> adversarial verification in BOTH directions -> synthesis). Verify caught dead-code (FAMOUS_BEHAVIORISTS L333 is unrendered; the LIVE Lovaas claim is L844). 12 of 17 verified findings confirmed tool-wrong, 5 rejected. Cross-checked by hand on the Lovaas/aversives literature._

# behaviorLab — Decision-Ready Deep-Dive

> **Historical review snapshot, not current open-bug status (2026-07-09):** This June review is preserved for its evidence trail and ethical analysis. Later code and QA work may have changed individual findings; verify against current `stem_lab/stem_tool_behaviorlab.js`, mirrors, tests, and a11y/visual reports before treating an item as open.

**Target:** `stem_lab/stem_tool_behaviorlab.js` (~6,095 lines, hand-maintained; build.js mirrors root → `desktop/web-app/public/` at deploy)
**Audience:** Aaron (school psychologist; FBA + behavior intervention daily practice; navigates the ABA/neurodiversity tension professionally)
**Status:** Deploy HELD. This is analysis only. Every line ref below was re-verified against working-tree bytes.

**One-line verdict:** This is the most integrity-aware ABA/autism tool in the codebase — the operant/schedule/FBA science is expert-grade and the autistic self-advocacy critique is genuinely built in, not bolted on. The defects are narrow and fixable: one live contested-as-fact ethics line, one real wording bug, two assessment-validity gaps in a curve game, a broken a11y label on the core sim, and an ungated AI call. Almost all of the high-value fixes are low-risk string edits you are the ideal person to red-pen.

---

## 1. What it is

A virtual Skinner box for K-12 STEM Lab that teaches operant + classical conditioning and bridges into applied FBA. Capability map (all VERIFIED-from-code):

- **9 progressive LEVELS** (`LEVELS` array, lines 134–280), each an animated chamber + concept + quiz: L1 SR+ → L2 shaping/successive approximations → L3 extinction burst → L4 schedules FR/VR/FI/VI → L5 stimulus discrimination (SD/S∆) → L6 Free Lab sandbox → L7 chaining → L8 DRO → L9 classical conditioning (Pavlov). Each grants a badge (`LEVEL_BADGES`, 313–323). The shared visual is a `<canvas>` chamber (line 3941) animated by a rAF loop; "Deliver Food" button + Spacebar is the reinforce action.
- **Schedule Sleuth** (5145–5358): identify FR/VR/FI/VI from an unlabeled cumulative-response curve; deterministic seeded curve generators; accurate per-pattern feedback (5346–5349).
- **FBA "Function Sleuth"** (5361–5530): 12 vignettes (5378–5403) drilling the 4-function model (ATT/ESC/TAN/AUT) with discrimination-logic coaching. Backed by the `FOUR_FUNCTIONS` data + render panel (338–343 / 4828–4862).
- **People/critique surfaces:** a live ABA History Timeline (`ABA_MILESTONES`, 833 → rendered 5957); a live, sourced **"Beyond Pure ABA"** critique panel (`BEYOND_ABA`, 672–709 → 4906–4964); a live backlink routing named autistic voices to SEL Hub (4966–5006). Several people/applications arrays are **dead code** (see §3/§4).
- **Quizzes/assessment:** per-level `QUIZ_BANK` (286–304), 12-item `SCENARIO_CHALLENGES` "Clinical Scenarios" (781–830), plus the two scored Sleuth mini-games and the honest "Reinforcement Inquiry" H7b'' widget (3462–3527).
- **AI:** a single teacher-initiated "Explain at my level" tutor (3292–3402, `callGemini` at 3332) with a Plain/Grade-5/HS/Pro reading-level selector. Three other AI aliases (callTTS/callImagen/callGeminiVision, 95–97) are dead.

---

## 2. Real strengths (do not regress these)

**The autistic self-advocacy critique is genuinely present, sourced, and well-placed — protect it.** This is the tool's distinguishing asset:

- **`BEYOND_ABA`** (672–709, LIVE at 4906–4964): 6 sourced cards — "The autism community critique" (line 674: names 40-hr intensity, "indistinguishable from peers" = trains masking, targeting stimming/eye-contact, consent; cites **ASAN** + **Kupferstein 2018**); "Neurodiversity-affirming ABA" (680, cites **BACB 2022+**, Schreibman **NDBI**); "Trauma-informed practice" (686, Perry/Shanker); **"Double Empathy Problem"** (692, **Milton 2012 + Crompton 2020**, correctly attributed); "What ABA does well" (698: honest FCT/dangerous-behavior accounting); "What ABA cannot do alone" (704). Footer (4962) holds identity-first language with community-consensus citations (Kenny 2016 / Bury 2020 / Taboas 2023).
- **The deliberate ethics boundary** (4966–5006): named autistic adults (Ne'eman/ASAN, Grandin, Milton, **Kupferstein** — whose entry at 646 explicitly hedges "the methodology has been debated", **Asasumasu**, **Mel Baggs**) are intentionally relocated to SEL Hub "Disability Voices" rather than displayed "inside a tool whose central image is a Skinner box" (line 5002). This is a documented, thoughtful design choice.

**The operant/schedule/FBA science is expert-grade and consistent across surfaces — these are correct, leave them:**

- **Four-term contingency** (`REINFORCE_MATRIX` 730–743 + `ABA_GLOSSARY` 371–374): SR+/SR−/SP+/SP− all correct, including the most-failed distinction — SR− = removing an aversive to *increase* behavior, with the explicit "NOT punishment!" flag (372) and good examples (seatbelt-beep, 736).
- **Schedule effects** match canonical Ferster & Skinner everywhere (SCHEDULE_TYPES 722–727; feedback 5346–5349): FR post-reinforcement pause; VR steepest/most extinction-resistant; FI scallop; VI low-steady. The PRE-effect hint (3519) is accurate.
- **Shaping** (L2, 158), **extinction burst** (L3 + QUIZ 3 + SCENARIO #12, with the clinically essential "don't give in *during* the burst" coaching at 826–829), **DRO** (L8 254 + SCENARIO #11), **SD/S∆** (L5), **chaining** ("each response produces the SD for the next", L7 238) — all correct and consistent.
- **FBA content is function-based, not topography-based** — the single most important thing an FBA tool can get right. The 12 vignettes teach the actual diagnostic tells clinicians use: instant-stop when item returns (#9 Eli), audience-independence (#4/#7), selective onset/relief (#12 Sasha), hidden/negative attention (#8 Alex). The primer correctly states behavior can have multiple functions; "pick the most-likely *primary*" (5469). Function/intervention matches are textbook-current (Cooper/Heron/Heward; BACB).
- **Neurodiversity hedge is baked into the FBA data itself:** the Sensory intervention says "Consider whether the behavior actually needs intervention (it may serve a regulatory function)" (342); vignettes #4/#7 say sensory behavior "often does not need intervention." This is correct, rare, and a strength — **do not let any "fix" pathologize stimming.**
- **The VR/slot-machine fun fact is already correctly hedged** ("along with other psychological, social, and neurological factors," line 192) — a model for how to hedge other claims.
- **The "Reinforcement Inquiry" widget** (3462–3527) is a model of honest assessment: "no score, no reveal, no answer dump" + "Persistence is multi-dimensional… this is a teaching heuristic" (3527).

---

## 3. Accuracy findings (Verify CONFIRMED `theToolIsWrong=true` only)

### CONFIRMED-WRONG

**A. Cumulative-record primer says only *reinforced* responses raise the y-axis — FACTUALLY-WRONG.**
- **Current (line 5265):** *"Cumulative-response curve: each reinforced response adds one to the y-axis."*
- **Corrected:** In a cumulative record, **every response** steps the pen up by one; the **slope = response rate**; reinforcer deliveries are marked separately (hash/pip ticks). The word "reinforced" is the bug — delete it.
- **Severity: med. Confidence: high.** Verified against the tool's *own* generator (cumResp increments on responding at 5198/5204/5212/5220; reinforcement counters are tracked separately and never touch the y-axis) and the tool's *own* other surface, which already draws reinforcers as separate green pips with the label "Green = reinforcement delivery (FR-3 pattern)" (3025–3041). So 5265 is internally inconsistent with the rest of the tool. This is load-bearing: the FR pause, VR steepness, and FI scallop are only readable *because* the curve plots all responses.

**B. Lovaas 1987 "47% achieved normal functioning" stated as flat fact — CONTESTED-AS-FACT / ETHICS-FRAMING.** (The central finding; full reframing in §4.)
- **Severity: med–high. Confidence: high.** Eight independent adversarial verdicts upheld this; see §4 for the precise location correction and balanced reframe.

### Two assessment-validity gaps in Schedule Sleuth (the *stimulus* doesn't reliably show the feature the answer key rewards — not a science-prose error)

**C. FR curve produces only a single-tick pause — not the break-and-run the game asks students to spot.** Generator (5194–5201): responding is skipped only when `localT<1` (exactly one tick per ratio), so the FR curve is ~0.6-slope near-linear and hard to distinguish from VR by shape alone. **Severity: med. Confidence: high.** Fix: hold flat ~3–5 ticks after each ratio + raise post-pause run rate so the staircase is visible.

**D. FI scallop never truly resets after the first interval** — later "scallops" flatten into a near-straight diagonal because `inInt` resets to ~1 (not 0) and re-accelerates immediately (5207–5217). FI can look like VR late in the trace. **Severity: low. Confidence: med.** Fix: suppress responding a few ticks post-reset + cap within-interval rate so concavity repeats.

> C and D both have **two copies** (Sleuth SVG 5194–5217 + comparison-canvas twin 5061–5088) that must stay in sync. Gate with shape-property unit tests, not eyeballing.

### REJECTED findings (finder over-corrected — do NOT act)

- **"Sidman 'coercion framework' is a flat/wrong attribution"** (line 334) — **REJECTED.** Stimulus equivalence is correctly attributed; *Coercion and Its Fallout* (1989) is a real Sidman work; "reinforcement over punishment" fairly summarizes its thesis. Verdict: FINE as written. Optional book-naming polish only, not a fix.
- **"ABA_APPLICATIONS 'Autism Services: Evidence-based' is one-sided-by-default"** (line 347) — **REJECTED as a live finding.** Verified: `ABA_APPLICATIONS` appears once (definition only, line 346); it is **dead code**, never rendered. No student sees it, so there is no live consistency tension. "Evidence-based" is also a defensible descriptor for the skill-teaching targets described. (Latent-debt note only — see §4.)
- **"Lovaas claim has *two render sites* (333 + 844)"** — **PARTIALLY corrected.** Line 333 (`FAMOUS_BEHAVIORISTS`) is **dead code** (verified: array referenced once = its definition). The finders who claimed line 333 is "rendered with a heart icon, student-facing" over-stated exposure. The **only live instance is line 844.**

---

## 4. ABA ethics + framing (the most important section)

**Bottom line up front, stated directly:** This tool is *not* guilty of one-sided pro-ABA framing. It carries the autistic self-advocacy critique with real scholarship, hedges a contested *critique* source (Kupferstein, 646), and makes a deliberate ethics choice about Skinner-box imagery. The balance is genuinely good in most places — say so to anyone who reviews this. The integrity problem is narrow and specific: **one contested claim, on one live surface, sits uncoupled from (and in direct tension with) the tool's own critique.**

### The actual problem (precise)

The **live** ABA History Timeline milestone at **line 844** (rendered 5957):

> `{ year: 1987, event: 'Lovaas Study: 47% of children achieve "normal functioning" with intensive ABA', icon: '📈', era: 'applied' }`

Scare-quotes around "normal functioning" are the *only* signal. There is no epistemic hedge, no citation, and `era: 'applied'` + 📈 styling reads as a celebratory milestone. **This is the exact "recovery/normalization" construct the tool's own `BEYOND_ABA` panel (line 676) criticizes as "training masking."** The two live surfaces are internally inconsistent. Worsening the coupling: the critique panel (`blShowBeyond`) and the timeline (`blShowTimeline`) are *parallel collapsed toggles* — a student can open the celebratory history without ever opening the critique.

**What is and is not an integrity problem (be direct):**
- The 47% **figure itself is real and accurately reported** (Lovaas 1987, *J Consult Clin Psychol* 55:3–9; 9/19 = 47% of the intensive group reached normal-range IQ + unassisted regular first-grade placement). This is **CONTESTED-AS-FACT, not FACTUALLY-WRONG.** Do not delete the number or imply the study didn't happen.
- What is contested: the **construct** ("normal functioning"/recovery/"indistinguishable from peers" — McEachin/Smith/Lovaas 1993, same cohort), the **design** (non-randomized, assignment by therapist availability; N=19 intensive), the **original program's aversives** (the UCLA Young Autism Project used contingent slaps/shouting; contingent electric shock in the *earlier* 1960s work — Lovaas & Simmons 1969 JABA), and **replication** (Sallows & Graupner 2005, Cohen 2006 report more modest/mixed effects; AHRQ/Reichow rate EIBI positive-but-low-strength).

### The precise BALANCED reframing (defensible to a BCBA *and* an autistic self-advocate)

**Line 844 (live timeline — the one that must change):**
> `{ year: 1987, event: 'Lovaas reports 47% of an intensive-ABA group reached normal-range IQ + mainstream first-grade placement ("normal functioning") — a landmark but heavily contested result: non-randomized, small N (19 intensive), the original program used aversives, and the "recovery/normalization" framing is exactly what the autistic community critiques (see Beyond Pure ABA).', icon: '📈', era: 'applied' }`

If the one-line timeline cell is too tight, the **floor** is: keep the scare-quotes AND append *"(non-randomized, small N, used aversives; contested — see critique)."*

**Honesty floor that is currently missing entirely:** the original program's **use of aversives is never acknowledged anywhere student-facing** (grep-confirmed: shock/slap/aversive appear only in generic operant defs and unrelated FBA scenarios). Omitting this *while* citing the 47% approvingly is the asymmetry. Add one sentence to the existing `BEYOND_ABA` "autism community critique" card (674–678): *"Historical practice included contingent aversives — shouting, slaps, and in the earliest published work contingent electric shock — to suppress stimming and self-injury; the field has broadly repudiated aversive intervention."* Phrase it as "earliest work" so it does not imply the 1987 study itself was a shock study (that precision was a key adversarial refinement).

**Line 333 (`FAMOUS_BEHAVIORISTS` Lovaas card — DEAD, but fix-or-delete the latent hazard):** This is worse-framed than the live copy (no scare-quotes, field tagged "Autism Intervention," ❤ icon) and is one render-wire from students in a hand-maintained file. Either delete the orphaned array or mirror the hedged wording above. Same disposition for the dead `ABA_APPLICATIONS` "Autism Services / Evidence-based" string (347) — leave it, but if ever wired up it needs the same balance.

**Optional, low-effort prominence fix:** cross-link the 1987 milestone to the critique (special-case `ms.year===1987` in the 5957 map → a keyboard-operable "See: Beyond Pure ABA →" affordance that sets `blShowBeyond` true). Do **not** auto-expand everything (UDL cognitive-load). One cross-link + the hedge is sufficient.

---

## 5. Other problems that matter

**A11Y — graded HIGH on two; the foundation is genuinely good (do not regress it).** Strengths verified: dedicated polite live region (45–56), role=img on both canvases, role=radiogroup pickers, skip links, role=button+onKeyDown shims, progressbar, prefers-reduced-motion **CSS** override.

- **[HIGH] The chamber aria-label is permanently frozen at "exploring."** Line 3945 reads `d.blAction`, but the sim writes `d.blMouseAction` (1882; `ACTION_LABELS`/`ACTION_COLORS` mappers already exist and are used at 2795/4621). `blAction` appears *only* at 3945 (grep-confirmed). The core simulation's behavior is conveyed to a screen reader *not at all*. **WCAG 1.1.1.** One-token fix: `d.blAction` → `ACTION_LABELS[d.blMouseAction]` + L5 light state. Confidence high.
- **[HIGH] The lever-press cue (the student's only job) is never announced.** Only successful-reinforce/level-complete/pause fire `announceToSR` (1327/1841/3645). The central timing task is unobservable without sight. **WCAG 2.1.1 / 4.1.3.** Fix: in `advanceTick`, announce target-relevant events (throttled). Confidence high.
- **[HIGH] Cumulative-record + Schedule-Sleuth curves are image-only** — the aria-label is a score count / "identify from its shape," with no text description of the trend the student is supposed to read. A blind student literally cannot attempt Schedule Sleuth. Fix: derive a qualitative shape descriptor (data already in hand). Confidence high.
- **[MED] Canvas rAF animation ignores prefers-reduced-motion.** The CSS guard (41) only clamps CSS animation; the JS rAF mouse loop + 60-frame trail run regardless. Fix: `matchMedia('(prefers-reduced-motion: reduce)')` → snap to target, draw one static frame. **WCAG 2.3.3.** Confidence high.
- **[MED] Visual-only status surfaces** (Last Behavior, Chain Progress, DRO timer, SD light) not in live regions.

**Assessment — graded HIGH (overclaim) + clean item content.** Item-level content is *strong*: every `QUIZ_BANK` key correct, every Function Sleuth vignette a defensible single-best answer, `SCENARIO_CHALLENGES` accurate. The scoring is engagement-style (streaks/%/badges), so no psychometric-validity overclaim. **But:**

- **[HIGH] No "this teaches concepts, not clinical FBA competence" disclaimer anywhere** (grep: zero hits for "not a substitute"/"supervision"/"consult a professional"). Yet a perfect Function Sleuth run says **"Ready for real FBA case work"** (5538), the quiz is titled **"Clinical Scenarios"** (5863), and completion is labeled **"mastered" / "ABA Master!" / "Behavior Analyst in Training!"** (314/321/1840–41/4824). **For your audience this is the single highest-stakes non-ethics finding:** an FBA drives BIPs, restraint decisions, and IEP eligibility; a confident-but-untrained user acting on quiz-"mastery" is a real harm vector. Add a competence-scope disclaimer near the Function Sleuth result + Four Functions panel; soften "Ready for real FBA case work" → "Ready to learn how real FBA casework is structured (with supervision)."
- **[MED] "Mastered"/"ABA Master" conflates completion with skill mastery.** Progression is completion-gated (Next Level always advances; quiz is optional/non-blocking). Reframe to "explored/completed/Concept Explorer." Keep the dopamine, drop the competence claim.
- **[MED] FBA taught as identifiable from a single vignette,** with no "function is a hypothesis confirmed with ABC data over multiple occurrences" caveat — the exact overconfidence error new FBA teams make. The glossary already names ABC Data + FBA (388–389) but never connects them to the game. One primer sentence fixes it.
- **[LOW] "Clinical Scenarios" → "Practice Scenarios"** (5863); **[LOW]** attention intervention (339) leads with "planned ignoring" without the "only when safe to ignore; always paired with DRA, never alone" caveat for dangerous topographies.

**UDL — graded MED.** Rich Multiple Means of Representation (narrative/termDef/funFact/ABC card/2×2 matrix/curves/vignettes/quizzes) and the AI reading-level selector are real wins.
- **[MED] Plain-language tier exists *only* inside the AI tutor.** All static content is jargon-only (SR+, S∆, DRO, "successive approximations"); on AI-off/error the struggling reader/ELL gets only jargon. UDL Representation should not be gated behind an LLM call — add a static `plainDef` field per level.
- **[LOW] Very wide grade band** (upper-elem game loop vs. BCBA-level FBA/measurement/ethics) with no audience signpost; extend the existing "Applied K-12 practice" caption pattern (4894) to the advanced sections.

**AI governance — graded HIGH.**
- **[HIGH] The "Explain" tutor (`callGemini`, 3332) is NOT gated on `ctx.aiHintsEnabled`** (grep: 0 occurrences in file). It is teacher-*initiated* (good — not auto-fired), but it bypasses the house default-OFF kill switch that the golden test pins for spacecolony/roadready/geometryworld/brainatlas. Host (`stem_lab_module.js:4903-4905`) expects routing through `getHint`/`aiHintsEnabled`. Fix: capture `aiHintsEnabled` from ctx near 94, gate the call at 3318, hide the AI IIFE when OFF. Same class as the `angles` false-kill-switch gap.

**Architecture — graded LOW (hygiene, not live bugs).**
- **[MED→LOW] Global keydown listener + 3 window globals registered but never removed** (3091–3103) — safe today (self-no-ops when canvas absent) but a leak; move into a `useEffect` with cleanup.
- **[LOW] 3 unused AI destructures** (95–97); rAF `useEffect` has no deps array (wasteful, not a leak).
- **[LOW] ~6 large MOVED-tombstone arrays + 4 dead reference arrays** (`FAMOUS_BEHAVIORISTS`, `ABA_APPLICATIONS`, `MEASUREMENT_METHODS`, `ABA_ETHICS`) — deliberate/orphaned; decide wire-with-guardrails vs. delete. **Per the verify-reachability norm, do not "fix" these as if students see them.** `MEASUREMENT_METHODS`/`ABA_ETHICS` are good content worth wiring; `FAMOUS_BEHAVIORISTS`/`ABA_APPLICATIONS` are best deleted unless a people panel is planned.

**Golden-master coverage (critical context for all fixes):** behaviorLab has **thin pinning** — the golden digest pins **only the intro screen** (`blPhase 'intro'`; buttons 24, svgs 0, sha 58da9f91). It does **not** cover the running chamber, the timeline, Beyond-ABA, Function/Schedule Sleuth, quizzes, or the AI tutor. **Consequence:** every ethics/accuracy fix in §3–§4 is *unpinned* — safe to edit without churning the golden, but also unprotected against regression. The smoke test (stem_widgets_smoke.test.js:82) only asserts no-throw + the H7b'' signature.

---

## 6. Prioritized roadmap

### Quick wins — S (low-risk string/data edits; you are the ideal red-pen reviewer)

**QW-1. The ethics/accuracy string-edit batch (the headline deliverable).** One carefully-worded data pass, all behind toggles (not in the pinned intro digest):
- Line 844: hedged Lovaas timeline milestone (§4 wording).
- Line 5265: delete "reinforced" → corrected cumulative-record definition (§3-A).
- `BEYOND_ABA` (674–678): add the one-sentence aversives acknowledgment (§4 honesty floor).
- Line 333 + 347 (dead): fix-or-delete the latent overclaims.
- *Why for Aaron:* these are exactly the claims a school psychologist must be able to defend to a BCBA *and* a self-advocate; you should hand-tune every word. **Effort S / Impact HIGH.** *Risk:* the only risk is over-correction — keep it factual and proportionate (the 47% IS real; flag design/construct/replication, do not swing to "ABA is bad"). **Frame this as a batch you red-pen, not a fan-out.**

**QW-2. Fix the frozen chamber aria-label** — `d.blAction` → `ACTION_LABELS[d.blMouseAction]` (+ L5 light state). **Effort S / Impact HIGH.** One-token defect; aria-label-only, no layout/golden impact. *Risk:* none of substance.

**QW-3. Gate the AI tutor on `aiHintsEnabled`** (default-OFF, OFF=zero traffic, hide button). **Effort S / Impact MED–HIGH.** *ctx pattern:* mirror brainatlas/angles; confirm the exact flag name sibling tools thread. *Risk:* intro golden sha changes when the button hides under OFF — add false/true digests.

**QW-4. Add the competence-scope disclaimer** + soften "Ready for real FBA case work" + the FBA-is-a-hypothesis primer line. **Effort S / Impact HIGH for this audience.** Static JSX near 4828 + 5538; behind toggles, no golden churn.

### Bigger bets — M

**BB-1. Make FR/FI curves diagnostic** (multi-tick pauses; both generator copies in sync) + add shape-property vitest assertions. **Effort M / Impact HIGH** (closes the assessment-validity gap). *Risk:* two copies must stay in sync — gate with the new tests.
**BB-2. Static `plainDef` per level** + Plain/Technical toggle (AI-independent UDL). **Effort M / Impact HIGH.** *Risk:* this DOES churn the intro golden (added DOM) — `vitest -u`, confirm additive-only.
**BB-3. Non-visual narration of the running sim** (per-tick lever-press announce, throttled; promote status panels to live regions; curve text descriptors). **Effort M / Impact HIGH** (WCAG for the central sim).

### Strategic — L

**S-1. A behaviorLab-specific golden/characterization harness** covering running chamber + sub-games (the harness already supports state overrides: `renderTool(id, data, overrides)`). Pin `blPhase running` at L1/L4/L9 + `blShowSleuth`/`blShowFnSleuth`/`blShowTimeline`/`blShowBeyond`, plus a **source-content invariant** asserting the contested-status framing is present at line 844 (behavior_lens/worldbuilder pattern). This converts every fix above from "unpinned" to "protected." **Effort L / Impact HIGH long-term.**
**S-2. Dead-array triage** (wire MEASUREMENT_METHODS/ABA_ETHICS with guardrails; delete/tombstone FAMOUS_BEHAVIORISTS/ABA_APPLICATIONS). **Effort M.**

---

## 7. Recommended first slice

**Ship the QW-1 ethics/accuracy string-edit batch + a source-content golden invariant, behind the held deploy.**

This is the single best next thing because: (a) it retires the one *live* integrity defect (the Lovaas timeline) plus the one real wording bug, plus the honesty-floor aversives gap — the items most central to your professional credibility; (b) it is pure data/string edits behind collapsed toggles, so it is the lowest-risk change in the whole roadmap; (c) **you are the uniquely correct reviewer** — these are precisely the claims that must be defensible to both a BCBA and an autistic self-advocate, and you live that tension daily.

**Scope (one data pass):**
1. Line 844 — hedged Lovaas milestone (§4).
2. Line 5265 — delete "reinforced" (§3-A).
3. `BEYOND_ABA` 674–678 — one-sentence aversives acknowledgment ("earliest work" phrasing).
4. Lines 333 + 347 — fix-or-delete the dead-code overclaims (your call: delete is cleanest).

**Definition of done:**
- You have personally red-penned the line-844 and aversives wording (no AI-authored ethics copy ships unreviewed).
- `node --check stem_lab/stem_tool_behaviorlab.js` clean.
- **Golden-master step:** run the existing `stem_tool_golden.test.js` + smoke test — intro digest **must be unchanged** (sha 58da9f91; all edits are behind toggles, so this is the confirming check that scope held). Then **add a source-content invariant** asserting the contested-status framing string is present at the timeline (so a future edit can't silently revert the hedge). Re-baseline only if the invariant test is the only diff.
- Diff is minimal (root only — `build.js --compile` regenerates the mirror at deploy; do **not** hand-edit `desktop/web-app/public/`).
- Held-deploy note: the currently-deployed mirror is stale and predates `BEYOND_ABA` — so the *next* deploy is what makes both the critique and these hedges live together. Flag that to whoever runs the held deploy.

**Defer to a second slice:** QW-2/QW-3/QW-4 (aria-label + AI gating + competence disclaimer) — each independently shippable, but keep the ethics batch clean and reviewable on its own so your red-pen pass isn't entangled with code-logic changes.
