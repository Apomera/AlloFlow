'use strict';

const officialSource = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5621.pdf';

module.exports = {
  code: '5621',
  idPrefix: 'plt5621',
  libraryId: 'praxis-plt-early-childhood-5621-learning-library',
  packId: 'praxis-plt-early-childhood-5621',
  outputName: 'plt_early_childhood_5621_learning_library.json',
  officialSource,
  humanDevelopmentSkillId: 'human-development-early-childhood',
  bandTitle: 'Early Childhood',
  bandLower: 'early childhood',
  bandPhrase: 'early-childhood',
  title: 'Praxis Principles of Learning and Teaching: Early Childhood (5621) learning library',
  description: 'Twelve source-reviewed chapters and eight original early-childhood case-analysis workshops aligned to the four selected-response domains and two-case constructed-response format.',
  reviewStandard: 'AlloFlow PLT Early Childhood 5621 learning-library source and editorial review v2',
  legalCaution: 'Independent early-childhood preparation, not official scoring, a pass prediction, licensure decision, developmental screening, diagnosis, disability or accommodation decision, legal advice, or substitute for current requirements.',
  workshopReviewNote: 'Independent early-childhood case-analysis practice; not an official ETS case, prompt, scoring guide, response score, scaled score, pass prediction, licensure decision, developmental screening, diagnosis, disability decision, or legal advice. AlloFlow does not score written responses.',
  stringTransforms: [
    [/grade-equivalent score of 6\.2/g, 'grade-equivalent score of 3.2'],
    [/at grade 7\.5/g, 'at grade 2.5'],
    [/all sixth-grade standards/g, 'all third-grade standards'],
    [/referenced sixth-grade second-month group/g, 'referenced third-grade second-month group'],
    [/sixth-grade curriculum/g, 'third-grade curriculum'],
    [/\bfourth-grade class\b/gi, 'kindergarten class'],
    [/\bfourth-grade\b/gi, 'second-grade'],
    [/\bfourth grader\b/gi, 'second grader'],
    [/\bnine-year-old\b/gi, 'five-year-old'],
    [/\bfifth-grade\b/gi, 'second-grade'],
    [/\bthird grader\b/gi, 'first grader'],
    [/\byoung elementary students\b/gi, 'young children'],
    [/\byoung elementary\b/gi, 'young-child'],
    [/\bElementary\b/g, 'Early-childhood'],
    [/\belementary\b/g, 'early-childhood'],
    [/\bMaya\b/g, 'Elena'],
  ],
  forbiddenPatterns: [
    /\b(?:fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)[ -]grade(?:r|rs|s)?\b/i,
    /\bgrade\s+(?:[4-9]|10|11|12)(?:\.[0-9]+)?\b/i,
    /\b(?:middle-grades|secondary|adolescents?|nine-year-old)\b/i,
    /birth\s*[-\u2010-\u2015]\s*grade\s*3/i,
    /Human Development Across Grades/i,
  ],
  customize(library, { updateCheck }) {
    const chapter = library.chapters[1];
    const skill = library.skills.find(item => item.id === 'human-development-early-childhood');
    chapter.title = 'Human Development in Early Childhood';
    skill.label = chapter.title;
    chapter.sections[1].heading = 'Play, language, reasoning, and representation';
    chapter.sections[1].content = 'Young children build concepts through responsive interaction, purposeful play, movement, stories, talk, observation, and hands-on exploration. Teachers connect familiar materials and actions with drawings, language, numbers, and other emerging symbols while inviting children to classify, predict, explain, revise, and represent ideas. Current observation and work evidence guide support; chronological age alone does not establish readiness.';
    chapter.sections[2].content = 'Early-childhood settings shape attachment, trust, initiative, belonging, competence, peer relationships, emotion regulation, identity, and emerging moral reasoning. Teachers provide predictable care, meaningful choice, contribution, supported challenge, perspective taking, fair routines, and repair. Developmental frameworks remain interpretive lenses, not diagnoses or fixed identities.';
    chapter.sections[3].heading = 'Play, movement, routines, and responsive challenge';
    chapter.sections[3].content = 'Readiness is specific to a task and reflects experience, language, strategies, motivation, motor access, regulation, relationships, and available support. Purposeful play, movement, exploration, choice, guided participation, and short periods of increasingly sustained work can coexist with explicit teaching and clear learning goals. Teachers preserve meaningful challenge while adjusting access and observing growing independence across settings and time.';

    updateCheck(library, 1, 0, {
      prompt: 'Why should an early-childhood teacher examine cognitive, physical, social, emotional, language, and moral development together?',
      rationale: 'Developmental domains interact in early childhood, while rates and pathways vary among children; teachers use multiple observations, family knowledge, and context rather than one milestone or behavior.',
    });
    updateCheck(library, 1, 1, {
      prompt: 'Which learning experience is most developmentally responsive for young children learning a new classification system?',
      choices: [
        'Start with a long abstract definition only.',
        'Invite children to sort familiar objects, talk about and change the sorting rule, and represent the groups with drawings, words, or symbols.',
        'Require silent memorization before children handle examples.',
        'Use one fixed category and prevent reclassification.',
      ],
      rationale: 'Hands-on exploration, language, comparison, flexible classification, and representation make relationships visible and support emerging symbolic reasoning.',
    });
    updateCheck(library, 1, 3, {
      prompt: 'Which classroom condition best supports a young child navigating initiative versus guilt in Erikson\u2019s original framework?',
      choices: [
        'Reserve every meaningful role for the fastest children.',
        'Use public comparison as the primary motivator.',
        'Prevent children from proposing or trying their own plans.',
        'Provide safe choices, purposeful roles, supported attempts, specific encouragement, and opportunities to repair mistakes without shame.',
      ],
      rationale: 'Initiative is supported when young children can plan, act, contribute, and recover from mistakes with guidance; humiliation or excessive control can discourage purposeful participation.',
    });

    const learnerStimulus = 'Elena is a five-year-old kindergartner who explains science observations accurately during partner talk and builds detailed models. During extended independent drawing-and-writing periods she starts quickly, then stops, erases repeatedly, and says she is not good at school. Her recent work shows strong oral reasoning, accurate labels and short responses, slow written production, and greater persistence when a task is divided into visible steps. Attendance is regular, and no developmental or disability conclusion has been made.';
    library.constructedResponseWorkshops[0].stimulus = learnerStimulus;
    library.constructedResponseWorkshops[1].stimulus = learnerStimulus;
  },
};
