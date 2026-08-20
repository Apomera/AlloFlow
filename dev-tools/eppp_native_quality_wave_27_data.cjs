'use strict';

const reviewedAt = '2026-08-20';
const reviewWave = 'eppp-native-quality-wave-27';
const baselineMetrics = Object.freeze({
  distractor: { totalItems: 1500, warningOnly: true, forbiddenAggregateChoices: 0, uniqueKeyStemLexicalLeakageCandidates: 55, asymmetricExtremeDistractorCandidates: 104, advancedDirectRecallCandidates: 4, semanticConceptDuplicatePairs: 70, semanticConceptDuplicateClusters: 43, editorialAnchorsWithActiveWarnings: 1, editorialAnchorsWithNoCurrentWarning: 9, priorityDocketItems: 20 },
  feedback: { totalItems: 1500, totalIncorrectOptions: 4500, itemsWithWarnings: 603, incorrectOptionsWithWarnings: 1701, insufficientDetailOptions: 630, genericTemplateOptions: 1010, choiceRestatementOptions: 415, fullKeyEchoOptions: 251, priorityDocketItems: 100 },
});

const revisions = [
  {
    id: 'eppp-v3-biological-036', expectedAnswerIndex: 1, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: "The pituitary gland is often called the 'master gland' because it:",
    prompt: 'A lesion disrupts anterior pituitary output while the peripheral endocrine glands remain structurally intact. Which downstream pattern is most likely?',
    choices: ['Stable peripheral secretion because endocrine organs regulate independently of central signals', 'Reduced stimulation of several peripheral organs because important trophic hormones are no longer released normally', 'Selective loss of adrenal catecholamines because the posterior pituitary supplies sympathetic innervation', 'Uniform elevation of peripheral hormones because hypothalamic feedback becomes stronger after the lesion'],
    rationale: 'The anterior pituitary releases trophic hormones that regulate several peripheral endocrine glands, including the thyroid, adrenal cortex, and gonads. Disrupted pituitary output can therefore reduce multiple downstream hormonal signals even when those target organs remain structurally intact.',
    feedback: {
      0: 'Peripheral endocrine glands have local regulatory mechanisms, but several depend substantially on hypothalamic-pituitary trophic signaling. Structural integrity does not guarantee normal secretion when that stimulation is lost.',
      2: 'Adrenal catecholamines are released from the adrenal medulla under sympathetic control. The posterior pituitary releases oxytocin and vasopressin rather than supplying sympathetic innervation to the adrenal gland.',
      3: 'Loss of trophic output generally reduces stimulation of target glands. Feedback responses may alter hypothalamic signaling, but they cannot create normal downstream secretion when pituitary transmission is disrupted.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'biological-predict-effects-of-anterior-pituitary-disruption', distractorDesign: ['peripheral-independence-error', 'posterior-pituitary-adrenal-confusion', 'feedback-causes-uniform-elevation'],
  },
  {
    id: 'eppp-v3-biological-047', expectedAnswerIndex: 2, expectedDifficulty: 'advanced', targetDifficulty: 'advanced',
    expectedPrompt: 'Phantom limb pain is BEST explained by:',
    prompt: 'After an arm amputation, touching the patient\'s cheek evokes sensation in the missing hand and painful hand sensations persist despite healed peripheral tissue. Which mechanism best integrates these findings?',
    choices: ['Regeneration of sensory receptors in the missing hand that continue transmitting nociceptive input', 'Conditioned fear that creates a new peripheral nerve pathway from the cheek to the absent limb', 'Reorganization of somatosensory representations so neighboring cortical input activates the former hand region', 'Suppression of thalamic transmission that prevents the cortex from updating the body map after surgery'],
    rationale: 'Following amputation, cortical somatosensory organization can change, and input from a neighboring represented area may recruit cortex formerly associated with the missing limb. This remapping helps explain referred sensations from the cheek and can contribute to persistent phantom experience and pain.',
    feedback: {
      0: 'Receptors in an amputated hand are no longer available to transmit input. Residual-nerve activity can contribute to pain, but it does not explain cheek stimulation being experienced in the missing hand.',
      1: 'Conditioning can influence distress and pain behavior, but it does not create a new peripheral sensory tract connecting the cheek to an absent hand. The referred location points to central representation.',
      3: 'Reduced thalamic transmission would decrease ascending input rather than explain systematic referral from a neighboring body region. The finding is more consistent with altered cortical mapping after deafferentation.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'biological-infer-cortical-remapping-from-phantom-sensation', distractorDesign: ['missing-receptor-regeneration', 'conditioned-new-nerve-pathway', 'thalamic-suppression-account'],
  },
  {
    id: 'eppp-b028-cognitive-3', expectedAnswerIndex: 2, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: 'Token economies apply which learning principle most directly?',
    prompt: 'On an inpatient unit, patients earn points immediately after specified self-care behaviors and exchange accumulated points for preferred activities. Which learning process is central to this program?',
    choices: ['Classical conditioning of involuntary responses through repeated pairing of two antecedent stimuli', 'Negative reinforcement through removing the self-care requirement after points have been earned', 'Operant reinforcement using conditioned reinforcers that can be exchanged for valued outcomes', 'Observational learning through exposure to a model performing the behavior before each opportunity'],
    rationale: 'Points function as conditioned reinforcers because they acquire value through exchange for preferred outcomes. Delivering them contingently after defined behavior applies operant reinforcement; effective programs also specify target behaviors, exchange rules, monitoring, and ethical safeguards.',
    feedback: {
      0: 'Classical conditioning links antecedent stimuli and is commonly used to explain elicited responses. Here, consequences are delivered after defined behavior to change its future frequency, which is operant learning.',
      1: 'Negative reinforcement strengthens behavior by removing an aversive condition. The self-care requirement is not removed; points are added as exchangeable consequences following performance.',
      3: 'Modeling could supplement skills instruction, but no modeled behavior is necessary for the contingency described. The defining procedure is delivery of exchangeable consequences after target behavior.',
    }, cognitiveProcess: 'application', learningObjectiveId: 'cognitive-affective-identify-token-economy-operant-contingency', distractorDesign: ['classical-conditioning-confusion', 'negative-reinforcement-confusion', 'modeling-confusion'],
  },
  {
    id: 'eppp-v3-cognitive-affective-004', expectedAnswerIndex: 1, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: 'Prospective memory involves:',
    prompt: 'A client remembers details from yesterday\'s appointment but repeatedly forgets to take medication when the evening alarm sounds. Which memory process is most specifically impaired?',
    choices: ['Semantic memory for general facts about medications and health routines', 'Prospective memory for carrying out an intended action when the relevant cue occurs', 'Episodic memory for reconstructing the sequence of the previous appointment', 'Procedural memory for executing a well-practiced motor sequence once it begins'],
    rationale: 'Prospective memory supports remembering to carry out a planned action in the future, often when a time- or event-based cue occurs. Remembering the appointment shows retrospective episodic information can be available even when execution of the intended medication action fails.',
    feedback: {
      0: 'Semantic memory stores general knowledge, such as what a medication is for. The client\'s difficulty concerns initiating a planned behavior at the appropriate future cue rather than lacking factual knowledge.',
      2: 'Episodic memory supports recollection of personally experienced events, which appears relatively intact in the vignette. The missed behavior concerns an intention that should be executed later.',
      3: 'Procedural memory supports learned skills and action sequences once activated. The problem occurs before execution: the client does not initiate the intended routine when the alarm cue appears.',
    }, cognitiveProcess: 'application', learningObjectiveId: 'cognitive-affective-distinguish-prospective-from-retrospective-memory', distractorDesign: ['semantic-memory-confusion', 'episodic-memory-confusion', 'procedural-memory-confusion'],
  },
  {
    id: 'eppp-v2-social-cultural-015', expectedAnswerIndex: 1, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'Complete the statement: Job Demands-Resources (JD-R) theory proposes:',
    prompt: 'Hospital staff report high emotional workload and time pressure. One unit also has supervisor support, schedule control, and useful feedback; another lacks these features. What does the Job Demands-Resources model most directly predict?',
    choices: ['Resources remove the physiological cost of heavy workload, so burnout should remain low in both units', 'Demands contribute to strain, while resources foster engagement and can buffer some effects of demands', 'Demands increase engagement whenever employees view the work as socially important', 'Resources affect job satisfaction but are theoretically unrelated to motivation or persistence'],
    rationale: 'The Job Demands-Resources model describes a health-impairment pathway in which sustained demands contribute to exhaustion and a motivational pathway in which resources support engagement. Resources can also buffer some effects of demands, but they do not make high workload harmless.',
    feedback: {
      0: 'Resources can reduce or buffer strain, but they do not erase the energetic and physiological costs of sustained demands. The model permits high demands to remain consequential even in a resource-rich setting.',
      2: 'Meaningful work can support motivation, yet the model does not predict that workload automatically increases engagement. Excessive demands can contribute to exhaustion, especially when adequate resources are absent.',
      3: 'Resources such as autonomy, support, and feedback are central to the model\'s motivational pathway. They can promote engagement, learning, persistence, and goal attainment rather than affecting satisfaction alone.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'social-cultural-apply-jd-r-health-and-motivation-pathways', distractorDesign: ['resources-eliminate-demand-cost', 'demands-automatically-motivate', 'resources-only-affect-satisfaction'],
  },
  {
    id: 'eppp-v2-social-cultural-017', expectedAnswerIndex: 3, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'Complete the statement: Assessment centers are used in selection because:',
    prompt: 'A leadership-selection program uses an in-basket exercise, a group problem, a role-play, and structured ratings from several trained assessors. What is the strongest rationale for this design?',
    choices: ['Each exercise yields a direct measure of a stable trait that is unaffected by situation or assessor judgment', 'Using several exercises establishes criterion validity even when competencies and scoring rules are unspecified', 'Group exercises replace the need for job analysis because realistic appearance establishes relevance', 'Multiple standardized exercises and observations sample job-related competencies across methods and situations'],
    rationale: 'Assessment centers combine multiple standardized exercises, assessors, and observations to evaluate job-related competencies across situations. Their quality depends on job analysis, construct definition, assessor training, scoring reliability, and evidence linking interpretations to intended selection decisions.',
    feedback: {
      0: 'Performance can vary across exercises and raters, which is one reason assessment centers use multiple observations. No single exercise provides a situation-free direct reading of a stable trait.',
      1: 'Multiple methods can broaden sampling, but they do not guarantee validity. Competencies, scoring, reliability, job relevance, and criterion evidence still need to support the intended interpretation.',
      2: 'Realistic appearance alone is not evidence of job relevance. Job analysis is needed to identify competencies and design exercises that represent important demands of the actual role.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'social-cultural-evaluate-assessment-center-multimethod-design', distractorDesign: ['situation-free-trait-measure', 'multimethod-guarantees-validity', 'realism-replaces-job-analysis'],
  },
  {
    id: 'eppp-b024-lifespan-2', expectedAnswerIndex: 3, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: 'Classic disengagement theory proposed that typical aging involves:',
    prompt: 'A historian describes an early theory claiming that later life brings a gradual release of roles and expectations by both individuals and surrounding institutions. Which theory is being described?',
    choices: ['Activity theory, which links well-being to maintaining meaningful roles and participation', 'Continuity theory, which emphasizes preserving characteristic patterns of adaptation over time', 'Socioemotional selectivity theory, which emphasizes prioritizing emotionally meaningful goals as time horizons shrink', 'Disengagement theory, which proposed reciprocal withdrawal between the older person and community structures'],
    rationale: 'Classic disengagement theory proposed a reciprocal, gradual withdrawal between aging individuals and society. It is historically influential but contested; it should be distinguished from activity, continuity, and socioemotional selectivity accounts that make different claims about later-life adaptation.',
    feedback: {
      0: 'Activity theory generally predicts benefits from sustaining meaningful roles and engagement. That claim contrasts with the historical proposal of reciprocal role reduction described in the vignette.',
      1: 'Continuity theory emphasizes maintaining familiar internal and external patterns while adapting to change. It does not define normative aging as mutual withdrawal from social roles.',
      2: 'Socioemotional selectivity theory predicts shifts toward emotionally meaningful goals and relationships as perceived time changes. Selectivity is not equivalent to broad reciprocal disengagement from society.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'lifespan-distinguish-disengagement-from-other-aging-theories', distractorDesign: ['activity-theory-confusion', 'continuity-theory-confusion', 'socioemotional-selectivity-confusion'],
  },
  {
    id: 'eppp-b028-lifespan-1', expectedAnswerIndex: 0, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: "An infant's stranger anxiety is most likely to vary with:",
    prompt: 'An infant approaches an unfamiliar visitor calmly when rested and held by a familiar caregiver but becomes distressed when tired and approached rapidly in an unfamiliar room. Which interpretation is best?',
    choices: ['Wariness reflects an interaction among temperament, current state, setting, adult behavior, and access to security', 'The different responses show that stranger anxiety follows a fixed timetable unaffected by immediate context', 'Calm behavior in one setting rules out an attachment-related response in the unfamiliar room', 'Distress establishes a persistent social disorder because typical wariness should appear consistently across encounters'],
    rationale: 'Stranger wariness varies across infants and situations. Temperament, fatigue, familiarity, the stranger\'s behavior, environmental context, and access to a caregiver can shape the response, so one calm or distressed encounter should not be treated as a fixed developmental or diagnostic conclusion.',
    feedback: {
      1: 'Developmental timing influences stranger wariness, but expression is not context-free. Fatigue, approach style, familiarity, and caregiver presence can change how strongly an infant responds in a particular encounter.',
      2: 'Calm engagement under supportive conditions does not rule out later wariness when conditions change. Attachment behavior and stranger response are organized by context rather than inferred from one observation.',
      3: 'Distress around an unfamiliar person can be developmentally expectable and does not by itself establish a disorder. Diagnosis would require a broader, persistent, impairing pattern assessed across contexts.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'lifespan-interpret-contextual-variation-in-stranger-wariness', distractorDesign: ['fixed-timetable-account', 'single-calm-observation-exclusion', 'single-distress-diagnosis'],
  },
  {
    id: 'eppp-v3-assessment-053', expectedAnswerIndex: 2, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'Test bias exists when:',
    prompt: 'A selection test has similar reliability across two demographic groups, but for the same test score it consistently predicts lower job performance in one group than is actually observed. Which conclusion is most appropriate?',
    choices: ['Equivalent reliability establishes fairness because score precision is the same across groups', 'A mean-score difference proves item bias even before content and prediction evidence are examined', 'Systematic differential prediction raises evidence of predictive bias requiring model and use review', 'The test is unbiased if the overall sample shows a statistically significant score-performance correlation'],
    rationale: 'Predictive bias is present when the relationship between scores and a criterion differs systematically across groups, such as differential intercepts or slopes. Similar reliability or a significant pooled correlation does not resolve that concern; the prediction model, sampling, construct, and consequences require review.',
    feedback: {
      0: 'Reliability concerns score consistency or precision, not whether scores support comparable interpretations and predictions across groups. Equal reliability can coexist with systematic differential prediction.',
      1: 'Mean differences do not by themselves establish item or test bias. Bias evaluation requires evidence about construct representation, item functioning, prediction, administration, opportunity, and intended use.',
      3: 'A pooled correlation can conceal different slopes, intercepts, or errors across groups. Fair prediction must be evaluated at the relevant subgroup level rather than inferred from overall significance.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'assessment-identify-predictive-bias-despite-equal-reliability', distractorDesign: ['reliability-equals-fairness', 'mean-difference-proves-bias', 'pooled-correlation-rules-out-bias'],
  },
  {
    id: 'eppp-b027-assessment-3', expectedAnswerIndex: 2, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: 'Why is it inappropriate to diagnose age-related cognitive decline from one low Wechsler subtest?',
    prompt: 'An older adult earns one low processing-speed subtest score, while other cognitive scores, daily functioning, effort indicators, and longitudinal history are unremarkable. What is the best interpretation?',
    choices: ['The isolated score establishes a neurocognitive disorder because processing speed is age-sensitive', 'The score should be discarded because subtests cannot contribute to cognitive assessment decisions', 'The result is nonspecific and requires the broader profile, validity findings, course evidence, and everyday abilities', 'The normal scores establish absence of decline because impairment must lower the entire battery uniformly'],
    rationale: 'A single low subtest is nonspecific and may reflect normal variability, measurement error, fatigue, sensory or motor factors, education, or a genuine weakness. Neurocognitive conclusions require converging evidence from the broader profile, validity, history, change over time, and everyday functioning.',
    feedback: {
      0: 'Age sensitivity does not make one low score diagnostic. A neurocognitive disorder requires evidence of decline and functional significance considered with validity, history, and alternative explanations.',
      1: 'Subtests can contribute meaningful information when interpreted within a validated framework. The error is treating an isolated result as sufficient, not considering the result at all.',
      3: 'Cognitive conditions can produce selective patterns rather than uniform battery-wide depression. Normal results elsewhere are relevant, but they do not create a rule that decline is impossible.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'assessment-integrate-isolated-low-score-with-converging-evidence', distractorDesign: ['isolated-score-diagnosis', 'discard-subtest-information', 'uniform-impairment-rule'],
  },
  {
    id: 'eppp-v3-intervention-029', expectedAnswerIndex: 3, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'Narrative Therapy frequently utilizes which unique technique to help clients separate their identity from their problems?',
    prompt: 'A client says, “I am a failure.” A therapist asks when “the failure story” is most persuasive, when the client has resisted it, and what preferred identity those exceptions reveal. Which narrative practice is most evident?',
    choices: ['Systematic desensitization through graded exposure to situations associated with the self-judgment', 'Cognitive disputation aimed at proving the statement logically false through evidence review', 'Interpretation of the statement as a disguised expression of an unconscious intrapsychic conflict', 'Externalizing the problem and developing an alternative account from unique outcomes'],
    rationale: 'Narrative therapy separates the person from the problem through externalizing language, then explores unique outcomes that do not fit the dominant problem-saturated story. Those exceptions can support a richer preferred account of identity, values, and agency.',
    feedback: {
      0: 'Graded exposure targets conditioned fear and avoidance through planned contact with feared cues. The therapist here changes the person-problem relationship and examines exceptions rather than constructing an exposure hierarchy.',
      1: 'Evidence review can be part of cognitive therapy, but the dialogue is not organized around correcting a distorted proposition. It externalizes a story and develops identity-relevant alternatives.',
      2: 'Psychodynamic interpretation would explore unconscious meaning, conflict, defenses, or relational patterns. The questions instead locate the problem outside identity and identify occasions when its narrative has less influence.',
    }, cognitiveProcess: 'application', learningObjectiveId: 'intervention-identify-externalization-and-unique-outcomes', distractorDesign: ['exposure-technique-confusion', 'cognitive-disputation-confusion', 'psychodynamic-interpretation-confusion'],
  },
  {
    id: 'eppp-v3-intervention-039', expectedAnswerIndex: 2, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'The therapeutic window for trauma processing refers to:',
    prompt: 'During trauma-focused work, a client alternates between emotional numbing and disorganized panic. The therapist pauses detailed processing and uses grounding until the client can remain engaged with manageable distress. What principle guides this adjustment?',
    choices: ['Trauma memories should be processed at maximal arousal because stronger emotion produces more complete extinction', 'Emotional disengagement is the preferred processing state because distress interferes with memory reconsolidation', 'Processing is most workable in a tolerable arousal range that permits contact while avoiding overwhelm or shutdown', 'Grounding should become the primary intervention whenever autonomic activation appears during a session'],
    rationale: 'The therapeutic window describes a tolerable range of arousal in which a client can remain sufficiently present and regulated to process traumatic material. Overwhelming hyperarousal and disengaged hypoarousal can both interfere, so pacing and regulation help restore workable engagement.',
    feedback: {
      0: 'Very high arousal can impair attention, integration, and a sense of safety rather than improve processing. Trauma-focused work is paced to maintain meaningful engagement instead of maximizing distress.',
      1: 'Numbing or dissociative disengagement can limit access to emotion and memory needed for processing. The aim is regulated contact, not absence of subjective engagement with the material.',
      3: 'Grounding is a regulation tool that can support return to workable processing. It does not create a permanent prohibition on trauma work whenever some autonomic activation occurs.',
    }, cognitiveProcess: 'application', learningObjectiveId: 'intervention-adjust-trauma-processing-to-tolerable-arousal', distractorDesign: ['maximal-arousal-rule', 'disengagement-as-preferred-state', 'grounding-permanently-replaces-processing'],
  },
  {
    id: 'eppp-v3-research-033', expectedAnswerIndex: 1, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'Which research design is most appropriate for studying rare conditions or unique clinical presentations?',
    prompt: 'A clinic has three patients with a rare condition. Investigators repeatedly measure symptoms during baseline and introduce the intervention at different times for each patient. Which design best describes this strategy?',
    choices: ['A cross-sectional survey comparing prevalence estimates from independent population samples', 'A multiple-baseline single-case experiment using staggered treatment onset', 'A posttest group experiment with random assignment to three large treatment conditions', 'A retrospective cohort study defined by archival exposure status and later group outcomes'],
    rationale: 'A multiple-baseline single-case design uses repeated measurement and staggered intervention onset across participants, behaviors, or settings. Replicated changes following each introduction can strengthen causal inference when large-group recruitment is impractical and withdrawal is unsuitable.',
    feedback: {
      0: 'A cross-sectional survey measures variables at one period and is suited to prevalence or association questions. It does not use repeated individual baselines or stagger treatment introduction.',
      2: 'A posttest-only randomized group experiment requires enough participants to form meaningful groups. The described design instead relies on intensive repeated measurement and within-case replication.',
      3: 'A retrospective cohort compares groups defined through past exposure records. The clinic is prospectively staggering an intervention and repeatedly observing each case rather than reconstructing archival group outcomes.',
    }, cognitiveProcess: 'application', learningObjectiveId: 'research-identify-multiple-baseline-single-case-design', distractorDesign: ['cross-sectional-survey', 'large-group-randomized-experiment', 'retrospective-cohort'],
  },
  {
    id: 'eppp-v2-research-035', expectedAnswerIndex: 3, expectedDifficulty: 'intermediate', targetDifficulty: 'intermediate',
    expectedPrompt: 'In a regression analysis, which result best illustrates moderation?',
    prompt: 'A regression predicts burnout from workload, supervisor support, and their product term. The product term is significant: workload is strongly related to burnout when support is low and weakly related when support is high. What does this show?',
    choices: ['Supervisor support mediates the effect because workload first changes support and support then changes burnout', 'Workload and support are interchangeable indicators of one latent construct because both enter the equation', 'Support is a confound because including it makes the workload coefficient statistically significant', 'Supervisor support moderates the workload-burnout relationship because the workload slope differs by support level'],
    rationale: 'Moderation occurs when the strength or direction of a predictor-outcome relationship differs across levels of another variable. The significant workload-by-support product and differing workload slopes show that support is a moderator, not necessarily a mediator or confound.',
    feedback: {
      0: 'Mediation proposes a causal pathway in which the predictor changes an intervening variable that then affects the outcome. The vignette instead reports an interaction with different conditional slopes.',
      1: 'Including two variables in a regression does not establish a common latent construct. The product term tests whether their joint values change the predictor-outcome relationship.',
      2: 'A confound offers an alternative explanation because it is related to exposure and outcome. Statistical significance after adjustment does not define confounding, and the reported result is specifically an interaction.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'research-interpret-regression-interaction-as-moderation', distractorDesign: ['mediation-confusion', 'latent-construct-confusion', 'confounding-confusion'],
  },
  {
    id: 'eppp-b023-professional-2', expectedAnswerIndex: 2, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: 'When providing psychological services to a minor who cannot legally give full informed consent, the psychologist generally should:',
    prompt: 'A parent authorizes therapy for a 14-year-old. Before treatment, the adolescent asks what information may be shared and says they do not understand the proposed approach. What should the psychologist do?',
    choices: ['Rely on parental authorization and omit further explanation because the adolescent lacks legal consent authority', 'Promise the adolescent complete confidentiality so participation will feel voluntary despite reporting duties', 'Explain the service and relevant limits understandably, seek assent when feasible, and confirm permission from the appropriate decision-maker', 'Ask the adolescent to sign as the sole legal decision-maker so the parent no longer receives treatment information'],
    rationale: 'When a minor cannot provide full legal consent, the psychologist generally obtains permission from an authorized person and seeks the minor\'s assent when feasible. The psychologist should provide developmentally understandable information about the service, voluntary participation where applicable, and relevant confidentiality limits.',
    feedback: {
      0: 'Legal authorization does not eliminate the ethical value of involving the adolescent in an understandable discussion. Assent supports participation, respect, and clarification of expectations and limits.',
      1: 'A promise of complete confidentiality is inaccurate when safety, abuse-reporting, court, parental-access, or other legal and clinical limits may apply. Those limits should be explained before participation.',
      3: 'The adolescent\'s involvement is important, but assent does not automatically replace legally required authorization. Who can consent and access information depends on applicable law and circumstances.',
    }, cognitiveProcess: 'application', learningObjectiveId: 'professional-integrate-parental-permission-minor-assent-and-limits', distractorDesign: ['authorization-eliminates-explanation', 'absolute-confidentiality-promise', 'assent-replaces-legal-permission'],
  },
  {
    id: 'eppp-b025-professional-2', expectedAnswerIndex: 2, expectedDifficulty: 'foundation', targetDifficulty: 'intermediate',
    expectedPrompt: 'Which statement about the HIPAA Privacy Rule is most accurate for a covered provider?',
    prompt: 'A covered psychologist receives two requests: a treating clinician asks for relevant history, and a health plan asks for documentation supporting a claim. No psychotherapy notes are involved. Which response best reflects the HIPAA Privacy Rule?',
    choices: ['Obtain a separate authorization for both requests because care and billing fall outside permitted uses', 'Send the complete record to both recipients because each works within the health care system', 'Share pertinent information for care and limit the plan submission to what is reasonably needed for payment', 'Give the plan unrestricted claim access but require the plan to approve communication with the clinician'],
    rationale: 'HIPAA generally permits covered entities to disclose protected health information for treatment and payment subject to the Rule\'s conditions. The minimum-necessary standard generally applies to payment disclosures but not disclosures for treatment, while psychotherapy notes receive additional protection.',
    feedback: {
      0: 'The Privacy Rule permits many care and payment disclosures without a separate authorization, subject to its conditions. Authorization remains necessary for other purposes and specially protected information in relevant circumstances.',
      1: 'Participation in the health care system does not create unrestricted access to a complete record. Purpose, recipient relationship, safeguards, and applicable scope rules still govern each disclosure.',
      3: 'A health plan does not approve ordinary communication between treating professionals, nor does it receive unrestricted access. The psychologist applies the permitted-purpose and scope rules to each request.',
    }, cognitiveProcess: 'analysis', learningObjectiveId: 'professional-apply-hipaa-treatment-payment-permissions', distractorDesign: ['authorization-required-for-tpo', 'health-plan-approval-for-treatment', 'organizational-affiliation-unlimited-access'],
  },
];

module.exports = { baselineMetrics, reviewedAt, reviewWave, revisions };
