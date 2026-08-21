import { describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

loadAlloModule('generation_matrix_module.js');
loadAlloModule('generation_helpers_source.jsx');
const GenerationMatrix = window.AlloModules.GenerationMatrix;
const GenerationHelpers = window.AlloModules.GenerationHelpers;

const makeDeps = (overrides = {}) => {
  const deps = {
    isProcessing: false,
    fullPackTargetGroup: 'none',
    rosterKey: null,
    gradeLevel: '5th Grade',
    leveledTextLanguage: 'English',
    translationMode: 'auto',
    currentUiLanguage: 'English',
    studentInterests: [],
    dokLevel: '',
    leveledTextCustomInstructions: '',
    selectedLanguages: [],
    differentiationRange: 'None',
    differentiationTypes: ['simplified'],
    differentiationCustomGrades: [],
    targetStandards: [],
    useEmojis: false,
    textFormat: 'Standard Text',
    imageGenerationStyle: 'Auto',
    imageAspectRatio: '16:9',
    aiProviderProfile: {
      backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false,
    },
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
    getDifferentiationGrades: vi.fn(grade => [grade]),
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
    expect(Object.keys(latestRun.groups)).toEqual(['complete', 'support']);
    expect(latestRun.groups.complete.resources['quiz-0']).toMatchObject({ status: 'landed' });
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

describe('Full Pack Generation Matrix integration', () => {
  it('freezes the exact grade-language cross-product and executes the reviewed cells one by one', async () => {
    let latestRun = null;
    let nextId = 0;
    const setFullPackRun = next => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const deps = makeDeps({
      setFullPackRun,
      gradeLevel: '5th Grade',
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish', 'French'],
      studentInterests: ['Robotics'],
      dokLevel: '3',
      useEmojis: true,
      textFormat: 'Bullet Points',
      imageGenerationStyle: 'Watercolor',
      imageAspectRatio: '4:3',
      differentiationRange: 'Custom',
      differentiationTypes: ['quiz'],
      differentiationCustomGrades: ['6th Grade'],
      getDifferentiationGrades: vi.fn(() => ['5th Grade', '6th Grade']),
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: 'Check each level.' }] })),
      handleGenerate: vi.fn(async (type, language, _keep, _source, config) => ({
        id: `matrix-${++nextId}-${config.grade}-${language}`, type, data: {}, config: {},
      })),
    });

    await GenerationHelpers.handlePlanFullPack(deps);
    let reviewed = latestRun;
    const row = reviewed.preflight.selected[0];
    const cells = row.generationVariants.map(cell => `${cell.grade}|${cell.language}`).sort();
    expect(cells).toEqual([
      '5th Grade|English', '5th Grade|French', '5th Grade|Spanish',
      '6th Grade|English', '6th Grade|French', '6th Grade|Spanish',
    ]);
    expect(reviewed.preflight.generationMatrix.summary).toMatchObject({ variantCount: 6, expectedCalls: 6 });
    expect(reviewed.preflight.estimatedResourceGenerations).toBe(6);
    expect(row).toMatchObject({ explicitVariantKey: null, variantKeyDerived: true });
    const originalIdentities = row.generationVariants.map(cell => cell.generationIdentity);
    reviewed = GenerationHelpers.editFullPackPlanResourceDirective(
      reviewed, row.uiId, 'Use the reviewed evidence-check format.'
    );
    const editedRow = reviewed.preflight.selected[0];
    expect(editedRow).toMatchObject({ explicitVariantKey: null, variantKeyDerived: true });
    expect(editedRow.generationVariants.map(cell => `${cell.grade}|${cell.language}`).sort()).toEqual(cells);
    expect(editedRow.generationVariants.map(cell => cell.generationIdentity)).not.toEqual(originalIdentities);
    expect(reviewed.settingsSnapshot).toMatchObject({
      translationMode: 'auto', currentUiLanguage: 'English', selectedLanguages: ['Spanish', 'French'],
      studentInterests: ['Robotics'], dokLevel: '3', useEmojis: true,
      textFormat: 'Bullet Points', imageGenerationStyle: 'Watercolor', imageAspectRatio: '4:3',
    });
    expect(reviewed.preflight.generationMatrix.settings).toMatchObject({
      translationMode: 'auto', currentUiLanguage: 'English', selectedLanguages: ['Spanish', 'French'],
      studentInterests: ['Robotics'], dokLevel: '3', useEmojis: true,
      textFormat: 'Bullet Points', imageGenerationStyle: 'Watercolor', imageAspectRatio: '4:3',
    });

    deps.gradeLevel = '1st Grade';
    deps.leveledTextLanguage = 'English';
    deps.selectedLanguages = [];
    deps.studentInterests = ['Changed after review'];
    deps.dokLevel = '1';
    deps.useEmojis = false;
    deps.textFormat = 'Standard Text';
    deps.imageGenerationStyle = 'Photorealistic';
    deps.imageAspectRatio = '1:1';
    await GenerationHelpers.handleApproveFullPack(reviewed, deps);

    expect(deps.handleGenerate).toHaveBeenCalledTimes(6);
    const executed = deps.handleGenerate.mock.calls.map(call => `${call[4].grade}|${call[1]}`).sort();
    expect(executed).toEqual(cells);
    deps.handleGenerate.mock.calls.forEach(call => {
      expect(call[4].skipDifferentiation).toBe(true);
      expect(call[4].generationIdentity).toEqual(expect.objectContaining({ key: expect.stringMatching(/^gm1-/) }));
      expect(call[4]).toMatchObject({
        explicitVariantKey: null, variantKeyDerived: true,
        studentInterests: ['Robotics'], dokLevel: '3', useEmojis: true,
        textFormat: 'Bullet Points', imageGenerationStyle: 'Watercolor', imageAspectRatio: '4:3',
      });
      expect(call[4].generationIdentity).toMatchObject({ explicitVariantKey: null, variantKeyDerived: true });
      expect(call[6]).toMatchObject({
        differentiationRange: 'None', selectedLanguages: ['Spanish', 'French'],
        studentInterests: ['Robotics'], dokLevel: '3', useEmojis: true,
        textFormat: 'Bullet Points', imageGenerationStyle: 'Watercolor', imageAspectRatio: '4:3',
      });
    });
    const runtimeRow = Object.values(latestRun.resources)[0];
    expect(runtimeRow).toMatchObject({ status: 'landed' });
    expect(runtimeRow.resourceIds).toHaveLength(6);
    expect(runtimeRow.generationVariants).toHaveLength(6);
  });

  it('keeps an Auto analysis row visible but reuses the exact source analysis without an AI call', async () => {
    let latestRun = null;
    const setFullPackRun = next => { latestRun = typeof next === 'function' ? next(latestRun) : next; };
    const deps = makeDeps({
      setFullPackRun,
      resourceCount: 'Auto',
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    });

    await GenerationHelpers.handlePlanFullPack(deps);
    const firstAnalysis = latestRun.preflight.selected.find(row => row.type === 'analysis');
    expect(firstAnalysis).toBeTruthy();
    const existingAnalysis = {
      id: 'canonical-analysis',
      type: 'analysis',
      generationIdentity: firstAnalysis.generationVariants[0].generationIdentity,
      data: { originalText: deps.inputText, concepts: ['One'] },
      config: { generationIdentity: { key: firstAnalysis.generationVariants[0].generationIdentity } },
    };
    deps.history = [existingAnalysis];

    await GenerationHelpers.handlePlanFullPack(deps);
    let reviewed = latestRun;
    const reusable = reviewed.preflight.selected.find(row => row.type === 'analysis');
    expect(reusable.generationAction).toBe('reuse');
    expect(reusable.existingArtifactId).toBe('canonical-analysis');
    for (const row of reviewed.preflight.selected.filter(item => item.type !== 'analysis')) {
      reviewed = GenerationHelpers.removeFullPackPlanResource(reviewed, row.uiId);
    }

    await GenerationHelpers.handleApproveFullPack(reviewed, deps);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(Object.values(latestRun.resources)[0]).toMatchObject({
      status: 'landed', generationAction: 'reuse', resourceId: 'canonical-analysis',
    });
  });

  it('does not reuse a modern exact artifact after generation context changes', async () => {
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: 'Same quiz.' }] })),
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    const identity = latestRun.preflight.selected[0].generationVariants[0].generationIdentity;
    deps.history = [{
      id: 'prior-quiz', type: 'quiz', generationIdentity: identity, data: {},
      config: { generationIdentity: { key: identity } },
    }];
    await GenerationHelpers.handlePlanFullPack(deps);
    expect(latestRun.preflight.selected[0].generationAction).toBe('reuse');

    deps.useEmojis = true;
    await GenerationHelpers.handlePlanFullPack(deps);
    expect(latestRun.preflight.selected[0].generationAction).not.toBe('reuse');
    expect(latestRun.preflight.estimatedResourceGenerations).toBe(1);
  });

  it('retains selected languages for a single embedded-translation glossary cell', async () => {
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      selectedLanguages: ['Spanish'],
      translationMode: 'selected',
      currentUiLanguage: 'English',
      resolveTranslationPolicy: vi.fn(() => ({ enabled: true, target: 'Spanish', mode: 'selected' })),
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'glossary', directive: '' }] })),
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    const reviewed = latestRun;
    expect(reviewed.preflight.selected[0].generationVariants).toHaveLength(1);
    expect(reviewed.preflight.generationMatrix.settings).toMatchObject({
      selectedLanguages: ['Spanish'], translationMode: 'selected', currentUiLanguage: 'English', translationTarget: 'Spanish',
    });

    await GenerationHelpers.handleApproveFullPack(reviewed, deps);
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls[0][6]).toMatchObject({
      selectedLanguages: ['Spanish'], translationMode: 'selected', currentUiLanguage: 'English',
    });
    expect(deps.handleGenerate.mock.calls[0][4]).toMatchObject({
      skipDifferentiation: true, selectedLanguages: ['Spanish'], translationTarget: 'Spanish',
    });
  });

  it('plans and generates one canonical analysis across all roster groups', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const source = 'One source shared by every roster group.';
    const deps = makeDeps({
      inputText: source,
      fullPackTargetGroup: 'all',
      resourceCount: 'Auto',
      rosterKey: { groups: {
        support: { name: 'Support', profile: { gradeLevel: '4th Grade' } },
        extension: { name: 'Extension', profile: { gradeLevel: '7th Grade' } },
      } },
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'analysis', directive: '' }] })),
      handleGenerate: vi.fn(async type => ({
        id: `${type}-${Math.random()}`, type,
        data: type === 'analysis' ? { originalText: source, concepts: [] } : {},
      })),
    });
    try {
      const planning = GenerationHelpers.handlePlanFullPack(deps);
      await vi.runAllTimersAsync();
      await planning;
      const reviewed = latestRun;
      const analysisActions = Object.values(reviewed.groups).map(group =>
        group.preflight.selected.find(row => row.type === 'analysis').generationAction);
      expect(analysisActions).toEqual(['generate', 'reuse']);

      const execution = GenerationHelpers.handleApproveFullPack(reviewed, deps);
      await vi.runAllTimersAsync();
      await execution;
    } finally {
      vi.useRealTimers();
    }
    expect(deps.handleGenerate.mock.calls.filter(call => call[0] === 'analysis')).toHaveLength(1);
    const analysisRows = Object.values(latestRun.groups).map(group =>
      Object.values(group.resources).find(row => row.type === 'analysis'));
    expect(analysisRows.map(row => row.generationAction)).toEqual(['generate', 'reuse']);
  });

  it('retries only the failed language cell from a partially landed row', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    let spanishFailures = 0;
    const deps = makeDeps({
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
      handleGenerate: vi.fn(async (type, language) => {
        if (language === 'Spanish' && spanishFailures < 2) {
          spanishFailures += 1;
          throw new Error('503 temporary provider overload');
        }
        return { id: `${type}-${language}`, type, data: {} };
      }),
    });
    try {
      const first = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await first;
      const failedRun = latestRun;
      expect(failedRun.status).toBe('partial');
      expect(Object.values(failedRun.resources)[0].generationVariants.map(cell => cell.status)).toEqual(['landed', 'failed']);

      deps.handleGenerate = vi.fn(async (type, language) => ({ id: `retry-${type}-${language}`, type, data: {} }));
      const retry = GenerationHelpers.handleRetryFailedFullPack(failedRun, deps);
      await vi.runAllTimersAsync();
      await retry;
    } finally {
      vi.useRealTimers();
    }
    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls[0][1]).toBe('Spanish');
    expect(Object.values(latestRun.resources)[0].generationVariants).toHaveLength(2);
    expect(Object.values(latestRun.resources)[0].generationVariants.map(cell => cell.status)).toEqual(['landed', 'landed']);
    expect(latestRun.status).toBe('completed');
  });

  it('retains unprocessed matrix cells when stopped mid-row and resumes only unfinished cells', async () => {
    let latestRun = null;
    let secondStartedResolve;
    const secondStarted = new Promise(resolve => { secondStartedResolve = resolve; });
    const deps = makeDeps({
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      differentiationRange: 'Custom',
      differentiationTypes: ['quiz'],
      differentiationCustomGrades: ['6th Grade'],
      getDifferentiationGrades: vi.fn(() => ['5th Grade', '6th Grade']),
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    const reviewed = latestRun;
    let callCount = 0;
    deps.handleGenerate = vi.fn((type, language, _keep, _source, _config, _switch, override) => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve({ id: `${type}-${language}-first`, type, data: {} });
      secondStartedResolve();
      return new Promise((resolve, reject) => {
        override.generationSignal.addEventListener('abort', () => {
          const error = new Error('stopped during matrix row');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
    });

    const execution = GenerationHelpers.handleApproveFullPack(reviewed, deps);
    await secondStarted;
    GenerationHelpers.handleStopFullPack();
    await execution;

    const stoppedRun = latestRun;
    const stoppedRow = Object.values(stoppedRun.resources)[0];
    expect(stoppedRun.status).toBe('stopped');
    expect(stoppedRow.generationVariants.map(cell => cell.status)).toEqual([
      'landed', 'stopped', 'queued', 'queued',
    ]);

    deps.handleGenerate = vi.fn(async (type, language, _keep, _source, config) => ({
      id: `resumed-${type}-${config.grade}-${language}`, type, data: {},
    }));
    await GenerationHelpers.handleRetryFailedFullPack(stoppedRun, deps);

    expect(deps.handleGenerate).toHaveBeenCalledTimes(3);
    const resumedRow = Object.values(latestRun.resources)[0];
    expect(resumedRow.generationVariants).toHaveLength(4);
    expect(resumedRow.generationVariants.map(cell => cell.status)).toEqual([
      'landed', 'landed', 'landed', 'landed',
    ]);
    expect(resumedRow.resourceIds).toHaveLength(4);
    expect(latestRun.status).toBe('completed');
  });

  it('keeps later reviewed rows queued when stopped between rows and resumes without regenerating landed work', async () => {
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [
        { tool: 'quiz', directive: '' },
        { tool: 'glossary', directive: '' },
      ] })),
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    const reviewed = latestRun;
    deps.handleGenerate = vi.fn(async type => {
      GenerationHelpers.handleStopFullPack();
      return { id: `landed-${type}`, type, data: {} };
    });

    await GenerationHelpers.handleApproveFullPack(reviewed, deps);
    const stoppedRun = latestRun;
    const byType = type => Object.values(stoppedRun.resources).find(row => row.type === type);
    expect(stoppedRun.status).toBe('stopped');
    expect(byType('quiz')).toMatchObject({ status: 'landed' });
    expect(byType('glossary')).toMatchObject({ status: 'stopped', retryable: true });

    deps.handleGenerate = vi.fn(async type => ({ id: `resumed-${type}`, type, data: {} }));
    await GenerationHelpers.handleRetryFailedFullPack(stoppedRun, deps);

    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls[0][0]).toBe('glossary');
    expect(Object.values(latestRun.resources).map(row => row.status)).toEqual(['landed', 'landed']);
    expect(latestRun.status).toBe('completed');
  });

  it('preserves completed group lineage and resumes roster groups that were queued when stopped', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const deps = makeDeps({
      fullPackTargetGroup: 'all',
      rosterKey: { groups: {
        support: { name: 'Support', profile: { gradeLevel: '4th Grade' } },
        extension: { name: 'Extension', profile: { gradeLevel: '7th Grade' } },
      } },
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    });
    try {
      const planning = GenerationHelpers.handlePlanFullPack(deps);
      await vi.runAllTimersAsync();
      await planning;
      const reviewed = latestRun;
      deps.handleGenerate = vi.fn(async type => {
        GenerationHelpers.handleStopFullPack();
        return { id: `first-group-${type}`, type, data: {} };
      });
      const execution = GenerationHelpers.handleApproveFullPack(reviewed, deps);
      await vi.runAllTimersAsync();
      await execution;
      const stoppedRun = latestRun;
      expect(stoppedRun.status).toBe('stopped');
      expect(Object.keys(stoppedRun.groups)).toEqual(['support', 'extension']);
      expect(Object.values(stoppedRun.groups.support.resources)[0]).toMatchObject({ status: 'landed' });
      expect(Object.values(stoppedRun.groups.extension.resources)[0]).toMatchObject({ status: 'queued' });

      deps.handleGenerate = vi.fn(async type => ({ id: `resumed-group-${type}`, type, data: {} }));
      const retry = GenerationHelpers.handleRetryFailedFullPack(stoppedRun, deps);
      await vi.runAllTimersAsync();
      await retry;

      expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
      expect(Object.keys(latestRun.groups)).toEqual(['support', 'extension']);
      expect(Object.values(latestRun.groups.support.resources)[0]).toMatchObject({ status: 'landed' });
      expect(Object.values(latestRun.groups.extension.resources)[0]).toMatchObject({ status: 'landed' });
      expect(latestRun.status).toBe('completed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('makes a row retryable when any cell is transient and preserves permanent failures after retry', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const deps = makeDeps({
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
      handleGenerate: vi.fn(async (_type, language) => {
        if (language === 'English') throw new Error('authentication failed');
        throw new Error('503 temporary provider overload');
      }),
    });
    try {
      const first = GenerationHelpers.handleGenerateFullPack(null, deps);
      await vi.runAllTimersAsync();
      await first;
      const failedRun = latestRun;
      const failedRow = Object.values(failedRun.resources)[0];
      expect(failedRow.generationVariants.map(cell => [cell.language, cell.retryable])).toEqual([
        ['English', false], ['Spanish', true],
      ]);
      expect(failedRow.retryable).toBe(true);

      deps.handleGenerate = vi.fn(async (type, language) => ({ id: `recovered-${type}-${language}`, type, data: {} }));
      const retry = GenerationHelpers.handleRetryFailedFullPack(failedRun, deps);
      await vi.runAllTimersAsync();
      await retry;
    } finally {
      vi.useRealTimers();
    }

    expect(deps.handleGenerate).toHaveBeenCalledTimes(1);
    expect(deps.handleGenerate.mock.calls[0][1]).toBe('Spanish');
    const finalRow = Object.values(latestRun.resources)[0];
    expect(finalRow.generationVariants.map(cell => cell.status)).toEqual(['failed', 'landed']);
    expect(finalRow.resourceIds).toEqual(['recovered-quiz-Spanish']);
    expect(finalRow.retryable).toBe(false);
    expect(latestRun.status).toBe('partial');
  });

  it('freezes tool overrides, generation options, image settings, and provider selection through approval drift', async () => {
    let latestRun = null;
    const deps = makeDeps({
      quizCustomInstructions: 'Use the reviewed misconception checks.',
      quizMcqCount: 7,
      imageGenerationStyle: 'Watercolor',
      imageAspectRatio: '4:3',
      aiProviderProfile: {
        backend: 'openai', model: 'gpt-reviewed', imageProvider: 'openai', imageModel: 'image-reviewed', isLocal: false,
      },
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }] })),
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    const reviewed = latestRun;
    const frozen = reviewed.settingsSnapshot.fullPackGenerationConfig;
    expect(frozen).toMatchObject({
      toolOverrides: { quiz: 'Use the reviewed misconception checks.' },
      toolOptions: { quizMcqCount: 7 },
      universal: { imageGenerationStyle: 'Watercolor', imageAspectRatio: '4:3' },
      provider: { backend: 'openai', model: 'gpt-reviewed' },
    });
    expect(reviewed.preflight.generationMatrix.settings.toolOverrides.quiz).toMatchObject({
      customInstructions: 'Use the reviewed misconception checks.',
      generationContext: { customInstructions: 'Use the reviewed misconception checks.' },
    });
    expect(reviewed.preflight.selected[0].generationVariants[0].generationConfig).toMatchObject({
      generationContext: {
        resource: { customInstructions: 'Use the reviewed misconception checks.' },
      },
    });
    expect(GenerationHelpers.getFullPackGenerationConfigSnapshot(deps).fingerprint).toBe(frozen.fingerprint);

    deps.quizCustomInstructions = 'Ambient instructions that must not leak in.';
    deps.quizMcqCount = 2;
    deps.imageGenerationStyle = 'Photorealistic';
    deps.imageAspectRatio = '1:1';
    deps.aiProviderProfile = { backend: 'gemini', model: 'ambient-model', imageProvider: 'auto', imageModel: '' };
    expect(GenerationHelpers.getFullPackGenerationConfigSnapshot(deps).fingerprint).not.toBe(frozen.fingerprint);
    await GenerationHelpers.handleApproveFullPack(reviewed, deps);

    const call = deps.handleGenerate.mock.calls[0];
    expect(call[4]).toMatchObject({
      quizMcqCount: 7, imageGenerationStyle: 'Watercolor', imageAspectRatio: '4:3',
      backend: 'openai', model: 'gpt-reviewed',
    });
    expect(call[4].customInstructions).toContain('Use the reviewed misconception checks.');
    expect(call[4].customInstructions).not.toContain('Ambient instructions');
    expect(call[6]).toMatchObject({
      quizCustomInstructions: 'Use the reviewed misconception checks.',
      quizMcqCount: 7,
      imageGenerationStyle: 'Watercolor',
      imageAspectRatio: '4:3',
      aiProviderProfile: { backend: 'openai', model: 'gpt-reviewed' },
    });
  });

  it('scopes a tool-specific custom instruction to that resource identity', async () => {
    let latestRun = null;
    const deps = makeDeps({
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [
        { tool: 'quiz', directive: 'Check understanding.' },
        { tool: 'outline', directive: 'Organize the source.' },
      ] })),
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    const before = Object.fromEntries(latestRun.preflight.selected.map(row => [
      row.type, row.generationVariants[0].generationIdentity,
    ]));

    deps.quizCustomInstructions = 'Use one misconception-based distractor.';
    await GenerationHelpers.handlePlanFullPack(deps);
    const after = Object.fromEntries(latestRun.preflight.selected.map(row => [
      row.type, row.generationVariants[0].generationIdentity,
    ]));

    expect(after.quiz).not.toBe(before.quiz);
    expect(after.outline).toBe(before.outline);
  });

  it('preserves canonical matrix config metadata in compact history descriptors', async () => {
    let latestRun = null;
    const source = 'A source whose prior artifact has canonical config metadata.';
    const generationConfig = {
      version: 'generation-config/v1', type: 'quiz', backend: 'openai', fields: { itemCount: 4 },
    };
    const deps = makeDeps({
      inputText: source,
      history: [{
        id: 'prior-configured-quiz', type: 'quiz', generationIdentity: 'gm1-quiz-prior',
        sourceFingerprint: GenerationMatrix.fingerprintSourceText(source),
        config: {
          contextFingerprint: 'ctx-prior', contextInputsFingerprint: 'ctxi-prior',
          generationConfig, generationConfigFingerprint: 'cfg-quiz-prior',
          backend: 'openai', provider: 'openai', model: 'gpt-prior',
          imageProvider: 'openai', imageModel: 'image-prior',
        },
      }],
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
    });
    await GenerationHelpers.handlePlanFullPack(deps);

    expect(latestRun.preflight.generationMatrix.artifacts[0]).toMatchObject({
      contextInputsFingerprint: 'ctxi-prior',
      generationConfig,
      generationConfigFingerprint: 'cfg-quiz-prior',
      backend: 'openai', provider: 'openai', model: 'gpt-prior',
      imageProvider: 'openai', imageModel: 'image-prior',
      config: {
        contextInputsFingerprint: 'ctxi-prior',
        generationConfigFingerprint: 'cfg-quiz-prior',
      },
    });
  });

  it('gates and upgrades a legacy plan to the exact grade-language matrix after a late Matrix load', async () => {
    let latestRun = null;
    const deps = makeDeps({
      gradeLevel: '5th Grade',
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish', 'French'],
      differentiationRange: 'Custom',
      differentiationTypes: ['quiz'],
      differentiationCustomGrades: ['6th Grade'],
      getDifferentiationGrades: vi.fn(() => ['5th Grade', '6th Grade']),
      autoConfigureSettings: vi.fn(async () => ({
        resourcePlan: [{ tool: 'quiz', directive: 'Initial planner direction.' }],
      })),
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
    });
    const matrixModule = window.AlloModules.GenerationMatrix;
    let reviewed;
    try {
      window.AlloModules.GenerationMatrix = null;
      await GenerationHelpers.handlePlanFullPack(deps);
      reviewed = latestRun;
      expect(reviewed.preflight.sourceFingerprint).toMatch(/^fp-/);
      expect(reviewed.preflight.generationMatrix.settings.version).toBe(0);
      reviewed = GenerationHelpers.editFullPackPlanResourceDirective(
        reviewed,
        reviewed.preflight.selected[0].uiId,
        'Educator-reviewed direction preserved across the late load.'
      );
    } finally {
      window.AlloModules.GenerationMatrix = matrixModule;
    }

    await expect(GenerationHelpers.handleApproveFullPack(reviewed, deps)).resolves.toBe(false);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(latestRun.status).toBe('ready');
    expect(latestRun.preflight.generationMatrix.settings.version).toBe(GenerationMatrix.VERSION);
    expect(latestRun.preflight.selected[0].directive).toBe(
      'Educator-reviewed direction preserved across the late load.'
    );
    expect(latestRun.preflight.selected[0].generationVariants.map(cell =>
      `${cell.grade}|${cell.language}`).sort()).toEqual([
      '5th Grade|English', '5th Grade|French', '5th Grade|Spanish',
      '6th Grade|English', '6th Grade|French', '6th Grade|Spanish',
    ]);
    expect(latestRun.preflight.estimatedResourceGenerations).toBe(6);
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('exact grade and language variants'), 'info');

    await expect(GenerationHelpers.handleApproveFullPack(latestRun, deps)).resolves.toBe(true);
    expect(deps.handleGenerate).toHaveBeenCalledTimes(6);
    expect(latestRun.status).toBe('completed');
  });

  it('keeps a legacy ready plan and makes no resource calls while Matrix is unavailable at approval', async () => {
    let latestRun = null;
    const deps = makeDeps({
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      differentiationRange: 'Custom',
      differentiationTypes: ['quiz'],
      differentiationCustomGrades: ['6th Grade'],
      getDifferentiationGrades: vi.fn(() => ['5th Grade', '6th Grade']),
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
    });
    const matrixModule = window.AlloModules.GenerationMatrix;
    try {
      window.AlloModules.GenerationMatrix = null;
      await GenerationHelpers.handlePlanFullPack(deps);
      const reviewed = latestRun;
      const plannerCalls = deps.autoConfigureSettings.mock.calls.length;

      await expect(GenerationHelpers.handleApproveFullPack(reviewed, deps)).resolves.toBe(false);

      expect(deps.handleGenerate).not.toHaveBeenCalled();
      expect(deps.autoConfigureSettings).toHaveBeenCalledTimes(plannerCalls);
      expect(latestRun).toBe(reviewed);
      expect(latestRun).toMatchObject({ status: 'ready', runId: reviewed.runId });
      expect(latestRun.preflight.generationMatrix.settings.version).toBe(0);
      expect(deps.addToast).toHaveBeenCalledWith(expect.stringContaining('still loading'), 'info');
    } finally {
      window.AlloModules.GenerationMatrix = matrixModule;
    }
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
        if (attempt === 1) throw new Error('429 per-minute rate limit SENTINEL_ERROR');
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
