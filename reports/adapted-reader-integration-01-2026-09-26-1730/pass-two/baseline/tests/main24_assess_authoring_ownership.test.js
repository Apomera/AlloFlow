
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
  return { ctx, request, latest, run: () => run(...spec.args(ctx)), callback: spec.callback === 'handleQuizQuestionAction' ? props.handleQuizQuestionAction : ctx[spec.callback], provider: spec.image ? ctx.callGeminiImageEdit : props.callGemini };
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
});

