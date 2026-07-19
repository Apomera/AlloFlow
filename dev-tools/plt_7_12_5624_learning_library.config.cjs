'use strict';

const officialSource = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw381f0276/pdfs/5624.pdf';

module.exports = {
  code: '5624',
  idPrefix: 'plt5624',
  libraryId: 'praxis-plt-grades-7-12-5624-learning-library',
  packId: 'praxis-plt-grades-7-12-5624',
  outputName: 'plt_7_12_5624_learning_library.json',
  officialSource,
  humanDevelopmentSkillId: 'human-development-grades-7-12',
  bandTitle: 'Grades 7\u201312',
  bandLower: 'grades 7\u201312',
  bandPhrase: 'grades 7\u201312',
  title: 'Praxis Principles of Learning and Teaching: Grades 7\u201312 (5624) learning library',
  description: 'Twelve source-reviewed chapters and eight original grades 7\u201312 case-analysis workshops aligned to the four selected-response domains and two-case constructed-response format.',
  reviewStandard: 'AlloFlow PLT Grades 7\u201312 5624 learning-library source and editorial review v2',
  legalCaution: 'Independent grades 7\u201312 preparation, not official scoring, a pass prediction, licensure decision, diagnosis, disability or accommodation decision, legal advice, or substitute for current requirements.',
  workshopReviewNote: 'Independent grades 7\u201312 case-analysis practice; not an official ETS case, prompt, scoring guide, response score, scaled score, pass prediction, licensure decision, diagnosis, disability decision, or legal advice. AlloFlow does not score written responses.',
  stringTransforms: [
    [/grade-equivalent score of 6\.2/g, 'grade-equivalent score of 11.2'],
    [/all sixth-grade standards/g, 'all eleventh-grade standards'],
    [/referenced sixth-grade second-month group/g, 'referenced eleventh-grade second-month group'],
    [/sixth-grade curriculum/g, 'eleventh-grade curriculum'],
    [/\bfourth-grade\b/gi, 'tenth-grade'],
    [/\bfourth grader\b/gi, 'tenth grader'],
    [/\bnine-year-old\b/gi, 'fifteen-year-old'],
    [/\bsecond-grade\b/gi, 'ninth-grade'],
    [/\bfifth-grade\b/gi, 'eleventh-grade'],
    [/\bthird grader\b/gi, 'twelfth grader'],
    [/\byoung elementary students\b/gi, 'adolescent students'],
    [/\byoung elementary\b/gi, 'adolescent'],
    [/\bElementary\b/g, 'Secondary'],
    [/\belementary\b/g, 'secondary'],
    [/\byoung children\b/gi, 'adolescents'],
    [/\ban secondary\b/gi, 'a secondary'],
    [/\bA eighth\b/g, 'An eighth'],
    [/\ba eighth\b/g, 'an eighth'],
    [/\bA eleventh\b/g, 'An eleventh'],
    [/\ba eleventh\b/g, 'an eleventh'],
  ],
  forbiddenPatterns: [
    /\b(?:prekindergarten|pre-k|kindergarten|first|second|third|fourth|fifth|sixth)[ -]grade(?:r|rs|s)?\b/i,
    /\bgrade\s+(?:K|[1-6])(?:\.[0-9]+)?\b/i,
    /\b(?:elementary|young children|nine-year-old|middle-grades)\b/i,
    /Human Development Across Grades grades/i,
  ],
  customize(library, { updateCheck }) {
    const chapter = library.chapters[1];
    const skill = library.skills.find(item => item.id === 'human-development-grades-7-12');
    chapter.title = 'Human Development Across Grades 7\u201312';
    skill.label = chapter.title;
    chapter.sections[1].heading = 'Adolescent reasoning and disciplinary representation';
    chapter.sections[1].content = 'Across grades 7\u201312, learners increasingly coordinate examples, models, disciplinary language, symbolic systems, and abstract principles. Effective secondary instruction makes expert representations visible, asks students to compare cases and justify claims, and gradually transfers planning and monitoring to the learner. Teachers use current task evidence rather than treating age or course placement as proof of readiness.';
    chapter.sections[2].content = 'Adolescent development includes interacting changes in identity, autonomy, belonging, peer relationships, emotion regulation, future orientation, and moral reasoning. Teachers support safe exploration of interests and roles, meaningful contribution, perspective taking, equitable participation, repair, and reflection. Developmental frameworks remain interpretive lenses, not diagnoses or fixed identities.';
    chapter.sections[3].heading = 'Readiness, autonomy, sustained inquiry, and responsive challenge';
    chapter.sections[3].content = 'Readiness is specific to a disciplinary task and reflects prerequisite knowledge, strategies, language, motivation, executive functioning, physical access, and available support. Grades 7\u201312 learners benefit from authentic problems, meaningful choice, explicit strategy instruction, structured collaboration, and progressively sustained independent inquiry. Teachers preserve rigorous goals while adjusting access and monitoring transfer and independence.';

    updateCheck(library, 1, 0, {
      prompt: 'Why should a teacher in grades 7\u201312 examine cognitive, physical, social, emotional, and moral development together?',
      rationale: 'Developmental domains interact throughout adolescence, while rates and pathways vary among learners; instruction should use multiple observations and context rather than rigid age-based labels.',
    });
    updateCheck(library, 1, 1, {
      prompt: 'Which experience is most developmentally responsive when secondary students are learning a new abstract disciplinary system?',
      choices: [
        'Present formal notation without examples, purpose, or opportunities to reason.',
        'Connect authentic cases, visual or physical models, disciplinary language, and formal notation; ask students to compare cases, justify the abstraction, and apply it independently.',
        'Require memorization before students examine any evidence or examples.',
        'Use one worked example and prevent students from testing whether the principle generalizes.',
      ],
      rationale: 'Adolescent learners benefit when instruction connects concrete or authentic cases with increasingly abstract disciplinary representations and requires explanation, comparison, and transfer.',
    });
    updateCheck(library, 1, 3, {
      prompt: 'Which classroom condition best supports an adolescent navigating identity versus role confusion in Erikson\u2019s original framework?',
      choices: [
        'Assign a fixed identity based on the student\u2019s current course performance.',
        'Use public ranking as the primary source of belonging.',
        'Remove opportunities to explore interests, values, and future roles.',
        'Provide safe opportunities to explore roles and interests, meaningful contribution, credible feedback, belonging, and reflection without imposing a permanent label.',
      ],
      rationale: 'Identity development is supported by exploration, belonging, contribution, and reflection; a teacher should avoid public comparison or prematurely fixing a learner to one role.',
    });

    const evidenceWorkshop = library.constructedResponseWorkshops[2];
    const instructionWorkshop = library.constructedResponseWorkshops[3];
    const mathStimulus = 'In a ninth-grade algebra unit, most students solve linear equations accurately when using a balance model but make sign errors when writing symbolic steps. Exit tickets show that many change a term\u2019s sign without applying the same operation to both sides. One small group also distributes a negative factor incorrectly before isolating the variable. The unit assessment is scheduled in five days. The teacher has recorded total scores but has not yet asked students to explain or compare their representations.';
    evidenceWorkshop.stimulus = mathStimulus;
    evidenceWorkshop.taskParts = [
      'Interpret the converging and differing evidence from models, symbolic work, and explanations.',
      'State a specific instructional hypothesis for the class and a distinct possibility for the small group.',
      'Identify one additional diagnostic probe and one limitation of the current evidence.',
    ];
    evidenceWorkshop.planningFrame = [
      { label: 'Construct', guidance: 'Separate equivalence, inverse operations, sign reasoning, and distribution.' },
      { label: 'Pattern', guidance: 'Use representation-specific errors and subgroup variation rather than total scores alone.' },
      { label: 'Probe', guidance: 'Ask students to model, solve, and explain one carefully selected equation with a negative term.' },
      { label: 'Limit', guidance: 'Do not infer one cause for every symbolic error without strategy evidence.' },
    ];
    evidenceWorkshop.successCriteria = [
      'Uses patterns across models and symbolic work rather than only totals.',
      'Distinguishes the class pattern from the small-group distribution pattern.',
      'Proposes an aligned model-solve-explain diagnostic task.',
      'Names uncertainty and avoids fixed ability labels.',
    ];
    evidenceWorkshop.commonPitfalls = [
      'Reteaching a memorized sign rule without examining equivalence.',
      'Assuming every incorrect equation has the same cause.',
      'Calling the scheduled unit test diagnostic by timing alone.',
      'Treating success with a balance model as proof of symbolic transfer.',
    ];
    evidenceWorkshop.sampleOutline = [
      'Hypothesize that many students need a clearer connection between equivalent balance actions and symbolic operations on both sides.',
      'For the small group, probe distribution with negative factors because their errors occur before variable isolation.',
      'Use a model-solve-explain task and record strategy evidence; current total scores alone do not locate the misconception.',
    ];
    instructionWorkshop.stimulus = mathStimulus;
    instructionWorkshop.taskParts = [
      'Describe whole-class and targeted small-group actions.',
      'Connect balance, verbal, graphical, and symbolic reasoning.',
      'Define a formative check and a decision rule before the unit assessment.',
    ];
    instructionWorkshop.planningFrame = [
      { label: 'Model', guidance: 'Think aloud while connecting each balance action to the same symbolic operation on both sides.' },
      { label: 'Practice', guidance: 'Elicit explanations across equations with varied structures and negative terms.' },
      { label: 'Differentiate', guidance: 'Give the small group explicit comparison of correct and incorrect negative distribution.' },
      { label: 'Decision', guidance: 'Use a new model-solve-explain task to reteach, proceed, or adjust.' },
    ];
    instructionWorkshop.successCriteria = [
      'Targets the documented equivalence, sign, and distribution errors directly.',
      'Coordinates representations instead of teaching isolated sign tricks.',
      'Uses flexible groups and specific feedback.',
      'Treats formative evidence as a next-step decision.',
    ];
    instructionWorkshop.commonPitfalls = [
      'Moving directly to the unit assessment.',
      'Using identical support for both documented patterns.',
      'Accepting a final answer without reasoning evidence.',
      'Lowering the algebraic-reasoning goal for the small group.',
    ];
    instructionWorkshop.sampleOutline = [
      'Model one equation by linking balance actions, inverse operations, verbal reasoning, and symbolic steps.',
      'Guide varied examples while the small group contrasts correct and incorrect negative distribution with immediate feedback.',
      'Use an individual model-solve-explain check; proceed only when the target misconceptions no longer appear, otherwise adapt and reassess.',
    ];
  },
};
