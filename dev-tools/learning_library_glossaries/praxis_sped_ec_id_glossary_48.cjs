'use strict';

const ECSE_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5692.pdf';
const ECSE_NAEYC =
  'https://www.naeyc.org/resources/position-statements/dap/principles';
const ECSE_IDEA_B = 'https://sites.ed.gov/idea/regs/b';
const ECSE_IDEA_C = 'https://sites.ed.gov/idea/regs/c';

const ID_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5322.pdf';
const ID_IDEA_B = 'https://sites.ed.gov/idea/regs/b';
const ID_AAIDD = 'https://www.aaidd.org/intellectual-disability/definition';

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

const special_education_early_childhood_5692 = [
  // Chapter 1: Developmental Patterns, Context, and Relationships
  makeEntry({
    id: 'ecse5692-gloss-01',
    term: 'Developmentally appropriate practice',
    definition:
      'NAEYC early childhood framework integrating common developmental progressions, each child\'s individual strengths and needs, and family cultural and linguistic contexts to guide responsive, play-based instruction.',
    aliases: ['DAP'],
    chapterId: 'se5692-ch-01',
    chapterTitle: 'Developmental Patterns, Context, and Relationships',
    domainId: 'child-development-early-learning',
    domainLabel: 'Child Development and Early Learning',
    sectionId: 'se5692-ch-01-section-01',
    sectionHeading:
      'Core frame: Developmental Patterns, Context, and Relationships',
    references: [ECSE_PRAXIS, ECSE_NAEYC],
  }),
  makeEntry({
    id: 'ecse5692-gloss-02',
    term: 'Serve-and-return interaction',
    definition:
      'Reciprocal caregiver-child exchange in which an adult notices and responds contingently to an infant\'s or toddler\'s vocalizations, gestures, or gaze, building foundational neural pathways for language and attachment.',
    aliases: ['Contingent responsiveness'],
    chapterId: 'se5692-ch-01',
    chapterTitle: 'Developmental Patterns, Context, and Relationships',
    domainId: 'child-development-early-learning',
    domainLabel: 'Child Development and Early Learning',
    sectionId: 'se5692-ch-01-section-03',
    sectionHeading:
      'Applied example: Developmental Patterns, Context, and Relationships',
    references: [ECSE_PRAXIS, ECSE_NAEYC],
  }),

  // Chapter 2: Learner Variability, Disability, Sensory, and Health Access
  makeEntry({
    id: 'ecse5692-gloss-03',
    term: 'Developmental delay',
    definition:
      'Noncategorical IDEA eligibility option for young children exhibiting measurable lags in physical, cognitive, communication, social-emotional, or adaptive development without requiring an early specific disability label.',
    aliases: ['DD'],
    chapterId: 'se5692-ch-02',
    chapterTitle:
      'Learner Variability, Disability, Sensory, and Health Access',
    domainId: 'child-development-early-learning',
    domainLabel: 'Child Development and Early Learning',
    sectionId: 'se5692-ch-02-section-01',
    sectionHeading:
      'Core frame: Learner Variability, Disability, Sensory, and Health Access',
    references: [ECSE_PRAXIS, ECSE_NAEYC],
  }),
  makeEntry({
    id: 'ecse5692-gloss-04',
    term: 'Individualized health care plan',
    definition:
      'Nurse-developed written protocol detailing daily medical procedures, medication administration, positioning or feeding safeguards, and emergency responses so medically fragile young children participate safely in early settings.',
    aliases: ['IHCP', 'IHP'],
    chapterId: 'se5692-ch-02',
    chapterTitle:
      'Learner Variability, Disability, Sensory, and Health Access',
    domainId: 'child-development-early-learning',
    domainLabel: 'Child Development and Early Learning',
    sectionId: 'se5692-ch-02-section-02',
    sectionHeading:
      'Decision routine: Learner Variability, Disability, Sensory, and Health Access',
    references: [ECSE_PRAXIS, ECSE_NAEYC],
  }),

  // Chapter 3: Adaptive Skills and Inclusive Access
  makeEntry({
    id: 'ecse5692-gloss-05',
    term: 'Assistive technology',
    definition:
      'Any low-tech or high-tech device, equipment, or software, such as adapted utensils, slant boards, switches, or communication boards, used to increase, maintain, or improve a young child\'s functional participation.',
    aliases: ['AT'],
    chapterId: 'se5692-ch-03',
    chapterTitle: 'Adaptive Skills and Inclusive Access',
    domainId: 'curriculum-planning-instruction',
    domainLabel: 'Curriculum, Planning, and Instruction',
    sectionId: 'se5692-ch-03-section-01',
    sectionHeading: 'Core frame: Adaptive Skills and Inclusive Access',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),
  makeEntry({
    id: 'ecse5692-gloss-06',
    term: 'Augmentative and alternative communication',
    definition:
      'Unaided and aided methods, including gestures, manual signs, picture exchange systems, and speech-generating devices, that supplement or replace speech for young children with complex communication needs.',
    aliases: ['AAC'],
    chapterId: 'se5692-ch-03',
    chapterTitle: 'Adaptive Skills and Inclusive Access',
    domainId: 'curriculum-planning-instruction',
    domainLabel: 'Curriculum, Planning, and Instruction',
    sectionId: 'se5692-ch-03-section-02',
    sectionHeading: 'Decision routine: Adaptive Skills and Inclusive Access',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),

  // Chapter 4: IFSP, IEP, Outcomes, and Individualized Planning
  makeEntry({
    id: 'ecse5692-gloss-07',
    term: 'Individualized Family Service Plan',
    definition:
      'Written IDEA Part C plan for infants and toddlers from birth through age two detailing present developmental levels, family-identified priorities, measurable functional outcomes, early intervention services, and six-month reviews.',
    aliases: ['IFSP'],
    chapterId: 'se5692-ch-04',
    chapterTitle: 'IFSP, IEP, Outcomes, and Individualized Planning',
    domainId: 'curriculum-planning-instruction',
    domainLabel: 'Curriculum, Planning, and Instruction',
    sectionId: 'se5692-ch-04-section-01',
    sectionHeading:
      'Core frame: IFSP, IEP, Outcomes, and Individualized Planning',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-08',
    term: 'Natural environments',
    definition:
      'IDEA Part C mandate requiring early intervention services to occur in settings typical for same-age peers without disabilities, such as homes and community child care, unless an IFSP documents a justified alternative.',
    aliases: ['Natural settings'],
    chapterId: 'se5692-ch-04',
    chapterTitle: 'IFSP, IEP, Outcomes, and Individualized Planning',
    domainId: 'curriculum-planning-instruction',
    domainLabel: 'Curriculum, Planning, and Instruction',
    sectionId: 'se5692-ch-04-section-02',
    sectionHeading:
      'Decision routine: IFSP, IEP, Outcomes, and Individualized Planning',
    references: [ECSE_IDEA_C, ECSE_IDEA_B],
  }),

  // Chapter 5: Explicit Instruction, Intervention, and Natural Routines
  makeEntry({
    id: 'ecse5692-gloss-09',
    term: 'Embedded learning opportunities',
    definition:
      'Planned, intentional teaching episodes woven into everyday classroom or home routines and play activities to target specific Part C IFSP outcomes or Part B IEP goals without pulling the young child away from peers.',
    aliases: ['ELO', 'Embedded instruction'],
    chapterId: 'se5692-ch-05',
    chapterTitle: 'Explicit Instruction, Intervention, and Natural Routines',
    domainId: 'curriculum-planning-instruction',
    domainLabel: 'Curriculum, Planning, and Instruction',
    sectionId: 'se5692-ch-05-section-01',
    sectionHeading:
      'Core frame: Explicit Instruction, Intervention, and Natural Routines',
    references: [ECSE_PRAXIS, ECSE_NAEYC],
  }),
  makeEntry({
    id: 'ecse5692-gloss-10',
    term: 'Routines-based intervention',
    definition:
      'Family-centered early intervention model that maps daily caregiving and play routines to write functional outcomes and coach caregivers to embed skill practice naturally throughout the child\'s day.',
    aliases: ['RBI'],
    chapterId: 'se5692-ch-05',
    chapterTitle: 'Explicit Instruction, Intervention, and Natural Routines',
    domainId: 'curriculum-planning-instruction',
    domainLabel: 'Curriculum, Planning, and Instruction',
    sectionId: 'se5692-ch-05-section-03',
    sectionHeading:
      'Applied example: Explicit Instruction, Intervention, and Natural Routines',
    references: [ECSE_PRAXIS, ECSE_NAEYC],
  }),

  // Chapter 6: Instructional Response and Systematic Observation
  makeEntry({
    id: 'ecse5692-gloss-11',
    term: 'Anecdotal record',
    definition:
      'Brief, objective, dated narrative documenting an observable child behavior, antecedent context, and dialogue during authentic play or routines, kept free of subjective labels to inform instructional adjustments.',
    aliases: ['Anecdotal observation'],
    chapterId: 'se5692-ch-06',
    chapterTitle: 'Instructional Response and Systematic Observation',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'se5692-ch-06-section-01',
    sectionHeading:
      'Core frame: Instructional Response and Systematic Observation',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-12',
    term: 'Time sampling',
    definition:
      'Systematic observation method recording whether a target behavior such as peer engagement or vocalization occurs during predetermined intervals, helping teams quantify engagement patterns and intervention response.',
    aliases: ['Interval recording'],
    chapterId: 'se5692-ch-06',
    chapterTitle: 'Instructional Response and Systematic Observation',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'se5692-ch-06-section-02',
    sectionHeading:
      'Decision routine: Instructional Response and Systematic Observation',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),

  // Chapter 7: Functional, Behavioral, and Ecological Evidence
  makeEntry({
    id: 'ecse5692-gloss-13',
    term: 'Pyramid Model',
    definition:
      'Multi-tiered early childhood framework supporting social-emotional competence through nurturing relationships and supportive environments (Tier 1), targeted social skills teaching (Tier 2), and individualized function-based plans (Tier 3).',
    aliases: ['Pyramid Model for Social-Emotional Competence'],
    chapterId: 'se5692-ch-07',
    chapterTitle: 'Functional, Behavioral, and Ecological Evidence',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'se5692-ch-07-section-01',
    sectionHeading:
      'Core frame: Functional, Behavioral, and Ecological Evidence',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),
  makeEntry({
    id: 'ecse5692-gloss-14',
    term: 'Antecedent-Behavior-Consequence data',
    definition:
      'Direct observation log capturing events immediately preceding and following a young child\'s challenging behavior across routines to determine its communicative function and guide proactive environmental supports.',
    aliases: ['ABC data', 'ABC recording'],
    chapterId: 'se5692-ch-07',
    chapterTitle: 'Functional, Behavioral, and Ecological Evidence',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'se5692-ch-07-section-02',
    sectionHeading:
      'Decision routine: Functional, Behavioral, and Ecological Evidence',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),

  // Chapter 8: Assessment Quality, Progress Monitoring, and Decisions
  makeEntry({
    id: 'ecse5692-gloss-15',
    term: 'Developmental screening',
    definition:
      'Brief, standardized check across developmental domains to identify young children at potential risk and determine whether referral for a comprehensive multidisciplinary evaluation is warranted, never used alone for eligibility.',
    aliases: ['Early screening'],
    chapterId: 'se5692-ch-08',
    chapterTitle: 'Assessment Quality, Progress Monitoring, and Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'se5692-ch-08-section-01',
    sectionHeading:
      'Core frame: Assessment Quality, Progress Monitoring, and Decisions',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-16',
    term: 'Authentic assessment',
    definition:
      'Ongoing evaluation of a young child\'s functional skills during familiar play and daily routines across home and classroom settings, combining caregiver input and observation to capture real-world competence accurately.',
    aliases: ['Play-based assessment'],
    chapterId: 'se5692-ch-08',
    chapterTitle: 'Assessment Quality, Progress Monitoring, and Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'se5692-ch-08-section-02',
    sectionHeading:
      'Decision routine: Assessment Quality, Progress Monitoring, and Decisions',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),

  // Chapter 9: Evaluation, Eligibility, and Family Knowledge
  makeEntry({
    id: 'ecse5692-gloss-17',
    term: 'Child Find',
    definition:
      'Federal IDEA mandate requiring states and local agencies to actively identify, locate, and evaluate all infants, toddlers, and children from birth through age 21 suspected of having a disability or developmental delay.',
    aliases: ['IDEA Child Find'],
    chapterId: 'se5692-ch-09',
    chapterTitle: 'Evaluation, Eligibility, and Family Knowledge',
    domainId: 'partnering-collaborating',
    domainLabel: 'Partnering and Collaborating',
    sectionId: 'se5692-ch-09-section-01',
    sectionHeading:
      'Core frame: Evaluation, Eligibility, and Family Knowledge',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-18',
    term: 'Arena assessment',
    definition:
      'Collaborative early childhood evaluation format in which one facilitator interacts with the child and caregiver during natural play while multidisciplinary specialists observe and score simultaneously across developmental domains.',
    aliases: ['Transdisciplinary play-based assessment'],
    chapterId: 'se5692-ch-09',
    chapterTitle: 'Evaluation, Eligibility, and Family Knowledge',
    domainId: 'partnering-collaborating',
    domainLabel: 'Partnering and Collaborating',
    sectionId: 'se5692-ch-09-section-02',
    sectionHeading:
      'Decision routine: Evaluation, Eligibility, and Family Knowledge',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),

  // Chapter 10: Team Coordination, Communication, and Transitions
  makeEntry({
    id: 'ecse5692-gloss-19',
    term: 'Transdisciplinary teaming',
    definition:
      'Collaborative early intervention model in which specialists cross disciplinary boundaries and share expertise through a designated primary service provider who coaches the family, minimizing fragmented therapies.',
    aliases: ['Primary Service Provider model', 'PSP model'],
    chapterId: 'se5692-ch-10',
    chapterTitle: 'Team Coordination, Communication, and Transitions',
    domainId: 'partnering-collaborating',
    domainLabel: 'Partnering and Collaborating',
    sectionId: 'se5692-ch-10-section-01',
    sectionHeading:
      'Core frame: Team Coordination, Communication, and Transitions',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-20',
    term: 'Part C-to-Part B transition',
    definition:
      'IDEA-mandated planning process moving eligible toddlers from Part C early intervention to Part B preschool services by age three, including a written transition plan and conference held at least 90 days before age three.',
    aliases: ['Transition conference'],
    chapterId: 'se5692-ch-10',
    chapterTitle: 'Team Coordination, Communication, and Transitions',
    domainId: 'partnering-collaborating',
    domainLabel: 'Partnering and Collaborating',
    sectionId: 'se5692-ch-10-section-02',
    sectionHeading:
      'Decision routine: Team Coordination, Communication, and Transitions',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),

  // Chapter 11: Rights, Ethics, Equity, and Safeguards
  makeEntry({
    id: 'ecse5692-gloss-21',
    term: 'DEC Recommended Practices',
    definition:
      'Evidence-based guidance from CEC\'s Division for Early Childhood specifying high-quality leadership, assessment, environment, family, instruction, interaction, teaming, and transition practices for young children.',
    aliases: ['Division for Early Childhood Recommended Practices'],
    chapterId: 'se5692-ch-11',
    chapterTitle: 'Rights, Ethics, Equity, and Safeguards',
    domainId: 'legal-ethical-professionalism',
    domainLabel: 'Legal and Ethical Practices and Professionalism',
    sectionId: 'se5692-ch-11-section-01',
    sectionHeading: 'Core frame: Rights, Ethics, Equity, and Safeguards',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-22',
    term: 'Procedural safeguards',
    definition:
      'Statutory IDEA protections guaranteeing families receive prior written notice in their native language, give informed written consent for evaluations and services, inspect confidential records, and access dispute resolution.',
    aliases: ['IDEA parental rights'],
    chapterId: 'se5692-ch-11',
    chapterTitle: 'Rights, Ethics, Equity, and Safeguards',
    domainId: 'legal-ethical-professionalism',
    domainLabel: 'Legal and Ethical Practices and Professionalism',
    sectionId: 'se5692-ch-11-section-02',
    sectionHeading: 'Decision routine: Rights, Ethics, Equity, and Safeguards',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),

  // Chapter 12: Professional Practice, Collaboration, and Advocacy
  makeEntry({
    id: 'ecse5692-gloss-23',
    term: 'Family-centered coaching',
    definition:
      'Adult-learning partnership in which early interventionists use joint planning, observation, modeling, practice, reflection, and feedback to build caregiver confidence and capacity to support child learning between visits.',
    aliases: ['Caregiver coaching'],
    chapterId: 'se5692-ch-12',
    chapterTitle: 'Professional Practice, Collaboration, and Advocacy',
    domainId: 'legal-ethical-professionalism',
    domainLabel: 'Legal and Ethical Practices and Professionalism',
    sectionId: 'se5692-ch-12-section-02',
    sectionHeading:
      'Decision routine: Professional Practice, Collaboration, and Advocacy',
    references: [ECSE_PRAXIS, ECSE_IDEA_C],
  }),
  makeEntry({
    id: 'ecse5692-gloss-24',
    term: 'Reflective practice',
    definition:
      'Systematic professional habit of examining instructional decisions, cultural assumptions, family interactions, and child progress data, often with a mentor or team, to improve equitable early intervention outcomes.',
    aliases: ['Reflective supervision'],
    chapterId: 'se5692-ch-12',
    chapterTitle: 'Professional Practice, Collaboration, and Advocacy',
    domainId: 'legal-ethical-professionalism',
    domainLabel: 'Legal and Ethical Practices and Professionalism',
    sectionId: 'se5692-ch-12-section-03',
    sectionHeading:
      'Applied example: Professional Practice, Collaboration, and Advocacy',
    references: [ECSE_PRAXIS, ECSE_IDEA_B],
  }),
];

const special_education_intellectual_disabilities_5322 = [
  // Chapter 1: Development, Adaptive Behavior, Context, and Learner Variability
  makeEntry({
    id: 'id5322-gloss-01',
    term: 'Adaptive behavior',
    definition:
      'Collection of conceptual (literacy, money, time), social (interpersonal skills, rule following), and practical (daily living, occupational, safety) skills required alongside intellectual functioning under AAIDD and IDEA definitions.',
    aliases: ['Conceptual, social, and practical skills'],
    chapterId: 'id5322-ch-01',
    chapterTitle:
      'Development, Adaptive Behavior, Context, and Learner Variability',
    domainId: 'development-characteristics-intellectual-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Intellectual Disabilities',
    sectionId: 'id5322-ch-01-section-01',
    sectionHeading:
      'Core frame: Development, Adaptive Behavior, Context, and Learner Variability',
    references: [ID_PRAXIS, ID_AAIDD],
  }),
  makeEntry({
    id: 'id5322-gloss-02',
    term: 'Supports-intensity paradigm',
    definition:
      'AAIDD ecological framework classifying intellectual disability by the pattern and intensity of individualized supports (intermittent, limited, extensive, pervasive) needed for community participation rather than solely by IQ tiers.',
    aliases: ['AAIDD supports model'],
    chapterId: 'id5322-ch-01',
    chapterTitle:
      'Development, Adaptive Behavior, Context, and Learner Variability',
    domainId: 'development-characteristics-intellectual-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Intellectual Disabilities',
    sectionId: 'id5322-ch-01-section-02',
    sectionHeading:
      'Decision routine: Development, Adaptive Behavior, Context, and Learner Variability',
    references: [ID_PRAXIS, ID_AAIDD],
  }),

  // Chapter 2: Intellectual-Disability Characteristics and Coexisting Communication, Sensory, Motor, and Health Needs
  makeEntry({
    id: 'id5322-gloss-03',
    term: 'Genetic and perinatal etiologies',
    definition:
      'Biological causes of intellectual disability spanning chromosomal or single-gene conditions (such as Down and fragile X syndromes) and prenatal, perinatal, or postnatal factors including teratogens, hypoxia, or early CNS infection.',
    aliases: ['Biomedical risk factors'],
    chapterId: 'id5322-ch-02',
    chapterTitle:
      'Intellectual-Disability Characteristics and Coexisting Communication, Sensory, Motor, and Health Needs',
    domainId: 'development-characteristics-intellectual-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Intellectual Disabilities',
    sectionId: 'id5322-ch-02-section-01',
    sectionHeading:
      'Core frame: Intellectual-Disability Characteristics and Coexisting Communication, Sensory, Motor, and Health Needs',
    references: [ID_PRAXIS, ID_AAIDD],
  }),
  makeEntry({
    id: 'id5322-gloss-04',
    term: 'Diagnostic overshadowing',
    definition:
      'Clinical and educational error of attributing a student\'s sensory impairment, medical pain, communication barrier, or mental health need solely to an intellectual disability label instead of addressing the coexisting condition.',
    aliases: ['Overshadowing bias'],
    chapterId: 'id5322-ch-02',
    chapterTitle:
      'Intellectual-Disability Characteristics and Coexisting Communication, Sensory, Motor, and Health Needs',
    domainId: 'development-characteristics-intellectual-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Intellectual Disabilities',
    sectionId: 'id5322-ch-02-section-04',
    sectionHeading:
      'Safety and traps: Intellectual-Disability Characteristics and Coexisting Communication, Sensory, Motor, and Health Needs',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 3: Person-Centered IEPs, Measurable Goals, Self-Determination, and Transition
  makeEntry({
    id: 'id5322-gloss-05',
    term: 'Self-determination',
    definition:
      'Combination of skills, knowledge, and opportunities, including choice making, goal setting, problem solving, and self-advocacy, that enables students with intellectual disabilities to act as primary causal agents in their lives.',
    aliases: ['Causal agency'],
    chapterId: 'id5322-ch-03',
    chapterTitle:
      'Person-Centered IEPs, Measurable Goals, Self-Determination, and Transition',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'id5322-ch-03-section-01',
    sectionHeading:
      'Core frame: Person-Centered IEPs, Measurable Goals, Self-Determination, and Transition',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-06',
    term: 'Supported employment',
    definition:
      'Postsecondary transition outcome and service model placing individuals with intellectual disabilities in competitive, integrated workplaces earning fair wages alongside peers, backed by individualized job coaching and natural supports.',
    aliases: ['Competitive integrated employment'],
    chapterId: 'id5322-ch-03',
    chapterTitle:
      'Person-Centered IEPs, Measurable Goals, Self-Determination, and Transition',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'id5322-ch-03-section-03',
    sectionHeading:
      'Applied instruction: Person-Centered IEPs, Measurable Goals, Self-Determination, and Transition',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 4: Adaptive Skills, Communication, Assistive Technology, Health, and Safe Access
  makeEntry({
    id: 'id5322-gloss-07',
    term: 'SETT Framework',
    definition:
      'Collaborative assistive technology decision-making model analyzing the Student\'s strengths, Environments of participation, and required Tasks before selecting Tools so devices fit authentic classroom and daily routines.',
    aliases: ['Student, Environments, Tasks, Tools'],
    chapterId: 'id5322-ch-04',
    chapterTitle:
      'Adaptive Skills, Communication, Assistive Technology, Health, and Safe Access',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'id5322-ch-04-section-01',
    sectionHeading:
      'Core frame: Adaptive Skills, Communication, Assistive Technology, Health, and Safe Access',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-08',
    term: 'Core vocabulary AAC',
    definition:
      'Communication approach giving students with complex communication needs high-frequency, flexible words across settings and modeling symbol use directly on the student\'s AAC system during natural interactions.',
    aliases: ['Aided language modeling'],
    chapterId: 'id5322-ch-04',
    chapterTitle:
      'Adaptive Skills, Communication, Assistive Technology, Health, and Safe Access',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'id5322-ch-04-section-03',
    sectionHeading:
      'Applied instruction: Adaptive Skills, Communication, Assistive Technology, Health, and Safe Access',
    references: [ID_PRAXIS, ID_AAIDD],
  }),

  // Chapter 5: Positive Environments, Behavior Support, Inclusion, and Daily Routines
  makeEntry({
    id: 'id5322-gloss-09',
    term: 'Natural peer supports',
    definition:
      'Inclusive strategy engaging general education classmates to provide academic, social, and routine assistance under teacher guidance, fostering genuine belonging while reducing stigma and overreliance on paraprofessionals.',
    aliases: ['Peer-mediated instruction and intervention', 'PMII'],
    chapterId: 'id5322-ch-05',
    chapterTitle:
      'Positive Environments, Behavior Support, Inclusion, and Daily Routines',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'id5322-ch-05-section-01',
    sectionHeading:
      'Core frame: Positive Environments, Behavior Support, Inclusion, and Daily Routines',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-10',
    term: 'Visual activity schedule',
    definition:
      'Sequence of objects, photographs, icons, or written cues depicting classroom or daily-living steps so students with intellectual disabilities can anticipate transitions, initiate tasks independently, and self-monitor completion.',
    aliases: ['Picture schedule'],
    chapterId: 'id5322-ch-05',
    chapterTitle:
      'Positive Environments, Behavior Support, Inclusion, and Daily Routines',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'id5322-ch-05-section-03',
    sectionHeading:
      'Applied instruction: Positive Environments, Behavior Support, Inclusion, and Daily Routines',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 6: Functional and Academic Literacy, Language, Vocabulary, and Comprehension
  makeEntry({
    id: 'id5322-gloss-11',
    term: 'Functional academics',
    definition:
      'Instruction targeting reading, writing, and mathematics skills directly applicable to everyday independence, such as reading safety signs, schedules, recipes, and budgets, integrated alongside grade-aligned academic content.',
    aliases: ['Functional literacy and numeracy'],
    chapterId: 'id5322-ch-06',
    chapterTitle:
      'Functional and Academic Literacy, Language, Vocabulary, and Comprehension',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'id5322-ch-06-section-01',
    sectionHeading:
      'Core frame: Functional and Academic Literacy, Language, Vocabulary, and Comprehension',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-12',
    term: 'Shared story reading',
    definition:
      'Evidence-based literacy routine using age-respectful, adapted grade-level texts paired with repeated story lines, visual symbols, and systematic comprehension prompts for students with moderate-to-severe intellectual disabilities.',
    aliases: ['Adapted shared reading'],
    chapterId: 'id5322-ch-06',
    chapterTitle:
      'Functional and Academic Literacy, Language, Vocabulary, and Comprehension',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'id5322-ch-06-section-03',
    sectionHeading:
      'Applied instruction: Functional and Academic Literacy, Language, Vocabulary, and Comprehension',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 7: Writing, Communication, Self-Advocacy, and Expression
  makeEntry({
    id: 'id5322-gloss-13',
    term: 'Alternative pencil',
    definition:
      'Any adapted tool granting full alphabet access, such as partner-assisted letter boards, eye-gaze flip charts, adapted keyboards, or switch-scanning software, so students who cannot hold a traditional pencil build authentic writing.',
    aliases: ['Accessible writing system'],
    chapterId: 'id5322-ch-07',
    chapterTitle: 'Writing, Communication, Self-Advocacy, and Expression',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'id5322-ch-07-section-01',
    sectionHeading:
      'Core frame: Writing, Communication, Self-Advocacy, and Expression',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-14',
    term: 'Self-advocacy',
    definition:
      'Ability of a student with an intellectual disability to understand personal strengths, disability-related needs, and legal rights and to communicate preferences, accommodations, or refusal clearly in school and community settings.',
    aliases: ['Rights-based self-expression'],
    chapterId: 'id5322-ch-07',
    chapterTitle: 'Writing, Communication, Self-Advocacy, and Expression',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'id5322-ch-07-section-03',
    sectionHeading:
      'Applied instruction: Writing, Communication, Self-Advocacy, and Expression',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 8: Functional Mathematics, Task Analysis, Strategy Instruction, and Generalization
  makeEntry({
    id: 'id5322-gloss-15',
    term: 'Task analysis and chaining',
    definition:
      'Systematic method breaking a complex multi-step routine into discrete teachable steps and linking them via forward chaining, backward chaining, or total-task presentation until the student completes the sequence independently.',
    aliases: ['Forward, backward, and total-task chaining'],
    chapterId: 'id5322-ch-08',
    chapterTitle:
      'Functional Mathematics, Task Analysis, Strategy Instruction, and Generalization',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'id5322-ch-08-section-01',
    sectionHeading:
      'Core frame: Functional Mathematics, Task Analysis, Strategy Instruction, and Generalization',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-16',
    term: 'Systematic prompting and time delay',
    definition:
      'Errorless instructional procedures, including constant or progressive time delay and least-to-most prompting, that pair a controlling prompt with a target cue and systematically fade assistance to prevent prompt dependence.',
    aliases: ['Constant time delay', 'Prompt fading'],
    chapterId: 'id5322-ch-08',
    chapterTitle:
      'Functional Mathematics, Task Analysis, Strategy Instruction, and Generalization',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'id5322-ch-08-section-02',
    sectionHeading:
      'Decision routine: Functional Mathematics, Task Analysis, Strategy Instruction, and Generalization',
    references: [ID_PRAXIS, ID_AAIDD],
  }),

  // Chapter 9: Assessment Quality, Eligibility, Adaptive Evidence, and Accessibility
  makeEntry({
    id: 'id5322-gloss-17',
    term: 'AAIDD three-prong criteria',
    definition:
      'Diagnostic standard requiring significant limitations in both intellectual functioning and adaptive behavior across conceptual, social, and practical domains, with onset during the developmental period (before age 22 under AAIDD).',
    aliases: ['Intellectual disability eligibility criteria'],
    chapterId: 'id5322-ch-09',
    chapterTitle:
      'Assessment Quality, Eligibility, Adaptive Evidence, and Accessibility',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'id5322-ch-09-section-01',
    sectionHeading:
      'Core frame: Assessment Quality, Eligibility, Adaptive Evidence, and Accessibility',
    references: [ID_PRAXIS, ID_AAIDD],
  }),
  makeEntry({
    id: 'id5322-gloss-18',
    term: 'Ecological and functional assessment',
    definition:
      'Assessment process analyzing the actual demands, natural cues, and performance discrepancies in a student\'s current and future school, home, vocational, and community environments to prioritize functional IEP goals.',
    aliases: ['Ecological inventory'],
    chapterId: 'id5322-ch-09',
    chapterTitle:
      'Assessment Quality, Eligibility, Adaptive Evidence, and Accessibility',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'id5322-ch-09-section-03',
    sectionHeading:
      'Applied instruction: Assessment Quality, Eligibility, Adaptive Evidence, and Accessibility',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 10: Progress Monitoring, FBA, Alternate Assessment, and Program Decisions
  makeEntry({
    id: 'id5322-gloss-19',
    term: 'Alternate assessment on alternate achievement standards',
    definition:
      'Statewide assessment option aligned to grade-level content standards at reduced depth, breadth, and complexity, reserved strictly for students with the most significant cognitive disabilities under IEP team eligibility criteria.',
    aliases: ['AA-AAS'],
    chapterId: 'id5322-ch-10',
    chapterTitle:
      'Progress Monitoring, FBA, Alternate Assessment, and Program Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'id5322-ch-10-section-01',
    sectionHeading:
      'Core frame: Progress Monitoring, FBA, Alternate Assessment, and Program Decisions',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-20',
    term: 'Generalization and maintenance',
    definition:
      'Explicit instructional planning ensuring mastered skills persist over time after direct teaching ends (maintenance) and transfer across novel settings, people, materials, and natural community cues (generalization).',
    aliases: ['Skill transfer and retention'],
    chapterId: 'id5322-ch-10',
    chapterTitle:
      'Progress Monitoring, FBA, Alternate Assessment, and Program Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'id5322-ch-10-section-03',
    sectionHeading:
      'Applied instruction: Progress Monitoring, FBA, Alternate Assessment, and Program Decisions',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),

  // Chapter 11: Law, Ethics, Rights, Family Partnership, and Safeguards
  makeEntry({
    id: 'id5322-gloss-21',
    term: 'Supported decision-making',
    definition:
      'Less restrictive alternative to plenary guardianship in which an adult with an intellectual disability selects trusted supporters to help evaluate options and communicate choices while retaining legal autonomy and civil rights.',
    aliases: ['SDM'],
    chapterId: 'id5322-ch-11',
    chapterTitle: 'Law, Ethics, Rights, Family Partnership, and Safeguards',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'id5322-ch-11-section-01',
    sectionHeading:
      'Core frame: Law, Ethics, Rights, Family Partnership, and Safeguards',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-22',
    term: 'Dignity of risk',
    definition:
      'Ethical principle affirming that individuals with intellectual disabilities have the right to make reasonable personal choices, experience natural consequences, and learn from manageable risks rather than facing overprotection.',
    aliases: ['Right to informed choice'],
    chapterId: 'id5322-ch-11',
    chapterTitle: 'Law, Ethics, Rights, Family Partnership, and Safeguards',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'id5322-ch-11-section-03',
    sectionHeading:
      'Applied instruction: Law, Ethics, Rights, Family Partnership, and Safeguards',
    references: [ID_PRAXIS, ID_AAIDD],
  }),

  // Chapter 12: Collaboration, Related Services, Paraprofessional Supervision, Advocacy, and Professional Learning
  makeEntry({
    id: 'id5322-gloss-23',
    term: 'Paraprofessional supervision',
    definition:
      'Special educator\'s ongoing duty to train, schedule, model prompt fading for, and monitor paraprofessionals so licensed teachers retain primary instructional design while preventing student prompt dependence and isolation.',
    aliases: ['Paraeducator coaching'],
    chapterId: 'id5322-ch-12',
    chapterTitle:
      'Collaboration, Related Services, Paraprofessional Supervision, Advocacy, and Professional Learning',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'id5322-ch-12-section-02',
    sectionHeading:
      'Decision routine: Collaboration, Related Services, Paraprofessional Supervision, Advocacy, and Professional Learning',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
  makeEntry({
    id: 'id5322-gloss-24',
    term: 'Community-based instruction',
    definition:
      'Regular, structured teaching of functional academic, mobility, social, and vocational skills directly in authentic community venues, such as grocery stores, transit systems, and workplaces, to maximize real-world generalization.',
    aliases: ['CBI'],
    chapterId: 'id5322-ch-12',
    chapterTitle:
      'Collaboration, Related Services, Paraprofessional Supervision, Advocacy, and Professional Learning',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'id5322-ch-12-section-03',
    sectionHeading:
      'Applied instruction: Collaboration, Related Services, Paraprofessional Supervision, Advocacy, and Professional Learning',
    references: [ID_PRAXIS, ID_IDEA_B],
  }),
];

module.exports = {
  special_education_early_childhood_5692,
  special_education_intellectual_disabilities_5322,
};
