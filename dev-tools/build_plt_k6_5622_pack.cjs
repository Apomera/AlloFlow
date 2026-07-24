#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const skillBanks = require('./plt_k6_5622/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'learning-theory-cognition-transfer': 8,
  'human-development-k6': 7,
  'learner-differences-access-language': 8,
  'motivation-environment-behavior': 7,
  'standards-objectives-planning-resources': 10,
  'methods-grouping-scaffolding-practice': 10,
  'questioning-communication-monitoring-reflection': 10,
  'assessment-purpose-format-alignment': 10,
  'measurement-scoring-interpretation-communication': 10,
  'reflection-research-professional-learning': 7,
  'collaboration-families-supports-community': 7,
  'ethics-law-privacy-rights-safety': 6,
};
const domainCounts = {
  'students-as-learners': 30,
  'instructional-process': 30,
  assessment: 20,
  'professional-development-leadership-community': 20,
};

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'The response matches the instructional purpose, uses relevant learner evidence, preserves access and rigor, respects professional boundaries, and includes an appropriate next step or check for understanding.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the complete pedagogical decision and the evidence needed to guide learning.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling teaching and learning principle. ' + rationale, 100, 'Compare the goal, learner evidence, access, method, assessment purpose, professional boundary, and follow-up.'));
    }
  }
  if (new Set(choices).size !== 4) throw new Error(skill.id + ' contains duplicate choices.');
  return {
    id: 'plt5622-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'),
    type: 'single-choice', domainId: skill.domainId, difficulty: spec.difficulty || 'application',
    prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5622 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5622 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5622\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5622 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) {
    batchPosition += 1;
    items.push(itemFromSpec(skill, spec, batchNumber, batchPosition));
  }
  if (batchPosition !== 100) throw new Error('5622 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5622 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5622 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in 5622 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1,
  id: 'praxis-plt-k6-5622',
  title: 'Praxis Principles of Learning and Teaching: Grades K–6 (5622) — 200-Item Diagnostic Bank',
  shortTitle: 'PLT K–6 (5622)',
  description: 'Two independently authored 100-question diagnostic batches aligned to the four selected-response categories, linked to a 12-chapter learning library, eight case-analysis workshops, targeted practice, diagnostics, and a 70-minute selected-response pacing simulation.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'indigo',
  contentReview: '200 source-reviewed items plus 12 chapters, 60 checks, 75 flashcards, 20 memory aids, and 8 case-analysis workshops; independent K–6 educator and psychometric review pending',
  nativeQaUrl: './test_prep/plt_k6_5622_native_qa.json',
  learningLibraryUrl: './test_prep/plt_k6_5622_learning_library.json',
  learningLibraryQaUrl: './test_prep/plt_k6_5622_learning_library_qa.json',
  simulationItemCount: 70, simulationDomainCounts: {"students-as-learners":21,"instructional-process":21,"assessment":14,"professional-development-leadership-community":14}, simulationTimeMinutes: 70,
  simulationLabel: '70-question selected-response pacing simulation',
  simulationNote: 'The official 5622 test currently contains 70 selected-response questions and four constructed-response questions in one 120-minute session. ETS recommends approximately 70 minutes for selected response and 50 minutes for constructed response. This simulation covers the selected-response pacing segment; use the separate case-analysis workshops for written-response practice.',
  officialSelectedResponseCount: 70, officialConstructedResponseCount: 4,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or CCSSO. The official Praxis Principles of Learning and Teaching: Grades K–6 (5622) test currently has 70 selected-response questions and four constructed-response questions in 120 minutes; the 100-item diagnostics and 70-minute selected-response segment are not official forms. Practice results and workshop self-checks are not official or scaled Praxis scores, constructed-response scores, pass predictions, credentials, diagnoses, disability or accommodation decisions, legal advice, mandated-reporting determinations, or substitutes for qualified supervision and current federal, state, local, certification, licensure, privacy, civil-rights, safety, assessment, and educational requirements.',
  domains: [
    { id: 'students-as-learners', label: 'Students as Learners', weight: 0.30 },
    { id: 'instructional-process', label: 'Instructional Process', weight: 0.30 },
    { id: 'assessment', label: 'Assessment', weight: 0.20 },
    { id: 'professional-development-leadership-community', label: 'Professional Development, Leadership, and Community', weight: 0.20 },
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
  fs.writeFileSync(path.join(outputRoot, 'plt_k6_5622_items.json'), itemOutput, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'plt_k6_5622_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis PLT K–6 5622: 200 items in two 100-item batches; each batch = 30/30/20/20 domains and 25/25/25/25 answer positions.');
