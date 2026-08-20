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

  it('redacts credentials from Error Reporter text and stack', async () => {
    const prior = window.AlloModules.ErrorReporter;
    const record = vi.fn();
    window.AlloModules.ErrorReporter = { record };
    const secret = 'SENTINEL_FULL_PACK_TOKEN';
    const deps = makeDeps({
      handleGenerate: vi.fn(async () => {
        const error = new Error('Bearer ' + secret + ' was rejected');
        error.stack = 'Error: authorization=' + secret + '\n at full-pack';
        throw error;
      }),
    });
    try { await GenerationHelpers.handleGenerateFullPack(null, deps); }
    finally { window.AlloModules.ErrorReporter = prior; }
    const [, message, stack] = record.mock.calls[0];
    expect(message).toContain('resource=quiz');
    expect(message).toContain('[REDACTED]');
    expect(stack).toContain('[REDACTED]');
    expect(message + stack).not.toContain(secret);
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
  it('does not resurrect a run dismissed while a resource is still generating', async () => {
    let latestRun = null;
    let release;
    let started;
    const began = new Promise((resolve) => { started = resolve; });
    const result = new Promise((resolve) => { release = resolve; });
    const deps = makeDeps({
      setFullPackRun: (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async () => { started(); return result; }),
    });
    const pending = GenerationHelpers.handleGenerateFullPack(null, deps);
    await began;
    latestRun = null;
    release({ id: 'late-resource', type: 'quiz', data: {} });
    await pending;
    expect(latestRun).toBeNull();
  });

  it('does not write a late resource result into a replacement run', async () => {
    let latestRun = null;
    let release;
    let started;
    const began = new Promise((resolve) => { started = resolve; });
    const result = new Promise((resolve) => { release = resolve; });
    const deps = makeDeps({
      setFullPackRun: (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async () => { started(); return result; }),
    });
    const pending = GenerationHelpers.handleGenerateFullPack(null, deps);
    await began;
    const replacement = { runId: 'full-pack-replacement-run', status: 'ready', resources: {} };
    latestRun = replacement;
    release({ id: 'late-resource', type: 'quiz', data: {} });
    await pending;
    expect(latestRun).toBe(replacement);
    expect(latestRun.status).toBe('ready');
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

  it('executes the educator-edited resource order, types, and directives exactly as reviewed', async () => {
    let latestRun = null;
    const setFullPackRun = (next) => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const deps = makeDeps({
      setFullPackRun,
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'quiz', directive: 'Original direction.' }],
      })),
    });

    await GenerationHelpers.handlePlanFullPack(deps);
    let reviewed = latestRun;
    const quizKey = reviewed.preflight.selected[0].uiId;
    reviewed = GenerationHelpers.changeFullPackPlanResourceType(reviewed, quizKey, 'glossary');
    reviewed = GenerationHelpers.editFullPackPlanResourceDirective(reviewed, quizKey, 'Define only the five essential terms.');
    reviewed = GenerationHelpers.addFullPackPlanResource(reviewed, { type: 'outline', directive: 'Use a cause-and-effect structure.' });
    const outlineKey = reviewed.preflight.selected.find(item => item.type === 'outline').uiId;
    reviewed = GenerationHelpers.moveFullPackPlanResource(reviewed, outlineKey, 0);

    expect(reviewed.preflight.selected.map(item => [item.type, item.directive])).toEqual([
      ['outline', 'Use a cause-and-effect structure.'],
      ['glossary', 'Define only the five essential terms.'],
    ]);

    await GenerationHelpers.handleApproveFullPack(reviewed, deps);

    expect(deps.autoConfigureSettings).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls.map(call => call[0])).toEqual(['outline', 'glossary']);
    expect(deps.handleGenerate.mock.calls[0][4].customInstructions).toContain('Use a cause-and-effect structure.');
    expect(deps.handleGenerate.mock.calls[1][4].customInstructions).toContain('Define only the five essential terms.');
    expect(latestRun.approvedFrom).toBe(reviewed.runId);
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
describe('Full Pack provider-aware capacity estimates', () => {
  it('adapts duration and warnings to local versus hosted providers', () => {
    const hosted = GenerationHelpers.estimateFullPackCapacity(12, 1, { backend: 'gemini', model: 'gemini-fast' });
    const local = GenerationHelpers.estimateFullPackCapacity(12, 1, { backend: 'ollama', model: 'local-8b', isLocal: true });
    expect(local.estimatedMinutes).toBeGreaterThan(hosted.estimatedMinutes);
    expect(local).toMatchObject({ provider: 'ollama', model: 'local-8b', isLocal: true, requestConcurrency: 1 });
    expect(local.warningCodes).toContain('local-serial');
    expect(hosted.warningCodes).toContain('image-quota');
  });

  it('uses aggregate device timing history only after enough samples exist', () => {
    const defaults = GenerationHelpers.estimateFullPackCapacity(8, 0, { backend: 'gemini' });
    const observed = GenerationHelpers.estimateFullPackCapacity(8, 0, {
      backend: 'gemini',
      metricsSnapshot: { resources: { quiz: { durationMsTotal: 24000, durationSamples: 4 } } },
    });
    expect(defaults.estimateBasis).toBe('provider-defaults');
    expect(observed.estimateBasis).toBe('observed-device-history');
    expect(observed.estimatedMinutes).toBeLessThan(defaults.estimatedMinutes);
    expect(observed.observedSamples.text).toBe(4);
  });
});

describe('Full Pack stress and soak resilience', () => {
  it('finishes a bounded forty-resource pack without losing rows', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const resourcePlan = Array.from({ length: 40 }, (_, index) => ({ tool: 'quiz', directive: `item-${index}` }));
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan })),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally { vi.useRealTimers(); }
    expect(deps.handleGenerate).toHaveBeenCalledTimes(40);
    expect(Object.keys(latestRun.resources)).toHaveLength(40);
    expect(Object.values(latestRun.resources).every(row => row.status === 'landed')).toBe(true);
    expect(latestRun.status).toBe('completed');
  });

  it('serializes twenty-five roster groups and preserves every group profile', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const groups = Object.fromEntries(Array.from({ length: 25 }, (_, index) => [
      `group-${index}`,
      { name: `Group ${index}`, profile: { gradeLevel: `${index + 1}th Grade` } },
    ]));
    const grades = [];
    const deps = makeDeps({
      fullPackTargetGroup: 'all',
      rosterKey: { groups },
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async (_source, grade) => {
        grades.push(grade);
        return { resourcePlan: [{ tool: 'quiz', directive: '' }] };
      }),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally { vi.useRealTimers(); }
    expect(grades).toHaveLength(25);
    expect(grades[0]).toBe('1th Grade');
    expect(grades[24]).toBe('25th Grade');
    expect(Object.keys(latestRun.groups)).toHaveLength(25);
    expect(deps.handleGenerate).toHaveBeenCalledTimes(25);
    expect(latestRun.status).toBe('completed');
  });

  it('attempts a repeatedly transient resource exactly twice, then records exhaustion', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const record = vi.fn();
    const previousMetrics = window.AlloGenerationMetrics;
    window.AlloGenerationMetrics = { record };
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async () => { throw new Error('503 temporary provider overload'); }),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally {
      window.AlloGenerationMetrics = previousMetrics;
      vi.useRealTimers();
    }
    expect(deps.handleGenerate).toHaveBeenCalledTimes(2);
    expect(Object.values(latestRun.resources)[0]).toMatchObject({ status: 'failed', attempts: 2, failureCategory: 'transient' });
    expect(record).toHaveBeenCalledWith('retry-scheduled', { type: 'quiz' });
    expect(record).toHaveBeenCalledWith('retry-exhausted', { type: 'quiz' });
  });

  it('cancels during transient backoff without issuing the retry', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async () => { throw new Error('429 rate limit'); }),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      for (let index = 0; index < 20 && Object.values(latestRun?.resources || {})[0]?.status !== 'retrying'; index += 1) await Promise.resolve();
      expect(Object.values(latestRun.resources)[0].status).toBe('retrying');
      expect(GenerationHelpers.handleStopFullPack()).toBe(true);
      await run;
    } finally { vi.useRealTimers(); }
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(latestRun.status).toBe('stopped');
    expect(Object.values(latestRun.resources)[0].status).toBe('stopped');
  });

  it('stops a slow image request through its abort signal', async () => {
    let latestRun = null;
    let startedResolve;
    const started = new Promise(resolve => { startedResolve = resolve; });
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'image', directive: '' }] })),
      handleGenerate: vi.fn((_type, _lang, _keep, _source, _config, _switch, override) => new Promise((resolve, reject) => {
        startedResolve();
        override.generationSignal.addEventListener('abort', () => {
          const error = new Error('image request stopped');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      })),
    });
    const run = GenerationHelpers.handleGenerateFullPack(null, deps);
    await started;
    GenerationHelpers.handleStopFullPack();
    await run;
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(latestRun.status).toBe('stopped');
    expect(Object.values(latestRun.resources)[0]).toMatchObject({ type: 'image', status: 'stopped' });
  });

  it('records only aggregate runtime fields during recovery', async () => {
    vi.useFakeTimers();
    const calls = [];
    const previousMetrics = window.AlloGenerationMetrics;
    window.AlloGenerationMetrics = { record: (event, payload) => calls.push({ event, payload }) };
    let attempt = 0;
    const deps = makeDeps({
      studentInterests: ['SENTINEL_STUDENT'],
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: 'SENTINEL_DIRECTIVE' }] })),
      handleGenerate: vi.fn(async type => {
        attempt += 1;
        if (attempt === 1) throw new Error('429 SENTINEL_ERROR');
        return { id: 'SENTINEL_RESOURCE_ID', type, data: {} };
      }),
    });
    try {
      const run = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await run;
    } finally {
      window.AlloGenerationMetrics = previousMetrics;
      vi.useRealTimers();
    }
    const serialized = JSON.stringify(calls);
    expect(serialized).not.toMatch(/SENTINEL_/);
    expect(calls.some(call => call.event === 'retry-recovered')).toBe(true);
    expect(calls.some(call => call.event === 'resource-finish' && call.payload.status === 'landed')).toBe(true);
  });
});
