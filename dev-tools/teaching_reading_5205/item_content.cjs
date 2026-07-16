'use strict';
const source = require('../reading_specialist_5302/item_content.cjs');
const refs = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw08f38395/pdfs/5205.pdf',
  'https://praxis.ets.org/test/teaching-reading-elementary-5205.html',
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published',
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/17/Published',
];
const clean = (value) => String(value || '')
  .replace(/reading specialist/gi, 'elementary literacy teacher')
  .replace(/literacy specialist/gi, 'elementary literacy teacher')
  .replace(/specialist/gi, 'teacher')
  .replace(/leadership team/gi, 'grade-level team');
const lowerFirst = (value) => { const text = clean(value).trim(); return text ? text[0].toLowerCase() + text.slice(1) : text; };
const take = (bank, start = 0, count = bank.questions.length) => bank.questions.slice(start, start + count);
const groups = [
  { id: 'emergent-development-oral-language', chapterId: 'tr5205-ch-01', domainId: 'phonological-emergent', domain: 'Phonological and Phonemic Awareness and Emergent Literacy', label: 'Emergent Literacy, Oral Language, and Development', questions: take(source[0]), leadA: 'In a K–2 literacy lesson, ', leadB: 'In an early elementary literacy lesson, ' },
  { id: 'phonological-phonemic-print-awareness', chapterId: 'tr5205-ch-02', domainId: 'phonological-emergent', domain: 'Phonological and Phonemic Awareness and Emergent Literacy', label: 'Phonological Awareness, Phonemic Awareness, and Print Concepts', questions: take(source[1]), leadA: 'While planning explicit emergent-literacy instruction, ', leadB: 'While reviewing an emergent reader’s evidence, ' },
  { id: 'phonics-correspondence-patterns', chapterId: 'tr5205-ch-03', domainId: 'phonics-decoding', domain: 'Phonics and Decoding', label: 'Phoneme–Grapheme Correspondence and Phonics Patterns', questions: take(source[2]), leadA: 'During systematic K–6 phonics instruction, ', leadB: 'During a recursive decoding lesson, ' },
  { id: 'decoding-encoding-morphology', chapterId: 'tr5205-ch-04', domainId: 'phonics-decoding', domain: 'Phonics and Decoding', label: 'Decoding, Encoding, Syllables, and Morphology', questions: take(source[7]), leadA: 'When an elementary teacher analyzes decoding evidence, ', leadB: 'When an elementary teacher plans word-analysis instruction, ' },
  { id: 'vocabulary-language-knowledge', chapterId: 'tr5205-ch-05', domainId: 'vocabulary-fluency', domain: 'Vocabulary and Fluency', label: 'Vocabulary, Morphology, and Knowledge Building', questions: take(source[3]), leadA: 'During vocabulary and knowledge-building instruction, ', leadB: 'In an elementary content-literacy lesson, ' },
  { id: 'fluency-automaticity-prosody', chapterId: 'tr5205-ch-06', domainId: 'vocabulary-fluency', domain: 'Vocabulary and Fluency', label: 'Accuracy, Automaticity, Rate, and Prosody', questions: take(source[8]), leadA: 'When using fluency evidence to guide instruction, ', leadB: 'During purposeful oral-reading practice, ' },
  { id: 'integrated-vocabulary-fluency', chapterId: 'tr5205-ch-07', domainId: 'vocabulary-fluency', domain: 'Vocabulary and Fluency', label: 'Integrating Fluency, Vocabulary, and Comprehension', questions: take(source[5], 0, 5), leadA: 'In a differentiated elementary reading block, ', leadB: 'While integrating word and passage work, ' },
  { id: 'literary-informational-comprehension', chapterId: 'tr5205-ch-08', domainId: 'comprehension', domain: 'Comprehension of Literary and Informational Text', label: 'Literary and Informational Text Comprehension', questions: [...take(source[5], 5, 3), ...take(source[9], 0, 7), ...take(source[10], 0, 1)], leadA: 'While teaching comprehension with a grade-level text, ', leadB: 'While planning meaning-focused text instruction, ' },
  { id: 'knowledge-text-structure-digital', chapterId: 'tr5205-ch-09', domainId: 'comprehension', domain: 'Comprehension of Literary and Informational Text', label: 'Knowledge, Text Structure, Research, and Digital Literacy', questions: [...take(source[10], 1, 6), ...take(source[11], 0, 1)], leadA: 'In a K–6 literary or informational text lesson, ', leadB: 'During a print, digital, or image-based text task, ' },
  { id: 'diverse-readers-assessment-decisions', chapterId: 'tr5205-ch-10', domainId: 'comprehension', domain: 'Comprehension of Literary and Informational Text', label: 'Assessment-Guided Comprehension for Diverse Readers', questions: take(source[11], 1, 5), leadA: 'When adapting comprehension instruction from evidence, ', leadB: 'When responding to a diverse reader’s comprehension profile, ' },
  { id: 'writing-process-genres-integration', chapterId: 'tr5205-ch-11', domainId: 'written-expression', domain: 'Written Expression', label: 'Writing Process, Genres, and Reading–Writing Integration', questions: take(source[4]), leadA: 'During elementary writing instruction connected to reading, ', leadB: 'While teaching a recursive writing process, ' },
  { id: 'spelling-sentences-writing-assessment', chapterId: 'tr5205-ch-12', domainId: 'written-expression', domain: 'Written Expression', label: 'Spelling, Sentence Construction, Conventions, and Assessment', questions: take(source[6]), leadA: 'When using writing evidence to plan explicit instruction, ', leadB: 'During assessment-guided written-expression instruction, ' },
];
module.exports = groups.map((group) => ({
  ...group, references: refs.slice(),
  questions: group.questions.map((question, index) => ({
    promptA: group.leadA + lowerFirst(question.promptA),
    promptB: group.leadB + lowerFirst(question.promptB),
    correct: clean(question.correct), distractors: question.distractors.map(clean),
    rationale: clean(question.rationale) + ' The decision should remain tied to the assessed literacy skill, grade-appropriate text access, explicit instruction, and observable progress evidence.',
    difficulty: question.difficulty || (index % 3 === 0 ? 'analysis' : 'application'),
  })),
}));
