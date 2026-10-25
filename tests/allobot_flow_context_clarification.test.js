import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC, buildContext;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: noop, useEffect: noop, useRef: noop, useMemo: noop, useCallback: fn => fn });
  loadAlloModule('allo_commands_module.js');
  loadAlloModule('allo_command_context_module.js');
  AC = window.AlloModules.AlloCommands;
  buildContext = window.AlloModules.AlloCommandContext;
});
afterAll(() => vi.unstubAllGlobals());

function context(overrides = {}) {
  return {
    isTeacherMode: true, hasSourceText: true, hasSourceOrAnalysis: true,
    commandGradeLevel: '6th Grade', commandResourceCount: 4,
    startLessonFlow: vi.fn(), generateQuiz: vi.fn(), generateGlossary: vi.fn(),
    generateSimplified: vi.fn(), generateSentenceFrames: vi.fn(), generateNoteTaking: vi.fn(), generateAnchorChart: vi.fn(),
    openSourceInput: vi.fn(), openSourceGenerator: vi.fn(), openSourceUrl: vi.fn(),
    t: () => '', callGemini: vi.fn(() => { throw new Error('Local helper must not call AI'); }),
    ...overrides,
  };
}
function producerDeps(overrides = {}) {
  return {
    __live: { callGemini: vi.fn() }, _alloCmdCtxRef: { current: null }, _contextualSuggestionRef: { current: null },
    _alloStudentSafeResources: value => Array.isArray(value) ? value.filter(item => item && item.type) : [], _alloVoiceInputAvailable: () => false,
    canvasRecoveryCurrentIdRef: { current: 'workspace-one' }, history: [], inputText: 'PRIVATE_SOURCE_CANARY',
    generatedContent: null, activeBlueprint: null, fullPackRun: null,
    activeView: 'input', activeSidebarTab: 'create', isTeacherMode: true, hasSourceOrAnalysis: true,
    t: () => '', studentProjectSettings: {}, studentInterests: [], targetStandards: [],
    gradeLevel: '6th Grade', leveledTextLanguage: 'English', ...overrides,
  };
}

describe('bounded action context summary', () => {
  it('describes source, grade, existing plan, and resource count without content', () => {
    const ctx = context({ hasActiveBlueprint: true, inputText: 'PRIVATE_SOURCE', sourceTopic: 'PRIVATE_TOPIC',
      history: [{ title: 'PRIVATE_RESOURCE' }] });
    expect(AC.getCommandContextSummary(ctx)).toEqual({ source: 'current', grade: 'Grade 6', plan: 'blueprint', resourceCount: 4 });
    expect(JSON.stringify(AC.getCommandContextSummary(ctx))).not.toMatch(/PRIVATE_/);
    expect(ctx.callGemini).not.toHaveBeenCalled();
  });
  it('distinguishes analysis-only, empty source, and prepared Full Pack state', () => {
    expect(AC.getCommandContextSummary(context({ hasSourceText: false, fullPackPlanReady: true })))
      .toMatchObject({ source: 'analysis', plan: 'full-pack' });
    expect(AC.getCommandContextSummary(context({ hasSourceText: false, hasSourceOrAnalysis: false })))
      .toMatchObject({ source: 'none', plan: 'none' });
  });
  it.each([['K', 'Kindergarten'], ['Pre-K', 'Pre-K'], ['12th Grade', 'Grade 12'], ['grade 1', 'Grade 1'],
    ['College', 'College'], ['Graduate Level', 'Graduate level'], [7, 'Grade 7'], ['PRIVATE_STUDENT Grade 6', ''], ['13', '']])
  ('only returns a known grade label for %s', (value, expected) => {
    expect(AC.getCommandContextSummary(context({ commandGradeLevel: value })).grade).toBe(expected);
  });
  it.each([[10000, 999], [-5, 0], [3.9, 3], [Infinity, 0], ['5', 0], [NaN, 0]])
  ('bounds resource metadata %s to %s', (value, expected) => {
    expect(AC.getCommandContextSummary(context({ commandResourceCount: value })).resourceCount).toBe(expected);
  });
  it('counts existing resources once from real context without copying source or resource names', () => {
    const notebook = { id: 'one', type: 'note-taking', title: 'PRIVATE_NOTEBOOK' };
    const quiz = { id: 'two', type: 'quiz', title: 'PRIVATE_QUIZ' };
    const ctx = buildContext(producerDeps({ history: [notebook, quiz, null, { title: 'not a resource' }], generatedContent: quiz }));
    expect(AC.getCommandContextSummary(ctx)).toEqual({ source: 'current', grade: 'Grade 6', plan: 'none', resourceCount: 2 });
    expect(JSON.stringify(AC.getCommandContextSummary(ctx))).not.toMatch(/PRIVATE_/);
  });
});

describe('one narrow local clarification', () => {
  it.each(['help me with this', 'Can you help me with this?', 'What should I do next?', 'help me teach this', 'Please help me get started', "I'm not sure where to start"])
  ('asks about the outcome for a genuinely vague request: %s', async text => {
    const ctx = context();
    const preview = await AC.routeUtterance(ctx, text, { preview: true, allowAi: false });
    const offer = AC.getCommandClarification(ctx, text, preview);
    expect(offer.question).toBe('What would you like help with?');
    expect(offer.choices.map(choice => choice.id)).toEqual(['lesson', 'resource', 'advice']);
    expect(ctx.callGemini).not.toHaveBeenCalled();
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
  });
  it.each(['can you help me build a lesson', 'support this reading', 'make a quiz', 'help me understand this passage',
    'What is academic discourse?', 'Explain collaboration', 'How do I teach discourse?', 'cmd: help me with this',
    'help me with this then make a quiz', 'help me with School Store', 'award 5 points to PRIVATE_STUDENT', '__allo_store_award'])
  ('keeps explicit actions, content questions, and private boundaries out of clarification: %s', text => {
    expect(AC.getCommandClarification(context(), text, null)).toBeNull();
  });
  it('never takes over an existing native command match', () => {
    expect(AC.getCommandClarification(context(), 'help me with this', { commandId: 'open_udl_guide', via: 'grammar' })).toBeNull();
  });
  it.each([{ generationBusy: true }, { isTeacherMode: false }, { isIndependentMode: true }, { isParentMode: true }])
  ('keeps the existing route when work is busy or this is not teacher creation: %j', patch => {
    expect(AC.getCommandClarification(context(patch), 'help me with this', null)).toBeNull();
  });
  it('omits unavailable lesson creation while retaining useful resource/advice choices', () => {
    expect(AC.getCommandClarification(context({ startLessonFlow: undefined }), 'help me with this', null).choices.map(choice => choice.id))
      .toEqual(['resource', 'advice']);
  });
  it('does not interrupt chat when there is no available creation path', () => {
    expect(AC.getCommandClarification({ isTeacherMode: true, t: () => '' }, 'help me with this', null)).toBeNull();
  });
});

describe('attempt-scoped Blueprint progress bridge', () => {
  it('forwards the optional callback through the actual native command and context wrapper', async () => {
    const phase = { phase: 'preparing-tools', startedAt: 100, phaseStartedAt: 100, diagnosticId: 'attempt-one' };
    const progress = vi.fn();
    const execute = vi.fn(async options => { options.onProgress(phase); return { status: 'completed', ok: true }; });
    const copy = vi.fn(async () => true);
    const show = vi.fn();
    const ctx = buildContext(producerDeps({ activeBlueprint: { resourcePlan: [{ tool: 'quiz' }] },
      handleExecuteBlueprint: execute, handleCopyBlueprintActionDiagnostics: copy, setShowUDLGuide: show }));
    const result = await AC.runCommandById({ ...ctx, onCommandProgress: progress }, 'run_lesson_blueprint', {}, { confirmed: true, awaitCompletion: true });
    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledWith({ onProgress: progress });
    expect(progress).toHaveBeenCalledWith(phase);
    expect(show).toHaveBeenCalledWith(true);
    await ctx.copyBlueprintDiagnostics('attempt-one');
    expect(copy).toHaveBeenCalledWith('attempt-one');
  });
  it('reports unavailable diagnostic copying without a side effect when the host helper is absent', async () => {
    expect(await buildContext(producerDeps()).copyBlueprintDiagnostics('old-attempt')).toBe(false);
  });
});
