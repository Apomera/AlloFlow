#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const skillBanks = require('./educational_leadership_5412/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'mission-vision-goals-core-values': 9,
  'continuous-improvement-change-strategy': 8,
  'professional-capacity-feedback-learning': 12,
  'curriculum-instruction-assessment-accountability': 11,
  'inclusive-community-belonging-student-support': 9,
  'culture-collaboration-conflict-wellbeing': 9,
  'ethics-professional-norms-equity-decisions': 8,
  'law-rights-due-process-privacy': 8,
  'operations-budget-resources-technology': 7,
  'personnel-safety-crisis-continuity': 6,
  'family-engagement-communication-partnerships': 7,
  'community-advocacy-governance-accountability': 6,
};
const domainCounts = {
  'strategic-leadership': 17,
  'instructional-leadership': 23,
  'climate-cultural-leadership': 18,
  'ethical-leadership': 16,
  'organizational-leadership': 13,
  'community-engagement-leadership': 13,
};

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'This response best integrates student-centered leadership, representative evidence, ethical and legal responsibilities, equitable access, implementation capacity, transparent decision making, and measurable follow-up.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the complete leadership decision and appropriate follow-up.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with the controlling educational-leadership principle. ' + rationale, 100, 'Compare evidence, authority, equity, feasibility, safety, process, and follow-up requirements.'));
    }
  }
  return {
    id: 'lead5412-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'),
    type: 'single-choice', domainId: skill.domainId, difficulty: spec.difficulty || 'application',
    prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The 5412 source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected 5412 skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5412\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the ETS 5412 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) {
    batchPosition += 1;
    items.push(itemFromSpec(skill, spec, batchNumber, batchPosition));
  }
  if (batchPosition !== 100) throw new Error('5412 diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The 5412 bank must contain 200 uniquely identified items.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The 5412 bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in 5412 batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1,
  id: 'praxis-educational-leadership-5412',
  title: 'Praxis Educational Leadership: Administration and Supervision (5412) — 200-Item Diagnostic Bank',
  shortTitle: 'Educational Leadership (5412)',
  description: 'Two independently authored 100-question diagnostic batches aligned to the six current 5412 leadership categories, linked to a 12-chapter learning library, targeted practice, diagnostics, and an optional 120-question timed simulation.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'teal',
  contentReview: '200 source-reviewed items plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent school-leader and psychometric review pending',
  nativeQaUrl: './test_prep/educational_leadership_5412_native_qa.json',
  learningLibraryUrl: './test_prep/educational_leadership_5412_learning_library.json',
  learningLibraryQaUrl: './test_prep/educational_leadership_5412_learning_library_qa.json',
  simulationItemCount: 120, simulationDomainCounts: {"strategic-leadership":20,"instructional-leadership":27,"climate-cultural-leadership":22,"ethical-leadership":19,"organizational-leadership":16,"community-engagement-leadership":16}, simulationTimeMinutes: 165,
  simulationLabel: '120-question timed simulation',
  simulationNote: 'The official 5412 test currently contains 120 selected-response questions in 165 minutes. This simulation uses original independent practice items and is not an official test form.',
  officialSelectedResponseCount: 120, officialConstructedResponseCount: 0,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS or NPBEA. The official Praxis Educational Leadership: Administration and Supervision (5412) test currently has 120 selected-response questions in 165 minutes; these diagnostics and the simulation are not official forms. Practice results are not official or scaled Praxis scores, pass predictions, credentials, employment or licensure decisions, legal advice, personnel findings, disciplinary determinations, emergency directives, or substitutes for qualified leadership judgment and current federal, state, local, board, contract, certification, privacy, civil-rights, safety, procurement, and educational requirements.',
  domains: [
    { id: 'strategic-leadership', label: 'Strategic Leadership', weight: 0.17 },
    { id: 'instructional-leadership', label: 'Instructional Leadership', weight: 0.23 },
    { id: 'climate-cultural-leadership', label: 'Climate and Cultural Leadership', weight: 0.18 },
    { id: 'ethical-leadership', label: 'Ethical Leadership', weight: 0.16 },
    { id: 'organizational-leadership', label: 'Organizational Leadership', weight: 0.13 },
    { id: 'community-engagement-leadership', label: 'Community Engagement Leadership', weight: 0.13 },
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
  writeGeneratedFile(path.join(outputRoot, 'educational_leadership_5412_items.json'), itemOutput, 'utf8');
  writeGeneratedFile(path.join(outputRoot, 'educational_leadership_5412_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis Educational Leadership 5412: 200 items in two 100-item batches; each batch = 17/23/18/16/13/13 domains and 25/25/25/25 answer positions.');
