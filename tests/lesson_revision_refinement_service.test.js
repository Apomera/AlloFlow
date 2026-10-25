import { beforeEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let S;
const copy = value => JSON.parse(JSON.stringify(value));
const quiz = () => ({ id: 'quiz', type: 'quiz', title: 'Evidence check', data: { questions: [
  { id: 'q1', type: 'short-answer', question: 'Original first prompt', expectedAnswer: 'Use evidence.' },
  { id: 'q2', type: 'short-answer', question: 'Original second prompt', expectedAnswer: 'Explain.' }
] }, quizAnswers: { 0: 'PRIVATE_STUDENT_RESPONSE' }, config: { keep: true }, imageUrl: 'data:PRIVATE_MEDIA' });
const change = (path, after, resourceId = 'quiz') => ({ resourceId, path, after });
const reply = changes => JSON.stringify({ changes, unfulfilled: [], removeChangeIds: [] });
const initial = (items, changes, ids = ['quiz']) => S.prepare(items, ids, 'Clarify the selected lesson. Keep criteria unchanged.', { callGemini: async () => reply(changes) });
const refine = (proposal, items, changes, extra = {}) => S.refine(proposal, items, 'Keep those edits but shorten the first prompt.', { callGemini: async () => JSON.stringify({ changes, unfulfilled: [], removeChangeIds: [], ...extra }) });
beforeEach(() => {
  const sandbox = vm.createContext({ window: {}, module: { exports: {} }, console, Date });
  for (const file of ['agent_core_pack_native_module.js', 'agent_core_resource_pack_module.js', 'lesson_revision_service.js']) vm.runInContext(readFileSync(file, 'utf8'), sandbox);
  S = sandbox.module.exports;
});

describe('review-bound conversational refinement', () => {
  it('retains omitted pending edits and compares the refined draft to the original native basis', async () => {
    const items = [quiz()], before = copy(items);
    const first = await initial(items, [change('/title', 'Revised title'), change('/data/questions/0/question', 'First proposed prompt')]);
    const next = await refine(first.proposal, items, [change('/data/questions/0/question', 'Shorter proposed prompt')]);
    expect(next.ok).toBe(true); expect(items).toEqual(before);
    const review = S.review(next.proposal);
    expect(review.changes).toHaveLength(2);
    expect(review.changes.find(item => item.path === '/title')).toMatchObject({ before: 'Evidence check', after: 'Revised title' });
    expect(review.changes.find(item => item.path.endsWith('/question'))).toMatchObject({ before: 'Original first prompt', after: 'Shorter proposed prompt' });
    expect(S.apply(next.proposal, items).resources[0].data.questions[1]).toEqual(before[0].data.questions[1]);
  });
  it('offers the current proposed text and original request without learner data or unrelated resources', async () => {
    const items = [quiz(), { id: 'other', type: 'udl-advice', title: 'PRIVATE_OTHER_RESOURCE', data: 'PRIVATE_UNSELECTED_CONTENT' }];
    const first = await initial(items, [change('/data/questions/0/question', 'First proposed prompt')]);
    let prompt;
    const result = await S.refine(first.proposal, items, 'Make it shorter.', { callGemini: async value => { prompt = value; return reply([]); } });
    expect(result.ok).toBe(true);
    const payload = JSON.parse(prompt.split('EDIT_REQUEST_JSON:\n')[1]);
    expect(payload.originalRequest).toContain('Keep criteria unchanged'); expect(payload.proposedChanges[0].after).toBe('First proposed prompt');
    expect(payload.resources[0].fields.some(field => field.value === 'Original first prompt')).toBe(true);
    for (const privateText of ['PRIVATE_STUDENT_RESPONSE', 'PRIVATE_MEDIA', 'PRIVATE_OTHER_RESOURCE', 'PRIVATE_UNSELECTED_CONTENT']) expect(prompt).not.toContain(privateText);
  });
  it('keeps the added question identity through unrelated refinement without duplicating it', async () => {
    const items = [quiz()], added = { type: 'short-answer', question: 'Added third prompt', expectedAnswer: 'Explain a limit.' };
    const first = await initial(items, [change('/data/questions/-', added), change('/title', 'Revised title')]);
    const oldId = S.review(first.proposal).changes.find(item => item.path.endsWith('/-')).after.id;
    const next = await refine(first.proposal, items, [change('/title', 'Shorter title')]);
    expect(next.ok).toBe(true);
    expect(S.review(next.proposal).changes.find(item => item.path.endsWith('/-')).after.id).toBe(oldId);
    const applied = S.apply(next.proposal, items);
    expect(applied.resources[0].data.questions).toHaveLength(3); expect(applied.resources[0].data.questions[2].id).toBe(oldId);
  });
  it('refines the same pending added question using its offered changeId and preserves its native ID', async () => {
    const items = [quiz()]; const first = await initial(items, [change('/data/questions/-', { type: 'short-answer', question: 'Added third prompt', expectedAnswer: 'Explain a limit.' })]);
    const oldId = S.review(first.proposal).changes[0].after.id;
    let payload;
    const next = await S.refine(first.proposal, items, 'Shorten question three.', { callGemini: async prompt => {
      payload = JSON.parse(prompt.split('EDIT_REQUEST_JSON:\n')[1]); const offered = payload.proposedChanges[0];
      expect(offered.after.id).toBeUndefined();
      return reply([{ changeId: offered.changeId, resourceId: offered.resourceId, path: offered.path, after: { ...offered.after, question: 'What is uncertain?' } }]);
    } });
    expect(next.ok).toBe(true); expect(S.review(next.proposal).changes[0].after).toMatchObject({ id: oldId, question: 'What is uncertain?' });
    expect(S.apply(next.proposal, items).resources[0].data.questions).toHaveLength(3);
  });
  it('can explicitly remove one proposed edit while preserving the others', async () => {
    const items = [quiz()], first = await initial(items, [change('/title', 'Revised title'), change('/data/questions/0/question', 'Proposed prompt')]);
    const next = await refine(first.proposal, items, [], { removeChangeIds: [first.proposal.records[0].changeId] });
    expect(next.ok).toBe(true); expect(S.review(next.proposal).changes).toHaveLength(1); expect(S.review(next.proposal).warnings.join(' ')).toContain('removed');
    expect(S.apply(next.proposal, items).resources[0].title).toBe('Evidence check');
  });
  it('preserves one Cornell cue and its internal blank response through multiple refinements', async () => {
    const notebook = { id: 'notes', type: 'note-taking', title: 'Notebook', data: { templateType: 'cornell-notes', title: 'Notes', cues: [{ id: 'c1', text: 'Evidence' }], notes: [{ id: 'n1', text: 'PRIVATE_NOTE_WRITING' }], summary: 'PRIVATE_SUMMARY' } };
    const items = [notebook], first = await initial(items, [change('/data/cues/-', { text: 'Reasoning', guidance: 'Explain.' }, 'notes')], ['notes']);
    const before = S.review(first.proposal).changes;
    let next = await S.refine(first.proposal, items, 'Clarify the new cue guidance.', { callGemini: async prompt => {
      expect(prompt).not.toContain('PRIVATE_NOTE_WRITING'); expect(prompt).not.toContain('PRIVATE_SUMMARY');
      const payload = JSON.parse(prompt.split('EDIT_REQUEST_JSON:\n')[1]); expect(payload.proposedChanges).toHaveLength(1);
      const offered = payload.proposedChanges[0]; expect(offered.addsBlankResponse).toBe(true); expect(offered.after.id).toBeUndefined();
      return reply([{ ...change(offered.path, { text: 'Reasoning', guidance: 'Explain how the evidence supports the claim.' }, 'notes'), changeId: offered.changeId }]);
    } });
    expect(next.ok).toBe(true); let after = S.review(next.proposal).changes; expect(after).toHaveLength(2);
    expect(after[0].after.id).toBe(before[0].after.id); expect(after[1].after.id).toBe(before[1].after.id); expect(after[1].after.text).toBe('');
    next = await refine(next.proposal, items, [change('/title', 'Revised notebook', 'notes')]); expect(next.ok).toBe(true);
    const applied = S.apply(next.proposal, items); expect(applied.resources[0].data.cues).toHaveLength(2); expect(applied.resources[0].data.notes).toHaveLength(2);
    expect(applied.resources[0].data.notes[0].text).toBe('PRIVATE_NOTE_WRITING');
  });
  it('removes a proposed Cornell cue and blank response as one pair', async () => {
    const items = [{ id: 'notes', type: 'note-taking', title: 'Notebook', data: { templateType: 'cornell-notes', title: 'Notes', cues: [], notes: [], summary: '' } }];
    const first = await initial(items, [change('/data/cues/-', { text: 'Evidence' }, 'notes'), change('/title', 'New notebook', 'notes')], ['notes']);
    const next = await refine(first.proposal, items, [], { removeChangeIds: [first.proposal.records.find(item => item.path === '/data/cues/-').changeId] });
    expect(next.ok).toBe(true); expect(S.review(next.proposal).changes.map(item => item.path)).toEqual(['/title']);
    expect(S.apply(next.proposal, items).resources[0].data.notes).toEqual([]);
  });
  for (const scenario of ['unknown ID', 'wrong path', 'duplicate edit', 'remove and edit', 'internal note', 'protected field', 'unselected resource']) {
    it('rejects ' + scenario + ' and leaves the prior proposal usable', async () => {
      const items = [quiz()], first = await initial(items, [change('/title', 'Revised title')]), record = first.proposal.records[0];
      const patch = { ...change('/title', 'Another title'), changeId: record.changeId }; let changes = [patch], extra = {};
      if (scenario === 'unknown ID') patch.changeId = 'not-offered';
      if (scenario === 'wrong path') patch.path = '/data/questions/0/question';
      if (scenario === 'duplicate edit') changes.push(copy(patch));
      if (scenario === 'remove and edit') extra.removeChangeIds = [record.changeId];
      if (scenario === 'internal note') { changes = []; extra.removeChangeIds = ['revision-response-unoffered']; }
      if (scenario === 'protected field') changes = [change('/quizAnswers/0', 'Bad')];
      if (scenario === 'unselected resource') changes = [change('/title', 'Wrong', 'other')];
      const next = await refine(first.proposal, items, changes, extra); expect(next.ok).toBe(false);
      expect(S.review(first.proposal).changes[0].after).toBe('Revised title'); expect(S.apply(first.proposal, items).ok).toBe(true);
    });
  }
  it('preserves the prior proposal after invalid native output or provider failure', async () => {
    const items = [quiz()], first = await initial(items, [change('/title', 'Revised title')]);
    expect((await refine(first.proposal, items, [change('/data/questions/0/question', '')])).ok).toBe(false);
    const failed = await S.refine(first.proposal, items, 'Keep the draft.', { callGemini: async () => { throw Error('PRIVATE_PROVIDER_ERROR'); } });
    expect(failed.ok).toBe(false); expect(failed.error).not.toContain('PRIVATE_PROVIDER_ERROR'); expect(S.apply(first.proposal, items).ok).toBe(true);
  });
  it('rejects stale native material before calling a provider and after an in-place change', async () => {
    const items = [quiz()], first = await initial(items, [change('/title', 'Revised title')]); let calls = 0;
    const changed = copy(items); changed[0].data.questions.reverse();
    expect((await S.refine(first.proposal, changed, 'Refine.', { callGemini: async () => { calls++; return reply([]); } })).ok).toBe(false); expect(calls).toBe(0);
    const result = await S.refine(first.proposal, items, 'Refine.', { callGemini: async () => { items[0].data.questions.reverse(); return reply([]); } });
    expect(result.ok).toBe(false);
  });
  it('rejects an aborted late refinement without consuming the prior proposal', async () => {
    const items = [quiz()], first = await initial(items, [change('/title', 'Revised title')]), signal = { aborted: false };
    const result = await S.refine(first.proposal, items, 'Refine.', { signal, callGemini: async () => { signal.aborted = true; return reply([change('/title', 'Late')]); } });
    expect(result.ok).toBe(false); expect(S.review(first.proposal).changes[0].after).toBe('Revised title'); expect(S.apply(first.proposal, items).ok).toBe(true);
  });
});

describe('read-only proposal questions', () => {
  it('answers using only the scoped proposal and leaves the exact review unchanged', async () => {
    const items = [quiz()], before = copy(items), first = await initial(items, [change('/data/questions/0/question', 'Proposed prompt')]);
    const originalReview = S.review(first.proposal); let prompt;
    const result = await S.explain(first.proposal, items, 'Why change this prompt?', { callGemini: async value => { prompt = value; return 'It makes the requested evidence more explicit.'; } });
    expect(result).toEqual({ ok: true, answer: 'It makes the requested evidence more explicit.' }); expect(items).toEqual(before);
    expect(S.review(first.proposal)).toEqual(originalReview); expect(prompt).toContain('Proposed prompt'); expect(prompt).toContain('Original first prompt');
    expect(prompt).not.toContain('PRIVATE_STUDENT_RESPONSE'); expect(prompt).not.toContain('PRIVATE_MEDIA');
  });
  it('cannot execute proposed actions even if an answer looks like a command plan', async () => {
    const items = [quiz()], first = await initial(items, [change('/title', 'Revised title')]), before = copy(items);
    const result = await S.explain(first.proposal, items, 'What happens if I apply?', { callGemini: async () => '{"changes":[{"path":"/title","after":"Unapproved"}]}' });
    expect(result.ok).toBe(true); expect(items).toEqual(before); expect(S.review(first.proposal).changes[0].after).toBe('Revised title');
  });
  it('keeps review valid on failed, cancelled or unsafe question answers', async () => {
    const items = [quiz()], first = await initial(items, [change('/title', 'Revised title')]);
    for (const answer of ['', '<script>bad</script>', 'x'.repeat(12001)]) expect((await S.explain(first.proposal, items, 'Why?', { callGemini: async () => answer })).ok).toBe(false);
    expect((await S.explain(first.proposal, items, 'Why?', { signal: { aborted: true }, callGemini: async () => 'Never.' })).ok).toBe(false);
    expect(S.apply(first.proposal, items).ok).toBe(true);
  });
});
