'use strict';

const eppp_part_1 = {
  misconceptionFamilies: [
    {
      id: 'eppp-trap-neuroanatomy-pathways-psychopharm',
      label: 'Confusing neuroanatomical lesion syndromes, dopamine pathways, and psychopharmacology toxicities',
      description:
        'EPPP candidates routinely conflate Broca, Wernicke, and conduction aphasias when fluency, comprehension, and repetition dissociate, or mistake right-parietal hemineglect for a primary visual-field cut. They also blur the four central dopamine pathways (nigrostriatal, mesolimbic, mesocortical, and tuberoinfundibular) and confuse serotonergic hyperreflexia/clonus in serotonin syndrome with lead-pipe rigidity in neuroleptic malignant syndrome (NMS), or overlook narrow therapeutic monitoring for lithium, clozapine, and MAOI-tyramine interactions.',
      remediationMove:
        'Anchor every biological vignette to its circuit and receptor mechanism before naming a syndrome or drug action: map fluency/comprehension/repetition for aphasia, tie EPS/tardive dyskinesia to nigrostriatal D2 blockade, positive symptoms to mesolimbic excess, negative/cognitive deficits to mesocortical hypoactivity, and hyperprolactinemia to tuberoinfundibular blockade, and separate neuromuscular clonus (serotonin syndrome) from lead-pipe rigidity with elevated CK (NMS).',
      remediationPlaybookId: 'eppp-remediation-neuroanatomy-pathways-psychopharm',
      itemIds: [
        'eppp-v2-biological-004',
        'eppp-v2-biological-009',
        'eppp-v2-biological-021',
        'eppp-v2-biological-033',
        'eppp-b002-biological-2',
        'eppp-b018-biological-1',
        'eppp-b003-biological-2',
        'eppp-b007-biological-2',
        'eppp-b004-biological-2',
        'eppp-b024-biological-2',
        'eppp-v3-biological-008',
        'eppp-v3-biological-014',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-contingencies-memory-heuristics',
      label: 'Mixing up operant contingencies, memory interference/amnesia types, and cognitive-bias mechanisms',
      description:
        'Test-takers frequently equate negative reinforcement with positive punishment because both involve aversive stimuli, or confuse variable-ratio and variable-interval schedules when predicting response rate and extinction resistance. They also reverse proactive versus retroactive interference, swap anterograde and retrograde amnesia around the time of injury, and misclassify availability (ease of recall) versus representativeness (prototype/base-rate neglect) heuristics.',
      remediationMove:
        'Decompose behavioral and cognitive stems into two independent axes: for operant contingencies, check whether behavior increases (reinforcement) or decreases (punishment) separately from whether a stimulus is added (positive) or removed (negative); for memory, mark the timeline anchor (old blocking new = proactive, new blocking old = retroactive; post-injury encoding failure = anterograde, pre-injury loss = retrograde); and for heuristics, separate retrieval fluency (availability) from similarity-to-stereotype base-rate neglect (representativeness).',
      remediationPlaybookId: 'eppp-remediation-contingencies-memory-heuristics',
      itemIds: [
        'eppp-b028-cognitive-3',
        'eppp-v3-cognitive-affective-027',
        'eppp-v3-cognitive-affective-024',
        'eppp-v2-cognitive-affective-010',
        'eppp-b021-cognitive-2',
        'eppp-v3-cognitive-affective-005',
        'eppp-v2-cognitive-affective-043',
        'eppp-v3-cognitive-affective-029',
        'eppp-b028-cognitive-1',
        'eppp-b001-cognitive-2',
        'eppp-b022-cognitive-3',
        'eppp-b008-cognitive-1',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-attribution-influence-multicultural',
      label: 'Misidentifying attribution biases, social-influence routes, and multicultural clinical formulations',
      description:
        'Candidates often collapse the fundamental attribution error, actor-observer asymmetry, and self-serving bias into a single generic bias, or confuse normative social influence (public compliance for acceptance) with informational influence (private conformity under ambiguity) and central versus peripheral ELM persuasion routes. In multicultural vignettes, learners similarly misread culturally normative expressions of distress through universalized Western etic norms or treat static cultural knowledge as a substitute for ongoing cultural humility and power-aware contextual formulation.',
      remediationMove:
        'Identify the actor, target, and outcome valence before naming an attribution bias (other-only dispositional bias = FAE; self-situational vs other-dispositional = actor-observer; internal success vs external failure = self-serving), separate social approval (normative) from accuracy seeking under uncertainty (informational) and argument scrutiny (central ELM) from surface cues (peripheral ELM), and prioritize emic client-centered inquiry, cultural humility, and contextual formulation over stereotyping.',
      remediationPlaybookId: 'eppp-remediation-attribution-influence-multicultural',
      itemIds: [
        'eppp-b022-social-2',
        'eppp-v3-social-cultural-021',
        'eppp-b024-social-1',
        'eppp-b007-social-1',
        'eppp-migrated-social-1',
        'eppp-v2-social-cultural-018',
        'eppp-v2-social-cultural-044',
        'eppp-v2-social-cultural-012',
        'eppp-v3-social-cultural-014',
        'eppp-b017-social-1',
        'eppp-v2-social-cultural-027',
        'eppp-v2-social-cultural-023',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-development-attachment-cognitive-aging',
      label: 'Conflating developmental milestones, attachment patterns, and normal cognitive aging vs neurocognitive decline',
      description:
        'Exam-takers routinely blend Piagetian stage constructs (object permanence, conservation, centration, adolescent egocentrism) with Vygotskian sociocultural scaffolding in the zone of proximal development, or confuse Erikson psychosocial crises with Marcia identity statuses (foreclosure vs moratorium vs diffusion vs achievement). They also misclassify disorganized attachment (approach-freeze/fear of caregiver) as resistant/ambivalent or avoidant attachment and mistake normal age-related fluid-speed slowing with preserved crystallized knowledge for major neurocognitive disorder.',
      remediationMove:
        'Sort developmental vignettes by theoretical mechanism and behavioral observable: separate child-driven schema shifts (Piaget) from guided fading support (Vygotsky ZPD), cross exploration × commitment for Marcia statuses, score Strange Situation reunion behavior (soothed = secure, indifferent = avoidant, clings then rejects = resistant, freezes/apprehensive = disorganized), and distinguish stable/rising crystallized ability in healthy aging from progressive functional decline in neurocognitive disorder.',
      remediationPlaybookId: 'eppp-remediation-development-attachment-cognitive-aging',
      itemIds: [
        'eppp-b015-lifespan-2',
        'eppp-b018-lifespan-2',
        'eppp-b023-lifespan-1',
        'eppp-b001-lifespan-1',
        'eppp-b002-lifespan-1',
        'eppp-b022-lifespan-2',
        'eppp-b004-lifespan-2',
        'eppp-b028-lifespan-2',
        'eppp-b020-lifespan-1',
        'eppp-b022-lifespan-1',
        'eppp-b023-lifespan-2',
        'eppp-v3-lifespan-047',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-psychometrics-base-rates-differential',
      label: 'Misinterpreting reliability/validity ceilings, base-rate classification metrics, and validity-scale or DSM differential rules',
      description:
        'Candidates frequently infer validity from high internal consistency alone, confuse standard error of measurement (SEM, true-score interval around an observed test score) with standard error of estimate (SEest, uncertainty around a predicted criterion score), or assume high sensitivity and specificity guarantee a high positive predictive value when the disorder base rate is low. In clinical assessment stems, learners also jump from a single elevated MMPI-2 F scale directly to malingering without ruling out acute distress or comprehension error, or blur DSM-5-TR psychotic duration and mood-overlap rules (brief psychotic <1 month, schizophreniform 1–6 months, schizophrenia ≥6 months, schizoaffective ≥2 weeks delusions/hallucinations without mood episode).',
      remediationMove:
        'Enforce psychometric and diagnostic decision gates in order: verify that reliability bounds maximum validity (r_xy ≤ √r_xx) without proving it, match SEM to observed-score precision vs SEest to criterion prediction, compute how low base rates depress PPV despite strong sensitivity/specificity, rule out inconsistent responding/reading barriers/severe distress before attributing F-scale elevation to feigning without convergent PVT/external evidence, and check exact DSM-5-TR symptom duration and mood-episode overlap clocks.',
      remediationPlaybookId: 'eppp-remediation-psychometrics-base-rates-differential',
      itemIds: [
        'eppp-b023-assessment-1',
        'eppp-v2-assessment-078',
        'eppp-b004-assessment-1',
        'eppp-b016-assessment-1',
        'eppp-v2-assessment-026',
        'eppp-v3-assessment-063',
        'eppp-pilot-assessment-1',
        'eppp-b025-assessment-2',
        'eppp-b028-assessment-2',
        'eppp-b026-assessment-3',
        'eppp-b028-assessment-1',
        'eppp-b027-assessment-2',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-mechanism-stage-boundary-mismatch',
      label: 'Mismatching therapeutic mechanism, stage-of-change strategy, or crisis/supervision boundary to clinical presentation',
      description:
        'Test-takers regularly prescribe action-oriented behavioral homework to clients in precontemplation or contemplation instead of motivational interviewing, substitute reassurance or pure cognitive debate when OCD requires exposure and response prevention (ERP) free of safety rituals, or neglect DBT target-hierarchy prioritization when recent suicidal behavior co-occurs with skills deficits. They also confuse Bowenian multigenerational triangulation/differentiation with Minuchin structural enmeshment/boundaries and blur clinical supervision or consultation with personal psychotherapy for the supervisee.',
      remediationMove:
        'Match the intervention to clinical priority, readiness, and theoretical mechanism: triage acute life-threatening risk first (DBT Stage 1 / safety planning), pair precontemplation/contemplation ambivalence with MI rather than action demands, eliminate compulsions and reassurance-seeking safety behaviors during ERP, separate Bowenian emotional differentiation/triangles from Minuchin structural subsystems/boundaries, and keep supervision focused on client welfare and clinical competence rather than turning supervision into therapy.',
      remediationPlaybookId: 'eppp-remediation-mechanism-stage-boundary-mismatch',
      itemIds: [
        'eppp-b009-intervention-2',
        'eppp-v3-intervention-056',
        'eppp-v2-intervention-045',
        'eppp-b021-intervention-1',
        'eppp-pilot-intervention-1',
        'eppp-v3-intervention-070',
        'eppp-b020-intervention-2',
        'eppp-b025-intervention-4',
        'eppp-v2-intervention-023',
        'eppp-v2-intervention-041',
        'eppp-b023-intervention-3',
        'eppp-b022-intervention-3',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-validity-threats-tests-power',
      label: 'Confusing internal/external validity threats, omnibus statistical test selection, and Type I/II error vs power',
      description:
        'EPPP examinees commonly mislabel internal validity threats (history, maturation, regression to the mean, selection, differential attrition) as external validity generalizability problems, or pick repeated pairwise t-tests instead of an omnibus ANOVA, ANCOVA, MANOVA, or chi-square matching the design and variable scales. Learners also invert Type I (alpha, false positive) and Type II (beta, false negative) errors, overlook how alpha, N, and effect size govern statistical power (1 − β), and confuse a mediator (causal mechanism explaining how/why) with a moderator (subgroup condition specifying for whom/when).',
      remediationMove:
        'Run a four-step research-design audit before selecting an answer: (1) distinguish causal rival explanations within the study (internal validity) from sample-to-population generalization (external validity); (2) match variable scale and design structure to the right test (categorical × categorical = chi-square; ≥3 group means = ANOVA; baseline covariate adjustment = ANCOVA; multiple correlated DVs = MANOVA); (3) separate α (false reject), β (false retain), and power = 1 − β (raised by larger N, larger effect size, or higher α); and (4) distinguish mechanism (mediator) from interaction condition (moderator).',
      remediationPlaybookId: 'eppp-remediation-validity-threats-tests-power',
      itemIds: [
        'eppp-b015-research-1',
        'eppp-b015-research-2',
        'eppp-v3-research-001',
        'eppp-v2-research-004',
        'eppp-v2-research-020',
        'eppp-v2-research-002',
        'eppp-v2-research-017',
        'eppp-v3-research-007',
        'eppp-v2-research-024',
        'eppp-v2-research-029',
        'eppp-migrated-research-1',
        'eppp-b001-research-1',
      ],
      occurrenceCount: 12,
    },
    {
      id: 'eppp-trap-ethics-confidentiality-forensic-roles',
      label: 'Conflating APA aspirational principles with enforceable standards, confidentiality exceptions, and forensic role boundaries',
      description:
        'Candidates frequently treat aspirational APA General Principles (such as pro bono service) as sanctionable Ethical Standards, or release confidential records immediately upon receiving an attorney-issued subpoena without client authorization or a judge-signed court order. They also confuse mandatory child-abuse reporting and Tarasoff duty-to-protect thresholds with discretionary disclosure, accept incompatible treating-plus-forensic evaluator dual roles, omit minor assent when a parent signs legal consent, or blur releasable raw test data (Standard 9.04) with protected test materials and test security (Standard 9.11).',
      remediationMove:
        'Apply an Ethics-and-Law hierarchy to every professional scenario: distinguish aspirational General Principles (A–E) from enforceable Standards (1–10), verify legal authority before disclosing PHI (never release on an attorney subpoena alone—contact the client, assert privilege, or seek a protective/court order, and disclose only minimum necessary under a court order), trigger mandatory reporting on reasonable suspicion and duty to protect on serious imminent threat, refuse conflicting treating/forensic dual roles, pair parental consent with minor assent, and separate client-accessible test data (9.04) from proprietary test materials (9.11).',
      remediationPlaybookId: 'eppp-remediation-ethics-confidentiality-forensic-roles',
      itemIds: [
        'eppp-v2-professional-028',
        'eppp-b021-professional-2',
        'eppp-b022-professional-1',
        'eppp-b022-professional-3',
        'eppp-b007-professional-1',
        'eppp-b020-professional-3',
        'eppp-b022-professional-4',
        'eppp-b022-professional-2',
        'eppp-b008-professional-1',
        'eppp-b023-professional-2',
        'eppp-v2-professional-026',
        'eppp-v2-professional-006',
      ],
      occurrenceCount: 12,
    },
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'eppp-remediation-neuroanatomy-pathways-psychopharm',
      familyId: 'eppp-trap-neuroanatomy-pathways-psychopharm',
      familyLabel: 'Confusing neuroanatomical lesion syndromes, dopamine pathways, and psychopharmacology toxicities',
      title: 'Map lesion site, neurotransmitter pathway, and toxicity triad before choosing a biological answer',
      recognitionCue:
        'The chosen option mislabels fluent-but-impaired-repetition aphasia as Broca or Wernicke, assigns EPS/tardive dyskinesia to the mesolimbic tract, confuses serotonin-syndrome clonus with NMS rigidity, or picks the wrong monitoring target for an antipsychotic, lithium, clozapine, or MAOI.',
      repairQuestion:
        'Which exact anatomical structure, dopaminergic/serotonergic pathway, and physical-exam or lab hallmark differentiates the vignette from its closest biological distractor?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Re-read the biological stem and highlight the discriminating clinical triad (speech fluency/comprehension/repetition, focal motor/attentional sign, or autonomic/neuromuscular toxicity findings) that your initial choice overlooked.',
          requiredOutput:
            'Name the exact biological confusion (aphasia dissociation, dopamine pathway swap, serotonin syndrome vs NMS conflation, or drug-monitoring mismatch).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Construct a compact localization-and-receptor map: Broca (left inferior frontal: nonfluent, comprehension intact), Wernicke (left superior temporal: fluent paraphasic, comprehension impaired), Conduction (arcuate fasciculus: fluent, comprehension intact, repetition impaired); Dopamine tracts (nigrostriatal → EPS/TD; mesolimbic → positive psychosis/reward; mesocortical → negative/cognitive; tuberoinfundibular → prolactin); and Toxicity pair (serotonin syndrome = hyperreflexia/clonus/diaphoresis rapid onset vs NMS = lead-pipe rigidity/high fever/elevated CK; lithium = renal/thyroid/narrow serum window; clozapine = ANC/agranulocytosis; MAOI = tyramine hypertensive crisis).',
          requiredOutput:
            'Write the one-line circuit or receptor-mechanism rule that uniquely specifies the correct answer in this stem.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Differentiate two paired clinical vignettes: (1) a stroke patient who speaks fluently and follows commands accurately yet cannot repeat spoken phrases vs a left inferior-frontal stroke patient with halting agrammatic speech; and (2) an SSRI-plus-linezolid patient with agitation, diaphoresis, and inducible ankle clonus vs a haloperidol-treated patient with fever, autonomic instability, and lead-pipe rigidity.',
          requiredOutput:
            'Identify the lesion/pathway and primary diagnosis for all four cases plus the single highest-yield differentiating exam sign in each pair.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Biological Bases item and transfer the pathway check to switching a patient from a high-potency first-generation antipsychotic (EPS risk) to a second-generation antipsychotic (metabolic monitoring) or initiating lithium maintenance.',
          requiredOutput:
            'Select the mechanistically accurate option and justify in one sentence why the closest distractor fails the anatomical or pharmacological hallmark.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-contingencies-memory-heuristics',
      familyId: 'eppp-trap-contingencies-memory-heuristics',
      familyLabel: 'Mixing up operant contingencies, memory interference/amnesia types, and cognitive-bias mechanisms',
      title: 'Split behavior direction, memory timeline, and heuristic cue before naming the cognitive-affective process',
      recognitionCue:
        'The chosen answer labels aversive-stimulus removal that increases behavior as punishment, reverses proactive vs retroactive interference or anterograde vs retrograde amnesia, or attributes base-rate neglect to availability instead of representativeness.',
      repairQuestion:
        'Does the target behavior increase or decrease (and is a stimulus added or removed), which direction does the memory disruption run relative to the learning/injury event, and is the judgment driven by recall ease or prototype resemblance?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Audit the missed Cognitive-Affective stem and pinpoint whether your error came from reading "negative" as "bad/punishing," flipping the chronological arrow of interference or amnesia, or conflating two judgment heuristics.',
          requiredOutput:
            'Identify the exact binary reversal (reinforcement/punishment, positive/negative, proactive/retroactive, anterograde/retrograde, or availability/representativeness).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the three two-axis decision rules: (1) Operant 2×2 — behavior rises = reinforcement, falls = punishment; stimulus added = positive, removed = negative (plus VR = highest steady rate, VI = steady moderate rate resistant to extinction); (2) Memory arrow — old disrupts new = proactive, new disrupts old = retroactive; cannot form new memories after injury = anterograde, loses pre-injury memories = retrograde; (3) Heuristics — judged frequent because vivid examples come easily to mind = availability; judged probable because it fits a stereotype while ignoring base rates = representativeness.',
          requiredOutput:
            'Map the vignette explicitly onto the governing axis and eliminate the opposite pole.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Classify three rapid contrast pairs: (1) fastening a seatbelt to stop a chime vs receiving a speeding ticket; (2) dialing your old phone extension after a clinic upgrade vs forgetting your old number after memorizing a new one; and (3) overestimating shark attacks after news coverage vs judging a quiet bookish person more likely to be a librarian than a salesperson despite base rates.',
          requiredOutput:
            'Label all six examples with the precise operant, interference, or heuristic term and state the deciding cue for each.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Cognitive-Affective item and transfer the timeline-and-axis method to explaining why a post-list distractor eliminates the recency effect (working memory) while leaving primacy (long-term consolidation) intact.',
          requiredOutput:
            'Choose the exact mechanism and confirm in one line both axes (direction of effect and cognitive/behavioral locus).',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-attribution-influence-multicultural',
      familyId: 'eppp-trap-attribution-influence-multicultural',
      familyLabel: 'Misidentifying attribution biases, social-influence routes, and multicultural clinical formulations',
      title: 'Check perspective, influence motive, and cultural context before labeling social-cultural behavior',
      recognitionCue:
        'The chosen option confuses FAE with actor-observer or self-serving bias, mixes normative compliance with informational conformity or central vs peripheral ELM routes, or pathologizes culturally grounded behavior using universalized Western norms.',
      repairQuestion:
        'Who is being judged (self vs other, success vs failure), is the person seeking group approval or accurate information (or scrutinizing arguments vs surface cues), and does the clinical stance reflect emic cultural humility rather than etic assumption?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the Social and Cultural stem and note whether you missed the self-versus-other comparison, the ambiguity vs approval cue in conformity, the motivation/ability trigger in ELM, or an unexamined cultural assumption.',
          requiredOutput:
            'Name the specific social-cognitive or multicultural distinction that was conflated in the initial response.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Anchor the four contrast tables: (1) Attribution — other person dispositional overestimation = FAE; self-situational vs other-dispositional = actor-observer; internal success vs external failure = self-serving; (2) Influence — avoiding rejection with public compliance = normative; resolving ambiguity for accuracy with private acceptance = informational; (3) ELM — high motivation + ability scrutinizing argument quality = central route; fatigue/low involvement relying on attractiveness or credentials = peripheral route; (4) Multicultural care — ongoing cultural humility, power awareness, and emic cultural formulation rather than assuming static mastery or imposing Western etic norms.',
          requiredOutput:
            'State the exact differentiating condition from the stem that selects one mechanism over its closest neighbor.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Contrast two applied vignettes: (1) a clinician attributing her own tardiness to transit delays while calling a colleague careless vs an executive crediting a win to skill and blaming a loss on the market; and (2) an audience evaluating policy evidence closely vs a fatigued audience swayed by speaker warmth, alongside a therapist who pauses to invite a client’s emic meaning of a mourning ritual.',
          requiredOutput:
            'Identify the precise bias, ELM route, and multicultural stance for each vignette in one line apiece.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed Social and Cultural item and transfer the emic-versus-etic lens to designing an assessment or intervention that mitigates stereotype threat and respects acculturation diversity.',
          requiredOutput:
            'Select the verified social-cultural concept and state why the competing distractor misreads perspective, motive, or cultural framing.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-development-attachment-cognitive-aging',
      familyId: 'eppp-trap-development-attachment-cognitive-aging',
      familyLabel: 'Conflating developmental milestones, attachment patterns, and normal cognitive aging vs neurocognitive decline',
      title: 'Anchor developmental items to age-stage mechanism, reunion behavior, and crystallized vs fluid trajectory',
      recognitionCue:
        'The chosen answer confuses Piagetian conservation/egocentrism with Vygotsky ZPD scaffolding, swaps Marcia foreclosure and moratorium, mislabels Strange Situation freezing/apprehension as resistant or avoidant attachment, or treats normal fluid-speed aging as dementia.',
      repairQuestion:
        'Which developmental mechanism is demonstrated (Piagetian schema vs Vygotskian fading support, Marcia exploration × commitment, Strange Situation reunion behavior, or crystallized vs fluid aging)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Re-examine the Lifespan stem and identify whether your error blended two developmental theorists, misread the presence/absence of identity exploration or commitment, missed disorganized reunion cues, or pathologized normal cognitive aging.',
          requiredOutput:
            'State the exact developmental trap (Piaget vs Vygotsky, Erikson vs Marcia status, attachment subtype swap, or normal aging vs neurocognitive disorder).',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the four lifespan anchors: (1) Cognitive development — object permanence (sensorimotor), centration/egocentrism (preoperational), conservation/reversibility (concrete operational), hypothetical-deductive thought/personal fable (formal operational) vs Vygotsky ZPD and scaffolding (gradually faded social support); (2) Identity — Erikson crisis (identity vs role confusion, generativity vs stagnation) vs Marcia 2×2 (diffusion = low E/low C, foreclosure = low E/high C, moratorium = high E/low C, achievement = high E/high C); (3) Attachment — secure (distressed, soothed on reunion), avoidant (minimal distress, ignores return), resistant/ambivalent (clings yet resists comfort), disorganized (contradictory approach-freeze/fear); (4) Aging — crystallized vocabulary/world knowledge stays stable or rises while processing speed/fluid reasoning gradually slows without functional incapacity.',
          requiredOutput:
            'Write the exact theorist-and-criterion match that locks in the correct developmental label for the vignette.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Classify two contrasting pairs: (1) a 19-year-old who adopts parental career values with zero exploration vs a 19-year-old actively testing majors without committing yet; and (2) an infant who approaches a returning caregiver then abruptly freezes in apprehension vs an infant who rushes to the caregiver, pushes away angrily when held, and remains inconsolable.',
          requiredOutput:
            'Assign the exact Marcia status and Ainsworth/Main attachment classification to each case and cite the key behavioral marker.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Retry the missed Growth and Lifespan item and transfer the aging trajectory rule to distinguishing a healthy 74-year-old with intact vocabulary and slightly slower timed puzzle speed from an older adult with progressive functional IADL loss.',
          requiredOutput:
            'Select the accurate lifespan answer and confirm in one line why the neighboring stage, status, or attachment distractor does not fit.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-psychometrics-base-rates-differential',
      familyId: 'eppp-trap-psychometrics-base-rates-differential',
      familyLabel: 'Misinterpreting reliability/validity ceilings, base-rate classification metrics, and validity-scale or DSM differential rules',
      title: 'Verify psychometric ceilings, base-rate predictive value, and convergent differential evidence before concluding',
      recognitionCue:
        'The chosen option treats high Cronbach alpha as proof of validity, confuses SEM with SEest, ignores how a low base rate crushes PPV despite high sensitivity/specificity, leaps from an elevated MMPI-2 F scale directly to malingering, or misses DSM-5-TR psychotic duration/mood timelines.',
      repairQuestion:
        'What exact quantity is being bounded (reliability vs validity, SEM vs SEest, sensitivity/specificity vs base-rate-dependent PPV/NPV), and have alternative explanations and exact DSM-5-TR duration thresholds been ruled out?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the Assessment stem and flag which psychometric or diagnostic shortcut triggered the wrong choice: equating reliability with validity, swapping SEM and SEest, forgetting base-rate effects on PPV, over-calling malingering from a single validity scale, or misapplying DSM duration criteria.',
          requiredOutput:
            'Name the specific psychometric or diagnostic error in the rejected response.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the five assessment rules: (1) Reliability sets an upper mathematical ceiling on validity (r_xy ≤ √r_xx) and is necessary but never sufficient for validity; (2) SEM = SD·√(1 − r_xx) forms a confidence band around an examinee’s observed score for true score, whereas SEest = SD_y·√(1 − r_xy²) forms an error band around a predicted criterion score; (3) Sensitivity (TP/[TP+FN]) and specificity (TN/[TN+FP]) are test properties, whereas PPV and NPV depend heavily on prevalence—under very low base rates, false positives often exceed true positives; (4) Elevated MMPI-2 F requires evaluating inconsistent responding, reading difficulty, and severe psychopathology before inferring feigning with convergent PVT/external data; (5) DSM-5-TR psychotic clocks: brief psychotic (<1 mo), schizophreniform (1–6 mo), schizophrenia (≥6 mo with ≥1 mo active), schizoaffective (≥2 wks delusions/hallucinations without mood episode, mood symptoms present for majority of total illness).',
          requiredOutput:
            'Write the exact psychometric formula/principle or differential rule governing the missed stem.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Work two contrasting assessment problems: (1) a 90%-sensitive, 90%-specific screen applied to 10,000 people with a 1% disorder base rate (compute TP vs FP and impact on PPV); and (2) an acute-crisis examinee with low reading level and elevated MMPI-2 F vs a disability claimant failing two independent PVTs with discrepant observed behavior.',
          requiredOutput:
            'Report exact TP (90) vs FP (990) and low PPV (~8.3%) for Problem 1, and state the defensible clinical interpretation for both profiles in Problem 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Assessment and Diagnosis item and transfer the cutoff/interval logic to predicting how lowering a diagnostic cutoff raises sensitivity while lowering specificity and increasing false positives.',
          requiredOutput:
            'Choose the psychometrically and diagnostically sound answer and verify in one line why the tempting shortcut fails.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-mechanism-stage-boundary-mismatch',
      familyId: 'eppp-trap-mechanism-stage-boundary-mismatch',
      familyLabel: 'Mismatching therapeutic mechanism, stage-of-change strategy, or crisis/supervision boundary to clinical presentation',
      title: 'Align clinical priority, stage of change, and therapeutic mechanism before selecting an intervention',
      recognitionCue:
        'The chosen response assigns action-stage tasks to an ambivalent client instead of MI, uses reassurance or debate in place of ERP without safety behaviors, ignores DBT life-threatening target priority, swaps Bowenian and Minuchin family concepts, or turns supervision into personal therapy.',
      repairQuestion:
        'What is the highest clinical priority right now (acute safety vs skills vs change readiness), which active therapeutic mechanism fits the pathology, and what role boundary governs clinician/supervisor action?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Re-read the Intervention stem and diagnose the mismatch: did you push action-stage tactics during precontemplation/contemplation, permit a neutralizing safety ritual during exposure, misrank suicide risk, confuse two family-systems models, or blur supervision with psychotherapy?',
          requiredOutput:
            'Name the exact treatment-selection or role-boundary mismatch committed on the first attempt.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the clinical alignment hierarchy: (1) Safety/Crisis first — in DBT and acute risk cases, address life-threatening behavior and collaborative safety planning before therapy-interfering or quality-of-life targets; (2) Stage-matched change — use MI (empathic reflection, autonomy, evoking change talk, decisional balance) for precontemplation/contemplation ambivalence, saving structured behavioral action plans for preparation/action; (3) Mechanism fit — OCD requires ERP with elimination of overt compulsions and covert/interpersonal reassurance safety behaviors, whereas distorted core beliefs respond to CBT cognitive restructuring; (4) Family models — Bowen targets multigenerational differentiation of self, genograms, and detriangulation, whereas Minuchin structural therapy reorganizes boundaries (enmeshment vs disengagement), hierarchy, and enactments; (5) Supervision boundary — address supervisee countertransference in supervision as it impacts client care, and refer out for personal psychotherapy rather than treating the supervisee.',
          requiredOutput:
            'State the stage/priority level and exact active mechanism required by the vignette.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Select the precise clinical move for two contrasting vignettes: (1) an OCD client who completes exposure tasks but texts a partner for reassurance immediately afterward; and (2) a DBT client presenting with a recent suicide attempt alongside missed diary-card homework, plus a supervisee whose personal grief is intruding into sessions.',
          requiredOutput:
            'Specify how to eliminate the safety behavior in Case 1, which DBT target takes immediate precedence in Case 2, and how the supervisor maintains the supervision-vs-therapy boundary.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-attempt the missed Treatment and Intervention item and transfer the alignment rule to distinguishing when a family intervention is tracing multigenerational triangles (Bowen) versus reshaping rigid/diffuse parent-child boundaries live in session (Minuchin).',
          requiredOutput:
            'Select the mechanism-aligned intervention and verify in one sentence why the distractor violates clinical priority, stage readiness, or modality fit.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-validity-threats-tests-power',
      familyId: 'eppp-trap-validity-threats-tests-power',
      familyLabel: 'Confusing internal/external validity threats, omnibus statistical test selection, and Type I/II error vs power',
      title: 'Audit validity threat, design-to-test match, and power/error mechanics before answering research items',
      recognitionCue:
        'The chosen option confuses internal validity threats (maturation, selection, attrition, regression) with external validity, picks unadjusted pairwise t-tests over ANOVA/ANCOVA/MANOVA/chi-square, inverts Type I and Type II error or power levers, or mixes up mediation and moderation.',
      repairQuestion:
        'Does the flaw threaten causal inference inside the study or generalization outside it, what are the IV/DV/covariate scales, which error/power probability is changing, and is the third variable a mechanism (mediator) or a subgroup interaction (moderator)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Inspect the Research Methods stem and pinpoint whether your error stemmed from misclassifying an internal vs external validity threat, mismatching variable scales to a statistical test, flipping alpha/beta/power, or conflating mediation with moderation.',
          requiredOutput:
            'Identify the exact methodological or statistical trap in the missed item.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the four research decision keys: (1) Validity — history, maturation, testing, instrumentation, regression to the mean, selection, and differential attrition threaten internal validity (causal claim), whereas unrepresentative samples or artificial lab conditions threaten external validity (generalizability); (2) Test selection — categorical IV × categorical DV = chi-square; ≥3 independent groups on 1 continuous DV = one-way ANOVA (controls familywise α vs multiple t-tests); continuous DV adjusted for baseline covariate = ANCOVA; multiple correlated continuous DVs = MANOVA; same subjects across conditions = repeated-measures ANOVA; (3) Error & Power — Type I (α) = rejecting a true null, Type II (β) = failing to reject a false null, Power (1 − β) rises with larger N, larger effect size, higher α, or lower measurement error; (4) Third variables — mediator explains how/why X affects Y (X → M → Y), whereas moderator changes the strength or direction of X → Y across levels of W (interaction).',
          requiredOutput:
            'Write the exact design-to-threat, design-to-test, or error/power rule that determines the correct choice.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Solve two paired methodological scenarios: (1) comparing posttreatment depression across 4 randomized groups while controlling for baseline severity vs testing whether treatment completion (yes/no) differs across 3 delivery formats; and (2) testing whether improved sleep explains how mindfulness reduces anxiety vs testing whether mindfulness works better for high-anxiety than low-anxiety clients.',
          requiredOutput:
            'Name the exact statistical test for both parts of Scenario 1 (ANCOVA; chi-square) and label mediation vs moderation for Scenario 2.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-solve the missed Research Methods item and transfer the error-rate logic to predicting what happens to Type I error, Type II error, and statistical power when a researcher tightens α from .05 to .005 via Bonferroni correction without increasing N.',
          requiredOutput:
            'Select the methodologically valid answer and verify in one sentence how the design structure rules out the closest statistical distractor.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
    {
      id: 'eppp-remediation-ethics-confidentiality-forensic-roles',
      familyId: 'eppp-trap-ethics-confidentiality-forensic-roles',
      familyLabel: 'Conflating APA aspirational principles with enforceable standards, confidentiality exceptions, and forensic role boundaries',
      title: 'Separate aspirational principles, legal compel authority, and role boundaries before choosing an ethical action',
      recognitionCue:
        'The chosen answer treats an aspirational General Principle as enforceable, releases confidential records on an attorney subpoena without client consent or court order, accepts a treating-plus-forensic dual role, skips minor assent, or confuses raw test data with test security.',
      repairQuestion:
        'Is this an aspirational Principle or an enforceable APA Standard, what legal authority (written consent, mandatory reporting/Tarasoff statute, or judge-signed court order) actually authorizes disclosure, and does the requested role create an objective-versus-advocacy conflict?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction:
            'Audit the Ethical/Legal/Professional stem and flag whether your initial pick treated a General Principle as sanctionable, complied prematurely with a non-judicial subpoena, blurred treating and forensic roles, omitted minor assent, or conflated Standards 9.04 and 9.11.',
          requiredOutput:
            'Identify the exact APA Ethics Code or legal-boundary trap that caused the error.',
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction:
            'Apply the five professional-ethics gates: (1) Structure of APA Code — General Principles A–E (including pro bono aspirations) are aspirational ideals, whereas Ethical Standards 1–10 are enforceable rules; (2) Subpoena vs Court Order — an attorney-issued subpoena alone does NOT waive privilege or authorize release (contact client/counsel, assert privilege, obtain signed ROI or move to quash/protective order), whereas a judge-signed court order compels compliance while still requesting limitation to minimum necessary; (3) Statutory exceptions — reasonable suspicion of child/elder abuse triggers mandatory reporting without waiting for proof, and serious imminent threat to an identifiable victim triggers Tarasoff duty to protect; (4) Forensic role separation — avoid combining treating clinician and neutral forensic/custody evaluator roles for the same individual; (5) Consent/Assent & Testing — obtain legal guardian consent plus developmentally appropriate minor assent and clear confidentiality limits; release raw test data with client authorization unless substantial harm/misuse risk applies (9.04), while safeguarding proprietary test materials and test security (9.11).',
          requiredOutput:
            'Cite the exact ethical gate and first defensible action required by the scenario.',
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction:
            'Determine the exact first step in two high-frequency EPPP traps: (1) receiving a lawyer’s subpoena for psychotherapy records with no signed client release and no judge’s signature vs receiving a judge’s court order demanding the entire clinical chart for a narrow legal issue; and (2) a treating therapist asked by defense counsel to perform an "objective" competency evaluation for the same client.',
          requiredOutput:
            'State the lawful first step for both legal requests and explain why declining the forensic dual role protects both clinical alliance and forensic objectivity.',
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction:
            'Re-answer the missed Ethical, Legal, and Professional Issues item and transfer the Standard 9.04 vs 9.11 boundary to handling a client request for raw test scores versus a public request to publish copyrighted test items.',
          requiredOutput:
            'Select the ethically and legally defensible option and confirm in one line why the distractor violates privilege, role boundaries, or APA Code structure.',
        },
      ],
      status: 'internal-remediation-playbook',
      reviewStatus: 'source-reviewed-editorial-pass',
      releaseEligible: false,
    },
  ],
};

module.exports = {
  eppp_part_1,
};
