import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('host_handlers_source.jsx', 'utf8');
const start = source.indexOf('const handleQuizQuestionAction =');
const end = source.indexOf('const handleFactCheck =', start);
if (start < 0 || end <= start) throw new Error('Assess action handler was not found');
const createHandler = new Function('__d', source.slice(start, end) + ';return handleQuizQuestionAction;');
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function fixture() {
  const initial = freeze({ id: 'quiz-one', type: 'quiz', title: 'Original title', data: {
    questions: [
      { type: 'mcq', question: 'Original first?', options: ['A', 'B'], correctAnswer: 'A', factCheck: 'Old check' },
      { type: 'mcq', question: 'Original second?', options: ['C', 'D'], correctAnswer: 'C' },
      { type: 'short-answer', question: 'An untouched sibling.', rubric: 'Original rubric.' },
    ],
    requestedItemTypeMix: { mcq: 2, 'short-answer': 1 }, actualItemTypeMix: { mcq: 2, 'short-answer': 1 }, itemCountMismatch: false,
    deliverySettings: { feedbackTiming: 'after-submit' },
  } });
  const other = freeze({ id: 'quiz-other', type: 'quiz', data: { questions: [{ type: 'mcq', question: 'Other resource?' }] } });
  const state = { current: initial, history: freeze([clone(initial), other]) };
  const generatedQueue = [], historyQueue = [];
  const deps = {
    get generatedContent() { return state.current; },
    setGeneratedContent: vi.fn(update => generatedQueue.push(update)),
    setHistory: vi.fn(update => historyQueue.push(update)),
  };
  const handle = createHandler(deps);
  const guard = index => ({ resourceId: initial.id, questionIndex: index, question: initial.data.questions[index], questionSignature: JSON.stringify(initial.data.questions[index]) });
  function flush(order = 'generated-first') {
    const generated = () => { while (generatedQueue.length) { const update = generatedQueue.shift(); state.current = typeof update === 'function' ? update(state.current) : update; } };
    const history = () => { while (historyQueue.length) { const update = historyQueue.shift(); state.history = typeof update === 'function' ? update(state.history) : update; } };
    if (order === 'history-first') { history(); generated(); } else { generated(); history(); }
  }
  return { initial, other, state, deps, handle, guard, generatedQueue, historyQueue, flush };
}
const replacements = [
  { type: 'numeric-response', question: 'Regenerated first?', correctValue: 5 },
  { type: 'short-answer', question: 'Regenerated second?', expectedAnswer: 'A thoughtful explanation.' },
];
function editQuestion(item, index, patch) {
  const questions = item.data.questions.slice(); questions[index] = { ...questions[index], ...patch };
  return { ...item, data: { ...item.data, questions } };
}

describe('guarded question regeneration commits against latest state', () => {
  it.each([
    [[0, 1], 'generated-first'], [[1, 0], 'generated-first'], [[0, 1], 'history-first'], [[1, 0], 'history-first'],
  ])('keeps both same-tick completions in order %j with %s state flushing', async (order, flushOrder) => {
    const f = fixture();
    const results = await Promise.all(order.map(index => f.handle(index, 'replace', replacements[index], f.guard(index))));
    expect(results).toEqual([{ status: 'queued' }, { status: 'queued' }]);
    expect(f.state.current).toBe(f.initial);
    expect(f.generatedQueue).toHaveLength(2);
    expect(f.generatedQueue.every(update => typeof update === 'function')).toBe(true);
    f.flush(flushOrder);
    for (const item of [f.state.current, f.state.history[0]]) {
      expect(item.data.questions.slice(0, 2)).toEqual(replacements.map(value => ({ ...value, factCheck: null })));
      expect(item.data.questions[2]).toEqual(f.initial.data.questions[2]);
      expect(item.data.actualItemTypeMix).toEqual({ 'numeric-response': 1, 'short-answer': 2 });
      expect(item.data.itemCountMismatch).toBe(true);
    }
    expect(f.state.history[1]).toBe(f.other);
    expect(f.initial.data.questions[0].question).toBe('Original first?');
  });

  it('preserves a queued sibling edit and latest assessment settings', async () => {
    const f = fixture();
    const manual = item => ({ ...editQuestion(item, 2, { rubric: 'Teacher revised rubric.' }), title: 'Teacher revised title', data: {
      ...editQuestion(item, 2, { rubric: 'Teacher revised rubric.' }).data,
      requestedItemTypeMix: { 'numeric-response': 1, mcq: 1, 'short-answer': 1 }, deliverySettings: { feedbackTiming: 'teacher-graded' },
    } });
    f.generatedQueue.push(manual);
    f.historyQueue.push(previous => previous.map(item => item.id === f.initial.id ? manual(item) : item));
    await f.handle(0, 'replace', replacements[0], f.guard(0));
    f.flush();
    for (const item of [f.state.current, f.state.history[0]]) {
      expect(item).toMatchObject({ title: 'Teacher revised title', data: { deliverySettings: { feedbackTiming: 'teacher-graded' }, itemCountMismatch: false } });
      expect(item.data.questions[0].question).toBe('Regenerated first?');
      expect(item.data.questions[2].rubric).toBe('Teacher revised rubric.');
    }
  });

  it.each(['edit', 'reorder', 'delete'])('rejects a target %s queued before the regeneration commit', async change => {
    const f = fixture();
    const manual = item => {
      if (change === 'edit') return editQuestion(item, 0, { question: 'Teacher target edit.' });
      const questions = item.data.questions.slice();
      if (change === 'delete') questions.splice(0, 1); else [questions[0], questions[1]] = [questions[1], questions[0]];
      return { ...item, data: { ...item.data, questions } };
    };
    f.generatedQueue.push(manual);
    f.historyQueue.push(previous => previous.map(item => item.id === f.initial.id ? manual(item) : item));
    await f.handle(0, 'replace', replacements[0], f.guard(0));
    f.flush();
    expect(f.state.current).toEqual(manual(f.initial));
    expect(f.state.history[0]).toEqual(manual(f.initial));
    expect(JSON.stringify(f.state.current)).not.toContain('Regenerated first?');
  });

  it('rejects already observed navigation without queuing either update', async () => {
    const f = fixture(); f.state.current = f.other;
    expect(await f.handle(0, 'replace', replacements[0], f.guard(0))).toBe(false);
    expect(f.deps.setGeneratedContent).not.toHaveBeenCalled(); expect(f.deps.setHistory).not.toHaveBeenCalled();
  });

  it('protects the active new resource if navigation was queued before flushing an accepted commit', async () => {
    const f = fixture(); f.generatedQueue.push(() => f.other);
    expect(await f.handle(0, 'replace', replacements[0], f.guard(0))).toEqual({ status: 'queued' });
    f.flush();
    expect(f.state.current).toBe(f.other);
    // A commit accepted before navigation may finish on its correct historical
    // resource; it must never apply to the newly active resource.
    expect(f.state.history[0].data.questions[0].question).toBe('Regenerated first?');
    expect(f.state.history[1]).toBe(f.other);
  });

  it('requires the original current target object even when a replacement looks identical', async () => {
    const f = fixture(); f.state.current = clone(f.initial);
    expect(await f.handle(0, 'replace', replacements[0], f.guard(0))).toBe(false);
    expect(f.generatedQueue).toHaveLength(0);
  });

  it('rejects an in-place target edit even though object identity is unchanged', async () => {
    const f = fixture(); f.state.current = clone(f.initial);
    const question = f.state.current.data.questions[0];
    const guard = { resourceId: f.initial.id, questionIndex: 0, question, questionSignature: JSON.stringify(question) };
    question.question = 'Edited in place while the provider was pending.';
    expect(await f.handle(0, 'replace', replacements[0], guard)).toBe(false);
    expect(f.generatedQueue).toHaveLength(0); expect(f.historyQueue).toHaveLength(0);
  });

  it('rejects wrong indices without clamping to another question', async () => {
    const f = fixture();
    expect(await f.handle(1, 'replace', replacements[0], f.guard(0))).toBe(false);
    expect(await f.handle(99, 'replace', replacements[0], { ...f.guard(0), questionIndex: 99 })).toBe(false);
    expect(f.generatedQueue).toHaveLength(0);
  });

  it('does not recreate a deleted historical resource or select ambiguous copies', async () => {
    for (const history of [[], [fixture().initial, fixture().initial]]) {
      const f = fixture(); f.historyQueue.push(() => history);
      await f.handle(0, 'replace', replacements[0], f.guard(0)); f.flush();
      expect(f.state.history).toBe(history);
    }
  });

  it('uses replay-safe pure updaters without mutating their input or reporting an applied result', async () => {
    const f = fixture();
    expect(await f.handle(0, 'replace', replacements[0], f.guard(0))).toEqual({ status: 'queued' });
    const generated = f.generatedQueue[0], history = f.historyQueue[0];
    expect(generated(f.initial)).toEqual(generated(f.initial));
    expect(history(f.state.history)).toEqual(history(f.state.history));
    expect(f.state.current).toBe(f.initial);
    expect(f.deps.setGeneratedContent).toHaveBeenCalledTimes(1); expect(f.deps.setHistory).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing unguarded replace action', async () => {
    const f = fixture(); await f.handle(0, 'replace', replacements[0]);
    expect(typeof f.generatedQueue[0]).toBe('object');
    f.flush(); expect(f.state.current.data.questions[0]).toEqual({ ...replacements[0], factCheck: null });
  });
});
