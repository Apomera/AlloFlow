'use strict';

// Balanced-choice overrides for the Praxis School Psychologist (5403) source item banks.
// Ids use "P<bankIndex>.<questionIndex>" in item_content.cjs order. Each entry
// supplies three option-specific notes and may replace the key and/or the
// distractors; omitted fields keep the reviewed source wording.
const entries = [
  ...require('./part1.cjs'),
  ...require('./part2.cjs'),
  ...require('./part3.cjs'),
];

const byId = new Map();
for (const entry of entries) {
  if (byId.has(entry.id)) throw new Error(`Duplicate School Psychologist 5403 choice override id ${entry.id}.`);
  if (!Array.isArray(entry.notes) || entry.notes.length !== 3) throw new Error(`School Psychologist 5403 override ${entry.id} must supply three notes.`);
  if (entry.distractors && entry.distractors.length !== 3) throw new Error(`School Psychologist 5403 override ${entry.id} must supply three distractors.`);
  byId.set(entry.id, entry);
}

function applyChoiceOverrides(banks) {
  let applied = 0;
  const output = banks.map((bank, bankIndex) => ({
    ...bank,
    questions: bank.questions.map((question, questionIndex) => {
      const entry = byId.get(`P${bankIndex}.${questionIndex}`);
      if (!entry) return question;
      applied += 1;
      return {
        ...question,
        correct: entry.correct || question.correct,
        distractors: (entry.distractors || question.distractors).slice(),
        distractorNotes: entry.notes.slice(),
      };
    }),
  }));
  const total = banks.reduce((sum, bank) => sum + bank.questions.length, 0);
  if (applied !== total || byId.size !== total) throw new Error(`School Psychologist 5403 choice overrides covered ${applied}/${total} questions (${byId.size} entries).`);
  return output;
}

module.exports = { applyChoiceOverrides, entries };
