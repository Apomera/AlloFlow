'use strict';
const special = require('../special_education_5355/item_content.cjs');
const { academicInstruction, communicationSelfAdvocacy, strategySelfMonitoring } = require('./authored_instruction.cjs');
const ETS = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5372.pdf';
const EXAM = 'https://praxis.ets.org/test/special-education-teaching-students-with-behavioral-disorders-and-emotional-disturbances-5372.html';
const IDEA_FBA = 'https://sites.ed.gov/idea/regs/b/e/300.530';
const IES_BEHAVIOR = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/31';
const domains = {
  development: ['development-characteristics-ebd', 'Development and Characteristics of Students with EBD'],
  planning: ['planning-managing-learning-environments', 'Planning and Managing the Learning Environments'],
  instruction: ['instruction', 'Instruction'],
  assessment: ['assessment', 'Assessment'],
  professional: ['foundations-professional-responsibilities', 'Foundations and Professional Responsibilities'],
};
const clean = (v) => String(v)
  .replace(/babyish/gi, 'age-inappropriate')
  .replace(/low functioning/gi, 'described only by a global support-needs label')
  .replace(/disability category/gi, 'individual support profile')
  .replace(/student with a disability/gi, 'student with behavioral or emotional support needs');
function qs(parts, a, b) {
  const leadsA = Array.isArray(a) ? a : [a];
  const leadsB = Array.isArray(b) ? b : [b];
  return parts.flatMap(([src, i, x, z]) => src[i].questions.slice(x, z)).map((q, idx) => ({
    ...q,
    promptA: leadsA[idx % leadsA.length] + clean(q.promptA).replace(/^./, (c) => c.toLowerCase()),
    promptB: leadsB[idx % leadsB.length] + clean(q.promptB).replace(/^./, (c) => c.toLowerCase()),
    correct: clean(q.correct),
    distractors: q.distractors.map(clean),
    rationale: clean(q.rationale) + ' For 5372 preparation, define behavior observably, examine ecological and instructional context, distinguish correlation from function, teach a usable replacement skill, use the least intensive effective response, preserve dignity and belonging, and monitor both outcomes and implementation.',
    distractorNotes: Array.isArray(q.distractorNotes) ? q.distractorNotes.map(clean) : undefined,
    difficulty: q.difficulty || 'application',
  }));
}
function bank(id, n, key, label, parts, a, b, refs = []) {
  const [domainId, domain] = domains[key];
  return { id, chapterId: 'ebd5372-ch-' + String(n).padStart(2, '0'), domainId, domain, label, references: [ETS, EXAM, IDEA_FBA, IES_BEHAVIOR, ...refs], questions: qs(parts, a, b) };
}
function authoredBank(id, n, label, questions) {
  const [domainId, domain] = domains.instruction;
  return { id, chapterId: 'ebd5372-ch-' + String(n).padStart(2, '0'), domainId, domain, label, references: [ETS, EXAM, IDEA_FBA, IES_BEHAVIOR], questions };
}

module.exports = [
  bank('development-context-variability', 1, 'development', 'Development, Context, Culture, and Learner Variability', [[special, 0, 0, 9]], 'When interpreting behavioral or emotional development, ', 'When a team compares student performance across settings and relationships, '),
  bank('ebd-characteristics-coexisting-needs', 2, 'development', 'EBD Characteristics, Social-Emotional Development, and Coexisting Needs', [[special, 1, 0, 9]], 'For a student with behavioral or emotional support needs, ', 'When distinguishing an individual pattern from a diagnostic assumption, '),
  bank('individualized-curriculum-programming', 3, 'planning', 'Individualized Curriculum, IEP Goals, and Longitudinal Programming', [[special, 3, 0, 11]], 'While planning an individualized program for a student with EBD, ', 'When aligning present levels, measurable goals, services, and progress evidence, '),
  bank('positive-environments-prevention', 4, 'planning', 'Positive Environments, Prevention, Expectations, and Daily Routines', [[special, 5, 0, 10]], 'In a safe, equitable, positive learning environment, ', 'When preventing predictable behavior barriers before instruction begins, '),
  bank('access-regulation-safety', 5, 'planning', 'Access, Self-Regulation, Sensory and Health Considerations, and Safety', [[special, 2, 0, 5]], 'When an access, regulation, sensory, or health factor may affect behavior, ', 'When coordinating a safe support without exceeding educator scope, '),
  authoredBank('academic-explicit-instruction', 6, 'Explicit Academic Instruction and Responsive Feedback', academicInstruction),
  authoredBank('communication-writing-self-advocacy', 7, 'Communication, Written Expression, Self-Advocacy, and Generalization', communicationSelfAdvocacy),
  authoredBank('strategy-instruction-self-monitoring', 8, 'Strategy Instruction, Task Analysis, Self-Monitoring, and Independence', strategySelfMonitoring),
  bank('assessment-quality-observation', 9, 'assessment', 'Assessment Quality, Direct Observation, and Multiple-Source Evidence', [[special, 6, 0, 8]], 'When selecting or administering an assessment for a student with EBD, ', 'When evaluating the validity and accessibility of behavioral or academic evidence, '),
  bank('fba-eligibility-progress-data', 10, 'assessment', 'FBA, Eligibility, Progress Monitoring, and Data-Based Decisions', [[special, 7, 0, 8], [special, 8, 0, 1]], [
    'During prereferral and tiered behavioral support, ',
    'When evaluating timely referral duties, ',
    'In multidisciplinary family-informed assessment, ',
    'When scoping a comprehensive evaluation, ',
    'While synthesizing multi-source eligibility data, ',
    'During culturally and linguistically fair review, ',
    'Before designing a behavior support plan, ',
    'At an eligibility determination meeting, ',
    'When reviewing weekly behavior and academic trends, ',
  ], 'When progress data are used to test a function hypothesis or revise support, '),
  bank('law-ethics-rights', 11, 'professional', 'Law, Ethics, Rights, Equity, and Restrictive-Procedure Safeguards', [[special, 9, 0, 7]], [
    'In IDEA service-delivery planning for EBD, ',
    'Under affirmative identification obligations, ',
    'Before implementing a placement or evaluation decision, ',
    'While safeguarding confidential student records, ',
    'When considering civil-rights access protections, ',
    'In reviewing disproportionate behavioral referrals, ',
    'Before adopting a restrictive or trending intervention, ',
  ], 'When a proposed behavioral response may affect dignity, access, placement, or rights, '),
  bank('family-team-professional-practice', 12, 'professional', 'Family Partnership, Collaboration, Professional Learning, and Advocacy', [[special, 10, 0, 6]], [
    'In an inclusive EBD classroom partnership, ',
    'When supervising classroom support personnel, ',
    'During a family progress-review conference, ',
    'While embedding related-service strategies in class, ',
    'Before an upcoming student-centered IEP meeting, ',
    'When school staff interpret behavior outcomes differently, ',
  ], 'When an educator coordinates roles, communicates progress, or advocates within professional scope, '),
];
module.exports.sources = { ETS, EXAM, IDEA_FBA, IES_BEHAVIOR };
