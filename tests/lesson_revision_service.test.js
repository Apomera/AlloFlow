import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let S;
const copy = value => JSON.parse(JSON.stringify(value));
const quiz = () => ({ id: 'quiz-1', type: 'quiz', title: 'Evidence check', data: { instructions: 'Explain your thinking.', questions: [
  { id: 'q1', type: 'mcq', question: 'Which is evidence?', options: ['A record', 'A guess'], correctAnswer: 'A record', imageUrl: 'data:retained' },
  { id: 'q2', type: 'short-answer', question: 'Why?', expectedAnswer: 'Connect the record to your claim.' }
] }, quizAnswers: { 0: 'A record', 1: 'My actual work' }, config: { studentAI: false }, customMedia: { retained: true } });
const directions = () => ({ id: 'directions-1', type: 'directions', title: 'Start here', data: { body: 'Read and discuss.', objectives: [{ id: 'o1', kind: 'manual', label: 'Explain with evidence.' }] }, studentProgress: { o1: true } });
const change = (path, after, resourceId = 'quiz-1') => ({ resourceId, path, after });
const prepare = (resources, changes, ids = ['quiz-1'], instruction = 'Make the prompt clearer.', extra = {}) => S.prepare(resources, ids, instruction, {
  callGemini: async () => JSON.stringify({ changes, unfulfilled: [], ...extra })
});
beforeEach(() => { const sandbox = vm.createContext({ window: {}, module: { exports: {} }, console, Date });
  for (const file of ['agent_core_pack_native_module.js', 'agent_core_resource_pack_module.js', 'lesson_revision_service.js']) vm.runInContext(readFileSync(file, 'utf8'), sandbox);
  S = sandbox.module.exports;
});

describe('exact native revision proposals', () => {
  it('prepares before/after fields without changing the original', async () => {
    const original = quiz(), before = copy(original);
    const result = await prepare([original], [change('/data/questions/1/question', 'What does the record support?')]);
    expect(result.ok).toBe(true); expect(original).toEqual(before);
    expect(S.review(result.proposal).changes[0]).toMatchObject({ before: 'Why?', after: 'What does the record support?', resourceId: 'quiz-1' });
  });
  it('applies to the exact saved ID, preserving answers, media, question IDs and settings', async () => {
    const original = quiz(), other = { ...quiz(), id: 'quiz-2' };
    const result = await prepare([original, other], [change('/data/questions/1/question', 'Explain the evidence.')]);
    const applied = S.apply(result.proposal, [original, other]);
    expect(applied.ok).toBe(true); expect(applied.resources[1]).toBe(other);
    const next = applied.resources[0];
    expect(next.id).toBe(original.id); expect(next.data.questions[0]).toEqual(original.data.questions[0]);
    expect(next.data.questions[1].id).toBe('q2'); expect(next.quizAnswers).toEqual(original.quizAnswers);
    expect(next.config).toEqual(original.config); expect(next.customMedia).toEqual(original.customMedia);
  });
  it('only sends explicitly selected editable fields to the provider', async () => {
    const original = quiz(); original.roster = [{ name: 'PRIVATE_ROSTER' }]; original.quizAnswers[1] = 'PRIVATE_ANSWER';
    let prompt;
    await S.prepare([original, { ...directions(), title: 'PRIVATE_OTHER_RESOURCE' }], ['quiz-1'], 'Clarify the directions.', { callGemini: async value => {
      prompt = value; return JSON.stringify({ changes: [change('/data/instructions', 'Read each prompt.')], unfulfilled: [] });
    } });
    expect(prompt).toContain('Explain your thinking.');
    ['PRIVATE_ROSTER', 'PRIVATE_ANSWER', 'PRIVATE_OTHER_RESOURCE', 'data:retained', 'studentAI'].forEach(value => expect(prompt).not.toContain(value));
  });
  it('can edit several exact selected resources atomically', async () => {
    const resources = [quiz(), directions()];
    const result = await prepare(resources, [change('/data/questions/1/question', 'Explain with evidence.'), change('/data/body', 'Read, think, then discuss.', 'directions-1')], ['quiz-1', 'directions-1']);
    const applied = S.apply(result.proposal, resources);
    expect(applied.resourceIds).toEqual(['quiz-1', 'directions-1']); expect(applied.changedCount).toBe(2);
    expect(applied.resources[1].studentProgress).toEqual({ o1: true });
  });
  it('does not silently accept unfulfilled parts of a request', async () => {
    const result = await prepare([quiz()], [change('/title', 'New title')], ['quiz-1'], 'Retitle and delete a question.', { unfulfilled: ['Deleting a question requires the native editor.'] });
    expect(result.ok).toBe(false); expect(result.error).toContain('Deleting');
  });
  it('accepts fenced JSON responses', async () => {
    const result = await S.prepare([quiz()], ['quiz-1'], 'Clarify.', { callGemini: async () => '```json\n' + JSON.stringify({ changes: [change('/title', 'New title')], unfulfilled: [] }) + '\n```' });
    expect(result.ok).toBe(true);
  });
  for (const [label, item] of [['unknown', { id: 'x', type: 'custom', data: {} }], ['primary source', { id: 'x', type: 'analysis', data: { originalText: 'Retain source.' } }], ['source protected', { ...quiz(), instructionalText: { form: 'same-text-supported' } }], ['unfamiliar shape', { id: 'x', type: 'quiz', title: 'Only title', data: {} }]]) {
    it('explains read-only ' + label, () => { expect(S.describeResources([item])[0]).toMatchObject({ supported: false }); expect(S.describeResources([item])[0].reason).toBeTruthy(); });
  }
  it('detects duplicate resource IDs rather than guessing a copy', async () => {
    expect(S.describeResources([quiz(), quiz()])[0].supported).toBe(false);
    expect((await prepare([quiz(), quiz()], [change('/title', 'X')])).ok).toBe(false);
  });
});

describe('closed native patch boundaries', () => {
  for (const path of ['/id', '/type', '/config/studentAI', '/quizAnswers/1', '/data/questions/0/id', '/data/questions/0/type', '/__proto__/polluted', '/data/questions/999/question', '/data/questions', '/data/questions/0/options/-', '/data/questions/0/imageUrl']) {
    it('rejects protected path ' + path, async () => { expect((await prepare([quiz()], [change(path, 'bad')])).ok).toBe(false); });
  }
  it('rejects a proposed unselected-resource edit', async () => { expect((await prepare([quiz(), directions()], [change('/data/body', 'Wrong target', 'directions-1')])).ok).toBe(false); });
  it('rejects nested replacement objects', async () => { expect((await prepare([quiz()], [change('/data/questions/0/question', { html: '<script>bad</script>' })])).ok).toBe(false); });
  it('rejects executable content', async () => { expect((await prepare([quiz()], [change('/title', '<script>alert(1)</script>')])).ok).toBe(false); });
  it('rejects duplicated field patches', async () => { expect((await prepare([quiz()], [change('/title', 'A'), change('/title', 'B')])).ok).toBe(false); });
  it('rejects mismatched correct answer after option edits', async () => { expect((await prepare([quiz()], [change('/data/questions/0/options/0', 'New option')])).ok).toBe(false); });
  it('accepts matching option and answer edits together', async () => { expect((await prepare([quiz()], [change('/data/questions/0/options/0', 'Written record'), change('/data/questions/0/correctAnswer', 'Written record')])).ok).toBe(true); });
  it('rejects oversized individual edits', async () => { expect((await prepare([quiz()], [change('/title', 'x'.repeat(12001))])).ok).toBe(false); });
  it('rejects missing response contract', async () => {
    expect((await S.prepare([quiz()], ['quiz-1'], 'Clarify.', { callGemini: async () => '{"changes":[]}' })).ok).toBe(false);
  });
  it('reports provider failures without exposing their error detail', async () => {
    const result = await S.prepare([quiz()], ['quiz-1'], 'Clarify.', { callGemini: async () => { throw Error('SECRET_KEY_PROVIDER'); } });
    expect(result.ok).toBe(false); expect(result.error).not.toContain('SECRET_KEY');
  });
  it('does not call a provider after cancellation', async () => {
    let calls = 0; const result = await S.prepare([quiz()], ['quiz-1'], 'Clarify.', { signal: { aborted: true }, callGemini: () => { calls++; } });
    expect(result.ok).toBe(false); expect(calls).toBe(0);
  });
  it('rejects a late provider result after cancellation', async () => {
    const signal = { aborted: false };
    const result = await S.prepare([quiz()], ['quiz-1'], 'Clarify.', { signal, callGemini: async () => { signal.aborted = true; return JSON.stringify({ changes: [change('/title', 'Late')], unfulfilled: [] }); } });
    expect(result.ok).toBe(false);
  });
});

describe('safe additions and field-level undo', () => {
  for (const [type, data, path, after] of [
    ['glossary', [{ term: 'evidence', def: 'A record.' }], '/data/0/def', 'Information supporting a claim.'],
    ['sentence-frames', { mode: 'list', items: [{ text: 'I think ___.' }], rubric: 'Use evidence.' }, '/data/items/0/text', 'My claim is ___ because ___.'],
    ['scaffolds', { frames: ['I notice ___.'] }, '/data/frames/0', 'The record shows ___.'],
    ['faq', [{ question: 'Why?', answer: 'Use evidence.' }], '/data/0/answer', 'Explain the evidence.'],
    ['outline', { main: 'Compare', branches: [{ title: 'Evidence', items: ['Find a detail.'] }] }, '/data/branches/0/items/0', 'Find a relevant detail.'],
    ['timeline', { items: [{ date: 'First', event: 'Read.' }] }, '/data/items/0/event', 'Read the source.'],
    ['lesson-plan', { essentialQuestion: 'Why?', objectives: ['Explain.'], successCriteria: [{ id: 's1', statement: 'I can explain.' }] }, '/data/essentialQuestion', 'What does our evidence support?'],
    ['anchor-chart', { title: 'Discuss', sections: [{ label: 'Listen', bullets: ['Hear the idea.'] }] }, '/data/sections/0/bullets/0', 'Listen for the speaker’s meaning.'],
    ['memory-aid', { instructions: 'Remember.', cards: [{ id: 'c1', target: 'CER', studentPrompt: 'Try it.' }] }, '/data/cards/0/studentPrompt', 'Create your own reminder.'],
    ['applied-challenge', { instructions: 'Decide.', brief: { drivingQuestion: 'Which option?', lockedLessonFacts: ['PROTECTED_FACT'] } }, '/data/instructions', 'Compare the options and explain your decision.'],
    ['simplified', 'This is a short reading for students to review together.', '/data', 'This clearer reading gives students time to compare evidence together.'],
    ['udl-advice', 'Offer thinking time.', '/data', 'Offer time to think and rehearse.']
  ]) {
    it('edits and reverses the native ' + type + ' shape', async () => {
      const item = { id: 'r', type, title: type, data, privateSidecar: { keep: true } };
      const result = await prepare([item], [change(path, after, 'r')], ['r']); expect(result.ok).toBe(true);
      const applied = S.apply(result.proposal, [item]); expect(applied.ok).toBe(true); expect(applied.resources[0].privateSidecar).toEqual(item.privateSidecar);
      expect(S.undo(applied.undo, applied.resources).resources[0]).toEqual(item);
    });
  }
  it('appends a native question and preserves existing indices and IDs', async () => {
    const original = quiz(); const result = await prepare([original], [change('/data/questions/-', { type: 'short-answer', question: 'What remains uncertain?', expectedAnswer: 'Explain a limitation.' })]);
    const applied = S.apply(result.proposal, [original]); expect(applied.ok).toBe(true);
    expect(applied.resources[0].data.questions.slice(0, 2)).toEqual(original.data.questions);
    expect(applied.resources[0].data.questions[2]).toMatchObject({ type: 'short-answer', question: 'What remains uncertain?' });
    expect(applied.resources[0].data.questions[2].id).toBeTruthy(); expect(applied.resources[0].quizAnswers).toEqual(original.quizAnswers);
    expect(S.undo(applied.undo, applied.resources).resources[0]).toEqual(original);
  });
  it('appends multiple discussion prompts in their reviewed order', async () => {
    const activity = { id: 'a', type: 'brainstorm', title: 'Discuss', data: [{ title: 'Compare', questionSets: [{ depth: 'inferential', questions: ['Why?'] }] }] };
    const result = await prepare([activity], [change('/data/0/questionSets/0/questions/-', 'What changed?', 'a'), change('/data/0/questionSets/0/questions/-', 'What is still uncertain?', 'a')], ['a']);
    const applied = S.apply(result.proposal, [activity]);
    expect(applied.resources[0].data[0].questionSets[0].questions).toEqual(['Why?', 'What changed?', 'What is still uncertain?']);
  });
  it('protects learner notebook writing while editing guidance', async () => {
    const item = { id: 'n', type: 'note-taking', title: 'Notes', data: { title: 'My notes', cues: [{ id: 'c1', text: 'Evidence', guidance: 'Explain.' }], notes: [{ id: 'n1', text: 'PRIVATE_WRITING' }], summary: 'PRIVATE_SUMMARY' } };
    let prompt;
    const result = await S.prepare([item], ['n'], 'Clarify guidance.', { callGemini: async value => { prompt = value; return JSON.stringify({ changes: [change('/data/cues/0/guidance', 'Explain what the evidence supports.', 'n')], unfulfilled: [] }); } });
    expect(result.ok).toBe(true); expect(prompt).not.toContain('PRIVATE_');
    expect(S.apply(result.proposal, [item]).resources[0].data.notes).toEqual(item.data.notes);
    expect((await prepare([item], [change('/data/summary', 'Replace work', 'n')], ['n'])).ok).toBe(false);
  });
  for (const value of [{ id: 'injected', type: 'short-answer', question: 'Q', expectedAnswer: 'A' }, { type: 'mcq', question: 'Q', options: ['A', 'B'], correctAnswer: 'C' }, { type: 'essay', question: 'Q' }]) {
    it('rejects an invalid added question ' + JSON.stringify(value), async () => { expect((await prepare([quiz()], [change('/data/questions/-', value)])).ok).toBe(false); });
  }
  it('rejects apply when selected native material changed', async () => {
    const original = quiz(); const result = await prepare([original], [change('/title', 'Revised')]);
    const changed = copy(original); changed.data.questions.reverse();
    expect(S.apply(result.proposal, [changed]).ok).toBe(false); expect(changed.title).toBe('Evidence check');
  });
  it('preserves learner responses that arrive after review', async () => {
    const original = quiz(); const result = await prepare([original], [change('/title', 'Revised')]);
    const current = { ...original, quizAnswers: { 1: 'New actual answer' } };
    expect(S.apply(result.proposal, [current]).resources[0].quizAnswers).toEqual(current.quizAnswers);
  });
  it('keeps unrelated later edits and resources when undoing touched text', async () => {
    const original = quiz(); const result = await prepare([original], [change('/data/questions/1/question', 'Revised question')]);
    const applied = S.apply(result.proposal, [original]); const current = copy(applied.resources[0]);
    current.data.instructions = 'Later manual instructions'; current.quizAnswers[1] = 'Later answer'; current.updatedAt = 'later';
    const extra = directions(); const undone = S.undo(applied.undo, [current, extra]);
    expect(undone.ok).toBe(true); expect(undone.resources[0].data.questions[1].question).toBe('Why?');
    expect(undone.resources[0].data.instructions).toBe('Later manual instructions'); expect(undone.resources[0].quizAnswers[1]).toBe('Later answer');
    expect(undone.resources[1]).toBe(extra);
  });
  it('refuses undo that would overwrite a newer edit to the revised field', async () => {
    const result = await prepare([quiz()], [change('/title', 'Revised')]); const applied = S.apply(result.proposal, [quiz()]);
    applied.resources[0].title = 'A later title'; expect(S.undo(applied.undo, applied.resources).ok).toBe(false);
    expect(applied.resources[0].title).toBe('A later title');
  });
  it('does not restore an old correct answer after its option was independently replaced', async () => {
    const original = quiz(), result = await prepare([original], [change('/data/questions/0/correctAnswer', 'A guess')]);
    const applied = S.apply(result.proposal, [original]); expect(applied.ok).toBe(true);
    applied.resources[0].data.questions[0].options[0] = 'Another option';
    expect(S.undo(applied.undo, applied.resources).ok).toBe(false);
    expect(applied.resources[0].data.questions[0].correctAnswer).toBe('A guess');
  });
  it('does not replay applied or discarded proposals or completed undo records', async () => {
    const result = await prepare([quiz()], [change('/title', 'Revised')]); const applied = S.apply(result.proposal, [quiz()]);
    expect(S.apply(result.proposal, [quiz()]).ok).toBe(false); expect(S.undo(applied.undo, applied.resources).ok).toBe(true); expect(S.undo(applied.undo, applied.resources).ok).toBe(false);
    const other = await prepare([quiz()], [change('/title', 'Revised')]); S.discard(other.proposal); expect(S.review(other.proposal)).toBe(null); expect(S.apply(other.proposal, [quiz()]).ok).toBe(false);
  });
  it('does not accept fabricated proposal or undo objects', () => { expect(S.apply({ selected: [] }, [quiz()]).ok).toBe(false); expect(S.undo({ paths: [] }, [quiz()]).ok).toBe(false); });
  it('adds a paired blank response row for a new Cornell cue', async () => {
    const item = { id: 'n', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', cues: [{ id: 'c1', text: 'Evidence' }], notes: [{ id: 'n1', text: 'Retained actual writing' }], summary: '' } };
    const result = await prepare([item], [change('/data/cues/-', { text: 'Uncertainty', guidance: 'What is still unknown?' }, 'n')], ['n']); expect(result.ok).toBe(true);
    const review = S.review(result.proposal); expect(review.changes).toHaveLength(2); expect(review.changes[1].label).toBe('New blank response field');
    const applied = S.apply(result.proposal, [item]), data = applied.resources[0].data;
    expect(data.cues).toHaveLength(2); expect(data.notes).toHaveLength(2); expect(data.notes[0]).toEqual(item.data.notes[0]); expect(data.notes[1].text).toBe('');
    expect(S.undo(applied.undo, applied.resources).resources[0]).toEqual(item);
  });
  it('does not undo a new cue after the student has written in its response row', async () => {
    const item = { id: 'n', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', cues: [], notes: [], summary: '' } };
    const result = await prepare([item], [change('/data/cues/-', { text: 'Evidence' }, 'n')], ['n']); const applied = S.apply(result.proposal, [item]);
    applied.resources[0].data.notes[0].text = 'New student work';
    expect(S.undo(applied.undo, applied.resources).ok).toBe(false); expect(applied.resources[0].data.notes[0].text).toBe('New student work');
  });
  it('adds a Q&A prompt with a blank learner answer that never goes to AI', async () => {
    const item = { id: 'n', type: 'note-taking', title: 'Notes', data: { templateType: 'q-and-a', pairs: [{ id: 'p1', question: 'Why?', answer: 'PRIVATE_STUDENT_WRITING' }] } };
    const result = await prepare([item], [change('/data/pairs/-', { question: 'What remains uncertain?' }, 'n')], ['n']); expect(result.ok).toBe(true);
    const next = S.apply(result.proposal, [item]).resources[0]; expect(next.data.pairs[0]).toEqual(item.data.pairs[0]); expect(next.data.pairs[1].answer).toBe('');
  });
  it('refuses Apply if source protection was added after review', async () => {
    const item = quiz(), result = await prepare([item], [change('/title', 'Revised')]);
    expect(S.apply(result.proposal, [{ ...item, instructionalText: { form: 'same-text-supported' } }]).ok).toBe(false);
  });
  it('refuses Undo if revised material is now protected', async () => {
    const result = await prepare([quiz()], [change('/title', 'Revised')]), applied = S.apply(result.proposal, [quiz()]);
    applied.resources[0].config.instructionalText = { form: 'same-text-supported' }; expect(S.undo(applied.undo, applied.resources).ok).toBe(false);
  });
  for (const [path, after] of [['/data/questions/1/question', ''], ['/data/questions/0/options/1', 'A record'], ['/title', 'x'.repeat(241)]]) {
    it('rejects newly invalid native fields ' + path, async () => { expect((await prepare([quiz()], [change(path, after)])).ok).toBe(false); });
  }
  it('rejects guidance that exceeds the actual native notebook limit', async () => {
    const item = { id: 'n', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', cues: [{ id: 'c1', text: 'Evidence', guidance: 'Explain.' }], notes: [{ id: 'n1', text: '' }], summary: '' } };
    expect((await prepare([item], [change('/data/cues/0/guidance', 'x'.repeat(1001), 'n')], ['n'])).ok).toBe(false);
  });
});
