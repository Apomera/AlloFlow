'use strict';
// Option-level feedback for every distractor in the AP Calculus AB foundation
// pilot, merged from two part modules. Part modules use short keys ('item-001');
// this index expands them to full item ids. The builder looks each item up by
// id and each distractor up by its exact text, refusing to build if any entry
// is missing so the feedback cannot drift from the items.
const PACK_ID = 'ap-calculus-ab-foundation-pilot';
const parts = [
  require('./part1.cjs'),
  require('./part2.cjs'),
];

const feedbackEnrichment = require('../ap_calculus_ab_choice_overrides/feedback_enrichment.cjs');

const AP_CALCULUS_AB_DISTRACTOR_FEEDBACK = {};
parts.forEach((part) => {
  Object.keys(part).forEach((shortId) => {
    const fullId = shortId.startsWith(PACK_ID) ? shortId : PACK_ID + '-' + shortId;
    if (AP_CALCULUS_AB_DISTRACTOR_FEEDBACK[fullId]) {
      throw new Error('Duplicate distractor feedback entry for ' + fullId);
    }
    AP_CALCULUS_AB_DISTRACTOR_FEEDBACK[fullId] = { ...part[shortId] };
  });
});

function normalizeChoiceText(value) {
  return String(value || '').replace(/[‘’]/g, "'").replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
}

Object.entries(feedbackEnrichment).forEach(([fullId, overrides]) => {
  const entry = AP_CALCULUS_AB_DISTRACTOR_FEEDBACK[fullId];
  if (!entry) throw new Error('Unknown AP Calculus AB feedback enrichment item: ' + fullId);
  Object.entries(overrides).forEach(([choiceText, enrichedNote]) => {
    const wanted = normalizeChoiceText(choiceText);
    const existingKey = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
    if (!existingKey) throw new Error('Unmatched AP Calculus AB feedback enrichment key for ' + fullId + ': ' + choiceText);
    entry[existingKey] = enrichedNote;
  });
});

function distractorFeedbackFor(itemId, choiceText) {
  const entry = AP_CALCULUS_AB_DISTRACTOR_FEEDBACK[itemId];
  if (!entry) return null;
  const wanted = normalizeChoiceText(choiceText);
  const key = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
  return key ? entry[key] : null;
}

module.exports = {
  AP_CALCULUS_AB_DISTRACTOR_FEEDBACK,
  distractorFeedbackFor,
  normalizeChoiceText,
  PACK_ID,
};
