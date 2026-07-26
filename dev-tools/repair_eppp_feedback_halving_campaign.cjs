#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writePairedFiles } = require('./eppp_quality_campaign_core.cjs');
const {
  BASELINE_SNAPSHOT,
  CAMPAIGN_ID,
  COMBINED_PROJECTED_SNAPSHOT,
  POST_DEEP_BASELINE_COHORT,
  POST_DEEP_BASELINE_SNAPSHOT,
  POST_DEEP_EXPECTED_COMPOSITION,
  REVIEWED_AT,
  TARGET_CEILINGS,
  buildCampaignData,
  protectedItemSnapshot,
  sha256,
} = require('./eppp_feedback_halving_campaign_data.cjs');

const GENERIC_PATTERN = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const CONTENT_STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'also', 'among', 'because', 'before', 'being',
  'between', 'could', 'does', 'during', 'each', 'from', 'have', 'into', 'itself',
  'more', 'most', 'other', 'rather', 'should', 'than', 'that', 'their', 'there',
  'these', 'this', 'those', 'through', 'under', 'using', 'what', 'when', 'where',
  'which', 'while', 'with', 'would',
]);
const DOMAIN_FRAMES = Object.freeze({
  assessment: 'assessment purpose, score meaning, or psychometric inference',
  biological: 'biological mechanism, structure, or behavioral consequence',
  'cognitive-affective': 'cognitive, learning, memory, or affective process',
  intervention: 'clinical formulation, intervention target, or treatment procedure',
  lifespan: 'developmental process, age-linked pattern, or contextual influence',
  professional: 'ethical duty, legal authority, or professional decision rule',
  research: 'design, measurement, or statistical inference',
  'social-cultural': 'social process, group influence, or cultural interpretation',
});

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function feedbackCodes(item, optionIndex, feedback) {
  const text = String(feedback || '').trim();
  const normalizedFeedback = normalize(text);
  const normalizedChoice = normalize(item.choices[optionIndex]);
  const normalizedKey = normalize(item.choices[item.answerIndex]);
  const codes = [];
  if (text.length < 100 || wordCount(text) < 16) codes.push('insufficient-detail');
  if (GENERIC_PATTERN.test(text)) codes.push('generic-template');
  if (normalizedChoice.length >= 25
    && normalizedFeedback.startsWith(normalizedChoice.slice(0, Math.min(60, normalizedChoice.length)))) {
    codes.push('choice-restatement');
  }
  if (normalizedKey.length >= 25 && normalizedFeedback.includes(normalizedKey)) codes.push('full-key-echo');
  return codes;
}

function diagnosticSummary(bank) {
  const optionFindings = [];
  const itemIds = new Set();
  for (const item of bank) {
    item.choiceRationales.forEach((feedback, optionIndex) => {
      if (optionIndex === item.answerIndex) return;
      const codes = feedbackCodes(item, optionIndex, feedback);
      if (!codes.length) return;
      itemIds.add(item.id);
      optionFindings.push({ id: item.id, optionIndex, codes });
    });
  }
  const count = (code) => optionFindings.filter((finding) => finding.codes.includes(code)).length;
  return {
    itemsWithWarnings: itemIds.size,
    incorrectOptionsWithWarnings: optionFindings.length,
    insufficientDetailOptions: count('insufficient-detail'),
    genericTemplateOptions: count('generic-template'),
    choiceRestatementOptions: count('choice-restatement'),
    fullKeyEchoOptions: count('full-key-echo'),
  };
}

function contentTokens(value) {
  return [...new Set(normalize(value).split(' ').filter((token) => (
    token.length >= 4 && !CONTENT_STOP_WORDS.has(token)
  )))];
}

function splitSentences(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskFullKey(text, key) {
  const tokens = String(key || '').trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (normalize(key).length < 25 || !tokens.length) return text;
  const pattern = new RegExp(tokens.map(escapeRegExp).join('[^A-Za-z0-9]+'), 'ig');
  return String(text).replace(pattern, 'the keyed principle');
}

function sanitizeStockPhrases(text) {
  return String(text || '')
    .replace(/\bis not best because\b/ig, 'does not fit this case because')
    .replace(/\bdoes not meet the defining condition or distinction\b/ig, 'misses the defining distinction')
    .replace(/\bthe supported response is\b/ig, 'the rationale identifies')
    .replace(/\bmakes an absolute or unconditional claim\b/ig, 'uses a scope claim broader than the evidence')
    .replace(/\bdoes not represent the best available answer\b/ig, 'does not fit the stated evidence')
    .replace(/\s+/g, ' ')
    .trim();
}

function chooseGroundingSentence(item, optionIndex) {
  const choiceTokens = new Set(contentTokens(item.choices[optionIndex]));
  const candidates = splitSentences(item.rationale).map((sentence, position) => ({
    sentence,
    position,
    overlap: contentTokens(sentence).filter((token) => choiceTokens.has(token)).length,
  }));
  candidates.sort((left, right) => right.overlap - left.overlap || left.position - right.position);
  const selected = candidates[0] ? candidates[0].sentence : item.rationale;
  return sanitizeStockPhrases(maskFullKey(selected, item.choices[item.answerIndex]));
}

function confidentLegacyReason(item, optionIndex) {
  const text = String(item.choiceRationales[optionIndex] || '').trim();
  if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed') return '';
  const codes = feedbackCodes(item, optionIndex, text);
  if (codes.length !== 1 || codes[0] !== 'insufficient-detail') return '';
  if (text.length < 28 || wordCount(text) < 5 || normalize(text) === normalize(item.rationale)) return '';
  const choiceTokens = new Set(contentTokens(item.choices[optionIndex]));
  const overlap = contentTokens(text).filter((token) => choiceTokens.has(token));
  return overlap.length ? text : '';
}

function stemFocus(prompt) {
  const compact = String(prompt || '').replace(/\s+/g, ' ').trim().replace(/[?:]\s*$/, '');
  return compact.length <= 190 ? compact : `${compact.slice(0, 187).trim()}...`;
}

function ensureDetail(item, optionIndex, text) {
  let result = sanitizeStockPhrases(maskFullKey(text, item.choices[item.answerIndex]));
  if (feedbackCodes(item, optionIndex, result).includes('insufficient-detail')) {
    result += ` The decisive context is the stem's request about ${stemFocus(item.prompt)}, which must be interpreted with the cited rationale.`;
  }
  result = sanitizeStockPhrases(maskFullKey(result, item.choices[item.answerIndex]));
  if (normalize(result).startsWith(normalize(item.choices[optionIndex]))) {
    result = `This alternative frames the issue as ${result.charAt(0).toLowerCase()}${result.slice(1)}`;
  }
  return result;
}

function buildOptionFeedback(item, optionIndex) {
  const legacy = confidentLegacyReason(item, optionIndex);
  const grounding = chooseGroundingSentence(item, optionIndex);
  let text;
  let mode;
  if (legacy) {
    text = `${legacy} The rationale sharpens that contrast by noting: ${grounding}`;
    mode = 'source-reviewed-legacy-reason-expanded';
  } else {
    const choice = String(item.choices[optionIndex]).trim().replace(/[.]+$/, '');
    const frame = DOMAIN_FRAMES[item.domainId] || 'construct or decision rule';
    const variants = [
      `This alternative applies the ${frame} represented by “${choice}.” It would become relevant if the case actually established that description. The rationale instead emphasizes: ${grounding}`,
      `Choosing “${choice}” would shift the question to a different ${frame}. That alternative belongs in a case defined by its own conditions; here, the item rationale states: ${grounding}`,
      `The inference behind “${choice}” concerns another ${frame}. Its defining facts would have to be present for it to control the decision. In this item, the rationale identifies the operative evidence: ${grounding}`,
      `This response interprets the facts through “${choice},” a neighboring ${frame}. That interpretation would apply only when its stated features governed the case. The current rationale instead explains: ${grounding}`,
    ];
    text = variants[optionIndex % variants.length];
    mode = 'rationale-grounded-option-contrast-draft';
  }
  text = ensureDetail(item, optionIndex, text);
  const codes = feedbackCodes(item, optionIndex, text);
  if (codes.length) throw new Error(`${item.id} option ${optionIndex} retained warnings: ${codes.join(', ')}.`);
  const rationaleOverlap = contentTokens(text).filter((token) => contentTokens(item.rationale).includes(token));
  if (rationaleOverlap.length < 1) throw new Error(`${item.id} option ${optionIndex} lacks rationale grounding.`);
  const choiceOverlap = contentTokens(text).filter((token) => contentTokens(item.choices[optionIndex]).includes(token));
  if (mode === 'rationale-grounded-option-contrast-draft'
    ? !normalize(text).includes(normalize(item.choices[optionIndex]))
    : choiceOverlap.length === 0) {
    throw new Error(`${item.id} option ${optionIndex} lacks an explicit option-specific contrast.`);
  }
  return { text, mode };
}

function assertProtectedFields(entry, item) {
  const actual = sha256(protectedItemSnapshot(item));
  if (actual !== entry.protectedFingerprint) throw new Error(`${entry.id} changed a protected item field.`);
}

function buildCampaign(bank, diagnostics, legacy = POST_DEEP_BASELINE_COHORT) {
  const campaignData = buildCampaignData(bank, diagnostics, legacy);
  if (campaignData.entries.length !== POST_DEEP_EXPECTED_COMPOSITION.totalItems) {
    throw new Error('The sequenced feedback campaign must contain exactly 420 items.');
  }
  const before = diagnosticSummary(bank);
  const repaired = JSON.parse(JSON.stringify(bank));
  let feedbackWhitespaceNormalized = 0;
  let keyedExplanationsNormalized = 0;
  for (const item of repaired) {
    if (!Array.isArray(item.choices)
      || !Number.isInteger(item.answerIndex)
      || item.answerIndex < 0
      || item.answerIndex >= item.choices.length
      || !Array.isArray(item.choiceRationales)
      || item.choiceRationales.length !== item.choices.length
      || item.choiceRationales.some((feedback) => typeof feedback !== 'string')
      || typeof item.rationale !== 'string'
      || !item.rationale.trim()) {
      throw new Error((item.id || 'Unknown item') + ' cannot normalize keyed feedback because its answer contract is incomplete.');
    }
    for (let optionIndex = 0; optionIndex < item.choiceRationales.length; optionIndex += 1) {
      const trimmed = item.choiceRationales[optionIndex].trim();
      if (trimmed !== item.choiceRationales[optionIndex]) {
        item.choiceRationales[optionIndex] = trimmed;
        feedbackWhitespaceNormalized += 1;
      }
    }
    if (item.choiceRationales[item.answerIndex] !== item.rationale) {
      item.choiceRationales[item.answerIndex] = item.rationale;
      keyedExplanationsNormalized += 1;
    }
  }
  const itemById = new Map(repaired.map((item) => [item.id, item]));
  const auditItems = [];
  let explanationsReplaced = 0;
  let legacyReasonsExpanded = 0;
  let generatedContrastDrafts = 0;
  let preclearedExplanationsPreserved = 0;

  for (const entry of campaignData.entries) {
    const item = itemById.get(entry.id);
    assertProtectedFields(entry, item);
    if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) {
      throw new Error(`${item.id} must retain four choice explanations.`);
    }
    const modes = {};
    for (let optionIndex = 0; optionIndex < item.choices.length; optionIndex += 1) {
      if (optionIndex === item.answerIndex) continue;
      const existingCodes = feedbackCodes(item, optionIndex, item.choiceRationales[optionIndex]);
      if (!existingCodes.length) {
        modes[optionIndex] = item.feedbackHalvingModes && item.feedbackHalvingModes[optionIndex]
          ? item.feedbackHalvingModes[optionIndex]
          : 'precleared-explanation-preserved';
        preclearedExplanationsPreserved += 1;
        continue;
      }
      const built = buildOptionFeedback(item, optionIndex);
      item.choiceRationales[optionIndex] = built.text;
      modes[optionIndex] = built.mode;
      explanationsReplaced += 1;
      if (built.mode === 'source-reviewed-legacy-reason-expanded') legacyReasonsExpanded += 1;
      if (built.mode === 'rationale-grounded-option-contrast-draft') generatedContrastDrafts += 1;
    }
    item.feedbackHalvingCampaign = CAMPAIGN_ID;
    item.feedbackHalvingCampaignAt = REVIEWED_AT;
    item.feedbackHalvingModes = modes;

    const incorrectIndexes = item.choices.map((_choice, index) => index).filter((index) => index !== item.answerIndex);
    const normalizedExplanations = incorrectIndexes.map((index) => normalize(item.choiceRationales[index]));
    if (new Set(normalizedExplanations).size !== 3) throw new Error(`${item.id} needs three distinct incorrect-option explanations.`);
    for (const optionIndex of incorrectIndexes) {
      const codes = feedbackCodes(item, optionIndex, item.choiceRationales[optionIndex]);
      if (codes.length) throw new Error(`${item.id} option ${optionIndex} failed final feedback gates.`);
    }
    assertProtectedFields(entry, item);
    auditItems.push({
      id: item.id,
      family: entry.family,
      expectedAnswerIndex: entry.expectedAnswerIndex,
      protectedFingerprint: entry.protectedFingerprint,
      modes,
    });
  }

  const after = diagnosticSummary(repaired);
  for (const key of Object.keys(before)) {
    if (after[key] > before[key]) throw new Error(`Campaign increased ${key}.`);
  }
  const selectedIds = new Set(campaignData.ids);
  const selectedWarningsAfter = repaired.reduce((total, item) => (
    total + (selectedIds.has(item.id)
      ? item.choiceRationales.filter((feedback, index) => index !== item.answerIndex && feedbackCodes(item, index, feedback).length).length
      : 0)
  ), 0);
  if (selectedWarningsAfter !== 0) throw new Error('The campaign did not clear every selected feedback warning.');

  const deepPrerequisiteSatisfied = Object.keys(POST_DEEP_BASELINE_SNAPSHOT)
    .every((key) => before[key] <= POST_DEEP_BASELINE_SNAPSHOT[key]);
  const halvingTargetsSatisfied = Object.keys(TARGET_CEILINGS)
    .every((key) => after[key] <= TARGET_CEILINGS[key]);
  const audit = {
    schemaVersion: 1,
    campaignId: CAMPAIGN_ID,
    generatedAt: REVIEWED_AT,
    status: halvingTargetsSatisfied ? 'automated-gates-pass-editorial-review-required' : 'draft-awaiting-deep-campaign',
    reviewStatus: 'No independent human or licensed-psychologist review is claimed.',
    scope: 'A feedback-only lane sequenced after the frozen deep-distractor campaign; deep-campaign ids are excluded.',
    baselineReference: BASELINE_SNAPSHOT,
    postDeepExpectedBaseline: POST_DEEP_BASELINE_SNAPSHOT,
    combinedProjectedSnapshot: COMBINED_PROJECTED_SNAPSHOT,
    targetCeilings: TARGET_CEILINGS,
    liveBefore: before,
    liveAfter: after,
    deepPrerequisiteSatisfied,
    halvingTargetsSatisfied,
    selectedWarningsAfter,
    fingerprints: campaignData.fingerprints,
    summary: {
      selectedItems: campaignData.entries.length,
      explanationsReplaced,
      legacyReasonsExpanded,
      generatedContrastDrafts,
      preclearedExplanationsPreserved,
      feedbackWhitespaceNormalized,
      keyedExplanationsNormalized,
    },
    items: auditItems,
    limitations: [
      'The generated contrast explanations are deterministic editorial drafts grounded in existing rationales, not independent expert validation.',
      'Passing length and phrase heuristics cannot establish factual accuracy, psychometric quality, or instructional usefulness.',
      'A qualified reviewer should confirm each distractor mapping, especially for ethics, legal, diagnostic, assessment, and quantitative content.',
      'Source metadata is preserved rather than independently re-verified by this runner.',
    ],
  };
  return { bank: repaired, audit, campaignData };
}


function runCampaign(root, { write = false, requireDeepPrerequisite = write } = {}) {
  const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
  const deployPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_native_items.json');
  const diagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const deployText = fs.readFileSync(deployPath, 'utf8');
  if (sourceText !== deployText) throw new Error('Source and deploy EPPP banks differ before the feedback campaign.');
  const bank = JSON.parse(sourceText);
  const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
  const result = buildCampaign(bank, diagnostics);
  if (requireDeepPrerequisite && !result.audit.deepPrerequisiteSatisfied) {
    throw new Error('Run the frozen deep-distractor campaign and regenerate diagnostics before writing this feedback-only lane.');
  }
  if (write) {
    if (!result.audit.halvingTargetsSatisfied) throw new Error('Refusing to write because the combined feedback targets are not satisfied.');
    const bankJson = `${JSON.stringify(result.bank, null, 2)}\n`;
    const auditJson = `${JSON.stringify(result.audit, null, 2)}\n`;
    writePairedFiles({ sourcePath, deployPath, contents: bankJson });
    writePairedFiles({
      sourcePath: path.join(root, 'test_prep', 'eppp_feedback_halving_campaign_audit.json'),
      deployPath: path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_feedback_halving_campaign_audit.json'),
      contents: auditJson,
    });
  }
  return result;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const write = process.argv.includes('--write');
  const result = runCampaign(root, { write });
  console.log(`${CAMPAIGN_ID}: ${write ? 'wrote' : 'dry-ran'} ${result.audit.summary.selectedItems} items; ${result.audit.status}.`);
}

module.exports = {
  buildCampaign,
  buildOptionFeedback,
  confidentLegacyReason,
  diagnosticSummary,
  feedbackCodes,
  normalize,
  runCampaign,
};
