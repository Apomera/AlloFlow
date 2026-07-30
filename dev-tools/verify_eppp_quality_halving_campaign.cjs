#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');

const {
  CAMPAIGN_MODES,
  sha256Text,
  writePairedFiles,
} = require('./eppp_quality_campaign_core.cjs');
const distractorManifest = require('./eppp_distractor_halving_campaign_manifest.cjs');
const feedbackCampaign = require('./eppp_feedback_halving_campaign_data.cjs');
const {
  EXPECTED_ORDER_SHA256,
  arrangeBalancedBatches,
  orderSha256,
} = require('./build_eppp_part_one_pack.cjs');

const ROOT = path.resolve(__dirname, '..');
const FINAL_CAMPAIGN_ID = 'eppp-quality-halving-final-verification-v1';
const EXPECTED_ITEM_COUNT = 1500;
const EXPECTED_ANSWER_POSITION_COUNT = 375;
const EXPECTED_DEEP_MARKERS = 263;
const EXPECTED_FEEDBACK_MARKERS = 420;

const PATHS = Object.freeze({
  bank: Object.freeze({
    source: 'test_prep/eppp_native_items.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_native_items.json',
  }),
  catalog: Object.freeze({
    source: 'test_prep/reference_catalog.json',
    deploy: 'desktop/web-app/public/test_prep/reference_catalog.json',
  }),
  distractorDiagnostics: Object.freeze({
    source: 'test_prep/eppp_distractor_quality_diagnostics.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_distractor_quality_diagnostics.json',
  }),
  feedbackDiagnostics: Object.freeze({
    source: 'test_prep/eppp_option_feedback_diagnostics.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_option_feedback_diagnostics.json',
  }),
  qa: Object.freeze({
    source: 'test_prep/eppp_native_qa.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_native_qa.json',
  }),
  distractorAudit: Object.freeze({
    source: 'test_prep/eppp_quality_halving_distractor_campaign.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_quality_halving_distractor_campaign.json',
  }),
  feedbackAudit: Object.freeze({
    source: 'test_prep/eppp_feedback_halving_campaign_audit.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_feedback_halving_campaign_audit.json',
  }),
  runtime: Object.freeze({
    source: 'test_prep_hub_module.js',
    deploy: 'desktop/web-app/public/test_prep_hub_module.js',
  }),
  pack: Object.freeze({
    source: 'test_prep/eppp_part_one_pack.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_part_one_pack.json',
  }),
  manifest: Object.freeze({
    source: 'test_prep/pack_manifest.json',
    deploy: 'desktop/web-app/public/test_prep/pack_manifest.json',
  }),
  finalAudit: Object.freeze({
    source: 'test_prep/eppp_quality_halving_campaign_final_audit.json',
    deploy: 'desktop/web-app/public/test_prep/eppp_quality_halving_campaign_final_audit.json',
  }),
});

const START_MARKER = 'const EPPP_NATIVE_ITEMS = ';
const verifiedPublications = new WeakMap();

class EpppQualityHalvingVerificationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'EpppQualityHalvingVerificationError';
    this.details = details;
  }
}

function fail(message, details) {
  throw new EpppQualityHalvingVerificationError(message, details);
}

function invariant(condition, message, details) {
  if (!condition) fail(message, details);
}

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function assertJsonEqual(actual, expected, label) {
  invariant(isDeepStrictEqual(actual, expected), `${label} drifted from its frozen contract.`);
  return actual;
}

function deriveHalfCeilings(baseline) {
  invariant(
    baseline && typeof baseline === 'object' && !Array.isArray(baseline),
    'A metric baseline object is required.',
  );
  return Object.fromEntries(Object.entries(baseline).map(([metric, value]) => {
    invariant(
      Number.isInteger(value) && value >= 0,
      `Baseline metric ${metric} must be a nonnegative integer.`,
      { metric, value },
    );
    return [metric, Math.floor(value / 2)];
  }));
}

function assertFrozenCeilings(baseline, frozenCeilings, label = 'metric') {
  const derived = deriveHalfCeilings(baseline);
  assertJsonEqual(frozenCeilings, derived, `${label} halving ceilings`);
  return derived;
}

function assertMetricsAtOrBelowHalf(actual, baseline, label = 'metric') {
  invariant(actual && typeof actual === 'object', `${label} values are required.`);
  const ceilings = deriveHalfCeilings(baseline);
  const ceilingStatus = {};
  const failures = [];
  for (const [metric, ceiling] of Object.entries(ceilings)) {
    const value = actual[metric];
    invariant(
      Number.isInteger(value) && value >= 0,
      `${label} ${metric} must be a nonnegative integer.`,
      { metric, value },
    );
    const met = value <= ceiling;
    ceilingStatus[metric] = { baseline: baseline[metric], ceiling, value, met };
    if (!met) failures.push({ metric, baseline: baseline[metric], ceiling, value });
  }
  invariant(
    failures.length === 0,
    `${label} did not halve every listed metric.`,
    { failures },
  );
  return { ceilings, ceilingStatus };
}

function metricSnapshot(summary, baseline, label) {
  invariant(summary && typeof summary === 'object', `${label} summary is missing.`);
  return Object.fromEntries(Object.keys(baseline).map((metric) => {
    const value = summary[metric];
    invariant(
      Number.isInteger(value) && value >= 0,
      `${label} is missing integer metric ${metric}.`,
      { metric, value },
    );
    return [metric, value];
  }));
}

function answerPositionCounts(items) {
  invariant(Array.isArray(items), 'An item array is required to count answer positions.');
  const counts = [0, 0, 0, 0];
  for (const item of items) {
    invariant(
      Number.isInteger(item?.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4,
      `${item?.id || '(unknown item)'} has an invalid answer index.`,
    );
    counts[item.answerIndex] += 1;
  }
  return counts;
}

function indexItems(items, label = 'item bank') {
  invariant(Array.isArray(items), `${label} must be an array.`);
  const byId = new Map();
  for (const item of items) {
    invariant(item && typeof item === 'object', `${label} contains a non-object item.`);
    invariant(clean(item.id), `${label} contains an item without an id.`);
    invariant(!byId.has(item.id), `${label} contains duplicate id ${item.id}.`);
    byId.set(item.id, item);
  }
  return byId;
}

function assertKeyedFeedbackEqualsRationale(items, label = 'item bank') {
  for (const item of items) {
    invariant(
      Array.isArray(item.choices) && item.choices.length === 4,
      `${item.id} must have four choices.`,
    );
    invariant(
      Array.isArray(item.choiceRationales) && item.choiceRationales.length === item.choices.length,
      `${item.id} must have one explanation per choice.`,
    );
    invariant(
      item.choiceRationales[item.answerIndex] === item.rationale,
      `${item.id} keyed feedback must exactly equal its rationale.`,
    );
  }
  return items.length;
}

function assertRuntimeExcludesEmbeddedEppp(moduleText, label = 'runtime module') {
  invariant(typeof moduleText === 'string', `${label} must be text.`);
  invariant(
    !moduleText.includes(START_MARKER),
    `${label} must not contain the retired embedded EPPP native bank.`,
  );
  return true;
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, output);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectStrings(entry, output);
  }
  return output;
}

function assertTruthfulLimitations(value, label = 'quality artifact') {
  const text = clean(collectStrings(value).join(' '));
  invariant(text, `${label} must state its review limitations.`);
  invariant(
    /(?:\bno\b|\bnot\b|\bwithout\b).{0,120}\bindependent\b|\bindependent\b.{0,120}\b(?:not claimed|pending|required|has not)\b/i.test(text),
    `${label} must explicitly disclaim independent validation or review.`,
  );
  invariant(
    /\b(?:psychometric|licensed[- ]psychologist|qualified reviewer|expert validation)\b/i.test(text),
    `${label} must distinguish automated editorial checks from qualified expert or psychometric review.`,
  );
  const misleadingClaims = [
    /\b(?:is|are|was|were|has been|have been)\s+(?:fully\s+)?independently\s+(?:validated|reviewed|approved)\b/i,
    /\b(?:is|are|was|were|has been|have been)\s+(?:fully\s+)?(?:expert|licensed[- ]psychologist)[- ](?:validated|reviewed|approved)\b/i,
    /\b(?:is|are|was|were|has been|have been)\s+(?:fully\s+)?(?:validated|reviewed|approved)\s+by\s+(?:an?\s+)?(?:independent\s+)?(?:expert|licensed[- ]psychologist)\b/i,
    /\b(?:independent|expert|licensed[- ]psychologist)\s+(?:validation|review|approval)\s+(?:is\s+)?(?:complete|completed|passed|confirmed)\b/i,
  ];
  invariant(
    !misleadingClaims.some((pattern) => pattern.test(text)),
    `${label} makes an unsupported independent-expert validation claim.`,
  );
  return text;
}

function resolveArtifact(root, relativePath) {
  return path.join(path.resolve(root), ...relativePath.split('/'));
}

function readText(root, relativePath, label) {
  const absolutePath = resolveArtifact(root, relativePath);
  let text;
  try {
    text = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    fail(`${label} is unavailable at ${relativePath}.`, { cause: error.message });
  }
  return { absolutePath, text };
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} is not valid JSON.`, { cause: error.message });
  }
}

function readPairedText(root, pair, label) {
  const source = readText(root, pair.source, `${label} source`);
  const deploy = readText(root, pair.deploy, `${label} deploy mirror`);
  invariant(
    source.text === deploy.text,
    `${label} source/deploy parity failed.`,
    {
      sourceSha256: sha256Text(source.text),
      deploySha256: sha256Text(deploy.text),
    },
  );
  return {
    sourcePath: source.absolutePath,
    deployPath: deploy.absolutePath,
    text: source.text,
    sha256: sha256Text(source.text),
  };
}

function readPairedJson(root, pair, label) {
  const artifact = readPairedText(root, pair, label);
  return { ...artifact, value: parseJson(artifact.text, label) };
}

function campaignAuditPresence(root = ROOT) {
  const pairs = {};
  let presentCount = 0;
  for (const [name, pair] of [
    ['distractorAudit', PATHS.distractorAudit],
    ['feedbackAudit', PATHS.feedbackAudit],
  ]) {
    const source = fs.existsSync(resolveArtifact(root, pair.source));
    const deploy = fs.existsSync(resolveArtifact(root, pair.deploy));
    const pairPresentCount = Number(source) + Number(deploy);
    presentCount += pairPresentCount;
    pairs[name] = {
      source,
      deploy,
      presentCount: pairPresentCount,
      paired: source === deploy,
      complete: source && deploy,
    };
  }
  return {
    expectedCount: 4,
    presentCount,
    complete: Object.values(pairs).every((entry) => entry.complete),
    pairs,
  };
}

function assertCompleteSourceDetails(item, catalog) {
  invariant(
    Array.isArray(item.references) && item.references.length > 0,
    `${item.id} must retain at least one source reference.`,
  );
  invariant(
    new Set(item.references).size === item.references.length,
    `${item.id} contains duplicate source references.`,
  );
  invariant(
    Array.isArray(item.sourceDetails) && item.sourceDetails.length === item.references.length,
    `${item.id} must provide one complete source-detail record per reference.`,
  );
  const detailsByUrl = new Map(item.sourceDetails.map((detail) => [detail?.url, detail]));
  invariant(
    detailsByUrl.size === item.sourceDetails.length,
    `${item.id} contains duplicate or missing source-detail URLs.`,
  );
  for (const reference of item.references) {
    let parsed;
    try {
      parsed = new URL(reference);
    } catch {
      fail(`${item.id} contains invalid source URL ${reference}.`);
    }
    invariant(parsed.protocol === 'https:', `${item.id} source URL must use HTTPS: ${reference}.`);
    const detail = detailsByUrl.get(reference);
    invariant(detail, `${item.id} lacks source details for ${reference}.`);
    const catalogEntry = catalog[reference];
    invariant(catalogEntry, `${item.id} source ${reference} is absent from the reference catalog.`);
    const minimumLengths = { title: 12, organization: 4, summary: 40, credibility: 40 };
    for (const [field, minimum] of Object.entries(minimumLengths)) {
      invariant(
        clean(detail[field]).length >= minimum,
        `${item.id} source detail ${field} is incomplete for ${reference}.`,
      );
      invariant(
        clean(catalogEntry[field]).length >= minimum,
        `${item.id} catalog ${field} is incomplete for ${reference}.`,
      );
    }
  }
  return item.references.length;
}

function assertBankStructure(bank) {
  const byId = indexItems(bank);
  invariant(
    bank.length === EXPECTED_ITEM_COUNT && byId.size === EXPECTED_ITEM_COUNT,
    `Expected ${EXPECTED_ITEM_COUNT} unique EPPP items.`,
    { itemCount: bank.length, uniqueIds: byId.size },
  );
  const positions = answerPositionCounts(bank);
  invariant(
    positions.every((count) => count === EXPECTED_ANSWER_POSITION_COUNT),
    `Every answer position must contain ${EXPECTED_ANSWER_POSITION_COUNT} items.`,
    { positions },
  );
  assertKeyedFeedbackEqualsRationale(bank);
  return { byId, positions };
}

function assertQaReport(qa, bankById, positions) {
  invariant(qa?.summary?.status === 'pass', 'The EPPP native QA report must pass.');
  invariant(qa.summary.totalItems === EXPECTED_ITEM_COUNT, 'The QA report must cover 1,500 items.');
  invariant(qa.summary.passedItems === EXPECTED_ITEM_COUNT, 'Every QA item must pass.');
  invariant(qa.summary.reviewRequiredItems === 0, 'The QA report cannot retain review-required items.');
  invariant(
    qa.summary.completeOptionFeedbackItems === EXPECTED_ITEM_COUNT,
    'The QA report must confirm complete option feedback for every item.',
  );
  const expectedPositionObject = Object.fromEntries(positions.map((count, index) => [index, count]));
  assertJsonEqual(qa.summary.answerPositions, expectedPositionObject, 'QA answer-position summary');
  const qaById = indexItems(qa.items, 'QA item report');
  invariant(qaById.size === bankById.size, 'The QA report must cover every canonical item exactly once.');
  for (const [id, item] of bankById) {
    const record = qaById.get(id);
    invariant(record, `The QA report is missing ${id}.`);
    invariant(record.qaStatus === 'pass', `${id} does not pass the QA report.`);
    invariant(Array.isArray(record.findings) && record.findings.length === 0, `${id} retains QA findings.`);
    invariant(
      Array.isArray(record.checks)
        && record.checks.length > 0
        && record.checks.every((check) => check?.status === 'pass'),
      `${id} must pass every declared QA check.`,
    );
    assertJsonEqual(record.references, item.references, `${id} QA references`);
  }
  assertTruthfulLimitations(qa.standard, 'EPPP native QA standard');
  return qaById.size;
}

function sameStringArray(actual, expected) {
  return Array.isArray(actual)
    && Array.isArray(expected)
    && isDeepStrictEqual(actual, expected);
}

function assertDeepCampaignCoverage(bank, bankById, catalog, audit, actualMetrics, positions) {
  invariant(
    distractorManifest.CAMPAIGN_ITEMS.length === EXPECTED_DEEP_MARKERS,
    'The frozen distractor manifest must contain 263 items.',
  );
  const manifestById = new Map(
    distractorManifest.CAMPAIGN_ITEMS.map((entry) => [entry.id, entry]),
  );
  invariant(manifestById.size === EXPECTED_DEEP_MARKERS, 'The distractor manifest contains duplicate ids.');

  const historyMarkerIds = new Set();
  const topMarkerIds = new Set();
  let hydratedSourceRecords = 0;
  for (const item of bank) {
    const historyMarkers = (Array.isArray(item.qualityReviewHistory) ? item.qualityReviewHistory : [])
      .filter((entry) => (
        entry?.campaignId === distractorManifest.CAMPAIGN_ID
        && entry.mode === CAMPAIGN_MODES.DEEP_REWRITE
      ));
    const topMarker = item.qualityCampaignReview?.campaignId === distractorManifest.CAMPAIGN_ID
      && item.qualityCampaignReview?.mode === CAMPAIGN_MODES.DEEP_REWRITE;
    if (historyMarkers.length) historyMarkerIds.add(item.id);
    if (topMarker) topMarkerIds.add(item.id);

    const descriptor = manifestById.get(item.id);
    if (!descriptor) {
      invariant(
        historyMarkers.length === 0 && !topMarker,
        `${item.id} has a distractor-campaign marker but is outside the frozen manifest.`,
      );
      continue;
    }
    invariant(
      item.answerIndex === descriptor.expectedAnswerIndex,
      `${item.id} answer index drifted from the distractor manifest.`,
    );
    invariant(historyMarkers.length === 1, `${item.id} must have exactly one deep-campaign history marker.`);
    invariant(topMarker, `${item.id} must have the current deep-campaign review marker.`);
    invariant(
      sameStringArray(historyMarkers[0].expectedWarningFamilies, descriptor.expectedWarningFamilies),
      `${item.id} history marker warning families drifted from the manifest.`,
    );
    invariant(
      sameStringArray(
        item.qualityCampaignReview.expectedWarningFamilies,
        descriptor.expectedWarningFamilies,
      ),
      `${item.id} current marker warning families drifted from the manifest.`,
    );
    hydratedSourceRecords += assertCompleteSourceDetails(item, catalog);
  }

  invariant(historyMarkerIds.size === EXPECTED_DEEP_MARKERS, 'Expected exactly 263 deep history markers.');
  invariant(topMarkerIds.size === EXPECTED_DEEP_MARKERS, 'Expected exactly 263 current deep markers.');
  for (const id of manifestById.keys()) {
    invariant(bankById.has(id), `Distractor manifest item ${id} is absent from the canonical bank.`);
    invariant(historyMarkerIds.has(id) && topMarkerIds.has(id), `${id} lacks complete deep-marker coverage.`);
  }

  invariant(audit?.campaignId === distractorManifest.CAMPAIGN_ID, 'Distractor campaign audit id drifted.');
  assertJsonEqual(audit.baseline, distractorManifest.BASELINE_METRICS, 'Distractor audit baseline');
  assertJsonEqual(
    audit.halvingCeilings,
    deriveHalfCeilings(distractorManifest.BASELINE_METRICS),
    'Distractor audit ceilings',
  );
  invariant(audit.summary?.status === 'pass', 'Distractor campaign audit must pass.');
  invariant(audit.summary.totalItems === EXPECTED_ITEM_COUNT, 'Distractor audit must cover 1,500 items.');
  invariant(
    audit.summary.rewrittenItems === EXPECTED_DEEP_MARKERS,
    'Distractor audit must report 263 rewritten items.',
  );
  invariant(
    audit.summary.keyPositionsPreserved === EXPECTED_DEEP_MARKERS,
    'Distractor audit must preserve all 263 manifest answer indexes.',
  );
  assertJsonEqual(audit.summary.answerPositionCounts, positions, 'Distractor audit answer positions');
  assertJsonEqual(audit.summary.metricsAfter, actualMetrics, 'Distractor audit live metrics');
  const shardItemCount = Array.isArray(audit.shards)
    ? audit.shards.reduce((total, shard) => total + (Number.isInteger(shard?.items) ? shard.items : 0), 0)
    : 0;
  invariant(shardItemCount === EXPECTED_DEEP_MARKERS, 'Distractor audit shards must cover 263 items.');
  const warnings = audit.selectedWarningsAfter;
  invariant(
    warnings && typeof warnings === 'object'
      && Object.values(warnings).every((entries) => Array.isArray(entries)),
    'Distractor campaign selected-warning payload is malformed.',
  );
  const selectedWarningsRemaining = Object.values(warnings)
    .reduce((total, entries) => total + entries.length, 0);
  for (const [metric, ceiling] of Object.entries(deriveHalfCeilings(distractorManifest.BASELINE_METRICS))) {
    invariant(
      audit.summary.ceilingStatus?.[metric]?.value === actualMetrics[metric]
        && audit.summary.ceilingStatus[metric].ceiling === ceiling
        && audit.summary.ceilingStatus[metric].met === true,
      `Distractor audit ceiling status is stale for ${metric}.`,
    );
  }
  assertTruthfulLimitations(audit.limitations, 'Distractor campaign audit');
  return { markers: historyMarkerIds.size, hydratedSourceRecords, selectedWarningsRemaining };
}

function assertFeedbackCampaignCoverage(bank, bankById, audit, actualMetrics) {
  invariant(
    feedbackCampaign.POST_DEEP_BASELINE_COHORT.length === EXPECTED_FEEDBACK_MARKERS,
    'The frozen feedback-only cohort must contain 420 items.',
  );
  const cohortById = new Map(
    feedbackCampaign.POST_DEEP_BASELINE_COHORT.map((entry) => [entry.id, entry]),
  );
  invariant(cohortById.size === EXPECTED_FEEDBACK_MARKERS, 'The feedback-only cohort contains duplicate ids.');
  const deepIds = new Set(distractorManifest.CAMPAIGN_ITEM_IDS);
  invariant(
    [...cohortById.keys()].every((id) => !deepIds.has(id)),
    'The feedback-only cohort overlaps the deep-rewrite manifest.',
  );

  const markerIds = new Set();
  for (const item of bank) {
    if (item.feedbackHalvingCampaign === feedbackCampaign.CAMPAIGN_ID) markerIds.add(item.id);
    const descriptor = cohortById.get(item.id);
    if (!descriptor) {
      invariant(
        item.feedbackHalvingCampaign !== feedbackCampaign.CAMPAIGN_ID,
        `${item.id} has a feedback-campaign marker but is outside the frozen cohort.`,
      );
      continue;
    }
    invariant(
      item.answerIndex === descriptor.expectedAnswerIndex,
      `${item.id} answer index drifted from the feedback-only manifest.`,
    );
    invariant(
      item.feedbackHalvingCampaign === feedbackCampaign.CAMPAIGN_ID,
      `${item.id} lacks its feedback-only campaign marker.`,
    );
    invariant(clean(item.feedbackHalvingCampaignAt), `${item.id} lacks its feedback campaign timestamp.`);
    invariant(
      item.feedbackHalvingModes && typeof item.feedbackHalvingModes === 'object',
      `${item.id} lacks feedback campaign mode metadata.`,
    );
  }
  invariant(markerIds.size === EXPECTED_FEEDBACK_MARKERS, 'Expected exactly 420 feedback-only markers.');
  for (const id of cohortById.keys()) {
    invariant(bankById.has(id), `Feedback manifest item ${id} is absent from the canonical bank.`);
    invariant(markerIds.has(id), `${id} lacks feedback-only marker coverage.`);
  }

  invariant(audit?.campaignId === feedbackCampaign.CAMPAIGN_ID, 'Feedback campaign audit id drifted.');
  assertJsonEqual(audit.baselineReference, feedbackCampaign.BASELINE_SNAPSHOT, 'Feedback audit baseline');
  assertJsonEqual(
    audit.targetCeilings,
    deriveHalfCeilings(feedbackCampaign.BASELINE_SNAPSHOT),
    'Feedback audit ceilings',
  );
  invariant(audit.deepPrerequisiteSatisfied === true, 'Feedback audit deep prerequisite must pass.');
  invariant(audit.halvingTargetsSatisfied === true, 'Feedback audit halving targets must pass.');
  invariant(audit.selectedWarningsAfter === 0, 'Feedback campaign cohort retains warning-bearing options.');
  invariant(
    audit.status === 'automated-gates-pass-editorial-review-required',
    'Feedback audit must report automated gates passed with editorial review still required.',
  );
  invariant(
    audit.summary?.selectedItems === EXPECTED_FEEDBACK_MARKERS,
    'Feedback audit must report 420 selected items.',
  );
  assertJsonEqual(audit.liveAfter, actualMetrics, 'Feedback audit live metrics');
  invariant(
    Array.isArray(audit.items) && audit.items.length === EXPECTED_FEEDBACK_MARKERS,
    'Feedback audit must include 420 item records.',
  );
  const auditById = indexItems(audit.items, 'feedback campaign audit');
  invariant(auditById.size === cohortById.size, 'Feedback audit item coverage drifted.');
  for (const [id, descriptor] of cohortById) {
    const record = auditById.get(id);
    const item = bankById.get(id);
    invariant(record, `Feedback audit is missing ${id}.`);
    invariant(record.family === descriptor.family, `${id} feedback audit family drifted.`);
    invariant(
      record.expectedAnswerIndex === descriptor.expectedAnswerIndex,
      `${id} feedback audit answer index drifted.`,
    );
    invariant(
      /^[a-f0-9]{64}$/i.test(record.protectedFingerprint || ''),
      `${id} feedback audit lacks a protected-content fingerprint.`,
    );
    assertJsonEqual(record.modes, item.feedbackHalvingModes, `${id} feedback mode audit`);
    invariant(
      item.feedbackHalvingCampaignAt === audit.generatedAt,
      `${id} feedback marker timestamp drifted from the campaign audit.`,
    );
  }
  assertTruthfulLimitations(
    { reviewStatus: audit.reviewStatus, limitations: audit.limitations },
    'Feedback campaign audit',
  );
  return { markers: markerIds.size, auditItems: auditById.size };
}

function artifactHashes(artifacts) {
  return Object.fromEntries(Object.entries(artifacts).map(([name, artifact]) => [name, artifact.sha256]));
}

function verifyCampaign(root = ROOT, { now = () => new Date().toISOString() } = {}) {
  const resolvedRoot = path.resolve(root);
  const distractorCeilings = assertFrozenCeilings(
    distractorManifest.BASELINE_METRICS,
    distractorManifest.HALVING_CEILINGS,
    'distractor',
  );
  const feedbackCeilings = assertFrozenCeilings(
    feedbackCampaign.BASELINE_SNAPSHOT,
    feedbackCampaign.TARGET_CEILINGS,
    'feedback',
  );

  const artifacts = {
    bank: readPairedJson(resolvedRoot, PATHS.bank, 'canonical EPPP bank'),
    catalog: readPairedJson(resolvedRoot, PATHS.catalog, 'test-prep reference catalog'),
    distractorDiagnostics: readPairedJson(
      resolvedRoot,
      PATHS.distractorDiagnostics,
      'distractor diagnostics',
    ),
    feedbackDiagnostics: readPairedJson(
      resolvedRoot,
      PATHS.feedbackDiagnostics,
      'option-feedback diagnostics',
    ),
    qa: readPairedJson(resolvedRoot, PATHS.qa, 'EPPP native QA report'),
    distractorAudit: readPairedJson(
      resolvedRoot,
      PATHS.distractorAudit,
      'distractor campaign audit',
    ),
    feedbackAudit: readPairedJson(resolvedRoot, PATHS.feedbackAudit, 'feedback campaign audit'),
    runtime: readPairedText(resolvedRoot, PATHS.runtime, 'AlloFlow Test Prep Hub runtime'),
    pack: readPairedJson(resolvedRoot, PATHS.pack, 'lazy EPPP Part 1 pack'),
    manifest: readPairedJson(resolvedRoot, PATHS.manifest, 'Test Prep pack manifest'),
  };

  const bank = artifacts.bank.value;
  const catalog = artifacts.catalog.value;
  invariant(
    catalog && typeof catalog === 'object' && !Array.isArray(catalog),
    'The reference catalog must be an object keyed by URL.',
  );
  const { byId: bankById, positions } = assertBankStructure(bank);

  const distractorReport = artifacts.distractorDiagnostics.value;
  const feedbackReport = artifacts.feedbackDiagnostics.value;
  invariant(
    distractorReport?.summary?.totalItems === EXPECTED_ITEM_COUNT,
    'Distractor diagnostics must analyze all 1,500 items.',
  );
  invariant(
    feedbackReport?.summary?.totalItems === EXPECTED_ITEM_COUNT,
    'Feedback diagnostics must analyze all 1,500 items.',
  );
  const distractorMetrics = metricSnapshot(
    distractorReport.summary,
    distractorManifest.BASELINE_METRICS,
    'distractor diagnostics',
  );
  const feedbackMetrics = metricSnapshot(
    feedbackReport.summary,
    feedbackCampaign.BASELINE_SNAPSHOT,
    'feedback diagnostics',
  );
  const distractorStatus = assertMetricsAtOrBelowHalf(
    distractorMetrics,
    distractorManifest.BASELINE_METRICS,
    'distractor diagnostics',
  );
  const feedbackStatus = assertMetricsAtOrBelowHalf(
    feedbackMetrics,
    feedbackCampaign.BASELINE_SNAPSHOT,
    'feedback diagnostics',
  );

  const qaItems = assertQaReport(artifacts.qa.value, bankById, positions);
  const deepCoverage = assertDeepCampaignCoverage(
    bank,
    bankById,
    catalog,
    artifacts.distractorAudit.value,
    distractorMetrics,
    positions,
  );
  const feedbackCoverage = assertFeedbackCampaignCoverage(
    bank,
    bankById,
    artifacts.feedbackAudit.value,
    feedbackMetrics,
  );

  assertRuntimeExcludesEmbeddedEppp(
    artifacts.runtime.text,
    'source AlloFlow Test Prep Hub runtime',
  );
  const expectedPackItems = arrangeBalancedBatches(bank);
  const lazyPack = artifacts.pack.value;
  invariant(
    lazyPack && lazyPack.id === 'eppp-part-one' && Array.isArray(lazyPack.items)
      && lazyPack.items.length === EXPECTED_ITEM_COUNT,
    'The lazy EPPP Part 1 pack must contain 1,500 items.',
  );
  assertJsonEqual(lazyPack.items, expectedPackItems, 'canonical/lazy-pack EPPP item bank');
  invariant(
    orderSha256(lazyPack.items) === EXPECTED_ORDER_SHA256,
    'The lazy EPPP Part 1 pack order drifted from its frozen runtime contract.',
  );
  const manifestEntry = Array.isArray(artifacts.manifest.value?.entries)
    ? artifacts.manifest.value.entries.find((entry) => entry?.id === 'eppp-part-one')
    : null;
  invariant(
    manifestEntry && manifestEntry.loadMode === 'lazy'
      && manifestEntry.visibility === 'public'
      && manifestEntry.packUrl === './test_prep/eppp_part_one_pack.json'
      && manifestEntry.version === lazyPack.version
      && manifestEntry.itemCount === EXPECTED_ITEM_COUNT
      && manifestEntry.sha256 === artifacts.pack.sha256,
    'The Test Prep manifest must bind the exact public lazy EPPP pack.',
  );

  const generatedAt = now();
  invariant(
    typeof generatedAt === 'string' && !Number.isNaN(Date.parse(generatedAt)),
    'The verification clock must return an ISO-compatible timestamp.',
  );
  const audit = {
    schemaVersion: 1,
    campaignId: FINAL_CAMPAIGN_ID,
    generatedAt,
    reportType: 'read-only-cross-artifact-eppp-quality-halving-verification',
    status: 'pass',
    reviewStatus: 'Automated repository gates passed; no independent human, psychometric, expert, or licensed-psychologist validation is claimed.',
    baseline: {
      distractor: { ...distractorManifest.BASELINE_METRICS },
      feedback: { ...feedbackCampaign.BASELINE_SNAPSHOT },
    },
    halvingCeilings: {
      distractor: distractorCeilings,
      feedback: feedbackCeilings,
    },
    currentMetrics: {
      distractor: distractorMetrics,
      feedback: feedbackMetrics,
    },
    ceilingStatus: {
      distractor: distractorStatus.ceilingStatus,
      feedback: feedbackStatus.ceilingStatus,
    },
    summary: {
      uniqueItems: bankById.size,
      answerPositionCounts: positions,
      qaItemsPassing: qaItems,
      deepCampaignMarkers: deepCoverage.markers,
      deepCampaignSelectedWarningsRemaining: deepCoverage.selectedWarningsRemaining,
      feedbackOnlyCampaignMarkers: feedbackCoverage.markers,
      feedbackAuditItems: feedbackCoverage.auditItems,
      deepCohortSourceRecords: deepCoverage.hydratedSourceRecords,
      keyedFeedbackMatchingRationale: bank.length,
      canonicalLazyPackItemsEqual: true,
      lazyPackOrderSha256: EXPECTED_ORDER_SHA256,
      runtimeExcludesEmbeddedItems: true,
      manifestBindsLazyPack: true,
      sourceDeployParity: true,
    },
    campaignAudits: {
      distractor: {
        campaignId: artifacts.distractorAudit.value.campaignId,
        status: artifacts.distractorAudit.value.summary.status,
      },
      feedback: {
        campaignId: artifacts.feedbackAudit.value.campaignId,
        status: artifacts.feedbackAudit.value.status,
      },
    },
    artifactSha256: artifactHashes(artifacts),
    limitations: [
      'These gates verify repository invariants and heuristic metric ceilings; they are not psychometric calibration or evidence of exam-score validity.',
      'No independent human, licensed-psychologist, or subject-matter-expert validation is claimed.',
      'Complete source records establish internal catalog coverage and parity, not independent re-verification of every source claim.',
    ],
  };
  assertTruthfulLimitations(
    { reviewStatus: audit.reviewStatus, limitations: audit.limitations },
    'Final quality-halving audit',
  );

  const result = {
    status: 'pass',
    root: resolvedRoot,
    audit,
    metrics: { distractor: distractorMetrics, feedback: feedbackMetrics },
  };
  const contents = `${JSON.stringify(audit, null, 2)}\n`;
  verifiedPublications.set(result, { root: resolvedRoot, contents });
  return result;
}

function writeFinalAudit(root, verificationResult) {
  const publication = verifiedPublications.get(verificationResult);
  invariant(
    publication,
    'Final audit publication requires the in-memory result of a successful full verification.',
  );
  const resolvedRoot = path.resolve(root);
  invariant(
    publication.root === resolvedRoot,
    'The verified root and final-audit publication root must match.',
  );
  return writePairedFiles({
    sourcePath: resolveArtifact(resolvedRoot, PATHS.finalAudit.source),
    deployPath: resolveArtifact(resolvedRoot, PATHS.finalAudit.deploy),
    contents: publication.contents,
  });
}

function runCli(argv = process.argv.slice(2)) {
  const unknown = argv.filter((argument) => argument !== '--write');
  invariant(unknown.length === 0, `Unknown argument(s): ${unknown.join(', ')}.`);
  const result = verifyCampaign(ROOT);
  if (argv.includes('--write')) {
    const publication = writeFinalAudit(ROOT, result);
    process.stdout.write(
      `EPPP quality-halving verification passed; paired final audit ${publication.status}.\n`,
    );
  } else {
    process.stdout.write('EPPP quality-halving verification passed (read-only; no files written).\n');
  }
  return result;
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error.name}: ${error.message}\n`);
    if (error.details && Object.keys(error.details).length) {
      process.stderr.write(`${JSON.stringify(error.details, null, 2)}\n`);
    }
    process.exitCode = 1;
  }
}

module.exports = {
  EpppQualityHalvingVerificationError,
  EXPECTED_ANSWER_POSITION_COUNT,
  EXPECTED_DEEP_MARKERS,
  EXPECTED_FEEDBACK_MARKERS,
  EXPECTED_ITEM_COUNT,
  FINAL_CAMPAIGN_ID,
  PATHS,
  START_MARKER,
  answerPositionCounts,
  assertCompleteSourceDetails,
  assertFrozenCeilings,
  assertKeyedFeedbackEqualsRationale,
  assertMetricsAtOrBelowHalf,
  assertTruthfulLimitations,
  campaignAuditPresence,
  deriveHalfCeilings,
  assertRuntimeExcludesEmbeddedEppp,
  metricSnapshot,
  runCli,
  verifyCampaign,
  writeFinalAudit,
};
