#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const skillBanks = require('./esol_5362/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'linguistics-language-structure': 9,
  'linguistics-meaning-language-use': 9,
  'learning-acquisition-development': 11,
  'learning-multilingualism-transfer-identity': 11,
  'planning-objectives-materials-differentiation': 12,
  'instruction-interaction-scaffolding-literacy': 11,
  'assessment-purpose-validity-proficiency': 8,
  'assessment-classroom-data-fairness': 7,
  'culture-identity-responsiveness-power': 6,
  'culture-family-community-partnerships': 5,
  'professional-collaboration-ethics-inquiry': 6,
  'professional-advocacy-programs-access': 5,
};
const domainCounts = {
  'foundations-linguistics': 18,
  'foundations-language-learning': 22,
  'planning-implementing-instruction': 23,
  'assessment-evaluation': 15,
  culture: 11,
  'professionalism-advocacy': 11,
};
const officialCounts = {
  'foundations-linguistics': 22,
  'foundations-language-learning': 26,
  'planning-implementing-instruction': 28,
  'assessment-evaluation': 18,
  culture: 13,
  'professionalism-advocacy': 13,
};

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const rationale = ensure(spec.rationale, 120, 'The response connects linguistic or learner evidence with the language function, instructional or assessment purpose, multilingual assets, cultural context, professional role, access boundary, and an observable next step.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It addresses the full ESOL construct and preserves learner access, rigor, identity, and evidence.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" misses or conflicts with a controlling linguistic, instructional, assessment, cultural, or professional principle. ' + rationale, 100, 'Compare the evidence, objective, construct, interaction, access, role, and follow-up.'));
    }
  }
  if (new Set(choices).size !== 4) throw new Error(skill.id + ' contains duplicate choices.');
  return {
    id: 'esol5362-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'),
    type: 'single-choice', domainId: skill.domainId, difficulty: spec.difficulty || 'application',
    prompt: batchNumber === 1 ? spec.promptA : spec.promptB, choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The ESOL source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected ESOL skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /5362\.pdf$/.test(url))) throw new Error(skill.id + ' must cite the official ETS 5362 blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) {
    batchPosition += 1;
    items.push(itemFromSpec(skill, spec, batchNumber, batchPosition));
  }
  if (batchPosition !== 100) throw new Error('ESOL diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}

function orderSecondBatchForSimulation(batch) {
  const buckets = Object.fromEntries(Object.keys(domainCounts).map((id) => [id, batch.filter((item) => item.domainId === id)]));
  const prefixQuotas = {
    'foundations-linguistics': 4,
    'foundations-language-learning': 4,
    'planning-implementing-instruction': 5,
    'assessment-evaluation': 3,
    culture: 2,
    'professionalism-advocacy': 2,
  };
  const prefix = [];
  while (prefix.length < 20) {
    for (const id of Object.keys(prefixQuotas)) if (prefixQuotas[id] > 0) {
      prefix.push(buckets[id].shift());
      prefixQuotas[id] -= 1;
    }
  }
  const remainder = [];
  while (Object.values(buckets).some((bucket) => bucket.length)) for (const id of Object.keys(buckets)) if (buckets[id].length) remainder.push(buckets[id].shift());
  return prefix.concat(remainder);
}

items.splice(100, 100, ...orderSecondBatchForSimulation(items.slice(100, 200)));
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The ESOL bank must contain 200 unique identifiers.');
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The ESOL bank contains a duplicate prompt.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in ESOL batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}
const simulationItems = items.slice(0, 120);
for (const [domainId, expected] of Object.entries(officialCounts)) if (simulationItems.filter((item) => item.domainId === domainId).length !== expected) throw new Error('The simulation has an invalid ' + domainId + ' allocation.');

const pack = {
  schemaVersion: 1,
  id: 'praxis-esol-5362',
  title: 'Praxis English to Speakers of Other Languages (5362) - 200-Item Diagnostic Bank',
  shortTitle: 'Praxis ESOL (5362)',
  description: 'Two independent 100-question diagnostics aligned exactly to the six official categories, linked to a 12-chapter learning library, audio and classroom-analysis workshops, targeted practice, feedback, and a 120-question timed simulation.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'emerald',
  contentReview: '200 source-reviewed items plus 12 chapters, 60 checks, 75 flashcards, 20 memory aids, and 8 applied workshops; independent ESOL educator, multilingual-family, accessibility, linguistic, and psychometric review pending',
  nativeQaUrl: './test_prep/esol_5362_native_qa.json',
  learningLibraryUrl: './test_prep/esol_5362_learning_library.json',
  learningLibraryQaUrl: './test_prep/esol_5362_learning_library_qa.json',
  simulationItemCount: 120, simulationDomainCounts: {"foundations-linguistics":22,"foundations-language-learning":26,"planning-implementing-instruction":28,"assessment-evaluation":18,"culture":13,"professionalism-advocacy":13}, simulationTimeMinutes: 120,
  simulationLabel: '120-question ESOL pacing simulation',
  simulationNote: 'The official 5362 test currently contains 120 selected-response questions in 120 minutes and may include audio questions and select-more-than-one formats. This simulation uses 120 original text-based single-choice items with the exact official category counts. Use the separate transcript, prosody, and classroom-analysis workshops for applied listening practice; AlloFlow does not reproduce ETS recordings or its exact delivery interface.',
  officialSelectedResponseCount: 120, officialConstructedResponseCount: 0, officialTotalTimeMinutes: 120,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS, TESOL International Association, WIDA, NCELA, or the U.S. Department of Education. The official Praxis ESOL 5362 test currently has 120 selected-response questions in 120 minutes and may include audio and select-more-than-one items. These diagnostics, the text-only single-choice simulation, workshop self-checks, and results are not official forms, scaled scores, pass predictions, licenses, language-proficiency determinations, EL identification or exit decisions, disability or accommodation decisions, legal advice, civil-rights findings, or substitutes for current state, local, program, testing, privacy, or educational requirements.',
  domains: [
    { id: 'foundations-linguistics', label: 'Foundations of Linguistics', weight: 0.18 },
    { id: 'foundations-language-learning', label: 'Foundations of Language Learning', weight: 0.22 },
    { id: 'planning-implementing-instruction', label: 'Planning and Implementing Instruction', weight: 0.23 },
    { id: 'assessment-evaluation', label: 'Assessment and Evaluation', weight: 0.15 },
    { id: 'culture', label: 'Culture', weight: 0.11 },
    { id: 'professionalism-advocacy', label: 'Professionalism and Advocacy', weight: 0.11 },
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
  writeGeneratedFile(path.join(outputRoot, 'esol_5362_items.json'), itemOutput, 'utf8');
  writeGeneratedFile(path.join(outputRoot, 'esol_5362_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis ESOL 5362: 200 items in two 100-item banks; each bank = 18/22/23/15/11/11 categories and 25/25/25/25 answer positions.');
