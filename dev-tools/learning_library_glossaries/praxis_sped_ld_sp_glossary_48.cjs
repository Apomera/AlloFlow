'use strict';

const LD_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5383.pdf';
const LD_TEST_PAGE =
  'https://praxis.ets.org/test/special-education-teaching-students-with-learning-disabilities-5383.html';
const LD_IDEA_309 = 'https://sites.ed.gov/idea/regs/b/d/300.309';
const LD_WWC_READING = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/29';
const LD_WWC_MATH = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/26';

const SP_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5547.pdf';
const SP_IDEA_PART_B = 'https://sites.ed.gov/idea/regs/b';
const SP_CEC_STANDARDS =
  'https://exceptionalchildren.org/standards/initial-practice-based-professional-preparation-standards-special-educators';

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

const special_education_learning_disabilities_5383 = [
  // Chapter 1: Development, Variability, Language, and Context
  makeEntry({
    id: 'ld5383-gloss-01',
    term: 'SLD exclusionary factors',
    definition:
      'IDEA eligibility criteria requiring teams to rule out sensory or motor impairments, intellectual disability, emotional disturbance, environmental disadvantage, or limited English proficiency as the primary cause of underachievement.',
    aliases: ['IDEA 300.309 exclusions'],
    chapterId: 'ld5383-ch-01',
    chapterTitle: 'Development, Variability, Language, and Context',
    domainId: 'development-characteristics-learning-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Learning Disabilities',
    sectionId: 'ld5383-ch-01-section-01',
    sectionHeading:
      'Core frame: Development, Variability, Language, and Context',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),
  makeEntry({
    id: 'ld5383-gloss-02',
    term: 'BICS and CALP distinction',
    definition:
      'Contrast between Basic Interpersonal Communicative Skills, acquired quickly in social interaction, and Cognitive Academic Language Proficiency, which requires years to master and prevents conflating language difference with SLD.',
    aliases: ['Social vs. academic language'],
    chapterId: 'ld5383-ch-01',
    chapterTitle: 'Development, Variability, Language, and Context',
    domainId: 'development-characteristics-learning-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Learning Disabilities',
    sectionId: 'ld5383-ch-01-section-04',
    sectionHeading:
      'Common traps: Development, Variability, Language, and Context',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),

  // Chapter 2: Learning-Disability Characteristics and Coexisting Needs
  makeEntry({
    id: 'ld5383-gloss-03',
    term: 'Phonological processing deficit',
    definition:
      'Neurobiological difficulty perceiving, storing, and manipulating speech sounds, representing the primary cognitive bottleneck underlying dyslexia and persistent word-level decoding and spelling struggles.',
    aliases: ['Phonological core deficit'],
    chapterId: 'ld5383-ch-02',
    chapterTitle: 'Learning-Disability Characteristics and Coexisting Needs',
    domainId: 'development-characteristics-learning-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Learning Disabilities',
    sectionId: 'ld5383-ch-02-section-01',
    sectionHeading:
      'Core frame: Learning-Disability Characteristics and Coexisting Needs',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),
  makeEntry({
    id: 'ld5383-gloss-04',
    term: 'Working memory and executive functioning',
    definition:
      'Interrelated cognitive control processes governing active information holding, task initiation, planning, inhibition, and self-monitoring that often constrain multi-step academic tasks in students with SLD and coexisting ADHD.',
    aliases: ['Executive control constraints'],
    chapterId: 'ld5383-ch-02',
    chapterTitle: 'Learning-Disability Characteristics and Coexisting Needs',
    domainId: 'development-characteristics-learning-disabilities',
    domainLabel:
      'Development and Characteristics of Students with Learning Disabilities',
    sectionId: 'ld5383-ch-02-section-03',
    sectionHeading:
      'Applied instruction: Learning-Disability Characteristics and Coexisting Needs',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),

  // Chapter 3: Individualized Curriculum, IEP Goals, and Accessible Resources
  makeEntry({
    id: 'ld5383-gloss-05',
    term: 'Accommodations versus modifications',
    definition:
      'Distinction between accommodations, which adjust presentation, response, setting, or timing without lowering grade-level standards, and modifications, which alter curriculum content or performance expectations.',
    aliases: ['Access vs. standard changes'],
    chapterId: 'ld5383-ch-03',
    chapterTitle:
      'Individualized Curriculum, IEP Goals, and Accessible Resources',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'ld5383-ch-03-section-01',
    sectionHeading:
      'Core frame: Individualized Curriculum, IEP Goals, and Accessible Resources',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),
  makeEntry({
    id: 'ld5383-gloss-06',
    term: 'PLAAFP and measurable IEP goals',
    definition:
      'Data-grounded baseline statements describing how a learning disability affects general-curriculum progress, paired with annual goals specifying condition, observable behavior, and mastery criterion.',
    aliases: ['Present levels and annual goals'],
    chapterId: 'ld5383-ch-03',
    chapterTitle:
      'Individualized Curriculum, IEP Goals, and Accessible Resources',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'ld5383-ch-03-section-02',
    sectionHeading:
      'Decision routine: Individualized Curriculum, IEP Goals, and Accessible Resources',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),

  // Chapter 4: Positive Learning Environments, Self-Regulation, and Behavior
  makeEntry({
    id: 'ld5383-gloss-07',
    term: 'Task-escape behavioral function',
    definition:
      'Pattern in which off-task or disruptive behavior is negatively reinforced by delaying or avoiding frustrating academic demands, calling for instructional scaffolding and replacement help-seeking rather than punitive removal.',
    aliases: ['Escape-maintained behavior'],
    chapterId: 'ld5383-ch-04',
    chapterTitle:
      'Positive Learning Environments, Self-Regulation, and Behavior',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'ld5383-ch-04-section-01',
    sectionHeading:
      'Core frame: Positive Learning Environments, Self-Regulation, and Behavior',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),
  makeEntry({
    id: 'ld5383-gloss-08',
    term: 'Metacognitive self-monitoring',
    definition:
      'Explicit self-regulation routine teaching students with learning disabilities to observe, record, and evaluate their on-task attention, strategy use, and accuracy to build independent academic persistence.',
    aliases: ['Self-monitoring checklists'],
    chapterId: 'ld5383-ch-04',
    chapterTitle:
      'Positive Learning Environments, Self-Regulation, and Behavior',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'ld5383-ch-04-section-03',
    sectionHeading:
      'Applied instruction: Positive Learning Environments, Self-Regulation, and Behavior',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),

  // Chapter 5: Assistive Technology, Adaptive Access, and Learning Routines
  makeEntry({
    id: 'ld5383-gloss-09',
    term: 'SETT framework',
    definition:
      'Collaborative assistive technology matching model analyzing the Student, Environments, and required Tasks before selecting Tools, preventing gadget-first purchases and classroom device abandonment.',
    aliases: ['Student-Environment-Tasks-Tools'],
    chapterId: 'ld5383-ch-05',
    chapterTitle:
      'Assistive Technology, Adaptive Access, and Learning Routines',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'ld5383-ch-05-section-01',
    sectionHeading:
      'Core frame: Assistive Technology, Adaptive Access, and Learning Routines',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),
  makeEntry({
    id: 'ld5383-gloss-10',
    term: 'Text-to-speech and speech-to-text',
    definition:
      'Assistive technologies enabling students with dyslexia or dysgraphia to hear grade-level text read aloud and dictate written ideas, bypassing decoding or transcription barriers when paired with explicit strategy training.',
    aliases: ['TTS and STT'],
    chapterId: 'ld5383-ch-05',
    chapterTitle:
      'Assistive Technology, Adaptive Access, and Learning Routines',
    domainId: 'planning-managing-learning-environment',
    domainLabel: 'Planning and Managing the Learning Environment',
    sectionId: 'ld5383-ch-05-section-03',
    sectionHeading:
      'Applied instruction: Assistive Technology, Adaptive Access, and Learning Routines',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),

  // Chapter 6: Structured Literacy, Fluency, Vocabulary, and Comprehension
  makeEntry({
    id: 'ld5383-gloss-11',
    term: 'Orthographic mapping',
    definition:
      'Cognitive process of permanently bonding a word\'s phoneme sequence to its grapheme pattern and meaning in long-term memory, driven by phonemic proficiency and decoding rather than visual whole-word guessing.',
    aliases: ['Sight-word bonding'],
    chapterId: 'ld5383-ch-06',
    chapterTitle:
      'Structured Literacy, Fluency, Vocabulary, and Comprehension',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ld5383-ch-06-section-01',
    sectionHeading:
      'Core frame: Structured Literacy, Fluency, Vocabulary, and Comprehension',
    references: [LD_PRAXIS, LD_WWC_READING],
  }),
  makeEntry({
    id: 'ld5383-gloss-12',
    term: 'Explicit systematic instruction',
    definition:
      'Direct, cumulative teaching sequence that models target reading or academic skills unambiguously, provides guided practice with immediate corrective feedback, and scaffolds transfer to decodable and grade-level text.',
    aliases: ['Structured literacy delivery'],
    chapterId: 'ld5383-ch-06',
    chapterTitle:
      'Structured Literacy, Fluency, Vocabulary, and Comprehension',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ld5383-ch-06-section-03',
    sectionHeading:
      'Applied instruction: Structured Literacy, Fluency, Vocabulary, and Comprehension',
    references: [LD_PRAXIS, LD_WWC_READING],
  }),

  // Chapter 7: Written Expression, Spelling, Sentence Construction, and Revision
  makeEntry({
    id: 'ld5383-gloss-13',
    term: 'Dysgraphia and transcription load',
    definition:
      'Specific learning disability in written expression affecting handwriting automaticity, phoneme-grapheme spelling, or composition when effortful transcription consumes working memory needed for ideation and revision.',
    aliases: ['Written-expression SLD'],
    chapterId: 'ld5383-ch-07',
    chapterTitle:
      'Written Expression, Spelling, Sentence Construction, and Revision',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ld5383-ch-07-section-01',
    sectionHeading:
      'Core frame: Written Expression, Spelling, Sentence Construction, and Revision',
    references: [LD_PRAXIS, LD_WWC_READING],
  }),
  makeEntry({
    id: 'ld5383-gloss-14',
    term: 'Self-Regulated Strategy Development',
    definition:
      'Evidence-based six-stage writing framework combining genre-specific planning mnemonics with explicit teacher modeling, self-monitoring, and gradual release to strengthen composition structure and quality for students with SLD.',
    aliases: ['SRSD'],
    chapterId: 'ld5383-ch-07',
    chapterTitle:
      'Written Expression, Spelling, Sentence Construction, and Revision',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ld5383-ch-07-section-03',
    sectionHeading:
      'Applied instruction: Written Expression, Spelling, Sentence Construction, and Revision',
    references: [LD_PRAXIS, LD_WWC_READING],
  }),

  // Chapter 8: Mathematics Concepts, Procedures, Problem Solving, and Strategy Instruction
  makeEntry({
    id: 'ld5383-gloss-15',
    term: 'Concrete-Representational-Abstract sequence',
    definition:
      'Graduated mathematics instructional sequence moving from physical manipulatives to visual drawings and symbolic notation, enabling students with dyscalculia to link conceptual meaning with accurate computation.',
    aliases: ['CRA sequence'],
    chapterId: 'ld5383-ch-08',
    chapterTitle:
      'Mathematics Concepts, Procedures, Problem Solving, and Strategy Instruction',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ld5383-ch-08-section-03',
    sectionHeading:
      'Applied instruction: Mathematics Concepts, Procedures, Problem Solving, and Strategy Instruction',
    references: [LD_PRAXIS, LD_WWC_MATH],
  }),
  makeEntry({
    id: 'ld5383-gloss-16',
    term: 'Dyscalculia and schema-based instruction',
    definition:
      'Specific learning disability in number sense and arithmetic addressed through schema-based instruction, which teaches learners to recognize underlying word-problem structures instead of unreliable keyword-hunting tricks.',
    aliases: ['SBI', 'Math SLD intervention'],
    chapterId: 'ld5383-ch-08',
    chapterTitle:
      'Mathematics Concepts, Procedures, Problem Solving, and Strategy Instruction',
    domainId: 'instruction',
    domainLabel: 'Instruction',
    sectionId: 'ld5383-ch-08-section-01',
    sectionHeading:
      'Core frame: Mathematics Concepts, Procedures, Problem Solving, and Strategy Instruction',
    references: [LD_PRAXIS, LD_WWC_MATH],
  }),

  // Chapter 9: Evaluation, Identification, Eligibility, and Placement
  makeEntry({
    id: 'ld5383-gloss-17',
    term: 'RTI, MTSS, and Pattern of Strengths and Weaknesses',
    definition:
      'IDEA-aligned SLD identification frameworks combining Multi-Tiered System of Supports response data or cognitive-academic Pattern of Strengths and Weaknesses triangulation, never used to delay a requested evaluation.',
    aliases: ['RTI/MTSS', 'PSW evaluation'],
    chapterId: 'ld5383-ch-09',
    chapterTitle: 'Evaluation, Identification, Eligibility, and Placement',
    domainId: 'identification-eligibility-placement',
    domainLabel: 'Identification, Eligibility, and Placement',
    sectionId: 'ld5383-ch-09-section-01',
    sectionHeading:
      'Core frame: Evaluation, Identification, Eligibility, and Placement',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),
  makeEntry({
    id: 'ld5383-gloss-18',
    term: 'Curriculum-Based Measurement',
    definition:
      'Brief, standardized, repeatable academic probes tracking reading, writing, or math fluency over time to graph growth against an aimline and trigger timely data-based individualization.',
    aliases: ['CBM', 'Progress monitoring'],
    chapterId: 'ld5383-ch-09',
    chapterTitle: 'Evaluation, Identification, Eligibility, and Placement',
    domainId: 'identification-eligibility-placement',
    domainLabel: 'Identification, Eligibility, and Placement',
    sectionId: 'ld5383-ch-09-section-02',
    sectionHeading:
      'Decision routine: Evaluation, Identification, Eligibility, and Placement',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),

  // Chapter 10: Law, Ethics, Nondiscrimination, and Educational Rights
  makeEntry({
    id: 'ld5383-gloss-19',
    term: 'Child Find and FAPE',
    definition:
      'Core IDEA obligations requiring public schools to proactively identify and evaluate all students suspected of having a disability and provide a Free Appropriate Public Education enabling ambitious progress.',
    aliases: ['Affirmative identification duty'],
    chapterId: 'ld5383-ch-10',
    chapterTitle: 'Law, Ethics, Nondiscrimination, and Educational Rights',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ld5383-ch-10-section-01',
    sectionHeading:
      'Core frame: Law, Ethics, Nondiscrimination, and Educational Rights',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),
  makeEntry({
    id: 'ld5383-gloss-20',
    term: 'Prior Written Notice and procedural safeguards',
    definition:
      'Mandatory written notice provided to parents whenever a district proposes or refuses to initiate or change identification, evaluation, placement, or FAPE, protecting informed consent and dispute-resolution rights.',
    aliases: ['PWN'],
    chapterId: 'ld5383-ch-10',
    chapterTitle: 'Law, Ethics, Nondiscrimination, and Educational Rights',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ld5383-ch-10-section-02',
    sectionHeading:
      'Decision routine: Law, Ethics, Nondiscrimination, and Educational Rights',
    references: [LD_PRAXIS, LD_IDEA_309],
  }),

  // Chapter 11: Family, General-Education, Specialist, and Community Collaboration
  makeEntry({
    id: 'ld5383-gloss-21',
    term: 'Co-teaching service models',
    definition:
      'Collaborative inclusive instructional structures—such as station, parallel, alternative, and team teaching—in which general and special educators share planning and delivery instead of defaulting to one-teach-one-drift.',
    aliases: ['Station and parallel co-teaching'],
    chapterId: 'ld5383-ch-11',
    chapterTitle:
      'Family, General-Education, Specialist, and Community Collaboration',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ld5383-ch-11-section-03',
    sectionHeading:
      'Applied instruction: Family, General-Education, Specialist, and Community Collaboration',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),
  makeEntry({
    id: 'ld5383-gloss-22',
    term: 'Family-centered IEP and interagency partnership',
    definition:
      'Culturally responsive collaboration treating families as equal IEP decision-makers while linking adolescents with learning disabilities to postsecondary disability services, vocational rehabilitation, and community agencies.',
    aliases: ['Collaborative transition linkage'],
    chapterId: 'ld5383-ch-11',
    chapterTitle:
      'Family, General-Education, Specialist, and Community Collaboration',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ld5383-ch-11-section-01',
    sectionHeading:
      'Core frame: Family, General-Education, Specialist, and Community Collaboration',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),

  // Chapter 12: Professional Learning, Advocacy, Supervision, and Boundaries
  makeEntry({
    id: 'ld5383-gloss-23',
    term: 'Student-led self-advocacy and transition',
    definition:
      'Secondary transition instruction preparing students with learning disabilities to articulate their learning profiles, request reasonable ADA or Section 504 accommodations, and participate actively in IEP planning.',
    aliases: ['Secondary transition advocacy'],
    chapterId: 'ld5383-ch-12',
    chapterTitle:
      'Professional Learning, Advocacy, Supervision, and Boundaries',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ld5383-ch-12-section-03',
    sectionHeading:
      'Applied instruction: Professional Learning, Advocacy, Supervision, and Boundaries',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),
  makeEntry({
    id: 'ld5383-gloss-24',
    term: 'Implementation fidelity and scope boundaries',
    definition:
      'Ongoing verification that evidence-based interventions are delivered as designed before altering variables, paired with CEC ethical adherence to vetting commercial claims and staying within instructional scope.',
    aliases: ['Treatment integrity'],
    chapterId: 'ld5383-ch-12',
    chapterTitle:
      'Professional Learning, Advocacy, Supervision, and Boundaries',
    domainId: 'foundations-professional-responsibilities',
    domainLabel: 'Foundations and Professional Responsibilities',
    sectionId: 'ld5383-ch-12-section-02',
    sectionHeading:
      'Decision routine: Professional Learning, Advocacy, Supervision, and Boundaries',
    references: [LD_PRAXIS, LD_TEST_PAGE],
  }),
];

const special_education_severe_profound_5547 = [
  // Chapter 1: Development, Context, Strengths, and Variability
  makeEntry({
    id: 'sp5547-gloss-01',
    term: 'Presumed competence and low-incidence profiles',
    definition:
      'Ethical stance assuming students with multiple disabilities, deaf-blindness, or traumatic brain injury can learn age-respectful skills when provided accessible instruction, communication systems, and high expectations.',
    aliases: ['Least dangerous assumption'],
    chapterId: 'sp5547-ch-01',
    chapterTitle: 'Development, Context, Strengths, and Variability',
    domainId: 'development-individualized-needs',
    domainLabel: 'Human Developmental and Individualized Learning Needs',
    sectionId: 'sp5547-ch-01-section-01',
    sectionHeading:
      'Core frame: Development, Context, Strengths, and Variability',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-02',
    term: 'Principle of partial participation',
    definition:
      'Functional curriculum principle affirming that learners who cannot perform every step independently still engage meaningfully in chronological-age school and community routines through adapted materials or assistive supports.',
    aliases: ['Functional participation adaptation'],
    chapterId: 'sp5547-ch-01',
    chapterTitle: 'Development, Context, Strengths, and Variability',
    domainId: 'development-individualized-needs',
    domainLabel: 'Human Developmental and Individualized Learning Needs',
    sectionId: 'sp5547-ch-01-section-03',
    sectionHeading:
      'Applied practice: Development, Context, Strengths, and Variability',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),

  // Chapter 2: Complex Disability, Communication, and Learning Profiles
  makeEntry({
    id: 'sp5547-gloss-03',
    term: 'Multimodal and aided AAC',
    definition:
      'Communication framework honoring gestures, vocalizations, and presymbolic cues alongside low- or high-tech aided AAC and aided language input, offered across all settings without cognitive prerequisite barriers.',
    aliases: ['Augmentative and alternative communication'],
    chapterId: 'sp5547-ch-02',
    chapterTitle: 'Complex Disability, Communication, and Learning Profiles',
    domainId: 'development-individualized-needs',
    domainLabel: 'Human Developmental and Individualized Learning Needs',
    sectionId: 'sp5547-ch-02-section-01',
    sectionHeading:
      'Core frame: Complex Disability, Communication, and Learning Profiles',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-04',
    term: 'Partner-assisted scanning',
    definition:
      'Alternate AAC access method in which a communication partner sequentially presents choices visually, auditorily, or tactually until the student signals a selection via eye gaze, vocalization, or switch hit.',
    aliases: ['Auditory and visual scanning'],
    chapterId: 'sp5547-ch-02',
    chapterTitle: 'Complex Disability, Communication, and Learning Profiles',
    domainId: 'development-individualized-needs',
    domainLabel: 'Human Developmental and Individualized Learning Needs',
    sectionId: 'sp5547-ch-02-section-02',
    sectionHeading:
      'Decision routine: Complex Disability, Communication, and Learning Profiles',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),

  // Chapter 3: Adaptive, Sensory, Physical, Health, and Safety Needs
  makeEntry({
    id: 'sp5547-gloss-05',
    term: 'Individualized Healthcare Plan and feeding safety',
    definition:
      'Nurse-developed medical management plan governing seizure protocols, medication, therapeutic positioning, and dysphagia feeding procedures so classroom teams protect student health within authorized nursing delegation.',
    aliases: ['IHP', 'Positioning and dysphagia safety'],
    chapterId: 'sp5547-ch-03',
    chapterTitle: 'Adaptive, Sensory, Physical, Health, and Safety Needs',
    domainId: 'development-individualized-needs',
    domainLabel: 'Human Developmental and Individualized Learning Needs',
    sectionId: 'sp5547-ch-03-section-01',
    sectionHeading:
      'Core frame: Adaptive, Sensory, Physical, Health, and Safety Needs',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),
  makeEntry({
    id: 'sp5547-gloss-06',
    term: 'Cortical visual impairment and switch access',
    definition:
      'Sensory-motor access supports pairing uncluttered high-contrast or tactile materials and extended visual latency for brain-based vision loss with customized switch or eye-gaze controls for active engagement.',
    aliases: ['CVI supports', 'Adaptive AT access'],
    chapterId: 'sp5547-ch-03',
    chapterTitle: 'Adaptive, Sensory, Physical, Health, and Safety Needs',
    domainId: 'development-individualized-needs',
    domainLabel: 'Human Developmental and Individualized Learning Needs',
    sectionId: 'sp5547-ch-03-section-03',
    sectionHeading:
      'Applied practice: Adaptive, Sensory, Physical, Health, and Safety Needs',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),

  // Chapter 4: Person-Centered IEPs, Goals, and Transition Planning
  makeEntry({
    id: 'sp5547-gloss-07',
    term: 'Person-centered planning',
    definition:
      'Strengths-based collaborative planning process centering the learner\'s preferences, communication system, and family vision to drive self-determined IEP goals, inclusive membership, and adult community outcomes.',
    aliases: ['MAPS and PATH'],
    chapterId: 'sp5547-ch-04',
    chapterTitle: 'Person-Centered IEPs, Goals, and Transition Planning',
    domainId: 'planning-instruction-environment',
    domainLabel: 'Planning and Instruction and the Learning Environment',
    sectionId: 'sp5547-ch-04-section-01',
    sectionHeading:
      'Core frame: Person-Centered IEPs, Goals, and Transition Planning',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),
  makeEntry({
    id: 'sp5547-gloss-08',
    term: 'Interagency postsecondary transition',
    definition:
      'Coordinated IDEA transition planning connecting families early with vocational rehabilitation, developmental disability agencies, and community-based training to build competitive integrated employment and independent living.',
    aliases: ['Adult-service linkage'],
    chapterId: 'sp5547-ch-04',
    chapterTitle: 'Person-Centered IEPs, Goals, and Transition Planning',
    domainId: 'planning-instruction-environment',
    domainLabel: 'Planning and Instruction and the Learning Environment',
    sectionId: 'sp5547-ch-04-section-02',
    sectionHeading:
      'Decision routine: Person-Centered IEPs, Goals, and Transition Planning',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),

  // Chapter 5: Systematic Instruction, Curriculum Access, and Generalization
  makeEntry({
    id: 'sp5547-gloss-09',
    term: 'Task analysis and chaining',
    definition:
      'Systematic instructional method decomposing complex functional or academic routines into teachable sequential steps taught through forward, backward, or total-task chaining across natural school and community settings.',
    aliases: ['Forward and backward chaining'],
    chapterId: 'sp5547-ch-05',
    chapterTitle:
      'Systematic Instruction, Curriculum Access, and Generalization',
    domainId: 'planning-instruction-environment',
    domainLabel: 'Planning and Instruction and the Learning Environment',
    sectionId: 'sp5547-ch-05-section-01',
    sectionHeading:
      'Core frame: Systematic Instruction, Curriculum Access, and Generalization',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-10',
    term: 'Constant time delay and errorless learning',
    definition:
      'Systematic prompting procedure pairing immediate zero-second controlling prompts during initial acquisition with a fixed wait interval later, minimizing learner errors while fading prompts to prevent dependence.',
    aliases: ['CTD', 'Systematic prompting'],
    chapterId: 'sp5547-ch-05',
    chapterTitle:
      'Systematic Instruction, Curriculum Access, and Generalization',
    domainId: 'planning-instruction-environment',
    domainLabel: 'Planning and Instruction and the Learning Environment',
    sectionId: 'sp5547-ch-05-section-02',
    sectionHeading:
      'Decision routine: Systematic Instruction, Curriculum Access, and Generalization',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),

  // Chapter 6: Positive Environments, Behavior, Communication, and Intensive Supports
  makeEntry({
    id: 'sp5547-gloss-11',
    term: 'Functional Communication Training',
    definition:
      'Positive behavior support intervention teaching an accessible, functionally equivalent communicative response—via speech, sign, or AAC—that accesses the same reinforcer as challenging behavior while honoring student dignity.',
    aliases: ['FCT'],
    chapterId: 'sp5547-ch-06',
    chapterTitle:
      'Positive Environments, Behavior, Communication, and Intensive Supports',
    domainId: 'planning-instruction-environment',
    domainLabel: 'Planning and Instruction and the Learning Environment',
    sectionId: 'sp5547-ch-06-section-01',
    sectionHeading:
      'Core frame: Positive Environments, Behavior, Communication, and Intensive Supports',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-12',
    term: 'Function-based PBS and medical rule-out',
    definition:
      'Proactive behavioral support process that rules out pain, illness, or sensory distress first, identifies maintaining behavioral functions via FBA, and prioritizes antecedent supports and differential reinforcement over restraint.',
    aliases: ['FBA/BIP', 'Positive Behavior Support'],
    chapterId: 'sp5547-ch-06',
    chapterTitle:
      'Positive Environments, Behavior, Communication, and Intensive Supports',
    domainId: 'planning-instruction-environment',
    domainLabel: 'Planning and Instruction and the Learning Environment',
    sectionId: 'sp5547-ch-06-section-02',
    sectionHeading:
      'Decision routine: Positive Environments, Behavior, Communication, and Intensive Supports',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),

  // Chapter 7: Accessible Assessment Selection and Administration
  makeEntry({
    id: 'sp5547-gloss-13',
    term: 'Alternate Assessment on Alternate Achievement Standards',
    definition:
      'Statewide accountability assessment reserved exclusively for students with the most significant cognitive disabilities, measuring reduced-complexity grade-level standards through accessible response modes and portfolios.',
    aliases: ['AA-AAS'],
    chapterId: 'sp5547-ch-07',
    chapterTitle: 'Accessible Assessment Selection and Administration',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5547-ch-07-section-01',
    sectionHeading:
      'Core frame: Accessible Assessment Selection and Administration',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),
  makeEntry({
    id: 'sp5547-gloss-14',
    term: 'Ecological and authentic assessment',
    definition:
      'Functional assessment examining a learner\'s performance directly inside natural school, home, and community routines to pinpoint environmental discrepancies, required adaptations, and practical IEP targets.',
    aliases: ['Ecological inventory'],
    chapterId: 'sp5547-ch-07',
    chapterTitle: 'Accessible Assessment Selection and Administration',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5547-ch-07-section-03',
    sectionHeading:
      'Applied practice: Accessible Assessment Selection and Administration',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),

  // Chapter 8: Evaluation, Eligibility, and Cautious Interpretation
  makeEntry({
    id: 'sp5547-gloss-15',
    term: 'Multiple disabilities and low-incidence synthesis',
    definition:
      'Multidisciplinary IDEA eligibility evaluation examining how concomitant cognitive, sensory, motor, or deaf-blindness impairments interact to create severe educational needs not addressed under a single disability category.',
    aliases: ['Concomitant impairment profile'],
    chapterId: 'sp5547-ch-08',
    chapterTitle: 'Evaluation, Eligibility, and Cautious Interpretation',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5547-ch-08-section-01',
    sectionHeading:
      'Core frame: Evaluation, Eligibility, and Cautious Interpretation',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),
  makeEntry({
    id: 'sp5547-gloss-16',
    term: 'Dynamic assessment and adaptive triangulation',
    definition:
      'Test-teach-retest assessment paired with family developmental history and cross-setting adaptive-behavior data to evaluate learning potential with scaffolding rather than relying solely on inaccessible IQ scores.',
    aliases: ['Learning-potential evaluation'],
    chapterId: 'sp5547-ch-08',
    chapterTitle: 'Evaluation, Eligibility, and Cautious Interpretation',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5547-ch-08-section-03',
    sectionHeading:
      'Applied practice: Evaluation, Eligibility, and Cautious Interpretation',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),

  // Chapter 9: Progress Monitoring and Functional Data Decisions
  makeEntry({
    id: 'sp5547-gloss-17',
    term: 'Prompt-level independence coding',
    definition:
      'Task-analytic progress-monitoring system recording both step accuracy and the least intrusive prompt level needed per trial so teams detect prompt dependence and verify steady growth toward independent initiation.',
    aliases: ['Task-analytic mastery tracking'],
    chapterId: 'sp5547-ch-09',
    chapterTitle: 'Progress Monitoring and Functional Data Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5547-ch-09-section-01',
    sectionHeading:
      'Core frame: Progress Monitoring and Functional Data Decisions',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-18',
    term: 'Visual analysis and four-point decision rules',
    definition:
      'Systematic inspection of graphed latency, duration, or accuracy data alongside interobserver agreement and fidelity checks, prompting instructional modification whenever four consecutive data points fall below aimline.',
    aliases: ['Data-based instructional revision'],
    chapterId: 'sp5547-ch-09',
    chapterTitle: 'Progress Monitoring and Functional Data Decisions',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'sp5547-ch-09-section-02',
    sectionHeading:
      'Decision routine: Progress Monitoring and Functional Data Decisions',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),

  // Chapter 10: Law, Ethics, Equity, and Procedural Safeguards
  makeEntry({
    id: 'sp5547-gloss-19',
    term: 'Least Restrictive Environment and FAPE',
    definition:
      'IDEA mandate educating students with severe disabilities alongside nondisabled peers to the maximum extent appropriate using supplementary aids and services, barring automatic separate-school placement by label.',
    aliases: ['LRE mandate'],
    chapterId: 'sp5547-ch-10',
    chapterTitle: 'Law, Ethics, Equity, and Procedural Safeguards',
    domainId: 'ethical-legal-professional-collaboration',
    domainLabel:
      'Ethical and Legal Practice, Professionalism, and Collaboration',
    sectionId: 'sp5547-ch-10-section-01',
    sectionHeading:
      'Core frame: Law, Ethics, Equity, and Procedural Safeguards',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),
  makeEntry({
    id: 'sp5547-gloss-20',
    term: 'Supported decision-making and age of majority',
    definition:
      'Transition-age legal practice notifying families before IDEA rights transfer at adulthood while exploring less-restrictive supported decision-making options that protect student autonomy over full guardianship.',
    aliases: ['Rights transfer alternatives'],
    chapterId: 'sp5547-ch-10',
    chapterTitle: 'Law, Ethics, Equity, and Procedural Safeguards',
    domainId: 'ethical-legal-professional-collaboration',
    domainLabel:
      'Ethical and Legal Practice, Professionalism, and Collaboration',
    sectionId: 'sp5547-ch-10-section-03',
    sectionHeading:
      'Applied practice: Law, Ethics, Equity, and Procedural Safeguards',
    references: [SP_PRAXIS, SP_IDEA_PART_B],
  }),

  // Chapter 11: Family, Team, Related-Service, and Paraprofessional Collaboration
  makeEntry({
    id: 'sp5547-gloss-21',
    term: 'Transdisciplinary team collaboration',
    definition:
      'Integrated service-delivery model in which educators, related-service therapists, and families share assessment and role-release skills to embed OT, PT, and speech goals directly into daily classroom routines.',
    aliases: ['Role-release collaboration'],
    chapterId: 'sp5547-ch-11',
    chapterTitle:
      'Family, Team, Related-Service, and Paraprofessional Collaboration',
    domainId: 'ethical-legal-professional-collaboration',
    domainLabel:
      'Ethical and Legal Practice, Professionalism, and Collaboration',
    sectionId: 'sp5547-ch-11-section-01',
    sectionHeading:
      'Core frame: Family, Team, Related-Service, and Paraprofessional Collaboration',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-22',
    term: 'Paraprofessional training and supervision',
    definition:
      'Ongoing teacher-led coaching, role delineation, and modeled feedback preparing paraeducators to deliver systematic prompts, collect accurate data, and fade adult proximity so natural peer interactions flourish.',
    aliases: ['Paraeducator coaching'],
    chapterId: 'sp5547-ch-11',
    chapterTitle:
      'Family, Team, Related-Service, and Paraprofessional Collaboration',
    domainId: 'ethical-legal-professional-collaboration',
    domainLabel:
      'Ethical and Legal Practice, Professionalism, and Collaboration',
    sectionId: 'sp5547-ch-11-section-02',
    sectionHeading:
      'Decision routine: Family, Team, Related-Service, and Paraprofessional Collaboration',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),

  // Chapter 12: Professional Learning, Advocacy, Safety, and Boundaries
  makeEntry({
    id: 'sp5547-gloss-23',
    term: 'Medical-delegation scope and mandated reporting',
    definition:
      'Professional safety boundary restricting invasive healthcare procedures to authorized nursing delegation and verified training while upholding legal mandated-reporting duties to protect learners from abuse or neglect.',
    aliases: ['Scope-of-practice safety limits'],
    chapterId: 'sp5547-ch-12',
    chapterTitle: 'Professional Learning, Advocacy, Safety, and Boundaries',
    domainId: 'ethical-legal-professional-collaboration',
    domainLabel:
      'Ethical and Legal Practice, Professionalism, and Collaboration',
    sectionId: 'sp5547-ch-12-section-02',
    sectionHeading:
      'Decision routine: Professional Learning, Advocacy, Safety, and Boundaries',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
  makeEntry({
    id: 'sp5547-gloss-24',
    term: 'Dignity-centered inclusion advocacy',
    definition:
      'Ethical commitment aligned with CEC standards to challenge low expectations, adopt evidence-based AAC and instructional practices, and uphold chronological-age dignity and schoolwide belonging for students with severe disabilities.',
    aliases: ['CEC severe-disabilities ethics'],
    chapterId: 'sp5547-ch-12',
    chapterTitle: 'Professional Learning, Advocacy, Safety, and Boundaries',
    domainId: 'ethical-legal-professional-collaboration',
    domainLabel:
      'Ethical and Legal Practice, Professionalism, and Collaboration',
    sectionId: 'sp5547-ch-12-section-01',
    sectionHeading:
      'Core frame: Professional Learning, Advocacy, Safety, and Boundaries',
    references: [SP_PRAXIS, SP_CEC_STANDARDS],
  }),
];

module.exports = {
  special_education_learning_disabilities_5383,
  special_education_severe_profound_5547,
};
