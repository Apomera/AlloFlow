import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let api, root, host, serial = 0;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {}; window.AlloIcons = {};
  window.__alloT = (key, fallback) => typeof fallback === 'string' ? fallback : ({ 'ui_common.i_dont_know': "I don't know", 'ui_common.try_again': 'Try again' }[key] || key);
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(window);
  const code = require('@babel/core').transformSync(readFileSync('view_quiz_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  api = new Function('React', 'window', code + ';return {AnswerEvidenceCard,DeferredAssessmentItem,read:_quizReadWorkingDraft,snapshot:_quizResponseSnapshot,controller:_quizGetVoiceItemController};')(React, window);
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

const question = { type: 'answer-evidence', question: 'Why does the plant grow?', answerOptions: ['Water helps', 'Stones help'], evidenceOptions: ['Roots absorb water', 'Stones are hard'], correctAnswer: 'Water helps', correctEvidence: 'Roots absorb water', requireReasoning: true, explanationPrompt: 'Explain the connection.' };
function props(extra = {}) { return { q: question, itemNumber: 1, questionIdx: 0, draftNamespace: 'alloflow_assess_draft_v1:evidence-guidance-' + (++serial), feedbackTiming: 'teacher-release', allowDictation: false, modeStrategy: { render: { allowIDontKnow: true, allowConfidenceRating: true } }, onSubmitLiveAnswer: vi.fn(), ...extra }; }
const card = mode => mode === 'immediate' ? api.AnswerEvidenceCard : api.DeferredAssessmentItem;
async function render(mode, p) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(card(mode), p)));
}
const button = text => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
const status = () => host.querySelector('[data-assessment-answer-evidence-progress]');
const continuation = () => host.querySelector('[data-assessment-continue-evidence]');
function choice(mode, field, index) {
  const text = host.querySelector('[data-assessment-choice-field="' + field + '"][data-assessment-choice-index="' + index + '"]');
  expect(text).toBeTruthy();
  return mode === 'immediate' ? text.closest('button') : text.closest('label').querySelector('input');
}
async function click(el) { expect(el).toBeTruthy(); el.focus(); await act(async () => el.click()); }
async function fill(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function confidence(mode) {
  if (mode === 'immediate') return click(button('I am unsure'));
  const select = host.querySelector('select');
  await act(async () => { select.value = 'guessed'; select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function voice(p, action, args) { let result; await act(async () => { result = api.controller(p.draftNamespace, p.questionIdx).execute(action, args); }); return result; }
async function chooseByVoice(mode, p, part, index) { return voice(p, mode === 'immediate' ? 'choose-' + part : 'choose', mode === 'immediate' ? { choice: String.fromCharCode(65 + index) } : { part, optionIndex: index }); }

describe('Answer and evidence selections stay consistent across response modes', () => {
  it.each(['immediate', 'deferred'])('%s answer changes invalidate old evidence while retaining the learner explanation and confidence', async mode => {
    const p = props(); await render(mode, p);
    await click(choice(mode, 'answerOptions', 0)); await click(choice(mode, 'evidenceOptions', 0));
    await fill(host.querySelector('textarea'), 'My explanation stays available.'); await confidence(mode);
    const region = status(), snapshots = [];
    const observe = event => { if (event.detail?.namespace === p.draftNamespace) snapshots.push({ ...api.read(p.draftNamespace).items['q-0'] }); };
    window.addEventListener('alloflow:assessment-draft-changed', observe);
    try { await click(choice(mode, 'answerOptions', 1)); } finally { window.removeEventListener('alloflow:assessment-draft-changed', observe); }
    expect(api.read(p.draftNamespace).items['q-0']).toMatchObject({ answerIdx: 1, evidenceIdx: null, explanation: 'My explanation stays available.', confidence: 'guessed' });
    expect(snapshots.some(item => item.answerIdx === 1)).toBe(true);
    expect(snapshots.filter(item => item.answerIdx === 1).every(item => item.evidenceIdx === null)).toBe(true);
    expect(document.activeElement).toBe(choice(mode, 'answerOptions', 1));
    expect(status()).toBe(region); expect(region.textContent).toContain('Answer changed'); expect(region.textContent).toContain('Choose supporting evidence again');
    expect(region.classList.contains('sr-only')).toBe(false); expect(region.getAttribute('role')).toBe('status');
    if (mode === 'immediate') expect(button('Check both parts').disabled).toBe(true);
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });

  it.each(['immediate', 'deferred'])('%s keeps evidence when the same answer is selected again', async mode => {
    const p = props(); await render(mode, p);
    await click(choice(mode, 'answerOptions', 0)); await click(choice(mode, 'evidenceOptions', 1));
    await click(choice(mode, 'answerOptions', 0));
    expect(api.read(p.draftNamespace).items['q-0']).toMatchObject({ answerIdx: 0, evidenceIdx: 1 });
    const evidence = choice(mode, 'evidenceOptions', 1);
    expect(mode === 'immediate' ? evidence.getAttribute('aria-pressed') === 'true' : evidence.checked).toBe(true);
  });

  it.each(['immediate', 'deferred'])('%s restores the incomplete pair without restoring stale evidence or losing the explanation', async mode => {
    const p = props(); await render(mode, p);
    await click(choice(mode, 'answerOptions', 0)); await click(choice(mode, 'evidenceOptions', 0));
    await fill(host.querySelector('textarea'), 'Keep my draft reasoning.'); await click(choice(mode, 'answerOptions', 1));
    await act(async () => root.render(null)); await render(mode, p);
    const draft = api.read(p.draftNamespace), snapshot = api.snapshot({ questions: [p.q] }, draft.items, { status: 'in-progress' });
    expect(draft.items['q-0']).toMatchObject({ answerIdx: 1, evidenceIdx: null, explanation: 'Keep my draft reasoning.' });
    expect(snapshot.items[0]).toMatchObject({ answered: false, hasResponse: true });
    expect(host.querySelector('textarea').value).toBe('Keep my draft reasoning.');
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });
});

describe('Answer + Evidence guidance and deliberate navigation', () => {
  it.each(['immediate', 'deferred'])('%s explains answer changes and moves to evidence only when requested', async mode => {
    const p = props(); await render(mode, p);
    const instructions = host.querySelector('[data-assessment-answer-evidence-instructions]');
    expect(instructions).toBeTruthy(); expect(instructions.classList.contains('sr-only')).toBe(false); expect(instructions.hidden).toBe(false);
    expect(instructions.textContent.toLowerCase()).toContain('change'); expect(instructions.textContent.toLowerCase()).toContain('evidence');
    expect(continuation()).toBeNull();
    if (mode === 'deferred') {
      expect(choice(mode, 'evidenceOptions', 0).matches(':disabled')).toBe(true);
      expect(await chooseByVoice(mode, p, 'evidence', 0)).toMatchObject({ ok: false, state: 'inapplicable' });
    }
    const answer = choice(mode, 'answerOptions', 0); await click(answer); expect(document.activeElement).toBe(answer);
    if (mode === 'deferred') expect(choice(mode, 'evidenceOptions', 0).matches(':disabled')).toBe(false);
    expect(continuation().textContent).toBe('Go to supporting evidence'); await click(continuation());
    expect(document.activeElement).toBe(choice(mode, 'evidenceOptions', 0));
    await click(choice(mode, 'evidenceOptions', 1)); await click(continuation());
    expect(document.activeElement).toBe(choice(mode, 'evidenceOptions', mode === 'deferred' ? 1 : 0));
  });

  it('keeps voice readiness aligned with the required explanation', async () => {
    const p = props(); await render('immediate', p);
    await chooseByVoice('immediate', p, 'answer', 0); await chooseByVoice('immediate', p, 'evidence', 0);
    expect(api.controller(p.draftNamespace, 0).getState().actions).not.toContain('check'); expect(button('Check both parts').disabled).toBe(true);
    const blocked = await voice(p, 'check', {}); expect(blocked).toMatchObject({ ok: false, state: 'inapplicable' }); expect(blocked.message.toLowerCase()).toContain('required explanation');
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
    await fill(host.querySelector('textarea'), 'Roots absorb the water that plants need.');
    expect(api.controller(p.draftNamespace, 0).getState().actions).toContain('check'); expect(button('Check both parts').disabled).toBe(false);
    expect(await voice(p, 'check', {})).toMatchObject({ ok: true, state: 'checked', score: 2 });
    expect(p.onSubmitLiveAnswer).toHaveBeenCalledTimes(1);
  });

  it.each(['immediate', 'deferred'])('%s voice answer changes follow the same evidence-reset rule as clicks', async mode => {
    const p = props(); await render(mode, p);
    await click(choice(mode, 'answerOptions', 0)); await click(choice(mode, 'evidenceOptions', 0));
    await fill(host.querySelector('textarea'), 'An explanation I can revise.');
    expect(await chooseByVoice(mode, p, 'answer', 1)).toMatchObject({ ok: true });
    expect(api.read(p.draftNamespace).items['q-0']).toMatchObject({ answerIdx: 1, evidenceIdx: null, explanation: 'An explanation I can revise.' });
    expect(status().textContent).toContain('Choose supporting evidence again');
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });

  it('keeps deferred feedback withheld through selection changes and voice checking', async () => {
    const p = props({ q: { ...question, correctAnswer: 'PRIVATE_KEY', correctEvidence: 'PRIVATE_EVIDENCE', sourceEvidence: 'PRIVATE_TEACHER_NOTE' } });
    await render('deferred', p); await click(choice('deferred', 'answerOptions', 0)); await click(choice('deferred', 'evidenceOptions', 0));
    await fill(host.querySelector('textarea'), 'A saved explanation.'); await click(choice('deferred', 'answerOptions', 1));
    expect(await voice(p, 'check', {})).toMatchObject({ ok: false, state: 'feedback-held' });
    expect(host.textContent).not.toMatch(/PRIVATE_KEY|PRIVATE_EVIDENCE|PRIVATE_TEACHER_NOTE/); expect(host.querySelector('[data-assessment-answer-evidence-result]')).toBeNull();
    expect(p.onSubmitLiveAnswer).not.toHaveBeenCalled();
  });
});
