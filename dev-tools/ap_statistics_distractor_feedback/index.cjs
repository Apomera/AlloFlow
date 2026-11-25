'use strict';
// Option-level feedback for every distractor in the AP Statistics foundation
// pilot, merged from three part modules. Part modules use short keys
// ('item-001'); this index expands them to full item ids. The builder looks
// each item up by id and each distractor up by its exact text, and refuses to
// build if any entry is missing, so the feedback cannot drift from the items.
const PACK_ID = 'ap-statistics-foundation-pilot';
const parts = [
  require('./part1.cjs'),
  require('./part2.cjs'),
  require('./part3.cjs'),
];

const enrichmentParts = [
  require('../ap_statistics_choice_overrides/feedback_enrichment_p1.cjs'),
  require('../ap_statistics_choice_overrides/feedback_enrichment_p2.cjs'),
  require('../ap_statistics_choice_overrides/feedback_enrichment_p3.cjs'),
];

const AP_STATISTICS_DISTRACTOR_FEEDBACK = {};
parts.forEach((part) => {
  Object.keys(part).forEach((shortId) => {
    const fullId = shortId.startsWith(PACK_ID) ? shortId : PACK_ID + '-' + shortId;
    if (AP_STATISTICS_DISTRACTOR_FEEDBACK[fullId]) throw new Error('Duplicate distractor feedback entry for ' + fullId);
    AP_STATISTICS_DISTRACTOR_FEEDBACK[fullId] = { ...part[shortId] };
  });
});

// Whitespace, apostrophe style, and minus-sign style must not decide whether
// a distractor is recognised; the specs mix them.
function normalizeChoiceText(value) {
  return String(value || '').replace(/[‘’]/g, "'").replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim();
}

enrichmentParts.forEach((enrichment) => {
  Object.entries(enrichment).forEach(([fullId, overrides]) => {
    const entry = AP_STATISTICS_DISTRACTOR_FEEDBACK[fullId];
    if (!entry) throw new Error('Unknown AP Statistics feedback enrichment item: ' + fullId);
    Object.entries(overrides).forEach(([choiceText, enrichedNote]) => {
      const wanted = normalizeChoiceText(choiceText);
      const existingKey = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
      if (!existingKey) throw new Error('Unmatched AP Statistics feedback enrichment key for ' + fullId + ': ' + choiceText);
      entry[existingKey] = enrichedNote;
    });
  });
});

const mathFixes = require('../item_quality_patches/ap_calc_stats_math_fixes.cjs').ap_statistics_foundation_pilot || {};
Object.entries(mathFixes).forEach(([fullId, patch]) => {
  const entry = AP_STATISTICS_DISTRACTOR_FEEDBACK[fullId];
  if (!entry || !Array.isArray(patch.choices) || !Array.isArray(patch.choiceRationales)) return;
  patch.choices.forEach((choiceText, idx) => {
    const note = patch.choiceRationales[idx];
    if (!note || /^Best answer\./i.test(note)) return;
    entry[choiceText] = note;
  });
});

function distractorFeedbackFor(itemId, choiceText) {
  const entry = AP_STATISTICS_DISTRACTOR_FEEDBACK[itemId];
  if (!entry) return null;
  const wanted = normalizeChoiceText(choiceText);
  const key = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
  return key ? entry[key] : null;
}

module.exports = { AP_STATISTICS_DISTRACTOR_FEEDBACK, distractorFeedbackFor, normalizeChoiceText, PACK_ID };
