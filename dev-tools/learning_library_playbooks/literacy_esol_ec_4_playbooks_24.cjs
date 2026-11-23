'use strict';

/**
 * Curated misconception families and 4-stage remediation playbooks (24 total) for:
 * - teaching_reading_5205 (6 pairs, strictly K-6 elementary classroom reading scope)
 * - reading_specialist_5302 (6 pairs)
 * - esol_5362 (6 pairs)
 * - early_childhood_5025 (6 pairs)
 */

const PLAYBOOK_META = {
  status: 'internal-remediation-playbook',
  reviewStatus: 'source-reviewed-editorial-pass',
  releaseEligible: false
};

const teaching_reading_5205 = {
  misconceptionFamilies: [
    {
      id: 'tr5205-phonemic-awareness-vs-phonics',
      label: 'Conflating Phonemic Awareness with Phonics',
      description: 'Treating oral-only phoneme tasks (blending, segmenting, deleting, or substituting spoken sounds) as print-based phonics, or introducing complex phoneme manipulation before K–2 students secure larger phonological units such as words, rhymes, syllables, and onset-rime.',
      remediationMove: 'Check whether print or letters appear in the task before selecting an activity: keep phonemic awareness strictly auditory-oral until students map sounds to graphemes in phonics, and sequence instruction from larger units to individual phonemes.',
      remediationPlaybookId: 'tr5205-playbook-phonemic-awareness-vs-phonics',
      itemIds: [
        'tr5205-b1-001',
        'tr5205-b1-002',
        'tr5205-b1-003',
        'tr5205-b1-004',
        'tr5205-b1-005',
        'tr5205-b1-006',
        'tr5205-b1-007',
        'tr5205-b1-008',
        'tr5205-b1-009',
        'tr5205-b1-010',
        'tr5205-b1-011',
        'tr5205-b1-012'
      ]
    },
    {
      id: 'tr5205-three-cueing-vs-orthographic-mapping',
      label: 'Three-Cueing Guessing Instead of Orthographic Mapping',
      description: 'Prompting K–6 beginning readers to rely on pictures, first-letter guessing, or sentence context instead of decoding through the full grapheme-phoneme sequence, or drilling irregular high-frequency words as unanalyzed visual shapes rather than mapping regular letter-sound parts.',
      remediationMove: 'Require eyes-on-print decoding from left to right using taught phonics patterns and decodable text, use context only to verify meaning after decoding, and teach irregular high-frequency words by mapping predictable sounds while explicitly flagging the irregular spelling part.',
      remediationPlaybookId: 'tr5205-playbook-three-cueing-vs-orthographic-mapping',
      itemIds: [
        'tr5205-b1-017',
        'tr5205-b1-018',
        'tr5205-b1-019',
        'tr5205-b1-020',
        'tr5205-b1-021',
        'tr5205-b1-022',
        'tr5205-b1-023',
        'tr5205-b1-024',
        'tr5205-b1-025',
        'tr5205-b1-026',
        'tr5205-b1-027',
        'tr5205-b1-028'
      ]
    },
    {
      id: 'tr5205-speed-only-vs-prosodic-fluency',
      label: 'Equating Oral Reading Fluency with Speed Alone',
      description: 'Treating timed reading rate (WCPM) drills or unmonitored silent reading as complete fluency instruction while overlooking decoding accuracy, expressive phrasing (prosody), and comprehension monitoring—or prescribing speed practice when accuracy errors are the real bottleneck.',
      remediationMove: 'Evaluate accuracy, automatic rate, and prosody together; repair underlying decoding gaps before pushing rate, and pair modeled expressive reading or partner repeated reading with a brief comprehension check.',
      remediationPlaybookId: 'tr5205-playbook-speed-only-vs-prosodic-fluency',
      itemIds: [
        'tr5205-b1-037',
        'tr5205-b1-038',
        'tr5205-b1-039',
        'tr5205-b1-040',
        'tr5205-b1-041',
        'tr5205-b1-042',
        'tr5205-b1-043',
        'tr5205-b1-044',
        'tr5205-b1-045',
        'tr5205-b1-046',
        'tr5205-b1-047',
        'tr5205-b1-048'
      ]
    },
    {
      id: 'tr5205-isolated-vocab-vs-morphology-context',
      label: 'Isolated Dictionary Definitions Instead of Morphological and Contextual Vocabulary',
      description: 'Assigning dictionary copying, single-exposure weekly word lists, or unsupported context guessing for Tier 2 and Tier 3 elementary words instead of combining student-friendly definitions, rich multiple-context practice, semantic mapping, and morphological analysis.',
      remediationMove: 'Teach high-utility Tier 2 words and key disciplinary Tier 3 terms through explicit explanations, repeated use in speaking and writing, semantic connections, and explicit breakdown of prefixes, suffixes, base words, and roots.',
      remediationPlaybookId: 'tr5205-playbook-isolated-vocab-vs-morphology-context',
      itemIds: [
        'tr5205-b1-020',
        'tr5205-b1-021',
        'tr5205-b1-023',
        'tr5205-b1-039',
        'tr5205-b1-040',
        'tr5205-b1-041',
        'tr5205-b1-042',
        'tr5205-b1-043',
        'tr5205-b1-044',
        'tr5205-b1-063',
        'tr5205-b1-064'
      ]
    },
    {
      id: 'tr5205-generic-strategy-vs-structure-knowledge',
      label: 'Generic Comprehension Drills Without Text Structure or Background Knowledge',
      description: 'Teaching comprehension strategies such as finding the main idea or making predictions as isolated worksheets detached from topic knowledge, literary or informational text structures, syntax, and collaborative text-based discussion.',
      remediationMove: 'Anchor every comprehension routine in coherent content-rich texts, explicitly model how narrative elements or informational text structures organize ideas, and require text-grounded evidence during discussion.',
      remediationPlaybookId: 'tr5205-playbook-generic-strategy-vs-structure-knowledge',
      itemIds: [
        'tr5205-b1-060',
        'tr5205-b1-061',
        'tr5205-b1-062',
        'tr5205-b1-063',
        'tr5205-b1-064',
        'tr5205-b1-065',
        'tr5205-b1-066',
        'tr5205-b1-067',
        'tr5205-b1-068',
        'tr5205-b1-069',
        'tr5205-b1-070',
        'tr5205-b1-071'
      ]
    },
    {
      id: 'tr5205-screener-diagnostic-and-writing-conventions',
      label: 'Confusing Screening with Diagnostic Data and Isolating Writing Conventions',
      description: 'Using a brief universal screening score to choose specific skill lessons without diagnostic follow-up, or reducing elementary writing instruction and scoring to spelling and punctuation fixes while overlooking sentence craft, genre organization, and source-based evidence.',
      remediationMove: 'Separate assessment roles (universal screener → diagnostic skill probe → progress monitoring) and evaluate elementary writing across both transcription conventions and compositional clarity tied directly to classroom reading.',
      remediationPlaybookId: 'tr5205-playbook-screener-diagnostic-and-writing-conventions',
      itemIds: [
        'tr5205-b1-083',
        'tr5205-b1-084',
        'tr5205-b1-085',
        'tr5205-b1-086',
        'tr5205-b1-087',
        'tr5205-b1-088',
        'tr5205-b1-089',
        'tr5205-b1-090',
        'tr5205-b1-091',
        'tr5205-b1-092',
        'tr5205-b1-093',
        'tr5205-b1-094'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'tr5205-playbook-phonemic-awareness-vs-phonics',
      familyId: 'tr5205-phonemic-awareness-vs-phonics',
      familyLabel: 'Conflating Phonemic Awareness with Phonics',
      title: 'Separate Auditory Phoneme Work from Print-Based Phonics in K–2',
      recognitionCue: 'An item asks for a phonemic awareness task or emergent-literacy next step, yet one distractor uses letter tiles, flash cards, or worksheets—or jumps straight to phoneme deletion when a child still struggles with syllables or onset-rime.',
      repairQuestion: 'Can a K–2 child complete this task with eyes closed using only spoken sounds, and does the sound unit match the child\'s exact point on the phonological continuum?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Scan the stem for two boundaries: whether letters/print are present and which spoken unit (word, syllable, onset-rime, or phoneme) the student missed.',
          requiredOutput: 'State whether the target skill is phonological awareness, phonemic awareness, or phonics, and flag any distractor that injects print into an oral-only prompt.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Place the student\'s error on the K–2 continuum (word → rhyme/syllable → onset-rime → phoneme isolation → blending/segmenting → manipulation) and explain why print enters only at the alphabetic-principle bridge.',
          requiredOutput: 'Write a two-line rule distinguishing oral phoneme blending/segmenting from grapheme-phoneme phonics decoding.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Classify three K–1 activities—clapping syllables in "butterfly," tapping three spoken sounds in "ship" with blank counters, and reading CVC word cards—by skill domain and developmental order.',
          requiredOutput: 'Map each activity to phonological awareness, phonemic awareness, or phonics and justify the progression from easiest to hardest.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a K–2 emergent-literacy scenario where a child blends spoken onset-rime accurately but cannot segment four-phoneme blends, then select the targeted instructional move.',
          requiredOutput: 'Choose the exact oral phoneme-segmentation scaffold (such as Elkonin boxes with blank tokens before adding letters) and rule out print-only distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'tr5205-playbook-three-cueing-vs-orthographic-mapping',
      familyId: 'tr5205-three-cueing-vs-orthographic-mapping',
      familyLabel: 'Three-Cueing Guessing Instead of Orthographic Mapping',
      title: 'Replace Picture Guessing with Full-Word Decoding and Orthographic Mapping',
      recognitionCue: 'A K–3 student misreads a word as a meaning-similar substitute (such as reading "pony" for "horse"), and distractors suggest looking at the illustration, skipping the word, or memorizing sight-word outlines.',
      repairQuestion: 'Does this instructional prompt direct the elementary student\'s eyes through every grapheme-phoneme correspondence in the word before checking meaning?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify distractors built on three-cueing habits (picture cues, contextual guessing before decoding, predictable leveled books, or whole-word shape memorization).',
          requiredOutput: 'Underline the specific guessing cue in the trap option and name the decoding evidence the student actually needs to inspect.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Contrast three-cueing with orthographic mapping: bonding a word\'s spoken phonemes to its written graphemes and meaning in memory, including isolating the regular and irregular parts of words like "said."',
          requiredOutput: 'Write a short teacher corrective prompt that guides a child to decode all sounds first and then cross-check whether the decoded word makes sense.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Plan a two-minute routine for teaching a regular decodable pattern (such as vowel team "ai") alongside one irregular high-frequency word ("does") using sound-letter mapping and decodable text.',
          requiredOutput: 'List the exact phoneme-grapheme mapping for "does" (/d/→d, /u/→oe irregular part, /z/→s) and explain why decodable text reinforces the new pattern.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply the decoding-first rule to a new classroom scenario where a second grader reads "house" for "home" and context conflicts with print.',
          requiredOutput: 'Select the response that directs attention to the medial and final graphemes, verifies pronunciation with meaning, and rejects picture-guessing distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'tr5205-playbook-speed-only-vs-prosodic-fluency',
      familyId: 'tr5205-speed-only-vs-prosodic-fluency',
      familyLabel: 'Equating Oral Reading Fluency with Speed Alone',
      title: 'Balance Accuracy, Automaticity, and Prosody in Elementary Fluency',
      recognitionCue: 'A fluency prompt shows a student with choppy phrasing or below-benchmark WCPM, and distractors push racing a timer, silent independent reading, or round-robin popcorn reading without addressing accuracy or phrasing.',
      repairQuestion: 'Is the student\'s fluency breakdown driven by word-reading accuracy, slow automaticity, or flat phrasing—and does the chosen practice connect fluent reading to comprehension?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the student\'s oral-reading data for accuracy percentage, WCPM rate, and prosody markers (pausing at punctuation, phrasing, and intonation) to spot speed-only traps.',
          requiredOutput: 'Diagnose whether accuracy (below 95% instructional threshold), rate, or prosody is the primary constraint in the vignette.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Link the three fluency pillars—accuracy, automaticity, and prosody—to comprehension, and note why unguided silent reading and round-robin reading fail to build fluency for struggling elementary readers.',
          requiredOutput: 'State the decision rule: accuracy gap → explicit phonics/decoding first; accurate but slow/choppy → modeled choral, echo, or repeated reading with phrase cues and a meaning check.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Compare two third-grade profiles: Student A reads 58 WCPM with 87% accuracy; Student B reads 64 WCPM with 98% accuracy in monotone word-by-word phrasing.',
          requiredOutput: 'Assign a distinct, evidence-based classroom routine to Student A and Student B, plus one progress-monitoring check that tracks both level and slope.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-evaluate a multi-week fluency progress graph and choose the defensible instructional adjustment when WCPM rises but comprehension stays flat.',
          requiredOutput: 'Explain why phrasing-focused repeated reading and meaning verification outperform speed-only timed drills on the transfer item.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'tr5205-playbook-isolated-vocab-vs-morphology-context',
      familyId: 'tr5205-isolated-vocab-vs-morphology-context',
      familyLabel: 'Isolated Dictionary Definitions Instead of Morphological and Contextual Vocabulary',
      title: 'Build Deep Elementary Vocabulary with Morphology and Rich Contexts',
      recognitionCue: 'A vocabulary item describes upper-elementary students struggling with academic words across science or literature, and distractors recommend copying glossary definitions, memorizing 20 words on Monday, or guessing solely from vague context.',
      repairQuestion: 'Does this routine give students explicit meaning, multiple active encounters in speech and writing, and transferable word-part tools (prefixes, suffixes, roots)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot low-yield vocabulary distractors: dictionary lookup in isolation, single-exposure matching quizzes, or context-only guessing when surrounding sentences are non-directive.',
          requiredOutput: 'Name the specific weakness of the isolated-definition distractor and identify the word tier (Tier 1, Tier 2, or Tier 3) targeted in the item.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Combine direct vocabulary instruction (student-friendly explanations, examples/non-examples, semantic gradients) with generative morphology (analyzing affixes and roots) and explicit context-clue verification.',
          requiredOutput: 'Produce a three-part elementary vocabulary frame: student-friendly meaning → morphological breakdown → active student sentence or comparison.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze the Tier 2 word "unpredictable" and the Tier 3 science term "evaporation" for a fourth-grade class that includes Spanish-speaking multilingual learners.',
          requiredOutput: 'Break each word into morphemes, note one cognate or semantic connection, and write one interactive student prompt requiring deep word processing.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh scenario where fifth graders read an informational passage with unfamiliar multisyllabic words and limited local context clues.',
          requiredOutput: 'Select the combined morphological-analysis and teacher-clarified context strategy and explain why dictionary-copying options fail.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'tr5205-playbook-generic-strategy-vs-structure-knowledge',
      familyId: 'tr5205-generic-strategy-vs-structure-knowledge',
      familyLabel: 'Generic Comprehension Drills Without Text Structure or Background Knowledge',
      title: 'Ground K–6 Comprehension in Text Structure and Topic Knowledge',
      recognitionCue: 'A comprehension question shows students who decode accurately but struggle to summarize or infer meaning from an informational or literary passage, and distractors offer isolated "skill-of-the-week" worksheets on random short snippets.',
      repairQuestion: 'Does this lesson activate or build essential topic knowledge and teach how the text\'s structure organizes ideas rather than drilling a generic strategy in a vacuum?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify distractors that treat comprehension strategies (main idea, predicting, sequencing) as content-free drills disconnected from text complexity, genre structure, or background knowledge.',
          requiredOutput: 'Distinguish what the student is missing—topic vocabulary, text-structure awareness, or sentence-level cohesion—from generic strategy labels.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Pair coherent knowledge-building text sets with explicit modeling of narrative story grammar or informational structures (cause-effect, compare-contrast, problem-solution, sequence) and text-dependent questioning.',
          requiredOutput: 'Outline how a teacher moves from brief background activation → explicit signal-word and structure modeling → text-evidence discussion.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Design a focused comprehension scaffold for a third-grade cause-and-effect science text on watershed erosion where students list random facts instead of explaining why erosion happens.',
          requiredOutput: 'Specify the graphic organizer matched to cause-and-effect, two text-dependent questions, and one sentence-level cohesion check (such as tracking pronouns or "consequently").'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Return to a literary comprehension item where fourth graders miss a character\'s motivation despite fluent reading and choose the highest-leverage instructional move.',
          requiredOutput: 'Select the option integrating story-grammar analysis, key inference cues, and collaborative text-based evidence while rejecting generic main-idea worksheets.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'tr5205-playbook-screener-diagnostic-and-writing-conventions',
      familyId: 'tr5205-screener-diagnostic-and-writing-conventions',
      familyLabel: 'Confusing Screening with Diagnostic Data and Isolating Writing Conventions',
      title: 'Match Assessment Purpose and Integrate Elementary Reading-Writing Instruction',
      recognitionCue: 'An assessment or writing prompt invites you to group students for specific phonics or writing lessons straight from a single universal screener, or to red-pen spelling errors without teaching sentence structure, genre moves, or source evidence.',
      repairQuestion: 'Are we using the right assessment type for the instructional decision (screener vs. diagnostic vs. progress monitoring) and separating writing mechanics from idea organization?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check whether the scenario misuses a broad screening benchmark to diagnose exact skill deficits or conflates transcription skills (handwriting, spelling, punctuation) with composition quality.',
          requiredOutput: 'Label both the intended assessment purpose and the specific writing dimension (transcription vs. composition) described in the prompt.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Map the assessment workflow (universal screener flags risk → diagnostic probe pinpoints subskills → progress monitoring tracks response) and connect explicit writing routines (sentence combining, mentor genres, evidence use) back to reading.',
          requiredOutput: 'Write one diagnostic follow-up rule for reading/writing risk and one rubric split separating conventions from content/organization.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Review a fifth-grade opinion paragraph with strong text evidence and clear reasoning but frequent spelling and comma errors, alongside a screener score placing the student below benchmark.',
          requiredOutput: 'Specify the targeted diagnostic check needed for transcription, one sentence-combining/editing mini-lesson, and why you preserve the student\'s compositional score separately.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new elementary scenario asking how a teacher should respond after universal screening flags four students and source-based writing drafts lack clear transitions.',
          requiredOutput: 'Pick the choice that pairs diagnostic subskill follow-up with explicit genre/sentence-level writing instruction tied to classroom texts.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const reading_specialist_5302 = {
  misconceptionFamilies: [
    {
      id: 'read5302-screener-vs-diagnostic-triangulation',
      label: 'Over-Interpreting a Single Screener Without Diagnostic Triangulation',
      description: 'Treating one universal screening score as sufficient to assign a specific intervention target, exit a student, or recommend special-education referral without evaluating reliability, validity, standard error of measurement, and convergent diagnostic probes.',
      remediationMove: 'Use universal screeners strictly to flag risk, verify technical adequacy (sensitivity, specificity, reliability, SEM), and triangulate with targeted diagnostic assessments and authentic classroom literacy work before finalizing placement.',
      remediationPlaybookId: 'read5302-playbook-screener-vs-diagnostic-triangulation',
      itemIds: [
        'read5302-b1-050',
        'read5302-b1-051',
        'read5302-b1-052',
        'read5302-b1-053',
        'read5302-b1-054',
        'read5302-b1-055',
        'read5302-b1-056',
        'read5302-b1-057',
        'read5302-b1-058',
        'read5302-b1-059',
        'read5302-b1-060',
        'read5302-b1-061'
      ]
    },
    {
      id: 'read5302-tier-dosage-and-fidelity-drift',
      label: 'Misaligning Tier 1 Core, Tier 2/3 Dosage, and Implementation Fidelity',
      description: 'Flooding Tier 2 and Tier 3 pull-out interventions when weak Tier 1 core instruction is failing the majority of students, or abandoning an intervention before verifying administration fidelity, group size, instructional explicitness, and progress-monitoring slope.',
      remediationMove: 'Audit Tier 1 health first (if under ~80% of students meet benchmark, strengthen core instruction), then match Tier 2/3 dosage, group size, and fidelity checks to longitudinal progress-monitoring trends.',
      remediationPlaybookId: 'read5302-playbook-tier-dosage-and-fidelity-drift',
      itemIds: [
        'read5302-b1-001',
        'read5302-b1-004',
        'read5302-b1-006',
        'read5302-b1-007',
        'read5302-b1-050',
        'read5302-b1-051',
        'read5302-b1-054',
        'read5302-b1-055',
        'read5302-b1-056',
        'read5302-b1-059'
      ]
    },
    {
      id: 'read5302-directive-vs-collaborative-coaching',
      label: 'Directive Evaluative Mandates Instead of Collaborative Literacy Coaching',
      description: 'Positioning the reading specialist as an administrative evaluator who mandates compliance fixes or delivers one-shot workshops instead of building trust, clarifying non-evaluative coaching roles, co-analyzing student evidence, and sustaining job-embedded coaching cycles.',
      remediationMove: 'Establish clear, confidential, non-evaluative coaching norms first; anchor modeling and co-teaching in teacher-identified goals and student literacy evidence; and close every observation with collaborative reflection.',
      remediationPlaybookId: 'read5302-playbook-directive-vs-collaborative-coaching',
      itemIds: [
        'read5302-b1-081',
        'read5302-b1-084',
        'read5302-b1-085',
        'read5302-b1-086',
        'read5302-b1-087',
        'read5302-b1-088',
        'read5302-b1-089',
        'read5302-b1-090',
        'read5302-b1-091',
        'read5302-b1-092'
      ]
    },
    {
      id: 'read5302-decoding-vs-language-comp-profile',
      label: 'Collapsing Word Recognition and Language Comprehension into One Profile',
      description: 'Prescribing generic comprehension strategy practice to a student whose reading failure stems from phonological or word-recognition deficits (such as a dyslexia profile), or assigning phonics drills to an accurate decoder whose breakdown lies in oral language, vocabulary, or syntax.',
      remediationMove: 'Disaggregate every struggling reader\'s profile using the Simple View of Reading (Word Recognition × Language Comprehension) and target the exact breakdown strand—or both strands for a mixed profile—with matched intervention.',
      remediationPlaybookId: 'read5302-playbook-decoding-vs-language-comp-profile',
      itemIds: [
        'read5302-b1-001',
        'read5302-b1-002',
        'read5302-b1-003',
        'read5302-b1-004',
        'read5302-b1-005',
        'read5302-b1-006',
        'read5302-b1-007',
        'read5302-b1-008',
        'read5302-b1-009',
        'read5302-b1-010',
        'read5302-b1-011',
        'read5302-b1-012'
      ]
    },
    {
      id: 'read5302-multilingual-assessment-bias',
      label: 'Mistaking Multilingual Language Difference or Assessment Bias for Disability',
      description: 'Interpreting English-only literacy tests without home-language literacy history, cross-linguistic transfer analysis, bias review, or valid accommodations—leading teams to misclassify emerging multilingual readers as having reading disabilities.',
      remediationMove: 'Examine cultural and linguistic fairness, compare literacy performance across home language and English, verify opportunity to learn, and apply construct-preserving accommodations or assistive technology before inferring a disability.',
      remediationPlaybookId: 'read5302-playbook-multilingual-assessment-bias',
      itemIds: [
        'read5302-b1-008',
        'read5302-b1-057',
        'read5302-b1-058',
        'read5302-b1-060',
        'read5302-b1-061',
        'read5302-b1-081',
        'read5302-b1-082',
        'read5302-b1-083',
        'read5302-b1-085',
        'read5302-b1-087'
      ]
    },
    {
      id: 'read5302-anecdotal-vs-systemic-program-eval',
      label: 'Judging Literacy Programs by Anecdote Instead of Systemic Outcome Evaluation',
      description: 'Declaring a schoolwide curriculum adoption, coaching model, or professional learning plan effective based on teacher satisfaction surveys, workshop attendance, or isolated success stories rather than longitudinal student outcomes, fidelity data, and subgroup equity.',
      remediationMove: 'Evaluate literacy programs and professional learning systematically across curriculum coherence, implementation fidelity, disaggregated student literacy growth, and reciprocal family-school engagement.',
      remediationPlaybookId: 'read5302-playbook-anecdotal-vs-systemic-program-eval',
      itemIds: [
        'read5302-b1-007',
        'read5302-b1-051',
        'read5302-b1-052',
        'read5302-b1-053',
        'read5302-b1-054',
        'read5302-b1-059',
        'read5302-b1-084',
        'read5302-b1-089',
        'read5302-b1-091',
        'read5302-b1-092'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'read5302-playbook-screener-vs-diagnostic-triangulation',
      familyId: 'read5302-screener-vs-diagnostic-triangulation',
      familyLabel: 'Over-Interpreting a Single Screener Without Diagnostic Triangulation',
      title: 'Triangulate Screening Risk with Diagnostic Probes and Measurement Error',
      recognitionCue: 'A case study shows one borderline universal-screening score (or a highly consistent test measuring the wrong construct), and distractors immediately place the student into Tier 3 or label a specific skill deficit without diagnostic follow-up.',
      repairQuestion: 'What can this screener legitimately tell us (risk flag only), what is its measurement error or validity limit, and which targeted diagnostic measure confirms the root cause?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Audit the scenario for overreach: using a norm-referenced screener as a diagnostic prescription, ignoring standard error of measurement (SEM) near a cut score, or mistaking high reliability for construct validity.',
          requiredOutput: 'Identify the exact psychometric error in the trap choice (purpose mismatch, SEM neglect, or reliability-vs-validity confusion).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Sequence the specialist\'s assessment chain: universal screener (high sensitivity to catch risk) → targeted diagnostic battery (phoneme analysis, pseudoword decoding, oral language) → classroom work triangulation.',
          requiredOutput: 'Write a three-step verification protocol explaining why a consistent screener can still fail validity if it samples skills unrelated to the instructional decision.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A seventh-grade screener flags a student 2 points below benchmark with an SEM of 4 points; one colleague wants immediate phonics pull-out while another wants to ignore the score.',
          requiredOutput: 'Draft the specialist\'s balanced action plan combining confidence-band interpretation, a targeted diagnostic probe, and classroom reading evidence.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a new assessment vignette comparing sensitivity/specificity trade-offs and diagnostic follow-up choices.',
          requiredOutput: 'Select the option that protects against false negatives during screening while requiring diagnostic triangulation before assigning specialized intervention.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'read5302-playbook-tier-dosage-and-fidelity-drift',
      familyId: 'read5302-tier-dosage-and-fidelity-drift',
      familyLabel: 'Misaligning Tier 1 Core, Tier 2/3 Dosage, and Implementation Fidelity',
      title: 'Protect MTSS Tier 1 Health, Intervention Dosage, and Fidelity Before Escalating',
      recognitionCue: 'School data show 45% of a grade level below benchmark—or a student shows flat Tier 2 progress after irregular sessions—and distractors propose adding more Tier 3 pull-out groups or swapping programs overnight.',
      repairQuestion: 'Is the literacy breakdown a Tier 1 core-instruction problem, an implementation-fidelity gap, or a verified non-response requiring intensified Tier 2/3 dosage?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the proportion of students below benchmark and verify whether the current tier was delivered with planned frequency, duration, group size, and protocol fidelity.',
          requiredOutput: 'Classify the vignette as a Tier 1 systemic need, a fidelity drift problem, or a genuine dosage-intensification trigger.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Connect MTSS decision rules: fortify Tier 1 core when large shares miss benchmark; verify fidelity before blaming the program; and intensify Tier 2 → Tier 3 by adjusting group size, time, explicitness, and diagnostic alignment rather than pulling students out of core.',
          requiredOutput: 'Construct a brief decision matrix mapping Tier 1 core audit, fidelity verification, and Tier 2/3 intensification levers.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze a school where 52% of fourth graders miss fall screening and one Tier 2 group met only twice weekly instead of four times due to schedule conflicts.',
          requiredOutput: 'Specify the first systemic priority for Tier 1, the immediate fidelity repair for Tier 2, and the progress-monitoring slope needed before considering Tier 3.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-examine a tiered-intervention item where a student\'s progress-monitoring trend remains flat despite documented high-fidelity Tier 2 delivery.',
          requiredOutput: 'Select the data-driven intensification move (smaller group, increased explicit dosage, sharper diagnostic alignment) and eliminate premature referral or wait-and-see distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'read5302-playbook-directive-vs-collaborative-coaching',
      familyId: 'read5302-directive-vs-collaborative-coaching',
      familyLabel: 'Directive Evaluative Mandates Instead of Collaborative Literacy Coaching',
      title: 'Lead Non-Evaluative, Job-Embedded Literacy Coaching Cycles',
      recognitionCue: 'A teacher resists a new comprehension routine or disagrees with a literacy approach, and distractors have the specialist report the teacher to the principal, take over the lesson without debriefing, or run a one-time lecture.',
      repairQuestion: 'Does this coaching move protect a non-evaluative partnership, honor adult learning principles, and anchor instructional change in shared student data?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot role-boundary violations in distractors: evaluative reporting to administrators, top-down mandates, passive demonstration lessons without teacher roles, or isolated sit-and-get workshops.',
          requiredOutput: 'Identify why the directive or evaluative distractor undermines coaching trust and instructional transfer.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Structure a job-embedded coaching cycle: clarify confidentiality and goals upfront → co-plan around student work → model with an explicit observation focus → debrief and co-teach → monitor student impact.',
          requiredOutput: 'Write one opening coaching agreement statement and one non-defensive response to an instructional disagreement.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A veteran teacher is skeptical about adding explicit morphology instruction and asks you to "just come teach it on Friday."',
          requiredOutput: 'Design a three-step collaborative modeling plan that assigns the teacher an active observation role, sets a debrief question tied to student work, and plans a co-taught follow-up.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a leadership vignette asking what must be clarified before a coaching cycle starts and which practices make literacy professional learning genuinely job-embedded.',
          requiredOutput: 'Choose the collaborative, data-anchored coaching option and rule out compliance-monitoring or one-shot workshop distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'read5302-playbook-decoding-vs-language-comp-profile',
      familyId: 'read5302-decoding-vs-language-comp-profile',
      familyLabel: 'Collapsing Word Recognition and Language Comprehension into One Profile',
      title: 'Differentiate Word-Recognition and Language-Comprehension Breakdowns',
      recognitionCue: 'Two students earn the exact same low reading-comprehension score, yet one struggles on pseudoword decoding and spelling while the other decodes fluently but falters on listening comprehension and academic vocabulary.',
      repairQuestion: 'In this learner\'s reading profile, is comprehension constrained by word recognition, by language comprehension, or by both strands simultaneously?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Disaggregate the profile cues: compare nonsense-word decoding, spelling, and oral reading accuracy against oral vocabulary, syntax, and listening comprehension.',
          requiredOutput: 'Assign the student to one of three profiles—word-recognition deficit, language-comprehension deficit, or mixed reading difficulty—citing two assessment indicators.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Match each profile to targeted intervention: explicit phonological/phonics and orthographic mapping for word-recognition needs (including dyslexia profiles), versus oral language, syntax, vocabulary, and knowledge-building instruction for language-comprehension needs.',
          requiredOutput: 'State why assigning comprehension worksheets to a decoding-limited student—or phonics drills to a fluent hyperlexic-style reader—misses the causal mechanism.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate an adolescent reader who scores at the 85th percentile on listening comprehension, 12th percentile on pseudoword decoding, and 20th percentile on silent reading comprehension.',
          requiredOutput: 'Name the primary bottleneck, specify two targeted instructional priorities (such as multisyllabic decoding and morphological word study), and identify an appropriate access accommodation.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply the Simple View disaggregation to a contrasting profile where a student decodes grade-level text at 99% accuracy yet fails inferential questions on both read-alouds and silent passages.',
          requiredOutput: 'Select the language-comprehension intervention (background knowledge, syntax, academic vocabulary, structured discourse) and eliminate phonics-only distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'read5302-playbook-multilingual-assessment-bias',
      familyId: 'read5302-multilingual-assessment-bias',
      familyLabel: 'Mistaking Multilingual Language Difference or Assessment Bias for Disability',
      title: 'Distinguish Multilingual Transfer and Test Bias from Reading Disability',
      recognitionCue: 'A multilingual reader scores low on an English reading measure containing unfamiliar cultural references or exhibits predictable L1 phonetic/syntactic transfer, and distractors rush to a learning-disability referral or strip away home-language assets.',
      repairQuestion: 'Did the team rule out cross-linguistic transfer, construct-irrelevant cultural bias, and limited English instructional exposure before attributing low scores to a reading disability?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the assessment and error pattern for construct-irrelevant cultural/linguistic load, absence of home-language comparison data, or confusion between accommodations and modifications.',
          requiredOutput: 'Flag which observed errors could reflect cross-linguistic transfer or test bias rather than an intrinsic phonological or reading disability.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Apply an asset-based, equitable evaluation framework: gather home-language literacy history, compare error patterns across languages, verify valid accommodations (such as extended time or text-to-speech when decoding is not the tested construct), and review text representation.',
          requiredOutput: 'Write a two-part checklist distinguishing a valid access accommodation from a construct-altering modification.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A Spanish-English bilingual fifth grader reads grade-level Spanish texts accurately with strong comprehension but reads English informational passages slowly with vowel-substitution errors and low vocabulary scores.',
          requiredOutput: 'Explain why this cross-linguistic contrast argues against a core reading disability and specify two asset-based instructional supports (such as cognate bridging and explicit English vowel contrasts).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fairness-review scenario where a specialist advises a school team evaluating a multilingual student and selecting assistive technology.',
          requiredOutput: 'Choose the response that integrates cross-linguistic analysis, fairness auditing, and construct-valid access supports while rejecting English-only deficit referrals.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'read5302-playbook-anecdotal-vs-systemic-program-eval',
      familyId: 'read5302-anecdotal-vs-systemic-program-eval',
      familyLabel: 'Judging Literacy Programs by Anecdote Instead of Systemic Outcome Evaluation',
      title: 'Evaluate Schoolwide Literacy Programs with Coherent Outcome and Fidelity Data',
      recognitionCue: 'A leadership prompt asks how to judge a new reading curriculum or district professional learning series, and distractors rely on teacher enjoyment ratings, attendance sheets, or one classroom\'s anecdotal praise.',
      repairQuestion: 'Does this evaluation design connect teacher implementation fidelity and curriculum coherence directly to disaggregated student literacy growth over time?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Separate surface-level reaction metrics (workshop exit smiles, participation counts, vendor testimonials) from evidence of classroom transfer and student literacy achievement.',
          requiredOutput: 'Identify the missing evidence link—implementation fidelity, curriculum alignment, or longitudinal student outcome data—in the anecdotal distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Build a multi-level literacy program evaluation loop: curriculum coherence audit → classroom implementation fidelity observations → disaggregated student benchmark/growth tracking → reciprocal family and staff feedback.',
          requiredOutput: 'List four concrete indicators that a schoolwide reading specialist team should inspect together before renewing or revising a literacy program.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'After a year-long phonics and writing PD series, 92% of teachers rated the sessions "helpful," yet second-grade decoding proficiency dropped 6 percentage points among multilingual learners.',
          requiredOutput: 'Draft the specialist\'s next evaluation steps to check classroom fidelity, vertical curriculum coherence, and subgroup instructional barriers.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a program-leadership item asking how to evaluate professional learning impact and handle staff disagreement over instructional materials.',
          requiredOutput: 'Select the systemic, student-outcome-driven evaluation response and eliminate satisfaction-only or top-down compliance distractors.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const esol_5362 = {
  misconceptionFamilies: [
    {
      id: 'esol5362-bics-mistaken-for-calp',
      label: 'Mistaking Social Fluency (BICS) for Academic Language Proficiency (CALP)',
      description: 'Assuming an English learner no longer needs language instruction—or must have a cognitive deficit—because the student speaks fluently with peers in everyday social settings while still developing context-reduced academic language (CALP), disciplinary registers, or active production after a silent period.',
      remediationMove: 'Distinguish conversational BICS (typically 1–3 years, context-embedded) from academic CALP (typically 5–7+ years, context-reduced and cognitively demanding), and pair rigorous content with sustained academic discourse scaffolds.',
      remediationPlaybookId: 'esol5362-playbook-bics-mistaken-for-calp',
      itemIds: [
        'esol5362-b1-019',
        'esol5362-b1-020',
        'esol5362-b1-021',
        'esol5362-b1-022',
        'esol5362-b1-023',
        'esol5362-b1-024',
        'esol5362-b1-025',
        'esol5362-b1-026',
        'esol5362-b1-027',
        'esol5362-b1-028',
        'esol5362-b1-029',
        'esol5362-b1-030'
      ]
    },
    {
      id: 'esol5362-l1-transfer-mistaken-for-disability',
      label: 'Mistaking L1 Transfer and Interlanguage Rules for a Language Disability',
      description: 'Misinterpreting predictable phonological transfer (such as /s/ for /ʃ/ or /r/–/l/ contrasts), morphological overgeneralizations ("goed," "two informations"), passive-voice syntactic confusion, or pragmatic register differences as speech disorders or cognitive impairments.',
      remediationMove: 'Analyze the linguistic feature (phonology, morphology, syntax, semantics, or pragmatics) as rule-governed interlanguage or L1 transfer, and provide targeted contrastive instruction and structured input/output rather than a deficit referral.',
      remediationPlaybookId: 'esol5362-playbook-l1-transfer-mistaken-for-disability',
      itemIds: [
        'esol5362-b1-001',
        'esol5362-b1-002',
        'esol5362-b1-003',
        'esol5362-b1-004',
        'esol5362-b1-005',
        'esol5362-b1-006',
        'esol5362-b1-007',
        'esol5362-b1-008',
        'esol5362-b1-009',
        'esol5362-b1-010',
        'esol5362-b1-011',
        'esol5362-b1-012'
      ]
    },
    {
      id: 'esol5362-simplifying-content-vs-scaffolding-rigor',
      label: 'Simplifying Content Rigor Instead of Scaffolding Academic Language Access',
      description: 'Lowering grade-level conceptual demands, removing disciplinary reasoning, or assigning isolated grammar worksheets when texts have dense nominalizations and complex syntax—instead of keeping grade-level content objectives intact with purposeful language scaffolds.',
      remediationMove: 'Maintain the grade-level content objective, write an explicit companion language objective aligned to the task\'s language function, and deploy comprehensible-input scaffolds (visuals, graphic organizers, sentence frames, collaborative tasks, strategic L1 support).',
      remediationPlaybookId: 'esol5362-playbook-simplifying-content-vs-scaffolding-rigor',
      itemIds: [
        'esol5362-b1-041',
        'esol5362-b1-042',
        'esol5362-b1-043',
        'esol5362-b1-044',
        'esol5362-b1-045',
        'esol5362-b1-046',
        'esol5362-b1-047',
        'esol5362-b1-048',
        'esol5362-b1-049',
        'esol5362-b1-050',
        'esol5362-b1-051',
        'esol5362-b1-052'
      ]
    },
    {
      id: 'esol5362-lau-castaneda-plyler-compliance',
      label: 'Violating Federal Civil-Rights Obligations Under Lau, Castañeda, and Plyler',
      description: 'Treating "sink-or-swim" mainstreaming without language services, unmonitored parent opt-outs, prolonged segregation of English learners, unverified vendor programs, or inquiries into immigration status as permissible local practice.',
      remediationMove: 'Apply the legal compliance screen on every policy or advocacy vignette: Lau requires affirmative meaningful access, Castañeda requires sound theory + adequate resources + evaluated effectiveness, Plyler bars immigration-status barriers, and opt-out students still require ELP monitoring and classroom access.',
      remediationPlaybookId: 'esol5362-playbook-lau-castaneda-plyler-compliance',
      itemIds: [
        'esol5362-b1-090',
        'esol5362-b1-091',
        'esol5362-b1-092',
        'esol5362-b1-093',
        'esol5362-b1-094',
        'esol5362-b1-095',
        'esol5362-b1-096',
        'esol5362-b1-097',
        'esol5362-b1-098',
        'esol5362-b1-099',
        'esol5362-b1-100',
        'esol5362-b2-090'
      ]
    },
    {
      id: 'esol5362-receptive-vs-productive-assessment-validity',
      label: 'Conflating Language Load with Content Mastery and Misaligning Modalities',
      description: 'Inferring content mastery or speaking ability from a culturally biased or reading-heavy test, collapsing divergent listening/speaking/reading/writing domain profiles into one composite label, or using vague subjective rubrics that break rater reliability.',
      remediationMove: 'Match assessment modality directly to the stated objective, separate content mastery from English language load through valid accommodations, disaggregate receptive versus productive domains, and score performance tasks with analytic criteria.',
      remediationPlaybookId: 'esol5362-playbook-receptive-vs-productive-assessment-validity',
      itemIds: [
        'esol5362-b1-064',
        'esol5362-b1-065',
        'esol5362-b1-066',
        'esol5362-b1-067',
        'esol5362-b1-068',
        'esol5362-b1-069',
        'esol5362-b1-070',
        'esol5362-b1-071',
        'esol5362-b1-072',
        'esol5362-b1-073',
        'esol5362-b1-074',
        'esol5362-b1-075'
      ]
    },
    {
      id: 'esol5362-deficit-cultural-framing-vs-asset-access',
      label: 'Deficit Cultural Framing Instead of Asset-Based Multilingual Family Access',
      description: 'Interpreting culturally variable interaction norms (such as indirect eye contact, discourse turn-taking, or low attendance at unconsulted English-only meetings) as apathy, stereotyping shared-language groups, or sharing private family data without consent.',
      remediationMove: 'Reframe cultural and linguistic variation as classroom assets (funds of knowledge), recognize within-group diversity, guarantee qualified interpretation/translation for vital school communications, and protect student and family privacy.',
      remediationPlaybookId: 'esol5362-playbook-deficit-cultural-framing-vs-asset-access',
      itemIds: [
        'esol5362-b1-079',
        'esol5362-b1-080',
        'esol5362-b1-081',
        'esol5362-b1-082',
        'esol5362-b1-083',
        'esol5362-b1-084',
        'esol5362-b1-085',
        'esol5362-b1-086',
        'esol5362-b1-087',
        'esol5362-b1-088',
        'esol5362-b1-089',
        'esol5362-b2-079'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'esol5362-playbook-bics-mistaken-for-calp',
      familyId: 'esol5362-bics-mistaken-for-calp',
      familyLabel: 'Mistaking Social Fluency (BICS) for Academic Language Proficiency (CALP)',
      title: 'Distinguish Conversational BICS from Academic CALP and Silent-Period Growth',
      recognitionCue: 'A student chats easily at lunch yet struggles to write a science claim—or a newcomer stays silent in whole-group talk while following routines—and distractors propose exiting ESOL services, lowering expectations, or referring for a learning disability.',
      repairQuestion: 'Is the task context-embedded social speech (BICS) or context-reduced academic discourse (CALP), and how can we scaffold comprehensible input and structured output without penalizing normal SLA timelines?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Locate the contrast between everyday interpersonal interaction and disciplinary academic demands (or between receptive comprehension and delayed oral production during a silent period).',
          requiredOutput: 'Classify the learner\'s current strength and bottleneck using BICS/CALP and Cummins\'s context-embedded vs. context-reduced quadrants.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Explain why fluent social talk does not signal mastery of academic syntax, nominalizations, or evidence-based justification, and why forcing premature public speaking raises the affective filter.',
          requiredOutput: 'Write two targeted classroom moves: one for supporting a newcomer in the silent period and one for bridging BICS to CALP in a content lab.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A seventh-grade English learner debates sports fluently with peers but writes fragmented explanations on a heat-transfer lab report without causal connectors.',
          requiredOutput: 'Design an interactive information-gap or structured-talk routine plus an academic sentence-frame progression that builds CALP without simplifying the science concept.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read a second-language-acquisition vignette involving uneven oral fluency, affective-filter anxiety, or cognates/false cognates and choose the soundest pedagogical response.',
          requiredOutput: 'Select the option that sustains explicit academic language scaffolding and low-anxiety interaction while rejecting premature ESOL exit or deficit labels.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'esol5362-playbook-l1-transfer-mistaken-for-disability',
      familyId: 'esol5362-l1-transfer-mistaken-for-disability',
      familyLabel: 'Mistaking L1 Transfer and Interlanguage Rules for a Language Disability',
      title: 'Diagnose L1 Transfer and Interlanguage Patterns Accurately Across Linguistic Domains',
      recognitionCue: 'A learner says "sip" for "ship," writes "two informations" or "goed," misreads passive voice, or interprets an indirect request literally, and distractors label the error as random carelessness or a speech-language disability.',
      repairQuestion: 'Which specific linguistic subsystem (phonology, morphology, syntax, semantics, or pragmatics) explains this systematic pattern as normal L1 transfer or developmental interlanguage?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Pinpoint the exact linguistic domain behind the learner\'s utterance—minimal-pair phonology, inflectional/derivational morphology, passive syntax, count/noncount grammar, or indirect pragmatic speech acts.',
          requiredOutput: 'Name the linguistic domain and state whether the error reflects L1 transfer, developmental overgeneralization, or pragmatic register mismatch.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Match each linguistic error type to targeted ESOL instruction (minimal-pair auditory/articulatory practice, morphological word-family mapping, active-vs-passive agent tracing, or explicit pragmatic register comparison) rather than clinical pathology.',
          requiredOutput: 'Draft a one-sentence contrastive explanation plus one brief practice task for a phonology transfer error and a morphology overgeneralization error.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Analyze three learner samples: (a) pronouncing "rice" and "lice" identically, (b) writing "The cat was chased by the dog" as the cat doing the chasing, and (c) answering "Can you open the window?" with "Yes, I can" without moving.',
          requiredOutput: 'Map each sample to its linguistic concept (phonemic contrast, passive syntax, indirect speech act/pragmatics) and name the best instructional follow-up.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh linguistics item where a student produces systematic plural allomorph or reduced-speech listening errors ("gonna" for "going to").',
          requiredOutput: 'Choose the precise linguistic explanation and targeted instructional support while ruling out disability or rote-punishment distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'esol5362-playbook-simplifying-content-vs-scaffolding-rigor',
      familyId: 'esol5362-simplifying-content-vs-scaffolding-rigor',
      familyLabel: 'Simplifying Content Rigor Instead of Scaffolding Academic Language Access',
      title: 'Scaffold Grade-Level Content Rigor Through Paired Language Objectives',
      recognitionCue: 'A content teacher hands over a dense chapter or asks the ESOL teacher to "make an easier version," and distractors delete higher-order reasoning, assign silent copying, or isolate vocabulary from the unit\'s communicative purpose.',
      repairQuestion: 'How do we keep the grade-level cognitive demand intact while engineering explicit language objectives, visuals, and four-domain scaffolds that make the content accessible?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect the instructional options for rigor erosion: stripping away justification/comparison thinking, replacing inquiry with recall worksheets, or teaching transitions out of context.',
          requiredOutput: 'Contrast one content-watering distractor with the actual language barrier in the text (such as nominalizations, assumed local background, or academic discourse frames).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Pair every grade-level content objective with a measurable language objective naming the language function, domain (listening/speaking/reading/writing), and scaffold, plus strategic L1/tech supports that promote transfer.',
          requiredOutput: 'Write one paired content + language objective for a geometry or science justification lesson that varies scaffolds by proficiency level without lowering the standard.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Redesign a unit that currently relies on silent textbook reading and selected-response quizzes on water policy for a mixed-proficiency class.',
          requiredOutput: 'Specify three integrated upgrades: background-knowledge activation, prioritized Tier 2/3 vocabulary, and a purposeful four-domain collaborative task with flexible grouping.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply the scaffold-don\'t-simplify rule to a co-planning item involving an IEP accommodation or translation/speech tool during collaborative science inquiry.',
          requiredOutput: 'Select the option that preserves rigorous grade-level reasoning with structured language access and rejects passive or simplified-content distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'esol5362-playbook-lau-castaneda-plyler-compliance',
      familyId: 'esol5362-lau-castaneda-plyler-compliance',
      familyLabel: 'Violating Federal Civil-Rights Obligations Under Lau, Castañeda, and Plyler',
      title: 'Apply Lau, Castañeda, and Plyler Civil-Rights Protections to School Policy',
      recognitionCue: 'A school places newcomers in mainstream classes with zero language support, drops monitoring after a parent opt-out, segregates English learners all day, or lets an outside partner request immigration histories.',
      repairQuestion: 'Which federal civil-rights standard (Lau meaningful access, Castañeda three-prong evaluation, Plyler enrollment/privacy protection, or FERPA confidentiality) governs this scenario?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Identify the specific compliance or ethical breach in the vignette: identical sink-or-swim treatment, unverified program efficacy, unnecessary segregation, opt-out abandonment, or improper disclosure of student status.',
          requiredOutput: 'Match the scenario\'s red flag to the exact governing legal principle (Lau v. Nichols, Castañeda v. Pickard, Plyler v. Doe, or FERPA).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Review the non-negotiable compliance rules: (1) Lau forbids sink-or-swim; (2) Castañeda requires research-based theory, sufficient resources/staff, and outcome-based evaluation; (3) Plyler guarantees free public schooling regardless of immigration status; (4) opt-out families still receive annual ELP assessment and meaningful grade-level access.',
          requiredOutput: 'Write one concrete corrective action a teacher or ESOL advocate must take for each of the four legal mandates.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Evaluate two district dilemmas: (a) a district claims ESOL success solely because families enjoyed an annual cultural festival, and (b) a tutoring partner asks for student proficiency scores and immigration histories.',
          requiredOutput: 'State which Castañeda prong fails in (a), which legal/privacy protections block the request in (b), and the compliant alternative for both.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Resolve a new advocacy vignette involving underrepresented multilingual learners in advanced coursework or a parent opting out of pull-out ESOL services.',
          requiredOutput: 'Pick the legally compliant, equity-expanding advocacy response and explain why passive compliance or exclusionary practices violate federal obligations.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'esol5362-playbook-receptive-vs-productive-assessment-validity',
      familyId: 'esol5362-receptive-vs-productive-assessment-validity',
      familyLabel: 'Conflating Language Load with Content Mastery and Misaligning Modalities',
      title: 'Protect Construct Validity and Modality Alignment in ESOL Assessment',
      recognitionCue: 'An assessment item uses a reading subtest to judge oral collaboration, packs unrelated cultural trivia into a vocabulary quiz, averages discrepant speaking and writing scores into one level, or uses a "good/fair/poor" rubric.',
      repairQuestion: 'Does this test actually measure the target construct and modality without construct-irrelevant cultural/linguistic interference, and will two raters score it reliably?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Distinguish validity threats (cultural trivia, modality mismatch, over-generalizing from one subtest) from reliability threats (vague holistic labels causing inter-rater drift) and profile masking (single composite scores hiding domain splits).',
          requiredOutput: 'Diagnose whether the item\'s central assessment flaw is construct validity, inter-rater reliability, or domain-profile aggregation.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Align assessment design to purpose: match receptive/productive tasks to the objective, allow construct-preserving accommodations (such as text-to-speech when assessing science knowledge rather than decoding), and build analytic rubrics with observable descriptors.',
          requiredOutput: 'Write a quick three-question ESOL assessment audit covering objective-modality match, accommodation validity, and analytic feedback.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'A student scores Level 4 in listening/reading but Level 2 in speaking/writing, and a teacher plans an oral scientific-claim assessment using a 3-word scale ("good, fair, poor").',
          requiredOutput: 'Explain why instruction must differentiate by domain rather than composite level, and rewrite two analytic rubric criteria that improve inter-rater reliability and formative next steps.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-analyze a portfolio or formative-assessment item comparing polished teacher-only work folders against growth-documented student-involved portfolios.',
          requiredOutput: 'Select the valid, reliable assessment practice that captures authentic language growth across modalities and informs immediate instructional adjustments.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'esol5362-playbook-deficit-cultural-framing-vs-asset-access',
      familyId: 'esol5362-deficit-cultural-framing-vs-asset-access',
      familyLabel: 'Deficit Cultural Framing Instead of Asset-Based Multilingual Family Access',
      title: 'Replace Cultural Deficit Assumptions with Asset-Based, Equitable Family Access',
      recognitionCue: 'Staff interpret avoiding eye contact, preferring collaborative talk over direct debate, or missing an unconsulted evening meeting as disrespect or apathy—or rely on a child to translate placement documents.',
      repairQuestion: 'Are we interpreting cultural variation through a narrow deficit lens, or are we recognizing within-group diversity, leveraging funds of knowledge, and removing structural language barriers for families?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot four cultural-competence traps in distractors: deficit stereotyping, assuming cultural homogeneity within a language group, tokenizing hardship-only texts, or placing translation burdens on students.',
          requiredOutput: 'Name the specific cultural assumption or structural access barrier embedded in the flawed choice.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Anchor classroom and family practices in culturally sustaining pedagogy: honor funds of knowledge, co-construct inclusive discussion norms across communication styles, and guarantee qualified adult interpreters and translated placement notices.',
          requiredOutput: 'Write one classroom norm-setting strategy that validates both direct and indirect participation styles, plus one legally and ethically sound family-communication protocol.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Review a scenario where curriculum texts portray a student community only through poverty and migration hardship, and caregivers miss a Tuesday 6:00 p.m. meeting announced only in English.',
          requiredOutput: 'Propose one culturally sustaining text-set revision that reflects community expertise and two barrier-removing outreach steps co-planned with families.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Return to a cross-cultural miscommunication item where a teacher\'s brief written feedback feels like rejection to a family or where a student declines sharing personal migration stories.',
          requiredOutput: 'Select the respectful, student-agency-preserving and reciprocal-communication response while rejecting deficit or intrusive distractors.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

const early_childhood_5025 = {
  misconceptionFamilies: [
    {
      id: 'ec5025-phonological-continuum-order',
      label: 'Reversing the Early-Childhood Phonological Awareness Continuum',
      description: 'Assigning advanced phoneme manipulation (deletion or substitution) before PreK–K children build word awareness, rhyming, syllable blending/segmenting, and onset-rime—or conflating auditory phonological tasks with print-based phonics drills.',
      remediationMove: 'Sequence early-childhood sound instruction from large spoken units to single phonemes (word → syllable/rhyme → onset-rime → phoneme isolation → blending/segmenting → manipulation) and keep oral awareness distinct from letter-sound print tasks.',
      remediationPlaybookId: 'ec5025-playbook-phonological-continuum-order',
      itemIds: [
        'ec5025-b1-001',
        'ec5025-b1-002',
        'ec5025-b1-003',
        'ec5025-b1-004',
        'ec5025-b1-005',
        'ec5025-b1-006',
        'ec5025-b1-007',
        'ec5025-b1-008',
        'ec5025-b1-009',
        'ec5025-b1-010',
        'ec5025-b1-011',
        'ec5025-b1-012'
      ]
    },
    {
      id: 'ec5025-rote-counting-vs-cardinality-place-value',
      label: 'Mistaking Rote Counting and Procedure Recall for Cardinality and Place-Value Reasoning',
      description: 'Assuming a young child who recites number names in sequence has mastered one-to-one correspondence, cardinality (the final count names the set total), or base-ten grouping—and overlooking conceptual fraction, ratio, integer, and equation reasoning in early-childhood math.',
      remediationMove: 'Verify conceptual number sense through concrete manipulatives and set-total questions ("How many altogether?"), build tens-and-ones regrouping visibly, and check numerical operations with benchmark estimation and equivalent representations.',
      remediationPlaybookId: 'ec5025-playbook-rote-counting-vs-cardinality-place-value',
      itemIds: [
        'ec5025-b1-031',
        'ec5025-b1-032',
        'ec5025-b1-033',
        'ec5025-b1-034',
        'ec5025-b1-035',
        'ec5025-b1-036',
        'ec5025-b1-037',
        'ec5025-b1-038',
        'ec5025-b1-039',
        'ec5025-b1-040',
        'ec5025-b1-041',
        'ec5025-b1-042'
      ]
    },
    {
      id: 'ec5025-non-defining-vs-defining-attributes',
      label: 'Confusing Non-Defining Visual Features with Defining Geometric Attributes',
      description: 'Allowing size, color, or orientation to govern shape classification (such as rejecting a tilted triangle or claiming a square is not a rectangle), or mixing up perimeter versus area, angle relationships, coordinate positions, and map-scale properties.',
      remediationMove: 'Anchor geometry and spatial reasoning strictly in defining attributes (number of sides, closed figures, right angles, parallel sides) across varied orientations, and separate linear boundary measures (perimeter) from square-unit coverage (area).',
      remediationPlaybookId: 'ec5025-playbook-non-defining-vs-defining-attributes',
      itemIds: [
        'ec5025-b1-031',
        'ec5025-b1-033',
        'ec5025-b1-036',
        'ec5025-b1-037',
        'ec5025-b1-038',
        'ec5025-b1-039',
        'ec5025-b1-040',
        'ec5025-b1-041',
        'ec5025-b1-042',
        'ec5025-b1-058'
      ]
    },
    {
      id: 'ec5025-confounded-variables-early-science',
      label: 'Confounding Variables and Conflating Observation with Inference in Early Science',
      description: 'Changing two factors at once during a classroom plant, ramp, or melting investigation (invalidating a fair test), or misclassifying a child\'s causal explanation ("it melted because of the sunny window") as a direct sensory observation rather than an inference.',
      remediationMove: 'Enforce fair-test control (change only one independent variable while keeping all other conditions constant) and explicitly separate direct sensory observations ("there is water in the tray") from evidence-based inferences.',
      remediationPlaybookId: 'ec5025-playbook-confounded-variables-early-science',
      itemIds: [
        'ec5025-b1-070',
        'ec5025-b1-071',
        'ec5025-b1-072',
        'ec5025-b1-073',
        'ec5025-b1-074',
        'ec5025-b1-075',
        'ec5025-b1-076',
        'ec5025-b1-077',
        'ec5025-b1-078',
        'ec5025-b1-079',
        'ec5025-b1-080',
        'ec5025-b1-081'
      ]
    },
    {
      id: 'ec5025-teacher-craft-vs-process-art-dap',
      label: 'Teacher-Directed Cookie-Cutter Crafts Instead of Process Art and DAP Inquiry',
      description: 'Selecting identical template-based crafts, passive coloring sheets, or rote adult-scripted skits instead of open-ended process art, expressive music/dramatic play, visual-art element exploration, and developmentally appropriate social-cultural learning.',
      remediationMove: 'Choose open-ended creative experiences where children explore visual elements (texture, line, color), musical beat/pitch, dramatic perspective-taking, and authentic family/community contexts with meaningful child choice.',
      remediationPlaybookId: 'ec5025-playbook-teacher-craft-vs-process-art-dap',
      itemIds: [
        'ec5025-b1-056',
        'ec5025-b1-059',
        'ec5025-b1-064',
        'ec5025-b1-065',
        'ec5025-b1-090',
        'ec5025-b1-091',
        'ec5025-b1-092',
        'ec5025-b1-093',
        'ec5025-b1-094',
        'ec5025-b1-095'
      ]
    },
    {
      id: 'ec5025-passive-elimination-pe-vs-inclusive-motor',
      label: 'Passive Elimination PE Games Instead of Inclusive Motor Play and Child Safety',
      description: 'Choosing competitive elimination games or long single-file relay lines that sideline young children and reduce active movement time, or overlooking developmental motor sequencing (locomotor, non-locomotor, manipulative) and mandatory child-safety reporting.',
      remediationMove: 'Design non-elimination, high-participation movement activities scaled to children\'s developmental motor progression, integrate daily nutrition/hygiene habits, and follow immediate mandated-reporting protocols for any child-safety disclosure.',
      remediationPlaybookId: 'ec5025-playbook-passive-elimination-pe-vs-inclusive-motor',
      itemIds: [
        'ec5025-b1-084',
        'ec5025-b1-085',
        'ec5025-b1-086',
        'ec5025-b1-087',
        'ec5025-b1-088',
        'ec5025-b1-089',
        'ec5025-b1-090',
        'ec5025-b1-091',
        'ec5025-b1-094',
        'ec5025-b1-095'
      ]
    }
  ],
  misconceptionRemediationPlaybooks: [
    {
      id: 'ec5025-playbook-phonological-continuum-order',
      familyId: 'ec5025-phonological-continuum-order',
      familyLabel: 'Reversing the Early-Childhood Phonological Awareness Continuum',
      title: 'Sequence PreK–2 Sound Awareness Along the Phonological Continuum',
      recognitionCue: 'A PreK or Kindergarten child cannot clap syllables or blend onset-rime ("/b/ + /at/"), yet distractors jump straight to phoneme substitution worksheets or letter-name flashcards.',
      repairQuestion: 'Which spoken sound unit sits immediately next on the developmental ladder above what the child can already do, and is the activity appropriately oral before print is introduced?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check the developmental level of every answer choice against the child\'s current performance so you spot choices that skip prerequisite sound units or slip print into an auditory task.',
          requiredOutput: 'Identify the skipped developmental step in the distractor and name the child\'s exact target level (word, syllable/rhyme, onset-rime, or phoneme).'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Order the full early-childhood progression (word awareness → rhyme & syllable blending/segmenting → onset-rime → initial/final phoneme isolation → full phoneme blending/segmenting → phoneme manipulation) and clarify how the alphabetic principle bridges to print.',
          requiredOutput: 'Write one playful 2-minute oral routine for onset-rime blending and one for phoneme segmentation using manipulatives without letter cards.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Sort four classroom prompts from earliest to most advanced: deleting /s/ from "stop," counting spoken words in "The dog ran," blending /m/ + /ap/, and segmenting the three sounds in "sun."',
          requiredOutput: 'Place all four tasks in exact developmental sequence and specify which task fits a Kindergartner who just mastered syllable clapping.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read an early-childhood emergent-literacy item asking to distinguish phonological from phonemic awareness or pick a phoneme-manipulation probe.',
          requiredOutput: 'Select the developmentally sequenced oral response and explain why premature print or advanced deletion choices are traps.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ec5025-playbook-rote-counting-vs-cardinality-place-value',
      familyId: 'ec5025-rote-counting-vs-cardinality-place-value',
      familyLabel: 'Mistaking Rote Counting and Procedure Recall for Cardinality and Place-Value Reasoning',
      title: 'Verify Cardinality, Place-Value Grouping, and Non-Calculator Number Sense',
      recognitionCue: 'A child recites "1 to 20" accurately yet recounts the entire group when asked "How many bears are there?"—or a non-calculator math item tempts you to add fraction denominators directly or ignore place-value/ratio equivalence.',
      repairQuestion: 'Does the learner demonstrate true quantity meaning (one-to-one tagging, cardinality, tens-and-ones grouping, or common-unit fraction/ratio reasoning) rather than surface recitation?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot the gap between surface fluency and conceptual number sense—such as rote counting without cardinality, digit-by-digit place-value confusion, or combining unlike fraction denominators (3/4 + 2/3 → 5/7).',
          requiredOutput: 'Name the exact conceptual misconception (cardinality, base-ten regrouping, or common-unit equivalence) hidden inside the tempting distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Ground every quantitative concept in concrete or visual models: touch-and-slide counters for cardinality, ten-frames and base-ten blocks for place value, and common-unit area models for fraction and ratio calculations.',
          requiredOutput: 'Show both the conceptual model and the exact non-calculator verification check for one cardinality task and one fraction/ratio problem (such as 3/4 + 2/3 = 17/12).'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Diagnose a first grader who writes "104" for fourteen and solve a companion content check (solving 4x − 7 = 21 and finding a 25% discount on a $48 backpack) without a calculator.',
          requiredOutput: 'Explain the tens-and-ones misconception behind "104" with a base-ten bundle activity, and verify both content answers with inverse/benchmark checks.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Tackle a fresh early-childhood math scenario combining number-sense diagnostics with non-calculator ratio or signed-number reasoning.',
          requiredOutput: 'Select the conceptually grounded instructional step or exact verified calculation and rule out rote-drill or unlike-unit traps.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ec5025-playbook-non-defining-vs-defining-attributes',
      familyId: 'ec5025-non-defining-vs-defining-attributes',
      familyLabel: 'Confusing Non-Defining Visual Features with Defining Geometric Attributes',
      title: 'Separate Defining Geometric Attributes from Orientation, Size, and Surface Labels',
      recognitionCue: 'A child insists a rotated triangle is "upside down, not a triangle" or says a square cannot be a rectangle—or a measurement problem mixes up rectangular perimeter with area or misreads triangle area without dividing by 2.',
      repairQuestion: 'Which attributes are mathematically defining (side count, closed boundary, right angles, parallel sides, linear vs. square units) and which visual traits are irrelevant?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Check whether an answer choice relies on a prototype picture (horizontal base, specific color/size) or swaps a 1D perimeter formula with a 2D area formula (or forgets 1/2 in triangle area).',
          requiredOutput: 'Separate the defining geometric/measurement property from the non-defining visual distractor in the prompt.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Use non-prototypical examples (scalene, obtuse, and rotated triangles; tilted squares as special rectangles) and pair unit-checks (units for perimeter, square units for area, 180 degrees for supplementary angles) with map-scale/coordinate reading.',
          requiredOutput: 'Write a two-line classification rule explaining why every square is a rectangle and how perimeter, area, and supplementary angles are distinguished.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Design a sorting activity for second graders who reject a narrow rotated triangle, then verify a measurement check for a triangle with base 10 units and height 6 units alongside two supplementary angles on a straight line.',
          requiredOutput: 'Describe the varied shape set and defining-attribute questions for the class, and verify the triangle area (30 square units) and straight-line angle sum (180 degrees).'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Apply defining-attribute and spatial reasoning to a coordinate-grid distance or maps-vs-globes distortion item.',
          requiredOutput: 'Pick the choice grounded in invariant geometric/spatial properties and eliminate orientation-biased or formula-swapped distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ec5025-playbook-confounded-variables-early-science',
      familyId: 'ec5025-confounded-variables-early-science',
      familyLabel: 'Confounding Variables and Conflating Observation with Inference in Early Science',
      title: 'Enforce Fair-Test Variable Control and Observation-vs-Inference Clarity',
      recognitionCue: 'A kindergarten plant test changes both sunlight and water amount at the same time—or a child says "the ice melted because it was near the sunny window" and a distractor labels that causal guess a direct observation.',
      repairQuestion: 'Did we change exactly one variable while holding every other condition constant, and is the child\'s statement directly sensed (observation) or an explanation drawn from evidence (inference)?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Inspect early-science vignettes for two classic errors: multiple variables changing simultaneously in one trial, or causal language ("because," "probably") mislabeled as pure sensory observation.',
          requiredOutput: 'Identify the confounded variable pair or flag the exact causal phrase that converts an observation into an inference.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Establish the fair-test rule for young investigators ("change one thing, keep everything else the same, measure what happens") and pair it with a two-column chart separating "What I see/feel" from "What I think caused it."',
          requiredOutput: 'Rewrite a confounded ramp or plant experiment into a valid fair test naming the single changed variable, two controlled constants, and the observed outcome.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Respond to a child who says, "The ice probably melted because the tray was near the sunny window," and evaluate a student claim that winter occurs because Earth moves farther from the Sun.',
          requiredOutput: 'Classify the ice statement as an inference requiring a fair test (sunlit vs. shaded identical ice trays) and correct the seasons misconception using Earth\'s axial tilt.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Solve a fresh early-science inquiry item about weather vs. climate patterns or properties/changes of matter.',
          requiredOutput: 'Choose the evidence-based, fair-test-aligned statement and rule out confounded designs or unverified causal assumptions.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ec5025-playbook-teacher-craft-vs-process-art-dap',
      familyId: 'ec5025-teacher-craft-vs-process-art-dap',
      familyLabel: 'Teacher-Directed Cookie-Cutter Crafts Instead of Process Art and DAP Inquiry',
      title: 'Choose Process Art, Expressive Arts Vocabulary, and DAP Inquiry Over Crafts',
      recognitionCue: 'An early-childhood arts or social-studies prompt offers a neat hallway display of 20 identical pre-cut pumpkins—or scripted memorization—alongside open-ended studio exploration, dramatic play, or community inquiry.',
      repairQuestion: 'Who is making the creative and cognitive decisions here—the teacher through a rigid template, or the children through developmentally appropriate, open-ended exploration?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Contrast product-focused crafts (pre-cut templates, adult assembly, uniform finished look) with process art and DAP inquiry (open materials, expressive choices, active sense-making).',
          requiredOutput: 'Explain why the uniform template distractor limits fine-motor planning, creative expression, and developmentally appropriate engagement.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Pair open-ended arts exploration with accurate domain vocabulary—visual elements (texture, value, line, shape), music concepts (steady beat vs. rhythm, pitch/melody), dramatic play perspective-taking, and inclusive family/community social studies.',
          requiredOutput: 'Write one teacher prompt that builds visual-art vocabulary during a collage (such as rough vs. smooth texture and dark vs. pale value) without dictating what the artwork must depict.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Replace a pre-cut "community helper hat" worksheet with an integrated dramatic-play and visual-arts center exploring local community roles and family diversity.',
          requiredOutput: 'Specify the open-ended materials, one music/rhythm or dramatic-play prompt, and one social-studies reflection question aligned to DAP.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Re-read an arts or social-studies item analyzing a mixed-media collage or comparing ways classroom groups establish shared rules.',
          requiredOutput: 'Select the option using authentic arts vocabulary and child-centered DAP inquiry while eliminating cookie-cutter craft or passive-compliance distractors.'
        }
      ],
      ...PLAYBOOK_META
    },
    {
      id: 'ec5025-playbook-passive-elimination-pe-vs-inclusive-motor',
      familyId: 'ec5025-passive-elimination-pe-vs-inclusive-motor',
      familyLabel: 'Passive Elimination PE Games Instead of Inclusive Motor Play and Child Safety',
      title: 'Prioritize Inclusive Active Motor Play, Health Habits, and Child Safety Protocols',
      recognitionCue: 'A PE scenario suggests dodgeball, musical chairs with eliminated children sitting out, or a single long relay line—or a child-safety item tempts a teacher to investigate a suspicious secret privately instead of following mandated reporting.',
      repairQuestion: 'Does this activity maximize active, non-elimination movement matched to motor development—and in any health/safety disclosure, does it protect the child immediately through mandated reporting?',
      stages: [
        {
          order: 1,
          id: 'recognize',
          label: 'Recognize',
          instruction: 'Spot exclusionary PE patterns (elimination rules, single-equipment wait lines, adult-sized gear) and unsafe child-welfare responses (promising secrecy, confronting the accused adult, or delaying a report).',
          requiredOutput: 'Flag the exact participation barrier or child-safety protocol violation in the distractor.'
        },
        {
          order: 2,
          id: 'repair',
          label: 'Repair',
          instruction: 'Align PE with inclusive motor progression (locomotor skills like hopping/galloping, non-locomotor balance/bending, manipulative throwing/catching with high equipment-to-child ratios) and lock in child-protection rules (listen calmly without leading questions, never promise secrecy, report immediately per mandated-reporter law).',
          requiredOutput: 'State one PE redesign rule that keeps 100% of children moving and one 3-step mandated-reporting protocol for an uncomfortable-secret disclosure.'
        },
        {
          order: 3,
          id: 'practice',
          label: 'Targeted practice',
          instruction: 'Redesign an elimination tag game for 22 first graders working on skipping and underhand tossing, and outline the immediate teacher response when a child discloses an adult asked them to keep an uncomfortable touch secret.',
          requiredOutput: 'Describe the non-elimination small-group or station format for PE and the exact calm, supportive, mandated-reporting sequence for the disclosure.'
        },
        {
          order: 4,
          id: 'retry',
          label: 'Retry & transfer',
          instruction: 'Evaluate a fresh health/PE vignette covering motor-development sequencing, daily nutrition/hygiene routines, or emergency/emotional safety.',
          requiredOutput: 'Choose the inclusive, developmentally sequenced, and legally compliant safety action while rejecting elimination games or informal handling.'
        }
      ],
      ...PLAYBOOK_META
    }
  ]
};

module.exports = {
  teaching_reading_5205,
  reading_specialist_5302,
  esol_5362,
  early_childhood_5025
};
