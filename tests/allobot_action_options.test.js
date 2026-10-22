import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let AC, buildContext;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: noop, useEffect: noop, useRef: noop, useMemo: noop, useCallback: f => f });
  loadAlloModule('allo_commands_module.js'); loadAlloModule('allo_command_context_module.js');
  AC = window.AlloModules.AlloCommands; buildContext = window.AlloModules.AlloCommandContext;
});
afterAll(() => vi.unstubAllGlobals());
const handlers = ['startLessonFlow','planFullPack','generateFullPack','runBlueprint','generateSourceText','generateQuiz','generateGlossary',
  'generateSimplified','generateSentenceFrames','generateAnalysis','generateOutline','generateAnchorChart','generateNoteTaking',
  'generateMemoryAid','generateBrainstorm','generateConceptSort','openSourceInput','openSourceGenerator','openSourceUrl','openUdlGuide',
  'openHistory','openAssessmentBuilder','launchFlashcards','openExportPreview','setShowExportMenu','openProjectSettings',
  'previewStudentAssignment','exportPack','saveStudentWork','shareAssignment','setShowWizard'];
function context(overrides = {}) {
  return { isTeacherMode: true, hasSourceOrAnalysis: true, hasSourceText: true, contentLoaded: false,
    t: () => '', ...Object.fromEntries(handlers.map(name => [name, vi.fn()])),
    callGemini: vi.fn(() => { throw new Error('Suggestion ranking must not call AI'); }), ...overrides };
}
const ids = suggestions => suggestions.map(item => item.commandId);
const matched = (commandId, params = {}, via = 'grammar') => ({ preview: true, commandId, params, via });

describe('local command suggestions', () => {
  it('offers one guided source-based recommendation plus distinct available alternatives', () => {
    const ctx = context();
    const suggestions = AC.getCommandSuggestions(ctx, 'can you help me build a lesson', matched('create_lesson'));
    expect(ids(suggestions)).toEqual(['create_lesson','plan_full_pack','generate_quiz','generate_note_taking']);
    expect(suggestions[0]).toMatchObject({ params: {}, label: 'Build a lesson from this source' });
    expect(suggestions[0].reason).toMatch(/Source material is already available/);
    expect(suggestions[1].effect).toMatch(/plan.*review/i);
    expect(suggestions[2].effect).toMatch(/one quiz/);
    for (const fn of handlers) expect(ctx[fn]).not.toHaveBeenCalled();
    expect(ctx.callGemini).not.toHaveBeenCalled();
    expect(AC.getCommandSuggestions(ctx, 'can you help me build a lesson', null)).toEqual(suggestions);
  });
  it('narrates the real guided entry for source-present, empty, and explicit-topic workspaces', async () => {
    const source = context();
    const sourceResult = await AC.runCommandById(source, 'create_lesson', {}, { confirmed: true });
    expect(sourceResult.narration).toContain('using your current source material');
    expect(source.startLessonFlow).toHaveBeenCalledWith({});
    const empty = context({ hasSourceText: false, hasSourceOrAnalysis: false });
    const emptyResult = await AC.runCommandById(empty, 'create_lesson', {}, { confirmed: true });
    expect(emptyResult.narration).toContain('ask for your topic');
    const topicResult = await AC.runCommandById(source, 'create_lesson', { topic: 'volcanoes', grade: '6' }, { confirmed: true });
    expect(topicResult.narration).toContain('volcanoes');
    expect(topicResult.narration).toContain('grade 6');
    expect(topicResult.narration).not.toContain('current source');
  });
  it('uses available plan state and keeps the guided primary, cap, and distinct IDs', () => {
    const ctx = context({ hasActiveBlueprint: true, fullPackPlanReady: true });
    const suggestions = AC.getCommandSuggestions(ctx, 'help me build a lesson', matched('create_lesson'));
    expect(ids(suggestions)).toEqual(['create_lesson','open_udl_guide','run_lesson_blueprint','generate_full_pack','generate_quiz']);
    expect(new Set(ids(suggestions)).size).toBe(suggestions.length);
    expect(ids(suggestions)).not.toContain('plan_full_pack');
    expect(ids(suggestions)).not.toContain('start_lesson_blueprint');
  });
  it('offers meaningful source setup choices before source-dependent generation is available', () => {
    const ctx = context({ hasSourceText: false, hasSourceOrAnalysis: false });
    const suggestions = AC.getCommandSuggestions(ctx, 'build a lesson', null);
    expect(ids(suggestions)).toEqual(['create_lesson','open_source_input','open_source_generator','open_source_url']);
    expect(suggestions[0].label).toBe('Plan a lesson with guidance');
    expect(ids(suggestions)).not.toContain('generate_quiz');
  });
  it.each(['make a quiz','generate full pack','wizard','make sentence frames'])('leaves an explicit narrow action as one choice: %s', async text => {
    const ctx = context();
    const preview = await AC.routeUtterance(ctx, text, { preview: true, allowAi: false });
    expect(preview).not.toBeNull();
    expect(ids(AC.getCommandSuggestions(ctx, text, preview))).toEqual([preview.commandId]);
  });
  it('preserves new topic and grade without substituting existing-source resource generation', () => {
    const ctx = context();
    const suggestions = AC.getCommandSuggestions(ctx, 'can you help me build a lesson about volcanoes for grade 6', null);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ commandId: 'create_lesson', params: { topic: 'volcanoes', grade: '6' } });
    expect(suggestions[0].label).toMatch(/specified topic/);
    expect(suggestions[0].effect).not.toContain('current source');
  });
  it('does not discard an explicit topic it cannot parse before normal routing', () => {
    expect(AC.getCommandSuggestions(context(), 'prepare instructional materials about volcanoes', null)).toEqual([]);
    expect(AC.getCommandSuggestions(context(), 'help me find source material about volcanoes', null)).toEqual([]);
  });
  it('treats explicit current-source references as reuse, not a new topic', () => {
    const result = AC.getCommandSuggestions(context(), 'build a lesson using this source', matched('create_lesson', { topic: 'using this source' }));
    expect(result[0].params).toEqual({});
    expect(ids(result)).toContain('plan_full_pack');
  });
  it('uses only review/navigation options while generation is busy, including a matched lesson request', () => {
    const ctx = context({ generationBusy: true, hasActiveBlueprint: true, contentLoaded: true, jumpToLatestLessonPlan: vi.fn() });
    const result = AC.getCommandSuggestions(ctx, 'help me build a lesson', matched('create_lesson'));
    expect(ids(result)).toEqual(['open_udl_guide','jump_to_lesson_plan','open_history']);
    expect(AC.validateCommandSuggestion(ctx, { commandId: 'generate_quiz', params: {} }).ok).toBe(false);
    expect(ctx.startLessonFlow).not.toHaveBeenCalled();
  });
  it('handles reading support, assessment and engagement without paid routing', () => {
    const ctx = context({ contentIsGlossary: true });
    expect(ids(AC.getCommandSuggestions(ctx, 'help me support this reading', null)))
      .toEqual(['generate_simplified','generate_glossary','generate_sentence_frames','generate_note_taking','generate_anchor_chart']);
    expect(ids(AC.getCommandSuggestions(ctx, 'help me assess learning', null)))
      .toEqual(['generate_quiz','open_assessment_builder','generate_note_taking','generate_concept_sort']);
    expect(ids(AC.getCommandSuggestions(ctx, 'make the lesson more engaging', null)))
      .toEqual(['generate_concept_sort','generate_brainstorm','launch_flashcards','generate_memory_aid','generate_anchor_chart']);
    expect(ctx.callGemini).not.toHaveBeenCalled();
  });
  it('offers save/share setup choices without publishing or changing cloud-sync consent', () => {
    const ctx = context({ canPreviewStudentAssignment: true });
    expect(ids(AC.getCommandSuggestions(ctx, 'help me save this lesson', null))).toEqual(['export_pack','open_document_builder']);
    const sharing = AC.getCommandSuggestions(ctx, 'help me share this lesson', null);
    expect(ids(sharing)).toEqual(['open_export_menu','open_document_builder','preview_assignment_as_student','open_project_settings']);
    expect(ids(sharing)).not.toContain('share_assignment');
    expect(ids(sharing)).not.toContain('toggle_cloud_sync');
    expect(ctx.shareAssignment).not.toHaveBeenCalled();
  });
  it('retains student saving while enforcing teacher/parent/independent role gates', () => {
    const student = context({ isTeacherMode: false, isStudentLinkMode: true, canSaveStudentWork: true });
    expect(AC.getCommandSuggestions(student, 'help me build a lesson', null)).toEqual([]);
    expect(ids(AC.getCommandSuggestions(student, 'help me save my work', null))).toEqual(['save_my_work']);
    const parent = context({ isParentMode: true });
    const parentIds = ids(AC.getCommandSuggestions(parent, 'help me support this reading', null));
    expect(parentIds).toEqual(['generate_simplified','generate_glossary','generate_sentence_frames']);
    expect(ids(AC.getCommandSuggestions(context({ isIndependentMode: true }), 'help me assess learning', null)))
      .toEqual(['generate_quiz']);
  });
  it('does not fill missing capabilities with unrelated choices', () => {
    const ctx = context({ generateQuiz: null, generateNoteTaking: null, planFullPack: null, generateFullPack: null });
    expect(ids(AC.getCommandSuggestions(ctx, 'build a lesson', null))).toEqual(['create_lesson']);
    expect(AC.getCommandSuggestions(ctx, 'how is the weather tomorrow', null)).toEqual([]);
    expect(AC.getCommandSuggestions(ctx, 'what is a lesson plan?', null)).toEqual([]);
    expect(AC.getCommandSuggestions(ctx, 'do not build a lesson', null)).toEqual([]);
  });
  it('excludes destructive/chat-only actions and does not invent missing required step params', () => {
    const ctx = context({ hasActiveBlueprint: true, rebuildBlueprintStep: vi.fn(), blueprintStepList: () => [{ position: 1 }] });
    expect(AC.getCommandSuggestions(ctx, 'clear workspace', matched('clear_workspace'))).toEqual([]);
    expect(AC.getCommandSuggestions(ctx, 'bot', matched('toggle_bot'))).toEqual([]);
    expect(AC.getCommandSuggestions(ctx, 'rebuild step', matched('rebuild_lesson_step'))).toEqual([]);
    expect(AC.validateCommandSuggestion(ctx, { commandId: 'rebuild_lesson_step', params: { step: 9 } })).toMatchObject({ ok: false, reasonCode: 'params' });
  });
  it('revalidates availability and parameters without executing anything', () => {
    const ctx = context();
    const option = AC.getCommandSuggestions(ctx, 'help me support this reading', null)[0];
    expect(AC.validateCommandSuggestion(ctx, option)).toEqual({ ok: true, reasonCode: '', params: {}, reason: '' });
    expect(AC.validateCommandSuggestion({ ...ctx, hasSourceOrAnalysis: false }, option)).toMatchObject({ ok: false, reasonCode: 'unavailable' });
    expect(AC.validateCommandSuggestion({ ...ctx, generateSimplified: null }, option).ok).toBe(false);
    expect(AC.validateCommandSuggestion(ctx, { commandId: 'not_real', params: {} }).ok).toBe(false);
    expect(ctx.generateSimplified).not.toHaveBeenCalled();
  });
  it('does not inspect raw source or emit a scope token in action metadata', () => {
    const ctx = context({ commandScopeToken: 'PRIVATE_SCOPE_CANARY' });
    Object.defineProperty(ctx, 'inputText', { get() { throw new Error('No raw source needed'); } });
    ctx.getCurrentLearnerResource = vi.fn(() => { throw new Error('No learner resource content needed'); });
    const result = AC.getCommandSuggestions(ctx, 'build a lesson', matched('create_lesson'));
    expect(JSON.stringify(result)).not.toContain('PRIVATE_SCOPE_CANARY');
    for (const row of result) {
      expect(Object.keys(row).sort()).toEqual(['commandId','effect','label','params','reason']);
      expect(row.label.length).toBeLessThanOrEqual(120);
      expect(row.reason.length).toBeLessThanOrEqual(180);
      expect(row.effect.length).toBeLessThanOrEqual(260);
    }
    expect(ctx.getCurrentLearnerResource).not.toHaveBeenCalled();
  });
});

function producerDeps(overrides = {}) {
  return { __live: { callGemini: vi.fn(async () => '{"commandId":null,"confidence":0,"params":{}}') },
    _alloCmdCtxRef: { current: null }, _contextualSuggestionRef: { current: null },
    _alloStudentSafeResources: value => Array.isArray(value) ? value : [], _alloVoiceInputAvailable: () => false,
    canvasRecoveryCurrentIdRef: { current: 'workspace-one' }, history: [], inputText: 'PRIVATE_SOURCE_CANARY',
    generatedContent: null, activeBlueprint: null, fullPackRun: null,
    activeView: 'input', activeSidebarTab: 'create', isTeacherMode: true, hasSourceOrAnalysis: true,
    t: () => '', studentProjectSettings: {}, studentInterests: [], targetStandards: [],
    gradeLevel: '6', leveledTextLanguage: 'English', ...overrides };
}
describe('local action scope identity', () => {
  it('is stable across context reconstruction but changes when source text changes', () => {
    const deps = producerDeps(), first = buildContext(deps);
    expect(buildContext(deps).commandScopeToken).toBe(first.commandScopeToken);
    deps.inputText = 'PRIVATE_REPLACEMENT_CANARY';
    const second = buildContext(deps);
    expect(second.commandScopeToken).not.toBe(first.commandScopeToken);
    expect(second.commandScopeToken).toMatch(/^cmd-scope-[a-z0-9]+$/);
    expect(JSON.stringify(second.commandScopeToken)).not.toMatch(/PRIVATE_/);
  });
  it.each(['generatedContent','history','activeBlueprint','fullPackRun','studentProjectSettings','targetStandards'])
  ('invalidates on a changed %s reference', field => {
    const deps = producerDeps(), before = buildContext(deps).commandScopeToken;
    deps[field] = ['history','targetStandards'].includes(field) ? [] : {};
    expect(buildContext(deps).commandScopeToken).not.toBe(before);
  });
  it.each([{ isTeacherMode: false },{ activeView: 'quiz' },{ gradeLevel: '7' },{ leveledTextLanguage: 'Spanish' },{ isProcessing: true }])
  ('invalidates when a role, view, setting or busy state changes: %j', patch => {
    const deps = producerDeps(), before = buildContext(deps).commandScopeToken;
    Object.assign(deps, patch);
    expect(buildContext(deps).commandScopeToken).not.toBe(before);
  });
  it('distinguishes imported workspaces even when content references are reused', () => {
    const deps = producerDeps(), before = buildContext(deps).commandScopeToken;
    deps.canvasRecoveryCurrentIdRef.current = 'workspace-two';
    expect(buildContext(deps).commandScopeToken).not.toBe(before);
  });
  it('never adds the opaque token or raw source to AI routing context', async () => {
    const deps = producerDeps(), ctx = buildContext(deps);
    await AC.routeUtterance(ctx, 'I would appreciate help assembling instructional materials', { preview: true, allowAi: true });
    const prompt = deps.__live.callGemini.mock.calls[0][0];
    expect(prompt).not.toContain(ctx.commandScopeToken);
    expect(prompt).not.toContain('PRIVATE_SOURCE_CANARY');
    expect(prompt).toContain('Source text available: yes');
  });
});
