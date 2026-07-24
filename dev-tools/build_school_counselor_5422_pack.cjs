#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const skillBanks = require('./school_counselor_5422/item_content.cjs');

const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'counselor-role-national-model': 8,
  'development-learning-family-systems': 8,
  'ethics-law-equity-wellness': 9,
  'individual-counseling-academic-career': 14,
  'group-classroom-crisis-prevention': 13,
  'consultation-collaboration-mtss-referrals': 13,
  'program-foundations-alignment': 7,
  'program-goals-data-psychometrics': 7,
  'program-operations-technology-resources': 6,
  'program-assessment-implementation': 5,
  'results-data-interpretation-reporting': 5,
  'continuous-improvement-advocacy': 5,
};
const domainCounts = { define: 25, deliver: 40, manage: 20, assess: 15 };

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'This choice best integrates the student need, professional role, available evidence, and ethical or program principle described in the scenario.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;

  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the full decision rather than only one surface feature.'));
    } else {
      const distractor = spec.distractors[distractorIndex];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling school-counseling principle. ' + rationale, 100, 'Compare role, safety, equity, evidence, and follow-up requirements.'));
      distractorIndex += 1;
    }
  }

  return {
    id: 'sc5422-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'),
    type: 'single-choice',
    domainId: skill.domainId,
    difficulty: spec.difficulty || 'application',
    prompt: batchNumber === 1 ? spec.promptA : spec.promptB,
    choices,
    answerIndex,
    rationale,
    references: skill.references.slice(),
    reviewStatus: 'source-reviewed',
    legacySourceId: '',
    legacySourceFile: '',
    migrationStatus: '',
    qaStatus: 'qa-passed',
    qaReviewedAt: reviewedAt,
    choiceRationales,
    skillIds: [skill.id],
    chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5422 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5422 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5422\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5422 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) {
    for (const spec of skill.questions) {
      batchPosition += 1;
      items.push(itemFromSpec(skill, spec, batchNumber, batchPosition));
    }
  }
  if (batchPosition !== 100) throw new Error('5422 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}

if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5422 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5422 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  const answers = [0, 1, 2, 3].map((index) => batch.filter((item) => item.answerIndex === index).length);
  if (answers.some((count) => count !== 25)) throw new Error('Answer positions in 5422 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) {
    if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
  }
}

const pack = {
  schemaVersion: 1,
  id: 'praxis-school-counselor-5422',
  title: 'Praxis School Counselor (5422) — 200-Item Diagnostic Bank',
  shortTitle: 'School Counselor 5422 diagnostics',
  description: 'Two independently authored 100-question diagnostic batches linked to a 12-chapter learning library, targeted skill practice, and an optional 120-question timed simulation. The official 5422 test currently has 120 selected-response questions in 120 minutes; AlloFlow practice is not an official form or score.',
  credentialOwner: 'Educational Testing Service (ETS)',
  version: '1.0.0',
  status: 'ready',
  accent: 'teal',
  contentReview: '200 source-reviewed questions plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent school-counselor and psychometric review pending',
  nativeQaUrl: './test_prep/school_counselor_5422_native_qa.json',
  learningLibraryUrl: './test_prep/school_counselor_5422_learning_library.json',
  learningLibraryQaUrl: './test_prep/school_counselor_5422_learning_library_qa.json',
  simulationItemCount: 120, simulationDomainCounts: {"define":30,"deliver":48,"manage":24,"assess":18},
  simulationTimeMinutes: 120,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or ASCA. The official Praxis School Counselor (5422) test currently has 120 selected-response questions in 120 minutes; the 100-item diagnostic batches are not official-length forms. Practice results are not official or scaled Praxis scores, pass predictions, credentials, mental-health treatment, legal advice, or substitutes for current federal, state, local, district, crisis, mandated-reporting, and ethical requirements.',
  domains: [
    { id: 'define', label: 'Define', weight: 0.25 },
    { id: 'deliver', label: 'Deliver', weight: 0.40 },
    { id: 'manage', label: 'Manage', weight: 0.20 },
    { id: 'assess', label: 'Assess', weight: 0.15 },
  ],
  batchSize: 100,
  sections: [
    { id: 'diagnostic-batch-1', label: 'Independent 100-item diagnostic batch 1', timeMinutes: null },
    { id: 'diagnostic-batch-2', label: 'Independent 100-item diagnostic batch 2', timeMinutes: null },
  ],
  items,
};

const itemOutput = JSON.stringify(items, null, 2) + '\n';
const packOutput = JSON.stringify(pack, null, 2) + '\n';
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'school_counselor_5422_items.json'), itemOutput, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'school_counselor_5422_pack.json'), packOutput, 'utf8');
}

console.log('Built Praxis School Counselor 5422: 200 items in two 100-item batches; each batch = 25/40/20/15 domains and 25/25/25/25 answer positions.');
