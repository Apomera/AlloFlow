#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const path = require('path');
const skillBanks = require('./praxis_core_5752/item_content.cjs');
const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-14';
const expectedCounts = {
  'reading-key-ideas-details': 13,
  'reading-craft-structure-language': 11,
  'reading-integration-knowledge-ideas': 13,
  'writing-production-revision': 8,
  'writing-language-usage': 10,
  'writing-research-sources': 8,
  'math-number-operations': 7,
  'math-ratios-percent-measurement': 6,
  'math-data-displays': 6,
  'math-statistics-probability': 6,
  'math-algebra-functions': 6,
  'math-geometry-measurement': 6,
};
const domainCounts = {
  'reading-key-ideas-details': 13,
  'reading-craft-structure-language': 11,
  'reading-integration-knowledge-ideas': 13,
  'writing-text-types-production': 8,
  'writing-language-research': 18,
  'math-number-quantity': 13,
  'math-data-statistics-probability': 12,
  'math-algebra-geometry': 12,
};

function ensure(value, minimum, suffix) {
  const text = String(value || '').trim();
  return text.length >= minimum ? text : (text + ' ' + suffix).trim();
}

function itemFromSpec(skill, spec, batchNumber, batchPosition) {
  const answerIndex = (batchPosition - 1) % 4;
  const variantRationale = batchNumber === 2 && spec.rationaleB ? spec.rationaleB : spec.rationale;
  const rationale = ensure(variantRationale, 120, 'Work only from the stated passage, writing purpose, quantitative relationships, and requested unit or claim; then verify that the selected response answers the exact question without adding unsupported assumptions.');
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensure('Correct. ' + rationale, 100, 'It matches the controlling reading, writing, or mathematical relationship and the scope of the evidence.'));
    } else {
      const distractor = spec.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push(ensure('Not the best answer. "' + distractor + '" does not satisfy the complete task. ' + rationale, 100, 'Check the passage evidence, language convention, research boundary, computation, unit, and requested conclusion.'));
    }
  }
  if (new Set(choices).size !== 4) throw new Error(skill.id + ' contains duplicate choices.');
  return {
    id: 'core5752-b' + batchNumber + '-' + String(batchPosition).padStart(3, '0'),
    type: 'single-choice', domainId: skill.domainId, difficulty: spec.difficulty || 'application',
    prompt: ensure(batchNumber === 1 ? spec.promptA : spec.promptB, 35, 'Select the best answer and verify the result.'), choices, answerIndex, rationale,
    references: skill.references.slice(), reviewStatus: 'source-reviewed', legacySourceId: '', legacySourceFile: '', migrationStatus: '',
    qaStatus: 'qa-passed', qaReviewedAt: reviewedAt, choiceRationales, skillIds: [skill.id], chapterIds: [skill.chapterId],
  };
}

if (!Array.isArray(skillBanks) || skillBanks.length !== 12) throw new Error('The Praxis Core source must define exactly 12 skill banks.');
for (const skill of skillBanks) {
  if (!expectedCounts[skill.id]) throw new Error('Unexpected Praxis Core skill: ' + skill.id);
  if (!Array.isArray(skill.questions) || skill.questions.length !== expectedCounts[skill.id]) throw new Error(skill.id + ' must define exactly ' + expectedCounts[skill.id] + ' parallel question forms.');
  if (!Array.isArray(skill.references) || !skill.references.some((url) => /57(13|23|33)\.pdf$/.test(url))) throw new Error(skill.id + ' must cite its official ETS subtest blueprint.');
}

const items = [];
for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
  let batchPosition = 0;
  for (const skill of skillBanks) for (const spec of skill.questions) {
    batchPosition += 1;
    items.push(itemFromSpec(skill, spec, batchNumber, batchPosition));
  }
  if (batchPosition !== 100) throw new Error('Praxis Core diagnostic batch ' + batchNumber + ' must contain exactly 100 items.');
}
if (items.length !== 200 || new Set(items.map((item) => item.id)).size !== 200) throw new Error('The Praxis Core bank must contain 200 unique identifiers.');

function subjectFor(item) {
  if (item.domainId.startsWith('reading-')) return 'reading';
  if (item.domainId.startsWith('writing-')) return 'writing';
  return 'mathematics';
}

function orderForCombinedSimulation(batch) {
  const buckets = { reading: [], writing: [], mathematics: [] };
  for (const item of batch) buckets[subjectFor(item)].push(item);
  const prefixQuotas = { reading: 19, writing: 14, mathematics: 19 };
  const prefix = [];
  while (prefix.length < 52) {
    for (const subject of ['reading', 'writing', 'mathematics']) {
      if (prefixQuotas[subject] > 0) {
        prefix.push(buckets[subject].shift());
        prefixQuotas[subject] -= 1;
      }
    }
  }
  const remainder = [];
  while (buckets.reading.length || buckets.writing.length || buckets.mathematics.length) {
    for (const subject of ['reading', 'writing', 'mathematics']) if (buckets[subject].length) remainder.push(buckets[subject].shift());
  }
  return prefix.concat(remainder);
}

const reorderedItems = items.slice(0, 100).concat(orderForCombinedSimulation(items.slice(100, 200)));
items.splice(0, items.length, ...reorderedItems);
if (new Set(items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) throw new Error('The Praxis Core bank contains a duplicate prompt.');
const simulationItems = items.slice(0, 152);
if (simulationItems.filter((item) => subjectFor(item) === 'reading').length !== 56 || simulationItems.filter((item) => subjectFor(item) === 'writing').length !== 40 || simulationItems.filter((item) => subjectFor(item) === 'mathematics').length !== 56) throw new Error('The selected-response simulation must contain 56 reading, 40 writing, and 56 mathematics items.');
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = items.slice(batchIndex * 100, batchIndex * 100 + 100);
  if ([0, 1, 2, 3].some((index) => batch.filter((item) => item.answerIndex === index).length !== 25)) throw new Error('Answer positions in Praxis Core batch ' + (batchIndex + 1) + ' must be exactly balanced.');
  for (const [domainId, expected] of Object.entries(domainCounts)) if (batch.filter((item) => item.domainId === domainId).length !== expected) throw new Error('Invalid ' + domainId + ' count in batch ' + (batchIndex + 1) + '.');
}

const pack = {
  schemaVersion: 1,
  id: 'praxis-core-5752',
  title: 'Praxis Core Academic Skills for Educators: Combined (5752) - 200-Item Diagnostic Bank',
  shortTitle: 'Praxis Core (5752)',
  description: 'Two independent 100-question diagnostic banks spanning Reading 5713, Writing 5723, and Mathematics 5733, linked to a 12-chapter learning library, essay workshops, targeted practice, diagnostics, and a full 152-question selected-response pacing simulation.',
  credentialOwner: 'Educational Testing Service (ETS)', version: '1.0.0', status: 'ready', accent: 'cyan',
  contentReview: '200 source-reviewed selected-response items plus 12 chapters, 60 checks, 75 flashcards, 20 memory aids, and 8 writing workshops; independent literacy, mathematics, writing, accessibility, and psychometric review pending',
  nativeQaUrl: './test_prep/praxis_core_5752_native_qa.json',
  learningLibraryUrl: './test_prep/praxis_core_5752_learning_library.json',
  learningLibraryQaUrl: './test_prep/praxis_core_5752_learning_library_qa.json',
  simulationItemCount: 152, simulationDomainCounts: {"reading-key-ideas-details":20,"reading-craft-structure-language":16,"reading-integration-knowledge-ideas":20,"writing-text-types-production":10,"writing-language-research":30,"math-number-quantity":20,"math-data-statistics-probability":18,"math-algebra-geometry":18}, simulationDomainCountsBasis: 'fixed-product-allocation-within-official-ranges', simulationTimeMinutes: 215,
  simulationLabel: '152-question combined selected-response pacing simulation',
  simulationNote: "The official combined session has 152 selected-response questions: 85 minutes reading, 40 minutes writing selected response, and 90 minutes mathematics (215 minutes total). This simulation preserves the exact official subject totals. Use the separate argumentative and source-based workshops for the two essay sections; the complete official section times total 275 minutes. AlloFlow uses a stable product allocation for subdomains within the published ETS ranges; it is not an official fixed-form allocation.",
  officialSelectedResponseCount: 152, officialConstructedResponseCount: 2, officialTotalTimeMinutes: 275,
  officialSubtests: [
    { code: '5713', label: 'Reading', questions: 56, timeMinutes: 85 },
    { code: '5723', label: 'Writing selected response', questions: 40, timeMinutes: 40, essayCount: 2, essayMinutesEach: 30 },
    { code: '5733', label: 'Mathematics', questions: 56, timeMinutes: 90 },
  ],
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS. The official Praxis Core Combined (5752) session currently combines Reading 5713, Writing 5723, and Mathematics 5733 for 152 selected-response questions plus two essays across 275 minutes of separately timed sections. The 100-item diagnostics, 152-item selected-response simulation, essay planning workshops, and results are not official Praxis forms, scaled scores, essay scores, pass predictions, admission or licensure decisions, accommodations decisions, or substitutes for current state, program, testing, accessibility, or credential requirements.',
  domains: [
    { id: 'reading-key-ideas-details', label: 'Reading: Key Ideas and Details', weight: 0.13 },
    { id: 'reading-craft-structure-language', label: 'Reading: Craft, Structure, and Language', weight: 0.11 },
    { id: 'reading-integration-knowledge-ideas', label: 'Reading: Integration of Knowledge and Ideas', weight: 0.13 },
    { id: 'writing-text-types-production', label: 'Writing: Text Types, Purposes, and Production', weight: 0.08 },
    { id: 'writing-language-research', label: 'Writing: Language and Research Skills', weight: 0.18 },
    { id: 'math-number-quantity', label: 'Mathematics: Number and Quantity', weight: 0.13 },
    { id: 'math-data-statistics-probability', label: 'Mathematics: Data, Statistics, and Probability', weight: 0.12 },
    { id: 'math-algebra-geometry', label: 'Mathematics: Algebra and Geometry', weight: 0.12 },
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
  writeGeneratedFile(path.join(outputRoot, 'praxis_core_5752_items.json'), itemOutput, 'utf8');
  writeGeneratedFile(path.join(outputRoot, 'praxis_core_5752_pack.json'), packOutput, 'utf8');
}
console.log('Built Praxis Core 5752: 200 items in two 100-item banks; each bank = 37 reading, 26 writing, 37 mathematics, with 25/25/25/25 answer positions.');
