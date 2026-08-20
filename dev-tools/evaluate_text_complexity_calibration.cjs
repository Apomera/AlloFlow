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
const DEFAULT_FIXTURE_PATH = path.resolve(__dirname, '../tests/fixtures/text_complexity_calibration.json');

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

function evaluateCalibrationFixtures(payload, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Calibration fixture payload must be an object.');
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
  DEFAULT_FIXTURE_PATH,
  calculateReadability,
  resolveGenerationMetadata,
  evaluateAlias,
  evaluateBand,
  evaluateSample,
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
    process.exitCode = report.summary.passed ? 0 : 1;
  } catch (error) {
    process.stderr.write(`Text complexity calibration evaluator failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
