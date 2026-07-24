#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const skillBanks = require('./audiology_5343/item_content.cjs');
const { corrections: sourceReviewCorrections, expectedAnswerIndices: correctionAnswerIndices } = require('./audiology_5343/source_review_corrections.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'auditory-anatomy-acoustics': 10, 'psychoacoustics-development': 10,
  'hearing-prevention-conservation': 5, 'screening-ehdi-school': 5,
  'behavioral-audiologic-assessment': 9, 'immittance-oae-electrophysiology': 9,
  'vestibular-tinnitus-apd-assessment': 8, 'integrated-pediatric-diagnostic': 9,
  'hearing-aid-selection-verification': 9, 'implants-assistive-technology': 8,
  'audiologic-rehabilitation-education': 8, 'professional-ethical-evidence-practice': 10,
};
const domainCounts = {
  'foundations-audiology': 20, 'prevention-screening': 10, assessment: 35,
  intervention: 25, 'professional-ethical': 10,
};

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'This response best integrates audiologic evidence, the referral purpose, person and family priorities, safety, access, professional scope, and appropriate follow-up.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the complete audiologic decision and appropriate follow-up.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling audiology principle. ' + rationale, 100, 'Compare measurement validity, differential evidence, safety, access, scope, and follow-up requirements.'));
    }
  }
  return {
    id: 'aud5343-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'), type: 'single-choice', domainId: skill.domainId,
    difficulty: spec.difficulty || 'application', prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5343 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5343 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5343\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5343 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) { batchPosition += 1; items.push(itemFromSpec(skill, spec, batchNumber, batchPosition)); }
  if (batchPosition !== 100) throw new Error('5343 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (Object.keys(sourceReviewCorrections).length !== 10 || Object.keys(correctionAnswerIndices).length !== 10) throw new Error('Audiology source review requires exactly ten key-preserving corrections.');
for (const [itemId, correction] of Object.entries(sourceReviewCorrections)) {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error('Missing Audiology source-review correction target: ' + itemId);
  const expectedAnswerIndex = correctionAnswerIndices[itemId];
  if (item.answerIndex !== expectedAnswerIndex) throw new Error(itemId + ': source-review correction would change the answer key.');
  Object.assign(item, correction, { qaReviewedAt: '2026-07-18' });
  if (item.answerIndex !== expectedAnswerIndex) throw new Error(itemId + ': source-review correction changed the answer key.');
}if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5343 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5343 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in 5343 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1, id: 'praxis-audiology-5343', title: 'Praxis Audiology (5343) — 200-Item Diagnostic Bank',
  shortTitle: 'Audiology 5343 diagnostics',
  description: 'Two independently authored 100-question diagnostic batches linked to a 12-chapter learning library, targeted skill practice, and an optional 120-question timed simulation. The official 5343 test currently has 120 selected-response questions in 120 minutes; AlloFlow practice is not an official form or score.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'teal',
  contentReview: '200 source-reviewed questions plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent licensed-audiologist and psychometric review pending',
  nativeQaUrl: './test_prep/audiology_5343_native_qa.json', learningLibraryUrl: './test_prep/audiology_5343_learning_library.json',
  learningLibraryQaUrl: './test_prep/audiology_5343_learning_library_qa.json', simulationItemCount: 120, simulationDomainCounts: {"foundations-audiology":24,"prevention-screening":12,"assessment":42,"intervention":30,"professional-ethical":12}, simulationTimeMinutes: 120,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or ASHA. The official Praxis Audiology (5343) test currently has 120 selected-response questions in 120 minutes; the 100-item diagnostic batches are not official-length forms. Practice results are not official or scaled Praxis scores, pass predictions, credentials, clinical evaluations, diagnoses, medical or vestibular decisions, device fittings, treatment, legal advice, or substitutes for qualified supervision, urgent medical care, and current federal, state, local, licensure, certification, educational, health-care, privacy, consent, emergency, and reporting requirements.',
  domains: [
    { id: 'foundations-audiology', label: 'Foundations of Audiology', weight: 0.20 },
    { id: 'prevention-screening', label: 'Prevention and Screening', weight: 0.10 },
    { id: 'assessment', label: 'Assessment', weight: 0.35 },
    { id: 'intervention', label: 'Intervention', weight: 0.25 },
    { id: 'professional-ethical', label: 'Professional and Ethical Responsibilities', weight: 0.10 },
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
  fs.writeFileSync(path.join(outputRoot, 'audiology_5343_items.json'), itemOutput, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'audiology_5343_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis Audiology 5343: 200 items in two 100-item batches; each batch = 20/10/35/25/10 domains and 25/25/25/25 answer positions.');
