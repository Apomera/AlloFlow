'use strict';

// Balanced-choice overrides for the elementary reading item banks.
// Each entry lists the bank/question positions it replaces ("S" = specialist
// source order, "R" = Teaching Reading standalone source order) and supplies a
// rewritten key, three plausible distractors, and three option-specific notes.
const entries = [
  ...require('./part1.cjs'),
  ...require('./part2.cjs'),
  ...require('./part3.cjs'),
  ...require('./part4.cjs'),
];
const keyTrims = require('./key_trims.cjs');

const byId = new Map();
for (const entry of entries) {
  const ids = entry.ids.split(/\s+/).filter(Boolean);
  const trimmed = ids.map((id) => keyTrims[id]).find(Boolean);
  const resolved = { ...entry, correct: trimmed || entry.correct };
  for (const id of ids) {
    if (byId.has(id)) throw new Error(`Duplicate reading choice override id ${id}.`);
    byId.set(id, resolved);
  }
}

function applyChoiceOverrides(banks, prefix) {
  if (prefix !== 'S' && prefix !== 'R') throw new Error('Reading choice override prefix must be S or R.');
  let applied = 0;
  const output = banks.map((bank, bankIndex) => ({
    ...bank,
    questions: bank.questions.map((question, questionIndex) => {
      const entry = byId.get(`${prefix}${bankIndex}.${questionIndex}`);
      if (!entry) return question;
      applied += 1;
      return {
        ...question,
        correct: entry.correct,
        distractors: entry.distractors.slice(),
        distractorNotes: entry.notes.slice(),
      };
    }),
  }));
  const total = banks.reduce((sum, bank) => sum + bank.questions.length, 0);
  if (applied !== total) throw new Error(`Reading choice overrides covered ${applied}/${total} ${prefix} questions.`);
  return output;
}

module.exports = { applyChoiceOverrides, entries };
