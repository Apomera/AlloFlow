'use strict';

const PLT5621_ETS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5621.pdf';
const PLT5622_ETS = 'https://www.ets.org/pdfs/praxis/5622.pdf';
const INTASC =
  'https://ccsso.org/sites/default/files/2017-11/InTASC_Model_Core_Teaching_Standards_2011.pdf';
const WWC_ORGANIZING = 'https://ies.ed.gov/ncee/wwc/practiceguide/1';
const WWC_GUIDES = 'https://ies.ed.gov/ncee/wwc/PracticeGuides';
const IDEA_EVAL = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const IDEA_CHILD_FIND =
  'https://sites.ed.gov/idea/idea-files/rts-qa-child-find-part-b-08-24-2021/';
const OCR_504 =
  'https://www.ed.gov/laws-and-policy/civil-rights-laws/disability-discrimination';
const OCR_EL =
  'https://www.ed.gov/laws-and-policy/civil-rights-laws/race-color-and-national-origin-discrimination/race-color-and-national-origin-discrimination-key-issues/equal-education-opportunities-english';
const WWC_BEHAVIOR = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/31/Published';
const WWC_DATA = 'https://ies.ed.gov/ncee/wwc/practiceguide/12';
const FERPA_FAQ =
  'https://studentprivacy.ed.gov/faq/under-ferpa-may-educational-agency-or-institution-disclose-education-records-any-its-employees';
const ED_EMERGENCY =
  'https://www.ed.gov/teaching-and-administration/safe-learning-environments/school-safety-and-security/emergency-planning';

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

const plt_early_childhood_5621 = [
  // Chapter 1: Learning Theory, Cognition, and Transfer
  makeEntry({
    id: 'plt5621-gloss-01',
    term: 'Zone of Proximal Development',
    definition:
      "Vygotsky's range between what a young child can accomplish independently and what the child can achieve with guided adult or peer support, defining the prime target for early childhood instruction.",
    aliases: ['ZPD'],
    chapterId: 'plt5621-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-01-section-02',
    sectionHeading: 'Foundational theorists as instructional lenses',
    references: [PLT5621_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5621-gloss-02',
    term: 'Instructional scaffolding',
    definition:
      'Temporary, responsive guidance—such as modeling, visual cues, or verbal prompts—that helps a young learner perform a task within the ZPD and is systematically faded as competence grows.',
    aliases: ['Scaffolded support', 'Gradual fading'],
    chapterId: 'plt5621-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-01-section-04',
    sectionHeading: 'Scaffolding, retrieval, and transfer',
    references: [PLT5621_ETS, WWC_ORGANIZING],
  }),

  // Chapter 2: Human Development in Early Childhood
  makeEntry({
    id: 'plt5621-gloss-03',
    term: 'Preoperational stage',
    definition:
      "Piaget's early childhood cognitive stage (roughly ages 2–7) marked by symbolic play and rapid language growth alongside centration, egocentrism, and emerging conservation of quantity.",
    aliases: ['Conservation and centration'],
    chapterId: 'plt5621-ch-02',
    chapterTitle: 'Human Development in Early Childhood',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-02-section-02',
    sectionHeading: 'Play, language, reasoning, and representation',
    references: [PLT5621_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5621-gloss-04',
    term: 'Initiative versus guilt',
    definition:
      "Erikson's preschool psychosocial crisis in which children develop purposeful agency through imaginative play and choice-making, or internalize guilt when exploration meets harsh criticism.",
    aliases: ["Erikson's third stage"],
    chapterId: 'plt5621-ch-02',
    chapterTitle: 'Human Development in Early Childhood',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-02-section-03',
    sectionHeading: 'Social-emotional, identity, and moral development',
    references: [PLT5621_ETS, INTASC],
  }),

  // Chapter 3: Learner Differences, Access, Disability, Giftedness, and Language
  makeEntry({
    id: 'plt5621-gloss-05',
    term: 'IEP and Section 504 accommodations',
    definition:
      'Legally mandated instructional or environmental adjustments under IDEA or Section 504 that remove disability-related barriers so young learners access grade-level standards without lowering expectations.',
    aliases: ['Individualized access supports'],
    chapterId: 'plt5621-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-03-section-02',
    sectionHeading:
      'Disability access, IDEA, Section 504, and classroom responsibility',
    references: [IDEA_EVAL, OCR_504],
  }),
  makeEntry({
    id: 'plt5621-gloss-06',
    term: 'Sheltered language support',
    definition:
      'Targeted instructional practices for young English learners—including visuals, gestures, sentence frames, and home-language bridges—that build academic English while ensuring meaningful content access.',
    aliases: ['EL visual and oral scaffolds'],
    chapterId: 'plt5621-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-03-section-03',
    sectionHeading: 'English learners and meaningful grade-level participation',
    references: [PLT5621_ETS, OCR_EL],
  }),

  // Chapter 4: Motivation, Learning Environment, and Behavior
  makeEntry({
    id: 'plt5621-gloss-07',
    term: 'Positive behavior management',
    definition:
      'Preventive early childhood guidance using predictable routines, visual schedules, explicitly taught expectations, and behavior-specific praise to foster emotional safety and sustained engagement.',
    aliases: ['Proactive classroom routines'],
    chapterId: 'plt5621-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-04-section-02',
    sectionHeading: 'Routines, expectations, and positive climate',
    references: [PLT5621_ETS, WWC_BEHAVIOR],
  }),
  makeEntry({
    id: 'plt5621-gloss-08',
    term: 'Self-regulation',
    definition:
      "A young child's developing capacity to monitor and adjust emotions, attention, and impulses during learning and social play, strengthened through co-regulation, modeling, and calm-down routines.",
    aliases: ['Emotional and behavioral self-control'],
    chapterId: 'plt5621-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5621-ch-04-section-04',
    sectionHeading: 'Physical environment, engagement, and self-management',
    references: [INTASC, WWC_BEHAVIOR],
  }),

  // Chapter 5: Standards, Objectives, Planning, and Resources
  makeEntry({
    id: 'plt5621-gloss-09',
    term: 'Standards-aligned learning objective',
    definition:
      'A clear statement specifying the observable skill or understanding young learners will demonstrate, aligned directly to state early learning standards, classroom activities, and assessment criteria.',
    aliases: ['Measurable lesson objective'],
    chapterId: 'plt5621-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5621-ch-05-section-02',
    sectionHeading: 'Observable objectives and aligned evidence',
    references: [PLT5621_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5621-gloss-10',
    term: 'Backward design',
    definition:
      'Curriculum planning process that begins by identifying desired standards and enduring understandings, next determines acceptable assessment evidence, and finally designs aligned learning experiences.',
    aliases: ['Backward planning', 'UbD'],
    chapterId: 'plt5621-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5621-ch-05-section-03',
    sectionHeading: 'Backward planning, units, and interdisciplinary design',
    references: [PLT5621_ETS, INTASC],
  }),

  // Chapter 6: Instructional Methods, Grouping, Scaffolding, and Practice
  makeEntry({
    id: 'plt5621-gloss-11',
    term: 'Play-based inquiry',
    definition:
      'Developmentally appropriate early childhood pedagogy in which structured, hands-on play centers invite children to explore, question, and test ideas while the teacher embeds targeted learning goals.',
    aliases: ['Guided play', 'Experiential inquiry'],
    chapterId: 'plt5621-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5621-ch-06-section-02',
    sectionHeading:
      'Inquiry, problem-based, experiential, and interactive learning',
    references: [PLT5621_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5621-gloss-12',
    term: 'Differentiated instruction',
    definition:
      'Proactive adjustment of content, process, product, or learning environment based on ongoing readiness and interest data so every PK–3 learner reaches shared standards through accessible pathways.',
    aliases: ['Instructional differentiation'],
    chapterId: 'plt5621-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5621-ch-06-section-04',
    sectionHeading: 'Scaffolding, differentiation, practice, and transfer',
    references: [PLT5621_ETS, WWC_ORGANIZING],
  }),

  // Chapter 7: Questioning, Communication, Monitoring, and Reflection
  makeEntry({
    id: 'plt5621-gloss-13',
    term: 'Wait time',
    definition:
      "An intentional three-to-five-second silent pause after posing a question and after a student responds, increasing young children's language complexity, participation equity, and reasoning depth.",
    aliases: ['Think time'],
    chapterId: 'plt5621-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5621-ch-07-section-01',
    sectionHeading: 'Question purpose, wait time, and cognitive demand',
    references: [PLT5621_ETS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5621-gloss-14',
    term: 'Open-ended questioning',
    definition:
      "Asking prompts with multiple valid explanations rather than single-word recall answers to elicit young children's reasoning, expand expressive vocabulary, and surface conceptual misunderstandings.",
    aliases: ['Divergent questioning'],
    chapterId: 'plt5621-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5621-ch-07-section-02',
    sectionHeading: 'Discussion, listening, error response, and learner voice',
    references: [PLT5621_ETS, INTASC],
  }),

  // Chapter 8: Assessment Purpose, Format, Alignment, and Feedback
  makeEntry({
    id: 'plt5621-gloss-15',
    term: 'Formative versus summative assessment',
    definition:
      'Formative assessment gathers ongoing evidence during instruction to adjust teaching and provide feedback, whereas summative assessment evaluates cumulative mastery at the end of an instructional unit.',
    aliases: ['Assessment for vs. of learning'],
    chapterId: 'plt5621-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5621-ch-08-section-01',
    sectionHeading: 'Diagnostic, formative, and summative purposes',
    references: [PLT5621_ETS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5621-gloss-16',
    term: 'Authentic portfolio assessment',
    definition:
      'Purposeful collection of dated student work samples, anecdotal records, and performance artifacts over time that documents developmental growth and mastery in natural early childhood contexts.',
    aliases: ['Work-sampling portfolio'],
    chapterId: 'plt5621-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5621-ch-08-section-03',
    sectionHeading:
      'Rubrics, checklists, portfolios, self assessment, and peer assessment',
    references: [PLT5621_ETS, INTASC],
  }),

  // Chapter 9: Measurement, Scoring, Interpretation, and Communication
  makeEntry({
    id: 'plt5621-gloss-17',
    term: 'Assessment reliability and validity',
    definition:
      'Reliability is the consistency of assessment scores across occasions or raters, while validity is the degree to which evidence supports the intended interpretation and instructional use of scores.',
    aliases: ['Psychometric quality'],
    chapterId: 'plt5621-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5621-ch-09-section-01',
    sectionHeading: 'Reliability, validity, error, and intended use',
    references: [PLT5621_ETS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5621-gloss-18',
    term: 'Analytic scoring rubric',
    definition:
      'A scoring guide that defines explicit performance levels separately for each learning criterion, reducing subjective rater bias and giving students and families clear feedback on growth targets.',
    aliases: ['Criteria-based rubric'],
    chapterId: 'plt5621-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5621-ch-09-section-04',
    sectionHeading: 'Fairness, multiple measures, and communication',
    references: [PLT5621_ETS, INTASC],
  }),

  // Chapter 10: Reflection, Research, and Professional Learning
  makeEntry({
    id: 'plt5621-gloss-19',
    term: 'Reflective practice',
    definition:
      "Continuous, evidence-based examination of one's instructional choices, observational records, and student outcomes to identify bias, refine pedagogy, and set measurable professional learning goals.",
    aliases: ['Reflective inquiry'],
    chapterId: 'plt5621-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5621-ch-10-section-01',
    sectionHeading: 'Reflective inquiry and professional goals',
    references: [PLT5621_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5621-gloss-20',
    term: 'Job-embedded professional learning',
    definition:
      'Ongoing educator growth situated directly in daily classroom practice—such as instructional coaching, lesson study, and peer observation—focused on improving specific early learning outcomes.',
    aliases: ['Coaching and peer observation'],
    chapterId: 'plt5621-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5621-ch-10-section-04',
    sectionHeading: 'Mentoring, peer observation, and job-embedded learning',
    references: [INTASC, WWC_GUIDES],
  }),

  // Chapter 11: Collaboration, Families, Support Personnel, and Community
  makeEntry({
    id: 'plt5621-gloss-21',
    term: 'Reciprocal family partnership',
    definition:
      "Culturally sustaining collaboration that treats caregivers as equal experts on their child's development, using accessible home-language communication to co-construct learning and developmental goals.",
    aliases: ['Two-way family engagement'],
    chapterId: 'plt5621-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5621-ch-11-section-02',
    sectionHeading: 'Reciprocal family partnership and language access',
    references: [INTASC, OCR_EL],
  }),
  makeEntry({
    id: 'plt5621-gloss-22',
    term: 'Multidisciplinary support coordination',
    definition:
      'Structured collaboration among classroom teachers, speech-language pathologists, occupational therapists, and paraeducators to align goals, clarify roles, and maintain consistent daily supports.',
    aliases: ['Team-based student support'],
    chapterId: 'plt5621-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5621-ch-11-section-03',
    sectionHeading: 'Specialists, paraeducators, and coordinated student support',
    references: [PLT5621_ETS, INTASC],
  }),

  // Chapter 12: Ethics, Law, Privacy, Rights, and Student Safety
  makeEntry({
    id: 'plt5621-gloss-23',
    term: 'FERPA educational privacy',
    definition:
      'Federal law protecting the confidentiality of student education records, permitting disclosure without written parental consent only to school officials with a legitimate educational interest.',
    aliases: ['Legitimate educational interest'],
    chapterId: 'plt5621-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5621-ch-12-section-02',
    sectionHeading: 'FERPA, confidentiality, and secure communication',
    references: [PLT5621_ETS, FERPA_FAQ],
  }),
  makeEntry({
    id: 'plt5621-gloss-24',
    term: 'IDEA Child Find and mandated reporting',
    definition:
      'Core statutory duties requiring educators to refer children suspected of having a disability for IDEA evaluation without delay and to report suspected child abuse or neglect under state law.',
    aliases: ['Legal safeguarding duties'],
    chapterId: 'plt5621-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5621-ch-12-section-03',
    sectionHeading: 'Disability rights, reporting, speech, and copyright',
    references: [IDEA_CHILD_FIND, OCR_504],
  }),
];

const plt_k6_5622 = [
  // Chapter 1: Learning Theory, Cognition, and Transfer
  makeEntry({
    id: 'plt5622-gloss-01',
    term: 'Schema activation and metacognition',
    definition:
      "Connecting new K–6 concepts to students' organized prior knowledge (schemas) while explicitly teaching learners to plan, monitor, and evaluate their own comprehension and problem-solving strategies.",
    aliases: ['Prior knowledge activation', 'Metacognitive monitoring'],
    chapterId: 'plt5622-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-01-section-01',
    sectionHeading: 'Knowledge construction, schema, and information processing',
    references: [PLT5622_ETS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5622-gloss-02',
    term: 'Social learning and self-efficacy',
    definition:
      "Bandura's framework explaining how students acquire skills through observational modeling and strengthen self-efficacy—confidence in their ability to master tasks—via mastery experiences and feedback.",
    aliases: ["Bandura's social cognitive theory"],
    chapterId: 'plt5622-ch-01',
    chapterTitle: 'Learning Theory, Cognition, and Transfer',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-01-section-02',
    sectionHeading: 'Foundational theorists as instructional lenses',
    references: [PLT5622_ETS, INTASC],
  }),

  // Chapter 2: Human Development Across Grades K–6
  makeEntry({
    id: 'plt5622-gloss-03',
    term: 'Concrete operational stage',
    definition:
      "Piaget's elementary developmental stage (roughly ages 7–11) characterized by logical reasoning about tangible objects, mastery of conservation, reversibility, seriation, and hierarchical classification.",
    aliases: ["Piaget's concrete operations"],
    chapterId: 'plt5622-ch-02',
    chapterTitle: 'Human Development Across Grades K–6',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-02-section-02',
    sectionHeading: 'K–6 reasoning and representation',
    references: [PLT5622_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5622-gloss-04',
    term: 'Industry versus inferiority',
    definition:
      "Erikson's elementary psychosocial stage in which K–6 students build a sense of academic and social competence through authentic mastery, or develop inferiority when persistent failure lacks support.",
    aliases: ["Erikson's fourth stage"],
    chapterId: 'plt5622-ch-02',
    chapterTitle: 'Human Development Across Grades K–6',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-02-section-03',
    sectionHeading: 'Social-emotional, identity, and moral development',
    references: [PLT5622_ETS, INTASC],
  }),

  // Chapter 3: Learner Differences, Access, Disability, Giftedness, and Language
  makeEntry({
    id: 'plt5622-gloss-05',
    term: 'Universal Design for Learning',
    definition:
      'Proactive curriculum framework that builds flexible pathways for engagement, representation, and action and expression from the start so diverse K–6 learners access rigorous standards without barriers.',
    aliases: ['UDL'],
    chapterId: 'plt5622-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-03-section-04',
    sectionHeading: 'Giftedness, enrichment, differentiation, and universal access',
    references: [PLT5622_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5622-gloss-06',
    term: 'Multi-Tiered System of Supports',
    definition:
      'Data-driven schoolwide framework combining core universal instruction (Tier 1), targeted small-group intervention (Tier 2), and intensive individualized support (Tier 3) without delaying IDEA evaluation.',
    aliases: ['MTSS', 'Tiered academic and behavioral supports'],
    chapterId: 'plt5622-ch-03',
    chapterTitle:
      'Learner Differences, Access, Disability, Giftedness, and Language',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-03-section-02',
    sectionHeading:
      'Disability access, IDEA, Section 504, and classroom responsibility',
    references: [IDEA_EVAL, IDEA_CHILD_FIND],
  }),

  // Chapter 4: Motivation, Learning Environment, and Behavior
  makeEntry({
    id: 'plt5622-gloss-07',
    term: 'Intrinsic versus extrinsic motivation',
    definition:
      'Intrinsic motivation drives engagement through curiosity, autonomy, and mastery satisfaction, whereas extrinsic motivation relies on external rewards or grades that must be carefully faded to sustain learning.',
    aliases: ['Self-determination motivation'],
    chapterId: 'plt5622-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-04-section-01',
    sectionHeading: 'Motivation, value, expectancy, and self-determination',
    references: [PLT5622_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5622-gloss-08',
    term: 'Proactive classroom management and transitions',
    definition:
      'Preventive elementary management establishing clear behavioral expectations, rehearsed transition cues, active supervision, and consistent positive reinforcement to maximize instructional time.',
    aliases: ['Structured classroom transitions'],
    chapterId: 'plt5622-ch-04',
    chapterTitle: 'Motivation, Learning Environment, and Behavior',
    domainId: 'students-as-learners',
    domainLabel: 'Students as Learners',
    sectionId: 'plt5622-ch-04-section-02',
    sectionHeading: 'Routines, expectations, and positive climate',
    references: [PLT5622_ETS, WWC_BEHAVIOR],
  }),

  // Chapter 5: Standards, Objectives, Planning, and Resources
  makeEntry({
    id: 'plt5622-gloss-09',
    term: 'Curriculum scope and sequence',
    definition:
      'Planned breadth of grade-level content standards (scope) and logical developmental progression of skills across units and grades (sequence) that prevent instructional gaps and unnecessary redundancy.',
    aliases: ['Vertical and horizontal alignment'],
    chapterId: 'plt5622-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5622-ch-05-section-01',
    sectionHeading: 'Standards, scope, sequence, and priority learning',
    references: [PLT5622_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5622-gloss-10',
    term: 'Cognitive rigor alignment',
    definition:
      "Matching lesson objectives, learning tasks, and assessments to intentional levels of thinking—from recall to analysis and creation—using Bloom's Revised Taxonomy and Webb's Depth of Knowledge.",
    aliases: ["Bloom's taxonomy", "Webb's Depth of Knowledge (DOK)"],
    chapterId: 'plt5622-ch-05',
    chapterTitle: 'Standards, Objectives, Planning, and Resources',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5622-ch-05-section-02',
    sectionHeading: 'Observable objectives and aligned evidence',
    references: [PLT5622_ETS, INTASC],
  }),

  // Chapter 6: Instructional Methods, Grouping, Scaffolding, and Practice
  makeEntry({
    id: 'plt5622-gloss-11',
    term: 'Gradual release of responsibility',
    definition:
      'Structured instructional sequence shifting cognitive ownership from teacher modeling to guided practice, collaborative application, and independent mastery with responsive checks along the way.',
    aliases: ['GRR', 'I do, we do, you do'],
    chapterId: 'plt5622-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5622-ch-06-section-01',
    sectionHeading: 'Explicit, direct, and modeled instruction',
    references: [PLT5622_ETS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5622-gloss-12',
    term: 'Cooperative learning',
    definition:
      'Small-group instructional method built on positive interdependence, individual accountability, and explicit social roles so every elementary student actively contributes to shared academic goals.',
    aliases: ['Structured collaborative grouping'],
    chapterId: 'plt5622-ch-06',
    chapterTitle:
      'Instructional Methods, Grouping, Scaffolding, and Practice',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5622-ch-06-section-03',
    sectionHeading: 'Cooperative learning and flexible grouping',
    references: [PLT5622_ETS, INTASC],
  }),

  // Chapter 7: Questioning, Communication, Monitoring, and Reflection
  makeEntry({
    id: 'plt5622-gloss-13',
    term: 'Higher-order questioning',
    definition:
      'Posing analytical, evaluative, and synthesis questions paired with wait time and follow-up probes that push K–6 learners beyond literal recall to justify reasoning with text or mathematical evidence.',
    aliases: ['DOK-aligned probing'],
    chapterId: 'plt5622-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5622-ch-07-section-01',
    sectionHeading: 'Question purpose, wait time, and cognitive demand',
    references: [PLT5622_ETS, WWC_ORGANIZING],
  }),
  makeEntry({
    id: 'plt5622-gloss-14',
    term: 'Error analysis and instructional adjustment',
    definition:
      'Examining recurring student misconceptions across work samples or checks for understanding to pinpoint the underlying skill gap and immediately adapt pacing, grouping, or reteaching strategies.',
    aliases: ['Real-time formative pivot'],
    chapterId: 'plt5622-ch-07',
    chapterTitle: 'Questioning, Communication, Monitoring, and Reflection',
    domainId: 'instructional-process',
    domainLabel: 'Instructional Process',
    sectionId: 'plt5622-ch-07-section-04',
    sectionHeading: 'Monitoring, adjustment, teachable moments, and reflection',
    references: [PLT5622_ETS, WWC_DATA],
  }),

  // Chapter 8: Assessment Purpose, Format, Alignment, and Feedback
  makeEntry({
    id: 'plt5622-gloss-15',
    term: 'Diagnostic preassessment',
    definition:
      "Targeted assessment administered before instruction to uncover students' prerequisite knowledge, specific skill gaps, and misconceptions so teachers can group learners and plan responsive lessons.",
    aliases: ['Diagnostic assessment'],
    chapterId: 'plt5622-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5622-ch-08-section-01',
    sectionHeading: 'Diagnostic, formative, and summative purposes',
    references: [PLT5622_ETS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5622-gloss-16',
    term: 'Actionable descriptive feedback',
    definition:
      "Timely, task-specific commentary linking a student's current work to clear success criteria and concrete next steps, shown to accelerate achievement far more than grades or general praise alone.",
    aliases: ['Growth-oriented formative feedback'],
    chapterId: 'plt5622-ch-08',
    chapterTitle: 'Assessment Purpose, Format, Alignment, and Feedback',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5622-ch-08-section-04',
    sectionHeading: 'Alignment, feedback, accessibility, and accommodations',
    references: [INTASC, WWC_DATA],
  }),

  // Chapter 9: Measurement, Scoring, Interpretation, and Communication
  makeEntry({
    id: 'plt5622-gloss-17',
    term: 'Criterion- versus norm-referenced assessment',
    definition:
      "Criterion-referenced tests measure mastery against fixed learning standards, whereas norm-referenced tests rank a student's performance relative to a representative peer comparison group.",
    aliases: ['Standards-based vs. relative ranking'],
    chapterId: 'plt5622-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5622-ch-09-section-02',
    sectionHeading: 'Norm and criterion reference, raw and scaled scores',
    references: [PLT5622_ETS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5622-gloss-18',
    term: 'Item analysis and percentile rank',
    definition:
      'Evaluating item difficulty and distractor patterns alongside percentile ranks—which show the percentage of peers scoring at or below a student—to interpret test quality without misreading grade equivalents.',
    aliases: ['Score distribution analysis'],
    chapterId: 'plt5622-ch-09',
    chapterTitle: 'Measurement, Scoring, Interpretation, and Communication',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'plt5622-ch-09-section-03',
    sectionHeading: 'Percentiles, grade equivalents, center, and variation',
    references: [PLT5622_ETS, WWC_DATA],
  }),

  // Chapter 10: Reflection, Research, and Professional Learning
  makeEntry({
    id: 'plt5622-gloss-19',
    term: 'Classroom action research',
    definition:
      'Systematic, teacher-led cycle of framing a classroom question, collecting local baseline and intervention data, analyzing results, and refining instruction while recognizing generalizability limits.',
    aliases: ['Practitioner inquiry'],
    chapterId: 'plt5622-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5622-ch-10-section-03',
    sectionHeading: 'Action research and local improvement',
    references: [PLT5622_ETS, WWC_DATA],
  }),
  makeEntry({
    id: 'plt5622-gloss-20',
    term: 'Evidence-based practice appraisal',
    definition:
      'Critically evaluating educational studies for sound research design, sample relevance, and causal evidence before adopting an instructional program or intervention in K–6 classrooms.',
    aliases: ['Research validity review'],
    chapterId: 'plt5622-ch-10',
    chapterTitle: 'Reflection, Research, and Professional Learning',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5622-ch-10-section-02',
    sectionHeading: 'Research appraisal and evidence claims',
    references: [INTASC, WWC_GUIDES],
  }),

  // Chapter 11: Collaboration, Families, Support Personnel, and Community
  makeEntry({
    id: 'plt5622-gloss-21',
    term: 'Professional Learning Community',
    definition:
      'Collaborative team of educators who meet regularly to clarify essential standards, examine common formative assessment data, and design shared Tier 1 and Tier 2 instructional responses.',
    aliases: ['PLC', 'Grade-level data team'],
    chapterId: 'plt5622-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5622-ch-11-section-01',
    sectionHeading: 'Collaborative purpose, roles, and action plans',
    references: [PLT5622_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5622-gloss-22',
    term: 'Co-teaching models',
    definition:
      'Shared classroom delivery by general and special educators or specialists—using station, parallel, alternative, or team teaching—to integrate individualized supports within inclusive K–6 instruction.',
    aliases: ['Collaborative instructional delivery'],
    chapterId: 'plt5622-ch-11',
    chapterTitle: 'Collaboration, Families, Support Personnel, and Community',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5622-ch-11-section-03',
    sectionHeading: 'Specialists, paraeducators, and coordinated student support',
    references: [PLT5622_ETS, INTASC],
  }),

  // Chapter 12: Ethics, Law, Privacy, Rights, and Student Safety
  makeEntry({
    id: 'plt5622-gloss-23',
    term: 'Professional ethics and procedural fairness',
    definition:
      'Legal and ethical obligations requiring K–6 educators to maintain impartial professional boundaries, protect students from discrimination or retaliation, and follow fair notice and due-process standards.',
    aliases: ['Educator code of ethics', 'Student due process'],
    chapterId: 'plt5622-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5622-ch-12-section-01',
    sectionHeading: 'Ethics, professional judgment, and fair process',
    references: [PLT5622_ETS, INTASC],
  }),
  makeEntry({
    id: 'plt5622-gloss-24',
    term: 'Fair use and statutory compliance',
    definition:
      'Educator compliance with copyright fair-use limits, IDEA and Section 504 nondiscrimination mandates, FERPA privacy rules, and state mandated-reporting and emergency-safety protocols.',
    aliases: ['Copyright and student rights'],
    chapterId: 'plt5622-ch-12',
    chapterTitle: 'Ethics, Law, Privacy, Rights, and Student Safety',
    domainId: 'professional-development-leadership-community',
    domainLabel: 'Professional Development, Leadership, and Community',
    sectionId: 'plt5622-ch-12-section-03',
    sectionHeading: 'Disability rights, reporting, speech, and copyright',
    references: [OCR_504, ED_EMERGENCY],
  }),
];

module.exports = {
  plt_early_childhood_5621,
  plt_k6_5622,
};
