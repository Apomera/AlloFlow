'use strict';
// Option-level feedback for every distractor in the AP U.S. Government
// foundation pilot, merged from one module per unit. The builder looks each
// item up by id and each distractor up by its exact text, and refuses to build
// if any entry is missing or stale, so the feedback can never drift from the
// items it explains.
const units = [
  require('./unit1.cjs'),
  require('./unit2.cjs'),
  require('./unit3.cjs'),
  require('./unit4.cjs'),
  require('./unit5.cjs'),
];

const enrichmentParts = [
  require('../ap_us_government_choice_overrides/feedback_enrichment_p1.cjs'),
  require('../ap_us_government_choice_overrides/feedback_enrichment_p2.cjs'),
  require('../ap_us_government_choice_overrides/feedback_enrichment_p3.cjs'),
];

const AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK = {};
units.forEach((unitMap) => {
  Object.keys(unitMap).forEach((itemId) => {
    AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK[itemId] = { ...unitMap[itemId] };
  });
});

// Whitespace and apostrophe style (curly or straight) must not decide whether
// a distractor is recognised; the specs use both.
function normalizeChoiceText(value) {
  return String(value || '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

enrichmentParts.forEach((enrichment) => {
  Object.entries(enrichment).forEach(([itemId, overrides]) => {
    const entry = AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK[itemId];
    if (!entry) throw new Error('Unknown AP U.S. Government feedback enrichment item: ' + itemId);
    Object.entries(overrides).forEach(([choiceText, enrichedNote]) => {
      const wanted = normalizeChoiceText(choiceText);
      const existingKey = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
      if (!existingKey) throw new Error('Unmatched AP U.S. Government feedback enrichment key for ' + itemId + ': ' + choiceText);
      entry[existingKey] = enrichedNote;
    });
  });
});

// Returns the feedback sentence for one distractor of one item, or null when
// the module has no entry for it.
function distractorFeedbackFor(itemId, choiceText) {
  const entry = AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK[itemId];
  if (!entry) return null;
  const wanted = normalizeChoiceText(choiceText);
  const key = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
  return key ? entry[key] : null;
}

module.exports = { AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK, distractorFeedbackFor, normalizeChoiceText };
