'use strict';

const SP5355_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dwa68a3c59/pdfs/5355.pdf';
const SP5355_IDEA_324 = 'https://sites.ed.gov/idea/regs/b/d/300.324';
const SP5355_IDEA_320 = 'https://sites.ed.gov/idea/regs/b/d/300.320';
const SP5355_IDEA_114 = 'https://sites.ed.gov/idea/regs/b/b/300.114';
const SP5355_IDEA_116 = 'https://sites.ed.gov/idea/regs/b/b/300.116';
const SP5355_WWC_29 = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/29';
const SP5355_WWC_26 = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/26';
const SP5355_WWC_31 = 'https://ies.ed.gov/ncee/wwc/practiceguide/31';
const SP5355_IDEA_304 = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const SP5355_IDEA_160 = 'https://sites.ed.gov/idea/regs/b/b/300.160';
const SP5355_WWC_12 = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/12';
const SP5355_IDEA_504 = 'https://sites.ed.gov/idea/regs/b/e/300.504';
const SP5355_SEC504 =
  'https://www.ed.gov/laws-and-policy/individuals-disabilities/section-504';
const SP5355_IDEA_530 = 'https://sites.ed.gov/idea/regs/b/e/300.530';

const EBD5372_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5372.pdf';
const EBD5372_TEST =
  'https://praxis.ets.org/test/special-education-teaching-students-with-behavioral-disorders-and-emotional-disturbances-5372.html';
const EBD5372_IDEA_530 = 'https://sites.ed.gov/idea/regs/b/e/300.530';
const EBD5372_WWC_31 = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/31';

function makeEntry({
  id,
  term,
  definition,
  aliases,
  chapterId,
  chapterTitle,
  domainId,
  domainLabel,
  sectionId,
  sectionHeading,
  references,
}) {
  return {
    id,
    term,
    definition,
    aliases,
    chapterIds: [chapterId],
    domainIds: [domainId],
    linkage: {
      occurrences: [
        {
          chapterId,
          chapterTitle,
          domainId,
          domain: domainLabel,
          sectionId,
          sectionHeading,
          occurrences: 1,
        },
      ],
    },
    reviewStatus: 'source-reviewed-editorial-pass',
    references: references.slice(),
  };
}

const special_education_5355 = [
  // Chapter 1: Development, Context, and Learner Variability
  makeEntry({
    id: 'sped5355-gloss-01',
    term: 'Ecological perspective',
    definition:
      'Analytical lens viewing learning as an interaction among student characteristics, task demands, and classroom environments so educators remove access barriers rather than locating deficits solely inside the learner.',
    aliases: ['Learner-task-environment model'],
    chapterId: 'sp5355-ch-01',
    chapterTitle: 'Development, Context, and Learner Variability',
    domainId: 'development-differences',
    domainLabel: 'Human Development and Individual Learning Differences',
    sectionId: 'sp5355-ch-01-section-02',
    sectionHeading: 'The learner-task-environment interaction',
    references: [SP5355_PRAXIS],
  }),
  makeEntry({
    id: 'sped5355-gloss-02',
    term: 'Opportunity to learn',
    definition:
      'Prerequisite condition verifying that a student has received adequate, culturally and linguistically responsive core instruction before attributing persistent academic difficulty to a disability.',
    aliases: ['OTL'],
    chapterId: 'sp5355-ch-01',
    chapterTitle: 'Development, Context, and Learner Variability',
    domainId: 'development-differences',
    domainLabel: 'Human Development and Individual Learning Differences',
    sectionId: 'sp5355-ch-01-section-03',
    sectionHeading: 'Culture, language, and opportunity to learn',
    references: [SP5355_PRAXIS],
  }),

  // Chapter 2: Disability Characteristics and Educational Impact
  makeEntry({
    id: 'sped5355-gloss-03',
    term: 'IDEA disability categories',
    definition:
      'Thirteen federal special education classifications under IDEA, including SLD, autism, intellectual disability, emotional disturbance, and OHI, establishing eligibility via adverse educational impact rather than uniform instruction.',
    aliases: ['13 IDEA categories'],
    chapterId: 'sp5355-ch-02',
    chapterTitle: 'Disability Characteristics and Educational Impact',
    domainId: 'development-differences',
    domainLabel: 'Human Development and Individual Learning Differences',
    sectionId: 'sp5355-ch-02-section-01',
    sectionHeading: 'Categories organize eligibility, not instruction',
    references: [SP5355_PRAXIS],
  }),
  makeEntry({
    id: 'sped5355-gloss-04',
    term: 'Specific learning disability',
    definition:
      'IDEA eligibility category involving a disorder in basic psychological processes for understanding or using spoken or written language, manifesting as difficulty in reading, writing, spelling, or mathematics.',
    aliases: ['SLD'],
    chapterId: 'sp5355-ch-02',
    chapterTitle: 'Disability Characteristics and Educational Impact',
    domainId: 'development-differences',
    domainLabel: 'Human Development and Individual Learning Differences',
    sectionId: 'sp5355-ch-02-section-02',
    sectionHeading: 'Academic and executive-function patterns',
    references: [SP5355_PRAXIS],
  }),

  // Chapter 3: Adaptive, Sensory, Physical, and Health Supports
  makeEntry({
    id: 'sped5355-gloss-05',
    term: 'Individualized Healthcare Plan',
    definition:
      'School-nurse-authored written protocol detailing a student\'s chronic medical conditions, daily health accommodations, delegated care procedures, and emergency responses to ensure safe school participation.',
    aliases: ['IHP'],
    chapterId: 'sp5355-ch-03',
    chapterTitle: 'Adaptive, Sensory, Physical, and Health Supports',
    domainId: 'development-differences',
    domainLabel: 'Human Development and Individual Learning Differences',
    sectionId: 'sp5355-ch-03-section-03',
    sectionHeading: 'Health plans and school safety',
    references: [SP5355_PRAXIS, SP5355_IDEA_324],
  }),
  makeEntry({
    id: 'sped5355-gloss-06',
    term: 'Assistive technology',
    definition:
      'Any low-tech or high-tech device, software, or service evaluated through systematic trials and considered by every IEP team to increase, maintain, or improve a student\'s functional capabilities.',
    aliases: ['AT'],
    chapterId: 'sp5355-ch-03',
    chapterTitle: 'Adaptive, Sensory, Physical, and Health Supports',
    domainId: 'development-differences',
    domainLabel: 'Human Development and Individual Learning Differences',
    sectionId: 'sp5355-ch-03-section-04',
    sectionHeading: 'Adaptive skills, AT trials, and placement',
    references: [SP5355_PRAXIS, SP5355_IDEA_324],
  }),

  // Chapter 4: Individualized Planning, IEPs, LRE, and Transition
  makeEntry({
    id: 'sped5355-gloss-07',
    term: 'Individualized Education Program',
    definition:
      'Legally binding IDEA plan integrating present levels (PLAAFP), measurable annual goals, specially designed instruction (SDI), supplementary aids, related services, and progress reporting.',
    aliases: ['IEP'],
    chapterId: 'sp5355-ch-04',
    chapterTitle: 'Individualized Planning, IEPs, LRE, and Transition',
    domainId: 'planning-instruction-environment',
    domainLabel:
      'Effective Planning and Instruction and Productive Learning Environments',
    sectionId: 'sp5355-ch-04-section-01',
    sectionHeading: 'From present levels to measurable goals',
    references: [SP5355_IDEA_320, SP5355_IDEA_324],
  }),
  makeEntry({
    id: 'sped5355-gloss-08',
    term: 'Least Restrictive Environment',
    definition:
      'IDEA mandate requiring students with disabilities to be educated with nondisabled peers to the maximum extent appropriate, exhausting supplementary aids before moving across the placement continuum.',
    aliases: ['LRE'],
    chapterId: 'sp5355-ch-04',
    chapterTitle: 'Individualized Planning, IEPs, LRE, and Transition',
    domainId: 'planning-instruction-environment',
    domainLabel:
      'Effective Planning and Instruction and Productive Learning Environments',
    sectionId: 'sp5355-ch-04-section-03',
    sectionHeading: 'Accommodation, modification, and LRE',
    references: [SP5355_IDEA_114, SP5355_IDEA_116],
  }),

  // Chapter 5: Explicit Instruction and Curriculum Access
  makeEntry({
    id: 'sped5355-gloss-09',
    term: 'Explicit instruction',
    definition:
      'Core evidence-based method of specially designed instruction (SDI) using clear modeling, guided practice with immediate corrective feedback, scaffolded prompt fading, and cumulative review.',
    aliases: ['Systematic explicit instruction'],
    chapterId: 'sp5355-ch-05',
    chapterTitle: 'Explicit Instruction and Curriculum Access',
    domainId: 'planning-instruction-environment',
    domainLabel:
      'Effective Planning and Instruction and Productive Learning Environments',
    sectionId: 'sp5355-ch-05-section-01',
    sectionHeading: 'The explicit-instruction cycle',
    references: [SP5355_WWC_29, SP5355_WWC_26],
  }),
  makeEntry({
    id: 'sped5355-gloss-10',
    term: 'Universal Design for Learning',
    definition:
      'Proactive instructional framework providing multiple means of engagement, representation, and action and expression from the start so diverse learners access rigorous grade-level standards.',
    aliases: ['UDL'],
    chapterId: 'sp5355-ch-05',
    chapterTitle: 'Explicit Instruction and Curriculum Access',
    domainId: 'planning-instruction-environment',
    domainLabel:
      'Effective Planning and Instruction and Productive Learning Environments',
    sectionId: 'sp5355-ch-05-section-03',
    sectionHeading: 'UDL and responsive grouping',
    references: [SP5355_PRAXIS, SP5355_WWC_29],
  }),

  // Chapter 6: Behavior, Engagement, and Productive Environments
  makeEntry({
    id: 'sped5355-gloss-11',
    term: 'Functional Behavioral Assessment',
    definition:
      'Systematic process collecting ABC observations, interviews, and record data to form a testable hypothesis about the environmental function maintaining a student\'s challenging behavior.',
    aliases: ['FBA'],
    chapterId: 'sp5355-ch-06',
    chapterTitle: 'Behavior, Engagement, and Productive Environments',
    domainId: 'planning-instruction-environment',
    domainLabel:
      'Effective Planning and Instruction and Productive Learning Environments',
    sectionId: 'sp5355-ch-06-section-02',
    sectionHeading: 'From ABC data to a functional hypothesis',
    references: [SP5355_WWC_31, SP5355_IDEA_324],
  }),
  makeEntry({
    id: 'sped5355-gloss-12',
    term: 'Behavior Intervention Plan',
    definition:
      'Written, FBA-driven plan aligned with Positive Behavioral Interventions and Supports (PBIS) specifying antecedent adjustments, functionally equivalent replacement skills, reinforcement, and fidelity checks.',
    aliases: ['BIP'],
    chapterId: 'sp5355-ch-06',
    chapterTitle: 'Behavior, Engagement, and Productive Environments',
    domainId: 'planning-instruction-environment',
    domainLabel:
      'Effective Planning and Instruction and Productive Learning Environments',
    sectionId: 'sp5355-ch-06-section-03',
    sectionHeading: 'Function-based intervention and replacement skills',
    references: [SP5355_WWC_31, SP5355_IDEA_324],
  }),

  // Chapter 7: Assessment Purpose, Quality, and Access
  makeEntry({
    id: 'sped5355-gloss-13',
    term: 'Accommodations vs. modifications',
    definition:
      'Accommodations remove construct-irrelevant access barriers in presentation, response, setting, or timing without altering grade-level standards, whereas modifications change learning or grading expectations.',
    aliases: ['Instructional and testing adaptations'],
    chapterId: 'sp5355-ch-07',
    chapterTitle: 'Assessment Purpose, Quality, and Access',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5355-ch-07-section-03',
    sectionHeading: 'Cultural, linguistic, sensory, and communication access',
    references: [SP5355_PRAXIS, SP5355_IDEA_160],
  }),
  makeEntry({
    id: 'sped5355-gloss-14',
    term: 'Criterion-referenced vs. norm-referenced assessment',
    definition:
      'Criterion-referenced measures evaluate mastery against specific curricular standards to guide instruction, whereas norm-referenced tests compare a student\'s performance against a standardized peer sample.',
    aliases: ['Criterion- vs. norm-referenced'],
    chapterId: 'sp5355-ch-07',
    chapterTitle: 'Assessment Purpose, Quality, and Access',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5355-ch-07-section-04',
    sectionHeading: 'Interpretation and observation',
    references: [SP5355_PRAXIS, SP5355_IDEA_304],
  }),

  // Chapter 8: Evaluation, Eligibility, and Intervention
  makeEntry({
    id: 'sped5355-gloss-15',
    term: 'Multi-Tiered System of Supports',
    definition:
      'Schoolwide prevention framework integrating universal screening, tiered academic and behavioral interventions (RTI and PBIS), and progress data that cannot be used to delay an IDEA evaluation.',
    aliases: ['MTSS', 'RTI'],
    chapterId: 'sp5355-ch-08',
    chapterTitle: 'Evaluation, Eligibility, and Intervention',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5355-ch-08-section-01',
    sectionHeading: 'Prereferral support and timely evaluation',
    references: [SP5355_PRAXIS, SP5355_IDEA_304],
  }),
  makeEntry({
    id: 'sped5355-gloss-16',
    term: 'Nondiscriminatory evaluation',
    definition:
      'IDEA evaluation mandate requiring valid, multi-measure assessment across all suspected disability areas in the student\'s native language or mode, free of racial, cultural, or linguistic bias.',
    aliases: ['Comprehensive IDEA evaluation'],
    chapterId: 'sp5355-ch-08',
    chapterTitle: 'Evaluation, Eligibility, and Intervention',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5355-ch-08-section-02',
    sectionHeading: 'Comprehensive evaluation in all suspected areas',
    references: [SP5355_PRAXIS, SP5355_IDEA_304],
  }),

  // Chapter 9: Progress Monitoring and Data-Based Decisions
  makeEntry({
    id: 'sped5355-gloss-17',
    term: 'Progress monitoring',
    definition:
      'Frequent, brief administration of comparable measures such as curriculum-based measurement (CBM) to track growth from baseline, verify intervention effectiveness, and guide IEP instructional adjustments.',
    aliases: ['Curriculum-based measurement', 'CBM'],
    chapterId: 'sp5355-ch-09',
    chapterTitle: 'Progress Monitoring and Data-Based Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5355-ch-09-section-01',
    sectionHeading: 'Comparable repeated measurement',
    references: [SP5355_PRAXIS, SP5355_WWC_12],
  }),
  makeEntry({
    id: 'sped5355-gloss-18',
    term: 'Goal line and decision rules',
    definition:
      'Visual trajectory connecting baseline performance to the target IEP mastery criterion, paired with predetermined data rules specifying when to intensify, modify, or raise instructional goals.',
    aliases: ['Aimline', 'Data-based individualization'],
    chapterId: 'sp5355-ch-09',
    chapterTitle: 'Progress Monitoring and Data-Based Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5355-ch-09-section-02',
    sectionHeading: 'Level, trend, goal line, and variability',
    references: [SP5355_WWC_12, SP5355_IDEA_320],
  }),

  // Chapter 10: Law, Ethics, Safeguards, and Equity
  makeEntry({
    id: 'sped5355-gloss-19',
    term: 'Free Appropriate Public Education',
    definition:
      'Core IDEA and Section 504 right guaranteeing special education and related services at public expense, anchored by Child Find identification and an individualized program enabling ambitious progress.',
    aliases: ['FAPE'],
    chapterId: 'sp5355-ch-10',
    chapterTitle: 'Law, Ethics, Safeguards, and Equity',
    domainId: 'professional-practice-collaboration',
    domainLabel: 'Professional Learning, Practice, and Collaboration',
    sectionId: 'sp5355-ch-10-section-01',
    sectionHeading: 'FAPE, Child Find, and individualized entitlement',
    references: [SP5355_PRAXIS, SP5355_SEC504],
  }),
  makeEntry({
    id: 'sped5355-gloss-20',
    term: 'Procedural safeguards',
    definition:
      'Statutory IDEA protections including prior written notice, informed parental consent, independent evaluations, due process hearings, and manifestation determination reviews (MDR) during discipline.',
    aliases: ['Prior written notice', 'IDEA due process'],
    chapterId: 'sp5355-ch-10',
    chapterTitle: 'Law, Ethics, Safeguards, and Equity',
    domainId: 'professional-practice-collaboration',
    domainLabel: 'Professional Learning, Practice, and Collaboration',
    sectionId: 'sp5355-ch-10-section-02',
    sectionHeading: 'Participation and procedural safeguards',
    references: [SP5355_IDEA_504, SP5355_IDEA_530],
  }),

  // Chapter 11: Collaboration with Families and School Teams
  makeEntry({
    id: 'sped5355-gloss-21',
    term: 'Co-teaching',
    definition:
      'Collaborative instructional delivery in which general and special educators share co-planning, teaching, and assessment ownership in an inclusive classroom through station, parallel, or team models.',
    aliases: ['Collaborative teaching'],
    chapterId: 'sp5355-ch-11',
    chapterTitle: 'Collaboration with Families and School Teams',
    domainId: 'professional-practice-collaboration',
    domainLabel: 'Professional Learning, Practice, and Collaboration',
    sectionId: 'sp5355-ch-11-section-01',
    sectionHeading: 'Co-teaching is shared ownership',
    references: [SP5355_PRAXIS, SP5355_IDEA_324],
  }),
  makeEntry({
    id: 'sped5355-gloss-22',
    term: 'Paraprofessional supervision',
    definition:
      'Licensed educator responsibility to plan instruction, define clear role boundaries, train and give feedback to paraeducators, and coach systematic prompt fading to prevent student prompt dependence.',
    aliases: ['Paraeducator direction'],
    chapterId: 'sp5355-ch-11',
    chapterTitle: 'Collaboration with Families and School Teams',
    domainId: 'professional-practice-collaboration',
    domainLabel: 'Professional Learning, Practice, and Collaboration',
    sectionId: 'sp5355-ch-11-section-02',
    sectionHeading: 'Paraprofessional direction and learner independence',
    references: [SP5355_PRAXIS, SP5355_IDEA_324],
  }),

  // Chapter 12: Professional Learning, Advocacy, and Boundaries
  makeEntry({
    id: 'sped5355-gloss-23',
    term: 'Professional role boundaries',
    definition:
      'Ethical practice limits requiring special educators to work within licensure scope, avoid diagnosing medical conditions, protect FERPA confidentiality, and fulfill legal mandatory reporting duties.',
    aliases: ['Scope of practice'],
    chapterId: 'sp5355-ch-12',
    chapterTitle: 'Professional Learning, Advocacy, and Boundaries',
    domainId: 'professional-practice-collaboration',
    domainLabel: 'Professional Learning, Practice, and Collaboration',
    sectionId: 'sp5355-ch-12-section-03',
    sectionHeading: 'Advocacy, safety, and role boundaries',
    references: [SP5355_PRAXIS, SP5355_IDEA_324],
  }),
  makeEntry({
    id: 'sped5355-gloss-24',
    term: 'Secondary transition planning',
    definition:
      'Results-oriented IDEA process required by age 16 (or earlier by state) using age-appropriate transition assessments, measurable postsecondary goals, and consented interagency coordination.',
    aliases: ['IDEA transition services'],
    chapterId: 'sp5355-ch-12',
    chapterTitle: 'Professional Learning, Advocacy, and Boundaries',
    domainId: 'professional-practice-collaboration',
    domainLabel: 'Professional Learning, Practice, and Collaboration',
    sectionId: 'sp5355-ch-12-section-04',
    sectionHeading: 'Transition coordination and current requirements',
    references: [SP5355_PRAXIS, SP5355_IDEA_324],
  }),
];

const special_education_behavior_emotional_5372 = [
  // Chapter 1: Development, Context, Culture, and Learner Variability
  makeEntry({
    id: 'ebd5372-gloss-01',
    term: 'Topography vs. function of behavior',
    definition:
      'Distinction between what an observable behavior looks like physically (topography) and the environmental outcome maintaining it (function, such as escape or attention), which dictates effective intervention.',
    aliases: ['Behavioral function'],
    chapterId: 'ebd5372-ch-01',
    chapterTitle: 'Development, Context, Culture, and Learner Variability',
    domainId: 'development-characteristics-ebd',
    domainLabel: 'Development and Characteristics of Students with EBD',
    sectionId: 'ebd5372-ch-01-section-01',
    sectionHeading:
      'Core frame: Development, Context, Culture, and Learner Variability',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
  makeEntry({
    id: 'ebd5372-gloss-02',
    term: 'ABC behavioral analysis',
    definition:
      'Structured observation logging immediate antecedents, operationally defined behaviors, and ensuing consequences across contexts to uncover maintaining contingencies and build testable FBA hypotheses.',
    aliases: ['Antecedent-Behavior-Consequence log'],
    chapterId: 'ebd5372-ch-01',
    chapterTitle: 'Development, Context, Culture, and Learner Variability',
    domainId: 'development-characteristics-ebd',
    domainLabel: 'Development and Characteristics of Students with EBD',
    sectionId: 'ebd5372-ch-01-section-02',
    sectionHeading:
      'Decision routine: Development, Context, Culture, and Learner Variability',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 2: EBD Characteristics, Social-Emotional Development, and Coexisting Needs
  makeEntry({
    id: 'ebd5372-gloss-03',
    term: 'Internalizing vs. externalizing behaviors',
    definition:
      'Core EBD behavioral dimensions contrasting inward-directed distress (anxiety, depression, social withdrawal, somatic complaints) with outward-directed actions (aggression, defiance, disruption).',
    aliases: ['Internalizing and externalizing profiles'],
    chapterId: 'ebd5372-ch-02',
    chapterTitle:
      'EBD Characteristics, Social-Emotional Development, and Coexisting Needs',
    domainId: 'development-characteristics-ebd',
    domainLabel: 'Development and Characteristics of Students with EBD',
    sectionId: 'ebd5372-ch-02-section-01',
    sectionHeading:
      'Core frame: EBD Characteristics, Social-Emotional Development, and Coexisting Needs',
    references: [EBD5372_PRAXIS, EBD5372_TEST],
  }),
  makeEntry({
    id: 'ebd5372-gloss-04',
    term: 'Setting events',
    definition:
      'Distal biological, environmental, or social conditions, such as poor sleep, medication changes, trauma reminders, or peer conflict, that heighten reactivity to immediate classroom triggers.',
    aliases: ['Establishing operations'],
    chapterId: 'ebd5372-ch-02',
    chapterTitle:
      'EBD Characteristics, Social-Emotional Development, and Coexisting Needs',
    domainId: 'development-characteristics-ebd',
    domainLabel: 'Development and Characteristics of Students with EBD',
    sectionId: 'ebd5372-ch-02-section-02',
    sectionHeading:
      'Decision routine: EBD Characteristics, Social-Emotional Development, and Coexisting Needs',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 3: Individualized Curriculum, IEP Goals, and Longitudinal Programming
  makeEntry({
    id: 'ebd5372-gloss-05',
    term: 'Measurable behavioral IEP goals',
    definition:
      'Observable, baseline-anchored annual IEP objectives derived from PLAAFP behavioral data specifying target replacement or coping skills, instructional conditions, mastery criteria, and review schedules.',
    aliases: ['Behavioral PLAAFP goals'],
    chapterId: 'ebd5372-ch-03',
    chapterTitle:
      'Individualized Curriculum, IEP Goals, and Longitudinal Programming',
    domainId: 'planning-managing-learning-environments',
    domainLabel: 'Planning and Managing the Learning Environments',
    sectionId: 'ebd5372-ch-03-section-01',
    sectionHeading:
      'Core frame: Individualized Curriculum, IEP Goals, and Longitudinal Programming',
    references: [EBD5372_PRAXIS, EBD5372_TEST],
  }),
  makeEntry({
    id: 'ebd5372-gloss-06',
    term: 'Longitudinal transition planning',
    definition:
      'Multi-year IEP programming aligning grade-level academic access, social-emotional maintenance, student self-advocacy, and community linkages to sustain stability across grade and postsecondary transitions.',
    aliases: ['EBD transition alignment'],
    chapterId: 'ebd5372-ch-03',
    chapterTitle:
      'Individualized Curriculum, IEP Goals, and Longitudinal Programming',
    domainId: 'planning-managing-learning-environments',
    domainLabel: 'Planning and Managing the Learning Environments',
    sectionId: 'ebd5372-ch-03-section-03',
    sectionHeading:
      'Instruction and regulation: Individualized Curriculum, IEP Goals, and Longitudinal Programming',
    references: [EBD5372_PRAXIS, EBD5372_TEST],
  }),

  // Chapter 4: Positive Environments, Prevention, Expectations, and Daily Routines
  makeEntry({
    id: 'ebd5372-gloss-07',
    term: 'Antecedent-based interventions',
    definition:
      'Proactive Tier 1 PBIS and classroom prevention practices, including clear expectations, predictable transitions, precorrection, and choice making, that eliminate behavioral triggers before escalation.',
    aliases: ['Precorrection', 'Proactive behavior supports'],
    chapterId: 'ebd5372-ch-04',
    chapterTitle:
      'Positive Environments, Prevention, Expectations, and Daily Routines',
    domainId: 'planning-managing-learning-environments',
    domainLabel: 'Planning and Managing the Learning Environments',
    sectionId: 'ebd5372-ch-04-section-01',
    sectionHeading:
      'Core frame: Positive Environments, Prevention, Expectations, and Daily Routines',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
  makeEntry({
    id: 'ebd5372-gloss-08',
    term: 'Trauma-informed de-escalation',
    definition:
      'Calm, dignity-preserving response strategy reducing verbal demands, avoiding power struggles and public shaming, prioritizing physical and emotional safety, and guiding aroused students back to regulation.',
    aliases: ['Non-coercive de-escalation'],
    chapterId: 'ebd5372-ch-04',
    chapterTitle:
      'Positive Environments, Prevention, Expectations, and Daily Routines',
    domainId: 'planning-managing-learning-environments',
    domainLabel: 'Planning and Managing the Learning Environments',
    sectionId: 'ebd5372-ch-04-section-04',
    sectionHeading:
      'Safety and ethics: Positive Environments, Prevention, Expectations, and Daily Routines',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 5: Access, Self-Regulation, Sensory and Health Considerations, and Safety
  makeEntry({
    id: 'ebd5372-gloss-09',
    term: 'Co-regulation and self-regulation',
    definition:
      'Scaffolded progression where calm adult coaching, interoceptive arousal cues, and structured coping menus teach students to recognize stress early and independently manage emotional responses.',
    aliases: ['Emotional self-regulation'],
    chapterId: 'ebd5372-ch-05',
    chapterTitle:
      'Access, Self-Regulation, Sensory and Health Considerations, and Safety',
    domainId: 'planning-managing-learning-environments',
    domainLabel: 'Planning and Managing the Learning Environments',
    sectionId: 'ebd5372-ch-05-section-03',
    sectionHeading:
      'Instruction and regulation: Access, Self-Regulation, Sensory and Health Considerations, and Safety',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
  makeEntry({
    id: 'ebd5372-gloss-10',
    term: 'Individualized crisis safety plan',
    definition:
      'Team-developed emergency protocol specifying early escalation cues, de-escalation actions, staff roles, strict imminent-harm thresholds for trained response, and mandatory post-crisis debriefing.',
    aliases: ['Crisis intervention plan'],
    chapterId: 'ebd5372-ch-05',
    chapterTitle:
      'Access, Self-Regulation, Sensory and Health Considerations, and Safety',
    domainId: 'planning-managing-learning-environments',
    domainLabel: 'Planning and Managing the Learning Environments',
    sectionId: 'ebd5372-ch-05-section-04',
    sectionHeading:
      'Safety and ethics: Access, Self-Regulation, Sensory and Health Considerations, and Safety',
    references: [EBD5372_PRAXIS, EBD5372_IDEA_530],
  }),

  // Chapter 6: Explicit Academic Instruction and Responsive Feedback
  makeEntry({
    id: 'ebd5372-gloss-11',
    term: 'Academic-behavior reciprocity',
    definition:
      'Bidirectional cycle in which mismatched task difficulty triggers escape-maintained behavior, whereas explicit modeling, chunked tasks, and frequent opportunities to respond strengthen engagement.',
    aliases: ['Instructional frustration cycle'],
    chapterId: 'ebd5372-ch-06',
    chapterTitle: 'Explicit Academic Instruction and Responsive Feedback',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ebd5372-ch-06-section-01',
    sectionHeading:
      'Core frame: Explicit Academic Instruction and Responsive Feedback',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
  makeEntry({
    id: 'ebd5372-gloss-12',
    term: 'High-probability request sequence',
    definition:
      'Antecedent instructional tactic presenting three to five brief, easily completed tasks with specific praise immediately before a harder demand to build behavioral momentum and reduce avoidance.',
    aliases: ['Behavioral momentum'],
    chapterId: 'ebd5372-ch-06',
    chapterTitle: 'Explicit Academic Instruction and Responsive Feedback',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ebd5372-ch-06-section-03',
    sectionHeading:
      'Instruction and regulation: Explicit Academic Instruction and Responsive Feedback',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 7: Communication, Written Expression, Self-Advocacy, and Generalization
  makeEntry({
    id: 'ebd5372-gloss-13',
    term: 'Social skills generalization',
    definition:
      'Deliberate instructional design embedding authentic peer interactions, varied cues, and natural reinforcers so newly taught social, pragmatic, and self-advocacy skills transfer across settings.',
    aliases: ['Cross-setting skill transfer'],
    chapterId: 'ebd5372-ch-07',
    chapterTitle:
      'Communication, Written Expression, Self-Advocacy, and Generalization',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ebd5372-ch-07-section-01',
    sectionHeading:
      'Core frame: Communication, Written Expression, Self-Advocacy, and Generalization',
    references: [EBD5372_PRAXIS, EBD5372_TEST],
  }),
  makeEntry({
    id: 'ebd5372-gloss-14',
    term: 'Functional Communication Training',
    definition:
      'Evidence-based intervention teaching a socially appropriate, lower-effort communicative response, such as requesting a break or assistance, that serves the exact same function as challenging behavior.',
    aliases: ['FCT'],
    chapterId: 'ebd5372-ch-07',
    chapterTitle:
      'Communication, Written Expression, Self-Advocacy, and Generalization',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ebd5372-ch-07-section-03',
    sectionHeading:
      'Instruction and regulation: Communication, Written Expression, Self-Advocacy, and Generalization',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 8: Strategy Instruction, Task Analysis, Self-Monitoring, and Independence
  makeEntry({
    id: 'ebd5372-gloss-15',
    term: 'Self-monitoring',
    definition:
      'Self-management routine in which students observe, privately record, and graph their own target academic or behavioral performance to strengthen executive regulation and fade adult prompt dependence.',
    aliases: ['Self-management', 'Self-graphing'],
    chapterId: 'ebd5372-ch-08',
    chapterTitle:
      'Strategy Instruction, Task Analysis, Self-Monitoring, and Independence',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ebd5372-ch-08-section-01',
    sectionHeading:
      'Core frame: Strategy Instruction, Task Analysis, Self-Monitoring, and Independence',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
  makeEntry({
    id: 'ebd5372-gloss-16',
    term: 'Self-Regulated Strategy Development',
    definition:
      'Six-stage explicit cognitive strategy model pairing academic task mastery with goal setting, self-instruction, self-monitoring, and self-reinforcement to increase student persistence and independence.',
    aliases: ['SRSD'],
    chapterId: 'ebd5372-ch-08',
    chapterTitle:
      'Strategy Instruction, Task Analysis, Self-Monitoring, and Independence',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ebd5372-ch-08-section-03',
    sectionHeading:
      'Instruction and regulation: Strategy Instruction, Task Analysis, Self-Monitoring, and Independence',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 9: Assessment Quality, Direct Observation, and Multiple-Source Evidence
  makeEntry({
    id: 'ebd5372-gloss-17',
    term: 'Multi-source behavioral triangulation',
    definition:
      'Synthesizing direct observations, multi-informant caregiver and teacher rating scales, interviews, and records across contexts to ensure culturally fair, valid decisions without single-score reliance.',
    aliases: ['Multi-informant assessment'],
    chapterId: 'ebd5372-ch-09',
    chapterTitle:
      'Assessment Quality, Direct Observation, and Multiple-Source Evidence',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'ebd5372-ch-09-section-01',
    sectionHeading:
      'Core frame: Assessment Quality, Direct Observation, and Multiple-Source Evidence',
    references: [EBD5372_PRAXIS, EBD5372_TEST],
  }),
  makeEntry({
    id: 'ebd5372-gloss-18',
    term: 'Direct behavioral observation',
    definition:
      'Objective measurement of operationally defined behaviors in natural settings using frequency, duration, latency, or interval recording verified by interobserver agreement rather than subjective labels.',
    aliases: ['Event and interval recording'],
    chapterId: 'ebd5372-ch-09',
    chapterTitle:
      'Assessment Quality, Direct Observation, and Multiple-Source Evidence',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'ebd5372-ch-09-section-02',
    sectionHeading:
      'Decision routine: Assessment Quality, Direct Observation, and Multiple-Source Evidence',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),

  // Chapter 10: FBA, Eligibility, Progress Monitoring, and Data-Based Decisions
  makeEntry({
    id: 'ebd5372-gloss-19',
    term: 'Differential reinforcement',
    definition:
      'Function-based BIP strategy reinforcing alternative or incompatible replacement behaviors (DRA/DRI) while placing problem behavior on extinction by withholding its maintaining reinforcer and planning for bursts.',
    aliases: ['DRA', 'DRI'],
    chapterId: 'ebd5372-ch-10',
    chapterTitle:
      'FBA, Eligibility, Progress Monitoring, and Data-Based Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'ebd5372-ch-10-section-03',
    sectionHeading:
      'Instruction and regulation: FBA, Eligibility, Progress Monitoring, and Data-Based Decisions',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
  makeEntry({
    id: 'ebd5372-gloss-20',
    term: 'Emotional disturbance vs. social maladjustment',
    definition:
      'IDEA eligibility boundary requiring long-term, marked emotional characteristics that adversely affect educational performance while excluding students who are solely socially maladjusted without ED.',
    aliases: ['IDEA ED exclusionary clause'],
    chapterId: 'ebd5372-ch-10',
    chapterTitle:
      'FBA, Eligibility, Progress Monitoring, and Data-Based Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'ebd5372-ch-10-section-04',
    sectionHeading:
      'Safety and ethics: FBA, Eligibility, Progress Monitoring, and Data-Based Decisions',
    references: [EBD5372_PRAXIS, EBD5372_IDEA_530],
  }),

  // Chapter 11: Law, Ethics, Rights, Equity, and Restrictive-Procedure Safeguards
  makeEntry({
    id: 'ebd5372-gloss-21',
    term: 'Manifestation Determination Review',
    definition:
      'Required IDEA team review within 10 school days of a disciplinary change of placement to evaluate whether misconduct was caused by the student\'s disability or a failure to implement the IEP.',
    aliases: ['MDR'],
    chapterId: 'ebd5372-ch-11',
    chapterTitle:
      'Law, Ethics, Rights, Equity, and Restrictive-Procedure Safeguards',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ebd5372-ch-11-section-02',
    sectionHeading:
      'Decision routine: Law, Ethics, Rights, Equity, and Restrictive-Procedure Safeguards',
    references: [EBD5372_IDEA_530, EBD5372_PRAXIS],
  }),
  makeEntry({
    id: 'ebd5372-gloss-22',
    term: 'Restraint and seclusion safeguards',
    definition:
      'Legal and ethical standards restricting physical restraint or seclusion strictly to emergencies involving imminent physical harm, prohibiting aversive or punitive use, and mandating notice and BIP review.',
    aliases: ['Restrictive-procedure limits'],
    chapterId: 'ebd5372-ch-11',
    chapterTitle:
      'Law, Ethics, Rights, Equity, and Restrictive-Procedure Safeguards',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ebd5372-ch-11-section-04',
    sectionHeading:
      'Safety and ethics: Law, Ethics, Rights, Equity, and Restrictive-Procedure Safeguards',
    references: [EBD5372_IDEA_530, EBD5372_PRAXIS],
  }),

  // Chapter 12: Family Partnership, Collaboration, Professional Learning, and Advocacy
  makeEntry({
    id: 'ebd5372-gloss-23',
    term: 'Wraparound interagency collaboration',
    definition:
      'Strengths-based, family-driven care process uniting schools, mental health clinicians, and community agencies around one individualized plan supporting students with intensive EBD needs across settings.',
    aliases: ['Wraparound services', 'System of care'],
    chapterId: 'ebd5372-ch-12',
    chapterTitle:
      'Family Partnership, Collaboration, Professional Learning, and Advocacy',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ebd5372-ch-12-section-01',
    sectionHeading:
      'Core frame: Family Partnership, Collaboration, Professional Learning, and Advocacy',
    references: [EBD5372_PRAXIS, EBD5372_TEST],
  }),
  makeEntry({
    id: 'ebd5372-gloss-24',
    term: 'Family-centered behavioral partnership',
    definition:
      'Reciprocal, blame-free alliance engaging caregivers as equal team experts via culturally responsive two-way updates, qualified interpreters, and aligned home-school reinforcement and coaching routines.',
    aliases: ['Home-school collaboration'],
    chapterId: 'ebd5372-ch-12',
    chapterTitle:
      'Family Partnership, Collaboration, Professional Learning, and Advocacy',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ebd5372-ch-12-section-02',
    sectionHeading:
      'Decision routine: Family Partnership, Collaboration, Professional Learning, and Advocacy',
    references: [EBD5372_PRAXIS, EBD5372_WWC_31],
  }),
];

module.exports = {
  special_education_5355,
  special_education_behavior_emotional_5372,
};
