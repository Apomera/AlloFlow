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
    .replace(/\bstudents['\u2019]/gi, 'young children\u2019s')
    .replace(/\bstudent['\u2019]s\b/gi, 'young child\u2019s')
    .replace(/\bstudents\b/gi, 'young children')
    .replace(/\bstudent\b/gi, 'young child')
    .replace(/\blearners['\u2019]/gi, 'young children\u2019s')
    .replace(/\blearner['\u2019]s\b/gi, 'young child\u2019s')
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
      correct: 'Follow the individualized emergency plan, protect safety, and activate trained medical procedures.',
      distractors: [
        'Improvise a quick classroom response based on adult intuition rather than following the written health plan.',
        'Offer water, a small snack, or an unprescribed comfort remedy to stabilize the child during the episode.',
        'Wait to activate program emergency procedures until a family member can be reached by phone for advice.',
      ],
      rationale: 'Health support in an early-childhood program or school must follow the individualized plan, staff training, delegation rules, and emergency procedures. Improvised treatment can create risk and exceed an educator\u2019s role.',
      distractorNotes: [
        'Improvising outside the individualized health plan increases medical risk and violates early-childhood nursing delegation and emergency-response protocols.',
        'Giving unauthorized food, liquid, or medication during a seizure or acute health event can cause choking or dangerous medical complications.',
        'Delaying emergency action until family contact is made wastes critical response time; staff must execute the written medical plan first and notify families per protocol.',
      ],
    };
  }
  if (/places every student with a particular disability in the same separate classroom/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A preschool program automatically places every child with a given disability in a separate class. What is the central IDEA Part B concern?',
      promptB: 'A preschooler is assigned to a separate setting solely because of a disability label. Which IDEA Part B principle is violated?',
      correct: 'The IEP team must decide placement individually and educate the child with nondisabled peers under LRE.',
      distractors: [
        'IDEA Part B bars school districts from offering separate preschool special education classes for any child.',
        'A parent holds unilateral authority to choose preschool placement outside the multidisciplinary IEP team.',
        'Once an initial preschool placement is recorded on the IEP, the team cannot revise it during later reviews.',
      ],
      rationale: 'Under IDEA Part B, the IEP team makes an individualized placement decision after developing the IEP and applies least restrictive environment requirements. A continuum must be available, but no setting is automatic for a disability category.',
      distractorNotes: [
        'IDEA Part B requires a full continuum of alternative placements—including separate preschool settings when needed—so separate classrooms are allowed when individualized IEP evidence justifies them.',
        'Families are essential IEP team partners, but preschool placement under Part B is a collaborative team determination grounded in the IEP and LRE criteria rather than a unilateral choice.',
        'Preschool placements under IDEA Part B must be reviewed at least annually and updated whenever a child’s progress or individualized needs warrant a less or more supportive setting.',
      ],
    };
  }
  if (/when must transition content begin in the IEP/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A toddler receiving IDEA Part C services will soon turn three. Which transition-planning action best supports continuity into preschool or other appropriate services?',
      promptB: 'Before a child receiving Part C services reaches age three, which team action is most consistent with IDEA transition planning?',
      correct: 'Plan transition early with family involvement, required notice and consent safeguards, and a transition conference.',
      distractors: [
        'Wait until after the child’s third birthday before discussing preschool eligibility or next community services.',
        'Draft a generic preschool readiness goal unrelated to the child’s current routines and family priorities.',
        'Transfer the child directly into a separate preschool class without evaluating Part B eligibility or family input.',
      ],
      rationale: 'Part C transition planning is family-centered and begins before the child ages out of early intervention. The team follows required notice, approval, conference, and confidentiality procedures and coordinates next steps without presuming eligibility or placement.',
      distractorNotes: [
        'Waiting until after age three violates IDEA Part C transition timelines and risks an abrupt service gap when early-intervention eligibility ends.',
        'Transition outcomes must reflect the child’s present functional routines and family priorities rather than disconnected generic readiness targets.',
        'Part C eligibility does not automatically establish Part B preschool eligibility or placement; teams must follow evaluation, consent, and individualized LRE procedures.',
      ],
    };
  }
  if (/Which transition goal is based on an age-appropriate transition assessment/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'Which IFSP outcome is functional, measurable, and tied to a family-identified routine?',
      promptB: 'A family wants a child to communicate choices during meals. Which outcome is the strongest measurable, routine-based target?',
      correct: 'During family meals, the child will use a word, sign, or picture to choose between two foods in four of five trials.',
      distractors: [
        'Over the coming early-intervention cycle, the child will show noticeably stronger expressive communication skills.',
        'During future elementary school classes, the child will pass every required core academic subject on schedule.',
        'Before entering preschool, the child will sample varied adult workplace routines during community outings.',
      ],
      rationale: 'A strong IFSP outcome describes participation in a meaningful routine, an observable behavior, the conditions in which it occurs, and a criterion for monitoring progress. It reflects the family’s priorities without importing requirements from later grade bands.',
      distractorNotes: [
        'Broad statements about stronger communication lack a natural family routine, observable response mode, and measurable criterion for monitoring IFSP progress.',
        'Future elementary grading standards do not reflect an infant or toddler’s current family-centered routines or functional early-intervention priorities.',
        'Importing workplace exploration into early intervention is developmentally mismatched and ignores the family’s stated mealtime communication priority.',
      ],
    };
  }
  if (/adult-service agency representative to attend an IEP meeting/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A Part C service coordinator wants a preschool-program representative to join a child’s transition conference. What safeguard and responsibility matter?',
      promptB: 'A preschool representative may help plan a child’s move from Part C services. What should the team do before the representative participates?',
      correct: 'Follow family-approval, notice, consent, and privacy safeguards while each agency retains its IDEA duties.',
      distractors: [
        'Invite the outside preschool representative right away without notifying or obtaining approval from the family.',
        'Transfer all ongoing Part C early-intervention responsibilities to the preschool representative once invited.',
        'Postpone all interagency transition coordination until after the child celebrates a third birthday.',
      ],
      rationale: 'Cross-agency transition coordination can support continuity, but it must follow family participation and privacy safeguards. Inviting another representative does not eliminate the lead agency’s or local education agency’s responsibilities under the applicable IDEA process.',
      distractorNotes: [
        'IDEA Part C transition conferences require family approval, prior notice, and confidentiality protections before inviting outside preschool or community participants.',
        'Inviting a preschool partner supports smooth coordination, but the Part C lead agency retains its statutory service duties until transition is completed.',
        'Waiting until after age three violates Part C transition-conference timelines and prevents timely Part B eligibility evaluation and IEP development.',
      ],
    };
  }
  if (/What distinguishes an IFSP emphasis from a school-age IEP emphasis/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'Which statement accurately distinguishes an IDEA Part C IFSP from an IDEA Part B IEP?',
      promptB: 'A team is explaining the shift from Part C early intervention to Part B preschool special education. Which comparison is accurate?',
      correct: 'A Part C IFSP centers family priorities in natural environments; a Part B IEP directs school-based educational access.',
      distractors: [
        'A Part C IFSP and a Part B IEP follow identical rules, differing mainly in the document label for younger children.',
        'A Part C IFSP focuses strictly on clinical child milestones while keeping family routines outside planning.',
        'A Part B IEP is a medical treatment prescription written by a pediatrician rather than an educational team plan.',
      ],
      rationale: 'Part C and Part B use different plans, procedures, and service contexts. The IFSP centers family priorities, functional outcomes, service coordination, and natural environments; the IEP centers the eligible child\u2019s educational program, measurable goals, services, access, and placement.',
      distractorNotes: [
        'Part C IFSPs and Part B IEPs differ substantively in family-centered outcomes, natural-environment rules, review schedules, and service coordination, not just document title.',
        'Family resources, priorities, and everyday routines sit at the heart of a Part C IFSP because early intervention builds caregiver capacity in natural environments.',
        'A Part B IEP is an educational program developed by a multidisciplinary team including parents—not a physician-authored medical treatment order.',
      ],
    };
  }
  if (/school copier independently/i.test(question.promptB)) {
    return {
      ...question,
      promptA: 'A young child is acquiring a multistep hand-washing routine. What is the purpose of task analysis?',
      promptB: 'A preschooler is learning to put away arrival materials independently. Why would the educator begin with a task analysis?',
      correct: 'Break the routine into observable, teachable steps that can be prompted, tracked, and chained.',
      distractors: [
        'Estimate the young child’s overall cognitive ability by timing routine completion against peer norms.',
        'Standardize the routine so every environmental variation is removed across home and preschool settings.',
        'Replace hands-on routine practice with a formal paper-and-pencil test of sequential picture order.',
      ],
      rationale: 'Task analysis identifies the component steps and their sequence. The educator can then select a chaining approach, teach missing steps, record performance, and fade prompts toward independent participation in the routine.',
      distractorNotes: [
        'Task analysis is an instructional sequencing tool for teaching functional routines, not a standardized measure of general intelligence or cognitive potential.',
        'Strong early-childhood task analysis still plans for natural variations across sinks, cubbies, and home routines so independence generalizes beyond one setup.',
        'Paper tests measure picture ordering rather than building fluent hands-on execution of hand-washing or arrival routines in authentic preschool settings.',
      ],
    };
  }
  if (/What does FAPE require at a foundational level under IDEA/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'Under IDEA Part B, what does FAPE require for an eligible preschool- or school-age child?',
      promptB: 'For an eligible child served under IDEA Part B, which statement distinguishes FAPE from a guarantee of a particular outcome?',
      correct: 'Public special education and related services delivered through an appropriate Part B IEP at no cost.',
      distractors: [
        'Public agencies must ensure that every eligible young child reaches identical developmental test benchmarks.',
        'Families contribute tuition or co-payments for related services written into the child’s Part B IEP.',
        'An IDEA disability label determines one uniform preschool instructional package across the district.',
      ],
      rationale: 'FAPE is an IDEA Part B requirement for eligible children and is delivered through an appropriately developed and implemented IEP; it does not guarantee a particular score. IDEA Part C separately provides eligible infants and toddlers early-intervention services through an IFSP.',
      distractorNotes: [
        'Under IDEA Part B, FAPE guarantees an individualized IEP reasonably calculated to enable appropriately ambitious progress—not identical developmental scores for every child.',
        'Special education and required related services on a Part B IEP must be provided at public expense and at no charge to parents.',
        'FAPE requires individualized IEP team decisions tailored to the child’s strengths and needs rather than a standardized category-based preschool program.',
      ],
    };
  }
  if (/school suspects a disability in a student who is passing classes/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'A preschooler participates successfully only because adults provide extensive informal support, and the team suspects a disability. Which IDEA duty remains relevant?',
      promptB: 'A highly mobile young child shows persistent disability-related needs but has not been referred. Which IDEA responsibility applies?',
      correct: 'Child Find requires Part C and Part B agencies to locate, identify, and evaluate potentially eligible children.',
      distractors: [
        'Lead agencies and districts must wait for families to submit a formal written referral before acting.',
        'Successful daily participation with extensive informal adult help suspends IDEA evaluation responsibilities.',
        'The responsible agency should defer referral until the young child fails core early-learning milestones.',
      ],
      rationale: 'Child Find is an affirmative responsibility under both IDEA Part C and Part B. The responsible lead agency or public agency follows the age-applicable referral, screening, evaluation or assessment, consent, notice, and timeline procedures rather than waiting for failure.',
      distractorNotes: [
        'Child Find is an affirmative statutory duty under both Part C and Part B; agencies cannot wait passively for families to initiate a concern when needs are suspected.',
        'Informal adult scaffolding can mask an underlying need for specialized services and does not relieve the public agency of its obligation to follow Child Find procedures.',
        'Waiting for a young child to experience developmental or academic failure contradicts Child Find’s proactive early-identification purpose and delays timely intervention.',
      ],
    };
  }
  if (/contribute meaningfully to an IEP meeting/i.test(question.promptA)) {
    return {
      ...question,
      promptA: 'How can a young child’s voice and preferences be honored meaningfully during IEP planning?',
      promptB: 'A team is preparing an individualized plan for a preschooler with communication needs. Which practice best supports authentic child participation?',
      correct: 'Use accessible communication, play observations, and family insights to reflect the child’s strengths and preferences.',
      distractors: [
        'Have adults read a prewritten script on the child’s behalf without gathering authentic preference observations.',
        'Plan all early-learning routines solely among professionals so child preferences do not complicate scheduling.',
        'Expect a young child to sit silently through a formal adult meeting without visuals or play-based engagement.',
      ],
      rationale: 'Even in early childhood, honoring a learner’s voice supports emerging self-determination when teams gather preference data through play, family input, and accessible communication tools.',
      distractorNotes: [
        'Relying on an adult-scripted summary without observing the child’s actual choices and communication signals misses authentic learner preferences and strengths.',
        'Leaving child interests and family observations out of routine planning reduces engagement and undermines developmentally appropriate, person-centered early intervention.',
        'Requiring a young child to sit passively through adult jargon without accessible supports creates frustration rather than meaningful, age-appropriate participation.',
      ],
    };
  }
  return question;
}

function questions(parts) {
  return parts.flatMap(([bank, start, end]) => source[bank].questions.slice(start, end)).map(repairEarlyChildhoodScope).map((q) => ({
    ...q,
    promptA: adaptText(q.promptA),
    promptB: adaptText(q.promptB),
    correct: adaptText(q.correct),
    distractors: q.distractors.map(adaptText),
    rationale: adaptText(q.rationale) + ' For 5692 preparation, apply the decision to developmentally appropriate, family-centered services from birth through age eight and distinguish IDEA Part C IFSP processes from Part B IEP processes when relevant.',
    distractorNotes: Array.isArray(q.distractorNotes) ? q.distractorNotes.map(adaptText) : undefined,
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
