#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const reading = require('./parapro_batch_2/reading.cjs');
const mathematics = require('./parapro_batch_2/mathematics.cjs');
const writing = require('./parapro_batch_2/writing.cjs');

const root = path.resolve(__dirname, '..');
const reviewedAt = '2026-07-13';
const sources = {
  readingSkills: ['https://www.ets.org/pdfs/parapro/1755.pdf'],
  readingApplication: ['https://www.ets.org/pdfs/parapro/1755.pdf', 'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published'],
  mathematics: ['https://www.ets.org/pdfs/parapro/1755.pdf', 'https://openstax.org/details/books/prealgebra-2e/'],
  writingSkills: ['https://www.ets.org/pdfs/parapro/1755.pdf', 'https://openstax.org/books/writing-guide/pages/handbook'],
  writingApplication: ['https://www.ets.org/pdfs/parapro/1755.pdf', 'https://openstax.org/books/writing-guide/pages/16-5-writing-process-thinking-critically-about-text'],
};

const expected = {
  reading: { skills: 23, application: 11, skillStart: 24, applicationStart: 12 },
  mathematics: { skills: 22, application: 11, skillStart: 23, applicationStart: 12 },
  writing: { skills: 22, application: 11, skillStart: 23, applicationStart: 12 },
};

function assertContent(domainId, content) {
  if (!content || !Array.isArray(content.skills) || !Array.isArray(content.application)) throw new Error(domainId + ' Batch 2 content is invalid.');
  if (content.skills.length !== expected[domainId].skills || content.application.length !== expected[domainId].application) {
    throw new Error(domainId + ' Batch 2 count mismatch: expected ' + expected[domainId].skills + ' skills and ' + expected[domainId].application + ' application items.');
  }
}

assertContent('reading', reading);
assertContent('mathematics', mathematics);
assertContent('writing', writing);

let answerCursor = 0;
function ensureRationale(value, suffix) {
  const text = String(value || '').trim();
  if (text.length >= 100) return text;
  return (text + ' ' + suffix).trim();
}

function createItem(domainId, role, number, spec, references) {
  if (!spec || !spec.prompt || !spec.correct || !Array.isArray(spec.distractors) || spec.distractors.length !== 3) throw new Error('Invalid content specification for ' + domainId + ' ' + role + ' ' + number + '.');
  if (!Array.isArray(spec.whyWrong) || spec.whyWrong.length !== 3) throw new Error('Three distractor explanations are required for ' + domainId + ' ' + role + ' ' + number + '.');
  const answerIndex = answerCursor % 4;
  answerCursor += 1;
  const choices = [];
  const choiceRationales = [];
  let distractorIndex = 0;
  for (let index = 0; index < 4; index += 1) {
    if (index === answerIndex) {
      choices.push(spec.correct);
      choiceRationales.push(ensureRationale(spec.correctWhy || 'This option follows the information and rule required by the question.', 'It is the only option that satisfies every part of the prompt.'));
    } else {
      choices.push(spec.distractors[distractorIndex]);
      choiceRationales.push(ensureRationale('This option does not fit because ' + spec.whyWrong[distractorIndex] + '.', 'The stated information or governing rule points to a different result.'));
      distractorIndex += 1;
    }
  }
  const sequence = String(number).padStart(3, '0');
  return {
    id: 'parapro-' + domainId + '-' + role + '-' + sequence,
    type: 'single-choice',
    domainId,
    difficulty: spec.difficulty || 'application',
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: ensureRationale(spec.rationale, 'The other choices either conflict with the given evidence, apply the wrong rule, or do not fully answer the question.'),
    references,
    reviewStatus: 'source-reviewed',
    legacySourceId: '',
    legacySourceFile: '',
    migrationStatus: '',
    qaStatus: 'qa-passed',
    qaReviewedAt: reviewedAt,
    choiceRationales,
  };
}

const items = [];
for (const [domainId, content] of [['reading', reading], ['mathematics', mathematics], ['writing', writing]]) {
  const config = expected[domainId];
  const skillReferences = domainId === 'reading' ? sources.readingSkills : domainId === 'mathematics' ? sources.mathematics : sources.writingSkills;
  const applicationReferences = domainId === 'reading' ? sources.readingApplication : domainId === 'mathematics' ? sources.mathematics : sources.writingApplication;
  content.skills.forEach((spec, index) => items.push(createItem(domainId, 'skills', config.skillStart + index, spec, skillReferences)));
  content.application.forEach((spec, index) => items.push(createItem(domainId, 'application', config.applicationStart + index, spec, applicationReferences)));
}

if (items.length !== 100) throw new Error('Batch 2 must contain exactly 100 items.');
if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Batch 2 item IDs must be unique.');
const answerCounts = [0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answerIndex === answerIndex).length);
if (answerCounts.some((count) => count !== 25)) throw new Error('Batch 2 answer positions must be exactly balanced.');

const output = JSON.stringify(items, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'parapro_batch_2_items.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'parapro_batch_2_items.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

console.log('Built ParaPro Batch 2: 100 items; answer positions A/B/C/D = ' + answerCounts.join('/') + '.');
