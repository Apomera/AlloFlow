'use strict';

/**
 * Original quick-reference study cards for four Praxis literacy, ESOL, and early childhood libraries:
 * - teaching_reading_5205 (5 domains — strictly K–6 elementary classroom reading instruction)
 * - reading_specialist_5302 (3 domains — K–12 specialist, diagnostic, coaching, and program leadership)
 * - esol_5362 (6 domains — linguistics, SLA, sheltered instruction, assessment, culture, law/advocacy)
 * - early_childhood_5025 (5 domains — PreK–Grade 3 literacy, math, social studies, science, health/PE/arts)
 *
 * Total: 19 domain-aligned Quick Reference cards.
 */

const teaching_reading_5205 = [
  {
    id: 'tr5205-reference-01',
    domainId: 'phonological-emergent',
    domainLabel: 'Phonological and Phonemic Awareness and Emergent Literacy',
    title: 'Phonological Continuum & Emergent Literacy',
    purpose: 'Anchors the oral phonological-to-phonemic progression, concepts of print, and emergent oral language benchmarks for K–6 elementary classrooms.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Confirm whether the classroom task is purely auditory (phonological or phonemic awareness) or connects speech sounds to printed letters (phonics).',
      'Pinpoint the student\'s exact level on the sound-unit hierarchy before jumping to phoneme deletion or substitution.',
      'Check concepts of print and receptive-expressive oral language alongside sound manipulation in kindergarten and early first grade.'
    ],
    formulas: [
      'Phonological Awareness Continuum (largest to smallest unit): Word awareness → Syllable blending/segmenting → Onset-rime manipulation → Phonemic awareness.',
      'Phonemic Awareness Complexity Ladder: Isolation (initial, final, medial) → Blending (supports decoding) → Segmenting (supports encoding) → Addition, Deletion, and Substitution.',
      'Concepts of Print Essentials: Book orientation, print carries meaning, left-to-right and top-to-bottom directionality, return sweep, one-to-one voice-to-print match, and letter vs. word boundaries.',
      'Alphabetic Principle Formula: Phonemic awareness + Letter-sound correspondence = Productive understanding that printed graphemes systematically represent spoken phonemes.'
    ],
    decisionRules: [
      'When student data show accurate rhyming and syllable clapping but inability to sound out CVC words → teach oral phoneme blending and segmenting with Elkonin boxes, then pair tokens with letters.',
      'When student data show fluent recitation of the ABC song while pointing randomly across lines of text → explicitly model concepts of print and one-to-one voice-to-print tracking during shared reading.',
      'When student data show mastery of initial sound isolation but errors on medial short vowels → target explicit medial phoneme isolation and segmenting with articulatory mouth cues.',
      'When student data show limited spoken syntax and vocabulary entering kindergarten → embed daily interactive read-alouds, turn-and-talk routines, and oral storytelling alongside phonological warm-ups.'
    ],
    cautions: [
      'Do not confuse phonological awareness (auditory work with spoken sounds) with phonics (connecting phonemes to written graphemes).',
      'Do not assign complex phoneme substitution or reversal drills before elementary students master blending and segmenting three-phoneme words.',
      'Do not treat letter-name recognition alone as sufficient mastery of letter-sound correspondence or the alphabetic principle.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'tr5205-reference-02',
    domainId: 'phonics-decoding',
    domainLabel: 'Phonics and Decoding',
    title: 'Six Syllable Types, Ehri Phases & Structured Phonics',
    purpose: 'Anchors systematic K–6 phonics sequences, the six English syllable types, Ehri\'s word-reading phases, and orthographic mapping rules.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Inspect decoding and spelling error patterns together to see whether the gap is consonant digraphs/blends, vowel patterns, syllable division, or affixes.',
      'Verify whether the target word is fully decodable, follows a predictable syllable type, or contains an irregular part needing orthographic mapping.',
      'Check that explicit phonics teaching moves immediately from isolated word reading into connected decodable text and dictation.'
    ],
    formulas: [
      'Six English Syllable Types: Closed (CVC, short vowel: cat), Open (CV, long vowel: me), VCe (silent-e long vowel: bike), Vowel Team (ai, oa, ee, oi: boat), R-Controlled (ar, er, ir, or, ur: bird), Consonant-le (ta-ble).',
      'Ehri\'s Four Word-Reading Phases: Pre-alphabetic (visual logos) → Partial alphabetic (boundary consonant cues) → Full alphabetic (complete grapheme-phoneme decoding) → Consolidated alphabetic (orthographic chunks, syllables, and morphemes).',
      'Systematic Phonics Progression: Single consonants and short vowels → Consonant digraphs (sh, ch, th) and blends (st, bl) → VCe long vowels → Vowel teams, r-controlled vowels, and diphthongs → Multisyllabic decoding and structural analysis.',
      'Orthographic Mapping Rule: Phonemic proficiency + Explicit grapheme-phoneme alignment (including spotlighting irregular "heart" parts in high-frequency words) builds permanent sight-word memory.'
    ],
    decisionRules: [
      'When student data show guessing words from the first letter and picture cues (partial alphabetic phase) → shift to explicit full-alphabetic decoding through every phoneme in decodable texts.',
      'When student data show reading "ship" as "sip" or omitting the second sound in "stop" → distinguish consonant digraphs (two letters, one sound) from consonant blends (two sounds kept distinct) using word-building tiles.',
      'When student data show accurate single-syllable reading but stalling on multisyllabic words in grades 3–6 → teach syllable-division routines, the six syllable types, and common prefixes and suffixes.',
      'When student data show misreading irregular high-frequency words like "said" or "was" → map the regular consonant sounds explicitly and highlight only the unexpected vowel spelling rather than drilling whole-word flashcards.'
    ],
    cautions: [
      'Do not recommend three-cueing or guessing from pictures and sentence context as a primary strategy for decoding unfamiliar words.',
      'Do not conflate consonant blends (bl, tr, where both phonemes are heard) with consonant digraphs (ch, sh, th, which represent one single phoneme).',
      'Do not teach phonics rules purely through isolated worksheets without cumulative review, encoding dictation, and decodable passage application.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'tr5205-reference-03',
    domainId: 'vocabulary-fluency',
    domainLabel: 'Vocabulary and Fluency',
    title: 'Vocabulary Tiers, Fluency Pillars & Accuracy Benchmarks',
    purpose: 'Anchors Beck\'s three-tier vocabulary selection, the three pillars of oral reading fluency, text-accuracy thresholds, and research-backed K–6 fluency routines.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Separate word-recognition accuracy problems from slow automaticity or flat prosody before selecting a fluency routine.',
      'Evaluate whether an unfamiliar word merits explicit Tier 2 instruction, brief Tier 3 domain definition, or morphological/context analysis.',
      'Confirm that fluency practice uses appropriate instructional-level text and retains a clear comprehension purpose.'
    ],
    formulas: [
      'Three-Tier Vocabulary Framework: Tier 1 (everyday oral words: run, table) → Tier 2 (high-utility cross-curricular academic words: analyze, reluctant, contrast) → Tier 3 (low-frequency domain-specific terms: photosynthesis, denominator).',
      'Three Pillars of Reading Fluency: Accuracy (correct word recognition) + Automaticity (effortless, appropriate rate) + Prosody (phrasing, stress, intonation, and attention to punctuation).',
      'Oral Reading Accuracy Benchmarks: Independent level = 95–100% accuracy; Instructional level = 90–94% accuracy; Frustration level = below 90% accuracy.',
      'Word-Learning Toolkit: Explicit student-friendly definitions + Morphological analysis (prefixes, suffixes, Greek/Latin roots) + Context clue types (definition, synonym, antonym, example) + Multiple semantic exposures.'
    ],
    decisionRules: [
      'When student data show 96% decoding accuracy but slow, word-by-word pacing → assign structured repeated reading, choral reading, or partner reading with prosody modeling.',
      'When student data show rapid reading rate that ignores punctuation and yields poor recall → model expressive phrasing using phrase-cued text and comprehension check-ins.',
      'When student data show oral reading accuracy below 90% alongside a low WCPM score → prioritize explicit phonics and word-recognition accuracy before pushing reading rate.',
      'When student data show limited academic word knowledge across elementary units → explicitly pre-teach high-utility Tier 2 words using student-friendly definitions, semantic maps, and morphology rather than dictionary copying.'
    ],
    cautions: [
      'Do not equate reading fluency with fast speed-reading WCPM while ignoring accuracy, phrasing, and meaning.',
      'Do not rely on round-robin or popcorn reading, which lowers active reading volume and heightens elementary student anxiety.',
      'Do not ask students to memorize isolated dictionary definitions without rich context, examples, non-examples, and repeated oral and written use.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'tr5205-reference-04',
    domainId: 'comprehension',
    domainLabel: 'Comprehension of Literary and Informational Text',
    title: 'Simple View, Text Structures & K–6 Comprehension',
    purpose: 'Anchors the Simple View of Reading, Scarborough\'s Reading Rope, literary and informational text structures, and elementary comprehension instruction.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Determine whether comprehension difficulty stems from decoding/fluency breakdown, limited background knowledge, weak academic syntax, or poor metacognitive monitoring.',
      'Match the graphic organizer and questioning routine to the genre (literary story grammar vs. informational text structure).',
      'Ensure elementary students actively verify claims with text evidence and transfer strategies through gradual release (I Do → We Do → You Do).'
    ],
    formulas: [
      'Simple View of Reading: Decoding (D) x Language Comprehension (LC) = Reading Comprehension (RC); a weakness in either factor reduces overall comprehension.',
      'Five Informational Text Structures: Description, Sequence/Chronology, Cause and Effect, Compare and Contrast, and Problem and Solution (each cued by specific signal words and text features).',
      'Comprehension Depth Taxonomy: Literal (explicitly stated facts) → Inferential (implied meaning linking text clues and schema) → Evaluative/Critical (judging author\'s craft, perspective, and source credibility).',
      'Reciprocal Teaching & Monitoring Cycle: Predicting + Questioning + Clarifying + Summarizing, supported by explicit teacher think-alouds and Question-Answer Relationships (QAR).'
    ],
    decisionRules: [
      'When student data show accurate, fluent decoding paired with weak retelling of grade-level passages → build background knowledge, explicitly teach text structure, and model comprehension monitoring.',
      'When student data show strong listening comprehension during read-alouds but low independent reading comprehension → deliver targeted decoding intervention while maintaining grade-level knowledge building orally.',
      'When student data show students recalling isolated facts from nonfiction without grasping relationships → teach informational signal words paired with structure-matched graphic organizers (such as cause-effect chains and Venn diagrams).',
      'When student data show accurate literal answers but blank responses on "why" or theme questions → model inferential think-alouds using QAR ("Think and Search" and "Author and Me") with text-evidence stems.'
    ],
    cautions: [
      'Do not drill isolated comprehension skills (such as finding main idea on random short paragraphs) while neglecting content knowledge and vocabulary depth.',
      'Do not misdiagnose a word-recognition bottleneck as a comprehension strategy deficit.',
      'Do not omit digital and research literacy in upper elementary grades; students must learn to use text features, locate credible sources, and synthesize information without copying.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'tr5205-reference-05',
    domainId: 'written-expression',
    domainLabel: 'Written Expression',
    title: 'Developmental Spelling, Writing Process & K–6 Craft',
    purpose: 'Anchors developmental spelling stages, the recursive writing process, K–6 text genres, sentence construction, and analytic writing assessment.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Analyze student writing samples separately for idea development/organization (revising) versus spelling, punctuation, and grammar (editing).',
      'Identify the student\'s developmental spelling stage to select the next orthographic pattern for targeted word study.',
      'Verify whether the assessment goal calls for an analytic rubric (trait-by-trait instructional feedback) or a holistic rubric (overall proficiency snapshot).'
    ],
    formulas: [
      'Developmental Spelling Stages: Precommunicative (random letters/scribbles) → Semiphonetic (initial/final consonant cues) → Phonetic (each heard sound represented) → Transitional (visual vowel patterns and chunks) → Conventional (correct orthography and morphology).',
      'Recursive Writing Process: Prewriting (brainstorming/planning) → Drafting (getting ideas down) → Revising (improving ideas, organization, voice, word choice) → Editing (correcting spelling, capitalization, punctuation, usage) → Publishing.',
      'Core K–6 Writing Genres: Narrative (characters, setting, sequenced events, resolution), Informative/Explanatory (topic, facts, text features, concluding statement), and Opinion/Argumentative (claim, reasons, evidence, linking words).',
      'Reading–Writing Reciprocity Rule: Encoding reinforces phonemic segmentation and phonics patterns, while analyzing mentor texts teaches sentence variety, genre structure, and audience awareness.'
    ],
    decisionRules: [
      'When student data show invented spellings like "TRN" for "train" or "BIK" for "bike" → recognize phonetic-stage mastery of consonants and teach long-vowel VCe and vowel-team word sorts.',
      'When student data show disorganized paragraphs with weak transitions alongside spelling mistakes → conduct a revision mini-lesson on structure and clarity before moving to conventions editing.',
      'When student data show repetitive simple sentences ("I saw a dog. It was brown. It ran fast.") → model explicit sentence combining using adjectives, appositives, and conjunctions.',
      'When student data show a need for targeted writing conference goals across multiple traits → score drafts with an analytic rubric paired with one focused revision or editing target.'
    ],
    cautions: [
      'Do not conflate revising (substantive changes to content, organization, and clarity) with editing (surface corrections to mechanics, spelling, and punctuation).',
      'Do not mark every single mechanical error on an early draft, which overwhelms elementary writers and suppresses idea generation.',
      'Do not postpone meaningful composition in kindergarten and first grade until handwriting and conventional spelling are fully mastered.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  }
];

const reading_specialist_5302 = [
  {
    id: 'rs5302-reference-01',
    domainId: 'curriculum-instruction',
    domainLabel: 'Curriculum and Instruction',
    title: 'K–12 Structured Literacy, MTSS & Disciplinary Instruction',
    purpose: 'Anchors K–12 structured literacy design, MTSS instructional intensification, adolescent disciplinary literacy, and evidence-based curriculum alignment.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Identify the learner\'s profile across the Simple View of Reading and Scarborough\'s Rope before selecting Tier 1, Tier 2, or Tier 3 instructional changes.',
      'Distinguish foundational word-reading needs in older readers from grade-level disciplinary literacy, syntax, and academic knowledge demands.',
      'Verify that core curriculum and intervention materials follow an explicit, systematic, cumulative scope and sequence rather than an incidental approach.'
    ],
    formulas: [
      'Structured Literacy Principles & Elements: Explicit, systematic, cumulative, diagnostic instruction across phonology, sound-symbol correspondence, syllable types, morphology, syntax, and semantics.',
      'MTSS Intensification Levers: Tier 1 (high-quality universal core for all) → Tier 2 (targeted small-group supplemental, 3–5 days/week) → Tier 3 (intensive individualized intervention with smaller groups, more minutes, heightened explicitness, and immediate corrective feedback).',
      'Disciplinary Literacy Progression (Shanahan & Shanahan): Basic Literacy (decoding, high-frequency words) → Intermediate Literacy (generic comprehension strategies, fluency, morphology) → Disciplinary Literacy (specialized reading, writing, and evidence norms in history, science, mathematics, and literature).',
      'Adolescent Multisyllabic & Digital Literacy Rule: Pair morphological analysis (roots/affixes) and flexible syllable division with critical digital source evaluation, corroboration, and multimodal synthesis.'
    ],
    decisionRules: [
      'When student data show a seventh grader reading grade-level science accurately on short words but halting on multisyllabic terminology → deliver explicit morphological analysis and syllable-division intervention alongside disciplinary vocabulary instruction.',
      'When student data show inadequate growth after 8 weeks of faithful Tier 2 small-group intervention → intensify to Tier 3 by narrowing the skill target, reducing group size, increasing session frequency, and adding cumulative review.',
      'When student data show high schoolers struggling to compare conflicting primary historical documents → teach discipline-specific sourcing, contextualization, and corroboration rather than generic story-map templates.',
      'When student data show widespread grade-level reading gaps across 45% of students → strengthen Tier 1 core curriculum alignment and instructional delivery before referring large numbers to Tier 2 or Tier 3.'
    ],
    cautions: [
      'Do not assume foundational decoding, phonemic proficiency, or fluency instruction is inappropriate for struggling adolescent readers who show word-level deficits.',
      'Do not reduce disciplinary literacy to generic content-area strategies (such as universal KWL charts) that ignore how historians, scientists, and mathematicians evaluate evidence.',
      'Do not mistake Tier 1 classroom differentiation for systematic Tier 2 or Tier 3 skill-targeted intervention.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'rs5302-reference-02',
    domainId: 'assessment',
    domainLabel: 'Assessment',
    title: 'Diagnostic Triangulation, Psychometrics & MTSS Data Rules',
    purpose: 'Anchors literacy assessment purposes, psychometric validity and reliability standards, diagnostic error analysis, and CBM progress-monitoring decision rules.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Match the instrument strictly to its intended purpose (screening, diagnostic, progress monitoring, or summative) before interpreting scores.',
      'Triangulate at least two converging data sources (such as decoding inventory, ORF error analysis, spelling sample, and listening comprehension) before finalizing a learner profile.',
      'Verify implementation fidelity, linguistic fairness, and standard error of measurement before recommending an MTSS tier move or eligibility referral.'
    ],
    formulas: [
      'Four Literacy Assessment Purposes: Universal Screening (brief risk identification for all) → Diagnostic (pinpoints exact skill breakdown) → Progress Monitoring (frequent CBM sensitivity to growth) → Outcome/Summative (evaluates overall program and standards mastery).',
      'Psychometric Essentials: Reliability (consistency: test-retest, inter-rater, internal consistency) is necessary for Validity (accuracy of inference: content, construct, criterion); Standard Error of Measurement (SEM) defines the score confidence band.',
      'Norm-Referenced vs. Criterion-Referenced Rule: Percentiles and stanines compare a student to a norm group (avoid misreading Grade Equivalents as instructional levels); criterion-referenced benchmarks measure mastery against explicit skill standards.',
      'MTSS Progress-Monitoring Decision Rules: Plot 6–8 weekly CBM points against the aimline; 4 consecutive points below the aimline trigger an instructional change, while 4 consecutive points above signal raising the goal or fading support.'
    ],
    decisionRules: [
      'When student data show a universal screener score below the 25th percentile → administer targeted diagnostic assessments (phonemic awareness, phonics survey, ORF, listening comprehension) to pinpoint the exact instructional entry point.',
      'When student data show 4 consecutive weekly CBM progress-monitoring points falling below the aimline despite faithful delivery → modify intervention skill focus, instructional explicitness, or dosage rather than continuing unchanged.',
      'When student data show weak pseudoword decoding and phonetic spelling paired with strong oral listening comprehension → identify a word-recognition/dyslexia-consistent profile requiring intensive structured literacy decoding support.',
      'When student data show a multilingual learner scoring low on an English-only ORF screener → analyze home-language literacy, cross-linguistic transfer patterns, and English proficiency before inferring a reading disability.'
    ],
    cautions: [
      'Do not use a brief universal screener or summative state test to diagnose specific phonics gaps or prescribe daily intervention targets.',
      'Do not interpret a Grade Equivalent (GE) score such as 5.2 for a second grader as evidence that the child should be placed in fifth-grade curriculum.',
      'Do not recommend tier exit or special-education referral from a single test score without longitudinal progress-monitoring data and verified instructional fidelity.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'rs5302-reference-03',
    domainId: 'professional-leadership',
    domainLabel: 'Professional Leadership and Specialized Roles',
    title: 'Literacy Coaching, Program Leadership & Ethical Boundaries',
    purpose: 'Anchors non-evaluative student-centered coaching cycles, job-embedded adult learning, schoolwide MTSS program leadership, FERPA ethics, and family partnerships.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Clarify whether the scenario calls for non-evaluative teacher coaching, collaborative problem solving, or schoolwide program leadership while respecting administrative evaluation boundaries.',
      'Anchor every coaching conversation and professional learning plan in concrete student literacy evidence rather than personal critique.',
      'Check legal and ethical safeguards (FERPA confidentiality, equitable resource allocation, and culturally sustaining family engagement) before acting.'
    ],
    formulas: [
      'Student-Centered Coaching Cycle: Set a measurable student-learning goal → Co-plan aligned instruction → Model, co-teach, or observe → Analyze student work together → Adjust next instructional moves.',
      'Effective Professional Learning Standards (Desimone / Guskey): Content-focused + Active job-embedded practice + Collaborative inquiry + Sustained duration with follow-up + Coherent alignment to school literacy goals.',
      'Coaching vs. Supervision Boundary: Reading specialists and literacy coaches serve in confidential, non-evaluative support roles; formal personnel evaluation, discipline, and hiring belong exclusively to school administrators.',
      'Ethical & Equity Leadership Pillars: FERPA protection of identifiable student records, disaggregated MTSS fidelity and outcome audits across subgroups, and two-way asset-based family literacy partnerships.'
    ],
    decisionRules: [
      'When a principal asks the reading specialist to submit confidential coaching notes for a teacher\'s formal evaluation → politely uphold the non-evaluative coaching boundary and redirect personnel evaluation to administration.',
      'When a veteran teacher resists adopting a new structured literacy routine → open with collaborative inquiry centered on student reading data and offer low-stakes co-planning or modeling rather than top-down directives.',
      'When schoolwide data show disproportionate reading risk among historically underserved subgroups → lead a Tier 1 fidelity and curriculum-equity audit and coordinate job-embedded PLCs before expanding pull-out referrals.',
      'When designing family literacy outreach for multilingual households → provide accessible, translated, jargon-free strategies that honor home-language storytelling and family funds of knowledge.'
    ],
    cautions: [
      'Do not breach coaching confidentiality by reporting teacher struggles to administrators for evaluative purposes, which destroys schoolwide trust.',
      'Do not rely on isolated one-day workshops without classroom follow-up, modeling, and PLC data cycles.',
      'Do not treat diverse families as passive recipients or blame home environments for school-level instructional gaps.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  }
];

const esol_5362 = [
  {
    id: 'esol5362-reference-01',
    domainId: 'foundations-linguistics',
    domainLabel: 'Foundations of Linguistics',
    title: 'Linguistic Subsystems, Morphology & Sociolinguistics',
    purpose: 'Anchors phonology, English inflectional versus derivational morphology, syntax, semantics, pragmatics, and sociolinguistic variation for ESOL analysis.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Classify the learner\'s linguistic pattern by exact subsystem (phonology, morphology, syntax, semantics, or pragmatics) before selecting instruction.',
      'Distinguish meaning-changing phonemes from predictable allophones, and grammatical inflectional suffixes from class-changing derivational affixes.',
      'Separate rule-governed dialect or register variation from true English-acquisition errors.'
    ],
    formulas: [
      'Five Core Linguistic Subsystems: Phonology (sound system, minimal pairs, stress/intonation) → Morphology (morphemes, affixes, roots) → Syntax (word order, clauses, agreement) → Semantics (word/sentence meaning, polysemy, idioms) → Pragmatics (context, speech acts, register, politeness).',
      'English Inflectional vs. Derivational Morphology: Exactly 8 inflectional suffixes (-s plural, -\'s possessive, -s 3rd-person singular, -ed past, -ing progressive, -en past participle, -er comparative, -est superlative) never change part of speech; derivational affixes (un-, -tion, -ly) often change word class or core meaning.',
      'Articulatory Phonology Contrast: Consonants are classified by Voicing (voiced/voiceless), Place (bilabial, labiodental, interdental, alveolar, palatal, velar, glottal), and Manner (stop, fricative, affricate, nasal, liquid, glide); vowels vary by tongue height, frontness, rounding, and tenseness.',
      'Sociolinguistic Principle: Regional dialects, World Englishes, and code-switching are systematic, rule-governed linguistic varieties; ESOL instruction adds academic English registers without stigmatizing home varieties.'
    ],
    decisionRules: [
      'When student data show substituting /s/ for /th/ or inserting a vowel before initial s-clusters ("eschool") → target contrastive phonology using minimal pairs and explicit articulatory placement cues.',
      'When student data show omitting 3rd-person singular -s or past-tense -ed in writing → provide contextualized inflectional morphology practice rather than isolated phonetic drills.',
      'When student data show a learner addressing a principal with peer slang or misreading figurative idioms literally → deliver explicit pragmatic register and semantic idiom instruction.',
      'When student data show a student producing "She go yesterday" or inverted adjective-noun order ("house red") → target syntactic verb-tense marking and English phrase-structure patterns through mentor sentences.'
    ],
    cautions: [
      'Do not confuse phonemes (sounds that distinguish meaning, such as /p/ vs. /b/ in pat/bat) with allophones (positional variants of one phoneme, such as aspirated vs. unaspirated /p/).',
      'Do not misclassify derivational suffixes like -ness or -ment as inflectional morphemes.',
      'Do not treat code-switching or non-mainstream English dialects as broken grammar or cognitive deficits.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'esol5362-reference-02',
    domainId: 'foundations-language-learning',
    domainLabel: 'Foundations of Language Learning',
    title: 'SLA Theories, BICS vs. CALP & Cross-Linguistic Transfer',
    purpose: 'Anchors second-language acquisition hypotheses, Cummins\'s BICS/CALP and CUP models, SLA developmental stages, interlanguage, and learner factors.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Determine whether the learner\'s strength lies in everyday social fluency (BICS) or decontextualized academic discourse (CALP).',
      'Distinguish developmental interlanguage errors and L1 transfer patterns from entrenched fossilization or learning disabilities.',
      'Account for affective filter, prior schooling/SLIFE status, age, and home-language literacy when setting growth expectations.'
    ],
    formulas: [
      'Cummins\'s Dual Framework: BICS (Basic Interpersonal Communicative Skills, context-embedded, typically 1–3 years) vs. CALP (Cognitive Academic Language Proficiency, context-reduced, typically 5–7+ years); CUP (Common Underlying Proficiency) explains why strong L1 literacy transfers positively to L2.',
      'Krashen\'s Five SLA Hypotheses: Acquisition-Learning distinction, Monitor Hypothesis, Natural Order Hypothesis, Input Hypothesis (comprehensible input at i+1), and Affective Filter Hypothesis (anxiety blocks intake).',
      'Interaction & Output Hypotheses: Long\'s Interaction Hypothesis (negotiation of meaning makes input comprehensible) + Swain\'s Output Hypothesis (pushed communicative production triggers grammatical noticing and hypothesis testing).',
      'Five SLA Developmental Stages: Preproduction (Silent Period, receptive listening) → Early Production (1–2 word phrases) → Speech Emergence (simple sentences) → Intermediate Fluency (complex discourse) → Advanced Fluency (near-peer academic control).'
    ],
    decisionRules: [
      'When student data show a recent newcomer staying silent during class discussions while following visual directions → recognize the normal Preproduction/Silent Period and provide comprehensible input with nonverbal response options.',
      'When student data show fluent hallway English paired with failing grades on textbook science exams → target CALP, academic vocabulary, and text-structure scaffolding rather than exiting ESOL.',
      'When student data show systematic L1-influenced grammar (such as omitting "be" auxiliaries or articles) → treat as productive interlanguage and support noticing through recasts and structured output tasks.',
      'When student data show strong literacy in Spanish or another home language → leverage Common Underlying Proficiency through cognate bridges, bilingual concept previews, and purposeful translanguaging.'
    ],
    cautions: [
      'Do not equate conversational fluency (BICS) with academic language readiness (CALP) or use it to justify premature program exit.',
      'Do not ban students\' home languages in the classroom; suppressing L1 undermines CUP transfer, identity, and conceptual learning.',
      'Do not misinterpret the Silent Period or predictable L1 interference errors as an emotional disorder or speech-language disability.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'esol5362-reference-03',
    domainId: 'planning-implementing-instruction',
    domainLabel: 'Planning and Implementing Instruction',
    title: 'SIOP Objectives, WIDA Scaffolding & Corrective Feedback',
    purpose: 'Anchors dual content-and-language lesson objectives, WIDA proficiency-level scaffolding, corrective feedback techniques, and integrated four-domain literacy.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Verify that every sheltered lesson pairs a grade-level Content Objective with an observable, domain-specific Language Objective.',
      'Match sensory, graphic, and interactive scaffolds to the learner\'s current English Language Proficiency (ELP) level without reducing cognitive demand.',
      'Choose a corrective feedback move (recast, clarification request, elicitation, metalinguistic cue, or explicit correction) suited to meaning vs. form focus.'
    ],
    formulas: [
      'SIOP Dual-Objective Rule: Content Objective (grade-level concept/skill students master) + Language Objective (language function, key vocabulary/syntax, and domain: listening, speaking, reading, or writing).',
      'WIDA Proficiency & Scaffolding Progression: Levels 1–6 (Entering, Emerging, Developing, Expanding, Bridging, Reaching) supported by Sensory scaffolds (realia, visuals, gestures) → Graphic scaffolds (anchor charts, organizers) → Interactive scaffolds (structured pairs, triads, home-language partners).',
      'Key Language Uses (WIDA): Narrate, Inform, Explain, and Argue—each requiring explicit discourse patterns, transition connectives, and grammatical structures.',
      'Corrective Feedback Continuum (Lyster & Ranta): Recast (implicit reformulation) → Clarification Request ("What did you mean?") → Elicitation (pausing for self-completion) → Metalinguistic Clue ("Check past tense") → Explicit Correction.'
    ],
    decisionRules: [
      'When student data show WIDA Level 1–2 learners in a grade-level social studies lesson → keep the core analytical concept intact while supplying visuals, bilingual word banks, and cloze sentence frames.',
      'When student data show an instructional plan listing only a state content standard → add a measurable language objective naming the exact language function (such as comparing with "whereas" and "however") and language domain.',
      'When student data show intermediate ELs speaking fluently with recurring verb-tense errors during a grammar-focused task → use elicitation or metalinguistic cues to prompt self-repair rather than passive correction.',
      'When student data show ELs understanding oral lectures but struggling to draft lab explanations → integrate speaking-to-writing bridges with mentor texts, discourse frames, and collaborative drafting.'
    ],
    cautions: [
      'Do not simplify grade-level academic rigor or assign below-grade busywork instead of scaffolding linguistic access.',
      'Do not write vague language objectives like "Students will practice English" that omit specific language functions, forms, and domains.',
      'Do not interrupt spontaneous communicative fluency constantly with heavy explicit error correction that raises the affective filter.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'esol5362-reference-04',
    domainId: 'assessment-evaluation',
    domainLabel: 'Assessment and Evaluation',
    title: 'ELP Assessment Cycle, Validity & Fair Accommodations',
    purpose: 'Anchors the federal EL identification-to-exit assessment pipeline, construct validity safeguards, approved accommodations versus modifications, and MTSS differentiation from disability.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Check whether an assessment measures English language proficiency (ELP) or academic content knowledge, and watch for construct-irrelevant language load.',
      'Confirm that selected test supports are valid accommodations (maintaining the target construct) rather than invalidating modifications.',
      'Compare a struggling EL\'s growth against true peers with similar language, cultural, and schooling backgrounds before considering special-education evaluation.'
    ],
    formulas: [
      'Federal EL Assessment Pipeline: Home Language Survey (flags potential EL) → Validated ELP Identification Screener (determines eligibility) → Annual Summative ELP Assessment (measures L/S/R/W growth) → State Reclassification/Exit Criteria → Minimum 2-Year Academic Monitoring (ESSA).',
      'Validity & Bias Guardrail: Construct-irrelevant variance occurs when complex English syntax or unfamiliar cultural references block a student from showing genuine math, science, or social studies mastery.',
      'Accommodations vs. Modifications: Accommodations (bilingual word-to-word glossaries, extended time, simplified directions, approved read-aloud) preserve grade-level standards; Modifications (lowering grade-level expectations or reducing core content) alter the measured construct.',
      'Difference vs. Disability Rule: True language disability manifests across both L1 and L2 and persists despite culturally and linguistically responsive instruction; English-only struggle reflects typical SLA.'
    ],
    decisionRules: [
      'When student data show a newly enrolled student listing Spanish on the Home Language Survey → administer the state-approved ELP screener before making any ESOL placement decision.',
      'When student data show an EL solving math calculations accurately but missing dense English word problems → provide approved linguistic accommodations (bilingual glossary, visual support, clarified syntax) to protect content validity.',
      'When student data show Level 4.8 listening/speaking but Level 2.6 writing on the annual ELP exam → retain EL status, target academic writing domains, and do not reclassify until all state exit criteria are satisfied.',
      'When student data show slow reading progress in English for an EL referred for special education → gather L1 literacy evidence, schooling history, and response to sheltered MTSS support before initiating an IDEA evaluation.'
    ],
    cautions: [
      'Do not place or exit students from ESOL programs solely on the Home Language Survey, teacher intuition, or conversational fluency.',
      'Do not apply unauthorized test modifications on standardized assessments that invalidate score reporting.',
      'Do not rely on English-only IQ or reading norms to diagnose a learning disability in an emerging multilingual learner.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'esol5362-reference-05',
    domainId: 'culture',
    domainLabel: 'Culture',
    title: 'Cultural Frameworks, Acculturation & Family Partnerships',
    purpose: 'Anchors deep cultural dimensions, acculturation and culture-shock phases, funds of knowledge, and federally compliant cross-cultural family communication.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Examine whether an unexpected classroom behavior reflects deep cultural norms (communication style, authority respect, collectivism) rather than defiance.',
      'Locate newcomers on the acculturation and culture-shock continuum to normalize emotional transitions.',
      'Verify that school-to-home communication uses qualified adult interpreters and translated materials in a language families understand.'
    ],
    formulas: [
      'Cultural Iceberg & Communication Dimensions: Surface culture (food, dress, holidays) sits above Deep culture (conceptions of time, authority, eye contact, collectivism vs. individualism, high-context indirect vs. low-context direct communication).',
      'Berry\'s Acculturation Strategies: Integration/Biculturalism (maintaining heritage culture while engaging host culture—strongest academic well-being), Assimilation, Separation, and Marginalization.',
      'Culture Shock Phases: Honeymoon (excitement/novelty) → Frustration/Hostility (fatigue, irritability, homesickness) → Adjustment (growing routines and coping) → Adaptation/Acceptance (bicultural confidence).',
      'Funds of Knowledge & Meaningful Access (Moll / Title VI): Treat families\' household skills, stories, and multilingualism as curricular assets, and provide trained interpreters and translated essential notices at no cost.'
    ],
    decisionRules: [
      'When student data show a newcomer avoiding direct eye contact with teachers or hesitating to question adults → recognize culturally respectful deference norms and explicitly teach U.S. classroom participation expectations without penalizing heritage norms.',
      'When student data show a previously enthusiastic newcomer becoming withdrawn and easily frustrated after six weeks → identify the culture-shock frustration phase and add peer buddies, predictable routines, and home-language check-ins.',
      'When student data show an upcoming IEP or academic conference with non-English-speaking parents → schedule a qualified professional interpreter and send translated documents rather than relying on bilingual students.',
      'When student data show low family attendance at evening school events → examine barriers (work shifts, transportation, language access) and offer flexible, welcoming, community-based partnership options.'
    ],
    cautions: [
      'Do not use students, siblings, or untrained staff as interpreters for formal family meetings, disciplinary hearings, or confidential conferences.',
      'Do not reduce culturally responsive teaching to superficial "foods, festivals, and flags" units that reinforce stereotypes.',
      'Do not assume identical cultural norms across all families who share a language or broad regional label.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'esol5362-reference-06',
    domainId: 'professionalism-advocacy',
    domainLabel: 'Professionalism and Advocacy',
    title: 'EL Civil Rights Law, Castaneda Prongs & Advocacy',
    purpose: 'Anchors landmark EL court rulings, federal statutory requirements under EEOA and ESSA, program evaluation standards, and collaborative co-teaching boundaries.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Identify the specific legal mandate governing the scenario (Title VI / Lau, Castaneda 3-prong test, Plyler enrollment rights, EEOA, or ESSA Title III).',
      'Confirm that EL program design delivers meaningful access to both English proficiency and grade-level core content without unjustified segregation.',
      'Clarify collaborative co-teaching roles and ethical advocacy steps when systemic barriers affect multilingual learners.'
    ],
    formulas: [
      'Lau v. Nichols (1974) & EEOA (1974): Identical "sink-or-swim" instruction without language support violates Title VI of the Civil Rights Act; districts must take affirmative action to overcome language barriers.',
      'Castaneda v. Pickard (1981) Three-Prong Test: An EL program is legally compliant only if it is (1) based on sound educational theory, (2) implemented effectively with adequate resources and qualified staff, and (3) evaluated and revised when it fails to produce results.',
      'Plyler v. Doe (1982): Under the 14th Amendment Equal Protection Clause, undocumented children have a constitutional right to free K–12 public education; schools may never require immigration papers or Social Security numbers to enroll.',
      'ESSA Title III & Parent Opt-Out Rule: Requires standardized statewide entrance/exit criteria, annual ELP testing, parent notification within 30 days of enrollment, and honors written parent opt-out of specialized EL programs while preserving classroom accommodations and annual ELP testing.'
    ],
    decisionRules: [
      'When a school office refuses to register a newly arrived child who lacks a Social Security card or visa → cite Plyler v. Doe and advocate for immediate enrollment using standard residency and age verification.',
      'When a district runs an EL program staffed by uncertified aides with no outcome evaluation → identify violations of Castaneda Prongs 2 and 3 and advocate for qualified staffing and program-effectiveness review.',
      'When parents submit a written refusal of pull-out ESOL services → honor the opt-out choice while continuing legally required general-education language supports and annual state ELP monitoring.',
      'When co-teaching defaults to the ESOL specialist acting as a silent aide in the back of the room → establish equitable co-planning and co-teaching models (team, parallel, or station teaching) with shared instructional authority.'
    ],
    cautions: [
      'Do not assume a parent\'s ESOL opt-out waives the school\'s Title VI civil-rights obligation to ensure meaningful classroom access and annual ELP assessment.',
      'Do not claim federal law mandates one single EL model (such as pull-out vs. dual language); any chosen model must pass Castaneda\'s three prongs.',
      'Do not inquire about, record, or disclose a student\'s or family\'s immigration status.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  }
];

const early_childhood_5025 = [
  {
    id: 'ec5025-reference-01',
    domainId: 'language-literacy',
    domainLabel: 'Language and Literacy',
    title: 'PreK–3 Emergent Literacy, Phonics & Early Writing',
    purpose: 'Anchors early oral language routines, emergent print concepts, phonological-to-phonics milestones, early writing stages, and PreK–3 children\'s literature.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Match the literacy activity to the child\'s developmental span (PreK emergent exploration vs. K–1 decoding foundation vs. Grades 2–3 fluent reading and writing).',
      'Check whether the child needs oral language and print-concept scaffolding, phonemic blending/segmenting, or decodable phonics application.',
      'Examine early writing samples as diagnostic evidence of sound-symbol knowledge rather than penalizing invented spelling.'
    ],
    formulas: [
      'PreK–3 Oral & Emergent Foundation: Dialogic read-alouds (PEER/CROWD prompts) + Environmental print + Book-handling and left-to-right print awareness + Receptive and expressive vocabulary growth.',
      'Early Sound-to-Print Sequence: Rhyming and syllable play → Onset-rime blending → Phoneme blending/segmenting → Letter-sound mastery and CVC decoding → Digraphs, blends, VCe, and vowel teams.',
      'Early Writing Progression: Drawing/scribbling → Mock letter-like forms → Random letter strings → Semiphonetic/phonetic invented spelling ("DG" for dog) → Conventional sentences with basic punctuation.',
      'Children\'s Literature & Text Selection: Predictable/pattern books build oral rhythm and print tracking; Decodable texts build phonics application; Rich picture books and folktales build story grammar (beginning-middle-end), vocabulary, and comprehension.'
    ],
    decisionRules: [
      'When a four-year-old holds a picture book upside down and tells a story solely from illustrations → model book orientation, title/author awareness, and finger-tracking print during interactive read-alouds.',
      'When a kindergartner can identify letter names and first sounds but cannot read "sat" → practice oral phoneme blending paired with magnetic letters in simple CVC words.',
      'When a first grader writes "I LK TO PLA" in a journal → validate communicative effort, celebrate phonetic consonant-vowel mapping, and plan targeted mini-lessons on silent-e and vowel teams.',
      'When second graders decode accurately but give jumbled story retellings → scaffold narrative comprehension with beginning-middle-end story maps and character-problem-solution puppets or cards.'
    ],
    cautions: [
      'Do not push abstract phonics worksheets in preschool before children build oral phonological awareness, rich conversation, and print concepts.',
      'Do not treat predictable/memorizable books as a substitute for decodable texts when teaching beginning sound-symbol decoding.',
      'Do not mark every phonetic spelling error in K–1 journals; invented spelling reveals active phonemic segmentation and guides next phonics steps.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'ec5025-reference-02',
    domainId: 'mathematics',
    domainLabel: 'Mathematics',
    title: 'Early Number Sense, CRA Sequence & PreK–3 Geometry',
    purpose: 'Anchors Gelman and Gallistel counting principles, early operational strategies, the Concrete-Representational-Abstract sequence, measurement, data, and Van Hiele geometry.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Verify whether the child has truly mastered one-to-one correspondence and cardinality rather than rote verbal counting.',
      'Anchor new math concepts in Concrete manipulatives before Representational drawings and Abstract numerals/equations (CRA).',
      'Check whether geometry, measurement, or data errors stem from non-defining visual traits (like shape rotation) or misaligned unit iteration.'
    ],
    formulas: [
      'Five Counting Principles (Gelman & Gallistel): One-to-one correspondence (one number word per object), Stable order (consistent sequence), Cardinality (last number named equals total quantity), Abstraction (any collection can be counted), and Order irrelevance (total stays constant regardless of counting order).',
      'Early Addition & Place-Value Progression: Subitizing (instant recognition of 1–5) → Counting all → Counting on from the larger addend → Decomposing/Making ten → Bundling tens and ones in base ten.',
      'CRA & Measurement Progression: Concrete (counters, base-ten blocks) → Representational (ten-frames, number lines, bar diagrams) → Abstract (symbols/equations); Measurement moves from direct comparison → iterating uniform nonstandard units → standard rulers, clocks, and coins.',
      'Van Hiele Early Geometry Levels: Level 0 Visualization (identifies shapes by overall look) → Level 1 Analysis (classifies shapes by defining attributes such as number of straight sides and vertices regardless of size, color, or rotation).'
    ],
    decisionRules: [
      'When a child touches five bears while saying "1, 2, 3, 4, 5" but restarts counting when asked "How many?" → explicitly reinforce the cardinality principle using small subitized sets and ten-frames.',
      'When a first grader solves 7 + 4 by counting out seven cubes, four cubes, and recounting from one → model counting on from 7 and bridging through 10 with double ten-frames.',
      'When a child insists an upside-down triangle is not a triangle → compare varied orientations and non-examples to focus on defining attributes (3 closed straight sides, 3 vertices).',
      'When a second grader places an object at the "1" mark on a ruler and reads the endpoint as the length → practice iterating centimeter cubes without gaps or overlaps and counting intervals from zero.'
    ],
    cautions: [
      'Do not equate reciting numbers to 20 (rote counting) with conceptual mastery of one-to-one correspondence, cardinality, or place value.',
      'Do not rush to timed abstract algorithm drills before children compose and decompose numbers with concrete and visual models.',
      'Do not teach shapes using only prototypical upright examples, which traps young learners at Van Hiele Level 0.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'ec5025-reference-03',
    domainId: 'social-studies',
    domainLabel: 'Social Studies',
    title: 'Expanding Environments, Civics, Maps & Early Economics',
    purpose: 'Anchors PreK–3 social inquiry, historical chronology, democratic classroom civics, spatial mapping concepts, and foundational economic reasoning.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Ground abstract historical, geographic, or economic concepts in children\'s immediate lived experiences (self, family, classroom, neighborhood) first.',
      'Verify whether students are practicing active social inquiry (asking questions, examining concrete artifacts, making evidence-based choices) rather than passive memorization.',
      'Check that cultural units highlight diverse everyday perspectives and avoid single-day holiday stereotypes.'
    ],
    formulas: [
      'Expanding Environments & C3 Inquiry Sequence: Self → Family → Classroom/School → Community → State/Nation/World, investigated through Questioning → Examining Artifacts/Sources → Evaluating Evidence → Communicating Civic Action.',
      'Early Historical Thinking: Past, present, and future comparisons via personal and family timelines, distinguishing primary sources (old photos, tools, oral histories) from secondary accounts (picture-book biographies).',
      'Foundational Civics & Geography: Civics centers on fairness, rules for safety, rights/responsibilities, voting, and community helpers; Geography progresses from 3D models to 2D bird\'s-eye maps using relative location, compass rose, map key/legend, and physical vs. human features.',
      'Early Economics Core Distinctions: Needs (survival essentials) vs. Wants (desires); Goods (tangible products) vs. Services (helpful actions); Producers vs. Consumers; Scarcity forces Choices and Opportunity Cost (the next-best alternative given up).'
    ],
    decisionRules: [
      'When preschoolers struggle to understand historical periods "hundreds of years ago" → start with concrete personal growth timelines and then/now photo-and-artifact comparisons.',
      'When a classroom dispute breaks out over turn-taking at a popular play center → involve children in co-creating fair rules and voting on solutions to practice authentic democratic civics.',
      'When kindergartners cannot interpret a flat neighborhood map → build a 3D block model of the classroom first, then draw a top-down map with a simple picture key/legend.',
      'When second graders confuse goods with services or cannot explain opportunity cost → run a classroom market simulation sorting tangible items versus jobs and choosing between two limited recess options.'
    ],
    cautions: [
      'Do not teach early history through isolated lists of dates and distant political treaties disconnected from concrete timelines and human stories.',
      'Do not reduce multicultural social studies to superficial holiday crafts that portray communities as static or monolithic.',
      'Do not confuse scarcity (limited resources relative to wants) with high price, or goods with services.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'ec5025-reference-04',
    domainId: 'science',
    domainLabel: 'Science',
    title: '5E Inquiry, NGSS Domains & Early Engineering Design',
    purpose: 'Anchors NGSS three-dimensional early science learning, the 5E instructional model, physical/earth/life science foundations, and the PreK–3 engineering design cycle.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Ensure hands-on observation and student exploration precede formal vocabulary labels and teacher explanations (Explore before Explain).',
      'Identify the target NGSS domain (Physical, Earth/Space, Life Science, or Engineering) and verify age-appropriate safety and fair-test design.',
      'Check for common early misconceptions (such as heavy things always sinking or clouds making wind) that require direct empirical testing.'
    ],
    formulas: [
      '5E Inquiry Instructional Model: Engage (spark curiosity and surface prior ideas) → Explore (hands-on investigation and data collection) → Explain (connect evidence to scientific terms) → Elaborate (apply to new context) → Evaluate (assess conceptual understanding).',
      'NGSS Three-Dimensional Learning: Science and Engineering Practices (observing, predicting, fair testing, modeling) + Crosscutting Concepts (patterns, cause and effect, structure and function) + Disciplinary Core Ideas.',
      'PreK–3 Science Core Concepts: Physical (observable matter properties, solids/liquids, pushes/pulls, light/sound vibrations), Earth/Space (weather patterns, seasons, day/night rotation, rocks/soil/water), Life (living vs. nonliving, survival needs, life cycles, habitats).',
      'Early Engineering Design Process: Ask (define problem) → Imagine (brainstorm ideas) → Plan (sketch/select materials) → Create (build prototype) → Test (measure performance) → Improve (iterate based on evidence).'
    ],
    decisionRules: [
      'When young students predict that all metal objects sink and all large objects sink → guide a hands-on sink-or-float exploration with aluminum foil balls vs. boats before explaining shape and material properties.',
      'When second graders test plant growth by changing both sunlight and water simultaneously → coach a simple fair test that changes only one variable while keeping all other conditions constant.',
      'When a child\'s paper-cup tower collapses during an engineering challenge → treat the collapse as valuable test data and guide the "Improve" iteration step rather than supplying a pre-built solution.',
      'When planning a unit on weather or butterfly life cycles → embed daily sensory observations, science journals with labeled drawings, and simple tally or picture-graph tracking over time.'
    ],
    cautions: [
      'Do not teach early childhood science primarily through textbook reading and vocabulary memorization without hands-on empirical investigation.',
      'Do not invert the 5E cycle by lecturing definitions before children explore phenomena firsthand.',
      'Do not confuse a scientific investigation (explaining how the natural world works) with an engineering challenge (designing and iterating a solution to a human problem).'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  },
  {
    id: 'ec5025-reference-05',
    domainId: 'health-physical-arts',
    domainLabel: 'Health and Physical Education; Creative and Performing Arts',
    title: 'Motor Principles, Early Health & Process-Focused Arts',
    purpose: 'Anchors NAEYC developmentally appropriate physical development principles, early health and safety habits, and open-ended creative and performing arts instruction.',
    checklistLabel: 'Before deciding',
    formulasLabel: 'Key progressions, rules & benchmarks',
    checklist: [
      'Apply cephalocaudal and proximodistal motor principles before expecting fine-motor precision in PreK–1 tasks.',
      'Verify that movement, health, and safety activities maximize inclusive active participation rather than elimination or passive waiting.',
      'Distinguish authentic process-focused creative arts (exploring elements and self-expression) from identical teacher-directed product crafts.'
    ],
    formulas: [
      'Motor Development Principles: Cephalocaudal (head-to-toe control) and Proximodistal (center trunk/shoulders outward to wrists and fingertips); Skills span Locomotor (running, hopping, skipping), Nonlocomotor (bending, balancing, twisting), Manipulative (throwing, catching, kicking), and Fine Motor (pincer/tripod grip, cutting).',
      'Early Health, Safety & SEL Foundations: Balanced nutrition, handwashing/hygiene, sleep and dental care, pedestrian/fire/emergency safety, body boundaries, and social-emotional self-regulation strategies.',
      'Core Creative & Performing Arts Elements: Visual Art (line, shape, color, texture, space, form), Music (steady beat, rhythm, pitch, tempo, dynamics), Dance/Movement (body, space, time, energy), and Drama (role-play, storytelling, perspective-taking).',
      'Process Art vs. Product Craft Rule: Open-ended process art prioritizes exploration, choice, spatial reasoning, and original expression; identical pre-cut craft templates limit creativity and developmental value.'
    ],
    decisionRules: [
      'When a four-year-old fatigues quickly holding a standard thin pencil → strengthen proximodistal hand and wrist stability with playdough, vertical easel painting, tongs, and chunky crayons instead of forcing lined handwriting drills.',
      'When a physical education game eliminates children who get tagged, leaving less-skilled movers sitting idle → replace elimination games with inclusive movement stations and cooperative challenges where every child stays active.',
      'When an art center displays twenty identical teacher-cut cotton-ball snowmen → shift to open-ended process art with varied textures, paints, and collage materials aligned to visual art elements.',
      'When children struggle to manage frustration during transitions or group play → integrate explicit emotion-naming routines, dramatic play role-modeling, and calming self-regulation spaces.'
    ],
    cautions: [
      'Do not use elimination games (such as traditional dodgeball) or long waiting lines that reduce physical activity for children who most need motor practice.',
      'Do not equate identical holiday craft assemblies with meaningful visual-arts instruction.',
      'Do not treat dramatic play, music, and movement as non-academic frills; they directly reinforce oral language, pattern sense, motor coordination, and self-regulation.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false
  }
];

module.exports = {
  teaching_reading_5205,
  reading_specialist_5302,
  esol_5362,
  early_childhood_5025
};
