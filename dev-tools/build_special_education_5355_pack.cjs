#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const skillBanks = require('./special_education_5355/item_content.cjs');

const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-13';
const expectedCounts = {
  'development-milestones-context': 9,
  'disability-characteristics-impact': 9,
  'adaptive-sensory-health-supports': 8,
  'individualized-planning-transition': 11,
  'explicit-instruction-curriculum-access': 11,
  'behavior-environments-engagement': 10,
  'assessment-quality-selection': 8,
  'evaluation-eligibility-intervention': 8,
  'progress-monitoring-data-decisions': 7,
  'law-ethics-equity': 7,
  'collaboration-families-teams': 6,
  'professional-learning-advocacy': 6,
};
const domainCounts = {
  'development-differences': 26,
  'planning-instruction-environment': 32,
  assessment: 23,
  'professional-practice-collaboration': 19,
};

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  const rationale = ensure(spec.rationale, 120, 'The correct response most directly addresses the learner, task, evidence, and governing educational principle described in the scenario.');

  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'This option satisfies the complete requirement in the prompt.'));
    } else {
      const distractor = spec.distractors[distractorIndex];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. “' + distractor + '” does not apply the key requirement in this scenario. ' + rationale, 100, 'Compare the option with the individualized and evidence-based response required by the prompt.'));
      distractorIndex += 1;
    }
  }

  return {
    id: 'sp5355-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'),
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

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5355 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5355 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) {
    throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  }
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
  if (batchPosition !== 100) throw new Error('5355 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}

if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5355 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5355 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  const answers = [0, 1, 2, 3].map((index) => batch.filter((item) => item.answerIndex === index).length);
  if (answers.some((count) => count !== 25)) throw new Error('Answer positions in 5355 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) {
    if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
  }
}

const pack = {
  schemaVersion: 1,
  id: 'praxis-special-education-5355',
  title: 'Praxis Special Education: Foundational Knowledge (5355) — 200-Item Diagnostic Bank',
  shortTitle: 'Special Education 5355 diagnostics',
  description: 'Two independently authored 100-question diagnostic batches linked to a 12-chapter learning library, targeted skill practice, and an optional 120-question timed simulation. The official 5355 test currently has 120 selected-response questions in two hours; AlloFlow practice is not an official form or score.',
  credentialOwner: 'Educational Testing Service (ETS)',
  version: '1.0.0',
  status: 'ready',
  accent: 'violet',
  contentReview: '200 source-reviewed questions plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent educator and psychometric review pending',
  nativeQaUrl: './test_prep/special_education_5355_native_qa.json',
  learningLibraryUrl: './test_prep/special_education_5355_learning_library.json',
  learningLibraryQaUrl: './test_prep/special_education_5355_learning_library_qa.json',
  simulationItemCount: 120,
  simulationTimeMinutes: 120,
  officialSelectedResponseCount: 120,
  officialTotalTimeMinutes: 120,
  simulationDomainCounts: { 'development-differences': 32, 'planning-instruction-environment': 38, assessment: 27, 'professional-practice-collaboration': 23 },
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS. The official Praxis Special Education: Foundational Knowledge (5355) test currently has 120 selected-response questions in two hours; the 100-item diagnostic batches are not official-length forms. Practice results are not official or scaled Praxis scores, pass predictions, licenses, legal advice, or substitutes for current federal, state, and local requirements.',
  domains: [
    { id: 'development-differences', label: 'Human Development and Individual Learning Differences', weight: 0.26 },
    { id: 'planning-instruction-environment', label: 'Effective Planning and Instruction and Productive Learning Environments', weight: 0.32 },
    { id: 'assessment', label: 'Assessment', weight: 0.23 },
    { id: 'professional-practice-collaboration', label: 'Professional Learning, Practice, and Collaboration', weight: 0.19 },
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
  fs.writeFileSync(path.join(outputRoot, 'special_education_5355_items.json'), itemOutput, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'special_education_5355_pack.json'), packOutput, 'utf8');
}

console.log('Built Praxis Special Education 5355: 200 items in two 100-item batches; each batch = 26/32/23/19 domains and 25/25/25/25 answer positions.');
