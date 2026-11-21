'use strict';

function q(promptA, promptB, correct, distractors, rationale, distractorNotes, options) {
  if (!Array.isArray(distractors) || distractors.length !== 3) {
    throw new Error('Every item specification requires three distractors.');
  }
  const extra = typeof options === 'string'
    ? { difficulty: options }
    : (options && typeof options === 'object' ? options : {});
  const notes = Array.isArray(distractorNotes) ? distractorNotes : null;
  if (!notes || notes.length !== 3) {
    throw new Error('Every item specification requires three authored distractor notes for: ' + promptA.slice(0, 60));
  }
  return {
    promptA,
    promptB,
    correct,
    distractors,
    rationale,
    distractorNotes: notes,
    difficulty: extra.difficulty || 'application',
    rationaleB: extra.rationaleB || null,
    variantB: extra.variantB || null,
  };
}

function passageQ(a, b, askA, askB, correct, distractors, rationale, distractorNotes, options) {
  return q(
    'Read the original passage: "' + a + '" ' + askA,
    'Read the original passage: "' + b + '" ' + askB,
    correct,
    distractors,
    rationale,
    distractorNotes,
    options,
  );
}

module.exports = { q, passageQ };
