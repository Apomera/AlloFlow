#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const banks = structuredClone(require('./item_content.cjs'));

function questionAt(position) {
  let cursor = 0;
  for (const bank of banks) {
    if (position <= cursor + bank.questions.length) return bank.questions[position - cursor - 1];
    cursor += bank.questions.length;
  }
  throw new Error(`Teaching Reading source position ${position} is missing.`);
}

function cleanLibraryVisibleText(value) {
  return String(value || '')
    .replace(/phoneme\?grapheme/gi, 'phoneme\u2013grapheme')
    .replace(/\b(measure|student|task)\?s\b/gi, "$1's");
}

// Additional Group C credential/scope corrections that affect only the second
// parallel stem. The prompt-A source used by library checks/cards is unchanged.
for (let position = 17; position <= 25; position++) {
  questionAt(position).promptB = questionAt(position).promptB
    .replace(/^During a recursive decoding lesson,\s*/i,
      'During explicit K-6 decoding and word-analysis instruction, ');
}
for (const bank of banks) {
  bank.leadB = String(bank.leadB || '').replace(/^During a recursive decoding lesson,\s*/i,
    'During explicit K-6 decoding and word-analysis instruction, ');
  bank.leadA = cleanLibraryVisibleText(bank.leadA);
  bank.leadB = cleanLibraryVisibleText(bank.leadB);
  for (const question of bank.questions) {
    for (const field of ['promptA', 'promptB', 'correct', 'rationale']) {
      question[field] = cleanLibraryVisibleText(question[field]);
    }
    question.distractors = question.distractors.map(cleanLibraryVisibleText);
  }
}
questionAt(16).promptB = 'While reviewing an emergent reader\u2019s evidence, an elementary classroom teacher hears students name printed letter\u2013sound correspondences but call the activity phonemic awareness. How should the teacher clarify the instruction?';
questionAt(20).promptB = 'During an explicit upper-elementary decoding lesson, a fifth-grade student can read short words but guesses at long academic words. What should instruction include?';
questionAt(21).promptB = 'During an explicit upper-elementary decoding lesson, how can prefixes, suffixes, and roots support students reading complex grade-level words?';
questionAt(55).promptB = 'While integrating word and passage work, a teacher tells students to \u201cuse a strategy\u201d but never demonstrates it. What should the teacher change?';
questionAt(61).promptB = 'While planning meaning-focused text instruction, a classroom has many books and a word wall that students rarely use. What should the classroom teacher change?';
questionAt(34).distractors = questionAt(34).distractors.map((choice) =>
  choice.replace(/intelligence\?achievement/gi, 'intelligence\u2013achievement'));

const questions = banks.flatMap((bank) => bank.questions);
if (banks.length !== 12 || questions.length !== 100) {
  throw new Error(`Expected 12 Teaching Reading banks and 100 source kernels; found ${banks.length}/${questions.length}.`);
}

const foreignScope = /\b(?:reading specialist|literacy specialist|literacy coach|coach(?:es|ed|ing)?|adolescen\w*|older readers?|5302|secondary|recursive decoding)\b|grades?\s*(?:7|8|9|10|11|12)\b/i;
const malformedStrategyQuote = /\?use a strategy\?|intelligence\?achievement/i;
const encodingCorruption = /\u00e2(?:\u0080|\u20ac)|\u00c3[\u0080-\u00ff]|\ufffd|phoneme\?grapheme|\b(?:measure|student|task)\?s\b/i;
for (const [index, question] of questions.entries()) {
  const text = JSON.stringify(question);
  if (foreignScope.test(text) || malformedStrategyQuote.test(text) || encodingCorruption.test(text)) {
    throw new Error(`Foreign credential/grade-band language remains in Teaching Reading source position ${index + 1}.`);
  }
}

if (foreignScope.test(JSON.stringify(banks)) || malformedStrategyQuote.test(JSON.stringify(banks)) || encodingCorruption.test(JSON.stringify(banks))) {
  throw new Error('Foreign credential/grade-band language remains outside a Teaching Reading question kernel.');
}

const output = path.join(__dirname, 'standalone_item_content.json');
fs.writeFileSync(output, JSON.stringify(banks, null, 2) + '\n');
console.log('Snapshotted standalone Teaching Reading 5205 source: 12 banks, 100 kernels, zero 5302/specialist/coach/adolescent/secondary leakage.');
