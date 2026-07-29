'use strict';

const crypto = require('crypto');
const zlib = require('zlib');

const CAMPAIGN_ID = 'eppp-feedback-halving-campaign';
const REVIEWED_AT = '2026-07-25';

const BASELINE_SNAPSHOT = Object.freeze({
  itemsWithWarnings: 1309,
  incorrectOptionsWithWarnings: 3789,
  insufficientDetailOptions: 1357,
  genericTemplateOptions: 2354,
  choiceRestatementOptions: 1665,
  fullKeyEchoOptions: 1436,
});

const TARGET_CEILINGS = Object.freeze({
  itemsWithWarnings: 654,
  incorrectOptionsWithWarnings: 1894,
  insufficientDetailOptions: 678,
  genericTemplateOptions: 1177,
  choiceRestatementOptions: 832,
  fullKeyEchoOptions: 718,
});

const PLANNED_REDUCTIONS = Object.freeze({
  itemsWithWarnings: 680,
  incorrectOptionsWithWarnings: 2040,
  insufficientDetailOptions: 720,
  genericTemplateOptions: 1320,
  choiceRestatementOptions: 1134,
  fullKeyEchoOptions: 1134,
});

const PROJECTED_SNAPSHOT = Object.freeze({
  itemsWithWarnings: 629,
  incorrectOptionsWithWarnings: 1749,
  insufficientDetailOptions: 637,
  genericTemplateOptions: 1034,
  choiceRestatementOptions: 531,
  fullKeyEchoOptions: 302,
});

const DEEP_REWRITE_REDUCTIONS = Object.freeze({
  itemsWithWarnings: 248,
  incorrectOptionsWithWarnings: 726,
  insufficientDetailOptions: 279,
  genericTemplateOptions: 432,
  choiceRestatementOptions: 370,
  fullKeyEchoOptions: 308,
});

const POST_DEEP_BASELINE_SNAPSHOT = Object.freeze({
  itemsWithWarnings: 1061,
  incorrectOptionsWithWarnings: 3063,
  insufficientDetailOptions: 1078,
  genericTemplateOptions: 1922,
  choiceRestatementOptions: 1295,
  fullKeyEchoOptions: 1128,
});

const POST_DEEP_FEEDBACK_REDUCTIONS = Object.freeze({
  itemsWithWarnings: 420,
  incorrectOptionsWithWarnings: 1260,
  insufficientDetailOptions: 402,
  genericTemplateOptions: 858,
  choiceRestatementOptions: 858,
  fullKeyEchoOptions: 858,
});

const COMBINED_PROJECTED_SNAPSHOT = Object.freeze({
  itemsWithWarnings: 641,
  incorrectOptionsWithWarnings: 1803,
  insufficientDetailOptions: 676,
  genericTemplateOptions: 1064,
  choiceRestatementOptions: 437,
  fullKeyEchoOptions: 270,
});

const POST_DEEP_EXPECTED_COMPOSITION = Object.freeze({
  tripleCeg: 286,
  tripleInsufficient: 134,
  tripleGeneric: 0,
  totalItems: 420,
  incorrectOptions: 1260,
});

const POST_DEEP_TRIPLE_INSUFFICIENT_DOMAIN_QUOTAS = Object.freeze({
  assessment: 20,
  biological: 14,
  'cognitive-affective': 18,
  intervention: 22,
  lifespan: 19,
  professional: 20,
  research: 7,
  'social-cultural': 14,
});

// Cohort identity is frozen, but protected content is intentionally rematerialized
// after later protected-key editorial waves (see materializeDescriptors).
const POST_DEEP_EXPECTED_FINGERPRINTS = Object.freeze({
  selection: '796d90d0c26e71169497e3867bf8f9eb5575d33106aa156a8f5a41bb35e768e7',
  composition: '86336c1c190009dfd3972a1da6411f805cdff04d9dae028e968adf052408da0a',
});
const POST_DEEP_ORIGINAL_PROTECTED_CONTENT_FINGERPRINT = 'ceec818bf610aa66b5257fb39f759a74cf910b6438941834ba7cb2115ac4bbaa';

const FAMILY_SIGNATURES = Object.freeze({
  tripleCeg: [
    'choice-restatement+full-key-echo+generic-template',
    'choice-restatement+full-key-echo+generic-template',
    'choice-restatement+full-key-echo+generic-template',
  ].join(' | '),
  tripleInsufficient: [
    'insufficient-detail',
    'insufficient-detail',
    'insufficient-detail',
  ].join(' | '),
  tripleGeneric: [
    'generic-template',
    'generic-template',
    'generic-template',
  ].join(' | '),
});

const EXPECTED_COMPOSITION = Object.freeze({
  tripleCeg: 378,
  tripleInsufficient: 240,
  tripleGeneric: 62,
  totalItems: 680,
  incorrectOptions: 2040,
});

// These proportional quotas keep the two selected subsets close to the domain
// distribution of their source-complete candidate pools. Within each domain,
// advanced items are selected before intermediate and foundation items.
const TRIPLE_INSUFFICIENT_DOMAIN_QUOTAS = Object.freeze({
  assessment: 41,
  biological: 24,
  'cognitive-affective': 29,
  intervention: 38,
  lifespan: 29,
  professional: 41,
  research: 12,
  'social-cultural': 26,
});

const TRIPLE_GENERIC_DOMAIN_QUOTAS = Object.freeze({
  assessment: 9,
  biological: 7,
  'cognitive-affective': 8,
  intervention: 5,
  lifespan: 12,
  professional: 11,
  research: 6,
  'social-cultural': 4,
});

const EXPECTED_FINGERPRINTS = Object.freeze({
  selection: 'b36c6f382d541a4321726068b9ee138dc8dafa00fbd67d094231e05238affccb',
  composition: '88b0957134b132cc7efbbeae7d88b6416f0b0c239a83e20865f3b56da2bff437',
  protectedContent: 'b72ab7447ec1186056fbc6d5fa165ce76d0ac121bb877cd483009e45bd054c0e',
});

// Materialized on the 2026-07-25 baseline. The compact payload contains only
// explicit item ids, warning-family labels, and expected answer positions. It
// deliberately omits prompts and choices: buildCampaignData rematerializes
// protected-content fingerprints from the bank supplied after any preceding
// deep-distractor revisions while still rejecting answer-key drift.
const CURRENT_BASELINE_COHORT_GZIP_BASE64 = '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';

const CURRENT_BASELINE_COHORT = Object.freeze(
  JSON.parse(zlib.gunzipSync(Buffer.from(CURRENT_BASELINE_COHORT_GZIP_BASE64, 'base64')).toString('utf8'))
    .map((entry) => Object.freeze(entry)),
);

// Explicit feedback-only plan after excluding the frozen 263-item deep campaign.
const POST_DEEP_BASELINE_COHORT_GZIP_BASE64 = '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';
const POST_DEEP_BASELINE_COHORT = Object.freeze(
  JSON.parse(zlib.gunzipSync(Buffer.from(POST_DEEP_BASELINE_COHORT_GZIP_BASE64, 'base64')).toString('utf8'))
    .map((entry) => Object.freeze(entry)),
);

const DIFFICULTY_RANK = Object.freeze({
  advanced: 0,
  intermediate: 1,
  foundation: 2,
});

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}

function optionFindingSignature(findings) {
  return findings
    .map((finding) => [...finding.codes].sort().join('+'))
    .sort()
    .join(' | ');
}

function protectedItemSnapshot(item) {
  return {
    id: item.id,
    prompt: item.prompt,
    choices: item.choices,
    answerIndex: item.answerIndex,
    rationale: item.rationale,
    references: item.references || [],
    sourceDetails: item.sourceDetails || [],
  };
}

function hasCompleteCatalogSource(item, catalog) {
  return Array.isArray(item.references)
    && item.references.length > 0
    && item.references.every((url) => {
      const source = catalog[url];
      return source
        && String(source.title || '').length >= 20
        && String(source.organization || '').length >= 5
        && String(source.summary || '').length >= 80
        && String(source.credibility || '').length >= 100;
    });
}

function assertSnapshot(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(`${label} ${key} drifted: expected ${value}, found ${actual[key]}.`);
    }
  }
}

function selectByDomainQuota(items, signatureById, signature, quotas, catalog, excludedIds = new Set()) {
  const selected = [];
  for (const domainId of Object.keys(quotas).sort()) {
    const candidates = items
      .filter((item) => item.domainId === domainId
        && !excludedIds.has(item.id)
        && signatureById.get(item.id) === signature
        && hasCompleteCatalogSource(item, catalog))
      .sort((left, right) => (
        (DIFFICULTY_RANK[left.difficulty] ?? 9) - (DIFFICULTY_RANK[right.difficulty] ?? 9)
        || left.id.localeCompare(right.id)
      ));
    const quota = quotas[domainId];
    if (candidates.length < quota) {
      throw new Error(`${domainId} has ${candidates.length} source-complete candidates for a quota of ${quota}.`);
    }
    selected.push(...candidates.slice(0, quota));
  }
  return selected;
}

function selectCampaignCohort(bank, diagnostics, catalog) {
  if (!Array.isArray(bank) || bank.length !== 1500) {
    throw new Error('The feedback-halving campaign requires the 1,500-item native EPPP bank.');
  }
  if (!diagnostics || !Array.isArray(diagnostics.optionFindings)) {
    throw new Error('The feedback-halving campaign requires option-level feedback diagnostics.');
  }
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new Error('The feedback-halving campaign requires the reference catalog.');
  }
  assertSnapshot(diagnostics.summary || {}, BASELINE_SNAPSHOT, 'Feedback baseline');

  const itemById = new Map(bank.map((item) => [item.id, item]));
  if (itemById.size !== bank.length) throw new Error('The native EPPP bank contains duplicate ids.');

  const findingsById = new Map();
  for (const finding of diagnostics.optionFindings) {
    if (!findingsById.has(finding.id)) findingsById.set(finding.id, []);
    findingsById.get(finding.id).push(finding);
  }
  const signatureById = new Map(
    [...findingsById].map(([id, findings]) => [id, optionFindingSignature(findings)]),
  );

  const tripleCeg = bank
    .filter((item) => signatureById.get(item.id) === FAMILY_SIGNATURES.tripleCeg)
    .sort((left, right) => left.id.localeCompare(right.id));
  const tripleInsufficient = selectByDomainQuota(
    bank,
    signatureById,
    FAMILY_SIGNATURES.tripleInsufficient,
    TRIPLE_INSUFFICIENT_DOMAIN_QUOTAS,
    catalog,
  );
  const tripleGeneric = selectByDomainQuota(
    bank,
    signatureById,
    FAMILY_SIGNATURES.tripleGeneric,
    TRIPLE_GENERIC_DOMAIN_QUOTAS,
    catalog,
  );

  if (tripleCeg.length !== EXPECTED_COMPOSITION.tripleCeg) {
    throw new Error(`Expected ${EXPECTED_COMPOSITION.tripleCeg} triple-CEG items, found ${tripleCeg.length}.`);
  }
  if (tripleInsufficient.length !== EXPECTED_COMPOSITION.tripleInsufficient) {
    throw new Error(`Expected ${EXPECTED_COMPOSITION.tripleInsufficient} triple-insufficient items.`);
  }
  if (tripleGeneric.length !== EXPECTED_COMPOSITION.tripleGeneric) {
    throw new Error(`Expected ${EXPECTED_COMPOSITION.tripleGeneric} triple-generic items.`);
  }

  const entries = [
    ...tripleCeg.map((item) => ({ family: 'triple-ceg', item })),
    ...tripleInsufficient.map((item) => ({ family: 'triple-insufficient', item })),
    ...tripleGeneric.map((item) => ({ family: 'triple-generic', item })),
  ].sort((left, right) => left.item.id.localeCompare(right.item.id));

  const ids = entries.map((entry) => entry.item.id);
  if (entries.length !== EXPECTED_COMPOSITION.totalItems || new Set(ids).size !== entries.length) {
    throw new Error('The feedback-halving cohort must contain 680 unique items.');
  }

  const fingerprints = {
    selection: sha256(ids.join('\n')),
    composition: sha256(entries.map((entry) => `${entry.family}:${entry.item.id}`).join('\n')),
    protectedContent: sha256(entries.map((entry) => protectedItemSnapshot(entry.item))),
  };
  for (const [name, expected] of Object.entries(EXPECTED_FINGERPRINTS)) {
    if (fingerprints[name] !== expected) {
      throw new Error(`Feedback-halving ${name} fingerprint drifted: expected ${expected}, found ${fingerprints[name]}.`);
    }
  }

  const sourceCompleteSelected = entries.filter((entry) => hasCompleteCatalogSource(entry.item, catalog)).length;
  const domains = {};
  const difficulties = {};
  const answerIndexes = {};
  for (const { item } of entries) {
    domains[item.domainId] = (domains[item.domainId] || 0) + 1;
    difficulties[item.difficulty] = (difficulties[item.difficulty] || 0) + 1;
    answerIndexes[item.answerIndex] = (answerIndexes[item.answerIndex] || 0) + 1;
  }

  return {
    campaignId: CAMPAIGN_ID,
    reviewedAt: REVIEWED_AT,
    entries,
    ids,
    fingerprints,
    summary: {
      ...EXPECTED_COMPOSITION,
      sourceCompleteSelected,
      sourceMetadataFollowupItems: entries.length - sourceCompleteSelected,
      domains,
      difficulties,
      answerIndexes,
    },
  };
}

function materializeDescriptors(bank, diagnostics, descriptors, expectedFingerprints) {
  if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item native EPPP bank.');
  if (!diagnostics || !diagnostics.summary || !Array.isArray(diagnostics.optionFindings)) throw new Error('Current option-feedback diagnostics are required.');
  const itemById = new Map(bank.map((item) => [item.id, item]));
  if (itemById.size !== bank.length) throw new Error('The native EPPP bank contains duplicate ids.');
  const entries = descriptors.map((descriptor) => {
    const item = itemById.get(descriptor.id);
    if (!item) throw new Error('Campaign item ' + descriptor.id + ' is missing.');
    if (item.answerIndex !== descriptor.expectedAnswerIndex) throw new Error(descriptor.id + ' answer index drifted.');
    return { ...descriptor, protectedFingerprint: sha256(protectedItemSnapshot(item)), item };
  }).sort((left, right) => left.id.localeCompare(right.id));
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== entries.length) throw new Error('Campaign descriptors contain duplicate ids.');
  const fingerprints = {
    selection: sha256(ids.join('\n')),
    composition: sha256(entries.map((entry) => entry.family + ':' + entry.id).join('\n')),
    protectedContent: sha256(entries.map((entry) => protectedItemSnapshot(entry.item))),
  };
  if (expectedFingerprints && (fingerprints.selection !== expectedFingerprints.selection || fingerprints.composition !== expectedFingerprints.composition)) {
    throw new Error('Explicit campaign ids or family assignments drifted.');
  }
  const selectedIds = new Set(ids);
  return {
    campaignId: CAMPAIGN_ID,
    reviewedAt: REVIEWED_AT,
    entries,
    ids,
    fingerprints,
    baselineAtMaterialization: Object.fromEntries(Object.keys(BASELINE_SNAPSHOT).map((key) => [key, diagnostics.summary[key]])),
    selectedWarningOptionsAtMaterialization: diagnostics.optionFindings.filter((finding) => selectedIds.has(finding.id)).length,
  };
}

function selectPostDeepCampaignCohort(bank, diagnostics, catalog, excludedIds) {
  const excluded = excludedIds instanceof Set ? excludedIds : new Set(excludedIds || []);
  assertSnapshot(diagnostics.summary || {}, BASELINE_SNAPSHOT, 'Feedback baseline');
  const findingsById = new Map();
  for (const finding of diagnostics.optionFindings || []) {
    if (!findingsById.has(finding.id)) findingsById.set(finding.id, []);
    findingsById.get(finding.id).push(finding);
  }
  const signatureById = new Map([...findingsById].map(([id, findings]) => [id, optionFindingSignature(findings)]));
  const tripleCeg = bank.filter((item) => !excluded.has(item.id) && signatureById.get(item.id) === FAMILY_SIGNATURES.tripleCeg).sort((a, b) => a.id.localeCompare(b.id));
  const tripleInsufficient = selectByDomainQuota(bank, signatureById, FAMILY_SIGNATURES.tripleInsufficient, POST_DEEP_TRIPLE_INSUFFICIENT_DOMAIN_QUOTAS, catalog, excluded);
  if (tripleCeg.length !== POST_DEEP_EXPECTED_COMPOSITION.tripleCeg || tripleInsufficient.length !== POST_DEEP_EXPECTED_COMPOSITION.tripleInsufficient) throw new Error('Post-deep feedback cohort composition drifted.');
  const descriptors = [
    ...tripleCeg.map((item) => ({ id: item.id, family: 'triple-ceg', expectedAnswerIndex: item.answerIndex })),
    ...tripleInsufficient.map((item) => ({ id: item.id, family: 'triple-insufficient', expectedAnswerIndex: item.answerIndex })),
  ];
  return materializeDescriptors(bank, diagnostics, descriptors, POST_DEEP_EXPECTED_FINGERPRINTS);
}

// Rematerializes protected fingerprints from the supplied bank. Pass the static
// post-deep descriptors after deep rewrites; prompt/choice changes are accepted,
// but every explicit id and expected answer position remains invariant.
function buildCampaignData(bank, diagnostics, legacy = POST_DEEP_BASELINE_COHORT) {
  const descriptors = Array.isArray(legacy) ? legacy : legacy && legacy.entries;
  if (!Array.isArray(descriptors)) throw new Error('A materialized legacy cohort is required.');
  const expected = descriptors.length === POST_DEEP_EXPECTED_COMPOSITION.totalItems ? POST_DEEP_EXPECTED_FINGERPRINTS : EXPECTED_FINGERPRINTS;
  return materializeDescriptors(bank, diagnostics, descriptors, expected);
}

module.exports = {
  BASELINE_SNAPSHOT,
  CAMPAIGN_ID,
  COMBINED_PROJECTED_SNAPSHOT,
  CURRENT_BASELINE_COHORT,
  DEEP_REWRITE_REDUCTIONS,
  EXPECTED_COMPOSITION,
  EXPECTED_FINGERPRINTS,
  POST_DEEP_BASELINE_COHORT,
  POST_DEEP_BASELINE_SNAPSHOT,
  POST_DEEP_EXPECTED_COMPOSITION,
  POST_DEEP_EXPECTED_FINGERPRINTS,
  POST_DEEP_ORIGINAL_PROTECTED_CONTENT_FINGERPRINT,
  POST_DEEP_FEEDBACK_REDUCTIONS,
  POST_DEEP_TRIPLE_INSUFFICIENT_DOMAIN_QUOTAS,
  FAMILY_SIGNATURES,
  PLANNED_REDUCTIONS,
  PROJECTED_SNAPSHOT,
  REVIEWED_AT,
  TARGET_CEILINGS,
  TRIPLE_GENERIC_DOMAIN_QUOTAS,
  TRIPLE_INSUFFICIENT_DOMAIN_QUOTAS,
  buildCampaignData,
  hasCompleteCatalogSource,
  optionFindingSignature,
  protectedItemSnapshot,
  selectCampaignCohort,
  selectPostDeepCampaignCohort,
  sha256,
};
