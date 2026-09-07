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

const AP_US_GOVERNMENT_DISTRACTOR_FEEDBACK = Object.assign({}, ...units);

// Whitespace and apostrophe style (curly or straight) must not decide whether
// a distractor is recognised; the specs use both.
function normalizeChoiceText(value) {
  return String(value || '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

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
