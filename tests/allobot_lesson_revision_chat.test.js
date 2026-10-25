import { beforeAll, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let Chat;
beforeAll(() => {
  global.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('udl_chat_module.js');
  Chat = window.AlloModules.UdlChat;
});
const review = () => ({ ok: true, review: { id: 'private-review-1', instruction: 'Simplify directions',
  changes: [{ resourceId: 'quiz-1', resourceTitle: 'Discussion check', path: '/data/0/question', label: 'Question 1',
    before: 'PRIVATE BEFORE', after: 'PRIVATE AFTER' }], warnings: ['Review the revised wording before using it.'] } });
function harness() {
  let messages = [];
  const ctx = { canReviseLesson: true, commandWorkspaceToken: 'workspace-1', commandScopeToken: 'scope-1', isTeacherMode: true,
    generationBusy: false, canSaveTeacherProject: true,
    getLessonRevisionResources: vi.fn(() => [{ id: 'quiz-1', title: 'Discussion check', type: 'quiz', supported: true, current: true, fieldCount: 3 },
      { id: 'faq-1', title: 'Help', type: 'faq', supported: true, fieldCount: 2 },
      { id: 'image-1', title: 'Photo', type: 'image', supported: false, reason: 'Use the image editor.' }]),
    prepareLessonRevision: vi.fn(async () => review()),
    applyLessonRevision: vi.fn(() => ({ ok: true, undoId: 'private-undo-1', changedCount: 1, resourceIds: ['quiz-1'] })),
    undoLessonRevision: vi.fn(() => ({ ok: true })), discardLessonRevision: vi.fn(),
    openLessonRevisionPreview: vi.fn(() => true), openProjectSave: vi.fn(() => true) };
  const deps = { _alloCmdCtx: () => ctx, _pendingBotCmdRef: { current: null }, _botCommandPlanningRef: { current: { serial: 0 } },
    _pendingBotPlanRef: { current: null }, _planRunRef: { current: { running: false } }, _planUndoRef: { current: null },
    setUdlMessages: update => { messages = typeof update === 'function' ? update(messages) : update; },
    setUdlInput: vi.fn(), setIsChatProcessing: vi.fn(), _sendUdlToChat: vi.fn(), udlMessages: [], udlInput: '', inputText: 'SOURCE CANARY', t: () => '' };
  const send = input => { deps.udlMessages = messages; return Chat.planAndSendUdlMessage(input, deps); };
  const current = () => messages.slice().reverse().find(message => message.operationId);
  return { ctx, deps, send, messages: () => messages, current, clear: () => { messages = []; },
    action: (action, values = {}) => ({ action: 'lesson-revision-' + action, requestId: current()?.operationId,
      reviewToken: current()?.lessonRevision?.reviewToken, undoToken: current()?.lessonRevision?.undoToken, pendingToken: current()?.lessonRevision?.pendingToken, ...values }) };
}
const start = async h => { await h.send({ action: 'lesson-revision-start' }); };
const prepare = async h => { await h.send(h.action('prepare', { resourceIds: ['quiz-1'], instruction: 'Simplify directions' })); };
const apply = async h => { await prepare(h); await h.send(h.action('apply')); };

describe('AlloBot existing lesson revision controller', () => {
  it('starts without AI or generation and selects exactly the current editable resource', async () => {
    const h = harness(); await start(h);
    expect(h.current().lessonRevision.selectedIds).toEqual(['quiz-1']);
    expect(h.current().lessonRevision.resources[2].supported).toBe(false);
    expect(h.ctx.prepareLessonRevision).not.toHaveBeenCalled();
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
    expect(h.deps._sendUdlToChat).not.toHaveBeenCalled();
  });
  it.each(['revise existing lesson', 'please edit my saved lesson', 'improve current materials'])('supports explicit typed entry: %s', async text => {
    const h = harness(); await h.send(text);
    expect(h.current().operationKind).toBe('lesson-revision');
    expect(h.ctx.prepareLessonRevision).not.toHaveBeenCalled();
  });
  it.each(['revise this lesson to simplify the directions', 'can you help me improve my quiz: add one question', 'modify this activity to use shorter prompts'])('captures an explicit natural revision as a draft: %s', async text => {
    const h = harness(); await h.send(text);
    expect(h.current().lessonRevision.instruction).toBe(text);
    expect(h.ctx.prepareLessonRevision).not.toHaveBeenCalled(); expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
    expect(h.deps._sendUdlToChat).not.toHaveBeenCalled();
  });
  it('selects an explicitly named resource type and asks for selection if that type is ambiguous', async () => {
    const h = harness(); h.ctx.getLessonRevisionResources.mockReturnValue([
      { id: 'faq-1', type: 'faq', title: 'FAQ', supported: true, current: true },
      { id: 'quiz-1', type: 'quiz', title: 'Quiz', supported: true },
    ]);
    await h.send('revise my quiz: simplify the wording'); expect(h.current().lessonRevision.selectedIds).toEqual(['quiz-1']);
    h.ctx.getLessonRevisionResources.mockReturnValue([
      { id: 'quiz-1', type: 'quiz', title: 'Quiz 1', supported: true }, { id: 'quiz-2', type: 'quiz', title: 'Quiz 2', supported: true },
    ]);
    await h.send('revise my quiz: simplify the wording'); expect(h.current().lessonRevision.selectedIds).toEqual([]);
  });
  it.each(['edit this', 'how can I revise my lesson?', 'is it possible to improve this activity?'])('preserves manual edit aliases and ordinary questions: %s', async text => {
    const h = harness(); await h.send(text);
    expect(h.ctx.getLessonRevisionResources).not.toHaveBeenCalled(); expect(h.current()?.operationKind).not.toBe('lesson-revision');
  });
  it('fails closed for a student or unavailable context', async () => {
    const h = harness(); h.ctx.canReviseLesson = false; await start(h);
    expect(h.ctx.getLessonRevisionResources).not.toHaveBeenCalled();
    expect(h.messages().at(-1).text).toMatch(/teacher lesson/);
    h.ctx.canReviseLesson = true; h.ctx.isStudentLinkMode = true; await start(h);
    expect(h.ctx.getLessonRevisionResources).not.toHaveBeenCalled();
  });
  it('blocks entry while generation or a workflow is active', async () => {
    const h = harness(); h.ctx.generationBusy = true; await start(h);
    expect(h.ctx.getLessonRevisionResources).not.toHaveBeenCalled();
    h.ctx.generationBusy = false; h.deps._planRunRef.current.running = true; await start(h);
    expect(h.ctx.getLessonRevisionResources).not.toHaveBeenCalled();
  });
  it('retires an older pending interpretation and plan when revision starts', async () => {
    const h = harness(), abort = vi.fn();
    h.deps._botCommandPlanningRef.current = { controller: { abort }, serial: 5 };
    h.deps._pendingBotCmdRef.current = { id: 'old' }; h.deps._pendingBotPlanRef.current = { id: 'old-plan' };
    await start(h);
    expect(abort).toHaveBeenCalledOnce(); expect(h.deps._botCommandPlanningRef.current.serial).toBe(6);
    expect(h.deps._pendingBotCmdRef.current).toBeNull(); expect(h.deps._pendingBotPlanRef.current).toBeNull();
  });
  it('prepares only explicitly selected IDs and keeps the proposal unapplied', async () => {
    const h = harness(); await start(h); await prepare(h);
    expect(h.ctx.prepareLessonRevision).toHaveBeenCalledWith(expect.objectContaining({ resourceIds: ['quiz-1'], instruction: 'Simplify directions' }));
    expect(h.current().lessonRevision.mode).toBe('review');
    expect(h.current().lessonRevision.changes[0].after).toBe('PRIVATE AFTER');
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
    expect(h.messages()).toHaveLength(1);
  });
  it.each([
    { resourceIds: [], instruction: 'Simplify' },
    { resourceIds: ['image-1'], instruction: 'Simplify' },
    { resourceIds: ['injected-resource'], instruction: 'Simplify' },
    { resourceIds: ['quiz-1'], instruction: '' },
    { resourceIds: ['quiz-1'], instruction: 'x'.repeat(4001) },
  ])('rejects invalid selection/instruction before sharing material (%j)', async request => {
    const h = harness(); await start(h); await h.send(h.action('prepare', request));
    expect(h.ctx.prepareLessonRevision).not.toHaveBeenCalled();
    expect(h.current().lessonRevision.mode).toBe('select'); expect(h.current().lessonRevision.error).toBeTruthy();
  });
  it('preserves selection and exact instruction after a provider failure', async () => {
    const h = harness(); h.ctx.prepareLessonRevision.mockRejectedValueOnce(Error('provider failed'));
    await start(h); await h.send(h.action('prepare', { resourceIds: ['faq-1'], instruction: '  Keep my wording where possible.  ' }));
    expect(h.current().lessonRevision).toMatchObject({ mode: 'select', selectedIds: ['faq-1'], instruction: '  Keep my wording where possible.  ' });
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
  });
  it('never accepts review or undo IDs supplied by the message', async () => {
    const h = harness(); await start(h); await prepare(h);
    await h.send(h.action('apply', { reviewId: 'injected' }));
    expect(h.ctx.applyLessonRevision).toHaveBeenCalledWith('private-review-1');
    await h.send(h.action('undo', { undoId: 'injected' }));
    expect(h.ctx.undoLessonRevision).toHaveBeenCalledWith('private-undo-1');
    expect(h.current().lessonRevision.mode).toBe('undone');
    expect(JSON.stringify(h.messages())).not.toMatch(/private-review-1|private-undo-1|SOURCE CANARY/);
  });
  it('applies once, then exposes native preview/save/undo without running them automatically', async () => {
    const h = harness(); await start(h); await prepare(h); const action = h.action('apply');
    await Promise.all([h.send(action), h.send(action)]);
    expect(h.ctx.applyLessonRevision).toHaveBeenCalledOnce();
    expect(h.current().lessonRevision.mode).toBe('applied'); expect(h.current().lessonRevision.canUndo).toBe(true);
    expect(h.ctx.openProjectSave).not.toHaveBeenCalled(); expect(h.ctx.openLessonRevisionPreview).not.toHaveBeenCalled();
    await h.send(h.action('preview', { resourceId: 'injected' })); expect(h.ctx.openLessonRevisionPreview).not.toHaveBeenCalled();
    await h.send(h.action('preview', { resourceId: 'quiz-1' })); expect(h.ctx.openLessonRevisionPreview).toHaveBeenCalledWith('quiz-1');
    await h.send(h.action('preview')); expect(h.ctx.openLessonRevisionPreview).toHaveBeenLastCalledWith(undefined);
    await h.send(h.action('save')); expect(h.ctx.openProjectSave).toHaveBeenCalledOnce();
  });
  it('does not apply stale actions after clearing chat or opening another operation', async () => {
    const h = harness(); await start(h); await prepare(h); const old = h.action('apply'); h.clear(); await h.send(old);
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
    await start(h); await prepare(h); const old2 = h.action('apply'); await start(h); await h.send(old2);
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(h.ctx.discardLessonRevision).toHaveBeenCalledWith('private-review-1');
  });
  it('invalidates a proposal when the workspace changes', async () => {
    const h = harness(); await start(h); await prepare(h); h.ctx.commandWorkspaceToken = 'workspace-2';
    await h.send(h.action('apply'));
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(h.current().operationStatus).toBe('closed');
  });
  it('cancels pending preparation and ignores its late result', async () => {
    const h = harness(); let finish;
    h.ctx.prepareLessonRevision.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await start(h); const preparing = prepare(h); await Promise.resolve(); await h.send(h.action('cancel'));
    const signal = h.ctx.prepareLessonRevision.mock.calls[0][0].signal;
    expect(signal.aborted).toBe(true); finish(review()); await preparing;
    expect(h.current().operationStatus).toBe('closed'); expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
  });
  it('does not resurrect a cleared conversation after preparation finishes', async () => {
    const h = harness(); let finish;
    h.ctx.prepareLessonRevision.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await start(h); const pending = prepare(h); await Promise.resolve(); h.clear(); finish(review()); await pending;
    expect(h.messages()).toEqual([]);
  });
  it('returns to selection after a stale apply without claiming success', async () => {
    const h = harness(); h.ctx.applyLessonRevision.mockReturnValueOnce({ ok: false, error: 'The selected question changed.' });
    await start(h); await apply(h);
    expect(h.current().lessonRevision.mode).toBe('select'); expect(h.current().lessonRevision.error).toMatch(/question changed/);
    expect(h.current().lessonRevision.canUndo).toBe(false);
  });
  it('keeps Undo available on a rejected conflict and consumes it once on success', async () => {
    const h = harness(); await start(h); await apply(h);
    h.ctx.undoLessonRevision.mockReturnValueOnce({ ok: false, error: 'Edited field changed.' });
    await h.send(h.action('undo')); expect(h.current().lessonRevision).toMatchObject({ mode: 'applied', canUndo: true });
    await h.send(h.action('undo')); await h.send(h.action('undo'));
    expect(h.ctx.undoLessonRevision).toHaveBeenCalledTimes(2); expect(h.current().lessonRevision).toMatchObject({ mode: 'undone', canUndo: false });
  });
  it('keeps before/after content outside ordinary AI chat and lesson-conversation handoff', async () => {
    const h = harness(); await start(h); await prepare(h);
    expect(h.messages().every(message => message.localOnly)).toBe(true);
    expect(window.AlloFlowChatPrivacy.recentMessages(h.messages())).toEqual([]);
    expect(Chat.buildLessonConversationHandoff(h.messages())).not.toMatch(/PRIVATE BEFORE|PRIVATE AFTER|Simplify directions/);
  });
});

const refined = (id = 'private-refined-review') => ({ ok: true, review: { id, instruction: 'Simplify directions and shorten question three.',
  changes: [...review().review.changes, { resourceId: 'quiz-1', resourceTitle: 'Discussion check', path: '/data/questions/2/question', label: 'Question 3', before: 'A long third question', after: 'A shorter third question' }], warnings: [] } });
async function proposalWithPriorUndo(h) {
  await start(h); await apply(h); const undo = h.action('undo');
  await h.send(h.action('edit')); await prepare(h);
  return undo;
}

describe('persistent last applied Undo across later proposal work', () => {
  it('keeps one prior Undo through selection, a new review, and preparation failure', async () => {
    const h = harness(); await start(h); await apply(h); const token = h.current().lessonRevision.undoToken;
    await h.send(h.action('edit')); expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: true, undoToken: token });
    await prepare(h); expect(h.current().lessonRevision).toMatchObject({ mode: 'review', canUndo: true, undoToken: token });
    await h.send(h.action('edit')); h.ctx.prepareLessonRevision.mockResolvedValueOnce({ ok: false, error: 'Try a narrower request.' });
    await prepare(h); expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: true, undoToken: token });
    await h.send(h.action('undo')); expect(h.ctx.undoLessonRevision).toHaveBeenCalledWith('private-undo-1');
  });
  it('keeps prior Undo after Stop and ignores a late new proposal', async () => {
    const h = harness(); await start(h); await apply(h); await h.send(h.action('edit')); let finish;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = prepare(h); await Promise.resolve(); const token = h.current().lessonRevision.undoToken;
    const signal = h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].signal;
    await h.send(h.action('stop'));
    expect(signal.aborted).toBe(true); expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: true, undoToken: token });
    finish(refined('late-new-review')); await pending;
    expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: true, undoToken: token });
    expect(h.ctx.discardLessonRevision).toHaveBeenCalledWith('late-new-review');
  });
  it('can Undo while preparing, invalidating the request and its late response', async () => {
    const h = harness(); await start(h); await apply(h); await h.send(h.action('edit')); let finish;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = prepare(h); await Promise.resolve(); const signal = h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].signal;
    expect(h.current().lessonRevision.canUndo).toBe(true);
    await h.send(h.action('undo')); expect(signal.aborted).toBe(true);
    expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: false, instruction: 'Simplify directions' });
    finish(refined('late-after-undo')); await pending;
    expect(h.current().lessonRevision.mode).toBe('select'); expect(h.ctx.applyLessonRevision).toHaveBeenCalledTimes(1);
    expect(h.ctx.discardLessonRevision).toHaveBeenCalledWith('late-after-undo');
  });
  it.each(['refine', 'question'])('can Undo during pending %s without reviving its old proposal', async mode => {
    const h = harness(); await proposalWithPriorUndo(h); let finish;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.send(h.action(mode, { instruction: 'Work with question three.' })); await Promise.resolve();
    const signal = h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].signal;
    await h.send(h.action('undo')); expect(signal.aborted).toBe(true);
    expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: false });
    finish(mode === 'refine' ? refined('late-refinement') : { ok: true, answer: 'Late answer that must not return.' }); await pending;
    expect(h.current().lessonRevision.mode).toBe('select'); expect(h.current().lessonRevision.answer).toBe('');
    expect(h.ctx.undoLessonRevision).toHaveBeenCalledOnce();
  });
  it('keeps unsent request text, selection and last Undo after an Undo conflict', async () => {
    const h = harness(); await start(h); await apply(h); await h.send(h.action('edit'));
    h.ctx.undoLessonRevision.mockReturnValueOnce({ ok: false, error: 'An edited field changed.' });
    await h.send(h.action('undo', { instruction: '  Keep this exact next request.  ', resourceIds: ['faq-1'], followupText: 'Shorten Q3 later.' }));
    expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: true, selectedIds: ['faq-1'], instruction: '  Keep this exact next request.  ', followupText: 'Shorten Q3 later.' });
    expect(h.ctx.prepareLessonRevision).toHaveBeenCalledTimes(1);
  });
  it('preserves reachable Undo on a same-workspace restart and retires it on explicit Close', async () => {
    const h = harness(); await start(h); await apply(h); const token = h.current().lessonRevision.undoToken;
    await start(h); expect(h.current().lessonRevision).toMatchObject({ mode: 'select', canUndo: true, undoToken: token });
    await h.send(h.action('cancel')); expect(h.ctx.discardLessonRevision).toHaveBeenLastCalledWith(undefined, { close: true });
    await start(h); expect(h.current().lessonRevision.canUndo).toBe(false);
  });
  it('does not let an old Undo control undo a newer successfully applied revision', async () => {
    const h = harness(); const oldUndo = await proposalWithPriorUndo(h);
    h.ctx.applyLessonRevision.mockReturnValueOnce({ ok: true, undoId: 'private-undo-2', changedCount: 1, resourceIds: ['quiz-1'] });
    await h.send(h.action('apply')); expect(h.current().lessonRevision.undoToken).not.toBe(oldUndo.undoToken);
    await h.send(oldUndo); expect(h.ctx.undoLessonRevision).not.toHaveBeenCalled();
    await h.send(h.action('undo')); expect(h.ctx.undoLessonRevision).toHaveBeenCalledWith('private-undo-2');
  });
});

describe('proposal-scoped questions and conversational refinement', () => {
  it('answers about the proposal without changing its review, token, or native material', async () => {
    const h = harness(); await start(h); await prepare(h); const before = JSON.stringify(h.current().lessonRevision.changes); const token = h.current().lessonRevision.reviewToken;
    h.ctx.prepareLessonRevision.mockResolvedValueOnce({ ok: true, answer: 'Question three now uses one clear verb. Apply or Undo are your choices.' });
    await h.send(h.action('question', { instruction: 'Why did you shorten question three?', reviewId: 'injected' }));
    const request = h.ctx.prepareLessonRevision.mock.calls.at(-1)[0];
    expect(request).toMatchObject({ reviewId: 'private-review-1', instruction: 'Why did you shorten question three?', mode: 'question' }); expect(request.resourceIds).toBeUndefined();
    expect(JSON.stringify(h.current().lessonRevision.changes)).toBe(before); expect(h.current().lessonRevision.reviewToken).toBe(token);
    expect(h.current().lessonRevision.answer).toContain('one clear verb'); expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(h.ctx.undoLessonRevision).not.toHaveBeenCalled();
    expect(window.AlloFlowChatPrivacy.recentMessages(h.messages())).toEqual([]); expect(Chat.buildLessonConversationHandoff(h.messages())).not.toContain('clear verb');
  });
  it('returns a full refined review while retaining other edits and the prior applied Undo', async () => {
    const h = harness(); await proposalWithPriorUndo(h); const oldToken = h.current().lessonRevision.reviewToken; const undoToken = h.current().lessonRevision.undoToken;
    h.ctx.prepareLessonRevision.mockResolvedValueOnce(refined());
    await h.send('Keep those edits but shorten question three.');
    expect(h.ctx.prepareLessonRevision.mock.calls.at(-1)[0]).toMatchObject({ reviewId: 'private-review-1', mode: 'refine', instruction: 'Keep those edits but shorten question three.' });
    expect(h.current().lessonRevision.changes).toHaveLength(2); expect(h.current().lessonRevision.reviewToken).not.toBe(oldToken);
    expect(h.current().lessonRevision.undoToken).toBe(undoToken); expect(h.ctx.applyLessonRevision).toHaveBeenCalledTimes(1);
    expect(h.ctx.getLessonRevisionResources).toHaveBeenCalledTimes(1);
  });
  it('refines a natural revise-this-lesson request against the active proposal instead of starting over', async () => {
    const h = harness(); await start(h); await prepare(h); h.ctx.prepareLessonRevision.mockResolvedValueOnce(refined());
    await h.send('revise this lesson to shorten question three');
    expect(h.ctx.getLessonRevisionResources).toHaveBeenCalledOnce(); expect(h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].mode).toBe('refine');
    expect(h.deps._sendUdlToChat).not.toHaveBeenCalled();
  });
  it.each(['Why did you shorten Q3?', 'Should Q3 be shorter?', 'Could you explain those edits?'])('treats advisory/question phrasing as read-only: %s', async text => {
    const h = harness(); await start(h); await prepare(h); h.ctx.prepareLessonRevision.mockResolvedValueOnce({ ok: true, answer: 'A scoped explanation.' });
    await h.send(text); expect(h.ctx.prepareLessonRevision.mock.calls.at(-1)[0]).toMatchObject({ mode: 'question', instruction: text });
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(h.deps._sendUdlToChat).not.toHaveBeenCalled();
  });
  it('treats a polite edit request as refinement and requires later explicit Apply', async () => {
    const h = harness(); await start(h); await prepare(h); h.ctx.prepareLessonRevision.mockResolvedValueOnce(refined());
    await h.send('Can you make Q3 shorter?'); expect(h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].mode).toBe('refine');
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
  });
  it.each(['Keep these changes', 'apply', 'yes', 'Undo'])('does not mutate or call a model for the acknowledgment/control reference: %s', async text => {
    const h = harness(); await start(h); await prepare(h); const count = h.ctx.prepareLessonRevision.mock.calls.length;
    await h.send(text); expect(h.ctx.prepareLessonRevision).toHaveBeenCalledTimes(count);
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(h.ctx.undoLessonRevision).not.toHaveBeenCalled(); expect(h.deps._sendUdlToChat).not.toHaveBeenCalled();
  });
  it('clarifies an ambiguous follow-up locally and uses the stored text after a choice', async () => {
    const h = harness(); await start(h); await prepare(h); await h.send('Shorter?');
    expect(h.current().lessonRevision.needsFollowupChoice).toBe(true); expect(h.ctx.prepareLessonRevision).toHaveBeenCalledTimes(1);
    h.ctx.prepareLessonRevision.mockResolvedValueOnce(refined());
    await h.send(h.action('followup-choice', { mode: 'refine', instruction: 'Injected different request' }));
    expect(h.ctx.prepareLessonRevision.mock.calls.at(-1)[0]).toMatchObject({ mode: 'refine', instruction: 'Shorter?' });
  });
  it('uses a recent scoped answer as the referent for a suggestion, otherwise asks locally', async () => {
    const h = harness(); await start(h); await prepare(h); await h.send('Do what you just suggested');
    expect(h.current().lessonRevision.needsFollowupChoice).toBe(true); expect(h.ctx.prepareLessonRevision).toHaveBeenCalledTimes(1);
    h.ctx.prepareLessonRevision.mockResolvedValueOnce({ ok: true, answer: 'Shorten the third prompt.' });
    await h.send(h.action('question', { instruction: 'What would you change in this proposal?' }));
    h.ctx.prepareLessonRevision.mockResolvedValueOnce(refined()); await h.send('Do what you just suggested');
    expect(h.ctx.prepareLessonRevision.mock.calls.at(-1)[0]).toMatchObject({ mode: 'refine', instruction: 'Do what you just suggested' });
    expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled();
  });
  it.each(['refine', 'question'])('keeps the current reviewed proposal and prior Undo on %s failure', async mode => {
    const h = harness(); await proposalWithPriorUndo(h); const before = JSON.stringify(h.current().lessonRevision.changes); const token = h.current().lessonRevision.reviewToken;
    h.ctx.prepareLessonRevision.mockResolvedValueOnce({ ok: false, error: 'Could not complete this follow-up.' });
    await h.send(h.action(mode, { instruction: '  Keep this exact follow-up.  ' }));
    expect(h.current().lessonRevision).toMatchObject({ mode: 'review', canUndo: true, reviewToken: token, followupText: '  Keep this exact follow-up.  ' });
    expect(JSON.stringify(h.current().lessonRevision.changes)).toBe(before);
    await h.send(h.action('apply')); expect(h.ctx.applyLessonRevision).toHaveBeenLastCalledWith('private-review-1');
  });
  it.each(['refine', 'question'])('Stop during %s preserves the current review and ignores a late result', async mode => {
    const h = harness(); await proposalWithPriorUndo(h); const token = h.current().lessonRevision.reviewToken; let finish;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.send(h.action(mode, { instruction: 'Shorten Q3.' })); await Promise.resolve(); const signal = h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].signal;
    await h.send(h.action('stop')); expect(signal.aborted).toBe(true);
    expect(h.current().lessonRevision).toMatchObject({ mode: 'review', canUndo: true, reviewToken: token, followupText: 'Shorten Q3.' });
    finish(mode === 'refine' ? refined('late-stopped-refine') : { ok: true, answer: 'Late answer' }); await pending;
    expect(h.current().lessonRevision.reviewToken).toBe(token); expect(h.current().lessonRevision.answer).toBe('');
    expect(h.ctx.discardLessonRevision).not.toHaveBeenCalledWith('private-review-1');
  });
  it('rejects old Apply and follow-up controls after a successful refinement', async () => {
    const h = harness(); await start(h); await prepare(h); const oldApply = h.action('apply'); const oldQuestion = h.action('question', { instruction: 'Why?' });
    h.ctx.prepareLessonRevision.mockResolvedValueOnce(refined()); await h.send(h.action('refine', { instruction: 'Shorten Q3.' }));
    await h.send(oldApply); await h.send(oldQuestion); expect(h.ctx.applyLessonRevision).not.toHaveBeenCalled(); expect(h.ctx.prepareLessonRevision).toHaveBeenCalledTimes(2);
    await h.send(h.action('apply')); expect(h.ctx.applyLessonRevision).toHaveBeenCalledWith('private-refined-review');
  });
  it.each(['open settings', 'start a new lesson about volcanoes', 'What is the capital of France?'])('keeps unrelated requests outside the proposal follow-up lane: %s', async text => {
    const h = harness(); await start(h); await prepare(h); const count = h.ctx.prepareLessonRevision.mock.calls.length;
    await h.send(text); expect(h.ctx.prepareLessonRevision).toHaveBeenCalledTimes(count); expect(h.deps._sendUdlToChat).toHaveBeenCalledWith(text);
  });
  it('does not revive a cleared review after a late scoped answer', async () => {
    const h = harness(); await start(h); await prepare(h); let finish;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.send(h.action('question', { instruction: 'Why did you change this?' })); await Promise.resolve(); h.clear();
    finish({ ok: true, answer: 'A late explanation.' }); await pending; expect(h.messages()).toEqual([]);
  });
  it('rejects an old Stop control while a newer follow-up owns the pending request', async () => {
    const h = harness(); await start(h); await prepare(h); let finishOld, finishNew;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const oldPending = h.send(h.action('refine', { instruction: 'First request.' })); await Promise.resolve(); const oldStop = h.action('stop');
    await h.send(oldStop);
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve; }));
    const newPending = h.send(h.action('refine', { instruction: 'Second request.' })); await Promise.resolve(); const signal = h.ctx.prepareLessonRevision.mock.calls.at(-1)[0].signal;
    await h.send(oldStop); expect(signal.aborted).toBe(false); expect(h.current().lessonRevision.mode).toBe('refining');
    finishOld(refined('old-late-refinement')); await oldPending; expect(h.current().lessonRevision.mode).toBe('refining');
    finishNew(refined('current-refinement')); await newPending; expect(h.current().lessonRevision.mode).toBe('review');
    await h.send(h.action('apply')); expect(h.ctx.applyLessonRevision).toHaveBeenLastCalledWith('current-refinement');
  });
  it('retires review and prior Undo and clears busy state when ownership changes during a follow-up', async () => {
    const h = harness(); await proposalWithPriorUndo(h); let finish;
    h.ctx.prepareLessonRevision.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.send(h.action('question', { instruction: 'Why did you change Q3?' })); await Promise.resolve();
    h.ctx.commandWorkspaceToken = 'workspace-2'; finish({ ok: true, answer: 'Old-workspace answer.' }); await pending;
    expect(h.current().operationStatus).toBe('closed'); expect(h.current().lessonRevision.canUndo).toBe(false);
    expect(h.deps.setIsChatProcessing).toHaveBeenLastCalledWith(false); expect(h.ctx.discardLessonRevision).toHaveBeenLastCalledWith('private-review-1', { close: true });
    expect(h.current().lessonRevision.answer).toBe('');
  });
});
