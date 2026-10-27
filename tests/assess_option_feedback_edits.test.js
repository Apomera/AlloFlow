import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('host_handlers_source.jsx', 'utf8');
const start = source.indexOf('const handleQuizChange =');
const end = source.indexOf('const handleFactCheck =', start);
if (start < 0 || end <= start) throw new Error('Quiz edit handler boundaries are missing.');
const create = new Function('__d', source.slice(start, end) + '\nreturn { handleQuizChange, handleQuizQuestionAction };');

function harness() {
  const original = { type: 'mcq', question: 'Which is living?', options: ['Tree', 'Rock'], correctAnswer: 'Tree', optionFeedback: ['A tree grows.', 'A rock is nonliving.'] };
  const deps = { generatedContent: { id: 'quiz', type: 'quiz', data: { questions: [original] } } };
  let history = [deps.generatedContent];
  deps.setGeneratedContent = value => { deps.generatedContent = typeof value === 'function' ? value(deps.generatedContent) : value; };
  deps.setHistory = value => { history = typeof value === 'function' ? value(history) : value; };
  return { ...create(deps), original, question: () => deps.generatedContent.data.questions[0], saved: () => history[0].data.questions[0] };
}

describe('Assess edited option feedback', () => {
  it.each([['question', 'Which is nonliving?', null], ['option', 'Flower', 0], ['correctAnswer', 'Rock', null]])('clears stale feedback for a nontranslation %s edit in selected and saved copies', (field, value, option) => {
    const h = harness();
    h.handleQuizChange(0, field, value, option);
    expect(h.question().optionFeedback).toEqual([]);
    expect(h.saved().optionFeedback).toEqual([]);
    expect(h.original.optionFeedback).toEqual(['A tree grows.', 'A rock is nonliving.']);
  });
  it.each([['question', 'Translated question', null], ['option', 'Translated option', 0]])('preserves feedback when only the %s translation changes', (field, value, option) => {
    const h = harness(); h.handleQuizChange(0, field, value, option, true);
    expect(h.question().optionFeedback).toEqual(h.original.optionFeedback);
  });
  it.each([{ question: 'A different question' }, { options: ['Rock', 'Tree'] }, { options: ['Tree'] }, { correctAnswer: 'Rock' }, { correctAnswers: ['Rock'] }])('clears stale feedback for a semantic patch %j', async patch => {
    const h = harness(); await h.handleQuizQuestionAction(0, 'patch', patch);
    expect(h.question().optionFeedback).toEqual([]);
    expect(h.saved().optionFeedback).toEqual([]);
  });
  it('keeps explicitly supplied replacement feedback when aligned to the new choices', async () => {
    const h = harness(), fresh = ['A rock is nonliving.', 'A tree grows.'];
    await h.handleQuizQuestionAction(0, 'patch', { options: ['Rock', 'Tree'], optionFeedback: fresh });
    expect(h.question().optionFeedback).toEqual(fresh);
    expect(h.saved().optionFeedback).toEqual(fresh);
  });
  it('rejects mismatched replacement feedback after a choice edit', async () => {
    const h = harness(); await h.handleQuizQuestionAction(0, 'patch', { options: ['Tree'], optionFeedback: ['One', 'Two'] });
    expect(h.question().optionFeedback).toEqual([]);
  });
  it('preserves feedback across metadata, unchanged values, and translation patches', async () => {
    const h = harness(); await h.handleQuizQuestionAction(0, 'patch', { conceptLabel: 'living things', question: h.original.question, options: [...h.original.options], question_en: 'Translated' });
    expect(h.question().optionFeedback).toEqual(h.original.optionFeedback);
  });
  it('allows a teacher to edit feedback by itself', async () => {
    const h = harness(), edited = ['Revised explanation.', 'Another explanation.'];
    await h.handleQuizQuestionAction(0, 'patch', { optionFeedback: edited });
    expect(h.question().optionFeedback).toEqual(edited);
  });
});
