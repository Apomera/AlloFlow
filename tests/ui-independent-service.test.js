import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let S;
const copy = value => JSON.parse(JSON.stringify(value));
const question = (id, text) => ({ id, type: 'short-answer', question: text, expectedAnswer: 'Give a reason.' });
const quiz = () => ({ id: 'quiz', type: 'quiz', title: 'Discussion', data: { questions: [question('q1', 'Original prompt'), question('q2', 'Revised prompt')] } });
const revision = async (resource, path, after) => S.prepare([resource], [resource.id], 'Revise the selected prompt.', {
  callGemini: async () => JSON.stringify({ changes: [{ resourceId: resource.id, path, after }], unfulfilled: [] }),
});
beforeEach(() => {
  const sandbox = vm.createContext({ window: {}, module: { exports: {} }, console, Date });
  for (const file of ['agent_core_pack_native_module.js', 'agent_core_resource_pack_module.js', 'lesson_revision_service.js']) vm.runInContext(readFileSync(file, 'utf8'), sandbox);
  S = sandbox.module.exports;
});

describe('independent native revision target and append boundaries', () => {
  it('rejects Undo after equal-text question rows are reordered', async () => {
    const original = quiz();
    const prepared = await revision(original, '/data/questions/0/question', 'Revised prompt'); expect(prepared.ok).toBe(true);
    const applied = S.apply(prepared.proposal, [original]); expect(applied.ok).toBe(true);
    const current = copy(applied.resources[0]); current.data.questions.reverse();
    const undone = S.undo(applied.undo, [current]);
    expect(undone.ok).toBe(false);
    expect(current.data.questions[0]).toMatchObject({ id: 'q2', question: 'Revised prompt' });
  });
  it('rejects Undo after equal-text unkeyed glossary rows are reordered', async () => {
    const original = { id: 'glossary', type: 'glossary', title: 'Vocabulary', data: [
      { term: 'alpha', def: 'Original definition', tier: 'Academic' }, { term: 'beta', def: 'Revised definition', tier: 'Academic' },
    ] };
    const prepared = await revision(original, '/data/0/def', 'Revised definition'); expect(prepared.ok).toBe(true);
    const applied = S.apply(prepared.proposal, [original]); const current = copy(applied.resources[0]); current.data.reverse();
    expect(S.undo(applied.undo, [current]).ok).toBe(false);
    expect(current.data[0]).toMatchObject({ term: 'beta', def: 'Revised definition' });
  });
  it('preserves unrelated later edits when the revised stable question stays at its index', async () => {
    const original = quiz(); const prepared = await revision(original, '/data/questions/0/question', 'Revised prompt');
    const applied = S.apply(prepared.proposal, [original]); const current = copy(applied.resources[0]);
    current.data.questions[1].question = 'Later independent edit'; current.quizAnswers = { 1: 'Later student writing' };
    const undone = S.undo(applied.undo, [current]); expect(undone.ok).toBe(true);
    expect(undone.resources[0].data.questions[0].question).toBe('Original prompt');
    expect(undone.resources[0].data.questions[1].question).toBe('Later independent edit');
    expect(undone.resources[0].quizAnswers).toEqual({ 1: 'Later student writing' });
  });
  it('does not assign an existing question ID when adding after a fresh module load', async () => {
    const original = quiz(); original.data.questions[0].id = 'revision-question-1';
    const prepared = await revision(original, '/data/questions/-', { type: 'short-answer', question: 'A new prompt', expectedAnswer: 'Explain.' });
    expect(prepared.ok).toBe(true);
    const applied = S.apply(prepared.proposal, [original]); expect(applied.ok).toBe(true);
    const ids = applied.resources[0].data.questions.map(row => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('can add a Cornell cue after reopening a notebook with a prior revision row ID', async () => {
    const original = { id: 'notes', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', title: 'Notes',
      cues: [{ id: 'revision-item-1', text: 'Evidence' }], notes: [{ id: 'revision-item-1-response', text: 'Kept writing' }], summary: '' } };
    const prepared = await revision(original, '/data/cues/-', { text: 'Reasoning', guidance: 'Explain the connection.' });
    expect(prepared.ok).toBe(true);
    const applied = S.apply(prepared.proposal, [original]); expect(applied.ok).toBe(true);
    expect(applied.resources[0].data.notes[0].text).toBe('Kept writing');
    expect(new Set(applied.resources[0].data.cues.map(row => row.id)).size).toBe(2);
    expect(new Set(applied.resources[0].data.notes.map(row => row.id)).size).toBe(2);
  });
  it.each([
    ['/data/questions/-', { type: 'short-answer', question: '<script>alert(1)</script>', expectedAnswer: 'Explain.' }],
    ['/data/questions/-', { type: 'short-answer', question: 'Valid prompt', expectedAnswer: '<iframe src="https://example.invalid"></iframe>' }],
  ])('rejects prohibited executable tags in added native question fields (%s)', async (path, after) => {
    expect((await revision(quiz(), path, after)).ok).toBe(false);
  });
  it('rejects prohibited executable tags in an added text-list item', async () => {
    const original = { id: 'outline', type: 'outline', title: 'Outline', data: { main: 'Reasoning', branches: [{ title: 'First', items: ['Original point'] }] } };
    expect((await revision(original, '/data/branches/0/items/-', '<svg onload="alert(1)"></svg>')).ok).toBe(false);
  });
});
