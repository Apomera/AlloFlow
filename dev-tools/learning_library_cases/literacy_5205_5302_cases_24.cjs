'use strict';

const TEACHING_READING_5205_LABELS = {
  schemaVersion: 1,
  label: 'Applied classroom case',
  presentationLabel: 'Classroom scenario',
  answerLabel: 'Best instructional decision',
  explanationLabel: 'Literacy rationale'
};

const READING_SPECIALIST_5302_LABELS = {
  schemaVersion: 1,
  label: 'Applied literacy leadership case',
  presentationLabel: 'Case scenario',
  answerLabel: 'Best specialist decision',
  explanationLabel: 'Evidence-based rationale'
};

const teaching_reading_5205 = {
  'tr5205-ch-01-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Bridging Home Language Strengths in Kindergarten Read-Alouds',
    clinicalDescription:
      'A kindergarten student from a Spanish-speaking home tracks print left-to-right during shared big-book reading and retells story sequences accurately in Spanish, yet gives one-word responses during English discussions and scores 6/20 on an English picture-naming check.',
    diagnosis:
      'Pair interactive English read-alouds with visual story cards, home-language cognate bridges, and family storytelling prompts.',
    explanation:
      'Visual response scaffolds and home-language bridges preserve grade-level comprehension while accelerating oral English vocabulary transfer and monitoring early growth. Moving the child to silent letter-copying drills overlooks strong narrative comprehension and deprives the learner of rich oral language input.'
  },
  'tr5205-ch-02-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Targeting Consonant-Blend Phoneme Segmentation in Kindergarten',
    clinicalDescription:
      'Midyear screening shows four kindergarteners clap syllables and generate rhymes accurately, yet score 3/12 on phoneme segmentation fluency. They consistently drop the internal consonant in initial blends such as "slip" and "frog" and confuse spoken /m/ with /n/.',
    diagnosis:
      'Form a brief Tier 2 group using Elkonin boxes, tactile counters, mirror articulatory cues, and letter tiles to map each phoneme.',
    explanation:
      'Students who grasp syllables and rhyme but omit blend phonemes need explicit phonemic segmentation paired with articulatory feedback and graphemes for orthographic transfer. Repeating whole-class rhyming songs addresses an already mastered phonological level and misses the phoneme-level bottleneck.'
  },
  'tr5205-ch-03-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Replacing Picture Guessing with Explicit Long-Vowel Phonics',
    clinicalDescription:
      'Six first graders decode CVC words at 95% accuracy but drop to 58% on a midyear phonics survey featuring VCe and vowel-team patterns. They read "cape" as "cap" and "boat" as "bot", frequently looking at illustrations to guess words in predictable leveled readers.',
    diagnosis:
      'Regroup the students for explicit VCe and vowel-team lessons with cumulative review, word chaining, and matched decodable texts.',
    explanation:
      'Systematic long-vowel instruction paired with decodable practice compels students to process internal vowel graphemes before bridging to authentic trade books. Keeping these readers in predictable leveled texts with picture-cueing prompts reinforces guessing habits instead of building reliable decoding.'
  },
  'tr5205-ch-04-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Connecting Syllable Division and Morphology for Multisyllabic Words',
    clinicalDescription:
      'A third grader reads closed single-syllable words accurately at 96% but stalls on multisyllabic words such as "unhelpful" and "replanting". On a spelling probe, the student writes "unhelful" and "replnting" and reads open first syllables with short vowel sounds.',
    diagnosis:
      'Teach syllable-division routines alongside common prefixes, suffixes, and base words using morphological charts, dictation, and encoding probes.',
    explanation:
      'Integrating syllable types with morpheme analysis links decoding and encoding so students chunk longer words by sound and meaning. Assigning weekly rote memorization of unrelated spelling lists fails to build transferable structural analysis for unfamiliar multisyllabic words.'
  },
  'tr5205-ch-05-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Building Academic Vocabulary Through Concept-Linked Text Sets',
    clinicalDescription:
      'During a fourth-grade ecosystems unit, multilingual and English-proficient students decode an informational article at 96% accuracy yet score 50% on comprehension items because they confuse Tier 2 terms like "adapt", "migrate", and "conserve" across passages.',
    diagnosis:
      'Teach target words in a concept-linked text set using student-friendly definitions, Spanish cognates, word families, and spaced retrieval.',
    explanation:
      'Deep word knowledge grows when learners encounter academic terms repeatedly in connected topical texts and use them in speaking and writing with spaced review. Having students copy isolated dictionary definitions produces fragile recall that rarely transfers to content-area comprehension.'
  },
  'tr5205-ch-06-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Improving Rate and Prosody Without Triggering Speed Reading',
    clinicalDescription:
      'A second grader reads grade-level narrative passages at 97% accuracy but at 48 WCPM (winter benchmark 72 WCPM) in a flat, word-by-word monotone. The student pauses mid-phrase and misses plot details despite answering oral read-aloud questions at 90% accuracy.',
    diagnosis:
      'Use daily audio-assisted and partner repeated reading with phrase-cued texts, prosody modeling, meaning checks, and WCPM goal-line tracking.',
    explanation:
      'High decoding accuracy with slow rate and choppy phrasing indicates an automaticity and prosody need rather than a phonics gap. Running timed speed-reading races without phrasing cues or comprehension checks encourages hurried word calling that further disrupts meaning making.'
  },
  'tr5205-ch-07-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Diagnosing a Decoding Bottleneck Beneath Comprehension Delays',
    clinicalDescription:
      'After six weeks of Tier 2 vocabulary review, a third grader still scores below benchmark on weekly comprehension checks. Diagnostic probes reveal 82% word-reading accuracy on grade-level text, recurring vowel-team errors, and 54 WCPM alongside strong oral listening.',
    diagnosis:
      'Intensify small-group phonics and fluency dosage in Tier 2 while scaffolding grade-level text access during core comprehension lessons.',
    explanation:
      'When word-reading accuracy drops below 90%, decoding effort consumes working memory and blocks comprehension even with strong language skills. Continuing comprehension-only worksheets or restricting the student solely to lower-grade books leaves the core decoding gap unresolved.'
  },
  'tr5205-ch-08-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Scaffolding Text-Based Inferences Across Literary and Informational Genres',
    clinicalDescription:
      'Fifth graders answer literal recall questions at 90% accuracy on both a biography and a realistic short story, yet on exit tickets only 35% can explain how textual details support a character trait or author claim during classroom text discussions.',
    diagnosis:
      'Model inferential think-alouds, provide graphic organizers and text-talk sentence frames for citing evidence, and gradually fade supports.',
    explanation:
      'Explicit strategy modeling paired with structured text-talk frames shows elementary readers how to combine textual clues with background knowledge and justify claims independently. Replacing discussion with additional literal recall quizzes fails to cultivate inferential reasoning across genres.'
  },
  'tr5205-ch-09-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Guiding Source Evaluation and Multimodal Synthesis in Fourth-Grade Research',
    clinicalDescription:
      'While researching solar energy online, fourth graders copy whole paragraphs from the top search link, skip headings, diagrams, and captions, and cite a company sales page alongside a science museum article without questioning authorship or purpose.',
    diagnosis:
      'Teach text structures, graphic-feature synthesis, and source-credibility checklists using curated multimodal sets and paraphrasing checkpoints.',
    explanation:
      'Structured multimodal inquiry teaches students to integrate diagrams with prose, evaluate who authored a webpage, and summarize findings in their own words. Removing digital sources altogether avoids teaching critical evaluation skills essential for elementary content-area research.'
  },
  'tr5205-ch-10-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Honoring 504 Reading Accommodations While Targeting Fluency Growth',
    clinicalDescription:
      'A fifth grader with a 504 plan for attention and slow decoding scores 45% on timed written reading tests, yet explains theme, cause-and-effect, and supporting evidence at 88% accuracy when given text-to-speech access and oral response options.',
    diagnosis:
      'Provide approved text-to-speech and alternate response supports during grade-level comprehension while addressing fluency in targeted small groups.',
    explanation:
      'Separating print-access barriers from comprehension assessment upholds 504 accommodations and preserves grade-level thinking while remediation builds independent reading fluency. Assigning simplified lower-grade passages or grading only timed written responses masks true comprehension strength.'
  },
  'tr5205-ch-11-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Reducing Transcription Overload During Third-Grade Opinion Drafting',
    clinicalDescription:
      'In an opinion-writing unit linked to a read-aloud on school gardens, several third graders share clear reasons and text examples aloud during partner talk, yet write only three disconnected lines and freeze whenever they feel unsure how to spell a word.',
    diagnosis:
      'Combine oral rehearsal and mentor-text organizers with speech-to-text options as needed, separating initial drafting from later editing conferences.',
    explanation:
      'Oral rehearsal and genre organizers help young writers translate spoken arguments into structured paragraphs while easing transcription demands during drafting. Interrupting initial drafting to correct every spelling error overloads working memory and stalls idea generation.'
  },
  'tr5205-ch-12-section-04': {
    ...TEACHING_READING_5205_LABELS,
    title: 'Transferring Sentence Construction and Conventions into Science Writing',
    clinicalDescription:
      'Fourth graders average 90% on isolated Friday punctuation worksheets, yet their science lab reports rely on choppy five-word simple sentences, run-on clauses, and uncorrected homophone errors such as "there/their" with minimal revision between drafts.',
    diagnosis:
      'Teach sentence combining with subordinating conjunctions, apply focused editing checklists to science drafts, and monitor syntax across writing probes.',
    explanation:
      'Explicit sentence combining and targeted editing inside authentic drafts build syntactic fluency and transfer conventions into real writing. Assigning extra standalone grammar worksheets drills rules students already pass in isolation without improving connected composition.'
  }
};

const reading_specialist_5302 = {
  'read5302-ch-01-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Resolving Core-to-Intervention Curriculum Misalignment Across Grades K-5',
    clinicalDescription:
      'A K-5 literacy audit shows Tier 1 classrooms follow a structured phonics scope and sequence, whereas Tier 2 interventionists rely on leveled predictable books and picture-cueing prompts. Third-grade proficiency gaps for low-income learners widened by 9 percentage points.',
    diagnosis:
      'Convene a literacy alignment team to unify evidence-based phonics, knowledge building, and diagnostic criteria across Tier 1 and Tier 2.',
    explanation:
      'Curriculum coherence ensures students receiving intervention experience aligned, cumulative reinforcement rather than conflicting word-solving strategies across settings. Adding extra minutes to misaligned leveled-reader groups intensifies instructional confusion instead of closing equity gaps.'
  },
  'read5302-ch-02-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Bridging Oral Phonemic Drills to Grapheme Mapping in First Grade',
    clinicalDescription:
      'In two first-grade classrooms, 60% of learners pass oral phoneme-blending checks (14/15) yet decode CVC words at only 52% accuracy and spell "ship" as "sp" and "mad" as "md". Observations show 25 minutes daily of eyes-closed oral sound games without print.',
    diagnosis:
      'Coach teachers to anchor phonemic segmentation and blending directly to graphemes through sound-symbol mapping, word chains, and cumulative dictation.',
    explanation:
      'Once students manipulate spoken sounds reliably, linking phonemes to explicit letters drives alphabetic transfer into both decoding and encoding. Extending purely oral sound routines without print delays orthographic mapping and leaves students unable to apply sound awareness to real words.'
  },
  'read5302-ch-03-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Using Feature-Based Spelling Analysis to Prevent Misplaced Intervention',
    clinicalDescription:
      'A fourth-grade teacher recommends placing a student back into a short-vowel phonics group after a 40% total score on a spelling inventory. Feature analysis shows 100% mastery of short vowels and blends, but errors on r-controlled vowels ("brd/bird") and doubling ("stoped/stopped").',
    diagnosis:
      'Group the learner for targeted instruction on r-controlled vowel spellings and inflected doubling rules, linking encoding directly to decoding.',
    explanation:
      'Feature-based error analysis identifies exact orthographic and morphological patterns a learner uses but confuses, ensuring efficient skill targeting. Grouping by total percent correct misreads instructional readiness and wastes intervention time reteaching already mastered short vowels.'
  },
  'read5302-ch-04-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Shifting Middle School Comprehension from Skill Drills to Knowledge Building',
    clinicalDescription:
      'Seventh graders decode grade-level social studies passages at 96% accuracy and 138 WCPM, yet only 38% reach proficiency on informational comprehension benchmarks. Classroom walkthroughs reveal isolated weekly main-idea worksheets built from unrelated two-paragraph excerpts.',
    diagnosis:
      'Collaborate with teachers to implement coherent topical text sets, explicit academic vocabulary routines, and evidence-centered text discussions.',
    explanation:
      'Comprehension of complex informational texts depends heavily on connected domain knowledge, vocabulary depth, and disciplined text-evidence discourse. Repeating generic main-idea drills on disconnected snippets fails to build the conceptual schemas needed for deep reading comprehension.'
  },
  'read5302-ch-05-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Teaching Lateral Reading and Multimodal Verification in Secondary Inquiry',
    clinicalDescription:
      'During a ninth-grade civic research project, 78% of students rate a slick advocacy blog as an unbiased scientific source based on its professional layout and footnotes, ignoring embedded charts and never opening a new tab to verify the sponsoring group.',
    diagnosis:
      'Co-design disciplinary lessons teaching lateral reading, publisher verification, and integrated analysis of prose, charts, and hyperlinks.',
    explanation:
      'Effective digital literacy requires leaving an unfamiliar webpage to corroborate authorship and synthesizing visual data alongside written claims. Relying on static surface checklists, such as trusting ".org" URLs or clean design, leaves adolescents vulnerable to misleading multimodal media.'
  },
  'read5302-ch-06-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Auditing Intervention Fidelity Before Escalating to Special Education',
    clinicalDescription:
      'After eight weeks in Tier 2 fluency intervention, a group of eight third graders shows flat WCPM growth (+0.2 words/week). Fidelity logs reveal sessions average 16 of 30 scheduled minutes due to transitions, with passive round-robin reading and sparse corrective feedback.',
    diagnosis:
      'Restore fidelity with full 30-minute sessions, active partner practice instead of round-robin reading, immediate feedback, and smaller groups.',
    explanation:
      'Before treating low growth as non-responsiveness, specialists must inspect implementation fidelity, instructional dosage, group size, and active engagement. Referring students directly for disability evaluation confounds poor intervention delivery with an intrinsic reading impairment.'
  },
  'read5302-ch-07-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Protecting Construct Validity and Tool-Purpose Fit in K-2 Assessment',
    clinicalDescription:
      'An elementary school plans to use a timed 3-minute silent maze screener both to diagnose second-grade phonics gaps and monitor weekly decoding growth, while letting teachers read maze passages aloud to struggling readers during benchmark windows.',
    diagnosis:
      'Keep screener administration standardized, add a diagnostic phonics survey for placement, and use brief skill-aligned CBM probes weekly.',
    explanation:
      'Assessment validity requires matching test construct to decision purpose and honoring standardization; reading a decoding screener aloud alters the construct measured. A broad maze screener lacks the diagnostic granularity and sensitivity needed to guide or track phonics remediation.'
  },
  'read5302-ch-08-section-03': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Distinguishing Second-Language Acquisition from Dyslexia in Case Review',
    clinicalDescription:
      'A third-grade team requests an immediate dyslexia evaluation for a newly arrived Arabic-speaking learner scoring below benchmark on English nonsense-word fluency. Records show 14 months of U.S. schooling, strong Arabic decoding reported by parents, and no explicit English vowel instruction.',
    diagnosis:
      'Document language history, assess literacy across languages when possible, verify English instructional opportunity, and provide targeted Tier 2 phonics first.',
    explanation:
      'Defensible differential analysis weighs home-language reading skill, cross-linguistic vowel orthography differences, and prior opportunity to learn English phonics. Interpreting low English nonsense-word scores after minimal instruction as dyslexia risks biased misidentification.'
  },
  'read5302-ch-09-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Replacing Public Fluency Rankings with Ethical Family Data Communication',
    clinicalDescription:
      'A fifth-grade team displays a color-coded hallway chart ranking students by oral reading fluency percentiles and mails families raw CBM graphs labeled "Well Below Benchmark - Tier 3" without explaining target skills or upcoming classroom adjustments.',
    diagnosis:
      'Replace public rank charts with confidential student goal-setting conferences and plain-language family summaries detailing strengths, trends, and next steps.',
    explanation:
      'Responsible data communication translates progress graphs into accessible skill goals, growth trends, and clear instructional responses while safeguarding student privacy. Public rank displays erode motivation and confidentiality, while jargon-heavy reports alienate families from partnership.'
  },
  'read5302-ch-10-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Balancing Assistive Access and Intensive Remediation for Twice-Exceptional Youth',
    clinicalDescription:
      'A sixth grader with dyslexia scores at the 94th percentile in verbal reasoning and excels in science lab inquiry, yet reads at 68 WCPM with severe spelling errors. A team debates removing the learner from honors science until decoding meets grade benchmarks.',
    diagnosis:
      'Preserve honors science with text-to-speech and speech-to-text tools while delivering explicit Tier 3 structured literacy remediation.',
    explanation:
      'Twice-exceptional learners require simultaneous access to rigorous grade-level inquiry and intensive foundational skill instruction. Excluding the student from advanced science denies equitable intellectual opportunity, whereas supplying assistive tools without remediation neglects reading growth.'
  },
  'read5302-ch-11-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Navigating Instructional Conflict Through Disciplined Coaching Inquiry',
    clinicalDescription:
      'In a second-grade data meeting, two veteran teachers oppose a new structured phonics routine as overly scripted and blame low homework completion for 45% decoding non-proficiency, while newer colleagues push for immediate administrative compliance mandates.',
    diagnosis:
      'Unite the team around a shared decoding goal, examine disaggregated work samples non-evaluatively, and co-design a four-week coaching pilot.',
    explanation:
      'Productive conflict resolution separates positions from shared student outcomes and turns instructional disagreements into testable, collaborative coaching cycles. Top-down mandates harden teacher resistance, while blaming families shifts focus away from modifiable classroom practices.'
  },
  'read5302-ch-12-section-04': {
    ...READING_SPECIALIST_5302_LABELS,
    title: 'Advocating for Equitable Core Investment Over Unvalidated Vendor Software',
    clinicalDescription:
      'A district committee proposes buying an unvalidated reading software bundle promoted by a vendor sponsoring a board member\'s travel. Disaggregated data show 58% of Black and multilingual fourth graders lack coherent Tier 1 curricula and trained interventionists.',
    diagnosis:
      'Submit an equity-centered evidence brief citing disaggregated outcomes, independent research norms, conflict-of-interest ethics, and core coaching priorities.',
    explanation:
      'Ethical program leadership combines disaggregated equity data, rigorous research evidence, and transparent conflict-of-interest standards to guide resource allocation. Approving unvalidated commercial software diverts limited funds away from high-impact Tier 1 coherence and educator capacity.'
  }
};

module.exports = {
  teaching_reading_5205,
  reading_specialist_5302
};
