import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const privacyStart = host.indexOf('// BEGIN GENERATION_DIAGNOSTIC_PRIVACY');
const privacyEnd = host.indexOf('// END GENERATION_DIAGNOSTIC_PRIVACY');
if (privacyStart < 0 || privacyEnd < privacyStart) throw new Error('Production diagnostic privacy section was not found');
const privacySource = host.slice(privacyStart, privacyEnd);

const builderStart = host.indexOf('  const buildSanitizedFullPackDiagnostic = () => {');
const builderEnd = host.indexOf('  const handleCopyFullPackDiagnostics', builderStart);
if (builderStart < 0 || builderEnd < builderStart) throw new Error('Production Full Pack diagnostic builder was not found');
const builderSource = host.slice(builderStart, builderEnd);

const buildFullPackDiagnostic = (fullPackRun, observability = {}) => new Function(
  'fullPackRun',
  'observability',
  `
    const ALLO_FULL_PACK_CAPABILITY_FINGERPRINT = 'full-pack-plan-v2';
    const ALLO_GENERATION_METRICS = { snapshot: () => observability };
    ${privacySource}
    ${builderSource}
    return buildSanitizedFullPackDiagnostic();
  `,
)(fullPackRun, observability);
const extractCompactor = marker => {
  const start = host.indexOf(marker);
  const end = host.indexOf('  useEffect(() => {', start);
  if (start < 0 || end < start) throw new Error(`Production compactor was not found: ${marker}`);
  return host.slice(start, end);
};
const compactorSource = [
  extractCompactor('  const _compactBlueprintRunForStorage = (run, diagnosticsOnly = false) => {'),
  extractCompactor('  const _compactFullPackRunForStorage = (run, diagnosticsOnly = false) => {'),
].join('\n');
const { compactBlueprint, compactFullPack } = new Function(`
  const ALLO_FULL_PACK_CAPABILITY_FINGERPRINT = 'full-pack-plan-v2';
  ${privacySource}
  ${compactorSource}
  return {
    compactBlueprint: _compactBlueprintRunForStorage,
    compactFullPack: _compactFullPackRunForStorage,
  };
`)();

describe('generation diagnostic privacy', () => {
  it('removes source, directives, student values, group identities, resource ids, and raw provider errors', () => {
    const report = buildFullPackDiagnostic({
      runId: 'run-safe-id',
      retryOf: 'prior-run',
      approvedFrom: 'approved-run',
      status: 'partial',
      reason: 'Bearer SENTINEL_API_KEY rejected for SENTINEL_STUDENT_NAME',
      settingsSnapshot: {
        gradeLevel: 'SENTINEL_GRADE',
        leveledTextLanguage: 'SENTINEL_LANGUAGE',
        dokLevel: 'SENTINEL_DOK',
        textFormat: 'SENTINEL_TEXT_FORMAT',
        differentiationTypes: ['SENTINEL_DIFFERENTIATION_TYPE'],
        differentiationCustomGrades: ['SENTINEL_CUSTOM_GRADE'],
        studentInterests: ['SENTINEL_STUDENT_INTEREST'],
        rosterSignature: 'SENTINEL_ROSTER_SIGNATURE',
        targetStandards: ['SAFE-STANDARD'],
      },
      preflight: {
        sourceFingerprint: 'SENTINEL_SOURCE_FINGERPRINT',
        sourceTextChars: 1234,
        selected: [{ type: 'quiz', uiId: 'SENTINEL_UI_ID', directive: 'SENTINEL_DIRECTIVE' }],
        skipped: [{ type: 'image', reason: 'Bearer SENTINEL_API_KEY timed out' }],
        capacity: { provider: 'SENTINEL_PROVIDER', model: 'SENTINEL_MODEL', imageProvider: 'SENTINEL_IMAGE_PROVIDER', imageModel: 'SENTINEL_IMAGE_MODEL', aiCalls: 2, warningCodes: ['large-pack'], warnings: ['SENTINEL_WARNING'] },
      },
      resources: {
        SENTINEL_RESOURCE_KEY: {
          key: 'SENTINEL_RESOURCE_KEY', type: 'quiz', status: 'failed',
          directive: 'SENTINEL_DIRECTIVE', resourceId: 'SENTINEL_RESOURCE_ID',
          reason: 'Bearer SENTINEL_API_KEY rejected for SENTINEL_STUDENT_NAME',
          failureCategory: 'configuration', elapsedMs: 900,
        },
      },
      groups: {
        SENTINEL_GROUP_ID: {
          groupId: 'SENTINEL_GROUP_ID', groupName: 'SENTINEL_STUDENT_NAME', status: 'failed',
          settingsSnapshot: { studentInterests: ['SENTINEL_STUDENT_INTEREST'] },
          preflight: { selected: [{ type: 'quiz', directive: 'SENTINEL_DIRECTIVE' }] },
          resources: {},
        },
      },
    }, { runs: { failed: 1 }, resources: { quiz: { failed: 1 } } });

    const serialized = JSON.stringify(report);
    for (const secret of [
      'SENTINEL_API_KEY', 'SENTINEL_STUDENT_NAME', 'SENTINEL_STUDENT_INTEREST',
      'SENTINEL_ROSTER_SIGNATURE', 'SENTINEL_SOURCE_FINGERPRINT', 'SENTINEL_UI_ID',
      'SENTINEL_DIRECTIVE', 'SENTINEL_RESOURCE_KEY', 'SENTINEL_RESOURCE_ID', 'SENTINEL_GROUP_ID',
      'SENTINEL_GRADE', 'SENTINEL_LANGUAGE', 'SENTINEL_DOK', 'SENTINEL_TEXT_FORMAT',
      'SENTINEL_DIFFERENTIATION_TYPE', 'SENTINEL_CUSTOM_GRADE', 'SENTINEL_PROVIDER',
      'SENTINEL_MODEL', 'SENTINEL_IMAGE_PROVIDER', 'SENTINEL_IMAGE_MODEL', 'SENTINEL_WARNING',
    ]) expect(serialized).not.toContain(secret);

    expect(report).toMatchObject({
      reportVersion: 2,
      wasRetry: true,
      usedApprovedPlan: true,
      failureCode: 'authentication',
      observability: { runs: { failed: 1 } },
    });
    expect(report.preflight.sourceFingerprintPresent).toBe(true);
    expect(report.preflight.selected[0]).toEqual({ type: 'quiz', index: 0 });
    expect(report.preflight.capacity).toMatchObject({
      providerFamily: 'other',
      imageProviderFamily: 'other',
      modelConfigured: true,
      imageModelConfigured: true,
      warningCodes: ['large-pack'],
    });
    expect(report.settingsSnapshot).toMatchObject({
      gradeBand: 'custom',
      primaryLanguageConfigured: true,
      differentiationTypes: ['unknown'],
      differentiationCustomGradeCount: 1,
    });
    expect(report.resources['resource-1']).toMatchObject({ failureCode: 'authentication', type: 'quiz' });
    expect(Object.keys(report.groups)).toEqual(['group-1']);
  });

  it('maps detailed reasons to useful safe categories', () => {
    const getReason = new Function(`${privacySource}; return _alloDiagnosticReason;`)();
    expect(getReason('429 rate limit; token=secret')).toEqual({ code: 'rate-limit', summary: 'Provider rate limit reached.' });
    expect(getReason('request timed out with private prompt')).toEqual({ code: 'timeout', summary: 'The provider request timed out.' });
    expect(getReason('malformed output included student name')).toEqual({ code: 'malformed-output', summary: 'The generator returned malformed or unusable output.' });
    expect(getReason('content policy refusal')).toEqual({ code: 'safety', summary: 'The provider blocked the request for safety or policy reasons.' });
    expect(getReason('handleGenerate returned no resource')).toEqual({ code: 'empty-output', summary: 'The generation step returned no usable resource.' });
  });

  it('Blueprint export sanitizes raw failure text and omits row/resource identifiers', () => {
    const start = host.indexOf('  const buildSanitizedBlueprintDiagnostic = () => {');
    const end = host.indexOf('  const _copySanitizedDiagnostic', start);
    const source = host.slice(start, end);
    expect(source).toContain('_alloDiagnosticReason(row.failReason)');
    expect(source).toContain('_alloDiagnosticResourceType(row.tool)');
    expect(source).toContain('_alloDiagnosticRunId(blueprintExecutionResult.runId');
    expect(source).toContain('reportVersion: 2');
    expect(source).not.toContain('failReason: row.failReason');
    expect(source).not.toContain('resourceId: row.resourceId');
    expect(source).not.toContain('uiId: row.uiId');
  });

  it('normal persistence retains restore and retry fields while stripping technical secrets', () => {
    const blueprint = compactBlueprint({
      runId: 'blueprint-1786568272000-normal', status: 'partial',
      reason: 'Bearer SENTINEL_BP_API_KEY rejected for SENTINEL_BP_STUDENT',
      error: 'SENTINEL_BP_ERROR', stack: 'SENTINEL_BP_STACK', apiKey: 'SENTINEL_BP_TOP_KEY',
      settingsSnapshot: { gradeLevel: '8th Grade' },
      rows: {
        SENTINEL_BP_UI_ID: {
          uiId: 'SENTINEL_BP_UI_ID', tool: 'quiz', index: 0, status: 'failed',
          directive: 'SENTINEL_BP_DIRECTIVE', resourceId: 'SENTINEL_BP_RESOURCE_ID',
          failReason: 'authorization=SENTINEL_BP_API_KEY for SENTINEL_BP_STUDENT',
          error: 'SENTINEL_BP_ROW_ERROR', rawResponse: 'SENTINEL_BP_RAW', access_token: 'SENTINEL_BP_TOKEN',
        },
      },
    });
    expect(blueprint.rows.SENTINEL_BP_UI_ID).toMatchObject({
      uiId: 'SENTINEL_BP_UI_ID', directive: 'SENTINEL_BP_DIRECTIVE', resourceId: 'SENTINEL_BP_RESOURCE_ID',
      failReason: 'Authentication or permission failure.', failureCode: 'authentication',
    });
    expect(blueprint).toMatchObject({
      reason: 'Authentication or permission failure.', failureCode: 'authentication',
      settingsSnapshot: { gradeLevel: '8th Grade' },
    });
    expect(JSON.stringify(blueprint)).not.toMatch(/SENTINEL_BP_(API_KEY|STUDENT|ERROR|STACK|TOP_KEY|ROW_ERROR|RAW|TOKEN)/);

    const fullPack = compactFullPack({
      runId: 'full-pack-1786568272000-normal', status: 'partial',
      reason: 'Bearer SENTINEL_FP_API_KEY rejected for SENTINEL_FP_STUDENT',
      error: 'SENTINEL_FP_ERROR', stack: 'SENTINEL_FP_STACK', credential: 'SENTINEL_FP_CREDENTIAL',
      planPayload: { batchConfig: { globalSettings: { tone: 'clear' } } },
      preflight: {
        selected: [{ type: 'quiz', uiId: 'SENTINEL_FP_UI_ID', directive: 'SENTINEL_FP_DIRECTIVE' }],
        skipped: [{ type: 'image', reason: 'token SENTINEL_FP_API_KEY timed out' }],
      },
      resources: {
        SENTINEL_FP_RESOURCE_KEY: {
          key: 'SENTINEL_FP_RESOURCE_KEY', type: 'quiz', index: 0, status: 'failed',
          directive: 'SENTINEL_FP_DIRECTIVE', reason: 'Bearer SENTINEL_FP_API_KEY rejected',
          error: 'SENTINEL_FP_ROW_ERROR', rawResponse: 'SENTINEL_FP_RAW', password: 'SENTINEL_FP_PASSWORD',
        },
      },
      groups: {
        SENTINEL_FP_GROUP_ID: {
          groupId: 'SENTINEL_FP_GROUP_ID', groupName: 'SENTINEL_FP_STUDENT', status: 'partial',
          resources: {},
        },
      },
    });
    expect(fullPack.resources.SENTINEL_FP_RESOURCE_KEY).toMatchObject({
      key: 'SENTINEL_FP_RESOURCE_KEY', directive: 'SENTINEL_FP_DIRECTIVE',
      reason: 'Authentication or permission failure.', failureCode: 'authentication',
    });
    expect(fullPack.groups.SENTINEL_FP_GROUP_ID.groupId).toBe('SENTINEL_FP_GROUP_ID');
    expect(fullPack.preflight.selected[0].directive).toBe('SENTINEL_FP_DIRECTIVE');
    expect(fullPack.planPayload.batchConfig.globalSettings.tone).toBe('clear');
    expect(JSON.stringify(fullPack)).not.toMatch(/SENTINEL_FP_(API_KEY|ERROR|STACK|CREDENTIAL|ROW_ERROR|RAW|PASSWORD)/);
  });

  it('compact quota fallback is allowlisted, bounded, and pseudonymized', () => {
    const blueprint = compactBlueprint({
      runId: 'blueprint-1786568272000-fallback', status: 'partial', done: true,
      promptText: 'SENTINEL_BP_PROMPT', settingsSnapshot: { studentInterests: ['SENTINEL_BP_STUDENT'] },
      rows: {
        SENTINEL_BP_UI_ID: {
          uiId: 'SENTINEL_BP_UI_ID', tool: 'quiz', index: 4, status: 'failed',
          directive: 'SENTINEL_BP_DIRECTIVE', resourceId: 'SENTINEL_BP_RESOURCE_ID',
          failReason: 'Bearer SENTINEL_BP_API_KEY rejected for SENTINEL_BP_STUDENT',
          elapsedMs: 700,
        },
      },
    }, true);
    expect(Object.keys(blueprint.rows)).toEqual(['row-1']);
    expect(blueprint.rows['row-1']).toMatchObject({
      tool: 'quiz', index: 4, status: 'failed', elapsedMs: 700,
      failReason: 'Authentication or permission failure.', failureCode: 'authentication',
    });
    expect(JSON.stringify(blueprint)).not.toMatch(/SENTINEL_BP_/);

    const fullPack = compactFullPack({
      runId: 'full-pack-1786568272000-fallback', targetMode: 'all-groups', status: 'partial',
      settingsSnapshot: { studentInterests: ['SENTINEL_FP_STUDENT'] },
      prompt: 'SENTINEL_FP_PROMPT',
      preflight: {
        sourceFingerprint: 'SENTINEL_FP_FINGERPRINT', sourceTextChars: 222,
        selected: [{ type: 'quiz', uiId: 'SENTINEL_FP_UI_ID', directive: 'SENTINEL_FP_DIRECTIVE' }],
      },
      planPayload: { lessonDNA: { essentialQuestion: 'SENTINEL_FP_QUESTION' } },
      resources: {
        SENTINEL_FP_RESOURCE_KEY: {
          key: 'SENTINEL_FP_RESOURCE_KEY', type: 'quiz', index: 2, status: 'failed',
          directive: 'SENTINEL_FP_DIRECTIVE', resourceId: 'SENTINEL_FP_RESOURCE_ID',
          reason: 'Bearer SENTINEL_FP_API_KEY rejected for SENTINEL_FP_STUDENT', elapsedMs: 900,
        },
      },
      groups: {
        SENTINEL_FP_GROUP_ID: {
          groupId: 'SENTINEL_FP_GROUP_ID', groupName: 'SENTINEL_FP_STUDENT', status: 'partial',
          settingsSnapshot: { studentInterests: ['SENTINEL_FP_STUDENT'] },
          planPayload: { lessonDNA: { topic: 'SENTINEL_FP_TOPIC' } },
          resources: {
            SENTINEL_FP_GROUP_RESOURCE: {
              type: 'image', status: 'failed', directive: 'SENTINEL_FP_GROUP_DIRECTIVE',
              reason: 'request timed out for SENTINEL_FP_STUDENT',
            },
          },
        },
      },
    }, true);
    expect(Object.keys(fullPack.resources)).toEqual(['resource-1']);
    expect(Object.keys(fullPack.groups)).toEqual(['group-1']);
    expect(Object.keys(fullPack.groups['group-1'].resources)).toEqual(['resource-1']);
    expect(fullPack.resources['resource-1']).toMatchObject({
      type: 'quiz', status: 'failed', failureCode: 'authentication', elapsedMs: 900,
    });
    expect(fullPack.groups['group-1'].resources['resource-1']).toMatchObject({
      type: 'image', status: 'failed', failureCode: 'timeout',
    });
    expect(fullPack.preflight).toMatchObject({ sourceFingerprintPresent: true, selected: [{ type: 'quiz', index: 0 }] });
    expect(fullPack.planPayload).toBeNull();
    expect(fullPack.groups['group-1'].planPayload).toBeNull();
    expect(JSON.stringify(fullPack)).not.toMatch(/SENTINEL_FP_/);
  });  it('aggregate runtime metrics accept only bounded counters and timing fields', () => {
    const metricsStart = host.indexOf('const ALLO_GENERATION_METRICS = (() => {');
    const metricsEnd = host.indexOf('const ALLO_WORKSPACE_RECOVERY_NAMESPACE', metricsStart);
    const metricsSource = host.slice(metricsStart, metricsEnd);
    const storage = new Map();
    const localStorage = {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    };
    const metrics = new Function('localStorage', 'window', `
      const ALLO_GENERATION_METRICS_KEY = 'test-metrics';
      ${metricsSource}
      return ALLO_GENERATION_METRICS;
    `)(localStorage, {});
    metrics.record('resource-finish', {
      type: 'quiz', status: 'failed', durationMs: 420,
      directive: 'SENTINEL_DIRECTIVE', source: 'SENTINEL_SOURCE', apiKey: 'SENTINEL_API_KEY',
    });
    metrics.record('failure', { category: 'transient', reason: 'SENTINEL_ERROR' });
    const serialized = JSON.stringify(metrics.snapshot());
    expect(serialized).not.toMatch(/SENTINEL_/);
    expect(metrics.snapshot()).toMatchObject({
      failures: { transient: 1 },
      resources: { quiz: { failed: 1, durationMsTotal: 420, durationSamples: 1 } },
    });
    storage.set('test-metrics', JSON.stringify({
      v: 1,
      updatedAt: 'SENTINEL_TIMESTAMP',
      SENTINEL_TOP_LEVEL: 'SENTINEL_TOP_VALUE',
      runs: { started: '3', SENTINEL_RUN_FIELD: 'SENTINEL_RUN_VALUE' },
      resources: {
        SENTINEL_RESOURCE_TYPE: {
          landed: 7,
          durationMsTotal: 99,
          SENTINEL_RESOURCE_FIELD: 'SENTINEL_RESOURCE_VALUE',
        },
        quiz: { landed: '2', durationSamples: '4', prompt: 'SENTINEL_PROMPT' },
      },
    }));
    const poisonedSnapshot = metrics.snapshot();
    expect(JSON.stringify(poisonedSnapshot)).not.toMatch(/SENTINEL_/);
    expect(poisonedSnapshot).toMatchObject({
      updatedAt: null,
      runs: { started: 3 },
      resources: {
        unknown: { landed: 7, durationMsTotal: 99 },
        quiz: { landed: 2, durationSamples: 4 },
      },
    });
    expect(Object.keys(poisonedSnapshot)).toEqual(['v', 'updatedAt', 'runs', 'failures', 'retries', 'storageFallbacks', 'resources']);
  });
});
