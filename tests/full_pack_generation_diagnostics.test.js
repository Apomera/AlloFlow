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
    const deps = makeDeps({
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
});