import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  EXPERT_ANNOTATION_SCHEMA_ID,
  annotationCommitment,
  joinExpertAnnotations,
  validateExpertAnnotation,
} from '../mcp-testing/refinement-study/expert-annotations.mjs';
import { RESULT_SCHEMA_ID } from '../mcp-testing/refinement-study/analysis.mjs';

const temporaryDirectories = [];
const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

function rawRecord() {
  const sourceSha256 = hash('source');
  const finalSha256 = hash('final');
  return {
    schema: RESULT_SCHEMA_ID,
    observationId: 'B-ONE',
    runId: 'run-one',
    capturedAt: '2026-08-13T00:00:00.000Z',
    document: { documentId: 'doc-one', sourceSha256, partition: 'prospective_held_out' },
    condition: { kind: 'one_shot', replicate: 1 },
    protocol: {
      protocolSha256: hash('protocol'),
      engine: { name: 'engine', version: 'v1', buildSha256: hash('build') },
      provider: 'Gemini-compatible generateContent',
      model: {
        primary: 'model', fallback: 'model', endpoint: 'https://example.test/models',
        sampling: 'provider-default', temperatureControlled: false, seedControlled: false,
        fallbackEnabled: false, actualModelTraceComplete: false,
      },
      sharedOptions: { targetScore: 95 },
      conditionOptions: { autoContinue: false, autoContinueRounds: 3 },
    },
    execution: { providerClass: 'live', evidenceClass: 'prospective_confirmatory', effectivenessEligible: true },
    artifacts: {
      finalSha256, verificationSha256: hash('verification'), verificationSubjectSha256: hash('html'),
      verificationBindingValid: true, finalArtifactEvidenceBound: true,
    },
    outcome: {
      status: 'complete',
      automated: {
        beforeScore: 60, afterScore: 70, openIssueCount: null, introducedDefectCount: null,
        verificationComplete: true, pdfUaStatus: null, pdfUaFailedRules: null,
        pdfUaFailedChecks: null, deliveryRefusal: null,
      },
      expertConfirmed: null,
    },
    rounds: { attempted: 0, accepted: 0, reverted: 0 },
    usage: { latencyMs: 100, modelCalls: 2, inputTokens: null, outputTokens: null, costUsd: null },
    expertAdjudication: {
      status: 'unassigned', annotationJoinKey: 'B-ONE', expectedSubjectSha256: finalSha256,
      annotationFile: null, annotationSha256: null,
    },
  };
}

function annotation(record, overrides = {}) {
  const value = {
    schema: EXPERT_ANNOTATION_SCHEMA_ID,
    annotationId: 'annotation-one',
    annotationProtocolSha256: record.protocol.protocolSha256,
    annotationJoinKey: record.expertAdjudication.annotationJoinKey,
    subjectSha256: record.artifacts.finalSha256,
    blinded: true,
    reviewerCount: 2,
    baselineAdjudicationSha256: hash('shared-baseline'),
    baselineMaterialIssueCount: 10,
    materialDefectsIntroduced: 0,
    criticalSeriousIssuesResolved: 6,
    pass: true,
    adjudicatedAt: '2026-08-13T01:00:00.000Z',
    contentCommitmentSha256: '',
    ...overrides,
  };
  value.contentCommitmentSha256 = annotationCommitment(value);
  return value;
}

function writeAnnotation(value, name = 'annotation.json') {
  const directory = mkdtempSync(join(tmpdir(), 'alloflow-expert-'));
  temporaryDirectories.push(directory);
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
  return path;
}

afterEach(() => {
  while (temporaryDirectories.length) rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
});

describe('blinded expert annotation join', () => {
  it('joins a committed, protocol-bound, final-artifact-bound annotation only in memory', () => {
    const record = rawRecord();
    const original = JSON.stringify(record);
    const path = writeAnnotation(annotation(record));
    const joined = joinExpertAnnotations([record], [path]);

    expect(joined).toMatchObject({ joinedCount: 1, unjoinedCount: 0, mutation: 'none_raw_records_derived_in_memory' });
    expect(joined.records[0].outcome.expertConfirmed).toMatchObject({
      annotationId: 'annotation-one', baselineMaterialIssueCount: 10,
      baselineAdjudicationSha256: hash('shared-baseline'),
    });
    expect(joined.records[0].expertAdjudication.annotationSha256)
      .toBe(createHash('sha256').update(readFileSync(path)).digest('hex'));
    expect(JSON.stringify(record)).toBe(original);
  });

  it('rejects wrong final-artifact subjects and duplicate annotations', () => {
    const record = rawRecord();
    const wrongSubject = writeAnnotation(annotation(record, { subjectSha256: hash('wrong-final') }), 'wrong.json');
    expect(() => joinExpertAnnotations([record], [wrongSubject]))
      .toThrowError(expect.objectContaining({ code: 'EXPERT_SUBJECT_HASH_MISMATCH' }));

    const first = writeAnnotation(annotation(record), 'one.json');
    const second = writeAnnotation(annotation(record), 'two.json');
    expect(() => joinExpertAnnotations([record], [first, second]))
      .toThrowError(expect.objectContaining({ code: 'DUPLICATE_EXPERT_ANNOTATION' }));
  });

  it('detects post-commit tampering and impossible resolution denominators', () => {
    const record = rawRecord();
    const tampered = annotation(record);
    tampered.criticalSeriousIssuesResolved = 7;
    const path = writeAnnotation(tampered);
    expect(() => joinExpertAnnotations([record], [path]))
      .toThrowError(expect.objectContaining({ code: 'INVALID_EXPERT_ANNOTATION' }));

    const impossible = annotation(record, { criticalSeriousIssuesResolved: 11 });
    const validation = validateExpertAnnotation(impossible);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContainEqual(expect.objectContaining({
      path: '$.criticalSeriousIssuesResolved',
    }));
  });

  it('keeps the checked-in template in exact field parity with the annotation schema', () => {
    const template = JSON.parse(readFileSync('mcp-testing/refinement-study/expert-annotation.template.json', 'utf8'));
    const schema = JSON.parse(readFileSync('mcp-testing/refinement-study/expert-annotation.schema.json', 'utf8'));
    expect(Object.keys(template).sort()).toEqual([...schema.required].sort());
    expect(template.lockedAt).toBeUndefined();
    expect(template).toHaveProperty('baselineAdjudicationSha256', null);
    expect(template).toHaveProperty('contentCommitmentSha256', null);
  });
});
