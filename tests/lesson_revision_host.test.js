import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function fixture() {
  const history = [
    { id: 'directions-1', type: 'directions', title: 'Directions', data: { body: 'Read the passage and discuss.', objectives: [{ id: 'objective-1', label: 'Support ideas with evidence.', kind: 'manual' }] }, config: { language: 'English' } },
    { id: 'quiz-1', type: 'quiz', title: 'Discourse check', data: { instructions: 'Answer each question.', questions: [{ id: 'question-1', type: 'short-answer', question: 'How can you build on an idea?', expectedAnswer: 'Use evidence.' }] }, responses: { 'question-1': 'A saved response' }, meta: { imageUrl: 'data:image/png;base64,fixture' } },
    { id: 'image-1', type: 'image', title: 'Protected image', data: { imageUrl: 'data:image/png;base64,other' } },
  ];
  const state = { history, generatedContent: history[0], inputText: 'PRIVATE_SOURCE_CONTENT', isTeacherMode: true,
    revisionContext: { ownershipToken: {}, workspaceGeneration: 0, recoveryId: 'workspace-1', isStudentLinkMode: false, isParentMode: false, isIndependentMode: false, busy: false } };
  const owner = { current: state };
  const tab = { opener: {}, close: vi.fn(), location: { replace: vi.fn() } };
  const window = { AlloModules: {}, React: {}, ReactDOM: { flushSync: fn => fn() }, location: { href: 'http://127.0.0.1:7000/app/?private=remove#old' }, open: vi.fn(() => tab) };
  const context = vm.createContext({ window, console, URL, Date, setTimeout, clearTimeout });
  vm.runInContext(readFileSync('agent_core_pack_native_module.js', 'utf8'), context);
  vm.runInContext(readFileSync('agent_core_resource_pack_module.js', 'utf8'), context);
  vm.runInContext(readFileSync('lesson_revision_service.js', 'utf8'), context);
  vm.runInContext(readFileSync('host_handlers_module.js', 'utf8'), context);
  const deps = {
    _resourceMutationStateRef: owner,
    workspaceReplacementGenerationRef: { current: 0 },
    setHistory: vi.fn(value => { owner.current.history = typeof value === 'function' ? value(owner.current.history) : value; }),
    setGeneratedContent: vi.fn(value => { owner.current.generatedContent = typeof value === 'function' ? value(owner.current.generatedContent) : value; }),
    callGemini: vi.fn(async () => JSON.stringify({ changes: [{ resourceId: 'directions-1', path: '/data/body', after: 'Read. Take turns. Use evidence.' }], unfulfilled: [] })),
    addToast: vi.fn(),
    _alloStudentSafeResources: list => list.filter(item => item.type !== 'image'),
    resolveAssignmentResources: vi.fn(ids => ids == null ? owner.current.history.filter(item => item.type !== 'image') : ids.map(id => owner.current.history.find(item => String(item.id) === String(id))).filter(Boolean)),
    _alloSerializeResourceForStudentPack: item => ({ id: item.id, type: item.type, title: item.title, data: item.data }),
    _alloEncodeAlloPack: vi.fn(async text => '0.' + Buffer.from(text).toString('base64url')),
    t: key => key,
    udlMessages: [],
    setActiveView: vi.fn(), setShowUDLGuide: vi.fn(),
    setBlueprintExecutionResult: vi.fn(updater => { deps.blueprintExecutionResult = updater(deps.blueprintExecutionResult); }),
    blueprintExecutionResult: { runId: 'run-1', audit: { reportId: 'audit-1', resourceIds: ['directions-1', 'quiz-1'] } },
  };
  const handlers = window.AlloModules.HostHandlers(deps);
  const prepare = async () => handlers.prepareLessonRevision({ resourceIds: ['directions-1'], instruction: 'Make the directions easier to follow.' });
  return { owner, deps, window, tab, handlers, prepare, original: history };
}

describe('native lesson revision host ownership and mutation', () => {
  it('lists exact resources and keeps unsupported media read-only', () => {
    const f = fixture();
    const resources = f.handlers.getLessonRevisionResources();
    expect(resources.map(item => item.id)).toEqual(['directions-1', 'quiz-1', 'image-1']);
    expect(resources[0].current).toBe(true);
    expect(resources[2].supported).toBe(false);
  });

  it('prepares only selected editable material, and makes no changes before Apply', async () => {
    const f = fixture(), before = JSON.stringify(f.owner.current.history);
    const result = await f.prepare();
    expect(result.ok).toBe(true);
    expect(result.review.changes[0].before).toBe('Read the passage and discuss.');
    expect(JSON.stringify(f.owner.current.history)).toBe(before);
    const prompt = f.deps.callGemini.mock.calls[0][0];
    expect(prompt).toContain('Read the passage and discuss.');
    expect(prompt).not.toContain('PRIVATE_SOURCE_CONTENT');
    expect(prompt).not.toContain('A saved response');
    expect(prompt).not.toContain('Discourse check');
    expect(prompt).not.toContain('data:image');
  });

  it('applies native data to both History and the open resource while preserving other resources and metadata', async () => {
    const f = fixture();
    const review = (await f.prepare()).review;
    const applied = f.handlers.applyLessonRevision(review.id);
    expect(applied.ok).toBe(true);
    expect(applied.changedCount).toBe(1);
    expect(f.owner.current.history[0].id).toBe('directions-1');
    expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
    expect(f.owner.current.generatedContent).toBe(f.owner.current.history[0]);
    expect(f.owner.current.history[0].config).toEqual({ language: 'English' });
    expect(Number.isFinite(Date.parse(f.owner.current.history[0].updatedAt))).toBe(true);
    expect(f.owner.current.history[1]).toBe(f.original[1]);
    expect(f.handlers.applyLessonRevision(review.id).ok).toBe(false);
  });

  it('uses an independent review DTO that cannot alter the private proposal', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    review.changes[0].after = 'An unreviewed injected value';
    expect(f.handlers.applyLessonRevision(review.id).ok).toBe(true);
    expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
  });

  it('rejects changed selected material at Apply and preserves the newer edit', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    f.owner.current.history[0] = { ...f.owner.current.history[0], data: { ...f.owner.current.history[0].data, body: 'A newer teacher edit' } };
    expect(f.handlers.applyLessonRevision(review.id).ok).toBe(false);
    expect(f.owner.current.history[0].data.body).toBe('A newer teacher edit');
  });

  it('does not bypass the native preserved-original guard when protection changes after review', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    f.owner.current.history[0].config.instructionalText = { form: 'same-text-supported' };
    expect(f.handlers.applyLessonRevision(review.id).ok).toBe(false);
    expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
  });

  it('rejects a review after source A → B → A changed the private ownership token', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    f.owner.current.revisionContext.ownershipToken = {};
    expect(f.handlers.applyLessonRevision(review.id).ok).toBe(false);
    expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
  });

  it('rejects a review after a workspace replacement before another render', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    f.deps.workspaceReplacementGenerationRef.current++;
    expect(f.handlers.applyLessonRevision(review.id).ok).toBe(false);
  });

  it('does not revise in learner mode or while generation is busy', async () => {
    const f = fixture();
    f.owner.current.isTeacherMode = false;
    expect(f.handlers.getLessonRevisionResources()).toEqual([]);
    expect((await f.prepare()).ok).toBe(false);
    f.owner.current.isTeacherMode = true;
    f.owner.current.revisionContext.busy = true;
    expect((await f.prepare()).ok).toBe(false);
    expect(f.deps.callGemini).not.toHaveBeenCalled();
  });

  it('discards a late provider result after leaving the lesson', async () => {
    const f = fixture();
    let resolve;
    f.deps.callGemini.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = f.prepare();
    f.owner.current.revisionContext.ownershipToken = {};
    resolve(JSON.stringify({ changes: [{ resourceId: 'directions-1', path: '/data/body', after: 'Late proposal' }], unfulfilled: [] }));
    expect((await pending).ok).toBe(false);
    expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
  });

  it('discard retires an in-flight request without relying on provider cancellation', async () => {
    const f = fixture();
    let resolve;
    f.deps.callGemini.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = f.prepare();
    expect(f.handlers.discardLessonRevision()).toBe(true);
    resolve(JSON.stringify({ changes: [{ resourceId: 'directions-1', path: '/data/body', after: 'Late proposal' }], unfulfilled: [] }));
    expect((await pending).ok).toBe(false);
  });

  it('undo restores only the edited paths and preserves later responses, metadata, and unrelated additions', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    const applied = f.handlers.applyLessonRevision(review.id);
    f.owner.current.history[0] = { ...f.owner.current.history[0], responses: { draft: 'New student response' }, config: { language: 'Spanish' } };
    f.owner.current.history.push({ id: 'new-resource', type: 'faq', data: [] });
    const result = f.handlers.undoLessonRevision(applied.undoId);
    expect(result.ok).toBe(true);
    expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
    expect(f.owner.current.history[0].responses).toEqual({ draft: 'New student response' });
    expect(f.owner.current.history[0].config).toEqual({ language: 'Spanish' });
    expect(f.owner.current.history.at(-1).id).toBe('new-resource');
    expect(f.handlers.undoLessonRevision(applied.undoId).ok).toBe(false);
  });

  it('undo refuses to overwrite a newer edit to the same field', async () => {
    const f = fixture();
    const { review } = await f.prepare();
    const applied = f.handlers.applyLessonRevision(review.id);
    f.owner.current.history[0].data.body = 'Newer body';
    expect(f.handlers.undoLessonRevision(applied.undoId).ok).toBe(false);
    expect(f.owner.current.history[0].data.body).toBe('Newer body');
  });

  it('does not Undo through a newly protected original', async () => {
    const f = fixture();
    const applied = f.handlers.applyLessonRevision((await f.prepare()).review.id);
    f.owner.current.history[0].instructionalText = { form: 'same-text-supported' };
    expect(f.handlers.undoLessonRevision(applied.undoId).ok).toBe(false);
    expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
  });

  it('a later Apply replaces the Undo checkpoint', async () => {
    const f = fixture();
    const first = f.handlers.applyLessonRevision((await f.prepare()).review.id);
    f.deps.callGemini.mockResolvedValueOnce(JSON.stringify({ changes: [{ resourceId: 'directions-1', path: '/data/body', after: 'Even simpler directions.' }], unfulfilled: [] }));
    const second = f.handlers.applyLessonRevision((await f.prepare()).review.id);
    expect(f.handlers.undoLessonRevision(first.undoId).ok).toBe(false);
    expect(f.handlers.undoLessonRevision(second.undoId).ok).toBe(true);
    expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
  });

  it('opens a same-host native student packet with AI off and no sharing side effect', async () => {
    const f = fixture();
    f.handlers.applyLessonRevision((await f.prepare()).review.id);
    expect(await f.handlers.openLessonRevisionPreview()).toBe(true);
    expect(f.window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(f.tab.opener).toBe(null);
    const url = new URL(f.tab.location.replace.mock.calls[0][0]);
    expect(url.origin).toBe('http://127.0.0.1:7000');
    expect(url.pathname).toBe('/app/');
    expect(url.search).toBe('?allo_ai=off');
    const encoded = new URLSearchParams(url.hash.slice(1)).get('allo_pack');
    const packet = JSON.parse(Buffer.from(encoded.slice(2), 'base64url').toString());
    expect(packet.resources.map(item => item.id)).toEqual(['directions-1', 'quiz-1']);
    expect(packet.resources[0].data.body).toBe('Read. Take turns. Use evidence.');
    expect(packet.aiPolicy.studentAi).toBe('off');
    expect(packet).not.toHaveProperty('sharedActivities');
  });

  it('does not encode or share when the preview popup is blocked', async () => {
    const f = fixture();
    f.window.open.mockReturnValueOnce(null);
    expect(await f.handlers.openLessonRevisionPreview('directions-1')).toBe(false);
    expect(f.deps._alloEncodeAlloPack).not.toHaveBeenCalled();
  });

  it('keeps a blob object URL identity intact and carries AI-off policy in the preview packet', async () => {
    const f = fixture();
    f.window.location.href = 'blob:https://canvas.example/id';
    expect(await f.handlers.openLessonRevisionPreview('directions-1')).toBe(true);
    const target = f.tab.location.replace.mock.calls[0][0];
    expect(target.split('#')[0]).toBe('blob:https://canvas.example/id');
    const url = new URL(target);
    expect(url.search).toBe('');
    const encoded = new URLSearchParams(url.hash.slice(1)).get('allo_pack');
    const packet = JSON.parse(Buffer.from(encoded.slice(2), 'base64url').toString());
    expect(packet.aiPolicy.studentAi).toBe('off');
    expect(packet.resources[0].id).toBe('directions-1');
  });

  it('includes native referenced dependencies in an explicit resource preview', async () => {
    const f = fixture();
    f.deps.resolveAssignmentResources.mockImplementationOnce(ids => { expect(ids).toEqual(['directions-1']); return f.owner.current.history.slice(0, 2); });
    expect(await f.handlers.openLessonRevisionPreview('directions-1')).toBe(true);
    const packet = JSON.parse(f.deps._alloEncodeAlloPack.mock.calls[0][0]);
    expect(packet.resources.map(item => item.id)).toEqual(['directions-1', 'quiz-1']);
  });

  it('fails closed for missing dependency IDs instead of substituting a partial preview', async () => {
    const f = fixture();
    f.deps.resolveAssignmentResources.mockReturnValueOnce([{ id: 'directions-1' }, { id: 'deleted-dependency' }]);
    expect(await f.handlers.openLessonRevisionPreview('directions-1')).toBe(false);
    expect(f.window.open).not.toHaveBeenCalled();
  });

  it('invalidates exact Blueprint audit coverage on Apply and keeps it unaudited after Undo', async () => {
    const f = fixture();
    const applied = f.handlers.applyLessonRevision((await f.prepare()).review.id);
    expect(f.deps.blueprintExecutionResult.audit.resourceIds).toEqual(['quiz-1']);
    expect(f.deps.blueprintExecutionResult.audit.reportId).toBe('audit-1');
    expect(f.handlers.undoLessonRevision(applied.undoId).ok).toBe(true);
    expect(f.deps.blueprintExecutionResult.audit.resourceIds).toEqual(['quiz-1']);
  });

  it('rejects preview drift while encoding and closes the empty tab', async () => {
    const f = fixture();
    let resolve;
    f.deps._alloEncodeAlloPack.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = f.handlers.openLessonRevisionPreview('directions-1');
    f.owner.current.history[0] = { ...f.owner.current.history[0], title: 'A newer title' };
    resolve('0.packet');
    expect(await pending).toBe(false);
    expect(f.tab.location.replace).not.toHaveBeenCalled();
    expect(f.tab.close).toHaveBeenCalledOnce();
  });

  it('keeps local revision instruction/diffs out of saved chat advice', () => {
    const f = fixture();
    f.deps.udlMessages = [{ role: 'model', text: 'Welcome' }, { role: 'user', text: 'Ordinary question' }, { role: 'model', text: 'PRIVATE_REVISION_DIFF', localOnly: true }];
    f.handlers.saveFullChat();
    const item = f.owner.current.history.find(value => value.type === 'udl-advice');
    expect(item.data).toContain('Ordinary question');
    expect(item.data).not.toContain('PRIVATE_REVISION_DIFF');
  });
});

describe('native pending-proposal follow-ups and retained Undo', () => {
  const followup = (f, review, mode, instruction = 'Keep those edits, but shorten the directions.', signal) => f.handlers.prepareLessonRevision({ reviewId: review.id, mode, instruction, signal });
  const bodyReply = body => JSON.stringify({ changes: [{ resourceId: 'directions-1', path: '/data/body', after: body }], unfulfilled: [], removeChangeIds: [] });
  const applyA = async f => { const prepared = await f.prepare(); return f.handlers.applyLessonRevision(prepared.review.id); };

  it('refines the exact current proposal, keeps omitted edits, and requires a fresh Apply', async () => {
    const f = fixture(), before = JSON.stringify(f.owner.current.history);
    f.deps.callGemini.mockResolvedValueOnce(JSON.stringify({ changes: [
      { resourceId: 'directions-1', path: '/data/body', after: 'Proposed directions.' },
      { resourceId: 'quiz-1', path: '/data/questions/0/question', after: 'A proposed question?' },
    ], unfulfilled: [] }));
    const first = await f.handlers.prepareLessonRevision({ resourceIds: ['directions-1', 'quiz-1'], instruction: 'Clarify the directions and question.' });
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Short proposed directions.'));
    const next = await followup(f, first.review, 'refine');
    expect(next.ok).toBe(true); expect(next.review.id).not.toBe(first.review.id); expect(next.review.changes).toHaveLength(2);
    expect(next.review.changes.find(item => item.resourceId === 'quiz-1').after).toBe('A proposed question?');
    expect(next.review.changes.find(item => item.resourceId === 'directions-1').before).toBe('Read the passage and discuss.');
    expect(JSON.stringify(f.owner.current.history)).toBe(before);
    expect(f.handlers.applyLessonRevision(first.review.id).ok).toBe(false); expect(f.handlers.applyLessonRevision(next.review.id).ok).toBe(true);
  });

  it('answers a scoped question without replacing the draft or touching native material', async () => {
    const f = fixture(), prepared = await f.prepare(), before = JSON.stringify(f.owner.current.history);
    f.deps.callGemini.mockResolvedValueOnce('The shorter directions separate the steps.');
    const answer = await followup(f, prepared.review, 'question', 'Why make this change?');
    expect(answer).toEqual({ ok: true, answer: 'The shorter directions separate the steps.' }); expect(JSON.stringify(f.owner.current.history)).toBe(before);
    expect(f.deps.callGemini.mock.calls.at(-1)[0]).toContain('PROPOSAL_QUESTION_JSON');
    expect(f.deps.callGemini.mock.calls.at(-1)[0]).not.toContain('A saved response');
    expect(f.handlers.applyLessonRevision(prepared.review.id).ok).toBe(true);
  });

  it('retains only bounded validated proposal discussion for the next question and refinement', async () => {
    const f = fixture(), first = await f.prepare();
    const longQuestion = 'Why? '.repeat(250), longAnswer = 'A suggestion. '.repeat(200);
    f.deps.callGemini.mockResolvedValueOnce(longAnswer);
    expect((await followup(f, first.review, 'question', longQuestion)).ok).toBe(true);
    f.deps.callGemini.mockResolvedValueOnce('Try one step per sentence.');
    expect((await followup(f, first.review, 'question', 'What would you suggest?')).ok).toBe(true);
    let payload = JSON.parse(f.deps.callGemini.mock.calls.at(-1)[0].split('PROPOSAL_QUESTION_JSON:\n')[1]);
    expect(payload.priorDiscussion).toHaveLength(1); expect(payload.priorDiscussion[0].question.length).toBe(1000); expect(payload.priorDiscussion[0].answer.length).toBe(2000); expect(payload.priorDiscussion[0].truncated).toBe(true);
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Read. Discuss. Explain.'));
    const refined = await followup(f, first.review, 'refine', 'Do what you just suggested.'); expect(refined.ok).toBe(true);
    payload = JSON.parse(f.deps.callGemini.mock.calls.at(-1)[0].split('EDIT_REQUEST_JSON:\n')[1]);
    expect(payload.priorDiscussion).toHaveLength(2); expect(payload.priorDiscussion[1].answer).toBe('Try one step per sentence.');
    expect(f.handlers.applyLessonRevision(refined.review.id).ok).toBe(true);
  });

  it('does not store failed answers and clears discussion for an independent draft', async () => {
    const f = fixture(), first = await f.prepare();
    f.deps.callGemini.mockResolvedValueOnce('A valid explanation.'); await followup(f, first.review, 'question', 'Why?');
    f.deps.callGemini.mockRejectedValueOnce(Error('Network failure')); expect((await followup(f, first.review, 'question', 'A failed question')).ok).toBe(false);
    f.deps.callGemini.mockResolvedValueOnce('A second valid explanation.'); await followup(f, first.review, 'question', 'Why again?');
    let payload = JSON.parse(f.deps.callGemini.mock.calls.at(-1)[0].split('PROPOSAL_QUESTION_JSON:\n')[1]);
    expect(payload.priorDiscussion).toHaveLength(1); expect(payload.priorDiscussion[0].question).toBe('Why?');
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Independent draft.')); const next = await f.prepare();
    f.deps.callGemini.mockResolvedValueOnce('Fresh context only.'); await followup(f, next.review, 'question', 'What changed?');
    payload = JSON.parse(f.deps.callGemini.mock.calls.at(-1)[0].split('PROPOSAL_QUESTION_JSON:\n')[1]); expect(payload.priorDiscussion).toEqual([]);
  });

  it('keeps discussion on a failed refinement and never returns it as authorization or public review metadata', async () => {
    const f = fixture(), first = await f.prepare();
    f.deps.callGemini.mockResolvedValueOnce('A remembered explanation.'); await followup(f, first.review, 'question', 'Why this?');
    f.deps.callGemini.mockResolvedValueOnce('not JSON'); expect((await followup(f, first.review, 'refine')).ok).toBe(false);
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('A refined draft.')); const next = await followup(f, first.review, 'refine', 'Use that explanation.');
    const payload = JSON.parse(f.deps.callGemini.mock.calls.at(-1)[0].split('EDIT_REQUEST_JSON:\n')[1]);
    expect(payload.priorDiscussion[0].answer).toBe('A remembered explanation.'); expect(next.review.discussion).toBeUndefined();
    expect(JSON.stringify(next.review)).not.toContain('A remembered explanation.'); expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
  });

  it('keeps the earlier reviewed draft after malformed refinement output or provider error', async () => {
    const f = fixture(), first = await f.prepare();
    f.deps.callGemini.mockResolvedValueOnce('{"changes":[{"resourceId":"directions-1","path":"/id","after":"bad"}],"unfulfilled":[]}');
    expect((await followup(f, first.review, 'refine')).ok).toBe(false);
    f.deps.callGemini.mockRejectedValueOnce(Error('PRIVATE_PROVIDER_ERROR'));
    const failure = await followup(f, first.review, 'refine'); expect(failure.ok).toBe(false); expect(failure.error).not.toContain('PRIVATE_PROVIDER_ERROR');
    expect(f.handlers.applyLessonRevision(first.review.id).ok).toBe(true);
  });

  it('retains last applied Undo through the next proposal and failed refinement', async () => {
    const f = fixture(), applied = await applyA(f);
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Second draft, not applied.'));
    const next = await f.prepare(); expect(next.ok).toBe(true);
    f.deps.callGemini.mockRejectedValueOnce(Error('Unavailable'));
    expect((await followup(f, next.review, 'refine')).ok).toBe(false);
    expect(f.handlers.undoLessonRevision(applied.undoId).ok).toBe(true);
    expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
    expect(f.handlers.applyLessonRevision(next.review.id).ok).toBe(false);
  });

  for (const mode of ['prepare', 'refine', 'question']) it('rejects a late ' + mode + ' after Undo invalidates the pending work', async () => {
    const f = fixture(), applied = await applyA(f); let prior;
    if (mode !== 'prepare') {
      f.deps.callGemini.mockResolvedValueOnce(bodyReply('Second draft.')); prior = await f.prepare(); expect(prior.ok).toBe(true);
    }
    let resolve;
    f.deps.callGemini.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const pending = mode === 'prepare' ? f.prepare() : followup(f, prior.review, mode);
    expect(typeof resolve).toBe('function');
    expect(f.handlers.undoLessonRevision(applied.undoId).ok).toBe(true);
    resolve(mode === 'question' ? 'A late explanation.' : bodyReply('Late edits must never land.'));
    expect((await pending).ok).toBe(false); expect(f.owner.current.history[0].data.body).toBe('Read the passage and discuss.');
    if (prior) expect(f.handlers.applyLessonRevision(prior.review.id).ok).toBe(false);
  });

  it('keeps the draft and previous Undo on cancelled follow-up, and replaces Undo only on successful Apply', async () => {
    const f = fixture(), appliedA = await applyA(f);
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Second draft.')); const second = await f.prepare();
    const signal = { aborted: false };
    f.deps.callGemini.mockImplementationOnce(async () => { signal.aborted = true; return bodyReply('Late refinement.'); });
    expect((await followup(f, second.review, 'refine', 'Refine.', signal)).ok).toBe(false);
    const appliedB = f.handlers.applyLessonRevision(second.review.id); expect(appliedB.ok).toBe(true); expect(appliedB.undoId).not.toBe(appliedA.undoId);
    expect(f.handlers.undoLessonRevision(appliedA.undoId).ok).toBe(false);
    expect(f.handlers.undoLessonRevision(appliedB.undoId).ok).toBe(true); expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
  });

  it('default draft discard retains Undo, while explicit Close retires it without rolling content back', async () => {
    const f = fixture(), appliedA = await applyA(f);
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Next draft.')); const next = await f.prepare();
    expect(f.handlers.discardLessonRevision(next.review.id)).toBe(true);
    expect(f.handlers.undoLessonRevision(appliedA.undoId).ok).toBe(true);
    const appliedAgain = await applyA(f);
    expect(f.handlers.discardLessonRevision(undefined, { close: true })).toBe(true);
    expect(f.handlers.undoLessonRevision(appliedAgain.undoId).ok).toBe(false); expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
  });

  for (const mode of ['refine', 'question']) it('rejects new-reference material drift after ' + mode + ' without overwriting newer work', async () => {
    const f = fixture(), first = await f.prepare();
    f.deps.callGemini.mockImplementationOnce(async () => {
      f.owner.current.history = f.owner.current.history.map(item => item.id === 'directions-1' ? { ...item, data: { ...item.data, body: 'Newer native edit.' } } : item);
      return mode === 'question' ? 'Late answer.' : bodyReply('Late refinement.');
    });
    expect((await followup(f, first.review, mode)).ok).toBe(false); expect(f.owner.current.history[0].data.body).toBe('Newer native edit.');
  });

  it('rejects invalid review IDs and modes before a provider call', async () => {
    const f = fixture(), first = await f.prepare(), calls = f.deps.callGemini.mock.calls.length;
    for (const request of [
      { reviewId: 'old', mode: 'refine', instruction: 'Change.' },
      { reviewId: first.review.id, mode: 'execute', instruction: 'Change.' },
      { mode: 'question', instruction: 'Why?' },
    ]) expect((await f.handlers.prepareLessonRevision(request)).ok).toBe(false);
    expect(f.deps.callGemini.mock.calls).toHaveLength(calls); expect(f.handlers.applyLessonRevision(first.review.id).ok).toBe(true);
  });

  it('invalidates follow-up and Undo ownership when the workspace switches', async () => {
    const f = fixture(), appliedA = await applyA(f);
    f.deps.callGemini.mockResolvedValueOnce(bodyReply('Next draft.')); const next = await f.prepare();
    f.deps.callGemini.mockImplementationOnce(async () => { f.deps.workspaceReplacementGenerationRef.current++; return bodyReply('Late.'); });
    expect((await followup(f, next.review, 'refine')).ok).toBe(false);
    expect(f.handlers.undoLessonRevision(appliedA.undoId).ok).toBe(false); expect(f.owner.current.history[0].data.body).toBe('Read. Take turns. Use evidence.');
  });
});
