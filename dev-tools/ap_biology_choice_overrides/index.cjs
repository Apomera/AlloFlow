'use strict';

const part1 = require('./part1.cjs');
const part2 = require('./part2.cjs');
const part3 = require('./part3.cjs');
const leakageFixes = require('./leakage_fixes.cjs');
const feedbackEnrichment = require('./feedback_enrichment.cjs');
const libraryChecks = require('./library_checks.cjs');

const AP_BIOLOGY_CHOICE_OVERRIDES = {
  ...part1,
  ...part2,
  ...part3,
};
for (const [id, fix] of Object.entries(leakageFixes)) {
  AP_BIOLOGY_CHOICE_OVERRIDES[id] = { ...(AP_BIOLOGY_CHOICE_OVERRIDES[id] || {}), ...fix };
}

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyApBioChoiceOverride(itemId, spec) {
  const override = AP_BIOLOGY_CHOICE_OVERRIDES[itemId];
  const fbOverrides = feedbackEnrichment[itemId];
  if (!override && !fbOverrides) return spec;
  const next = { ...spec };
  if (override && override.prompt) next.prompt = override.prompt;
  if (override && override.answer) next.answer = override.answer;
  if (override && override.distractorReplacements) {
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
      throw new Error('Unmatched AP Biology distractor replacement(s) for ' + itemId + ': ' + missing.join(' | '));
    }
  }
  if (fbOverrides) {
    next.wrongReasons = spec.wrongReasons.slice();
    for (const [idxStr, reason] of Object.entries(fbOverrides)) {
      const idx = Number(idxStr);
      if (!Number.isInteger(idx) || idx < 0 || idx >= next.wrongReasons.length) {
        throw new Error('Invalid AP Biology wrongReason index ' + idxStr + ' for ' + itemId);
      }
      next.wrongReasons[idx] = reason;
    }
  }
  return next;
}

function applyApBioLibraryCheckOverride(check) {
  const override = libraryChecks[check.id];
  if (!override) return check;
  const nextChoices = check.choices.slice();
  if (override.answer) nextChoices[check.answerIndex] = override.answer;
  return { ...check, choices: nextChoices };
}

module.exports = {
  AP_BIOLOGY_CHOICE_OVERRIDES,
  AP_BIOLOGY_LIBRARY_CHECK_OVERRIDES: libraryChecks,
  applyApBioChoiceOverride,
  applyApBioLibraryCheckOverride,
};
