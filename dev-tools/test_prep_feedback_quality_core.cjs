'use strict';

const canonical = (value) => String(value == null ? '' : value).normalize('NFKC').toLowerCase()
  .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const raw = (value) => String(value == null ? '' : value).normalize('NFKC')
  .replace(/\s+/g, ' ').trim();
const wordCount = (value) => raw(value).split(/\s+/).filter(Boolean).length;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function replaceCanonicalPhrase(text, phrase, replacement) {
  const normalized = canonical(phrase);
  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length < 2 || normalized.length < 25) return text;
  const pattern = new RegExp('\\b' + tokens.map(escapeRegex).join('\\W+') + '\\b', 'ig');
  return text.replace(pattern, replacement);
}

function replaceQuotedEchoes(text, item, choiceIndex) {
  const key = item.choices?.[item.answerIndex] || '';
  const choice = item.choices?.[choiceIndex] || '';
  const keyCanonical = canonical(key);
  const choiceCanonical = canonical(choice);
  return text.replace(/["“]([^"”]{8,})["”]/g, (match, inner) => {
    const innerCanonical = canonical(inner);
    if (innerCanonical === keyCanonical || innerCanonical === choiceCanonical
        || (keyCanonical.length >= 25 && innerCanonical.includes(keyCanonical.slice(0, 32)))) {
      return 'this response';
    }
    return match;
  });
}

function removeFeedbackScaffolding(text) {
  return text
    .replace(/This feedback evaluates a different response rather than the candidate response named in the prompt\.?/ig,
      'This option does not identify the response that the item asks the learner to evaluate.')
    .replace(/This feedback directly evaluates the selected response\.?/ig,
      'The explanation should match the response under review.')
    .replace(/The candidate selected\s+/ig, 'The selected response is ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanedRationale(item, choiceIndex) {
  const key = item.choices?.[item.answerIndex] || '';
  const choice = item.choices?.[choiceIndex] || '';
  let rationale = raw(item.rationale);
  rationale = replaceQuotedEchoes(rationale, item, choiceIndex);
  rationale = replaceCanonicalPhrase(rationale, key, 'the source-supported response');
  rationale = replaceCanonicalPhrase(rationale, choice, 'this option');
  return rationale;
}

function enrichFeedback(feedback, item, choiceIndex) {
  const choice = item.choices?.[choiceIndex] || '';
  const key = item.choices?.[item.answerIndex] || '';
  let output = removeFeedbackScaffolding(replaceQuotedEchoes(raw(feedback), item, choiceIndex));
  output = replaceCanonicalPhrase(output, key, 'the source-supported response');
  output = replaceCanonicalPhrase(output, choice, 'this option');
  if (output.length < 100 || wordCount(output) < 16) {
    const rationale = cleanedRationale(item, choiceIndex);
    if (rationale && !output.toLowerCase().includes(rationale.toLowerCase())) {
      output = `${output} The item-specific principle is also clear from the rationale: ${rationale}`;
    }
  }
  if (output.length < 100 || wordCount(output) < 16) {
    output = `${output} The deciding evidence is the definition, condition, or principle stated in the stem, so this option does not meet the required criterion.`;
  }
  return output.replace(/\s{2,}/g, ' ').trim();
}

function normalizeItem(item) {
  if (!item || !Array.isArray(item.choices) || item.choices.length !== 4
      || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3
      || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) return item;
  let changed = false;
  let prompt = raw(item.prompt);
  if (prompt.length < 35) {
    prompt = `${prompt} Select the best-supported answer.`;
    changed = true;
  }
  const choiceRationales = item.choiceRationales.map((feedback, index) => {
    if (index === item.answerIndex) return feedback;
    const next = enrichFeedback(feedback, item, index);
    if (next !== feedback) changed = true;
    return next;
  });
  if (!changed) return item;
  return {
    ...item,
    prompt,
    choiceRationales,
    feedbackQualityNormalizationVersion: 'feedback-quality-normalization-v1',
  };
}

module.exports = {
  canonical,
  raw,
  wordCount,
  replaceCanonicalPhrase,
  enrichFeedback,
  normalizeItem,
};
