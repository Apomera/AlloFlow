'use strict';

const revisions = {
  'eppp-b013-biological-2': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'The original commissurotomy report and Gazzaniga\'s later review support the classic divided-visual-field dissociation: left-visual-field information reaches the right hemisphere, which can guide the left hand, while callosal disconnection prevents the usual left-hemisphere verbal report.',
    feedbackDesign: ['verbal-access-without-manual-access', 'ipsilateral-hand-selection', 'absence-of-recognition-inference'],
    prompt: 'In a classic complete-commissurotomy study, an adult with left-hemisphere-dominant speech fixates centrally while a picture of a key is flashed to the left visual field. Which response pattern was classically reported?',
    choices: {
      0: 'The participant says "key" but cannot select it with either hand',
      1: 'The participant cannot name it and selects it accurately with the right hand',
      2: 'The participant cannot name it but selects it accurately with the left hand',
      3: 'The participant reports no name and shows chance selection with both hands',
    },
    rationale: 'In the classic divided-visual-field paradigm, a briefly presented left-visual-field stimulus is initially available to the right hemisphere. With the major cerebral commissures sectioned, that information does not reach the usually left-lateralized speech system, but it can guide the left hand, which is controlled primarily by the right hemisphere. This task-specific dissociation does not establish that every person with callosotomy has identical capacities or two wholly independent conscious agents.',
    references: [
      'https://doi.org/10.1073/pnas.48.10.1765',
      'https://doi.org/10.1038/nrn1723',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1073/pnas.48.10.1765',
        title: 'Some Functional Effects of Sectioning the Cerebral Commissures in Man',
        organization: 'Proceedings of the National Academy of Sciences of the United States of America',
        summary: 'Gazzaniga, Bogen, and Sperry reported early human commissurotomy findings showing striking limits on transfer of sensory information between the cerebral hemispheres while hemisphere-specific responses remained possible.',
        credibility: 'This peer-reviewed 1962 article is a primary report from the investigators who established the modern human split-brain paradigm. It directly supports the classic dissociation tested here, although its very small and clinically unusual patient sample limits universal claims.',
      },
      {
        url: 'https://doi.org/10.1038/nrn1723',
        title: 'Forty-Five Years of Split-Brain Research and Still Going Strong',
        organization: 'Nature Reviews Neuroscience, Springer Nature',
        summary: 'Gazzaniga reviews the experimental evidence on hemispheric specialization, restricted interhemispheric transfer, and the integrative functions of the corpus callosum.',
        credibility: 'This peer-reviewed review was written by a principal investigator in the original program and synthesizes decades of converging work. It is authoritative for the historical paradigm while also emphasizing regional specificity and qualifications that a single early experiment cannot establish.',
      },
    ],
    qualityFlags: [
      'Wave 10 replaces a definition-level item with a lateralized visual-input, verbal-response, and manual-response application that requires tracing information flow.',
      'The prompt explicitly states the classic paradigm and language-dominance assumptions so the keyed pattern is not misrepresented as invariant across all callosotomy patients.',
    ],
    incorrectFeedback: {
      0: 'Naming the key requires the visual information to reach the hemisphere supporting speech. In this setup the key is delivered to the right hemisphere, and complete callosal section prevents its usual transfer to the left-lateralized language system; failure of manual selection by both hands also overlooks the right hemisphere\'s access to the stimulus.',
      1: 'The right hand is controlled primarily by the left hemisphere, which did not receive the left-visual-field key under the stated disconnection. Right-hand selection would fit a stimulus delivered to the left hemisphere; here the right hemisphere can instead guide the contralateral left hand.',
      3: 'An absent verbal name reports what the speaking hemisphere can access, not whether the right hemisphere recognized the stimulus. Classic patients could demonstrate right-hemisphere recognition nonverbally, including by using the left hand to select an object matching a left-visual-field image.',
    },
  },

  'eppp-v2-biological-008': {
    expectedAnswerIndex: 3,
    difficulty: 'advanced',
    sourceCheck: 'Raichle and colleagues identified a default mode through task-induced decreases from a high resting baseline, and Spreng and colleagues directly found default-network plus frontoparietal-control engagement during autobiographical planning versus dorsal-attention plus control-network engagement during visuospatial planning.',
    feedbackDesign: ['goal-direction-equals-dorsal-attention', 'control-network-isolation', 'internal-external-network-reversal'],
    prompt: 'An fMRI study compares forming a coherent plan for a personally meaningful future goal with solving a Tower of London visuospatial problem. Which network pattern best matches evidence about internally versus externally focused goal-directed cognition?',
    choices: {
      0: 'Both tasks preferentially recruit dorsal attention regions because each is goal directed',
      1: 'Autobiographical planning isolates frontoparietal control while default activity remains at baseline',
      2: 'Visuospatial planning recruits the default network while autobiographical planning recruits dorsal attention',
      3: 'Autobiographical planning recruits default and control networks; visuospatial planning recruits dorsal attention and control networks',
    },
    rationale: 'Goal direction alone does not determine whether default-network activity will be attenuated. In the primary planning study, internally focused autobiographical planning engaged the default network together with the frontoparietal control network, whereas externally focused visuospatial planning engaged the dorsal attention network together with frontoparietal control. This extends the original observation of a high-baseline default mode by showing that default-network participation is compatible with structured, goal-directed internal cognition.',
    references: [
      'https://doi.org/10.1073/pnas.98.2.676',
      'https://doi.org/10.1016/j.neuroimage.2010.06.016',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1073/pnas.98.2.676',
        title: 'A Default Mode of Brain Function',
        organization: 'Proceedings of the National Academy of Sciences of the United States of America',
        summary: 'Raichle and colleagues integrated functional-imaging evidence for a network with high baseline activity that commonly decreases during externally demanding tasks, establishing the default-mode framework.',
        credibility: 'This peer-reviewed foundational article introduced the default-mode account using convergent imaging observations. It supports the network concept and task-deactivation contrast but does not imply that every active task suppresses the network.',
      },
      {
        url: 'https://doi.org/10.1016/j.neuroimage.2010.06.016',
        title: 'Default Network Activity, Coupled with the Frontoparietal Control Network, Supports Goal-Directed Cognition',
        organization: 'NeuroImage, Elsevier',
        summary: 'Spreng and colleagues used fMRI to compare autobiographical and visuospatial planning, finding default-network engagement for the internal task, dorsal-attention engagement for the external task, and frontoparietal-control engagement across both.',
        credibility: 'This peer-reviewed primary experiment directly tested the two planning conditions described in the item and therefore provides stronger support than the former unrelated sleep citation. Its task-specific results should not be treated as a complete map of all default-network functions.',
      },
    ],
    qualityFlags: [
      'Wave 10 replaces an unrelated sleep reference and a simple rest definition with a primary fMRI contrast between internally and externally focused goal-directed planning.',
      'The revision avoids the obsolete inference that the default network is merely passive or necessarily suppressed whenever cognition is goal directed.',
    ],
    incorrectFeedback: {
      0: 'Both tasks do require control, and both recruited the frontoparietal control network. Their attentional targets differed, however: dorsal-attention activity characterized the externally focused visuospatial problem, while autobiographical planning additionally recruited the default network rather than becoming a second dorsal-attention condition.',
      1: 'Frontoparietal control participated in autobiographical planning, but it was not the sole network supporting that task. Default-network regions were engaged as participants integrated personal goals, steps, and obstacles into a coherent future plan, demonstrating cooperative rather than isolated control-network activity.',
      2: 'This assignment reverses the empirical contrast. The visuospatial Tower of London condition emphasized externally oriented dorsal-attention processing, whereas constructing a personally relevant future plan engaged the default network along with control regions.',
    },
  },

  'eppp-v3-cognitive-affective-061': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Lazarus and Folkman define psychological stress transactionally as a person-environment relationship appraised as significant and as taxing or exceeding coping resources, distinguishing appraisal from an event count or a decontextualized physiological response.',
    feedbackDesign: ['objective-exposure-index', 'arousal-first-account', 'context-free-life-event-count'],
    prompt: 'Two clinicians receive the same notice that their caseloads will increase. One sees the change as manageable given team support; the other sees it as threatening and beyond available resources. Under Lazarus and Folkman\'s transactional model, what most directly accounts for their different stress experiences?',
    choices: {
      0: 'The objective caseload change quantified without either clinician\'s interpretation',
      1: 'The magnitude of early autonomic arousal treated as the source of appraisal',
      2: 'Each clinician\'s appraisal of the event\'s significance and available coping options',
      3: 'Each clinician\'s recent life-event count used as a context-free exposure index',
    },
    rationale: 'The transactional model locates psychological stress in the changing relationship between a person and the environment. Primary appraisal concerns what is at stake or whether an encounter is harmful, threatening, or challenging; secondary appraisal concerns coping options and resources. The same demand can therefore produce different stress experiences when its personal meaning and perceived manageability differ.',
    references: [
      'https://doi.org/10.1007/978-1-4419-1005-9_215',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1007/978-1-4419-1005-9_215',
        title: 'Stress: Appraisal and Coping',
        organization: 'Encyclopedia of Behavioral Medicine, Springer Nature',
        summary: 'Susan Folkman summarizes stress as a person-environment relationship appraised as personally significant and as taxing or exceeding coping resources, and contrasts this view with stimulus-only and response-only definitions.',
        credibility: 'This expert reference entry was written by the theory\'s co-originator and published in a scholarly behavioral-medicine encyclopedia. It is an authoritative clarification of the model, though not independent empirical validation.',
      },
    ],
    qualityFlags: [
      'Wave 10 converts a definition prompt into a matched-event vignette that requires distinguishing transactional appraisal from exposure and response accounts.',
      'The wording treats primary and secondary appraisal as conceptually distinct aspects of an evolving transaction without implying a mechanically fixed two-step sequence.',
    ],
    incorrectFeedback: {
      0: 'Objective workload helps characterize the environmental demand, but the transactional model does not equate demand magnitude with experienced stress. The identical notice in the stem is appraised differently because the clinicians assign it different significance and judge their coping resources differently.',
      1: 'Autonomic activation can accompany and influence a stress response, but a response-only account cannot explain the model\'s emphasis on personal meaning and perceived manageability. Treating arousal as the source that determines appraisal reverses the transactional role of evaluation in the vignette.',
      3: 'Life-event counts estimate accumulated exposure and can be useful predictors at a group level. A context-free count does not specify what this caseload change means to either clinician or whether each perceives adequate support, which are the proximal distinctions supplied by the stem.',
    },
  },

  'eppp-v3-cognitive-affective-059': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'Baddeley\'s 2000 model explicitly proposes a limited-capacity episodic buffer that temporarily stores multimodal information and binds inputs from working-memory subsystems and long-term memory into a unitary episodic representation.',
    feedbackDesign: ['verbal-rehearsal', 'spatial-maintenance', 'executive-switching'],
    prompt: 'A client can repeat spoken directions and reproduce a route map separately but struggles to combine them with familiar landmarks into one coherent temporary representation. In Baddeley\'s revised working-memory model, which process is most specifically implicated?',
    choices: {
      0: 'Episodic-buffer binding of verbal, spatial, and long-term-memory information',
      1: 'Phonological-loop rehearsal of the spoken directions before they decay',
      2: 'Visuospatial-sketchpad maintenance of locations and spatial relations on the map',
      3: 'Central-executive switching between verbal and spatial tasks as separate activities',
    },
    rationale: 'Baddeley proposed the episodic buffer as a limited-capacity temporary system that can represent information in a multimodal code and bind material from the phonological loop, visuospatial sketchpad, and long-term memory into a unitary episode. The client\'s preserved performance within each modality but impaired cross-system integration makes that binding function more specific than verbal rehearsal, spatial maintenance, or task switching.',
    references: ['https://doi.org/10.1016/S1364-6613(00)01538-2'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1016/S1364-6613(00)01538-2',
        title: 'The Episodic Buffer: A New Component of Working Memory?',
        organization: 'Trends in Cognitive Sciences, Elsevier',
        summary: 'Baddeley proposes a fourth working-memory component that temporarily stores multimodal information and binds subsidiary-system and long-term-memory inputs into integrated episodic representations.',
        credibility: 'This peer-reviewed theoretical article is the primary publication in which the model\'s originator introduced the episodic buffer. It directly defines the tested function and the component\'s limited capacity, while later research continues to refine its mechanisms.',
      },
    ],
    qualityFlags: [
      'Wave 10 replaces option feedback that referred to obsolete choices with explanations tied to the current phonological, visuospatial, and executive alternatives.',
      'The vignette holds unimodal retention relatively intact and targets cross-system binding, making the episodic-buffer inference more discriminating than a definition recall item.',
    ],
    incorrectFeedback: {
      1: 'The phonological loop would support short-term maintenance of the spoken directions through speech-based storage and articulatory rehearsal. The client can already repeat that sequence; this mechanism does not by itself explain the failure to bind the words to a map and familiar long-term knowledge.',
      2: 'The visuospatial sketchpad would maintain and manipulate locations, shapes, and spatial relations in the route map. Reproducing the map indicates that this modality-specific representation is available, whereas the difficulty arises when it must be combined with verbal directions and stored landmark knowledge.',
      3: 'The central executive allocates attention and coordinates or switches among processes, so executive dysfunction could affect many complex tasks. Baddeley introduced the episodic buffer specifically to provide a temporary multimodal store and binding interface; merely alternating between separate verbal and spatial activities would not create the unified representation missing here.',
    },
  },

  'eppp-b014-lifespan-2': {
    expectedAnswerIndex: 3,
    difficulty: 'advanced',
    sourceCheck: 'Gilligan\'s original critique foregrounded a moral voice organized around care, relationship, and responsibility that justice-centered accounts could undervalue; Jaffee and Hyde later found only small average sex differences and rejected strong claims of predominant sex-specific orientations.',
    feedbackDesign: ['inverted-stage-hierarchy', 'developmental-structure-minimization', 'sex-as-strong-prior'],
    prompt: 'A trainee says Gilligan\'s critique established that women reason through care whereas men reason through justice. Which response best preserves the historical critique without overstating the evidence?',
    choices: {
      0: 'It revised the hierarchy by treating care-based reasoning as the mature endpoint that justice-centered accounts had overlooked',
      1: 'It shifted explanation toward relational context and situational roles, substantially reducing the interpretive value of developmental organization',
      2: 'It supports treating sex as a strong prior for care-versus-justice orientation when person-specific evidence is sparse',
      3: 'It challenged justice-centered accounts for missing care and responsibility; later findings show substantial overlap by sex',
    },
    rationale: 'Gilligan\'s historical critique argued that a justice-centered developmental account could fail to recognize moral reasoning expressed through care, relationship, and responsibility. It did not simply invert Kohlberg\'s hierarchy. A later meta-analysis found small average differences favoring women in care orientation and men in justice orientation, but those effects did not strongly support assigning the orientations predominantly or categorically by sex.',
    references: [
      'https://doi.org/10.17763/haer.47.4.g6167429416hg5l0',
      'https://doi.org/10.1037/0033-2909.126.5.703',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.17763/haer.47.4.g6167429416hg5l0',
        title: 'In a Different Voice: Women\'s Conceptions of Self and of Morality',
        organization: 'Harvard Educational Review, Harvard Education Publishing Group',
        summary: 'Gilligan examines limits in prevailing developmental theories and describes moral reasoning organized around relationship, responsibility, and care that can be obscured by a justice-centered framework.',
        credibility: 'This peer-reviewed 1977 article is Gilligan\'s original scholarly presentation of the critique, making it the appropriate primary source for its historical content. It should not be read as final evidence about the population size or universality of sex differences.',
      },
      {
        url: 'https://doi.org/10.1037/0033-2909.126.5.703',
        title: 'Gender Differences in Moral Orientation: A Meta-Analysis',
        organization: 'Psychological Bulletin, American Psychological Association',
        summary: 'Jaffee and Hyde quantitatively synthesized care- and justice-orientation studies, finding small average differences and concluding that the evidence did not strongly support predominantly female care or predominantly male justice reasoning.',
        credibility: 'This peer-reviewed meta-analysis aggregates a broad empirical literature and directly tests the sex-difference generalization at issue. Its average effects and moderator findings are more appropriate for that claim than treating Gilligan\'s theoretical critique as a population-classification study.',
      },
    ],
    qualityFlags: [
      'Wave 10 reframes the item as interpretation of a historical critique plus subsequent evidence rather than teaching a simple sex dichotomy.',
      'The distractors represent plausible overextensions: inverting the hierarchy, discarding development, or classifying individuals, instead of implausible claims about infants or rejection of justice.',
    ],
    incorrectFeedback: {
      0: 'Gilligan criticized frameworks that could portray relationship-focused reasoning as deficient, but her remedy was not to replace a justice hierarchy with a care hierarchy. Assigning care the superior endpoint reproduces the ranking problem instead of broadening the moral concerns a developmental account can recognize.',
      1: 'Relationships and concrete context were central to Gilligan\'s critique, yet she continued to describe change within a care orientation. Contextual sensitivity modifies how moral development is understood; it does not make developmental organization negligible when interpreting her historical position.',
      2: 'Meta-analytic findings indicate small average sex differences in the predicted directions, so sex can correlate weakly with orientation at the group level. The distributions overlap extensively, leaving sex with too little person-level predictive value to serve as a strong prior for an examinee or client.',
    },
  },

  'eppp-v3-lifespan-013': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Vygotsky defines the zone of proximal development as the distance between independently demonstrated problem solving and potential performance under adult guidance or in collaboration with a more capable peer.',
    feedbackDesign: ['actual-development-level', 'beyond-assisted-performance', 'undifferentiated-developmental-span'],
    prompt: 'A learner solves single-step proportions without help. With graduated questions from a tutor, the learner completes multi-step proportions but not yet independently. Even after modeling and collaboration, the learner cannot formulate algebraic proofs. Which target is in the learner\'s zone of proximal development?',
    choices: {
      0: 'Single-step proportions demonstrated without assistance',
      1: 'Algebraic proofs that remain unsuccessful during collaboration',
      2: 'The proportion-solving level elicited by calibrated support but not yet sustained independently',
      3: 'The full span from independent proportions through algebraic proofs',
    },
    rationale: 'The zone of proximal development is the distance between the learner\'s actual level, shown through independent problem solving, and potential development, shown through problem solving with adult guidance or a more capable peer. Multi-step proportions fall in that interval because performance emerges with assistance but is not yet independent. Already-mastered work marks the actual level, while performance that does not emerge during suitable collaboration is not demonstrated potential in this assessment.',
    references: ['https://doi.org/10.2307/j.ctvjf9vz4.11'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.2307/j.ctvjf9vz4.11',
        title: 'Interaction Between Learning and Development',
        organization: 'Mind in Society, Harvard University Press; digital chapter hosted by JSTOR',
        summary: 'This chapter defines the zone of proximal development by contrasting independent problem-solving performance with potential performance under adult guidance or in collaboration with more capable peers.',
        credibility: 'This is the relevant Vygotsky chapter in the 1978 Harvard University Press collection edited and translated by established scholars. It is the primary historical source for the definition, although its posthumous compilation and translation warrant care when extending the construct beyond the stated learning context.',
      },
    ],
    qualityFlags: [
      'Wave 10 replaces malformed definition distractors with a three-level learning assessment that distinguishes independent performance, assisted performance, and performance not elicited by assistance.',
      'The revision uses guidance and collaboration from Vygotsky\'s definition without attributing the later scaffolding metaphor directly to him.',
    ],
    incorrectFeedback: {
      0: 'Independent success establishes the learner\'s actual developmental level for this skill. Single-step proportions may be appropriate for fluency practice, but they do not reveal the additional problem-solving capacity that becomes visible through collaboration.',
      1: 'A difficult task is not automatically within the zone. Because algebraic-proof performance did not emerge even with modeling and collaboration, the assessment provides no evidence that this target represents the learner\'s current potential level.',
      3: 'The zone is not every task between an easy starting point and a distant curricular goal. It is bounded by independently demonstrated performance and what the learner can presently accomplish with suitable guidance; the unsuccessful proof task therefore cannot be included in the demonstrated zone.',
    },
  },
};

module.exports = { revisions };
