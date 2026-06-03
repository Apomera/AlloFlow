# Tier 4 Humanities & Social Research Lane — "Inquiry Studio"

## 1. Overview & Epistemic Distinction

Inquiry Studio is the canonical Tier-4 Humanities & Social Research lane for the AlloFlow Research Hub. It is a six-stage cyclical pipeline (Frame Question → SIFT Triage → Counter-Framings → Warrant Lab → Positionality Reckoning → Genre Composition) that registers as a plugin on `window.ResearchHub.registerLane('humanities', config)`, inheriting the Tier-1 substrate (Inquiry Journal v:4, pre-reserved `sources[].sift` / `positionality` / `claimEvidenceLinks[]` / `evidenceCards[]`), Tier-1 primitives (SuggestionBadge, ExemplarPair, VoiceNoteBlock, CostMeter, DevLevelSelector), and the AI-call wrapper's global 8/session cap.

The lane's load-bearing pedagogical commitment is that humanities work asks a question NEITHER sibling lane asks. Scientific Inquiry (Tier 2, Phenomenon Workbench) asks "what mechanism best explains the phenomenon?" and validates by replication of `modelSnapshots[]`. Engineering Design (Tier 3, Constraint Forge) asks "does this candidate satisfy named criteria for a named stakeholder?" and validates by fitness-under-test of the `constraintMatrix + decisionMatrix + testRun` chain. Inquiry Studio asks: **where does the artifact in front of me come from, who made it for whom, what does my standpoint let me see and force me to miss, and does my position survive a check against independent coverage AND a competing interpretive framing?**

The validators here are NOT truth-convergence or fitness-under-constraint. They are: sourcing rigor (lateral reading per Wineburg/Caulfield/SHEG), warrant transparency (Toulmin's inferential bridge as its own field), positional honesty (versioned snapshots, not a one-line opener — Harding's strong objectivity), responsiveness to counter-framings (warrant-survives/contracts/fails verdicts, never "both-sides" balance), and accountability to a named public (Burawoy's public sociology genres). The artifact is a *position* in a genre — op-ed, policy memo, civic-action statement, or public-exhibit text — that earns STANDING because its underwriting sources have been laterally vetted, its warrant has been pressure-tested, and its blind spots are inscribed in the public-facing artifact via a non-skippable Foreclosure Coda.

## 2. Chosen Lens + Grafts Table

**SPINE: sift-lateral-reading** (avg judge score 8.17, STRONG_PASS on pedagogy). The SIFT-as-load-bearing-substance architecture is the strongest pedagogically-sound foundation: source review IS the substance, with `sift.tier` gating downstream eligibility (uncorroborated sources literally cannot be selected in the warrant builder).

**GRAFTS FROM TOULMIN (7.97):**
- WarrantInspector primitive with live tokenJaccard meter + `WARRANT_MARKERS_RE` inferential-bridge tokens
- `qualifierRevisionLog[]` as append-only per-link history triggered by framingProbe verdicts
- WarrantTrajectoryRibbon at lane exit (horizontal ModelTimeline shape, not card-stack)
- `REBUTTAL_SHAPE_RE` structural form-enforcement
- `stuckSignal` flag gating analog-domain SHAPE-translation behavior INSIDE warrant_questioner
- `ANALOG_DOMAIN_TAXONOMY` curated constant (anti-hallucination parallel to FRAMING_TAXONOMY)
- `framingProbes[]` with verdict enum

**GRAFTS FROM STANDPOINT (7.83):**
- `positionalitySnapshots[]` as append-only versioned timeline (NOT singleton), modeled on `modelSnapshots[]`
- `absentVoices[]` with typed `whyAbsentChip` enum
- Foreclosure Coda at composition stage auto-assembled from three substrate streams with substring-link gate
- Stage 5 Positionality Reckoning as HARD NO-AI stage (structural `aiCallCount` lockout — no `askResearchCoach` binding in ctx)
- `frameKindChip` enum with per-chip curated SEMANTIC_ANCHOR_WHITELIST
- `epistemicStatus` enum {distant, kin, community_member, invited, self_appointed}
- All-survives distribution gate on framingProbes
- foreclosureCodaHash frozen at save for standpoint_mirror integrity

**REQUIRED FIXES BAKED IN** (33 fixes from CONDITIONAL_PASS verdicts) — full table inline in chosen_lens_and_grafts field. Key categories: anti-gaming structural-not-prosaic upgrades on every gate (multi-class substring requirements, polarity checks, content-word floors, host-distinctness over prefix-checks, AND-conjunction heuristics replacing OR-disjunctions, per-genre FLOORS replacing filters, token-binding on ExemplarGate reasoning); anti-AI-laundering structural friction (paste detection logging, anti-prompt-injection guard, echo-prevention via named helper); timing fixes (warrant_questioner BEFORE qualifier/rebuttal; counter_framing_voicer locks out once Stage 4 has any link; source_lateral_probe gated on unvetted tier); helper naming (isPlausibleProse, normalizeForCompare, tokenJaccard, enforceEchoSubstringInvariant explicit in every gate predicate); lane-rotation PER_TOUCHPOINT_CAP resolution; idempotent registration.

## 3. Stages

### Stage 1: frame_question (Frame a Contestable Question — Whose Question Is This?)

**Purpose.** Convert a topic into a question with genuine stakes that a reasonable person could answer differently AND immediately interrogate whose interests the framing privileges. Non-contestable questions make lateral reading pointless. This stage opens the PositionalityCard.

**Student-facing affordances.** Question authoring with anti-definitional regex + stakes-marker exception; three-class contestabilityRationale; closed-enum stakesAudience picker; questionStakeholders (>=2 with Jaccard distinctness); humanitiesPlausibleAnswers (>=3); PositionalityCard first edit with POSITIONALITY_DENYLIST; ExemplarPair with >=40-char token-bound reasoning.

**Structural gate to next.** See stages array.

**Loop-back targets.** None.

**AI touchpoint.** `contestability_probe` (cap 1) — questioner role.

### Stage 2: sift_triage (SIFT Triage + Absent Voices Ledger)

**Purpose.** LOAD-BEARING stage. Each source must pass four SIFT gates before becoming citable evidence. Vertical reading is structurally impossible.

**Student-facing affordances.** SIFTGateRow accordion; STOP firstReactionText; INVESTIGATE with HOST-distinct independentSourceRef + lateralEvidence outside-token check + proper-noun + year + Jaccard whoMadeItFacts + LATERAL_BOILERPLATE_DENYLIST + paste-origin telemetry; FIND with graph-edge to other sources[] (own sift.stop populated, hosts distinct) OR absentVoices entry; TRACE with two-class + year + Jaccard contextualizationNote; separate who_made_this_and_why + what_world_produced_this fields; provenance typed enums; student-assigned tier + tierHistory; AbsentVoicesLedger; LateralReadingRail.

**Structural gate to next.** See stages array.

**Loop-back targets.** frame_question.

**AI touchpoints.** `source_lateral_probe` (cap 2) — critic role; folds in former trace_to_original_questioner output (presentism + original-audience + chain-of-transmission questions) into one source-targeted probe to honor 6-touchpoint schema cap. Gated to fire only when target source.sift.tier === 'unvetted' (Engineering failure_mode_critic-before-retest timing).

### Stage 3: counter_framings (Surface Counter-Framings — Interpretive Lenses, Not Scholars)

**Purpose.** Surface 2-4 UNNAMED framings from curated FRAMING_TAXONOMY. NOT a both-sides ritual — they function as warrant stress tests in Stage 4.

**Student-facing affordances.** FramingPalette + frameKindChip enum + per-chip SEMANTIC_ANCHOR_WHITELIST; Jaccard >=0.45 + span >=2 distinct chips; authoring discipline (>=2 framings before AI fires; Jaccard<0.7 vs prior AI summaries); per-source rereadings with content-word substring.

**Structural gate to next.** See stages array.

**Loop-back targets.** frame_question, sift_triage.

**AI touchpoint.** `counter_framing_voicer` (cap 1) — exemplar role. MOST ADVERSARIAL VALIDATOR in lane: rejects scholar names + quoted text + proper-noun strings off taxonomy whitelist. Locks out once warrant_lab has any link (anti-back-derivation).

### Stage 4: warrant_lab (Author a Toulmin Argument — Warrant Is Its Own Field)

**Purpose.** Build claim-evidence-warrant chain using only laterally-vetted sources. Warrant is its own field with inferential-bridge enforcement. Each link runs framingProbes producing verdicts.

**Student-facing affordances.** WarrantInspector with live tokenJaccard meter + WARRANT_MARKERS_RE OR framing-link + evidence-content-word substring + WARRANT_TAUTOLOGY_DENYLIST + THESIS_PLATITUDE_DENYLIST; cross-source publisher-distinctness; QUALIFIER_MARKERS_RE; REBUTTAL_SHAPE_RE + substring-link to plausibleAnswer (pre) or framings.label (post) + "object that" substantive-token binding; whatThisClaimDoesNotSpeakTo required foreclosure; position labels {defensible_given_evidence, partial_standing, contested_open} only; FramingProbeMatrix with all-survives distribution gate + FRAMING_PROBE_RATIONALE_TEMPLATE_DENYLIST + verbatim-binding to evidenceCard.quotedSnippet; discourse-ethics rationale surfaced; paste-event detection to authorshipLog; stuckSignal affordance.

**Structural gate to next.** See stages array.

**Loop-back targets.** frame_question, sift_triage, counter_framings.

**AI touchpoint.** `warrant_questioner` (cap 3) — critic role. THREE sub-triggers behind one touchpoint cap (to honor 6-touchpoint schema): (A) default fires AFTER warrant authored BUT BEFORE qualifier/rebuttal exist (Engineering precedent); (B) stuckSignal sub-trigger returns analog-domain SHAPE-translation (from ANALOG_DOMAIN_TAXONOMY enum, Jaccard<0.3 vs questionTitle, logs to warrantRevisionLog); (C) all-survives distribution sub-trigger returns per-framing pressure-test questions when framingProbe distribution is all-survives without >=120-char justification.

### Stage 5: positionality_reckoning (Positionality Reckoning — HARD NO-AI STAGE)

**Purpose.** Parallel to Engineering's plan_test/build_test. Student returns to PositionalityCard and re-versions standpoint into positionalitySnapshots[]. AI assistance defeats the pedagogical point.

**Student-facing affordances.** positionalitySnapshots with SPLIT visibilityField + obscuringField + distinct token classes + polarity check; epistemicStatus enum; snapshot count gate (>= upstream-loopBacks toStage∈{1,2,3} + 1); Jaccard>0.55 + >=2 new substrate-linked tokens; POSITIONALITY_OBSCURES_DENYLIST; K-2/3-5 collapse to VoiceNoteBlock; no_ai_notes with structural substring-link to upstream substrate.

**Structural gate to next.** See stages array.

**Loop-back targets.** frame_question, sift_triage, counter_framings, warrant_lab.

**AI touchpoint.** `no_ai_stage_sentinel` (cap 0) — sentinel touchpoint that ALWAYS gates ok:false with reason 'positionality_reckoning is a NO-AI stage by design'. Structurally enforced: ctx.ask is null on this stage; aiCallCount cannot increment from lane.render. Sentinel exists to make refusal auditable in aiHistory.

### Stage 6: genre_composition (Genre-Specific Composition with Foreclosure Coda)

**Purpose.** Compose export artifact in chosen genre with non-skippable Foreclosure Coda assembled from three substrate streams.

**Student-facing affordances.** GenreTemplateSwitch with CONTESTATION_RANGE_CHECK hard-gate per (audience × genre); per-genre length floors + structural sub-fields; SubstrateTraceComposer with AND-conjunction load-bearing heuristic + per-genre minimum FLOORS; bodyClaimTags.length >= claimEvidenceLinks.length; genre-specific substrate-trace required-link rules; ForeclosureCoda auto-assembled from three streams (with hash frozen at save); publicAccountabilityNote substring-links stakesAudience; no_ai_notes substring-links to source + framing + position; standingDisclosure with three threshold-bound attestations; paste-event detection on bodyText; qualifier-relaxation LOCKED in warrant_lab once entered; 2 cross-cutting LOOP_REWARDING_EXEMPLARS with onJudgment + reasoning.

**Structural gate.** Terminal — comprehensive submit-to-export gate.

**Loop-back targets.** All prior stages.

**AI touchpoint.** `standpoint_mirror` (cap 0 default — student unlocks by 'borrow' from source_lateral_probe slot) — mirror role; ECHO-PREVENTION via enforceEchoSubstringInvariant helper (>=12-char substring rejection); anti-prompt-injection guard (no question field contains >=12-char span from bodyText); foreclosureCodaHash integrity check.

## 4. AI Touchpoint Table

See `ai_touchpoints` structured field. Six touchpoints total: contestability_probe, source_lateral_probe (folds trace_to_original_questioner), counter_framing_voicer, warrant_questioner (folds exemplar_translator and framing_probe_facilitator behaviors via sub-trigger branching), no_ai_stage_sentinel, standpoint_mirror. Total budget sums to exactly 8 within humanities lane (1+2+1+3+0+1) — preserves global MAX_AI_CALLS_PER_SESSION cap via lane-rotation that gates engineering caps to 0 when activeLane==='humanities'.

## 5. Inquiry Journal Substrate Used + Extensions

See `substrate_extensions` structured field. Extends pre-reserved `sources[].sift` (specifies opaque shape), `positionality` (retained as singleton edit buffer flushing into new `positionalitySnapshots[]`), `claimEvidenceLinks[]` (adds qualifierRevisionLog + warrantRevisionLog + stuckSignal + answersFramingId). Adds top-level: `framings[]`, `framingProbes[]`, `humanitiesPosition`, `humanitiesPlausibleAnswers[]`, `questionStakeholders[]`, `stakesAudience`, `absentVoices[]`, `positionalitySnapshots[]`, `genreChoice`, `compositions[]`, `authorshipLog[]`. Extends `LOOPBACK_CHIPS`, `PER_TOUCHPOINT_CAP` (lane-rotation), and substrate-level `FOOTGUN_KEY_PATTERNS`. Adds constants registry: `FRAMING_TAXONOMY`, `ANALOG_DOMAIN_TAXONOMY`, multiple regex + denylist constants. Adds named substrate helper `enforceEchoSubstringInvariant`. v:3 → v:4 lazy migration ladder.

## 6. New Primitives

See `new_primitives` structured field: PositionalityCard (persistent header, Engineering StakeholderCard analog), SIFTGateRow, LateralReadingRail, AbsentVoicesLedger, FramingPalette (with per-chip SEMANTIC_ANCHOR_WHITELIST detailed), WarrantInspector, FramingProbeMatrix, SubstrateTraceComposer, GenreTemplateSwitch, ForeclosureCoda, WarrantTrajectoryRibbon, LoopBackPicker (humanities chip taxonomy).

## 7. State Machine

See `state_machine_summary` structured field. Six stages, cyclical loop-back state machine, CycleWheel primary nav (NOT linear stepper), supersededBy-preserves-not-deletes semantics, pendingLoopReturn + returnedToOrigin telemetry, Stage 5 structural no-AI lockout via ctx.ask=null, Stage 6 entry locks qualifier-relaxation in Stage 4 (Engineering tier-lock precedent), idempotent registration with 200ms defer.

## 8. Persistence Keys

See `persistence_keys` structured field. Single STORAGE_KEY (no per-profile namespacing per Tier-1 honest disclosure). All journal substrate fields, constants extensions, helpers registration, and lane registration sentinel.

## 9. Integrity Gates Table

Every gate STRUCTURAL — PROSAIC gates removed per adversarial verdict required-fixes:

| Gate | Stage | Structural mechanism |
|---|---|---|
| Question contestability | 1 | Multi-class substring (stakeholder + contestation + 8-char substring-link) + anti-definitional regex with stakes-marker exception |
| Lateral reading verifiability | 2 | independentSourceRef HOST-distinct (hostname extraction) + lateralEvidence outside-token + whoMadeItFacts proper-noun + year + Jaccard distinctness + LATERAL_BOILERPLATE_DENYLIST + paste-origin telemetry + independent source's OWN sift.stop populated |
| Contextualization | 2 | Two distinct substring classes + year-token + Jaccard<0.55 vs citation |
| Counter-framing distinctness | 3 | Per-chip SEMANTIC_ANCHOR_WHITELIST + Jaccard >=0.45 + span >=2 distinct chips |
| Counter-framing source engagement | 3 | Content-word (>=4c, non-stop-word) substring from source notes (not opaque sourceId) |
| Warrant disjoint from claim | 4 | tokenJaccard(claim, warrant) <0.50 + WARRANT_MARKERS_RE OR framing-link + evidence-content-word substring + WARRANT_TAUTOLOGY_DENYLIST |
| Cross-source corroboration | 4 | evidenceIds reference >=2 distinct sourceIds AND >=2 distinct provenance.publishingOrg |
| Rebuttal not strawman | 4 | REBUTTAL_SHAPE_RE + substring-link to humanitiesPlausibleAnswer (pre) or framings.label (post) + "object that" substantive-token binding + Jaccard <0.6 vs qualifier |
| FramingProbe verdict honesty | 4 | All-survives distribution requires >=120-char justification + FRAMING_PROBE_RATIONALE_TEMPLATE_DENYLIST + substring-binding to evidenceCard.quotedSnippet |
| Positionality not boilerplate | 5 | SPLIT visibilityField + obscuringField + distinct token classes + polarity check + Jaccard >0.55 vs prior + >=2 new substrate-linked tokens + POSITIONALITY_DENYLIST + POSITIONALITY_OBSCURES_DENYLIST |
| Positionality re-versioning on loops | 5 | Snapshot count == (loopBacks toStage∈{1,2,3} count) + 1 |
| No-AI Stage 5 | 5 | ctx has NO askResearchCoach binding; aiCallCount cannot increment from lane.render; no_ai_stage_sentinel always gates ok:false |
| no_ai_notes substantive | 5, 6 | Structural substring-link to specific upstream substrate item, not length-floor |
| Genre/audience compatibility | 6 | CONTESTATION_RANGE_CHECK hard-gate per (stakesAudience × genreChoice) pair — BLOCKS |
| Body substrate-trace | 6 | bodyClaimTags.length >= claimEvidenceLinks.length + per-genre minimum load-bearing-sentence FLOOR + AND-conjunction heuristic |
| Foreclosure Coda completeness | 6 | Substring-contains every absentVoices.whoseVoiceText + latest snapshot.obscuringField + every position.whatThisClaimDoesNotSpeakTo; non-skippable; hash frozen at save |
| standingDisclosure substantive | 6 | Three checkbox attestations each substring-linked to artifact ID above threshold + at least one threshold strictly higher than prior stages |
| ExemplarGate not LARP | All | Reasoning >=40 chars + must contain token from criterion AND token from strongExample |
| Cross-cutting exemplars | Lane exit | ExemplarPair.onJudgment with choice + >=40-char reasoning explaining why 3-loop trajectory shows better inquiry |
| Anti-AI-laundering paste | 4, 6 | Paste-event detection logs to authorshipLog with required acknowledgement + where-from note at devLevel>=9_12 |
| Anti-prompt-injection | 6 | Before standpoint_mirror fires: no question field substring-contains >=12-char span from bodyText |
| AI scholar-name refusal | 3 | Proper-noun multi-word string rejection against FRAMING_TAXONOMY whitelist + FOOTGUN strips at substrate level |
| AI source-summary refusal | 2 | source_lateral_probe cannot accept source URL as input — only student's lateral-reading artifacts |
| Qualifier-relaxation lock | 4, 6 | Once Stage 6 entered, qualifierRevisionLog edits require explicit loop-back (Engineering tier-lock precedent) |
| counter_framing_voicer timing | 3 | Locks out once warrant_lab has any claimEvidenceLinks (prevents back-deriving framings to fit position) |
| source_lateral_probe timing | 2 | Fires only when target source.sift.tier === 'unvetted' (Engineering failure_mode_critic-before-retest) |
| warrant_questioner timing | 4 | Fires BEFORE qualifier/rebuttal exist (shapes authoring instead of rubber-stamping) |

## 10. Anticipated Failure Modes + Mitigations

**Search-engine-as-research.** Stage 2 sift.investigate requires HOST-distinct independentSourceRef + lateralEvidence outside-token + whoMadeItFacts proper-noun + year + Jaccard distinctness + LATERAL_BOILERPLATE_DENYLIST + independent source's OWN sift.stop populated. Failed-SIFT sources preserved append-only as pedagogical record.

**Claim-without-warrant.** WarrantInspector with structural distinctness + WARRANT_MARKERS_RE OR framing-link + evidence-content-word substring + WARRANT_TAUTOLOGY_DENYLIST. FOOTGUN_KEY_PATTERNS at substrate level rejects /^warrant/i / /^suggested[_-]warrant/i / /^proposed[_-]warrant/i.

**Two-sides false balance.** Counter-framings from curated 10-chip FRAMING_TAXONOMY with per-chip SEMANTIC_ANCHOR_WHITELIST + Jaccard distinctness + span >=2 distinct chips. FramingProbes produce verdicts not balance gestures. Distribution gate flags all-survives + requires >=120-char justification. FOOTGUN strips false-balance keys at substrate level.

**Positionality boilerplate.** SPLIT visibilityField + obscuringField with distinct token classes + polarity check + POSITIONALITY_DENYLIST + POSITIONALITY_OBSCURES_DENYLIST + Jaccard >0.55 vs prior + >=2 new substrate-linked tokens + snapshot-count gate requiring re-versioning on every upstream loop. Stage 5 is NO-AI structurally.

**AI-laundering of reading.** FOOTGUN_KEY_PATTERNS substrate-level strips; source_lateral_probe cannot accept source URL; counter_framing_voicer rejects scholar names + quoted text + non-whitelist proper nouns; Stage 5 has NO AI binding; Stage 6 standpoint_mirror has echo-prevention + anti-prompt-injection + Coda hash integrity; paste-event detection on humanitiesPosition/warrant/bodyText logs to authorshipLog with required acknowledgement + where-from note at devLevel>=9_12; SubstrateTraceComposer refuses export below per-genre load-bearing-sentence FLOOR.

**Rubric checkbox-ism.** ExemplarPair (not checklists) at every stage + >=40-char reasoning with token-binding + 2 cross-cutting LOOP_REWARDING_EXEMPLARS at lane exit using ExemplarPair.onJudgment with reasoning. WarrantTrajectoryRibbon at lane exit reads qualifierRevisionLog — educator assessment is "did warrants get narrower under pressure?" not "is final essay polished?"

**Loop-back avoidance.** Loop-back PRESERVES downstream with supersededBy + acknowledgedSuperseded. pendingLoopReturn round-trip pattern. Cross-cutting exemplars explicitly valorize loops. Humanities LOOPBACK_CHIPS name epistemically-honest reasons.

**Genre collapse to essay.** CONTESTATION_RANGE_CHECK hard-gates per (stakesAudience × genreChoice). Four genres have visibly different scaffolds, length bounds, structural sub-fields, required substrate-link rules.

**Verdict LARP (all-survives).** Distribution gate + >=120-char justification + FRAMING_PROBE_RATIONALE_TEMPLATE_DENYLIST + substring-binding to evidenceCard.quotedSnippet. warrant_questioner Sub-trigger C fires on all-survives configurations.

**Search-engine-as-investigate-field (typed URL never visited).** Independent source must have its OWN sift.stop.firstReactionText populated. Paste-origin telemetry. Domain-distinctness check on independent-coverage edges.

## 11. Sample Student Artifacts by Dev-Level

**K-2 (exhibit_text).** Question: "Whose stories about our park should the sign tell?" (voice-recorded). 3 sources (neighborhood photo + park plaque + grandparent oral account, kinds 'community_authored' / 'oral_history'). SIFT recorded as voice notes; whoMadeItFacts as picture+voice. PositionalityCard: picture of student + voice "I am someone who plays at this park." 1 counter-framing (cultural_memory chip via voice). Voice-recorded "because-bridge" warrant. Stage 5 voice + picture re-version. Composition: 90-word exhibit_text with student illustration + source line. Foreclosure Coda (voice): "This sign cannot tell stories from people who never came to the park."

**3-5 (civic_action_statement).** Question: "Whose voices should our class amplify in the school book fair?" 4 sources with full SIFT. PositionalityCard 3-field text + voice. 2 counter-framing chips (lived_experience + cultural_memory) with semantic anchors. humanitiesPosition: "The book fair should feature 4 authors whose families came to America in the past 30 years because our class includes 8 kids whose families also did." 1 claimEvidenceLink with warrant using "depends on" marker. 1 framingProbe with warrant_contracts triggering qualifier revision. Stage 5 re-version. Composition: 280-word civic_action_statement + Foreclosure Coda naming absent voices structurally.

**6-8 (King Middle pilot — op_ed).** Question: "Whose memory of the 2020 protests should be taught in our district next year?" 5 vetted sources (1 primary_document, 2 contemporaneous_account, 1 secondary_analysis, 1 community_authored). tierHistory shows one downgrade from secondary_corroborated to secondary_uncorroborated after Stage 4 loop-back. PositionalityCard three-field + epistemicStatus 'community_member'. 3 counter-framings (structural_economic + cultural_memory + lived_experience). humanitiesPosition: 650-word op_ed; 2 claimEvidenceLinks with WARRANT_MARKERS_RE + framing-link warrants. 6 framingProbes (3 framings × 2 links) with 2 warrant_contracts triggering qualifierRevisionLog entries. positionalitySnapshots: 3 (initial + 2 loop-back re-versions). bodyClaimTags=4 + Foreclosure Coda from 3 substrate streams + signed standingDisclosure.

**9-12 (policy_memo).** Question: "At what cost should the city adopt camera-based enforcement at the 24th & Mission BART entrance?" 7 vetted sources including 2 institutional_record + 1 community_authored + 2 secondary_analysis + 2 contemporaneous_account. PositionalityCard epistemicStatus 'distant'. 4 counter-framings (structural_economic + legal_institutional + lived_experience + technological_infrastructural). humanitiesPosition labeled 'partial_standing'. 3 claimEvidenceLinks with sophisticated qualifierRevisionLog after framingProbe pressure. authorshipLog: 1 acknowledged paste with where-from note. 1050-word policy_memo with problem-options-recommendation + named-affected-parties substring-linked to absentVoices + Foreclosure Coda naming undocumented residents' standpoint as structurally absent + three-attestation standingDisclosure.

**AP / honors (op_ed with historiographical sophistication).** Question: "Whose Reconstruction-era memory does Portland's 2027 social-studies curriculum erase, and what would naming the erasure require us to do?" 9 vetted sources with FRAMING_TAXONOMY_PACKS extension (historical pack). Multiple tier-downgrades in tierHistory. PositionalityCard epistemicStatus 'self_appointed' + epistemic-humility framing. humanitiesPosition labeled 'contested_open'. 4 claimEvidenceLinks with rebuttals substring-linking to specific framingProbes. positionalitySnapshots: 5 (showing scope-contraction trajectory in WarrantTrajectoryRibbon). 850-word op_ed with bodyClaimTags=6 + comprehensive Foreclosure Coda + standingDisclosure substring-anchored to all artifact IDs above threshold + crossCuttingExemplarsViewed judgments explaining why 4 loops produced more defensible standing than a clean walk would have.

## 12. Open Questions for Aaron

See `open_questions_for_user` structured field. Twelve questions: PER_TOUCHPOINT_CAP lane-rotation reversibility; tier sentinel inconsistency; K-2/3-5 scope confirmation; FRAMING_TAXONOMY chip review; ANALOG_DOMAIN_TAXONOMY curation; POSITIONALITY_DENYLIST scope; cross-lane evidenceCards provenance; Stage 6 export format; educator dashboard exposure; King Middle / Lisa Hatch alignment on per-genre word floors; counter-framing prohibition scope for AP students; warrant_questioner cap=3 with sub-trigger branching vs spreading caps thinner across three separate touchpoints (the latter blocked by 6-touchpoint schema limit but worth surfacing the design trade-off).
