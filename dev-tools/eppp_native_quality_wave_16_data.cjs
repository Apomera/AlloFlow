'use strict';

module.exports = {
  reviewedAt: '2026-07-25',
  reviewWave: 'eppp-native-quality-wave-16',
  warningCountsBefore: {
    totalItems: 1500,
    warningOnly: true,
    forbiddenAggregateChoices: 0,
    uniqueKeyStemLexicalLeakageCandidates: 142,
    asymmetricExtremeDistractorCandidates: 301,
    advancedDirectRecallCandidates: 19,
    semanticConceptDuplicatePairs: 258,
    semanticConceptDuplicateClusters: 124,
    editorialAnchorsWithActiveWarnings: 5,
    editorialAnchorsWithNoCurrentWarning: 5,
    priorityDocketItems: 20
  },
  revisions: [
    {
      id: 'eppp-v2-intervention-031',
      expectedActionRank: 1,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Dialectical Behavior Therapy (DBT) skill modules include:',
      prompt: 'A DBT skills-group member feels an intense urge to send escalating messages after a rejection and wants to get through the evening without worsening the situation. Which training focus most directly fits the immediate objective?',
      choices: [
        'Distress-tolerance practice for surviving the crisis and accepting the moment while refraining from urge-driven action',
        'Emotion-regulation practice for identifying vulnerability factors and changing the longer-term pattern of emotional responding',
        'Interpersonal-effectiveness practice for making a request while balancing the relationship, the objective, and self-respect',
        'Core-mindfulness practice for observing and describing present experience as the central training target for the session'
      ],
      rationale: 'DBT organizes skills into mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness. The immediate objective is crisis survival without making the situation worse, which most directly calls for distress-tolerance skills. The other modules remain relevant to observing the urge, reducing future vulnerability, and communicating effectively, but they target neighboring functions.',
      choiceRationales: [
        'DBT organizes skills into mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness. The immediate objective is crisis survival without making the situation worse, which most directly calls for distress-tolerance skills. The other modules remain relevant to observing the urge, reducing future vulnerability, and communicating effectively, but they target neighboring functions.',
        'Emotion-regulation skills help people understand emotions, reduce vulnerability, and change emotional responses over time. Those aims matter in the broader plan, but the stated need is to endure a high-risk evening and avoid an impulsive act, making crisis-survival work the closer match.',
        'Interpersonal-effectiveness skills address asking, declining, negotiating, and protecting relationships or self-respect. Drafting a later skillful response may use this module, but the immediate problem is tolerating acute distress before acting on the urge.',
        'Mindfulness supports each DBT module by helping a person notice and describe experience nonjudgmentally. It can create a pause here, yet the specific behavioral objective of getting through a crisis without escalation is the defining function of distress-tolerance training.'
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC6007584/'
      ],
      sourceDetails: [
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6007584/',
          title: 'Dialectical Behavior Therapy as Treatment for Borderline Personality Disorder',
          organization: 'Mental Health Clinician and PubMed Central',
          summary: 'This peer-reviewed clinical review describes the four DBT skills modules and differentiates mindfulness, relationship skills, emotion regulation, and crisis-survival and acceptance strategies within distress tolerance.',
          credibility: 'PubMed Central is the U.S. National Library of Medicine full-text archive, and Mental Health Clinician is a peer-reviewed clinical journal. The article directly defines the neighboring DBT skills functions tested in this scenario.'
        }
      ],
      sourceCheck: 'The review identifies four DBT skills modules and describes distress tolerance as including crisis-survival and acceptance strategies. The scenario requires selecting that function while acknowledging that mindfulness, emotion regulation, and interpersonal effectiveness can contribute at other points.',
      learningObjectiveId: 'intervention-dbt-module-selection-by-immediate-function',
      cognitiveProcess: 'application',
      distractorDesign: [
        'longer-term-emotion-regulation-neighbor',
        'interpersonal-effectiveness-neighbor',
        'mindfulness-foundational-neighbor'
      ]
    },
    {
      id: 'eppp-b015-cognitive-1',
      expectedActionRank: 2,
      expectedAnswerIndex: 1,
      expectedPrompt: 'State-dependent learning predicts improved retrieval when:',
      prompt: 'Participants learn neutral words after either brief arousal or quiet rest. At delayed free recall, performance improves when testing repeats the learner\'s earlier arousal level rather than switching it. Which account best fits the interaction?',
      choices: [
        'Mood-congruent memory, because the emotional meaning of each word matches the participant\'s feeling during the test',
        'An organismic-cue effect in which a bodily or affective setting at acquisition facilitates access when it recurs',
        'Environmental context dependence, because stable features of the testing room recreate the physical setting of study',
        'Transfer-appropriate processing, because the cognitive operation applied to each word is repeated during the memory test'
      ],
      rationale: 'State-dependent memory concerns overlap in an internal physiological, pharmacological, motivational, or affective condition between encoding and retrieval. The same-state advantage in the scenario varies arousal while using neutral material, so it is better explained by reinstatement of an organismic state than by emotional-content congruence, external context, or task-operation overlap.',
      choiceRationales: [
        'Mood-congruent memory predicts preferential access to material whose emotional valence corresponds to the current mood. The words here are neutral, and the result depends on whether arousal is reinstated rather than whether positive or negative content matches a feeling.',
        'State-dependent memory concerns overlap in an internal physiological, pharmacological, motivational, or affective condition between encoding and retrieval. The same-state advantage in the scenario varies arousal while using neutral material, so it is better explained by reinstatement of an organismic state than by emotional-content congruence, external context, or task-operation overlap.',
        'Environmental context effects involve external cues such as location, sound, odor, or room features. Those features are not manipulated here; the critical variable is the participant\'s arousal condition at learning and recall, which is an internal-state manipulation.',
        'Transfer-appropriate processing concerns compatibility between cognitive operations used to encode material and those demanded by a later test. The scenario holds the word task constant and manipulates arousal, so processing-operation overlap does not explain the crossover.'
      ],
      references: [
        'https://doi.org/10.1126/science.163.3873.1358'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1126/science.163.3873.1358',
          title: 'Alcohol and Recall: State-Dependent Effects in Man',
          organization: 'Science and American Association for the Advancement of Science',
          summary: 'Goodwin and colleagues experimentally examined human recall across alcohol and sober conditions, providing a foundational demonstration that retrieval can vary with reinstatement of an internal state present during learning.',
          credibility: 'This DOI identifies the foundational peer-reviewed Science article on human state-dependent recall. The controlled state-match design directly supports the internal-condition interaction tested here, while later research establishes important boundary conditions.'
        }
      ],
      sourceCheck: 'The foundational experiment compared learning and recall across matched and mismatched internal conditions and reported state-dependent effects. The revised item transfers that interaction logic to arousal while excluding content valence, external setting, and processing-task explanations.',
      learningObjectiveId: 'cognitive-state-dependent-retrieval-versus-related-context-effects',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'mood-congruent-content-substitution',
        'external-context-substitution',
        'transfer-appropriate-processing-substitution'
      ]
    },
    {
      id: 'eppp-v3-intervention-060',
      expectedActionRank: 3,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Acceptance and Commitment Therapy (ACT) emphasizes:',
      prompt: 'A client says, “I must get rid of anxious thoughts before I apply for work.” The therapist invites the client to notice that the mind is producing this rule, make room for anxiety, identify a valued vocational direction, and submit one application. Which formulation best fits the intervention?',
      choices: [
        'It builds psychological flexibility through defusion and acceptance while supporting action in the service of a chosen value',
        'It uses cognitive disputation to prove the anxious prediction false before the client begins a behavioral assignment',
        'It uses exposure to reduce arousal to a preset level, after which vocational values can be introduced as motivation',
        'It interprets avoidance as a defense against unconscious conflict and links the job search to an early relational pattern'
      ],
      rationale: 'ACT aims to increase psychological flexibility: contacting present experience with openness and perspective while persisting or changing behavior in service of chosen values. Naming the mind\'s rule reflects defusion, making room for anxiety reflects acceptance, and applying for work reflects committed action. Symptom elimination or proving a thought false is not a prerequisite for valued action.',
      choiceRationales: [
        'ACT aims to increase psychological flexibility: contacting present experience with openness and perspective while persisting or changing behavior in service of chosen values. Naming the mind\'s rule reflects defusion, making room for anxiety reflects acceptance, and applying for work reflects committed action. Symptom elimination or proving a thought false is not a prerequisite for valued action.',
        'Traditional cognitive restructuring evaluates the evidence for a thought and develops a more proportionate appraisal. The therapist here changes how the client relates to the rule and supports behavior in the presence of anxiety rather than requiring a verdict that the prediction is false.',
        'Exposure may be incorporated functionally in ACT, but reduced arousal is not set as the gate that must be passed before meaningful action. Willing contact with discomfort while moving toward a value is the relevant process in the described assignment.',
        'A psychodynamic formulation might examine defensive function and recurring relational themes. The stated intervention instead uses present-focused perspective taking, willingness, values clarification, and a concrete behavioral commitment rather than interpretation of latent conflict.'
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC5509623/'
      ],
      sourceDetails: [
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5509623/',
          title: 'Acceptance and Commitment Therapy: A Transdiagnostic Behavioral Intervention for Mental Health and Medical Conditions',
          organization: 'Neurotherapeutics and PubMed Central',
          summary: 'This peer-reviewed review describes ACT as cultivating psychological flexibility through present-moment awareness, perspective taking, values, committed action, acceptance, and cognitive defusion across clinical and health contexts.',
          credibility: 'PubMed Central provides the U.S. National Library of Medicine full text of a peer-reviewed Neurotherapeutics article. Its explicit process descriptions directly support the applied distinctions in this ACT scenario.'
        }
      ],
      sourceCheck: 'The review presents defusion, acceptance, values, and committed action as interrelated psychological-flexibility processes and contrasts them with control or elimination of private events. Each element appears behaviorally in the scenario rather than as a definition-completion cue.',
      learningObjectiveId: 'intervention-act-flexibility-processes-in-valued-action',
      cognitiveProcess: 'application',
      distractorDesign: [
        'cognitive-disputation-prerequisite',
        'habituation-gate-for-valued-action',
        'psychodynamic-defense-interpretation'
      ]
    },
    {
      id: 'eppp-b016-cognitive-1',
      expectedActionRank: 4,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Transfer-appropriate processing predicts that memory improves when:',
      prompt: 'A methods-course final asks students to identify a design flaw in unfamiliar vignettes and justify a correction. Which preparation should receive a relative advantage from overlap in mental operations?',
      choices: [
        'Reread definitions of validity threats and highlight their key terms so conceptual descriptions receive concentrated study',
        'Analyze varied practice cases and explain a remedy so rehearsal approximates the reasoning demanded by the assessment',
        'Review the material in the classroom where the final will occur so surrounding physical cues remain available',
        'Recreate the same level of physiological activation used during review so the learner\'s internal condition is reinstated'
      ],
      rationale: 'Transfer-appropriate processing predicts that memory benefits when the cognitive operations engaged during encoding overlap with those required at retrieval. A sound-based test can therefore favor prior phonological judgments over deeper semantic study for that outcome. Same-room and same-state manipulations concern contextual or state-dependent retrieval rather than operation compatibility.',
      choiceRationales: [
        'Semantic elaboration often supports later memory, particularly when the test requires meaning-based discrimination. Transfer-appropriate processing qualifies a depth-only prediction: on a sound-based test, a phonological study operation can have the closer functional match.',
        'Transfer-appropriate processing predicts that memory benefits when the cognitive operations engaged during encoding overlap with those required at retrieval. A sound-based test can therefore favor prior phonological judgments over deeper semantic study for that outcome. Same-room and same-state manipulations concern contextual or state-dependent retrieval rather than operation compatibility.',
        'Returning to the same room may reinstate external contextual cues, but it does not specifically reproduce the phonological decision required by the quiz. This choice describes environmental context dependence rather than transfer between encoding and test operations.',
        'Reinstating physiological activation is a state-dependent-memory manipulation. It can affect access under some conditions, but it does not prepare the sound comparison that defines the requested transfer-appropriate-processing prediction.'
      ],
      references: [
        'https://doi.org/10.1016/S0022-5371(77)80016-9'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1016/S0022-5371(77)80016-9',
          title: 'Levels of Processing versus Transfer Appropriate Processing',
          organization: 'Journal of Verbal Learning and Verbal Behavior',
          summary: 'Morris, Bransford, and Franks compared semantic and rhyme-oriented encoding with standard and rhyming recognition tests, demonstrating that test performance depends on compatibility between acquisition and retrieval operations.',
          credibility: 'This DOI identifies the foundational peer-reviewed experiment that introduced the transfer-appropriate-processing account and directly demonstrated the semantic-versus-rhyme reversal used to support both revised items.'
        }
      ],
      sourceCheck: 'The experiment found that semantic acquisition performed better on a standard recognition test while rhyme acquisition performed better on a rhyming test. The item applies that operation-match principle and distinguishes it from external-context and internal-state reinstatement.',
      learningObjectiveId: 'cognitive-transfer-appropriate-study-operation-selection',
      cognitiveProcess: 'application',
      distractorDesign: [
        'semantic-depth-default',
        'environmental-context-substitution',
        'internal-state-substitution'
      ]
    },
    {
      id: 'eppp-v2-cognitive-affective-007',
      expectedActionRank: 5,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Transfer-appropriate processing theory states that memory is best when:',
      prompt: 'In an experiment, meaning-based study produces better standard recognition than rhyme-based study. On a rhyme-recognition test, however, the rhyme-study condition performs better. Which conclusion best explains this reversal?',
      choices: [
        'Encoding effectiveness is relative to the operations required at retrieval, so a less semantic task can outperform deeper study when the test recruits matching processes',
        'Phonological encoding creates a stronger memory trace than semantic encoding, but standard recognition obscures that general advantage',
        'The rhyme test is easier than standard recognition, making differences in study activity irrelevant to the observed interaction',
        'Recognition accuracy is determined by exposure duration, so the result implies that the rhyme-study trials lasted longer'
      ],
      rationale: 'The crossover supports transfer-appropriate processing: no encoding operation is superior independent of the later retrieval task. Semantic processing supports a meaning-oriented or standard recognition test, whereas rhyme processing supplies operations useful for a rhyming test. The interaction cannot be explained by a general phonological advantage, test difficulty alone, or inferred study time.',
      choiceRationales: [
        'The crossover supports transfer-appropriate processing: no encoding operation is superior independent of the later retrieval task. Semantic processing supports a meaning-oriented or standard recognition test, whereas rhyme processing supplies operations useful for a rhyming test. The interaction cannot be explained by a general phonological advantage, test difficulty alone, or inferred study time.',
        'A general phonological-strength account predicts rhyme study should lead across test formats, which contradicts the semantic advantage on standard recognition. The reversal instead indicates that the usefulness of the encoded operations changes with the retrieval demand.',
        'Overall test difficulty cannot explain why the relative ranking of the two encoding conditions reverses across test types. An interaction of study operation and retrieval demand, rather than a uniform easy-test benefit, is the critical result.',
        'The scenario provides no evidence that exposure duration differed, and study time would more naturally predict a main effect than the reported crossover. The theoretically informative feature is which mental operation was practiced and later recruited.'
      ],
      references: [
        'https://doi.org/10.1016/S0022-5371(77)80016-9'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1016/S0022-5371(77)80016-9',
          title: 'Levels of Processing versus Transfer Appropriate Processing',
          organization: 'Journal of Verbal Learning and Verbal Behavior',
          summary: 'Morris, Bransford, and Franks compared semantic and rhyme-oriented encoding with standard and rhyming recognition tests, demonstrating that test performance depends on compatibility between acquisition and retrieval operations.',
          credibility: 'This DOI identifies the foundational peer-reviewed experiment that introduced the transfer-appropriate-processing account and directly demonstrated the semantic-versus-rhyme reversal used to support both revised items.'
        }
      ],
      sourceCheck: 'The original study reported the precise reversal summarized in the scenario: semantic acquisition led on standard recognition, whereas rhyme acquisition led on rhyme recognition. The revised advanced item asks the learner to reject a depth-only account and interpret the interaction.',
      learningObjectiveId: 'cognitive-transfer-appropriate-processing-interaction-analysis',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'general-phonological-strength-error',
        'test-difficulty-main-effect-error',
        'unobserved-study-duration-explanation'
      ]
    },
    {
      id: 'eppp-b016-professional-1',
      expectedActionRank: 6,
      expectedAnswerIndex: 1,
      expectedPrompt: 'In a child-custody evaluation, a psychologist should primarily:',
      prompt: 'A parent privately retains a psychologist for a court-related custody evaluation and says, “Because I am paying, I expect you to help my side win.” What is the psychologist\'s most appropriate response?',
      choices: [
        'Treat the retaining parent as the advocacy client while disclosing in the report that the evaluation was privately funded',
        'Clarify the fair and impartial forensic function, resist outcome advocacy, monitor threats to objectivity, and honor the authorized referral scope',
        'Begin supportive therapy with the parent so a strong alliance can improve the accuracy and completeness of the forensic interviews',
        'Accept the parent\'s allegations as the working formulation, then seek information that documents the risks already identified'
      ],
      rationale: 'APA\'s 2022 custody-evaluation guidelines encourage psychologists to function as fair and impartial evaluators, remain alert to bias and conflicts, clarify roles, and conduct the work within the authorized scope. Payment by a party does not convert the evaluator into that party\'s advocate. Combining treatment and evaluation or organizing inquiry around a preferred outcome can compromise objectivity.',
      choiceRationales: [
        'Disclosure of the funding arrangement is important, but it does not authorize partisan advocacy from a custody evaluator. The professional function is to assist the legal decision maker with relevant psychological information, not to pursue the retaining party\'s desired result.',
        'APA\'s 2022 custody-evaluation guidelines encourage psychologists to function as fair and impartial evaluators, remain alert to bias and conflicts, clarify roles, and conduct the work within the authorized scope. Payment by a party does not convert the evaluator into that party\'s advocate. Combining treatment and evaluation or organizing inquiry around a preferred outcome can compromise objectivity.',
        'A therapeutic alliance serves a different purpose and carries different expectations about confidentiality, goals, and advocacy. Adding treatment to the forensic role risks a multiple relationship and may impair the evaluator\'s ability to assess competing claims fairly.',
        'Using one party\'s allegation as a conclusion to be documented invites confirmation bias. Allegations can guide appropriate lines of inquiry, but the evaluator should examine competing explanations and seek information that could support, qualify, or contradict them.'
      ],
      references: [
        'https://www.apa.org/practice/guidelines/child-custody-evaluations.pdf'
      ],
      sourceDetails: [
        {
          url: 'https://www.apa.org/practice/guidelines/child-custody-evaluations.pdf',
          title: 'Guidelines for Child Custody Evaluations in Family Law Proceedings',
          organization: 'American Psychological Association',
          summary: 'APA\'s 2022 professional guidelines address evaluator competence, scope, impartiality, role boundaries, culturally informed methods, information gathering, interpretation, and communication in custody-related forensic evaluations.',
          credibility: 'The American Psychological Association developed and adopted these guidelines through its professional policy process. They are the primary national psychology guidance for this practice area, while remaining aspirational and subordinate to governing law.'
        }
      ],
      sourceCheck: 'The 2022 APA guidelines direct custody evaluators to function fairly and impartially, monitor bias and conflicts, clarify professional roles, and stay within the authorized scope. The scenario tests that role boundary without treating the guideline as a jurisdiction-specific legal command.',
      learningObjectiveId: 'professional-custody-evaluator-impartial-role-and-bias-monitoring',
      cognitiveProcess: 'application',
      distractorDesign: [
        'payer-loyalty-advocacy-error',
        'therapy-forensic-role-conflict',
        'confirmation-bias-inquiry'
      ]
    },
    {
      id: 'eppp-b027-professional-4',
      expectedActionRank: 7,
      expectedAnswerIndex: 3,
      expectedPrompt: 'In a child-custody evaluation, the evaluator should primarily:',
      prompt: 'During a custody evaluation, one parent reports that the child is failing at school, while recent records and a teacher interview indicate stable performance. The evaluator has conducted one parent interview and no direct child assessment. What is the strongest next step?',
      choices: [
        'Give the parent\'s account greater weight because a caregiver has broader access to the child than a teacher or written record',
        'Average the conflicting claims into a moderate-severity conclusion and proceed to a parenting recommendation',
        'Report the discrepancy to the court as an issue the judge must resolve and omit further psychological analysis of the claim',
        'Develop competing hypotheses, gather proportionate information through relevant methods and sources, and limit conclusions to what the integrated evidence supports'
      ],
      rationale: 'A custody opinion should arise from a balanced, proportionate evaluation that addresses the referral questions, considers plausible alternatives, and integrates relevant information across methods and sources. A discrepancy is evidence to investigate, not a reason to privilege one informant, average incompatible claims, or stop analysis. Conclusions should state the limits created by unavailable or conflicting data.',
      choiceRationales: [
        'Parents can provide important longitudinal information, but proximity does not establish accuracy for a particular school-performance claim. School records, teacher observations, direct assessment, and contextual factors should be weighed for relevance and quality rather than ranked by role alone.',
        'Averaging narratives is not evidence integration because the claims may differ in definition, time period, setting, or reliability. The evaluator should clarify the discrepancy and test plausible explanations before expressing an opinion tied to the referral.',
        'The court decides the legal question, yet the evaluator remains responsible for analyzing psychological evidence within the authorized scope. Transparently reporting a discrepancy is necessary, but it does not replace reasonable efforts to investigate and explain its implications and limits.',
        'A custody opinion should arise from a balanced, proportionate evaluation that addresses the referral questions, considers plausible alternatives, and integrates relevant information across methods and sources. A discrepancy is evidence to investigate, not a reason to privilege one informant, average incompatible claims, or stop analysis. Conclusions should state the limits created by unavailable or conflicting data.'
      ],
      references: [
        'https://www.apa.org/practice/guidelines/child-custody-evaluations.pdf'
      ],
      sourceDetails: [
        {
          url: 'https://www.apa.org/practice/guidelines/child-custody-evaluations.pdf',
          title: 'Guidelines for Child Custody Evaluations in Family Law Proceedings',
          organization: 'American Psychological Association',
          summary: 'APA\'s 2022 professional guidelines address evaluator competence, scope, impartiality, role boundaries, culturally informed methods, information gathering, interpretation, and communication in custody-related forensic evaluations.',
          credibility: 'The American Psychological Association developed and adopted these guidelines through its professional policy process. They are the primary national psychology guidance for this practice area, while remaining aspirational and subordinate to governing law.'
        }
      ],
      sourceCheck: 'The APA guidelines emphasize proportionate information gathering, multiple relevant methods and sources, alternative hypotheses, transparent limits, and conclusions supported by the integrated record. This item tests evidence handling rather than repeating the separate impartial-role item.',
      learningObjectiveId: 'professional-custody-evaluation-conflicting-data-integration',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'caregiver-informant-priority',
        'claim-averaging-pseudo-integration',
        'judicial-deference-ends-analysis'
      ]
    },
    {
      id: 'eppp-v3-intervention-006',
      expectedActionRank: 8,
      expectedAnswerIndex: 3,
      expectedPrompt: 'Multisystemic Therapy (MST) for juvenile offenders targets:',
      prompt: 'A probation-involved adolescent is skipping school, spending time with delinquent peers, and living with inconsistent caregiver monitoring. Which plan best represents the multisystemic treatment model?',
      choices: [
        'Meet weekly in an office to build the adolescent\'s insight into motives while leaving family, peer, and school contingencies outside treatment',
        'Arrange residential placement to separate the adolescent from the social ecology before beginning family work after discharge',
        'Select a symptom-focused individual protocol and expect gains to spread to the family and school through the adolescent\'s improved self-control',
        'Map reciprocal drivers across home, peers, school, and community, then coordinate interventions in those settings while strengthening adult capacity to sustain change'
      ],
      rationale: 'MST uses a social-ecological formulation in which serious youth behavior is maintained by reciprocal influences across the individual, family, peer, school, and community systems. Treatment is intensive and home- and community-based, targets the specific fit factors sustaining referral behavior, coordinates with relevant stakeholders, and empowers caregivers to maintain change.',
      choiceRationales: [
        'Individual insight work in a clinic does not address the active contingencies identified across monitoring, peers, attendance, and community settings. MST assesses where the behavior occurs and intervenes directly in the linked ecology rather than bracketing those systems out.',
        'MST was designed as a community-based alternative for many youths at risk of placement. Removing the adolescent may sometimes be required for safety under other services, but separation followed by delayed family work does not represent the model described.',
        'A focused individual intervention may improve a selected skill, yet MST does not assume that change will diffuse from the adolescent to other systems. It directly modifies caregiver practices, peer access, school participation, and other identified drivers.',
        'MST uses a social-ecological formulation in which serious youth behavior is maintained by reciprocal influences across the individual, family, peer, school, and community systems. Treatment is intensive and home- and community-based, targets the specific fit factors sustaining referral behavior, coordinates with relevant stakeholders, and empowers caregivers to maintain change.'
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC4475575/'
      ],
      sourceDetails: [
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4475575/',
          title: 'Multisystemic Therapy for Externalizing Youth',
          organization: 'Child and Adolescent Psychiatric Clinics of North America and PubMed Central',
          summary: 'This peer-reviewed review describes MST as an intensive home- and community-based intervention that formulates reciprocal drivers across youth, family, peer, school, and community systems and empowers caregivers.',
          credibility: 'PubMed Central provides the U.S. National Library of Medicine full text of a peer-reviewed clinical review authored by MST researchers. It directly explains the social-ecological formulation, service setting, and analytic process tested here.'
        }
      ],
      sourceCheck: 'The review states that youth are embedded in reciprocal family, peer, school, and community systems and describes home-based work guided by fit factors and caregiver empowerment. The keyed plan operationalizes those features instead of merely listing system names.',
      learningObjectiveId: 'intervention-mst-social-ecological-fit-and-caregiver-agency',
      cognitiveProcess: 'application',
      distractorDesign: [
        'office-insight-isolation',
        'residential-removal-sequencing',
        'individual-change-generalization-assumption'
      ]
    }
  ]
};
