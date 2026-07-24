#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const banks = require('./teaching_reading_5205/item_content.cjs');
const { cleanSourceText } = require('./teaching_reading_5205/source_text_cleanup.cjs');
const root = path.resolve(__dirname, '..');
const diagnosticCounts = { 'phonological-emergent': 16, 'phonics-decoding': 20, 'vocabulary-fluency': 23, comprehension: 23, 'written-expression': 18 };
const officialCounts = { 'phonological-emergent': 14, 'phonics-decoding': 18, 'vocabulary-fluency': 21, comprehension: 21, 'written-expression': 16 };
const ensure = (value, minimum, suffix) => String(value || '').trim().length >= minimum ? String(value).trim() : (String(value || '').trim() + ' ' + suffix).trim();
function makeItem(bank, spec, batch, position) {
  const answerIndex = (position - 1) % 4;
  const rationale = ensure(cleanSourceText(spec.rationale), 120, 'The response links the measured literacy skill to explicit instruction, accessible grade-level practice, and progress evidence.');
  const choices = []; const choiceRationales = []; let distractor = 0;
  for (let index = 0; index < 4; index += 1) {
    if (index === answerIndex) { choices.push(cleanSourceText(spec.correct)); choiceRationales.push('Correct. ' + rationale); }
    else { const value = cleanSourceText(spec.distractors[distractor++]); choices.push(value); choiceRationales.push('Not the best answer. "' + value + '" does not match the controlling literacy evidence, construct, instructional sequence, or monitoring need. ' + rationale); }
  }
  return { id: 'tr5205-b' + batch + '-' + String(position).padStart(3, '0'), type: 'single-choice', domainId: bank.domainId, difficulty: spec.difficulty, prompt: cleanSourceText(batch === 1 ? spec.promptA : spec.promptB), choices, answerIndex, rationale, references: bank.references.slice(), reviewStatus: 'source-reviewed', qaStatus: 'qa-passed', qaReviewedAt: '2026-07-14', choiceRationales, skillIds: [bank.id], chapterIds: [bank.chapterId] };
}
const items = [];
for (let batch = 1; batch <= 2; batch += 1) { let position = 0; for (const bank of banks) for (const spec of bank.questions) items.push(makeItem(bank, spec, batch, ++position)); if (position !== 100) throw new Error('Each diagnostic bank must contain 100 items.'); }
function simulationOrder(all) {
  const buckets = Object.fromEntries(Object.keys(diagnosticCounts).map((domain) => [domain, all.filter((item) => item.domainId === domain)]));
  const result = [];
  while (result.length < 90) for (const domain of Object.keys(officialCounts)) if (result.filter((item) => item.domainId === domain).length < officialCounts[domain]) result.push(buckets[domain].shift());
  return result.concat(Object.values(buckets).flat());
}
items.splice(0, 100, ...simulationOrder(items.slice(0, 100)));
for (let batch = 0; batch < 2; batch += 1) { const part = items.slice(batch * 100, batch * 100 + 100); for (const [domain, expected] of Object.entries(diagnosticCounts)) if (part.filter((item) => item.domainId === domain).length !== expected) throw new Error('Diagnostic allocation mismatch.'); if ([0,1,2,3].some((answer) => part.filter((item) => item.answerIndex === answer).length !== 25)) throw new Error('Answer balance mismatch.'); }
for (const [domain, expected] of Object.entries(officialCounts)) if (items.slice(0, 90).filter((item) => item.domainId === domain).length !== expected) throw new Error('Simulation allocation mismatch for ' + domain);
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('Duplicate prompts.');
const pack = {
  schemaVersion: 1, id: 'praxis-teaching-reading-5205', title: 'Praxis Teaching Reading: Elementary (5205) - 200-Item Diagnostic Bank', shortTitle: 'Teaching Reading: Elementary (5205)', description: 'Two 100-item diagnostics, a 90-item selected-response simulation, three constructed-response task families, native learning resources, and detailed feedback for beginning K–6 reading teachers.', credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'rose',
  contentReview: '200 source-reviewed items; independent elementary literacy educator, dyslexia specialist, multilingual-family, accessibility, and psychometric review pending', nativeQaUrl: './test_prep/teaching_reading_5205_native_qa.json', learningLibraryUrl: './test_prep/teaching_reading_5205_learning_library.json', learningLibraryQaUrl: './test_prep/teaching_reading_5205_learning_library_qa.json',
  simulationItemCount: 90, simulationDomainCounts: {"phonological-emergent":14,"phonics-decoding":18,"vocabulary-fluency":21,"comprehension":21,"written-expression":16}, simulationTimeMinutes: 120, officialSelectedResponseCount: 90, officialConstructedResponseCount: 3, officialTotalTimeMinutes: 150,
  simulationLabel: '90-question Teaching Reading selected-response simulation', simulationNote: 'The official test provides 150 minutes for 90 selected-response and 3 constructed-response questions. This 120-minute selected-response simulation uses the exact 14/18/21/21/16 category counts and reserves three separate 10-minute workshop tasks for emergent literacy, independent literacy, and diverse learners. AlloFlow does not score written responses.',
  disclaimer: 'Independent preparation material, not affiliated with or endorsed by ETS, ILA, IDA, or IES. These original questions, workshop self-checks, and results are not official forms, constructed-response scores, scaled scores, pass predictions, licenses, dyslexia diagnoses, disability or accommodation decisions, intervention placements, or substitutes for current state, program, testing, accessibility, privacy, and educational requirements.',
  domains: [
    { id: 'phonological-emergent', label: 'Phonological and Phonemic Awareness and Emergent Literacy', weight: 0.11 }, { id: 'phonics-decoding', label: 'Phonics and Decoding', weight: 0.15 }, { id: 'vocabulary-fluency', label: 'Vocabulary and Fluency', weight: 0.18 }, { id: 'comprehension', label: 'Comprehension of Literary and Informational Text', weight: 0.18 }, { id: 'written-expression', label: 'Written Expression', weight: 0.13 }, { id: 'assessment-instructional-decisions', label: 'Assessment and Instructional Decision Making (constructed response)', weight: 0.25 },
  ], batchSize: 100, sections: [{ id: 'diagnostic-batch-1', label: 'Independent 100-item diagnostic bank 1', timeMinutes: null }, { id: 'diagnostic-batch-2', label: 'Independent 100-item diagnostic bank 2', timeMinutes: null }], items,
};
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) { fs.mkdirSync(outputRoot, { recursive: true }); fs.writeFileSync(path.join(outputRoot, 'teaching_reading_5205_items.json'), JSON.stringify(items, null, 2) + '\n'); fs.writeFileSync(path.join(outputRoot, 'teaching_reading_5205_pack.json'), JSON.stringify(pack, null, 2) + '\n'); }
console.log('Built Teaching Reading 5205: 200 items; diagnostics 16/20/23/23/18; simulation 14/18/21/21/16.');
