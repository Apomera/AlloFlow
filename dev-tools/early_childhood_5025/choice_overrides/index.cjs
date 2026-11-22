'use strict';

const part1 = require('./part1.cjs');
const part2 = require('./part2.cjs');
const part3 = require('./part3.cjs');

const entries = [...part1, ...part2, ...part3];
const byId = new Map();

for (const entry of entries) {
  if (!entry || typeof entry.id !== 'string') {
    throw new Error('Early Childhood 5025 choice override entry is missing a string id.');
  }
  if (byId.has(entry.id)) {
    throw new Error(`Duplicate Early Childhood 5025 choice override id ${entry.id}.`);
  }
  if (!Array.isArray(entry.distractors) || entry.distractors.length !== 3) {
    throw new Error(`Early Childhood 5025 choice override ${entry.id} must supply three distractors.`);
  }
  if (!Array.isArray(entry.notes) || entry.notes.length !== 3) {
    throw new Error(`Early Childhood 5025 choice override ${entry.id} must supply three distractor notes.`);
  }
  byId.set(entry.id, entry);
}

function cleanPromptA(prompt) {
  return String(prompt || '')
    .replace(/\bhow should a elementary literacy teacher\b/, 'how should an elementary literacy teacher')
    .replace(/during systematic K–6 phonics instruction,/g, 'during systematic early-childhood and early-elementary phonics instruction,');
}

function cleanPromptB(prompt) {
  let text = String(prompt || '')
    .replace(/^For a parallel early-childhood language and literacy decision,\s+/, '')
    .replace(/reviews this parallel content problem:/g, 'reviews this content problem:')
    .replace(/\?map\.\?/g, 'the word map.')
    .replace(/\?jumped\?/g, '“jumped”')
    .replace(/\?jumpt\?/g, '“jumpt”')
    .replace(/\?running\?/g, '“running”')
    .replace(/\?runing\.\?/g, '“runing.”');
  if (text.length > 0 && /^[a-z]/.test(text)) {
    text = text[0].toUpperCase() + text.slice(1);
  }
  return text;
}

function applyChoiceOverrides(banks) {
  let applied = 0;
  const output = banks.map((bank, bankIndex) => ({
    ...bank,
    questions: bank.questions.map((question, questionIndex) => {
      const entry = byId.get(`EC${bankIndex}.${questionIndex}`);
      if (!entry) return question;
      applied += 1;
      return {
        ...question,
        promptA: cleanPromptA(question.promptA),
        promptB: cleanPromptB(question.promptB),
        correct: entry.correct,
        distractors: entry.distractors.slice(),
        distractorNotes: entry.notes.slice(),
      };
    }),
  }));
  const total = banks.reduce((sum, bank) => sum + bank.questions.length, 0);
  if (applied !== total || byId.size !== total) {
    throw new Error(`Early Childhood 5025 choice overrides covered ${applied}/${total} questions (${byId.size} entries).`);
  }
  return output;
}

module.exports = { applyChoiceOverrides, entries };
