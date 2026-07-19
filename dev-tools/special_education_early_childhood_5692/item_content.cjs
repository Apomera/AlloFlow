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
    .replace(/\bmiddle school students?\b/gi, 'young child')
    .replace(/\bhigh school (?:students?|learners?)\b/gi, 'young child')
    .replace(/\btransition-age learners?\b/gi, 'young child')
    .replace(/\bstudents['\u2019]/gi, "young children's")
    .replace(/\bstudent['\u2019]s\b/gi, "young child's")
    .replace(/\bstudents\b/gi, 'young children')
    .replace(/\bstudent\b/gi, 'young child')
    .replace(/\blearners['\u2019]/gi, "young children's")
    .replace(/\blearner['\u2019]s\b/gi, "young child's")
    .replace(/\blearners\b/gi, 'young children')
    .replace(/\blearner\b/gi, 'young child')
    .replace(/\bclassmates\b/gi, 'same-age peers')
    .replace(/\bclassroom teachers\b/gi, 'early childhood special educators')
    .replace(/\bclassroom teacher\b/gi, 'early childhood special educator')
    .replace(/\bteachers\b/gi, 'early childhood special educators')
    .replace(/\bteacher\b/gi, 'early childhood special educator')
    .replace(/fast-paced seminar/gi, 'small-group story and discussion activity')
    .replace(/discussion-heavy class/gi, 'language-rich small-group activity')
    .replace(/long lecture/gi, 'lengthy whole-group lesson')
    .replace(/\bA early\b/g, 'An early')
    .replace(/\ba early\b/g, 'an early')
    .replace(/^young children\b/, 'Young children')
    .replace(/^young child\b/, 'Young child')
    .replace(/^early childhood special educator\b/, 'Early childhood special educator');
}

function repairEarlyChildhoodScope(question) {
  if (/documented seizure action plan/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A young child has a documented seizure action plan. During a seizure in the program, what should trained staff do first?',
      promptB: 'A young child experiences a health event covered by an individualized emergency plan. What is the correct response?',
      correct: 'Follow the individualized emergency plan, protect safety, and activate trained medical or emergency procedures as specified.',
      distractors: ['Create a new response based on what seems convenient.', 'Give food or medication not authorized in the plan.', 'Delay action until a family member can be reached.'],
      rationale: 'Health support in an early-childhood program or school must follow the individualized plan, staff training, delegation rules, and emergency procedures. Improvised treatment can create risk and exceed an educator\u2019s role.',
    };
  }  if (/places every student with a particular disability in the same separate classroom/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A preschool program automatically places every child with a given disability in a separate class. What is the central IDEA Part B concern?',
      promptB: 'A preschooler is assigned to a separate setting solely because of a disability label. Which IDEA Part B principle is violated?',
      correct: 'The IEP team must determine placement individually and educate the child with nondisabled peers to the maximum extent appropriate under LRE requirements.',
      distractors: ['IDEA Part B prohibits every separate placement regardless of individual need.', 'One parent must select placement without an IEP team decision.', 'A preschool placement can never change after the initial decision.'],
      rationale: 'Under IDEA Part B, the IEP team makes an individualized placement decision after developing the IEP and applies least restrictive environment requirements. A continuum must be available, but no setting is automatic for a disability category.',
    };
  }  if (/when must transition content begin in the IEP/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A toddler receiving IDEA Part C services will soon turn three. Which transition-planning action best supports continuity into preschool or other appropriate services?',
      promptB: 'Before a child receiving Part C services reaches age three, which team action is most consistent with IDEA transition planning?',
      correct: 'With family involvement and the required notice, consent, and confidentiality safeguards, plan the transition early and convene the appropriate transition conference.',
      distractors: ['Wait until after the third birthday before discussing next services.', 'Write a goal unrelated to the child’s current routines and family priorities.', 'Transfer the child automatically without reviewing eligibility or family priorities.'],
      rationale: 'Part C transition planning is family-centered and begins before the child ages out of early intervention. The team follows required notice, approval, conference, and confidentiality procedures and coordinates next steps without presuming eligibility or placement.',
    };
  }
  if (/Which transition goal is based on an age-appropriate transition assessment/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'Which IFSP outcome is functional, measurable, and tied to a family-identified routine?',
      promptB: 'A family wants a child to communicate choices during meals. Which outcome is the strongest measurable, routine-based target?',
      correct: 'During family meals, the child will use a word, sign, or picture to choose between two foods in four of five opportunities across two weeks.',
      distractors: ['The child will improve communication sometime.', 'The child will pass every future class.', 'The child will explore careers before entering preschool.'],
      rationale: 'A strong IFSP outcome describes participation in a meaningful routine, an observable behavior, the conditions in which it occurs, and a criterion for monitoring progress. It reflects the family’s priorities without importing requirements from later grade bands.',
    };
  }
  if (/adult-service agency representative to attend an IEP meeting/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A Part C service coordinator wants a preschool-program representative to join a child’s transition conference. What safeguard and responsibility matter?',
      promptB: 'A preschool representative may help plan a child’s move from Part C services. What should the team do before the representative participates?',
      correct: 'Follow family-approval, notice, consent, and confidentiality requirements while the responsible agencies retain their own IDEA duties.',
      distractors: ['Invite any outside participant without informing the family.', 'Transfer every early-intervention responsibility to the preschool representative.', 'Delay all coordination until after the child turns three.'],
      rationale: 'Cross-agency transition coordination can support continuity, but it must follow family participation and privacy safeguards. Inviting another representative does not eliminate the lead agency’s or local education agency’s responsibilities under the applicable IDEA process.',
    };
  }
  if (/What distinguishes an IFSP emphasis from a school-age IEP emphasis/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'Which statement accurately distinguishes an IDEA Part C IFSP from an IDEA Part B IEP?',
      promptB: 'A team is explaining the shift from Part C early intervention to Part B preschool special education. Which comparison is accurate?',
      correct: 'A Part C IFSP is family-centered and addresses functional outcomes and services in natural environments; a Part B IEP addresses the child\u2019s educational access, goals, services, and placement.',
      distractors: ['A Part C IFSP is simply a Part B IEP with a different title.', 'A Part C IFSP excludes family priorities from planning.', 'A Part B IEP is a medical treatment plan written by a physician.'],
      rationale: 'Part C and Part B use different plans, procedures, and service contexts. The IFSP centers family priorities, functional outcomes, service coordination, and natural environments; the IEP centers the eligible child\u2019s educational program, measurable goals, services, access, and placement.',
    };
  }
  if (/school copier independently/i.test(question.promptB)) {
    return {
      ...question,
      promptA: 'A young child is acquiring a multistep hand-washing routine. What is the purpose of task analysis?',
      promptB: 'A preschooler is learning to put away arrival materials independently. Why would the educator begin with a task analysis?',
      correct: 'To break the complex routine into observable, teachable steps that can be prompted, measured, and chained.',
      distractors: ['To measure general intelligence.', 'To remove all natural variation from the routine.', 'To replace instruction with a written test.'],
      rationale: 'Task analysis identifies the component steps and their sequence. The educator can then select a chaining approach, teach missing steps, record performance, and fade prompts toward independent participation in the routine.',
    };
  }
  if (/What does FAPE require at a foundational level under IDEA/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'Under IDEA Part B, what does FAPE require for an eligible preschool- or school-age child?',
      promptB: 'For an eligible child served under IDEA Part B, which statement distinguishes FAPE from a guarantee of a particular outcome?',
      correct: 'Special education and related services are provided at public expense through an appropriately developed and implemented IEP that meets Part B requirements.',
      distractors: ['The school guarantees that every child reaches the same achievement level.', 'The family pays for related services required by the IEP.', 'A disability label alone determines one standard program.'],
      rationale: 'FAPE is an IDEA Part B requirement for eligible children and is delivered through an appropriately developed and implemented IEP; it does not guarantee a particular score. IDEA Part C separately provides eligible infants and toddlers early-intervention services through an IFSP.',
    };
  }
  if (/school suspects a disability in a student who is passing classes/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A preschooler participates successfully only because adults provide extensive informal support, and the team suspects a disability. Which IDEA duty remains relevant?',
      promptB: 'A highly mobile young child shows persistent disability-related needs but has not been referred. Which IDEA responsibility applies?',
      correct: 'Child Find requires the responsible Part C or Part B agency to identify, locate, and evaluate or assess children who may be eligible; mobility or informal support does not remove that duty.',
      distractors: ['Only families may initiate a concern about possible eligibility.', 'Successful participation with extensive informal help eliminates every evaluation or assessment duty.', 'The responsible agency may wait until the child fails an age-appropriate activity.'],
      rationale: 'Child Find is an affirmative responsibility under both IDEA Part C and Part B. The responsible lead agency or public agency follows the age-applicable referral, screening, evaluation or assessment, consent, notice, and timeline procedures rather than waiting for failure.',
    };
  }  return question;
}

function questions(parts) {
  return parts.flatMap(([bank, start, end]) => source[bank].questions.slice(start, end)).map(repairEarlyChildhoodScope).map((q) => ({
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
