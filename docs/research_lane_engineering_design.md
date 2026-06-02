# Tier 3 Engineering Design Lane — Constraint Forge

Canonical design spec for the Engineering Design lane of the AlloFlow Research Hub. Authored 2026-06-02 as a synthesis of three architect proposals (ngss-engineering, design-thinking, constraints-tradeoffs) and nine judge verdicts. NGSS-engineering won the spine (avg 8.17, zero fatal flaws); grafts from design-thinking (StakeholderCard persistence, accessNote epistemic honesty, stakeholderAccountabilityStatement) and constraints-tradeoffs (constraintsPunted anti-magical-solution gate, TradeOffSliderBlock relational construction, tradeoff_inverter AI antagonist, epistemicStatus carry-through) are baked in. All CONDITIONAL_PASS required fixes are treated as correctness baselines, not scope cuts.

---

## 1. Pitch and engineering-vs-inquiry distinction

**One-line pitch.** A criteria-first Design Studio where students cannot prototype until they've quantified at least one binding constraint, cannot select until they've compared multiple non-dominated candidates on a measured trade-off surface, and cannot ship until they've completed a structural failure-and-retest loop with a measured delta — AI surfaces missed constraints, dominated alternatives, and stakeholder questions, but is structurally forbidden from proposing any part of the design.

**Why engineering, not inquiry.** The Scientific Inquiry lane teaches students to author an explanation accountable to evidence — convergence on what is true. The Engineering Design lane teaches students to author a solution accountable to a named human under fixed resources — there is no single correct answer, only non-dominated points on a Pareto surface. Where Scientific gates on wondering distinctness, mechanism verbs, and steelman opposition, Engineering gates on QUANTIFIED constraints (numeric target + whitelisted unit + binding-threshold check), MULTIPLE non-dominated candidates (≥3 with distinct punted-constraint sets), a measurable test protocol bound to each criterion, and a structural failure-loop with a CHANGED VARIABLE, a re-test measurement that actually moved (>5% delta or sign flip), and a student-authored prediction-vs-reality reconciliation. The headline export artifact is not a claim with a confidence label — it is a problem-statement-bound-to-stakeholder + Pareto-aware candidate selection + failure-log-with-measured-retest + design rationale that triple-anchors to constraints, trade-offs, and stakeholder voice. The Scientific lane's substrate (wonderings/claims/modelSnapshots) cannot structurally hold any of this. Engineering's deepest move — and the one Scientific has no analog for — is that the same situation yields different problems depending on whose constraints you took seriously, and the lane structurally requires the student to name whose interest got LESS weight in every trade-off they accepted.

---

## 2. Chosen lens and graft table

| Source | Role | What came in |
| --- | --- | --- |
| **ngss-engineering** | SPINE | Six stages (define → develop → plan → build → optimize → communicate); criteria-first declarations; decision matrix as artifact; structural failure-loop with retest-delta; TP firing BETWEEN authoring the loop and running the retest; no AI on plan stage by design; designClaims label enum {meets_criteria, partial, not_yet}; constraintMatrix + tradeOffLedger consume Tier-1-reserved slots |
| **design-thinking** | GRAFT (5 elements) | (1) StakeholderCard pinned to EVERY stage (not just Define); (2) accessNote {direct, proxy, imagined_with_research} with conditional gates; (3) stakeholderAccountabilityStatement as parallel structural-leak neutralizer; (4) StakeholderReturnAffordance + 'stakeholder_reframe' loopback chip; (5) DivergenceBoard side-by-side criteria-vs-stakeholder visual at Build/Communicate |
| **constraints-tradeoffs** | GRAFT (5 elements) | (1) constraintsPunted ≥1 per candidate (anti-magical-solution gate); (2) TradeOffSliderBlock constructing trade-off as RELATION between two existing constraint IDs; (3) tradeoff_inverter AI touchpoint as antagonist voicing inverted-priority stakeholder; (4) epistemicStatus {invented, observed, interviewed, curriculum_prompt} with downstream consequence on designClaims label enum; (5) ConstraintCoverageBar + lock tier-downgrades post-build_test |
| **Pedagogy review** | BAKED-IN | Whose-problems-count visibility at Define (whyThisStakeholderJustification ≥40c); reward elegance over complexity; materials parity (cardboard/tape default); no 'How might we' / persona / empathy-map rituals; safety-override carve-out (stakeholder voice cannot outrank physical-harm criteria) |
| **Judge fixes** | CORRECTNESS | dominatedPickJustification ≥40c; measurabilityAcknowledged structural gate; FOOTGUN engineering extensions; two-criterion-substring rule in tradeOffDeclaration; hold ≥3 candidates for 3_5; constraint-touches-rationale (NAME + TARGET+UNIT); constraintMatrix and tradeOffLedger shape extensions honestly disclosed; engineering LOOPBACK_CHIPS added; PER_TOUCHPOINT_CAP wired; __tier:2 sentinel; decision-matrix reasonText distinctness; candidate punted-set + materialsList distinctness; weighted-sum formula visible; criteriaWeightLog audit; safety override; loadJournal migration ladder; retest-delta gate + predictionVsRealityRadio; generic-stakeholder denylist; two cross-cutting LOOP_REWARDING_EXEMPLARS |

---

## 3. Stage list

Six stages, all click-jumpable from every other stage via CycleWheel + StageChipStrip (parity with Scientific's HEX-RING). Stage S_n can loop back to any S_1..S_{n-1}; the invariant loopBackTargets array is preserved.

### 3.1 define_problem
**Purpose.** Define and delimit the engineering problem. Author a problem statement bound to a NAMED, non-generic stakeholder; declare ≥2 measurable criteria; declare ≥2 testable HARD constraints with whitelisted units and binding thresholds; declare epistemicStatus on stakeholder access. Constraints without units or with non-binding thresholds are structurally rejected at the ConstraintRow primitive.

**Student affordances.** problemText input; StakeholderCard editor (name + group + accessNote + epistemicStatus + whyThisStakeholderJustification + optional voice); generic-stakeholder denylist; criteria rows; ConstraintRow with SANE_RANGE registry refusal; safety-surface gate (≥1 criterion.kind='physical-safety' OR ≥60c safetyExemptionJustification); ExemplarPair on quantified-vs-vibes constraints AND binding-vs-non-binding thresholds; optional TP1 constraint_excavator.

**Gate to next.** Structural: stakeholderProfile.name not in denylist; whyThisStakeholderJustification ≥40c; epistemicStatus set; problemText ≥ devLevel floor AND contains stakeholder substring; criteria.length ≥2; safety surfaced; constraintMatrix has ≥2 hard rows passing numeric + whitelisted-unit + SANE_RANGE; ≥1 hard constraint source='stakeholder' AND token-binds to stakeholderProfile; if TP1 fired with measurability flag, measurabilityAcknowledged ≥30c; exemplarViewed/Dismissed.

**Loop-back targets.** None (entry stage).

### 3.2 develop_candidates
**Purpose.** Develop possible solutions. Author ≥3 distinct candidate concepts (≥2 for k2 with picture-pair sketches), each declaring constraintsSatisfied AND constraintsPunted (≥1 punted). Fill a full (candidate × criterion) decisionMatrix with score 1-5 + reasonText ≥12c per cell. The matrix is the artifact.

**Student affordances.** CandidateCard with constraintsPunted-required affordance; DecisionMatrix with weighted-sum formula visible; TradeOffSurfaceSketch deterministic Pareto plot; ExemplarPair contrasting three-of-the-same-bridge vs truss/arch/suspension; optional TP2 dominated_solution_finder; criteriaWeightLog stamping any post-fill weight change.

**Gate to next.** Structural: candidateConcepts.length ≥ devLevel floor (k2=2, 3_5+=3); every candidate has ≥1 constraintsPunted entry; every cell has score + reasonText ≥12c passing isPlausibleProse; pairwise sketchText tokenJaccard ≤0.6 AND set-distance ≥1 on (constraintsSatisfied ∪ constraintsPunted) AND materialsList differs ≥1 entry; within-candidate reasonText tokenJaccard ≤0.7; exemplarViewed/Dismissed.

**Loop-back targets.** [define_problem].

### 3.3 plan_test
**Purpose.** Bridge between Develop and Optimize. Select one candidate; author tradeOffDeclaration naming TWO distinct criteria (gained + sacrificed); add testProtocol per criterion. NO AI by design (parity with Scientific plan stage), except OPTIONAL tradeoff_inverter for the inversion-only mirror move. If selected candidate is Pareto-dominated, dominatedPickJustification ≥40c required.

**Student affordances.** Candidate selector; TradeOffSliderBlock constructing relation between two existing constraint IDs; testProtocol rows; killReason ≥40c per non-chosen candidate naming the constraint priority causing dismissal; dominated-pick yellow banner; ExemplarPair on test-protocol specificity; optional TP tradeoff_inverter (cap=1) ONLY after tradeOffLedger ≥1 entry.

**Gate to next.** Structural: selectedCandidateId set; tradeOffDeclaration ≥80c containing 2 distinct criterion.name substrings; tradeOffLedger.length ≥1 with whoseInterestThisServes ≥10c (not equal stakeholderProfile.name); testProtocol covers every criterion; procedureText ≥30c passes isPlausibleProse; every non-chosen candidate has killReason ≥40c; if Pareto-dominated pick, dominatedPickJustification ≥40c with criterion substring-link; exemplarViewed/Dismissed.

**Loop-back targets.** [define_problem, develop_candidates].

### 3.4 build_test
**Purpose.** Build the prototype, run the protocol, log MEASURED results per criterion. Optional stakeholder feedback voice note unless accessNote='direct' (then required). Tier-downgrades on existing hard constraints LOCKED from this stage onward (closes constraint-fitting fallacy).

**Student affordances.** BuildLogTimeline (append-only); testRun entry per testProtocol row; constraintMatrix[i].measured update; ConstraintCoverageBar; DivergenceBoard side-by-side; stakeholderFeedback VoiceNoteBlock; ExemplarPair contrasting 'it worked' vs measured deflection.

**Gate to next.** Structural: ≥1 buildLog entry; every criterion has ≥1 testRun with numeric measured; ≥1 testRun.passed===false OR ≥1 stakeholderFeedback (something to learn from); if accessNote='direct': stakeholderFeedback ≥40c; if accessNote='imagined_with_research': sources.length ≥1; no tier-downgrade without logged relaxation; exemplarViewed/Dismissed.

**Loop-back targets.** [define_problem, develop_candidates, plan_test].

### 3.5 optimize
**Purpose.** Optimize through ITERATION. Structurally requires a failure-analysis loop: name a failure mode, hypothesize cause, change EXACTLY ONE variable, predict effect, RE-TEST with a measurement that actually moved, reconcile prediction vs reality. TP3 failure_mode_critic fires BETWEEN authoring the loop and running the re-test — the timing is unique to engineering.

**Student affordances.** FailureLoopCard linking failureLog row to its retest testRun; changedVariable structured input; predictedEffectText; TP3 invocation gate; retest testRun creation with retest-delta check; predictionVsRealityRadio {confirmed, partially, refuted}; ExemplarPair contrasting 'we made it stronger' vs isolated-variable failure analysis.

**Gate to next.** Structural: ≥1 failureLog entry with all required fields; fromTestRunId points to testRun with passed===false; retestRunId points to a real NEW testRun with numeric measured; |retest.measured - fromTestRun.measured| / |fromTestRun.measured| > 0.05 OR passed-sign-flip; changedVariable.fromValue !== toValue; predictionVsRealityRadio set; causeHypothesis tokenJaccard ≤0.5 with whatThisVersionTests; buildLog.length ≥2; exemplarViewed/Dismissed.

**Loop-back targets.** [define_problem, develop_candidates, plan_test, build_test].

### 3.6 communicate
**Purpose.** Author designRationale + stakeholderAccountabilityStatement (the structural-leak neutralizer). designClaims labeled and triple-anchored. epistemicStatus carry-through gates label enum. Safety-override forces non-'fit_for_stakeholder' label when safety constraint unmet.

**Student affordances.** designRationale textarea with deterministic substring-link checker; stakeholderAccountabilityStatement textarea with three-way-anchor checker; designClaims editor with epistemicStatus-conditional label enum; optional TP4 stakeholder_translator; two cross-cutting LOOP_REWARDING_EXEMPLARS rendered at lane exit; ExemplarPair contrasting 'our bridge is good' vs measured-and-traded rationale.

**Gate to next.** Structural: designRationale ≥ devLevel floor AND substring-linked to ≥1 criterion + ≥1 constraint NAME + ≥1 constraint TARGET+UNIT + tradeOffDeclaration + ≥1 failureLog; designClaims.length ≥2; each claim labeled with epistemicStatus-permitted label AND triple-token-anchored (criterion/constraint OR testRun + stakeholder); stakeholderAccountabilityStatement ≥120c with three-way anchor (stakeholder + designClaim + prototype-not-tested); safety-override satisfied; no unacknowledged stale labels; no untested-hard-constraint without acknowledgment chip; exemplarViewed/Dismissed.

**Loop-back targets.** [define_problem, develop_candidates, plan_test, build_test, optimize].

---

## 4. AI touchpoint table

| Stage | Name | Trigger | Student-first gate | Coach role | What AI refuses to do |
| --- | --- | --- | --- | --- | --- |
| define_problem | **constraint_excavator** | "Surface constraints I may have missed" after structural gate passes | ≥2 criteria + ≥2 hard quantified+unit+SANE-RANGE constraints + stakeholder named + safety surfaced + exemplar viewed | questioner | Propose constraints, rewrite problem statement, name stakeholder, propose numeric targets. Outputs ONLY *_questions[] arrays. PER_TOUCHPOINT_CAP=2. If measurability_probe_questions fire on a constraint that stays unchanged, measurabilityAcknowledged ≥30c required before stage advance. |
| develop_candidates | **dominated_solution_finder** | "Which of my candidates is dominated?" after full matrix + distinctness + selectedCandidateId === null | candidates ≥3 + matrix complete + constraintsPunted ≥1 each + distinctness gates + selectedCandidateId === null + exemplar viewed | critic | Pick winner, propose new candidate, rescore cells, name "most promising/strongest/best fit". dominated_candidate_id must verbatim-echo an existing candidateConcepts[].id. PER_TOUCHPOINT_CAP=2. |
| plan_test | **tradeoff_inverter** (grafted, optional, INVERSION-ONLY) | "Voice the stakeholder with inverted priorities" after tradeOffLedger ≥1 + whoseInterestThisServes set | tradeOffLedger ≥1 + tradeOffDeclaration has 2 criterion substrings + cooldown elapsed + post-AI tradeoffSynthesis ≥80c authored if prior call + exemplar viewed | mirror | Tell student priorities are wrong, suggest different chosenCandidateId, propose 'correct' trade-off. Mirrors verbatim ≤8-word substring of student justification; asks inversion_questions[]. PER_TOUCHPOINT_CAP=1. Post-AI student-authored tradeoffSynthesis ≥80c required, with reverse-leak rejection if >12c 6-grams from AI questions appear in synthesis. |
| optimize | **failure_mode_critic** | "What failure modes am I missing?" AFTER failureLog row complete BUT BEFORE retest (retestRunId === null) | failureLog has modeText ≥25c + causeHypothesis ≥30c with tokenJaccard ≤0.5 to whatThisVersionTests + changedVariable set + predictedEffect ≥25c + retestRunId null + fromTestRunId points to passed===false testRun + exemplar viewed | critic | Propose fix, tell student which variable to change, predict retest outcome, use imperative verbs. Quoted phrases must be verbatim substrings. PER_TOUCHPOINT_CAP=2. |
| communicate | **stakeholder_translator** | "Questions my stakeholder would ask" after designRationale + designClaims + stakeholderAccountabilityStatement all gate-passing | designRationale ≥160c + triple-anchor + designClaims ≥2 labeled and triple-anchored + stakeholderAccountabilityStatement ≥120c three-way anchored + buildLog ≥2 versions + exemplar viewed | translator | Rewrite rationale, issue approval verdicts ('well-fitted', 'design-is-sound', 'ready-to-ship' all dropped from any enum), change claim labels, propose 'better' trade-off. Per-claim student_label echoed verbatim. No stakeholder_followup_question 6-gram >12c may appear in designRationale or stakeholderAccountabilityStatement (no parroting). PER_TOUCHPOINT_CAP=2. |
| plan_test + build_test | **NO_AI_BY_DESIGN sentinel** | Never (consolidated sentinel covering two no-AI stages) | N/A | n/a | plan_test ships ONLY the optional inversion-mirror tradeoff_inverter; primary no-AI stance preserves criterion→measurement binding. build_test ships zero AI to prevent material/fix proposal drift. Surface plan_no_ai_note and build_no_ai_note explaining each pedagogical choice. |

Sum of caps = 2+2+1+2+2 = 9 across five real touchpoints; global 8/session cap binds and forces explicit choice across stages.

---

## 5. Inquiry Journal substrate extensions

All NEW fields are TOP-LEVEL. Justifications below tie each to cross-stage join semantics, substring-link gate access, or rendering parity with Scientific's modelSnapshots/claims precedent. constraintMatrix and tradeOffLedger consume PRE-RESERVED Tier-1 slots and disclose shape extensions honestly.

- **stakeholderProfile** {name, group?, accessNote, epistemicStatus, whyThisStakeholderJustification, voiceNote?, ts, staleLabel?}. TOP-LEVEL because StakeholderCard renders this on EVERY stage; designRationale + stakeholderAccountabilityStatement substring-link gates at communicate reference it; TP4 buildPrompt reads it; epistemicStatus carry-through gates designClaims.label enum; safety-override and denylist consume it. Cannot reuse journal.positionality because positionality is the AUTHOR's situation, not the BENEFICIARY's.
- **criteria** [{id, name, unit, target, direction, weight, kind, ts, staleLabel?}]. TOP-LEVEL because every later stage reads it. Distinct from constraintMatrix because criteria define what 'good' means (direction + weight semantics) while constraints are hard thresholds — collapsing them loses the trade-off-surface pedagogy.
- **candidateConcepts** [{id, ts, name, sketchText, sketchDataUrl?, audioBase64?, durationS?, materialsList, constraintsSatisfied, constraintsPunted (REQUIRED ≥1), riskiestAssumption, killReason?, chosen?, supersededBy?}]. TOP-LEVEL because it is THE headline divergence artifact; cross-stage references from decisionMatrix, plan_test.selectedCandidateId, buildLog.candidateId, TP2 validator.
- **decisionMatrix** [{candidateId, criterionId, score, reasonText, ts}]. TOP-LEVEL because it is THE convergence input for Plan and feeds TradeOffSurfaceSketch + DecisionMatrix dominance hints; staleLabel propagation when criteria change; within-candidate and within-criterion distinctness gates need top-level access.
- **criteriaWeightLog** [{ts, criterionId, fromWeight, toWeight, afterMatrixFilled}]. TOP-LEVEL append-only audit. Stamps export badge 'weights changed after scoring' to prevent re-weighting attack.
- **testProtocol** [{id, criterionId, procedureText, instrument, unit, pass_threshold, conditions?, ts}]. TOP-LEVEL because build_test gate requires every criterionId to have a testRun and stale-flagging propagates from criteria changes.
- **buildLog** [{v, ts, candidateId, buildText, materialsActually, photoDescription, durationS_voice?, audioBase64?, loopBackOrigin?, deltaFromPrior?}]. TOP-LEVEL append-only versioned artifact — engineering analog of modelSnapshots[]. NEVER mutate prior entries.
- **testRun** [{id, v, ts, buildLogV, criterionId, measured, unit, passed, observationText, audioBase64?, durationS?}]. TOP-LEVEL because designClaims must lexically link via testRunId, TP4 validator verifies cited testRunIds exist, retest-delta gate at optimize compares retest.measured to original.measured.
- **stakeholderFeedback** [{id, ts, prototypeVersionRef, verbatimResponse?, proxyJustification?, audioBase64?, durationS?, observerNotes, surprises, criteriaJudgments: [{criterionId, stakeholderJudgment}]}]. TOP-LEVEL because DivergenceBoard renders cross-stage; access-conditional gate reads accessNote against this array's presence; three-way-anchor on stakeholderAccountabilityStatement reads verbatimResponse.
- **failureLog** [{id, ts, fromTestRunId, modeText, causeHypothesisText, changedVariable: {name, fromValue, toValue}, predictedEffectText, retestRunId, predictionVsRealityRadio?}]. TOP-LEVEL because optimize → communicate gate counts entries with non-null retestRunId pointing to real testRun. THE defense against single-revision iteration.
- **designClaims** [{id, ts, text, kind, label, staleLabel?, claimEvidenceRunIds, constraintRefs, tradeoffRefs, aiLabelQuestion?, calibrationResponse?}]. TOP-LEVEL — engineering analog of Scientific's claims[] with distinct enums. Stays separate from claims[] because the label enum and triple-anchor gate semantics differ; export pipeline reads both via activeLane discriminator.
- **constraintMatrix** (Tier-1-reserved, EXTENDED with REQUIRED 'unit'). Migration: lazy-merge legacy rows with unit:''. Shape change disclosed honestly. loadJournal patched to accept v in {1,2,3}.
- **tradeOffLedger** (Tier-1-reserved, EXTENDED with sacrificedCriterion, whoseInterestThisServes, acceptedPriorityRank, justificationAudioBase64?, loopBackOrigin?). Projection rule specified explicitly.
- **sources** (Tier-1-existing) consumed under accessNote='imagined_with_research'.

---

## 6. New primitives

Eleven new primitives, none duplicating Tier-1 shared primitives (SuggestionBadge / ExemplarPair / VoiceNoteBlock / CostMeter / DevLevelSelector). Each AI-rendered surface MUST still be wrapped in ctx.primitives.SuggestionBadge.

- **ConstraintRow** — typed predicate editor with SANE_RANGE refusal.
- **DecisionMatrix** — structural grid with visible weighted-sum formula and Pareto-dominance hints.
- **TradeOffSurfaceSketch** — 2-axis SVG scatter with greyed dominated points.
- **TradeOffSliderBlock** — relational trade-off constructor between two existing constraint IDs.
- **CandidateCard** — multi-modal candidate editor with constraintsPunted-required affordance.
- **FailureLoopCard** — composite pairing failureLog row with retest testRun row.
- **BuildLogTimeline** — engineering analog of ModelTimeline (append-only horizontal v1→vN).
- **StakeholderCard** — persistent header rendered at top of EVERY stage.
- **ConstraintCoverageBar** — pass/fail/untested visualization driving export soft-block.
- **DivergenceBoard** — side-by-side criteria-measured vs stakeholder-said visual.
- **StakeholderReturnAffordance** — one-tap loop-back with 'stakeholder_reframe' pre-loaded.

---

## 7. State machine summary

Six stages with HEX-RING CycleWheel + StageChipStrip parity. Forward navigation is direct; backward navigation triggers LoopBackPicker requiring 1-tap whyChipId selection from the extended chip taxonomy {constraint_missed, stakeholder_voice_changed, failure_insight, criterion_shifted, candidate_reconsidered, stakeholder_reframe, constraint_relaxation_post_test, plan_mismatch, new_evidence, assumption_surfaced, evidence_anomaly, other (+ ≥10c free-text)} — the first six are engineering-specific additions to Tier-1's LOOPBACK_CHIPS.

On loop-back commit: append loopBacks[]; stamp supersededBy on every downstream stage; flip staleLabel=true on every entry in criteria[], constraintMatrix[], designClaims[]; set activeStage and pendingLoopReturn; pin persistent '↩ Return to where I was' button until acknowledged. On snapshot-save: stamp loopBackOrigin on the new buildLog entry if pendingLoopReturn exists; null on return; stamp returnedToOrigin on the latest loopBacks entry for educator-dashboard loop-completion accounting.

Special post-build_test invariant: tier='hard'→'soft' downgrades on existing constraintMatrix rows are LOCKED unless logged via loopBack with whyChipId='constraint_relaxation_post_test' and justification ≥60c. This closes the constraint-fitting-fallacy attack (adversarial review identified this as a paper-tiger gate without the lock).

Export soft-block: any staleLabel===true on criteria/constraintMatrix/designClaims must be explicitly acknowledged; any untested-hard-constraint must carry an 'untested-hard-constraint' acknowledgment chip; safety-override must be satisfied.

---

## 8. Persistence keys

Single localStorage key STORAGE_KEY = 'alloflow_research_hub_v1' (Tier-1 invariant). Engineering lane writes to journal.* fields above. Journal version bumps 2→3 with migration ladder in loadJournal (PRE-REQUISITE substrate patch: current loadJournal at line 164 strict-equals v!==1, which silently corrupts v:2 saved state — must be patched to accept v in {1,2,3} with lazy default-merge per version). Lane-load also extends three Tier-1 constants on window.ResearchHub.constants: LOOPBACK_CHIPS (adds engineering chips), PER_TOUCHPOINT_CAP (adds engineering touchpoints), FOOTGUN_KEY_PATTERNS (adds engineering completion-shape patterns — placed at substrate level so other lanes benefit).

---

## 9. Integrity gates table

Every gate listed as STRUCTURAL (array count, FK resolution, substring linkage, set distance, deterministic check) or PROSAIC (character count alone, isPlausibleProse only). All PROSAIC gates from the original proposal have been removed or strengthened per adversarial review.

| Gate | Stage | Type | Notes |
| --- | --- | --- | --- |
| Generic-stakeholder denylist | define | STRUCTURAL | Case-insensitive normalized rejection of generic terms at save-time |
| whyThisStakeholderJustification ≥40c + isPlausibleProse | define | STRUCTURAL+ | Pairs prose check with denylist; cannot pass alone |
| Stakeholder-token-binding (≥1 constraint source='stakeholder' token-binds to stakeholderProfile) | define | STRUCTURAL | Mirrors Scientific's claim-touches-investigation pattern |
| ConstraintRow numeric + whitelisted-unit + SANE_RANGE | define | STRUCTURAL | 'must be colorful' literally cannot save; non-binding thresholds force acknowledgment banner |
| measurabilityAcknowledged after TP1 measurability_probe | define | STRUCTURAL | Closes the silent-TP1-dismissal attack |
| Safety surface (≥1 physical-safety criterion OR ≥60c safetyExemptionJustification) | define | STRUCTURAL+ | Cannot route around the safety conversation |
| ≥3 candidates with pairwise sketchText Jaccard ≤0.6 AND set-distance ≥1 on (satisfied ∪ punted) AND materialsList differs ≥1 entry | develop | STRUCTURAL | Three-way distinctness; vocabulary trick alone insufficient |
| constraintsPunted ≥1 per candidate | develop | STRUCTURAL | Anti-magical-solution at primitive layer |
| Decision matrix full + reasonText ≥12c + within-candidate and within-criterion reasonText Jaccard ≤0.7 | develop | STRUCTURAL+ | Length floor plus distinctness; 12c alone removed |
| TradeOffDeclaration contains 2 distinct criterion substrings | plan | STRUCTURAL | Two-axis structural shape, not just length |
| tradeOffLedger whoseInterestThisServes ≥10c AND ≠ stakeholderProfile.name | plan | STRUCTURAL | Named beneficiary cannot be the stakeholder you're already designing for |
| dominatedPickJustification ≥40c with criterion substring-link | plan | STRUCTURAL+ | Closes the Pareto-banner-as-click-through leak |
| testProtocol covers every criterion + procedureText ≥30c isPlausibleProse | plan | STRUCTURAL+ | Coverage check is structural; prose check is supplementary |
| Conditional access-gate: accessNote='direct' → stakeholderFeedback ≥40c required | build | STRUCTURAL | Closes the proxy-as-default escape hatch |
| Conditional access-gate: accessNote='imagined_with_research' → sources.length ≥1 + stakeholderEvidence kind='quoted' disallowed | build | STRUCTURAL | Makes the honest field actually honest |
| Tier-downgrades on existing hard constraints LOCKED post-build | build | STRUCTURAL | Closes constraint-fitting fallacy loop-back attack |
| failureLog.fromTestRunId points to passed===false testRun | optimize | STRUCTURAL | Cannot fabricate failure |
| changedVariable.fromValue !== toValue | optimize | STRUCTURAL | Cannot fake the variable |
| Retest-delta gate (>5% relative change OR sign flip) | optimize | STRUCTURAL | Cannot retest with identical measurement |
| predictionVsRealityRadio set | optimize | STRUCTURAL | Forces reconciliation |
| causeHypothesis tokenJaccard ≤0.5 with whatThisVersionTests | optimize | STRUCTURAL | Cause cannot restate the test |
| designRationale triple-anchor: ≥1 criterion + ≥1 constraint NAME + ≥1 constraint TARGET+UNIT + tradeOffDeclaration + ≥1 failureLog | communicate | STRUCTURAL | Five-way substring check (judge fix: NAME + TARGET+UNIT, not just name) |
| stakeholderAccountabilityStatement ≥120c three-way anchor (stakeholder + designClaim + prototype-not-tested) | communicate | STRUCTURAL+ | 120c floor is necessary; three-way token anchor is sufficient |
| designClaims triple-token-anchor (criterion/constraint + testRun + stakeholder) | communicate | STRUCTURAL | Mirrors Scientific's claim-touches-investigation, extended |
| epistemicStatus carry-through (invented/curriculum_prompt removes 'fit_for_stakeholder' from label enum) | communicate | STRUCTURAL | Cannot launder curriculum prompt as user research |
| Safety override (unmet safety constraint forces non-'fit_for_stakeholder' label) | communicate | STRUCTURAL | Stakeholder voice cannot outrank physical-harm |
| Export soft-block: stale + untested-hard + safety must all clear | communicate | STRUCTURAL | Three independent acknowledgment gates |
| ExemplarGate on every stage AI button | all | STRUCTURAL | Inherited from Tier 1 / Scientific lane |
| LoopBackPicker whyChipId required for backward navigation | all | STRUCTURAL | Inherited; engineering chips added |

Adversarial review's identified PROSAIC gates from the original ngss-engineering proposal that have been REMOVED or STRENGTHENED in this synthesis: (a) sub-Pareto-dominated banner acknowledged-by-click — now requires dominatedPickJustification ≥40c with substring-link; (b) numeric-without-binding-threshold — now requires SANE_RANGE check at ConstraintRow + TP1 measurability acknowledgment; (c) 'mentions a non-selected concept by id' — now requires ≥2 non-selected ids AND tokenJaccard ≥0.25 with non-selected concept oneLineDescription; (d) trivial-changedVariable + identical retest-measurement — now requires retest-delta gate; (e) 'untested' escape-hatch at test stage — now coverage-capped (≥50% tested, ≥75% if accessNote='direct'); (f) stakeholderAccountabilityStatement as pure length — now three-way token anchor; (g) testOutcome marked-untested-for-all path — closed by coverage gate; (h) generic 'I picked dc1 because better' selectionRationale — now requires 2+ ids and tokenJaccard with non-selected concept descriptions.

---

## 10. Anticipated failure modes and mitigations

**Failure mode: students treat the decision matrix as a numbers ritual.** Mitigation: TP2 dominated_solution_finder asks pareto_probe_questions tied to verbatim reasonText of the selected candidate; plan_test gate requires tradeOffDeclaration with 2 distinct criterion substrings; if selected candidate is Pareto-dominated per deterministic check, yellow banner requires dominatedPickJustification ≥40c with criterion substring-link before advance.

**Failure mode: quantified constraints get gamed (≤$1B).** Mitigation: SANE_RANGE registry at ConstraintRow refuses over-range thresholds with yellow 'is this binding?' banner that must be acknowledged before save; TP1 measurability_probe_questions if fired on a constraint that stays unchanged require measurabilityAcknowledged ≥30c naming why threshold is kept; source enum forces categorization where implausible thresholds are structurally obvious; ExemplarPair contrasts non-binding ≤$1B vs binding ≤$5 household materials.

**Failure mode: stakeholder devolves to generic placeholder.** Mitigation: generic-stakeholder denylist rejects at save-time; whyThisStakeholderJustification ≥40c required; ExemplarPair contrasts generic 'students' vs 'fifth-graders in our after-school program who walk home in winter'; TP4 stakeholder_translator at communicate asks how THE NAMED stakeholder would follow up — generic stakeholder yields generic questions which the rationale substring-link gate then surfaces.

**Failure mode: failure-loop becomes performative.** Mitigation: fromTestRunId must point to a real passed===false testRun; changedVariable.fromValue must differ from .toValue; retestRunId must point to a NEW testRun with measurement that moved >5% relative or flipped sign; predictionVsRealityRadio reconciles; causeHypothesis tokenJaccard ≤0.5 with whatThisVersionTests prevents restating the test as the cause.

**Failure mode: AI drifts into proposing the design.** Mitigation: FOOTGUN_KEY_PATTERNS extended at Tier-1 substrate level with engineering completion-shape patterns; every TP outputs ONLY *_questions[] arrays + verbatim ids/quotes; TP2 dominated_candidate_id must verbatim-echo an existing candidateConcepts[].id; TP3 quoted_phrase must be substring of student modeText/causeHypothesisText; no touchpoint has 'improvement' or 'next step' field. TP4 calibration_flag drops 'well-fitted' / 'design-is-sound' / 'ready-to-ship' / 'meets-all-criteria-judgment' from any enum.

**Failure mode: communicate stage becomes a dump of numbers without synthesis.** Mitigation: designRationale ≥160c floor PLUS triple-anchor substring-link to ≥1 criterion + ≥1 constraint NAME + ≥1 constraint TARGET+UNIT + tradeOffDeclaration + ≥1 failureLog; stakeholderAccountabilityStatement ≥120c PLUS three-way token anchor (stakeholder + designClaim + prototype-not-tested); ExemplarPair contrasts 'list of numbers' vs 'rationale that names the trade-off.'

**Failure mode: K-2 students cannot meet the floors.** Mitigation: devLevel-graduated thresholds with k2 picture-pair candidates accepted (sketchText can be 60s voice); k2 candidates ≥2 only (held at ≥3 for 3_5+ per judge fix); k2 problemText ≥30c; k2 designRationale ≥60c; constraints ≥1 quantified for k2 with picture-pair exemplar showing what a unit looks like.

**Failure mode: AI burns through 8/session cap with retries.** Mitigation: PER_TOUCHPOINT_CAP registered at lane load (constraint_excavator:2, dominated_solution_finder:2, failure_mode_critic:2, stakeholder_translator:2, tradeoff_inverter:1); CostMeter visible from first burn; BURST_WINDOW_MS lockout inherited; counter refunded on network/aborted/validator_rejected per Tier-1 wrapper.

**Failure mode: stakeholder voice overrides physics/safety.** Mitigation: structural safety override at communicate — any constraint with source='safety' AND testOutcome.status='not_met' forces ≥1 designClaim with label ∈ {'not_yet','partial'} regardless of stakeholderJudgment. stakeholderAccountabilityStatement gate refuses export if safety constraint is unmet, even with positive stakeholder feedback. DivergenceBoard visualizes the conflict; safety carve-out marked separately so the visual doesn't obscure it.

**Failure mode: parachute ethnography / stakeholder extraction.** Mitigation: accessNote enum forces honest declaration; epistemicStatus carry-through removes 'fit_for_stakeholder' label when status='invented'/'curriculum_prompt'; conditional gates require sources entry when accessNote='imagined_with_research' AND disallow stakeholderEvidence kind='quoted' on that branch; stakeholderAccountabilityStatement asks 'what would they STILL ask me, what would I do next' encoding non-closed relationship.

**Failure mode: rubric checkbox-ism reproduces stage-completion-as-success.** Mitigation: every gate is artifact-shape-based (FK resolution, set distance, substring link, retest delta) not stage-checked-off; two cross-cutting LOOP_REWARDING_EXEMPLARS at lane exit teach that loop-backs are evidence of better engineering, not failure; EducatorPanel at lane entry frames 'this lane is NGSS-true and does NOT use design-thinking empathy maps or HCD personas; stakeholder framing here is constraint-derivation, not empathy ritual.'

**Failure mode: weight gaming after seeing decision-matrix scores.** Mitigation: criteriaWeightLog[] is append-only audit; any weight change AFTER decisionMatrix cells are filled stamps an entry; export visibly marks 'weights changed after scoring' badge so educators can see the LARP signal.

**Failure mode: tradeoff_inverter AI questions get copy-pasted into student ledger entries.** Mitigation: post-AI tradeoffSynthesis ≥80c required after tradeoff_inverter fires; reverse-leak detector rejects synthesis containing >12c 6-grams from AI question text; tradeoff_inverter PER_TOUCHPOINT_CAP=1 (lowest cap because highest harvest-risk); BURST_THRESHOLD applies per-touchpoint for this specific surface.

**Failure mode: lane mirrors Scientific structurally and teaches 'engineering is just science with builds.'** Mitigation: distinct substrate (candidateConcepts, decisionMatrix, testProtocol, buildLog, testRun, failureLog, designClaims, stakeholderProfile, stakeholderFeedback); distinct gates (numeric+unit, FK resolution, retest-delta, triple-anchor); distinct label enums (meets_criteria/partial/not_yet, NOT supported/overreach/still_unknown); distinct TP roles (constraint-surfacing, Pareto-dominance, inversion, failure-mode critique, stakeholder-translation); distinct loop-back chips.

---

## 11. Open questions for Aaron

See open_questions_for_user array. The biggest decisions only you can make: K-2 floor decision (ship graduated or hold to 3_5+); stakeholder denylist scope (hardcoded vs educator-configurable); epistemicStatus consequence severity (yellow flag vs full block); whether tradeoff_inverter ships in V1 or V2; loadJournal migration patch scope (folded into Engineering PR or separate substrate fix first); King Middle pilot lane sequencing.