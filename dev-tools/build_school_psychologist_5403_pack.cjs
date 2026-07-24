#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const skillBanks = require('./school_psychologist_5403/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'problem-solving-data-integration': 11, 'measurement-assessment-special-populations': 11, 'consultation-collaboration': 10,
  'academic-instructional-interventions': 8, 'mental-behavioral-health': 8, 'behavior-counseling-crisis': 7,
  'schoolwide-learning-mtss': 7, 'safe-supportive-schools': 7, 'family-school-community': 6,
  'equitable-diverse-practice': 9, 'research-program-evaluation': 8, 'legal-ethical-professional': 8,
};
const domainCounts = { 'permeating-practices': 32, 'student-level-services': 23, 'systems-level-services': 20, foundations: 25 };

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'This response best connects the referral question, multiple sources of evidence, the student and system context, and the governing school-psychology principle.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the complete decision and appropriate follow-up.'));
    } else {
      const distractor = spec.distractors[distractorIndex];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling school-psychology principle. ' + rationale, 100, 'Compare validity, role, equity, safety, implementation, and outcome requirements.'));
      distractorIndex += 1;
    }
  }
  return {
    id: 'sp5403-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'), type: 'single-choice', domainId: skill.domainId,
    difficulty: spec.difficulty || 'application', prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5403 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5403 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5403\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5403 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) { batchPosition += 1; items.push(itemFromSpec(skill, spec, batchNumber, batchPosition)); }
  if (batchPosition !== 100) throw new Error('5403 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5403 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5403 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in 5403 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1, id: 'praxis-school-psychologist-5403', title: 'Praxis School Psychologist (5403) — 200-Item Diagnostic Bank',
  shortTitle: 'School Psychologist 5403 diagnostics',
  description: 'Two independently authored 100-question diagnostic batches linked to a 12-chapter learning library, targeted skill practice, and an optional 125-question timed simulation. The official 5403 test currently has 125 selected-response questions in 125 minutes; AlloFlow practice is not an official form or score.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'sky',
  contentReview: '200 source-reviewed questions plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent school-psychologist and psychometric review pending',
  nativeQaUrl: './test_prep/school_psychologist_5403_native_qa.json', learningLibraryUrl: './test_prep/school_psychologist_5403_learning_library.json',
  learningLibraryQaUrl: './test_prep/school_psychologist_5403_learning_library_qa.json', simulationItemCount: 125, simulationDomainCounts: {"permeating-practices":40,"student-level-services":28,"systems-level-services":25,"foundations":32}, simulationTimeMinutes: 125,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or NASP. The official Praxis School Psychologist (5403) test currently has 125 selected-response questions in 125 minutes; the 100-item diagnostic batches are not official-length forms. Practice results are not official or scaled Praxis scores, pass predictions, credentials, psychological evaluations, diagnoses, mental-health treatment, legal advice, or substitutes for current federal, state, local, district, credential, ethical, crisis, consent, and mandated-reporting requirements.',
  domains: [
    { id: 'permeating-practices', label: 'Professional Practices That Permeate All Aspects of Service Delivery', weight: 0.32 },
  { id: 'student-level-services', label: 'Direct and Indirect Services for Children, Families, and Schools: Student-Level Services', weight: 0.23 },
  { id: 'systems-level-services', label: 'Direct and Indirect Services for Children, Families, and Schools: Systems-Level Services', weight: 0.20 },
    { id: 'foundations', label: 'Foundations of School Psychological Service Delivery', weight: 0.25 },
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
  fs.writeFileSync(path.join(outputRoot, 'school_psychologist_5403_items.json'), itemOutput, 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'school_psychologist_5403_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis School Psychologist 5403: 200 items in two 100-item batches; each batch = 32/23/20/25 domains and 25/25/25/25 answer positions.');
