'use strict';

function q(promptA, promptB, correct, distractors, rationale, difficulty = 'application') {
  if (!Array.isArray(distractors) || distractors.length !== 3) throw new Error('Every item specification requires three distractors.');
  return { promptA, promptB, correct, distractors, rationale, difficulty };
}

function passageQ(a, b, askA, askB, correct, distractors, rationale, difficulty = 'application') {
  return q('Read the original passage: "' + a + '" ' + askA, 'Read the original passage: "' + b + '" ' + askB, correct, distractors, rationale, difficulty);
}

module.exports = { q, passageQ };
