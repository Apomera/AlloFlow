'use strict';
// Option-level feedback for every distractor in the AP U.S. History foundation
// pilot, merged from six part modules. Part modules use short keys
// ('item-001'); this index expands them to full item ids
// ('apush-foundation-001'). The builder looks each item up by id and each
// distractor up by its exact text, and refuses to build if any entry is
// missing, so the feedback cannot drift from the items it explains.
const ID_PREFIX = 'apush-foundation-';
const parts = [
  require('./part1.cjs'),
  require('./part2.cjs'),
  require('./part3.cjs'),
  require('./part4.cjs'),
  require('./part5.cjs'),
  require('./part6.cjs'),
];

const AP_US_HISTORY_DISTRACTOR_FEEDBACK = {};
parts.forEach((part) => {
  Object.keys(part).forEach((shortId) => {
    const fullId = shortId.startsWith(ID_PREFIX) ? shortId : ID_PREFIX + shortId.replace(/^item-/, '');
    if (AP_US_HISTORY_DISTRACTOR_FEEDBACK[fullId]) throw new Error('Duplicate distractor feedback entry for ' + fullId);
    AP_US_HISTORY_DISTRACTOR_FEEDBACK[fullId] = part[shortId];
  });
});

// Whitespace, apostrophe style, and dash style must not decide whether a
// distractor is recognised; the specs mix them.
function normalizeChoiceText(value) {
  return String(value || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[−–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function distractorFeedbackFor(itemId, choiceText) {
  const entry = AP_US_HISTORY_DISTRACTOR_FEEDBACK[itemId];
  if (!entry) return null;
  const wanted = normalizeChoiceText(choiceText);
  const key = Object.keys(entry).find((candidate) => normalizeChoiceText(candidate) === wanted);
  return key ? entry[key] : null;
}

module.exports = { AP_US_HISTORY_DISTRACTOR_FEEDBACK, distractorFeedbackFor, normalizeChoiceText, ID_PREFIX };
