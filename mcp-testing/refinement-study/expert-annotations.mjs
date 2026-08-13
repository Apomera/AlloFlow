import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertValidResultRecord, StudyAnalysisError } from './analysis.mjs';

export const EXPERT_ANNOTATION_SCHEMA_ID = 'alloflow.mcp-refinement-expert-annotation/v1';
const SHA256_RE = /^[a-f0-9]{64}$/;
const FIELDS = [
  'schema',
  'annotationId',
  'annotationProtocolSha256',
  'annotationJoinKey',
  'subjectSha256',
  'blinded',
  'reviewerCount',
  'baselineAdjudicationSha256',
  'baselineMaterialIssueCount',
  'materialDefectsIntroduced',
  'criticalSeriousIssuesResolved',
  'pass',
  'adjudicatedAt',
  'contentCommitmentSha256',
];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
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
  return createHash('sha256').update(value).digest('hex');
}

export function annotationCommitment(annotationWithoutCommitment) {
  if (!isPlainObject(annotationWithoutCommitment)) {
    throw new StudyAnalysisError('INVALID_EXPERT_ANNOTATION', 'annotation commitment input must be an object');
  }
  const committed = { ...annotationWithoutCommitment };
  delete committed.contentCommitmentSha256;
  return sha256(Buffer.from(stableStringify(committed), 'utf8'));
}

function issue(errors, path, message) {
  errors.push({ path, message });
}

export function validateExpertAnnotation(annotation) {
  const errors = [];
  if (!isPlainObject(annotation)) return { valid: false, errors: [{ path: '$', message: 'must be an object' }] };
  for (const field of FIELDS) if (!Object.prototype.hasOwnProperty.call(annotation, field)) issue(errors, '$.' + field, 'is required');
  for (const field of Object.keys(annotation)) if (!FIELDS.includes(field)) issue(errors, '$.' + field, 'is not allowed by schema v1');
  if (annotation.schema !== EXPERT_ANNOTATION_SCHEMA_ID) issue(errors, '$.schema', 'has the wrong schema ID');
  for (const field of ['annotationId', 'annotationJoinKey']) {
    if (typeof annotation[field] !== 'string' || !annotation[field] || annotation[field].length > 200) {
      issue(errors, '$.' + field, 'must be a non-empty string of at most 200 characters');
    }
  }
  for (const field of ['annotationProtocolSha256', 'subjectSha256', 'baselineAdjudicationSha256', 'contentCommitmentSha256']) {
    if (typeof annotation[field] !== 'string' || !SHA256_RE.test(annotation[field])) issue(errors, '$.' + field, 'must be a lowercase SHA-256');
  }
  if (annotation.blinded !== true) issue(errors, '$.blinded', 'must be true for blinded effectiveness review');
  if (!Number.isSafeInteger(annotation.reviewerCount) || annotation.reviewerCount < 2) issue(errors, '$.reviewerCount', 'must be an integer of at least 2');
  if (!Number.isSafeInteger(annotation.baselineMaterialIssueCount) || annotation.baselineMaterialIssueCount < 1) {
    issue(errors, '$.baselineMaterialIssueCount', 'must be an integer of at least 1');
  }
  for (const field of ['materialDefectsIntroduced', 'criticalSeriousIssuesResolved']) {
    if (!Number.isSafeInteger(annotation[field]) || annotation[field] < 0) issue(errors, '$.' + field, 'must be a non-negative integer');
  }
  if (Number.isSafeInteger(annotation.criticalSeriousIssuesResolved)
    && Number.isSafeInteger(annotation.baselineMaterialIssueCount)
    && annotation.criticalSeriousIssuesResolved > annotation.baselineMaterialIssueCount) {
    issue(errors, '$.criticalSeriousIssuesResolved', 'cannot exceed baselineMaterialIssueCount');
  }
  if (annotation.pass !== true && annotation.pass !== false) issue(errors, '$.pass', 'must be a boolean');
  if (typeof annotation.adjudicatedAt !== 'string') issue(errors, '$.adjudicatedAt', 'must be an ISO-8601 UTC timestamp');
  else {
    const parsed = new Date(annotation.adjudicatedAt);
    if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== annotation.adjudicatedAt) {
      issue(errors, '$.adjudicatedAt', 'must be an exact ISO-8601 UTC timestamp');
    }
  }
  if (typeof annotation.contentCommitmentSha256 === 'string'
    && annotationCommitment(annotation) !== annotation.contentCommitmentSha256) {
    issue(errors, '$.contentCommitmentSha256', 'does not match the canonical annotation content (possible tamper)');
  }
  return { valid: errors.length === 0, errors };
}

function loadAnnotation(file) {
  const absolutePath = resolve(String(file));
  let bytes;
  let annotation;
  try {
    bytes = readFileSync(absolutePath);
    annotation = JSON.parse(bytes.toString('utf8'));
  } catch (cause) {
    throw new StudyAnalysisError('EXPERT_ANNOTATION_READ_FAILED', 'Could not load expert annotation ' + absolutePath, { cause: cause.message });
  }
  const validation = validateExpertAnnotation(annotation);
  if (!validation.valid) {
    throw new StudyAnalysisError(
      'INVALID_EXPERT_ANNOTATION',
      absolutePath + ' failed expert annotation validation: '
        + validation.errors.map((entry) => entry.path + ' ' + entry.message).join('; '),
      validation.errors,
    );
  }
  return { absolutePath, annotation, fileSha256: sha256(bytes) };
}

/**
 * Join immutable raw result records to separate blinded annotations in memory.
 * No result.json or annotation file is modified.
 */
export function joinExpertAnnotations(records, annotationPaths) {
  if (!Array.isArray(records) || !Array.isArray(annotationPaths)) {
    throw new StudyAnalysisError('INVALID_INPUT', 'records and annotationPaths must be arrays');
  }
  records.forEach((record, index) => assertValidResultRecord(record, 'records[' + index + ']'));
  const recordsByJoinKey = new Map();
  records.forEach((record, index) => {
    const key = record.expertAdjudication.annotationJoinKey;
    if (recordsByJoinKey.has(key)) {
      throw new StudyAnalysisError('DUPLICATE_EXPERT_JOIN_KEY', 'Multiple result records use expert join key ' + key);
    }
    if (record.expertAdjudication.status !== 'unassigned' || record.outcome.expertConfirmed !== null) {
      throw new StudyAnalysisError('EXPERT_OUTCOME_ALREADY_JOINED', 'Raw result record is already joined: ' + record.observationId);
    }
    recordsByJoinKey.set(key, { record, index });
  });
  const loaded = annotationPaths.map(loadAnnotation);
  const annotationIds = new Set();
  const annotationJoinKeys = new Set();
  const annotationFiles = new Set();
  for (const item of loaded) {
    const annotation = item.annotation;
    if (annotationIds.has(annotation.annotationId)) {
      throw new StudyAnalysisError('DUPLICATE_EXPERT_ANNOTATION', 'Duplicate annotation ID ' + annotation.annotationId);
    }
    if (annotationJoinKeys.has(annotation.annotationJoinKey)) {
      throw new StudyAnalysisError('DUPLICATE_EXPERT_ANNOTATION', 'Duplicate annotation join key ' + annotation.annotationJoinKey);
    }
    if (annotationFiles.has(item.fileSha256)) {
      throw new StudyAnalysisError('DUPLICATE_EXPERT_ANNOTATION', 'Duplicate annotation file content ' + item.fileSha256);
    }
    annotationIds.add(annotation.annotationId);
    annotationJoinKeys.add(annotation.annotationJoinKey);
    annotationFiles.add(item.fileSha256);
  }
  const derived = records.map((record) => structuredClone(record));
  const joins = [];
  for (const item of loaded) {
    const annotation = item.annotation;
    const target = recordsByJoinKey.get(annotation.annotationJoinKey);
    if (!target) {
      throw new StudyAnalysisError('UNKNOWN_EXPERT_JOIN_KEY', 'No result record matches annotation join key ' + annotation.annotationJoinKey);
    }
    const record = target.record;
    if (annotation.subjectSha256 !== record.expertAdjudication.expectedSubjectSha256
      || annotation.subjectSha256 !== record.artifacts.finalSha256) {
      throw new StudyAnalysisError('EXPERT_SUBJECT_HASH_MISMATCH', 'Annotation subject is not the exact final artifact for ' + record.observationId);
    }
    if (annotation.annotationProtocolSha256 !== record.protocol.protocolSha256) {
      throw new StudyAnalysisError('EXPERT_PROTOCOL_HASH_MISMATCH', 'Annotation protocol hash does not match the result protocol for ' + record.observationId);
    }
    const next = derived[target.index];
    next.outcome.expertConfirmed = {
      annotationId: annotation.annotationId,
      annotationProtocolSha256: annotation.annotationProtocolSha256,
      subjectSha256: annotation.subjectSha256,
      blinded: annotation.blinded,
      reviewerCount: annotation.reviewerCount,
      baselineAdjudicationSha256: annotation.baselineAdjudicationSha256,
      baselineMaterialIssueCount: annotation.baselineMaterialIssueCount,
      materialDefectsIntroduced: annotation.materialDefectsIntroduced,
      criticalSeriousIssuesResolved: annotation.criticalSeriousIssuesResolved,
      pass: annotation.pass,
    };
    next.expertAdjudication = {
      status: 'joined',
      annotationJoinKey: annotation.annotationJoinKey,
      expectedSubjectSha256: annotation.subjectSha256,
      annotationFile: item.absolutePath,
      annotationSha256: item.fileSha256,
    };
    assertValidResultRecord(next, 'derived record ' + record.observationId);
    joins.push({
      observationId: record.observationId,
      annotationId: annotation.annotationId,
      subjectSha256: annotation.subjectSha256,
      annotationSha256: item.fileSha256,
    });
  }
  return {
    records: derived,
    joinedCount: joins.length,
    unjoinedCount: derived.length - joins.length,
    joins: joins.sort((a, b) => a.observationId.localeCompare(b.observationId)),
    mutation: 'none_raw_records_derived_in_memory',
  };
}
async function main(argv) {
  const [command, file] = argv;
  if (!['--commit', '--validate'].includes(command) || !file) {
    process.stdout.write('Usage: node expert-annotations.mjs --commit <annotation.json>\n'
      + '       node expert-annotations.mjs --validate <annotation.json>\n');
    return command === '--help' || command === undefined ? 0 : 2;
  }
  if (command === '--commit') {
    const annotation = JSON.parse(readFileSync(resolve(file), 'utf8'));
    process.stdout.write(annotationCommitment(annotation) + '\n');
    return 0;
  }
  const item = loadAnnotation(file);
  process.stdout.write(JSON.stringify({
    valid: true,
    annotationId: item.annotation.annotationId,
    annotationJoinKey: item.annotation.annotationJoinKey,
    subjectSha256: item.annotation.subjectSha256,
    annotationSha256: item.fileSha256,
  }, null, 2) + '\n');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }).catch((cause) => {
    process.stderr.write((cause && cause.stack) || String(cause));
    process.stderr.write('\n');
    process.exitCode = 1;
  });
}