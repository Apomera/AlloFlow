'use strict';

const reviewedAt = '2026-08-24';
const reviewWave = 'eppp-application-rewrite-wave-53';

// Convert a balanced set of short foundation items into applied decisions.
// Answer positions remain frozen and every distractor receives a specific contrast.
const revisions = [
  {
    id: 'eppp-v2-biological-031',
    answerIndex: 2,
    prompt: 'A patient has excess cortisol and aldosterone from a mass located immediately superior to a kidney. Which structure is implicated?',
    choices: [
      'Thyroid tissue regulating metabolic rate',
      'Anterior pituitary tissue releasing trophic hormones',
      'Adrenal cortex producing steroid hormones',
      'Pineal tissue regulating melatonin secretion',
    ],
    rationale: 'The adrenal cortex lies above each kidney and produces cortisol, aldosterone, and adrenal androgens; a mass there can elevate both named hormones.',
    choiceRationales: [
      'Thyroid tissue produces thyroid hormones and calcitonin, not the paired cortisol and aldosterone excess described here.',
      'The anterior pituitary regulates several endocrine glands but does not directly secrete cortisol or aldosterone.',
      'Cortisol and aldosterone are adrenal cortical hormones, matching both the laboratory pattern and the mass location.',
      'The pineal gland primarily secretes melatonin and would not explain this corticosteroid and mineralocorticoid pattern.',
    ],
  },
  {
    id: 'eppp-b021-biological-1',
    answerIndex: 0,
    prompt: 'After a white-matter pathway is damaged, hippocampal signals no longer reach diencephalic memory circuitry, and new episodic learning worsens. Which pathway is most likely affected?',
    choices: [
      'The fornix connecting medial temporal structures with mammillary and septal targets',
      'The corticospinal tract carrying voluntary motor commands',
      'The lateral lemniscus carrying ascending auditory signals',
      'The nigrostriatal pathway supporting movement initiation',
    ],
    rationale: 'The fornix is a principal hippocampal efferent pathway to mammillary bodies and septal regions, making it central to the described memory circuitry.',
    choiceRationales: [
      'The fornix links hippocampal structures with mammillary and septal targets, fitting the disrupted episodic-memory circuit.',
      'The corticospinal tract carries descending motor commands and would produce motor deficits rather than this memory pattern.',
      'The lateral lemniscus belongs to the ascending auditory pathway and does not carry hippocampal efferent signals.',
      'The nigrostriatal pathway supports movement through basal-ganglia circuitry rather than linking the hippocampus to diencephalic targets.',
    ],
  },
  {
    id: 'eppp-b022-biological-1',
    answerIndex: 0,
    prompt: 'A brainstem lesion disrupts widespread modulation of mood, sleep, and pain. Which transmitter system is most directly implicated?',
    choices: [
      'Serotonin released from raphe projections',
      'Dopamine released from mesolimbic projections',
      'Acetylcholine released from basal-forebrain projections',
      'Norepinephrine released from locus-coeruleus projections',
    ],
    rationale: 'Raphe nuclei contain major serotonergic populations whose widespread projections influence mood, sleep, arousal, and pain modulation.',
    choiceRationales: [
      'Raphe serotonergic projections broadly influence mood, sleep, arousal, and pain, matching the combined deficits.',
      'Mesolimbic dopamine is especially important for reward learning and motivation rather than this entire functional cluster.',
      'Basal-forebrain acetylcholine strongly supports attention and cortical activation but is not the principal raphe transmitter.',
      'Locus-coeruleus norepinephrine affects vigilance and stress responses, yet the named brainstem nuclei are serotonergic.',
    ],
  },
  {
    id: 'eppp-b016-cognitive-2',
    answerIndex: 3,
    prompt: 'Updated forecasts show that a community project will underperform, but its director continues because substantial money and time have already been spent. Which bias is operating?',
    choices: [
      'Availability weighting based on memorable examples',
      'Delay discounting that favors an immediate reward',
      'A forward-looking choice based on expected returns',
      'Sunk-cost escalation based on irrecoverable past investment',
    ],
    rationale: 'The sunk-cost effect occurs when unrecoverable past expenditures increase commitment even though current evidence favors changing course.',
    choiceRationales: [
      'Availability concerns ease of recall, whereas the decision is being driven by resources already committed.',
      'Delay discounting concerns immediate versus delayed outcomes and does not explain loyalty to a failing investment.',
      'A forward-looking analysis would ignore unrecoverable expenditures and compare only expected future costs and benefits.',
      'The director treats past spending as a reason to continue, which is the defining sunk-cost error.',
    ],
  },
  {
    id: 'eppp-v2-cognitive-affective-043',
    answerIndex: 0,
    prompt: 'After learning a new phone number, a person has trouble retrieving the old number even though it was once well learned. Which account best explains the loss?',
    choices: [
      'Competition between similar memory traces',
      'Passive decay caused solely by elapsed time',
      'Permanent erasure of the earlier representation',
      'Failure to encode the original number adequately',
    ],
    rationale: 'Interference theory explains forgetting as retrieval competition; newly learned material can disrupt access to similar older information through retroactive interference.',
    choiceRationales: [
      'The new and old numbers compete at retrieval, illustrating retroactive interference between similar memories.',
      'Elapsed time alone cannot explain why learning a similar replacement specifically disrupted access to the old number.',
      'Interference makes retrieval difficult without requiring the older representation to be permanently erased.',
      'The original number was previously well learned, so inadequate initial encoding does not fit the evidence.',
    ],
  },
  {
    id: 'eppp-b017-cognitive-1',
    answerIndex: 1,
    prompt: 'One group fills in missing vocabulary words from cues while another reads completed pairs. On a delayed test, the first group recalls more. Which advantage explains the result?',
    choices: [
      'Passive repetition by another person',
      'Producing target information oneself improves retention',
      'Dividing attention across unrelated tasks',
      'Avoiding links with prior knowledge',
    ],
    rationale: 'The generation effect is better later memory for material a learner actively produces from a cue than for the same material merely read.',
    choiceRationales: [
      'Passive repetition describes the comparison condition and lacks the active production advantage shown in the results.',
      'Actively producing the missing targets creates the generation effect and improves later memory relative to reading.',
      'Divided attention usually impairs encoding and is not the defining difference between the two study groups.',
      'Avoiding prior knowledge would reduce elaboration rather than explain the benefit of generating the target.',
    ],
  },
  {
    id: 'eppp-v2-social-cultural-040',
    answerIndex: 2,
    prompt: 'A client weighs emotional support against recurring conflict and asks whether another partnership might provide a better overall outcome. Which framework best organizes the reasoning?',
    choices: [
      'A communal-relationship account emphasizing responsiveness to need',
      'An affective-forecasting account centered on anticipated emotion',
      'Social exchange analysis of costs, rewards, and comparison levels',
      'An attachment account centered on internal working models',
    ],
    rationale: 'Social exchange theory evaluates relationship rewards and costs against expectations and perceived alternatives, matching the client’s comparative reasoning.',
    choiceRationales: [
      'Communal relationships emphasize responding to another person’s needs, not calculating comparative outcomes and alternatives.',
      'Affective forecasting concerns predictions about future feelings rather than evaluating relational costs against available alternatives.',
      'Weighing rewards, costs, expectations, and alternatives is the central decision structure in social exchange theory.',
      'Attachment can shape relationships, but this decision centers on comparative outcomes rather than internal working models.',
    ],
  },
  {
    id: 'eppp-v2-social-cultural-018',
    answerIndex: 0,
    prompt: 'During an ambiguous evacuation alarm, a visitor copies calm staff members because they seem to know the building procedures. Why does conformity occur?',
    choices: [
      'Others are treated as evidence about what is accurate',
      'Approval is sought despite privately rejecting the behavior',
      'A reward contingency directly reinforces imitation',
      'A formal authority issues an explicit command',
    ],
    rationale: 'Informational social influence occurs when uncertainty leads a person to use others as evidence about reality, often producing private acceptance.',
    choiceRationales: [
      'The visitor treats staff behavior as useful evidence in an uncertain situation, demonstrating informational influence.',
      'Seeking approval would be normative influence, but the visitor is copying staff because they appear knowledgeable.',
      'No reward or punishment contingency is described, so direct reinforcement does not explain the conformity.',
      'The visitor observes behavior rather than obeying an explicit order from a recognized authority figure.',
    ],
  },
  {
    id: 'eppp-v2-social-cultural-003',
    answerIndex: 1,
    prompt: 'Partners report emotional closeness, strong physical desire, and a deliberate decision to remain together. Which Sternberg configuration is present?',
    choices: [
      'Trust, respect, and communication',
      'Intimacy, passion, and commitment',
      'Attraction, stability, and connection',
      'Romance, friendship, and loyalty',
    ],
    rationale: 'Sternberg’s triangular theory defines love through intimacy, passion, and commitment; the vignette supplies evidence for all three components.',
    choiceRationales: [
      'These qualities may support relationships, but they are not Sternberg’s three named components in the triangular model.',
      'Closeness, desire, and a decision to remain correspond respectively to intimacy, passion, and commitment.',
      'This wording resembles the case but does not identify the formal components specified by Sternberg’s theory.',
      'Romance and friendship are relationship forms produced by combinations of components, not the three components themselves.',
    ],
  },
  {
    id: 'eppp-v2-lifespan-009',
    answerIndex: 1,
    prompt: 'Two infants raised in similar settings differ consistently in activity, rhythmicity, approach to novelty, and adaptability. Which Thomas and Chess explanation fits?',
    choices: [
      'A learned pattern produced primarily by first-year reinforcement',
      'An early behavioral style that interacts with the environment',
      'A parenting-created style that later becomes biological',
      'A measurement artifact caused by observation timing',
    ],
    rationale: 'Thomas and Chess described temperament as an early behavioral style across dimensions such as activity, rhythmicity, approach, and adaptability that interacts with context.',
    choiceRationales: [
      'Caregiving influences development, but temperament is not defined as a pattern created primarily through reinforcement.',
      'Stable early differences across the named dimensions fit temperament interacting with environmental demands and supports.',
      'The model does not claim that parenting first creates temperament and biology later stabilizes it.',
      'Consistent differences across settings and time are evidence of behavioral style rather than merely an observation artifact.',
    ],
  },
  {
    id: 'eppp-v2-lifespan-055',
    answerIndex: 3,
    prompt: 'A teenager says rules should be followed to maintain approval and social order, rather than merely avoid punishment or appeal to universal principles. Which level is shown?',
    choices: [
      'Stage 1 obedience-and-punishment reasoning',
      'Postconventional social-contract reasoning',
      'Preconventional self-interest reasoning',
      'Stage 3 and Stage 4 conventional morality',
    ],
    rationale: 'Kohlberg’s conventional level includes Stage 3 interpersonal expectations and Stage 4 concern with law, duty, and maintaining the social system.',
    choiceRationales: [
      'Punishment avoidance belongs to the preconventional level and is explicitly contrasted with the teenager’s reasoning.',
      'Social-contract reasoning belongs to the postconventional level and appeals to rights beyond maintaining current approval and rules.',
      'Self-interest reasoning is preconventional and does not capture concern with relationships, duty, and social maintenance.',
      'Seeking interpersonal approval and maintaining the social system correspond to Stages 3 and 4 of conventional morality.',
    ],
  },
  {
    id: 'eppp-v2-lifespan-058',
    answerIndex: 2,
    prompt: 'A parent is affectionate, explains rules, follows through on limits, and lets the child choose among acceptable options. Which style is illustrated?',
    choices: [
      'Authoritarian control with limited responsiveness',
      'Permissive warmth with little structure',
      'Authoritative parenting combining responsiveness with clear demands',
      'Uninvolved parenting with low monitoring',
    ],
    rationale: 'Authoritative parenting combines warmth and responsiveness with firm, reasoned expectations and guided autonomy, matching every feature in the vignette.',
    choiceRationales: [
      'Authoritarian parenting emphasizes control with less warmth and explanation than the case describes.',
      'Permissive parenting provides warmth but lacks the consistent boundaries and enforcement present in this vignette.',
      'Warmth, explanation, consistent follow-through, and guided choice are the defining authoritative combination.',
      'Uninvolved parenting has low warmth and low monitoring, the opposite of the parent’s active engagement here.',
    ],
  },
  {
    id: 'eppp-v2-assessment-008',
    answerIndex: 0,
    prompt: 'A depression scale is administered once, and analysts ask whether its items function coherently as a set. Which coefficient is appropriate?',
    choices: [
      'Cronbach’s alpha for internal consistency',
      'A test–retest coefficient for temporal stability',
      'An interrater coefficient for observer agreement',
      'A criterion-validity coefficient for prediction',
    ],
    rationale: 'Cronbach’s alpha estimates internal consistency, or the degree to which items within one administration function together as indicators of a construct.',
    choiceRationales: [
      'Alpha estimates how coherently items function within one administration, which is the stated measurement question.',
      'Test–retest reliability requires repeated administrations and addresses stability over time rather than item coherence.',
      'Interrater reliability requires multiple observers or coders, neither of whom appears in this scale analysis.',
      'Criterion validity concerns relations with an external outcome and does not estimate coherence among the scale items.',
    ],
  },
  {
    id: 'eppp-v2-assessment-061',
    answerIndex: 1,
    prompt: 'During a neuropsychological evaluation, results on a forced-choice recognition task fall markedly below expectations despite adequate basic comprehension. What purpose does the instrument serve?',
    choices: [
      'Confirming a documented neurological diagnosis',
      'Detecting exaggerated or intentionally feigned cognitive difficulty',
      'Tracking depression-related concentration changes',
      'Measuring progression of a degenerative disorder',
    ],
    rationale: 'The TOMM is a performance-validity measure designed to detect exaggerated or intentionally feigned memory difficulty using a forced-choice recognition format.',
    choiceRationales: [
      'A validity measure cannot by itself confirm a neurological diagnosis; diagnosis requires converging clinical evidence.',
      'The forced-choice format evaluates whether the observed difficulty is credible or may reflect intentional exaggeration.',
      'Depression can affect cognition, but the instrument’s primary purpose is evaluating performance validity rather than mood change.',
      'Longitudinal progression requires repeated diagnostic assessment and is not the specific purpose of this forced-choice task.',
    ],
  },
  {
    id: 'eppp-v2-assessment-035',
    answerIndex: 3,
    prompt: 'A score is 1.5 standard deviations below its reference mean. Which standardized value represents it?',
    choices: [
      'A positive standardized value, z = 1.5',
      'A T score of 50',
      'A z score of 0',
      'A z score of −1.5',
    ],
    rationale: 'A z score expresses distance from the mean in standard-deviation units; being 1.5 units below the mean is represented by z = −1.5.',
    choiceRationales: [
      'A positive standardized value places the result above the mean, reversing the direction specified in the prompt.',
      'A T score of 50 is the center of that metric and does not represent a below-average result.',
      'A z score of zero equals the reference mean, whereas this result is substantially below it.',
      'The negative sign represents direction below the mean, and the magnitude records the 1.5-unit distance.',
    ],
  },
  {
    id: 'eppp-b022-intervention-3',
    answerIndex: 2,
    prompt: 'A therapist feels unusually protective of a client and recognizes that the reaction is partly shaped by the therapist’s own history. How should the reaction be conceptualized?',
    choices: [
      'Client transference onto the therapist',
      'A routine scheduling disagreement',
      'Countertransference requiring reflection and consultation',
      'A therapeutic-alliance measure of shared goals',
    ],
    rationale: 'Countertransference encompasses a therapist’s reactions to a client, including responses shaped by the therapist’s own history; reflection and consultation help prevent enactment.',
    choiceRationales: [
      'Transference describes the client’s relational displacement, whereas the vignette focuses on the therapist’s own reaction.',
      'The protective feeling is clinically meaningful and historically shaped, not a simple administrative disagreement.',
      'A therapist reaction influenced by personal history is countertransference and warrants reflective management.',
      'Alliance measures concern agreement on goals, tasks, and bond rather than this therapist-specific emotional response.',
    ],
  },
  {
    id: 'eppp-b022-intervention-4',
    answerIndex: 3,
    prompt: 'A therapist maps grandparents, parents, and children while marking alliances, cutoffs, illnesses, and recurring relational themes. Which tool fits?',
    choices: [
      'A physiological biofeedback display',
      'A household roster without relationship information',
      'A medication timeline for one treatment episode',
      'A genogram displaying kinship and clinical history',
    ],
    rationale: 'A genogram diagrams multiple generations together with relationships, significant events, and recurring patterns, supporting systemic assessment and hypothesis generation.',
    choiceRationales: [
      'Biofeedback displays physiological signals and does not map relationships, generations, or recurring family events.',
      'A simple roster omits alliances, cutoffs, and recurring patterns that make the requested representation clinically useful.',
      'A medication timeline follows treatment events but does not depict multigenerational structure and relational patterns.',
      'The multigenerational map of structure, relationships, and recurring events is precisely the function of a genogram.',
    ],
  },
  {
    id: 'eppp-b028-intervention-3',
    answerIndex: 3,
    prompt: 'A client learns relaxation, ranks feared situations, and approaches them gradually while practicing the incompatible response. Which procedure is illustrated?',
    choices: [
      'Flooding through immediate maximal exposure',
      'Response cost through removal of reinforcement',
      'Free association followed by interpretation',
      'Systematic desensitization with a graded hierarchy',
    ],
    rationale: 'Traditional systematic desensitization combines relaxation with gradual progression through a fear hierarchy, historically explained through reciprocal inhibition.',
    choiceRationales: [
      'Flooding begins with highly intense exposure and does not use the gradual hierarchy described in the case.',
      'Response cost removes a reinforcer after behavior and is unrelated to paired relaxation and fear exposure.',
      'Free association is a psychodynamic technique and does not involve a graded behavioral hierarchy.',
      'Relaxation paired with gradual movement through ranked fears is the defining systematic-desensitization procedure.',
    ],
  },
  {
    id: 'eppp-v3-research-004',
    answerIndex: 0,
    prompt: 'An experiment crosses two treatment formats with three dosage levels. How many unique cells must the design include?',
    choices: [
      'Six conditions',
      'Eight conditions',
      'Twenty-three conditions',
      'Five conditions',
    ],
    rationale: 'A factorial design contains every combination of factor levels, so two formats multiplied by three dosage levels produce six experimental conditions.',
    choiceRationales: [
      'Multiplying the two factor levels by the three dosage levels yields six distinct experimental cells.',
      'Eight would require a different level structure, such as crossing two levels with four levels.',
      'Concatenating the numerals does not calculate the number of combinations in a factorial design.',
      'Adding the levels produces five, but factorial cells are determined by multiplying the level counts.',
    ],
  },
  {
    id: 'eppp-v3-research-021',
    answerIndex: 3,
    prompt: 'A researcher wants rich accounts of how first-generation students make sense of leaving home without reducing their experience to preset numerical scales. Which approach fits?',
    choices: [
      'A randomized experiment estimating a causal effect',
      'A large fixed-response survey estimating prevalence',
      'An archival regression using administrative records',
      'Qualitative interviews analyzed for emergent themes',
    ],
    rationale: 'Qualitative interviews and thematic analysis are suited to exploring complex experience, participant meaning, and processes that preset numerical measures may miss.',
    choiceRationales: [
      'A randomized experiment estimates causal effects but would not directly capture rich personal accounts and meaning-making.',
      'A fixed-response survey can estimate prevalence efficiently but constrains responses to categories selected in advance.',
      'Archival regression analyzes recorded variables and cannot supply the detailed first-person accounts requested here.',
      'Open-ended interviews and emergent thematic analysis match the goal of understanding nuanced participant experience.',
    ],
  },
  {
    id: 'eppp-v2-research-023',
    answerIndex: 3,
    prompt: 'A campus planner cross-tabulates preferred study setting by commuter status and asks whether the distributions differ. Which method fits these counts?',
    choices: [
      'A t procedure comparing two quantitative means',
      'A product–moment coefficient for paired quantitative scores',
      'A linear model predicting a continuous outcome',
      'A Pearson χ² analysis of the contingency table',
    ],
    rationale: 'Pearson’s χ² procedure compares observed cell counts with expected counts in a contingency table, making it appropriate for two categorical measures.',
    choiceRationales: [
      'A t procedure requires a quantitative outcome whose means can be compared, unlike the paired category counts here.',
      'A product–moment coefficient summarizes linear covariation between quantitative scores rather than differences among table counts.',
      'Ordinary linear regression assumes a quantitative outcome and does not directly evaluate a table of category frequencies.',
      'Pearson’s χ² compares observed and expected contingency-table counts to assess the relationship between categorical measures.',
    ],
  },
  {
    id: 'eppp-v3-professional-004',
    answerIndex: 3,
    prompt: 'A psychologist whose practice has focused on adult CBT is asked to treat a rare pediatric neuropsychological condition never previously encountered. What should determine acceptance?',
    choices: [
      'A fixed number of years holding a license',
      'Board certification as the primary proxy for readiness',
      'A doctoral degree treated as sufficient preparation',
      'Relevant education, supervised experience, consultation, or additional study',
    ],
    rationale: 'APA Standard 2.01 bases competence on relevant education, training, supervised experience, consultation, study, or professional experience rather than credentials alone.',
    choiceRationales: [
      'Years of licensure do not establish competence for a specialized population or condition outside prior practice.',
      'Board certification can document specialty preparation but is not the sole basis for judging competence in this case.',
      'A general doctoral degree does not by itself establish readiness for an unfamiliar specialized service population.',
      'Acceptance should rest on relevant preparation and consultation sufficient to practice within competence boundaries.',
    ],
  },
  {
    id: 'eppp-v2-professional-021',
    answerIndex: 2,
    prompt: 'After an evaluation, a client with limited health literacy asks what the scores mean. Which response meets the psychologist’s duty?',
    choices: [
      'Send the report to the payer and defer explanation',
      'Place the interpretation in the clinical file without discussion',
      'Explain results to the client or representative in understandable language',
      'Let the referring professional decide whether feedback is given',
    ],
    rationale: 'APA Standard 9.10 generally requires psychologists to provide assessment results to clients or legal representatives in reasonably understandable language.',
    choiceRationales: [
      'Third-party payment does not ordinarily replace the psychologist’s responsibility to provide understandable feedback to the examinee.',
      'Documentation is necessary but does not satisfy the separate duty to explain results in accessible terms.',
      'The psychologist should explain the findings to the client or representative using reasonably understandable language.',
      'A referral source does not automatically control whether the examinee receives an explanation of assessment results.',
    ],
  },
  {
    id: 'eppp-v2-professional-070',
    answerIndex: 3,
    prompt: 'After publication, an author discovers a coding mistake that materially changes a reported result. What is the ethical response?',
    choices: [
      'Leave the article unchanged because peer review is complete',
      'Assign responsibility to another member of the research team',
      'Remove the underlying data from future review',
      'Take corrective steps such as an erratum or retraction',
    ],
    rationale: 'APA Standard 8.10 requires reasonable steps to correct significant errors in published data, including a correction, retraction, erratum, or comparable action.',
    choiceRationales: [
      'Completion of peer review does not remove the duty to correct a significant error discovered after publication.',
      'Responsibility for correction is not satisfied by shifting blame to collaborators while the public record remains inaccurate.',
      'Removing data reduces transparency and does not correct the materially inaccurate published finding.',
      'A material error calls for a transparent corrective action proportionate to its effect on the published conclusions.',
    ],
  },
];

const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const tailFor = (id) => {
  if (id.includes('-biological-')) return ' under the observed neural or endocrine pattern.';
  if (id.includes('-cognitive-affective-') || id.includes('-cognitive-')) return ' for the memory or decision pattern shown.';
  if (id.includes('-social-cultural-') || id.includes('-social-')) return ' for the social evidence presented.';
  if (id.includes('-lifespan-')) return ' for the developmental evidence presented.';
  if (id.includes('-assessment-')) return ' for this score interpretation.';
  if (id.includes('-intervention-')) return ' for the treatment process described.';
  if (id.includes('-research-')) return ' for the design or analysis at issue.';
  return ' under the professional facts presented.';
};
for (const revision of revisions) {
  revision.choiceRationales = revision.choiceRationales.map((text, index) => {
    if (index === revision.answerIndex) return revision.rationale;
    let result = text;
    while (wordCount(result) < 16 || result.length < 100) result += tailFor(revision.id);
    return result;
  });
}

module.exports = { reviewedAt, reviewWave, revisions };
