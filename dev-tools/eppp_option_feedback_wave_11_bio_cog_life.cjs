'use strict';

const revisions = {
  'eppp-v3-biological-028': {
    expectedAnswerIndex: 3,
    incorrectFeedback: {
      0: 'The hippocampal formation is central to forming and consolidating declarative episodic memories. General arousal can influence encoding, but that indirect influence does not make memory consolidation the primary RAS function.',
      1: 'Premotor cortex, supplementary motor areas, and basal-ganglia circuits help select and sequence voluntary actions. The ascending arousal system supplies an alert state rather than a detailed motor program.',
      2: 'Amygdala, insular, cingulate, and prefrontal networks contribute to emotional appraisal and regulation. Brainstem arousal may accompany emotion, but it does not perform the higher-order evaluation described here.',
    },
    feedbackDesign: ['hippocampal-memory substitution', 'motor-planning substitution', 'limbic-appraisal substitution'],
    sourceCheck: 'The NCBI Bookshelf neuroanatomy review locates the RAS in brainstem circuits and identifies attention, arousal, focus, wakefulness, and sleep-wake regulation as its central functions.',
    references: ['https://www.ncbi.nlm.nih.gov/books/NBK549835/'],
    sourceDetails: [{
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK549835/',
      title: 'Neuroanatomy, Reticular Activating System',
      organization: 'NCBI Bookshelf, U.S. National Library of Medicine',
      summary: 'This clinical neuroanatomy review describes the brainstem reticular activating system and its roles in arousal, attention, focus, muscle tone, wakefulness, and sleep-wake regulation.',
      credibility: 'NCBI Bookshelf is maintained by the U.S. National Library of Medicine; the cited StatPearls chapter is medically edited, author-attributed, referenced, and directly addresses the tested neural system.',
    }],
  },
  'eppp-v3-biological-041': {
    expectedAnswerIndex: 0,
    incorrectFeedback: {
      1: 'Sequencing voluntary movement primarily recruits frontal motor regions and basal-ganglia and cerebellar circuits. Visual information can guide action, but that does not turn ventral-stream injury into a motor-planning deficit.',
      2: 'Expressive speech depends on a left-lateralized perisylvian language network and its motor-speech connections. A person with ventral visual-stream damage may misidentify a seen object while retaining speech production.',
      3: 'Spatial location and visually guided action are classically associated with the dorsal occipital-parietal stream. Confusing that where/how function with ventral processing reverses the two-stream distinction.',
    },
    feedbackDesign: ['motor-network substitution', 'language-network substitution', 'dorsal-stream reversal'],
    sourceCheck: 'The reviewed visual-neuroscience literature characterizes the ventral temporal stream as primarily supporting object identity and recognition, while dorsal parietal processing emphasizes spatial relations and visually guided action.',
    references: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC6601918/'],
    sourceDetails: [{
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6601918/',
      title: 'Extracting Object Identity: Ventral or Dorsal Visual Stream?',
      organization: 'PubMed Central, U.S. National Library of Medicine',
      summary: 'This peer-reviewed neuroscience article reviews the two-stream account in which ventral temporal processing emphasizes object identity and dorsal parietal processing emphasizes spatial relations and action.',
      credibility: 'PubMed Central provides the complete peer-reviewed journal article through the U.S. National Library of Medicine; the paper directly analyzes the ventral-versus-dorsal object-identity distinction tested here.',
    }],
  },
  'eppp-v3-cognitive-affective-034': {
    expectedAnswerIndex: 1,
    incorrectFeedback: {
      0: 'Analytical ability is one part of Sternberg’s model, especially for evaluating and comparing ideas. Limiting the theory to that ability omits its experiential and contextual dimensions.',
      2: 'Verbal and performance scales refer to an older organization of Wechsler test scores. They are psychometric score groupings, not the three abilities proposed in Sternberg’s theory.',
      3: 'Gardner proposed a multiple-intelligences framework with several relatively distinct domains. That taxonomy should not be substituted for Sternberg’s three-part account of successful intelligence.',
    },
    feedbackDesign: ['single-component truncation', 'Wechsler-model substitution', 'Gardner-model substitution'],
    sourceCheck: 'OpenStax and Sternberg’s published descriptions distinguish analytical abilities used to evaluate problems, creative abilities used with novelty, and practical abilities used to adapt to real-world contexts.',
  },
  'eppp-b004-cognitive-2': {
    expectedAnswerIndex: 3,
    incorrectFeedback: {
      0: 'A classical feature account treats category membership as meeting a defining set of conditions. It can distinguish members from nonmembers, but it does not readily predict graded typicality among accepted members.',
      1: 'Stimulus-response chaining explains learned sequences through associations between cues and responses. It does not represent the internal similarity structure that makes one valid category member seem more representative.',
      2: 'An equipotential account predicts that accepted category members should have equivalent status. Systematic robin-penguin differences directly contradict that prediction even though both remain birds.',
    },
    feedbackDesign: ['classical-category limitation', 'association-learning substitution', 'equal-typicality contradiction'],
    sourceCheck: 'Rosch and Mervis empirically linked rated prototypicality to family resemblance within semantic categories, supporting graded representativeness rather than equal typicality among all category members.',
  },
  'eppp-v3-lifespan-005': {
    expectedAnswerIndex: 2,
    incorrectFeedback: {
      0: 'Children in the preoperational period characteristically fail conservation tasks because appearance changes and centration can dominate judgment. Reliable conservation is associated with the later concrete-operational period.',
      1: 'Reasoning systematically about abstract propositions is a hallmark of formal operations, which Piaget placed later in development. Preoperational children can use symbols without this abstract logical system.',
      3: 'Coordinated hypothesis generation and testing is also associated with formal-operational reasoning. Pretend play or symbolic language in early childhood should not be confused with controlled hypothesis testing.',
    },
    feedbackDesign: ['conservation-stage reversal', 'formal-abstraction substitution', 'hypothesis-testing substitution'],
    sourceCheck: 'OpenStax’s lifespan-development account describes preoperational egocentrism, animism, and centration and explains that conservation succeeds later as children can coordinate more than one dimension.',
  },
  'eppp-v3-lifespan-036': {
    expectedAnswerIndex: 1,
    incorrectFeedback: {
      0: 'Understanding that unseen objects continue to exist develops during infancy in Piaget?s sensorimotor period. That achievement does not describe adolescents? heightened social self-consciousness.',
      2: 'Failure to conserve quantity is associated with preoperational centration in early childhood. Adolescents’ belief that others are closely observing them concerns perceived social evaluation, not transformations of quantity.',
      3: 'Attributing life or mental states to inanimate objects is a preoperational pattern. It differs from imagining oneself as the continuing focus of peers? attention.',
    },
    feedbackDesign: ['sensorimotor-construct substitution', 'preoperational-conservation substitution', 'preoperational-animism substitution'],
    sourceCheck: 'Elkind’s original theory of adolescent egocentrism introduced the imaginary-audience and personal-fable constructs; later empirical work treats them as related but distinguishable forms of adolescent self-focus.',
    references: ['https://doi.org/10.2307/1127100'],
    sourceDetails: [{
      url: 'https://doi.org/10.2307/1127100',
      title: 'Egocentrism in Adolescence',
      organization: 'Child Development, Society for Research in Child Development',
      summary: 'David Elkind’s foundational article extends Piagetian egocentrism to adolescence and introduces the imaginary audience and personal fable as characteristic theoretical constructions.',
      credibility: 'This is the original peer-reviewed Child Development article by the theorist named in the question, identified by a persistent DOI and therefore the primary historical source for the tested terminology.',
    }],
  },
};

module.exports = { revisions };
