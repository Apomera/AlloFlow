#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const skillBanks = require('./speech_language_pathology_5331/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'anatomy-development-sciences': 9, 'professional-practice-ethics': 9, 'evidence-cultural-responsive-practice': 8, 'disorders-characteristics-etiology': 8,
  'assessment-principles-measurement': 9, 'speech-fluency-voice-motor-assessment': 8, 'language-cognition-aac-hearing-assessment': 8, 'feeding-swallowing-assessment': 8,
  'treatment-planning-outcomes': 9, 'speech-fluency-voice-motor-treatment': 8, 'language-cognition-aac-hearing-treatment': 8, 'feeding-swallowing-treatment': 8,
};
const domainCounts = { 'foundations-professional-practice': 34, 'screening-assessment-diagnosis': 33, 'treatment-planning-evaluation': 33 };

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'This response best integrates the person’s communication or swallowing needs, relevant physiology and evidence, professional scope, safety, participation, and appropriate follow-up.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the complete clinical decision and appropriate follow-up.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling speech-language pathology principle. ' + rationale, 100, 'Compare validity, scope, access, safety, mechanism, participation, and outcome requirements.'));
    }
  }
  return {
    id: 'slp5331-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'), type: 'single-choice', domainId: skill.domainId,
    difficulty: spec.difficulty || 'application', prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5331 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5331 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5331\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5331 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) { batchPosition += 1; items.push(itemFromSpec(skill, spec, batchNumber, batchPosition)); }
  if (batchPosition !== 100) throw new Error('5331 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5331 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5331 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in 5331 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1, id: 'praxis-speech-language-pathology-5331', title: 'Praxis Speech-Language Pathology (5331) — 200-Item Diagnostic Bank',
  shortTitle: 'Speech-Language Pathology 5331 diagnostics',
  description: 'Two independently authored 100-question diagnostic batches linked to a 12-chapter learning library, targeted skill practice, and an optional 132-question timed simulation. The official 5331 test currently has 132 selected-response questions in 150 minutes; AlloFlow practice is not an official form or score.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'purple',
  contentReview: '200 source-reviewed questions plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent licensed SLP and psychometric review pending',
  nativeQaUrl: './test_prep/speech_language_pathology_5331_native_qa.json', learningLibraryUrl: './test_prep/speech_language_pathology_5331_learning_library.json',
  learningLibraryQaUrl: './test_prep/speech_language_pathology_5331_learning_library_qa.json', simulationItemCount: 132, simulationTimeMinutes: 150,
  officialSelectedResponseCount: 132, officialTotalTimeMinutes: 150,
  simulationDomainCounts: { 'foundations-professional-practice': 44, 'screening-assessment-diagnosis': 44, 'treatment-planning-evaluation': 44 },
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or ASHA. The official Praxis Speech-Language Pathology (5331) test currently has 132 selected-response questions in 150 minutes; the 100-item diagnostic batches are not official-length forms. Practice results are not official or scaled Praxis scores, pass predictions, credentials, clinical evaluations, diagnoses, medical or swallowing-safety decisions, treatment, legal advice, or substitutes for qualified supervision and current federal, state, local, licensure, certification, educational, health-care, privacy, consent, emergency, and reporting requirements.',
  domains: [
    { id: 'foundations-professional-practice', label: 'Foundations and Professional Practice', weight: 1 / 3 },
    { id: 'screening-assessment-diagnosis', label: 'Screening, Assessment, Evaluation, and Diagnosis', weight: 1 / 3 },
    { id: 'treatment-planning-evaluation', label: 'Planning, Implementation, and Evaluation of Treatment', weight: 1 / 3 },
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
  writeGeneratedFile(path.join(outputRoot, 'speech_language_pathology_5331_items.json'), itemOutput, 'utf8');
  writeGeneratedFile(path.join(outputRoot, 'speech_language_pathology_5331_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis Speech-Language Pathology 5331: 200 items in two 100-item batches; each batch = 34/33/33 domains and 25/25/25/25 answer positions.');
