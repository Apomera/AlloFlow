'use strict';

module.exports = {
  reviewedAt: '2026-07-25',
  reviewWave: 'eppp-native-quality-wave-15',
  warningCountsBefore: {
    totalItems: 1500,
    warningOnly: true,
    forbiddenAggregateChoices: 0,
    uniqueKeyStemLexicalLeakageCandidates: 149,
    asymmetricExtremeDistractorCandidates: 309,
    advancedDirectRecallCandidates: 19,
    semanticConceptDuplicatePairs: 262,
    semanticConceptDuplicateClusters: 125,
    editorialAnchorsWithActiveWarnings: 5,
    editorialAnchorsWithNoCurrentWarning: 5,
    priorityDocketItems: 20
  },
  revisions: [
    {
      id: 'eppp-v2-lifespan-031',
      expectedActionRank: 1,
      expectedAnswerIndex: 3,
      expectedPrompt: 'Which feature most clearly characterizes Secure attachment (Type B)?',
      prompt: 'In the Strange Situation, an infant explores while the caregiver is present, becomes distressed during separation, approaches the caregiver on reunion, accepts comfort, and then returns to exploration. Which classification best fits this organized pattern?',
      choices: [
        'An insecure-resistant pattern, because contact seeking is accompanied by persistent anger and difficulty settling after reunion',
        'An insecure-avoidant pattern, because attention is redirected toward toys while proximity and contact with the caregiver are minimized',
        'A disorganized pattern, because reunion behavior lacks a coherent strategy and includes freezing, apprehension, or contradictory movements',
        'A secure pattern, because proximity seeking is effective and distress regulation restores engagement with toys'
      ],
      rationale: 'The sequence is characteristic of secure attachment in the Strange Situation: the infant uses the caregiver as a base for exploration, seeks the caregiver when the attachment system is activated, is comforted on reunion, and can resume exploration. Classification depends on the organization of behavior across the procedure, especially reunion, rather than on separation distress by itself.',
      choiceRationales: [
        'Insecure-resistant infants commonly seek contact yet remain angry, resistant, or difficult to soothe, so reunion does not efficiently restore exploration. The infant described accepts comfort and returns to play, which shows a different organization of attachment behavior.',
        'Insecure-avoidant behavior is marked by relative avoidance of proximity, contact, or interaction during reunion, even though physiological arousal may still be present. Active approach, effective soothing, and renewed exploration do not fit that minimizing strategy.',
        'Disorganized attachment is coded when behavior lacks a coherent strategy, such as contradictory sequences, freezing, apprehension toward the caregiver, or disoriented actions. The scenario instead presents a coordinated progression from exploration to comfort seeking and back.',
        'The sequence is characteristic of secure attachment in the Strange Situation: the infant uses the caregiver as a base for exploration, seeks the caregiver when the attachment system is activated, is comforted on reunion, and can resume exploration. Classification depends on the organization of behavior across the procedure, especially reunion, rather than on separation distress by itself.'
      ],
      references: [
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC11169091/'
      ],
      sourceDetails: [
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11169091/',
          title: 'The Predictive Validity of the Strange Situation Procedure: Evidence from Registered Analyses of Two Landmark Longitudinal Studies',
          organization: 'Child Development and PubMed Central',
          summary: 'This peer-reviewed registered analysis describes Strange Situation attachment classifications as the organization of infant behavior around a caregiver, including use of the caregiver for exploration and comfort after separation-related distress.',
          credibility: 'PubMed Central is the U.S. National Library of Medicine full-text archive, and Child Development is a peer-reviewed developmental-science journal. The article directly defines the assessment procedure and the secure-base and safe-haven behaviors tested here.'
        }
      ],
      sourceCheck: 'The article describes classification as the organization of attachment behavior around the caregiver and identifies secure-base exploration and comfort following separation as central features. The revised scenario requires integrating those observations rather than treating distress alone as diagnostic.',
      learningObjectiveId: 'lifespan-secure-attachment-organized-reunion-pattern',
      cognitiveProcess: 'application',
      distractorDesign: [
        'resistant-contact-seeking-with-failed-soothing',
        'avoidant-proximity-minimization',
        'disorganized-coherence-breakdown'
      ]
    },
    {
      id: 'eppp-v2-lifespan-048',
      expectedActionRank: 2,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Havighurst\'s developmental tasks are:',
      prompt: 'A program treats adjustment to retirement as a biologically timed achievement that should look the same across communities. From Havighurst\'s developmental-task perspective, which critique is most accurate?',
      choices: [
        'The task is age-linked, but its demands emerge from interacting physical changes, social expectations, and personal values, so its expression can vary by context',
        'The task is the resolution of a psychosocial polarity whose successful outcome produces the ego strength of wisdom in later life',
        'The task follows a maturational timetable, while cultural expectations influence how success is rewarded after the task has been completed',
        'The task reflects a change in information-processing capacity that appears when a person enters a qualitatively new cognitive stage'
      ],
      rationale: 'Havighurst described developmental tasks as age-linked challenges arising from physical maturation, sociocultural pressures, and individual values or aspirations. Retirement may therefore be a salient later-life task in a given setting, but neither its meaning nor its successful performance is reducible to biology or expected to take one form across communities.',
      choiceRationales: [
        'Havighurst described developmental tasks as age-linked challenges arising from physical maturation, sociocultural pressures, and individual values or aspirations. Retirement may therefore be a salient later-life task in a given setting, but neither its meaning nor its successful performance is reducible to biology or expected to take one form across communities.',
        'A psychosocial polarity that yields an ego strength belongs to Erikson\'s stage theory; integrity versus despair is associated with wisdom. Havighurst instead framed concrete age-related tasks as products of biological, social, and personal sources that shape readiness and expectations.',
        'Physical maturation is one source in the framework, but social expectations and personal aspirations help constitute a developmental task rather than merely rewarding it afterward. The proposed program incorrectly makes biology the independent timetable and culture a secondary consequence.',
        'Qualitative shifts in reasoning are associated with cognitive-stage approaches such as Piaget\'s. Havighurst\'s framework addresses socially and personally meaningful challenges across the life span, not a structural change in cognitive operations that defines retirement readiness.'
      ],
      references: [
        'https://doi.org/10.1177/21676968251322822'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1177/21676968251322822',
          title: 'Building Bridges Between Arnett\'s and Havighurst\'s Theories: New Developmental Tasks in Emerging Adulthood Across Six Countries',
          organization: 'Emerging Adulthood and SAGE Publications',
          summary: 'This peer-reviewed cross-national article explains Havighurst\'s developmental tasks as age-graded challenges produced by biological pressures, sociocultural expectations, and individual psychological needs or competencies.',
          credibility: 'The DOI identifies a peer-reviewed article that explicitly reconstructs Havighurst\'s three-source framework and examines its cultural application across six countries. It is suitable for distinguishing the theory from biological or stage-only accounts.'
        }
      ],
      sourceCheck: 'The article characterizes developmental tasks as arising through the interaction of physical maturation, sociocultural pressures, and the individual. The keyed critique preserves age linkage while rejecting a uniform biological timetable, which is the central conceptual distinction in the scenario.',
      learningObjectiveId: 'lifespan-havighurst-three-sources-contextual-application',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'erikson-ego-strength-substitution',
        'maturation-primary-culture-secondary-error',
        'piagetian-stage-substitution'
      ]
    },
    {
      id: 'eppp-v2-professional-035',
      expectedActionRank: 3,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Plagiarism in academic and scientific work is:',
      prompt: 'A psychologist copies several sentences from another researcher into a grant narrative, rearranges a few clauses, and lists the article in the bibliography but gives no quotation or attribution where the language appears. Which ethical analysis is most accurate?',
      choices: [
        'Plagiarism under Standard 8.11, because minor syntactic revision and a reference-list entry do not convert borrowed prose into original work',
        'The matter is primarily a publication-credit dispute because the cited researcher should be offered authorship on the grant application',
        'The conduct is duplicate publication because material from a prior article has been included in a new written product submitted for review',
        'The conduct is data fabrication because changing the sentence structure creates a record that cannot be traced to the original wording'
      ],
      rationale: 'APA Ethics Code Standard 8.11 prohibits psychologists from presenting portions of another person\'s work or data as their own, even when the source is cited elsewhere. Rearranging clauses does not make copied expression original, and a bibliography entry does not tell the reader which language was borrowed. Publication credit, duplicate publication, and fabrication address different research-integrity problems.',
      choiceRationales: [
        'APA Ethics Code Standard 8.11 prohibits psychologists from presenting portions of another person\'s work or data as their own, even when the source is cited elsewhere. Rearranging clauses does not make copied expression original, and a bibliography entry does not tell the reader which language was borrowed. Publication credit, duplicate publication, and fabrication address different research-integrity problems.',
        'Publication credit concerns whether authorship and other credit accurately reflect scientific or professional contributions. Copying unattributed prose is not corrected by offering authorship, and the source researcher need not become a grant author merely because the psychologist misused the researcher\'s language.',
        'Duplicate publication concerns publishing data as original after those data have already been published. The problem here is attribution of another author\'s expression in a grant narrative, so applying the duplicate-publication label misses both the source of the language and the relevant standard.',
        'Fabrication involves making up data or results rather than borrowing prose and obscuring its origin. Rewording portions of copied sentences may make the plagiarism harder to notice, but it does not transform the conduct into creation of fictitious observations or a false data set.'
      ],
      references: [
        'https://www.apa.org/ethics/code#8_11'
      ],
      sourceDetails: [
        {
          url: 'https://www.apa.org/ethics/code#8_11',
          title: 'Ethical Principles of Psychologists and Code of Conduct, Standard 8.11 Plagiarism',
          organization: 'American Psychological Association',
          summary: 'The official APA Ethics Code states that psychologists do not present portions of another person\'s work or data as their own, including situations in which the other source is cited elsewhere in the product.',
          credibility: 'The American Psychological Association issues and maintains the professional ethics code cited by the item. Its official code page is the primary source for Standard 8.11, although institutional rules and applicable law may impose additional obligations.'
        }
      ],
      sourceCheck: 'Standard 8.11 directly addresses presenting portions of another person\'s work as one\'s own and expressly prevents occasional citation from curing unattributed copying. The scenario separates that rule from authorship credit, duplicate publication, and fabrication.',
      learningObjectiveId: 'professional-plagiarism-local-attribution-versus-neighboring-research-standards',
      cognitiveProcess: 'application',
      distractorDesign: [
        'publication-credit-substitution',
        'duplicate-publication-substitution',
        'fabrication-substitution'
      ]
    },
    {
      id: 'eppp-v2-professional-057',
      expectedActionRank: 4,
      expectedAnswerIndex: 2,
      expectedPrompt: 'Complete the statement: Cultural competence in psychological practice requires:',
      prompt: 'A client says that family and community meanings of distress differ from assumptions built into the clinician\'s usual assessment. The clinician has relevant general competence but limited familiarity with the client\'s specific context. Which response best reflects culturally responsive practice?',
      choices: [
        'Administer the customary measure unchanged so technical consistency is preserved, then interpret the score from its published reference group',
        'Use descriptions of the client\'s cultural group to infer the family\'s beliefs, reducing questions that might place an explanatory burden on the client',
        'Use reflective self-examination, elicit how the client understands intersecting identities and ecology, assess the instrument\'s suitability, and consult or adapt when indicated',
        'Refer the client to a clinician from a similar background because shared group membership provides the most dependable basis for cultural understanding'
      ],
      rationale: 'APA\'s Multicultural Guidelines frame responsiveness as an ongoing process of self-examination, contextual knowledge, collaborative understanding, and culturally informed skill. The clinician should explore the client\'s own meanings and intersecting identities, consider whether assessment evidence transfers to the intended use, and use consultation or adaptation within professional competence rather than assuming sameness or stereotyping.',
      choiceRationales: [
        'Standardized administration may protect some score interpretations, but it does not establish that the reference group, constructs, or meaning of responses fit this client and purpose. Cultural responsiveness requires evaluating those limits and integrating contextual information rather than equating consistency with validity.',
        'Group-level scholarship can inform hypotheses, yet treating it as a substitute for the client\'s account risks stereotyping and obscures variation within cultural groups. Respectful collaborative inquiry shares responsibility for understanding rather than assigning a presumed script to the family.',
        'APA\'s Multicultural Guidelines frame responsiveness as an ongoing process of self-examination, contextual knowledge, collaborative understanding, and culturally informed skill. The clinician should explore the client\'s own meanings and intersecting identities, consider whether assessment evidence transfers to the intended use, and use consultation or adaptation within professional competence rather than assuming sameness or stereotyping.',
        'Referral may be indicated when needed expertise cannot be obtained or developed, but cultural difference by itself does not demonstrate incompetence. Shared identity also does not ensure an accurate understanding of this client, whose intersecting identities, preferences, and community contexts remain individual.'
      ],
      references: [
        'https://www.apa.org/about/policy/multicultural-guidelines.pdf#page=4'
      ],
      sourceDetails: [
        {
          url: 'https://www.apa.org/about/policy/multicultural-guidelines.pdf#page=4',
          title: 'Multicultural Guidelines: An Ecological Approach to Context, Identity, and Intersectionality',
          organization: 'American Psychological Association',
          summary: 'APA\'s official guidelines place psychological work in ecological context and call for awareness of the psychologist\'s attitudes, knowledge of intersecting identities, and culturally responsive application of research and practice.',
          credibility: 'The American Psychological Association developed and adopted these professional guidelines through its policy process. They are a primary source for the framework tested here, while functioning as aspirational guidance rather than jurisdictional law.'
        }
      ],
      sourceCheck: 'The guidelines emphasize self-awareness, intersectionality, ecological context, collaborative understanding, and culturally informed practice. The keyed response combines those elements while keeping consultation, measure evaluation, and adaptation conditional on the client and task.',
      learningObjectiveId: 'professional-cultural-responsiveness-self-awareness-context-assessment-fit',
      cognitiveProcess: 'application',
      distractorDesign: [
        'standardization-equals-validity-error',
        'group-knowledge-stereotype-substitution',
        'identity-matched-referral-default'
      ]
    },
    {
      id: 'eppp-v2-professional-068',
      expectedActionRank: 5,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Complete the statement: Recording therapy sessions requires:',
      prompt: 'A trainee wants to record a telehealth session for supervision. The client agreed to treatment, but recording was not discussed, and clinic policy and local law may add requirements. What should occur before the trainee activates recording?',
      choices: [
        'Proceed if the supervisor will access the file for training and the trainee plans to delete it after the supervision meeting',
        'Seek the client\'s or representative\'s permission in advance, then satisfy governing privacy, security, and documentation rules',
        'Record the session first, then seek permission before sharing the file so the client can decide whether supervisory review is acceptable',
        'Abandon the recording plan because therapeutic confidentiality makes supervision recordings incompatible with ethical psychological practice'
      ],
      rationale: 'APA Ethics Code Standard 4.03 requires psychologists to obtain permission from individuals or their legal representatives before recording their voices or images. General consent to therapy does not itself establish permission to record. The psychologist must also address applicable law and organizational requirements concerning consent form, purpose, access, storage, transmission, retention, and disposal.',
      choiceRationales: [
        'A limited training purpose and planned deletion reduce neither the need for prior permission nor the privacy risks created when the file is made. General treatment consent does not tell the client that a session will be recorded or who may later access that record.',
        'APA Ethics Code Standard 4.03 requires psychologists to obtain permission from individuals or their legal representatives before recording their voices or images. General consent to therapy does not itself establish permission to record. The psychologist must also address applicable law and organizational requirements concerning consent form, purpose, access, storage, transmission, retention, and disposal.',
        'Permission must precede creation of the recording, not merely its disclosure to a supervisor. Seeking approval afterward deprives the client of control over whether the voice or image is captured and leaves an unauthorized record even if the file is never shared.',
        'Confidentiality creates safeguards for recording and disclosure, but it does not make supervised recording inherently unethical. When prior permission is obtained and governing privacy, security, and organizational requirements are met, recording may be ethically permissible.'
      ],
      references: [
        'https://www.apa.org/ethics/code#4_03'
      ],
      sourceDetails: [
        {
          url: 'https://www.apa.org/ethics/code#4_03',
          title: 'Ethical Principles of Psychologists and Code of Conduct, Standard 4.03 Recording',
          organization: 'American Psychological Association',
          summary: 'The official APA Ethics Code states that psychologists obtain permission from individuals or their legal representatives before recording voices or images to which the professional services relate.',
          credibility: 'The American Psychological Association issues and maintains the professional ethics code cited by the item. Its official page is the primary source for Standard 4.03; applicable law, regulation, and organizational policy may add requirements.'
        }
      ],
      sourceCheck: 'Standard 4.03 establishes the narrow, stable ethical rule that permission is obtained before recording. The revised item preserves that rule and explicitly treats storage, documentation, and consent-form details as matters that may be supplemented by law and policy.',
      learningObjectiveId: 'professional-recording-prior-permission-and-jurisdictional-boundary',
      cognitiveProcess: 'application',
      distractorDesign: [
        'beneficial-purpose-implied-permission',
        'post-recording-permission-timing-error',
        'confidentiality-prohibition-overreach'
      ]
    },
    {
      id: 'eppp-v2-research-005',
      expectedActionRank: 6,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Complete the statement: Multiple regression allows researchers to:',
      prompt: 'A study has a continuous symptom-change score and three predictors: baseline severity, therapeutic alliance, and session attendance. The investigator wants the association between attendance and change after accounting for the other predictors. Which analysis best addresses that question, assuming model conditions are adequate?',
      choices: [
        'A repeated-measures analysis of variance comparing mean symptom scores across the three predictor categories',
        'Multiple linear regression with a joint predictor set and interpretation of the focal predictor\'s partial coefficient',
        'A Pearson correlation between attendance and symptom change, followed by separate correlations between change and the remaining predictors',
        'A chi-square test of independence using the raw symptom-change values as one variable and attendance counts as the other'
      ],
      rationale: 'Multiple linear regression models one quantitative response using two or more predictors. The attendance coefficient represents its estimated linear association with symptom change while the other predictors in the specified model are held constant. Interpretation still depends on coding, functional form, residual conditions, multicollinearity, design quality, and the distinction between adjusted association and causation.',
      choiceRationales: [
        'Repeated-measures ANOVA is designed around repeated outcome measurements and categorical conditions, not a continuous response predicted jointly by baseline severity, alliance, and attendance. Converting quantitative predictors to categories would discard information and would not directly estimate the requested adjusted slope.',
        'Multiple linear regression models one quantitative response using two or more predictors. The attendance coefficient represents its estimated linear association with symptom change while the other predictors in the specified model are held constant. Interpretation still depends on coding, functional form, residual conditions, multicollinearity, design quality, and the distinction between adjusted association and causation.',
        'The bivariate attendance correlation does not adjust for baseline severity or alliance, and a collection of separate correlations cannot recover the conditional coefficient from one joint model. It may therefore attribute shared predictor variation to attendance or conceal an adjusted relationship.',
        'A chi-square independence test is built for frequency counts in categories. Treating continuous change scores and attendance counts as category labels would not estimate a linear adjusted association and would fail to incorporate baseline severity and alliance in the requested comparison.'
      ],
      references: [
        'https://www.itl.nist.gov/div898/handbook/ppc/section4/ppc431.htm'
      ],
      sourceDetails: [
        {
          url: 'https://www.itl.nist.gov/div898/handbook/ppc/section4/ppc431.htm',
          title: 'Fitting Polynomial Models with Multiple Regression',
          organization: 'National Institute of Standards and Technology',
          summary: 'The NIST/SEMATECH e-Handbook presents regression models that relate one response to several explanatory terms, including main effects and interactions, and explains fitting those terms through multiple regression.',
          credibility: 'NIST is the United States federal measurement-science agency, and its statistical handbook is a technically reviewed governmental reference. This section directly supports selecting a joint regression model with several predictors.'
        }
      ],
      sourceCheck: 'The NIST handbook represents a response as a function of several explanatory variables and identifies multiple regression as the fitting framework. The revised scenario adds the crucial interpretation that one predictor is evaluated conditionally within the joint model, not through separate bivariate tests.',
      learningObjectiveId: 'research-multiple-regression-adjusted-predictor-association',
      cognitiveProcess: 'application',
      distractorDesign: [
        'repeated-measures-anova-substitution',
        'separate-bivariate-correlations-substitution',
        'chi-square-scale-mismatch'
      ]
    },
    {
      id: 'eppp-v2-social-cultural-050',
      expectedActionRank: 7,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Social norms influence behavior through:',
      prompt: 'A conservation study compares two messages: “Most guests in this hotel reuse their towels” and “Most guests in this hotel approve of reusing towels.” Which interpretation best distinguishes the normative information in the messages?',
      choices: [
        'The first conveys perceived typical conduct, whereas the second conveys perceived social approval; either can guide behavior when that norm is focal',
        'Both messages convey social approval because their persuasive purpose is to encourage the same conservation behavior',
        'The first conveys a personal moral obligation, whereas the second communicates the likelihood of a formal sanction for noncompliance',
        'The first reports a descriptive fact free of normative influence, whereas the second creates a norm by stating what the group values'
      ],
      rationale: 'Focus theory distinguishes descriptive norms, which concern what people commonly do, from injunctive norms, which concern what people approve or disapprove. The towel-reuse rate supplies descriptive information; reported approval supplies injunctive information. Each can influence conduct, particularly when attention makes the relevant norm salient, but they are not interchangeable.',
      choiceRationales: [
        'Focus theory distinguishes descriptive norms, which concern what people commonly do, from injunctive norms, which concern what people approve or disapprove. The towel-reuse rate supplies descriptive information; reported approval supplies injunctive information. Each can influence conduct, particularly when attention makes the relevant norm salient, but they are not interchangeable.',
        'A shared persuasive goal does not make the information psychologically equivalent. One message describes the prevalence of a behavior, while the other describes the group\'s approval, and focus theory predicts that these different normative meanings can produce different effects.',
        'A personal norm concerns an individual\'s own sense of obligation, which cannot be inferred from a statement about what hotel guests do. Injunctive influence may include anticipated social approval or disapproval, but it does not require a legal or organizational penalty.',
        'Information about what most group members do can itself operate as a descriptive norm by indicating adaptive or typical conduct. The distinction is not fact versus norm creation; it is perceived prevalence versus perceived approval within a relevant reference group.'
      ],
      references: [
        'https://doi.org/10.1037/0022-3514.58.6.1015'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1037/0022-3514.58.6.1015',
          title: 'A Focus Theory of Normative Conduct: Recycling the Concept of Norms to Reduce Littering in Public Places',
          organization: 'Journal of Personality and Social Psychology',
          summary: 'Cialdini, Reno, and Kallgren distinguish descriptive norms concerning what people commonly do from injunctive norms concerning what people approve, and examine how focusing normative information affects public behavior.',
          credibility: 'This DOI resolves to the foundational peer-reviewed empirical article that introduced the focus-theory distinction tested in the item. The article reports field experiments and directly defines the two types of normative information.'
        }
      ],
      sourceCheck: 'The foundational article separates the is meaning of descriptive norms from the ought or approval meaning of injunctive norms and argues that normative focus matters for behavior. The two messages instantiate that contrast without relying on extreme or obviously implausible alternatives.',
      learningObjectiveId: 'social-cultural-descriptive-versus-injunctive-message-application',
      cognitiveProcess: 'application',
      distractorDesign: [
        'shared-goal-collapses-norm-types',
        'personal-norm-and-formal-sanction-substitution',
        'descriptive-information-denies-normative-function'
      ]
    },
    {
      id: 'eppp-v2-research-014',
      expectedActionRank: 8,
      expectedAnswerIndex: 2,
      expectedPrompt: 'Complete the statement: Counterbalancing in within-subjects designs:',
      prompt: 'The same participants complete a memory task once in quiet and once with background speech. Half receive quiet first and half receive speech first. Performance tends to improve in the second session. What is the main design benefit of the assigned sequences?',
      choices: [
        'They make the sample representative of the target population by balancing the order in which participants were recruited',
        'They make the two observations from each participant statistically independent, permitting analysis as unrelated groups',
        'They distribute condition order across participants so the condition contrast is less confounded with practice, while leaving order effects available for examination',
        'They equate the groups on memory ability before testing, removing the need to account for correlated observations from the same participant'
      ],
      rationale: 'Counterbalancing varies condition sequence across participants so a treatment is not consistently paired with an earlier or later position. In this case, practice benefits are distributed across quiet and speech rather than attached to one condition. Counterbalancing does not make repeated observations independent or ensure that carryover vanishes; order and treatment-by-order effects may still require analysis.',
      choiceRationales: [
        'Counterbalancing concerns the sequence of experimental conditions after participants enter the study, not how the sample was recruited. Representativeness depends on the sampling process and target population, so alternating task order cannot repair a sampling limitation.',
        'Repeated scores from the same person remain correlated because they share participant characteristics, even when sequence is counterbalanced. Treating them as unrelated discards the defining dependence of a within-subjects design and can produce an inappropriate error model.',
        'Counterbalancing varies condition sequence across participants so a treatment is not consistently paired with an earlier or later position. In this case, practice benefits are distributed across quiet and speech rather than attached to one condition. Counterbalancing does not make repeated observations independent or ensure that carryover vanishes; order and treatment-by-order effects may still require analysis.',
        'Using each person in both conditions controls stable person differences through the within-subject comparison; sequence assignment serves a different purpose. It does not remove the correlation between repeated scores or eliminate the need for an analysis that represents that dependence.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/22799624/',
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC2981013/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/22799624/',
          title: 'Counterbalancing for Serial Order Carryover Effects in Experimental Condition Orders',
          organization: 'Psychological Methods and PubMed',
          summary: 'This peer-reviewed methods article explains why prior inputs can affect later responses in repeated-measures experiments and develops counterbalanced sequences that distribute serial order and carryover relationships.',
          credibility: 'PubMed provides the U.S. National Library of Medicine record for an APA Psychological Methods article devoted specifically to counterbalancing repeated-measures conditions. It directly supports the design purpose tested here.'
        },
        {
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2981013/',
          title: 'Counterbalancing in Smoking Cue Research: A Critical Analysis',
          organization: 'Nicotine and Tobacco Research and PubMed Central',
          summary: 'This peer-reviewed review evaluates counterbalanced cue studies and shows that sequence assignment may not fully address order effects when order interacts with treatment or other study variables.',
          credibility: 'PubMed Central supplies the full text of a methodological review grounded in applied experiments. Its analysis is directly relevant to the item\'s boundary that counterbalancing distributes order but does not prove carryover absent.'
        }
      ],
      sourceCheck: 'The methods article establishes counterbalancing as a response to serial order and carryover, while the critical review documents why unexamined order interactions may remain. The keyed choice therefore states both the intended control and the need to evaluate residual order effects.',
      learningObjectiveId: 'research-counterbalancing-purpose-and-residual-order-effects',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'sampling-representativeness-substitution',
        'independence-from-sequence-error',
        'matching-removes-repeated-dependence-error'
      ]
    }
  ]
};
