import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let api, root, host, serial = 0;
beforeAll(() => {
  window.React = global.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {}; window.__alloT = (key, fallback) => typeof fallback === 'string' ? fallback : ({ 'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again' }[key] || key);
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  new Function('window', readFileSync('quiz_ai_helpers.js', 'utf8'))(window);
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false }).code;
  api = new Function('React', 'window', code + ';return {MultiSelectCard,NumericResponseCard,FreeformItemCard,SequenceSenseCard,RelationMismatchCard,AnswerEvidenceCard,McqEnhancements,DeferredAssessmentItem,parse:_quizParseNumericResponse,answered:_quizQuestionAnswered,snapshot:_quizResponseSnapshot,read:_quizReadWorkingDraft,signature:_quizAssessmentItemSignature,balance:_quizBalanceChoiceKeys};')(React, window);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; localStorage.clear(); });
const props = (q, extra = {}) => ({ q, itemNumber: 1, questionIdx: 0, draftNamespace: 'alloflow_assess_draft_v1:enhance-' + (++serial), modeStrategy: { render: { allowConfidenceRating: true, allowIDontKnow: true, aiExplainerOnFail: false } }, onSubmitLiveAnswer: vi.fn(), ...extra });
async function render(Component, p) { if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); } await act(async () => root.render(React.createElement(Component, p))); }
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text || el.textContent.trim().endsWith(text));
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function fill(el, value) { expect(el).toBeTruthy(); await act(async () => { Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }

describe('Assess numeric input and policy parity', () => {
  it.each([['1,5', 1.5, ''], ['-1 1/2 m', -1.5, 'm'], ['1/4 liter', .25, 'liter'], ['1,234.50 cm', 1234.5, 'cm'], ['1.234,5 cm', 1234.5, 'cm'], ['1e3 m', 1000, 'm']])('reads %s without silently changing its value', (raw, value, unit) => expect(api.parse(raw)).toEqual({ value, unit }));
  it.each(['1,234', '1/0', '1 1/0', '2/3/4', '1..5', '1,2,3'])('rejects ambiguous or malformed %s', raw => expect(api.parse(raw)).toBeNull());
  it('uses equivalent-unit policy for both learner feedback and teacher grading', async () => {
    const q = { type: 'numeric-response', question: 'Length?', correctValue: 100, unit: 'cm', numericSettings: { allowEquivalentUnits: true, valueWeight: .9 } }, p = props(q);
    await render(api.NumericResponseCard, p); await fill(host.querySelector('input'), '1 m'); await click(button('Check value'));
    const packet = p.onSubmitLiveAnswer.mock.calls.at(-1)?.[0]; expect(packet.answer.status).toBe('correct');
    expect(window.AlloModules.QuizLiveAggregators.gradeResponseForItem(packet, q).status).toBe('correct');
  });
});

describe('Confidence is recorded before feedback', () => {
  it('offers confidence before checking and freezes it after revealing results', async () => {
    const p = props({ type: 'multi-select', question: 'Select plants', options: ['Oak', 'Stone'], correctAnswers: ['Oak'], optionFeedback: ['Oak is a tree.', 'Stone is not living.'] });
    await render(api.MultiSelectCard, p); await click(button('I am unsure'));
    expect(button('I am unsure').getAttribute('aria-pressed')).toBe('true');
    await click([...host.querySelectorAll('button')].find(el => el.textContent.trim() === 'Oak'));
    await click(button('Check selections'));
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].confidence).toBe('guessed');
    expect(button('I know this').disabled).toBe(true);
    expect(host.textContent).toContain('Stone is not living.');
  });
  it('does not call an explainer when the activity disables it', async () => {
    const callGemini = vi.fn();
    for (const Component of [api.McqEnhancements, api.FreeformItemCard]) {
      await render(Component, props({ type: 'short-answer', question: 'Explain roots.' }, { callGemini }));
      await click(button("I don't know")); expect(callGemini).not.toHaveBeenCalled();
      await act(async () => root.unmount()); root = null; host.remove(); host = null;
    }
  });
});

describe('Learner reasoning survives delivery and short sequences', () => {
  const evidence = { type: 'answer-evidence', question: 'Why?', answerOptions: ['A', 'B'], evidenceOptions: ['E', 'F'], correctAnswer: 'A', correctEvidence: 'E', requireReasoning: true, explanationPrompt: 'Explain the connection.' };
  it('requires and transmits reasoning separately from the selected answer score', async () => {
    const p = props(evidence); await render(api.AnswerEvidenceCard, p);
    await click(button('A')); await click(button('E'));
    expect(button('Check both parts').disabled).toBe(true);
    await fill(host.querySelector('textarea'), 'E supports A because of the cause.'); await click(button('Check both parts'));
    expect(p.onSubmitLiveAnswer.mock.calls.at(-1)[0].answer).toMatchObject({ explanation: 'E supports A because of the cause.', status: 'correct' });
    const draft = api.read(p.draftNamespace), snapshot = api.snapshot({ questions: [evidence] }, draft.items);
    expect(snapshot.items[0].answer.explanation).toContain('E supports A'); expect(snapshot.items[0].answered).toBe(true);
  });
  it('keeps explanations and success criteria available while withholding feedback', async () => {
    const p = props({ ...evidence, studentCriteria: ['Connect your claim to evidence.'] }, { feedbackTiming: 'teacher-release' });
    await render(api.DeferredAssessmentItem, p); expect(host.textContent).toContain('Connect your claim to evidence.');
    await fill(host.querySelector('textarea'), 'My reason');
    expect(api.read(p.draftNamespace).items['q-0'].explanation).toBe('My reason');
    expect(host.textContent).not.toContain('Correct answer');
  });
  it('scores arrange-and-principle without requiring hidden diagnostic steps', async () => {
    const q = { type: 'sequence-sense', question: 'Order growth.', items: ['Seed', 'Plant', 'Flower'], presentedOrder: [0, 1, 2], orderingPrinciple: 'growth', principleOptions: ['growth', 'size'], sequenceMode: 'arrange-explain' }, p = props(q);
    await render(api.SequenceSenseCard, p); expect(host.textContent).toContain('Step 1 of 2'); expect(host.textContent).not.toContain('Is this order correct?');
    await click(button('Done arranging')); await click(button('growth'));
    expect(host.textContent).toContain('2 / 2'); expect(host.textContent).not.toContain('Verify:');
    expect(api.answered(q, 0, api.read(p.draftNamespace))).toBe(true);
    expect(window.AlloModules.QuizLiveAggregators.gradeResponseForItem(p.onSubmitLiveAnswer.mock.calls.at(-1)[0], q).status).toBe('correct');
  });
  it('keeps offline and canonical task signatures identical for new policies', () => {
    const canonical = window.AlloModules.QuizLiveAggregators;
    for (const q of [evidence, { type: 'numeric-response', numericSettings: { valueWeight: .9, allowEquivalentUnits: true } }]) {
      const expected = canonical.assessmentItemSignature(q); delete window.AlloModules.QuizLiveAggregators;
      expect(api.signature(q)).toBe(expected); window.AlloModules.QuizLiveAggregators = canonical;
    }
  });
  it('shuffles feedback alongside its option', () => {
    const q = { type: 'multi-select', options: ['Oak', 'Stone', 'Rose'], correctAnswers: ['Oak', 'Rose'], optionFeedback: ['oak-feedback', 'stone-feedback', 'rose-feedback'] };
    const balanced = api.balance([q])[0]; balanced.options.forEach((value, i) => expect(balanced.optionFeedback[i]).toBe(value.toLowerCase() + '-feedback'));
  });
  it('preserves first responses and pre-feedback confidence across practice retries', async () => {
    const p = props({ type: 'multi-select', question: 'Which are plants?', options: ['Oak', 'Stone'], correctAnswers: ['Oak'] });
    await render(api.MultiSelectCard, p); await click(button('I am unsure')); await click(button('Stone')); await click(button('Check selections'));
    await click(button('Try again')); await click(button('I know this')); await click(button('Oak')); await click(button('Check selections'));
    const snapshot = api.snapshot({ questions: [p.q] }, api.read(p.draftNamespace).items);
    expect(snapshot.items[0].practice.map(entry => [entry.response, entry.confidence])).toEqual([['Stone', 'guessed'], ['Oak', 'knew']]);
    expect(snapshot.items[0].answer.selectedOptions).toEqual(['Oak']);
  });
  it('does not silently apply legacy numeric scoring when the configured grader is unavailable', async () => {
    const grader = window.AlloModules.QuizLiveAggregators;
    delete window.AlloModules.QuizLiveAggregators;
    try {
      const p = props({ type: 'numeric-response', correctValue: 100, unit: 'cm', numericSettings: { allowEquivalentUnits: true } });
      await render(api.NumericResponseCard, p); await fill(host.querySelector('input'), '1 m'); await click(button('Check value'));
      expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
      expect(host.textContent).toContain('Numeric checking is not available yet');
    } finally { window.AlloModules.QuizLiveAggregators = grader; }
  });
});
