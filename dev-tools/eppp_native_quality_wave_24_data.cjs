'use strict';

// EPPP native quality wave 24 — semantic-duplicate remediation.
//
// WHY THIS WAVE EXISTS.
//
// eppp_distractor_quality_diagnostics.json records 81 semantic concept-duplicate
// pairs across 45 clusters. The bank is clean on every EXACT measure: 1,500
// items, 1,500 distinct content kernels, 1,500 distinct prompts, zero within-bank
// duplicate kernels, and a top prompt frame of 2%. The duplication is semantic,
// so a kernel hash cannot see it. Two items can ask the same question, key the
// same fact, and offer the same distractor set, and still count as distinct
// because a rationale is reworded and a reference points at a different anchor of
// the same chapter.
//
// This wave takes the two most defensible slices of that backlog:
//
//   SAME-BANK duplicates (3 items). Seven pairs place both members in one
//   100-item bank, so a learner meets both in a single sitting. Four of those
//   seven are foundation-to-intermediate pairs, which matches the
//   "intentional-foundation-application-scaffold" classification an earlier
//   reviewer applied elsewhere in this docket; those are deliberately left alone.
//   The three revised here are SAME-DIFFICULTY pairs, which have no scaffolding
//   rationale:
//     eppp-v2-assessment-012          TAT, stem differs from -010 by clients/examinees
//     eppp-v3-cognitive-affective-052 Loftus, restates -041; options were also
//                                     participial fragments that did not complete the stem
//     eppp-v2-social-cultural-037     key restates what -034 already tests
//
//   IDENTICAL-KEY duplicates (5 items). Five pairs share exact key text across
//   banks. Object permanence is a TRIPLE (-011, -002, -049), all keyed
//   "Sensorimotor", so two of the three are re-aimed and the foundation recall
//   item is kept.
//
// METHOD. Nothing is deleted; domain coverage and bank sizes are fixed. Each
// redundant twin is re-aimed at a different, defensible question about the same
// construct, which is why every revision here declares an application or
// analysis demand. That converts a redundant pair into the foundation-to-
// application scaffold the earlier reviewer treated as legitimate, instead of
// removing an item and leaving a hole.
//
// Answer position is pinned: every revision keys at the item's existing
// answerIndex, so the 25/25/25/25 per-bank balance is untouched.

const standardsSource = {
  url: 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf',
  title: 'Standards for Educational and Psychological Testing',
  organization: 'American Educational Research Association, American Psychological Association, and National Council on Measurement in Education',
  summary: 'The Standards define validity as the degree to which evidence and theory support the interpretations of test scores for proposed uses, and require that interpretation rest on convergent evidence rather than on a single instrument or protocol considered in isolation.',
  credibility: 'This is the joint professional standard for testing practice in the United States, published by the three organizations that govern educational and psychological measurement. It directly governs how much interpretive weight a single projective protocol may carry in an evaluation.',
};

const loftusSource = {
  url: 'https://doi.org/10.1016/S0022-5371(74)80011-3',
  title: 'Reconstruction of Automobile Destruction: An Example of the Interaction Between Language and Memory',
  organization: 'Journal of Verbal Learning and Verbal Behavior',
  summary: 'Loftus and Palmer showed that the verb used in a post-event question changed both speed estimates and later reports of broken glass that had never been present, demonstrating that information supplied after an event can be integrated into a witness memory of it.',
  credibility: 'This peer-reviewed experiment is the primary published source for the misinformation effect and is indexed through a DOI. It supports the distinction between memory altered by post-event input and memory that is merely reported with low confidence.',
};

const tajfelSource = {
  url: 'https://doi.org/10.1002/ejsp.2420010202',
  title: 'Social Categorization and Intergroup Behaviour',
  organization: 'European Journal of Social Psychology',
  summary: 'Tajfel and colleagues found that assignment to arbitrary, meaningless categories was sufficient to produce allocation favouring the in-group, even where participants gained nothing personally and the groups had no history, contact, or competing interest.',
  credibility: 'This peer-reviewed study is the primary minimal-group experiment underlying social identity theory and is indexed through a DOI. It is the evidence that separates a categorization account of intergroup bias from a resource-competition account.',
};

const piagetStagesSource = {
  url: 'https://openstax.org/books/psychology-2e/pages/9-3-stages-of-development',
  title: 'Stages of Development — Psychology 2e',
  organization: 'OpenStax, Rice University',
  summary: 'This chapter describes Piagetian stages in developmental sequence, including sensorimotor coordination of action with perception, the emergence of symbolic thought together with egocentrism and centration in the preoperational period, and the later arrival of conservation and reversible operations.',
  credibility: 'OpenStax is a peer-reviewed, openly licensed textbook programme based at Rice University and used in accredited introductory psychology courses. The chapter supports both the stage sequence and the specific errors that mark each period.',
};

const eriksonSource = {
  url: 'https://openstax.org/books/psychology-2e/pages/9-2-lifespan-theories',
  title: 'Lifespan Theories — Psychology 2e',
  organization: 'OpenStax, Rice University',
  summary: 'This section sets out Erikson psychosocial theory as a sequence of stage-specific conflicts across the lifespan, describing the developmental task of each period and the way resolution of an earlier conflict shapes the resources a person brings to later ones.',
  credibility: 'OpenStax is a peer-reviewed, openly licensed textbook programme based at Rice University. This section is the reference used elsewhere in this bank for Erikson stage content and supports discrimination among adjacent psychosocial crises.',
};

const nistGlossarySource = {
  url: 'https://www.itl.nist.gov/div898/handbook/glossary.htm',
  title: 'NIST/SEMATECH e-Handbook of Statistical Methods Glossary',
  organization: 'National Institute of Standards and Technology',
  summary: 'The handbook glossary defines statistical significance in terms of the probability of the observed data under a null hypothesis, and separates that probability from the magnitude of an observed effect and from the sample size that influences whether a small effect reaches significance.',
  credibility: 'NIST is a United States federal scientific standards agency and its statistical handbook is an authoritative methodological reference. It supports the separation of effect magnitude from statistical significance that this item now tests.',
};

const motivationSource = {
  url: 'https://openstax.org/books/psychology-2e/pages/10-introduction',
  title: 'Emotion and Motivation — Psychology 2e',
  organization: 'OpenStax, Rice University',
  summary: 'This chapter distinguishes intrinsic motivation, sustained by interest and satisfaction inherent in an activity, from extrinsic motivation driven by separable consequences, and describes the overjustification pattern in which salient external reward reduces later interest in an activity that was already intrinsically motivating.',
  credibility: 'OpenStax is a peer-reviewed, openly licensed textbook programme based at Rice University. This chapter is the reference used elsewhere in this bank for motivation content and supports the applied distinction between supporting and undermining a psychological need.',
};

module.exports = {
  reviewedAt: '2026-08-17',
  reviewWave: 'eppp-native-quality-wave-24',
  calibrationBasis: 'Semantic concept-duplicate pairs recorded in eppp_distractor_quality_diagnostics.json, restricted to same-bank same-difficulty pairs and to pairs sharing exact key text.',
  reportScope: 'Eight items re-aimed so that each tests a distinct question about its construct. No item is removed, no answer position changes, and no bank size changes.',
  reportChallengeCriteria: 'A revision is rejected if it keeps the original tested proposition, if it introduces an extreme cue, if it moves the keyed position, or if it leaves the paired item without distinct coverage.',
  warningCountsBefore: {
    totalItems: 1500,
    semanticConceptDuplicatePairs: 81,
    semanticConceptDuplicateClusters: 45,
    uniqueKeyStemLexicalLeakageCandidates: 55,
    asymmetricExtremeDistractorCandidates: 116,
    advancedDirectRecallCandidates: 4,
  },
  warningCountContext: 'Counts are read from the reviewed diagnostics artifact bound to eppp_native_items.json at sha256 a205d0fe. The bank carries zero exact-kernel duplicates and zero within-bank kernel duplicates; this wave addresses the semantic layer only.',
  revisions: [
    {
      id: 'eppp-v2-assessment-012',
      expectedDifficulty: 'foundation',
      targetDifficulty: 'intermediate',
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: The Thematic Apperception Test (TAT) asks examinees to:',
      prompt: 'During a personality evaluation, a client responds to several Thematic Apperception Test cards with brief, literal descriptions of what is pictured and rarely attributes motives or feelings to the figures. What is the most defensible next interpretive step?',
      choices: [
        'Treat the sparse narrative material as one source of hypotheses and weigh it against history, behavioural observation, and better-standardized measures',
        'Convert the narratives into a normative score profile and report the resulting personality description as the finding of the evaluation',
        'Repeat the administration using prompts that direct the client toward interpersonal conflict themes until richer stories are produced',
        'Interpret the literal descriptions as evidence of an unrecognized thought disorder that the referral question failed to anticipate',
      ],
      rationale: 'Thematic narrative material is weakly standardized, so it generates hypotheses rather than conclusions. A sparse, literal response style is itself useful data about how the client approaches an ambiguous task, but a defensible interpretation triangulates it with history, observation, and instruments that carry stronger psychometric support.',
      choiceRationales: [
        'Correct. Thematic narratives are hypothesis-generating rather than conclusive, and the Standards require interpretations to rest on convergent evidence. The response style is recorded as data and then checked against history, observation, and better-standardized measures before any conclusion is drawn.',
        'Reporting a normative profile overstates the psychometric support available for thematic narrative data, which lacks the standardized administration and normative base that structured inventories rely on for score-level interpretation of this kind.',
        'Directing the client toward conflict themes changes the stimulus conditions and contaminates the sample of spontaneous narrative, so the resulting protocol could no longer be compared with the reference material the technique depends on.',
        'A concrete, literal response style has many plausible origins, including language background, guardedness, fatigue, and unfamiliarity with an open-ended task, so a diagnostic inference drawn from this feature alone would outrun the available evidence.',
      ],
      references: [standardsSource.url],
      sourceDetails: [{ ...standardsSource }],
      sourceCheck: 'The Standards for Educational and Psychological Testing require that score interpretations be supported by convergent evidence for the proposed use, which is the basis for treating a sparse thematic protocol as one hypothesis source rather than as a scored personality profile or a diagnostic finding.',
      learningObjectiveId: 'assessment-interpret-projective-narrative-with-convergent-evidence',
      cognitiveProcess: 'application',
      distractorDesign: [
        'treat-weakly-standardized-protocol-as-normed-score-profile',
        'alter-stimulus-conditions-to-manufacture-thematic-content',
        'infer-diagnosis-from-response-style-in-isolation',
      ],
    },
    {
      id: 'eppp-v3-cognitive-affective-052',
      expectedAnswerIndex: 2,
      expectedPrompt: 'The misinformation effect (Loftus) demonstrates that:',
      prompt: 'A witness gave a clear account on the night of a collision. Two weeks later, after reading a news summary describing a stop sign that the witness had not mentioned, the witness now recalls a stop sign and reports high confidence. Which conclusion about this report is best supported?',
      choices: [
        'The confident report establishes that a stop sign was present, because confidence tracks accuracy in recall of a witnessed event',
        'The news summary retrieved a detail the witness had encoded on the night of the collision but had been unable to access earlier',
        'Post-event information can be incorporated into the remembered event, so subsequent confidence does not establish that the detail was witnessed',
        'The two-week delay accounts for the change, since forgetting adds plausible detail to a memory as the retention interval lengthens',
      ],
      rationale: 'Misinformation research shows that information encountered after an event can be integrated into a witness account of the event itself, and that the resulting reports may be held with high confidence. Confidence expressed well after exposure to post-event input is therefore weak evidence that a detail was actually witnessed.',
      choiceRationales: [
        'Confidence and accuracy can diverge sharply once a witness has been exposed to post-event information, so a confident report of a detail that first appeared after the news summary cannot settle whether the detail was present at the scene.',
        'Retrieval support would surface a detail the witness had encoded, but the stop sign entered the account after exposure to an external description, which fits integration of new input rather than recovery of an existing trace.',
        'Correct. Loftus and Palmer showed that information supplied after an event is integrated into the reported memory of that event, including details never present. Later confidence therefore cannot establish that the witness observed the detail.',
        'Ordinary forgetting removes or blurs detail across a retention interval rather than adding a specific new object, so delay by itself does not explain the appearance of a stop sign that matches the wording of the news summary.',
      ],
      references: [loftusSource.url],
      sourceDetails: [{ ...loftusSource }],
      sourceCheck: 'Loftus and Palmer demonstrated that post-event wording changed later reports and produced recall of broken glass that had never been present, which supports treating a confident post-exposure detail as possible integration of new information rather than as evidence of what was witnessed.',
      learningObjectiveId: 'cognitive-affective-evaluate-eyewitness-report-after-post-event-information',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'treat-confidence-as-a-proxy-for-accuracy',
        'reframe-integration-as-cued-retrieval-of-an-encoded-detail',
        'attribute-added-detail-to-ordinary-forgetting',
      ],
    },
    {
      id: 'eppp-v2-social-cultural-037',
      expectedAnswerIndex: 3,
      expectedPrompt: 'Complete the statement: Social identity theory (Tajfel) proposes that intergroup discrimination occurs because:',
      prompt: 'Participants are sorted into two groups by a coin toss, are told nothing else about the groups, and never meet the other members. They then allocate points in a way that favours their own group even though the allocation brings them no personal gain. Which account best explains this result?',
      choices: [
        'Competition over a scarce resource drove the allocation, since points had value that each group needed to secure',
        'Repeated contact between the groups had built a history of grievance that shaped how participants allocated points',
        'Participants inferred real differences in ability between the groups from the way the sorting procedure was conducted',
        'Categorization by itself supports a favourable comparison for the in-group, so bias appears where the grouping is arbitrary and no material interest is at stake',
      ],
      rationale: 'The minimal-group finding is that mere categorization is sufficient to produce in-group favouring allocation. Because participants gained nothing, the groups were arbitrary, and there was no contact or history, accounts based on competition, grievance, or inferred ability cannot explain the result; the comparison itself is what supports a positive social identity.',
      choiceRationales: [
        'The design removes personal gain and gives the points no external value, so a resource-competition account cannot explain allocation behaviour that persists when there is nothing material for either group to secure.',
        'Participants never met the other group and the categories were created moments earlier by a coin toss, so no history of contact or grievance existed that could have shaped the allocations observed here.',
        'The sorting was explicitly arbitrary and participants were told nothing about ability, so an inference about genuine group differences has no basis in the information the procedure actually supplied to them.',
        'Correct. Tajfel and colleagues found that assignment to arbitrary categories was sufficient to produce in-group favouring allocation, which is why categorization and the favourable comparison it supports, rather than competition, explain the pattern.',
      ],
      references: [tajfelSource.url],
      sourceDetails: [{ ...tajfelSource }],
      sourceCheck: 'The minimal-group experiments established that arbitrary categorization alone produced in-group favouring allocation in the absence of personal gain, prior contact, or competing interest, which is the evidence that distinguishes a social identity account from realistic conflict explanations of intergroup bias.',
      learningObjectiveId: 'social-cultural-distinguish-categorization-from-competition-accounts-of-bias',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'substitute-realistic-conflict-for-categorization',
        'invoke-contact-history-that-the-design-excludes',
        'attribute-bias-to-inferred-real-group-differences',
      ],
    },
    {
      id: 'eppp-v3-lifespan-002',
      expectedAnswerIndex: 3,
      expectedPrompt: 'Object permanence typically develops during which Piagetian stage?',
      prompt: 'A ten-month-old repeatedly retrieves a toy hidden under a cloth on the left. The caregiver then hides the toy under a cloth on the right while the infant watches, and the infant searches on the left again. Which interpretation of this search error is best supported?',
      choices: [
        'The infant has yet to form any representation of the hidden toy and treats it as ceasing to exist once covered',
        'The infant has entered preoperational thought, where centration on one feature governs the search',
        'The infant lacks the visual acuity needed to track which cloth the caregiver moved during hiding',
        'Search is still governed by the previously successful action rather than by the toy current location, a pattern seen as object representation consolidates',
      ],
      rationale: 'The A-not-B error appears once an infant will search for a hidden object but still returns to the location where searching previously succeeded. It indicates that representation of the hidden object is developing while action control remains tied to the earlier successful reach, rather than a total absence of representation or a later-stage limitation.',
      choiceRationales: [
        'An infant who searches at all has some representation of the hidden toy, so the error cannot be read as treating the object as gone; the difficulty lies in which location the search is directed toward.',
        'Centration belongs to preoperational thought in the years after infancy, and invoking it here misplaces a ten-month-old into a later stage than the described searching behaviour supports.',
        'The infant watched the hiding and reaches accurately for the cloth, so the error is not explained by an inability to see which cloth the caregiver moved during the demonstration.',
        'Correct. This is the A-not-B pattern: search follows the previously rewarded action rather than the current location, which marks object representation that is consolidating rather than absent.',
      ],
      references: [piagetStagesSource.url],
      sourceDetails: [{ ...piagetStagesSource }],
      sourceCheck: 'The OpenStax development chapter describes sensorimotor progress as the coordination of action with perception and the gradual consolidation of object representation, which supports reading a perseverative search toward a previously rewarded location as developing rather than absent representation.',
      learningObjectiveId: 'lifespan-interpret-a-not-b-search-error-in-sensorimotor-development',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'treat-search-error-as-total-absence-of-representation',
        'misassign-an-infant-behaviour-to-preoperational-centration',
        'substitute-a-sensory-limitation-for-a-representational-one',
      ],
    },
    {
      id: 'eppp-v3-lifespan-049',
      expectedDifficulty: 'foundation',
      targetDifficulty: 'intermediate',
      expectedAnswerIndex: 2,
      expectedPrompt: 'Object permanence is a hallmark achievement of which Piagetian stage?',
      prompt: 'A five-year-old watches water poured from a short, wide glass into a tall, narrow glass and says the tall glass now holds more water. Which description of the reasoning behind this judgement is best supported?',
      choices: [
        'The child has not yet acquired object permanence and treats the water as a new quantity once it leaves the first glass',
        'The child is applying reversibility and has concluded that the transformation added to the quantity of water',
        'The child is centring on the height of the column and does not yet coordinate it with the change in width',
        'The child is reasoning hypothetically about the properties of the glasses rather than about the water itself',
      ],
      rationale: 'Failure to conserve liquid quantity is characteristic of preoperational thought. The child attends to a single salient dimension, here the height of the column, and does not yet coordinate it with the compensating change in width or mentally reverse the pouring, both of which arrive with concrete operational reasoning.',
      choiceRationales: [
        'Object permanence is established well before the preschool years and concerns whether a hidden object continues to exist, which is a different question from whether a visible quantity is unchanged by a change in its container.',
        'Reversibility is precisely what the child has yet to acquire; a child who could mentally pour the water back would recognize the quantity as unchanged rather than judging that it increased.',
        'Correct. Centration on the height of the column, uncoordinated with the compensating decrease in width, is the defining feature of preoperational failure to conserve liquid quantity.',
        'Hypothetical reasoning about properties belongs to formal operational thought in adolescence, and attributing it to a five-year-old misplaces the child several stages beyond the described judgement.',
      ],
      references: [piagetStagesSource.url],
      sourceDetails: [{ ...piagetStagesSource }],
      sourceCheck: 'The OpenStax development chapter identifies centration and the absence of reversibility as the features that distinguish preoperational judgement from concrete operational conservation, which is the basis for attributing this liquid-quantity error to attention to a single salient dimension.',
      learningObjectiveId: 'lifespan-diagnose-preoperational-centration-in-a-conservation-task',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'substitute-object-permanence-for-conservation',
        'credit-the-child-with-the-reversibility-that-is-missing',
        'misassign-preschool-reasoning-to-formal-operations',
      ],
    },
    {
      id: 'eppp-v3-research-016',
      expectedAnswerIndex: 2,
      expectedPrompt: "Cohen's d of 0.80 is generally considered:",
      prompt: 'Two trials test the same intervention. Trial A enrolls 40 participants and reports Cohen d of 0.80 with p = 0.06. Trial B enrolls 4,000 participants and reports Cohen d of 0.05 with p < 0.001. Which interpretation is best supported?',
      choices: [
        'Trial B provides evidence of the larger treatment benefit, because its result reached a more stringent significance threshold',
        'Trial A should be set aside, because a result above the conventional alpha carries no information about the intervention',
        'Trial A shows the larger effect while Trial B shows a small effect estimated precisely, so significance here reflects sample size rather than magnitude',
        'The two trials are in direct conflict, so no interpretation is available until a third trial breaks the tie between them',
      ],
      rationale: 'Effect size and statistical significance answer different questions. Cohen d describes the magnitude of the difference, whereas the p value reflects how compatible the data are with the null hypothesis and is strongly influenced by sample size. A large effect can fall short of a significance threshold in a small sample, and a negligible effect can clear it in a very large one.',
      choiceRationales: [
        'A smaller p value indicates stronger evidence against the null hypothesis rather than a larger benefit, so reading Trial B as showing the greater treatment effect confuses the precision of an estimate with its magnitude.',
        'A result near the conventional threshold in a small sample remains informative about magnitude and precision, and discarding it would waste an effect estimate that is considerably larger than the one Trial B reports.',
        'Correct. Cohen d of 0.80 is a large effect and 0.05 is negligible; the very large sample in Trial B allows a negligible effect to reach significance, which is why the two indices must be read separately.',
        'The trials are not in conflict once magnitude and significance are distinguished, since a large imprecise estimate and a small precise one can both be accurate descriptions of what each study observed.',
      ],
      references: [nistGlossarySource.url],
      sourceDetails: [{ ...nistGlossarySource }],
      sourceCheck: 'The NIST statistical handbook glossary defines statistical significance as a statement about the probability of the data under a null hypothesis and separates that probability from the magnitude of an observed effect, which is the distinction this item now requires the candidate to apply across two sample sizes.',
      learningObjectiveId: 'research-separate-effect-magnitude-from-statistical-significance',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'read-a-smaller-p-value-as-a-larger-effect',
        'discard-a-nonsignificant-result-as-uninformative',
        'treat-magnitude-and-significance-as-contradictory',
      ],
    },
    {
      id: 'eppp-v3-lifespan-017',
      expectedAnswerIndex: 2,
      expectedPrompt: 'According to Erikson, the primary psychosocial crisis of adolescence is:',
      prompt: 'A 34-year-old client reports a stable career and a long partnership but says that life feels static and that they contribute nothing that will outlast them. Which Eriksonian conflict best matches this presentation?',
      choices: [
        'Identity versus role confusion, since the client is questioning who they have become',
        'Intimacy versus isolation, since the concern involves the quality of a long partnership',
        'Generativity versus stagnation, since the concern centres on contributing something that extends beyond the self',
        'Integrity versus despair, since the client is reviewing whether life has had value',
      ],
      rationale: 'Erikson places generativity versus stagnation in middle adulthood, where the developmental task is establishing and guiding what will outlast the self through work, care, or contribution. The described sense of a static life lacking lasting contribution matches that conflict rather than the adjacent identity, intimacy, or integrity crises.',
      choiceRationales: [
        'Identity versus role confusion is the adolescent conflict concerning the consolidation of a coherent self, and this client reports a settled career and partnership rather than an unresolved question about who they are.',
        'Intimacy versus isolation concerns forming committed close bonds in early adulthood, and the client describes a long stable partnership rather than difficulty establishing or sustaining closeness with another person.',
        'Correct. Generativity versus stagnation is the middle-adulthood conflict in which the task is contributing something that outlasts the self, which matches a report of a static life lacking lasting contribution.',
        'Integrity versus despair belongs to later life and involves reviewing a life largely lived, whereas this client at 34 is describing an absence of ongoing contribution rather than appraising a completed life course.',
      ],
      references: [eriksonSource.url],
      sourceDetails: [{ ...eriksonSource }],
      sourceCheck: 'The OpenStax lifespan theories section sets out the Erikson stage sequence and the developmental task specific to each period, which supports matching a middle-adulthood concern about lasting contribution to generativity versus stagnation rather than to the adjacent identity, intimacy, or integrity conflicts.',
      learningObjectiveId: 'lifespan-match-presentation-to-eriksonian-stage-conflict',
      cognitiveProcess: 'application',
      distractorDesign: [
        'select-the-adolescent-conflict-for-an-adult-presentation',
        'anchor-on-the-partnership-detail-rather-than-the-stated-concern',
        'advance-to-the-late-life-review-conflict-prematurely',
      ],
    },
    {
      id: 'eppp-v3-cognitive-affective-039',
      expectedAnswerIndex: 2,
      expectedPrompt: "Deci and Ryan's self-determination theory identifies three basic psychological needs:",
      prompt: 'Students in a programme currently choose their own project topics and report high interest. An administrator proposes replacing that choice with assigned topics and a cash prize for the highest score. From the standpoint of self-determination theory, what is the most likely consequence for intrinsic motivation?',
      choices: [
        'Interest should rise, because a tangible reward adds motivational force to the existing interest in the work',
        'Interest should be unaffected, because intrinsic and extrinsic motivation operate through separate systems that do not interact',
        'Interest tends to decline, because withdrawing the students own topic selection undermines autonomy and a salient reward shifts the perceived reason for working',
        'Interest should rise, because assigned topics reduce the effort of deciding and thereby support the need for competence',
      ],
      rationale: 'Self-determination theory holds that intrinsic motivation depends on satisfaction of autonomy, competence, and relatedness. Replacing self-chosen topics with assigned ones withdraws autonomy support, and introducing a salient contingent reward can shift the perceived reason for the activity toward the external consequence, a pattern described as overjustification.',
      choiceRationales: [
        'Adding a tangible contingent reward to an activity that is already intrinsically motivating tends to shift the perceived reason for engagement toward the reward, so the expected result is a reduction rather than a summed increase in interest.',
        'The theory describes interaction rather than independence between these motivational sources, since external contingencies change how a person interprets the reason for an activity they previously pursued for its own sake.',
        'Correct. Withdrawing choice removes autonomy support and a salient contingent reward shifts the perceived reason for working toward the external consequence, which together predict a decline in intrinsic motivation.',
        'Reducing decision effort does not build competence, which concerns effective mastery of a challenge; assigning topics constrains the autonomy that supported interest rather than strengthening the sense of capability.',
      ],
      references: [motivationSource.url],
      sourceDetails: [{ ...motivationSource }],
      sourceCheck: 'The OpenStax motivation chapter distinguishes intrinsic from extrinsic motivation and describes the overjustification pattern in which salient external reward reduces later interest in an activity already pursued for its own sake, which is the basis for predicting a decline when choice is withdrawn and a prize introduced.',
      learningObjectiveId: 'cognitive-affective-apply-self-determination-theory-to-a-motivational-change',
      cognitiveProcess: 'application',
      distractorDesign: [
        'treat-reward-and-interest-as-simply-additive',
        'assert-independence-between-intrinsic-and-extrinsic-motivation',
        'misattribute-reduced-decision-effort-to-competence-support',
      ],
    },
  ],
};
