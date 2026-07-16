'use strict';

const source = require('../special_education_5355/item_content.cjs');
const ETS = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5692.pdf';
const EXAM = 'https://praxis.ets.org/test/special-education-early-childhoodearly-intervention-5692.html';
const IDEA_C = 'https://sites.ed.gov/idea/regs/c';
const IDEA_B = 'https://sites.ed.gov/idea/regs/b';
const NAEYC = 'https://www.naeyc.org/resources/position-statements/dap/principles';

const domains = {
  child: ['child-development-early-learning', 'Child Development and Early Learning'],
  curriculum: ['curriculum-planning-instruction', 'Curriculum, Planning, and Instruction'],
  assessment: ['assessment', 'Assessment'],
  partnering: ['partnering-collaborating', 'Partnering and Collaborating'],
  legal: ['legal-ethical-professionalism', 'Legal and Ethical Practices and Professionalism'],
};

function adaptText(value) {
  return String(value)
    .replace(/middle school student/gi, 'young child')
    .replace(/high school (student|learner)/gi, 'young child')
    .replace(/transition-age learner/gi, 'young child and family')
    .replace(/student/gi, 'young child')
    .replace(/learner/gi, 'young child')
    .replace(/classmates/gi, 'same-age peers')
    .replace(/classroom/gi, 'inclusive early-learning setting')
    .replace(/teacher/gi, 'early childhood special educator')
    .replace(/\bschool\b/gi, 'early intervention or school program')
    .replace(/IEP/gi, 'IFSP or IEP');
}

function questions(parts) {
  return parts.flatMap(([bank, start, end]) => source[bank].questions.slice(start, end)).map((q) => ({
    ...q,
    promptA: adaptText(q.promptA),
    promptB: adaptText(q.promptB),
    correct: adaptText(q.correct),
    distractors: q.distractors.map(adaptText),
    rationale: adaptText(q.rationale) + ' For 5692 preparation, apply the decision to developmentally appropriate, family-centered services from birth through age eight and distinguish IDEA Part C IFSP processes from Part B IEP processes when relevant.',
  }));
}

function bank(id, chapter, domainKey, label, parts, references = []) {
  const [domainId, domain] = domains[domainKey];
  return { id, chapterId: `se5692-ch-${String(chapter).padStart(2, '0')}`, domainId, domain, label, references: [ETS, EXAM, ...references], questions: questions(parts) };
}

module.exports = [
  bank('development-patterns-context', 1, 'child', 'Developmental Patterns, Context, and Relationships', [[0, 0, 9]], [NAEYC]),
  bank('variability-disability-access', 2, 'child', 'Learner Variability, Disability, Sensory, and Health Access', [[1, 0, 9], [2, 0, 3]], [NAEYC]),
  bank('adaptive-inclusive-access', 3, 'curriculum', 'Adaptive Skills and Inclusive Access', [[2, 3, 8]], [IDEA_B]),
  bank('ifsp-iep-individualized-planning', 4, 'curriculum', 'IFSP, IEP, Outcomes, and Individualized Planning', [[3, 0, 11]], [IDEA_C, IDEA_B]),
  bank('instruction-intervention-routines', 5, 'curriculum', 'Explicit Instruction, Intervention, and Natural Routines', [[4, 0, 9]], [NAEYC]),
  bank('instructional-response-observation', 6, 'assessment', 'Instructional Response and Systematic Observation', [[4, 9, 11], [5, 0, 5]], [IDEA_C]),
  bank('functional-behavior-evidence', 7, 'assessment', 'Functional, Behavioral, and Ecological Evidence', [[5, 5, 10]], [IDEA_B]),
  bank('assessment-quality-progress', 8, 'assessment', 'Assessment Quality, Progress Monitoring, and Decisions', [[6, 0, 8]], [IDEA_C, IDEA_B]),
  bank('evaluation-family-input', 9, 'partnering', 'Evaluation, Eligibility, and Family Knowledge', [[7, 0, 8]], [IDEA_C, IDEA_B]),
  bank('team-coordination-transitions', 10, 'partnering', 'Team Coordination, Communication, and Transitions', [[8, 0, 7], [10, 0, 3]], [IDEA_C]),
  bank('rights-ethics-equity', 11, 'legal', 'Rights, Ethics, Equity, and Safeguards', [[9, 0, 7]], [IDEA_C, IDEA_B]),
  bank('professional-practice-collaboration', 12, 'legal', 'Professional Practice, Collaboration, and Advocacy', [[10, 3, 6], [11, 0, 6]], [IDEA_C, IDEA_B]),
];

module.exports.sources = { ETS, EXAM, IDEA_C, IDEA_B, NAEYC };
