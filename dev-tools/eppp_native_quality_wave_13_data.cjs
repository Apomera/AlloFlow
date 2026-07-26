'use strict';

module.exports = {
  reviewedAt: '2026-07-25',
  reviewWave: 'eppp-native-quality-wave-13',
  warningCountsBefore: {
    totalItems: 1500,
    warningOnly: true,
    forbiddenAggregateChoices: 0,
    uniqueKeyStemLexicalLeakageCandidates: 161,
    asymmetricExtremeDistractorCandidates: 325,
    advancedDirectRecallCandidates: 23,
    semanticConceptDuplicatePairs: 262,
    semanticConceptDuplicateClusters: 125,
    editorialAnchorsWithActiveWarnings: 5,
    editorialAnchorsWithNoCurrentWarning: 5,
    priorityDocketItems: 20
  },
  revisions: [
    {
      id: 'eppp-b005-intervention-1',
      expectedActionRank: 1,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Which description best captures a culturally adapted evidence-based mental health intervention?',
      prompt: 'A clinic uses an empirically grounded exposure program with refugees who describe distress through local idioms, prefer involvement from relatives, and face transportation barriers. Which implementation best balances cultural responsiveness with treatment integrity?',
      choices: [
        'Translate the handouts into the preferred language but keep the examples, goals, scheduling, and decision process unchanged until outcome data show failure',
        'Preserve the supported change processes while collaboratively tailoring language, metaphors, examples, family participation, and delivery logistics to the clients served',
        'Replace the exposure tasks with supportive conversation chosen from assumptions about the cultural group, even when the individual client requests the original treatment goals',
        'Begin with the original format because research support establishes adequate fit, then discuss cultural meaning after the main symptom targets have improved'
      ],
      rationale: 'A culturally adapted evidence-based intervention can retain its supported therapeutic mechanisms while modifying language, explanatory models, examples, relationships, context, and delivery in response to the particular clients served. Collaborative individualization avoids both rigid manual use and stereotype-driven replacement of active treatment elements.',
      choiceRationales: [
        'Translation can improve access, and native-language delivery has been associated with better outcomes, but linguistic substitution by itself may leave explanatory meaning, family roles, barriers, and shared decisions untouched. The case supplies several relevant dimensions that warrant collaborative review.',
        'A culturally adapted evidence-based intervention can retain its supported therapeutic mechanisms while modifying language, explanatory models, examples, relationships, context, and delivery in response to the particular clients served. Collaborative individualization avoids both rigid manual use and stereotype-driven replacement of active treatment elements.',
        'Cultural responsiveness does not mean inferring a uniform treatment preference from group membership or discarding a supported mechanism by assumption. The clinician should elicit this person\'s meanings and preferences and make reasoned adaptations that retain a credible path to benefit.',
        'Research support estimates likely benefit under studied conditions; it does not establish that the original delivery format fits this setting or person. Deferring discussion of language, access, and cultural meaning can weaken engagement before the program has a fair opportunity to help.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/22122142/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/22122142/',
          title: 'Culturally Adapted Mental Health Intervention: A Meta-Analytic Review',
          organization: 'Psychotherapy, indexed by PubMed',
          summary: 'This meta-analysis synthesizes 76 studies of culturally adapted mental health interventions and reports beneficial average outcomes, including moderation by cultural targeting and client language.',
          credibility: 'PubMed indexes this peer-reviewed meta-analysis in an American Psychological Association journal; its multi-study synthesis directly evaluates outcomes associated with cultural adaptation.'
        }
      ],
      sourceCheck: 'The meta-analysis supports beneficial average outcomes for culturally adapted care and identifies language and client-specific cultural targeting as relevant moderators. It supports responsive adaptation but does not justify stereotypes or imply that any modification preserves an intervention\'s active mechanisms.',
      learningObjectiveId: 'intervention-cultural-adaptation-integrity-and-fit',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'translation-only-surface-adaptation',
        'stereotype-driven-mechanism-replacement',
        'evidence-label-rigid-implementation'
      ]
    },
    {
      id: 'eppp-b005-intervention-2',
      expectedActionRank: 2,
      expectedAnswerIndex: 3,
      expectedPrompt: 'For a child age 6 through 11 with diagnosed ADHD, which plan most closely matches the 2019 American Academy of Pediatrics guideline?',
      prompt: 'An eight-year-old has carefully assessed ADHD with substantial impairment at home and school. There are no treatment contraindications, and the family wants coordinated care. Which initial plan most closely follows the age-specific guideline?',
      choices: [
        'Start a classroom point system and academic accommodations, reserving medication and parent training for a later visit if school performance remains impaired',
        'Begin an approved medication with dose monitoring and provide general family education, treating formal parent and classroom behavior programs as optional enrichment',
        'Use parent training as the first treatment and consider medication after an adequate behavioral trial, applying the sequence recommended for preschool-aged children',
        'Offer an approved medication plus parent training and a behavioral classroom intervention, coordinate educational supports, and titrate using benefit and adverse-effect data'
      ],
      rationale: 'For children ages 6 through 11, the 2019 AAP guideline recommends an FDA-approved ADHD medication together with parent training in behavior management and/or a behavioral classroom intervention, with both behavioral components preferred when feasible. Educational supports are a necessary part of care, and medication should be titrated to maximize benefit with tolerable adverse effects.',
      choiceRationales: [
        'School interventions and accommodations are important parts of the plan, but this option postpones both medication and caregiver-focused behavioral treatment despite substantial cross-setting impairment. It therefore omits recommended components for this age group rather than coordinating them.',
        'Medication with systematic monitoring addresses a major guideline component, yet general education is not equivalent to evidence-based parent training, and the classroom program is not merely an extra. The combined plan better addresses impairment across the child\'s settings.',
        'Parent training before medication is the preferred first-line sequence for preschool-aged children, with medication considered under specified circumstances. Applying that sequence to an eight-year-old overlooks the distinct recommendation for elementary and middle-school ages.',
        'For children ages 6 through 11, the 2019 AAP guideline recommends an FDA-approved ADHD medication together with parent training in behavior management and/or a behavioral classroom intervention, with both behavioral components preferred when feasible. Educational supports are a necessary part of care, and medication should be titrated to maximize benefit with tolerable adverse effects.'
      ],
      references: [
        'https://doi.org/10.1542/peds.2019-2528'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1542/peds.2019-2528',
          title: 'Clinical Practice Guideline for the Diagnosis, Evaluation, and Treatment of Attention-Deficit/Hyperactivity Disorder in Children and Adolescents',
          organization: 'Pediatrics',
          summary: 'Attention-deficit/hyperactivity disorder (ADHD) is one of the most common neurobehavioral disorders of childhood and can profoundly affect children\'s academic achievement, well-being, and social interactions. The American Academy of Pediatrics first published clinical recommendations for evaluation and diagnosis of pediatric ADHD in 2000; recommendations for treatment followed in 2001.',
          credibility: 'The DOI provides a persistent link to the publisher metadata for this scholarly work. Evidentiary strength still depends on the publication type, methods, sample, analysis, and fit to the claim.'
        }
      ],
      sourceCheck: 'Key Action Statement 5b gives an age-specific recommendation for approved medication with parent training and/or classroom behavioral intervention, preferably both, and identifies educational supports as necessary. Key Action Statement 6 supports titration to benefit with tolerable adverse effects.',
      learningObjectiveId: 'intervention-pediatric-adhd-age-specific-multimodal-plan',
      cognitiveProcess: 'application',
      distractorDesign: [
        'school-supports-with-treatment-delay',
        'medication-plus-nonspecific-education',
        'preschool-sequence-age-misapplication'
      ]
    },
    {
      id: 'eppp-b013-lifespan-2',
      expectedActionRank: 3,
      expectedAnswerIndex: 3,
      expectedPrompt: 'An older pianist narrows the repertoire, practices selected pieces intensively, and adapts fingering after physical change. This illustrates:',
      prompt: 'An older concert pianist has chosen a smaller group of valued pieces and devotes extra rehearsal to them. Arthritis now limits a rapid passage. Which additional response most specifically illustrates compensation?',
      choices: [
        'Remove the technically demanding piece from the concert program and concentrate performance goals on the remaining selections',
        'Increase deliberate rehearsal of the difficult passage while continuing to use the established technique and performance setup',
        'Add several unfamiliar works to broaden the repertoire and distribute rehearsal time across the new performance goals',
        'Adopt a modified fingering pattern and an assistive key device that permit the passage to be performed despite reduced hand mobility'
      ],
      rationale: 'Within the selection-optimization-compensation model, compensation recruits an alternative means when a previously used capacity or method is no longer sufficient. Modified fingering and an assistive device substitute new means for the constrained technique, whereas narrowing goals reflects selection and added practice reflects optimization.',
      choiceRationales: [
        'Dropping the difficult piece in response to reduced capacity is loss-based selection: the performer changes the goal set to fit available resources. That may be adaptive, but it does not show the alternative means for preserving the original performance goal asked about here.',
        'Additional rehearsal invests resources to improve or maintain performance through the existing method, which illustrates optimization. Compensation becomes the more specific label when the pianist substitutes a different technique or external aid because the former means is constrained.',
        'Expanding the repertoire creates additional goals and spreads finite rehearsal resources, the reverse of the scenario\'s selective focus. It neither intensifies resources toward the chosen pieces nor introduces an alternative way to manage the arthritis-related loss.',
        'Within the selection-optimization-compensation model, compensation recruits an alternative means when a previously used capacity or method is no longer sufficient. Modified fingering and an assistive device substitute new means for the constrained technique, whereas narrowing goals reflects selection and added practice reflects optimization.'
      ],
      references: [
        'https://doi.org/10.1017/CBO9780511665684.003'
      ],
      sourceDetails: [
        {
          url: 'https://doi.org/10.1017/CBO9780511665684.003',
          title: 'Psychological perspectives on successful aging: The model of selective optimization with compensation',
          organization: 'Successful Aging',
          summary: 'This scholarly work focuses on Psychological perspectives on successful aging: the model of selective optimization with compensation. The chapter develops selection, optimization, and compensation as coordinated processes for adapting goals and means across the lifespan.',
          credibility: 'The DOI provides a persistent link to the publisher metadata for this scholarly work. Evidentiary strength still depends on the publication type, methods, sample, analysis, and fit to the claim.'
        }
      ],
      sourceCheck: 'The foundational model distinguishes selection of goals, optimization of goal-relevant means, and compensation through alternative means after loss. The scenario already supplies selection and optimization, so the keyed adaptation isolates compensation rather than merely naming the full model.',
      learningObjectiveId: 'lifespan-soc-distinguish-compensation-from-selection-optimization',
      cognitiveProcess: 'application',
      distractorDesign: [
        'loss-based-selection-substitution',
        'optimization-substitution',
        'goal-expansion-resource-dilution'
      ]
    },
    {
      id: 'eppp-b017-research-1',
      expectedActionRank: 4,
      expectedAnswerIndex: 0,
      expectedPrompt: 'In an APA-style empirical report, the Method section should enable readers to understand:',
      prompt: 'A reviewer cannot determine who entered a behavioral trial, how the outcome was operationalized, or how people reached each condition. Which revision most directly improves transparent evaluation and reproducibility?',
      choices: [
        'Add eligibility and sample characteristics, measurement definitions and quality, the research design and assignment process, and stepwise data-collection procedures',
        'Expand the opening literature review so readers can infer the likely protocol from studies that used similar constructs and interventions',
        'Add a fuller interpretation of effect sizes and alternative explanations after the statistical findings have been presented',
        'Move the primary tables into the narrative and describe each numerical result in prose before discussing its theoretical importance'
      ],
      rationale: 'APA journal-article reporting standards call for transparent description of the sample and selection process, measures and their psychometric properties, design, assignment, and procedures. Adding those details to the methodological account lets readers evaluate how observations were generated and supports replication; more background or interpretation cannot substitute for them.',
      choiceRationales: [
        'APA journal-article reporting standards call for transparent description of the sample and selection process, measures and their psychometric properties, design, assignment, and procedures. Adding those details to the methodological account lets readers evaluate how observations were generated and supports replication; more background or interpretation cannot substitute for them.',
        'Prior literature establishes context and motivates hypotheses, but readers should not have to reconstruct this study\'s sample, measures, assignment, or procedure by analogy. Similar studies can differ on implementation details that materially affect validity and reproducibility.',
        'Effect-size interpretation and competing explanations belong in results and discussion reporting and help readers understand meaning and limitations. They do not reveal the missing operational details needed to judge measurement, allocation, and data collection.',
        'Tables and narrative results can make findings easier to inspect, yet rearranging the outcome display leaves the data-generating process obscure. Transparency requires reporting how participants, conditions, measures, and procedures produced those values.'
      ],
      references: [
        'https://apastyle.apa.org/jars/quantitative'
      ],
      sourceDetails: [
        {
          url: 'https://apastyle.apa.org/jars/quantitative',
          title: 'Journal Article Reporting Standards for Quantitative Research',
          organization: 'American Psychological Association',
          summary: 'The APA Style JARS-Quant resource specifies information for quantitative reports, including participant characteristics and sampling, measurement quality, research design, assignment, data collection, analyses, and transparency practices.',
          credibility: 'This is the American Psychological Association\'s official reporting-standard resource for quantitative psychology manuscripts. It is authoritative for APA reporting expectations and directly addresses the methodological details tested by the item.'
        }
      ],
      sourceCheck: 'JARS-Quant explicitly calls for participant characteristics and sampling procedures, measures and psychometric information, research design and assignment, and data-collection procedures. These elements directly repair the omissions in the scenario and serve evaluation and reproducibility.',
      learningObjectiveId: 'research-method-reporting-transparency-and-reproducibility',
      cognitiveProcess: 'application',
      distractorDesign: [
        'literature-review-as-method-proxy',
        'discussion-interpretation-substitution',
        'results-presentation-substitution'
      ]
    },
    {
      id: 'eppp-b025-lifespan-1',
      expectedActionRank: 5,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Which statement about gender identity development is most accurate?',
      prompt: 'A trainee is reviewing a child\'s self-description, clothing preferences, peer attractions, and distress about social expectations. Which interpretation applies the concepts most accurately?',
      choices: [
        'The child\'s internal sense of gender concerns identity; outward presentation concerns expression, attraction concerns orientation, and clinically relevant distress requires separate assessment',
        'The child\'s clothing and hairstyle establish identity directly, while the child\'s self-description is better classified as a form of social expression',
        'The child\'s preferred pronouns identify sexual orientation, whereas attraction patterns indicate whether identity corresponds with assigned sex',
        'Any difference between internal experience and assigned sex constitutes a disorder, even when the child reports neither distress nor functional impairment'
      ],
      rationale: 'Gender identity concerns a person\'s internal sense of self in relation to gender, while gender expression is outward presentation and sexual orientation concerns patterns of attraction. These dimensions are related but not interchangeable. Gender diversity itself is not a mental disorder; distress or impairment is a separate clinical consideration.',
      choiceRationales: [
        'Gender identity concerns a person\'s internal sense of self in relation to gender, while gender expression is outward presentation and sexual orientation concerns patterns of attraction. These dimensions are related but not interchangeable. Gender diversity itself is not a mental disorder; distress or impairment is a separate clinical consideration.',
        'Clothing and hairstyle are forms of outward presentation and may or may not align with customary expectations, but they do not determine another person\'s internal identity. The child\'s own self-understanding provides information about identity rather than merely appearance.',
        'Pronouns can communicate identity or respectful social recognition, but they do not establish whom a person is romantically or sexually attracted to. Attraction and identity describe different dimensions, so reversing their indicators produces a category error.',
        'A difference between experienced gender and assigned sex does not by itself establish psychopathology. Clinical assessment distinguishes identity from possible dysphoria and evaluates whether incongruence is associated with significant distress or impairment.'
      ],
      references: [
        'https://www.apa.org/topics/lgbt/transgender'
      ],
      sourceDetails: [
        {
          url: 'https://www.apa.org/topics/lgbt/transgender',
          title: 'Understanding Transgender People, Gender Identity and Gender Expression',
          organization: 'American Psychological Association',
          summary: 'The APA resource distinguishes internal gender identity from outward gender expression and sexual orientation, describes varied pathways of awareness and expression, and explains that transgender identity is not itself a mental disorder.',
          credibility: 'This is an official American Psychological Association educational resource grounded in professional definitions and psychological guidance. It directly supports the conceptual distinctions and nonpathologizing interpretation required by the item.'
        }
      ],
      sourceCheck: 'The APA resource distinguishes identity, expression, and orientation; notes that experiences and awareness vary; and explains that identity is not itself a disorder. The item therefore tests accurate classification while reserving clinical conclusions for separate assessment of distress or impairment.',
      learningObjectiveId: 'lifespan-gender-concepts-differential-interpretation',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'expression-as-identity-determinant',
        'orientation-identity-reversal',
        'identity-difference-pathologization'
      ]
    },
    {
      id: 'eppp-b026-lifespan-3',
      expectedActionRank: 6,
      expectedAnswerIndex: 2,
      expectedPrompt: 'Object permanence is demonstrated when an infant:',
      prompt: 'During a developmental assessment, which behavior provides the clearest evidence that an infant maintains a representation after direct sensory access is interrupted?',
      choices: [
        'Reaches toward a preferred toy while it remains visible and changes direction as the examiner moves it across the table',
        'Removes a cloth after watching the examiner model that action, then attends to a different visible object beside the hiding location',
        'After a brief delay, lifts the covering at the location where the toy disappeared and retrieves the concealed toy',
        'Chooses the taller beaker after the examiner pours the same amount of liquid from a short, wide container into it'
      ],
      rationale: 'Searching at the location where a fully occluded toy disappeared provides behavioral evidence that the infant represents the object as continuing to exist out of sight. Search performance also depends on memory, motor control, inhibition, delay, and task design, so it is evidence about the construct rather than a pure or all-at-once measure.',
      choiceRationales: [
        'Visually guided reaching shows perception and action toward an available target, but the toy remains continuously accessible to vision. The behavior therefore does not require the infant to maintain and act on information about an occluded object.',
        'Imitating removal of a cloth can demonstrate social learning or means-end action, yet attending elsewhere supplies no evidence that the infant expects the concealed toy to persist at its hiding place. The modeled motor action and the target representation must be distinguished.',
        'Searching at the location where a fully occluded toy disappeared provides behavioral evidence that the infant represents the object as continuing to exist out of sight. Search performance also depends on memory, motor control, inhibition, delay, and task design, so it is evidence about the construct rather than a pure or all-at-once measure.',
        'Selecting the taller beaker after a perceptual transformation is associated with failure on a liquid-conservation task, a later-developing issue in Piagetian theory. It does not test whether a currently unseen object is represented as persisting.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/25364086/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/25364086/',
          title: 'New Findings on Object Permanence: A Developmental Difference Between Two Types of Occlusion',
          organization: 'British Journal of Developmental Psychology and PubMed',
          summary: 'This study examines manual search for fully occluded objects in infants and shows that performance differs by the type of hiding event, supporting a gradual and task-sensitive account rather than a single abrupt attainment.',
          credibility: 'PubMed provides the National Library of Medicine record for this peer-reviewed developmental study. Its direct manipulation of hiding events and observed search behavior closely match the inference and qualification tested here.'
        }
      ],
      sourceCheck: 'The study operationalizes object permanence through manual search for fully hidden objects and shows that performance varies across occlusion conditions and ages. This supports keyed search behavior while cautioning against interpreting one response as a context-free developmental switch.',
      learningObjectiveId: 'lifespan-object-permanence-behavioral-inference',
      cognitiveProcess: 'application',
      distractorDesign: [
        'visible-target-perception',
        'modeled-means-end-action-without-search',
        'conservation-task-substitution'
      ]
    },
    {
      id: 'eppp-v2-biological-014',
      expectedActionRank: 7,
      expectedAnswerIndex: 1,
      expectedPrompt: 'Complete the statement: Neurogenesis in the adult brain primarily occurs in:',
      prompt: 'Researchers identify cells at successive stages from progenitor proliferation through early neuron development in dentate-gyrus tissue from adult primates. Which inference is most defensible?',
      choices: [
        'The cellular sequence establishes that increasing new-neuron production would cause a proportional improvement in episodic memory for adult humans',
        'The findings support continuing hippocampal neuron generation and maturation in adulthood, while its rate and psychological function require further study',
        'The findings show comparable neuron replacement across neocortical regions because hippocampal markers generalize to other adult brain tissue',
        'The dentate-gyrus pattern demonstrates that lateral-ventricle progenitors supply a large stream of new olfactory-bulb neurons in adult humans'
      ],
      rationale: 'A developmental continuum of proliferating progenitors, immature neurons, and maturing neurons in the adult dentate gyrus supports ongoing hippocampal neurogenesis. It does not by itself establish a causal amount of cognitive benefit or broad neuron replacement elsewhere, and the rate and functional significance in adult humans remain active research questions.',
      choiceRationales: [
        'Cell-stage evidence supports the existence of a biological process but does not manipulate that process or measure a proportional memory response. A causal cognitive claim would require converging experimental or longitudinal evidence that separates neurogenesis from related plasticity.',
        'A developmental continuum of proliferating progenitors, immature neurons, and maturing neurons in the adult dentate gyrus supports ongoing hippocampal neurogenesis. It does not by itself establish a causal amount of cognitive benefit or broad neuron replacement elsewhere, and the rate and functional significance in adult humans remain active research questions.',
        'Evidence obtained from the dentate gyrus is region-specific and cannot be projected to comparable neuronal replacement throughout the neocortex. Adult neurogenesis research instead emphasizes restricted niches and uncertainty about generalization across brain regions and species.',
        'The observation concerns a hippocampal lineage and supplies no tracing evidence from lateral-ventricle progenitors to the human olfactory bulb. Findings from other mammals cannot be inserted into this adult-primate tissue result as though the pathway were measured here.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/39558003/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/39558003/',
          title: 'Hippocampal Neurogenesis in Adult Primates: A Systematic Review',
          organization: 'Molecular Psychiatry and PubMed',
          summary: 'This systematic review evaluates primary studies of adult-primate hippocampal neurogenesis and reports converging evidence for newly generated dentate-gyrus neurons that mature and integrate, while identifying heterogeneous measures and unresolved functional questions.',
          credibility: 'PubMed provides the National Library of Medicine record for a recent peer-reviewed systematic review with an explicit multi-database search and study criteria. Its primate focus directly addresses the human-generalization problem in the original item.'
        }
      ],
      sourceCheck: 'The systematic review reports robust converging evidence for adult-primate dentate-gyrus neurogenesis that declines with age, while heterogeneity limits quantitative synthesis and neuropsychological function needs better characterization. The revised key preserves that evidentiary boundary.',
      learningObjectiveId: 'biological-adult-neurogenesis-evidence-and-inference-limits',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'cellular-evidence-to-cognitive-causation',
        'regional-evidence-to-neocortical-generalization',
        'cross-species-olfactory-pathway-importation'
      ]
    },
    {
      id: 'eppp-v2-biological-041',
      expectedActionRank: 8,
      expectedAnswerIndex: 0,
      expectedPrompt: 'Complete the statement: Prosopagnosia (face blindness) results from damage to:',
      prompt: 'After a right posterior cerebral infarct, a patient has adequate visual acuity, describes individual facial features, and recognizes familiar people by voice but not by face. Which interpretation best fits the pattern?',
      choices: [
        'The lesion disrupted a distributed face-processing network commonly linked to occipitotemporal and fusiform regions rather than producing a general loss of vision or person knowledge',
        'The lesion primarily impaired amygdala threat learning, so difficulty reading fearful expressions accounts for the broad failure to identify familiar faces',
        'The lesion erased hippocampal autobiographical memories for familiar people, while perceptual analysis of each face remains sufficient for recognition',
        'The lesion impaired speech production in the dominant inferior frontal region, preventing the patient from naming people whose faces are otherwise recognized'
      ],
      rationale: 'Acquired prosopagnosia can follow lesions in different parts of a distributed face-recognition network, often involving occipitotemporal and fusiform regions or areas connected with them. Preserved acuity, feature description, and recognition by voice argue against general visual loss or erased person knowledge. The disorder should not be reduced to one necessary lesion site.',
      choiceRationales: [
        'Acquired prosopagnosia can follow lesions in different parts of a distributed face-recognition network, often involving occipitotemporal and fusiform regions or areas connected with them. Preserved acuity, feature description, and recognition by voice argue against general visual loss or erased person knowledge. The disorder should not be reduced to one necessary lesion site.',
        'The amygdala contributes to processing affective salience and facial emotion, and a selective deficit there could impair interpretation of expressions. The described problem spans familiar-identity recognition despite access to facial features, making an affect-learning account too narrow.',
        'Hippocampal damage can impair episodic learning and retrieval, but successful identification by voice indicates that person-related knowledge remains accessible through another route. The modality-specific failure points to face processing rather than wholesale loss of familiar-person memories.',
        'Dominant inferior frontal injury can disrupt speech production and naming, yet the patient\'s deficit is recognition through faces rather than verbal output. A person recognized nonvisually but not facially shows a perceptual-recognition dissociation, not merely anomia.'
      ],
      references: [
        'https://pubmed.ncbi.nlm.nih.gov/31740940/'
      ],
      sourceDetails: [
        {
          url: 'https://pubmed.ncbi.nlm.nih.gov/31740940/',
          title: 'Looking Beyond the Face Area: Lesion Network Mapping of Prosopagnosia',
          organization: 'Brain and PubMed',
          summary: 'This lesion-network study identifies prosopagnosia-causing lesions across multiple locations and shows that their connectivity to right fusiform and left frontal regions predicts the syndrome, supporting a distributed-network account.',
          credibility: 'PubMed provides the National Library of Medicine record for this peer-reviewed Brain article. The systematic lesion search, network mapping, and independent validation directly test whether prosopagnosia reduces to damage at one anatomical site.'
        }
      ],
      sourceCheck: 'The study found that many causal lesions did not intersect the right fusiform face area but shared a characteristic connectivity pattern, supporting a distributed network. The revised answer therefore mentions common right occipitotemporal involvement without claiming a universal single lesion.',
      learningObjectiveId: 'biological-prosopagnosia-network-localization-differential',
      cognitiveProcess: 'analysis',
      distractorDesign: [
        'amygdala-affect-processing-substitution',
        'hippocampal-person-memory-substitution',
        'broca-anomia-substitution'
      ]
    }
  ]
};
