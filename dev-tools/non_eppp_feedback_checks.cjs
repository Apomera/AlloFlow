'use strict';

const { canonical, tokenSet } = require('./non_eppp_warning_checks.cjs');

function hasChoiceSpecificFeedback(choice, feedback) {
  const normalizedChoice = canonical(choice);
  const normalizedFeedback = canonical(feedback);
  if (!normalizedChoice || normalizedFeedback.length < 50) return false;
  if (normalizedFeedback.includes(normalizedChoice)) return true;
  const feedbackTokens = tokenSet(feedback);
  return [...tokenSet(choice)].some((token) => feedbackTokens.has(token));
}

module.exports = { hasChoiceSpecificFeedback };
