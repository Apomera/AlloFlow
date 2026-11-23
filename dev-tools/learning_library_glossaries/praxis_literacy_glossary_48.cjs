'use strict';

const TR5205_CORE_REFS = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw08f38395/pdfs/5205.pdf',
  'https://praxis.ets.org/test/teaching-reading-elementary-5205.html',
];

const TR5205_FOUNDATIONAL_REFS = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw08f38395/pdfs/5205.pdf',
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published',
];

const TR5205_WRITING_REFS = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw08f38395/pdfs/5205.pdf',
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/17/Published',
];

const RS5302_PDF =
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5302.pdf';
const RS5302_ILA_STANDARDS =
  'https://www.literacyworldwide.org/get-resources/standards-for-the-preparation-of-literacy-professionals';
const RS5302_ILA_APPENDIX =
  'https://www.literacyworldwide.org/docs/default-source/resource-documents/standards-appendix-A.pdf';
const RS5302_IDA = 'https://dyslexiaida.org/knowledge-and-practices/';
const RS5302_WWC_FOUNDATIONAL =
  'https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/wwc_foundationalreading_070516.pdf';
const RS5302_WWC_ADOLESCENT =
  'https://ies.ed.gov/ncee/WWC/PracticeGuide/8/Published';
const RS5302_WIDA =
  'https://wida.wisc.edu/news/wida-unveils-new-edition-english-language-development-standards-framework';
const RS5302_NCII_TOOLS =
  'https://intensiveintervention.org/tools-charts/overview';
const RS5302_NCII_DBI =
  'https://intensiveintervention.org/data-based-individualization/progress-monitoring';
const RS5302_IDEA_EVAL = 'https://sites.ed.gov/idea/regs/b/d/300.304';
const RS5302_FERPA = 'https://studentprivacy.ed.gov/ferpa';

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
    aliases: aliases.slice(),
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

const teaching_reading_5205 = [
  // Chapter 1: Emergent Literacy, Oral Language, and Development
  makeEntry({
    id: 'tr5205-gloss-01',
    term: 'Emergent literacy continuum',
    definition:
      'Developmental progression through which young children build receptive and expressive oral language, print awareness, and early mark-making behaviors that bridge home communication to conventional K–6 reading and writing.',
    aliases: ['Early literacy continuum'],
    chapterId: 'tr5205-ch-01',
    chapterTitle: 'Emergent Literacy, Oral Language, and Development',
    domainId: 'phonological-emergent',
    domainLabel: 'Phonological and Phonemic Awareness and Emergent Literacy',
    sectionId: 'tr5205-ch-01-section-01',
    sectionHeading:
      'Emergent Literacy, Oral Language, and Development: Construct and progression',
    references: TR5205_FOUNDATIONAL_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-02',
    term: 'Dialogic reading',
    definition:
      'Interactive read-aloud routine in which an elementary teacher uses open-ended prompts, expansions, and scaffolded oral retelling so students actively build vocabulary, syntax, and story comprehension through conversation.',
    aliases: ['Interactive read-aloud routine'],
    chapterId: 'tr5205-ch-01',
    chapterTitle: 'Emergent Literacy, Oral Language, and Development',
    domainId: 'phonological-emergent',
    domainLabel: 'Phonological and Phonemic Awareness and Emergent Literacy',
    sectionId: 'tr5205-ch-01-section-02',
    sectionHeading:
      'Emergent Literacy, Oral Language, and Development: Explicit instructional sequence',
    references: TR5205_FOUNDATIONAL_REFS,
  }),

  // Chapter 2: Phonological Awareness, Phonemic Awareness, and Print Concepts
  makeEntry({
    id: 'tr5205-gloss-03',
    term: 'Concepts of print',
    definition:
      'Foundational knowledge of how written English operates on a page, including book handling, left-to-right and top-to-bottom directionality, return sweep, word boundaries, letter-versus-word distinctions, and punctuation.',
    aliases: ['Print awareness'],
    chapterId: 'tr5205-ch-02',
    chapterTitle:
      'Phonological Awareness, Phonemic Awareness, and Print Concepts',
    domainId: 'phonological-emergent',
    domainLabel: 'Phonological and Phonemic Awareness and Emergent Literacy',
    sectionId: 'tr5205-ch-02-section-01',
    sectionHeading:
      'Phonological Awareness, Phonemic Awareness, and Print Concepts: Construct and progression',
    references: TR5205_FOUNDATIONAL_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-04',
    term: 'Elkonin sound boxes',
    definition:
      'Instructional scaffold using segmented squares into which students push tokens—and later write graphemes—one phoneme at a time to make oral phoneme segmentation, blending, and sound-symbol mapping concrete.',
    aliases: ['Sound boxes', 'Phoneme boxes'],
    chapterId: 'tr5205-ch-02',
    chapterTitle:
      'Phonological Awareness, Phonemic Awareness, and Print Concepts',
    domainId: 'phonological-emergent',
    domainLabel: 'Phonological and Phonemic Awareness and Emergent Literacy',
    sectionId: 'tr5205-ch-02-section-02',
    sectionHeading:
      'Phonological Awareness, Phonemic Awareness, and Print Concepts: Explicit instructional sequence',
    references: TR5205_FOUNDATIONAL_REFS,
  }),

  // Chapter 3: Phoneme–Grapheme Correspondence and Phonics Patterns
  makeEntry({
    id: 'tr5205-gloss-05',
    term: 'Consonant digraph',
    definition:
      'Pair of consonant letters—such as sh, ch, th, wh, or ck—that represents a single speech sound distinct from either letter alone, unlike a consonant blend in which each phoneme remains audible.',
    aliases: ['Digraph'],
    chapterId: 'tr5205-ch-03',
    chapterTitle: 'Phoneme–Grapheme Correspondence and Phonics Patterns',
    domainId: 'phonics-decoding',
    domainLabel: 'Phonics and Decoding',
    sectionId: 'tr5205-ch-03-section-01',
    sectionHeading:
      'Phoneme–Grapheme Correspondence and Phonics Patterns: Construct and progression',
    references: TR5205_FOUNDATIONAL_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-06',
    term: 'Synthetic phonics',
    definition:
      'Explicit, systematic phonics approach in which students learn individual phoneme-grapheme correspondences in a planned sequence and synthesize sounds continuously to decode words in decodable texts.',
    aliases: ['Explicit blending phonics'],
    chapterId: 'tr5205-ch-03',
    chapterTitle: 'Phoneme–Grapheme Correspondence and Phonics Patterns',
    domainId: 'phonics-decoding',
    domainLabel: 'Phonics and Decoding',
    sectionId: 'tr5205-ch-03-section-02',
    sectionHeading:
      'Phoneme–Grapheme Correspondence and Phonics Patterns: Explicit instructional sequence',
    references: TR5205_FOUNDATIONAL_REFS,
  }),

  // Chapter 4: Decoding, Encoding, Syllables, and Morphology
  makeEntry({
    id: 'tr5205-gloss-07',
    term: 'Six English syllable types',
    definition:
      'Orthographic classification of closed, open, vowel-consonant-e, vowel team, r-controlled, and consonant-le syllables that guides vowel pronunciation during multisyllabic decoding and accurate encoding.',
    aliases: ['Syllable types'],
    chapterId: 'tr5205-ch-04',
    chapterTitle: 'Decoding, Encoding, Syllables, and Morphology',
    domainId: 'phonics-decoding',
    domainLabel: 'Phonics and Decoding',
    sectionId: 'tr5205-ch-04-section-01',
    sectionHeading:
      'Decoding, Encoding, Syllables, and Morphology: Construct and progression',
    references: TR5205_FOUNDATIONAL_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-08',
    term: 'Structural word analysis',
    definition:
      'Strategy of breaking unfamiliar multisyllabic words into meaningful units—prefixes, base words, roots, and inflectional or derivational suffixes—to support both accurate pronunciation and word meaning.',
    aliases: ['Morphemic word analysis'],
    chapterId: 'tr5205-ch-04',
    chapterTitle: 'Decoding, Encoding, Syllables, and Morphology',
    domainId: 'phonics-decoding',
    domainLabel: 'Phonics and Decoding',
    sectionId: 'tr5205-ch-04-section-01',
    sectionHeading:
      'Decoding, Encoding, Syllables, and Morphology: Construct and progression',
    references: TR5205_FOUNDATIONAL_REFS,
  }),

  // Chapter 5: Vocabulary, Morphology, and Knowledge Building
  makeEntry({
    id: 'tr5205-gloss-09',
    term: 'Tier 2 academic vocabulary',
    definition:
      'High-utility, cross-curricular words such as analyze, reluctant, or contrast that appear frequently in written elementary texts across subjects and yield strong comprehension gains when explicitly taught.',
    aliases: ['Tier 2 words', 'High-utility academic words'],
    chapterId: 'tr5205-ch-05',
    chapterTitle: 'Vocabulary, Morphology, and Knowledge Building',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    sectionId: 'tr5205-ch-05-section-01',
    sectionHeading:
      'Vocabulary, Morphology, and Knowledge Building: Construct and progression',
    references: TR5205_CORE_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-10',
    term: 'Semantic gradient',
    definition:
      'Vocabulary routine in which students arrange related words along a continuum of intensity or shade of meaning—such as chilly, cold, frigid—to deepen lexical precision for reading comprehension and writing.',
    aliases: ['Shades of meaning continuum'],
    chapterId: 'tr5205-ch-05',
    chapterTitle: 'Vocabulary, Morphology, and Knowledge Building',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    sectionId: 'tr5205-ch-05-section-02',
    sectionHeading:
      'Vocabulary, Morphology, and Knowledge Building: Explicit instructional sequence',
    references: TR5205_CORE_REFS,
  }),

  // Chapter 6: Accuracy, Automaticity, Rate, and Prosody
  makeEntry({
    id: 'tr5205-gloss-11',
    term: 'Words correct per minute',
    definition:
      'Standardized oral reading fluency metric calculated by subtracting reading errors from total words read aloud in one minute, capturing combined word-recognition accuracy and automaticity on grade-level text.',
    aliases: ['WCPM', 'Oral reading rate'],
    chapterId: 'tr5205-ch-06',
    chapterTitle: 'Accuracy, Automaticity, Rate, and Prosody',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    sectionId: 'tr5205-ch-06-section-01',
    sectionHeading:
      'Accuracy, Automaticity, Rate, and Prosody: Construct and progression',
    references: TR5205_FOUNDATIONAL_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-12',
    term: 'Assisted repeated reading',
    definition:
      'Evidence-based fluency practice in which students reread short connected passages aloud multiple times with an expressive model, choral support, or corrective feedback to improve accuracy, rate, and prosody.',
    aliases: ['Repeated reading'],
    chapterId: 'tr5205-ch-06',
    chapterTitle: 'Accuracy, Automaticity, Rate, and Prosody',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    sectionId: 'tr5205-ch-06-section-02',
    sectionHeading:
      'Accuracy, Automaticity, Rate, and Prosody: Explicit instructional sequence',
    references: TR5205_FOUNDATIONAL_REFS,
  }),

  // Chapter 7: Integrating Fluency, Vocabulary, and Comprehension
  makeEntry({
    id: 'tr5205-gloss-13',
    term: 'Simple View of Reading',
    definition:
      'Empirical reading framework expressing reading comprehension as the product of decoding (word recognition) and language comprehension (RC = D × LC), showing that weakness in either component limits understanding.',
    aliases: ['SVR'],
    chapterId: 'tr5205-ch-07',
    chapterTitle: 'Integrating Fluency, Vocabulary, and Comprehension',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    sectionId: 'tr5205-ch-07-section-01',
    sectionHeading:
      'Integrating Fluency, Vocabulary, and Comprehension: Construct and progression',
    references: TR5205_CORE_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-14',
    term: 'Scarborough Reading Rope',
    definition:
      'Visual model depicting skilled reading as tightly woven strands of language comprehension (background knowledge, vocabulary, syntax, reasoning) and increasingly automatic word recognition (phonology, decoding, sight recognition).',
    aliases: ['Reading Rope'],
    chapterId: 'tr5205-ch-07',
    chapterTitle: 'Integrating Fluency, Vocabulary, and Comprehension',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    sectionId: 'tr5205-ch-07-section-01',
    sectionHeading:
      'Integrating Fluency, Vocabulary, and Comprehension: Construct and progression',
    references: TR5205_CORE_REFS,
  }),

  // Chapter 8: Literary and Informational Text Comprehension
  makeEntry({
    id: 'tr5205-gloss-15',
    term: 'Story grammar',
    definition:
      'Predictable structural elements of narrative literature—setting, characters, initiating problem, plot episodes, climax, resolution, and theme—that help elementary readers organize literal recall and inferential meaning.',
    aliases: ['Narrative elements'],
    chapterId: 'tr5205-ch-08',
    chapterTitle: 'Literary and Informational Text Comprehension',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    sectionId: 'tr5205-ch-08-section-01',
    sectionHeading:
      'Literary and Informational Text Comprehension: Construct and progression',
    references: TR5205_CORE_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-16',
    term: 'Reciprocal teaching',
    definition:
      'Structured small-group comprehension routine in which teacher and students collaboratively apply four dialogue strategies—predicting, questioning, clarifying, and summarizing—to construct and monitor meaning from text.',
    aliases: [],
    chapterId: 'tr5205-ch-08',
    chapterTitle: 'Literary and Informational Text Comprehension',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    sectionId: 'tr5205-ch-08-section-02',
    sectionHeading:
      'Literary and Informational Text Comprehension: Explicit instructional sequence',
    references: TR5205_CORE_REFS,
  }),

  // Chapter 9: Knowledge, Text Structure, Research, and Digital Literacy
  makeEntry({
    id: 'tr5205-gloss-17',
    term: 'Expository text structure',
    definition:
      'Organizational pattern used in informational texts—such as description, chronological sequence, compare-and-contrast, cause-and-effect, or problem-and-solution—that cues readers how key ideas connect.',
    aliases: ['Informational text structure'],
    chapterId: 'tr5205-ch-09',
    chapterTitle: 'Knowledge, Text Structure, Research, and Digital Literacy',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    sectionId: 'tr5205-ch-09-section-01',
    sectionHeading:
      'Knowledge, Text Structure, Research, and Digital Literacy: Construct and progression',
    references: TR5205_CORE_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-18',
    term: 'Signal words',
    definition:
      'Explicit transition cues—such as because, however, consequently, or first—that alert readers to an author’s expository text structure and support accurate note-taking, graphic-organizer synthesis, and summarizing.',
    aliases: ['Transition cues'],
    chapterId: 'tr5205-ch-09',
    chapterTitle: 'Knowledge, Text Structure, Research, and Digital Literacy',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    sectionId: 'tr5205-ch-09-section-02',
    sectionHeading:
      'Knowledge, Text Structure, Research, and Digital Literacy: Explicit instructional sequence',
    references: TR5205_CORE_REFS,
  }),

  // Chapter 10: Assessment-Guided Comprehension for Diverse Readers
  makeEntry({
    id: 'tr5205-gloss-19',
    term: 'Construct-irrelevant variance',
    definition:
      'Systematic error introduced when an assessment score reflects factors outside the target reading skill—such as unfamiliar cultural references, decoding barriers on a listening task, or inaccessible formatting.',
    aliases: ['CIV'],
    chapterId: 'tr5205-ch-10',
    chapterTitle: 'Assessment-Guided Comprehension for Diverse Readers',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    sectionId: 'tr5205-ch-10-section-01',
    sectionHeading:
      'Assessment-Guided Comprehension for Diverse Readers: Construct and progression',
    references: TR5205_CORE_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-20',
    term: 'Informal reading inventory',
    definition:
      'Individually administered set of graded word lists and passages used to observe oral reading accuracy, miscue patterns, and comprehension across independent, instructional, and frustration levels.',
    aliases: ['IRI'],
    chapterId: 'tr5205-ch-10',
    chapterTitle: 'Assessment-Guided Comprehension for Diverse Readers',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    sectionId: 'tr5205-ch-10-section-03',
    sectionHeading:
      'Assessment-Guided Comprehension for Diverse Readers: Assessment and error analysis',
    references: TR5205_CORE_REFS,
  }),

  // Chapter 11: Writing Process, Genres, and Reading–Writing Integration
  makeEntry({
    id: 'tr5205-gloss-21',
    term: 'Recursive writing process',
    definition:
      'Flexible, cyclical stages of prewriting, drafting, revising for ideas and organization, editing for conventions, and publishing that writers revisit iteratively according to audience, genre, and purpose.',
    aliases: ['Writing process stages'],
    chapterId: 'tr5205-ch-11',
    chapterTitle: 'Writing Process, Genres, and Reading–Writing Integration',
    domainId: 'written-expression',
    domainLabel: 'Written Expression',
    sectionId: 'tr5205-ch-11-section-01',
    sectionHeading:
      'Writing Process, Genres, and Reading–Writing Integration: Construct and progression',
    references: TR5205_WRITING_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-22',
    term: 'Interactive writing',
    definition:
      'Collaborative K–6 instructional routine in which teacher and students co-compose a meaningful message and share the pen so learners apply phonics, print conventions, and sentence structure with immediate scaffolding.',
    aliases: ['Share-the-pen writing'],
    chapterId: 'tr5205-ch-11',
    chapterTitle: 'Writing Process, Genres, and Reading–Writing Integration',
    domainId: 'written-expression',
    domainLabel: 'Written Expression',
    sectionId: 'tr5205-ch-11-section-02',
    sectionHeading:
      'Writing Process, Genres, and Reading–Writing Integration: Explicit instructional sequence',
    references: TR5205_WRITING_REFS,
  }),

  // Chapter 12: Spelling, Sentence Construction, Conventions, and Assessment
  makeEntry({
    id: 'tr5205-gloss-23',
    term: 'Developmental spelling stages',
    definition:
      'Predictable progression of orthographic knowledge—from emergent and letter-name alphabetic through within-word pattern, syllables and affixes, and derivational relations—used to target word-study instruction.',
    aliases: ['Orthographic spelling stages'],
    chapterId: 'tr5205-ch-12',
    chapterTitle: 'Spelling, Sentence Construction, Conventions, and Assessment',
    domainId: 'written-expression',
    domainLabel: 'Written Expression',
    sectionId: 'tr5205-ch-12-section-01',
    sectionHeading:
      'Spelling, Sentence Construction, Conventions, and Assessment: Construct and progression',
    references: TR5205_WRITING_REFS,
  }),
  makeEntry({
    id: 'tr5205-gloss-24',
    term: 'Sentence combining',
    definition:
      'Explicit instructional practice in which students merge short kernel sentences using conjunctions, appositives, or subordinate clauses to build syntactic fluency, grammatical control, and writing quality.',
    aliases: ['Syntactic sentence combining'],
    chapterId: 'tr5205-ch-12',
    chapterTitle: 'Spelling, Sentence Construction, Conventions, and Assessment',
    domainId: 'written-expression',
    domainLabel: 'Written Expression',
    sectionId: 'tr5205-ch-12-section-02',
    sectionHeading:
      'Spelling, Sentence Construction, Conventions, and Assessment: Explicit instructional sequence',
    references: TR5205_WRITING_REFS,
  }),
];

const reading_specialist_5302 = [
  // Chapter 1: Literacy Foundations, Development, and Learner Profiles
  makeEntry({
    id: 'rs5302-gloss-01',
    term: 'Developmental dyslexia',
    definition:
      'Neurobiological specific learning disability characterized by unexpected difficulties with accurate or fluent word recognition and poor spelling, typically stemming from a deficit in the phonological component of language.',
    aliases: ['Dyslexia'],
    chapterId: 'read5302-ch-01',
    chapterTitle: 'Literacy Foundations, Development, and Learner Profiles',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-01-section-03',
    sectionHeading: 'Development, variability, and literacy profiles',
    references: [RS5302_PDF, RS5302_IDA],
  }),
  makeEntry({
    id: 'rs5302-gloss-02',
    term: 'Curriculum coherence',
    definition:
      'Systemic alignment of P–12 literacy standards, scope-and-sequence progressions, instructional materials, and assessments across grade levels and tiers so core instruction and intervention reinforce shared outcomes.',
    aliases: ['Vertical and horizontal alignment'],
    chapterId: 'read5302-ch-01',
    chapterTitle: 'Literacy Foundations, Development, and Learner Profiles',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-01-section-04',
    sectionHeading: 'Curriculum coherence and responsive foundations',
    references: [RS5302_PDF, RS5302_ILA_STANDARDS],
  }),

  // Chapter 2: Phonological Awareness, Print Concepts, and the Alphabetic Principle
  makeEntry({
    id: 'rs5302-gloss-03',
    term: 'Phonemic awareness',
    definition:
      'Most advanced subset of phonological awareness involving conscious identification, blending, segmentation, and manipulation of individual phonemes in spoken words, serving as a direct prerequisite for decoding and spelling.',
    aliases: ['Phoneme-level awareness'],
    chapterId: 'read5302-ch-02',
    chapterTitle:
      'Phonological Awareness, Print Concepts, and the Alphabetic Principle',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-02-section-01',
    sectionHeading: 'The spoken-sound continuum',
    references: [RS5302_PDF, RS5302_WWC_FOUNDATIONAL],
  }),
  makeEntry({
    id: 'rs5302-gloss-04',
    term: 'Alphabetic principle',
    definition:
      'Insight that spoken words consist of separable phonemes systematically represented by written letters and letter combinations (graphemes), enabling learners to decode novel words and encode spoken language in print.',
    aliases: ['Sound–symbol correspondence'],
    chapterId: 'read5302-ch-02',
    chapterTitle:
      'Phonological Awareness, Print Concepts, and the Alphabetic Principle',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-02-section-02',
    sectionHeading: 'Print concepts and alphabetic understanding',
    references: [RS5302_PDF, RS5302_IDA],
  }),

  // Chapter 3: Phonics, Word Recognition, Spelling, and Morphology
  makeEntry({
    id: 'rs5302-gloss-05',
    term: 'Orthographic mapping',
    definition:
      'Cognitive process by which readers bond a word’s spoken phoneme sequence to its written grapheme sequence and meaning in long-term memory, establishing permanent, effortless sight-word automaticity.',
    aliases: ['Sight-word bonding'],
    chapterId: 'read5302-ch-03',
    chapterTitle: 'Phonics, Word Recognition, Spelling, and Morphology',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-03-section-02',
    sectionHeading: 'Orthographic mapping and high-frequency words',
    references: [RS5302_PDF, RS5302_WWC_FOUNDATIONAL],
  }),
  makeEntry({
    id: 'rs5302-gloss-06',
    term: 'Feature-based spelling analysis',
    definition:
      'Diagnostic examination of student encoding errors across specific orthographic and morphological features—such as short vowels, consonant blends, inflected endings, or Greek roots—to pinpoint targeted instruction.',
    aliases: ['Encoding error analysis'],
    chapterId: 'read5302-ch-03',
    chapterTitle: 'Phonics, Word Recognition, Spelling, and Morphology',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-03-section-04',
    sectionHeading: 'Encoding and feature-based error analysis',
    references: [RS5302_PDF, RS5302_IDA],
  }),

  // Chapter 4: Fluency, Vocabulary, Comprehension, and Knowledge Building
  makeEntry({
    id: 'rs5302-gloss-07',
    term: 'Reading prosody',
    definition:
      'Expressive dimension of reading fluency reflected in appropriate syntactic phrasing, stress, pitch, and intonation, indicating that the reader is parsing sentence structure and constructing meaning in real time.',
    aliases: ['Expressive reading fluency'],
    chapterId: 'read5302-ch-04',
    chapterTitle: 'Fluency, Vocabulary, Comprehension, and Knowledge Building',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-04-section-01',
    sectionHeading: 'Fluency as accuracy, automaticity, and prosody',
    references: [RS5302_PDF, RS5302_WWC_FOUNDATIONAL],
  }),
  makeEntry({
    id: 'rs5302-gloss-08',
    term: 'Comprehension monitoring',
    definition:
      'Metacognitive self-regulation process by which readers continuously check whether text makes sense, detect breakdowns in vocabulary or inference, and deploy fix-up strategies such as rereading or summarizing.',
    aliases: ['Metacognitive reading monitoring'],
    chapterId: 'read5302-ch-04',
    chapterTitle: 'Fluency, Vocabulary, Comprehension, and Knowledge Building',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-04-section-03',
    sectionHeading: 'Comprehension strategies and text structure',
    references: [RS5302_PDF, RS5302_WWC_ADOLESCENT],
  }),

  // Chapter 5: Writing, Disciplinary Literacy, and Digital Texts
  makeEntry({
    id: 'rs5302-gloss-09',
    term: 'Disciplinary literacy',
    definition:
      'Specialized reading, writing, and reasoning practices authentic to an academic discipline—such as historical sourcing, scientific claim-evidence critique, or mathematical proof—essential for secondary and P–12 readiness.',
    aliases: ['Discipline-specific literacy'],
    chapterId: 'read5302-ch-05',
    chapterTitle: 'Writing, Disciplinary Literacy, and Digital Texts',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-05-section-03',
    sectionHeading: 'Disciplinary and source-based literacy',
    references: [RS5302_PDF, RS5302_WWC_ADOLESCENT],
  }),
  makeEntry({
    id: 'rs5302-gloss-10',
    term: 'Lateral reading',
    definition:
      'Digital source-evaluation practice of leaving an unfamiliar webpage to open external tabs and corroborate the author’s credentials, funding, and consensus across independent sources before trusting a claim.',
    aliases: ['Cross-source digital verification'],
    chapterId: 'read5302-ch-05',
    chapterTitle: 'Writing, Disciplinary Literacy, and Digital Texts',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-05-section-04',
    sectionHeading: 'Digital, media, and multimodal literacy',
    references: [RS5302_PDF, RS5302_ILA_STANDARDS],
  }),

  // Chapter 6: Instructional Design, Differentiation, Intervention, and Engagement
  makeEntry({
    id: 'rs5302-gloss-11',
    term: 'Flexible needs-based grouping',
    definition:
      'Dynamic instructional grouping model in which specialists and classroom teachers form temporary skill-based groups from current diagnostic data and regroup learners promptly as mastery shifts.',
    aliases: ['Flexible grouping'],
    chapterId: 'read5302-ch-06',
    chapterTitle:
      'Instructional Design, Differentiation, Intervention, and Engagement',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-06-section-02',
    sectionHeading: 'Differentiation, grouping, and access',
    references: [RS5302_PDF, RS5302_WWC_FOUNDATIONAL],
  }),
  makeEntry({
    id: 'rs5302-gloss-12',
    term: 'Intervention intensity',
    definition:
      'Systematic strengthening of supplemental literacy support by adjusting group size, session frequency, duration, explicitness, opportunities to respond, and alignment with diagnostic skill targets.',
    aliases: ['Tiered instructional dosage'],
    chapterId: 'read5302-ch-06',
    chapterTitle:
      'Instructional Design, Differentiation, Intervention, and Engagement',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    sectionId: 'read5302-ch-06-section-04',
    sectionHeading: 'Intervention intensity, environment, and engagement',
    references: [RS5302_PDF, RS5302_ILA_APPENDIX],
  }),

  // Chapter 7: Assessment Purposes, Measurement, Selection, and Fairness
  makeEntry({
    id: 'rs5302-gloss-13',
    term: 'Universal screening',
    definition:
      'Brief, standardized benchmark assessment administered schoolwide several times per year to identify students at risk for reading difficulty early and evaluate the overall health of Tier 1 core instruction.',
    aliases: ['Benchmark screening'],
    chapterId: 'read5302-ch-07',
    chapterTitle: 'Assessment Purposes, Measurement, Selection, and Fairness',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'read5302-ch-07-section-01',
    sectionHeading: 'Screening, diagnosis, monitoring, and outcomes',
    references: [RS5302_PDF, RS5302_NCII_TOOLS],
  }),
  makeEntry({
    id: 'rs5302-gloss-14',
    term: 'Classification sensitivity and specificity',
    definition:
      'Psychometric accuracy indices of a literacy screener: sensitivity measures true positives among students at risk, while specificity measures true negatives among students not at risk, balancing false negatives and over-identification.',
    aliases: ['Diagnostic accuracy'],
    chapterId: 'read5302-ch-07',
    chapterTitle: 'Assessment Purposes, Measurement, Selection, and Fairness',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'read5302-ch-07-section-03',
    sectionHeading: 'Classification, norms, criteria, and fairness',
    references: [RS5302_PDF, RS5302_NCII_TOOLS],
  }),

  // Chapter 8: Diagnostic Literacy Assessment, Error Analysis, and Case Integration
  makeEntry({
    id: 'rs5302-gloss-15',
    term: 'Pseudoword decoding assessment',
    definition:
      'Diagnostic reading task using pronounceable nonsense words that isolates pure phoneme-grapheme decoding and syllable-attack knowledge without confounding support from memorized sight words or context clues.',
    aliases: ['Nonsense-word decoding probe'],
    chapterId: 'read5302-ch-08',
    chapterTitle:
      'Diagnostic Literacy Assessment, Error Analysis, and Case Integration',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'read5302-ch-08-section-01',
    sectionHeading: 'Word-level and phonological diagnostics',
    references: [RS5302_PDF, RS5302_IDA],
  }),
  makeEntry({
    id: 'rs5302-gloss-16',
    term: 'Converging diagnostic evidence',
    definition:
      'Triangulation of multiple formal and informal literacy measures, error analyses, language profiles, and instructional-opportunity records so specialist recommendations never rest on a single score.',
    aliases: ['Multi-source triangulation'],
    chapterId: 'read5302-ch-08',
    chapterTitle:
      'Diagnostic Literacy Assessment, Error Analysis, and Case Integration',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'read5302-ch-08-section-04',
    sectionHeading: 'Case synthesis and instructional decisions',
    references: [RS5302_PDF, RS5302_IDEA_EVAL],
  }),

  // Chapter 9: Progress Monitoring, Instructional Decisions, and MTSS Data
  makeEntry({
    id: 'rs5302-gloss-17',
    term: 'Aim line and trendline analysis',
    definition:
      'Visual and quantitative comparison of a student’s actual progress-monitoring slope against the expected goal trajectory drawn from baseline to target, triggering timely instructional adjustments via decision rules.',
    aliases: ['Goal-line slope analysis'],
    chapterId: 'read5302-ch-09',
    chapterTitle:
      'Progress Monitoring, Instructional Decisions, and MTSS Data',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'read5302-ch-09-section-02',
    sectionHeading: 'Goals, graphs, level, and slope',
    references: [RS5302_PDF, RS5302_NCII_DBI],
  }),
  makeEntry({
    id: 'rs5302-gloss-18',
    term: 'Data-based individualization',
    definition:
      'Iterative, research-validated process for students with persistent literacy needs that pairs validated intervention, frequent progress monitoring, diagnostic adaptation, and fidelity checks to intensify instruction.',
    aliases: ['DBI'],
    chapterId: 'read5302-ch-09',
    chapterTitle:
      'Progress Monitoring, Instructional Decisions, and MTSS Data',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    sectionId: 'read5302-ch-09-section-03',
    sectionHeading: 'Fidelity and data-based individualization',
    references: [RS5302_PDF, RS5302_NCII_DBI],
  }),

  // Chapter 10: Diverse Learners, Family Partnership, Equity, and Access
  makeEntry({
    id: 'rs5302-gloss-19',
    term: 'Cross-linguistic transfer',
    definition:
      'Application of phonological awareness, cognates, syntactic knowledge, and literacy concepts acquired in a multilingual learner’s home language to accelerate reading and writing development in English.',
    aliases: ['L1-to-L2 literacy transfer'],
    chapterId: 'read5302-ch-10',
    chapterTitle: 'Diverse Learners, Family Partnership, Equity, and Access',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    sectionId: 'read5302-ch-10-section-01',
    sectionHeading: 'Multilingual literacy and cross-linguistic transfer',
    references: [RS5302_PDF, RS5302_WIDA],
  }),
  makeEntry({
    id: 'rs5302-gloss-20',
    term: 'Assistive literacy technology',
    definition:
      'Specialized tools such as text-to-speech, speech-to-text, audiobooks, and word prediction that preserve grade-level cognitive access for learners with disabilities while targeted foundational skill intervention continues.',
    aliases: ['AT for reading and writing'],
    chapterId: 'read5302-ch-10',
    chapterTitle: 'Diverse Learners, Family Partnership, Equity, and Access',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    sectionId: 'read5302-ch-10-section-04',
    sectionHeading: 'Disability, advanced learning, and assistive tools',
    references: [RS5302_PDF, RS5302_IDEA_EVAL],
  }),

  // Chapter 11: Coaching, Professional Learning, Collaboration, and Conflict Resolution
  makeEntry({
    id: 'rs5302-gloss-21',
    term: 'Non-evaluative coaching agreement',
    definition:
      'Explicit written or verbal compact between a literacy coach and teacher defining shared student-centered goals, confidentiality boundaries, roles, and separation from administrative supervision to build trust.',
    aliases: ['Coaching partnership agreement'],
    chapterId: 'read5302-ch-11',
    chapterTitle:
      'Coaching, Professional Learning, Collaboration, and Conflict Resolution',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    sectionId: 'read5302-ch-11-section-01',
    sectionHeading: 'Coaching agreements and cycles',
    references: [RS5302_PDF, RS5302_ILA_STANDARDS],
  }),
  makeEntry({
    id: 'rs5302-gloss-22',
    term: 'Job-embedded professional learning',
    definition:
      'Ongoing, collaborative adult learning situated directly in classroom practice—such as co-planning, modeling, co-teaching, and student-work inquiry—evaluated by instructional transfer and student literacy gains.',
    aliases: ['Embedded PD'],
    chapterId: 'read5302-ch-11',
    chapterTitle:
      'Coaching, Professional Learning, Collaboration, and Conflict Resolution',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    sectionId: 'read5302-ch-11-section-03',
    sectionHeading: 'Adult learning and professional-learning evaluation',
    references: [RS5302_PDF, RS5302_ILA_APPENDIX],
  }),

  // Chapter 12: Program Leadership, MTSS, Ethics, Privacy, and Advocacy
  makeEntry({
    id: 'rs5302-gloss-23',
    term: 'Multi-Tiered System of Supports',
    definition:
      'Schoolwide prevention and intervention framework integrating universal Tier 1 core instruction, targeted Tier 2 small-group support, and intensive Tier 3 individualized intervention guided by universal screening and progress data.',
    aliases: ['MTSS'],
    chapterId: 'read5302-ch-12',
    chapterTitle:
      'Program Leadership, MTSS, Ethics, Privacy, and Advocacy',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    sectionId: 'read5302-ch-12-section-01',
    sectionHeading: 'MTSS and coherent literacy systems',
    references: [RS5302_PDF, RS5302_NCII_DBI],
  }),
  makeEntry({
    id: 'rs5302-gloss-24',
    term: 'FERPA student data privacy',
    definition:
      'Federal Family Educational Rights and Privacy Act protections governing access to student literacy records, restricting personally identifiable disclosures to educators with legitimate educational interest and safeguarding family rights.',
    aliases: ['FERPA'],
    chapterId: 'read5302-ch-12',
    chapterTitle:
      'Program Leadership, MTSS, Ethics, Privacy, and Advocacy',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    sectionId: 'read5302-ch-12-section-03',
    sectionHeading: 'Ethics, privacy, and professional boundaries',
    references: [RS5302_PDF, RS5302_FERPA],
  }),
];

module.exports = {
  teaching_reading_5205,
  reading_specialist_5302,
};
