'use strict';

const lexicalLeakageStopwords = new Set([
  'about', 'among', 'because', 'being', 'between', 'could', 'each', 'from',
  'have', 'into', 'more', 'most', 'other', 'should', 'than', 'that', 'their',
  'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under',
  'until', 'what', 'when', 'where', 'which', 'while', 'with', 'within', 'would',
]);

function canonical(value) {
  return String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function raw(value) {
  return String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function words(value) {
  return raw(value).split(/\s+/).filter(Boolean).length;
}

function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter((token) =>
    token.length > 3 && !lexicalLeakageStopwords.has(token)
  ));
}

function warningCodes(item) {
  const findings = [];
  const choices = item.choices || [];
  const key = choices[item.answerIndex] || '';
  if (raw(item.prompt).length < 35) findings.push('short-prompt');
  if (choices.length === 4 && key) {
    const lengths = choices.map((choice) => canonical(choice).length);
    const answerLength = lengths[item.answerIndex];
    const longestWrong = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    if (answerLength >= longestWrong + 20 && answerLength >= longestWrong * 1.75) {
      findings.push('severe-answer-length-clue');
    }
    const stem = tokenSet(item.prompt);
    const keyed = tokenSet(key);
    const distractors = choices.filter((_, index) => index !== item.answerIndex).map(tokenSet);
    if ([...stem].some((token) => keyed.has(token) && distractors.every((set) => !set.has(token)))) {
      findings.push('key-stem-lexical-leakage');
    }
    const extreme = /\b(?:always|never|only|entirely|completely|guarantees?|immediately|automatically|all students|no students)\b/i;
    if (choices.filter((choice, index) => index !== item.answerIndex && extreme.test(choice)).length >= 2
        && !extreme.test(key)) {
      findings.push('asymmetric-extreme-distractors');
    }
  }
  if (String(item.difficulty || '').toLowerCase() === 'advanced'
      && /^(?:what is|which .* (?:defines|means)|complete the statement)/i.test(raw(item.prompt))) {
    findings.push('advanced-direct-recall');
  }
  const generic = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|does not represent the best available answer)\b/i;
  for (let index = 0; index < (item.choiceRationales || []).length; index += 1) {
    if (index === item.answerIndex) continue;
    const feedback = raw(item.choiceRationales[index]);
    const normalizedFeedback = canonical(feedback);
    const choice = canonical(choices[index]);
    const normalizedKey = canonical(key);
    if (feedback.length < 100 || words(feedback) < 16 || generic.test(feedback)) {
      findings.push('incorrect-option-feedback-detail');
    }
    if (choice.length >= 25 && normalizedFeedback.startsWith(choice.slice(0, Math.min(60, choice.length)))) {
      findings.push('incorrect-option-choice-restatement');
    }
    if (normalizedKey.length >= 25 && normalizedFeedback.includes(normalizedKey)) {
      findings.push('incorrect-option-full-key-echo');
    }
  }
  return [...new Set(findings)];
}

module.exports = { canonical, lexicalLeakageStopwords, tokenSet, warningCodes };
