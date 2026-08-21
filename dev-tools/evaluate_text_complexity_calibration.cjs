#!/usr/bin/env node
/**
 * Offline regression evaluator for AlloFlow's source-text calibration policy.
 *
 * This tool is intentionally model-free and read-only. It measures supplied
 * fixture text with the same deterministic Flesch-Kincaid implementation used
 * by the application, then asks InstructionalContext for the canonical target,
 * calibration band, and status. Optional provider/model metadata is retained as
 * an evaluation dimension so future samples from real generations can be
 * compared without changing the fixture or report shape.
 *
 * Usage:
 *   node dev-tools/evaluate_text_complexity_calibration.cjs
 *   node dev-tools/evaluate_text_complexity_calibration.cjs path/to/fixtures.json --json
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const InstructionalContext = require('../instructional_context_module.js');

const EVALUATOR_VERSION = 'text-complexity-calibration-eval/v1';
const EMPIRICAL_EVALUATOR_VERSION = 'text-complexity-calibration-eval/v2';
const EMPIRICAL_MATRIX_SCHEMA_VERSION = 'text-complexity-pilot-matrix/v2';
const DEFAULT_FIXTURE_PATH = path.resolve(__dirname, '../tests/fixtures/text_complexity_calibration.json');
const DEFAULT_EMPIRICAL_FIXTURE_PATH = path.resolve(__dirname, '../tests/fixtures/text_complexity_pilot_matrix.json');

function text(value, limit = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * Keep this implementation in parity with calculateReadability in the host.
 * The parity regression test extracts the host function and checks every corpus
 * sample, so either implementation changing alone fails visibly.
 */
function calculateReadability(source) {
  if (!source) return null;
  const cleanText = String(source)
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\[.*?\]\(.*?\)/g, (match) => match.match(/\[(.*?)\]/)?.[1] || '')
    .replace(/\[\d+\]/g, '')
    .replace(/[#*`]/g, '');
  if (cleanText.trim().length === 0) return null;
  const sentenceText = cleanText
    .replace(/(\r\n|\n|\r)/gm, '|')
    .replace(/^[-*\u2022]\s+/gm, '')
    .replace(/([.!?]+)/g, '$1|');
  const sentenceParts = sentenceText.split('|').filter((sentence) => {
    const trimmed = sentence.trim();
    return trimmed.length > 0 && /[a-zA-Z]/.test(trimmed);
  });
  const sentences = Math.max(1, sentenceParts.length);
  const wordsArray = cleanText.match(/[a-zA-Z\u00c0-\u00ff]+(?:['\u2019-][a-zA-Z\u00c0-\u00ff]+)*/g) || [];
  const words = Math.max(1, wordsArray.length);
  let syllables = 0;
  wordsArray.forEach((word) => {
    let normalized = word.toLowerCase();
    if (normalized.length <= 3) {
      syllables += 1;
      return;
    }
    normalized = normalized.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    normalized = normalized.replace(/^y/, '');
    const vowelGroups = normalized.match(/[aeiouy]{1,2}/g);
    syllables += vowelGroups ? vowelGroups.length : 1;
  });
  const score = (0.39 * (words / sentences)) + (11.8 * (syllables / words)) - 15.59;
  return {
    score: Math.max(0, Math.min(18, score)).toFixed(1),
    words,
    sentences,
    syllables,
  };
}

function firstText(values, limit) {
  for (const value of values) {
    const normalized = text(value, limit);
    if (normalized) return normalized;
  }
  return '';
}

function resolveGenerationMetadata(sample, options = {}) {
  const hookValue = typeof options.resolveGenerationMetadata === 'function'
    ? options.resolveGenerationMetadata(sample) || {}
    : {};
  const generation = sample && typeof sample.generation === 'object' ? sample.generation : {};
  const provenance = sample && typeof sample.provenance === 'object' ? sample.provenance : {};
  const sourceProvenance = sample && typeof sample.sourceProvenance === 'object' ? sample.sourceProvenance : {};
  const provider = firstText([
    hookValue.provider,
    hookValue.providerId,
    generation.provider,
    generation.providerId,
    provenance.provider,
    provenance.providerId,
    sourceProvenance.provider,
    sourceProvenance.providerId,
    sample && sample.provider,
  ], 120);
  const model = firstText([
    hookValue.model,
    hookValue.modelId,
    generation.model,
    generation.modelId,
    provenance.model,
    provenance.modelId,
    sourceProvenance.model,
    sourceProvenance.modelId,
    sample && sample.model,
  ], 160);
  return {
    provider: provider || null,
    model: model || null,
    complete: Boolean(provider && model),
  };
}

function closeEnough(actual, expected, tolerance = 0.05) {
  const left = Number(actual);
  const right = Number(expected);
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function evaluateAlias(entry) {
  const normalized = InstructionalContext.normalizeGradeLabel(entry.input);
  const expected = text(entry.expected, 80);
  return {
    input: entry.input,
    expected,
    normalized,
    pass: normalized === expected,
  };
}

function evaluateBand(entry) {
  const calibration = InstructionalContext.getSourceCalibrationTarget(entry.requestedGrade);
  const expectedRequestedGrade = text(entry.expectedRequestedGrade, 80)
    || InstructionalContext.normalizeGradeLabel(entry.requestedGrade);
  const expectedPromptGrade = text(entry.expectedPromptGrade, 80);
  return {
    requestedGradeInput: entry.requestedGrade,
    requestedGrade: calibration.requestedGrade,
    promptGrade: calibration.promptGrade,
    policyVersion: calibration.policyVersion,
    pass: calibration.requestedGrade === expectedRequestedGrade
      && calibration.promptGrade === expectedPromptGrade,
    expectedRequestedGrade,
    expectedPromptGrade,
  };
}

function evaluateSample(sample, options = {}) {
  const id = text(sample && sample.id, 160) || 'sample';
  const rawGrade = sample && (sample.requestedGrade ?? sample.grade);
  const requestedGrade = InstructionalContext.normalizeGradeLabel(rawGrade);
  const calibration = InstructionalContext.getSourceCalibrationTarget(rawGrade);
  const target = InstructionalContext.getComplexityTarget(rawGrade);
  const language = text(sample && sample.language, 80) || 'English';
  const sourceText = String(sample && sample.text !== undefined ? sample.text : '');
  const supportsMeasurement = InstructionalContext.isEnglishLanguage(language);
  const readability = supportsMeasurement ? calculateReadability(sourceText) : null;
  const measuredGrade = readability ? Number(readability.score) : null;
  const contentFingerprint = InstructionalContext.fingerprintText(sourceText);
  const evidence = InstructionalContext.normalizeComplexity({
    requestedGrade,
    calibrationTarget: calibration.promptGrade,
    measuredGrade,
    method: readability ? 'flesch-kincaid-en' : '',
    language,
    contentFingerprint,
  });
  const expected = sample && typeof sample.expected === 'object' ? sample.expected : {};
  const generation = resolveGenerationMetadata(sample || {}, options);
  const requireProviderModel = expected.requireProviderModel === true
    || options.requireProviderModel === true;
  const checks = {
    requestedGrade: !expected.requestedGrade || evidence.requestedGrade === expected.requestedGrade,
    calibrationTarget: !expected.calibrationTarget || evidence.calibrationTarget === expected.calibrationTarget,
    status: !expected.status || evidence.status === expected.status,
    measuredGrade: expected.measuredGrade === undefined
      || closeEnough(evidence.measuredGrade, expected.measuredGrade, Number(expected.tolerance) || 0.05),
    contentFingerprint: evidence.contentFingerprint === contentFingerprint,
    statusConsistency: evidence.status === (
      readability
        ? InstructionalContext.complexityStatus(readability.score, requestedGrade)
        : 'unavailable'
    ),
    policyVersion: !expected.policyVersion || calibration.policyVersion === expected.policyVersion,
    providerModel: !requireProviderModel || generation.complete,
  };
  return {
    id,
    requestedGradeInput: rawGrade,
    requestedGrade,
    calibrationTarget: calibration.promptGrade,
    calibrationPolicyVersion: calibration.policyVersion,
    targetRange: target ? target.fkRange : null,
    language,
    readability,
    evidence,
    generation,
    checks,
    pass: Object.values(checks).every(Boolean),
  };
}

function increment(record, key) {
  record[key] = (record[key] || 0) + 1;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return value !== null && value !== '' && value !== undefined && Number.isFinite(numeric)
    ? numeric
    : null;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentileNearestRank(values, quantile) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return null;
  const bounded = Math.max(0, Math.min(1, Number(quantile)));
  return sorted[Math.max(0, Math.ceil(sorted.length * bounded) - 1)];
}

/**
 * Signed grade-level distance from a target band. Negative values undershoot,
 * positive values overshoot, and zero means the score is inside the band.
 */
function signedDistanceFromRange(score, range) {
  const numeric = numberOrNull(score);
  if (numeric === null || !range) return null;
  const min = numberOrNull(range.min);
  const max = numberOrNull(range.max);
  if (min === null || max === null) return null;
  if (numeric < min) return numeric - min;
  if (numeric > max) return numeric - max;
  return 0;
}

function expandedRange(range, margin) {
  if (!range) return null;
  const min = numberOrNull(range.min);
  const max = numberOrNull(range.max);
  const expansion = Math.max(0, numberOrNull(margin) || 0);
  if (min === null || max === null) return null;
  return { min: Math.max(0, min - expansion), max: max + expansion };
}

function normalizeCondition(value) {
  const condition = text(value, 40).toLowerCase();
  return condition === 'research' || condition === 'grounded' || condition === 'citations-on'
    ? 'research'
    : 'core';
}

function cellCoordinates(cell) {
  const requestedGrade = InstructionalContext.normalizeGradeLabel(
    cell && (cell.requestedGrade ?? cell.grade),
    ''
  );
  const scenarioId = text(cell && (cell.scenarioId ?? cell.scenario), 120);
  const repetition = numberOrNull(cell && (cell.repetition ?? cell.rep));
  const condition = normalizeCondition(cell && (cell.condition ?? cell.track ?? cell.variant));
  return { requestedGrade, scenarioId, repetition, condition };
}

function coordinateKey(cell) {
  const value = cellCoordinates(cell);
  return [value.condition, value.requestedGrade, value.scenarioId, value.repetition].join('|');
}

function fallbackCellId(cell) {
  const coordinates = cellCoordinates(cell);
  return [coordinates.condition, coordinates.requestedGrade, coordinates.scenarioId, `r${coordinates.repetition}`]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveCellId(cell) {
  return text(cell && (cell.cellId ?? cell.id), 180) || fallbackCellId(cell || {});
}

function extractScoreDescriptor(sample, kind) {
  const measurements = sample && typeof sample.measurements === 'object' ? sample.measurements : {};
  const scores = sample && typeof sample.scores === 'object' ? sample.scores : {};
  const descriptor = measurements[kind] && typeof measurements[kind] === 'object'
    ? measurements[kind]
    : {};
  const output = sample && typeof sample.output === 'object' ? sample.output : {};
  const score = numberOrNull(
    descriptor.score
      ?? scores[kind]
      ?? sample?.[`${kind}Score`]
      ?? output?.[`${kind}Score`]
  );
  const explicitWords = numberOrNull(
    descriptor.wordCount
      ?? descriptor.words
      ?? sample?.[`${kind}WordCount`]
      ?? output?.[`${kind}WordCount`]
      ?? (kind === 'body' ? sample?.wordCount : undefined)
  );
  return { score, wordCount: explicitWords };
}

function extractMeasurementText(sample, kind) {
  const output = sample && typeof sample.output === 'object' ? sample.output : {};
  if (kind === 'body') {
    const value = sample?.bodyText ?? output.bodyText ?? sample?.text ?? output.text;
    return value === undefined || value === null ? '' : String(value);
  }
  const value = sample?.artifactText ?? output.artifactText ?? sample?.fullText ?? output.fullText;
  return value === undefined || value === null ? '' : String(value);
}

function resolveWordRange(cell, payload) {
  const design = payload && typeof payload.studyDesign === 'object' ? payload.studyDesign : {};
  const coordinates = cellCoordinates(cell || {});
  const scenario = (Array.isArray(design.scenarios) ? design.scenarios : []).find((entry) => (
    text(entry && typeof entry === 'object' ? (entry.id ?? entry.scenarioId) : entry, 120)
      === coordinates.scenarioId
  ));
  const scenarioConfig = scenario && typeof scenario === 'object' ? scenario : {};
  const candidate = cell?.wordRange
    || cell?.wordLength
    || scenarioConfig.wordRange
    || scenarioConfig.wordLength
    || design.wordRange
    || design.wordLength
    || {};
  let min = numberOrNull(candidate.min);
  let max = numberOrNull(candidate.max);
  if (min === null || max === null) {
    const target = numberOrNull(cell?.targetWords ?? scenarioConfig.targetWords ?? design.targetWords);
    const tolerancePercent = numberOrNull(
      cell?.wordTolerancePercent
        ?? scenarioConfig.wordTolerancePercent
        ?? design.wordTolerancePercent
    );
    if (target !== null && tolerancePercent !== null) {
      min = Math.floor(target * (1 - tolerancePercent / 100));
      max = Math.ceil(target * (1 + tolerancePercent / 100));
    }
  }
  return min !== null && max !== null && min >= 0 && max >= min ? { min, max } : null;
}

function evaluateMeasurement(sample, kind, ranges, severeMissDistance) {
  const descriptor = extractScoreDescriptor(sample, kind);
  const measurementText = extractMeasurementText(sample, kind);
  const readability = descriptor.score === null && measurementText
    ? calculateReadability(measurementText)
    : null;
  const score = descriptor.score !== null
    ? descriptor.score
    : (readability ? Number(readability.score) : null);
  const wordCount = descriptor.wordCount !== null
    ? descriptor.wordCount
    : (readability ? readability.words : null);
  const signedDistance = signedDistanceFromRange(score, ranges.exact);
  const expandedDistance = signedDistanceFromRange(score, ranges.expanded);
  const severeBoundary = Math.max(0, numberOrNull(severeMissDistance) || 0);
  return {
    available: score !== null,
    score,
    scoreSource: descriptor.score !== null ? 'reported' : (readability ? 'calculated' : null),
    wordCount,
    exactBand: signedDistance === null ? null : signedDistance === 0,
    expandedBand: expandedDistance === null ? null : expandedDistance === 0,
    status: signedDistance === null
      ? 'unavailable'
      : signedDistance < 0 ? 'below-target' : signedDistance > 0 ? 'above-target' : 'within-target',
    signedDistance,
    absoluteDistance: signedDistance === null ? null : Math.abs(signedDistance),
    severeMiss: signedDistance === null ? null : Math.abs(signedDistance) > severeBoundary,
  };
}

function groundingCapability(sample) {
  const generation = sample && typeof sample.generation === 'object' ? sample.generation : {};
  const grounding = sample && typeof sample.grounding === 'object' ? sample.grounding : {};
  const capabilities = sample && typeof sample.capabilities === 'object' ? sample.capabilities : {};
  const values = [
    grounding.capable,
    grounding.supported,
    generation.groundingCapable,
    generation.groundingSupported,
    generation.searchGroundingSupported,
    capabilities.grounding,
  ];
  const explicit = values.find((value) => value === true || value === false);
  return explicit === undefined ? null : explicit;
}

function empiricalThreshold(payload, section, name, aliases = []) {
  const thresholds = payload && typeof payload.thresholds === 'object' ? payload.thresholds : {};
  const scoped = thresholds[section] && typeof thresholds[section] === 'object' ? thresholds[section] : {};
  for (const key of [name, ...aliases]) {
    const value = numberOrNull(scoped[key]);
    if (value !== null) return value;
  }
  return null;
}

function hasEmpiricalOutput(cell) {
  if (!cell || typeof cell !== 'object') return false;
  if (extractMeasurementText(cell, 'body') || extractMeasurementText(cell, 'artifact')) return true;
  return extractScoreDescriptor(cell, 'body').score !== null
    || extractScoreDescriptor(cell, 'artifact').score !== null;
}

function collectEmpiricalResults(payload, matrix) {
  if (Array.isArray(payload.results)) return payload.results.slice();
  if (Array.isArray(payload.outputs)) return payload.outputs.slice();
  if (Array.isArray(payload.samples)) return payload.samples.slice();
  return matrix.filter(hasEmpiricalOutput);
}

function scenarioIds(studyDesign) {
  const scenarios = Array.isArray(studyDesign.scenarios) ? studyDesign.scenarios : [];
  return scenarios.map((scenario) => text(
    scenario && typeof scenario === 'object' ? (scenario.id ?? scenario.scenarioId) : scenario,
    120
  )).filter(Boolean);
}

function expectedCoreCoordinates(studyDesign) {
  const grades = (Array.isArray(studyDesign.grades) ? studyDesign.grades : [])
    .map((grade) => InstructionalContext.normalizeGradeLabel(grade, ''))
    .filter(Boolean);
  const scenarios = scenarioIds(studyDesign);
  const repetitions = Math.max(0, Math.floor(numberOrNull(studyDesign.repetitions) || 0));
  const keys = [];
  for (const grade of grades) {
    for (const scenarioId of scenarios) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        keys.push(coordinateKey({ requestedGrade: grade, scenarioId, repetition, condition: 'core' }));
      }
    }
  }
  return keys;
}

function effectiveCitations(cell, studyDesign) {
  const generation = cell && typeof cell.generation === 'object' ? cell.generation : {};
  const raw = cell?.citations ?? generation.citations ?? studyDesign.citations;
  if (raw === false) return 'off';
  const normalized = text(raw, 40).toLowerCase();
  if (['off', 'false', 'disabled', 'none'].includes(normalized)) return 'off';
  if (raw === true || ['on', 'true', 'enabled', 'required'].includes(normalized)) return 'on';
  return normalized || 'unspecified';
}

function validateThresholdContract(payload) {
  const thresholds = payload && typeof payload.thresholds === 'object' ? payload.thresholds : {};
  const failures = [];
  const version = text(thresholds.version, 120);
  const lock = text(payload.thresholdLock, 120);
  const fingerprint = InstructionalContext.fingerprintValue(thresholds);
  const fingerprintLock = text(payload.thresholdFingerprintLock, 120);
  if (!version) failures.push('thresholds:missing-version');
  if (!lock) failures.push('thresholds:missing-version-lock');
  if (version && lock && version !== lock) failures.push('thresholds:version-lock-mismatch');
  if (!fingerprintLock) failures.push('thresholds:missing-fingerprint-lock');
  if (fingerprintLock && fingerprintLock !== fingerprint) failures.push('thresholds:fingerprint-lock-mismatch');
  const required = [
    ['bands', 'expandedMargin'],
    ['bands', 'severeMissDistance'],
    ['overall', 'minimumExpandedBandRate'],
    ['overall', 'maximumSevereMissRate'],
    ['overall', 'maximumAbsoluteDistanceP90'],
    ['perGrade', 'maximumAbsoluteDistanceMedian'],
    ['directionalCluster', 'maximumSevereMissesSameDirection'],
    ['wordLength', 'minimumComplianceRate'],
  ];
  for (const [section, key] of required) {
    if (empiricalThreshold(payload, section, key) === null) failures.push(`thresholds:${section}.${key}`);
  }
  if (text(thresholds.bands && thresholds.bands.severeMissComparator, 40).toLowerCase() !== 'greater-than') {
    failures.push('thresholds:bands.severeMissComparator');
  }
  const requiredMeasurements = Array.isArray(thresholds.requiredMeasurements)
    ? thresholds.requiredMeasurements.map((item) => text(item, 20).toLowerCase())
    : [];
  const invalidMeasurements = requiredMeasurements.filter((item) => item !== 'body' && item !== 'artifact');
  if (!requiredMeasurements.length) failures.push('thresholds:requiredMeasurements');
  if (invalidMeasurements.length) failures.push('thresholds:invalid-requiredMeasurements');
  const qualityMeasurement = text(thresholds.qualityMeasurement, 20).toLowerCase();
  if (qualityMeasurement !== 'body' && qualityMeasurement !== 'artifact') {
    failures.push('thresholds:qualityMeasurement');
  }
  return {
    passed: failures.length === 0,
    version: version || null,
    lock: lock || null,
    fingerprint,
    fingerprintLock: fingerprintLock || null,
    requiredMeasurements,
    qualityMeasurement: qualityMeasurement || null,
    failures,
  };
}

function standardsExpectationItems(scenario) {
  const raw = scenario && scenario.standardsExpectation;
  const values = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object' && Array.isArray(raw.skills) ? raw.skills : []);
  return values.map((value) => text(value, 80).toLowerCase()).filter(Boolean);
}

function validateStudyDesignContract(payload) {
  const design = payload && typeof payload.studyDesign === 'object' ? payload.studyDesign : {};
  const scenarios = Array.isArray(design.scenarios) ? design.scenarios : [];
  const fingerprint = InstructionalContext.fingerprintValue(design);
  const fingerprintLock = text(payload.studyDesignFingerprintLock, 120);
  const failures = [];
  if (!fingerprintLock) failures.push('study-design:missing-fingerprint-lock');
  if (fingerprintLock && fingerprintLock !== fingerprint) failures.push('study-design:fingerprint-lock-mismatch');
  if (text(design.textAccessExpectation, 80).toLowerCase() !== 'preserve-primary') {
    failures.push('study-design:text-access-expectation');
  }
  if (scenarios.length !== 2) failures.push('study-design:scenario-count');
  const scenarioChecks = scenarios.map((scenario) => {
    const id = text(scenario && (scenario.id ?? scenario.scenarioId), 120);
    const expectations = standardsExpectationItems(scenario);
    const targetWords = numberOrNull(scenario && scenario.targetWords);
    const tolerancePercent = numberOrNull(scenario && scenario.wordTolerancePercent);
    const checks = {
      id: Boolean(id),
      synthetic: scenario && scenario.synthetic === true,
      textAccessExpectation: text(scenario && scenario.textAccessExpectation, 80).toLowerCase()
        === 'preserve-primary',
      boundedStandardsExpectation: expectations.length > 0
        && expectations.length <= 4
        && expectations.every((item) => item.length <= 80),
      wordTarget: targetWords !== null && targetWords > 0,
      wordTolerance: tolerancePercent !== null && tolerancePercent > 0 && tolerancePercent <= 100,
    };
    return { id: id || null, expectations, targetWords, tolerancePercent, checks };
  });
  for (const scenario of scenarioChecks) {
    for (const [name, pass] of Object.entries(scenario.checks)) {
      if (!pass) failures.push(`study-design:scenario:${scenario.id || 'missing'}:${name}`);
    }
  }
  const providerPolicy = payload && typeof payload.providerPolicy === 'object' ? payload.providerPolicy : {};
  if (providerPolicy.requireProviderModel !== true) failures.push('provider-policy:require-provider-model');
  if (providerPolicy.rejectMixedProviderModels !== true) failures.push('provider-policy:reject-mixed-models');
  return {
    passed: failures.length === 0,
    fingerprint,
    fingerprintLock: fingerprintLock || null,
    textAccessExpectation: text(design.textAccessExpectation, 80) || null,
    scenarios: scenarioChecks,
    failures,
  };
}

function evaluateEmpiricalResult(result, cell, payload) {
  const combined = {
    ...(cell && typeof cell === 'object' ? cell : {}),
    ...(result && typeof result === 'object' ? result : {}),
    generation: {
      ...(cell && typeof cell.generation === 'object' ? cell.generation : {}),
      ...(result && typeof result.generation === 'object' ? result.generation : {}),
    },
  };
  const coordinates = cellCoordinates(combined);
  const target = InstructionalContext.getComplexityTarget(coordinates.requestedGrade);
  const exact = target ? target.fkRange : null;
  const expansion = empiricalThreshold(payload, 'bands', 'expandedMargin');
  const ranges = { exact, expanded: expandedRange(exact, expansion) };
  const severeDistance = empiricalThreshold(payload, 'bands', 'severeMissDistance');
  const body = evaluateMeasurement(combined, 'body', ranges, severeDistance);
  const artifact = evaluateMeasurement(combined, 'artifact', ranges, severeDistance);
  const wordRange = resolveWordRange(combined, payload);
  const wordCount = body.wordCount;
  const wordCompliant = wordCount === null || !wordRange
    ? null
    : wordCount >= wordRange.min && wordCount <= wordRange.max;
  const generation = resolveGenerationMetadata(combined);
  const cellId = resolveCellId(combined);
  return {
    cellId,
    requestedGrade: coordinates.requestedGrade,
    scenarioId: coordinates.scenarioId,
    repetition: coordinates.repetition,
    condition: coordinates.condition,
    targetRange: exact,
    expandedRange: ranges.expanded,
    citations: effectiveCitations(combined, payload.studyDesign || {}),
    generation,
    groundingCapable: groundingCapability(combined),
    pairId: text(combined.pairId, 180) || null,
    pairedCoreCellId: text(combined.pairedCoreCellId, 180) || null,
    measurements: { body, artifact },
    body,
    artifact,
    wordLength: {
      range: wordRange,
      wordCount,
      compliant: wordCompliant,
    },
  };
}

function summarizeMeasurement(rows, kind) {
  const values = rows.map((row) => row.measurements[kind]).filter((item) => item.available);
  const total = rows.length;
  const available = values.length;
  const exactCount = values.filter((item) => item.exactBand).length;
  const expandedCount = values.filter((item) => item.expandedBand).length;
  const severeCount = values.filter((item) => item.severeMiss).length;
  const aboveCount = values.filter((item) => item.signedDistance > 0).length;
  const belowCount = values.filter((item) => item.signedDistance < 0).length;
  const signedDistances = values.map((item) => item.signedDistance);
  const absoluteDistances = values.map((item) => item.absoluteDistance);
  return {
    requiredCount: total,
    availableCount: available,
    availabilityRate: total ? available / total : null,
    exactBandCount: exactCount,
    exactBandRate: available ? exactCount / available : null,
    expandedBandCount: expandedCount,
    expandedBandRate: available ? expandedCount / available : null,
    severeMissCount: severeCount,
    severeMissRate: available ? severeCount / available : null,
    aboveBandCount: aboveCount,
    aboveBandRate: available ? aboveCount / available : null,
    overshootCount: aboveCount,
    overshootRate: available ? aboveCount / available : null,
    belowBandCount: belowCount,
    belowBandRate: available ? belowCount / available : null,
    undershootCount: belowCount,
    undershootRate: available ? belowCount / available : null,
    medianScore: median(values.map((item) => item.score)),
    p90Score: percentileNearestRank(values.map((item) => item.score), 0.9),
    medianSignedDistance: median(signedDistances),
    meanSignedDistance: signedDistances.length
      ? signedDistances.reduce((sum, value) => sum + value, 0) / signedDistances.length
      : null,
    p90SignedDistance: percentileNearestRank(signedDistances, 0.9),
    medianAbsoluteDistance: median(absoluteDistances),
    p90AbsoluteDistance: percentileNearestRank(absoluteDistances, 0.9),
  };
}

function summarizeWordLength(rows) {
  const measured = rows.filter((row) => row.wordLength.compliant !== null);
  const compliant = measured.filter((row) => row.wordLength.compliant).length;
  return {
    requiredCount: rows.length,
    measuredCount: measured.length,
    compliantCount: compliant,
    availabilityRate: rows.length ? measured.length / rows.length : null,
    complianceRate: rows.length ? compliant / rows.length : null,
  };
}

function summarizeEmpiricalScope(rows, qualityMeasurement) {
  const body = summarizeMeasurement(rows, 'body');
  const artifact = summarizeMeasurement(rows, 'artifact');
  const primary = qualityMeasurement === 'artifact' ? artifact : body;
  const deltas = rows.map((row) => {
    const bodyScore = row.measurements.body.score;
    const artifactScore = row.measurements.artifact.score;
    return bodyScore !== null && artifactScore !== null ? artifactScore - bodyScore : null;
  }).filter(Number.isFinite);
  return {
    sampleCount: rows.length,
    qualityMeasurement,
    ...primary,
    body,
    artifact,
    artifactMinusBody: {
      pairedCount: deltas.length,
      median: median(deltas),
      p90: percentileNearestRank(deltas, 0.9),
    },
    wordLength: summarizeWordLength(rows),
  };
}

function compareGate(scope, name, actual, expected, comparison) {
  const available = Number.isFinite(actual) && Number.isFinite(expected);
  return {
    scope,
    name,
    actual: Number.isFinite(actual) ? actual : null,
    expected: Number.isFinite(expected) ? expected : null,
    comparison,
    pass: available && (comparison === 'minimum' ? actual >= expected : actual <= expected),
  };
}

function qualityGatesForScope(summary, payload, section, scope) {
  if (section === 'perGrade') {
    return [compareGate(scope, 'median-absolute-distance', summary.medianAbsoluteDistance,
      empiricalThreshold(payload, section, 'maximumAbsoluteDistanceMedian'), 'maximum')];
  }
  return [
    compareGate(scope, 'expanded-band-rate', summary.expandedBandRate,
      empiricalThreshold(payload, section, 'minimumExpandedBandRate'), 'minimum'),
    compareGate(scope, 'severe-miss-rate', summary.severeMissRate,
      empiricalThreshold(payload, section, 'maximumSevereMissRate'), 'maximum'),
    compareGate(scope, 'p90-absolute-distance', summary.p90AbsoluteDistance,
      empiricalThreshold(payload, section, 'maximumAbsoluteDistanceP90'), 'maximum'),
  ];
}

function evaluateDirectionalClusters(rows, qualityMeasurement, severeDistance, maximumSameDirection) {
  const groups = {};
  for (const row of rows) {
    const key = `${row.requestedGrade}|${row.scenarioId}`;
    if (!groups[key]) {
      groups[key] = {
        requestedGrade: row.requestedGrade,
        scenarioId: row.scenarioId,
        repetitionCount: 0,
        severeOvershootCount: 0,
        severeUndershootCount: 0,
      };
    }
    const group = groups[key];
    group.repetitionCount++;
    const distance = row.measurements[qualityMeasurement]?.signedDistance;
    if (Number.isFinite(distance) && distance > severeDistance) group.severeOvershootCount++;
    if (Number.isFinite(distance) && distance < -severeDistance) group.severeUndershootCount++;
  }
  const maximum = Math.max(0, Math.floor(numberOrNull(maximumSameDirection) || 0));
  const groupList = Object.values(groups).map((group) => ({
    ...group,
    violated: group.severeOvershootCount > maximum || group.severeUndershootCount > maximum,
  }));
  const violations = groupList.filter((group) => group.violated);
  return {
    passed: violations.length === 0,
    severeDistance,
    maximumSameDirection: maximum,
    groups: groupList,
    violations,
  };
}

function evaluateProviderIntegrity(rows, providerPolicy = {}) {
  const requireProviderModel = providerPolicy.requireProviderModel !== false;
  const rejectMixed = providerPolicy.rejectMixedProviderModels !== false;
  const expectedProvider = text(providerPolicy.expectedProvider, 120);
  const expectedModel = text(providerPolicy.expectedModel, 160);
  const missingCellIds = rows.filter((row) => !row.generation.complete).map((row) => row.cellId);
  const pairs = {};
  rows.filter((row) => row.generation.complete).forEach((row) => {
    increment(pairs, `${row.generation.provider}/${row.generation.model}`);
  });
  const mismatchedCellIds = rows.filter((row) => (
    (expectedProvider && row.generation.provider !== expectedProvider)
      || (expectedModel && row.generation.model !== expectedModel)
  )).map((row) => row.cellId);
  const mixed = Object.keys(pairs).length > 1;
  const assessed = rows.length > 0;
  return {
    assessed,
    requireProviderModel,
    rejectMixedProviderModels: rejectMixed,
    expectedProvider: expectedProvider || null,
    expectedModel: expectedModel || null,
    pairs,
    missingCellIds,
    mismatchedCellIds,
    mixed,
    passed: !assessed
      ? null
      : (!requireProviderModel || missingCellIds.length === 0)
        && (!rejectMixed || !mixed)
        && mismatchedCellIds.length === 0,
  };
}

function summarizeResearch(coreRows, researchRows, payload) {
  const extension = payload.researchExtension && typeof payload.researchExtension === 'object'
    ? payload.researchExtension
    : {};
  if (!researchRows.length) {
    return {
      status: 'not-run',
      passed: null,
      resultCount: 0,
      pairedCount: 0,
      groundingRequired: extension.requireGroundingCapability === true,
      groundingCapableCount: 0,
      missingGroundingCapability: [],
      pairs: [],
      deltas: {
        body: { median: null, p90: null },
        artifact: { median: null, p90: null },
      },
    };
  }
  const coreById = new Map(coreRows.map((row) => [row.cellId, row]));
  const coreByCoordinate = new Map(coreRows.map((row) => [
    coordinateKey({ ...row, condition: 'core' }),
    row,
  ]));
  const pairs = researchRows.map((research) => {
    let core = research.pairedCoreCellId ? coreById.get(research.pairedCoreCellId) : null;
    if (!core && research.pairId) core = coreRows.find((row) => row.pairId === research.pairId);
    if (!core) {
      core = coreByCoordinate.get(coordinateKey({ ...research, condition: 'core' }));
    }
    const delta = (kind) => core
      && core.measurements[kind].score !== null
      && research.measurements[kind].score !== null
      ? research.measurements[kind].score - core.measurements[kind].score
      : null;
    return {
      researchCellId: research.cellId,
      coreCellId: core ? core.cellId : null,
      bodyDelta: delta('body'),
      artifactDelta: delta('artifact'),
      groundingCapable: research.groundingCapable,
    };
  });
  const groundingRequired = extension.requireGroundingCapability === true;
  const missingGroundingCapability = groundingRequired
    ? researchRows.filter((row) => row.groundingCapable !== true).map((row) => row.cellId)
    : [];
  const unpaired = pairs.filter((pair) => !pair.coreCellId).map((pair) => pair.researchCellId);
  const bodyDeltas = pairs.map((pair) => pair.bodyDelta).filter(Number.isFinite);
  const artifactDeltas = pairs.map((pair) => pair.artifactDelta).filter(Number.isFinite);
  const passed = unpaired.length === 0 && missingGroundingCapability.length === 0;
  return {
    status: passed ? 'pass' : 'fail',
    passed,
    resultCount: researchRows.length,
    pairedCount: pairs.length - unpaired.length,
    unpairedCellIds: unpaired,
    groundingRequired,
    groundingCapableCount: researchRows.filter((row) => row.groundingCapable === true).length,
    missingGroundingCapability,
    pairs,
    deltas: {
      body: { median: median(bodyDeltas), p90: percentileNearestRank(bodyDeltas, 0.9) },
      artifact: { median: median(artifactDeltas), p90: percentileNearestRank(artifactDeltas, 0.9) },
    },
  };
}

function evaluateEmpiricalMatrix(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Empirical calibration fixture payload must be an object.');
  }
  const studyDesign = payload.studyDesign && typeof payload.studyDesign === 'object'
    ? payload.studyDesign
    : {};
  const matrix = Array.isArray(payload.matrix) ? payload.matrix : [];
  const coreMatrix = matrix.filter((cell) => normalizeCondition(cell.condition ?? cell.track ?? cell.variant) === 'core');
  const researchMatrix = matrix.filter((cell) => normalizeCondition(cell.condition ?? cell.track ?? cell.variant) === 'research');
  const expectedCoordinates = expectedCoreCoordinates(studyDesign);
  const expectedCoordinateSet = new Set(expectedCoordinates);
  const coreCoordinates = coreMatrix.map(coordinateKey);
  const coreCoordinateSet = new Set(coreCoordinates);
  const cellIds = matrix.map(resolveCellId);
  const uniqueCellIds = new Set(cellIds);
  const matrixFingerprint = InstructionalContext.fingerprintValue(matrix);
  const matrixFingerprintLock = text(payload.matrixFingerprintLock, 120);
  const expectedCellCount = numberOrNull(studyDesign.expectedCoreCellCount)
    ?? expectedCoordinates.length;
  const matrixChecks = {
    schemaVersion: text(payload.schemaVersion, 120) === EMPIRICAL_MATRIX_SCHEMA_VERSION,
    expectedDimensions: expectedCoordinates.length > 0,
    expectedCellCount: expectedCellCount === expectedCoordinates.length,
    coreCellCount: coreMatrix.length === expectedCoordinates.length,
    uniqueCellIds: uniqueCellIds.size === cellIds.length,
    uniqueCoreCoordinates: coreCoordinateSet.size === coreCoordinates.length,
    completeCoreCoordinates: expectedCoordinates.every((key) => coreCoordinateSet.has(key))
      && coreCoordinates.every((key) => expectedCoordinateSet.has(key)),
    citationsOffForCore: coreMatrix.every((cell) => effectiveCitations(cell, studyDesign) === 'off'),
    fingerprintLockPresent: Boolean(matrixFingerprintLock),
    fingerprintLocked: Boolean(matrixFingerprintLock) && matrixFingerprintLock === matrixFingerprint,
  };
  const thresholdContract = validateThresholdContract(payload);
  const studyDesignContract = validateStudyDesignContract(payload);
  const rawResults = collectEmpiricalResults(payload, matrix);
  const matrixById = new Map(matrix.map((cell) => [resolveCellId(cell), cell]));
  const matrixByCoordinate = new Map(matrix.map((cell) => [coordinateKey(cell), cell]));
  const evaluatedResults = rawResults.map((result) => {
    const resultId = resolveCellId(result);
    const planned = matrixById.get(resultId) || matrixByCoordinate.get(coordinateKey(result)) || null;
    return evaluateEmpiricalResult(result, planned, payload);
  });
  const coreResults = evaluatedResults.filter((row) => row.condition === 'core');
  const researchResults = evaluatedResults.filter((row) => row.condition === 'research');
  const resultIds = evaluatedResults.map((row) => row.cellId);
  const resultCoordinates = coreResults.map((row) => coordinateKey(row));
  const resultCoordinateSet = new Set(resultCoordinates);
  const resultsProvided = rawResults.length > 0;
  const unknownCoreCellIds = evaluatedResults.map((row, index) => ({ row, raw: rawResults[index] || {} }))
    .filter(({ row }) => row.condition === 'core')
    .filter(({ row, raw }) => {
      const explicitId = text(raw.cellId ?? raw.id, 180);
      if (explicitId) return !matrixById.has(explicitId);
      return !matrixByCoordinate.has(coordinateKey(row));
    })
    .map(({ row }) => row.cellId);
  const resultChecks = {
    provided: resultsProvided,
    uniqueCellIds: !resultsProvided || new Set(resultIds).size === resultIds.length,
    uniqueCoreCoordinates: !resultsProvided || resultCoordinateSet.size === resultCoordinates.length,
    knownCoreCells: !resultsProvided || unknownCoreCellIds.length === 0,
    completeCoreCells: !resultsProvided
      ? null
      : expectedCoordinates.every((key) => resultCoordinateSet.has(key))
        && resultCoordinates.every((key) => expectedCoordinateSet.has(key)),
    citationsOffForCore: !resultsProvided || coreResults.every((row) => row.citations === 'off'),
  };
  const mechanicsFailures = [
    ...Object.entries(matrixChecks).filter(([, pass]) => !pass).map(([name]) => `matrix:${name}`),
    ...thresholdContract.failures,
    ...studyDesignContract.failures,
  ];
  if (resultsProvided) {
    mechanicsFailures.push(
      ...Object.entries(resultChecks)
        .filter(([name, pass]) => name !== 'provided' && pass !== true)
        .map(([name]) => `results:${name}`)
    );
  }
  const qualityMeasurement = thresholdContract.qualityMeasurement === 'artifact' ? 'artifact' : 'body';
  const overall = summarizeEmpiricalScope(coreResults, qualityMeasurement);
  const byGrade = {};
  const gradeOrder = (Array.isArray(studyDesign.grades) ? studyDesign.grades : [])
    .map((grade) => InstructionalContext.normalizeGradeLabel(grade, ''))
    .filter(Boolean);
  for (const grade of gradeOrder) {
    byGrade[grade] = summarizeEmpiricalScope(
      coreResults.filter((row) => row.requestedGrade === grade),
      qualityMeasurement
    );
  }
  const providerIntegrity = evaluateProviderIntegrity(coreResults, payload.providerPolicy || {});
  const requiredMeasurementFailures = thresholdContract.requiredMeasurements.flatMap((kind) => (
    coreResults.filter((row) => !row.measurements[kind]?.available).map((row) => `${row.cellId}:${kind}`)
  ));
  const gates = resultsProvided ? [
    ...qualityGatesForScope(overall, payload, 'overall', 'overall'),
    ...gradeOrder.flatMap((grade) => qualityGatesForScope(byGrade[grade], payload, 'perGrade', grade)),
    compareGate(
      'overall',
      'word-length-compliance-rate',
      overall.wordLength.complianceRate,
      empiricalThreshold(payload, 'wordLength', 'minimumComplianceRate'),
      'minimum'
    ),
  ] : [];
  const directionalClusters = evaluateDirectionalClusters(
    coreResults,
    qualityMeasurement,
    empiricalThreshold(payload, 'bands', 'severeMissDistance'),
    empiricalThreshold(payload, 'directionalCluster', 'maximumSevereMissesSameDirection')
  );
  if (resultsProvided) {
    gates.push({
      scope: 'grade-scenario',
      name: 'directional-severe-cluster',
      actual: directionalClusters.violations.length,
      expected: 0,
      comparison: 'maximum',
      pass: directionalClusters.passed,
    });
  }
  const research = summarizeResearch(coreResults, researchResults, payload);
  const empiricalPassed = !resultsProvided
    ? null
    : mechanicsFailures.length === 0
      && resultChecks.completeCoreCells === true
      && requiredMeasurementFailures.length === 0
      && providerIntegrity.passed === true
      && gates.every((gate) => gate.pass)
      && research.passed !== false;
  const mechanicsPassed = mechanicsFailures.length === 0;
  const empiricalStatus = !resultsProvided ? 'not-run' : (empiricalPassed ? 'pass' : 'fail');
  return {
    schemaVersion: EMPIRICAL_EVALUATOR_VERSION,
    fixtureSchemaVersion: text(payload.schemaVersion, 120) || null,
    fixtureId: text(payload.fixtureId, 160) || null,
    thresholdContract,
    studyDesignContract,
    studyDesign: {
      grades: gradeOrder,
      scenarios: scenarioIds(studyDesign),
      repetitions: numberOrNull(studyDesign.repetitions),
      citations: effectiveCitations({}, studyDesign),
      expectedCoreCellCount: expectedCoordinates.length,
    },
    mechanics: {
      passed: mechanicsPassed,
      failures: mechanicsFailures,
      matrix: {
        coreCellCount: coreMatrix.length,
        researchCellCount: researchMatrix.length,
        expectedCoreCellCount: expectedCoordinates.length,
        fingerprint: matrixFingerprint,
        fingerprintLock: matrixFingerprintLock || null,
        checks: matrixChecks,
      },
      results: {
        resultCount: evaluatedResults.length,
        coreResultCount: coreResults.length,
        researchResultCount: researchResults.length,
        unknownCoreCellIds,
        checks: resultChecks,
      },
    },
    results: evaluatedResults,
    empiricalQuality: {
      status: empiricalStatus,
      passed: empiricalPassed,
      qualityMeasurement,
      requiredMeasurements: thresholdContract.requiredMeasurements,
      missingRequiredMeasurements: requiredMeasurementFailures,
      providerIntegrity,
      overall,
      byGrade,
      gates,
      failedGates: gates.filter((gate) => !gate.pass).map((gate) => `${gate.scope}:${gate.name}`),
      directionalClusters,
      research,
    },
    summary: {
      passed: empiricalPassed === null ? null : mechanicsPassed && empiricalPassed,
      validationPassed: mechanicsPassed,
      mechanicsPassed,
      empiricalQualityStatus: empiricalStatus,
      empiricalQualityPassed: empiricalPassed,
      matrixCellCount: matrix.length,
      coreResultCount: coreResults.length,
      researchResultCount: researchResults.length,
      failureCount: mechanicsFailures.length + (empiricalPassed === false ? 1 : 0),
      failures: mechanicsFailures.concat(empiricalPassed === false ? ['empirical-quality'] : []),
    },
  };
}

function evaluateCalibrationFixtures(payload, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Calibration fixture payload must be an object.');
  }
  if (payload.schemaVersion === EMPIRICAL_MATRIX_SCHEMA_VERSION) {
    return evaluateEmpiricalMatrix(payload, options);
  }
  const aliases = (Array.isArray(payload.gradeAliases) ? payload.gradeAliases : []).map(evaluateAlias);
  const bands = (Array.isArray(payload.calibrationBands) ? payload.calibrationBands : []).map(evaluateBand);
  const evaluatorOptions = {
    ...options,
    requireProviderModel: options.requireProviderModel !== undefined
      ? options.requireProviderModel
      : payload.requireProviderModel === true,
  };
  const samples = (Array.isArray(payload.samples) ? payload.samples : [])
    .map((sample) => evaluateSample(sample, evaluatorOptions));
  const byStatus = {};
  const byRequestedGrade = {};
  const byProviderModel = {};
  const missingProviderModel = [];
  samples.forEach((sample) => {
    increment(byStatus, sample.evidence.status || 'unavailable');
    increment(byRequestedGrade, sample.requestedGrade || 'unrecognized');
    const providerModelKey = sample.generation.complete
      ? `${sample.generation.provider}/${sample.generation.model}`
      : 'unspecified';
    increment(byProviderModel, providerModelKey);
    if (!sample.generation.complete) missingProviderModel.push(sample.id);
  });
  const failures = [
    ...aliases.filter((item) => !item.pass).map((item) => `alias:${item.input}`),
    ...bands.filter((item) => !item.pass).map((item) => `band:${item.requestedGradeInput}`),
    ...samples.filter((item) => !item.pass).map((item) => `sample:${item.id}`),
  ];
  return {
    schemaVersion: EVALUATOR_VERSION,
    fixtureId: text(payload.fixtureId, 160) || null,
    policyVersions: {
      calibration: bands[0]?.policyVersion || samples[0]?.calibrationPolicyVersion || null,
      complexity: InstructionalContext.getComplexityTarget('5th Grade')?.policyVersion || null,
    },
    aliases,
    bands,
    samples,
    summary: {
      aliasCount: aliases.length,
      bandCount: bands.length,
      sampleCount: samples.length,
      passed: failures.length === 0,
      failureCount: failures.length,
      failures,
      byStatus,
      byRequestedGrade,
      byProviderModel,
      missingProviderModel,
    },
  };
}

function evaluateFixtureFile(fixturePath = DEFAULT_FIXTURE_PATH, options = {}) {
  const resolved = path.resolve(fixturePath);
  const payload = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return evaluateCalibrationFixtures(payload, options);
}

function formatHumanReport(report) {
  if (report && report.schemaVersion === EMPIRICAL_EVALUATOR_VERSION) {
    const empirical = report.empiricalQuality || {};
    const overall = empirical.overall || {};
    const percent = (value) => Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'n/a';
    const lines = [
      `Text complexity calibration mechanics: ${report.mechanics.passed ? 'PASS' : 'FAIL'}`,
      `Empirical quality: ${String(empirical.status || 'not-run').toUpperCase()}`,
      `Fixture: ${report.fixtureId || '(unnamed)'}`,
      `Matrix: ${report.mechanics.matrix.coreCellCount}/${report.mechanics.matrix.expectedCoreCellCount} core cells; results=${report.mechanics.results.coreResultCount}`,
      `Thresholds: ${report.thresholdContract.version || 'missing'} (${report.thresholdContract.fingerprint})`,
      `Provider/model integrity: ${empirical.providerIntegrity.passed === null ? 'not assessed' : empirical.providerIntegrity.passed ? 'pass' : 'fail'}`,
    ];
    if (empirical.status !== 'not-run') {
      lines.push(
        `Primary (${empirical.qualityMeasurement}): exact=${percent(overall.exactBandRate)}; expanded=${percent(overall.expandedBandRate)}; severe=${percent(overall.severeMissRate)}`,
        `Direction: overshoot=${percent(overall.overshootRate)}; undershoot=${percent(overall.undershootRate)}; mean signed distance=${overall.meanSignedDistance ?? 'n/a'}`,
        `Distance: median=${overall.medianAbsoluteDistance ?? 'n/a'}; p90=${overall.p90AbsoluteDistance ?? 'n/a'}; word-length=${percent(overall.wordLength?.complianceRate)}`
      );
    } else {
      lines.push('No empirical outputs were supplied; matrix validation is not evidence of calibration quality.');
    }
    if (report.summary.failures.length) lines.push(`Failures: ${report.summary.failures.join(', ')}`);
    return lines.join('\n');
  }
  const lines = [
    `Text complexity calibration: ${report.summary.passed ? 'PASS' : 'FAIL'}`,
    `Fixture: ${report.fixtureId || '(unnamed)'}`,
    `Aliases: ${report.aliases.length}; calibration bands: ${report.bands.length}; text samples: ${report.samples.length}`,
    `Policies: ${report.policyVersions.calibration || 'unknown'} / ${report.policyVersions.complexity || 'unknown'}`,
    `Statuses: ${Object.entries(report.summary.byStatus).map(([key, count]) => `${key}=${count}`).join(', ') || 'none'}`,
    `Provider/models: ${Object.entries(report.summary.byProviderModel).map(([key, count]) => `${key}=${count}`).join(', ') || 'none'}`,
  ];
  if (report.summary.missingProviderModel.length) {
    lines.push(`Samples without complete provider/model metadata: ${report.summary.missingProviderModel.join(', ')}`);
  }
  if (report.summary.failures.length) lines.push(`Failures: ${report.summary.failures.join(', ')}`);
  return lines.join('\n');
}

module.exports = {
  EVALUATOR_VERSION,
  EMPIRICAL_EVALUATOR_VERSION,
  EMPIRICAL_MATRIX_SCHEMA_VERSION,
  DEFAULT_FIXTURE_PATH,
  DEFAULT_EMPIRICAL_FIXTURE_PATH,
  calculateReadability,
  median,
  percentileNearestRank,
  signedDistanceFromRange,
  expandedRange,
  resolveGenerationMetadata,
  evaluateAlias,
  evaluateBand,
  evaluateSample,
  evaluateMeasurement,
  evaluateEmpiricalMatrix,
  evaluateCalibrationFixtures,
  evaluateFixtureFile,
  formatHumanReport,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const fixtureArg = args.find((arg) => arg !== '--json') || DEFAULT_FIXTURE_PATH;
  try {
    const report = evaluateFixtureFile(fixtureArg);
    process.stdout.write((jsonOutput ? JSON.stringify(report, null, 2) : formatHumanReport(report)) + '\n');
    process.exitCode = report.schemaVersion === EMPIRICAL_EVALUATOR_VERSION
      && report.empiricalQuality.status === 'not-run'
      ? (report.mechanics.passed ? 0 : 1)
      : (report.summary.passed ? 0 : 1);
  } catch (error) {
    process.stderr.write(`Text complexity calibration evaluator failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
