'use strict';
const special = require('../special_education_5355/item_content.cjs');
const { functionalLiteracy, writingCommunication, functionalMathematics } = require('./authored_instruction.cjs');
const ETS = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5322.pdf';
const EXAM = 'https://praxis.ets.org/test/special-education-teaching-students-with-intellectual-disabilities-5322.html';
const IDEA = 'https://sites.ed.gov/idea/regs/b';
const AAIDD = 'https://www.aaidd.org/intellectual-disability/definition';
const domains = {
  development: ['development-characteristics-intellectual-disabilities', 'Development and Characteristics of Students with Intellectual Disabilities'],
  planning: ['planning-managing-learning-environment', 'Planning and Managing the Learning Environment'],
  instruction: ['instruction', 'Instruction'],
  assessment: ['assessment', 'Assessment'],
  professional: ['foundations-professional-responsibilities', 'Foundations and Professional Responsibilities'],
};
const clean = (v) => String(v)
  .replace(/babyish/gi, 'age-inappropriate')
  .replace(/low functioning/gi, 'described only by a global support-needs label')
  .replace(/disability category/gi, 'individual support profile')
  .replace(/student with a disability/gi, 'student with an intellectual disability');
function qs(parts, a, b) {
  const leadsA = Array.isArray(a) ? a : [a];
  const leadsB = Array.isArray(b) ? b : [b];
  return parts.flatMap(([src, i, x, z]) => src[i].questions.slice(x, z)).map((q, idx) => ({
    ...q,
    promptA: leadsA[idx % leadsA.length] + clean(q.promptA).replace(/^./, (c) => c.toLowerCase()),
    promptB: leadsB[idx % leadsB.length] + clean(q.promptB).replace(/^./, (c) => c.toLowerCase()),
    correct: clean(q.correct),
    distractors: q.distractors.map(clean),
    rationale: clean(q.rationale) + ' For 5322 preparation, connect intellectual and adaptive evidence to individualized, age-respectful instruction; presume competence; integrate communication, functional, academic, social, self-determination, and transition goals; fade support toward agency; and monitor meaningful participation and generalization.',
    distractorNotes: Array.isArray(q.distractorNotes) ? q.distractorNotes.map(clean) : undefined,
    difficulty: q.difficulty || 'application',
  }));
}
function bank(id, n, key, label, parts, a, b, refs = []) {
  const [domainId, domain] = domains[key];
  return { id, chapterId: 'id5322-ch-' + String(n).padStart(2, '0'), domainId, domain, label, references: [ETS, EXAM, IDEA, AAIDD, ...refs], questions: qs(parts, a, b) };
}
function authoredBank(id, n, label, questions) {
  const [domainId, domain] = domains.instruction;
  return { id, chapterId: 'id5322-ch-' + String(n).padStart(2, '0'), domainId, domain, label, references: [ETS, EXAM, IDEA, AAIDD], questions };
}

module.exports = [
  bank('development-adaptive-context', 1, 'development', 'Development, Adaptive Behavior, Context, and Learner Variability', [[special, 0, 0, 9]], [
    'In reviewing early developmental evidence, ',
    'Across contrasting classroom contexts, ',
    'To plan proactive self-regulation routines, ',
    'When evaluating multilingual student performance, ',
    'While selecting functional instructional materials, ',
    'To promote durable skill transfer across school routines, ',
    'When drafting an objective learner profile, ',
    'Following major family or housing transitions, ',
    'Before reducing academic expectations after a single low probe, ',
  ], [
    'When a team compares early language functioning across settings, ',
    'While analyzing task engagement across structured and unstructured routines, ',
    'Before choosing self-regulation supports for independent work, ',
    'When interpreting multilingual concept sorting and drawings, ',
    'To keep daily-living lessons chronological-age respectful, ',
    'When programming communication transfer into natural routines, ',
    'While documenting actionable developmental present levels, ',
    'After external stressors disrupt sleep and attendance, ',
    'Before revising an instructional program from one session, ',
  ]),
  bank('id-characteristics-coexisting-needs', 2, 'development', 'Intellectual-Disability Characteristics and Coexisting Communication, Sensory, Motor, and Health Needs', [[special, 1, 0, 9]], [
    'When an academic profile shows clear strengths alongside targeted needs, ',
    'To support sensory predictability during school safety routines, ',
    'When analyzing how organizational scaffolds affect task initiation, ',
    'In reviewing context-dependent peer-group conflict, ',
    'While evaluating adaptive and cognitive support needs, ',
    'When expressive speech production differs from content mastery, ',
    'In coordinating services for co-occurring visual and motor needs, ',
    'During foundational word-reading intervention, ',
    'When two learners respond differently to the same instructional tool, ',
  ], [
    'When uneven academic performance appears across subjects, ',
    'To address auditory transition distress proactively, ',
    'When interim deadlines improve sustained project completion, ',
    'While comparing competitive and cooperative classroom participation, ',
    'During a comprehensive intellectual-disability support review, ',
    'When an AAC user requires extended response time in discussion, ',
    'While planning safe laboratory access for interacting sensory-motor needs, ',
    'When addressing persistent word-guessing patterns in reading, ',
    'When learners with similar profiles show distinct support preferences, ',
  ]),
  bank('person-centered-iep-transition', 3, 'planning', 'Person-Centered IEPs, Measurable Goals, Self-Determination, and Transition', [[special, 3, 0, 11]], [
    'While drafting baseline present-level evidence, ',
    'In writing an annual IEP objective, ',
    'When auditing a draft IEP for completeness, ',
    'While checking alignment between IEP goals and service delivery, ',
    'In distinguishing assessment access from curricular change, ',
    'For a student with an intellectual disability, ',
    'When planning an individualized school program, ',
    'When applying least restrictive environment placement rules, ',
    'In planning federal secondary transition timelines, ',
    'While writing postsecondary transition outcomes, ',
    'When comparing early-intervention and school-age service plans, ',
  ], [
    'When documenting measurable written-expression baselines, ',
    'While revising an imprecise reading fluency target, ',
    'To answer family questions about tracking annual math growth, ',
    'When communication goals lack aligned instructional services, ',
    'While classifying extended time on reading comprehension checks, ',
    'In fulfilling assistive-technology duties for text and writing access, ',
    'When balancing deficit scores with strengths and parent priorities, ',
    'When convenience conflicts with inclusive placement criteria, ',
    'To verify required federal transition-planning start dates, ',
    'When grounding postsecondary goals in transition assessment data, ',
    'While explaining Part C IFSP and Part B IEP distinctions, ',
  ]),
  bank('adaptive-access-technology', 4, 'planning', 'Adaptive Skills, Communication, Assistive Technology, Health, and Safe Access', [[special, 2, 0, 8]], [
    'When making dense visual worksheets perceptible, ',
    'To ensure full seminar communication access, ',
    'While arranging safe science-lab workstations, ',
    'During an acute classroom health emergency, ',
    'When drafting a measurable daily-living target, ',
    'Before selecting text-to-speech software, ',
    'When reviewing category-based classroom assignments, ',
    'To reduce classroom lighting and noise barriers, ',
  ], [
    'When adapting image-only graphs for a blind learner, ',
    'While planning discussion access for a hard-of-hearing student, ',
    'To enable active motor participation at a lab station, ',
    'When executing a documented school medical emergency protocol, ',
    'While targeting practical adaptive independence goals, ',
    'Before approving speech-to-text for extended writing, ',
    'When evaluating individualized placement against category rules, ',
    'While monitoring low-distraction sensory break supports, ',
  ]),
  bank('positive-environments-routines', 5, 'planning', 'Positive Environments, Behavior Support, Inclusion, and Daily Routines', [[special, 5, 0, 7]], [
    'To maximize structured arrival instructional time, ',
    'When analyzing escape-maintained worksheet tearing, ',
    'While designing an attention-aligned behavior plan, ',
    'When selecting a functionally equivalent help routine, ',
    'To strengthen expected classroom start behaviors, ',
    'While increasing active whole-class review responding, ',
    'To boost writing initiation without lowering rigor, ',
  ], [
    'When clarifying the opening ten minutes of class, ',
    'While tracing antecedents and consequences of hallway removal, ',
    'In matching an intervention to adult-attention call-outs, ',
    'When teaching a replacement for crumpling unclear assignments, ',
    'To deliver effective transition acknowledgment, ',
    'When restructuring a passive lecture for active participation, ',
    'While using task-order choice to build learner agency, ',
  ]),
  authoredBank('functional-literacy-language', 6, 'Functional and Academic Literacy, Language, Vocabulary, and Comprehension', functionalLiteracy),
  authoredBank('writing-communication-self-advocacy', 7, 'Writing, Communication, Self-Advocacy, and Expression', writingCommunication),
  authoredBank('functional-mathematics-strategies', 8, 'Functional Mathematics, Task Analysis, Strategy Instruction, and Generalization', functionalMathematics),
  bank('assessment-quality-eligibility', 9, 'assessment', 'Assessment Quality, Eligibility, Adaptive Evidence, and Accessibility', [[special, 6, 0, 8]], 'When selecting or administering assessment for a student with an intellectual disability, ', 'When an eligibility team interprets intellectual and adaptive evidence from multiple sources, '),
  bank('progress-fba-alternate-assessment', 10, 'assessment', 'Progress Monitoring, FBA, Alternate Assessment, and Program Decisions', [[special, 7, 0, 8]], 'When using progress, functional, or alternate-assessment evidence, ', 'When data are used to revise instruction, support, or a cautious function hypothesis, '),
  bank('law-ethics-rights-family', 11, 'professional', 'Law, Ethics, Rights, Family Partnership, and Safeguards', [[special, 9, 0, 7], [special, 11, 0, 1]], 'When applying rights and ethical safeguards for a student with an intellectual disability, ', 'When family partnership, dignity, confidentiality, or legal procedure shapes a decision, '),
  bank('collaboration-professional-practice', 12, 'professional', 'Collaboration, Related Services, Paraprofessional Supervision, Advocacy, and Professional Learning', [[special, 10, 0, 6]], 'During interdisciplinary and family collaboration for a student with an intellectual disability, ', 'When coordinating related services, paraprofessionals, community resources, and professional roles, '),
];
module.exports.sources = { ETS, EXAM, IDEA, AAIDD };
