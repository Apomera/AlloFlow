import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const RESULT_SCHEMA_ID = 'alloflow.mcp-refinement-result/v1';
export const ANALYSIS_SCHEMA_ID = 'alloflow.mcp-refinement-analysis/v1';

const SHA256_RE = /^[a-f0-9]{64}$/;
const CONDITION_KINDS = new Set(['one_shot', 'gated_loop', 'deterministic_only', 'ungated_loop']);
const PARTITIONS = new Set([
  'development_pilot',
  'development_retrospective',
  'safety',
  'prospective_held_out',
]);
const EFFECT_CONDITIONS = new Set(['one_shot', 'gated_loop']);
const DEVELOPMENT_PARTITIONS = new Set(['development_pilot', 'development_retrospective']);

export class StudyAnalysisError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'StudyAnalysisError';
    this.code = code;
    this.details = details;
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function error(errors, path, code, message) {
  errors.push({ path, code, message });
}

function exactObject(value, path, required, errors) {
  if (!isPlainObject(value)) {
    error(errors, path, 'type', 'must be an object');
    return false;
  }
  const expected = new Set(required);
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      error(errors, path + '.' + key, 'required', 'is required');
    }
  }
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) error(errors, path + '.' + key, 'unknown_property', 'is not allowed by schema v1');
  }
  return true;
}

function stringValue(value, path, errors, { pattern = null, max = 1000, nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    error(errors, path, 'string', 'must be a non-empty string of at most ' + max + ' characters');
  } else if (pattern && !pattern.test(value)) {
    error(errors, path, 'pattern', 'has an invalid format');
  }
}

function enumValue(value, path, choices, errors) {
  if (!choices.has(value)) error(errors, path, 'enum', 'must be one of: ' + [...choices].join(', '));
}

function booleanValue(value, path, errors) {
  if (typeof value !== 'boolean') error(errors, path, 'boolean', 'must be a boolean');
}

function numberValue(value, path, errors, { nullable = false, integer = false, min = -Infinity, max = Infinity } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isSafeInteger(value)) || value < min || value > max) {
    error(errors, path, 'number', 'must be ' + (nullable ? 'null or ' : '') + (integer ? 'an integer' : 'a finite number')
      + (Number.isFinite(min) ? ' >= ' + min : '') + (Number.isFinite(max) ? ' and <= ' + max : ''));
  }
}

function jsonValue(value, path, errors, depth = 0) {
  if (depth > 30) {
    error(errors, path, 'depth', 'exceeds the maximum JSON nesting depth');
    return;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) error(errors, path, 'number', 'must be a finite JSON number');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => jsonValue(item, path + '[' + index + ']', errors, depth + 1));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) jsonValue(item, path + '.' + key, errors, depth + 1);
    return;
  }
  error(errors, path, 'json', 'must contain only JSON values');
}

function validateExpert(value, path, errors) {
  if (!exactObject(value, path, [
    'annotationId',
    'annotationProtocolSha256',
    'subjectSha256',
    'blinded',
    'reviewerCount',
    'baselineAdjudicationSha256',
    'baselineMaterialIssueCount',
    'materialDefectsIntroduced',
    'criticalSeriousIssuesResolved',
    'pass',
  ], errors)) return;
  stringValue(value.annotationId, path + '.annotationId', errors, { max: 200 });
  stringValue(value.annotationProtocolSha256, path + '.annotationProtocolSha256', errors, { pattern: SHA256_RE, max: 64 });
  stringValue(value.subjectSha256, path + '.subjectSha256', errors, { pattern: SHA256_RE, max: 64 });
  booleanValue(value.blinded, path + '.blinded', errors);
  stringValue(value.baselineAdjudicationSha256, path + '.baselineAdjudicationSha256', errors, { pattern: SHA256_RE, max: 64 });
  numberValue(value.reviewerCount, path + '.reviewerCount', errors, { integer: true, min: 1 });
  numberValue(value.baselineMaterialIssueCount, path + '.baselineMaterialIssueCount', errors, { integer: true, min: 1 });
  numberValue(value.materialDefectsIntroduced, path + '.materialDefectsIntroduced', errors, { integer: true, min: 0 });
  numberValue(value.criticalSeriousIssuesResolved, path + '.criticalSeriousIssuesResolved', errors, { integer: true, min: 0 });
  if (Number.isSafeInteger(value.criticalSeriousIssuesResolved)
    && Number.isSafeInteger(value.baselineMaterialIssueCount)
    && value.criticalSeriousIssuesResolved > value.baselineMaterialIssueCount) {
    error(errors, path + '.criticalSeriousIssuesResolved', 'denominator', 'cannot exceed baselineMaterialIssueCount');
  }
  booleanValue(value.pass, path + '.pass', errors);
}

/** Strictly validate one immutable result.json record. */
export function validateResultRecord(record) {
  const errors = [];
  if (!exactObject(record, '$', [
    'schema', 'observationId', 'runId', 'capturedAt', 'document', 'condition', 'protocol',
    'execution', 'artifacts', 'outcome', 'rounds', 'usage', 'expertAdjudication',
  ], errors)) return { valid: false, errors };

  if (record.schema !== RESULT_SCHEMA_ID) error(errors, '$.schema', 'const', 'must equal ' + RESULT_SCHEMA_ID);
  stringValue(record.observationId, '$.observationId', errors, { max: 200 });
  stringValue(record.runId, '$.runId', errors, { max: 300 });
  stringValue(record.capturedAt, '$.capturedAt', errors, { max: 40 });
  if (typeof record.capturedAt === 'string') {
    const parsed = new Date(record.capturedAt);
    if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== record.capturedAt) {
      error(errors, '$.capturedAt', 'date_time', 'must be an exact UTC ISO-8601 timestamp');
    }
  }

  if (exactObject(record.document, '$.document', ['documentId', 'sourceSha256', 'partition'], errors)) {
    stringValue(record.document.documentId, '$.document.documentId', errors, { max: 200 });
    stringValue(record.document.sourceSha256, '$.document.sourceSha256', errors, { pattern: SHA256_RE, max: 64 });
    enumValue(record.document.partition, '$.document.partition', PARTITIONS, errors);
  }
  if (exactObject(record.condition, '$.condition', ['kind', 'replicate'], errors)) {
    enumValue(record.condition.kind, '$.condition.kind', CONDITION_KINDS, errors);
    numberValue(record.condition.replicate, '$.condition.replicate', errors, { integer: true, min: 1 });
  }
  if (exactObject(record.protocol, '$.protocol', [
    'protocolSha256', 'engine', 'provider', 'model', 'sharedOptions', 'conditionOptions',
  ], errors)) {
    stringValue(record.protocol.protocolSha256, '$.protocol.protocolSha256', errors, { pattern: SHA256_RE, max: 64 });
    if (exactObject(record.protocol.engine, '$.protocol.engine', ['name', 'version', 'buildSha256'], errors)) {
      stringValue(record.protocol.engine.name, '$.protocol.engine.name', errors, { max: 200 });
      stringValue(record.protocol.engine.version, '$.protocol.engine.version', errors, { max: 200 });
      stringValue(record.protocol.engine.buildSha256, '$.protocol.engine.buildSha256', errors, { pattern: SHA256_RE, max: 64 });
    }
    stringValue(record.protocol.provider, '$.protocol.provider', errors, { max: 300 });
    if (exactObject(record.protocol.model, '$.protocol.model', [
      'primary', 'fallback', 'endpoint', 'sampling', 'temperatureControlled', 'seedControlled',
      'fallbackEnabled', 'actualModelTraceComplete',
    ], errors)) {
      stringValue(record.protocol.model.primary, '$.protocol.model.primary', errors, { max: 300 });
      stringValue(record.protocol.model.fallback, '$.protocol.model.fallback', errors, { max: 300 });
      stringValue(record.protocol.model.endpoint, '$.protocol.model.endpoint', errors, { max: 2000 });
      stringValue(record.protocol.model.sampling, '$.protocol.model.sampling', errors, { max: 300 });
      booleanValue(record.protocol.model.temperatureControlled, '$.protocol.model.temperatureControlled', errors);
      booleanValue(record.protocol.model.seedControlled, '$.protocol.model.seedControlled', errors);
      booleanValue(record.protocol.model.fallbackEnabled, '$.protocol.model.fallbackEnabled', errors);
      booleanValue(record.protocol.model.actualModelTraceComplete, '$.protocol.model.actualModelTraceComplete', errors);
    }
    if (!isPlainObject(record.protocol.sharedOptions)) error(errors, '$.protocol.sharedOptions', 'type', 'must be an object');
    else jsonValue(record.protocol.sharedOptions, '$.protocol.sharedOptions', errors);
    if (!isPlainObject(record.protocol.conditionOptions)) error(errors, '$.protocol.conditionOptions', 'type', 'must be an object');
    else jsonValue(record.protocol.conditionOptions, '$.protocol.conditionOptions', errors);
  }
  if (exactObject(record.execution, '$.execution', ['providerClass', 'evidenceClass', 'effectivenessEligible'], errors)) {
    enumValue(record.execution.providerClass, '$.execution.providerClass', new Set(['live', 'scripted', 'synthetic']), errors);
    enumValue(record.execution.evidenceClass, '$.execution.evidenceClass', new Set([
      'infrastructure_only', 'development_descriptive', 'prospective_confirmatory',
    ]), errors);
    booleanValue(record.execution.effectivenessEligible, '$.execution.effectivenessEligible', errors);
    if (record.execution.effectivenessEligible === true
      && (record.execution.providerClass !== 'live' || record.execution.evidenceClass !== 'prospective_confirmatory')) {
      error(errors, '$.execution.effectivenessEligible', 'eligibility', 'can be true only for live prospective-confirmatory evidence');
    }
    if (record.execution.effectivenessEligible === true && record.protocol && record.protocol.model
      && record.protocol.model.actualModelTraceComplete !== true
      && record.protocol.model.primary !== record.protocol.model.fallback) {
      error(errors, '$.execution.effectivenessEligible', 'model_trace',
        'requires a complete actual-model trace or identical primary and fallback model IDs');
    }
    if (record.execution.evidenceClass === 'prospective_confirmatory'
      && record.document && record.document.partition !== 'prospective_held_out') {
      error(errors, '$.execution.evidenceClass', 'eligibility', 'prospective-confirmatory evidence requires prospective_held_out partition');
    }
    if (record.execution.evidenceClass === 'development_descriptive'
      && record.document && !DEVELOPMENT_PARTITIONS.has(record.document.partition)) {
      error(errors, '$.execution.evidenceClass', 'eligibility', 'development-descriptive evidence requires a development partition');
    }
  }
  if (exactObject(record.artifacts, '$.artifacts', [
    'finalSha256', 'verificationSha256', 'verificationSubjectSha256', 'verificationBindingValid',
    'finalArtifactEvidenceBound',
  ], errors)) {
    for (const key of ['finalSha256', 'verificationSha256', 'verificationSubjectSha256']) {
      stringValue(record.artifacts[key], '$.artifacts.' + key, errors, { pattern: SHA256_RE, max: 64 });
    }
    booleanValue(record.artifacts.verificationBindingValid, '$.artifacts.verificationBindingValid', errors);
    booleanValue(record.artifacts.finalArtifactEvidenceBound, '$.artifacts.finalArtifactEvidenceBound', errors);
  }
  if (exactObject(record.outcome, '$.outcome', ['status', 'automated', 'expertConfirmed'], errors)) {
    enumValue(record.outcome.status, '$.outcome.status', new Set(['complete', 'incomplete', 'failed']), errors);
    if (exactObject(record.outcome.automated, '$.outcome.automated', [
      'beforeScore', 'afterScore', 'openIssueCount', 'introducedDefectCount', 'verificationComplete',
      'pdfUaStatus', 'pdfUaFailedRules', 'pdfUaFailedChecks', 'deliveryRefusal',
    ], errors)) {
      numberValue(record.outcome.automated.beforeScore, '$.outcome.automated.beforeScore', errors, { nullable: true, min: 0, max: 100 });
      numberValue(record.outcome.automated.afterScore, '$.outcome.automated.afterScore', errors, { nullable: true, min: 0, max: 100 });
      numberValue(record.outcome.automated.openIssueCount, '$.outcome.automated.openIssueCount', errors, { nullable: true, integer: true, min: 0 });
      numberValue(record.outcome.automated.introducedDefectCount, '$.outcome.automated.introducedDefectCount', errors, { nullable: true, integer: true, min: 0 });
      booleanValue(record.outcome.automated.verificationComplete, '$.outcome.automated.verificationComplete', errors);
      stringValue(record.outcome.automated.pdfUaStatus, '$.outcome.automated.pdfUaStatus', errors, { nullable: true, max: 100 });
      numberValue(record.outcome.automated.pdfUaFailedRules, '$.outcome.automated.pdfUaFailedRules', errors, { nullable: true, integer: true, min: 0 });
      numberValue(record.outcome.automated.pdfUaFailedChecks, '$.outcome.automated.pdfUaFailedChecks', errors, { nullable: true, integer: true, min: 0 });
      stringValue(record.outcome.automated.deliveryRefusal, '$.outcome.automated.deliveryRefusal', errors, { nullable: true, max: 2000 });
    }
    if (record.outcome.expertConfirmed !== null) validateExpert(record.outcome.expertConfirmed, '$.outcome.expertConfirmed', errors);
  }
  if (exactObject(record.rounds, '$.rounds', ['attempted', 'accepted', 'reverted'], errors)) {
    for (const key of ['attempted', 'accepted', 'reverted']) {
      numberValue(record.rounds[key], '$.rounds.' + key, errors, { integer: true, min: 0 });
    }
    if (Number.isSafeInteger(record.rounds.attempted)
      && Number.isSafeInteger(record.rounds.accepted)
      && Number.isSafeInteger(record.rounds.reverted)
      && record.rounds.accepted + record.rounds.reverted > record.rounds.attempted) {
      error(errors, '$.rounds', 'round_accounting', 'accepted + reverted cannot exceed attempted');
    }
  }
  if (exactObject(record.usage, '$.usage', ['latencyMs', 'modelCalls', 'inputTokens', 'outputTokens', 'costUsd'], errors)) {
    numberValue(record.usage.latencyMs, '$.usage.latencyMs', errors, { min: 0 });
    for (const key of ['modelCalls', 'inputTokens', 'outputTokens']) {
      numberValue(record.usage[key], '$.usage.' + key, errors, { nullable: true, integer: true, min: 0 });
    }
    numberValue(record.usage.costUsd, '$.usage.costUsd', errors, { nullable: true, min: 0 });
  }
  if (exactObject(record.expertAdjudication, '$.expertAdjudication', [
    'status', 'annotationJoinKey', 'expectedSubjectSha256', 'annotationFile', 'annotationSha256',
  ], errors)) {
    enumValue(record.expertAdjudication.status, '$.expertAdjudication.status', new Set(['unassigned', 'joined']), errors);
    stringValue(record.expertAdjudication.annotationJoinKey, '$.expertAdjudication.annotationJoinKey', errors, { max: 200 });
    stringValue(record.expertAdjudication.expectedSubjectSha256, '$.expertAdjudication.expectedSubjectSha256', errors, { pattern: SHA256_RE, max: 64 });
    stringValue(record.expertAdjudication.annotationFile, '$.expertAdjudication.annotationFile', errors, { nullable: true, max: 2000 });
    stringValue(record.expertAdjudication.annotationSha256, '$.expertAdjudication.annotationSha256', errors, { nullable: true, pattern: SHA256_RE, max: 64 });
  }

  const kind = record.condition && record.condition.kind;
  const options = record.protocol && record.protocol.conditionOptions;
  if (isPlainObject(options) && EFFECT_CONDITIONS.has(kind)) {
    if (typeof options.autoContinue !== 'boolean') {
      error(errors, '$.protocol.conditionOptions.autoContinue', 'condition_contract', 'must explicitly record the loop toggle');
    } else if ((kind === 'one_shot' && options.autoContinue !== false)
      || (kind === 'gated_loop' && options.autoContinue !== true)) {
      error(errors, '$.protocol.conditionOptions.autoContinue', 'condition_contract', 'does not match condition.kind');
    }
  }
  if (kind === 'one_shot' && record.rounds
    && (record.rounds.attempted !== 0 || record.rounds.accepted !== 0 || record.rounds.reverted !== 0)) {
    error(errors, '$.rounds', 'condition_contract', 'one_shot cannot contain refinement rounds');
  }
  if (record.artifacts && record.expertAdjudication
    && record.expertAdjudication.expectedSubjectSha256 !== record.artifacts.finalSha256) {
    error(errors, '$.expertAdjudication.expectedSubjectSha256', 'expert_binding', 'must bind the final artifact');
  }
  if (record.expertAdjudication && record.outcome) {
    const joined = record.expertAdjudication.status === 'joined';
    const expert = record.outcome.expertConfirmed;
    if (joined && (!expert || !record.expertAdjudication.annotationFile || !record.expertAdjudication.annotationSha256)) {
      error(errors, '$.expertAdjudication', 'expert_join', 'joined adjudication requires expert outcome, file, and hash');
    }
    if (!joined && (expert !== null || record.expertAdjudication.annotationFile !== null || record.expertAdjudication.annotationSha256 !== null)) {
      error(errors, '$.expertAdjudication', 'expert_join', 'unassigned adjudication must have null expert outcome, file, and hash');
    }
    if (expert && expert.subjectSha256 !== record.expertAdjudication.expectedSubjectSha256) {
      error(errors, '$.outcome.expertConfirmed.subjectSha256', 'expert_binding', 'does not match the expected final-artifact hash');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidResultRecord(record, label = 'record') {
  const validation = validateResultRecord(record);
  if (!validation.valid) {
    throw new StudyAnalysisError(
      'INVALID_RESULT_RECORD',
      label + ' failed ' + RESULT_SCHEMA_ID + ' validation: '
        + validation.errors.map((item) => item.path + ' ' + item.message).join('; '),
      validation.errors,
    );
  }
  return record;
}

export function loadResultRecords(paths) {
  if (!Array.isArray(paths)) throw new StudyAnalysisError('INVALID_INPUT', 'paths must be an array');
  return paths.map((file, index) => {
    let value;
    try {
      value = JSON.parse(readFileSync(file, 'utf8'));
    } catch (cause) {
      throw new StudyAnalysisError('RESULT_READ_FAILED', 'Could not read result record ' + file, { index, cause: cause.message });
    }
    return assertValidResultRecord(value, String(file));
  });
}

/** Detect aliases, duplicate observations, and nested repetitions without counting repetitions as documents. */
export function inspectStudyIntegrity(records) {
  if (!Array.isArray(records)) throw new StudyAnalysisError('INVALID_INPUT', 'records must be an array');
  records.forEach((record, index) => assertValidResultRecord(record, 'records[' + index + ']'));
  const fatal = [];
  const observationIds = new Map();
  const runIds = new Map();
  const observationCells = new Map();
  const idsByHash = new Map();
  const hashesById = new Map();
  const repetitionsByDocument = new Map();

  const duplicate = (map, key, code, indexes) => {
    if (map.has(key)) fatal.push({ code, key, indexes: [map.get(key), indexes] });
    else map.set(key, indexes);
  };
  records.forEach((record, index) => {
    const hash = record.document.sourceSha256;
    const id = record.document.documentId;
    duplicate(observationIds, record.observationId, 'duplicate_observation_id', index);
    duplicate(runIds, record.runId, 'duplicate_run_id', index);
    duplicate(observationCells, [hash, record.condition.kind, record.condition.replicate].join(':'), 'duplicate_document_condition_replicate', index);
    if (!idsByHash.has(hash)) idsByHash.set(hash, new Set());
    idsByHash.get(hash).add(id);
    if (!hashesById.has(id)) hashesById.set(id, new Set());
    hashesById.get(id).add(hash);
    if (!repetitionsByDocument.has(hash)) repetitionsByDocument.set(hash, new Set());
    repetitionsByDocument.get(hash).add(record.condition.replicate);
  });
  for (const [hash, ids] of idsByHash) {
    if (ids.size > 1) fatal.push({ code: 'source_hash_aliased_as_multiple_documents', sourceSha256: hash, documentIds: [...ids].sort() });
  }
  for (const [id, hashes] of hashesById) {
    if (hashes.size > 1) fatal.push({ code: 'document_id_has_multiple_source_hashes', documentId: id, sourceSha256: [...hashes].sort() });
  }
  const replicateCounts = [...repetitionsByDocument.values()].map((set) => set.size);
  return {
    recordCount: records.length,
    uniqueDocumentCount: idsByHash.size,
    fatal,
    pseudoreplication: {
      detectedNestedRepetitions: replicateCounts.some((count) => count > 1),
      unitOfAnalysis: 'source_document_sha256',
      maximumReplicatesPerDocument: replicateCounts.length ? Math.max(...replicateCounts) : 0,
      treatment: 'replicate differences are averaged within source-document hash before resampling documents',
    },
  };
}

function comparableOptions(record) {
  const options = stableValue(record.protocol.conditionOptions);
  const normalized = isPlainObject(options) ? { ...options } : options;
  if (isPlainObject(normalized)) delete normalized.autoContinue;
  return normalized;
}

function compatibilityValue(record) {
  return {
    protocolSha256: record.protocol.protocolSha256,
    engine: record.protocol.engine,
    provider: record.protocol.provider,
    model: record.protocol.model,
    sharedOptions: record.protocol.sharedOptions,
    comparableConditionOptions: comparableOptions(record),
  };
}

function assertCompatible(records) {
  const comparison = records.filter((record) => EFFECT_CONDITIONS.has(record.condition.kind));
  if (comparison.length === 0) return { status: 'not_applicable', fingerprintSha256: null, comparedRecordCount: 0 };
  const groups = new Map();
  for (const record of comparison) {
    const value = stableStringify(compatibilityValue(record));
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(record.observationId);
  }
  if (groups.size !== 1) {
    throw new StudyAnalysisError(
      'INCOMPATIBLE_STUDY_RECORDS',
      'Refusing to compare records with different protocol, engine build, provider/model, shared options, or non-loop condition options.',
      [...groups].map(([fingerprint, observationIds]) => ({
        fingerprintSha256: sha256(fingerprint), observationIds: observationIds.sort(), compatibility: JSON.parse(fingerprint),
      })),
    );
  }
  const fingerprint = [...groups.keys()][0];
  return { status: 'compatible', fingerprintSha256: sha256(fingerprint), comparedRecordCount: comparison.length };
}

function increment(target, key, amount = 1) {
  target[key] = (target[key] || 0) + amount;
}

function numericSummary(values) {
  const usable = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!usable.length) return { available: 0, total: null, mean: null, median: null, min: null, max: null };
  const sorted = [...usable].sort((a, b) => a - b);
  const total = usable.reduce((sum, value) => sum + value, 0);
  const midpoint = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[midpoint] : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  return { available: usable.length, total, mean: total / usable.length, median, min: sorted[0], max: sorted.at(-1) };
}

function automatedRegression(record) {
  const outcome = record.outcome.automated;
  const indicators = [];
  if (typeof outcome.beforeScore === 'number' && typeof outcome.afterScore === 'number') {
    indicators.push(outcome.afterScore < outcome.beforeScore);
  }
  if (typeof outcome.introducedDefectCount === 'number') indicators.push(outcome.introducedDefectCount > 0);
  return indicators.length ? indicators.some(Boolean) : null;
}

function conditionSummary(records) {
  const attempted = records.reduce((sum, record) => sum + record.rounds.attempted, 0);
  const accepted = records.reduce((sum, record) => sum + record.rounds.accepted, 0);
  const reverted = records.reduce((sum, record) => sum + record.rounds.reverted, 0);
  const regressions = records.map(automatedRegression).filter((value) => value !== null);
  const expertDefects = records
    .map((record) => record.outcome.expertConfirmed && record.outcome.expertConfirmed.materialDefectsIntroduced)
    .filter((value) => typeof value === 'number');
  return {
    observationCount: records.length,
    uniqueDocumentCount: new Set(records.map((record) => record.document.sourceSha256)).size,
    completeCount: records.filter((record) => record.outcome.status === 'complete').length,
    verificationBoundCount: records.filter((record) => record.artifacts.verificationBindingValid).length,
    automatedRegression: {
      evaluable: regressions.length,
      count: regressions.filter(Boolean).length,
      rate: regressions.length ? regressions.filter(Boolean).length / regressions.length : null,
      definition: 'afterScore below beforeScore or recorded introducedDefectCount above zero',
    },
    expertMaterialDefects: numericSummary(expertDefects),
    rounds: {
      attempted,
      accepted,
      reverted,
      acceptanceRatePerAttempt: attempted ? accepted / attempted : null,
      reversionRatePerAttempt: attempted ? reverted / attempted : null,
    },
    usage: {
      latencyMs: numericSummary(records.map((record) => record.usage.latencyMs)),
      modelCalls: numericSummary(records.map((record) => record.usage.modelCalls)),
      inputTokens: numericSummary(records.map((record) => record.usage.inputTokens)),
      outputTokens: numericSummary(records.map((record) => record.usage.outputTokens)),
      costUsd: numericSummary(records.map((record) => record.usage.costUsd)),
    },
  };
}

function engineeringSummary(records) {
  const byEvidenceClass = {};
  const byStatus = {};
  const byPartition = {};
  const conditionGroups = new Map();
  for (const record of records) {
    increment(byEvidenceClass, record.execution.evidenceClass);
    increment(byStatus, record.outcome.status);
    increment(byPartition, record.document.partition);
    if (!conditionGroups.has(record.condition.kind)) conditionGroups.set(record.condition.kind, []);
    conditionGroups.get(record.condition.kind).push(record);
  }
  return {
    evidenceRole: 'engineering_and_infrastructure_validation_only',
    causalEffectUsePermitted: false,
    observationCount: records.length,
    uniqueDocumentCount: new Set(records.map((record) => record.document.sourceSha256)).size,
    effectivenessEligibleFlagCount: records.filter((record) => record.execution.effectivenessEligible).length,
    verificationBoundCount: records.filter((record) => record.artifacts.verificationBindingValid).length,
    byEvidenceClass,
    byProviderClass: Object.fromEntries(['live', 'scripted', 'synthetic'].map((providerClass) => [
      providerClass, records.filter((record) => record.execution.providerClass === providerClass).length,
    ])),
    byStatus,
    byPartition,
    conditions: Object.fromEntries([...conditionGroups].sort(([a], [b]) => a.localeCompare(b)).map(([kind, group]) => [kind, conditionSummary(group)])),
    exclusionRule: 'scripted and synthetic observations are summarized here but never enter comparative effectiveness estimands',
  };
}

function buildPairs(records) {
  const cells = new Map();
  for (const record of records) {
    if (!EFFECT_CONDITIONS.has(record.condition.kind)) continue;
    const key = record.document.sourceSha256 + ':' + record.condition.replicate;
    if (!cells.has(key)) cells.set(key, {
      documentSha256: record.document.sourceSha256,
      documentId: record.document.documentId,
      partition: record.document.partition,
      replicate: record.condition.replicate,
      oneShot: null,
      gatedLoop: null,
    });
    const cell = cells.get(key);
    if (record.condition.kind === 'one_shot') cell.oneShot = record;
    else cell.gatedLoop = record;
  }
  return [...cells.values()].sort((a, b) => a.documentSha256.localeCompare(b.documentSha256) || a.replicate - b.replicate);
}

function pairExclusionReasons(pair, partitions, expert, requiredEvidenceClass, requireEligibilityFlag) {
  const reasons = [];
  if (!pair.oneShot || !pair.gatedLoop) return ['unmatched_condition'];
  if (!partitions.has(pair.partition)) reasons.push('partition_out_of_scope');
  for (const record of [pair.oneShot, pair.gatedLoop]) {
    if (record.execution.providerClass !== 'live') reasons.push('not_live');
    if (record.protocol.model.actualModelTraceComplete !== true
      && record.protocol.model.primary !== record.protocol.model.fallback) {
      reasons.push('actual_model_trace_incomplete');
    }
    if (record.execution.evidenceClass !== requiredEvidenceClass) reasons.push('evidence_class_out_of_scope');
    if (requireEligibilityFlag && !record.execution.effectivenessEligible) reasons.push('record_not_effectiveness_eligible');
    if (!record.artifacts.verificationBindingValid) reasons.push('verification_binding_invalid');
    if (!record.artifacts.finalArtifactEvidenceBound) reasons.push('final_artifact_evidence_unbound');
    if (record.outcome.status !== 'complete') reasons.push('outcome_not_complete');
    if (expert) {
      const value = record.outcome.expertConfirmed;
      if (!value) reasons.push('expert_outcome_missing');
      else {
        if (!value.blinded) reasons.push('expert_review_not_blinded');
        if (value.reviewerCount < 2) reasons.push('fewer_than_two_expert_reviewers');
        if (value.subjectSha256 !== record.artifacts.finalSha256) reasons.push('expert_subject_binding_invalid');
      }
    }
  }
  if (expert && pair.oneShot && pair.gatedLoop) {
    const one = pair.oneShot.outcome.expertConfirmed;
    const gated = pair.gatedLoop.outcome.expertConfirmed;
    if (one && gated && (one.baselineMaterialIssueCount !== gated.baselineMaterialIssueCount
      || one.baselineAdjudicationSha256 !== gated.baselineAdjudicationSha256)) {
      reasons.push('baseline_issue_denominator_mismatch');
    }
  }
  return [...new Set(reasons)];
}

function automatedMetric(name, oneShot, gatedLoop) {
  const one = oneShot.outcome.automated;
  const gated = gatedLoop.outcome.automated;
  if (name === 'scoreChangeDifference') {
    if (![one.beforeScore, one.afterScore, gated.beforeScore, gated.afterScore].every((value) => typeof value === 'number')) return null;
    return (gated.afterScore - gated.beforeScore) - (one.afterScore - one.beforeScore);
  }
  if (name === 'finalScoreDifference') {
    return typeof one.afterScore === 'number' && typeof gated.afterScore === 'number' ? gated.afterScore - one.afterScore : null;
  }
  if (name === 'openIssueReduction') {
    return typeof one.openIssueCount === 'number' && typeof gated.openIssueCount === 'number' ? one.openIssueCount - gated.openIssueCount : null;
  }
  if (name === 'introducedDefectReduction') {
    return typeof one.introducedDefectCount === 'number' && typeof gated.introducedDefectCount === 'number'
      ? one.introducedDefectCount - gated.introducedDefectCount : null;
  }
  if (name === 'verificationCompletionDifference') return Number(gated.verificationComplete) - Number(one.verificationComplete);
  if (name === 'regressionRateDifference') {
    const oneRegression = automatedRegression(oneShot);
    const gatedRegression = automatedRegression(gatedLoop);
    return oneRegression === null || gatedRegression === null ? null : Number(oneRegression) - Number(gatedRegression);
  }
  return null;
}

function safeMaterialResolutionRate(outcome) {
  if (!outcome || !Number.isSafeInteger(outcome.baselineMaterialIssueCount)
    || outcome.baselineMaterialIssueCount <= 0
    || !Number.isSafeInteger(outcome.criticalSeriousIssuesResolved)
    || outcome.criticalSeriousIssuesResolved > outcome.baselineMaterialIssueCount) return null;
  if (outcome.materialDefectsIntroduced > 0) return 0;
  return outcome.criticalSeriousIssuesResolved / outcome.baselineMaterialIssueCount;
}

function expertMetric(name, oneShot, gatedLoop) {
  const one = oneShot.outcome.expertConfirmed;
  const gated = gatedLoop.outcome.expertConfirmed;
  if (!one || !gated) return null;
  if (name === 'safeMaterialResolutionRateDifference') {
    const oneRate = safeMaterialResolutionRate(one);
    const gatedRate = safeMaterialResolutionRate(gated);
    return oneRate === null || gatedRate === null ? null : gatedRate - oneRate;
  }
  if (name === 'materialDefectReduction') return one.materialDefectsIntroduced - gated.materialDefectsIntroduced;
  if (name === 'criticalSeriousResolutionDifference') return gated.criticalSeriousIssuesResolved - one.criticalSeriousIssuesResolved;
  if (name === 'passRateDifference') return Number(gated.pass) - Number(one.pass);
  return null;
}

function seedFor(seed, label) {
  let value = Number(seed) >>> 0;
  for (let index = 0; index < label.length; index += 1) {
    value ^= label.charCodeAt(index);
    value = Math.imul(value, 16777619) >>> 0;
  }
  return value || 0x6d2b79f5;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function quantile(sorted, probability) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * probability;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Bootstrap document-level paired means. Statistical seed affects resampling only, never model generation. */
export function bootstrapPairedMean(documentDifferences, options = {}) {
  const values = documentDifferences.map(Number);
  if (values.some((value) => !Number.isFinite(value))) throw new StudyAnalysisError('INVALID_BOOTSTRAP_INPUT', 'all differences must be finite');
  const iterations = options.iterations === undefined ? 5000 : Number(options.iterations);
  const confidenceLevel = options.confidenceLevel === undefined ? 0.95 : Number(options.confidenceLevel);
  const seed = options.seed === undefined ? 20260813 : Number(options.seed);
  const minimumDocuments = options.minimumDocuments === undefined ? 2 : Number(options.minimumDocuments);
  if (!Number.isSafeInteger(iterations) || iterations < 100 || iterations > 1000000) {
    throw new StudyAnalysisError('INVALID_ANALYSIS_OPTIONS', 'bootstrap iterations must be an integer from 100 to 1,000,000');
  }
  if (!Number.isFinite(confidenceLevel) || confidenceLevel <= 0 || confidenceLevel >= 1) {
    throw new StudyAnalysisError('INVALID_ANALYSIS_OPTIONS', 'confidenceLevel must be between 0 and 1');
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new StudyAnalysisError('INVALID_ANALYSIS_OPTIONS', 'bootstrap seed must be a uint32 integer');
  }
  if (!Number.isSafeInteger(minimumDocuments) || minimumDocuments < 2) {
    throw new StudyAnalysisError('INVALID_ANALYSIS_OPTIONS', 'minimumDocuments must be an integer of at least 2');
  }
  const estimate = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  if (values.length === 0) return { status: 'no_eligible_documents', documentCount: 0, estimate: null, confidenceInterval: null };
  if (values.length < minimumDocuments) {
    return { status: 'insufficient_documents', documentCount: values.length, estimate, confidenceInterval: null };
  }
  const random = mulberry32(seed);
  const means = new Array(iterations);
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let sum = 0;
    for (let draw = 0; draw < values.length; draw += 1) sum += values[Math.floor(random() * values.length)];
    means[iteration] = sum / values.length;
  }
  means.sort((a, b) => a - b);
  const tail = (1 - confidenceLevel) / 2;
  return {
    status: 'estimated',
    documentCount: values.length,
    estimate,
    confidenceInterval: { method: 'document_cluster_percentile_bootstrap', level: confidenceLevel, low: quantile(means, tail), high: quantile(means, 1 - tail) },
  };
}

const AUTOMATED_METRICS = {
  scoreChangeDifference: 'score points',
  finalScoreDifference: 'score points',
  openIssueReduction: 'issues',
  introducedDefectReduction: 'defects',
  verificationCompletionDifference: 'proportion',
  regressionRateDifference: 'proportion',
};
const EXPERT_METRICS = {
  safeMaterialResolutionRateDifference: 'proportion',
  materialDefectReduction: 'defects',
  criticalSeriousResolutionDifference: 'issues',
  passRateDifference: 'proportion',
};

function analyzeEstimand(records, { partitions, outcomeType, label, requiredEvidenceClass, requireEligibilityFlag, minimumDocuments, options }) {
  const pairs = buildPairs(records);
  const excludedByReason = {};
  const eligible = [];
  for (const pair of pairs) {
    const reasons = pairExclusionReasons(
      pair, partitions, outcomeType === 'expert', requiredEvidenceClass, requireEligibilityFlag,
    );
    if (reasons.length) reasons.forEach((reason) => increment(excludedByReason, reason));
    else eligible.push(pair);
  }
  const documents = new Set(eligible.map((pair) => pair.documentSha256));
  const status = documents.size === 0 ? 'no_eligible_documents'
    : (documents.size < minimumDocuments ? 'insufficient_documents' : 'estimated');
  const metricDefinitions = outcomeType === 'expert' ? EXPERT_METRICS : AUTOMATED_METRICS;
  const metrics = {};
  for (const [metricName, unit] of Object.entries(metricDefinitions)) {
    const byDocument = new Map();
    for (const pair of eligible) {
      const difference = outcomeType === 'expert'
        ? expertMetric(metricName, pair.oneShot, pair.gatedLoop)
        : automatedMetric(metricName, pair.oneShot, pair.gatedLoop);
      if (difference === null) continue;
      if (!byDocument.has(pair.documentSha256)) byDocument.set(pair.documentSha256, []);
      byDocument.get(pair.documentSha256).push(difference);
    }
    const documentDifferences = [...byDocument].sort(([a], [b]) => a.localeCompare(b))
      .map(([, differences]) => differences.reduce((sum, value) => sum + value, 0) / differences.length);
    const result = bootstrapPairedMean(documentDifferences, {
      iterations: options.bootstrapIterations,
      confidenceLevel: options.confidenceLevel,
      minimumDocuments,
      seed: seedFor(options.bootstrapSeed, label + ':' + outcomeType + ':' + metricName),
    });
    metrics[metricName] = {
      ...result,
      unit,
      direction: 'positive_favors_gated_loop',
      pairedReplicateCount: [...byDocument.values()].reduce((sum, values) => sum + values.length, 0),
    };
  }
  return {
    status,
    outcomeRole: outcomeType === 'expert' ? 'primary_effectiveness' : 'automated_surrogate_only',
    scope: label,
    includedPartitions: [...partitions].sort(),
    eligiblePairedReplicateCount: eligible.length,
    documentCount: documents.size,
    excludedPairCount: pairs.length - eligible.length,
    excludedByReason,
    unitOfAnalysis: 'source_document_sha256',
    replicateTreatment: 'paired replicate differences averaged within document',
    metrics,
  };
}

/** Analyze immutable result records without calling a model or mutating the production pipeline. */
export function analyzeRefinementStudy(records, inputOptions = {}) {
  if (!Array.isArray(records)) throw new StudyAnalysisError('INVALID_INPUT', 'records must be an array');
  const options = {
    bootstrapSeed: inputOptions.bootstrapSeed === undefined ? 20260813 : inputOptions.bootstrapSeed,
    bootstrapIterations: inputOptions.bootstrapIterations === undefined ? 5000 : inputOptions.bootstrapIterations,
    confidenceLevel: inputOptions.confidenceLevel === undefined ? 0.95 : inputOptions.confidenceLevel,
    minimumDevelopmentDocuments: inputOptions.minimumDevelopmentDocuments === undefined ? 2 : inputOptions.minimumDevelopmentDocuments,
    minimumConfirmatoryDocuments: 12,
  };
  const allowedOptions = new Set(['bootstrapSeed', 'bootstrapIterations', 'confidenceLevel', 'minimumDevelopmentDocuments']);
  for (const key of Object.keys(inputOptions)) {
    if (!allowedOptions.has(key)) throw new StudyAnalysisError('INVALID_ANALYSIS_OPTIONS', 'unknown analysis option: ' + key);
  }
  // Validate statistical options even when there are zero observations.
  bootstrapPairedMean([], {
    seed: options.bootstrapSeed,
    iterations: options.bootstrapIterations,
    confidenceLevel: options.confidenceLevel,
    minimumDocuments: options.minimumDevelopmentDocuments,
  });
  const integrity = inspectStudyIntegrity(records);
  if (integrity.fatal.length) {
    throw new StudyAnalysisError(
      'STUDY_INTEGRITY_VIOLATION',
      'Duplicate or aliased records would pseudoreplicate documents; analysis refused.',
      integrity.fatal,
    );
  }
  const compatibility = assertCompatible(records);
  const confirmatoryExpert = analyzeEstimand(records, {
    partitions: new Set(['prospective_held_out']), outcomeType: 'expert', label: 'confirmatory_prospective_held_out',
    requiredEvidenceClass: 'prospective_confirmatory', requireEligibilityFlag: true,
    minimumDocuments: options.minimumConfirmatoryDocuments, options,
  });
  const confirmatoryAutomated = analyzeEstimand(records, {
    partitions: new Set(['prospective_held_out']), outcomeType: 'automated', label: 'confirmatory_prospective_held_out',
    requiredEvidenceClass: 'prospective_confirmatory', requireEligibilityFlag: true,
    minimumDocuments: options.minimumConfirmatoryDocuments, options,
  });
  const descriptiveExpert = analyzeEstimand(records, {
    partitions: DEVELOPMENT_PARTITIONS, outcomeType: 'expert', label: 'development_descriptive',
    requiredEvidenceClass: 'development_descriptive', requireEligibilityFlag: false,
    minimumDocuments: options.minimumDevelopmentDocuments, options,
  });
  const descriptiveAutomated = analyzeEstimand(records, {
    partitions: DEVELOPMENT_PARTITIONS, outcomeType: 'automated', label: 'development_descriptive',
    requiredEvidenceClass: 'development_descriptive', requireEligibilityFlag: false,
    minimumDocuments: options.minimumDevelopmentDocuments, options,
  });
  return {
    schema: ANALYSIS_SCHEMA_ID,
    parameters: {
      bootstrapSeed: options.bootstrapSeed,
      bootstrapIterations: options.bootstrapIterations,
      confidenceLevel: options.confidenceLevel,
      minimumConfirmatoryDocuments: options.minimumConfirmatoryDocuments,
      minimumDevelopmentDocuments: options.minimumDevelopmentDocuments,
      bootstrapSeedRole: 'statistical_resampling_only_not_model_generation',
    },
    integrity,
    compatibility,
    engineeringValidation: engineeringSummary(records),
    estimands: {
      confirmatoryProspectiveHeldOut: {
        publicationRole: 'prospective_comparative_evidence',
        expertConfirmed: confirmatoryExpert,
        automatedSurrogates: confirmatoryAutomated,
        primaryEffectivenessStatus: confirmatoryExpert.status,
      },
      developmentDescriptive: {
        publicationRole: 'descriptive_internal_evidence_not_confirmatory',
        expertConfirmed: descriptiveExpert,
        automatedSurrogates: descriptiveAutomated,
      },
    },
    interpretation: {
      primaryOutcomeFamily: 'blinded_expert_confirmed',
      automatedOutcomeFamily: 'surrogate_only',
      causalClaimPermitted: false,
      causalBoundary: 'The v1 record proves pairing and artifact binding but does not itself prove randomization, preregistration, or absence of carryover.',
    },
    limitations: [
      'provider_default_sampling_uncontrolled: MCP transport records no generation temperature or model seed',
      'replicates_are_nested_stochastic_observations_not_independent_documents',
      'full_policy_estimand: one-shot and gated-loop independently regenerate the primary pass, so deltas include primary-pass sampling variance and do not isolate continuation on a fixed candidate',
      'automated_scores_and_validator_counts_are_surrogate_outcomes',
      'scripted_and_synthetic_runs_are_engineering_evidence_only',
      'development_and_safety_corpus_results_do_not_establish_held_out_generalization',
      'actual_primary_vs_fallback_model_used_per_call_is_not_recorded_in_schema_v1',
      'randomization_and_preregistration_are_not_verified_by_schema_v1',
    ],
  };
}

function formatNumber(value) {
  if (value === null || value === undefined) return 'n/a';
  return Number(value).toFixed(3).replace(/\.000$/, '');
}

function metricRows(scope, family) {
  return Object.entries(family.metrics).map(([name, metric]) => {
    const interval = metric.confidenceInterval
      ? formatNumber(metric.confidenceInterval.low) + ' to ' + formatNumber(metric.confidenceInterval.high)
      : 'not estimated';
    return '| ' + scope + ' | ' + family.outcomeRole + ' | ' + name + ' | ' + metric.documentCount + ' | '
      + formatNumber(metric.estimate) + ' | ' + interval + ' | ' + metric.status + ' |';
  });
}

export function renderMarkdownReport(analysis) {
  if (!analysis || analysis.schema !== ANALYSIS_SCHEMA_ID) {
    throw new StudyAnalysisError('INVALID_ANALYSIS', 'renderMarkdownReport requires an ' + ANALYSIS_SCHEMA_ID + ' object');
  }
  const confirmatory = analysis.estimands.confirmatoryProspectiveHeldOut;
  const development = analysis.estimands.developmentDescriptive;
  const lines = [
    '# MCP refinement study analysis',
    '',
    '**Primary expert-confirmed effectiveness status:** `' + confirmatory.primaryEffectivenessStatus + '`.',
    '',
    'Automated scores and validator counts are surrogate outcomes. Scripted and synthetic runs are engineering evidence only. Positive paired estimates favor the gated loop.',
    '',
    '## Evidence inventory',
    '',
    '- Records: ' + analysis.engineeringValidation.observationCount,
    '- Unique source documents: ' + analysis.engineeringValidation.uniqueDocumentCount,
    '- Evidence classes: `' + stableStringify(analysis.engineeringValidation.byEvidenceClass) + '`',
    '- Nested repetitions detected: ' + analysis.integrity.pseudoreplication.detectedNestedRepetitions,
    '- Compatibility: ' + analysis.compatibility.status,
    '',
    '## Paired document-level estimates',
    '',
    '| Scope | Outcome role | Metric | Documents | Estimate | Bootstrap CI | Status |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
    ...metricRows('prospective held-out', confirmatory.expertConfirmed),
    ...metricRows('prospective held-out', confirmatory.automatedSurrogates),
    ...metricRows('development descriptive', development.expertConfirmed),
    ...metricRows('development descriptive', development.automatedSurrogates),
    '',
    '## Engineering telemetry by condition',
    '',
    '| Condition | Observations | Documents | Regressions | Accepted rounds | Reverted rounds | Mean latency (ms) | Total cost (USD) |',
    '| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: |',
  ];
  for (const [kind, summary] of Object.entries(analysis.engineeringValidation.conditions)) {
    lines.push('| ' + kind + ' | ' + summary.observationCount + ' | ' + summary.uniqueDocumentCount + ' | '
      + summary.automatedRegression.count + '/' + summary.automatedRegression.evaluable + ' | '
      + summary.rounds.accepted + ' | ' + summary.rounds.reverted + ' | '
      + formatNumber(summary.usage.latencyMs.mean) + ' | ' + formatNumber(summary.usage.costUsd.total) + ' |');
  }
  lines.push('', '## Interpretation boundaries', '');
  for (const limitation of analysis.limitations) lines.push('- ' + limitation);
  lines.push('');
  return lines.join('\n');
}
