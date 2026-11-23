'use strict';

// Verified catalog references for Educational Leadership (5412)
const LEAD_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf';
const LEAD_PSEL =
  'https://www.npbea.org/wp-content/uploads/2017/06/Professional-Standards-for-Educational-Leaders_2015.pdf';
const LEAD_IES_CI =
  'https://ies.ed.gov/use-work/resource-library/resource/other-resource/continuous-improvement-education-toolkit-schools-and-districts';
const LEAD_IDEA_EVAL = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const LEAD_CIVIL_RIGHTS =
  'https://www.ed.gov/laws-and-policy/civil-rights-laws';
const LEAD_CHILD_FIND =
  'https://sites.ed.gov/idea/idea-files/rts-qa-child-find-part-b-08-24-2021/';
const LEAD_EMERGENCY =
  'https://www.ed.gov/teaching-and-administration/safe-learning-environments/school-safety-and-security/emergency-planning';
const LEAD_FERPA =
  'https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa';
const LEAD_CISA =
  'https://www.cisa.gov/resources-tools/resources/report-protecting-our-future';
const LEAD_FAMILY_ENG =
  'https://www.ed.gov/teaching-and-administration/lead-and-manage-my-school/state-support-network/ssn-resources/strategies-for-equitable-family-engagement';

// Verified catalog references for School Librarian (5312)
const LIB_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5312.pdf';
const LIB_ETS_PAGE =
  'https://praxis.ets.org/test/school-librarian-5312.html';
const LIB_AASL = 'https://standards.aasl.org/';
const LIB_ALA_BILL = 'https://www.ala.org/advocacy/intfreedom/librarybill';
const LIB_COPYRIGHT = 'https://www.copyright.gov/circs/circ21.pdf';

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

const educational_leadership_5412 = [
  // Chapter 1: Mission, Vision, Goals, and Core Values
  makeEntry({
    id: 'edlead5412-gloss-01',
    term: 'Professional Standards for Educational Leaders',
    definition:
      'National standards framework (aligned with NELP preparation standards) guiding school leaders to collaboratively build a shared mission, vision, and core values centered on equitable student learning and well-being.',
    aliases: ['PSEL', 'NELP standards'],
    chapterId: 'lead5412-ch-01',
    chapterTitle: 'Mission, Vision, Goals, and Core Values',
    domainId: 'strategic-leadership',
    domainLabel: 'Strategic Leadership',
    sectionId: 'lead5412-ch-01-section-01',
    sectionHeading: 'Mission, vision, and values as distinct tools',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-02',
    term: 'Disaggregated needs assessment',
    definition:
      'Systematic analysis of achievement, attendance, and climate data broken down by student subgroups to uncover hidden opportunity gaps and establish evidence-based priorities for school improvement planning.',
    aliases: ['Data disaggregation'],
    chapterId: 'lead5412-ch-01',
    chapterTitle: 'Mission, Vision, Goals, and Core Values',
    domainId: 'strategic-leadership',
    domainLabel: 'Strategic Leadership',
    sectionId: 'lead5412-ch-01-section-02',
    sectionHeading: 'Needs assessment and strategic priority setting',
    references: [LEAD_PRAXIS, LEAD_IES_CI],
  }),

  // Chapter 2: Continuous Improvement, Change, and Strategic Alignment
  makeEntry({
    id: 'edlead5412-gloss-03',
    term: 'Root-cause analysis',
    definition:
      'Structured causal inquiry using tools such as fishbone diagrams, process maps, and five-whys protocols to pinpoint underlying systemic drivers of performance gaps rather than treating surface symptoms.',
    aliases: ['Causal inquiry'],
    chapterId: 'lead5412-ch-02',
    chapterTitle: 'Continuous Improvement, Change, and Strategic Alignment',
    domainId: 'strategic-leadership',
    domainLabel: 'Strategic Leadership',
    sectionId: 'lead5412-ch-02-section-01',
    sectionHeading: 'Problem definition and causal inquiry',
    references: [LEAD_PRAXIS, LEAD_IES_CI],
  }),
  makeEntry({
    id: 'edlead5412-gloss-04',
    term: 'Plan-Do-Study-Act cycle',
    definition:
      'Iterative continuous improvement method in which school teams test a bounded change, track leading indicators, evaluate outcomes against predictions, and decide whether to adapt, adopt, or abandon the strategy.',
    aliases: ['PDSA cycle'],
    chapterId: 'lead5412-ch-02',
    chapterTitle: 'Continuous Improvement, Change, and Strategic Alignment',
    domainId: 'strategic-leadership',
    domainLabel: 'Strategic Leadership',
    sectionId: 'lead5412-ch-02-section-02',
    sectionHeading: 'Plan-Do-Study-Act and bounded tests',
    references: [LEAD_PRAXIS, LEAD_IES_CI],
  }),

  // Chapter 3: Professional Capacity, Feedback, and Adult Learning
  makeEntry({
    id: 'edlead5412-gloss-05',
    term: 'Instructional walkthrough and coaching cycle',
    definition:
      'Job-embedded instructional leadership routine pairing brief, focused classroom observations with timely, evidence-based feedback, collaborative reflection, and targeted follow-up to elevate daily teaching quality.',
    aliases: ['Instructional coaching'],
    chapterId: 'lead5412-ch-03',
    chapterTitle: 'Professional Capacity, Feedback, and Adult Learning',
    domainId: 'instructional-leadership',
    domainLabel: 'Instructional Leadership',
    sectionId: 'lead5412-ch-03-section-02',
    sectionHeading: 'Job-embedded professional learning',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-06',
    term: 'Distributed leadership',
    definition:
      'Leadership approach that shares instructional decision-making and improvement responsibilities across principals, teacher leaders, coaches, and collaborative teams to build sustainable collective efficacy.',
    aliases: ['Shared leadership'],
    chapterId: 'lead5412-ch-03',
    chapterTitle: 'Professional Capacity, Feedback, and Adult Learning',
    domainId: 'instructional-leadership',
    domainLabel: 'Instructional Leadership',
    sectionId: 'lead5412-ch-03-section-04',
    sectionHeading: 'Collective capacity and distributed leadership',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),

  // Chapter 4: Curriculum, Instruction, Assessment, and Accountability
  makeEntry({
    id: 'edlead5412-gloss-07',
    term: 'Vertical and horizontal curriculum alignment',
    definition:
      'Coordinated curriculum design ensuring rigorous standards, enacted instruction, and assessments are consistent across same-grade classrooms (horizontal) and build coherently across grade levels (vertical).',
    aliases: ['Curriculum coherence'],
    chapterId: 'lead5412-ch-04',
    chapterTitle: 'Curriculum, Instruction, Assessment, and Accountability',
    domainId: 'instructional-leadership',
    domainLabel: 'Instructional Leadership',
    sectionId: 'lead5412-ch-04-section-01',
    sectionHeading: 'Curriculum coherence and vertical-horizontal alignment',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-08',
    term: 'Multi-Tiered System of Supports',
    definition:
      'Schoolwide prevention framework integrating universal Tier 1 core instruction, targeted Tier 2 group interventions, and intensive Tier 3 supports guided by universal screening and ongoing progress monitoring.',
    aliases: ['MTSS'],
    chapterId: 'lead5412-ch-04',
    chapterTitle: 'Curriculum, Instruction, Assessment, and Accountability',
    domainId: 'instructional-leadership',
    domainLabel: 'Instructional Leadership',
    sectionId: 'lead5412-ch-04-section-04',
    sectionHeading: 'Program evaluation and tiered support systems',
    references: [LEAD_PRAXIS, LEAD_IDEA_EVAL],
  }),

  // Chapter 5: Inclusive Community, Belonging, and Student Support
  makeEntry({
    id: 'edlead5412-gloss-09',
    term: 'Discipline disproportionality audit',
    definition:
      'Equity audit examining office referrals, suspensions, and exclusionary rates disaggregated by race, disability, and language status to identify biased decision points and shift toward restorative behavior systems.',
    aliases: ['Equity audit'],
    chapterId: 'lead5412-ch-05',
    chapterTitle: 'Inclusive Community, Belonging, and Student Support',
    domainId: 'climate-cultural-leadership',
    domainLabel: 'Climate and Cultural Leadership',
    sectionId: 'lead5412-ch-05-section-02',
    sectionHeading: 'Equitable discipline and behavior systems',
    references: [LEAD_PRAXIS, LEAD_CIVIL_RIGHTS],
  }),
  makeEntry({
    id: 'edlead5412-gloss-10',
    term: 'Culturally responsive school leadership',
    definition:
      'Leadership practice that affirms students\' cultural identities, elevates student voice, challenges deficit assumptions, and redesigns school norms and instruction so historically marginalized learners belong and thrive.',
    aliases: ['CRSL'],
    chapterId: 'lead5412-ch-05',
    chapterTitle: 'Inclusive Community, Belonging, and Student Support',
    domainId: 'climate-cultural-leadership',
    domainLabel: 'Climate and Cultural Leadership',
    sectionId: 'lead5412-ch-05-section-03',
    sectionHeading: 'Student voice, identity, and participation',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),

  // Chapter 6: Professional Culture, Collaboration, Conflict, and Well-Being
  makeEntry({
    id: 'edlead5412-gloss-11',
    term: 'Professional Learning Community',
    definition:
      'Structured educator team operating under shared norms and collective responsibility to analyze common formative assessment evidence, refine instructional strategies, and coordinate timely student interventions.',
    aliases: ['PLC'],
    chapterId: 'lead5412-ch-06',
    chapterTitle: 'Professional Culture, Collaboration, Conflict, and Well-Being',
    domainId: 'climate-cultural-leadership',
    domainLabel: 'Climate and Cultural Leadership',
    sectionId: 'lead5412-ch-06-section-01',
    sectionHeading: 'Collective responsibility and collaboration norms',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-12',
    term: 'Psychological safety',
    definition:
      'Shared professional climate in which staff can candidly surface instructional struggles, question ineffective routines, and engage in productive peer critique without fear of humiliation or retaliation.',
    aliases: ['Trust-based candor'],
    chapterId: 'lead5412-ch-06',
    chapterTitle: 'Professional Culture, Collaboration, Conflict, and Well-Being',
    domainId: 'climate-cultural-leadership',
    domainLabel: 'Climate and Cultural Leadership',
    sectionId: 'lead5412-ch-06-section-02',
    sectionHeading: 'Psychological safety and accountable learning',
    references: [LEAD_PRAXIS, LEAD_IES_CI],
  }),

  // Chapter 7: Ethics, Professional Norms, Equity, and Decision Making
  makeEntry({
    id: 'edlead5412-gloss-13',
    term: 'Educational equity',
    definition:
      'Ethical leadership principle directing differentiated funding, staffing, and instructional resources according to student need rather than uniform equality so every learner has fair access to high outcomes.',
    aliases: ['Equitable resource allocation'],
    chapterId: 'lead5412-ch-07',
    chapterTitle: 'Ethics, Professional Norms, Equity, and Decision Making',
    domainId: 'ethical-leadership',
    domainLabel: 'Ethical Leadership',
    sectionId: 'lead5412-ch-07-section-02',
    sectionHeading: 'Equity, allocation, and system impact',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-14',
    term: 'Conflict of interest and recusal',
    definition:
      'Ethical governance safeguard requiring school leaders to disclose personal, financial, or familial interests in hiring, procurement, or disciplinary matters and step aside from decisions to protect impartiality.',
    aliases: ['Ethical recusal'],
    chapterId: 'lead5412-ch-07',
    chapterTitle: 'Ethics, Professional Norms, Equity, and Decision Making',
    domainId: 'ethical-leadership',
    domainLabel: 'Ethical Leadership',
    sectionId: 'lead5412-ch-07-section-03',
    sectionHeading: 'Conflicts of interest and ethical authority',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),

  // Chapter 8: Law, Rights, Due Process, Privacy, and Protected Access
  makeEntry({
    id: 'edlead5412-gloss-15',
    term: 'FERPA legitimate educational interest',
    definition:
      'Federal privacy standard permitting designated school officials to inspect student education records without written parental consent only when strictly necessary to carry out defined professional duties.',
    aliases: ['FERPA privacy standard'],
    chapterId: 'lead5412-ch-08',
    chapterTitle: 'Law, Rights, Due Process, Privacy, and Protected Access',
    domainId: 'ethical-leadership',
    domainLabel: 'Ethical Leadership',
    sectionId: 'lead5412-ch-08-section-01',
    sectionHeading: 'FERPA, legitimate educational interest, and data minimization',
    references: [LEAD_PRAXIS, LEAD_FERPA],
  }),
  makeEntry({
    id: 'edlead5412-gloss-16',
    term: 'Student due process and civil rights protections',
    definition:
      'Constitutional and statutory mandates spanning Goss v. Lopez suspension notice, Tinker student-speech limits, IDEA and Section 504 disability access, and Title IX sex-based nondiscrimination and anti-retaliation.',
    aliases: ['Education law rights', 'IDEA, Section 504, and Title IX'],
    chapterId: 'lead5412-ch-08',
    chapterTitle: 'Law, Rights, Due Process, Privacy, and Protected Access',
    domainId: 'ethical-leadership',
    domainLabel: 'Ethical Leadership',
    sectionId: 'lead5412-ch-08-section-03',
    sectionHeading: 'Civil rights, reporting, and retaliation',
    references: [LEAD_PRAXIS, LEAD_CIVIL_RIGHTS],
  }),

  // Chapter 9: Operations, Budget, Resources, Facilities, and Technology
  makeEntry({
    id: 'edlead5412-gloss-17',
    term: 'Categorical funds and supplement-not-supplant',
    definition:
      'Fiscal compliance rule requiring restricted federal or state grants such as Title I to add supplemental instructional services for eligible students rather than replacing baseline local or state operating funds.',
    aliases: ['Title I compliance', 'Strategic budgeting'],
    chapterId: 'lead5412-ch-09',
    chapterTitle: 'Operations, Budget, Resources, Facilities, and Technology',
    domainId: 'organizational-leadership',
    domainLabel: 'Organizational Leadership',
    sectionId: 'lead5412-ch-09-section-01',
    sectionHeading: 'Strategic budgeting and resource allocation',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-18',
    term: 'Master schedule and facility stewardship',
    definition:
      'Operational alignment of instructional blocks, educator collaboration time, accessible spaces, and preventive building safety maintenance so daily school logistics directly support equity and learning goals.',
    aliases: ['Operational resource alignment'],
    chapterId: 'lead5412-ch-09',
    chapterTitle: 'Operations, Budget, Resources, Facilities, and Technology',
    domainId: 'organizational-leadership',
    domainLabel: 'Organizational Leadership',
    sectionId: 'lead5412-ch-09-section-03',
    sectionHeading: 'Facilities, schedules, and operational access',
    references: [LEAD_PRAXIS, LEAD_CISA],
  }),

  // Chapter 10: Personnel Systems, Safety, Crisis Response, and Continuity
  makeEntry({
    id: 'edlead5412-gloss-19',
    term: 'Teacher induction and performance evaluation',
    definition:
      'Coherent human-capital system pairing mentored onboarding for novice educators with transparent, standards-based evaluation, fair documentation, and targeted support plans to boost effectiveness and retention.',
    aliases: ['Educator retention systems'],
    chapterId: 'lead5412-ch-10',
    chapterTitle: 'Personnel Systems, Safety, Crisis Response, and Continuity',
    domainId: 'organizational-leadership',
    domainLabel: 'Organizational Leadership',
    sectionId: 'lead5412-ch-10-section-01',
    sectionHeading: 'Selection, induction, and retention systems',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
  makeEntry({
    id: 'edlead5412-gloss-20',
    term: 'Emergency Operations Plan',
    definition:
      'All-hazards school safety plan co-developed with local responders establishing prevention protocols, accessible evacuation, family reunification, crisis communication, and after-action reviews for all students and staff.',
    aliases: ['EOP', 'Crisis continuity plan'],
    chapterId: 'lead5412-ch-10',
    chapterTitle: 'Personnel Systems, Safety, Crisis Response, and Continuity',
    domainId: 'organizational-leadership',
    domainLabel: 'Organizational Leadership',
    sectionId: 'lead5412-ch-10-section-03',
    sectionHeading: 'Emergency operations and accessible preparedness',
    references: [LEAD_PRAXIS, LEAD_EMERGENCY],
  }),

  // Chapter 11: Family Engagement, Communication, and Reciprocal Partnerships
  makeEntry({
    id: 'edlead5412-gloss-21',
    term: 'Reciprocal family engagement',
    definition:
      'Sustained two-way partnership recognizing families as co-educators and cultural knowledge holders whose insights shape instructional decisions and school priorities, rather than passive recipients of school notices.',
    aliases: ['Two-way family partnership'],
    chapterId: 'lead5412-ch-11',
    chapterTitle: 'Family Engagement, Communication, and Reciprocal Partnerships',
    domainId: 'community-engagement-leadership',
    domainLabel: 'Community Engagement Leadership',
    sectionId: 'lead5412-ch-11-section-01',
    sectionHeading: 'Reciprocal family engagement',
    references: [LEAD_PRAXIS, LEAD_FAMILY_ENG],
  }),
  makeEntry({
    id: 'edlead5412-gloss-22',
    term: 'Language access and participation equity',
    definition:
      'Legal and ethical commitment to provide qualified interpreters, translated vital documents, flexible meeting times, and accessible channels so multilingual and working families participate equitably in school governance.',
    aliases: ['Multilingual family access'],
    chapterId: 'lead5412-ch-11',
    chapterTitle: 'Family Engagement, Communication, and Reciprocal Partnerships',
    domainId: 'community-engagement-leadership',
    domainLabel: 'Community Engagement Leadership',
    sectionId: 'lead5412-ch-11-section-02',
    sectionHeading: 'Access, language, and participation design',
    references: [LEAD_PRAXIS, LEAD_FAMILY_ENG],
  }),

  // Chapter 12: Community Assets, Advocacy, Governance, and Public Accountability
  makeEntry({
    id: 'edlead5412-gloss-23',
    term: 'Community asset mapping',
    definition:
      'Strengths-based inventory of local agencies, health providers, nonprofits, businesses, and trusted civic leaders used to connect community resources with student learning and wraparound family supports.',
    aliases: ['Asset-based partnership mapping'],
    chapterId: 'lead5412-ch-12',
    chapterTitle:
      'Community Assets, Advocacy, Governance, and Public Accountability',
    domainId: 'community-engagement-leadership',
    domainLabel: 'Community Engagement Leadership',
    sectionId: 'lead5412-ch-12-section-01',
    sectionHeading: 'Community asset mapping and representation',
    references: [LEAD_PRAXIS, LEAD_FAMILY_ENG],
  }),
  makeEntry({
    id: 'edlead5412-gloss-24',
    term: 'School board governance and public accountability',
    definition:
      'Clear boundary between a governing board\'s authority to adopt policy, approve budgets, and oversee the superintendent and administrators\' duty to lead daily operations with transparent public reporting.',
    aliases: ['Governance vs. administration'],
    chapterId: 'lead5412-ch-12',
    chapterTitle:
      'Community Assets, Advocacy, Governance, and Public Accountability',
    domainId: 'community-engagement-leadership',
    domainLabel: 'Community Engagement Leadership',
    sectionId: 'lead5412-ch-12-section-03',
    sectionHeading: 'Governance, authority, and professional advice',
    references: [LEAD_PRAXIS, LEAD_PSEL],
  }),
];

const school_librarian_5312 = [
  // Chapter 1: Program Vision, Needs Assessment, and Improvement
  makeEntry({
    id: 'lib5312-gloss-01',
    term: 'AASL National School Library Standards',
    definition:
      'Professional framework organizing learner, librarian, and library standards around six Shared Foundations (Inquire, Include, Collaborate, Curate, Explore, Engage) and four Domains (Think, Create, Share, Grow).',
    aliases: ['Shared Foundations and Domains'],
    chapterId: 'sl5312-ch-01',
    chapterTitle: 'Program Vision, Needs Assessment, and Improvement',
    domainId: 'program-administration',
    domainLabel: 'Program Administration',
    sectionId: 'sl5312-ch-01-section-02',
    sectionHeading: 'Mission and goals',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-02',
    term: 'Library program needs assessment',
    definition:
      'Systematic evaluation of learner demographics, curriculum goals, collection gaps, circulation trends, and stakeholder feedback used to align the library mission and annual strategic improvement priorities.',
    aliases: ['Strategic program assessment'],
    chapterId: 'sl5312-ch-01',
    chapterTitle: 'Program Vision, Needs Assessment, and Improvement',
    domainId: 'program-administration',
    domainLabel: 'Program Administration',
    sectionId: 'sl5312-ch-01-section-01',
    sectionHeading: 'Needs assessment',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 2: Operations, Budget, Policy, and Evaluation
  makeEntry({
    id: 'lib5312-gloss-03',
    term: 'Zero-based and line-item budgeting',
    definition:
      'Library budgeting methods contrasting line-item allocations grouped by spending category against zero-based budgeting, which requires justifying every recurring and new request from baseline instructional priorities.',
    aliases: ['Library budget models'],
    chapterId: 'sl5312-ch-02',
    chapterTitle: 'Operations, Budget, Policy, and Evaluation',
    domainId: 'program-administration',
    domainLabel: 'Program Administration',
    sectionId: 'sl5312-ch-02-section-01',
    sectionHeading: 'Budget models, grants, and procurement cycles',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-04',
    term: 'Evidence-based library program evaluation',
    definition:
      'Continuous assessment combining circulation outputs, collection age analysis, disaggregated access metrics, and student learning evidence to guide PDSA improvement cycles and annual administrative reports.',
    aliases: ['Outcome-based reporting'],
    chapterId: 'sl5312-ch-02',
    chapterTitle: 'Operations, Budget, Policy, and Evaluation',
    domainId: 'program-administration',
    domainLabel: 'Program Administration',
    sectionId: 'sl5312-ch-02-section-04',
    sectionHeading: 'Data-driven reporting and continuous improvement cycles',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 3: Collection Development and Inclusive Curation
  makeEntry({
    id: 'lib5312-gloss-05',
    term: 'Collection development and diversity audit',
    definition:
      'Policy-driven selection process using professional review tools and demographic collection audits so print and digital holdings align with curriculum needs and represent diverse identities, languages, and perspectives.',
    aliases: ['Collection mapping', 'Inclusive curation'],
    chapterId: 'sl5312-ch-03',
    chapterTitle: 'Collection Development and Inclusive Curation',
    domainId: 'organization-access',
    domainLabel: 'Organization and Access',
    sectionId: 'sl5312-ch-03-section-01',
    sectionHeading: 'Collection development',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-06',
    term: 'CREW weeding and MUSTIE criteria',
    definition:
      'Continuous Review, Evaluation, and Weeding method applying MUSTIE criteria (Misleading, Ugly, Superseded, Trivial, Irrelevant, Elsewhere) to systematically deselect outdated or worn items and strengthen collection quality.',
    aliases: ['Collection deselection'],
    chapterId: 'sl5312-ch-03',
    chapterTitle: 'Collection Development and Inclusive Curation',
    domainId: 'organization-access',
    domainLabel: 'Organization and Access',
    sectionId: 'sl5312-ch-03-section-03',
    sectionHeading: 'Weeding and retention',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 4: Organization, Discovery, Scheduling, and Privacy
  makeEntry({
    id: 'lib5312-gloss-07',
    term: 'MARC21, RDA, and Dewey Decimal Classification',
    definition:
      'Core cataloging standards pairing MARC21 machine-readable bibliographic records, Resource Description and Access metadata rules, and Dewey subject classification so patrons can reliably locate library resources.',
    aliases: ['Cataloging and metadata standards'],
    chapterId: 'sl5312-ch-04',
    chapterTitle: 'Organization, Discovery, Scheduling, and Privacy',
    domainId: 'organization-access',
    domainLabel: 'Organization and Access',
    sectionId: 'sl5312-ch-04-section-01',
    sectionHeading: 'Classification systems, MARC21, and OPAC discovery',
    references: [LIB_PRAXIS, LIB_ETS_PAGE],
  }),
  makeEntry({
    id: 'lib5312-gloss-08',
    term: 'Integrated Library System and OPAC',
    definition:
      'Software platform managing acquisitions, cataloging, inventory, OPAC search discovery, and circulation workflows while safeguarding patron borrowing confidentiality and minimizing retained checkout histories.',
    aliases: ['ILS', 'Circulation privacy'],
    chapterId: 'sl5312-ch-04',
    chapterTitle: 'Organization, Discovery, Scheduling, and Privacy',
    domainId: 'organization-access',
    domainLabel: 'Organization and Access',
    sectionId: 'sl5312-ch-04-section-03',
    sectionHeading: 'Circulation privacy and resource sharing',
    references: [LIB_PRAXIS, LIB_ALA_BILL],
  }),

  // Chapter 5: Inquiry, Search, and Source Evaluation
  makeEntry({
    id: 'lib5312-gloss-09',
    term: 'Boolean operators and controlled vocabulary',
    definition:
      'Structured information-retrieval strategy using AND, OR, and NOT operators, phrase searching, and standardized database subject headings to narrow, broaden, and focus student research queries accurately.',
    aliases: ['Database search strategy'],
    chapterId: 'sl5312-ch-05',
    chapterTitle: 'Inquiry, Search, and Source Evaluation',
    domainId: 'information-access-learning-environment',
    domainLabel: 'Information Access in the Learning Environment',
    sectionId: 'sl5312-ch-05-section-01',
    sectionHeading: 'Inquiry and search strategy',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-10',
    term: 'Library Bill of Rights and reconsideration policy',
    definition:
      'ALA intellectual freedom principles affirming uncensored access to diverse viewpoints alongside board-adopted challenge procedures that keep questioned materials accessible during impartial committee review.',
    aliases: ['Intellectual freedom', 'Challenge procedure'],
    chapterId: 'sl5312-ch-05',
    chapterTitle: 'Inquiry, Search, and Source Evaluation',
    domainId: 'information-access-learning-environment',
    domainLabel: 'Information Access in the Learning Environment',
    sectionId: 'sl5312-ch-05-section-03',
    sectionHeading: 'Intellectual freedom and challenges',
    references: [LIB_PRAXIS, LIB_ALA_BILL],
  }),

  // Chapter 6: Intellectual Freedom, Copyright, and Digital Citizenship
  makeEntry({
    id: 'lib5312-gloss-11',
    term: 'Fair use, Creative Commons, and OER',
    definition:
      'Copyright framework balancing four-factor Section 107 fair use analysis and TEACH Act rules with Creative Commons open licenses that enable educators and learners to legally reuse, adapt, and share Open Educational Resources.',
    aliases: ['Four-factor fair use', 'Open Educational Resources'],
    chapterId: 'sl5312-ch-06',
    chapterTitle: 'Intellectual Freedom, Copyright, and Digital Citizenship',
    domainId: 'information-access-learning-environment',
    domainLabel: 'Information Access in the Learning Environment',
    sectionId: 'sl5312-ch-06-section-02',
    sectionHeading: 'Fair use, TEACH Act, and Creative Commons licensing',
    references: [LIB_PRAXIS, LIB_COPYRIGHT],
  }),
  makeEntry({
    id: 'lib5312-gloss-12',
    term: 'CIPA filtering and student data privacy',
    definition:
      'Legal and ethical obligations combining Children\'s Internet Protection Act E-Rate filtering and legitimate unblocking procedures with FERPA, COPPA, and edtech privacy vetting to protect learners\' digital safety and confidentiality.',
    aliases: ['CIPA compliance', 'Digital citizenship privacy'],
    chapterId: 'sl5312-ch-06',
    chapterTitle: 'Intellectual Freedom, Copyright, and Digital Citizenship',
    domainId: 'information-access-learning-environment',
    domainLabel: 'Information Access in the Learning Environment',
    sectionId: 'sl5312-ch-06-section-04',
    sectionHeading: 'Student data privacy laws, CIPA filtering, and ethical AI use',
    references: [LIB_PRAXIS, LIB_ALA_BILL],
  }),

  // Chapter 7: Collaborative Planning and Instructional Alignment
  makeEntry({
    id: 'lib5312-gloss-13',
    term: 'Collaborative co-teaching and flexible scheduling',
    definition:
      'Instructional partnership in which school librarians and classroom educators use point-of-need flexible scheduling to co-plan standards-aligned units, co-teach inquiry skills, and co-assess student learning.',
    aliases: ['Co-planning and co-instruction'],
    chapterId: 'sl5312-ch-07',
    chapterTitle: 'Collaborative Planning and Instructional Alignment',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-07-section-01',
    sectionHeading: 'Collaborative instructional planning',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-14',
    term: 'Inquiry process formative assessment',
    definition:
      'Ongoing checks of student research questions, search logs, source notes, and intermediate drafts that enable librarians and teachers to deliver timely, actionable feedback before final project submission.',
    aliases: ['Research checkpoints'],
    chapterId: 'sl5312-ch-07',
    chapterTitle: 'Collaborative Planning and Instructional Alignment',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-07-section-04',
    sectionHeading: 'Formative assessment and feedback',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 8: Differentiation, Accessibility, and Learning Evidence
  makeEntry({
    id: 'lib5312-gloss-15',
    term: 'Universal Design for Learning in the library',
    definition:
      'Proactive instructional and spatial design providing multiple means of engagement, representation, and expression through WCAG-accessible digital resources, assistive technology, and multilingual scaffolds for every learner.',
    aliases: ['UDL', 'Accessible library design'],
    chapterId: 'sl5312-ch-08',
    chapterTitle: 'Differentiation, Accessibility, and Learning Evidence',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-08-section-01',
    sectionHeading: 'Universal Design for Learning and assistive library access',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-16',
    term: 'Analytic inquiry rubric',
    definition:
      'Multi-criterion scoring guide evaluating discrete research competencies, such as question framing, source credibility, evidence synthesis, and ethical citation, aligned to content standards and AASL Shared Foundations.',
    aliases: ['Performance-based assessment'],
    chapterId: 'sl5312-ch-08',
    chapterTitle: 'Differentiation, Accessibility, and Learning Evidence',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-08-section-02',
    sectionHeading: 'Performance rubrics, inquiry artifacts, and evidence of learning',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 9: Reading Engagement and Media Literacy
  makeEntry({
    id: 'lib5312-gloss-17',
    term: 'Readers\' advisory and windows-and-mirrors literature',
    definition:
      'Personalized reading guidance matching students to print, graphic, and audio texts by appeal factors while curating diverse literature that affirms learners\' own identities and expands empathy across cultures.',
    aliases: ['Diverse reading culture'],
    chapterId: 'sl5312-ch-09',
    chapterTitle: 'Reading Engagement and Media Literacy',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-09-section-01',
    sectionHeading: 'Readers\' advisory, diverse literature, and reading culture',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-18',
    term: 'Lateral reading and SIFT method',
    definition:
      'Source-verification approach teaching learners to Stop, Investigate a publisher across external sources, Find stronger coverage, and Trace claims to original context instead of judging an unfamiliar site from its own page.',
    aliases: ['Civic online reasoning', 'Source evaluation'],
    chapterId: 'sl5312-ch-09',
    chapterTitle: 'Reading Engagement and Media Literacy',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-09-section-02',
    sectionHeading: 'Lateral reading, SIFT verification, and news literacy',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 10: Learning Environments and Purposeful Technology
  makeEntry({
    id: 'lib5312-gloss-19',
    term: 'Learning commons and makerspace',
    definition:
      'Flexible physical and virtual library environment combining acoustic zoning, mobile furnishings, clear sightlines, and participatory makerspace areas that foster independent study, collaboration, and design thinking.',
    aliases: ['Flexible library zoning'],
    chapterId: 'sl5312-ch-10',
    chapterTitle: 'Learning Environments and Purposeful Technology',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-10-section-01',
    sectionHeading: 'Learning commons design and flexible spatial zoning',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-20',
    term: 'Inquiry-based learning models',
    definition:
      'Structured research frameworks including the Stripling Model of Inquiry, Guided Inquiry Design, and Big6 that scaffold students through questioning, investigating, synthesizing evidence, creating products, and reflecting.',
    aliases: ['Stripling Model', 'Guided Inquiry Design and Big6'],
    chapterId: 'sl5312-ch-10',
    chapterTitle: 'Learning Environments and Purposeful Technology',
    domainId: 'teaching-learning',
    domainLabel: 'Teaching and Learning',
    sectionId: 'sl5312-ch-10-section-04',
    sectionHeading: 'Inquiry process models and scaffolded research instruction',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 11: Professional Learning and Instructional Leadership
  makeEntry({
    id: 'lib5312-gloss-21',
    term: 'Job-embedded professional learning',
    definition:
      'Ongoing, classroom-connected educator development facilitated by the school librarian, including co-teaching demonstrations, research-tool clinics, and instructional coaching aligned with schoolwide improvement goals.',
    aliases: ['Educator capacity building'],
    chapterId: 'sl5312-ch-11',
    chapterTitle: 'Professional Learning and Instructional Leadership',
    domainId: 'professional-development-leadership-advocacy',
    domainLabel: 'Professional Development, Leadership, and Advocacy',
    sectionId: 'sl5312-ch-11-section-01',
    sectionHeading: 'Professional learning',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-22',
    term: 'Library instructional leadership and PLCs',
    definition:
      'Schoolwide leadership role in which the librarian participates in Professional Learning Communities and curriculum committees to integrate information literacy, technology frameworks, and equitable resources across grades.',
    aliases: ['Curriculum committee leadership'],
    chapterId: 'sl5312-ch-11',
    chapterTitle: 'Professional Learning and Instructional Leadership',
    domainId: 'professional-development-leadership-advocacy',
    domainLabel: 'Professional Development, Leadership, and Advocacy',
    sectionId: 'sl5312-ch-11-section-04',
    sectionHeading:
      'Instructional coaching, PLCs, and curriculum committee leadership',
    references: [LIB_PRAXIS, LIB_AASL],
  }),

  // Chapter 12: Partnerships, Advocacy, and Program Communication
  makeEntry({
    id: 'lib5312-gloss-23',
    term: 'Public library and community partnership',
    definition:
      'Formal interagency collaboration, often supported by a memorandum of understanding, connecting school and public libraries to expand student e-card access, database sharing, and summer reading continuity.',
    aliases: ['Student e-card partnership', 'MOU collaboration'],
    chapterId: 'sl5312-ch-12',
    chapterTitle: 'Partnerships, Advocacy, and Program Communication',
    domainId: 'professional-development-leadership-advocacy',
    domainLabel: 'Professional Development, Leadership, and Advocacy',
    sectionId: 'sl5312-ch-12-section-01',
    sectionHeading: 'Public library and community organization partnerships',
    references: [LIB_PRAXIS, LIB_AASL],
  }),
  makeEntry({
    id: 'lib5312-gloss-24',
    term: 'School library program advocacy',
    definition:
      'Sustained, audience-tailored communication with families, administrators, boards, and lawmakers combining ALA ethical standards with student learning evidence to secure staffing, funding, and intellectual freedom.',
    aliases: ['Evidence-based advocacy'],
    chapterId: 'sl5312-ch-12',
    chapterTitle: 'Partnerships, Advocacy, and Program Communication',
    domainId: 'professional-development-leadership-advocacy',
    domainLabel: 'Professional Development, Leadership, and Advocacy',
    sectionId: 'sl5312-ch-12-section-04',
    sectionHeading:
      'Professional ethics, AASL standards alignment, and legislative advocacy',
    references: [LIB_PRAXIS, LIB_ALA_BILL],
  }),
];

module.exports = {
  educational_leadership_5412,
  school_librarian_5312,
};
