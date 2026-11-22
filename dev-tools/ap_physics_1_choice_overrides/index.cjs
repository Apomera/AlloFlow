'use strict';

const part1 = require('./part1.cjs');
const part2 = require('./part2.cjs');
const part3 = require('./part3.cjs');
const leakageFixes = require('./leakage_fixes.cjs');
const libraryChecks = require('./library_checks.cjs');

const AP_PHYSICS_1_CHOICE_OVERRIDES = {
  ...part1,
  ...part2,
  ...part3,
};
for (const [id, fix] of Object.entries(leakageFixes)) {
  AP_PHYSICS_1_CHOICE_OVERRIDES[id] = { ...(AP_PHYSICS_1_CHOICE_OVERRIDES[id] || {}), ...fix };
}

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyApPhysicsChoiceOverride(itemId, spec) {
  const override = AP_PHYSICS_1_CHOICE_OVERRIDES[itemId];
  if (!override) return spec;
  const next = { ...spec };
  if (override.prompt) next.prompt = override.prompt;
  if (override.answer) next.answer = override.answer;
  if (override.distractorReplacements) {
    const normalizedMap = new Map(
      Object.entries(override.distractorReplacements).map(([k, v]) => [normalizeLookup(k), v])
    );
    const matched = new Set();
    next.distractors = spec.distractors.map((choice) => {
      const key = normalizeLookup(choice);
      if (normalizedMap.has(key)) {
        matched.add(key);
        return normalizedMap.get(key);
      }
      return choice;
    });
    if (matched.size !== normalizedMap.size) {
      const missing = [...normalizedMap.keys()].filter((k) => !matched.has(k));
      throw new Error('Unmatched AP Physics 1 distractor replacement(s) for ' + itemId + ': ' + missing.join(' | '));
    }
  }
  return next;
}

module.exports = {
  AP_PHYSICS_1_CHOICE_OVERRIDES,
  AP_PHYSICS_1_LIBRARY_CHECKS: libraryChecks,
  applyApPhysicsChoiceOverride,
};
