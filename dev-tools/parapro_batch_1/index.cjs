'use strict';

const part1 = require('./part1.cjs');
const part2 = require('./part2.cjs');

const overridesById = { ...part1, ...part2 };
const keys = Object.keys(overridesById);
if (keys.length !== 100) {
  throw new Error(`ParaPro Batch 1 choice overrides expected 100 entries, found ${keys.length}.`);
}

for (const [id, entry] of Object.entries(overridesById)) {
  if (!Array.isArray(entry.distractorNotes) || entry.distractorNotes.length !== 3) {
    throw new Error(`ParaPro Batch 1 override ${id} must supply three distractorNotes.`);
  }
  if (entry.choices && (!Array.isArray(entry.choices) || entry.choices.length !== 4)) {
    throw new Error(`ParaPro Batch 1 override ${id} choices must contain four strings.`);
  }
}

function applyParaproBatch1Overrides(items) {
  let applied = 0;
  const output = items.map((item) => {
    const entry = overridesById[item.id];
    if (!entry) return item;
    applied += 1;
    const next = { ...item };
    if (entry.prompt) next.prompt = entry.prompt;
    if (entry.choices) next.choices = entry.choices.slice();
    const nextRationales = Array.isArray(item.choiceRationales) ? item.choiceRationales.slice() : ['', '', '', ''];
    let d = 0;
    for (let i = 0; i < 4; i += 1) {
      if (i !== item.answerIndex) {
        nextRationales[i] = entry.distractorNotes[d++];
      }
    }
    next.choiceRationales = nextRationales;
    return next;
  });
  if (applied !== 100) {
    throw new Error(`ParaPro Batch 1 choice overrides applied to ${applied}/100 items.`);
  }
  return output;
}

module.exports = { applyParaproBatch1Overrides, overridesById };
