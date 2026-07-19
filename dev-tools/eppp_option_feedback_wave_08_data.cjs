'use strict';

const revisions = {
  'eppp-b007-assessment-2': {
    expectedAnswerIndex: 2,
    sourceCheck: 'The ETS sources define differential item functioning through conditional response differences between groups matched on the measured ability and distinguish a statistical flag from proof of bias.',
    feedbackDesign: ['overall-item-difficulty', 'pooled-item-discrimination', 'response-format'],
    choices: {
      0: 'Has a low difficulty level across the demographic groups studied',
      2: 'Shows unequal conditional response probabilities across groups matched on the target ability',
    },
    references: [
      'https://www.ets.org/Media/Research/pdf/RM-12-12.pdf',
      'https://doi.org/10.1002/j.2333-8504.1995.tb01668.x',
    ],
    sourceDetails: [
      {
        url: 'https://www.ets.org/Media/Research/pdf/RM-12-12.pdf',
        title: 'Statistical Report of Fall 2009 CBAL Reading Tests',
        organization: 'Educational Testing Service',
        summary: 'This ETS research memorandum reports item statistics and operational differential-item-functioning analyses, including the need for expert review of substantially flagged items.',
        credibility: 'Educational Testing Service is a major nonprofit assessment and measurement-research organization; this technical report documents how its researchers applied DIF procedures to assessment data.',
      },
      {
        url: 'https://doi.org/10.1002/j.2333-8504.1995.tb01668.x',
        title: 'Estimating the Importance of Differential Item Functioning',
        organization: 'ETS Research Report Series',
        summary: 'Rudas and Zwick define DIF through different conditional probabilities of a correct response for demographic groups at the same ability level and evaluate methods for estimating its importance.',
        credibility: 'This DOI identifies an ETS psychometric research report by specialists in categorical analysis and assessment fairness, directly addressing the conditional definition tested by the question.',
      },
    ],
    qualityFlags: ['The item remains a foundation-level definition; a later scenario rewrite could distinguish raw group difficulty differences from conditional DIF after matching.'],
    incorrectFeedback: {
      0: 'Overall easiness concerns item difficulty, not invariance. If equally able members of each group have the same response probability, the item shows no DIF even when nearly everyone answers correctly.',
      1: 'A strong item-total correlation reflects discrimination or consistency in the pooled sample. It can coexist with DIF because conditional comparisons ask whether equally able groups have different response probabilities.',
      3: 'Response format is a design feature, and both selected- and constructed-response items can exhibit or avoid DIF. The diagnosis depends on group-related response differences after matching on the target ability.',
    },
  },
  'eppp-b005-assessment-1': {
    expectedAnswerIndex: 0,
    sourceCheck: 'Flynn directly documented secular cohort gains across nations, while the added primary Norwegian cohort study supports the rationale qualification that the direction has reversed in some settings.',
    feedbackDesign: ['within-person-aging-trajectory', 'practice-or-retest-effect', 'renorming-artifact'],
    choices: {
      1: 'The same individuals gain broad cognitive ability steadily from early through late adulthood',
      2: 'Practice effects raise an individual\'s retest score by roughly one standard deviation',
      3: 'Periodic renorming raised reported scores while raw performance remained unchanged across cohorts',
    },
    references: [
      'https://doi.org/10.1037/0033-2909.101.2.171',
      'https://doi.org/10.1073/pnas.1718793115',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/0033-2909.101.2.171',
        title: 'Massive IQ Gains in 14 Nations: What IQ Tests Really Measure',
        organization: 'Psychological Bulletin, American Psychological Association',
        summary: 'Flynn documents large secular increases in average intelligence-test performance across multiple national cohorts and discusses their implications for score interpretation.',
        credibility: 'This DOI identifies Flynn\'s foundational peer-reviewed synthesis in an APA journal and directly supports the historical population-level phenomenon named in the question.',
      },
      {
        url: 'https://doi.org/10.1073/pnas.1718793115',
        title: 'Flynn Effect and Its Reversal Are Both Environmentally Caused',
        organization: 'Proceedings of the National Academy of Sciences',
        summary: 'This primary Norwegian cohort study documents both positive and negative secular IQ trends and analyzes within-family evidence relevant to environmental explanations.',
        credibility: 'PNAS is a peer-reviewed multidisciplinary journal; this population-register study directly supports the rationale qualification that Flynn-effect trends can weaken or reverse across periods and settings.',
      },
    ],
    qualityFlags: ['Wave 08 replaces three absolute giveaway distractors with plausible aging, retest, and renorming confusions.'],
    incorrectFeedback: {
      1: 'This describes a within-person developmental trajectory across age. The Flynn effect is a between-cohort secular pattern in test performance; it varies by ability and era and does not imply lifelong improvement for each person.',
      2: 'A practice or retest effect is change within one examinee after prior exposure to a test. Flynn compared population cohorts assessed in different eras and neither predicts a fixed retest gain nor defines a one-standard-deviation increase.',
      3: 'Renorming changes how raw performance maps to reported scores and usually recenters the norm group. Flynn\'s finding reflected later cohorts outperforming earlier norms, not a scoring-table artifact with unchanged raw performance.',
    },
  },
  'eppp-b003-biological-2': {
    expectedAnswerIndex: 2,
    sourceCheck: 'The Wise review directly links mesolimbic dopamine and the VTA-to-nucleus-accumbens projection with learned motivational significance, reinforcement, and motivated responding.',
    feedbackDesign: ['mesocortical-executive-pathway', 'nigrostriatal-motor-pathway', 'tuberoinfundibular-endocrine-pathway'],
    choices: {
      0: 'Planning and working memory through prefrontal executive networks',
      1: 'Initiation and scaling of voluntary movement through dorsal-striatal motor circuits',
      3: 'Suppression of pituitary prolactin release through hypothalamic endocrine control',
    },
    qualityFlags: ['Wave 08 replaces unrelated sensory and spinal distractors with three neighboring dopamine pathways.'],
    incorrectFeedback: {
      0: 'Prefrontal planning and working memory are associated more closely with mesocortical dopamine projections from the VTA. The stem instead names the mesolimbic VTA-to-accumbens route and asks for its characteristic function.',
      1: 'Initiating and scaling voluntary movement depend strongly on substantia-nigra dopamine projections to the dorsal striatum. That nigrostriatal motor pathway is distinct from the VTA-to-accumbens projection named here.',
      3: 'Prolactin inhibition is mediated by hypothalamic dopamine reaching the anterior pituitary through the tuberoinfundibular pathway. It does not use the ventral-tegmental and nucleus-accumbens circuit in the stem.',
    },
  },
  'eppp-b004-biological-2': {
    expectedAnswerIndex: 2,
    sourceCheck: 'The replacement systematic review supports tardive dyskinesia as a persistent hyperkinetic syndrome associated primarily with chronic exposure to antipsychotic and other dopamine-receptor-blocking drugs.',
    feedbackDesign: ['ssri-adverse-effects', 'benzodiazepine-effects-and-withdrawal', 'nsaid-toxicities'],
    prompt: 'A patient develops persistent involuntary orofacial and limb movements after taking a medication for several years. Which medication history is most characteristic of tardive dyskinesia?',
    references: ['https://doi.org/10.1177/0706743719828968'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1177/0706743719828968',
        title: 'Treatment Recommendations for Tardive Dyskinesia',
        organization: 'Canadian Journal of Psychiatry',
        summary: 'This systematic review describes tardive dyskinesia as an irregular, stereotyped, or choreiform movement disorder associated with antipsychotic exposure and evaluates treatment recommendations.',
        credibility: 'This valid DOI identifies a peer-reviewed systematic review by an international clinical and movement-disorder team and directly supports the exposure history and syndrome tested by the item.',
      },
    ],
    qualityFlags: ['Wave 08 replaces a malformed, nonresolving JCP DOI with a valid systematic-review DOI.'],
    incorrectFeedback: {
      0: 'Selective serotonin reuptake inhibitors more often produce nausea, activation, or tremor and do not characteristically create chronic dopamine-receptor blockade. Rare movement-related reports do not make this the typical exposure history.',
      1: 'Benzodiazepines enhance GABA-A signaling; intermittent use is associated more with sedation and impaired coordination, while dependence can produce withdrawal symptoms. It does not supply the sustained dopamine antagonism implicated here.',
      3: 'Nonsteroidal anti-inflammatory drugs inhibit cyclooxygenase pathways and are associated chiefly with gastrointestinal, renal, and cardiovascular harms. Brief exposure neither blocks dopamine receptors nor matches this delayed persistent syndrome.',
    },
  },
  'eppp-b002-cognitive-1': {
    expectedAnswerIndex: 1,
    sourceCheck: 'The original Garcia and Koelling experiment supports preferential flavor-illness and audiovisual-shock learning and directly contradicts an equipotentiality account of cue-consequence conditioning.',
    feedbackDesign: ['extinction-procedure', 'equipotentiality-assumption', 'strict-temporal-contiguity'],
    choices: {
      0: 'Rapid extinction when an expected outcome is omitted after acquisition',
      1: 'Biological preparedness shapes conditioning selectivity',
      2: 'General cue salience as the main determinant independent of outcome type',
      3: 'A strict temporal-contiguity requirement that prevents delayed taste-illness learning',
    },
    qualityFlags: ['Wave 08 removes two conspicuous absolute distractors while retaining the adjacent extinction, equipotentiality, and delay misconceptions.'],
    incorrectFeedback: {
      0: 'Extinction is a reduction in a conditioned response after the cue occurs without its expected outcome. This experiment compared which cues acquired associations with illness versus shock; it did not test response loss after outcome omission.',
      2: 'A cue-salience-only account predicts that the same prominent cue should dominate across outcomes. Preference for taste after illness and audiovisual cues after shock shows that associability depended on the cue-consequence relation.',
      3: 'Conditioned taste aversion can develop even when illness follows flavor consumption after a comparatively long interval. That delayed learning contradicts strict contiguity, while the central finding concerns selective cue-outcome compatibility.',
    },
  },
  'eppp-b002-cognitive-2': {
    expectedAnswerIndex: 3,
    sourceCheck: 'The primary cold-water study supports disproportionate influence of the most intense and final moments on retrospective evaluation, along with comparatively weak weighting of total duration.',
    feedbackDesign: ['primacy-and-temporal-integration', 'average-intensity-and-duration', 'event-segmentation'],
    incorrectFeedback: {
      0: 'A beginning-focused judgment would reflect a primacy effect, while weighting total duration would amount to temporal integration. In the cited trials, the ending and worst discomfort shaped later choice despite a longer episode containing more total pain.',
      1: 'An average-intensity account combines experience across many moments, and elapsed-time weighting makes longer episodes count more. Duration neglect instead allowed thirty less-painful ending seconds to improve retrospective preference.',
      2: 'Event segmentation can make boundaries or interruptions important for later recall, but the experiment varied episode length and the quality of its ending, not interruption frequency. Counting breaks cannot explain its evaluation pattern.',
    },
  },
  'eppp-b002-intervention-2': {
    expectedAnswerIndex: 3,
    sourceCheck: 'Rogers\'s original 1957 article explicitly identifies therapist congruence, unconditional positive regard, and empathic understanding among six conditions for constructive personality change.',
    feedbackDesign: ['psychoanalytic-technique', 'behavioral-procedures', 'directive-influence-strategies'],
    incorrectFeedback: {
      0: 'Free association elicits uncensored material, while analytic neutrality and abstinence are traditional stances for managing transference and interpretation. Those belong to psychoanalytic technique, not Rogers\'s therapist relationship conditions.',
      1: 'Graded exposure and response prevention target avoidance and rituals, while skills rehearsal builds behavioral competence. These are active problem-focused procedures selected for particular mechanisms, not therapist attitudes in Rogers\'s theory.',
      2: 'Advice, persuasive challenge, and confrontation are directive influence strategies used when a therapist actively seeks to modify beliefs or behavior. Rogers located the therapeutic contribution in relational attitudes, not therapist-led persuasion.',
    },
  },
  'eppp-b003-intervention-1': {
    expectedAnswerIndex: 1,
    sourceCheck: 'The cited peer-reviewed common-factors review explicitly treats the alliance, empathy, expectations, and other relational or contextual elements as contributors shared across therapy orientations.',
    feedbackDesign: ['cbt-exposure-techniques', 'psychoanalytic-techniques', 'operant-contingency-methods'],
    incorrectFeedback: {
      0: 'This cluster contains cognitive-behavioral methods used to address avoidance, compulsive rituals, or maladaptive predictions. Such procedures target particular maintaining mechanisms rather than occurring broadly across therapy orientations.',
      2: 'This cluster identifies classical psychoanalytic methods for eliciting and interpreting unconscious material, with resistance examined within that treatment model. Those procedures are not broadly shared across diverse therapy orientations.',
      3: 'These are operant methods: contracts specify contingencies, shaping reinforces successive approximations, and token systems provide conditioned reinforcers. Their contingency-management mechanism makes them specific behavioral procedures.',
    },
  },
  'eppp-b003-lifespan-2': {
    expectedAnswerIndex: 3,
    sourceCheck: 'The current WHO fact sheet defines preterm as live birth before 37 completed weeks and distinguishes extremely, very, and moderate-to-late preterm gestational subgroups.',
    feedbackDesign: ['extremely-preterm-threshold', 'very-preterm-threshold', 'nonstandard-thirty-five-week-cutoff'],
    incorrectFeedback: {
      0: 'Fewer than 28 completed weeks identifies WHO\'s extremely preterm subgroup, which is nested within the broader preterm population. That boundary excludes infants born from 28 through 36 completed weeks who still meet the definition.',
      1: 'Thirty-two completed weeks marks the upper boundary of WHO\'s very preterm subgroup rather than preterm birth overall. Infants born from 32 through 36 completed weeks remain in the moderate-to-late preterm subgroup.',
      2: 'WHO does not use 35 completed weeks as the overall preterm cutoff or as one of its three stated subgroup boundaries. Births at both 35 and 36 completed weeks remain within the moderate-to-late preterm category.',
    },
  },
  'eppp-b004-lifespan-1': {
    expectedAnswerIndex: 1,
    sourceCheck: 'The original study supports selective narrowing toward close partners, and the added theory article directly ties emotionally meaningful goals to perceived limited time rather than chronological age alone.',
    feedbackDesign: ['network-expansion', 'future-oriented-information-seeking', 'withdrawal-from-intimacy'],
    choices: {
      2: 'Prioritizing broad information seeking even when it lacks immediate personal meaning',
      3: 'Reducing emotional dependence by disengaging from close partners',
    },
    references: [
      'https://doi.org/10.1037/0882-7974.7.3.331',
      'https://doi.org/10.1037/0003-066X.54.3.165',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/0882-7974.7.3.331',
        title: 'Social and Emotional Patterns in Adulthood: Support for Socioemotional Selectivity Theory',
        organization: 'Psychology and Aging, American Psychological Association',
        summary: 'This primary study examines age-related differences in social networks and supports selective concentration on emotionally close relationships rather than indiscriminate social withdrawal.',
        credibility: 'This DOI identifies a peer-reviewed primary study in an APA journal by the theory\'s developer and directly supports the social-network pattern addressed by the question.',
      },
      {
        url: 'https://doi.org/10.1037/0003-066X.54.3.165',
        title: 'Taking Time Seriously: A Theory of Socioemotional Selectivity',
        organization: 'American Psychologist, American Psychological Association',
        summary: 'Carstensen, Isaacowitz, and Charles explain how open-ended time prioritizes knowledge goals whereas limited perceived time increases the priority of emotionally meaningful present-focused goals.',
        credibility: 'This DOI identifies the theory\'s authoritative peer-reviewed formulation in the APA\'s flagship journal and directly supports the future-time mechanism specified in the stem.',
      },
    ],
    qualityFlags: ['Wave 08 removes an implausible complete-independence absolute while preserving withdrawal from intimacy as the misconception.'],
    incorrectFeedback: {
      0: 'Network expansion and unfamiliar partners serve exploration, knowledge acquisition, and possible future utility when time feels open-ended. A limited horizon makes breadth less important than investments capable of providing emotional meaning now.',
      2: 'Knowledge acquisition is a future-oriented goal whose benefits often accrue over an extended horizon, so the theory predicts greater priority when time feels open-ended. The constrained horizon changes that motivational weighting.',
      3: 'Social selectivity means concentrating investment in close, emotionally significant partners rather than withdrawing from intimacy. Disengagement would remove the relationships the theory predicts people will value more under a limited horizon.',
    },
  },
  'eppp-b002-professional-1': {
    expectedAnswerIndex: 1,
    sourceCheck: 'The operative APA Ethics Code identifies beneficence and nonmaleficence as General Principle A and separately defines fidelity, integrity, and respect for rights and dignity.',
    feedbackDesign: ['principle-c-integrity', 'principle-e-rights-and-dignity', 'principle-b-fidelity-and-responsibility'],
    choices: {
      0: 'Promote accuracy, honesty, and truthfulness in psychological work',
      2: 'Respect dignity and rights, including privacy, confidentiality, and self-determination',
      3: 'Recognize professional responsibilities to society and the communities psychologists serve',
    },
    qualityFlags: ['Wave 08 replaces three giveaway claims with plausible statements drawn from neighboring APA General Principles.'],
    incorrectFeedback: {
      0: 'Accuracy, honesty, and truthfulness identify General Principle C, Integrity. They apply to avoiding false, misleading, or deceptive professional conduct, whereas the stem asks specifically for Principle A\'s welfare and harm orientation.',
      2: 'Privacy, confidentiality, self-determination, and respect for dignity are central to General Principle E, Respect for People\'s Rights and Dignity. That principle is related to, but distinct from, Principle A\'s benefit-harm focus.',
      3: 'Professional and scientific responsibilities to society and communities align most closely with General Principle B, Fidelity and Responsibility. Principle A is distinguished by striving to benefit people and guard against harm.',
    },
  },
  'eppp-b002-professional-2': {
    expectedAnswerIndex: 3,
    sourceCheck: 'APA Ethics Code Standard 10.01 currently enumerates the nature and anticipated course of therapy, fees, third-party involvement, and limits of confidentiality for informed consent as early as feasible.',
    feedbackDesign: ['useful-but-nonenumerated-intake-information', 'diagnosis-record-access', 'payer-logistics-only'],
    choices: {
      3: 'Its nature, anticipated course, fees, third-party involvement, and limits of confidentiality',
    },
    incorrectFeedback: {
      0: 'Credentials, office procedures, and theoretical orientation may be useful intake disclosures and can be required by a jurisdiction or setting. They are not the disclosure categories Standard 10.01 specifically enumerates for therapy consent.',
      1: 'Diagnosis and prognosis may be discussed during care, while access to records is governed by other standards and applicable law. Standard 10.01 does not define initial therapy consent as delivery of a complete clinical record.',
      2: 'Authorization and utilization limits may require discussion when a payer participates, so this touches one consent area. It substitutes insurer-specific logistics for the standard\'s broader scope and omits treatment course and confidentiality limits.',
    },
  },
  'eppp-b007-research-1': {
    expectedAnswerIndex: 0,
    sourceCheck: 'Campbell and Fiske directly support convergent and discriminant evidence through a multitrait-multimethod pattern; the added different-method wording improves alignment without claiming complete construct validation.',
    feedbackDesign: ['reliability-evidence', 'causal-design-safeguards', 'diagnostic-classification-accuracy'],
    prompt: 'A new anxiety scale correlates strongly with credible anxiety measures that use different measurement methods but weakly with an unrelated physical-height measure. Together, these findings support:',
    qualityFlags: ['Wave 08 adds different-method wording to align the stem more closely with the cited multitrait-multimethod framework.'],
    incorrectFeedback: {
      1: 'Reliability concerns consistency: interrater evidence compares judges, and temporal stability compares occasions. Correlations with other constructs instead test whether the anxiety interpretation fits its theoretically expected pattern.',
      2: 'These are experimental-design safeguards used to support causal inference by balancing groups and limiting alternative explanations. Correlations among measures are observational evidence about score meaning, not evidence of allocation or manipulation control.',
      3: 'Sensitivity and specificity describe classification against an external criterion at a specified threshold and require true- and false-positive counts. These correlations provide neither a cutoff nor diagnostic-accuracy data.',
    },
  },
  'eppp-b008-research-1': {
    expectedAnswerIndex: 0,
    sourceCheck: 'Rosenthal supports the file-drawer problem, while the current Cochrane Handbook directly describes missing evidence selected by result significance, magnitude, or direction and methods to reduce it.',
    feedbackDesign: ['preregistration-mitigation', 'effect-estimate-reporting', 'unpublished-evidence-search'],
    choices: {
      0: 'The chance that a study enters the available literature depends on result direction or statistical significance',
      1: 'Eligible investigations are preregistered before collecting their data',
    },
    references: [
      'https://doi.org/10.1037/0033-2909.86.3.638',
      'https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-13',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/0033-2909.86.3.638',
        title: 'The File Drawer Problem and Tolerance for Null Results',
        organization: 'Psychological Bulletin, American Psychological Association',
        summary: 'Rosenthal\'s seminal article describes how unavailable null-result studies can distort an apparent evidence base and develops a method for evaluating tolerance for missing null results.',
        credibility: 'This DOI identifies the foundational peer-reviewed publication on the file-drawer problem in an APA journal and directly supports the statistical-significance selection mechanism tested.',
      },
      {
        url: 'https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-13',
        title: 'Chapter 13: Assessing Risk of Bias Due to Missing Evidence in a Meta-analysis',
        organization: 'Cochrane Handbook for Systematic Reviews of Interventions',
        summary: 'The chapter explains how selective availability based on a result\'s P value, magnitude, or direction biases syntheses and discusses searching registrations, databases, and unpublished sources.',
        credibility: 'Cochrane is an international evidence-synthesis organization; its current methods handbook is developed by systematic-review experts and is authoritative guidance for identifying missing-evidence bias.',
      },
    ],
    qualityFlags: ['Wave 08 removes an absolute cue from the preregistration distractor and adds current evidence-synthesis guidance.'],
    incorrectFeedback: {
      1: 'Preregistration time-stamps hypotheses and analyses and can reveal unreported work, but registration alone does not ensure publication of null or unfavorable findings. It is a mitigation strategy, not the selective-availability mechanism.',
      2: 'Confidence intervals and standardized effects improve interpretation of studies that are reported. They do not show whether null or unfavorable studies remain unavailable, which is the selection process that distorts a synthesis.',
      3: 'Broad database searching and pursuit of unpublished reports are methods for reducing availability bias. They may remain incomplete, but their purpose is to recover missing evidence rather than create selective availability.',
    },
  },
  'eppp-b004-social-2': {
    expectedAnswerIndex: 2,
    sourceCheck: 'Asch\'s original conformity experiments support the central role of majority unanimity and show that a dissenter can reduce pressure without necessarily endorsing the participant\'s answer.',
    feedbackDesign: ['unanimous-majority', 'response-order', 'majority-size-plateau'],
    choices: {
      0: 'Keeping the confederates unanimous in the same incorrect response',
      2: 'Adding a dissenter whose response differed from the majority',
    },
    rationale: 'A dissenting group member broke the majority\'s unanimity and substantially reduced conformity. The dissenter did not have to give the objectively correct answer or endorse the participant\'s response; breaking consensus itself was important.',
    qualityFlags: ['Wave 08 replaces ally with dissenter so the key does not imply that the nonconforming group member supported the participant.'],
    incorrectFeedback: {
      0: 'Giving the same wrong judgment keeps the majority unanimous, recreating the condition that generated strong pressure in Asch\'s paradigm. It supplies no dissenting group member and therefore does not break consensus.',
      1: 'Speaking after the group exposes the participant to all majority judgments before answering, but changes neither the group\'s agreement nor its size. It alters response order, not the unanimity variable named in the stem.',
      3: 'In Asch\'s variations, conformity rose as a unanimous opposition grew from one to about three people and then largely plateaued. Adding more unanimous confederates preserves consensus rather than introducing dissent.',
    },
  },
  'eppp-b006-social-1': {
    expectedAnswerIndex: 0,
    sourceCheck: 'Zajonc\'s theory and the added direct experiment support audience-related amplification of dominant responses, helping mastered performance while impairing novel or difficult performance.',
    feedbackDesign: ['uniform-improvement', 'reversed-task-interaction', 'explicit-feedback-requirement'],
    choices: {
      1: 'Improve simple and complex performance to a similar degree',
      3: 'Depend primarily on observers providing explicit performance feedback',
    },
    references: [
      'https://doi.org/10.1126/science.149.3681.269',
      'https://doi.org/10.1016/0022-1031(66)90077-1',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1126/science.149.3681.269',
        title: 'Social Facilitation - Science (1965)',
        organization: 'Science',
        summary: 'Zajonc\'s foundational theoretical article explains how the presence of others increases dominant responding, producing facilitation or impairment depending on task mastery.',
        credibility: 'This DOI identifies the foundational peer-reviewed formulation in Science and directly supports the dominant-response account tested by the question.',
      },
      {
        url: 'https://doi.org/10.1016/0022-1031(66)90077-1',
        title: 'Social Facilitation of Dominant and Subordinate Responses',
        organization: 'Journal of Experimental Social Psychology',
        summary: 'Zajonc and Sales experimentally found that an audience increased dominant responses and reduced subordinate responses on a task with previously trained response habits.',
        credibility: 'This DOI identifies the direct peer-reviewed experimental test by the theory\'s authors and provides primary evidence for the task-by-presence interaction described in the item.',
      },
    ],
    qualityFlags: ['Wave 08 replaces a universal-improvement cue and an only-with-feedback cue with more plausible claims.'],
    incorrectFeedback: {
      1: 'Classic social-facilitation theory predicts amplification of the dominant response, not uniform improvement. That response is usually correct for mastered work and often incorrect during complex new work, producing different effects.',
      2: 'This reverses the predicted task-by-presence interaction. Practice makes the correct response dominant, so observers tend to help mastered performance; on novel tasks, dominant errors become more likely and performance deteriorates.',
      3: 'Evaluation apprehension is a related account in which anticipated judgment matters, but Zajonc\'s mere-presence theory does not require coaching. Passive observers or coactors can increase dominant responding without explicit feedback.',
    },
  },
};

const wave07WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1453,
  incorrectOptionsWithWarnings: 4210,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2654,
  choiceRestatementOptions: 1935,
  fullKeyEchoOptions: 1660,
});
const wave08WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1437,
  incorrectOptionsWithWarnings: 4162,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2606,
  choiceRestatementOptions: 1887,
  fullKeyEchoOptions: 1612,
});

module.exports = { revisions, wave07WarningSnapshot, wave08WarningSnapshot };
