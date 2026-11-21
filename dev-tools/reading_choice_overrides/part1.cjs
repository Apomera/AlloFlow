'use strict';

// Shared balanced-choice overrides for the elementary reading banks.
// ids: "S<bank>.<question>" addresses the specialist source; "R<bank>.<question>"
// addresses the standalone Teaching Reading source. Shared entries avoid
// specialist/coach/secondary wording so they remain valid in both packs.
module.exports = [
  {
    ids: 'S0.0 R0.0',
    correct: 'Use the continuum to anticipate prerequisites and next steps while assessing each learner rather than treating stages as gates.',
    distractors: [
      'Expect every learner to master each continuum skill at the same chronological age before moving to new instruction.',
      'Skip foundational word-level evidence whenever comprehension appears weak, since higher skills reveal lower ones.',
      'Use current grade placement as the main indicator of instructional need and select materials only from that level.',
    ],
    notes: [
      'Literacy development follows broad patterns but varies widely; requiring identical ages for mastery ignores individual evidence and leads to mismatched instruction.',
      'Weak comprehension can stem from word recognition, language, or knowledge gaps, so foundational evidence is needed to decide where instruction should begin.',
      'Grade placement describes enrollment rather than demonstrated skill, so it cannot identify which components a reader has mastered or still needs to learn.',
    ],
  },
  {
    ids: 'S0.1 R0.1',
    correct: 'Comprehension depends on efficient word recognition and language comprehension, so each component should be assessed.',
    distractors: [
      'Comprehension depends mainly on reading rate, so faster oral reading is the clearest sign that understanding is secure.',
      'Strong listening comprehension makes decoding instruction unnecessary because readers can infer words from meaning.',
      'Accurate word recognition by itself ensures text understanding once a reader can pronounce every printed word.',
    ],
    notes: [
      'Rate is one fluency indicator; fast reading without adequate language comprehension or accuracy does not demonstrate that the reader understood the text.',
      'Listening comprehension cannot replace decoding, because readers must still translate print into words before language knowledge can build meaning.',
      'Pronouncing words accurately is necessary but insufficient; vocabulary, syntax, background knowledge, and inference also determine whether text is understood.',
    ],
  },
  {
    ids: 'S0.2 R0.2',
    correct: 'Oral-language evidence helps explain comprehension and expression and guides language-rich reading and writing instruction.',
    distractors: [
      'Oral-language evidence can replace direct assessment of print skills such as decoding, spelling, and word recognition.',
      'Conversation samples establish a learner’s intelligence level, which then sets expectations for reading instruction.',
      'Oral-language assessment matters mainly before kindergarten and adds little once formal reading instruction begins.',
    ],
    notes: [
      'Oral language and print skills are distinct components; strong speaking does not reveal whether a learner can decode or spell, so both need direct assessment.',
      'Language samples describe vocabulary, syntax, and discourse use, but they are not intelligence measures and should not set fixed expectations for learners.',
      'Language comprehension continues to shape reading and writing across the elementary grades, so oral-language evidence remains useful after kindergarten.',
    ],
  },
  {
    ids: 'S0.3 R0.3',
    correct: 'Analyze component skills and contexts separately, because the same overall score can reflect very different needs.',
    distractors: [
      'Assign the same intervention to both students because their identical total scores indicate the same instructional need.',
      'Assume both students have dyslexia because their composite reading scores fall below the expected benchmark range.',
      'Select the lowest-grade workbook for both students so the materials match their shared overall performance level.',
    ],
    notes: [
      'Identical totals can hide different profiles, such as weak decoding with strong language or the reverse, so one intervention may miss each student’s need.',
      'A low composite score does not establish dyslexia; a word-level difficulty must be documented with comprehensive evidence before any such conclusion is drawn.',
      'Lowering materials for both students ignores their distinct component needs and can reduce access to grade-level vocabulary, knowledge, and complex ideas.',
    ],
  },
  {
    ids: 'S0.4 R0.4',
    correct: 'A word-level difficulty with accurate or fluent recognition, decoding, and spelling, evaluated comprehensively under criteria.',
    distractors: [
      'A visual disorder defined mainly by reversing letters and numbers when reading or writing beyond the first grade.',
      'A reading problem caused primarily by low motivation, which improves once students receive engaging reading choices.',
      'A comprehension difficulty that leaves word reading intact while making inferences and main ideas hard to identify.',
    ],
    notes: [
      'Letter reversals are common in early development and are not a defining feature of dyslexia, which centers on phonological and word-level reading difficulty.',
      'Motivation can affect engagement, but dyslexia is not caused by low motivation; attributing it that way delays appropriate explicit word-level instruction.',
      'A comprehension-only profile with intact decoding describes a different pattern; dyslexia primarily affects accurate or fluent word recognition and spelling.',
    ],
  },
  {
    ids: 'S0.5 R0.5',
    correct: 'Consider cognitive and behavioral factors as context while directly assessing literacy skills and instructional response.',
    distractors: [
      'Treat a low processing-speed score as a complete reading diagnosis that explains the learner’s literacy difficulties.',
      'Set aside observable word-reading errors because attention and memory scores better explain the reading profile.',
      'Delay literacy intervention until attention, memory, or processing speed improve enough to support new learning.',
    ],
    notes: [
      'Processing speed may contribute to performance, but it cannot identify which literacy skills need instruction; direct reading and spelling evidence is still required.',
      'Observable word-reading errors are the most direct evidence of instructional need, and setting them aside in favor of cognitive scores weakens planning.',
      'Waiting for cognitive change withholds effective literacy instruction; explicit teaching can proceed while attention and memory supports are provided.',
    ],
  },
  {
    ids: 'S0.6 R0.6',
    correct: 'Align standards, skill progressions, texts, writing, assessment, and intervention across grades so learning builds coherently.',
    distractors: [
      'Add more isolated skill worksheets each year without reviewing how they connect to standards or to prior instruction.',
      'Use one commercial lesson script identically for every learner regardless of assessment evidence or language needs.',
      'Let each separate assessment define its own curriculum so teachers prepare students for every test format directly.',
    ],
    notes: [
      'Adding unconnected worksheets increases activity without building a coherent progression, leaving gaps and redundancies across grade levels.',
      'A single script applied identically ignores evidence about learner needs and language access, so it cannot provide coherent differentiated instruction.',
      'Letting each test dictate content fragments the curriculum and narrows instruction to formats rather than to coherent standards-based skill development.',
    ],
  },
  {
    ids: 'S0.7 R0.7',
    correct: 'Treat linguistic and cultural knowledge as resources while explicitly teaching new English forms and monitoring growth.',
    distractors: [
      'Ask learners to set aside their home language during literacy lessons so English acquisition can progress faster.',
      'Interpret each cross-language feature in a learner’s English as possible evidence of a reading or language disability.',
      'Avoid culturally familiar texts during instruction because familiarity reduces the rigor of comprehension tasks.',
    ],
    notes: [
      'Discouraging the home language removes a resource for transfer and vocabulary, and it can harm identity and engagement without speeding English growth.',
      'Cross-language features are typical in English development; treating them as disability evidence risks misidentification and inappropriate services.',
      'Culturally familiar texts can support access and engagement while still carrying rigorous vocabulary, structure, and inference demands for comprehension.',
    ],
  },
  {
    ids: 'S1.0 R1.0',
    correct: 'Phonological awareness spans spoken units such as syllables and rimes; phonemic awareness targets individual phonemes.',
    distractors: [
      'Both phonological and phonemic awareness require printed letters, so neither can be practiced through oral activities.',
      'Phonics is the broader oral category, and phonological awareness is one narrower part of letter-sound instruction.',
      'Phonemic awareness concerns the meanings of words, while phonological awareness concerns how sentences are built.',
    ],
    notes: [
      'Both forms of awareness operate on spoken language and can be taught orally; print is added deliberately later to connect sounds with letters.',
      'Phonics links sounds to print, so it is not an oral category; phonological awareness is the broader spoken-language skill set rather than a subset of phonics.',
      'Phonemic awareness concerns individual speech sounds, not meaning; word meaning belongs to vocabulary, and sentence construction belongs to syntax.',
    ],
  },
  {
    ids: 'S1.1 R1.1',
    correct: 'Separating a spoken word into each of its individual phonemes, such as saying /m/ /a/ /p/ for map.',
    distractors: [
      'Combining a sequence of spoken phonemes into a whole word, such as hearing /s/ /u/ /n/ and saying sun.',
      'Naming each printed letter in a written word in order, such as reading the letters m, a, p aloud from a card.',
      'Identifying the meaning of a morpheme within a word, such as explaining that un- in unhappy means not.',
    ],
    notes: [
      'Combining phonemes into a word is blending, the reverse operation; segmentation requires breaking the spoken word apart into its separate sounds.',
      'Naming printed letters assesses letter knowledge with visible print, whereas phoneme segmentation is an oral task that requires hearing individual sounds.',
      'Explaining a prefix meaning assesses morphological knowledge and vocabulary, not the ability to isolate and separate the sounds within a spoken word.',
    ],
  },
  {
    ids: 'S1.2 R1.2',
    correct: 'Phoneme substitution, such as changing the /k/ in cat to /h/ to say hat, which is a form of phoneme manipulation.',
    distractors: [
      'Print-directionality knowledge, such as tracking text from left to right and returning to the next line correctly.',
      'Counting the syllables in multisyllable spoken words by clapping each beat without isolating individual sounds.',
      'Sorting picture cards into vocabulary categories such as animals, foods, and tools based on their meanings.',
    ],
    notes: [
      'Print directionality is a concept-of-print skill about how text is arranged on a page, not an operation that changes individual sounds in spoken words.',
      'Syllable counting works at a larger sound unit and does not require learners to isolate, delete, or substitute individual phonemes within words.',
      'Sorting pictures by meaning builds vocabulary and categorization, but it does not require any manipulation of the speech sounds within words.',
    ],
  },
  {
    ids: 'S1.3 R1.3',
    correct: 'Letters and letter patterns represent the phonemes of spoken language in systematic, learnable ways.',
    distractors: [
      'Every letter in English represents exactly one sound, so each word can be decoded letter by letter in sequence.',
      'Word meaning can be derived from the visual shape of the letters, so readers rely mainly on word outlines.',
      'Print is learned as whole visual pictures, so each new word is memorized separately from letter-sound knowledge.',
    ],
    notes: [
      'English letters and patterns often represent more than one sound, so the alphabetic principle describes systematic relationships rather than one-to-one mapping.',
      'Word shapes are unreliable cues; skilled readers attend to letters and their sound relationships, which the alphabetic principle explicitly describes.',
      'Memorizing words as pictures bypasses the sound-letter system the alphabetic principle describes and limits independent reading of unfamiliar words.',
    ],
  },
  {
    ids: 'S1.4 R1.4',
    correct: 'Understanding how print is organized and functions in books, such as directionality, word boundaries, and covers.',
    distractors: [
      'Analyzing advanced morphological structure, such as identifying Greek and Latin roots in academic vocabulary.',
      'Measuring silent-reading rate on grade-level passages to estimate how quickly students process connected text.',
      'Interpreting norm-referenced scores to compare a learner’s reading performance with a national reference group.',
    ],
    notes: [
      'Root analysis is an advanced word-study skill for morphology and vocabulary, not the foundational understanding of how books and print work.',
      'Silent-reading rate measures fluency on connected text, whereas concepts of print concern basic knowledge such as directionality and word boundaries.',
      'Norm-referenced interpretation is an assessment practice for comparing scores, not a learner skill about how print is organized and functions.',
    ],
  },
  {
    ids: 'S1.5 R1.5',
    correct: 'Connecting phonemes with graphemes can strengthen transfer from oral sound awareness to decoding and spelling.',
    distractors: [
      'Adding letters converts phonemic-awareness practice into vocabulary instruction focused mainly on word meanings.',
      'Oral sound awareness must be fully completed before any print is introduced, so letters should be delayed.',
      'Using letter tiles removes the need for explicit teacher feedback because the tiles show learners their errors.',
    ],
    notes: [
      'Letters connect sounds to print for decoding and spelling; they do not shift the activity toward word meanings, which is the focus of vocabulary work.',
      'Research supports linking sounds and letters once oral tasks are understood, so delaying all print can slow transfer to reading and spelling.',
      'Manipulatives support practice, but learners still need explicit modeling and corrective feedback to connect phonemes accurately with graphemes.',
    ],
  },
  {
    ids: 'S1.6 R1.6',
    correct: 'Model explicitly and move from accessible larger units toward blending, segmenting, and manipulating phonemes using data.',
    distractors: [
      'Begin phonological instruction with advanced Latin roots so learners meet complex academic words early on.',
      'Assign independent silent reading as the main activity because exposure to print develops phonological skills.',
      'Repeat rhyme-identification games indefinitely without monitoring whether learners progress to phoneme work.',
    ],
    notes: [
      'Latin roots belong to later morphological study and do not address the spoken sound structures that phonological awareness instruction targets.',
      'Silent reading does not provide explicit modeling or practice with spoken sound units, so it cannot replace systematic phonological instruction.',
      'Rhyming is an early skill; repeating it without monitoring prevents learners from advancing to phoneme-level blending and segmenting they need.',
    ],
  },
  {
    ids: 'S1.7 R1.7',
    correct: 'Phonological and phonemic awareness concern spoken sound structures; phonics explicitly connects those sounds with print.',
    distractors: [
      'Phonics concerns comprehension strategies, while phonological awareness concerns how well students decode text.',
      'Phonemic awareness always relies on written words, so the two terms differ only in how many letters are shown.',
      'The terms are interchangeable in every instructional context, so the distinction does not affect lesson planning.',
    ],
    notes: [
      'Phonics teaches letter-sound relationships for decoding and spelling; comprehension strategies are a separate component of reading instruction.',
      'Phonemic awareness is an oral skill that can be practiced without print, so describing it as dependent on written words confuses it with phonics.',
      'Treating the terms as interchangeable blurs instructional goals; teachers need to know whether a lesson targets spoken sounds or sound-letter links.',
    ],
  },
  {
    ids: 'S2.0 R2.0',
    correct: 'Teach the sound–spelling link explicitly, guide blending and spelling practice, then apply it in words and connected text.',
    distractors: [
      'Ask students to infer the new pattern from an unrelated story during independent reading without teacher guidance.',
      'Have students memorize written definitions of the phonics rule and recite them before any word-reading practice.',
      'Introduce several conflicting spelling exceptions first so students see the full complexity before the main pattern.',
    ],
    notes: [
      'Incidental discovery from an unrelated text leaves many readers without a clear model, so the pattern may never be learned accurately or applied reliably.',
      'Reciting rule definitions does not build blending, spelling, or transfer to text; students need guided practice with real words and connected reading.',
      'Leading with exceptions creates confusion before the common pattern is secure; explicit instruction establishes the high-utility pattern first.',
    ],
  },
  {
    ids: 'S2.1 R2.1',
    correct: 'It offers many chances to apply recently taught decoding patterns accurately while reading connected text.',
    distractors: [
      'It keeps beginning readers in one controlled text type for the rest of the elementary grades to build confidence.',
      'It measures listening comprehension without print so teachers can separate language skills from decoding.',
      'It replaces read-alouds and knowledge-building discussions because controlled text covers those goals as well.',
    ],
    notes: [
      'Decodable text is a temporary bridge for practicing new patterns; it is not intended to limit readers to one text type throughout the elementary years.',
      'Decodable passages require reading print, so they assess and practice decoding rather than listening comprehension, which is measured without text.',
      'Read-alouds build vocabulary, knowledge, and language comprehension that controlled texts cannot supply, so both belong in a complete literacy block.',
    ],
  },
  {
    ids: 'S2.2 R2.2',
    correct: 'Map the regular sound-letter parts explicitly, flag the unexpected part, and connect pronunciation with meaning.',
    distractors: [
      'Treat every letter in an irregular word as arbitrary so students learn the full word as one unanalyzed unit.',
      'Require visual memorization from flash cards without any analysis of the sounds represented by the letters.',
      'Avoid teaching the word until students have learned every exception pattern that could appear in later texts.',
    ],
    notes: [
      'Most irregular words contain regular sound-letter parts, so treating every letter as arbitrary discards information that supports durable memory.',
      'Visual memorization without sound analysis is slow and unreliable; mapping sounds to letters supports the orthographic memory readers need.',
      'High-frequency words appear constantly in text, so postponing them until all exceptions are taught blocks access to connected reading.',
    ],
  },
  {
    ids: 'S2.3 R2.3',
    correct: 'Cumulative work on syllable patterns, vowel teams, morphology, flexible division, and checking meaning in context.',
    distractors: [
      'Counting the letters in each long word and choosing the shortest familiar pronunciation that seems to fit.',
      'Using sentence context to replace word analysis so students can skip long words and keep reading smoothly.',
      'Memorizing one fixed pronunciation for every prefix and suffix and applying it the same way in each word.',
    ],
    notes: [
      'Counting letters ignores syllable and morpheme structure, so it does not give readers a reliable way to pronounce unfamiliar academic words.',
      'Context can confirm meaning, but replacing analysis with guessing fails on content words that carry the central meaning of a sentence.',
      'Affix pronunciation can shift across words, so flexible analysis combined with meaning checks is more reliable than one memorized pronunciation.',
    ],
  },
  {
    ids: 'S2.4 R2.4',
    correct: 'Morpheme analysis supports decoding, spelling, vocabulary, and meaning across families of related words.',
    distractors: [
      'Morphology is useful mainly for labeling grammar terms during isolated parts-of-speech worksheets.',
      'Morphology instruction removes the need for phonics because word parts cover all decoding demands.',
      'Morphology applies only to short Anglo-Saxon base words rather than to academic Latin and Greek roots.',
    ],
    notes: [
      'Morphology supports reading and spelling of multisyllabic words and meaning inference, which goes well beyond labeling grammar terms in isolation.',
      'Readers still need sound-letter knowledge to decode word parts, so morphology complements phonics rather than replacing it in instruction.',
      'Academic vocabulary relies heavily on Latin and Greek roots and affixes, making morphology especially valuable for complex upper-elementary texts.',
    ],
  },
  {
    ids: 'S2.5 R2.5',
    correct: 'Readers link a word’s sounds, letters, and meaning in memory through accurate analysis and successful retrieval.',
    distractors: [
      'Readers store the outline of each familiar word as a picture and recognize it later by its overall shape.',
      'Readers remember where a familiar word appeared on a page and use that location to recall it in new texts.',
      'Readers infer each familiar word from story context without attending closely to the letters in the word.',
    ],
    notes: [
      'Skilled recognition depends on connections among sounds, letters, and meaning; word shape alone is too unreliable to support fast, accurate reading.',
      'Page location is an incidental cue that disappears in new texts, so it cannot explain how readers recognize words instantly across contexts.',
      'Relying on context rather than letters prevents durable storage of spellings and leaves readers dependent on guessing when context is weak.',
    ],
  },
  {
    ids: 'S2.6 R2.6',
    correct: 'Spelling requires analyzing sound-letter and morpheme structure, which strengthens the same representations used in reading.',
    distractors: [
      'Spelling and reading rely on unrelated mental systems, so they should be taught in separate, unconnected lessons.',
      'Spelling instruction should wait until students read fluently so that encoding does not interfere with decoding.',
      'Copying weekly word lists provides the same evidence of sound-letter knowledge as spelling words independently.',
    ],
    notes: [
      'Reading and spelling draw on shared phonological, orthographic, and morphological knowledge, so integrated instruction strengthens both skills.',
      'Encoding supports decoding from the beginning, so delaying spelling until fluency misses an important way to reinforce sound-letter knowledge.',
      'Copying can be done letter by letter without analysis, whereas generative spelling reveals what students know about sounds and patterns.',
    ],
  },
  {
    ids: 'S2.7 R2.7',
    correct: 'Whether the student represents and blends adjacent consonants accurately in both decoding and spelling.',
    distractors: [
      'Whether the student can summarize the theme of the story after listening to the teacher read it aloud.',
      'Whether the student reads more accurately when the worksheet is printed on a preferred paper color.',
      'Whether the student can provide a dictionary definition for each one-syllable word on the practice list.',
    ],
    notes: [
      'Summarizing a theme measures listening comprehension and does not explain why a student omits sounds within consonant clusters in words.',
      'Paper color does not address a pattern that appears in both reading and spelling, which points to a sound-sequence or cluster-blending need.',
      'Defining words assesses vocabulary rather than whether the student hears and maps each consonant in a cluster such as pl or st.',
    ],
  },
  {
    ids: 'S2.8 R2.8',
    correct: 'Return to the letters, decode or analyze the word accurately, then confirm the pronunciation and meaning fit.',
    distractors: [
      'Accept the substituted word without comment because it keeps the general meaning of the sentence intact.',
      'Cover the printed word and ask the student to guess a better choice using only the surrounding sentence.',
      'Set the printed letters aside and have the student reread the sentence aloud with stronger expression.',
    ],
    notes: [
      'Accepting meaning-preserving substitutions reinforces guessing and prevents the student from forming an accurate memory of the printed word.',
      'Covering the word removes the letter information the student needs to decode accurately, so the prompt strengthens guessing rather than analysis.',
      'Expression is valuable, but rereading without attending to the letters leaves the decoding error uncorrected and can distort the meaning.',
    ],
  },
];
