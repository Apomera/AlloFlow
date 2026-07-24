#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { clean, normalize, parseChoiceReasons } = require('./eppp_editorial_support.cjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const auditPath = path.join(__dirname, 'eppp_option_feedback_wave_01_audit.json');
const auditMarkdownPath = path.join(__dirname, 'eppp_option_feedback_wave_01_audit.md');
const legacyAuditPath = path.join(root, 'test_prep', 'eppp_legacy', 'content_audit.json');
const reviewedAt = '2026-07-16';
const waveId = 'eppp-option-feedback-wave-01';

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const legacyAudit = JSON.parse(fs.readFileSync(legacyAuditPath, 'utf8'));
const legacyById = new Map(legacyAudit.reviewQueue.map((item) => [item.id, item]));
const targetItems = bank.filter((item) => !Array.isArray(item.choiceRationales)
  || item.choiceRationales.length !== item.choices.length
  || item.optionFeedbackReviewWave === waveId);

const stopWords = new Set('a an and are as at be because been being best both but by can could did do does for from had has have how in into is it its may more most not of on one only or other rather should so than that the their them then there these they this those through to under use used uses using was were what when where which while who with would'.split(' '));
const feedbackRows = [];
const recoveryExclusions = new Set(['eppp-b001-cognitive-1:0']);

function tokens(value) {
  return [...new Set(normalize(value).split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)).map((word) => word.replace(/(?:ing|ed|es|s)$/, '')))];
}

function dice(left, right) {
  const a = tokens(left);
  const b = new Set(tokens(right));
  if (!a.length || !b.size) return 0;
  return (2 * a.filter((word) => b.has(word)).length) / (a.length + b.size);
}

function permutations(values) {
  if (values.length < 2) return [values];
  return values.flatMap((value, index) => permutations(values.slice(0, index).concat(values.slice(index + 1))).map((tail) => [value].concat(tail)));
}

function pairMetrics(currentChoice, legacyChoice, legacyReason) {
  const current = normalize(currentChoice);
  const previous = normalize(legacyChoice);
  const containment = current.length >= 5 && previous.length >= 5 && (current.includes(previous) || previous.includes(current)) ? 0.35 : 0;
  const directScore = dice(currentChoice, legacyChoice);
  const reasonScore = dice(currentChoice, legacyReason);
  const currentNumbers = currentChoice.match(/\d+(?:\.\d+)?/g) || [];
  const previousNumbers = legacyChoice.match(/\d+(?:\.\d+)?/g) || [];
  const numericConflict = currentNumbers.length > 0
    && previousNumbers.length > 0
    && currentNumbers.join('|') !== previousNumbers.join('|');
  return {
    score: Math.min(1, containment + 0.7 * directScore + 0.3 * reasonScore),
    containment: containment > 0,
    directScore,
    reasonScore,
    numericConflict,
  };
}

function mappedReasons(item, legacyItem) {
  const reasons = parseChoiceReasons(legacyItem);
  const currentWrong = item.choices.map((_, index) => index).filter((index) => index !== item.answerIndex);
  const legacyWrong = Object.keys(reasons).map(Number).filter((index) => index !== legacyItem.answerIndex);
  if (currentWrong.length !== 3 || legacyWrong.length !== 3) return new Map();
  let best = null;
  for (const order of permutations(legacyWrong)) {
    const pairs = currentWrong.map((currentIndex, position) => {
      const metrics = pairMetrics(item.choices[currentIndex], legacyItem.choices[order[position]], reasons[order[position]]);
      return { currentIndex, legacyIndex: order[position], reason: reasons[order[position]], ...metrics };
    });
    const total = pairs.reduce((sum, pair) => sum + pair.score, 0);
    if (!best || total > best.total) best = { total, pairs };
  }
  return new Map(best.pairs.filter((pair) => !recoveryExclusions.has(item.id + ':' + pair.currentIndex)
    && pair.score >= 0.42
    && !pair.numericConflict
    && pair.reasonScore >= 0.08
    && (pair.containment || pair.directScore >= 0.65)).map((pair) => [pair.currentIndex, pair]));
}

function firstSentence(value) {
  const text = clean(value);
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}

function supportSentence(item, choice) {
  const sentences = clean(item.rationale).split(/(?<=[.!?])\s+/).filter(Boolean);
  const ranked = sentences.map((sentence) => ({ sentence: sentence.trim(), score: dice(choice, sentence) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 0.08 ? ranked[0].sentence : firstSentence(item.rationale);
}

function tidyRecoveredReason(value) {
  let text = clean(value)
    .replace(/\s*[→⇒]\s*/g, ' - ')
    .replace(/\bRELATIONSHIP\b/g, 'relationship')
    .replace(/\bNOT\b/g, 'not')
    .replace(/\bALL\b/g, 'all')
    .replace(/\bONLY\b/g, 'only')
    .replace(/\bINACCURATE\b/g, 'inaccurate')
    .replace(/\bMATCH\b/g, 'match')
    .replace(/\b(?:FAIL|ARE|HAS|IS|NEGATIVELY|SIGNIFICANT)\b/g, (word) => word.toLowerCase());
  if (!/[.!?]$/.test(text)) text += '.';
  return text;
}

function fallbackOpening(item, choice) {
  const prompt = item.prompt;
  if (/\b(?:always|never|only|every|entirely|completely|guarantee|automatically|regardless)\b/i.test(choice)) {
    return `“${choice}” makes an absolute or unconditional claim that the reviewed distinction does not support.`;
  }
  if (/\d/.test(choice) && /\d/.test(item.rationale)) {
    return `“${choice}” uses a value, threshold, or calculation that does not follow the relationship explained for this item.`;
  }
  if (/best (?:response|action|next step|course)|should (?:first|next|primarily)/i.test(prompt)) {
    return `“${choice}” does not satisfy the ethical, clinical, or methodological priority identified in the reviewed explanation.`;
  }
  if (/primarily (?:assesses|measures|describes|reflects|indicates|supports)|primary (?:purpose|function)/i.test(prompt)) {
    return `“${choice}” describes a different purpose, function, or inference than the one asked about in the stem.`;
  }
  if (/illustrates|refers to|best described as|best classified as|which (?:effect|theory|principle|construct|concept|term|memory system)/i.test(prompt)) {
    return `“${choice}” names a different construct or process than the pattern defined in the reviewed explanation.`;
  }
  return `“${choice}” does not meet the defining condition or distinction in this question.`;
}

function feedbackFor(item, index, mapped) {
  if (index === item.answerIndex) return { text: clean(item.rationale), method: 'current-reviewed-rationale' };
  const correctChoice = item.choices[item.answerIndex];
  const support = supportSentence(item, item.choices[index]);
  const recovered = mapped.get(index);
  if (recovered) {
    return {
      text: `${tidyRecoveredReason(recovered.reason)} In this item, “${correctChoice}” is supported because the reviewed explanation states: ${support}`,
      method: 'semantically-matched-reviewed-source-reason',
      matchScore: Math.round(recovered.score * 1000) / 1000,
    };
  }
  return {
    text: `${fallbackOpening(item, item.choices[index])} ${support} The supported response is “${correctChoice}.”`,
    method: 'current-reviewed-rationale-contrast',
  };
}

for (const item of targetItems) {
  const legacyItem = legacyById.get(item.legacySourceId);
  if (!legacyItem) throw new Error(`${item.id} does not resolve to its editorial source record.`);
  const mapped = mappedReasons(item, legacyItem);
  const details = item.choices.map((_, index) => feedbackFor(item, index, mapped));
  item.choiceRationales = details.map((detail) => detail.text);
  item.optionFeedbackReviewWave = waveId;
  item.optionFeedbackReviewedAt = reviewedAt;
  feedbackRows.push({
    id: item.id,
    domainId: item.domainId,
    methods: details.map((detail) => detail.method),
    matchScores: details.map((detail) => detail.matchScore || null),
    feedbackLengths: item.choiceRationales.map((value) => value.length),
  });
}

for (const item of bank) {
  if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) throw new Error(`${item.id} lacks four option explanations.`);
  if (item.choiceRationales.some((value) => clean(value).length < 20)) throw new Error(`${item.id} contains undersized option feedback.`);
  if (item.optionFeedbackReviewWave === waveId && clean(item.choiceRationales[item.answerIndex]) !== clean(item.rationale)) throw new Error(`${item.id} does not preserve the reviewed answer rationale.`);
}

const methodCounts = {};
for (const row of feedbackRows) for (const method of row.methods) methodCounts[method] = (methodCounts[method] || 0) + 1;
const domainCounts = Object.fromEntries([...new Set(feedbackRows.map((row) => row.domainId))].sort().map((domainId) => [domainId, feedbackRows.filter((row) => row.domainId === domainId).length]));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  reviewedAt,
  waveId,
  standard: {
    purpose: 'Complete four-option learner feedback for the previously incomplete EPPP items without changing their prompts, choices, keys, rationales, or sources.',
    reuseRule: 'A prior reviewed distractor explanation is reused only after semantic option matching meets the declared threshold; all other feedback is a conservative contrast derived from the current source-reviewed rationale.',
    limitation: 'This editorial pass is not psychometric calibration, official exam approval, or independent licensed-psychologist validation.',
  },
  summary: {
    upgradedItems: feedbackRows.length,
    completeBankItems: bank.filter((item) => item.choiceRationales.length === 4).length,
    totalBankItems: bank.length,
    methodCounts,
    domainCounts,
  },
  items: feedbackRows,
};

if (feedbackRows.length !== 476) throw new Error(`Expected to upgrade 476 items; found ${feedbackRows.length}.`);
if (report.summary.completeBankItems !== 1500) throw new Error(`Expected 1,500 complete items; found ${report.summary.completeBankItems}.`);

const markdown = `# EPPP option-feedback completion wave 01\n\nGenerated: ${report.generatedAt}\n\n## Result\n\n- ${report.summary.upgradedItems} previously incomplete questions now have four option explanations.\n- ${report.summary.completeBankItems} / ${report.summary.totalBankItems} EPPP questions now have complete option-feedback arrays.\n- ${methodCounts['semantically-matched-reviewed-source-reason'] || 0} explanations recovered through thresholded semantic matching to reviewed source records.\n- ${methodCounts['current-reviewed-rationale-contrast'] || 0} explanations use conservative contrasts grounded in the current reviewed rationale.\n- Correct-answer feedback preserves the current reviewed rationale exactly.\n\n> ${report.standard.limitation}\n`;

const serialized = JSON.stringify(bank, null, 2) + '\n';
fs.writeFileSync(sourcePath, serialized);
fs.writeFileSync(deployPath, serialized);
fs.writeFileSync(auditPath, JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync(auditMarkdownPath, markdown);
console.log(`EPPP option feedback: ${feedbackRows.length} upgraded; ${report.summary.completeBankItems}/${report.summary.totalBankItems} complete.`);
