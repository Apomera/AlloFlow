import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let AC, Chat;
beforeAll(() => {
  window.React = global.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('allo_commands_module.js'); loadAlloModule('udl_chat_module.js');
  AC = window.AlloModules.AlloCommands; Chat = window.AlloModules.UdlChat;
});
afterEach(() => { window.AlloModules.AlloCommands = AC; });
function harness({ realRouting = false } = {}) {
  let messages = [];
  const ctx = { isTeacherMode: true, commandScopeToken: 'scope-1', commandWorkspaceToken: 'workspace-1', commandGradeLevel: '6th Grade', commandResourceCount: 4,
    hasSourceText: true, hasSourceOrAnalysis: true, hasActiveBlueprint: true,
    startLessonFlow: vi.fn(), planFullPack: vi.fn(), generateQuiz: vi.fn(), generateNoteTaking: vi.fn(),
    generateSimplified: vi.fn(), generateGlossary: vi.fn(), generateSentenceFrames: vi.fn(), generateAnchorChart: vi.fn(),
    runBlueprint: vi.fn(), openUdlGuide: vi.fn(), copyBlueprintDiagnostics: vi.fn(async () => true),
    callGemini: vi.fn(() => { throw Error('Unexpected AI route'); }) };
  const option = { commandId: 'run_lesson_blueprint', label: 'Generate the reviewed lesson', params: {},
    reason: 'A lesson plan is ready.', effect: 'Generates the reviewed plan.' };
  const api = realRouting ? AC : { ...AC, detectNavigationIntent: () => null,
    routeUtterance: vi.fn(async () => ({ preview: true, commandId: option.commandId, label: option.label, params: {} })),
    getCommandSuggestions: vi.fn(() => [option]), validateCommandSuggestion: vi.fn(() => ({ ok: true, params: {} })),
    runCommandById: vi.fn(async () => ({ handled: true, ok: true, narration: 'Ready' })),
    getCommandContract: () => ({ params: [] }) };
  window.AlloModules.AlloCommands = api;
  const deps = { _alloCmdCtx: () => ctx, _botCommandPlanningRef: { current: { serial: 0 } }, _pendingBotCmdRef: { current: null },
    _pendingBotPlanRef: { current: null }, _planRunRef: { current: { running: false } }, _planUndoRef: { current: null }, lastIntentSnapshotRef: { current: null },
    setActiveView: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), setInputText: vi.fn(), setUdlInput: vi.fn(), setIsChatProcessing: vi.fn(),
    setUdlMessages: update => { messages = typeof update === 'function' ? update(messages) : update; }, udlMessages: [], udlInput: '',
    _sendUdlToChat: vi.fn(), answerUdlQuestion: vi.fn(async () => ({ ok: true })), inputText: 'PRIVATE SOURCE CANARY',
    generatedContent: {}, history: [], activeView: 'input', t: () => '' };
  const send = input => { deps.udlMessages = messages; return Chat.planAndSendUdlMessage(input, deps); };
  return { ctx, api, deps, messages: () => messages, last: () => messages.at(-1), send, clear: () => { messages = []; },
    action: (action, fields = {}) => ({ action, requestId: deps._pendingBotCmdRef.current?.id, ...fields }),
    current: () => messages.slice().reverse().find(m => m.operationId) };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function running(h) {
  let complete, progress;
  h.api.runCommandById.mockImplementation(async ctx => {
    progress = ctx.onCommandProgress;
    progress({ phase: 'preparing-tools', phaseStartedAt: Date.now(), diagnosticId: 'load-attempt-1' });
    return { handled: true, ok: true, pending: true, narration: 'Preparing the selected plan',
      completion: new Promise(resolve => { complete = resolve; }) };
  });
  await h.send('run the blueprint');
  await h.send(h.action('command-choice', { value: '__allo_do' }));
  return { progress: value => progress(value), finish: async value => { complete(value); await flush(); } };
}
describe('AlloBot context and focused clarification integration', () => {
  it('shows only bounded context metadata, never the private source or scope', async () => {
    const h = harness(); await h.send('run the blueprint');
    expect(h.last().commandContextSummary).toEqual({ source: 'current', grade: 'Grade 6', plan: 'blueprint', resourceCount: 4 });
    expect(JSON.stringify(h.messages())).not.toMatch(/PRIVATE SOURCE CANARY|scope-1|commandScopeToken/);
  });
  it('clarifies an actual vague request without AI or execution', async () => {
    const h = harness({ realRouting: true }); await h.send('help me with this');
    expect(h.last().commandClarification.choices.map(c => c.id)).toEqual(['lesson', 'resource', 'advice']);
    expect(h.ctx.startLessonFlow).not.toHaveBeenCalled(); expect(h.ctx.callGemini).not.toHaveBeenCalled();
    await h.send('yes'); expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();
    expect(h.current().commandClarification).toBeTruthy();
  });
  it('choosing lesson offers current actions but still requires confirmation', async () => {
    const h = harness({ realRouting: true }); await h.send('help me with this');
    const old = h.action('command-clarify', { choiceId: 'lesson' }); await h.send(old);
    expect(h.last().commandOptions[0].commandId).toBe('create_lesson');
    expect(h.ctx.startLessonFlow).not.toHaveBeenCalled(); await h.send(old);
    expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();
    await h.send(h.action('command-option', { commandId: 'create_lesson' }));
    expect(h.ctx.startLessonFlow).toHaveBeenCalledOnce();
  });
  it('choosing resource shows resource actions and never starts a whole lesson', async () => {
    const h = harness({ realRouting: true }); await h.send('help me with this');
    await h.send(h.action('command-clarify', { choiceId: 'resource' }));
    expect(h.last().commandOptions).toHaveLength(5);
    expect(h.last().commandOptions.map(c => c.commandId)).not.toContain('create_lesson');
    expect(h.ctx.generateQuiz).not.toHaveBeenCalled(); expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();
  });
  it('summarizes a specified new topic and grade instead of reusing workspace context', async () => {
    const h = harness({ realRouting: true }); await h.send('build a lesson about volcanoes for grade 8');
    expect(h.last().commandContextSummary).toEqual({ source: 'none', grade: 'Grade 8', plan: 'none', resourceCount: 0, newLesson: true });
    expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();
  });
  it('advice sends only the original question through ordinary chat', async () => {
    const h = harness({ realRouting: true }); await h.send('help me with this');
    await h.send(h.action('command-clarify', { choiceId: 'advice' }));
    expect(h.deps.answerUdlQuestion).toHaveBeenCalledWith('help me with this');
    expect(h.ctx.callGemini).not.toHaveBeenCalled(); expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();
  });
  it('refreshes a changed-source clarification and rejects old or cleared controls', async () => {
    const h = harness({ realRouting: true }); await h.send('help me with this');
    const old = h.action('command-clarify', { choiceId: 'lesson' }); h.ctx.commandScopeToken = 'scope-2'; await h.send(old);
    expect(h.last().text).toMatch(/changed/); expect(h.last().operationId).not.toBe(old.requestId);
    await h.send(old); expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();
    const current = h.action('command-clarify', { choiceId: 'advice' }); h.clear(); await h.send(current);
    expect(h.deps.answerUdlQuestion).not.toHaveBeenCalled();
  });
});
describe('AlloBot same-card progress and reviewed recovery', () => {
  it('updates one pending card through tools, generation, and completion', async () => {
    const h = harness(), run = await running(h);
    expect(h.current().commandProgress.phase).toBe('preparing-tools');
    expect(h.current().text).toBe('Working on: Generate the reviewed lesson');
    expect(h.messages().filter(m => m.operationStatus === 'pending')).toHaveLength(1);
    run.progress({ phase: 'generating', phaseStartedAt: Date.now(), diagnosticId: 'load-attempt-1' });
    expect(h.current().commandProgress.phase).toBe('generating');
    await run.finish({ handled: true, ok: true, narration: 'Lesson ready' });
    expect(h.current().operationStatus).toBe('success'); expect(h.current().commandProgress).toBeUndefined();
    run.progress({ phase: 'preparing-tools', diagnosticId: 'late-attempt' });
    expect(h.current().operationStatus).toBe('success');
  });
  it('rejects unrecognized phases and unsafe correlation ids', async () => {
    const h = harness(), run = await running(h);
    run.progress({ phase: 'generating', diagnosticId: 'PRIVATE SOURCE CANARY\n', source: 'PRIVATE SOURCE CANARY' });
    run.progress({ phase: 'made-up', diagnosticId: 'unknown' });
    expect(h.current().commandProgress.diagnosticId).toBe('load-attempt-1');
    expect(h.current().commandProgress.phase).toBe('generating');
    expect(JSON.stringify(h.messages())).not.toContain('PRIVATE SOURCE CANARY');
    await run.finish({ handled: true, ok: true, narration: 'Ready' });
  });
  it('failure exposes bounded recovery; retry opens a new review without execution', async () => {
    const h = harness(), run = await running(h); await run.finish({ handled: true, ok: false, narration: 'Tools unavailable' });
    const recovery = h.current().commandRecovery;
    expect(recovery).toEqual({ requestId: h.current().operationId, canRetry: true, canCopyDiagnostics: true });
    await h.send({ action: 'command-retry', requestId: recovery.requestId });
    expect(h.current().operationStatus).toBe('review'); expect(h.current().text).toMatch(/Nothing has restarted/);
    expect(h.api.runCommandById).toHaveBeenCalledOnce();
    await h.send({ action: 'command-retry', requestId: recovery.requestId });
    expect(h.api.runCommandById).toHaveBeenCalledOnce();
    await h.send(h.action('command-choice', { value: '__allo_do' }));
    expect(h.api.runCommandById).toHaveBeenCalledTimes(2);
  });
  it('copies only the stored attempt id, without retrying or accepting injected ids', async () => {
    const h = harness(), run = await running(h); await run.finish({ handled: true, ok: false, narration: 'Load failed' });
    await h.send({ action: 'command-diagnostics', requestId: h.current().operationId, diagnosticId: 'injected' });
    expect(h.ctx.copyBlueprintDiagnostics).toHaveBeenCalledWith('load-attempt-1');
    expect(h.api.runCommandById).toHaveBeenCalledOnce(); expect(h.last().text).toMatch(/copied/);
  });
  it('does not use recovery controls after another offer or clearing chat', async () => {
    const h = harness(), run = await running(h); await run.finish({ handled: true, ok: false, narration: 'Load failed' });
    const old = h.current().operationId; await h.send('run the blueprint');
    await h.send({ action: 'command-diagnostics', requestId: old }); await h.send({ action: 'command-retry', requestId: old });
    expect(h.ctx.copyBlueprintDiagnostics).not.toHaveBeenCalled(); expect(h.api.runCommandById).toHaveBeenCalledOnce();
    h.clear(); await h.send({ action: 'command-retry', requestId: old }); expect(h.messages()).toEqual([]);
  });
  it('revalidates retry availability and never restarts unavailable work', async () => {
    const h = harness(), run = await running(h); await run.finish({ handled: true, ok: false, narration: 'Load failed' });
    const id = h.current().operationId; h.api.validateCommandSuggestion.mockReturnValue({ ok: false, reasonCode: 'unavailable' });
    await h.send({ action: 'command-retry', requestId: id });
    expect(h.api.runCommandById).toHaveBeenCalledOnce(); expect(h.last().text).toMatch(/not available/);
  });
  it('allows review navigation during work without losing duplicate-work protection', async () => {
    const h = harness(), run = await running(h);
    h.api.getCommandSuggestions.mockReturnValue([{ commandId: 'open_history', label: 'History', params: {} }]);
    h.api.runCommandById.mockResolvedValue({ handled: true, ok: true, narration: 'History open' });
    await h.send('open history'); await h.send(h.action('command-choice', { value: '__allo_do' }));
    expect(h.api.runCommandById).toHaveBeenCalledTimes(2); expect(h.current().operationStatus).toBe('success');
    h.api.getCommandSuggestions.mockReturnValue([{ commandId: 'run_lesson_blueprint', label: 'Generate plan', params: {} }]);
    await h.send('run the blueprint'); await h.send(h.action('command-choice', { value: '__allo_do' }));
    expect(h.api.runCommandById).toHaveBeenCalledTimes(2); expect(h.last().text).toMatch(/still working/);
    await run.finish({ handled: true, ok: true, narration: 'Original finished' });
    await h.send(h.action('command-choice', { value: '__allo_do' })); expect(h.api.runCommandById).toHaveBeenCalledTimes(3);
  });
  it('a late parameter request cannot overwrite a newer offer', async () => {
    const h = harness(); let finish;
    h.api.runCommandById.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await h.send('run the blueprint'); const work = h.send(h.action('command-choice', { value: '__allo_do' }));
    await h.send('show current actions'); const current = h.deps._pendingBotCmdRef.current;
    finish({ handled: true, ok: false, needsInput: true, narration: 'Choose a parameter' }); await work;
    expect(h.deps._pendingBotCmdRef.current).toBe(current); expect(h.current().operationId).toBe(current.id);
  });
  it('a blocked work click leaves the other visible alternatives usable', async () => {
    const h = harness(), run = await running(h);
    h.api.getCommandSuggestions.mockReturnValue([
      { commandId: 'run_lesson_blueprint', label: 'Generate plan', params: {} },
      { commandId: 'open_history', label: 'History', params: {} },
    ]);
    await h.send('help with my lesson'); await h.send(h.action('command-option', { commandId: 'run_lesson_blueprint' }));
    expect(h.deps._pendingBotCmdRef.current.suggestions).toHaveLength(2);
    h.api.runCommandById.mockResolvedValue({ handled: true, ok: true, narration: 'History open' });
    await h.send(h.action('command-option', { commandId: 'open_history' }));
    expect(h.api.runCommandById).toHaveBeenCalledTimes(2);
    expect(h.api.runCommandById.mock.calls[1][1]).toBe('open_history');
    await run.finish({ handled: true, ok: true, narration: 'Original finished' });
  });
  it('partial results cannot retry the whole plan, and late completion cannot resurrect cleared chat', async () => {
    const h = harness(), run = await running(h); await run.finish({ handled: true, ok: false, partial: true, narration: 'Review unfinished rows' });
    expect(h.current().commandRecovery?.canRetry).not.toBe(true);
    await h.send({ action: 'command-retry', requestId: h.current().operationId }); expect(h.api.runCommandById).toHaveBeenCalledOnce();
    const other = harness(), runningOther = await running(other); other.clear();
    await runningOther.finish({ handled: true, ok: false, narration: 'Late failure' }); expect(other.messages()).toEqual([]);
  });
});

const nextActions = () => [
  { commandId: 'open_document_builder', label: 'Review lesson', effect: 'Review current resources.', params: {} },
  { commandId: 'preview_assignment_as_student', label: 'Preview as student', effect: 'Open the matching existing student link.', params: {} },
  { commandId: 'open_project_save', label: 'Save project', effect: 'Open the project save dialog.', params: {} },
];
function withCompletion(h) {
  h.api.getCommandCompletionActions = vi.fn((_ctx, commandId, result) => commandId === 'run_lesson_blueprint' && result.ok && result.status === 'completed' && !result.pending && !result.partial ? nextActions() : []);
  return h;
}
describe('AlloBot completion handoff ownership and readiness', () => {
  it('waits for committed resource state before offering source-free next steps', async () => {
    const h = withCompletion(harness()); let commit;
    h.ctx.waitForCommandState = vi.fn(() => new Promise(resolve => { commit = resolve; }));
    const run = await running(h); await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Lesson ready' });
    expect(h.current().operationStatus).toBe('success'); expect(h.current().commandCompletion).toBeUndefined();
    h.ctx.commandResourceCount = 6; h.ctx.commandScopeToken = 'committed-scope'; commit(); await flush();
    expect(h.current().commandCompletion.actions.map(x => x.commandId)).toEqual(nextActions().map(x => x.commandId));
    expect(h.current().commandContextSummary.resourceCount).toBe(6);
    expect(h.api.runCommandById).toHaveBeenCalledOnce();
    expect(JSON.stringify(h.current())).not.toMatch(/PRIVATE SOURCE CANARY|committed-scope|workspace-1|commandWorkspaceToken|params|completionPromise/);
  });
  it.each(nextActions().map(action => action.commandId))('runs only the explicitly selected native step %s', async commandId => {
    const h = withCompletion(harness()), run = await running(h);
    await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    const old = { action: 'command-complete', requestId: h.current().operationId, commandId, params: { injected: 'ignored' } };
    const abort = vi.fn(); h.deps._botCommandPlanningRef.current = { controller: { abort }, serial: 9 };
    h.api.runCommandById.mockResolvedValue({ handled: true, ok: true, narration: 'Native dialog opened' });
    await h.send(old); await h.send(old); await flush();
    expect(h.api.runCommandById).toHaveBeenCalledTimes(2);
    expect(h.api.runCommandById.mock.calls[1][1]).toBe(commandId);
    expect(h.api.runCommandById.mock.calls[1][2]).toEqual({});
    expect(abort).toHaveBeenCalledOnce();
    expect(h.current().commandCompletion).toBeUndefined();
  });
  it('rejects source changes, retires the old handoff, and never guesses a replacement action', async () => {
    const h = withCompletion(harness()), run = await running(h);
    await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    const id = h.current().operationId; h.ctx.commandScopeToken = 'new-source';
    await h.send({ action: 'command-complete', requestId: id, commandId: 'open_project_save' });
    expect(h.api.runCommandById).toHaveBeenCalledOnce(); expect(h.last().text).toMatch(/changed/);
    expect(h.current().commandCompletion).toBeUndefined();
  });
  it('rechecks preview readiness even if the workspace token did not change', async () => {
    const h = withCompletion(harness()), run = await running(h);
    await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    const id = h.current().operationId;
    h.api.getCommandCompletionActions.mockReturnValue(nextActions().filter(x => x.commandId !== 'preview_assignment_as_student'));
    await h.send({ action: 'command-complete', requestId: id, commandId: 'preview_assignment_as_student' });
    expect(h.api.runCommandById).toHaveBeenCalledOnce(); expect(h.last().text).toMatch(/changed/);
  });
  it('a newer offer or cleared chat cannot execute an old completion control', async () => {
    const h = withCompletion(harness()), run = await running(h);
    await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    const old = { action: 'command-complete', requestId: h.current().operationId, commandId: 'open_document_builder' };
    await h.send('help me build a lesson'); const current = h.deps._pendingBotCmdRef.current;
    await h.send(old); expect(h.deps._pendingBotCmdRef.current).toBe(current);
    h.clear(); await h.send(old); expect(h.messages()).toEqual([]); expect(h.api.runCommandById).toHaveBeenCalledOnce();
  });
  it('a late completion handoff cannot resurrect cleared chat or replace a newer review', async () => {
    const h = withCompletion(harness()); let commit;
    h.ctx.waitForCommandState = () => new Promise(resolve => { commit = resolve; });
    const run = await running(h); await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    h.clear(); commit(); await flush(); expect(h.messages()).toEqual([]);
    const other = withCompletion(harness()); let otherCommit;
    other.ctx.waitForCommandState = () => new Promise(resolve => { otherCommit = resolve; });
    const otherRun = await running(other); await otherRun.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    await other.send('help me build a lesson'); const current = other.deps._pendingBotCmdRef.current;
    otherCommit(); await flush(); expect(other.current().operationStatus).toBe('review');
    expect(other.deps._pendingBotCmdRef.current).toBe(current); expect(other.current().commandCompletion).toBeUndefined();
  });
  it('does not attach an old completed job to a workspace switched during the output-commit wait', async () => {
    const h = withCompletion(harness()); let commit;
    h.ctx.waitForCommandState = () => new Promise(resolve => { commit = resolve; });
    const run = await running(h); await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Original lesson ready' });
    h.ctx.commandWorkspaceToken = 'different-workspace'; h.ctx.commandScopeToken = 'different-workspace-scope';
    commit(); await flush(); expect(h.current().commandCompletion).toBeUndefined();
    expect(h.api.getCommandCompletionActions).not.toHaveBeenCalled(); expect(h.api.runCommandById).toHaveBeenCalledOnce();
  });
  it('omits stale handoffs with a legacy context that cannot distinguish output commits from workspace switches', async () => {
    const h = withCompletion(harness()); delete h.ctx.commandWorkspaceToken; let commit;
    h.ctx.waitForCommandState = () => new Promise(resolve => { commit = resolve; });
    const run = await running(h); await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    h.ctx.commandScopeToken = 'changed'; commit(); await flush(); expect(h.current().commandCompletion).toBeUndefined();
  });
  it('does not offer completion steps for pending, partial or failed work', async () => {
    for (const result of [{ handled: true, ok: false, partial: true }, { handled: true, ok: false }, { handled: true, ok: false, cancelled: true }]) {
      const h = withCompletion(harness()), run = await running(h);
      expect(h.current().commandCompletion).toBeUndefined(); await run.finish({ ...result, narration: 'Not complete' });
      expect(h.current().commandCompletion).toBeUndefined(); expect(h.api.getCommandCompletionActions).not.toHaveBeenCalled();
    }
  });
  it('swallows fabricated next-step ids without dispatching anything', async () => {
    const h = withCompletion(harness()), run = await running(h);
    await run.finish({ handled: true, ok: true, status: 'completed', narration: 'Ready' });
    await h.send({ action: 'command-complete', requestId: h.current().operationId, commandId: 'clear_workspace' });
    expect(h.api.runCommandById).toHaveBeenCalledOnce(); expect(h.current().commandCompletion.actions).toHaveLength(3);
  });
  it('uses the actual completion ranker and native save command without AI or automatic downloads', async () => {
    const h = harness({ realRouting: true });
    Object.assign(h.ctx, { contentLoaded: true, openExportPreview: vi.fn(), canSaveTeacherProject: true,
      openProjectSave: vi.fn(() => true), canPreviewStudentAssignment: true, canPreviewCurrentAssignment: true,
      previewStudentAssignment: vi.fn(() => true) });
    h.ctx.runBlueprint.mockResolvedValue({ ok: true, status: 'completed' });
    await h.send('run the blueprint'); await h.send(h.action('command-choice', { value: '__allo_do' })); await flush();
    expect(h.current().commandCompletion.actions.map(action => action.commandId)).toEqual(nextActions().map(action => action.commandId));
    expect(h.ctx.openProjectSave).not.toHaveBeenCalled(); expect(h.ctx.openExportPreview).not.toHaveBeenCalled();
    await h.send({ action: 'command-complete', requestId: h.current().operationId, commandId: 'open_project_save' });
    expect(h.ctx.openProjectSave).toHaveBeenCalledOnce(); expect(h.ctx.previewStudentAssignment).not.toHaveBeenCalled();
    expect(h.ctx.callGemini).not.toHaveBeenCalled(); expect(h.current().commandCompletion).toBeUndefined();
  });
  it('the native lesson-card approval uses the same completion lifecycle and rejects stale plan references', async () => {
    const h = withCompletion(harness()), blueprint = { resourcePlan: [{ uiId: 'plan-row-1' }] };
    h.ctx.isCurrentBlueprint = plan => plan === blueprint;
    let resolveInterpretation;
    h.api.routeUtterance.mockImplementation(() => new Promise(resolve => { resolveInterpretation = resolve; }));
    const oldTurn = h.send('an earlier ambiguous request');
    const oldInterpretation = h.deps._botCommandPlanningRef.current;
    const abort = vi.spyOn(oldInterpretation.controller, 'abort');
    let finish;
    h.api.runCommandById.mockImplementation(async ctx => {
      ctx.onCommandProgress({ phase: 'preparing-tools', diagnosticId: 'ml-native-1' });
      return { handled: true, ok: true, pending: true, completion: new Promise(resolve => { finish = resolve; }) };
    });
    await h.send({ action: 'command-approved-blueprint', blueprint: { ...blueprint } }); expect(h.api.runCommandById).not.toHaveBeenCalled();
    expect(abort).not.toHaveBeenCalled();
    await h.send({ action: 'command-approved-blueprint', blueprint });
    expect(abort).toHaveBeenCalledOnce(); expect(h.deps._botCommandPlanningRef.current).not.toBe(oldInterpretation);
    resolveInterpretation({ preview: true, commandId: 'generate_quiz', label: 'Old interpretation', params: {} }); await oldTurn;
    expect(h.deps._pendingBotCmdRef.current).toBeNull();
    expect(h.current().commandProgress.phase).toBe('preparing-tools'); expect(h.api.runCommandById).toHaveBeenCalledOnce();
    await h.send({ action: 'command-approved-blueprint', blueprint }); expect(h.api.runCommandById).toHaveBeenCalledOnce();
    finish({ handled: true, ok: true, status: 'completed', narration: 'Native lesson ready' }); await flush();
    expect(h.current().operationStatus).toBe('success'); expect(h.current().commandCompletion.actions).toHaveLength(3);
    expect(h.ctx.callGemini).not.toHaveBeenCalled(); expect(JSON.stringify(h.messages())).not.toContain('resourcePlan');
  });
});
