import { describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

loadAlloModule('generation_helpers_module.js');
const GenerationHelpers = window.AlloModules.GenerationHelpers;

const makeDeps = (overrides = {}) => {
  const deps = {
    isProcessing: false,
    fullPackTargetGroup: 'none',
    rosterKey: null,
    gradeLevel: '5th Grade',
    leveledTextLanguage: 'English',
    studentInterests: [],
    dokLevel: '',
    leveledTextCustomInstructions: '',
    selectedLanguages: [],
    targetStandards: [],
    useEmojis: false,
    textFormat: 'Standard Text',
    history: [],
    inputText: 'A reliable source text for the pack.',
    sourceTopic: 'Test topic',
    standardsInput: '',
    standardsContext: null,
    resourceCount: '5',
    isAutoConfigEnabled: true,
    quizCustomInstructions: '',
    adventureCustomInstructions: '',
    frameCustomInstructions: '',
    brainstormCustomInstructions: '',
    faqCustomInstructions: '',
    outlineCustomInstructions: '',
    visualCustomInstructions: '',
    timelineTopic: '',
    lessonCustomAdditions: '',
    conceptInput: '',
    glossaryCustomInstructions: '',
    personaCustomInstructions: '',
    conceptSortCustomInstructions: '',
    dbqCustomInstructions: '',
    noteTakingCustomInstructions: '',
    anchorChartCustomInstructions: '',
    setIsProcessing: vi.fn(),
    setGenerationStep: vi.fn(),
    setFullPackTargetGroup: vi.fn(),
    setGradeLevel: vi.fn(),
    setLeveledTextLanguage: vi.fn(),
    setStudentInterests: vi.fn(),
    setDokLevel: vi.fn(),
    setLeveledTextCustomInstructions: vi.fn(),
    setSelectedLanguages: vi.fn(),
    setTargetStandards: vi.fn(),
    setUseEmojis: vi.fn(),
    setTextFormat: vi.fn(),
    setPersistedLessonDNA: vi.fn(),
    setError: vi.fn(),
    addToast: vi.fn(),
    t: (key, values) => values ? `${key}:${values.count || ''}` : key,
    warnLog: vi.fn(),
    handleApplyRosterGroup: vi.fn(),
    autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    applyDetailedAutoConfig: vi.fn(),
    getGroupDifferentiationContext: vi.fn(() => ''),
    getAssetManifest: vi.fn(() => []),
    handleGenerate: vi.fn(async (type) => ({ id: `resource-${type}`, type, data: {} })),
  };
  return Object.assign(deps, overrides);
};

describe('Full Pack failure diagnostics and resilience', () => {
  it('records a failed resource and continues with the remaining pack', async () => {
    vi.useFakeTimers();
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    const handleGenerate = vi.fn(async (type) => {
      if (type === 'quiz') throw new Error('quota exhausted');
      return { id: `resource-${type}`, type, data: {} };
    });
    const deps = makeDeps({
      handleGenerate,
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'quiz', directive: '' }, { tool: 'outline', directive: '' }],
      })),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally {
      window.AlloModules.ErrorReporter = prior;
      vi.useRealTimers();
    }
    expect(handleGenerate).toHaveBeenCalledTimes(2);
    expect(handleGenerate.mock.calls[1][0]).toBe('outline');
    expect(handleGenerate.mock.calls[0][4].rethrowErrors).toBe(true);
    expect(record).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('resource=quiz'),
      expect.stringContaining('quota exhausted'),
      'full-pack-resource-generation',
      0,
      0,
    );
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('failed resource'), 'warning');
  });

  it('passes the selected Universal Settings into each resource request', async () => {
    vi.useFakeTimers();
    const deps = makeDeps({
      gradeLevel: '8th Grade',
      leveledTextLanguage: 'Spanish',
      studentInterests: ['soccer'],
      dokLevel: '3',
      selectedLanguages: ['Spanish'],
      targetStandards: ['CCSS.ELA-LITERACY.8.RI.2'],
      useEmojis: true,
      textFormat: 'Bullets',
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally { vi.useRealTimers(); }
    const override = deps.handleGenerate.mock.calls[0][6];
    expect(override).toMatchObject({
      gradeLevel: '8th Grade', leveledTextLanguage: 'Spanish', studentInterests: ['soccer'],
      dokLevel: '3', selectedLanguages: ['Spanish'], targetStandards: ['CCSS.ELA-LITERACY.8.RI.2'],
      useEmojis: true, textFormat: 'Bullets',
    });
  });

  it('stops after the current resource and keeps completed work', async () => {
    let releaseFirst;
    let firstStartedResolve;
    const firstStarted = new Promise(resolve => { firstStartedResolve = resolve; });
    const firstResult = new Promise(resolve => { releaseFirst = resolve; });
    const handleGenerate = vi.fn(async (type) => {
      if (type === 'quiz') {
        firstStartedResolve();
        return firstResult;
      }
      return { id: `resource-${type}`, type, data: {} };
    });
    const deps = makeDeps({
      handleGenerate,
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'quiz', directive: '' }, { tool: 'outline', directive: '' }],
      })),
    });
    const run = GenerationHelpers.handleGenerateFullPack(null, deps);
    await firstStarted;
    expect(GenerationHelpers.handleStopFullPack()).toBe(true);
    releaseFirst({ id: 'resource-quiz', type: 'quiz', data: {} });
    await run;
    expect(handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('stopped'), 'info');
  });
  it('rejects malformed output and continues with later resources', async () => {
    vi.useFakeTimers();
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    const deps = makeDeps({
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'quiz', directive: '' }, { tool: 'outline', directive: '' }],
      })),
      handleGenerate: vi.fn(async (type) => ({ id: 'r-' + type, type, data: type === 'quiz' ? null : {} })),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally {
      window.AlloModules.ErrorReporter = prior;
      vi.useRealTimers();
    }
    expect(deps.handleGenerate).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith(
      'error', expect.stringContaining('resource=quiz'), expect.any(String),
      'full-pack-resource-generation', 0, 0,
    );
  });

  it('logs unsupported plan entries without invoking the dispatcher for them', async () => {
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    const deps = makeDeps({
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'made-up-tool', directive: '' }, { tool: 'quiz', directive: '' }],
      })),
    });
    try { await GenerationHelpers.handleGenerateFullPack(null, deps); }
    finally { window.AlloModules.ErrorReporter = prior; }
    expect(deps.handleGenerate.mock.calls.map(call => call[0])).toEqual(['quiz']);
    expect(record).toHaveBeenCalledWith(
      'error', expect.stringContaining('resource=made-up-tool'), expect.any(String),
      'full-pack-resource-generation', 0, 0,
    );
  });
  it('runs all roster groups with each group profile instead of recursing on stale state', async () => {
    vi.useFakeTimers();
    const groupCalls = [];
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      fullPackTargetGroup: 'all',
      rosterKey: {
        groups: {
          reading: { name: 'Reading', profile: { gradeLevel: '2nd Grade' } },
          extension: { name: 'Extension', profile: { gradeLevel: '8th Grade' } },
        },
      },
      autoConfigureSettings: vi.fn(async (_text, grade) => {
        groupCalls.push(grade);
        return { resourcePlan: [{ tool: 'quiz', directive: '' }] };
      }),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally {
      vi.useRealTimers();
    }
    expect(groupCalls).toEqual(['2nd Grade', '8th Grade']);
    expect(deps.handleGenerate).toHaveBeenCalledTimes(2);
    expect(deps.handleApplyRosterGroup).toHaveBeenCalledWith('reading');
    expect(deps.handleApplyRosterGroup).toHaveBeenCalledWith('extension');
    expect(latestRun.status).toBe('completed');
    expect(Object.keys(latestRun.groups)).toEqual(['reading', 'extension']);
    expect(latestRun.groups.reading).toMatchObject({ groupName: 'Reading', status: 'completed' });
    expect(latestRun.groups.extension).toMatchObject({ groupName: 'Extension', status: 'completed' });
  });

  it('logs a preflight failure when the source is missing', async () => {
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    const deps = makeDeps({ inputText: null, isAutoConfigEnabled: false });
    try {
      await GenerationHelpers.handleGenerateFullPack(null, deps);
    } finally {
      window.AlloModules.ErrorReporter = prior;
    }
    expect(record).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('resource=preflight'),
      expect.stringContaining('No source text'),
      'full-pack-resource-generation',
      0,
      0,
    );
    expect(deps.handleGenerate).not.toHaveBeenCalled();
  });

  it('classifies an active abort as stopped without recording an error', async () => {
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    let latestRun = null;
    let startedResolve;
    const started = new Promise(resolve => { startedResolve = resolve; });
    const deps = makeDeps({
      setFullPackRun: (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn((_type, _lang, _keep, _text, _config, _switch, override) => new Promise((resolve, reject) => {
        startedResolve();
        override.generationSignal.addEventListener('abort', () => {
          const error = new Error('cancelled by teacher');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      })),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await started;
      GenerationHelpers.handleStopFullPack();
      await run;
    } finally { window.AlloModules.ErrorReporter = prior; }
    expect(record).not.toHaveBeenCalled();
    expect(latestRun.status).toBe('stopped');
    expect(Object.values(latestRun.resources)[0]).toMatchObject({ status: 'stopped' });
  });

  it('rejects a second top-level Full Pack while the first is in flight', async () => {
    let release;
    let startedResolve;
    const started = new Promise(resolve => { startedResolve = resolve; });
    const first = makeDeps({
      handleGenerate: vi.fn(async () => {
        startedResolve();
        return new Promise(resolve => { release = resolve; });
      }),
    });
    const second = makeDeps();
    const firstRun = GenerationHelpers.handleGenerateFullPack(null, first);
    await started;
    await expect(GenerationHelpers.handleGenerateFullPack(null, second)).resolves.toBe(false);
    expect(second.handleGenerate).not.toHaveBeenCalled();
    release({ id: 'resource-quiz', type: 'quiz', data: {} });
    await firstRun;
  });

  it('retries only failed resources with the original settings snapshot', async () => {
    let latestRun = null;
    const setFullPackRun = (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const deps = makeDeps({
      gradeLevel: '7th Grade',
      setFullPackRun,
      handleGenerate: vi.fn(async () => { throw new Error('temporary outage'); }),
    });
    await GenerationHelpers.handleGenerateFullPack(null, deps);
    const failedRun = latestRun;
    deps.gradeLevel = '2nd Grade';
    deps.handleGenerate = vi.fn(async (type) => ({ id: 'retry-' + type, type, data: {} }));
    await GenerationHelpers.handleRetryFailedFullPack(failedRun, deps);
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls[0][0]).toBe('quiz');
    expect(deps.handleGenerate.mock.calls[0][6].gradeLevel).toBe('7th Grade');
    expect(latestRun.retryOf).toBe(failedRun.runId);
    expect(latestRun.status).toBe('completed');
  });
  it('plans first, compacts unused configuration, and reuses the approved plan without auto-configuring twice', async () => {
    let latestRun = null;
    const setFullPackRun = (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const deps = makeDeps({
      setFullPackRun,
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'quiz', directive: 'Check understanding.' }],
        globalSettings: { tone: 'clear' },
        giantUnusedPayload: 'x'.repeat(250000),
      })),
    });

    await GenerationHelpers.handlePlanFullPack(deps);
    const approvedPlan = latestRun;

    expect(approvedPlan.status).toBe('ready');
    expect(approvedPlan.preflight.selected.map(item => item.type)).toEqual(['quiz']);
    expect(approvedPlan.planPayload).toBeTruthy();
    expect(approvedPlan.planPayload.batchConfig.globalSettings).toEqual({ tone: 'clear' });
    expect(approvedPlan.planPayload.batchConfig.resourcePlan).toBeUndefined();
    expect(approvedPlan.planPayload.batchConfig.giantUnusedPayload).toBeUndefined();
    expect(JSON.stringify(approvedPlan.planPayload).length).toBeLessThan(10000);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(deps.autoConfigureSettings).toHaveBeenCalledTimes(1);

    await GenerationHelpers.handleApproveFullPack(approvedPlan, deps);

    expect(deps.autoConfigureSettings).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(latestRun.approvedFrom).toBe(approvedPlan.runId);
    expect(latestRun.status).toBe('completed');
  });

  it('rejects an approved plan when the source changed after review', async () => {
    let latestRun = null;
    const setFullPackRun = (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const deps = makeDeps({ setFullPackRun });

    await GenerationHelpers.handlePlanFullPack(deps);
    const approvedPlan = latestRun;
    deps.inputText = 'A different source was pasted after planning.';

    await expect(GenerationHelpers.handleApproveFullPack(approvedPlan, deps)).resolves.toBe(false);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(latestRun.status).toBe('failed');
    expect(latestRun.reason).toContain('source changed');
  });

  it('retries only affected groups and preserves each group settings snapshot', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const setFullPackRun = (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const priorRun = {
      runId: 'group-parent',
      targetMode: 'all-groups',
      groups: {
        complete: {
          groupId: 'complete', groupName: 'Complete', status: 'completed', settingsSnapshot: { gradeLevel: '3rd Grade' },
          resources: { 'quiz-0': { key: 'quiz-0', type: 'quiz', index: 0, status: 'landed' } },
        },
        support: {
          groupId: 'support', groupName: 'Support', status: 'partial', settingsSnapshot: { gradeLevel: '8th Grade' },
          resources: { 'quiz-0': { key: 'quiz-0', type: 'quiz', index: 0, directive: 'Retry this.', status: 'failed' } },
        },
      },
    };
    const deps = makeDeps({ setFullPackRun });
    try {
      const retry = GenerationHelpers.handleRetryFailedFullPack(priorRun, deps);
      await vi.runAllTimersAsync();
      await retry;
    } finally { vi.useRealTimers(); }

    expect(deps.handleApplyRosterGroup).toHaveBeenCalledTimes(1);
    expect(deps.handleApplyRosterGroup).toHaveBeenCalledWith('support');
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls[0][6].gradeLevel).toBe('8th Grade');
    expect(Object.keys(latestRun.groups)).toEqual(['support']);
    expect(latestRun.status).toBe('completed');
  });
});
describe('Full Pack preflight summary', () => {
  it('records selected, skipped, differentiation, and estimated generation counts', async () => {
    let latestRun = null;
    const setFullPackRun = vi.fn((next) => {
      latestRun = typeof next === 'function' ? next(latestRun) : next;
    });
    const deps = makeDeps({
      setFullPackRun,
      differentiationRange: 'Both',
      differentiationTypes: ['quiz'],
      getDifferentiationGrades: vi.fn(() => ['3rd Grade', '5th Grade', '7th Grade']),
      autoConfigureSettings: vi.fn(async () => ({
        hasTimeline: false,
        resourcePlan: [
          { tool: 'made-up-tool', directive: '' },
          { tool: 'quiz', directive: '' },
          { tool: 'timeline', directive: '' },
        ],
      })),
    });

    await GenerationHelpers.handleGenerateFullPack(null, deps);

    expect(latestRun.preflight).toMatchObject({
      selected: [{ type: 'quiz', index: 0 }],
      estimatedResourceGenerations: 3,
      differentiation: { range: 'Both', levelCount: 3, types: ['quiz'] },
    });
    expect(latestRun.preflight.skipped.map(item => item.type)).toEqual(['made-up-tool', 'timeline']);
  });
});
describe('Full Pack compatibility and retry policy', () => {
  it('blocks an approved plan with an incompatible capability fingerprint', async () => {
    let latestRun = null;
    const deps = makeDeps({ setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; } });
    await GenerationHelpers.handlePlanFullPack(deps);
    const stalePlan = { ...latestRun, preflight: { ...latestRun.preflight, capabilityFingerprint: 'old-generator' } };
    await expect(GenerationHelpers.handleApproveFullPack(stalePlan, deps)).resolves.toBe(false);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('older generator'), 'warning');
  });

  it('retries one transient rate-limit failure with backoff and records the attempt', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    let attempts = 0;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async type => {
        attempts += 1;
        if (attempts === 1) throw new Error('429 rate limit exceeded');
        return { id: 'recovered-' + type, type, data: {} };
      }),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally {
      vi.useRealTimers();
    }
    expect(deps.handleGenerate).toHaveBeenCalledTimes(2);
    expect(Object.values(latestRun.resources)[0]).toMatchObject({ status: 'landed', attempts: 2 });
    expect(latestRun.status).toBe('completed');
  });

  it('does not retry permanent authentication or configuration failures', async () => {
    const deps = makeDeps();
    const run = {
      runId: 'permanent-failure',
      resources: {
        quiz: { key: 'quiz', type: 'quiz', index: 0, status: 'failed', reason: 'API key authentication failed', failureCategory: 'configuration', retryable: false },
      },
    };
    await expect(GenerationHelpers.handleRetryFailedFullPack(run, deps)).resolves.toBe(false);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
  });

  it('records capacity estimates and classifies permanent failures', async () => {
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async () => { throw new Error('Unsupported resource configuration'); }),
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    });
    await GenerationHelpers.handleGenerateFullPack(null, deps);
    expect(latestRun.preflight).toMatchObject({
      planSchemaVersion: 2,
      capabilityFingerprint: 'full-pack-plan-v2',
      capacity: { aiCalls: 1, imageCalls: 0, estimatedMinutes: 1 },
    });
    expect(Object.values(latestRun.resources)[0]).toMatchObject({
      failureCategory: 'configuration',
      retryable: false,
    });
  });
});