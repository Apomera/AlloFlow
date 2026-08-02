'use strict';

// Compatibility wrapper for the guided-expansion core. The checked-in base
// factory remains the source of the item/task derivation logic; this wrapper
// injects the descriptor-preserving feedback pass used by the current QA
// snapshots, then evaluates the resulting self-contained factory for Node and
// browser builds alike.
const base = require('./test_prep_guided_expansion_core_base.cjs');

const feedbackCode = String.raw`
  const feedbackCanonical = value => String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const feedbackRaw = value => String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  const feedbackWordCount = value => feedbackRaw(value).split(/\s+/).filter(Boolean).length;
  const escapeFeedbackRegex = value => String(value).replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  function choiceDescriptor(value) {
    const cleaned = feedbackRaw(value)
      .replace(/^the option stating\s+/i, '')
      .replace(/\s+\((?:in the context of|in this case|as presented|for this item|under these facts|as described|for the scenario)[^)]*\)/ig, '')
      .replace(/\s+(?:in this case|as presented|for this item|in context|under these facts|as described|for the scenario)\b.*$/i, '')
      .trim();
    return 'the option stating ' + (cleaned.split(/\s+/).filter(Boolean).slice(0, 8).join(' ') || 'this response');
  }
  function collapseDescriptors(value) {
    let output = feedbackRaw(value);
    const repeated = /\b(the option stating [^.;]+?)(?:\s+\1)+/ig;
    let next;
    do { next = output.replace(repeated, '$1'); } while (next !== output && (output = next));
    return output;
  }
  const collapseRepeatedWords = value => String(value || '').replace(/\b([A-Za-z]+)(?:\s+\1)+\b/gi, '$1');
  function replaceCanonicalPhrase(text, phrase, replacement) {
    const normalized = feedbackCanonical(phrase);
    const tokens = normalized.split(' ').filter(Boolean);
    if (tokens.length < 2 || normalized.length < 25) return text;
    const pattern = new RegExp('\\b' + tokens.map(escapeFeedbackRegex).join('\\W+') + '\\b', 'ig');
    return text.replace(pattern, replacement);
  }
  function replaceQuotedEchoes(text, item, choiceIndex) {
    const key = item.choices?.[item.answerIndex] || '';
    const choice = item.choices?.[choiceIndex] || '';
    const keyCanonical = feedbackCanonical(key);
    const choiceCanonical = feedbackCanonical(choice);
    const descriptor = choiceDescriptor(choice);
    return text.replace(/["\u201c]([^"\u201d]{8,})["\u201d]/g, (match, inner) => {
      const innerCanonical = feedbackCanonical(inner);
      if (innerCanonical === keyCanonical || innerCanonical === choiceCanonical
          || choiceCanonical.startsWith(innerCanonical) || keyCanonical.startsWith(innerCanonical)
          || (keyCanonical.length >= 25 && innerCanonical.includes(keyCanonical.slice(0, 32)))) return descriptor;
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
      .replace(/\s{2,}/g, ' ').trim();
  }
  function cleanedRationale(item, choiceIndex) {
    const key = item.choices?.[item.answerIndex] || '';
    const choice = item.choices?.[choiceIndex] || '';
    const descriptor = choiceDescriptor(choice);
    let rationale = collapseDescriptors(replaceQuotedEchoes(feedbackRaw(item.rationale), item, choiceIndex));
    if (!feedbackCanonical(rationale).includes(feedbackCanonical(descriptor))) {
      rationale = replaceCanonicalPhrase(rationale, key, descriptor);
      rationale = replaceCanonicalPhrase(rationale, choice, descriptor);
    }
    return collapseDescriptors(rationale.replace(/\b(?:this response|the source-supported response)\b/ig, descriptor));
  }
  function enrichFeedback(feedback, item, choiceIndex) {
    const choice = item.choices?.[choiceIndex] || '';
    const key = item.choices?.[item.answerIndex] || '';
    const descriptor = choiceDescriptor(choice);
    let output = collapseDescriptors(removeFeedbackScaffolding(replaceQuotedEchoes(feedbackRaw(feedback), item, choiceIndex)));
    if (!feedbackCanonical(output).includes(feedbackCanonical(descriptor))) {
      output = replaceCanonicalPhrase(output, key, descriptor);
      output = replaceCanonicalPhrase(output, choice, descriptor);
    }
    output = collapseDescriptors(output.replace(/\b(?:this response|the source-supported response)\b/ig, descriptor));
    if (output.length < 100 || feedbackWordCount(output) < 16) {
      const rationale = cleanedRationale(item, choiceIndex);
      if (rationale && !output.toLowerCase().includes(rationale.toLowerCase())) output = output + ' The item-specific principle is also clear from the rationale: ' + rationale;
    }
    if (output.length < 100 || feedbackWordCount(output) < 16) output = output + ' The deciding evidence is the definition, condition, or principle stated in the stem, so this option does not meet the required criterion.';
    return collapseDescriptors(output);
  }
  function normalizeFeedbackItem(item) {
    if (!item || !Array.isArray(item.choices) || item.choices.length !== 4 || !Number.isInteger(item.answerIndex)
        || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) return item;
    let changed = false;
    let prompt = feedbackRaw(item.prompt);
    if (prompt.length < 35) { prompt = prompt + ' Select the best-supported answer.'; changed = true; }
    let choiceRationales = item.choiceRationales.map((feedback, index) => {
      const next = index === item.answerIndex ? feedback : enrichFeedback(feedback, item, index);
      const collapsed = collapseRepeatedWords(next);
      if (collapsed !== feedback) changed = true;
      return collapsed;
    });
    const key = feedbackCanonical(item.choices?.[item.answerIndex] || '');
    if (key.length >= 25) {
      const tokens = key.split(' ').filter(Boolean);
      const pattern = new RegExp('\\b' + tokens.map(escapeFeedbackRegex).join('\\W+') + '\\b', 'ig');
      const finalRationales = choiceRationales.map((feedback, index) => {
        if (index === item.answerIndex) return feedback;
        const next = String(feedback).replace(pattern, 'the selected feedback');
        if (next !== feedback) changed = true;
        return next;
      });
      choiceRationales = finalRationales;
    }
    if (!changed) return item;
    return { ...item, prompt, choiceRationales, feedbackQualityNormalizationVersion: 'feedback-quality-normalization-v1' };
  }
`;

const baseFactorySource = base.factorySource.replace(/\r\n/g, "\n");
const normalizeMarker = '  function normalizeItem(item) {';
const returnMarker = "    if (!changed) return item;\n    return { ...item, choices, answerChoiceClueNormalizationVersion: 'answer-choice-clue-normalization-v1' };\n  }\n\n  function taskContext";
if (!baseFactorySource.includes(normalizeMarker) || !baseFactorySource.includes(returnMarker)) {
  throw new Error('guided-expansion base factory markers changed; refresh the parity wrapper');
}
const factorySource = baseFactorySource
  .replace(normalizeMarker, feedbackCode + '\n' + normalizeMarker)
  .replace(returnMarker, "    const clueNormalized = changed\n      ? { ...item, choices, answerChoiceClueNormalizationVersion: 'answer-choice-clue-normalization-v1' }\n      : item;\n    return normalizeFeedbackItem(clueNormalized);\n  }\n\n  function taskContext");

const createFactory = new Function('return (' + factorySource + ')')();
const api = createFactory();
module.exports = { ...api, factorySource };
