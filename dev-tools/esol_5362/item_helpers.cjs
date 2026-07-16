'use strict';

function q(task, scenarioA, scenarioB, correct, distractors, rationale, difficulty = 'application') {
  if (!Array.isArray(distractors) || distractors.length !== 3) throw new Error('Every ESOL item requires three distractors.');
  return {
    promptA: scenarioA + ' ' + task,
    promptB: scenarioB + ' ' + task,
    correct,
    distractors,
    rationale,
    difficulty,
  };
}

module.exports = { q };
