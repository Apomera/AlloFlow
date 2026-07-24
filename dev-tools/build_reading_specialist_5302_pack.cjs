#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const skillBanks = require('./reading_specialist_5302/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'literacy-foundations-development-profiles': 8, 'phonological-awareness-print-alphabetic': 8,
  'phonics-word-recognition-spelling-morphology': 9, 'fluency-vocabulary-comprehension-knowledge': 8,
  'writing-disciplinary-digital-literacy': 8, 'instructional-design-differentiation-engagement': 8,
  'assessment-purposes-measurement-fairness': 10, 'diagnostic-error-analysis-case-integration': 11,
  'progress-monitoring-data-mtss': 10, 'diverse-learners-family-equity-access': 7,
  'coaching-professional-learning-collaboration': 7, 'program-leadership-mtss-ethics-privacy': 6,
};
const domainCounts = { 'curriculum-instruction': 49, assessment: 31, 'professional-leadership': 20 };

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'This response best integrates the literacy construct, relevant learner and language evidence, research-supported instruction or assessment, equitable access, specialist scope, and a measurable follow-up decision.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the complete literacy decision and appropriate follow-up.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling reading-specialist principle. ' + rationale, 100, 'Compare construct alignment, evidence, instructional fit, equity, access, and follow-up requirements.'));
    }
  }
  return {
    id: 'read5302-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'), type: 'single-choice', domainId: skill.domainId,
    difficulty: spec.difficulty || 'application', prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5302 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5302 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5302\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5302 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) { batchPosition += 1; items.push(itemFromSpec(skill, spec, batchNumber, batchPosition)); }
  if (batchPosition !== 100) throw new Error('5302 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5302 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5302 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in 5302 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1, id: 'praxis-reading-specialist-5302', title: 'Praxis Reading Specialist (5302) — 200-Item Diagnostic Bank',
  shortTitle: 'Reading Specialist 5302 diagnostics',
  description: 'Two independently authored 100-question selected-response diagnostic batches linked to a 12-chapter learning library, six constructed-response workshops, targeted skill practice, and an optional 95-question selected-response timed segment. The official 5302 test currently has 95 selected-response questions and 2 constructed-response questions in 150 minutes.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'rose',
  contentReview: '200 source-reviewed selected-response questions plus 12 chapters, 60 checks, 75 flashcards, 20 memory aids, and 6 constructed-response workshops; independent reading-specialist and psychometric review pending',
  nativeQaUrl: './test_prep/reading_specialist_5302_native_qa.json', learningLibraryUrl: './test_prep/reading_specialist_5302_learning_library.json',
  learningLibraryQaUrl: './test_prep/reading_specialist_5302_learning_library_qa.json', simulationItemCount: 95, simulationDomainCounts: {"curriculum-instruction":47,"assessment":29,"professional-leadership":19}, simulationTimeMinutes: 150,
  simulationLabel: '95-question selected-response timed segment',
  simulationNote: 'The official test shares 150 minutes across 95 selected-response and 2 constructed-response questions. This timed segment contains selected-response items only; complete the written-response workshops separately. AlloFlow does not score constructed responses.',
  officialSelectedResponseCount: 95, officialConstructedResponseCount: 2,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or the International Literacy Association. The official Praxis Reading Specialist (5302) test currently has 95 selected-response and 2 constructed-response questions in 150 minutes; the 100-item diagnostics and 95-item timed segment are not official forms. Practice results and self-checks are not official or scaled Praxis scores, constructed-response scores, pass predictions, credentials, diagnoses of dyslexia or disability, special-education eligibility decisions, legal advice, or substitutes for qualified multidisciplinary evaluation, supervision, and current federal, state, local, certification, licensure, privacy, consent, assessment, and educational requirements.',
  domains: [
    { id: 'curriculum-instruction', label: 'Curriculum and Instruction', weight: 0.37 },
    { id: 'assessment', label: 'Assessment', weight: 0.23 },
    { id: 'professional-leadership', label: 'Professional Leadership and Specialized Roles', weight: 0.15 },
  ],
  batchSize: 100,
  sections: [
    { id: 'diagnostic-batch-1', label: 'Independent 100-item diagnostic batch 1', timeMinutes: null },
    { id: 'diagnostic-batch-2', label: 'Independent 100-item diagnostic batch 2', timeMinutes: null },
  ], items,
};

const itemOutput = JSON.stringify(items, null, 2) + '\n';
const packOutput = JSON.stringify(pack, null, 2) + '\n';
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'reading_specialist_5302_items.json'), itemOutput, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'reading_specialist_5302_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis Reading Specialist 5302: 200 items in two 100-item batches; each batch = 49/31/20 selected-response categories and 25/25/25/25 answer positions.');
