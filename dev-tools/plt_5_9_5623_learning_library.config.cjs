'use strict';

const officialSource = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5623.pdf';

module.exports = {
  code: '5623',
  idPrefix: 'plt5623',
  libraryId: 'praxis-plt-grades-5-9-5623-learning-library',
  packId: 'praxis-plt-grades-5-9-5623',
  outputName: 'plt_5_9_5623_learning_library.json',
  officialSource,
  humanDevelopmentSkillId: 'human-development-grades-5-9',
  bandTitle: 'Grades 5\u20139',
  bandLower: 'grades 5\u20139',
  bandPhrase: 'grades 5\u20139',
  title: 'Praxis Principles of Learning and Teaching: Grades 5\u20139 (5623) learning library',
  description: 'Twelve source-reviewed chapters and eight original grades 5\u20139 case-analysis workshops aligned to the four selected-response domains and two-case constructed-response format.',
  reviewStandard: 'AlloFlow PLT Grades 5\u20139 5623 learning-library source and editorial review v2',
  legalCaution: 'Independent grades 5\u20139 preparation, not official scoring, a pass prediction, licensure decision, diagnosis, disability or accommodation decision, legal advice, or substitute for current requirements.',
  workshopReviewNote: 'Independent grades 5\u20139 case-analysis practice; not an official ETS case, prompt, scoring guide, response score, scaled score, pass prediction, licensure decision, diagnosis, disability decision, or legal advice. AlloFlow does not score written responses.',
  stringTransforms: [
    [/grade-equivalent score of 6\.2/g, 'grade-equivalent score of 9.2'],
    [/all sixth-grade standards/g, 'all ninth-grade standards'],
    [/referenced sixth-grade second-month group/g, 'referenced ninth-grade second-month group'],
    [/sixth-grade curriculum/g, 'ninth-grade curriculum'],
    [/\bfourth-grade\b/gi, 'seventh-grade'],
    [/\bfourth grader\b/gi, 'seventh grader'],
    [/\bnine-year-old\b/gi, 'twelve-year-old'],
    [/\bsecond-grade\b/gi, 'sixth-grade'],
    [/\bthird grader\b/gi, 'eighth grader'],
    [/\byoung elementary students\b/gi, 'middle-grades students'],
    [/\byoung elementary\b/gi, 'middle-grades'],
    [/\bElementary\b/g, 'Middle-grades'],
    [/\belementary\b/g, 'middle-grades'],
    [/\byoung children\b/gi, 'early adolescents'],
    [/\ban middle-grades\b/gi, 'a middle-grades'],
    [/\bA eighth\b/g, 'An eighth'],
    [/\ba eighth\b/g, 'an eighth'],
  ],
  forbiddenPatterns: [
    /\b(?:prekindergarten|pre-k|kindergarten|first|second|third|fourth|tenth|eleventh|twelfth)[ -]grade(?:r|rs|s)?\b/i,
    /\bgrade\s+(?:K|[1-4]|10|11|12)(?:\.[0-9]+)?\b/i,
    /\b(?:elementary|young children|nine-year-old)\b/i,
    /Human Development Across Grades grades/i,
  ],
  customize(library, { updateCheck }) {
    const chapter = library.chapters[1];
    const skill = library.skills.find(item => item.id === 'human-development-grades-5-9');
    chapter.title = 'Human Development Across Grades 5\u20139';
    skill.label = chapter.title;
    chapter.sections[1].heading = 'Reasoning and representation across grades 5\u20139';
    chapter.sections[1].content = 'Across grades 5\u20139, learners increasingly coordinate concrete models, diagrams, language, symbols, and abstract rules. Effective instruction makes complex relationships visible, then asks students to justify, compare, generalize, and transfer them. Teachers use current task evidence rather than assuming that age or grade alone determines readiness.';
    chapter.sections[2].content = 'Early adolescence brings interacting changes in identity, belonging, competence, peer relationships, emotion regulation, and moral reasoning. Teachers provide meaningful contribution, supported challenge, perspective taking, fair routines, repair, and structured opportunities to explore interests and roles. Developmental frameworks remain interpretive lenses, not diagnoses or fixed identities.';
    chapter.sections[3].heading = 'Readiness, autonomy, movement, and responsive challenge';
    chapter.sections[3].content = 'Readiness is specific to a task and reflects prerequisite knowledge, strategies, language, motivation, executive functioning, physical access, and available support. Grades 5\u20139 learners benefit from meaningful choice, movement, collaborative inquiry, explicit strategy instruction, and progressively sustained independent work. Teachers preserve worthwhile goals while adjusting access and monitoring increasing independence.';

    updateCheck(library, 1, 0, {
      prompt: 'Why should a teacher in grades 5\u20139 examine cognitive, physical, social, emotional, and moral development together?',
      rationale: 'Developmental domains interact throughout early adolescence, while rates and pathways vary among learners; instruction should use multiple observations and context rather than rigid age-based labels.',
    });
    updateCheck(library, 1, 1, {
      prompt: 'Which experience is most developmentally responsive when grades 5\u20139 students are learning a new proportional relationship?',
      choices: [
        'Start with an unexplained formula and prohibit other representations.',
        'Connect a context, ratio table, diagram, graph, and symbolic rule; invite students to compare the representations and explain what remains invariant.',
        'Require memorization before students examine any examples.',
        'Use one numerical case and prevent students from testing whether the relationship generalizes.',
      ],
      rationale: 'Coordinating contextual, visual, numerical, verbal, and symbolic representations supports increasingly abstract reasoning while preserving access to the underlying proportional structure.',
    });
    updateCheck(library, 1, 3, {
      prompt: 'Which classroom condition best supports an early adolescent navigating identity versus role confusion in Erikson\u2019s original framework?',
      choices: [
        'Assign a fixed identity based on the student\u2019s current highest score.',
        'Use public ranking as the primary source of belonging.',
        'Remove opportunities to explore interests so choices cannot change.',
        'Provide safe opportunities to explore roles and interests, meaningful contribution, credible feedback, belonging, and reflection without imposing a permanent label.',
      ],
      rationale: 'Identity development is supported by exploration, belonging, contribution, and reflection; a teacher should avoid public comparison or prematurely fixing a learner to one role.',
    });

    const evidenceWorkshop = library.constructedResponseWorkshops[2];
    const instructionWorkshop = library.constructedResponseWorkshops[3];
    const mathStimulus = 'In a seventh-grade unit, most students solve unit-rate problems accurately with ratio tables but make scaling errors when graphing proportional relationships. Exit tickets show that many plot a total before matching it with the corresponding quantity. One small group also treats multiplicative comparisons as additive. The unit assessment is scheduled in five days. The teacher has recorded total scores but has not yet asked students to explain or compare their representations.';
    evidenceWorkshop.stimulus = mathStimulus;
    evidenceWorkshop.taskParts = [
      'Interpret the converging and differing evidence from ratio tables, graphs, and explanations.',
      'State a specific instructional hypothesis for the class and a distinct possibility for the small group.',
      'Identify one additional diagnostic probe and one limitation of the current evidence.',
    ];
    evidenceWorkshop.planningFrame = [
      { label: 'Construct', guidance: 'Separate unit-rate reasoning, multiplicative comparison, coordinate pairing, and graph construction.' },
      { label: 'Pattern', guidance: 'Use representation-specific errors and subgroup variation rather than total scores alone.' },
      { label: 'Probe', guidance: 'Ask students to build, graph, and explain one carefully chosen proportional relationship.' },
      { label: 'Limit', guidance: 'Do not infer one cause for every error without strategy evidence.' },
    ];
    evidenceWorkshop.successCriteria = [
      'Uses patterns across representations rather than only totals.',
      'Distinguishes the class pattern from the small-group pattern.',
      'Proposes an aligned explain-and-represent diagnostic task.',
      'Names uncertainty and avoids fixed ability labels.',
    ];
    evidenceWorkshop.commonPitfalls = [
      'Reteaching graphing steps without examining proportional reasoning.',
      'Assuming every coordinate error has the same cause.',
      'Calling the scheduled unit test diagnostic by timing alone.',
      'Treating a correct ratio table as proof of graph interpretation.',
    ];
    evidenceWorkshop.sampleOutline = [
      'Hypothesize that many students need a clearer connection among paired quantities, scale factor, and graph coordinates.',
      'For the small group, probe additive-versus-multiplicative comparison because their errors occur before graphing.',
      'Use a build-table-graph-explain task and record strategy evidence; current total scores alone do not locate the misconception.',
    ];
    instructionWorkshop.stimulus = mathStimulus;
    instructionWorkshop.taskParts = [
      'Describe whole-class and targeted small-group actions.',
      'Connect contextual, tabular, verbal, graphical, and symbolic reasoning.',
      'Define a formative check and a decision rule before the unit assessment.',
    ];
    instructionWorkshop.planningFrame = [
      { label: 'Model', guidance: 'Think aloud while matching each ordered pair to the quantities and scale factor it represents.' },
      { label: 'Practice', guidance: 'Elicit comparisons and explanations across varied proportional and nonproportional cases.' },
      { label: 'Differentiate', guidance: 'Give the small group explicit contrast between additive and multiplicative relationships.' },
      { label: 'Decision', guidance: 'Use a new representation-and-explanation task to reteach, proceed, or adjust.' },
    ];
    instructionWorkshop.successCriteria = [
      'Targets the documented reasoning and graphing errors directly.',
      'Coordinates representations instead of teaching an isolated procedure.',
      'Uses flexible groups and specific feedback.',
      'Treats formative evidence as a next-step decision.',
    ];
    instructionWorkshop.commonPitfalls = [
      'Moving directly to the unit assessment.',
      'Using identical support for both documented patterns.',
      'Accepting plotted points without reasoning evidence.',
      'Lowering the proportional-reasoning goal for the small group.',
    ];
    instructionWorkshop.sampleOutline = [
      'Model one proportional situation by linking context, ratio table, scale factor, ordered pairs, graph, and equation.',
      'Guide varied examples while the small group contrasts additive and multiplicative cases with immediate feedback.',
      'Use an individual graph-and-explain check; proceed only when the target misconceptions no longer appear, otherwise adapt and reassess.',
    ];
  },
};
