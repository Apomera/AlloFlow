'use strict';

const SP_PRAXIS_REF =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5403.pdf';
const SP_NASP_MODEL_REF = 'https://www.nasponline.org/x55315.xml';
const SP_NASP_DOMAINS_REF =
  'https://www.nasponline.org/standards-and-certification/nasp-2020-professional-standards-adopted/nasp-2020-domains-of-practice';
const SP_NASP_ETHICS_REF =
  'https://www.nasponline.org/standards-and-certification/professional-ethics';
const SP_IDEA_304_REF = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const SP_IDEA_502_REF = 'https://sites.ed.gov/idea/regs/b/e/300.502';
const WWC_PG12_REF = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/12';

const SC_PRAXIS_REF =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw1272f63e/pdfs/5422.pdf';
const SC_ASCA_PRO_REF =
  'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards';
const SC_ASCA_POS_REF =
  'https://schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-School-Counselor-and-School-Counseling-Program';
const SC_ASCA_ETHICS_REF =
  'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29';
const FERPA_REF = 'https://studentprivacy.ed.gov/ferpa';
const SEC_504_REF =
  'https://www.ed.gov/laws-and-policy/individuals-disabilities/section-504';

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

const SP_DOM_PERMEATING = 'Professional Practices That Permeate Service Delivery';
const SP_DOM_STUDENT = 'Student-Level Services';
const SP_DOM_SYSTEMS = 'Systems-Level Services';
const SP_DOM_FOUNDATIONS = 'Foundations of School Psychological Service Delivery';

const school_psychologist_5403 = [
  // Chapter 1: Problem Solving and Multimethod Data Integration
  makeEntry({
    id: 'sp5403-gloss-01',
    term: 'RIOT multimethod assessment',
    definition:
      'Ecological assessment framework combining Record reviews, Interviews, Observations, and Tests across instructional, curricular, environmental, and learner domains to test hypotheses without relying on one score.',
    aliases: ['RIOT', 'RIOT framework'],
    chapterId: 'sp5403-ch-01',
    chapterTitle: 'Problem Solving and Multimethod Data Integration',
    domainId: 'permeating-practices',
    domainLabel: SP_DOM_PERMEATING,
    sectionId: 'sp5403-ch-01-section-02',
    sectionHeading: 'RIOT and ecological hypothesis testing',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-02',
    term: 'Treatment integrity',
    definition:
      'Degree to which an academic or behavioral intervention is delivered as designed in adherence, dosage, and quality; verified before concluding that a student failed to respond to support.',
    aliases: ['Intervention fidelity'],
    chapterId: 'sp5403-ch-01',
    chapterTitle: 'Problem Solving and Multimethod Data Integration',
    domainId: 'permeating-practices',
    domainLabel: SP_DOM_PERMEATING,
    sectionId: 'sp5403-ch-01-section-03',
    sectionHeading: 'Intervention, monitoring, and fidelity',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),

  // Chapter 2: Measurement and Assessment of Diverse Learners
  makeEntry({
    id: 'sp5403-gloss-03',
    term: 'Standard error of measurement',
    definition:
      'Estimated standard deviation of random measurement error around an observed test score, derived from test SD and reliability to construct confidence intervals that guard against overinterpreting small score differences.',
    aliases: ['SEM'],
    chapterId: 'sp5403-ch-02',
    chapterTitle: 'Measurement and Assessment of Diverse Learners',
    domainId: 'permeating-practices',
    domainLabel: SP_DOM_PERMEATING,
    sectionId: 'sp5403-ch-02-section-01',
    sectionHeading: 'Reliability, error, and score precision',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-04',
    term: 'Construct-irrelevant variance',
    definition:
      'Systematic score distortion introduced by factors unrelated to the intended construct, such as English language demand, sensory barriers, or cultural unfamiliarity, which threatens valid score interpretation.',
    aliases: ['CIV'],
    chapterId: 'sp5403-ch-02',
    chapterTitle: 'Measurement and Assessment of Diverse Learners',
    domainId: 'permeating-practices',
    domainLabel: SP_DOM_PERMEATING,
    sectionId: 'sp5403-ch-02-section-04',
    sectionHeading: 'Language, culture, disability, and access',
    references: [SP_PRAXIS_REF, SP_IDEA_304_REF],
  }),

  // Chapter 3: Consultation and Collaborative Problem Solving
  makeEntry({
    id: 'sp5403-gloss-05',
    term: 'Collaborative consultation',
    definition:
      'Indirect, nonhierarchical problem-solving partnership in which a school psychologist works with teachers or caregivers to define concerns, co-design feasible plans, and build adult capacity to support students.',
    aliases: ['Indirect service delivery'],
    chapterId: 'sp5403-ch-03',
    chapterTitle: 'Consultation and Collaborative Problem Solving',
    domainId: 'permeating-practices',
    domainLabel: SP_DOM_PERMEATING,
    sectionId: 'sp5403-ch-03-section-01',
    sectionHeading: 'A consultation cycle',
    references: [SP_PRAXIS_REF, SP_NASP_DOMAINS_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-06',
    term: 'Treatment acceptability',
    definition:
      'Extent to which teachers, caregivers, and students judge a proposed intervention to be fair, reasonable, culturally congruent, and feasible within daily routines, directly influencing sustained implementation.',
    aliases: ['Social validity'],
    chapterId: 'sp5403-ch-03',
    chapterTitle: 'Consultation and Collaborative Problem Solving',
    domainId: 'permeating-practices',
    domainLabel: SP_DOM_PERMEATING,
    sectionId: 'sp5403-ch-03-section-02',
    sectionHeading: 'Feasibility, acceptability, and implementation',
    references: [SP_PRAXIS_REF, SP_NASP_DOMAINS_REF],
  }),

  // Chapter 4: Academic Interventions and Instructional Supports
  makeEntry({
    id: 'sp5403-gloss-07',
    term: 'Explicit instruction',
    definition:
      'Structured, systematic teaching approach featuring clear skill modeling, scaffolded guided practice with immediate corrective feedback, and independent review matched to error analysis findings.',
    aliases: ['Direct systematic instruction'],
    chapterId: 'sp5403-ch-04',
    chapterTitle: 'Academic Interventions and Instructional Supports',
    domainId: 'student-level-services',
    domainLabel: SP_DOM_STUDENT,
    sectionId: 'sp5403-ch-04-section-01',
    sectionHeading: 'Instruction follows error analysis',
    references: [SP_PRAXIS_REF, WWC_PG12_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-08',
    term: 'Instructional accommodation',
    definition:
      'Change in presentation, response format, setting, or timing that removes disability-related access barriers while keeping grade-level learning expectations and tested constructs fully intact, unlike a modification.',
    aliases: ['Access accommodation'],
    chapterId: 'sp5403-ch-04',
    chapterTitle: 'Academic Interventions and Instructional Supports',
    domainId: 'student-level-services',
    domainLabel: SP_DOM_STUDENT,
    sectionId: 'sp5403-ch-04-section-02',
    sectionHeading: 'Differentiation, accommodation, and modification',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),

  // Chapter 5: Mental and Behavioral Health Services
  makeEntry({
    id: 'sp5403-gloss-09',
    term: 'Protective factor',
    definition:
      'Individual, relational, or school-level asset—such as supportive adult relationships, coping skills, or school connectedness—that buffers adversity and lowers the likelihood of behavioral or mental health distress.',
    aliases: ['Resilience buffer'],
    chapterId: 'sp5403-ch-05',
    chapterTitle: 'Mental and Behavioral Health Services',
    domainId: 'student-level-services',
    domainLabel: SP_DOM_STUDENT,
    sectionId: 'sp5403-ch-05-section-02',
    sectionHeading: 'Risk, protection, and trauma-informed care',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-10',
    term: 'Cognitive behavioral therapy',
    definition:
      'Evidence-based, goal-directed counseling approach that helps students identify maladaptive thoughts, practice cognitive restructuring, and build behavioral coping skills for anxiety, depression, or emotional dysregulation.',
    aliases: ['CBT'],
    chapterId: 'sp5403-ch-05',
    chapterTitle: 'Mental and Behavioral Health Services',
    domainId: 'student-level-services',
    domainLabel: SP_DOM_STUDENT,
    sectionId: 'sp5403-ch-05-section-03',
    sectionHeading: 'Counseling theories as mechanisms',
    references: [SP_PRAXIS_REF, SP_NASP_ETHICS_REF],
  }),

  // Chapter 6: Behavior Analysis, Counseling, and Student Crisis Response
  makeEntry({
    id: 'sp5403-gloss-11',
    term: 'Antecedent-behavior-consequence data',
    definition:
      'Direct observational record documenting triggers preceding an operationally defined target behavior and the events following it, used in functional behavioral assessment to hypothesize the behavior function.',
    aliases: ['ABC data', 'FBA recording'],
    chapterId: 'sp5403-ch-06',
    chapterTitle: 'Behavior Analysis, Counseling, and Student Crisis Response',
    domainId: 'student-level-services',
    domainLabel: SP_DOM_STUDENT,
    sectionId: 'sp5403-ch-06-section-01',
    sectionHeading: 'Operational definition and ABC evidence',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-12',
    term: 'Functionally equivalent replacement behavior',
    definition:
      'Socially appropriate, teachable skill that serves the exact same maintaining function (such as escape or attention) as a challenging behavior while requiring equal or less effort to produce reinforcement.',
    aliases: ['FERB', 'Replacement behavior'],
    chapterId: 'sp5403-ch-06',
    chapterTitle: 'Behavior Analysis, Counseling, and Student Crisis Response',
    domainId: 'student-level-services',
    domainLabel: SP_DOM_STUDENT,
    sectionId: 'sp5403-ch-06-section-02',
    sectionHeading: 'Function-matched intervention',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),

  // Chapter 7: Schoolwide Learning, MTSS, and Systems Change
  makeEntry({
    id: 'sp5403-gloss-13',
    term: 'Multi-Tiered System of Supports',
    definition:
      'Schoolwide prevention framework integrating universal Tier 1 core instruction, targeted Tier 2 supplemental groups, and intensive Tier 3 individualized supports guided by screening and progress-monitoring data.',
    aliases: ['MTSS'],
    chapterId: 'sp5403-ch-07',
    chapterTitle: 'Schoolwide Learning, MTSS, and Systems Change',
    domainId: 'systems-level-services',
    domainLabel: SP_DOM_SYSTEMS,
    sectionId: 'sp5403-ch-07-section-02',
    sectionHeading: 'Integrated MTSS',
    references: [SP_PRAXIS_REF, WWC_PG12_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-14',
    term: 'Universal screening',
    definition:
      'Brief, standardized assessment administered to all students across a grade or school at scheduled intervals to detect academic or social-emotional risk early and evaluate Tier 1 core program effectiveness.',
    aliases: ['Benchmark screening'],
    chapterId: 'sp5403-ch-07',
    chapterTitle: 'Schoolwide Learning, MTSS, and Systems Change',
    domainId: 'systems-level-services',
    domainLabel: SP_DOM_SYSTEMS,
    sectionId: 'sp5403-ch-07-section-03',
    sectionHeading: 'Screening and policy evaluation',
    references: [SP_PRAXIS_REF, WWC_PG12_REF],
  }),

  // Chapter 8: Safe and Supportive Schools and Crisis Systems
  makeEntry({
    id: 'sp5403-gloss-15',
    term: 'Positive Behavioral Interventions and Supports',
    definition:
      'Proactive, multi-tiered framework that teaches explicit behavioral expectations, reinforces prosocial conduct, and uses office discipline referral data to improve school climate instead of relying on punitive exclusion.',
    aliases: ['PBIS', 'SWPBIS'],
    chapterId: 'sp5403-ch-08',
    chapterTitle: 'Safe and Supportive Schools and Crisis Systems',
    domainId: 'systems-level-services',
    domainLabel: SP_DOM_SYSTEMS,
    sectionId: 'sp5403-ch-08-section-01',
    sectionHeading: 'Climate and universal prevention',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-16',
    term: 'Behavioral threat assessment',
    definition:
      'Structured, multidisciplinary inquiry that distinguishes transient expressions of frustration from substantive threats of violence, pairing proportional safety planning with supportive intervention rather than zero-tolerance profiling.',
    aliases: ['Threat assessment'],
    chapterId: 'sp5403-ch-08',
    chapterTitle: 'Safe and Supportive Schools and Crisis Systems',
    domainId: 'systems-level-services',
    domainLabel: SP_DOM_SYSTEMS,
    sectionId: 'sp5403-ch-08-section-03',
    sectionHeading: 'Threat and suicide assessment systems',
    references: [SP_PRAXIS_REF, SP_NASP_ETHICS_REF],
  }),

  // Chapter 9: Family, School, and Community Collaboration
  makeEntry({
    id: 'sp5403-gloss-17',
    term: 'Family-school partnership',
    definition:
      'Reciprocal, strengths-based collaboration in which educators and caregivers share decision-making power, cultural knowledge, and home-school strategies to promote consistent student learning and well-being.',
    aliases: ['Reciprocal partnership'],
    chapterId: 'sp5403-ch-09',
    chapterTitle: 'Family, School, and Community Collaboration',
    domainId: 'systems-level-services',
    domainLabel: SP_DOM_SYSTEMS,
    sectionId: 'sp5403-ch-09-section-01',
    sectionHeading: 'Family systems and reciprocal expertise',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-18',
    term: 'Wraparound services',
    definition:
      'Team-based, family-driven care coordination process that aligns school, mental health, medical, and community supports around a student with complex needs to sustain natural-setting placement and transitions.',
    aliases: ['Wraparound care'],
    chapterId: 'sp5403-ch-09',
    chapterTitle: 'Family, School, and Community Collaboration',
    domainId: 'systems-level-services',
    domainLabel: SP_DOM_SYSTEMS,
    sectionId: 'sp5403-ch-09-section-04',
    sectionHeading: 'Wraparound and transition coordination',
    references: [SP_PRAXIS_REF, SP_NASP_ETHICS_REF],
  }),

  // Chapter 10: Equitable and Culturally Responsive Practice
  makeEntry({
    id: 'sp5403-gloss-19',
    term: 'Cultural humility',
    definition:
      'Lifelong stance of self-reflection and power-imbalance awareness in which practitioners treat families as experts on their own lived context rather than assuming static cultural traits from group membership.',
    aliases: [],
    chapterId: 'sp5403-ch-10',
    chapterTitle: 'Equitable and Culturally Responsive Practice',
    domainId: 'foundations',
    domainLabel: SP_DOM_FOUNDATIONS,
    sectionId: 'sp5403-ch-10-section-01',
    sectionHeading: 'Culture and identity are evidence, not destiny',
    references: [SP_PRAXIS_REF, SP_NASP_MODEL_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-20',
    term: 'Disproportionality',
    definition:
      'Systematic over- or underrepresentation of a demographic group in special education eligibility, restrictive placements, or disciplinary exclusions relative to its enrollment share, signaling systemic equity review.',
    aliases: ['Disproportionate representation'],
    chapterId: 'sp5403-ch-10',
    chapterTitle: 'Equitable and Culturally Responsive Practice',
    domainId: 'foundations',
    domainLabel: SP_DOM_FOUNDATIONS,
    sectionId: 'sp5403-ch-10-section-04',
    sectionHeading: 'Disproportionality and equitable systems',
    references: [SP_PRAXIS_REF, SP_IDEA_304_REF],
  }),

  // Chapter 11: Research, Evidence-Based Practice, and Program Evaluation
  makeEntry({
    id: 'sp5403-gloss-21',
    term: 'Single-case experimental design',
    definition:
      'Rigorous repeated-measures research method—such as multiple-baseline or reversal designs—in which a student serves as their own control to evaluate functional relations between an intervention and behavioral change.',
    aliases: ['SCD', 'Single-subject design'],
    chapterId: 'sp5403-ch-11',
    chapterTitle: 'Research, Evidence-Based Practice, and Program Evaluation',
    domainId: 'foundations',
    domainLabel: SP_DOM_FOUNDATIONS,
    sectionId: 'sp5403-ch-11-section-01',
    sectionHeading: 'Design answers a claim',
    references: [SP_PRAXIS_REF, WWC_PG12_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-22',
    term: 'Effect size',
    definition:
      'Quantitative index expressing the magnitude and practical significance of an intervention effect or group difference independently of sample size, complementing p-values and confidence intervals in evidence review.',
    aliases: ['Standardized mean difference'],
    chapterId: 'sp5403-ch-11',
    chapterTitle: 'Research, Evidence-Based Practice, and Program Evaluation',
    domainId: 'foundations',
    domainLabel: SP_DOM_FOUNDATIONS,
    sectionId: 'sp5403-ch-11-section-02',
    sectionHeading: 'Validity threats and statistical interpretation',
    references: [SP_PRAXIS_REF, WWC_PG12_REF],
  }),

  // Chapter 12: Legal, Ethical, and Professional Practice
  makeEntry({
    id: 'sp5403-gloss-23',
    term: 'Informed consent',
    definition:
      'Voluntary, written permission obtained from a parent or legal guardian in their native language after disclosing assessment or service purpose, procedures, confidentiality limits, risks, and right to revoke.',
    aliases: ['Parent consent'],
    chapterId: 'sp5403-ch-12',
    chapterTitle: 'Legal, Ethical, and Professional Practice',
    domainId: 'foundations',
    domainLabel: SP_DOM_FOUNDATIONS,
    sectionId: 'sp5403-ch-12-section-01',
    sectionHeading: 'Consent, assent, privacy, and records',
    references: [SP_PRAXIS_REF, SP_NASP_ETHICS_REF],
  }),
  makeEntry({
    id: 'sp5403-gloss-24',
    term: 'Independent educational evaluation',
    definition:
      'Assessment conducted by a qualified examiner not employed by the school district; under IDEA, parents who disagree with a district evaluation may request an IEE at public expense unless the district proves its own appropriate.',
    aliases: ['IEE'],
    chapterId: 'sp5403-ch-12',
    chapterTitle: 'Legal, Ethical, and Professional Practice',
    domainId: 'foundations',
    domainLabel: SP_DOM_FOUNDATIONS,
    sectionId: 'sp5403-ch-12-section-02',
    sectionHeading: 'IDEA and comprehensive evaluation',
    references: [SP_IDEA_502_REF, SP_IDEA_304_REF],
  }),
];

const school_counselor_5422 = [
  // Chapter 1: School Counselor Role and Program Foundations
  makeEntry({
    id: 'sc5422-gloss-01',
    term: 'Comprehensive school counseling program',
    definition:
      'Data-informed, developmental K-12 program structured around ASCA Define, Manage, Deliver, and Assess components to promote academic, career, and social-emotional growth for every student.',
    aliases: ['ASCA National Model', 'CSCP'],
    chapterId: 'sc5422-ch-01',
    chapterTitle: 'School Counselor Role and Program Foundations',
    domainId: 'define',
    domainLabel: 'Define',
    sectionId: 'sc5422-ch-01-section-01',
    sectionHeading: 'A comprehensive program for every student',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-02',
    term: 'Appropriate school counseling duties',
    definition:
      'Direct and indirect student services aligned with ASCA standards—targeting at least 80 percent of counselor time—distinct from noncounseling tasks such as test coordination, master scheduling, or disciplinary enforcement.',
    aliases: ['Use-of-time standard', 'Noncounseling duties'],
    chapterId: 'sc5422-ch-01',
    chapterTitle: 'School Counselor Role and Program Foundations',
    domainId: 'define',
    domainLabel: 'Define',
    sectionId: 'sc5422-ch-01-section-03',
    sectionHeading: 'Appropriate duties and role advocacy',
    references: [SC_PRAXIS_REF, SC_ASCA_POS_REF],
  }),

  // Chapter 2: Human Development, Learning, and Family Systems
  makeEntry({
    id: 'sc5422-gloss-03',
    term: 'Psychosocial crisis',
    definition:
      'Developmental turning point in Erikson’s lifespan theory—such as industry versus inferiority in elementary school or identity versus role confusion in adolescence—whose resolution shapes competence and self-concept.',
    aliases: ['Eriksonian stage'],
    chapterId: 'sc5422-ch-02',
    chapterTitle: 'Human Development, Learning, and Family Systems',
    domainId: 'define',
    domainLabel: 'Define',
    sectionId: 'sc5422-ch-02-section-01',
    sectionHeading: 'Psychosocial development',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-04',
    term: 'Zone of proximal development',
    definition:
      'Vygotskian gap between tasks a learner can complete independently and those achievable with adult or peer scaffolding, guiding counselors and teachers to calibrate instructional and skill-building supports.',
    aliases: ['ZPD'],
    chapterId: 'sc5422-ch-02',
    chapterTitle: 'Human Development, Learning, and Family Systems',
    domainId: 'define',
    domainLabel: 'Define',
    sectionId: 'sc5422-ch-02-section-02',
    sectionHeading: 'Cognitive development and scaffolding',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),

  // Chapter 3: Ethics, Law, Equity, Safety, and Boundaries
  makeEntry({
    id: 'sc5422-gloss-05',
    term: 'Family Educational Rights and Privacy Act',
    definition:
      'Federal statute granting parents and eligible students rights to inspect, amend, and control disclosure of education records, while exempting sole-possession counseling notes kept strictly private as memory aids.',
    aliases: ['FERPA'],
    chapterId: 'sc5422-ch-03',
    chapterTitle: 'Ethics, Law, Equity, Safety, and Boundaries',
    domainId: 'define',
    domainLabel: 'Define',
    sectionId: 'sc5422-ch-03-section-01',
    sectionHeading: 'Privacy, confidentiality, and education records',
    references: [SC_PRAXIS_REF, FERPA_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-06',
    term: 'Mandated reporting',
    definition:
      'Legal and ethical duty requiring school counselors to promptly report suspected child abuse or neglect to designated protective authorities without first conducting an independent investigation or waiting for proof.',
    aliases: ['Duty to report'],
    chapterId: 'sc5422-ch-03',
    chapterTitle: 'Ethics, Law, Equity, Safety, and Boundaries',
    domainId: 'define',
    domainLabel: 'Define',
    sectionId: 'sc5422-ch-03-section-02',
    sectionHeading: 'Safety, abuse, and urgent protective action',
    references: [SC_PRAXIS_REF, SC_ASCA_ETHICS_REF],
  }),

  // Chapter 4: Individual Counseling, Academic Planning, and Career Development
  makeEntry({
    id: 'sc5422-gloss-07',
    term: 'Solution-focused brief counseling',
    definition:
      'Short-term, strengths-oriented counseling model well suited to school settings that uses scaling questions, exception finding, and the miracle question to help students build concrete, observable next steps.',
    aliases: ['SFBC'],
    chapterId: 'sc5422-ch-04',
    chapterTitle: 'Individual Counseling, Academic Planning, and Career Development',
    domainId: 'deliver',
    domainLabel: 'Deliver',
    sectionId: 'sc5422-ch-04-section-02',
    sectionHeading: 'Brief theories into action',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-08',
    term: 'Career development planning',
    definition:
      'Developmental K-12 progression from early career awareness and exploration to postsecondary preparation using interest inventories, academic advising, and equitable exposure to college and workforce pathways.',
    aliases: ['Individual student planning'],
    chapterId: 'sc5422-ch-04',
    chapterTitle: 'Individual Counseling, Academic Planning, and Career Development',
    domainId: 'deliver',
    domainLabel: 'Deliver',
    sectionId: 'sc5422-ch-04-section-04',
    sectionHeading: 'Academic and career development across grades',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),

  // Chapter 5: Group, Classroom, Crisis, and Prevention Services
  makeEntry({
    id: 'sc5422-gloss-09',
    term: 'Pre-group screening',
    definition:
      'Structured individual intake conducted before launching a small counseling group to evaluate student readiness, align shared goals, review peer confidentiality limits, and obtain caregiver consent as required.',
    aliases: ['Group screening'],
    chapterId: 'sc5422-ch-05',
    chapterTitle: 'Group, Classroom, Crisis, and Prevention Services',
    domainId: 'deliver',
    domainLabel: 'Deliver',
    sectionId: 'sc5422-ch-05-section-01',
    sectionHeading: 'Group formation and development',
    references: [SC_PRAXIS_REF, SC_ASCA_ETHICS_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-10',
    term: 'Suicide postvention',
    definition:
      'Coordinated, trauma-informed crisis response following a student or staff suicide death that supports grief processing, monitors high-risk peers, and follows safe messaging practices to reduce contagion risk.',
    aliases: ['Postvention'],
    chapterId: 'sc5422-ch-05',
    chapterTitle: 'Group, Classroom, Crisis, and Prevention Services',
    domainId: 'deliver',
    domainLabel: 'Deliver',
    sectionId: 'sc5422-ch-05-section-03',
    sectionHeading: 'Crisis and trauma-informed response',
    references: [SC_PRAXIS_REF, SC_ASCA_ETHICS_REF],
  }),

  // Chapter 6: Consultation, Collaboration, MTSS, Plans, and Referrals
  makeEntry({
    id: 'sc5422-gloss-11',
    term: 'Qualified interpreter',
    definition:
      'Trained bilingual professional bound by confidentiality who facilitates accurate school-family communication, preventing the ethical and accuracy harms of relying on students or untrained relatives to translate.',
    aliases: ['Language access services'],
    chapterId: 'sc5422-ch-06',
    chapterTitle: 'Consultation, Collaboration, MTSS, Plans, and Referrals',
    domainId: 'deliver',
    domainLabel: 'Deliver',
    sectionId: 'sc5422-ch-06-section-02',
    sectionHeading: 'Culturally responsive family and team partnership',
    references: [SC_PRAXIS_REF, SC_ASCA_ETHICS_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-12',
    term: 'Section 504 plan',
    definition:
      'Written accommodation plan under the Rehabilitation Act ensuring equal educational access for students whose physical or mental impairment substantially limits a major life activity, without requiring specialized instruction.',
    aliases: ['504 accommodation plan'],
    chapterId: 'sc5422-ch-06',
    chapterTitle: 'Consultation, Collaboration, MTSS, Plans, and Referrals',
    domainId: 'deliver',
    domainLabel: 'Deliver',
    sectionId: 'sc5422-ch-06-section-04',
    sectionHeading: 'IEP, Section 504, and community coordination',
    references: [SC_PRAXIS_REF, SEC_504_REF],
  }),

  // Chapter 7: Program Vision, Mission, Alignment, and Partnership
  makeEntry({
    id: 'sc5422-gloss-13',
    term: 'Annual administrative conference',
    definition:
      'Formal yearly meeting between a school counselor and supervising principal to establish shared agreement on program priorities, caseload distribution, use-of-time targets, and professional development plans.',
    aliases: ['AAC'],
    chapterId: 'sc5422-ch-07',
    chapterTitle: 'Program Vision, Mission, Alignment, and Partnership',
    domainId: 'manage',
    domainLabel: 'Manage',
    sectionId: 'sc5422-ch-07-section-03',
    sectionHeading: 'Administrative partnership and use of time',
    references: [SC_PRAXIS_REF, SC_ASCA_POS_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-14',
    term: 'Advisory council',
    definition:
      'Representative group of parents, students, educators, and community partners that meets at least twice yearly to review aggregate counseling program goals and results and offer feedback without accessing private student data.',
    aliases: ['School counseling advisory council'],
    chapterId: 'sc5422-ch-07',
    chapterTitle: 'Program Vision, Mission, Alignment, and Partnership',
    domainId: 'manage',
    domainLabel: 'Manage',
    sectionId: 'sc5422-ch-07-section-04',
    sectionHeading: 'Advisory input with professional boundaries',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),

  // Chapter 8: Outcome Goals, Data Types, Action Plans, and Measurement
  makeEntry({
    id: 'sc5422-gloss-15',
    term: 'Learning data',
    definition:
      'Pre- and post-intervention evidence measuring shifts in student attitudes, knowledge, and skills aligned to ASCA Mindsets & Behaviors standards, bridging participation counts and broader school outcome data.',
    aliases: ['Mindsets & Behaviors data', 'Perception data'],
    chapterId: 'sc5422-ch-08',
    chapterTitle: 'Outcome Goals, Data Types, Action Plans, and Measurement',
    domainId: 'manage',
    domainLabel: 'Manage',
    sectionId: 'sc5422-ch-08-section-01',
    sectionHeading: 'Three kinds of program evidence',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-16',
    term: 'Closing-the-gap action plan',
    definition:
      'Targeted counseling intervention plan anchored in disaggregated baseline data that specifies priority student groups, aligned Mindsets & Behaviors standards, delivery strategies, and measurable annual outcome goals.',
    aliases: ['Annual outcome goal'],
    chapterId: 'sc5422-ch-08',
    chapterTitle: 'Outcome Goals, Data Types, Action Plans, and Measurement',
    domainId: 'manage',
    domainLabel: 'Manage',
    sectionId: 'sc5422-ch-08-section-02',
    sectionHeading: 'Annual student outcome goals',
    references: [SC_PRAXIS_REF, WWC_PG12_REF],
  }),

  // Chapter 9: Program Operations, Technology, Resources, and Communication
  makeEntry({
    id: 'sc5422-gloss-17',
    term: 'Caseload triage',
    definition:
      'Systematic prioritization workflow that sequences acute safety crises, urgent tier-three needs, and scheduled preventive programming so high-caseload counselors maintain ethical responsiveness and continuity of care.',
    aliases: ['Needs prioritization'],
    chapterId: 'sc5422-ch-09',
    chapterTitle: 'Program Operations, Technology, Resources, and Communication',
    domainId: 'manage',
    domainLabel: 'Manage',
    sectionId: 'sc5422-ch-09-section-01',
    sectionHeading: 'Triage, continuity, and caseload management',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-18',
    term: 'Data minimization',
    definition:
      'Privacy governance principle limiting digital collection, storage, and role-based sharing of student counseling records to the minimum information necessary for legitimate educational support, reducing reidentification risk.',
    aliases: ['Least-privilege access'],
    chapterId: 'sc5422-ch-09',
    chapterTitle: 'Program Operations, Technology, Resources, and Communication',
    domainId: 'manage',
    domainLabel: 'Manage',
    sectionId: 'sc5422-ch-09-section-03',
    sectionHeading: 'Technology and data governance',
    references: [SC_PRAXIS_REF, SC_ASCA_ETHICS_REF],
  }),

  // Chapter 10: Program Assessment and Implementation Quality
  makeEntry({
    id: 'sc5422-gloss-19',
    term: 'School counseling program assessment',
    definition:
      'Structured annual self-audit evaluating how fully a school’s counseling program implements ASCA National Model components, identifying systemic gaps to guide next-year priorities and resource requests.',
    aliases: ['Program audit'],
    chapterId: 'sc5422-ch-10',
    chapterTitle: 'Program Assessment and Implementation Quality',
    domainId: 'assess',
    domainLabel: 'Assess',
    sectionId: 'sc5422-ch-10-section-01',
    sectionHeading: 'Program assessment asks what is in place',
    references: [SC_PRAXIS_REF, SC_ASCA_POS_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-20',
    term: 'Implementation fidelity',
    definition:
      'Alignment between a planned counseling lesson or small-group curriculum and its actual delivery across dosage, adherence, and adaptations, clarifying whether weak results stem from program design or execution gaps.',
    aliases: ['Dosage and adherence'],
    chapterId: 'sc5422-ch-10',
    chapterTitle: 'Program Assessment and Implementation Quality',
    domainId: 'assess',
    domainLabel: 'Assess',
    sectionId: 'sc5422-ch-10-section-04',
    sectionHeading: 'Implementation evidence explains results',
    references: [SC_PRAXIS_REF, SC_ASCA_PRO_REF],
  }),

  // Chapter 11: Results Data, Interpretation, and Reporting
  makeEntry({
    id: 'sc5422-gloss-21',
    term: 'Disaggregated data',
    definition:
      'Schoolwide attendance, achievement, or discipline metrics broken down by student subgroups—such as race, language status, or disability—using accurate denominators to expose inequities masked by overall averages.',
    aliases: ['Subgroup disaggregation'],
    chapterId: 'sc5422-ch-11',
    chapterTitle: 'Results Data, Interpretation, and Reporting',
    domainId: 'assess',
    domainLabel: 'Assess',
    sectionId: 'sc5422-ch-11-section-01',
    sectionHeading: 'Disaggregation reveals who benefits',
    references: [SC_PRAXIS_REF, WWC_PG12_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-22',
    term: 'Selection bias',
    definition:
      'Evaluation distortion occurring when students who opt into or are referred to a counseling intervention differ systematically at baseline from nonparticipants, preventing simple before-after gains from proving causation.',
    aliases: ['Self-selection bias'],
    chapterId: 'sc5422-ch-11',
    chapterTitle: 'Results Data, Interpretation, and Reporting',
    domainId: 'assess',
    domainLabel: 'Assess',
    sectionId: 'sc5422-ch-11-section-03',
    sectionHeading: 'Association is not automatically causation',
    references: [SC_PRAXIS_REF, WWC_PG12_REF],
  }),

  // Chapter 12: Continuous Improvement and Data-Based Advocacy
  makeEntry({
    id: 'sc5422-gloss-23',
    term: 'Continuous program improvement',
    definition:
      'Iterative Assess-to-Manage cycle in which counselors apply explicit decision rules to results reports, retain core effective components, and test targeted adaptations before scaling interventions schoolwide.',
    aliases: ['Iterative improvement cycle'],
    chapterId: 'sc5422-ch-12',
    chapterTitle: 'Continuous Improvement and Data-Based Advocacy',
    domainId: 'assess',
    domainLabel: 'Assess',
    sectionId: 'sc5422-ch-12-section-01',
    sectionHeading: 'Improvement is a disciplined learning cycle',
    references: [SC_PRAXIS_REF, SC_ASCA_POS_REF],
  }),
  makeEntry({
    id: 'sc5422-gloss-24',
    term: 'Data-based advocacy',
    definition:
      'Strategic use of disaggregated student outcomes, participation evidence, and capacity analyses to propose feasible policy or resource changes that dismantle systemic barriers to equitable student opportunity.',
    aliases: ['Systemic advocacy'],
    chapterId: 'sc5422-ch-12',
    chapterTitle: 'Continuous Improvement and Data-Based Advocacy',
    domainId: 'assess',
    domainLabel: 'Assess',
    sectionId: 'sc5422-ch-12-section-03',
    sectionHeading: 'Data-based advocacy connects need to a feasible ask',
    references: [SC_PRAXIS_REF, WWC_PG12_REF],
  }),
];

module.exports = {
  school_psychologist_5403,
  school_counselor_5422,
};
