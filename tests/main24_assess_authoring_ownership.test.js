
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');
const React = require(resolve('desktop/web-app/node_modules/react'));
const source = readFileSync('view_quiz_source.jsx', 'utf8');
const ast = parse(source, { sourceType: 'script', plugins: ['jsx'] });
const functions = {};
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && node.id) functions[node.id.name] = source.slice(node.start, node.end);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
}
visit(ast);
let api;
beforeAll(() => {
  window.React = React;
  window.AlloModules = {};
  const registration = '  window.AlloModules.QuizView = QuizView;';
  const runtime = readFileSync('view_quiz_module.js', 'utf8').replace(registration, registration + '\n window.AlloModules.__AuthoringTest = { create: _quizCreateAuthoringRequests, extract: _quizExtractJson, schema: _quizSchemaForType, matches: _quizAnswerMatches };');
  new Function('window', runtime)(window);
  api = window.AlloModules.__AuthoringTest;
});
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const specs = [
  { name: 'question regeneration', method: 'regenerateAssessmentQuestion', args: ctx => [0, ctx.generatedContent.data.questions[0]], result: { type: 'mcq', question: 'Improved?', options: ['Yes', 'No'], correctAnswer: 'Yes' }, callback: 'handleQuizQuestionAction' },
  { name: 'assessment repair', method: 'repairAssessmentQuality', args: () => [], result: { questions: [{ type: 'mcq', question: 'Repaired?', options: ['Yes', 'No'], correctAnswer: 'Yes' }] }, callback: 'handleQuizQuestionAction' },
  { name: 'picture refinement', method: 'refineQuizImage', args: () => [0, 'question', null, 'Make the river clearer.'], result: 'data:image/png;base64,NEW', callback: 'handleQuizImageRefine', image: true },
  { name: 'distractor improvement', method: 'improveDistractor', args: () => [0, 1, 'No', 'Too implausible'], result: 'A plausible misconception', callback: 'handleQuizChange', text: true },
  { name: 'bulk distractor improvement', method: 'bulkImproveDistractors', args: () => [], result: 'A plausible misconception', callback: 'handleQuizBulkOptionChange', text: true }
];
function fixture(spec) {
  const request = deferred();
  const question = { type: 'mcq', question: 'Original?', options: ['Yes', 'No'], correctAnswer: 'Yes', imageUrl: 'data:image/png;base64,AAAA', distractorQuality: [{ distractor: 'No', encodesMisconception: false, reason: 'Too implausible' }] };
  const props = { generatedContent: { id: 'quiz-one', type: 'quiz', data: { questions: [question] } }, inputText: 'A lesson about rivers.', gradeLevel: '8th Grade', isTeacherMode: true, callGemini: vi.fn(() => request.promise), handleQuizQuestionAction: vi.fn(), addToast: vi.fn() };
  const latest = { props };
  const ctx = {
    props, generatedContent: props.generatedContent, authoringRequests: api.create(() => latest.props),
    assessmentAudit: { requestedMix: { mcq: 1 }, actualMix: { mcq: 1 }, issues: [], questions: [question] },
    _quizExtractJson: api.extract, _quizSchemaForType: api.schema, _quizAnswerMatches: api.matches,
    addToast: props.addToast, t: key => key, isImprovingDistractor: {}, isBulkImproving: false,
    quizImageRefineInputs: {}, callGeminiImageEdit: vi.fn(() => request.promise),
    handleQuizChange: vi.fn(), handleQuizImageRefine: vi.fn(), handleQuizBulkOptionChange: vi.fn()
  };
  for (const setter of ['setRegeneratingQuestions', 'setRepairingAssessment', 'setIsRefiningQuizImage', 'setQuizImageRefineInputs', 'setRefineOpen', 'setIsImprovingDistractor', 'setIsBulkImproving']) ctx[setter] = vi.fn();
  ctx.refineKey = new Function(functions.refineKey + '; return refineKey;')();
  const run = new Function(...Object.keys(ctx), functions[spec.method] + '\nreturn ' + spec.method + ';')(...Object.values(ctx));
  return { ctx, request, latest, invoke: run, run: () => run(...spec.args(ctx)), callback: spec.callback === 'handleQuizQuestionAction' ? props.handleQuizQuestionAction : ctx[spec.callback], provider: spec.image ? ctx.callGeminiImageEdit : props.callGemini };
}
describe('Assess actual AI authoring continuation guards', () => {
  it.each(specs)('$name applies a current response once and blocks duplicate requests', async spec => {
    const f = fixture(spec);
    const first = f.run(), duplicate = f.run();
    await Promise.resolve(); await Promise.resolve();
    expect(f.provider).toHaveBeenCalledTimes(1);
    f.request.resolve(spec.text || spec.image ? spec.result : JSON.stringify(spec.result));
    await Promise.all([first, duplicate]);
    expect(f.callback).toHaveBeenCalledTimes(1);
  });
  for (const change of ['navigation', 'intervening edit', 'unmount']) {
    it.each(specs)('$name rejects late writes after ' + change, async spec => {
      const f = fixture(spec);
      const run = f.run();
      if (change === 'unmount') f.ctx.authoringRequests.clear();
      else {
        const original = f.latest.props.generatedContent;
        f.latest.props = { ...f.latest.props, generatedContent: { ...original, ...(change === 'navigation' ? { id: 'quiz-two' } : { data: { ...original.data, questions: [{ ...original.data.questions[0], question: 'Manual edit' }] } }) } };
      }
      f.request.resolve(spec.text || spec.image ? spec.result : JSON.stringify(spec.result));
      await run;
      expect(f.callback).not.toHaveBeenCalled();
      expect(f.ctx.props.addToast.mock.calls.some(call => call[1] === 'success')).toBe(false);
    });
  }
  it('bulk distractor improvement recovers from providers that throw before returning a promise', async () => {
    const f = fixture(specs[4]);
    f.ctx.props.callGemini.mockImplementation(() => { throw new Error('Provider unavailable'); });
    await expect(f.run()).resolves.toBeUndefined();
    expect(f.ctx.setIsBulkImproving).toHaveBeenLastCalledWith(false);
    expect(f.callback).not.toHaveBeenCalled();
  });

  it.each([[0, 1], [1, 0]])('keeps independent question results when completion order is %j', async (first, second) => {
    const f = fixture(specs[0]);
    const questions = f.ctx.generatedContent.data.questions;
    questions.push({ type: 'numeric-response', question: 'Original second?', correctValue: 4 });
    const waits = [f.request, deferred()];
    f.provider.mockImplementationOnce(() => waits[0].promise).mockImplementationOnce(() => waits[1].promise);
    f.callback.mockImplementation((index, action, replacement, guard) => {
      const current = f.latest.props.generatedContent;
      expect(guard).toMatchObject({ resourceId: current.id, questionIndex: index, question: current.data.questions[index], questionSignature: JSON.stringify(current.data.questions[index]) });
      f.latest.props = { ...f.latest.props, generatedContent: { ...current, data: {
        ...current.data, questions: current.data.questions.map((q, i) => i === index ? replacement : q),
        actualItemTypeMix: { mcq: 1, 'numeric-response': 1 }, itemCountMismatch: false,
      } } };
      return { status: 'queued' };
    });
    const pending = questions.map((question, index) => f.invoke(index, question));
    waits[first].resolve(JSON.stringify({ question: 'Regenerated ' + first, correctValue: 5 }));
    await pending[first];
    waits[second].resolve(JSON.stringify({ question: 'Regenerated ' + second, correctValue: 6 }));
    await pending[second];
    expect(f.callback).toHaveBeenCalledTimes(2);
    expect(f.latest.props.generatedContent.data.questions.map(q => q.question)).toEqual(['Regenerated 0', 'Regenerated 1']);
    expect(f.latest.props.generatedContent.data.questions.map(q => q.type)).toEqual(['mcq', 'numeric-response']);
    expect(f.ctx.props.addToast).not.toHaveBeenCalled();
  });

  it('uses the latest host callback while preserving unrelated manual question edits', async () => {
    const f = fixture(specs[0]);
    f.ctx.generatedContent.data.questions.push({ type: 'mcq', question: 'Second?', options: ['A', 'B'], correctAnswer: 'A' });
    const pending = f.run();
    const content = f.latest.props.generatedContent;
    const latestHandler = vi.fn().mockResolvedValue({ status: 'queued' });
    f.latest.props = { ...f.latest.props, handleQuizQuestionAction: latestHandler, generatedContent: { ...content, data: { ...content.data, questions: [content.data.questions[0], { ...content.data.questions[1], question: 'Teacher edited second' }] } } };
    f.request.resolve(JSON.stringify(specs[0].result)); await pending;
    expect(f.callback).not.toHaveBeenCalled();
    expect(latestHandler).toHaveBeenCalledWith(0, 'replace', specs[0].result, expect.objectContaining({ question: content.data.questions[0] }));
  });

  it.each(['move', 'delete', 'replace-identical', 'mutate', 'source', 'grade', 'role'])('rejects a question result after target/context changes: %s', async change => {
    const f = fixture(specs[0]);
    const content = f.latest.props.generatedContent, original = content.data.questions[0];
    const clone = JSON.parse(JSON.stringify(original));
    content.data.questions.push(clone);
    const pending = f.run();
    let questions = content.data.questions;
    if (change === 'move') questions = [clone, original];
    if (change === 'delete') questions = [clone];
    if (change === 'replace-identical') questions = [JSON.parse(JSON.stringify(original)), clone];
    if (change === 'mutate') original.question = 'Edited in place';
    f.latest.props = { ...f.latest.props, generatedContent: { ...content, data: { ...content.data, questions } },
      ...(change === 'source' ? { inputText: 'New source' } : {}),
      ...(change === 'grade' ? { gradeLevel: '12th Grade' } : {}),
      ...(change === 'role' ? { isTeacherMode: false } : {}),
    };
    f.request.resolve(JSON.stringify(specs[0].result)); await pending;
    expect(f.callback).not.toHaveBeenCalled();
  });

  it('rejects a stale clicked question before making an AI request', async () => {
    const f = fixture(specs[0]);
    const staleQuestion = f.ctx.generatedContent.data.questions[0];
    const current = f.latest.props.generatedContent;
    f.latest.props = { ...f.latest.props, generatedContent: { ...current, data: { questions: [{ ...staleQuestion, question: 'Updated target' }] } } };
    await f.invoke(0, staleQuestion);
    expect(f.provider).not.toHaveBeenCalled();
    expect(f.callback).not.toHaveBeenCalled();
  });

  it('does not let an old completion clear a newer request for the same question', async () => {
    const f = fixture(specs[0]), second = deferred();
    f.provider.mockImplementationOnce(() => f.request.promise).mockImplementationOnce(() => second.promise);
    const old = f.run(), content = f.latest.props.generatedContent;
    const edited = { ...content.data.questions[0], question: 'Manual revision' };
    f.latest.props = { ...f.latest.props, generatedContent: { ...content, data: { questions: [edited] } } };
    const current = f.invoke(0, edited);
    expect(f.ctx.setRegeneratingQuestions).toHaveBeenCalledTimes(2);
    f.request.resolve(JSON.stringify(specs[0].result)); await old;
    expect(f.ctx.setRegeneratingQuestions).toHaveBeenCalledTimes(2);
    expect(f.callback).not.toHaveBeenCalled();
    second.resolve(JSON.stringify({ ...specs[0].result, question: 'Latest regeneration' })); await current;
    expect(f.callback).toHaveBeenCalledTimes(1);
    expect(f.ctx.setRegeneratingQuestions).toHaveBeenCalledTimes(3);
  });
});

