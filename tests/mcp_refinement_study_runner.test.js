import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const requireCjs = createRequire(import.meta.url);
const Runner = requireCjs(resolve(process.cwd(), 'mcp-testing/refinement-study/study_runner.cjs'));
const Cli = requireCjs(resolve(process.cwd(), 'mcp-testing/refinement-study/run.cjs'));

const scratch = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-refinement-study-'));
  scratch.push(dir);
  return dir;
}

function pdfFixture(dir, name = 'source.pdf') {
  const file = join(dir, name);
  writeFileSync(file, Buffer.from('%PDF-1.4\n% study fixture\n%%EOF\n', 'latin1'));
  return file;
}

function configFor(dir, extra = {}) {
  return {
    studyId: 'focused-runner-test',
    baseDir: dir,
    outputRoot: join(dir, 'out'),
    sources: [{ id: 'doc-a', path: pdfFixture(dir), partition: 'development_pilot' }],
    conditions: ['primary-one-shot', 'gated-loop'],
    repetitions: 1,
    randomizationSeed: 'fixed-test-seed',
    options: { taggedPdf: false, targetScore: 95, fixPasses: 1, maxRunMinutes: 5 },
    ...extra,
  };
}

function fakeResult(autoContinue) {
  return {
    beforeScore: 61,
    afterScore: autoContinue ? 92 : 84,
    verificationState: 'complete',
    verificationHtmlBound: true,
    scoreSource: 'test',
    estimatedMinimumScore: 80,
    integrityCoverage: 1,
    integrityWarning: null,
    fidelityNotes: [],
    remainingAxeViolations: 0,
    remainingEqualAccessFailures: 0,
    auditCoverage: { configuredAuditorCap: 5, requestedAuditors: 5, completedAuditors: 5, sliced: false },
    verdict: { level: 'verified' },
    accessibleHtml: '<!doctype html><html lang="en"><title>Study</title><body><h1>Study</h1></body></html>',
    autoContinue: autoContinue ? {
      roundsRun: 2,
      log: ['round 1 accepted: score 84 -> 88', 'round 2 REVERTED (det 90 vs 91)'],
    } : undefined,
    taggedPdfB64: null,
    taggedPdfDelivery: null,
    taggedPdfError: null,
    activeContentScanVerified: true,
    activeContentDetected: false,
    stats: { apiCalls: 7, visionCalls: 1, retries: 0 },
  };
}

afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('refinement study runner', () => {
  it('builds a hash-bound plan and fixes autoContinue by condition', () => {
    const dir = tempDir();
    const now = () => new Date('2026-08-13T12:00:00.000Z');
    const plan = Runner.buildStudyPlan(configFor(dir), { now, env: {} });
    const repeated = Runner.buildStudyPlan(configFor(dir), { now, env: {} });

    expect(plan.planHash).toBe(repeated.planHash);
    expect(plan.runs).toHaveLength(2);
    expect(plan.sources[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.sources[0].partition).toBe('development_pilot');
    expect(plan.conditions.find((c) => c.id === 'primary-one-shot').options.autoContinue).toBe(false);
    expect(plan.conditions.find((c) => c.id === 'gated-loop').options.autoContinue).toBe(true);
    expect(plan.safety.providerPreflight.state).toBe('plan-only-no-explicit-credential');
    expect(plan.safety.providerPreflight.networkProbePerformed).toBe(false);
  });

  it('imports the pinned manifest shape and fails closed on declared source drift', () => {
    const dir = tempDir();
    const source = pdfFixture(dir);
    const sha256 = Runner.sha256File(source);
    const manifestPath = join(dir, 'pilot.json');
    const manifest = {
      schema: 1,
      kind: 'alloflow-refinement-development-pilot-manifest',
      studyId: 'manifest-import-test',
      partition: 'development_pilot',
      conditions: ['primary-one-shot', 'gated-loop'],
      repetitions: 1,
      sharedOptions: { taggedPdf: false, targetScore: 91 },
      documents: [{ documentId: 'D01', corpusId: 'fixture', path: source, bytes: readFileSync(source).length, sha256 }],
    };
    const imported = Cli.normalizeInputConfig(manifest, manifestPath);
    const plan = Runner.buildStudyPlan(imported);
    expect(plan.runs).toHaveLength(2);
    expect(plan.protocolSha256).toBe(Runner.sha256File(resolve(process.cwd(), 'mcp-testing/refinement-study/protocol-v1.json')));
    expect(plan.conditions.every((condition) => condition.options.targetScore === 91)).toBe(true);

    imported.sources[0].sha256 = '0'.repeat(64);
    expect(() => Runner.buildStudyPlan(imported)).toThrow(/source SHA-256 mismatch/);
  });

  it('requires an explicit adapter for ungated and deterministic ablations', () => {
    const dir = tempDir();
    const plan = Runner.buildStudyPlan(configFor(dir, {
      conditions: ['deterministic-only', 'ungated-loop'],
    }), { env: {} });
    expect(plan.runs.every((run) => run.status === 'blocked')).toBe(true);
    expect(plan.runs.map((run) => run.blockedReason).join(' ')).toMatch(/adapter_required/);

    expect(() => Runner.buildStudyPlan(configFor(dir, {
      conditionOptions: { 'primary-one-shot': { autoContinue: true } },
    }))).toThrow(/autoContinue is fixed/);
  });

  it('classifies provider capability without probing implicit keys or the network', () => {
    expect(Runner.providerCapabilityPreflight({})).toMatchObject({
      canExecute: false,
      providerClass: 'live',
      evidenceClass: 'partition_dependent',
      effectivenessEligible: false,
      implicitKeyFilesProbed: false,
      networkProbePerformed: false,
    });
    expect(Runner.providerCapabilityPreflight({
      GEMINI_API_KEY: 'test-only-key',
      ALLOFLOW_MCP_GEMINI_BASE: 'http://127.0.0.1:9999/v1beta/models?key=secret',
    })).toMatchObject({
      canExecute: true,
      providerClass: 'scripted',
      evidenceClass: 'infrastructure_only',
      effectivenessEligible: false,
      endpoint: 'http://127.0.0.1:9999/v1beta/models',
    });
    expect(Runner.providerCapabilityPreflight({ GEMINI_API_KEY: 'test-only-key' })).toMatchObject({
      providerClass: 'live',
      evidenceClass: 'partition_dependent',
      effectivenessEligible: false,
      fallbackEnabled: true,
      actualModelTraceComplete: false,
      eligibilityReason: 'actual_model_trace_incomplete_or_fallback_enabled',
      sampling: 'provider-default',
      temperatureControlled: false,
      seedControlled: false,
    });
    expect(Runner.providerCapabilityPreflight({
      GEMINI_API_KEY: 'test-only-key',
      ALLOFLOW_MCP_GEMINI_MODEL: 'gemini-pinned',
      ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: 'gemini-pinned',
    })).toMatchObject({ effectivenessEligible: true, fallbackEnabled: false, actualModelTraceComplete: false });
  });

  it('is dry-run by default and CLI plan output contains no credential material', async () => {
    const dir = tempDir();
    const plan = Runner.buildStudyPlan(configFor(dir));
    await expect(Runner.executeStudyPlan(plan, {})).rejects.toThrow(/Execution authorization missing/);

    const printable = Cli.printablePlan(plan);
    expect(JSON.stringify(printable)).not.toContain('test-only-key');
    expect(printable.summary.ready).toBe(2);
    expect(printable.runs[0]).not.toHaveProperty('outputDir');
  });

  it('requires exact confirmation and an explicit max-runs ceiling', async () => {
    const dir = tempDir();
    const plan = Runner.buildStudyPlan(configFor(dir));
    const driver = { remediate: async () => fakeResult(false) };

    await expect(Runner.executeStudyPlan(plan, {
      execute: true, confirm: 'wrong', maxRuns: 2, driver,
    })).rejects.toThrow(/confirmation mismatch/);
    await expect(Runner.executeStudyPlan(plan, {
      execute: true, confirm: plan.studyId, maxRuns: 1, driver, env: { GEMINI_API_KEY: 'explicit-test-key' },
    })).rejects.toThrow(/exceeding explicit maxRuns/);
  });

  it('records immutable bound results, redacts logs, and emits a condition-blind reviewer packet', async () => {
    const dir = tempDir();
    const plan = Runner.buildStudyPlan(configFor(dir, { conditions: ['gated-loop'] }), {
      env: {
        GEMINI_API_KEY: 'fake-secret-value',
        ALLOFLOW_MCP_GEMINI_BASE: 'http://127.0.0.1:9876/v1beta/models',
      },
    });
    const run = plan.runs[0];
    const driver = {
      remediate: async (options) => {
        expect(options.autoContinue).toBe(true);
        expect(options.maxRunMinutes).toBe(5);
        options.onLog('Authorization: Bearer fake-secret-value');
        await options.onCheckpoint({ schema: 1, stage: 'round', marker: 'resume-me' });
        return fakeResult(true);
      },
    };
    const report = await Runner.executeStudyPlan(plan, {
      execute: true,
      confirm: plan.studyId,
      maxRuns: 1,
      onlyRun: [run.runId],
      driver,
      env: { GEMINI_API_KEY: 'explicit-test-key', ALLOFLOW_MCP_GEMINI_BASE: 'http://127.0.0.1:9876/v1beta/models' },
      engineMetadata: () => ({
        engine: 'fake engine',
        driver: { sha256: 'd'.repeat(64) },
        engineAggregateSha256: 'e'.repeat(64),
        provider: {
          family: 'Gemini-compatible generateContent', primaryModel: 'fake-primary', fallbackModel: 'fake-fallback',
          endpoint: 'http://127.0.0.1:9876/v1beta/models', providerClass: 'scripted', liveSettingsEligible: false,
          sampling: 'provider-default', temperatureControlled: false, seedControlled: false,
          fallbackEnabled: true, actualModelTraceComplete: false,
        },
        runtime: { node: process.version },
      }),
    });
    expect(report.summary.complete).toBe(1);

    const recordPath = join(run.outputDir, 'study-record.json');
    const resultPath = join(run.outputDir, 'result.json');
    const recordText = readFileSync(recordPath, 'utf8');
    const result = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(recordText).not.toContain('fake-secret-value');
    expect(recordText).toContain('[REDACTED]');
    expect(result).toMatchObject({
      schema: 'alloflow.mcp-refinement-result/v1',
      observationId: run.blindId,
      condition: { kind: 'gated_loop', replicate: 1 },
      execution: { providerClass: 'scripted', evidenceClass: 'infrastructure_only', effectivenessEligible: false },
      artifacts: { verificationBindingValid: true },
      outcome: { status: 'complete', expertConfirmed: null },
      rounds: { attempted: 2, accepted: 1, reverted: 1 },
      expertAdjudication: { status: 'unassigned', annotationJoinKey: run.blindId },
    });
    expect(result.artifacts.finalArtifactEvidenceBound).toBe(true);
    expect(result.outcome.automated.pdfUaStatus).toBeNull();
    expect(result.artifacts.finalSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.artifacts.verificationSha256).toMatch(/^[a-f0-9]{64}$/);

    const reviewDir = join(plan.outputRoot, plan.studyId, 'reviewer-packets', run.blindId);
    const reviewNames = readFileSync(join(reviewDir, 'review-manifest.json'), 'utf8');
    expect(reviewNames).not.toMatch(/gated|score|condition|model/i);
    expect(readFileSync(join(reviewDir, 'candidate.html'), 'utf8')).toContain('<h1>Study</h1>');
    expect(readFileSync(join(reviewDir, 'source.pdf'), 'latin1')).toMatch(/^%PDF-/);
    const annotationTemplateText = readFileSync(join(reviewDir, 'expert-annotation.template.json'), 'utf8');
    expect(annotationTemplateText).not.toMatch(/gated|score|condition|model|round/i);
    const annotationTemplate = JSON.parse(annotationTemplateText);
    const annotationSchema = JSON.parse(readFileSync(resolve(process.cwd(), 'mcp-testing/refinement-study/expert-annotation.schema.json'), 'utf8'));
    expect(Object.keys(annotationTemplate).sort()).toEqual(annotationSchema.required.slice().sort());
    expect(annotationTemplate).toMatchObject({
      annotationJoinKey: run.blindId,
      subjectSha256: result.artifacts.finalSha256,
      annotationProtocolSha256: plan.protocolSha256,
      blinded: true,
      reviewerCount: null,
      baselineAdjudicationSha256: null,
      baselineMaterialIssueCount: null,
      adjudicatedAt: null,
      contentCommitmentSha256: null,
    });

    const second = await Runner.executeStudyPlan(plan, {
      execute: true, confirm: plan.studyId, maxRuns: 1, onlyRun: [run.runId], driver,
      env: { GEMINI_API_KEY: 'explicit-test-key' },
    });
    expect(second.summary['skipped-complete']).toBe(1);
    expect(readFileSync(resultPath, 'utf8')).toBe(JSON.stringify(result, null, 2) + '\n');
  });

  it('marks a requested PDF candidate complete only when delivery and exact-byte validation bind', async () => {
    const dir = tempDir();
    const plan = Runner.buildStudyPlan(configFor(dir, { conditions: ['gated-loop'], options: { taggedPdf: true, targetScore: 95, fixPasses: 1, maxRunMinutes: 5 } }));
    const run = plan.runs[0];
    const pdfBytes = Buffer.from('%PDF-1.4\n% candidate\n%%EOF\n', 'latin1');
    const result = { ...fakeResult(true), taggedPdfB64: pdfBytes.toString('base64'), taggedPdfDelivery: { ok: true, code: 'ok' } };
    const driver = {
      remediate: async () => result,
      validatePdfUaCli: async ({ filePath }) => ({
        status: 'noncompliant',
        inputSha256: Runner.sha256File(filePath),
        inputBytes: readFileSync(filePath).length,
        failedRules: 2,
        failedChecks: 3,
      }),
    };
    const report = await Runner.executeStudyPlan(plan, {
      execute: true, confirm: plan.studyId, maxRuns: 1, onlyRun: [run.runId], driver,
      env: { GEMINI_API_KEY: 'explicit-test-key' },
      engineMetadata: () => ({
        engine: 'fake engine', driver: { sha256: 'd'.repeat(64) }, engineAggregateSha256: 'e'.repeat(64),
        provider: { family: 'Gemini-compatible generateContent', primaryModel: 'p', fallbackModel: 'f',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', providerClass: 'live',
          liveSettingsEligible: false, sampling: 'provider-default', temperatureControlled: false, seedControlled: false,
          fallbackEnabled: true, actualModelTraceComplete: false },
        runtime: { node: process.version },
      }),
    });
    expect(report.summary.complete).toBe(1);
    const record = JSON.parse(readFileSync(join(run.outputDir, 'result.json'), 'utf8'));
    expect(record.artifacts.finalArtifactEvidenceBound).toBe(true);
    expect(record.outcome.status).toBe('complete');
    expect(record.outcome.automated).toMatchObject({ pdfUaStatus: 'noncompliant', pdfUaFailedRules: 2, pdfUaFailedChecks: 3 });

    const dir2 = tempDir();
    const plan2 = Runner.buildStudyPlan(configFor(dir2, { conditions: ['gated-loop'], options: { taggedPdf: true, targetScore: 95, fixPasses: 1, maxRunMinutes: 5 } }));
    const run2 = plan2.runs[0];
    const unavailable = await Runner.executeStudyPlan(plan2, {
      execute: true, confirm: plan2.studyId, maxRuns: 1, onlyRun: [run2.runId],
      driver: { remediate: async () => result },
      env: { GEMINI_API_KEY: 'explicit-test-key' },
      engineMetadata: () => ({
        engine: 'fake engine', driver: { sha256: 'd'.repeat(64) }, engineAggregateSha256: 'e'.repeat(64),
        provider: { family: 'Gemini-compatible generateContent', primaryModel: 'p', fallbackModel: 'f',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', providerClass: 'live',
          liveSettingsEligible: false, sampling: 'provider-default', temperatureControlled: false, seedControlled: false,
          fallbackEnabled: true, actualModelTraceComplete: false },
        runtime: { node: process.version },
      }),
    });
    expect(unavailable.summary.incomplete).toBe(1);
    const incomplete = JSON.parse(readFileSync(join(run2.outputDir, 'result.json'), 'utf8'));
    expect(incomplete.artifacts.finalArtifactEvidenceBound).toBe(false);
    expect(incomplete.outcome.status).toBe('incomplete');
  });
});
