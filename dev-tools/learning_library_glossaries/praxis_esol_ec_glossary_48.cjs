'use strict';

const ESOL_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5362.pdf';
const ESOL_TESOL =
  'https://www.tesol.org/media/v33fewo0/2018-tesol-teacher-prep-standards-final.pdf';
const ESOL_WIDA =
  'https://wida.wisc.edu/resources/wida-english-language-development-standards-framework-2020-edition';
const ESOL_TOOLKIT =
  'https://ncela.ed.gov/educator-support/toolkits/english-learner-toolkit';
const ESOL_OCR =
  'https://www.ed.gov/laws-and-policy/civil-rights-laws/race-color-and-national-origin-discrimination/race-color-and-national-origin-discrimination-key-issues/equal-education-opportunities-english';

const EC_PRAXIS =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5025.pdf';
const EC_NAEYC =
  'https://www.naeyc.org/resources/position-statements/dap/principles';
const EC_NCSS =
  'https://www.socialstudies.org/standards/national-curriculum-standards-social-studies';
const EC_NGSS = 'https://www.nextgenscience.org/';
const EC_SHAPE = 'https://www.shapeamerica.org/standards/pe/';
const EC_ARTS = 'https://www.nationalartsstandards.org/';

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

const esol_5362 = [
  // Chapter 1: Phonology, Morphology, Syntax, and Language Structure
  makeEntry({
    id: 'esol5362-gloss-01',
    term: 'Minimal pair',
    definition:
      'Pair of words differing by only one phoneme in the same position, such as ship and sheep, used to identify contrastive sounds and diagnose or teach second-language pronunciation distinctions.',
    aliases: ['Phonemic contrast pair'],
    chapterId: 'esol5362-ch-01',
    chapterTitle: 'Phonology, Morphology, Syntax, and Language Structure',
    domainId: 'foundations-linguistics',
    domainLabel: 'Foundations of Linguistics',
    sectionId: 'esol5362-ch-01-section-01',
    sectionHeading: 'Phonetics, phonology, and intelligibility',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),
  makeEntry({
    id: 'esol5362-gloss-02',
    term: 'Derivational vs. inflectional morpheme',
    definition:
      'Derivational affixes create new words or change grammatical class (such as happy to happiness), whereas inflectional suffixes mark tense, number, possession, or comparison without altering word class.',
    aliases: ['Bound morphemes'],
    chapterId: 'esol5362-ch-01',
    chapterTitle: 'Phonology, Morphology, Syntax, and Language Structure',
    domainId: 'foundations-linguistics',
    domainLabel: 'Foundations of Linguistics',
    sectionId: 'esol5362-ch-01-section-02',
    sectionHeading: 'Morphology and word formation',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),

  // Chapter 2: Semantics, Pragmatics, Discourse, and Sociolinguistics
  makeEntry({
    id: 'esol5362-gloss-03',
    term: 'Pragmatic competence',
    definition:
      'Ability to use and interpret language appropriately in social context, including indirect speech acts, conversational implicature, turn-taking conventions, and politeness norms across audiences.',
    aliases: ['Communicative pragmatics'],
    chapterId: 'esol5362-ch-02',
    chapterTitle: 'Semantics, Pragmatics, Discourse, and Sociolinguistics',
    domainId: 'foundations-linguistics',
    domainLabel: 'Foundations of Linguistics',
    sectionId: 'esol5362-ch-02-section-02',
    sectionHeading: 'Pragmatics and communicative intent',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),
  makeEntry({
    id: 'esol5362-gloss-04',
    term: 'Register',
    definition:
      'Variety of language adapted to a specific social setting, purpose, and audience, spanning informal conversational speech to formal academic discourse with specialized vocabulary and syntax.',
    aliases: ['Situational language variety'],
    chapterId: 'esol5362-ch-02',
    chapterTitle: 'Semantics, Pragmatics, Discourse, and Sociolinguistics',
    domainId: 'foundations-linguistics',
    domainLabel: 'Foundations of Linguistics',
    sectionId: 'esol5362-ch-02-section-04',
    sectionHeading: 'Register, dialect, and language variation',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),

  // Chapter 3: Language Acquisition, Interaction, Feedback, and Development
  makeEntry({
    id: 'esol5362-gloss-05',
    term: 'Comprehensible input',
    definition:
      'Spoken or written target-language input just beyond a learner’s current proficiency level that remains understandable through context, visuals, and prior knowledge, driving second-language acquisition.',
    aliases: ['i+1 input'],
    chapterId: 'esol5362-ch-03',
    chapterTitle:
      'Language Acquisition, Interaction, Feedback, and Development',
    domainId: 'foundations-language-learning',
    domainLabel: 'Foundations of Language Learning',
    sectionId: 'esol5362-ch-03-section-01',
    sectionHeading: 'Input, noticing, and comprehension',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),
  makeEntry({
    id: 'esol5362-gloss-06',
    term: 'Interlanguage',
    definition:
      'Dynamic, rule-governed linguistic system constructed by second-language learners from first-language transfer, target-language generalizations, and input, evolving steadily rather than reflecting random errors.',
    aliases: ['Learner language system'],
    chapterId: 'esol5362-ch-03',
    chapterTitle:
      'Language Acquisition, Interaction, Feedback, and Development',
    domainId: 'foundations-language-learning',
    domainLabel: 'Foundations of Language Learning',
    sectionId: 'esol5362-ch-03-section-03',
    sectionHeading: 'Feedback, interlanguage, and variability',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),

  // Chapter 4: Multilingualism, Transfer, Identity, and Learner Factors
  makeEntry({
    id: 'esol5362-gloss-07',
    term: 'Translanguaging',
    definition:
      'Pedagogical and communicative practice in which multilingual learners strategically draw on their full integrated linguistic repertoire across named languages to construct meaning and develop biliteracy.',
    aliases: ['Dynamic bilingualism'],
    chapterId: 'esol5362-ch-04',
    chapterTitle: 'Multilingualism, Transfer, Identity, and Learner Factors',
    domainId: 'foundations-language-learning',
    domainLabel: 'Foundations of Language Learning',
    sectionId: 'esol5362-ch-04-section-02',
    sectionHeading: 'Translanguaging and multilingual resources',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),
  makeEntry({
    id: 'esol5362-gloss-08',
    term: 'Students with limited or interrupted formal education',
    definition:
      'Multilingual newcomer learners who arrive with gaps in formal schooling or home-language literacy, requiring foundational literacy instruction paired with age-respectful, scaffolded grade-level content.',
    aliases: ['SLIFE', 'SIFE'],
    chapterId: 'esol5362-ch-04',
    chapterTitle: 'Multilingualism, Transfer, Identity, and Learner Factors',
    domainId: 'foundations-language-learning',
    domainLabel: 'Foundations of Language Learning',
    sectionId: 'esol5362-ch-04-section-04',
    sectionHeading: 'Newcomers, interrupted schooling, and biliteracy',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),

  // Chapter 5: Standards, Objectives, Materials, and Differentiation
  makeEntry({
    id: 'esol5362-gloss-09',
    term: 'Sheltered instruction',
    definition:
      'Instructional approach pairing grade-level content objectives with explicit language objectives, using visuals, modeling, interaction, and vocabulary supports so English learners access rigorous curriculum.',
    aliases: ['SIOP model', 'SDAIE'],
    chapterId: 'esol5362-ch-05',
    chapterTitle: 'Standards, Objectives, Materials, and Differentiation',
    domainId: 'planning-implementing-instruction',
    domainLabel: 'Planning and Implementing Instruction',
    sectionId: 'esol5362-ch-05-section-01',
    sectionHeading: 'Standards and integrated objectives',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),
  makeEntry({
    id: 'esol5362-gloss-10',
    term: 'Tier 2 academic vocabulary',
    definition:
      'High-utility words appearing across multiple school disciplines (such as analyze, contrast, and evidence) that occur rarely in everyday speech and require explicit instruction for multilingual learners.',
    aliases: ['General academic vocabulary'],
    chapterId: 'esol5362-ch-05',
    chapterTitle: 'Standards, Objectives, Materials, and Differentiation',
    domainId: 'planning-implementing-instruction',
    domainLabel: 'Planning and Implementing Instruction',
    sectionId: 'esol5362-ch-05-section-03',
    sectionHeading: 'Vocabulary, background, and modalities',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),

  // Chapter 6: Interaction, Scaffolding, Feedback, and Integrated Literacy
  makeEntry({
    id: 'esol5362-gloss-11',
    term: 'Instructional scaffolding',
    definition:
      'Structured, temporary language and content supports—such as sentence frames, graphic organizers, and joint text construction—matched to proficiency levels and systematically faded toward independence.',
    aliases: ['Temporary language support'],
    chapterId: 'esol5362-ch-06',
    chapterTitle:
      'Interaction, Scaffolding, Feedback, and Integrated Literacy',
    domainId: 'planning-implementing-instruction',
    domainLabel: 'Planning and Implementing Instruction',
    sectionId: 'esol5362-ch-06-section-02',
    sectionHeading: 'Scaffolding and gradual release',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),
  makeEntry({
    id: 'esol5362-gloss-12',
    term: 'Recast',
    definition:
      'Implicit form-focused corrective feedback in which a teacher smoothly reformulates a learner’s erroneous utterance into target-like English while preserving its communicative meaning and conversational flow.',
    aliases: ['Implicit corrective feedback'],
    chapterId: 'esol5362-ch-06',
    chapterTitle:
      'Interaction, Scaffolding, Feedback, and Integrated Literacy',
    domainId: 'planning-implementing-instruction',
    domainLabel: 'Planning and Implementing Instruction',
    sectionId: 'esol5362-ch-06-section-04',
    sectionHeading: 'Form-focused feedback and intelligibility',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),

  // Chapter 7: Assessment Purpose, Validity, Reliability, and Proficiency
  makeEntry({
    id: 'esol5362-gloss-13',
    term: 'Construct-irrelevant variance',
    definition:
      'Unintended test difficulty introduced by factors outside the target construct—such as complex English syntax on a mathematics test—that depresses English learners’ scores and undermines validity.',
    aliases: ['Linguistic complexity bias'],
    chapterId: 'esol5362-ch-07',
    chapterTitle:
      'Assessment Purpose, Validity, Reliability, and Proficiency',
    domainId: 'assessment-evaluation',
    domainLabel: 'Assessment and Evaluation',
    sectionId: 'esol5362-ch-07-section-02',
    sectionHeading: 'Validity, reliability, and fairness',
    references: [ESOL_PRAXIS, ESOL_TOOLKIT],
  }),
  makeEntry({
    id: 'esol5362-gloss-14',
    term: 'Linguistic accommodation',
    definition:
      'Approved testing adjustment—such as bilingual word-to-word glossaries, extended time, or native-language directions—that reduces language barriers without altering the academic construct measured.',
    aliases: ['EL testing accommodation'],
    chapterId: 'esol5362-ch-07',
    chapterTitle:
      'Assessment Purpose, Validity, Reliability, and Proficiency',
    domainId: 'assessment-evaluation',
    domainLabel: 'Assessment and Evaluation',
    sectionId: 'esol5362-ch-07-section-04',
    sectionHeading: 'Standardized assessment and accommodations',
    references: [ESOL_PRAXIS, ESOL_TOOLKIT],
  }),

  // Chapter 8: Classroom Assessment, Data Use, Fairness, and Monitoring
  makeEntry({
    id: 'esol5362-gloss-15',
    term: 'Analytic rubric',
    definition:
      'Multi-trait scoring guide evaluating separate dimensions of performance—such as content accuracy, discourse organization, and language conventions—to distinguish content mastery from English proficiency.',
    aliases: ['Multi-trait scoring rubric'],
    chapterId: 'esol5362-ch-08',
    chapterTitle:
      'Classroom Assessment, Data Use, Fairness, and Monitoring',
    domainId: 'assessment-evaluation',
    domainLabel: 'Assessment and Evaluation',
    sectionId: 'esol5362-ch-08-section-02',
    sectionHeading: 'Rubrics, portfolios, and self-assessment',
    references: [ESOL_PRAXIS, ESOL_WIDA],
  }),
  makeEntry({
    id: 'esol5362-gloss-16',
    term: 'Reclassification and post-exit monitoring',
    definition:
      'Standardized state process using valid English language proficiency assessments to exit students from EL status, followed by at least two years of federally required academic monitoring under ESSA.',
    aliases: ['EL exit criteria'],
    chapterId: 'esol5362-ch-08',
    chapterTitle:
      'Classroom Assessment, Data Use, Fairness, and Monitoring',
    domainId: 'assessment-evaluation',
    domainLabel: 'Assessment and Evaluation',
    sectionId: 'esol5362-ch-08-section-04',
    sectionHeading: 'Identification, exit, monitoring, and program evidence',
    references: [ESOL_TOOLKIT, ESOL_OCR],
  }),

  // Chapter 9: Culture, Identity, Responsiveness, and Power
  makeEntry({
    id: 'esol5362-gloss-17',
    term: 'Culturally sustaining pedagogy',
    definition:
      'Asset-based teaching approach that perpetuates and fosters students’ linguistic, literate, and cultural pluralism as core resources for learning rather than treating home practices as deficits to replace.',
    aliases: ['CSP'],
    chapterId: 'esol5362-ch-09',
    chapterTitle: 'Culture, Identity, Responsiveness, and Power',
    domainId: 'culture',
    domainLabel: 'Culture',
    sectionId: 'esol5362-ch-09-section-02',
    sectionHeading: 'Culturally sustaining curriculum',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),
  makeEntry({
    id: 'esol5362-gloss-18',
    term: 'Additive vs. subtractive bilingualism',
    definition:
      'Additive bilingualism develops English while maintaining and valuing the home language, whereas subtractive bilingualism pressures learners to replace their first language, risking identity and academic loss.',
    aliases: ['Bilingual language orientation'],
    chapterId: 'esol5362-ch-09',
    chapterTitle: 'Culture, Identity, Responsiveness, and Power',
    domainId: 'culture',
    domainLabel: 'Culture',
    sectionId: 'esol5362-ch-09-section-04',
    sectionHeading: 'Language ideology, bias, and belonging',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),

  // Chapter 10: Family, Community, and Cross-Cultural Partnerships
  makeEntry({
    id: 'esol5362-gloss-19',
    term: 'Qualified interpreter',
    definition:
      'Trained bilingual professional fluent in English, the family’s home language, and educational terminology who conveys school information accurately and confidentially without using students or untrained staff.',
    aliases: ['Trained language interpreter'],
    chapterId: 'esol5362-ch-10',
    chapterTitle: 'Family, Community, and Cross-Cultural Partnerships',
    domainId: 'culture',
    domainLabel: 'Culture',
    sectionId: 'esol5362-ch-10-section-01',
    sectionHeading: 'Qualified language access',
    references: [ESOL_TOOLKIT, ESOL_OCR],
  }),
  makeEntry({
    id: 'esol5362-gloss-20',
    term: 'Funds of knowledge',
    definition:
      'Historically accumulated and culturally developed skills, lived experiences, and bodies of knowledge embedded in families and communities that educators leverage to enrich classroom instruction.',
    aliases: ['Household cultural resources'],
    chapterId: 'esol5362-ch-10',
    chapterTitle: 'Family, Community, and Cross-Cultural Partnerships',
    domainId: 'culture',
    domainLabel: 'Culture',
    sectionId: 'esol5362-ch-10-section-03',
    sectionHeading: 'Funds of knowledge and community expertise',
    references: [ESOL_PRAXIS, ESOL_TESOL],
  }),

  // Chapter 11: Collaboration, Ethics, Inquiry, and Professional Boundaries
  makeEntry({
    id: 'esol5362-gloss-21',
    term: 'Co-teaching and co-planning',
    definition:
      'Structured partnership in which ESOL specialists and content-area teachers jointly design lessons, align language and content objectives, and share instructional responsibility for multilingual learners.',
    aliases: ['Collaborative ESL instruction'],
    chapterId: 'esol5362-ch-11',
    chapterTitle:
      'Collaboration, Ethics, Inquiry, and Professional Boundaries',
    domainId: 'professionalism-advocacy',
    domainLabel: 'Professionalism and Advocacy',
    sectionId: 'esol5362-ch-11-section-01',
    sectionHeading: 'Language-content collaboration',
    references: [ESOL_TESOL, ESOL_TOOLKIT],
  }),
  makeEntry({
    id: 'esol5362-gloss-22',
    term: 'Language difference vs. disability',
    definition:
      'Multidisciplinary distinction ensuring typical second-language acquisition patterns are not misidentified as disabilities while guaranteeing dually identified students receive both EL and IEP services.',
    aliases: ['EL-SPED differentiation'],
    chapterId: 'esol5362-ch-11',
    chapterTitle:
      'Collaboration, Ethics, Inquiry, and Professional Boundaries',
    domainId: 'professionalism-advocacy',
    domainLabel: 'Professionalism and Advocacy',
    sectionId: 'esol5362-ch-11-section-03',
    sectionHeading: 'Disability, role, and multidisciplinary process',
    references: [ESOL_TOOLKIT, ESOL_OCR],
  }),

  // Chapter 12: Advocacy, Program Evaluation, Rights, and Meaningful Access
  makeEntry({
    id: 'esol5362-gloss-23',
    term: 'Lau v. Nichols and Plyler v. Doe',
    definition:
      'Supreme Court rulings requiring schools to take affirmative steps to overcome language barriers for meaningful access (Lau) and prohibiting denial of public K–12 enrollment based on immigration status (Plyler).',
    aliases: ['EL civil rights precedents'],
    chapterId: 'esol5362-ch-12',
    chapterTitle:
      'Advocacy, Program Evaluation, Rights, and Meaningful Access',
    domainId: 'professionalism-advocacy',
    domainLabel: 'Professionalism and Advocacy',
    sectionId: 'esol5362-ch-12-section-01',
    sectionHeading: 'Meaningful access and language assistance',
    references: [ESOL_OCR, ESOL_TOOLKIT],
  }),
  makeEntry({
    id: 'esol5362-gloss-24',
    term: 'Castañeda three-prong test',
    definition:
      'Federal civil-rights standard requiring EL programs to be grounded in sound educational theory, implemented effectively with adequate staff and resources, and evaluated and revised if results fall short.',
    aliases: ['Castañeda v. Pickard standard'],
    chapterId: 'esol5362-ch-12',
    chapterTitle:
      'Advocacy, Program Evaluation, Rights, and Meaningful Access',
    domainId: 'professionalism-advocacy',
    domainLabel: 'Professionalism and Advocacy',
    sectionId: 'esol5362-ch-12-section-03',
    sectionHeading: 'Program implementation and evaluation',
    references: [ESOL_OCR, ESOL_TOOLKIT],
  }),
];

const early_childhood_5025 = [
  // Chapter 1: Oral Language and Emergent Literacy
  makeEntry({
    id: 'ec5025-gloss-01',
    term: 'Concepts of print',
    definition:
      'Foundational understandings of how written text works, including book orientation, left-to-right and top-to-bottom directionality, return sweep, word boundaries, and the distinction between print and pictures.',
    aliases: ['Print awareness'],
    chapterId: 'ec5025-ch-01',
    chapterTitle: 'Oral Language and Emergent Literacy',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    sectionId: 'ec5025-ch-01-section-1',
    sectionHeading:
      'Oral Language and Emergent Literacy: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NAEYC],
  }),
  makeEntry({
    id: 'ec5025-gloss-02',
    term: 'Dialogic reading',
    definition:
      'Interactive shared-reading technique in which an adult prompts young children with open-ended questions, expands on their oral responses, and invites retelling to build vocabulary and narrative comprehension.',
    aliases: ['Interactive read-aloud questioning'],
    chapterId: 'ec5025-ch-01',
    chapterTitle: 'Oral Language and Emergent Literacy',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    sectionId: 'ec5025-ch-01-section-2',
    sectionHeading:
      'Oral Language and Emergent Literacy: Inquiry and disciplinary tools',
    references: [EC_PRAXIS, EC_NAEYC],
  }),

  // Chapter 2: Phonological Awareness, Phonics, and Word Reading
  makeEntry({
    id: 'ec5025-gloss-03',
    term: 'Phonemic awareness',
    definition:
      'Most advanced subset of phonological awareness involving the auditory ability to isolate, blend, segment, and manipulate individual spoken sounds (phonemes) in words without relying on printed letters.',
    aliases: ['Phoneme-level awareness'],
    chapterId: 'ec5025-ch-02',
    chapterTitle: 'Phonological Awareness, Phonics, and Word Reading',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    sectionId: 'ec5025-ch-02-section-1',
    sectionHeading:
      'Phonological Awareness, Phonics, and Word Reading: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NAEYC],
  }),
  makeEntry({
    id: 'ec5025-gloss-04',
    term: 'Orthographic mapping',
    definition:
      'Mental process by which readers bond a word’s spoken phoneme sequence to its written letter sequence (graphemes) and meaning, storing the word permanently in memory for effortless automatic recognition.',
    aliases: ['Sight-word bonding'],
    chapterId: 'ec5025-ch-02',
    chapterTitle: 'Phonological Awareness, Phonics, and Word Reading',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    sectionId: 'ec5025-ch-02-section-3',
    sectionHeading:
      'Phonological Awareness, Phonics, and Word Reading: Connections and representations',
    references: [EC_PRAXIS, EC_NAEYC],
  }),

  // Chapter 3: Comprehension, Writing, and Children’s Literature
  makeEntry({
    id: 'ec5025-gloss-05',
    term: 'Emergent writing stages',
    definition:
      'Predictable early-childhood progression from drawing and scribbling to letter-like forms, random letter strings, phonetic invented spelling, and conventional orthography as print and phoneme knowledge grow.',
    aliases: ['Developmental writing progression'],
    chapterId: 'ec5025-ch-03',
    chapterTitle: 'Comprehension, Writing, and Children’s Literature',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    sectionId: 'ec5025-ch-03-section-1',
    sectionHeading:
      'Comprehension, Writing, and Children’s Literature: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NAEYC],
  }),
  makeEntry({
    id: 'ec5025-gloss-06',
    term: 'Interactive writing',
    definition:
      'Collaborative early-literacy practice in which teacher and children jointly compose a meaningful message and share the pen to encode target letters, spacing, and phonics patterns in authentic context.',
    aliases: ['Shared pen writing'],
    chapterId: 'ec5025-ch-03',
    chapterTitle: 'Comprehension, Writing, and Children’s Literature',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    sectionId: 'ec5025-ch-03-section-3',
    sectionHeading:
      'Comprehension, Writing, and Children’s Literature: Connections and representations',
    references: [EC_PRAXIS, EC_NAEYC],
  }),

  // Chapter 4: Number, Operations, and Algebraic Thinking
  makeEntry({
    id: 'ec5025-gloss-07',
    term: 'Subitizing',
    definition:
      'Ability to recognize the number of objects in a small collection immediately without counting one by one—either perceptually (up to four or five items) or conceptually by combining visual subgroups.',
    aliases: ['Instant quantity recognition'],
    chapterId: 'ec5025-ch-04',
    chapterTitle: 'Number, Operations, and Algebraic Thinking',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'ec5025-ch-04-section-1',
    sectionHeading:
      'Number, Operations, and Algebraic Thinking: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NAEYC],
  }),
  makeEntry({
    id: 'ec5025-gloss-08',
    term: 'Cardinality and relational equivalence',
    definition:
      'Cardinality recognizes that the last number spoken when counting names the set’s total quantity, while relational equivalence interprets the equal sign as the same value rather than a cue to compute.',
    aliases: ['Cardinal principle', 'Equal-sign equivalence'],
    chapterId: 'ec5025-ch-04',
    chapterTitle: 'Number, Operations, and Algebraic Thinking',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'ec5025-ch-04-section-4',
    sectionHeading:
      'Number, Operations, and Algebraic Thinking: Accuracy, scope, and application',
    references: [EC_PRAXIS, EC_NAEYC],
  }),

  // Chapter 5: Measurement, Data, and Probability
  makeEntry({
    id: 'ec5025-gloss-09',
    term: 'Unit iteration',
    definition:
      'Fundamental measurement concept of laying identical standard or nonstandard units end to end along an object’s length with no gaps or overlaps to determine total magnitude accurately.',
    aliases: ['Repeated-unit measurement'],
    chapterId: 'ec5025-ch-05',
    chapterTitle: 'Measurement, Data, and Probability',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'ec5025-ch-05-section-2',
    sectionHeading:
      'Measurement, Data, and Probability: Inquiry and disciplinary tools',
    references: [EC_PRAXIS, EC_NAEYC],
  }),
  makeEntry({
    id: 'ec5025-gloss-10',
    term: 'Inverse unit-size relationship',
    definition:
      'Measurement principle that measuring the same length with larger units yields a smaller numerical count, whereas measuring with smaller units yields a larger numerical count.',
    aliases: ['Unit-size compensation'],
    chapterId: 'ec5025-ch-05',
    chapterTitle: 'Measurement, Data, and Probability',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'ec5025-ch-05-section-4',
    sectionHeading:
      'Measurement, Data, and Probability: Accuracy, scope, and application',
    references: [EC_PRAXIS, EC_NAEYC],
  }),

  // Chapter 6: Geometry and Mathematical Reasoning
  makeEntry({
    id: 'ec5025-gloss-11',
    term: 'Defining vs. non-defining attributes',
    definition:
      'Defining attributes determine a shape’s mathematical identity (such as number of straight sides and closed vertices), whereas non-defining attributes like color, size, or orientation do not change its class.',
    aliases: ['Geometric attribute distinction'],
    chapterId: 'ec5025-ch-06',
    chapterTitle: 'Geometry and Mathematical Reasoning',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'ec5025-ch-06-section-1',
    sectionHeading:
      'Geometry and Mathematical Reasoning: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NAEYC],
  }),
  makeEntry({
    id: 'ec5025-gloss-12',
    term: 'Shape composition and decomposition',
    definition:
      'Spatial reasoning process of combining smaller 2D or 3D shapes to build composite figures and breaking larger shapes into constituent parts, laying groundwork for area and fraction partitioning.',
    aliases: ['Geometric composing'],
    chapterId: 'ec5025-ch-06',
    chapterTitle: 'Geometry and Mathematical Reasoning',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    sectionId: 'ec5025-ch-06-section-2',
    sectionHeading:
      'Geometry and Mathematical Reasoning: Inquiry and disciplinary tools',
    references: [EC_PRAXIS, EC_NAEYC],
  }),

  // Chapter 7: History, Civics, and Culture
  makeEntry({
    id: 'ec5025-gloss-13',
    term: 'Primary vs. secondary source',
    definition:
      'Primary sources are firsthand artifacts, photographs, diaries, or eyewitness accounts from the era studied, whereas secondary sources analyze, summarize, or interpret past events from a later perspective.',
    aliases: ['Historical evidence types'],
    chapterId: 'ec5025-ch-07',
    chapterTitle: 'History, Civics, and Culture',
    domainId: 'social-studies',
    domainLabel: 'Social Studies',
    sectionId: 'ec5025-ch-07-section-1',
    sectionHeading:
      'History, Civics, and Culture: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NCSS],
  }),
  makeEntry({
    id: 'ec5025-gloss-14',
    term: 'Anti-bias cultural framing',
    definition:
      'Early-childhood social studies approach that honors diverse family traditions authentically across the entire year rather than stereotyping cultures or reducing them to isolated tourist-style holidays.',
    aliases: ['Anti-bias social studies'],
    chapterId: 'ec5025-ch-07',
    chapterTitle: 'History, Civics, and Culture',
    domainId: 'social-studies',
    domainLabel: 'Social Studies',
    sectionId: 'ec5025-ch-07-section-4',
    sectionHeading:
      'History, Civics, and Culture: Accuracy, scope, and application',
    references: [EC_NAEYC, EC_NCSS],
  }),

  // Chapter 8: Geography, Economics, and Social Inquiry
  makeEntry({
    id: 'ec5025-gloss-15',
    term: 'Scarcity and opportunity cost',
    definition:
      'Scarcity occurs when limited resources cannot satisfy all human wants, requiring economic choices whose opportunity cost is the value of the next-best alternative given up.',
    aliases: ['Economic choice trade-off'],
    chapterId: 'ec5025-ch-08',
    chapterTitle: 'Geography, Economics, and Social Inquiry',
    domainId: 'social-studies',
    domainLabel: 'Social Studies',
    sectionId: 'ec5025-ch-08-section-1',
    sectionHeading:
      'Geography, Economics, and Social Inquiry: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NCSS],
  }),
  makeEntry({
    id: 'ec5025-gloss-16',
    term: 'Map legend and scale',
    definition:
      'Cartographic tools explaining how symbols and colors on a map represent real-world features (legend) and how distances on the map correspond proportionally to actual ground distances (scale).',
    aliases: ['Map key and scale'],
    chapterId: 'ec5025-ch-08',
    chapterTitle: 'Geography, Economics, and Social Inquiry',
    domainId: 'social-studies',
    domainLabel: 'Social Studies',
    sectionId: 'ec5025-ch-08-section-3',
    sectionHeading:
      'Geography, Economics, and Social Inquiry: Connections and representations',
    references: [EC_PRAXIS, EC_NCSS],
  }),

  // Chapter 9: Physical and Earth Science
  makeEntry({
    id: 'ec5025-gloss-17',
    term: 'Fair-test investigation',
    definition:
      'Hands-on scientific inquiry in which learners deliberately change only one independent variable at a time while keeping all other conditions constant to observe its effect on an outcome reliably.',
    aliases: ['Controlled inquiry experiment'],
    chapterId: 'ec5025-ch-09',
    chapterTitle: 'Physical and Earth Science',
    domainId: 'science',
    domainLabel: 'Science',
    sectionId: 'ec5025-ch-09-section-2',
    sectionHeading:
      'Physical and Earth Science: Inquiry and disciplinary tools',
    references: [EC_PRAXIS, EC_NGSS],
  }),
  makeEntry({
    id: 'ec5025-gloss-18',
    term: 'Weather vs. climate',
    definition:
      'Weather describes day-to-day atmospheric conditions such as temperature, wind, and precipitation in a location, whereas climate describes typical long-term weather patterns averaged over decades.',
    aliases: ['Short-term vs. long-term atmosphere'],
    chapterId: 'ec5025-ch-09',
    chapterTitle: 'Physical and Earth Science',
    domainId: 'science',
    domainLabel: 'Science',
    sectionId: 'ec5025-ch-09-section-1',
    sectionHeading:
      'Physical and Earth Science: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_NGSS],
  }),

  // Chapter 10: Life Science, Environment, and Engineering
  makeEntry({
    id: 'ec5025-gloss-19',
    term: 'Engineering design cycle',
    definition:
      'Iterative problem-solving process in which young learners define a problem with criteria and constraints, brainstorm solutions, build and test prototypes, analyze results, and improve designs.',
    aliases: ['Iterative engineering process'],
    chapterId: 'ec5025-ch-10',
    chapterTitle: 'Life Science, Environment, and Engineering',
    domainId: 'science',
    domainLabel: 'Science',
    sectionId: 'ec5025-ch-10-section-2',
    sectionHeading:
      'Life Science, Environment, and Engineering: Inquiry and disciplinary tools',
    references: [EC_PRAXIS, EC_NGSS],
  }),
  makeEntry({
    id: 'ec5025-gloss-20',
    term: 'Structure-function relationship',
    definition:
      'Crosscutting life-science principle explaining how the physical shape and parts of a plant or animal—such as bird beaks, roots, or webbed feet—support specific survival, growth, or reproduction functions.',
    aliases: ['Form and function'],
    chapterId: 'ec5025-ch-10',
    chapterTitle: 'Life Science, Environment, and Engineering',
    domainId: 'science',
    domainLabel: 'Science',
    sectionId: 'ec5025-ch-10-section-3',
    sectionHeading:
      'Life Science, Environment, and Engineering: Connections and representations',
    references: [EC_PRAXIS, EC_NGSS],
  }),

  // Chapter 11: Health, Safety, and Physical Development
  makeEntry({
    id: 'ec5025-gloss-21',
    term: 'Locomotor vs. non-locomotor movement',
    definition:
      'Locomotor skills transport the body through space (such as hopping, galloping, and skipping), whereas non-locomotor skills involve stationary axial movements like bending, twisting, stretching, and balancing.',
    aliases: ['Fundamental movement skills'],
    chapterId: 'ec5025-ch-11',
    chapterTitle: 'Health, Safety, and Physical Development',
    domainId: 'health-physical-arts',
    domainLabel:
      'Health and Physical Education; Creative and Performing Arts',
    sectionId: 'ec5025-ch-11-section-1',
    sectionHeading:
      'Health, Safety, and Physical Development: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_SHAPE],
  }),
  makeEntry({
    id: 'ec5025-gloss-22',
    term: 'Developmentally appropriate practice',
    definition:
      'NAEYC framework guiding early educators to design inclusive physical, health, and learning routines grounded in child development principles, individual learner strengths, and families’ cultural contexts.',
    aliases: ['DAP'],
    chapterId: 'ec5025-ch-11',
    chapterTitle: 'Health, Safety, and Physical Development',
    domainId: 'health-physical-arts',
    domainLabel:
      'Health and Physical Education; Creative and Performing Arts',
    sectionId: 'ec5025-ch-11-section-4',
    sectionHeading:
      'Health, Safety, and Physical Development: Accuracy, scope, and application',
    references: [EC_NAEYC, EC_SHAPE],
  }),

  // Chapter 12: Creative and Performing Arts
  makeEntry({
    id: 'ec5025-gloss-23',
    term: 'Elements of music',
    definition:
      'Core musical building blocks explored through singing and movement in early childhood, including steady beat and rhythm patterns, tempo (speed), pitch (high and low), and dynamics (loud and soft).',
    aliases: ['Rhythm, tempo, pitch, and dynamics'],
    chapterId: 'ec5025-ch-12',
    chapterTitle: 'Creative and Performing Arts',
    domainId: 'health-physical-arts',
    domainLabel:
      'Health and Physical Education; Creative and Performing Arts',
    sectionId: 'ec5025-ch-12-section-1',
    sectionHeading:
      'Creative and Performing Arts: Core concepts and vocabulary',
    references: [EC_PRAXIS, EC_ARTS],
  }),
  makeEntry({
    id: 'ec5025-gloss-24',
    term: 'Process art vs. product craft',
    definition:
      'Process art prioritizes children’s open-ended material exploration, creative choice, and self-expression, whereas product crafts direct children to replicate a predetermined teacher model.',
    aliases: ['Open-ended studio art'],
    chapterId: 'ec5025-ch-12',
    chapterTitle: 'Creative and Performing Arts',
    domainId: 'health-physical-arts',
    domainLabel:
      'Health and Physical Education; Creative and Performing Arts',
    sectionId: 'ec5025-ch-12-section-4',
    sectionHeading:
      'Creative and Performing Arts: Accuracy, scope, and application',
    references: [EC_NAEYC, EC_ARTS],
  }),
];

module.exports = {
  esol_5362,
  early_childhood_5025,
};
