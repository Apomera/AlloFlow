'use strict';

const baseItems = require('./items.cjs');
const leakageFixes = require('./leakage_fixes.cjs');
const { FOUNDATIONAL_CHECKS, TRANSFER_CHECK_OVERRIDES } = require('./library_checks.cjs');
const shortRationales = {
  ...require('../ap_stem_short_rationales/ap_stats_phys_chem.cjs').ap_statistics_foundation_pilot,
  ...require('../ap_stem_short_rationales/wave2_phys_stats.cjs').ap_statistics_foundation_pilot,
};

const items = { ...baseItems };
for (const [id, fix] of Object.entries(leakageFixes)) {
  items[id] = { ...(items[id] || {}), ...fix };
}

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2212/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyApStatsChoiceOverride(itemId, spec) {
  const override = items[itemId];
  const enrichedRationale = shortRationales[itemId];
  if (!override && !enrichedRationale) return spec;
  const next = { ...spec };
  if (enrichedRationale) next.rationale = enrichedRationale;
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
      throw new Error('Unmatched distractor replacement(s) for ' + itemId + ': ' + missing.join(' | '));
    }
  }
  return next;
}

function buildTransferCheckChoices(rawChoices, override) {
  const answer = (override && override.answer) || rawChoices[0];
  const distractors = rawChoices.slice(1);
  const answerIndex = override && Number.isInteger(override.answerIndex) ? override.answerIndex : 0;
  const rotated = [];
  let d = 0;
  for (let i = 0; i < 4; i += 1) {
    rotated.push(i === answerIndex ? answer : distractors[d++]);
  }
  return { choices: rotated, answerIndex };
}

module.exports = {
  AP_STATISTICS_CHOICE_OVERRIDES: items,
  AP_STATISTICS_FOUNDATIONAL_CHECKS: FOUNDATIONAL_CHECKS,
  AP_STATISTICS_TRANSFER_CHECK_OVERRIDES: TRANSFER_CHECK_OVERRIDES,
  applyApStatsChoiceOverride,
  buildTransferCheckChoices,
};
