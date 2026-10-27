import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let api, canonical, root, host, serial = 0;
beforeAll(() => {
  window.React = global.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {};
  window.__alloT = (key, fallback) => typeof fallback === 'string' ? fallback : key;
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  canonical = window.AlloModules.QuizLiveAggregators;
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false, compact: false }).code;
  api = new Function('React', 'window', code + ';return {Card:NumericResponseCard,controller:_quizGetVoiceItemController,read:_quizReadWorkingDraft};')(React, window);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null;
  localStorage.clear(); window.AlloModules.QuizLiveAggregators = canonical;
});
const question = { type: 'numeric-response', question: 'Find the length.', correctValue: 10, unit: 'cm' };
const props = (extra = {}) => ({ q: question, questionIdx: 0, itemNumber: 1, draftNamespace: 'alloflow_assess_draft_v1:numeric-voice-' + (++serial), modeStrategy: { render: {} }, allowDictation: false, onSubmitLiveAnswer: vi.fn(), ...extra });
async function render(p) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(React.createElement(api.Card, p))); }
async function voice(p, action, request = {}) { let result; await act(async () => { result = api.controller(p.draftNamespace, 0).execute(action, request); }); return result; }
async function fill(text) { const input = host.querySelector('input'); await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
const error = () => host.querySelector('[data-assessment-numeric-error]');

describe('Numeric voice feedback identifies checking problems accurately', () => {
  it.each(['unavailable', 'invalid-key'])('shares the visible %s message and retains the response without scoring it', async reason => {
    const p = props({ q: { ...question, numericSettings: { allowEquivalentUnits: true }, ...(reason === 'invalid-key' ? { correctValue: '' } : {}) } });
    if (reason === 'unavailable') delete window.AlloModules.QuizLiveAggregators;
    await render(p); await voice(p, 'enter-response', { text: '10 cm' });
    const result = await voice(p, 'check');
    expect(result).toMatchObject({ ok: false, state: 'unavailable' });
    expect(result.message).toBe(error().textContent);
    expect(result.message).toContain(reason === 'unavailable' ? 'Numeric checking is not available' : 'valid answer key');
    expect(api.controller(p.draftNamespace, 0).getState().prompt).toBe(result.message);
    expect(host.querySelector('input').value).toBe('10 cm');
    expect(host.querySelector('input').hasAttribute('aria-invalid')).toBe(false);
    expect(host.querySelector('input').disabled).toBe(false);
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
    expect(api.read(p.draftNamespace).items['q-0'].response).toBe('10 cm');
  });
  it('checks the saved response after the grader loads without requiring re-entry', async () => {
    const p = props({ q: { ...question, numericSettings: { allowEquivalentUnits: true } } });
    delete window.AlloModules.QuizLiveAggregators; await render(p); await voice(p, 'enter-response', { text: '10 cm' });
    expect((await voice(p, 'check')).state).toBe('unavailable');
    window.AlloModules.QuizLiveAggregators = canonical;
    expect(await voice(p, 'check')).toMatchObject({ ok: true, state: 'checked', correct: true, score: 100 });
    expect(error().textContent).toBe(''); expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
  });
  it.each(['typing', 'voice'])('clears an obsolete format error when a corrected response arrives by %s', async mode => {
    const p = props(); await render(p); await fill('not a number');
    const result = await voice(p, 'check');
    expect(result).toMatchObject({ ok: false, state: 'invalid-response' });
    expect(result.message).toBe(error().textContent); expect(host.querySelector('input').getAttribute('aria-invalid')).toBe('true');
    if (mode === 'typing') await fill('10 cm'); else await voice(p, 'enter-response', { text: '10 cm' });
    expect(error().textContent).toBe(''); expect(host.querySelector('input').hasAttribute('aria-invalid')).toBe(false);
    expect(api.controller(p.draftNamespace, 0).getState().prompt).toContain('then say check value');
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });
});

describe('Numeric spoken and visible component feedback respects scoring policy', () => {
  it.each([
    { label: 'value-only credit', weight: 1, text: '10 kg', correct: true, value: 'correct', units: 'need review', score: 100 },
    { label: 'units-only credit', weight: 0, text: '20 cm', correct: true, value: 'needs review', units: 'are correct', score: 100 },
    { label: 'partial credit', weight: 0.5, text: '10 kg', correct: false, value: 'correct', units: 'need review', score: 50 },
    { label: 'all-or-nothing credit', weight: 0.5, text: '10 kg', correct: false, value: 'correct', units: 'need review', score: 0, policy: { partialCredit: false } }
  ])('reports the actual component results with $label', async fixture => {
    const p = props({ q: { ...question, numericSettings: { valueWeight: fixture.weight } }, scoringPolicy: fixture.policy });
    await render(p); await voice(p, 'enter-response', { text: fixture.text }); const result = await voice(p, 'check');
    expect(result).toMatchObject({ ok: true, correct: fixture.correct, score: fixture.score });
    const details = host.querySelector('[data-assessment-numeric-details]').textContent;
    expect(details).toContain(fixture.value === 'correct' ? 'The value is correct.' : 'The value needs review.');
    expect(details).toContain('The units ' + fixture.units + '.');
    expect(result.message).toContain(details);
    if (fixture.correct) expect(result.message).toContain('Correct response under this scoring policy.');
  });
  it('does not announce unit correctness when the question has no units', async () => {
    const p = props({ q: { ...question, unit: '' } }); await render(p); await voice(p, 'enter-response', { text: '10' });
    const result = await voice(p, 'check'); expect(result).toMatchObject({ correct: true, score: 100 });
    expect(result.message).toContain('The value is correct.'); expect(result.message).not.toContain('units');
    expect(host.querySelector('[data-assessment-numeric-details]').textContent).toBe('The value is correct.');
  });
  it('uses the converted value and unit results when equivalent units are accepted', async () => {
    const p = props({ q: { ...question, correctValue: 100, numericSettings: { allowEquivalentUnits: true } } });
    await render(p); await voice(p, 'enter-response', { text: '1 m' }); const result = await voice(p, 'check');
    expect(result).toMatchObject({ correct: true, score: 100 });
    expect(result.message).toContain('The value is correct. The units are correct.');
    expect(p.onSubmitLiveAnswer.mock.calls[0][0].answer).toMatchObject({ converted: true, valueCorrect: true, unitCorrect: true });
  });
});
