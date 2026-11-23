'use strict';

const PLT5623_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5623.pdf';
const PLT5624_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw381f0276/pdfs/5624.pdf';
const INTASC_STANDARDS =
  'https://ccsso.org/sites/default/files/2017-11/InTASC_Model_Core_Teaching_Standards_2011.pdf';
const WWC_ORGANIZING = 'https://ies.ed.gov/ncee/wwc/practiceguide/1';
const WWC_GUIDES = 'https://ies.ed.gov/ncee/wwc/PracticeGuides';
const IDEA_EVAL_300_304 = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const IDEA_CHILD_FIND =
  'https://sites.ed.gov/idea/idea-files/rts-qa-child-find-part-b-08-24-2021/';
const ED_DISABILITY =
  'https://www.ed.gov/laws-and-policy/civil-rights-laws/disability-discrimination';
const ED_EL =
  'https://www.ed.gov/laws-and-policy/civil-rights-laws/race-color-and-national-origin-discrimination/race-color-and-national-origin-discrimination-key-issues/equal-education-opportunities-english';
const WWC_BEHAVIOR = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/31/Published';
const WWC_DATA = 'https://ies.ed.gov/ncee/wwc/practiceguide/12';
const FERPA_FAQ =
  'https://studentprivacy.ed.gov/faq/under-ferpa-may-educational-agency-or-institution-disclose-education-records-any-its-employees';

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

const plt_5_9_5623 = [
  // Chapter 1: Learning Theory, Cognition, and Transfer
  makeEntry({
    id: 'plt5623-gloss-01',
    term: 'Schema activation',
    definition:
      'Instructional practice of surfacing organized background knowledge before introducing new middle-level concepts so learners integrate novel information into long-term memory without overloading working memory.',
    aliases: ['Prior-knowledge activation'],
    chapterId: 'plt5623-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-01-section-01',
    sectionHeading: 'Knowledge construction, schema, and information processing',
    references: [PLT5623_PRAXIS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5623-gloss-02',
    term: 'Zone of proximal development',
    definition:
      'Vygotskian range between what a Grades 5–9 student can complete independently and what they can accomplish with structured teacher modeling, peer mediation, or temporary instructional scaffolds.',
    aliases: ['ZPD'],
    chapterId: 'plt5623-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-01-section-04',
    sectionHeading: 'Scaffolding, retrieval, and transfer',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 2: Human Development Across Grades 5–9
  makeEntry({
    id: 'plt5623-gloss-03',
    term: 'Formal operational transition',
    definition:
      'Piagetian developmental shift across ages 10–15 as early adolescents move unevenly from concrete, hands-on reasoning toward hypothetical-deductive and abstract thought, requiring bridged representations.',
    aliases: ['Concrete-to-abstract transition'],
    chapterId: 'plt5623-ch-02',
    chapterTitle: 'Human Development Across Grades 5–9',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-02-section-02',
    sectionHeading: 'Reasoning and representation across grades 5–9',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5623-gloss-04',
    term: 'Identity vs. role confusion',
    definition:
      'Eriksonian psychosocial stage emerging in early adolescence as students explore social roles, peer belonging, and personal values while relying on consistent adult guidance and constructive feedback.',
    aliases: ['Erikson adolescent stage'],
    chapterId: 'plt5623-ch-02',
    chapterTitle: 'Human Development Across Grades 5–9',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-02-section-03',
    sectionHeading: 'Social-emotional, identity, and moral development',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 3: Learner Differences, Access, Disability, Giftedness, and Language
  makeEntry({
    id: 'plt5623-gloss-05',
    term: 'Accommodation vs. modification',
    definition:
      'Distinction between access supports under IDEA or Section 504 that preserve grade-level expectations (accommodations) and IEP-authorized changes that alter target content or proficiency criteria (modifications).',
    aliases: ['IEP and 504 supports'],
    chapterId: 'plt5623-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-03-section-02',
    sectionHeading:
      'Disability access, IDEA, Section 504, and classroom responsibility',
    references: [PLT5623_PRAXIS, ED_DISABILITY],
  }),
  makeEntry({
    id: 'plt5623-gloss-06',
    term: 'Sheltered instruction',
    definition:
      'Instructional approach pairing grade-level academic standards with explicit language objectives, visual models, and structured peer discourse so English learners build content mastery and academic English together.',
    aliases: ['Content-based EL scaffolding'],
    chapterId: 'plt5623-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-03-section-03',
    sectionHeading: 'English learners and meaningful grade-level participation',
    references: [PLT5623_PRAXIS, ED_EL],
  }),

  // Chapter 4: Motivation, Learning Environment, and Behavior
  makeEntry({
    id: 'plt5623-gloss-07',
    term: 'Self-determination theory',
    definition:
      'Motivational framework proposing that early adolescents sustain intrinsic engagement when classrooms support three core psychological needs: meaningful autonomy, perceived competence, and social relatedness.',
    aliases: ['SDT'],
    chapterId: 'plt5623-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-04-section-01',
    sectionHeading: 'Motivation, value, expectancy, and self-determination',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5623-gloss-08',
    term: 'Restorative practices',
    definition:
      'Proactive and responsive classroom climate routines, including community circles and affective conferences, that repair relational harm, strengthen peer accountability, and teach replacement social behaviors.',
    aliases: ['Restorative discipline'],
    chapterId: 'plt5623-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5623-ch-04-section-02',
    sectionHeading: 'Routines, expectations, and positive climate',
    references: [PLT5623_PRAXIS, WWC_BEHAVIOR],
  }),

  // Chapter 5: Standards, Objectives, Planning, and Resources
  makeEntry({
    id: 'plt5623-gloss-09',
    term: 'Backward design',
    definition:
      'Curriculum planning sequence that identifies target standards and enduring understandings first, determines aligned assessment evidence next, and designs differentiated lessons and scaffolds last.',
    aliases: ['Understanding by Design', 'UbD'],
    chapterId: 'plt5623-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5623-ch-05-section-02',
    sectionHeading: 'Observable objectives and aligned evidence',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5623-gloss-10',
    term: 'Interdisciplinary teaming',
    definition:
      'Middle-level organizational structure in which core subject teachers share a common cohort of students to align thematic units, coordinate advisory supports, and respond cohesively to learner needs.',
    aliases: ['Middle-level teaching team'],
    chapterId: 'plt5623-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5623-ch-05-section-03',
    sectionHeading: 'Backward planning, units, and interdisciplinary design',
    references: [PLT5623_PRAXIS, WWC_GUIDES],
  }),

  // Chapter 6: Instructional Methods, Grouping, Scaffolding, and Practice
  makeEntry({
    id: 'plt5623-gloss-11',
    term: 'Cognitive apprenticeship',
    definition:
      'Instructional model making expert thinking visible through think-aloud modeling, guided coaching, and gradual fading of supports as Grades 5–9 learners take ownership of complex problem solving.',
    aliases: ['Gradual release of responsibility'],
    chapterId: 'plt5623-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5623-ch-06-section-01',
    sectionHeading: 'Explicit, direct, and modeled instruction',
    references: [PLT5623_PRAXIS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5623-gloss-12',
    term: 'Reciprocal teaching',
    definition:
      'Structured cooperative reading dialogue in which middle-grade students rotate leading four comprehension strategies—predicting, questioning, clarifying, and summarizing—to deepen shared text analysis.',
    aliases: ['Structured peer comprehension'],
    chapterId: 'plt5623-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5623-ch-06-section-03',
    sectionHeading: 'Cooperative learning and flexible grouping',
    references: [PLT5623_PRAXIS, WWC_GUIDES],
  }),

  // Chapter 7: Questioning, Communication, Monitoring, and Reflection
  makeEntry({
    id: 'plt5623-gloss-13',
    term: 'Wait time',
    definition:
      'Intentional pause of three to five seconds after asking a question and after a student responds, increasing equitable participation, answer elaboration, and higher-order reasoning in Grades 5–9 discussions.',
    aliases: ['Think time'],
    chapterId: 'plt5623-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5623-ch-07-section-01',
    sectionHeading: 'Question purpose, wait time, and cognitive demand',
    references: [PLT5623_PRAXIS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5623-gloss-14',
    term: 'Formative check for understanding',
    definition:
      'Brief, low-stakes classroom probe—such as hinge questions, response boards, or exit tickets—used mid-lesson to surface misconceptions across the class and guide immediate reteaching or extension.',
    aliases: ['CFU'],
    chapterId: 'plt5623-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5623-ch-07-section-03',
    sectionHeading: 'Clear explanations and checks for understanding',
    references: [PLT5623_PRAXIS, WWC_DATA],
  }),

  // Chapter 8: Assessment Purpose, Format, Alignment, and Feedback
  makeEntry({
    id: 'plt5623-gloss-15',
    term: 'Analytic vs. holistic rubric',
    definition:
      'Contrast between analytic rubrics that score distinct criteria separately to provide diagnostic guidance and holistic rubrics that assign one overall proficiency rating for efficient summative scoring.',
    aliases: ['Scoring rubric design'],
    chapterId: 'plt5623-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5623-ch-08-section-03',
    sectionHeading:
      'Rubrics, checklists, portfolios, self assessment, and peer assessment',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5623-gloss-16',
    term: 'Standards-based grading',
    definition:
      'Reporting system communicating student proficiency on explicit learning standards separately from homework compliance or behavior, emphasizing current mastery and structured opportunities for revision.',
    aliases: ['SBG', 'Mastery-based reporting'],
    chapterId: 'plt5623-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5623-ch-08-section-04',
    sectionHeading: 'Alignment, feedback, accessibility, and accommodations',
    references: [PLT5623_PRAXIS, WWC_DATA],
  }),

  // Chapter 9: Measurement, Scoring, Interpretation, and Communication
  makeEntry({
    id: 'plt5623-gloss-17',
    term: 'Criterion-referenced assessment',
    definition:
      'Assessment interpreting student achievement against predefined curriculum standards or proficiency benchmarks rather than ranking scores relative to the performance distribution of a peer norm group.',
    aliases: ['Standards-referenced measure'],
    chapterId: 'plt5623-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5623-ch-09-section-02',
    sectionHeading: 'Norm and criterion reference, raw and scaled scores',
    references: [PLT5623_PRAXIS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5623-gloss-18',
    term: 'Grade-equivalent score',
    definition:
      'Norm-referenced score estimating the grade and month at which the median norm student earned the same raw score on a specific test, not evidence that a learner has mastered higher-grade curriculum.',
    aliases: ['GE score'],
    chapterId: 'plt5623-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5623-ch-09-section-03',
    sectionHeading: 'Percentiles, grade equivalents, center, and variation',
    references: [PLT5623_PRAXIS, WWC_DATA],
  }),

  // Chapter 10: Reflection, Research, and Professional Learning
  makeEntry({
    id: 'plt5623-gloss-19',
    term: 'Classroom action research',
    definition:
      'Cyclical, practitioner-led inquiry in which middle-level educators pose a focused instructional question, gather baseline and outcome data in their own classes, and refine teaching based on evidence.',
    aliases: ['Teacher inquiry cycle'],
    chapterId: 'plt5623-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5623-ch-10-section-03',
    sectionHeading: 'Action research and local improvement',
    references: [PLT5623_PRAXIS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5623-gloss-20',
    term: 'Job-embedded professional learning',
    definition:
      'Continuous educator growth anchored in daily instructional practice—such as peer observation, lesson study, and coaching cycles—tied directly to team goals and current student learning evidence.',
    aliases: ['Practice-based PD'],
    chapterId: 'plt5623-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5623-ch-10-section-04',
    sectionHeading: 'Mentoring, peer observation, and job-embedded learning',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 11: Collaboration, Families, Support Personnel, and Community
  makeEntry({
    id: 'plt5623-gloss-21',
    term: 'Reciprocal family partnership',
    definition:
      'Two-way, culturally responsive collaboration that values family insight into early adolescents and guarantees timely translation or interpretation so caregivers actively co-support learning goals.',
    aliases: ['Two-way family engagement'],
    chapterId: 'plt5623-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5623-ch-11-section-02',
    sectionHeading: 'Reciprocal family partnership and language access',
    references: [PLT5623_PRAXIS, ED_EL],
  }),
  makeEntry({
    id: 'plt5623-gloss-22',
    term: 'Middle-level advisory coordination',
    definition:
      'Structured collaboration among advisors, counselors, specialists, and paraeducators to monitor academic, attendance, and social-emotional needs so every Grade 5–9 student has a consistent adult advocate.',
    aliases: ['Student support teaming'],
    chapterId: 'plt5623-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5623-ch-11-section-03',
    sectionHeading: 'Specialists, paraeducators, and coordinated student support',
    references: [PLT5623_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 12: Ethics, Law, Privacy, Rights, and Student Safety
  makeEntry({
    id: 'plt5623-gloss-23',
    term: 'Legitimate educational interest',
    definition:
      'FERPA privacy standard permitting disclosure of student education records without parent consent only to school officials whose assigned professional duties require accessing that specific information.',
    aliases: ['FERPA need-to-know standard'],
    chapterId: 'plt5623-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5623-ch-12-section-02',
    sectionHeading: 'FERPA, confidentiality, and secure communication',
    references: [PLT5623_PRAXIS, FERPA_FAQ],
  }),
  makeEntry({
    id: 'plt5623-gloss-24',
    term: 'Child Find obligation',
    definition:
      'Federal IDEA mandate requiring public school districts to proactively identify, locate, and evaluate students suspected of having a disability who may require special education and related services.',
    aliases: ['IDEA Child Find'],
    chapterId: 'plt5623-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5623-ch-12-section-03',
    sectionHeading: 'Disability rights, reporting, speech, and copyright',
    references: [PLT5623_PRAXIS, IDEA_CHILD_FIND],
  }),
];

const plt_7_12_5624 = [
  // Chapter 1: Learning Theory, Cognition, and Transfer
  makeEntry({
    id: 'plt5624-gloss-01',
    term: 'Cognitive load theory',
    definition:
      'Instructional framework based on limited working memory capacity that directs teachers to reduce extraneous task clutter, manage intrinsic complexity, and channel germane effort into schema construction.',
    aliases: ['CLT'],
    chapterId: 'plt5624-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-01-section-01',
    sectionHeading: 'Knowledge construction, schema, and information processing',
    references: [PLT5624_PRAXIS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5624-gloss-02',
    term: 'Retrieval practice',
    definition:
      'Evidence-based learning strategy in which secondary students actively recall concepts from memory via spaced low-stakes quizzes or prompts, strengthening durable retention and flexible transfer.',
    aliases: ['Testing effect'],
    chapterId: 'plt5624-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-01-section-04',
    sectionHeading: 'Scaffolding, retrieval, and transfer',
    references: [PLT5624_PRAXIS, WWC_ORGANIZING],
  }),

  // Chapter 2: Human Development Across Grades 7–12
  makeEntry({
    id: 'plt5624-gloss-03',
    term: 'Adolescent executive function',
    definition:
      'Maturing higher-order cognitive control skills—including planning, inhibitory control, working memory, and mental flexibility—that underpin abstract reasoning and multi-week project management in Grades 7–12.',
    aliases: ['Prefrontal self-regulation'],
    chapterId: 'plt5624-ch-02',
    chapterTitle: 'Human Development Across Grades 7–12',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-02-section-02',
    sectionHeading: 'Adolescent reasoning and disciplinary representation',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-04',
    term: 'Kohlberg stages of moral development',
    definition:
      'Developmental progression from preconventional self-interest to conventional social approval and postconventional ethical principles, shaping how adolescents reason through civic and classroom dilemmas.',
    aliases: ['Moral reasoning stages'],
    chapterId: 'plt5624-ch-02',
    chapterTitle: 'Human Development Across Grades 7–12',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-02-section-03',
    sectionHeading: 'Social-emotional, identity, and moral development',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 3: Learner Differences, Access, Disability, Giftedness, and Language
  makeEntry({
    id: 'plt5624-gloss-05',
    term: 'Postsecondary transition planning',
    definition:
      'Coordinated, results-oriented IEP planning process mandated by age 16 under IDEA that connects secondary coursework, accommodations, and community experiences to measurable adult education or career goals.',
    aliases: ['IDEA transition services'],
    chapterId: 'plt5624-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-03-section-02',
    sectionHeading:
      'Disability access, IDEA, Section 504, and classroom responsibility',
    references: [PLT5624_PRAXIS, IDEA_EVAL_300_304],
  }),
  makeEntry({
    id: 'plt5624-gloss-06',
    term: 'Universal Design for Learning',
    definition:
      'Proactive instructional framework that minimizes barriers in Grades 7–12 classrooms by building multiple means of engagement, representation, and action or expression into lessons from initial planning.',
    aliases: ['UDL'],
    chapterId: 'plt5624-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-03-section-04',
    sectionHeading:
      'Giftedness, enrichment, differentiation, and universal access',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 4: Motivation, Learning Environment, and Behavior
  makeEntry({
    id: 'plt5624-gloss-07',
    term: 'Expectancy-value theory',
    definition:
      'Motivational model proposing that adolescents invest sustained effort when they believe they can succeed on a task and perceive its intrinsic interest, personal utility, or long-term attainment value.',
    aliases: ['Expectancy-value motivation'],
    chapterId: 'plt5624-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-04-section-01',
    sectionHeading: 'Motivation, value, expectancy, and self-determination',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-08',
    term: 'Attribution theory',
    definition:
      'Cognitive framework examining how adolescents explain academic success or setback by locus, stability, and controllability, fostering resilience when teacher feedback highlights controllable strategies.',
    aliases: ['Causal attribution'],
    chapterId: 'plt5624-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5624-ch-04-section-03',
    sectionHeading: 'Behavior as observable, contextual, and teachable',
    references: [PLT5624_PRAXIS, WWC_BEHAVIOR],
  }),

  // Chapter 5: Standards, Objectives, Planning, and Resources
  makeEntry({
    id: 'plt5624-gloss-09',
    term: 'Disciplinary literacy',
    definition:
      'Specialized reading, writing, and evidentiary reasoning practices distinct to each secondary field, including historical sourcing, scientific claim-evidence argumentation, and mathematical proof.',
    aliases: ['Content-area literacy practices'],
    chapterId: 'plt5624-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5624-ch-05-section-01',
    sectionHeading: 'Standards, scope, sequence, and priority learning',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-10',
    term: 'Depth of Knowledge',
    definition:
      'Four-level cognitive rigor framework classifying secondary objectives and tasks from factual recall (Level 1) to strategic reasoning (Level 3) and extended cross-source synthesis (Level 4).',
    aliases: ['Webb DOK'],
    chapterId: 'plt5624-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5624-ch-05-section-02',
    sectionHeading: 'Observable objectives and aligned evidence',
    references: [PLT5624_PRAXIS, WWC_GUIDES],
  }),

  // Chapter 6: Instructional Methods, Grouping, Scaffolding, and Practice
  makeEntry({
    id: 'plt5624-gloss-11',
    term: 'Problem-based learning',
    definition:
      'Student-centered secondary pedagogy in which adolescents investigate authentic, open-ended problems, evaluate disciplinary evidence, and defend reasoned solutions with structured teacher facilitation.',
    aliases: ['PBL'],
    chapterId: 'plt5624-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5624-ch-06-section-02',
    sectionHeading:
      'Inquiry, problem-based, experiential, and interactive learning',
    references: [PLT5624_PRAXIS, WWC_GUIDES],
  }),
  makeEntry({
    id: 'plt5624-gloss-12',
    term: 'Interleaved practice',
    definition:
      'Practice arrangement that alternates related problem types or concepts rather than blocking one procedure at a time, prompting secondary learners to diagnose problem structures and choose valid strategies.',
    aliases: ['Mixed practice'],
    chapterId: 'plt5624-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5624-ch-06-section-04',
    sectionHeading: 'Scaffolding, differentiation, practice, and transfer',
    references: [PLT5624_PRAXIS, WWC_ORGANIZING],
  }),

  // Chapter 7: Questioning, Communication, Monitoring, and Reflection
  makeEntry({
    id: 'plt5624-gloss-13',
    term: 'Socratic seminar',
    definition:
      'Structured, text-anchored secondary dialogue guided by open-ended inquiry in which students test assumptions, cite primary evidence, and collaboratively refine conceptual interpretations.',
    aliases: ['Socratic inquiry'],
    chapterId: 'plt5624-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5624-ch-07-section-01',
    sectionHeading: 'Question purpose, wait time, and cognitive demand',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-14',
    term: 'Equitable discourse norms',
    definition:
      'Co-constructed secondary discussion agreements—such as evidence-based critique, balanced airtime, and varied participation modes—that cultivate psychological safety and rigorous academic voice for all learners.',
    aliases: ['Accountable talk norms'],
    chapterId: 'plt5624-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5624-ch-07-section-02',
    sectionHeading: 'Discussion, listening, error response, and learner voice',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),

  // Chapter 8: Assessment Purpose, Format, Alignment, and Feedback
  makeEntry({
    id: 'plt5624-gloss-15',
    term: 'Authentic performance assessment',
    definition:
      'Assessment requiring Grades 7–12 students to synthesize disciplinary knowledge in an original product, lab inquiry, defense, or longitudinal portfolio judged against explicit scoring criteria.',
    aliases: ['Performance task'],
    chapterId: 'plt5624-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5624-ch-08-section-02',
    sectionHeading: 'Selected response, performance, observation, and conference',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-16',
    term: 'Formative feedback loop',
    definition:
      'Iterative assessment cycle delivering timely, criterion-referenced feedback that clarifies current standing relative to learning goals and gives secondary students structured opportunities to revise work.',
    aliases: ['Actionable feedback cycle'],
    chapterId: 'plt5624-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5624-ch-08-section-04',
    sectionHeading: 'Alignment, feedback, accessibility, and accommodations',
    references: [PLT5624_PRAXIS, WWC_DATA],
  }),

  // Chapter 9: Measurement, Scoring, Interpretation, and Communication
  makeEntry({
    id: 'plt5624-gloss-17',
    term: 'Standard error of measurement',
    definition:
      'Statistical estimate of expected score fluctuation around an observed test result caused by measurement imprecision, defining a confidence interval that guards against overinterpreting minor score gaps.',
    aliases: ['SEM'],
    chapterId: 'plt5624-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5624-ch-09-section-01',
    sectionHeading: 'Reliability, validity, error, and intended use',
    references: [PLT5624_PRAXIS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5624-gloss-18',
    term: 'Construct-irrelevant variance',
    definition:
      'Systematic score distortion introduced by factors unrelated to the target standard—such as cultural bias, extraneous reading load, or inaccessible test format—that undermines validity and fairness.',
    aliases: ['Assessment bias'],
    chapterId: 'plt5624-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5624-ch-09-section-04',
    sectionHeading: 'Fairness, multiple measures, and communication',
    references: [PLT5624_PRAXIS, WWC_DATA],
  }),

  // Chapter 10: Reflection, Research, and Professional Learning
  makeEntry({
    id: 'plt5624-gloss-19',
    term: 'Internal vs. external validity',
    definition:
      'Research appraisal distinction between confidence that an instructional intervention caused observed gains (internal validity) and whether findings generalize to a local secondary classroom (external validity).',
    aliases: ['Causal and generalizability appraisal'],
    chapterId: 'plt5624-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5624-ch-10-section-02',
    sectionHeading: 'Research appraisal and evidence claims',
    references: [PLT5624_PRAXIS, WWC_GUIDES],
  }),
  makeEntry({
    id: 'plt5624-gloss-20',
    term: 'Professional learning community',
    definition:
      'Collaborative departmental team of secondary educators who regularly examine common assessment data, calibrate scoring rubrics, mentor colleagues, and refine instruction across shared courses.',
    aliases: ['PLC', 'Departmental PLC'],
    chapterId: 'plt5624-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5624-ch-10-section-04',
    sectionHeading: 'Mentoring, peer observation, and job-embedded learning',
    references: [PLT5624_PRAXIS, WWC_DATA],
  }),

  // Chapter 11: Collaboration, Families, Support Personnel, and Community
  makeEntry({
    id: 'plt5624-gloss-21',
    term: 'Co-teaching model',
    definition:
      'Instructional partnership in which a secondary content teacher and a special education or English learner specialist co-plan, co-deliver, and co-assess lessons to broaden access while preserving academic rigor.',
    aliases: ['Collaborative instruction'],
    chapterId: 'plt5624-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5624-ch-11-section-01',
    sectionHeading: 'Collaborative purpose, roles, and action plans',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-22',
    term: 'Data minimization',
    definition:
      'FERPA-aligned safeguarding principle requiring secondary educators collaborating with community partners or external mentors to share only the minimum student information legally authorized and necessary.',
    aliases: ['Need-to-know data sharing'],
    chapterId: 'plt5624-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5624-ch-11-section-04',
    sectionHeading:
      'Community partnership, data, safeguarding, and continuity',
    references: [PLT5624_PRAXIS, FERPA_FAQ],
  }),

  // Chapter 12: Ethics, Law, Privacy, Rights, and Student Safety
  makeEntry({
    id: 'plt5624-gloss-23',
    term: 'Procedural due process',
    definition:
      'Constitutional safeguard requiring public schools to provide students clear notice of alleged infractions and a meaningful opportunity to be heard before imposing major disciplinary exclusions.',
    aliases: ['Student fair process'],
    chapterId: 'plt5624-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5624-ch-12-section-01',
    sectionHeading: 'Ethics, professional judgment, and fair process',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
  makeEntry({
    id: 'plt5624-gloss-24',
    term: 'Fair use doctrine',
    definition:
      'Statutory copyright limitation permitting limited educational reproduction of protected materials weighed across four factors: purpose, nature of the work, portion used, and effect on the market.',
    aliases: ['Educational copyright exception'],
    chapterId: 'plt5624-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5624-ch-12-section-03',
    sectionHeading: 'Disability rights, reporting, speech, and copyright',
    references: [PLT5624_PRAXIS, INTASC_STANDARDS],
  }),
];

module.exports = {
  plt_5_9_5623,
  plt_7_12_5624,
};
