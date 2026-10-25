import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let AC, buildContext;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', { createElement: noop, useState: noop, useEffect: noop, useRef: noop, useMemo: noop, useCallback: fn => fn });
  loadAlloModule('allo_commands_module.js'); loadAlloModule('allo_command_context_module.js');
  AC = window.AlloModules.AlloCommands; buildContext = window.AlloModules.AlloCommandContext;
});
afterAll(() => vi.unstubAllGlobals());
const done = { handled: true, ok: true };
const ids = value => value.map(action => action.commandId);
function ctx(overrides = {}) {
  return { isTeacherMode: true, hasSourceText: true, hasSourceOrAnalysis: true, contentLoaded: true, commandResourceCount: 2,
    openExportPreview: vi.fn(), canSaveTeacherProject: true, openProjectSave: vi.fn(() => true),
    canPreviewStudentAssignment: true, canPreviewCurrentAssignment: true, previewStudentAssignment: vi.fn(),
    generateQuiz: vi.fn(async () => {}), hasActiveBlueprint: true, runBlueprint: vi.fn(async () => ({ status: 'completed' })),
    planFullPack: vi.fn(async () => true), generateFullPack: vi.fn(async () => true), generateOutline: vi.fn(),
    t: () => '', callGemini: vi.fn(() => { throw Error('Unexpected AI call'); }), ...overrides };
}
const resources = [{ id: 'note-1', type: 'note-taking', title: 'PRIVATE_NOTE' }, { id: 'quiz-2', type: 'quiz', title: 'PRIVATE_QUIZ' }];
function share(overrides = {}) {
  return { type: 'assignment-pack', url: 'https://example.org/app/?student=existing', createdAt: new Date(Date.now() - 60000).toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(), deliverySummary: { contentsStatus: 'ready', resourceCount: 2, resourceIds: ['note-1', 'quiz-2'] }, ...overrides };
}
function deps(overrides = {}) {
  return { __live: { callGemini: vi.fn() }, _alloCmdCtxRef: { current: null }, _contextualSuggestionRef: { current: null },
    _alloStudentSafeResources: list => Array.isArray(list) ? list.filter(item => item && item.id && item.type) : [],
    _alloIsStudentSafeResource: item => !!(item && item.type),
    _alloVoiceInputAvailable: () => false, canvasRecoveryCurrentIdRef: { current: 'workspace-one' }, history: resources,
    inputText: 'PRIVATE_SOURCE', generatedContent: resources[1], activeBlueprint: null, fullPackRun: null,
    activeView: 'quiz', activeSidebarTab: 'create', isTeacherMode: true, hasSourceOrAnalysis: true, t: () => '',
    studentProjectSettings: {}, studentInterests: [], targetStandards: [], gradeLevel: '6th Grade', leveledTextLanguage: 'English',
    initiateSaveTeacherProject: vi.fn(), openStudentQrPreview: vi.fn(), latestStudentPreviewShare: share(), ...overrides };
}

describe('finished-resource completion actions', () => {
  it('returns at most three native actions with effects and no side effects', () => {
    const c = ctx(); const actions = AC.getCommandCompletionActions(c, 'generate_quiz', done);
    expect(ids(actions)).toEqual(['open_document_builder', 'preview_assignment_as_student', 'open_project_save']);
    expect(actions.every(action => action.reason && action.effect && Object.keys(action.params).length === 0)).toBe(true);
    expect(actions[0].effect).toMatch(/Document Builder/); expect(actions[1].effect).toMatch(/existing matching/);
    expect(actions[2].effect).toMatch(/confirm the project download/);
    expect(c.openExportPreview).not.toHaveBeenCalled(); expect(c.openProjectSave).not.toHaveBeenCalled();
    expect(c.previewStudentAssignment).not.toHaveBeenCalled(); expect(c.callGemini).not.toHaveBeenCalled();
  });
  it.each(['plan_full_pack', 'create_lesson', 'start_lesson_blueprint', 'open_document_builder', 'open_history',
    'generate_full_pack', 'generate_source_text', 'generate_outline', 'share_assignment'])
  ('does not treat planning, navigation, publication, or start-only work as finished resources: %s', id => {
    expect(AC.getCommandCompletionActions(ctx(), id, done)).toEqual([]);
  });
  it.each([{ ...done, pending: true }, { ...done, partial: true }, { ...done, cancelled: true }, { ...done, ok: false },
    { ...done, status: 'failed' }, { ...done, status: 'waiting' }, { ...done, status: 'partial' }, { ok: true }, null])
  ('rejects a non-completion outcome %j', result => {
    expect(AC.getCommandCompletionActions(ctx(), 'generate_quiz', result)).toEqual([]);
  });
  it('requires completed status for the actual reviewed Blueprint producer', () => {
    expect(AC.getCommandCompletionActions(ctx(), 'run_lesson_blueprint', done)).toEqual([]);
    expect(ids(AC.getCommandCompletionActions(ctx(), 'run_lesson_blueprint', { ...done, status: 'completed' }))).toHaveLength(3);
  });
  it('omits unavailable and legacy-preview actions without filler', () => {
    expect(ids(AC.getCommandCompletionActions(ctx({ canPreviewCurrentAssignment: false, openProjectSave: undefined }), 'generate_quiz', done)))
      .toEqual(['open_document_builder']);
    expect(AC.getCommandCompletionActions(ctx({ isTeacherMode: false }), 'generate_quiz', done)).toEqual([]);
    expect(AC.getCommandCompletionActions(ctx({ contentLoaded: false, commandResourceCount: 0 }), 'generate_quiz', done)).toEqual([]);
  });
  it('the native save command opens only the existing dialog after explicit acceptance', async () => {
    const d = deps(), c = buildContext(d);
    expect(AC.validateCommandSuggestion(c, { commandId: 'open_project_save', params: {} }).ok).toBe(true);
    const result = await AC.runCommandById(c, 'open_project_save', {}, { confirmed: true });
    expect(result.narration).toMatch(/Review the file name/);
    expect(d.initiateSaveTeacherProject).toHaveBeenCalledOnce();
    expect(d.initiateSaveTeacherProject).toHaveBeenCalledWith();
    expect(c.openProjectSave).toBeTypeOf('function');
    const empty = buildContext(deps({ history: [], generatedContent: null }));
    expect(AC.validateCommandSuggestion(empty, { commandId: 'open_project_save', params: {} }).ok).toBe(false);
  });
  it('allows native Save Project for parent and independent audiences, but not students', () => {
    for (const role of ['teacher', 'parent', 'independent']) {
      expect(AC.validateCommandSuggestion(ctx({ commandAudience: role }), { commandId: 'open_project_save', params: {} }).ok).toBe(true);
    }
    expect(AC.validateCommandSuggestion(ctx({ commandAudience: 'student' }), { commandId: 'open_project_save', params: {} }).ok).toBe(false);
  });
});

describe('completion preview provenance', () => {
  it('accepts only a ready existing link with the exact student-safe resource set', () => {
    const d = deps(), c = buildContext(d);
    expect(c.canPreviewCurrentAssignment).toBe(true);
    expect(d.openStudentQrPreview).not.toHaveBeenCalled(); expect(d.initiateSaveTeacherProject).not.toHaveBeenCalled();
    const actions = AC.getCommandCompletionActions(c, 'generate_quiz', done);
    expect(ids(actions)).toContain('preview_assignment_as_student');
    expect(JSON.stringify(actions)).not.toMatch(/PRIVATE_|https:|student=existing/);
  });
  it.each([
    { deliverySummary: { contentsStatus: 'ready', resourceCount: 2 } },
    { deliverySummary: { contentsStatus: 'unverified', resourceCount: 2, resourceIds: ['note-1', 'quiz-2'] } },
    { deliverySummary: { contentsStatus: 'ready', resourceCount: 2, resourceIds: ['old-resource', 'quiz-2'] } },
    { deliverySummary: { contentsStatus: 'ready', resourceCount: 1, resourceIds: ['quiz-2'] } },
    { deliverySummary: { contentsStatus: 'ready', resourceCount: 2, resourceIds: ['quiz-2', 'quiz-2'] } },
    { expiresAt: new Date(0).toISOString() }, { expiresAt: undefined }, { revoked: true }, { status: 'revoked' },
    { url: 'javascript:alert(1)' },
  ])('rejects legacy, stale, partial, expired, revoked, or unsafe-link metadata: %j', patch => {
    expect(buildContext(deps({ latestStudentPreviewShare: share(patch) })).canPreviewCurrentAssignment).toBe(false);
  });
  it('rejects resources known to be modified after the link was created', () => {
    const modified = { ...resources[1], updatedAt: new Date().toISOString() };
    expect(buildContext(deps({ history: [resources[0], modified], generatedContent: modified })).canPreviewCurrentAssignment).toBe(false);
  });
  it('uses top-level resource IDs only with independently ready contents metadata', () => {
    const latest = share({ resourceIds: ['note-1', 'quiz-2'], deliverySummary: { contentsStatus: 'ready', resourceCount: 2 } });
    expect(buildContext(deps({ latestStudentPreviewShare: latest })).canPreviewCurrentAssignment).toBe(true);
  });
});

describe('private completion workspace ownership', () => {
  it('stays stable as generation commits outputs, plans, grade, and busy state', () => {
    const d = deps(), original = buildContext(d).commandWorkspaceToken;
    expect(original).toMatch(/^cmd-workspace-[a-z0-9]+$/);
    Object.assign(d, { history: [...resources], generatedContent: { ...resources[1] }, activeBlueprint: { resourcePlan: [] },
      fullPackRun: { status: 'ready' }, isProcessing: true, gradeLevel: '8th Grade' });
    expect(buildContext(d).commandWorkspaceToken).toBe(original);
    expect(original).not.toContain('PRIVATE_SOURCE');
  });
  it.each(['inputText', 'isTeacherMode', 'isStudentLinkMode', 'isParentMode', 'isIndependentMode'])
  ('invalidates when the source or role boundary changes: %s', field => {
    const d = deps(), original = buildContext(d).commandWorkspaceToken;
    d[field] = field === 'inputText' ? 'PRIVATE_REPLACEMENT' : !d[field];
    expect(buildContext(d).commandWorkspaceToken).not.toBe(original);
  });
  it('distinguishes workspace import and independent owners even when resources match', () => {
    const d = deps(), original = buildContext(d).commandWorkspaceToken;
    d.canvasRecoveryCurrentIdRef.current = 'another-import';
    const imported = buildContext(d).commandWorkspaceToken;
    expect(imported).not.toBe(original);
    d._alloCmdCtxRef = { current: null };
    expect(buildContext(d).commandWorkspaceToken).not.toBe(imported);
  });
});

describe('reviewed Blueprint reference ownership', () => {
  it('accepts only the current Blueprint object and rejects an old or copied plan', () => {
    const blueprint = { resourcePlan: [{ tool: 'quiz' }] };
    const d = deps({ activeBlueprint: blueprint }), current = buildContext(d);
    expect(current.isCurrentBlueprint(blueprint)).toBe(true);
    expect(current.isCurrentBlueprint({ resourcePlan: [{ tool: 'quiz' }] })).toBe(false);
    const replacement = { resourcePlan: [{ tool: 'note-taking' }] };
    d.activeBlueprint = replacement;
    const changed = buildContext(d);
    expect(changed.isCurrentBlueprint(blueprint)).toBe(false);
    expect(changed.isCurrentBlueprint(replacement)).toBe(true);
  });
  it('does not accept a reference when there is no current Blueprint', () => {
    const c = buildContext(deps({ activeBlueprint: null }));
    expect(c.isCurrentBlueprint(null)).toBe(false);
    expect(c.isCurrentBlueprint({ resourcePlan: [] })).toBe(false);
  });
});
