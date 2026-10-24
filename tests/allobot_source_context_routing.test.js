import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let commands, buildContext;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: noop, useEffect: noop,
    useRef: noop, useMemo: noop, useCallback: f => f });
  loadAlloModule('allo_commands_module.js');
  loadAlloModule('allo_command_context_module.js');
  commands = window.AlloModules.AlloCommands;
  buildContext = window.AlloModules.AlloCommandContext;
});
afterAll(() => vi.unstubAllGlobals());

function context(overrides = {}) {
  const deps = {
    __live: { callGemini: vi.fn(async () => '{"commandId":null,"params":{},"confidence":0}') },
    _alloCmdCtxRef: { current: null }, _contextualSuggestionRef: { current: null },
    _alloStudentSafeResources: () => [], _alloVoiceInputAvailable: () => false,
    studentProjectSettings: {}, isTeacherMode: true, t: () => '',
    activeSidebarTab: 'create', activeView: 'input', inputText: '', hasSourceOrAnalysis: false,
    setShowWizard: vi.fn(), setIsBotVisible: vi.fn(), setShowUDLGuide: vi.fn(),
    handleAutoFillToggle: vi.fn(), ...overrides,
  };
  return { deps, ctx: buildContext(deps) };
}
const preview = (ctx, text) => commands.routeUtterance(ctx, text, { preview: true, allowAi: true });

async function routingPrompt(ctx) {
  await preview(ctx, 'I would appreciate help assembling instructional materials');
  expect(ctx.callGemini).toHaveBeenCalledOnce();
  return ctx.callGemini.mock.calls[0][0];
}

describe('AlloBot current-source routing', () => {
  it.each(['can you help me build a lesson', 'help me build a lesson',
    'Could you please help me to plan a lesson?', 'Would you help me create a lesson?'])
  ('routes the polite request to reviewed lesson flow without an AI call: %s', async text => {
    const { ctx, deps } = context({ inputText: 'Already generated source text', hasSourceOrAnalysis: true });
    const result = await preview(ctx, text);
    expect(result).toMatchObject({ preview: true, handled: false, commandId: 'create_lesson', params: {}, via: 'grammar' });
    expect(ctx.callGemini).not.toHaveBeenCalled();
    expect(deps.handleAutoFillToggle).not.toHaveBeenCalled();
    expect(deps.setShowWizard).not.toHaveBeenCalled();
  });

  it('retains explicitly requested new topic and grade', async () => {
    const { ctx } = context({ inputText: 'Old passage', hasSourceOrAnalysis: true });
    expect(await preview(ctx, 'can you help me build a lesson about volcanoes for grade 6'))
      .toMatchObject({ commandId: 'create_lesson', params: { topic: 'volcanoes', grade: '6' } });
  });

  it.each(['wizard', 'start the lesson wizard'])('preserves explicit wizard navigation: %s', async text => {
    const { ctx, deps } = context({ inputText: 'Existing source', hasSourceOrAnalysis: true });
    expect(await preview(ctx, text)).toMatchObject({ preview: true, commandId: 'open_wizard' });
    expect(deps.setShowWizard).not.toHaveBeenCalled();
    expect(ctx.callGemini).not.toHaveBeenCalled();
  });

  it.each(['why would you build a lesson?', 'can you explain how to build a lesson?'])
  ('does not turn a content question into a deterministic lesson action: %s', async text => {
    const { ctx } = context();
    expect(await commands.routeUtterance(ctx, text, { preview: true, allowAi: false })).toBeNull();
  });

  it('keeps student role gates even when the model proposes the teacher command', async () => {
    const callGemini = vi.fn(async () => '{"commandId":"create_lesson","params":{},"confidence":1}');
    const { ctx, deps } = context({ isTeacherMode: false, isStudentLinkMode: true, __live: { callGemini } });
    expect(await preview(ctx, 'can you help me build a lesson')).toBeNull();
    expect(deps.handleAutoFillToggle).not.toHaveBeenCalled();
    expect(callGemini.mock.calls[0][0]).not.toMatch(/^create_lesson:/m);
  });

  it('distinguishes source input from a generated resource using actual producer flags', async () => {
    const { ctx } = context({ inputText: 'PRIVATE_SOURCE_CANARY', hasSourceOrAnalysis: true });
    expect(ctx).toMatchObject({ hasSourceText: true, contentLoaded: false, hasSourceOrAnalysis: true, generationBusy: false });
    expect(ctx).not.toHaveProperty('inputText');
    const prompt = await routingPrompt(ctx);
    expect(prompt).toContain('Open right now: Source setup');
    expect(prompt).toContain('Source text available: yes');
    expect(prompt).toContain('Source or analysis available: yes');
    expect(prompt).toContain('Resource open: no');
    expect(prompt).not.toContain('Content loaded: none yet');
    expect(prompt).not.toContain('PRIVATE_SOURCE_CANARY');
  });

  it('reports empty source, available plans and in-progress work without leaking task content', async () => {
    const { ctx } = context({ inputText: ' \n ', isGeneratingSource: true,
      generatedContent: { type: 'quiz', title: 'PRIVATE_TITLE_CANARY', data: 'PRIVATE_BODY_CANARY' },
      activeBlueprint: { title: 'PRIVATE_BLUEPRINT_CANARY', resourcePlan: [{ tool: 'quiz', uiId: '1' }] },
      fullPackRun: { status: 'ready', plan: 'PRIVATE_PLAN_CANARY' },
      udlMessages: [{ role: 'user', text: 'PRIVATE_CHAT_CANARY' }], studentInterests: ['PRIVATE_INTEREST_CANARY'],
    });
    const prompt = await routingPrompt(ctx);
    expect(prompt).toContain('Source text available: no');
    expect(prompt).toContain('Resource open: yes');
    expect(prompt).toContain('Lesson blueprint ready: yes');
    expect(prompt).toContain('Full-pack plan awaiting review: yes');
    expect(prompt).toContain('Generation in progress: yes');
    expect(prompt).not.toMatch(/PRIVATE_[A-Z]+_CANARY/);
  });

  it.each(['isProcessing', 'isGeneratingSource', 'isGeneratingPersona', 'isExtracting'])
  ('mirrors busy state from %s without granting permission to start work', async flag => {
    const { ctx, deps } = context({ [flag]: true, inputText: 'existing source', hasSourceOrAnalysis: true });
    expect(ctx.generationBusy).toBe(true);
    expect(await preview(ctx, 'can you help me build a lesson')).toMatchObject({ preview: true, handled: false });
    expect(deps.handleAutoFillToggle).not.toHaveBeenCalled();
  });

  it('provides bounded behavior descriptions to the AI fallback instead of just overlapping labels', async () => {
    const { ctx } = context({ t: key => key === 'cmd.create_lesson_hint' ? 'h'.repeat(800) : '' });
    const prompt = await routingPrompt(ctx);
    const lessonLine = prompt.split('\n').find(line => line.startsWith('create_lesson:'));
    expect(lessonLine).toContain('interaction: guided');
    expect(lessonLine).toContain('using current source text unless a new topic is stated');
    expect(lessonLine).toContain('hint: ' + 'h'.repeat(120));
    expect(lessonLine).not.toContain('h'.repeat(121));
    expect(prompt).toContain('Use open_wizard for an explicit request');
    expect(prompt).toContain('UNTRUSTED_USER_REQUEST_JSON');
  });
});

// Exercise the existing host callback rather than imitating its source-preservation decision.
const hostSource = readFileSync('host_handlers_source.jsx', 'utf8');
const handoffStart = hostSource.indexOf('const handleAutoFillToggle =');
const handoffEnd = hostSource.indexOf('\nconst ', handoffStart + 1);
const hostHandoff = deps => new Function('__d', hostSource.slice(handoffStart, handoffEnd)
  + '\nreturn handleAutoFillToggle;')(deps);

describe('confirmed lesson flow preserves the existing source', () => {
  it.each([
    { input: 'SOURCE_TEXT_TO_PRESERVE', text: 'can you help me build a lesson', stage: 'initial_choice' },
    { input: '', text: 'can you help me build a lesson', stage: 'source' },
    { input: 'SOURCE_TEXT_TO_PRESERVE', text: 'can you help me build a lesson about volcanoes', stage: 'source' },
  ])('uses native handoff stage $stage for $text / source=$input', async ({ input, text, stage }) => {
    const native = {
      inputText: input, lessonHandoffRequestRef: { current: 0 }, udlMessages: [],
      setIsAutoFillMode: vi.fn(), setHasUsedAutoFill: vi.fn(), setIsChatProcessing: vi.fn(),
      setGuidedFlowState: vi.fn(), setUdlMessages: vi.fn(), setShowSourceGen: vi.fn(),
      setExpandedTools: vi.fn(), setSourceTopic: vi.fn(), setGradeLevel: vi.fn(), setSourceLevel: vi.fn(),
      setInputText: vi.fn(), handleGenerate: vi.fn(), handleGenerateSource: vi.fn(), t: key => key,
    };
    const { ctx } = context({ inputText: input, hasSourceOrAnalysis: !!input, handleAutoFillToggle: hostHandoff(native) });
    const proposed = await preview(ctx, text);
    expect(native.setGuidedFlowState).not.toHaveBeenCalled();
    // Represents accepting the already reviewed command; the preview above is side-effect free.
    await ctx.startLessonFlow(proposed.params);
    expect(native.setGuidedFlowState).toHaveBeenCalledWith(expect.objectContaining({ currentStage: stage, isFlowActive: true }));
    expect(native.inputText).toBe(input);
    expect(native.setInputText).not.toHaveBeenCalled();
    expect(native.handleGenerate).not.toHaveBeenCalled();
    expect(native.handleGenerateSource).not.toHaveBeenCalled();
    if (stage === 'initial_choice') {
      const added = native.setUdlMessages.mock.calls[0][0]([]);
      expect(added[0].choices.map(choice => choice.value)).toEqual(['step', 'pack']);
    }
  });
});
