'use strict';

const revisions = {
  'eppp-b005-biological-1': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'Miyake and colleagues directly tested mental-set shifting, working-memory updating and monitoring, and inhibition of prepotent responses as correlated but separable latent executive functions.',
    feedbackDesign: ['broader-executive-task-abilities', 'general-performance-constraints', 'long-term-memory-processes'],
    prompt: 'A neuropsychological study models performance on tasks requiring participants to switch task rules, replace no-longer-relevant working-memory contents, and suppress a dominant response. Which latent constructs correspond to those operations in Miyake and colleagues\' model?',
    choices: {
      0: 'Set shifting, working-memory updating, and prepotent-response inhibition',
      1: 'Strategic planning, verbal fluency, and prospective-memory task performance',
      2: 'Processing speed, sustained attention, and working-memory capacity',
      3: 'Episodic encoding, memory consolidation, and delayed retrieval',
    },
    rationale: 'Miyake and colleagues modeled mental-set shifting, the updating and monitoring of working-memory representations, and inhibition of prepotent responses as correlated but separable executive functions. The operations in the stem map to those three latent constructs; broader task abilities and memory stages were not the three-factor decomposition tested.',
    references: ['https://doi.org/10.1006/cogp.1999.0734'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1006/cogp.1999.0734',
        title: 'The Unity and Diversity of Executive Functions and Their Contributions to Complex Frontal Lobe Tasks: A Latent Variable Analysis',
        organization: 'Cognitive Psychology, Academic Press/Elsevier',
        summary: 'Miyake and colleagues used a multitask latent-variable design to examine shifting, updating and monitoring working-memory representations, and inhibition of prepotent responses as related but separable executive functions.',
        credibility: 'This peer-reviewed primary individual-differences study is the original empirical model named in the question. Its construct definitions and latent analyses directly support the key, while its college sample and selected task indicators appropriately limit broader generalization.',
      },
    ],
    qualityFlags: [
      'Wave 09 replaces unrelated textbook triads with neighboring executive, performance, and memory constructs that require operation-to-model discrimination.',
      'The construct can be taught in neuropsychology, although its domain placement is less specifically biological than the surrounding items.',
    ],
    incorrectFeedback: {
      1: 'Planning, verbal fluency, and prospective memory are broader executive or task-level abilities that may correlate with cognitive control. They would apply to organizing action, generating words, or remembering an intention, whereas the stem isolates rule switching, active-content replacement, and response suppression.',
      2: 'General limits on efficiency, vigilance, and temporary storage can constrain performance across many executive tasks without identifying the control process being exercised. Those constraints do not map specifically onto changing rules, refreshing active contents, and overriding a dominant response, which are the operations isolated in the stem.',
      3: 'Encoding, consolidation, and delayed retrieval describe processes involved in forming, stabilizing, and accessing long-term memories. They would apply to retention across time, whereas the stem concerns online control of task sets, active representations, and prepotent actions.',
    },
  },

  'eppp-b006-biological-1': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'The 2025 GeneReviews revision supports prompt, lifelong, individually monitored phenylalanine restriction with medical-food supplementation and notes that late neurocognitive injury may be irreversible.',
    feedbackDesign: ['delayed-metabolic-treatment', 'nutritionally-incomplete-restriction', 'supportive-enrichment-without-metabolic-control'],
    prompt: 'A newborn has biallelic PAH variants and markedly elevated blood phenylalanine. Which intervention best illustrates how environmental management can alter the phenotypic outcome without changing the genotype?',
    choices: {
      0: 'Begin prescribed phenylalanine restriction with medical-food supplementation soon after diagnosis',
      1: 'Start phenylalanine restriction after early childhood, once cognitive testing documents impairment',
      2: 'Substitute an unsupplemented low-protein diet for monitored phenylalanine management',
      3: 'Use developmental enrichment as the primary intervention while maintaining usual phenylalanine intake',
    },
    rationale: 'PAH deficiency causes toxic phenylalanine accumulation, but newborn detection permits prompt, lifelong treatment. An individualized phenylalanine-restricted diet, phenylalanine-free or low-phenylalanine medical foods, and biochemical monitoring greatly reduce the risk of profound irreversible neurocognitive injury while the inherited PAH variants remain unchanged. Early treatment does not guarantee a completely typical outcome.',
    references: ['https://www.ncbi.nlm.nih.gov/books/NBK1504/'],
    sourceDetails: [
      {
        url: 'https://www.ncbi.nlm.nih.gov/books/NBK1504/',
        title: 'Phenylalanine Hydroxylase Deficiency',
        organization: 'GeneReviews, University of Washington; hosted by NCBI Bookshelf, U.S. National Library of Medicine',
        summary: 'This clinical genetics review describes PAH-deficiency diagnosis, the potentially irreversible consequences of late or absent treatment, and lifelong phenylalanine-restricted treatment with medical-food supplementation and monitoring.',
        credibility: 'GeneReviews is an expert-authored and editorially reviewed clinical genetics reference hosted by the National Library of Medicine. Its November 2025 revision directly addresses current PAH-deficiency management and distinguishes substantial risk reduction from a guaranteed typical outcome.',
      },
    ],
    qualityFlags: [
      'Wave 09 replaces biologically impossible and unsafe giveaway options with delayed treatment, incomplete nutrition, and supportive-care misconceptions.',
      'The revised rationale tempers the former prevention claim because people treated from birth may retain modest measurable neurocognitive differences.',
    ],
    incorrectFeedback: {
      1: 'Later dietary treatment can lower phenylalanine and improve some neurologic or behavioral manifestations, but established neurocognitive injury may be irreversible. Delayed treatment would apply after a late diagnosis; waiting for measured impairment misses the early developmental window emphasized in the stem.',
      2: 'Reducing ordinary protein without phenylalanine-free medical-food supplementation risks inadequate protein, tyrosine, vitamin, and mineral intake. A general low-protein strategy may reduce exposure somewhat, but the newborn in the stem needs an individualized phenylalanine allowance, nutritional replacement, and biochemical monitoring.',
      3: 'Developmental enrichment can support learning and adaptive functioning, especially when residual needs remain. It does not correct phenylalanine accumulation caused by deficient PAH activity, so maintaining usual intake would leave the metabolic insult in the stem insufficiently treated.',
    },
  },

  'eppp-b003-cognitive-1': {
    expectedAnswerIndex: 1,
    difficulty: 'intermediate',
    sourceCheck: 'Festinger and Carlsmith\'s original experiment reported greater favorable attitude change after the smaller incentive and interpreted it through insufficient external justification and dissonance reduction.',
    feedbackDesign: ['arousal-misattribution', 'demand-characteristics', 'operant-punishment'],
    prompt: 'In Festinger and Carlsmith\'s forced-compliance experiment, participants who received $1 for telling another person that a dull task was enjoyable later rated the task more favorably than participants who received $20. Under the investigators\' dissonance account, why?',
    choices: {
      0: 'The $20 payment produced greater arousal that participants misattributed to the task',
      1: 'The $1 incentive gave insufficient external justification, so attitude shifted to fit behavior',
      2: 'The $1 condition created stronger demand characteristics because participants inferred the hypothesis',
      3: 'The $20 payment acted as punishment and conditioned a negative reaction to the task',
    },
    rationale: 'The $20 payment supplied a ready external reason for making a counter-attitudinal statement. One dollar supplied less external justification, leaving greater inconsistency between the participant\'s initial appraisal and behavior; shifting the private attitude toward the task was the investigators\' proposed way to reduce that dissonance.',
    references: ['https://doi.org/10.1037/h0041593'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/h0041593',
        title: 'Cognitive Consequences of Forced Compliance',
        organization: 'The Journal of Abnormal and Social Psychology, American Psychological Association',
        summary: 'Festinger and Carlsmith compared incentive conditions after counter-attitudinal compliance and interpreted the smaller-incentive attitude shift through insufficient external justification and dissonance reduction.',
        credibility: 'This peer-reviewed paper is the original primary experiment named in the item, making it the appropriate source for the study design and investigators\' historical interpretation. It does not by itself establish every later boundary condition or replication claim.',
      },
    ],
    qualityFlags: [
      'Wave 09 fixes the missing relative clause in the original prompt and explicitly frames dissonance as the investigators\' proposed account.',
      'The revised distractors use neighboring social-cognitive and learning explanations rather than unrelated memory decay or social facilitation claims.',
    ],
    incorrectFeedback: {
      0: 'Misattribution of arousal applies when physiological activation is assigned to the wrong source and then alters judgment. The experiment did not manipulate arousal, and this account does not derive the stem\'s greater reported attitude change from the smaller incentive.',
      2: 'Demand characteristics apply when participants infer a study\'s purpose and change their responses to fit or resist it. That possibility can threaten experimental validity, but it was not the investigators\' reward-size mechanism and does not specifically explain why limited external justification should produce greater change.',
      3: 'Punishment is an aversive consequence that decreases the behavior it follows, whereas both groups received money for compliance. Operant punishment could apply if the statement produced an aversive consequence, but it does not explain the later private-evaluation pattern described in the stem.',
    },
  },

  'eppp-b003-cognitive-2': {
    expectedAnswerIndex: 3,
    difficulty: 'intermediate',
    sourceCheck: 'Rozin and Royzman directly define negative potency as stronger psychological influence of a negative entity than an equivalent positive entity and distinguish it from other negativity manifestations.',
    feedbackDesign: ['mood-congruent-memory', 'loss-aversion', 'confirmation-bias'],
    prompt: 'A person evaluates two equally credible and comparably intense pieces of information about an unfamiliar individual, one favorable and one unfavorable. The unfavorable behavior shifts the overall impression farther. Which process is most directly illustrated?',
    choices: {
      0: 'Mood-congruent memory, because recall favors material matching the evaluator\'s current mood',
      1: 'Loss aversion, because a monetary loss has more utility impact than an equivalent gain',
      2: 'Confirmation bias, because prior beliefs guide which evidence the evaluator accepts',
      3: 'Negativity bias, because negative evidence outweighs matched positive evidence',
    },
    rationale: 'Negativity bias includes greater psychological weighting of a negative entity than an equivalent positive entity. Here credibility and intensity are matched, the target is unfamiliar, and information valence accounts for the asymmetric shift. The stem supplies no current-mood match, gain-loss choice, or prior hypothesis.',
    references: ['https://doi.org/10.1207/S15327957PSPR0504_2'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1207/S15327957PSPR0504_2',
        title: 'Negativity Bias, Negativity Dominance, and Contagion',
        organization: 'Personality and Social Psychology Review',
        summary: 'Rozin and Royzman synthesize evidence for several negativity effects, including negative potency, in which negative entities exert stronger psychological effects than equivalent positive entities.',
        credibility: 'This peer-reviewed integrative review directly defines the construct and differentiates mechanisms within negativity bias. It is an authoritative conceptual synthesis rather than a single primary experiment, so it supports the contrast without implying a fixed effect size.',
      },
    ],
    qualityFlags: [
      'Wave 09 replaces a definition-only prompt and conspicuous equal-weighting cue with a matched-valence social-evaluation vignette.',
      'The alternatives name nearby mechanisms and require the learner to identify the missing mood, reference-point, or prior-belief conditions.',
    ],
    incorrectFeedback: {
      0: 'Mood-congruent memory applies when material matching a person\'s current affective state is preferentially encoded or retrieved. The stem provides no mood state and asks about unequal evaluative impact of matched information rather than mood-matched recall.',
      1: 'Loss aversion applies to valuation of gains and losses relative to a reference point, commonly in judgment or choice under risk. The vignette provides neither personal outcomes nor a gain-loss decision; it compares social information with matched credibility and intensity.',
      2: 'Confirmation bias applies when an existing belief or hypothesis directs evidence search, interpretation, or acceptance. The target is unfamiliar and no prior view is supplied, so the asymmetry in the stem follows information valence rather than consistency with a preexisting belief.',
    },
  },

  'eppp-b005-lifespan-1': {
    expectedAnswerIndex: 1,
    difficulty: 'intermediate',
    sourceCheck: 'Cattell\'s foundational study and Horn and Cattell\'s age-comparison study support distinguishing fluid relational reasoning from crystallized knowledge, processing speed, and associative memory performance.',
    feedbackDesign: ['crystallized-verbal-knowledge', 'processing-speed', 'paired-associate-memory'],
    prompt: 'Which task most directly samples fluid reasoning while minimizing reliance on previously acquired factual or verbal knowledge?',
    choices: {
      0: 'Explaining the meanings of advanced words learned through education',
      1: 'Inferring the rule that transforms unfamiliar visual patterns',
      2: 'Rapidly scanning familiar symbols under a demanding time limit',
      3: 'Learning paired associates and recalling them after a delay',
    },
    rationale: 'Fluid intelligence is expressed in reasoning through unfamiliar relations and solving novel problems with relatively limited reliance on accumulated knowledge. Vocabulary primarily samples crystallized knowledge, timed visual scanning emphasizes processing speed, and paired-associate learning emphasizes acquisition and later retrieval.',
    references: [
      'https://doi.org/10.1016/0001-6918(67)90011-X',
      'https://doi.org/10.1037/h0046743',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1016/0001-6918(67)90011-X',
        title: 'Age Differences in Fluid and Crystallized Intelligence',
        organization: 'Acta Psychologica, Elsevier',
        summary: 'Horn and Cattell used factor scores across adult age groups to examine distinct age patterns for fluid and crystallized abilities.',
        credibility: 'This peer-reviewed primary study by central fluid-and-crystallized-intelligence theorists supports the empirical distinction between the ability families, although its age-comparison focus is less direct for a single task example.',
      },
      {
        url: 'https://doi.org/10.1037/h0046743',
        title: 'Theory of Fluid and Crystallized Intelligence: A Critical Experiment',
        organization: 'Journal of Educational Psychology, American Psychological Association',
        summary: 'Cattell tested the proposed distinction between fluid reasoning and culturally or educationally accumulated intellectual abilities using differentiated cognitive measures.',
        credibility: 'This foundational peer-reviewed primary paper directly develops and tests the construct distinction named in the item. Later hierarchical models have refined the theory, but this study remains an appropriate historical source for the requested contrast.',
      },
    ],
    qualityFlags: [
      'Wave 09 replaces three plainly crystallized examples with plausible processing-speed and learning-memory alternatives.',
      'The added Cattell primary paper aligns more directly with the construct distinction than the existing age-differences article alone.',
    ],
    incorrectFeedback: {
      0: 'Vocabulary meaning is a prototypical expression of crystallized knowledge accumulated through language exposure and education. It applies when a task samples acquired verbal information; the stem instead asks for reasoning that minimizes dependence on prior factual learning.',
      2: 'Rapid comparison of familiar symbols primarily emphasizes processing speed and visual scanning under time pressure. Speed can support complex reasoning, but this task would measure efficient execution rather than the induction of an unfamiliar relation requested in the stem.',
      3: 'Paired-associate performance emphasizes learning efficiency and later retrieval of newly linked items. It applies when acquisition and memory are central; recalling trained pairs does not principally require discovering the rule that organizes novel stimulus relations.',
    },
  },

  'eppp-b005-lifespan-2': {
    expectedAnswerIndex: 3,
    difficulty: 'intermediate',
    sourceCheck: 'The puberty review and current Endotext chapter support increasing pulsatile hypothalamic GnRH activity, anterior-pituitary LH and FSH secretion, and downstream gonadal endocrine and gametogenic functions.',
    feedbackDesign: ['hpa-stress-axis', 'somatotropic-growth-axis', 'hpt-thyroid-axis'],
    prompt: 'At the onset of gonadarche, increasing pulsatile activity from a hypothalamic neurosecretory system initiates a pituitary response. Which sequence correctly traces this HPG-axis activation?',
    choices: {
      0: 'Hypothalamic CRH to pituitary ACTH to adrenal cortisol release during stress',
      1: 'Hypothalamic GHRH to pituitary growth hormone to hepatic IGF-1 production during growth',
      2: 'Hypothalamic TRH to pituitary TSH to thyroid T4 and T3 release supporting metabolism',
      3: 'Hypothalamic GnRH to pituitary LH and FSH to gonadal steroids and gamete maturation',
    },
    rationale: 'Pubertal HPG-axis reactivation increases pulsatile hypothalamic GnRH delivery to the anterior pituitary. Gonadotropes then secrete LH and FSH, which act on the gonads to promote sex-steroid production and gametogenic functions. The alternative sequences are valid neighboring endocrine axes but do not initiate gonadarche.',
    references: [
      'https://doi.org/10.1038/nn1326',
      'https://www.ncbi.nlm.nih.gov/books/NBK279070/',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1038/nn1326',
        title: 'The Neural Basis of Puberty and Adolescence',
        organization: 'Nature Neuroscience, Springer Nature',
        summary: 'Sisk and Foster review neural and neuroendocrine mechanisms of pubertal maturation, including the reawakening of gonadotropin-releasing-hormone neuronal activity.',
        credibility: 'This peer-reviewed review in a major neuroscience journal is directly relevant to pubertal neuroendocrine reactivation. Its scope is broader than the exact three-level HPG sequence, which is why the revision adds a focused endocrine reference.',
      },
      {
        url: 'https://www.ncbi.nlm.nih.gov/books/NBK279070/',
        title: 'Physiology of GnRH and Gonadotrophin Secretion',
        organization: 'Endotext, MDText.com; hosted by NCBI Bookshelf, U.S. National Library of Medicine',
        summary: 'This updated endocrine reference explains pulsatile hypothalamic GnRH regulation of pituitary LH and FSH and their downstream control of gonadal endocrine function and gamete maturation.',
        credibility: 'Endotext is an expert-authored and continuously updated endocrine reference hosted by the National Library of Medicine. Its 2024 update directly verifies the complete physiological sequence and explains the acceleration in pulsatility associated with pubertal maturation.',
      },
    ],
    qualityFlags: [
      'Wave 09 replaces physiologically scrambled giveaway distractors with three valid neighboring hypothalamic-pituitary endocrine axes.',
      'The added Endotext chapter directly verifies the complete GnRH-to-gonadotropin-to-gonad sequence and its pubertal relevance.',
    ],
    incorrectFeedback: {
      0: 'CRH, ACTH, and cortisol form the hypothalamic-pituitary-adrenal stress axis. That sequence applies to coordinated stress responses and cortisol secretion; although cortisol can interact with reproduction, the cascade terminates in the adrenal cortex rather than activating the gonads in the stem.',
      1: 'GHRH, growth hormone, and hepatic IGF-1 form the somatotropic axis and contribute substantially to the pubertal growth spurt. This pathway applies to somatic growth, but it is distinct from the reproductive neuroendocrine cascade that initiates gonadarche.',
      2: 'TRH, TSH, and thyroid hormones form the hypothalamic-pituitary-thyroid axis governing metabolic and developmental functions. Normal thyroid status supports maturation, but this sequence does not deliver the pituitary gonadotropin signals required by the stem.',
    },
  },
};

module.exports = { revisions };
