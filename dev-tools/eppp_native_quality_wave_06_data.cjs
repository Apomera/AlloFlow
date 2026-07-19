'use strict';

const sourceRecords = {
  testingStandards: {
    url: 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf',
    title: 'Standards for Educational and Psychological Testing',
    organization: 'American Educational Research Association, American Psychological Association, and National Council on Measurement in Education',
    summary: 'The professional consensus standards explain score precision, standard errors of measurement, and the use and interpretation of confidence intervals around test scores.',
    credibility: 'AERA, APA, and NCME jointly publish these consensus standards, making them the authoritative U.S. professional framework for educational and psychological measurement practice.',
  },
  etsSem: {
    url: 'https://www.ets.org/content/dam/ets-india/pdfs/gre/gre-reliability-standard-error-measurement.pdf',
    title: 'Reliability and Standard Error of Measurement',
    organization: 'Educational Testing Service',
    summary: 'This official psychometric supplement defines SEM, illustrates confidence intervals based on SEM, and distinguishes overall from conditional measurement error.',
    credibility: 'Educational Testing Service is a major nonprofit assessment and measurement-research organization; this technical publication applies SEM principles to operational score interpretation.',
  },
  tapPrimary: {
    url: 'https://doi.org/10.1016/S0022-5371(77)80016-9',
    title: 'Levels of Processing Versus Transfer Appropriate Processing',
    organization: 'Journal of Verbal Learning and Verbal Behavior, Elsevier',
    summary: 'The original experiments found that semantic encoding aided standard recognition while rhyme-oriented encoding aided a rhyming recognition test.',
    credibility: 'This DOI identifies the original peer-reviewed Morris, Bransford, and Franks experimental article that established the tested transfer-appropriate-processing effect.',
  },
  gilliganPrimary: {
    url: 'https://doi.org/10.17763/haer.47.4.g6167429416hg5l0',
    title: 'In a Different Voice: Women\'s Conceptions of Self and of Morality',
    organization: 'Harvard Educational Review',
    summary: 'Gilligan\'s foundational article describes a contextual moral voice organized around relationships, responsibility, and responsiveness rather than a rights-only hierarchy.',
    credibility: 'This is Gilligan\'s primary peer-reviewed scholarly account, published in the Harvard Educational Review with a stable DOI and direct relevance to the construct tested.',
  },
  gilliganMeta: {
    url: 'https://pubmed.ncbi.nlm.nih.gov/10989620/',
    title: 'Gender Differences in Moral Orientation: A Meta-Analysis',
    organization: 'Psychological Bulletin, indexed by PubMed',
    summary: 'The quantitative synthesis found small average gender differences and did not support treating care as predominantly female or justice as predominantly male.',
    credibility: 'Psychological Bulletin is an APA peer-reviewed journal, and PubMed supplies a traceable National Library of Medicine record for this quantitative research synthesis.',
  },
  stereotypeThreatPrimary: {
    url: 'https://pubmed.ncbi.nlm.nih.gov/7473032/',
    title: 'Stereotype Threat and the Intellectual Test Performance of African Americans',
    organization: 'Journal of Personality and Social Psychology, indexed by PubMed',
    summary: 'The original experiments manipulated whether difficult verbal items were described as diagnostic of ability and examined the resulting race-by-framing performance interaction.',
    credibility: 'This PubMed record identifies the foundational peer-reviewed Steele and Aronson randomized experiments, including authors, journal, DOI, design summary, and publication metadata.',
  },
  stereotypeReplication: {
    url: 'https://doi.org/10.1371/journal.pone.0267699',
    title: 'Stereotype Threat, Gender and Mathematics Attainment: A Conceptual Replication of Stricker and Ward',
    organization: 'PLOS ONE',
    summary: 'This preregistered field conceptual replication found no predicted gender-by-question-order interaction, illustrating that stereotype-threat effects are conditional rather than universal.',
    credibility: 'This is a peer-reviewed, preregistered primary field study with openly available materials, data, analysis scripts, and a stable DOI; it is used to bound generalization rather than negate a different experiment.',
  },
  minimalGroupPrimary: {
    url: 'https://doi.org/10.1002/ejsp.2420010202',
    title: 'Social Categorization and Intergroup Behaviour',
    organization: 'European Journal of Social Psychology',
    summary: 'The original minimal-group experiments found ingroup-favoring reward allocations when arbitrary categorization distinguished groups without prior hostility or personal gain.',
    credibility: 'This DOI resolves to the foundational peer-reviewed Tajfel, Billig, Bundy, and Flament experiments and provides stable bibliographic provenance for the controlled findings.',
  },
  conflictTheoryComparison: {
    url: 'https://doi.org/10.2307/2786796',
    title: 'Individual-Group Discontinuity from the Differing Perspectives of Realistic Group Conflict Theory and Social Identity Theory',
    organization: 'Social Psychology Quarterly',
    summary: 'The experiments explicitly distinguish competition over absolute group outcomes from social-identity motives involving relative group advantage.',
    credibility: 'This is a peer-reviewed experimental article that directly operationalizes and compares realistic-conflict and social-identity explanations, with a stable DOI and complete journal citation.',
  },
  cptManual: {
    url: 'https://www.ptsd.va.gov/professional/continuing_ed/CPT_Manual.asp',
    title: 'Cognitive Processing Therapy for Posttraumatic Stress Disorder: A Comprehensive Manual, Second Edition',
    organization: 'U.S. Department of Veterans Affairs, National Center for PTSD',
    summary: 'The treatment-developer manual emphasizes identifying assimilated and over-accommodated stuck points, employing Socratic dialogue, addressing avoidance, and structured practice.',
    credibility: 'The National Center for PTSD is a U.S. Department of Veterans Affairs research and education center, and this official competency-training manual is authored by CPT developers.',
  },
  apaEthics: {
    url: 'https://www.apa.org/ethics/code',
    title: 'Ethical Principles of Psychologists and Code of Conduct',
    organization: 'American Psychological Association',
    summary: 'The current APA Ethics Code includes Standard 9.11 on maintaining test security and Standard 1.03 on conflicts between ethics and organizational demands.',
    credibility: 'The American Psychological Association publishes and maintains the operative text of its own Ethics Code, making this the primary professional source for the cited standards.',
  },
};

function withSources(replacement, keys) {
  const sourceDetails = keys.map((key) => sourceRecords[key]);
  return { ...replacement, references: sourceDetails.map((source) => source.url), sourceDetails };
}

const replacements = {
  'eppp-v2-assessment-026': withSources({
    difficulty: 'advanced',
    prompt: 'An examinee earns a score of 110. The technical manual reports a conditional standard error of measurement of 5 at that score. Assuming an approximately normal random-error model, which interval best approximates a 95% confidence interval constructed around the obtained score?',
    choices: [
      '105 to 115, using approximately one standard error on each side of the score',
      '95 to 125, using approximately three standard errors on each side of the score',
      '100 to 120, using approximately 1.96 standard errors on each side of the score',
      '102 to 118, using approximately 1.6 standard errors on each side of the score',
    ],
    answerIndex: 2,
    rationale: 'A conventional 95% confidence interval under the stated model is the obtained score plus or minus approximately 1.96 SEM: 110 plus or minus 9.8, which rounds to 100 to 120. The SEM describes expected random score imprecision; the multiplier and model assumptions produce the interval. It does not capture systematic bias or prove that one average SEM applies across the scale.',
    choiceRationales: [
      'This interval uses one SEM on each side. Under the stated normal-error approximation, that corresponds to roughly 68% coverage rather than the requested 95% confidence level.',
      'This interval uses three SEMs on each side. Under the stated approximation, that is much wider than a conventional 95% interval and corresponds to roughly 99.7% coverage.',
      'Multiplying the conditional SEM of 5 by 1.96 gives 9.8. Adding and subtracting 9.8 from 110 yields about 100.2 to 119.8, conventionally rounded to 100 to 120.',
      'This interval uses about 1.6 SEMs on each side, producing less than the requested 95% coverage under the normal-error approximation. The proper multiplier is approximately 1.96.',
    ],
    learningObjectiveId: 'assessment-sem-confidence-interval-calculation',
    cognitiveProcess: 'application',
    distractorDesign: ['one-sem-coverage-confusion', 'three-sem-overcoverage', 'ninety-percent-multiplier-confusion'],
  }, ['testingStandards', 'etsSem']),

  'eppp-v2-cognitive-affective-039': withSources({
    difficulty: 'advanced',
    prompt: 'Students study the same words for the same amount of time. Group S decides whether each word completes a meaningful sentence; Group R decides whether each word rhymes with a cue. The later test asks which studied words rhyme with new cues. What does a process-match account of memory predict?',
    choices: [
      'Group R may perform better because retrieval reuses phonological operations emphasized during its encoding task',
      'Group S should perform better because semantic encoding remains superior when retrieval emphasizes rhyme',
      'The groups should tie because equal exposure removes effects of encoding operations on retrieval performance',
      'Group R should benefit chiefly when its physical testing room matches its study room rather than when processing overlaps',
    ],
    answerIndex: 0,
    rationale: 'Transfer-appropriate processing predicts that performance depends partly on overlap between operations used at encoding and those required at retrieval. Rhyme-oriented study can therefore outperform semantic study on a rhyming test, even though semantic encoding performs better on a conventional recognition test. This qualifies a depth-only account rather than claiming phonological processing is generally superior.',
    choiceRationales: [
      'The rhyme-judgment task and rhyming test share phonological operations. That processing overlap can give Group R an advantage despite the usual strength of semantic encoding on other tests.',
      'Semantic encoding often supports strong conventional recognition, but it does not retain the same advantage when the test specifically requires the phonological operations practiced by Group R.',
      'Equal exposure controls study time, not the kind of mental operation performed. Transfer-appropriate processing predicts that this qualitative encoding difference can interact with retrieval demands.',
      'Matching rooms concerns environmental context. The finding at issue depends on overlap in cognitive operations, so room reinstatement is neither required nor the primary process-match prediction.',
    ],
    learningObjectiveId: 'cognitive-transfer-appropriate-processing-interaction',
    cognitiveProcess: 'analysis',
    distractorDesign: ['depth-dominates-test-demands', 'exposure-equates-processing', 'physical-context-substitution'],
  }, ['tapPrimary']),

  'eppp-v2-lifespan-040': withSources({
    difficulty: 'advanced',
    prompt: 'While considering whether to report a coworker\'s misconduct, an adult says, "Rules matter, but I first need to understand who is vulnerable, what I owe people in these relationships, and which response prevents harm without erasing my own needs." Which interpretation best fits Gilligan\'s care perspective?',
    choices: [
      'The reasoning treats moral judgment as a contextual responsibility to self and others within relationships',
      'The reasoning reduces morality to seeking approval and preserving social harmony as the decisive standard',
      'The reasoning derives the response from an impartial justice rule applied without attention to situational relationships',
      'The reasoning treats concern for another person as an instrumental exchange intended to secure reciprocal benefit',
    ],
    answerIndex: 0,
    rationale: 'Gilligan\'s care perspective attends to context, relationships, responsibility, vulnerability, and the needs of both self and others. It is not equivalent to approval seeking, mechanical rule application, reciprocal self-interest, or self-sacrifice. Care and justice orientations can coexist, and later evidence does not support treating care reasoning as inherently female or justice reasoning as inherently male.',
    choiceRationales: [
      'The speaker considers concrete relationships, vulnerability, competing responsibilities, harm, and care for both self and others. Those features align with a contextual care orientation.',
      'Attention to relationships is not identical to seeking approval. The speaker is weighing responsibilities and harm, including personal needs, rather than making social acceptance the final criterion.',
      'An impartial-rule approach is closer to a justice orientation. The speaker explicitly resists deciding from a rule alone and asks how context, relationships, and vulnerability shape responsibility.',
      'Instrumental exchange treats moral action as a means to reciprocal gain. The speaker instead considers care, harm, obligations, and personal boundaries without conditioning concern on repayment.',
    ],
    learningObjectiveId: 'lifespan-gilligan-care-reasoning-application',
    cognitiveProcess: 'analysis',
    distractorDesign: ['approval-seeking-confusion', 'justice-rule-substitution', 'instrumental-exchange-confusion'],
  }, ['gilliganPrimary', 'gilliganMeta']),

  'eppp-v3-social-cultural-002': withSources({
    difficulty: 'advanced',
    prompt: 'A researcher gives Black and White undergraduates the same difficult verbal items and randomly varies the instructions. The task is described either as diagnostic of intellectual ability or as a nondiagnostic problem-solving exercise. After prior verbal performance is controlled, Black participants show a larger decrement under the diagnostic framing. Which process most specifically accounts for this interaction?',
    choices: [
      'A situational stereotype-threat response triggered when the negative group stereotype became self-relevant',
      'Behavioral confirmation produced when an evaluator administers different items or feedback to the two groups',
      'A stable difference in internalized beliefs that should appear similarly under both instructional framings',
      'Stereotype lift in which improvement by the non-target group is the demonstrated source of the target-group decrement',
    ],
    answerIndex: 0,
    rationale: 'The diagnostic framing makes a negative group stereotype self-relevant during performance, which is the situational manipulation in Steele and Aronson\'s original stereotype-threat experiments. The interaction does not establish lower ability, conscious stereotype endorsement, evaluator mistreatment, or a universal effect across groups and tasks; later studies show important boundary conditions.',
    choiceRationales: [
      'The diagnostic instructions make a negative intellectual stereotype relevant to the targeted participants during the task. The condition-dependent performance change is the pattern stereotype threat predicts.',
      'Behavioral confirmation requires an interaction partner whose differential treatment helps elicit confirming behavior. Here, item content and administration are held constant while instructional framing changes.',
      'A stable internalized group difference would not specifically predict a diagnostic-versus-nondiagnostic interaction. Stereotype threat can occur without conscious endorsement of the stereotype.',
      'Stereotype lift concerns a possible benefit to a non-target group. The scenario establishes a targeted group decrement by framing but does not demonstrate that non-target improvement caused that decrement.',
    ],
    learningObjectiveId: 'social-stereotype-threat-experimental-interaction',
    cognitiveProcess: 'analysis',
    distractorDesign: ['behavioral-confirmation', 'stable-internalization', 'stereotype-lift'],
  }, ['stereotypeThreatPrimary', 'stereotypeReplication']),

  'eppp-v2-social-cultural-047': withSources({
    difficulty: 'advanced',
    prompt: 'Members of two university departments already show modest preference for their own department. Administrators then announce that one department will receive the university\'s single new faculty line. Members subsequently become more negative toward the other department and recommend more parochial allocations. Which account most specifically explains the increase after the announcement?',
    choices: [
      'Social identity theory, because existing department categorization best isolates the effect of the newly scarce faculty line',
      'Realistic group conflict theory, because perceived zero-sum competition for a valued resource intensified intergroup bias',
      'Group relative deprivation, because members learned that their department had already received an unjustly smaller allocation',
      'Symbolic threat theory, because the announcement showed that the other department\'s values endangered their worldview',
    ],
    answerIndex: 1,
    rationale: 'The announcement introduces incompatible goals over one valued, scarce resource, so realistic group conflict most specifically explains the increase in bias. Social identity processes can explain baseline ingroup preference without material competition, but the question asks about the increment after scarcity was introduced. Relative deprivation and symbolic threat require conditions not described.',
    choiceRationales: [
      'Social identity theory can account for the modest preference present before the announcement. It is less specific to the new increase produced when the departments begin competing for one faculty line.',
      'The departments now perceive a zero-sum contest for a valued resource: one gains the position and the other does not. That change is the condition emphasized by realistic group conflict theory.',
      'Relative deprivation requires a comparison interpreted as unjust disadvantage. The scenario describes prospective competition for a position, not evidence that one department already received less than it deserved.',
      'Symbolic threat concerns perceived danger to a group\'s values, norms, or worldview. The announced conflict concerns a material organizational resource rather than incompatible cultural values.',
    ],
    learningObjectiveId: 'social-realistic-conflict-increment-over-identity-baseline',
    cognitiveProcess: 'analysis',
    distractorDesign: ['identity-baseline-versus-scarcity-change', 'relative-deprivation', 'symbolic-threat'],
  }, ['minimalGroupPrimary', 'conflictTheoryComparison']),

  'eppp-v2-intervention-006': withSources({
    difficulty: 'advanced',
    prompt: 'During cognitive processing therapy, a client says, "Because I froze during the assault, it was my fault." Which therapist response is most consistent with CPT at this stage?',
    choices: [
      'Begin repeated imaginal recounting and use declining arousal as the primary test of whether the belief is accurate',
      'Teach the client to suppress the thought whenever it appears so that the belief receives less mental rehearsal',
      'Replace the statement with therapist reassurance that the client was blameless and discourage further examination',
      'Identify the self-blame as an assimilated stuck point and use Socratic questions and worksheets to examine evidence and context',
    ],
    answerIndex: 3,
    rationale: 'CPT identifies trauma-related stuck points and uses guided Socratic dialogue and structured worksheets to examine evidence, context, and alternative interpretations. Self-blame that alters the meaning of the event to fit a prior belief is an assimilated stuck point. CPT does not make arousal reduction the truth test, rely on thought suppression, or substitute therapist reassurance for collaborative examination.',
    choiceRationales: [
      'Imaginal exposure is associated with exposure-based procedures, but declining arousal does not determine whether a self-blaming appraisal is true. CPT directly examines the stuck point\'s evidence and context.',
      'Thought suppression can leave the belief unexamined and may strengthen avoidance. CPT asks clients to notice, record, and evaluate stuck points rather than trying to prevent the thoughts from occurring.',
      'Supportive reassurance may feel helpful but does not teach the client to evaluate the appraisal. CPT uses collaborative Socratic questions so the client develops a more balanced conclusion from the evidence.',
      'The statement changes the meaning of the event toward self-blame, fitting an assimilated stuck point. Socratic dialogue and CPT worksheets examine what supports it, what does not, and what context was omitted.',
    ],
    learningObjectiveId: 'intervention-cpt-assimilated-stuck-point-response',
    cognitiveProcess: 'application',
    distractorDesign: ['arousal-as-truth-test', 'thought-suppression', 'reassurance-instead-of-socratic-examination'],
  }, ['cptManual']),

  'eppp-v3-professional-030': withSources({
    difficulty: 'advanced',
    prompt: 'A graduate instructor asks a psychologist to upload a current proprietary test\'s item booklet and scoring key to a password-protected course site so students can practice. Which response best follows APA Ethics Code Standard 9.11?',
    choices: [
      'Upload deidentified scans because removing examinee information converts the booklet and key into releasable test data',
      'Decline to upload protected content and use publisher-authorized samples while maintaining security consistent with law and contractual obligations',
      'Email complete copies to enrolled students because individual distribution avoids the security concern created by a course site',
      'Paraphrase the item wording before posting because altered wording removes the obligation to protect the underlying stimuli and scoring logic',
    ],
    answerIndex: 1,
    rationale: 'Standard 9.11 distinguishes protected test materials, such as manuals, instruments, protocols, questions, and stimuli, from test data and requires reasonable efforts to maintain their integrity and security consistently with law and contractual obligations. Deidentification, a password, individual email, or paraphrasing does not itself authorize distributing protected content.',
    choiceRationales: [
      'Removing examinee identifiers protects privacy but does not transform proprietary questions, stimuli, or scoring keys into test data. Test-material security remains a separate obligation.',
      'Using publisher-authorized teaching samples meets the instructional need without distributing protected items or scoring logic. The response also preserves the standard\'s legal and contractual qualifications.',
      'Changing the delivery channel does not resolve authorization or test-security concerns. Individually emailing protected materials can compromise integrity just as posting them to a restricted site can.',
      'Paraphrased items may still disclose protected constructs, stimulus logic, or scoring methods. A psychologist should use authorized samples rather than assume wording changes create permission.',
    ],
    learningObjectiveId: 'professional-standard-9-11-test-material-security',
    cognitiveProcess: 'application',
    distractorDesign: ['test-data-material-confusion', 'restricted-channel-equals-authorization', 'paraphrase-equals-permission'],
  }, ['apaEthics']),

  'eppp-v2-professional-073': withSources({
    difficulty: 'advanced',
    prompt: 'A clinic director instructs a psychologist to let staff members who have not been trained in an assessment interpret its scores independently. The psychologist determines that the organizational demand conflicts with ethical obligations. Under APA Ethics Code Standard 1.03, what should the psychologist do next?',
    choices: [
      'Comply because an organizational directive transfers responsibility for the assessment interpretations to the clinic',
      'Continue the practice while recording a private objection, because documentation resolves the ethical conflict',
      'Resign at once without considering whether the conflict can be resolved or whether clients need continuity protections',
      'Name the inconsistency, communicate the relevant professional commitment, and pursue reasonable corrective steps',
    ],
    answerIndex: 3,
    rationale: 'Standard 1.03 directs a psychologist whose ethical obligations conflict with organizational demands to clarify the conflict, make known the commitment to the Ethics Code, and take reasonable steps to resolve the matter consistently with the Code. Organizational authority and private documentation do not transfer responsibility, while resignation is not the standard\'s automatic first response.',
    choiceRationales: [
      'An employer cannot assume the psychologist\'s professional ethical responsibility merely by issuing a directive. The psychologist must address the conflict through the process specified in Standard 1.03.',
      'A private note may document concern but does not make the ethical commitment known to the organization or attempt a resolution. Continuing unchanged leaves the identified conflict active.',
      'Leaving may become necessary in some circumstances, but Standard 1.03 first describes clarification, communication, and reasonable resolution steps. Client welfare and continuity also require consideration.',
      'This sequence follows Standard 1.03: name the conflict, communicate commitment to the Code, and pursue reasonable resolution steps that remain consistent with ethical obligations.',
    ],
    learningObjectiveId: 'professional-standard-1-03-organizational-demand-conflict',
    cognitiveProcess: 'application',
    distractorDesign: ['organizational-liability-transfer', 'private-documentation-as-resolution', 'automatic-resignation'],
  }, ['apaEthics']),
};

module.exports = { sourceRecords, replacements };
